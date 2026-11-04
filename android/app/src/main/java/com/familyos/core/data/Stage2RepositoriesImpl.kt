package com.familyos.core.data

import com.familyos.core.database.*
import com.familyos.core.domain.*
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import java.util.UUID

// 1. Family Relationship Repository Implementation
class FamilyRelationshipRepositoryImpl(
    private val dao: FamilyRelationshipDao,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO
) : FamilyRelationshipRepository {

    override fun observeRelationships(familyId: String): Flow<List<FamilyRelationship>> {
        return dao.observeRelationships(familyId).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    override suspend fun addRelationship(
        familyId: String,
        person1Id: String,
        person2Id: String,
        type: RelationshipType,
        notes: String?
    ): Result<FamilyRelationship> = withContext(ioDispatcher) {
        // Validation 1: Prevent self-relationship
        if (person1Id == person2Id) {
            return@withContext Result.failure(IllegalArgumentException("A family member cannot have a relationship with themselves."))
        }

        val existing = dao.observeRelationships(familyId).first()

        // Validation 2: Prevent duplicate relationships
        val isDuplicate = existing.any {
            (it.person1MemberId == person1Id && it.person2MemberId == person2Id) ||
            (it.person1MemberId == person2Id && it.person2MemberId == person1Id && it.relationshipType == type.name)
        }
        if (isDuplicate) {
            return@withContext Result.failure(IllegalArgumentException("A relationship of this type between these family members already exists."))
        }

        // Validation 3: Transitive parent-child DAG cycle prevention
        if (type == RelationshipType.PARENT_CHILD) {
            // person1Id is proposed parent of person2Id
            // A cycle occurs if person1Id is already reachable as a descendant of person2Id
            val parentToChildrenMap = mutableMapOf<String, MutableList<String>>()
            existing.filter { it.relationshipType == "PARENT_CHILD" }.forEach {
                parentToChildrenMap.getOrPut(it.person1MemberId) { mutableListOf() }.add(it.person2MemberId)
            }
            val visited = mutableSetOf<String>()
            val queue = ArrayDeque<String>()
            queue.add(person2Id)
            while (queue.isNotEmpty()) {
                val current = queue.removeFirst()
                if (current == person1Id) {
                    return@withContext Result.failure(IllegalArgumentException("Parent-child cycle detected: $person1Id is already a descendant of $person2Id."))
                }
                if (visited.add(current)) {
                    parentToChildrenMap[current]?.let { children ->
                        queue.addAll(children)
                    }
                }
            }
        }

        val id = UUID.randomUUID().toString()
        val entity = FamilyRelationshipEntity(
            id = id,
            familyId = familyId,
            person1MemberId = person1Id,
            person2MemberId = person2Id,
            relationshipType = type.name,
            notes = notes
        )
        dao.insertRelationship(entity)
        Result.success(entity.toDomain())
    }

    override suspend fun removeRelationship(id: String): Result<Unit> = withContext(ioDispatcher) {
        dao.deleteRelationship(id)
        Result.success(Unit)
    }

    private fun FamilyRelationshipEntity.toDomain() = FamilyRelationship(
        id = id,
        familyId = familyId,
        person1MemberId = person1MemberId,
        person2MemberId = person2MemberId,
        relationshipType = RelationshipType.valueOf(relationshipType),
        notes = notes
    )
}

// 2. Goals & Tasks Repository Implementation
class GoalsAndTasksRepositoryImpl(
    private val dao: GoalsAndTasksDao,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO
) : GoalsAndTasksRepository {

    override fun observeGoals(familyId: String): Flow<List<FamilyGoal>> {
        return dao.observeGoals(familyId).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    override suspend fun createGoal(
        familyId: String,
        title: String,
        description: String?,
        category: GoalCategory,
        targetDate: Long?,
        priority: Priority,
        ownerMemberId: String?
    ): Result<FamilyGoal> = withContext(ioDispatcher) {
        val id = UUID.randomUUID().toString()
        val entity = FamilyGoalEntity(
            id = id,
            familyId = familyId,
            title = title.trim(),
            description = description?.trim(),
            category = category.name,
            targetDate = targetDate,
            priority = priority.name,
            ownerMemberId = ownerMemberId
        )
        dao.insertOrUpdateGoal(entity)
        Result.success(entity.toDomain())
    }

    override fun observeProjects(familyId: String): Flow<List<Project>> {
        return dao.observeProjects(familyId).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    override suspend fun createProject(
        familyId: String,
        goalId: String?,
        name: String,
        budgetCents: Long,
        targetDate: Long?
    ): Result<Project> = withContext(ioDispatcher) {
        val id = UUID.randomUUID().toString()
        val entity = ProjectEntity(
            id = id,
            familyId = familyId,
            goalId = goalId,
            name = name.trim(),
            budgetCents = budgetCents,
            targetDate = targetDate
        )
        dao.insertOrUpdateProject(entity)
        Result.success(entity.toDomain())
    }

    override fun observeTasks(familyId: String): Flow<List<Task>> {
        return dao.observeTasks(familyId).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    override suspend fun createTask(
        familyId: String,
        projectId: String?,
        parentTaskId: String?,
        title: String,
        assignedMemberId: String?,
        priority: Priority,
        dueDate: Long?
    ): Result<Task> = withContext(ioDispatcher) {
        val id = UUID.randomUUID().toString()
        // Prevent circular self-parent reference
        if (id == parentTaskId) {
            return@withContext Result.failure(IllegalArgumentException("Task cannot be its own parent."))
        }
        val entity = TaskEntity(
            id = id,
            familyId = familyId,
            projectId = projectId,
            parentTaskId = parentTaskId,
            title = title.trim(),
            assignedMemberId = assignedMemberId,
            priority = priority.name,
            dueDate = dueDate
        )
        dao.insertOrUpdateTask(entity)
        Result.success(entity.toDomain())
    }

    override suspend fun setTaskCompleted(taskId: String, isCompleted: Boolean, memberId: String?): Result<Unit> = withContext(ioDispatcher) {
        dao.setTaskCompleted(
            taskId = taskId,
            isCompleted = isCompleted,
            completedAt = if (isCompleted) System.currentTimeMillis() else null
        )
        Result.success(Unit)
    }

    override suspend fun addChecklistItem(taskId: String, title: String): Result<TaskChecklistItem> = withContext(ioDispatcher) {
        val id = UUID.randomUUID().toString()
        val entity = TaskChecklistItemEntity(
            id = id,
            taskId = taskId,
            title = title.trim()
        )
        dao.insertChecklistItem(entity)
        Result.success(TaskChecklistItem(id, taskId, entity.title, entity.isDone, entity.position))
    }

    override suspend fun setChecklistItemDone(itemId: String, isDone: Boolean): Result<Unit> = withContext(ioDispatcher) {
        dao.setChecklistItemDone(itemId, isDone)
        Result.success(Unit)
    }

    private fun FamilyGoalEntity.toDomain() = FamilyGoal(
        id = id,
        familyId = familyId,
        title = title,
        description = description,
        category = GoalCategory.valueOf(category),
        targetDate = targetDate,
        priority = Priority.valueOf(priority),
        ownerMemberId = ownerMemberId,
        status = status
    )

    private fun ProjectEntity.toDomain() = Project(
        id = id,
        familyId = familyId,
        goalId = goalId,
        name = name,
        description = description,
        budgetCents = budgetCents,
        targetDate = targetDate,
        status = status,
        leadMemberId = leadMemberId
    )

    private fun TaskEntity.toDomain() = Task(
        id = id,
        familyId = familyId,
        projectId = projectId,
        parentTaskId = parentTaskId,
        title = title,
        notes = notes,
        assignedMemberId = assignedMemberId,
        priority = Priority.valueOf(priority),
        dueDate = dueDate,
        isCompleted = isCompleted,
        completedAt = completedAt,
        completedByMemberId = completedByMemberId,
        recurrenceRule = recurrenceRule
    )
}

// 3. Recipe Repository Implementation
class RecipeRepositoryImpl(
    private val dao: RecipesDao,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO
) : RecipeRepository {

    override fun observeRecipes(familyId: String): Flow<List<Recipe>> {
        return dao.observeRecipes(familyId).map { list ->
            list.map { it.toDomain() }
        }
    }

    override suspend fun getRecipe(recipeId: String): Recipe? = withContext(ioDispatcher) {
        dao.getRecipeById(recipeId)?.toDomain()
    }

    override suspend fun createRecipe(recipe: Recipe): Result<Recipe> = withContext(ioDispatcher) {
        val entity = RecipeEntity(
            id = recipe.id.ifEmpty { UUID.randomUUID().toString() },
            familyId = recipe.familyId,
            title = recipe.title.trim(),
            description = recipe.description?.trim(),
            imageUri = recipe.imageUri,
            prepTimeMinutes = recipe.prepTimeMinutes,
            cookTimeMinutes = recipe.cookTimeMinutes,
            servings = recipe.servings,
            difficulty = recipe.difficulty.name,
            category = recipe.category,
            dietaryNotes = recipe.dietaryNotes,
            familyRating = recipe.familyRating,
            isFavorite = recipe.isFavorite,
            source = recipe.source,
            storageInstructions = recipe.storageInstructions
        )
        dao.insertOrUpdateRecipe(entity)

        // Insert ingredients
        if (recipe.ingredients.isNotEmpty()) {
            val ingEntities = recipe.ingredients.map {
                RecipeIngredientEntity(
                    id = it.id.ifEmpty { UUID.randomUUID().toString() },
                    recipeId = entity.id,
                    itemName = it.itemName.trim(),
                    quantity = it.quantity,
                    unit = it.unit.trim(),
                    notes = it.notes
                )
            }
            dao.insertIngredients(ingEntities)
        }

        // Insert instructions
        if (recipe.instructions.isNotEmpty()) {
            val instEntities = recipe.instructions.map {
                RecipeInstructionEntity(
                    id = it.id.ifEmpty { UUID.randomUUID().toString() },
                    recipeId = entity.id,
                    stepNumber = it.stepNumber,
                    instructionText = it.instructionText.trim()
                )
            }
            dao.insertInstructions(instEntities)
        }

        Result.success(entity.toDomain(recipe.ingredients, recipe.instructions))
    }

    override suspend fun setFavorite(recipeId: String, isFavorite: Boolean): Result<Unit> = withContext(ioDispatcher) {
        dao.setFavorite(recipeId, isFavorite)
        Result.success(Unit)
    }

    private fun RecipeEntity.toDomain(
        ingredients: List<RecipeIngredient> = emptyList(),
        instructions: List<RecipeInstruction> = emptyList()
    ) = Recipe(
        id = id,
        familyId = familyId,
        title = title,
        description = description,
        imageUri = imageUri,
        prepTimeMinutes = prepTimeMinutes,
        cookTimeMinutes = cookTimeMinutes,
        servings = servings,
        difficulty = RecipeDifficulty.valueOf(difficulty),
        category = category,
        dietaryNotes = dietaryNotes,
        familyRating = familyRating,
        isFavorite = isFavorite,
        source = source,
        storageInstructions = storageInstructions,
        ingredients = ingredients,
        instructions = instructions
    )
}

// 4. Meal Planner & Grocery Repository Implementation
class MealPlannerRepositoryImpl(
    private val mealDao: MealPlannerDao,
    private val groceryDao: GroceryListDao,
    private val recipeDao: RecipesDao,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO
) : MealPlannerRepository {

    override fun observeWeekMealPlans(familyId: String, startDate: Long, endDate: Long): Flow<List<MealPlanEntry>> {
        return mealDao.observeWeekMealPlans(familyId, startDate, endDate).map { list ->
            list.map { it.toDomain() }
        }
    }

    override suspend fun addMealPlan(entry: MealPlanEntry): Result<MealPlanEntry> = withContext(ioDispatcher) {
        val id = entry.id.ifEmpty { UUID.randomUUID().toString() }
        val entity = MealPlanEntryEntity(
            id = id,
            familyId = entry.familyId,
            planDate = entry.planDate,
            mealType = entry.mealType.name,
            recipeId = entry.recipeId,
            customMealTitle = entry.customMealTitle?.trim(),
            servings = entry.servings,
            notes = entry.notes
        )
        mealDao.insertOrUpdateMealPlan(entity)
        Result.success(entity.toDomain())
    }

    override suspend fun deleteMealPlan(id: String): Result<Unit> = withContext(ioDispatcher) {
        mealDao.deleteMealPlan(id)
        Result.success(Unit)
    }

    override suspend fun generateGroceryListFromWeek(familyId: String, startDate: Long, endDate: Long): Result<Int> = withContext(ioDispatcher) {
        val weekPlans = mealDao.observeWeekMealPlans(familyId, startDate, endDate).first()
        var addedCount = 0

        for (plan in weekPlans) {
            if (plan.recipeId != null) {
                val ingredients = recipeDao.observeIngredients(plan.recipeId).first()
                val items = ingredients.map { ing ->
                    GroceryListItemEntity(
                        id = UUID.randomUUID().toString(),
                        familyId = familyId,
                        itemName = ing.itemName,
                        category = "PANTRY",
                        quantity = ing.quantity,
                        unit = ing.unit,
                        isPurchased = false,
                        sourceRecipeId = plan.recipeId
                    )
                }
                groceryDao.insertGroceryItems(items)
                addedCount += items.size
            }
        }
        Result.success(addedCount)
    }

    private fun MealPlanEntryEntity.toDomain() = MealPlanEntry(
        id = id,
        familyId = familyId,
        planDate = planDate,
        mealType = MealType.valueOf(mealType),
        recipeId = recipeId,
        customMealTitle = customMealTitle,
        servings = servings,
        notes = notes
    )
}

// 5. Grocery List Repository Implementation
class GroceryListRepositoryImpl(
    private val dao: GroceryListDao,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO
) : GroceryListRepository {

    override fun observeGroceryItems(familyId: String): Flow<List<GroceryListItem>> {
        return dao.observeGroceryItems(familyId).map { list ->
            list.map { it.toDomain() }
        }
    }

    override suspend fun addGroceryItem(
        familyId: String,
        itemName: String,
        category: String,
        quantity: Double,
        unit: String,
        sourceRecipeId: String?
    ): Result<GroceryListItem> = withContext(ioDispatcher) {
        val entity = GroceryListItemEntity(
            id = UUID.randomUUID().toString(),
            familyId = familyId,
            itemName = itemName.trim(),
            category = category.trim(),
            quantity = quantity,
            unit = unit.trim(),
            isPurchased = false,
            sourceRecipeId = sourceRecipeId
        )
        dao.insertGroceryItem(entity)
        Result.success(entity.toDomain())
    }

    override suspend fun setPurchased(id: String, isPurchased: Boolean): Result<Unit> = withContext(ioDispatcher) {
        dao.setPurchased(id, isPurchased)
        Result.success(Unit)
    }

    override suspend fun clearPurchased(familyId: String): Result<Unit> = withContext(ioDispatcher) {
        dao.clearPurchasedItems(familyId)
        Result.success(Unit)
    }

    private fun GroceryListItemEntity.toDomain() = GroceryListItem(
        id = id,
        familyId = familyId,
        itemName = itemName,
        category = category,
        quantity = quantity,
        unit = unit,
        isPurchased = isPurchased,
        sourceRecipeId = sourceRecipeId
    )
}

// 6. Chores Repository Implementation
class ChoresRepositoryImpl(
    private val dao: ChoresDao,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO
) : ChoresRepository {

    override fun observeChores(familyId: String): Flow<List<Chore>> {
        return dao.observeChores(familyId).map { list ->
            list.map { it.toDomain() }
        }
    }

    override suspend fun createChore(chore: Chore): Result<Chore> = withContext(ioDispatcher) {
        val id = chore.id.ifEmpty { UUID.randomUUID().toString() }
        val entity = ChoreEntity(
            id = id,
            familyId = chore.familyId,
            title = chore.title.trim(),
            description = chore.description?.trim(),
            assignedMemberId = chore.assignedMemberId,
            zone = chore.zone,
            frequency = chore.frequency.name,
            rewardPoints = chore.rewardPoints,
            nextDueDate = chore.nextDueDate,
            requiresVerification = chore.requiresVerification
        )
        dao.insertOrUpdateChore(entity)
        Result.success(entity.toDomain())
    }

    override suspend fun completeChore(choreId: String, memberId: String): Result<Unit> = withContext(ioDispatcher) {
        val chore = dao.getChoreById(choreId)
            ?: return@withContext Result.failure(IllegalArgumentException("Chore not found"))

        // 1. Advance next due date using calendar-aware date arithmetic (handles leap years, month-end clipping)
        val baseDate = if (chore.nextDueDate > 0) chore.nextDueDate else System.currentTimeMillis()
        val freq = try {
            ChoreFrequency.valueOf(chore.frequency)
        } catch (e: Exception) {
            ChoreFrequency.DAILY
        }
        val nextDue = ChoreRecurrenceCalculator.computeNextDueDate(baseDate, freq)
        dao.completeChore(choreId = choreId, isCompleted = true, nextDueDate = nextDue)

        // 2. Log completion history
        dao.logCompletion(
            ChoreCompletionHistoryEntity(
                id = UUID.randomUUID().toString(),
                choreId = choreId,
                completedByMemberId = memberId,
                completedAt = System.currentTimeMillis(),
                pointsEarned = chore.rewardPoints
            )
        )
        Result.success(Unit)
    }

    private fun ChoreEntity.toDomain() = Chore(
        id = id,
        familyId = familyId,
        title = title,
        description = description,
        assignedMemberId = assignedMemberId,
        zone = zone,
        frequency = ChoreFrequency.valueOf(frequency),
        rewardPoints = rewardPoints,
        nextDueDate = nextDueDate,
        requiresVerification = requiresVerification,
        isCompleted = isCompleted
    )
}

// 7. Home Assets Repository Implementation
class HomeAssetsRepositoryImpl(
    private val dao: HomeAssetsDao,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO
) : HomeAssetsRepository {

    override fun observeAssets(familyId: String): Flow<List<HomeAsset>> {
        return dao.observeAssets(familyId).map { list ->
            list.map { it.toDomain() }
        }
    }

    override suspend fun addAsset(asset: HomeAsset): Result<HomeAsset> = withContext(ioDispatcher) {
        val id = asset.id.ifEmpty { UUID.randomUUID().toString() }
        val entity = HomeAssetEntity(
            id = id,
            familyId = asset.familyId,
            name = asset.name.trim(),
            category = asset.category.name,
            description = asset.description?.trim(),
            purchaseDate = asset.purchaseDate,
            purchasePriceCents = asset.purchasePriceCents, // Exact Long integer cents
            warrantyExpiryDate = asset.warrantyExpiryDate,
            serialNumber = asset.serialNumber?.trim(),
            location = asset.location?.trim(),
            nextMaintenanceDate = asset.nextMaintenanceDate
        )
        dao.insertOrUpdateAsset(entity)
        Result.success(entity.toDomain())
    }

    override suspend fun logMaintenance(maintenance: AssetMaintenance): Result<Unit> = withContext(ioDispatcher) {
        val entity = AssetMaintenanceEntity(
            id = maintenance.id.ifEmpty { UUID.randomUUID().toString() },
            assetId = maintenance.assetId,
            title = maintenance.title.trim(),
            costCents = maintenance.costCents, // Exact Long integer cents
            performedDate = maintenance.performedDate,
            notes = maintenance.notes,
            serviceProvider = maintenance.serviceProvider?.trim()
        )
        dao.logMaintenance(entity)
        Result.success(Unit)
    }

    override fun observeWishlist(familyId: String): Flow<List<HouseholdWishlist>> {
        return dao.observeWishlist(familyId).map { list ->
            list.map { it.toDomain() }
        }
    }

    override suspend fun addWishlistItem(item: HouseholdWishlist): Result<HouseholdWishlist> = withContext(ioDispatcher) {
        val entity = HouseholdWishlistEntity(
            id = item.id.ifEmpty { UUID.randomUUID().toString() },
            familyId = item.familyId,
            itemName = item.itemName.trim(),
            estimatedCostCents = item.estimatedCostCents,
            priority = item.priority.name,
            category = item.category,
            url = item.url?.trim()
        )
        dao.insertWishlistItem(entity)
        Result.success(entity.toDomain())
    }

    private fun HomeAssetEntity.toDomain() = HomeAsset(
        id = id,
        familyId = familyId,
        name = name,
        category = AssetCategory.valueOf(category),
        description = description,
        purchaseDate = purchaseDate,
        purchasePriceCents = purchasePriceCents,
        warrantyExpiryDate = warrantyExpiryDate,
        serialNumber = serialNumber,
        location = location,
        nextMaintenanceDate = nextMaintenanceDate
    )

    private fun HouseholdWishlistEntity.toDomain() = HouseholdWishlist(
        id = id,
        familyId = familyId,
        itemName = itemName,
        estimatedCostCents = estimatedCostCents,
        priority = Priority.valueOf(priority),
        category = category,
        url = url
    )
}

// 8. Shared Calendar Repository Implementation
class CalendarRepositoryImpl(
    private val dao: CalendarDao,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO
) : CalendarRepository {

    override fun observeEvents(familyId: String, startDate: Long, endDate: Long): Flow<List<CalendarEvent>> {
        return dao.observeEventsBetween(familyId, startDate, endDate).map { list ->
            list.map { it.toDomain() }
        }
    }

    override fun observeAllEvents(familyId: String): Flow<List<CalendarEvent>> {
        return dao.observeAllEvents(familyId).map { list ->
            list.map { it.toDomain() }
        }
    }

    override suspend fun getEventById(id: String): Result<CalendarEvent?> = withContext(ioDispatcher) {
        val entity = dao.getEventById(id)
        Result.success(entity?.toDomain())
    }

    override suspend fun addEvent(event: CalendarEvent): Result<CalendarEvent> = withContext(ioDispatcher) {
        val entity = CalendarEventEntity(
            id = event.id.ifEmpty { UUID.randomUUID().toString() },
            familyId = event.familyId,
            title = event.title.trim(),
            eventDate = event.eventDate,
            eventTimeMillis = event.eventTimeMillis,
            category = event.category.name,
            sourceEntityId = event.sourceEntityId,
            description = event.description?.trim()
        )
        dao.insertEvent(entity)
        Result.success(entity.toDomain())
    }

    override suspend fun updateEvent(event: CalendarEvent): Result<CalendarEvent> = withContext(ioDispatcher) {
        val entity = CalendarEventEntity(
            id = event.id,
            familyId = event.familyId,
            title = event.title.trim(),
            eventDate = event.eventDate,
            eventTimeMillis = event.eventTimeMillis,
            category = event.category.name,
            sourceEntityId = event.sourceEntityId,
            description = event.description?.trim()
        )
        dao.insertEvent(entity) // REPLACE acts as update
        Result.success(entity.toDomain())
    }

    override suspend fun deleteEvent(id: String): Result<Unit> = withContext(ioDispatcher) {
        dao.deleteEvent(id)
        Result.success(Unit)
    }

    private fun CalendarEventEntity.toDomain() = CalendarEvent(
        id = id,
        familyId = familyId,
        title = title,
        eventDate = eventDate,
        eventTimeMillis = eventTimeMillis,
        category = try { CalendarEventCategory.valueOf(category) } catch (_: Exception) { CalendarEventCategory.FAMILY_EVENT },
        sourceEntityId = sourceEntityId,
        description = description
    )
}

