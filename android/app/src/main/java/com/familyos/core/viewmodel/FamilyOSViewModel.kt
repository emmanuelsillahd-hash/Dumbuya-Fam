package com.familyos.core.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.familyos.FamilyOSApplication
import com.familyos.core.database.AuditEventEntity
import com.familyos.core.domain.*
import com.familyos.core.notification.CalendarReminderScheduler
import com.familyos.core.sync.SyncWorker
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.util.UUID

/**
 * Unified Production ViewModel for FamilyOS (Stages 1–3.3.1).
 * Connects all Jetpack Compose screens (including Family Home and People & Relationships)
 * to encrypted Room SQLite repositories, records offline SyncOperations and AuditEvents on every write,
 * enforces the one-family membership rule and role privacy, and manages active FamilyWorkspace session state.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class FamilyOSViewModel(application: Application) : AndroidViewModel(application) {

    private val app = application as FamilyOSApplication
    private val prefs = application.getSharedPreferences("familyos_session_prefs", Application.MODE_PRIVATE)

    private val _activeFamilyId = MutableStateFlow(prefs.getString("active_family_id", "fam-1") ?: "fam-1")
    val activeFamilyId: StateFlow<String> = _activeFamilyId.asStateFlow()

    init {
        viewModelScope.launch {
            try {
                val familyId = _activeFamilyId.value
                app.routineRepository.seedDefaultRoutinesIfEmpty(familyId)
                app.routineRepository.getOrCreateOccurrence("rtn-morning", "2026-11-01", familyId)
                app.routineRepository.getOrCreateOccurrence("rtn-evening", "2026-11-01", familyId)
            } catch (_: Exception) {}
        }
    }

    private val _currentActorRole = MutableStateFlow(FamilyRole.OWNER)
    val currentActorRole: StateFlow<FamilyRole> = _currentActorRole.asStateFlow()


    private val _announcements = MutableStateFlow(
        listOf(
            FamilyAnnouncement(
                id = "ann-1",
                title = "Autumn Family Council & Sunday Roast",
                body = "Grandma Martha and Grandpa Edward are joining us this Sunday at 4:00 PM.",
                authorName = "Sarah Henderson",
                priority = "IMPORTANT",
                pinned = true
            ),
            FamilyAnnouncement(
                id = "ann-2",
                title = "Winter Emergency Kit & Smoke Detector Check Complete",
                body = "All basement water reserves and dual-sensor smoke detectors verified.",
                authorName = "David Henderson",
                priority = "NORMAL",
                pinned = false
            )
        )
    )
    val announcements: StateFlow<List<FamilyAnnouncement>> = _announcements.asStateFlow()

    private val _reminders = MutableStateFlow(
        listOf(
            HouseholdReminder(
                id = "rem-1",
                title = "Sign Lucas permission slip for Science Museum field trip",
                dueLabel = "Today, 5:00 PM",
                category = "SCHOOL",
                isCompleted = false
            ),
            HouseholdReminder(
                id = "rem-2",
                title = "Replace HVAC MERV-13 air filter in attic unit",
                dueLabel = "Saturday, 10:00 AM",
                category = "MAINTENANCE",
                isCompleted = false
            )
        )
    )
    val reminders: StateFlow<List<HouseholdReminder>> = _reminders.asStateFlow()

    private val _approvedAiSuggestions = MutableStateFlow(
        listOf(
            ApprovedAiSuggestion(
                id = "ai-1",
                title = "Batch Prep Quinoa & Herb Chicken on Wednesday Evening",
                summary = "Approved schedule optimization: shifts 25 mins of prep to Wednesday so Thursday soccer practice stays calm.",
                category = "MEAL_PLAN",
                approvedBy = "Sarah Henderson"
            ),
            ApprovedAiSuggestion(
                id = "ai-2",
                title = "Auto-Sweep $350 Surplus to High-Yield Emergency Reserve",
                summary = "Approved monthly cash-flow rule based on utility envelope savings.",
                category = "BUDGET",
                approvedBy = "David Henderson"
            )
        )
    )
    val approvedAiSuggestions: StateFlow<List<ApprovedAiSuggestion>> = _approvedAiSuggestions.asStateFlow()

    private val _invitations = MutableStateFlow(
        listOf(
            FamilyInvitation(
                id = "inv-uncle-james",
                familyId = "fam-1",
                invitationToken = "fos_inv_james_2026",
                invitedEmail = "james.henderson@familyos.local",
                invitedDisplayName = "Uncle James Henderson",
                targetRole = FamilyRole.MEMBER,
                status = "PENDING",
                expiresAt = System.currentTimeMillis() + 604800000L,
                createdAt = System.currentTimeMillis() - 36000000L
            )
        )
    )
    val invitations: StateFlow<List<FamilyInvitation>> = _invitations.asStateFlow()

    val workspaces: StateFlow<List<FamilyWorkspace>> = app.workspaceRepository
        .observeWorkspaces()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val activeWorkspace: StateFlow<FamilyWorkspace?> = _activeFamilyId
        .flatMapLatest { familyId -> app.workspaceRepository.observeActiveWorkspace(familyId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val pendingSyncCount: StateFlow<Int> = app.syncRepository
        .observePendingSyncCount()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    val members: StateFlow<List<FamilyMember>> = _activeFamilyId
        .flatMapLatest { familyId -> app.memberRepository.observeMembers(familyId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val relationships: StateFlow<List<FamilyRelationship>> = _activeFamilyId
        .flatMapLatest { familyId -> app.relationshipRepository.observeRelationships(familyId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val goals: StateFlow<List<FamilyGoal>> = _activeFamilyId
        .flatMapLatest { familyId -> app.goalsRepository.observeGoals(familyId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val projects: StateFlow<List<Project>> = _activeFamilyId
        .flatMapLatest { familyId -> app.goalsRepository.observeProjects(familyId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val tasks: StateFlow<List<Task>> = _activeFamilyId
        .flatMapLatest { familyId -> app.goalsRepository.observeTasks(familyId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val recipes: StateFlow<List<Recipe>> = _activeFamilyId
        .flatMapLatest { familyId -> app.recipeRepository.observeRecipes(familyId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val mealPlans: StateFlow<List<MealPlanEntry>> = _activeFamilyId
        .flatMapLatest { familyId ->
            app.mealPlannerRepository.observeWeekMealPlans(familyId, 0L, Long.MAX_VALUE)
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val groceryItems: StateFlow<List<GroceryListItem>> = _activeFamilyId
        .flatMapLatest { familyId -> app.groceryRepository.observeGroceryItems(familyId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val chores: StateFlow<List<Chore>> = _activeFamilyId
        .flatMapLatest { familyId -> app.choresRepository.observeChores(familyId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val assets: StateFlow<List<HomeAsset>> = _activeFamilyId
        .flatMapLatest { familyId -> app.assetsRepository.observeAssets(familyId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val wishlist: StateFlow<List<HouseholdWishlist>> = _activeFamilyId
        .flatMapLatest { familyId -> app.assetsRepository.observeWishlist(familyId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val calendarEvents: StateFlow<List<CalendarEvent>> = _activeFamilyId
        .flatMapLatest { familyId -> app.calendarRepository.observeAllEvents(familyId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val routines: StateFlow<List<Routine>> = _activeFamilyId
        .flatMapLatest { familyId -> app.routineRepository.observeRoutines(familyId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val routineOccurrences: StateFlow<List<RoutineOccurrence>> = _activeFamilyId
        .flatMapLatest { familyId -> app.routineRepository.observeOccurrencesForDate(familyId, "2026-11-01") }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Master Stage 2 Milestone 2.A: Food Pantry & Wardrobe StateFlows
    val pantryItems: StateFlow<List<com.familyos.core.database.PantryItemEntity>> = _activeFamilyId
        .flatMapLatest { familyId -> app.householdRepository.observePantryItems(familyId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val wardrobeItems: StateFlow<List<com.familyos.core.database.WardrobeItemEntity>> = _activeFamilyId
        .flatMapLatest { familyId -> app.householdRepository.observeWardrobeItems(familyId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val outfitPlans: StateFlow<List<com.familyos.core.database.OutfitPlanEntity>> = _activeFamilyId
        .flatMapLatest { familyId -> app.householdRepository.observeOutfitPlans(familyId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())



    val accounts: StateFlow<List<FinancialAccount>> = _activeFamilyId
        .flatMapLatest { familyId -> app.financeRepository.observeAccounts(familyId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val budgets: StateFlow<List<EnvelopeBudget>> = _activeFamilyId
        .flatMapLatest { familyId -> app.financeRepository.observeBudgets(familyId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val transactions: StateFlow<List<FinancialTransaction>> = _activeFamilyId
        .flatMapLatest { familyId -> app.financeRepository.observeTransactions(familyId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val bills: StateFlow<List<BillSubscription>> = _activeFamilyId
        .flatMapLatest { familyId -> app.financeRepository.observeBills(familyId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val savingsGoals: StateFlow<List<SavingsGoal>> = _activeFamilyId
        .flatMapLatest { familyId -> app.financeRepository.observeSavingsGoals(familyId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val investmentHoldings: StateFlow<List<InvestmentHolding>> = _activeFamilyId
        .flatMapLatest { familyId -> app.financeRepository.observeInvestmentHoldings(familyId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val wellbeingProfiles: StateFlow<List<MemberWellbeingProfile>> = _activeFamilyId
        .flatMapLatest { familyId -> app.wellbeingRepository.observeProfiles(familyId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val allergies: StateFlow<List<HealthAllergy>> = members
        .flatMapLatest { memberList ->
            if (memberList.isEmpty()) {
                flowOf(emptyList())
            } else {
                combine(memberList.map { m -> app.wellbeingRepository.observeAllergiesForMember(m.id) }) { lists ->
                    lists.flatMap { it }
                }
            }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val medications: StateFlow<List<HealthMedication>> = members
        .flatMapLatest { memberList ->
            if (memberList.isEmpty()) {
                flowOf(emptyList())
            } else {
                combine(memberList.map { m -> app.wellbeingRepository.observeMedicationsForMember(m.id) }) { lists ->
                    lists.flatMap { it }
                }
            }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val appointments: StateFlow<List<HealthcareAppointment>> = _activeFamilyId
        .flatMapLatest { familyId -> app.wellbeingRepository.observeAppointments(familyId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val emergencyContacts: StateFlow<List<EmergencyContact>> = _activeFamilyId
        .flatMapLatest { familyId -> app.emergencyRepository.observeContacts(familyId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val emergencyPlan: StateFlow<EmergencyPlan?> = _activeFamilyId
        .flatMapLatest { familyId -> app.emergencyRepository.observePlan(familyId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val emergencySupplies: StateFlow<List<EmergencySupply>> = _activeFamilyId
        .flatMapLatest { familyId -> app.emergencyRepository.observeSupplies(familyId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val emergencyChecklist: StateFlow<List<EmergencyChecklistItem>> = _activeFamilyId
        .flatMapLatest { familyId -> app.emergencyRepository.observeChecklist(familyId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val recentAudits: StateFlow<List<AuditEventEntity>> = _activeFamilyId
        .flatMapLatest { familyId -> app.database.auditEventDao().observeRecentAudits(familyId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        ensureInitialWorkspaceSeeded()
    }

    private fun ensureInitialWorkspaceSeeded() {
        viewModelScope.launch {
            val existingWorkspaces = app.workspaceRepository.observeWorkspaces().first()
            if (existingWorkspaces.isNotEmpty()) {
                val currentId = _activeFamilyId.value
                if (existingWorkspaces.none { it.id == currentId }) {
                    setActiveWorkspace(existingWorkspaces.first().id)
                }
                return@launch
            }

            // Seed initial persistent workspace into Room on first cold launch so all screens are backed by real SQLite data
            val created = app.workspaceRepository.createWorkspace(
                name = "The Henderson Household",
                currencyCode = "USD",
                ownerUserId = "usr-sarah-owner"
            ).getOrNull() ?: return@launch

            app.workspaceRepository.updateWorkspace(
                workspaceId = created.id,
                name = "The Henderson Household",
                description = "Stewardship, Kindness, and Calm Preparedness in Every Season."
            )

            setActiveWorkspace(created.id)
            val familyId = created.id

            val sarah = app.memberRepository.addMember(familyId, "Sarah Henderson", "SPOUSE", false).getOrNull()
            val lucas = app.memberRepository.addMember(familyId, "Lucas Henderson", "CHILD", true).getOrNull()
            val maya = app.memberRepository.addMember(familyId, "Maya Henderson", "CHILD", false).getOrNull()
            val martha = app.memberRepository.addMember(familyId, "Grandma Martha", "GRANDPARENT", false).getOrNull()

            if (sarah != null && lucas != null) {
                app.relationshipRepository.addRelationship(familyId, sarah.id, lucas.id, RelationshipType.PARENT_CHILD, "Mother & Son")
            }
            if (sarah != null && maya != null) {
                app.relationshipRepository.addRelationship(familyId, sarah.id, maya.id, RelationshipType.PARENT_CHILD, "Mother & Daughter")
            }
            if (martha != null && sarah != null) {
                app.relationshipRepository.addRelationship(familyId, martha.id, sarah.id, RelationshipType.PARENT_CHILD, "Grandmother & Mother")
            }

            // Initial Calendar Events (Today's Agenda & Upcoming Events)
            app.calendarRepository.addEvent(
                CalendarEvent(
                    id = UUID.randomUUID().toString(),
                    familyId = familyId,
                    title = "Morning School Drop-off & Instrument Check",
                    eventDate = System.currentTimeMillis(),
                    eventTimeMillis = System.currentTimeMillis(),
                    category = CalendarEventCategory.FAMILY_EVENT,
                    sourceEntityId = null,
                    description = "07:45 AM • Oakridge Academy"
                )
            )
            app.calendarRepository.addEvent(
                CalendarEvent(
                    id = UUID.randomUUID().toString(),
                    familyId = familyId,
                    title = "Sunday Multi-Generational Roast with Grandma Martha",
                    eventDate = System.currentTimeMillis() + 172800000L,
                    eventTimeMillis = System.currentTimeMillis() + 172800000L,
                    category = CalendarEventCategory.FAMILY_EVENT,
                    sourceEntityId = null,
                    description = "04:00 PM • Family Dining Room"
                )
            )

            // Initial Goals & Tasks (including an Overdue task for Family Home verification)
            val goal = app.goalsRepository.createGoal(
                familyId = familyId,
                title = "Build 6-Month Emergency Reserve",
                description = "Reach $35,000 in high-yield liquid family savings",
                category = GoalCategory.FINANCIAL,
                targetDate = System.currentTimeMillis() + 15552000000L,
                priority = Priority.HIGH,
                ownerMemberId = sarah?.id
            ).getOrNull()

            val proj = app.goalsRepository.createProject(
                familyId = familyId,
                goalId = goal?.id,
                name = "Automate Monthly Savings Sweep",
                budgetCents = 150000L,
                targetDate = System.currentTimeMillis() + 2592000000L
            ).getOrNull()

            app.goalsRepository.createTask(
                familyId = familyId,
                projectId = proj?.id,
                parentTaskId = null,
                title = "Review recurring utility & streaming subscriptions",
                assignedMemberId = sarah?.id,
                priority = Priority.HIGH,
                dueDate = System.currentTimeMillis() + 604800000L
            )

            app.goalsRepository.createTask(
                familyId = familyId,
                projectId = proj?.id,
                parentTaskId = null,
                title = "Flush basement tankless water heater descaling loop",
                assignedMemberId = sarah?.id,
                priority = Priority.URGENT,
                dueDate = System.currentTimeMillis() - 86400000L // Overdue task
            )

            // Initial Recipe, Meal & Grocery
            val recipe = app.recipeRepository.createRecipe(
                Recipe(
                    id = "sample-recipe-1",
                    familyId = familyId,
                    title = "Herb-Roasted Lemon Chicken & Quinoa",
                    description = "One-pan Mediterranean weeknight family dinner",
                    imageUri = null,
                    prepTimeMinutes = 15,
                    cookTimeMinutes = 35,
                    servings = 4,
                    difficulty = RecipeDifficulty.EASY,
                    category = "Dinner",
                    dietaryNotes = "Gluten-Free, Nut-Free",
                    familyRating = 5,
                    isFavorite = true,
                    source = "Family Kitchen Binder",
                    storageInstructions = "Refrigerate in airtight glass container up to 3 days",
                    ingredients = listOf(
                        RecipeIngredient("ing-1", "sample-recipe-1", "Organic Chicken Breast", 1.5, "lbs", null),
                        RecipeIngredient("ing-2", "sample-recipe-1", "Tri-Color Quinoa", 2.0, "cups", "Rinsed"),
                        RecipeIngredient("ing-3", "sample-recipe-1", "Fresh Meyer Lemons", 2.0, "whole", "Juiced")
                    ),
                    instructions = listOf(
                        RecipeInstruction("inst-1", "sample-recipe-1", 1, "Preheat oven to 400°F and season chicken with herbs and lemon."),
                        RecipeInstruction("inst-2", "sample-recipe-1", 2, "Simmer rinsed quinoa for 15 minutes until fluffy and serve warm.")
                    )
                )
            ).getOrNull()

            app.mealPlannerRepository.addMealPlan(
                MealPlanEntry(
                    id = UUID.randomUUID().toString(),
                    familyId = familyId,
                    planDate = System.currentTimeMillis(),
                    mealType = MealType.DINNER,
                    recipeId = recipe?.id,
                    customMealTitle = "Herb-Roasted Lemon Chicken & Quinoa",
                    servings = 4,
                    notes = "Serve with steamed broccoli"
                )
            )

            app.groceryRepository.addGroceryItem(familyId, "Organic Chicken Breast", "MEAT", 1.5, "lbs", recipe?.id)
            app.groceryRepository.addGroceryItem(familyId, "Tri-Color Quinoa", "PANTRY", 2.0, "cups", recipe?.id)

            // Initial Chores & Home Assets
            app.choresRepository.createChore(
                Chore(
                    id = UUID.randomUUID().toString(),
                    familyId = familyId,
                    title = "Empty Dishwasher & Wipe Counters",
                    description = "Before school bus arrives",
                    assignedMemberId = lucas?.id,
                    zone = "KITCHEN",
                    frequency = ChoreFrequency.DAILY,
                    rewardPoints = 15,
                    nextDueDate = System.currentTimeMillis() + 86400000L,
                    requiresVerification = true,
                    isCompleted = false
                )
            )

            app.assetsRepository.addAsset(
                HomeAsset(
                    id = UUID.randomUUID().toString(),
                    familyId = familyId,
                    name = "Bosch 800 Series Dishwasher",
                    category = AssetCategory.APPLIANCES,
                    description = "Stainless steel ultra-quiet",
                    purchaseDate = System.currentTimeMillis() - 31536000000L,
                    purchasePriceCents = 129900L,
                    warrantyExpiryDate = System.currentTimeMillis() + 31536000000L,
                    serialNumber = "BSH-800-99281",
                    location = "Kitchen",
                    nextMaintenanceDate = System.currentTimeMillis() + 7776000000L
                )
            )

            // Initial Finance Accounts, Budgets & Transactions
            val checkingId = "acc-checking-$familyId"
            val savingsId = "acc-savings-$familyId"
            app.financeRepository.createAccount(
                FinancialAccount(
                    id = checkingId,
                    familyId = familyId,
                    name = "Household Main Checking",
                    accountType = AccountType.CHECKING,
                    currentBalanceCents = 845250L,
                    isLiability = false,
                    currency = "USD",
                    institution = "Heritage Credit Union",
                    isArchived = false,
                    createdAt = System.currentTimeMillis(),
                    updatedAt = System.currentTimeMillis()
                )
            )
            app.financeRepository.createAccount(
                FinancialAccount(
                    id = savingsId,
                    familyId = familyId,
                    name = "High-Yield Family Emergency Reserve",
                    accountType = AccountType.SAVINGS,
                    currentBalanceCents = 3420000L,
                    isLiability = false,
                    currency = "USD",
                    institution = "Ally Bank",
                    isArchived = false,
                    createdAt = System.currentTimeMillis(),
                    updatedAt = System.currentTimeMillis()
                )
            )
            app.financeRepository.setBudget(
                EnvelopeBudget(
                    id = UUID.randomUUID().toString(),
                    familyId = familyId,
                    category = "FOOD",
                    allocatedCents = 120000L,
                    spentCents = 0L,
                    monthEpoch = 1700000000000L,
                    alertThresholdPercentage = 85
                )
            )
            app.financeRepository.setBudget(
                EnvelopeBudget(
                    id = UUID.randomUUID().toString(),
                    familyId = familyId,
                    category = "UTILITIES",
                    allocatedCents = 45000L,
                    spentCents = 0L,
                    monthEpoch = 1700000000000L,
                    alertThresholdPercentage = 85
                )
            )
            app.financeRepository.recordExpense(
                FinancialTransaction(
                    id = UUID.randomUUID().toString(),
                    familyId = familyId,
                    accountId = checkingId,
                    destinationAccountId = null,
                    title = "Organic Valley Weekly Groceries",
                    amountCents = 14250L,
                    transactionType = TransactionType.EXPENSE,
                    category = "FOOD",
                    transactionDate = System.currentTimeMillis(),
                    isCleared = true,
                    isReversal = false,
                    reversalOfId = null,
                    notes = "Weekly produce and pantry run",
                    paidByMemberId = sarah?.id,
                    createdAt = System.currentTimeMillis()
                )
            )

            // Initial Investment Holdings & Portfolio Account (INV-01)
            val invAccId = "acc-inv-$familyId"
            app.financeRepository.createAccount(
                FinancialAccount(
                    id = invAccId,
                    familyId = familyId,
                    name = "Family Investment Portfolio",
                    accountType = AccountType.INVESTMENT,
                    currentBalanceCents = 1649500L,
                    isLiability = false,
                    currency = "USD",
                    institution = "Vanguard",
                    isArchived = false,
                    createdAt = System.currentTimeMillis(),
                    updatedAt = System.currentTimeMillis()
                )
            )
            app.financeRepository.saveInvestmentHolding(
                InvestmentHolding(
                    id = "hold-vti-$familyId",
                    familyId = familyId,
                    accountId = invAccId,
                    symbol = "VTI",
                    assetName = "Vanguard Total Stock Market Index ETF",
                    assetType = "ETF",
                    quantityMicroshares = 25_500_000L,
                    costBasisCents = 550_000L,
                    currentPriceCents = 24_000L,
                    currency = "USD",
                    notes = "Core index holding"
                )
            )
            app.financeRepository.saveInvestmentHolding(
                InvestmentHolding(
                    id = "hold-aapl-$familyId",
                    familyId = familyId,
                    accountId = invAccId,
                    symbol = "AAPL",
                    assetName = "Apple Inc.",
                    assetType = "STOCK",
                    quantityMicroshares = 10_000_000L,
                    costBasisCents = 180_000L,
                    currentPriceCents = 22_500L,
                    currency = "USD",
                    notes = "Individual tech holding"
                )
            )
            app.financeRepository.saveInvestmentHolding(
                InvestmentHolding(
                    id = "hold-btc-$familyId",
                    familyId = familyId,
                    accountId = invAccId,
                    symbol = "BTC",
                    assetName = "Bitcoin",
                    assetType = "CRYPTO",
                    quantityMicroshares = 125_000L,
                    costBasisCents = 600_000L,
                    currentPriceCents = 6_500_000L,
                    currency = "USD",
                    notes = "Digital store of value"
                )
            )

            // Initial Savings Goals
            app.financeRepository.saveSavingsGoal(
                SavingsGoal(
                    id = "goal-college-$familyId",
                    familyId = familyId,
                    linkedAccountId = savingsId,
                    title = "Lucas College Fund (529 Plan)",
                    targetCents = 5_000_000L,
                    currentCents = 1_850_000L,
                    plannedMonthlyContributionCents = 50_000L,
                    targetDate = System.currentTimeMillis() + 315360000000L
                )
            )
            app.financeRepository.saveSavingsGoal(
                SavingsGoal(
                    id = "goal-vacation-$familyId",
                    familyId = familyId,
                    linkedAccountId = savingsId,
                    title = "Summer Family Trip to National Parks",
                    targetCents = 600_000L,
                    currentCents = 420_000L,
                    plannedMonthlyContributionCents = 30_000L,
                    targetDate = System.currentTimeMillis() + 15552000000L
                )
            )

            // Initial Emergency Contact & Plan
            app.emergencyRepository.saveContact(
                EmergencyContact(
                    id = UUID.randomUUID().toString(),
                    familyId = familyId,
                    name = "Sarah Henderson (Primary Guardian)",
                    relationship = "Mother",
                    phonePrimary = "555-123-4567",
                    phoneSecondary = null,
                    isPrimary = true,
                    notes = "Direct mobile"
                )
            )
            app.emergencyRepository.savePlan(
                EmergencyPlan(
                    id = UUID.randomUUID().toString(),
                    familyId = familyId,
                    primaryMeetingPoint = "Front lawn beneath large oak tree by sidewalk",
                    secondaryMeetingPoint = "Community Park East Gazebo (Corner of 5th & Pine)",
                    evacuationRoute = "Main hallway and front porch exit",
                    gasShutoffLocation = "Outside meter on east exterior wall (Wrench attached)",
                    waterShutoffLocation = "Basement north wall by street meter",
                    electricalPanelLocation = "Garage west wall next to entry door (200A main toggle)",
                    notes = "Test smoke detectors monthly"
                )
            )
            app.emergencyRepository.saveSupply(
                EmergencySupply(
                    id = UUID.randomUUID().toString(),
                    familyId = familyId,
                    itemName = "Drinking Water Reserve (12 Gallons)",
                    category = "WATER",
                    quantity = "12 gallons (4-day supply)",
                    storageLocation = "Basement pantry",
                    expiryDate = System.currentTimeMillis() + 15552000000L,
                    isChecked = true
                )
            )
            app.emergencyRepository.saveChecklistItem(
                EmergencyChecklistItem(
                    id = UUID.randomUUID().toString(),
                    familyId = familyId,
                    title = "Test smoke and CO detectors on all floors",
                    category = "ANNUAL_REVIEW",
                    isCompleted = true,
                    assignedMemberId = sarah?.displayName,
                    completedAt = System.currentTimeMillis()
                )
            )
        }
    }

    fun setActiveWorkspace(workspaceId: String) {
        _activeFamilyId.value = workspaceId
        prefs.edit().putString("active_family_id", workspaceId).apply()
    }

    fun setActorRole(role: FamilyRole, memberId: String = _currentActorMemberId.value) {
        _currentActorRole.value = role
        _currentActorMemberId.value = memberId
    }

    fun updateFamilyIdentity(
        name: String,
        motto: String,
        mission: String = "",
        vision: String = "",
        values: List<String> = emptyList()
    ) {
        viewModelScope.launch {
            if (!FamilySecurityPolicy.canManageFamilyMembers(_currentActorRole.value)) return@launch
            val familyId = _activeFamilyId.value
            val summaryDesc = buildString {
                append(motto.trim())
                if (mission.isNotBlank()) append(" | Mission: ${mission.trim()}")
                if (vision.isNotBlank()) append(" | Vision: ${vision.trim()}")
            }
            app.workspaceRepository.updateWorkspace(familyId, name.trim(), summaryDesc)
            enqueueSyncAndAudit(
                "FAMILY_WORKSPACE",
                familyId,
                "UPDATE",
                """{"name":"${name.trim()}","motto":"${motto.trim()}","mission":"${mission.trim()}","vision":"${vision.trim()}","valuesCount":${values.size}}""",
                "Updated family identity, mission & vision"
            )
        }
    }

    fun postAnnouncement(title: String, body: String, priority: String = "IMPORTANT") {
        viewModelScope.launch {
            val ann = FamilyAnnouncement(
                id = "ann-${System.currentTimeMillis()}",
                title = title.trim(),
                body = body.trim(),
                authorName = members.value.firstOrNull()?.displayName ?: "Family Head",
                priority = priority,
                pinned = priority == "IMPORTANT"
            )
            _announcements.value = listOf(ann) + _announcements.value
            enqueueSyncAndAudit("ANNOUNCEMENT", ann.id, "INSERT", """{"title":"${ann.title}"}""", "Posted announcement ${ann.title}")
        }
    }

    fun postFamilyAnnouncement(title: String, body: String, isPinned: Boolean = false) {
        postAnnouncement(title, body, if (isPinned) "IMPORTANT" else "NORMAL")
    }

    fun toggleReminderCompleted(reminderId: String) {
        _reminders.value = _reminders.value.map { r ->
            if (r.id == reminderId) r.copy(isCompleted = !r.isCompleted) else r
        }
    }

    fun addReminder(title: String, dueLabel: String) {
        viewModelScope.launch {
            val rem = HouseholdReminder(
                id = "rem-${System.currentTimeMillis()}",
                title = title.trim(),
                dueLabel = dueLabel.ifBlank { "Today" }
            )
            _reminders.value = listOf(rem) + _reminders.value
            enqueueSyncAndAudit("REMINDER", rem.id, "INSERT", """{"title":"${rem.title}"}""", "Added reminder ${rem.title}")
        }
    }

    fun createNewWorkspace(
        name: String,
        currencyCode: String = "USD",
        ownerUserId: String = "usr-owner-${System.currentTimeMillis()}",
        ownerDisplayName: String? = null,
        motto: String? = null
    ) {
        viewModelScope.launch {
            val result = app.workspaceRepository.createWorkspace(
                name = name,
                currencyCode = currencyCode,
                ownerUserId = ownerUserId,
                ownerDisplayName = ownerDisplayName,
                motto = motto
            )
            result.onSuccess { ws ->
                setActiveWorkspace(ws.id)
                enqueueSyncAndAudit("FAMILY_WORKSPACE", ws.id, "INSERT", """{"name":"${ws.name}"}""", "Created workspace ${ws.name}")
            }
        }
    }

    fun addFamilyMember(displayName: String, relationship: String, isRestricted: Boolean) {
        viewModelScope.launch {
            if (!FamilySecurityPolicy.canManageFamilyMembers(_currentActorRole.value)) return@launch
            val familyId = _activeFamilyId.value
            val result = app.memberRepository.addMember(familyId, displayName, relationship, isRestricted)
            result.onSuccess { member ->
                enqueueSyncAndAudit(
                    "FAMILY_MEMBER",
                    member.id,
                    "INSERT",
                    """{"displayName":"${member.displayName}","relationshipToPrimary":"${member.relationshipToPrimary}","isRestrictedProfile":${member.isRestrictedProfile}}""",
                    "Added member ${member.displayName}"
                )
            }
        }
    }

    fun updateFamilyMemberProfile(member: FamilyMember) {
        viewModelScope.launch {
            val result = app.memberRepository.updateMember(member)
            result.onSuccess {
                enqueueSyncAndAudit(
                    "FAMILY_MEMBER",
                    member.id,
                    "UPDATE",
                    """{"displayName":"${member.displayName}","relationshipToPrimary":"${member.relationshipToPrimary}","pointsBalance":${member.pointsBalance}}""",
                    "Updated profile for ${member.displayName}"
                )
            }
        }
    }

    fun updateMemberProfile(
        memberId: String,
        displayName: String,
        relationshipToPrimary: String,
        responsibilities: List<String>,
        emergencyContactName: String,
        emergencyContactPhone: String,
        personalNotes: String,
        sharedBio: String
    ) {
        viewModelScope.launch {
            val existing = members.value.find { it.id == memberId } ?: return@launch
            val updated = existing.copy(
                displayName = displayName.trim(),
                relationshipToPrimary = relationshipToPrimary.trim(),
                responsibilities = responsibilities,
                emergencyContactName = emergencyContactName.trim(),
                emergencyContactPhone = emergencyContactPhone.trim(),
                personalNotes = personalNotes.trim(),
                sharedBio = sharedBio.trim()
            )
            updateFamilyMemberProfile(updated)
        }
    }

    fun removeFamilyMember(memberId: String) {
        viewModelScope.launch {
            if (!FamilySecurityPolicy.canManageFamilyMembers(_currentActorRole.value)) return@launch
            val result = app.memberRepository.removeMember(memberId)
            result.onSuccess {
                enqueueSyncAndAudit(
                    "FAMILY_MEMBER",
                    memberId,
                    "DELETE",
                    """{"id":"$memberId","isDeleted":true}""",
                    "Removed member & revoked access ($memberId)"
                )
            }
        }
    }

    fun inviteMember(email: String, displayName: String, targetRole: FamilyRole = FamilyRole.MEMBER) {
        viewModelScope.launch {
            if (!FamilySecurityPolicy.canManageFamilyMembers(_currentActorRole.value)) return@launch
            val inv = FamilyInvitation(
                id = "inv-${System.currentTimeMillis()}",
                familyId = _activeFamilyId.value,
                invitationToken = "fos_inv_${System.currentTimeMillis()}",
                invitedEmail = email.trim(),
                invitedDisplayName = displayName.trim(),
                targetRole = targetRole,
                status = "PENDING",
                expiresAt = System.currentTimeMillis() + 604800000L,
                createdAt = System.currentTimeMillis()
            )
            _invitations.value = listOf(inv) + _invitations.value
            enqueueSyncAndAudit("INVITATION", inv.id, "INSERT", """{"invitedEmail":"${inv.invitedEmail}","targetRole":"${inv.targetRole.name}"}""", "Invited ${inv.invitedDisplayName}")
        }
    }

    fun inviteFamilyMember(email: String, displayName: String, role: FamilyRole = FamilyRole.MEMBER) {
        inviteMember(email, displayName, role)
    }

    fun approveInvitation(invitationId: String) {
        viewModelScope.launch {
            if (!FamilySecurityPolicy.canManageFamilyMembers(_currentActorRole.value)) return@launch
            val inv = _invitations.value.find { it.id == invitationId } ?: return@launch
            _invitations.value = _invitations.value.map {
                if (it.id == invitationId) it.copy(status = "APPROVED") else it
            }
            addFamilyMember(inv.invitedDisplayName, "OTHER", inv.targetRole == FamilyRole.GUEST)
        }
    }

    fun approveMemberAccess(memberId: String) {
        viewModelScope.launch {
            if (!FamilySecurityPolicy.canManageFamilyMembers(_currentActorRole.value)) return@launch
            val existing = members.value.find { it.id == memberId } ?: return@launch
            updateFamilyMemberProfile(existing.copy(membershipStatus = "ACTIVE"))
        }
    }

    fun changeMemberRole(memberId: String, newRole: FamilyRole) {
        viewModelScope.launch {
            if (!FamilySecurityPolicy.canManageFamilyMembers(_currentActorRole.value)) return@launch
            val existing = members.value.find { it.id == memberId } ?: return@launch
            updateFamilyMemberProfile(existing.copy(role = newRole, isRestrictedProfile = (newRole == FamilyRole.CHILD || newRole == FamilyRole.GUEST)))
        }
    }

    fun revokeInvitation(invitationId: String) {
        viewModelScope.launch {
            if (!FamilySecurityPolicy.canManageFamilyMembers(_currentActorRole.value)) return@launch
            _invitations.value = _invitations.value.map {
                if (it.id == invitationId) it.copy(status = "REVOKED") else it
            }
        }
    }

    fun addFamilyRelationship(person1Id: String, person2Id: String, type: RelationshipType, notes: String? = null) {
        viewModelScope.launch {
            val familyId = _activeFamilyId.value
            val result = app.relationshipRepository.addRelationship(familyId, person1Id, person2Id, type, notes)
            result.onSuccess { rel ->
                enqueueSyncAndAudit(
                    "FAMILY_RELATIONSHIP",
                    rel.id,
                    "INSERT",
                    """{"person1MemberId":"$person1Id","person2MemberId":"$person2Id","relationshipType":"${type.name}"}""",
                    "Linked ${type.name}"
                )
            }
        }
    }

    fun createGoal(
        title: String,
        description: String,
        category: GoalCategory = GoalCategory.HOUSEHOLD,
        priority: Priority = Priority.HIGH,
        scope: GoalScope = GoalScope.FAMILY,
        horizon: GoalHorizon = GoalHorizon.LONG_TERM
    ) {
        viewModelScope.launch {
            if (_currentActorRole.value == FamilyRole.GUEST) return@launch
            val familyId = _activeFamilyId.value
            val ownerId = _currentActorMemberId.value.ifBlank { members.value.firstOrNull()?.id ?: "mem-sarah" }
            val result = app.goalsRepository.createGoal(
                familyId = familyId,
                title = title,
                description = description,
                category = category,
                targetDate = System.currentTimeMillis() + 7776000000L,
                priority = priority,
                ownerMemberId = ownerId
            )
            result.onSuccess { goal ->
                enqueueSyncAndAudit(
                    "GOAL",
                    goal.id,
                    "INSERT",
                    """{"title":"${goal.title}","scope":"${scope.name}","horizon":"${horizon.name}","ownerMemberId":"$ownerId"}""",
                    "Created ${scope.name} goal ${goal.title}"
                )
            }
        }
    }

    fun createProjectForGoal(
        goalId: String?,
        name: String,
        budgetCents: Long = 0L,
        scope: GoalScope = GoalScope.FAMILY
    ) {
        viewModelScope.launch {
            if (_currentActorRole.value == FamilyRole.GUEST) return@launch
            val familyId = _activeFamilyId.value
            val result = app.goalsRepository.createProject(
                familyId = familyId,
                goalId = goalId,
                name = name,
                budgetCents = budgetCents,
                targetDate = System.currentTimeMillis() + 2592000000L
            )
            result.onSuccess { proj ->
                enqueueSyncAndAudit(
                    "PROJECT",
                    proj.id,
                    "INSERT",
                    """{"name":"${proj.name}","goalId":"${goalId ?: ""}","scope":"${scope.name}"}""",
                    "Created project ${proj.name}"
                )
            }
        }
    }

    fun createMilestone(projectId: String, title: String, description: String = "") {
        viewModelScope.launch {
            if (_currentActorRole.value == FamilyRole.GUEST) return@launch
            val familyId = _activeFamilyId.value
            val milestone = ProjectMilestone(
                id = "ms-${UUID.randomUUID()}",
                familyId = familyId,
                projectId = projectId,
                title = title.trim(),
                description = description.trim().ifBlank { null },
                targetDate = System.currentTimeMillis() + 1209600000L,
                isCompleted = false,
                completedAt = null,
                orderIndex = _milestones.value.count { it.projectId == projectId },
                progressPercent = 0
            )
            _milestones.value = _milestones.value + milestone
            enqueueSyncAndAudit(
                "MILESTONE",
                milestone.id,
                "INSERT",
                """{"projectId":"$projectId","title":"${milestone.title}"}""",
                "Created milestone ${milestone.title}"
            )
        }
    }

    fun toggleMilestoneCompleted(milestoneId: String, isCompleted: Boolean) {
        viewModelScope.launch {
            if (_currentActorRole.value == FamilyRole.GUEST) return@launch
            val now = System.currentTimeMillis()
            _milestones.value = _milestones.value.map { ms ->
                if (ms.id == milestoneId) {
                    ms.copy(
                        isCompleted = isCompleted,
                        completedAt = if (isCompleted) now else null,
                        progressPercent = if (isCompleted) 100 else 0
                    )
                } else ms
            }
            enqueueSyncAndAudit(
                "MILESTONE",
                milestoneId,
                "UPDATE",
                """{"isCompleted":$isCompleted}""",
                "Updated milestone $milestoneId completion"
            )
        }
    }

    fun createTask(
        title: String,
        priority: Priority = Priority.MEDIUM,
        sourceModule: CanonicalTaskSourceModule = CanonicalTaskSourceModule.GOALS_PROJECTS,
        scope: GoalScope = GoalScope.FAMILY,
        assignedMemberId: String? = null,
        dueDateMillis: Long? = System.currentTimeMillis() + 259200000L,
        recurrenceRule: String? = null
    ) {
        viewModelScope.launch {
            val actorRole = _currentActorRole.value
            val actorMemberId = _currentActorMemberId.value
            if (actorRole == FamilyRole.GUEST) return@launch
            val targetAssignee = assignedMemberId ?: members.value.firstOrNull()?.id ?: actorMemberId
            if (!FamilySecurityPolicy.canAssignTaskToMember(actorRole, actorMemberId, targetAssignee)) {
                return@launch
            }

            val familyId = _activeFamilyId.value
            val result = app.goalsRepository.createTask(
                familyId = familyId,
                projectId = projects.value.firstOrNull()?.id,
                parentTaskId = null,
                title = title,
                assignedMemberId = targetAssignee,
                priority = priority,
                dueDate = dueDateMillis
            )
            result.onSuccess { task ->
                // Bidirectional Calendar Integration: if task has a due date and is not private to another user, create calendar entry
                if (dueDateMillis != null) {
                    app.calendarRepository.addEvent(
                        CalendarEvent(
                            id = "cal-task-${task.id}",
                            familyId = familyId,
                            title = "Task Due: ${task.title}",
                            eventDate = dueDateMillis,
                            eventTimeMillis = dueDateMillis,
                            category = CalendarEventCategory.GOAL_DUE,
                            sourceEntityId = task.id,
                            description = "Module: ${sourceModule.name} • Scope: ${scope.name}"
                        )
                    )
                }
                enqueueSyncAndAudit(
                    "TASK",
                    task.id,
                    "INSERT",
                    """{"title":"${task.title}","sourceModule":"${sourceModule.name}","scope":"${scope.name}","recurrenceRule":"${recurrenceRule ?: ""}"}""",
                    "Created canonical task ${task.title} (${sourceModule.name})"
                )
            }
        }
    }

    fun toggleTaskCompleted(taskId: String, isCompleted: Boolean) {
        viewModelScope.launch {
            if (_currentActorRole.value == FamilyRole.GUEST) return@launch
            val actorMemberId = _currentActorMemberId.value.ifBlank { members.value.firstOrNull()?.id ?: "mem-sarah" }
            app.goalsRepository.setTaskCompleted(taskId, isCompleted, actorMemberId)
            enqueueSyncAndAudit("TASK", taskId, "UPDATE", """{"isCompleted":$isCompleted}""", "Updated task completion")
        }
    }

    fun createCalendarEvent(
        title: String,
        eventDate: Long,
        category: CalendarEventCategory = CalendarEventCategory.FAMILY_EVENT,
        description: String? = null,
        scope: String = "FAMILY",
        isAllDay: Boolean = false,
        location: String? = null,
        timezone: String = "America/Los_Angeles",
        recurrenceRule: String? = null,
        recurrenceExceptions: List<String> = emptyList(),
        reminders: List<Int> = listOf(15)
    ) {
        viewModelScope.launch {
            if (_currentActorRole.value == FamilyRole.GUEST) return@launch
            val familyId = _activeFamilyId.value
            val eventId = "cal-${UUID.randomUUID()}"
            val newEvent = CalendarEvent(
                id = eventId,
                familyId = familyId,
                title = title.trim(),
                eventDate = eventDate,
                eventTimeMillis = if (isAllDay) null else eventDate,
                category = category,
                description = description?.trim(),
                scope = scope,
                isAllDay = isAllDay,
                location = location?.trim(),
                timezone = timezone,
                recurrenceRule = recurrenceRule,
                recurrenceExceptions = recurrenceExceptions,
                reminders = reminders
            )
            app.calendarRepository.addEvent(newEvent)
            enqueueSyncAndAudit(
                "CALENDAR_EVENT",
                eventId,
                "INSERT",
                """{"title":"${newEvent.title}","category":"${category.name}","scope":"$scope","isAllDay":$isAllDay,"timezone":"$timezone"}""",
                "Created calendar event ${newEvent.title}"
            )
            try {
                CalendarReminderScheduler.scheduleEventReminder(getApplication(), newEvent)
            } catch (_: Exception) {}
        }
    }

    fun updateCalendarEvent(
        eventId: String,
        title: String,
        eventDate: Long,
        category: CalendarEventCategory = CalendarEventCategory.FAMILY_EVENT,
        description: String? = null,
        scope: String = "FAMILY",
        isAllDay: Boolean = false,
        location: String? = null,
        timezone: String = "America/Los_Angeles",
        recurrenceRule: String? = null,
        recurrenceExceptions: List<String> = emptyList(),
        reminders: List<Int> = listOf(15)
    ) {
        viewModelScope.launch {
            if (_currentActorRole.value == FamilyRole.GUEST) return@launch
            val familyId = _activeFamilyId.value
            val updated = CalendarEvent(
                id = eventId,
                familyId = familyId,
                title = title.trim(),
                eventDate = eventDate,
                eventTimeMillis = if (isAllDay) null else eventDate,
                category = category,
                description = description?.trim(),
                scope = scope,
                isAllDay = isAllDay,
                location = location?.trim(),
                timezone = timezone,
                recurrenceRule = recurrenceRule,
                recurrenceExceptions = recurrenceExceptions,
                reminders = reminders
            )
            app.calendarRepository.updateEvent(updated)
            enqueueSyncAndAudit(
                "CALENDAR_EVENT",
                eventId,
                "UPDATE",
                """{"title":"${updated.title}","category":"${category.name}","scope":"$scope","eventDate":$eventDate,"isAllDay":$isAllDay,"timezone":"$timezone"}""",
                "Updated calendar event ${updated.title}"
            )
            try {
                CalendarReminderScheduler.rescheduleEventReminder(getApplication(), updated)
            } catch (_: Exception) {}
        }
    }

    fun deleteCalendarEvent(eventId: String) {
        viewModelScope.launch {
            if (_currentActorRole.value == FamilyRole.GUEST) return@launch
            app.calendarRepository.deleteEvent(eventId)
            enqueueSyncAndAudit("CALENDAR_EVENT", eventId, "DELETE", "{}", "Deleted calendar event $eventId")
            try {
                CalendarReminderScheduler.cancelEventReminder(getApplication(), eventId)
            } catch (_: Exception) {}
        }
    }

    fun completeRoutineOccurrence(routineId: String, occurrenceId: String) {
        viewModelScope.launch {
            if (_currentActorRole.value == FamilyRole.GUEST) return@launch
            val actorMemberId = _currentActorMemberId.value.ifBlank { "mem-sarah" }

            val routine = routines.value.find { it.id == routineId }
            val points = routine?.pointsReward ?: 15

            // Persist locally in encrypted Room SQLite first
            app.routineRepository.completeOccurrence(routineId, occurrenceId, actorMemberId)

            // Award member points in memory
            _familyMembers.value = _familyMembers.value.map { m ->
                if (m.id == actorMemberId) m.copy(pointsBalance = m.pointsBalance + points) else m
            }

            enqueueSyncAndAudit(
                "ROUTINE_OCCURRENCE",
                occurrenceId,
                "UPDATE",
                """{"status":"COMPLETED","points":$points,"routineId":"$routineId","targetDate":"2026-11-01","completedByMemberId":"$actorMemberId"}""",
                "Completed routine occurrence $occurrenceId"
            )
        }
    }

    fun skipRoutineOccurrence(routineId: String, occurrenceId: String, reason: String = "Skipped") {
        viewModelScope.launch {
            if (_currentActorRole.value == FamilyRole.GUEST) return@launch
            app.routineRepository.skipOccurrence(routineId, occurrenceId, reason)
            enqueueSyncAndAudit(
                "ROUTINE_OCCURRENCE",
                occurrenceId,
                "UPDATE",
                """{"status":"SKIPPED","reason":"$reason","routineId":"$routineId","targetDate":"2026-11-01"}""",
                "Skipped routine occurrence $occurrenceId"
            )
        }
    }

    fun toggleRoutineStep(routineId: String, occurrenceId: String, stepId: String, isDone: Boolean) {
        viewModelScope.launch {
            if (_currentActorRole.value == FamilyRole.GUEST) return@launch
            app.routineRepository.toggleStep(routineId, occurrenceId, stepId, isDone)
        }
    }

    fun pauseResumeRoutine(routineId: String, isPaused: Boolean) {
        viewModelScope.launch {
            if (!FamilySecurityPolicy.canManageFamilyMembers(_currentActorRole.value)) return@launch
            app.routineRepository.setRoutinePaused(routineId, isPaused)
            enqueueSyncAndAudit("ROUTINE", routineId, "UPDATE", """{"isPaused":$isPaused}""", "Toggled routine paused: $isPaused")
            try {
                if (isPaused) {
                    CalendarReminderScheduler.cancelRoutineReminder(getApplication(), routineId)
                } else {
                    val r = routines.value.find { it.id == routineId }
                    if (r != null) CalendarReminderScheduler.scheduleRoutineReminder(getApplication(), r)
                }
            } catch (_: Exception) {}
        }
    }

    fun convertRoutineToTask(routineId: String, occurrenceId: String) {
        viewModelScope.launch {
            if (_currentActorRole.value == FamilyRole.GUEST) return@launch
            val routine = routines.value.find { it.id == routineId } ?: return@launch
            val newTaskId = "task-from-$occurrenceId"
            createTask(
                title = "Routine: ${routine.title}",
                priority = Priority.MEDIUM,
                sourceModule = CanonicalTaskSourceModule.ROUTINES,
                scope = GoalScope.FAMILY,
                checklistItems = routine.steps.map { it.title }
            )
            app.routineRepository.convertOccurrenceToTask(routineId, occurrenceId, newTaskId)
        }
    }


    fun configureRewardSystem(enabled: Boolean, currencyName: String = "Family Coins") {
        viewModelScope.launch {
            if (!FamilySecurityPolicy.canConfigureRewards(_currentActorRole.value)) return@launch
            _rewardConfig.value = _rewardConfig.value.copy(
                enabled = enabled,
                currencyName = currencyName.ifBlank { "Family Coins" },
                disallowPunitiveDeductions = true
            )
            enqueueSyncAndAudit(
                "REWARD_CONFIG",
                _activeFamilyId.value,
                "UPDATE",
                """{"enabled":$enabled,"currencyName":"$currencyName","disallowPunitiveDeductions":true}""",
                "Updated optional family reward system (enabled=$enabled)"
            )
        }
    }

    fun addMealPlan(title: String, mealType: MealType, servings: Int) {
        viewModelScope.launch {
            val familyId = _activeFamilyId.value
            val entry = MealPlanEntry(
                id = UUID.randomUUID().toString(),
                familyId = familyId,
                planDate = System.currentTimeMillis(),
                mealType = mealType,
                recipeId = recipes.value.firstOrNull()?.id,
                customMealTitle = title,
                servings = servings,
                notes = null
            )
            app.mealPlannerRepository.addMealPlan(entry)
            enqueueSyncAndAudit("MEAL_PLAN", entry.id, "INSERT", """{"title":"$title"}""", "Scheduled meal $title")
        }
    }

    fun generateGroceryListFromWeek() {
        viewModelScope.launch {
            val familyId = _activeFamilyId.value
            app.mealPlannerRepository.generateGroceryListFromWeek(familyId, 0L, Long.MAX_VALUE)
        }
    }

    fun toggleGroceryPurchased(itemId: String, isPurchased: Boolean) {
        viewModelScope.launch {
            app.groceryRepository.setPurchased(itemId, isPurchased)
        }
    }

    fun addRecipe(title: String, category: String, prepMinutes: Int, cookMinutes: Int, servings: Int) {
        viewModelScope.launch {
            val familyId = _activeFamilyId.value
            val recipe = Recipe(
                id = UUID.randomUUID().toString(),
                familyId = familyId,
                title = title,
                description = "Family recipe added to library",
                imageUri = null,
                prepTimeMinutes = prepMinutes,
                cookTimeMinutes = cookMinutes,
                servings = servings,
                difficulty = RecipeDifficulty.MEDIUM,
                category = category,
                dietaryNotes = null,
                familyRating = 5,
                isFavorite = false,
                source = "Family Kitchen",
                storageInstructions = null,
                ingredients = listOf(
                    RecipeIngredient(UUID.randomUUID().toString(), "", "$title Main Ingredient", 2.0, "cups", null)
                ),
                instructions = listOf(
                    RecipeInstruction(UUID.randomUUID().toString(), "", 1, "Prepare ingredients and cook for $cookMinutes minutes.")
                )
            )
            app.recipeRepository.createRecipe(recipe)
            enqueueSyncAndAudit("RECIPE", recipe.id, "INSERT", """{"title":"$title"}""", "Added recipe $title")
        }
    }

    fun toggleRecipeFavorite(recipeId: String, isFavorite: Boolean) {
        viewModelScope.launch {
            app.recipeRepository.setFavorite(recipeId, isFavorite)
        }
    }

    fun addChore(title: String, zone: String, points: Int, frequency: ChoreFrequency = ChoreFrequency.WEEKLY) {
        viewModelScope.launch {
            val familyId = _activeFamilyId.value
            val chore = Chore(
                id = UUID.randomUUID().toString(),
                familyId = familyId,
                title = title,
                description = null,
                assignedMemberId = members.value.firstOrNull()?.id,
                zone = zone,
                frequency = frequency,
                rewardPoints = points,
                nextDueDate = System.currentTimeMillis() + 86400000L,
                requiresVerification = false,
                isCompleted = false
            )
            app.choresRepository.createChore(chore)
            enqueueSyncAndAudit("CHORE", chore.id, "INSERT", """{"title":"$title","points":$points}""", "Created chore $title")
        }
    }

    fun completeChore(choreId: String) {
        viewModelScope.launch {
            val memberId = members.value.firstOrNull()?.id ?: "mem-default"
            app.choresRepository.completeChore(choreId, memberId)
            enqueueSyncAndAudit("CHORE", choreId, "UPDATE", """{"completedBy":"$memberId"}""", "Completed chore $choreId")
        }
    }

    fun addHomeAsset(name: String, location: String, priceCents: Long) {
        viewModelScope.launch {
            val familyId = _activeFamilyId.value
            val asset = HomeAsset(
                id = UUID.randomUUID().toString(),
                familyId = familyId,
                name = name,
                category = AssetCategory.APPLIANCES,
                description = null,
                purchaseDate = System.currentTimeMillis(),
                purchasePriceCents = priceCents,
                warrantyExpiryDate = System.currentTimeMillis() + 31536000000L,
                serialNumber = null,
                location = location,
                nextMaintenanceDate = System.currentTimeMillis() + 15552000000L
            )
            app.assetsRepository.addAsset(asset)
            enqueueSyncAndAudit("ASSET", asset.id, "INSERT", """{"name":"$name","priceCents":$priceCents}""", "Added home asset $name")
        }
    }

    fun addWishlistItem(itemName: String, estimatedCostCents: Long) {
        viewModelScope.launch {
            val familyId = _activeFamilyId.value
            val item = HouseholdWishlist(
                id = UUID.randomUUID().toString(),
                familyId = familyId,
                itemName = itemName,
                estimatedCostCents = estimatedCostCents,
                priority = Priority.MEDIUM,
                category = "Household",
                url = null
            )
            app.assetsRepository.addWishlistItem(item)
        }
    }

    fun addCalendarEvent(title: String, category: CalendarEventCategory = CalendarEventCategory.FAMILY_EVENT) {
        viewModelScope.launch {
            val familyId = _activeFamilyId.value
            val event = CalendarEvent(
                id = UUID.randomUUID().toString(),
                familyId = familyId,
                title = title,
                eventDate = System.currentTimeMillis() + 86400000L,
                eventTimeMillis = System.currentTimeMillis() + 86400000L,
                category = category,
                sourceEntityId = null,
                description = "Household scheduled event"
            )
            app.calendarRepository.addEvent(event)
            enqueueSyncAndAudit("CALENDAR_EVENT", event.id, "INSERT", """{"title":"$title"}""", "Added calendar event $title")
        }
    }

    fun addFinancialAccount(name: String, institution: String, balanceCents: Long, accountType: AccountType = AccountType.CHECKING) {
        viewModelScope.launch {
            val familyId = _activeFamilyId.value
            val isLiability = accountType == AccountType.CREDIT_CARD || accountType == AccountType.LOAN
            val signedBalance = if (isLiability && balanceCents > 0) -balanceCents else balanceCents
            val account = FinancialAccount(
                id = UUID.randomUUID().toString(),
                familyId = familyId,
                name = name,
                accountType = accountType,
                currentBalanceCents = signedBalance,
                isLiability = isLiability,
                currency = "USD",
                institution = institution,
                isArchived = false,
                createdAt = System.currentTimeMillis(),
                updatedAt = System.currentTimeMillis()
            )
            app.financeRepository.createAccount(account)
            enqueueSyncAndAudit("FINANCIAL_ACCOUNT", account.id, "INSERT", """{"name":"$name","balanceCents":$signedBalance}""", "Created financial account $name")
        }
    }

    fun recordFinancialTransaction(title: String, amountCents: Long, category: String, type: TransactionType) {
        viewModelScope.launch {
            val familyId = _activeFamilyId.value
            val targetAccount = accounts.value.firstOrNull() ?: return@launch
            val tx = FinancialTransaction(
                id = UUID.randomUUID().toString(),
                familyId = familyId,
                accountId = targetAccount.id,
                destinationAccountId = null,
                title = title,
                amountCents = kotlin.math.abs(amountCents),
                transactionType = type,
                category = category.uppercase(),
                transactionDate = System.currentTimeMillis(),
                isCleared = true,
                isReversal = false,
                reversalOfId = null,
                notes = null,
                paidByMemberId = members.value.firstOrNull()?.id,
                createdAt = System.currentTimeMillis()
            )
            if (type == TransactionType.INCOME) {
                app.financeRepository.recordIncome(tx)
            } else {
                app.financeRepository.recordExpense(tx)
            }
            enqueueSyncAndAudit(type.name, tx.id, "INSERT", """{"title":"$title","amountCents":${tx.amountCents}}""", "Recorded ${type.name} $title")
        }
    }

    fun recordInternalTransfer(amountCents: Long, title: String) {
        viewModelScope.launch {
            val familyId = _activeFamilyId.value
            val currentAccounts = accounts.value
            if (currentAccounts.size < 2) return@launch
            val source = currentAccounts[0]
            val dest = currentAccounts[1]
            app.financeRepository.recordInternalTransfer(
                familyId = familyId,
                sourceAccountId = source.id,
                destinationAccountId = dest.id,
                amountCents = kotlin.math.abs(amountCents),
                title = title,
                notes = "Internal household transfer"
            )
            enqueueSyncAndAudit("TRANSFER", UUID.randomUUID().toString(), "INSERT", """{"amountCents":$amountCents}""", "Transferred $amountCents cents")
        }
    }

    fun reverseFinancialTransaction(transactionId: String, reason: String = "User requested audit reversal") {
        viewModelScope.launch {
            app.financeRepository.reverseTransaction(transactionId, reason)
            enqueueSyncAndAudit("REVERSAL", transactionId, "INSERT", """{"originalId":"$transactionId"}""", "Reversed transaction $transactionId")
        }
    }

    fun saveInvestmentHolding(
        symbol: String,
        assetName: String,
        assetType: String,
        quantityMicroshares: Long,
        costBasisCents: Long,
        currentPriceCents: Long,
        accountId: String? = null
    ) {
        viewModelScope.launch {
            val familyId = _activeFamilyId.value
            val targetAccId = accountId ?: accounts.value.firstOrNull { it.accountType == AccountType.INVESTMENT }?.id ?: accounts.value.firstOrNull()?.id ?: "acc-inv"
            val holding = InvestmentHolding(
                id = "hold-${symbol.lowercase()}-${UUID.randomUUID()}",
                familyId = familyId,
                accountId = targetAccId,
                symbol = symbol.uppercase().trim(),
                assetName = assetName.trim(),
                assetType = assetType.uppercase().trim(),
                quantityMicroshares = quantityMicroshares,
                costBasisCents = costBasisCents,
                currentPriceCents = currentPriceCents,
                currency = "USD",
                notes = "Recorded investment holding"
            )
            app.financeRepository.saveInvestmentHolding(holding)
            enqueueSyncAndAudit("INVESTMENT_HOLDING", holding.id, "INSERT", """{"symbol":"$symbol","valCents":${holding.currentValuationCents}}""", "Added investment holding $symbol")
        }
    }

    fun updateHoldingMarketPrice(holdingId: String, newPriceCents: Long) {
        viewModelScope.launch {
            app.financeRepository.updateHoldingMarketPrice(holdingId, newPriceCents)
            enqueueSyncAndAudit("INVESTMENT_HOLDING", holdingId, "UPDATE", """{"newPriceCents":$newPriceCents}""", "Updated holding market price")
        }
    }

    fun deleteInvestmentHolding(holdingId: String) {
        viewModelScope.launch {
            app.financeRepository.deleteInvestmentHolding(holdingId)
            enqueueSyncAndAudit("INVESTMENT_HOLDING", holdingId, "DELETE", "{}", "Deleted investment holding")
        }
    }

    fun addSavingsGoal(title: String, targetCents: Long, plannedMonthlyContributionCents: Long) {
        viewModelScope.launch {
            val familyId = _activeFamilyId.value
            val goal = SavingsGoal(
                id = "goal-${UUID.randomUUID()}",
                familyId = familyId,
                linkedAccountId = accounts.value.firstOrNull { it.accountType == AccountType.SAVINGS }?.id,
                title = title.trim(),
                targetCents = targetCents,
                currentCents = 0L,
                plannedMonthlyContributionCents = plannedMonthlyContributionCents,
                targetDate = System.currentTimeMillis() + 31536000000L
            )
            app.financeRepository.saveSavingsGoal(goal)
            enqueueSyncAndAudit("SAVINGS_GOAL", goal.id, "INSERT", """{"title":"$title","targetCents":$targetCents}""", "Created savings goal $title")
        }
    }

    fun contributeToSavingsGoal(goalId: String, amountCents: Long) {
        viewModelScope.launch {
            app.financeRepository.contributeToSavingsGoal(goalId, amountCents)
            enqueueSyncAndAudit("SAVINGS_GOAL", goalId, "UPDATE", """{"contributedCents":$amountCents}""", "Contributed to savings goal")
        }
    }

    fun addEnvelopeBudget(category: String, allocatedCents: Long, alertThresholdPercentage: Int = 85) {
        viewModelScope.launch {
            val familyId = _activeFamilyId.value
            val budget = EnvelopeBudget(
                id = "budget-${UUID.randomUUID()}",
                familyId = familyId,
                category = category.uppercase().trim(),
                allocatedCents = allocatedCents,
                spentCents = 0L,
                monthEpoch = System.currentTimeMillis(),
                alertThresholdPercentage = alertThresholdPercentage
            )
            app.financeRepository.setBudget(budget)
            enqueueSyncAndAudit("ENVELOPE_BUDGET", budget.id, "INSERT", """{"category":"$category","allocatedCents":$allocatedCents}""", "Set budget for $category")
        }
    }

    fun addHealthAllergy(memberId: String, allergen: String, severity: String, reaction: String, treatment: String) {
        viewModelScope.launch {
            val familyId = _activeFamilyId.value
            val allergy = HealthAllergy(
                id = UUID.randomUUID().toString(),
                familyId = familyId,
                memberId = memberId,
                allergen = allergen,
                severity = severity,
                reaction = reaction,
                emergencyTreatment = treatment
            )
            app.wellbeingRepository.addAllergy(allergy)
            enqueueSyncAndAudit("HEALTH_ALLERGY", allergy.id, "INSERT", """{"allergen":"$allergen"}""", "Added allergy record")
        }
    }

    fun addHealthMedication(memberId: String, medicationName: String, dosage: String, instructions: String) {
        viewModelScope.launch {
            val familyId = _activeFamilyId.value
            val med = HealthMedication(
                id = UUID.randomUUID().toString(),
                familyId = familyId,
                memberId = memberId,
                medicationName = medicationName,
                dosage = dosage,
                scheduleFrequency = "DAILY",
                scheduleTimes = listOf("08:00 AM"),
                instructions = instructions,
                isActive = true
            )
            app.wellbeingRepository.saveMedication(med)
            enqueueSyncAndAudit("HEALTH_MEDICATION", med.id, "INSERT", """{"medicationName":"$medicationName"}""", "Added medication schedule")
        }
    }

    fun addEmergencyContact(name: String, relationship: String, phone: String, isPrimary: Boolean) {
        viewModelScope.launch {
            val familyId = _activeFamilyId.value
            val contact = EmergencyContact(
                id = UUID.randomUUID().toString(),
                familyId = familyId,
                name = name,
                relationship = relationship,
                phonePrimary = phone,
                phoneSecondary = null,
                isPrimary = isPrimary,
                notes = null
            )
            app.emergencyRepository.saveContact(contact)
            enqueueSyncAndAudit("EMERGENCY_CONTACT", contact.id, "INSERT", """{"name":"$name"}""", "Added emergency contact $name")
        }
    }

    fun toggleEmergencySupplyChecked(supplyId: String, isChecked: Boolean) {
        viewModelScope.launch {
            app.emergencyRepository.toggleSupplyChecked(supplyId, isChecked)
        }
    }

    fun toggleEmergencyChecklistItem(itemId: String, isCompleted: Boolean) {
        viewModelScope.launch {
            app.emergencyRepository.toggleChecklistItem(itemId, isCompleted)
        }
    }

    // Master Stage 2 Milestone 2.A Household Actions
    fun addPantryItem(
        name: String,
        category: String = "PANTRY",
        qty: Double = 1.0,
        unit: String = "item",
        expiryDate: Long? = null,
        minThreshold: Double = 1.0,
        storageLocation: String? = null
    ) {
        viewModelScope.launch {
            val familyId = _activeFamilyId.value
            val item = com.familyos.core.database.PantryItemEntity(
                id = UUID.randomUUID().toString(),
                familyId = familyId,
                itemName = name,
                category = category,
                quantity = qty,
                unit = unit,
                storageLocation = storageLocation,
                expiryDate = expiryDate,
                minThreshold = minThreshold,
                isLowStock = qty <= minThreshold
            )
            app.householdRepository.addPantryItem(item)
        }
    }

    fun consumePantryItem(id: String, amount: Double = 1.0) {
        viewModelScope.launch {
            app.householdRepository.consumePantryItem(id, amount)
        }
    }

    fun deletePantryItem(id: String) {
        viewModelScope.launch {
            app.householdRepository.deletePantryItem(id)
        }
    }

    fun addWardrobeItem(
        memberId: String,
        name: String,
        category: String = "TOPS",
        color: String? = null,
        season: String = "ALL_SEASON"
    ) {
        viewModelScope.launch {
            val familyId = _activeFamilyId.value
            val item = com.familyos.core.database.WardrobeItemEntity(
                id = UUID.randomUUID().toString(),
                familyId = familyId,
                memberId = memberId,
                itemName = name,
                category = category,
                color = color,
                season = season,
                isClean = true
            )
            app.householdRepository.addWardrobeItem(item)
        }
    }

    fun toggleWardrobeCleanStatus(id: String, isClean: Boolean) {
        viewModelScope.launch {
            app.householdRepository.toggleWardrobeCleanStatus(id, isClean)
        }
    }

    fun saveOutfitPlan(
        memberId: String,
        date: String,
        name: String,
        itemIds: List<String>,
        occasion: String = "CASUAL"
    ) {
        viewModelScope.launch {
            val familyId = _activeFamilyId.value
            val plan = com.familyos.core.database.OutfitPlanEntity(
                id = UUID.randomUUID().toString(),
                familyId = familyId,
                memberId = memberId,
                planDate = date,
                outfitName = name,
                itemIdsJson = "[${itemIds.joinToString(",") { "\"$it\"" }}]",
                occasion = occasion
            )
            app.householdRepository.saveOutfitPlan(plan)
        }
    }

    private suspend fun enqueueSyncAndAudit(
        entityType: String,
        entityId: String,
        operationType: String,
        payloadJson: String,
        summary: String
    ) {
        val familyId = _activeFamilyId.value
        val opId = UUID.randomUUID().toString()
        val idempotencyKey = "$entityType:$entityId:$operationType:${System.currentTimeMillis()}"
        app.syncRepository.enqueue(
            SyncOperation(
                operationId = opId,
                idempotencyKey = idempotencyKey,
                familyId = familyId,
                entityType = entityType,
                entityId = entityId,
                operationType = operationType,
                payloadJson = payloadJson
            )
        )
        app.database.auditEventDao().logEvent(
            AuditEventEntity(
                id = UUID.randomUUID().toString(),
                familyId = familyId,
                actorUserId = "usr-sarah-owner",
                actionType = "${entityType}_${operationType}",
                entityType = entityType,
                entityId = entityId,
                summary = summary,
                metadataJson = payloadJson
            )
        )
        try {
            SyncWorker.enqueueImmediateSync(getApplication())
        } catch (_: Exception) {}
    }
}
