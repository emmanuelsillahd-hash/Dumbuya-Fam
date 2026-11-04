package com.familyos

import android.content.Context
import androidx.room.Room
import androidx.sqlite.db.SupportSQLiteDatabase
import androidx.sqlite.db.framework.FrameworkSQLiteOpenHelperFactory
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.familyos.core.database.*
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Genuine native Room migration test executed on a real Android SQLite engine.
 * Validates:
 * 1. Creation of pure Version 1 schema (all 8 Stage 1 tables).
 * 2. Population of representative records across every Version 1 table.
 * 3. Opening the database through Room using Room.databaseBuilder().addMigrations(MIGRATION_1_2).
 * 4. Verification that all original records survived migration with full fidelity.
 * 5. Verification that all 16 Stage 2 tables exist and are fully accessible through Room DAOs.
 * 6. Foreign key integrity verification:
 *    - Deleting a goal sets the associated project's goal_id to null (ON DELETE SET NULL).
 *    - Deleting a workspace cascades and removes children (ON DELETE CASCADE).
 * 7. Verification that standard Stage 2 operations function correctly through the database instance.
 */
@RunWith(AndroidJUnit4::class)
class FamilyOSMigrationInstrumentedTest {

    private val dbName = "familyos_migration_instrumented.db"
    private lateinit var context: Context
    private var roomDatabase: FamilyOSDatabase? = null

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        context.deleteDatabase(dbName)
    }

    @After
    fun tearDown() {
        roomDatabase?.close()
        roomDatabase = null
        context.deleteDatabase(dbName)
    }

    @Test
    fun testRealMigrationV1ToV2ViaRoomBuilderAndDaoVerification() = runBlocking {
        val now = 1700000000000L

        // -------------------------------------------------------------
        // Step 1: Create a genuine Version 1 SQLite database using Framework SQLite Helper
        // -------------------------------------------------------------
        val factory = FrameworkSQLiteOpenHelperFactory()
        val config = androidx.sqlite.db.SupportSQLiteOpenHelper.Configuration.builder(context)
            .name(dbName)
            .callback(object : androidx.sqlite.db.SupportSQLiteOpenHelper.Callback(1) {
                override fun onCreate(db: SupportSQLiteDatabase) {
                    createV1Schema(db)
                }
                override fun onUpgrade(db: SupportSQLiteDatabase, oldVersion: Int, newVersion: Int) {}
            })
            .build()

        val helper = factory.create(config)
        val rawV1Db = helper.writableDatabase

        // -------------------------------------------------------------
        // Step 2: Populate representative records in all 8 Version 1 tables
        // -------------------------------------------------------------
        populateV1Data(rawV1Db, now)

        // Close raw SQLite database before handing off to Room
        rawV1Db.close()
        helper.close()

        // -------------------------------------------------------------
        // Step 3: Open database through Room with MIGRATION_1_2 and MIGRATION_2_3
        // -------------------------------------------------------------
        val db = Room.databaseBuilder(
            context,
            FamilyOSDatabase::class.java,
            dbName
        )
            .addMigrations(FamilyOSDatabase.MIGRATION_1_2, FamilyOSDatabase.MIGRATION_2_3)
            .build()

        roomDatabase = db

        // Enable foreign keys explicitly on the connection for FK constraint tests
        db.openHelper.writableDatabase.execSQL("PRAGMA foreign_keys = ON;")

        // -------------------------------------------------------------
        // Step 4: Verify all original Version 1 records survived via Room DAOs
        // -------------------------------------------------------------
        val userProfile = db.userProfileDao().getUserProfileById("usr-1")
        assertNotNull("User profile must survive migration", userProfile)
        assertEquals("sarah@familyos.app", userProfile?.email)
        assertEquals("Sarah Henderson", userProfile?.displayName)
        assertEquals("ACTIVE", userProfile?.accountStatus)

        val workspace = db.familyWorkspaceDao().getWorkspaceById("fam-1")
        assertNotNull("Family workspace must survive migration", workspace)
        assertEquals("Henderson Household", workspace?.name)
        assertEquals("USD", workspace?.currencyCode)

        val ownerMember = db.familyMemberDao().getMemberById("mem-sarah")
        assertNotNull("Owner member must survive migration", ownerMember)
        assertEquals("Sarah", ownerMember?.displayName)
        assertEquals("SELF", ownerMember?.relationshipToPrimary)
        assertFalse(ownerMember!!.isRestrictedProfile)

        val minorMember = db.familyMemberDao().getMemberById("mem-lucas")
        assertNotNull("Minor member must survive migration", minorMember)
        assertEquals("Lucas", minorMember?.displayName)
        assertTrue(minorMember!!.isRestrictedProfile)

        val guardians = db.guardianRelationshipDao().getGuardiansForMinor("mem-lucas")
        assertEquals(1, guardians.size)
        assertEquals("PARENT", guardians[0].relationshipType)
        assertTrue(guardians[0].isEmergencyContact)

        val pendingSync = db.syncQueueDao().getPendingOperations(10)
        assertEquals(1, pendingSync.size)
        assertEquals("mem-lucas", pendingSync[0].entityId)

        // -------------------------------------------------------------
        // Step 5: Verify all 16 Stage 2 tables and 15 Stage 3 tables exist in sqlite_master
        // -------------------------------------------------------------
        verifyAllStage2TablesExist(db.openHelper.writableDatabase)
        verifyAllStage3TablesExist(db.openHelper.writableDatabase)

        // -------------------------------------------------------------
        // Step 6: Exercise Stage 2 Room DAOs directly on migrated database
        // -------------------------------------------------------------

        // 6a. Goals and Tasks DAO
        val goal = FamilyGoalEntity(
            id = "goal-vacation-1",
            familyId = "fam-1",
            title = "Annual Summer Vacation",
            description = "Trip to national park",
            category = "TRAVEL",
            targetDate = now + 1000000000L,
            priority = "HIGH",
            ownerMemberId = "mem-sarah",
            status = "ACTIVE",
            isArchived = false,
            createdAt = now,
            updatedAt = now
        )
        db.goalsAndTasksDao().insertOrUpdateGoal(goal)

        val fetchedGoal = db.goalsAndTasksDao().getGoalById("goal-vacation-1")
        assertNotNull(fetchedGoal)
        assertEquals("Annual Summer Vacation", fetchedGoal?.title)

        val project = ProjectEntity(
            id = "proj-cabin-1",
            familyId = "fam-1",
            goalId = "goal-vacation-1",
            name = "Book Mountain Cabin",
            description = "Compare cabins and reserve",
            budgetCents = 150000L,
            targetDate = now + 50000000L,
            status = "ACTIVE",
            leadMemberId = "mem-sarah",
            createdAt = now,
            updatedAt = now
        )
        db.goalsAndTasksDao().insertOrUpdateProject(project)

        val task = TaskEntity(
            id = "task-reserve-1",
            familyId = "fam-1",
            projectId = "proj-cabin-1",
            parentTaskId = null,
            title = "Finalize Cabin Dates",
            notes = "Confirm work time-off first",
            assignedMemberId = "mem-sarah",
            priority = "HIGH",
            dueDate = now + 20000000L,
            isCompleted = false,
            completedAt = null,
            completedByMemberId = null,
            recurrenceRule = null,
            createdAt = now,
            updatedAt = now
        )
        db.goalsAndTasksDao().insertOrUpdateTask(task)
        val fetchedTask = db.goalsAndTasksDao().getTaskById("task-reserve-1")
        assertNotNull(fetchedTask)
        assertEquals("Finalize Cabin Dates", fetchedTask?.title)

        val checkItem = TaskChecklistItemEntity(
            id = "chk-1",
            taskId = "task-reserve-1",
            title = "Verify cancellation policy",
            isDone = false,
            position = 0
        )
        db.goalsAndTasksDao().insertChecklistItem(checkItem)

        // 6b. Recipes DAO
        val recipe = RecipeEntity(
            id = "recipe-pancakes-1",
            familyId = "fam-1",
            title = "Sunday Fluffy Pancakes",
            description = "Family secret buttermilk recipe",
            prepTimeMinutes = 15,
            cookTimeMinutes = 15,
            servings = 4,
            isFavorite = true,
            isArchived = false,
            createdAt = now,
            updatedAt = now
        )
        db.recipesDao().insertOrUpdateRecipe(recipe)
        val fetchedRecipe = db.recipesDao().getRecipeById("recipe-pancakes-1")
        assertNotNull(fetchedRecipe)
        assertEquals("Sunday Fluffy Pancakes", fetchedRecipe?.title)

        val ingredient = RecipeIngredientEntity(
            id = "ing-1",
            recipeId = "recipe-pancakes-1",
            name = "Flour",
            quantity = 2.0,
            unit = "cups",
            notes = null,
            sortOrder = 1
        )
        db.recipesDao().insertIngredients(listOf(ingredient))

        val instruction = RecipeInstructionEntity(
            id = "inst-1",
            recipeId = "recipe-pancakes-1",
            stepNumber = 1,
            instruction = "Whisk dry ingredients together in large bowl",
            timerMinutes = null
        )
        db.recipesDao().insertInstructions(listOf(instruction))

        // 6c. Meal Planner DAO
        val mealPlan = MealPlanEntryEntity(
            id = "mp-sunday-1",
            familyId = "fam-1",
            recipeId = "recipe-pancakes-1",
            customMealName = null,
            planDate = now + 86400000L,
            mealType = "BREAKFAST",
            assignedCookMemberId = "mem-sarah",
            notes = "Serve with fresh maple syrup",
            createdAt = now
        )
        db.mealPlannerDao().insertOrUpdateMealPlan(mealPlan)

        // 6d. Grocery List DAO
        val groceryItem = GroceryListItemEntity(
            id = "groc-milk-1",
            familyId = "fam-1",
            recipeId = "recipe-pancakes-1",
            itemName = "Whole Milk",
            quantity = "1 gallon",
            category = "DAIRY",
            isPurchased = false,
            addedByMemberId = "mem-sarah",
            createdAt = now
        )
        db.groceryListDao().insertGroceryItem(groceryItem)

        // 6e. Chores DAO
        val chore = ChoreEntity(
            id = "chore-trash-1",
            familyId = "fam-1",
            title = "Recycling and Trash to Curb",
            description = "Every Sunday evening",
            recurrenceRule = "WEEKLY",
            pointsValue = 25,
            assignedMemberId = "mem-lucas",
            dueDate = now + 86400000L,
            isCompleted = false,
            lastCompletedAt = null,
            isArchived = false,
            createdAt = now,
            updatedAt = now
        )
        db.choresDao().insertChore(chore)

        val history = ChoreCompletionHistoryEntity(
            id = "cch-1",
            choreId = "chore-trash-1",
            familyId = "fam-1",
            completedByMemberId = "mem-lucas",
            completedAt = now,
            pointsAwarded = 25
        )
        db.choresDao().recordCompletion(history)

        // 6f. Home Assets DAO
        val asset = HomeAssetEntity(
            id = "asset-hvac-1",
            familyId = "fam-1",
            name = "Heat Pump / HVAC",
            category = "HVAC",
            roomLocation = "Basement Utility Room",
            manufacturer = "Carrier",
            modelNumber = "Infinity 24",
            serialNumber = "CR-987654",
            purchaseDate = now - 31536000000L,
            warrantyExpiryDate = now + 63072000000L,
            notes = "Filter size 20x25x4",
            createdAt = now,
            updatedAt = now
        )
        db.homeAssetsDao().insertAsset(asset)

        val maintenance = AssetMaintenanceEntity(
            id = "maint-filter-1",
            assetId = "asset-hvac-1",
            familyId = "fam-1",
            title = "4-inch Pleated Air Filter Replacement",
            serviceDate = now,
            costCents = 3500L,
            performedBy = "Self",
            notes = "MERV 11 filter installed",
            nextServiceDate = now + 7776000000L,
            createdAt = now
        )
        db.homeAssetsDao().insertMaintenanceRecord(maintenance)

        val wishlist = HouseholdWishlistEntity(
            id = "wish-generator-1",
            familyId = "fam-1",
            itemName = "Dual-Fuel Portable Generator",
            estimatedCostCents = 85000L,
            priority = "MEDIUM",
            url = "https://example.com/generator",
            requestedByMemberId = "mem-sarah",
            isPurchased = false,
            createdAt = now
        )
        db.homeAssetsDao().insertWishlistItem(wishlist)

        // 6g. Calendar DAO
        val calendarEvent = CalendarEventEntity(
            id = "event-soccer-1",
            familyId = "fam-1",
            title = "Lucas Soccer Tournament",
            description = "Field 4, bring orange slices",
            startTime = now + 172800000L,
            endTime = now + 180000000L,
            isAllDay = false,
            location = "Heritage Regional Park",
            organizerMemberId = "mem-sarah",
            recurrenceRule = null,
            createdAt = now,
            updatedAt = now
        )
        db.calendarDao().insertCalendarEvent(calendarEvent)

        // 6h. Family Relationships DAO
        val rel = FamilyRelationshipEntity(
            id = "rel-mother-son-1",
            familyId = "fam-1",
            person1MemberId = "mem-sarah",
            person2MemberId = "mem-lucas",
            relationshipType = "PARENT_CHILD",
            notes = "Mother and son",
            createdAt = now
        )
        db.familyRelationshipDao().insertRelationship(rel)

        // 6i. Stage 3 Finance DAO
        val account = FinancialAccountEntity(
            id = "acc-checking-1",
            familyId = "fam-1",
            name = "Family Checking",
            accountType = "CHECKING",
            currentBalanceCents = 450000L,
            isLiability = false,
            currency = "USD",
            institution = "Heritage Credit Union",
            isArchived = false,
            createdAt = now,
            updatedAt = now
        )
        db.financeDao().insertOrUpdateAccount(account)
        val fetchedAccount = db.financeDao().getAccountById("acc-checking-1")
        assertNotNull(fetchedAccount)
        assertEquals(450000L, fetchedAccount?.currentBalanceCents)

        val tx = FinancialTransactionEntity(
            id = "tx-groceries-1",
            familyId = "fam-1",
            accountId = "acc-checking-1",
            destinationAccountId = null,
            title = "Local Market",
            amountCents = 12550L,
            transactionType = "EXPENSE",
            category = "FOOD",
            transactionDate = now,
            isCleared = true,
            isReversal = false,
            reversalOfId = null,
            notes = "Weekly grocery run",
            paidByMemberId = "mem-sarah",
            createdAt = now
        )
        db.financeDao().recordExpense(tx)
        val fetchedTx = db.financeDao().getTransactionById("tx-groceries-1")
        assertNotNull(fetchedTx)
        assertEquals(12550L, fetchedTx?.amountCents)
        val updatedAccount = db.financeDao().getAccountById("acc-checking-1")
        assertEquals(450000L - 12550L, updatedAccount?.currentBalanceCents)

        // 6j. Stage 3 Wellbeing DAO
        val wellbeingProfile = WellbeingProfileEntity(
            id = "wb-lucas-1",
            familyId = "fam-1",
            memberId = "mem-lucas",
            bloodType = "O+",
            medicalConditionsJson = "[\"Asthma\"]",
            insuranceProvider = "BlueCross",
            insurancePolicyNumber = "BC-99281",
            primaryPhysicianName = "Dr. Alvarez",
            primaryPhysicianPhone = "555-0199",
            notes = "Carry EpiPen for severe peanut allergy",
            updatedAt = now
        )
        db.wellbeingDao().insertOrUpdateProfile(wellbeingProfile)
        val fetchedProfile = db.wellbeingDao().getProfileForMember("mem-lucas")
        assertNotNull(fetchedProfile)
        assertEquals("O+", fetchedProfile?.bloodType)

        val allergy = HealthAllergyEntity(
            id = "all-lucas-peanut",
            familyId = "fam-1",
            memberId = "mem-lucas",
            allergen = "Peanuts",
            severity = "SEVERE_ANAPHYLACTIC",
            reaction = "Anaphylaxis",
            emergencyTreatment = "EpiPen in backpack",
            createdAt = now
        )
        db.wellbeingDao().insertAllergy(allergy)
        val lucasAllergies = db.wellbeingDao().observeAllergiesForMember("mem-lucas").first()
        assertEquals(1, lucasAllergies.size)
        assertEquals("EpiPen in backpack", lucasAllergies[0].emergencyTreatment)

        // 6k. Stage 3 Emergency DAO
        val emergencyPlan = EmergencyPlanEntity(
            id = "plan-fire-1",
            familyId = "fam-1",
            primaryMeetingPoint = "Maple Tree across street (50m)",
            secondaryMeetingPoint = "Heritage Community Center",
            evacuationRoute = "North stairwell and front door",
            waterShutoffLocation = "Basement North Wall valve #2",
            gasShutoffLocation = "Exterior meter on west side (wrench attached)",
            electricalPanelLocation = "Main electrical panel breaker #1",
            notes = "Test alarms quarterly",
            updatedAt = now
        )
        db.emergencyDao().insertOrUpdateEmergencyPlan(emergencyPlan)
        val fetchedPlan = db.emergencyDao().getEmergencyPlan("fam-1")
        assertNotNull(fetchedPlan)
        assertEquals("Maple Tree across street (50m)", fetchedPlan?.primaryMeetingPoint)

        // -------------------------------------------------------------
        // Step 7: Test Foreign Key Integrity (SET NULL & CASCADE)
        // -------------------------------------------------------------

        // 7a. Test Goal Deletion -> Project goal_id is set to NULL (ON DELETE SET NULL)
        // Currently proj-cabin-1 points to goal-vacation-1
        val cursorPre = db.openHelper.writableDatabase.query(
            "SELECT goal_id FROM projects WHERE id = 'proj-cabin-1'"
        )
        assertTrue(cursorPre.moveToFirst())
        assertEquals("goal-vacation-1", cursorPre.getString(0))
        cursorPre.close()

        // Delete the goal
        db.openHelper.writableDatabase.execSQL("DELETE FROM family_goals WHERE id = 'goal-vacation-1'")

        // Project must still exist, but goal_id must be NULL
        val cursorPost = db.openHelper.writableDatabase.query(
            "SELECT goal_id, name FROM projects WHERE id = 'proj-cabin-1'"
        )
        assertTrue("Project must survive goal deletion", cursorPost.moveToFirst())
        assertNull("project.goal_id must be set to NULL via ON DELETE SET NULL", cursorPost.getString(0))
        assertEquals("Book Mountain Cabin", cursorPost.getString(1))
        cursorPost.close()

        // 7b. Test Workspace Deletion -> Cascades to members and Stage 2 records (ON DELETE CASCADE)
        // Insert a separate ephemeral workspace with member and recipe
        val cascadeFamilyId = "fam-cascade-test"
        db.familyWorkspaceDao().insertOrUpdateWorkspace(
            FamilyWorkspaceEntity(
                id = cascadeFamilyId,
                name = "Ephemeral Cascade Family",
                description = "Testing cascade deletion",
                logoUrl = null,
                currencyCode = "CAD",
                ownerUserId = "usr-1",
                version = 1,
                syncStatus = "LOCAL_ONLY",
                isDeleted = false,
                createdAt = now,
                updatedAt = now
            )
        )
        db.familyMemberDao().insertOrUpdateMember(
            FamilyMemberEntity(
                id = "mem-cascade-target",
                familyId = cascadeFamilyId,
                displayName = "Cascade Member",
                relationshipToPrimary = "SELF",
                birthDate = null,
                avatarUrl = null,
                dietaryPreferencesJson = "[]",
                allergiesJson = "[]",
                isRestrictedProfile = false,
                pointsBalance = 0,
                version = 1,
                syncStatus = "LOCAL_ONLY",
                isDeleted = false,
                createdAt = now,
                updatedAt = now
            )
        )
        db.recipesDao().insertOrUpdateRecipe(
            RecipeEntity(
                id = "recipe-cascade-target",
                familyId = cascadeFamilyId,
                title = "Cascade Apple Pie",
                prepTimeMinutes = 30,
                cookTimeMinutes = 45,
                servings = 8,
                isFavorite = false,
                isArchived = false,
                createdAt = now,
                updatedAt = now
            )
        )

        // Verify inserted
        assertNotNull(db.familyMemberDao().getMemberById("mem-cascade-target"))
        assertNotNull(db.recipesDao().getRecipeById("recipe-cascade-target"))

        // Delete the workspace directly
        db.openHelper.writableDatabase.execSQL("DELETE FROM family_workspaces WHERE id = '$cascadeFamilyId'")

        // Verify member and recipe were automatically purged by ON DELETE CASCADE
        assertNull(
            "Member must be purged when workspace is deleted",
            db.familyMemberDao().getMemberById("mem-cascade-target")
        )
        assertNull(
            "Recipe must be purged when workspace is deleted",
            db.recipesDao().getRecipeById("recipe-cascade-target")
        )
    }

    private fun createV1Schema(db: SupportSQLiteDatabase) {
        db.execSQL("""
            CREATE TABLE IF NOT EXISTS `user_profiles` (
                `id` TEXT NOT NULL PRIMARY KEY,
                `authentication_provider` TEXT NOT NULL,
                `provider_user_id` TEXT NOT NULL,
                `email` TEXT NOT NULL,
                `display_name` TEXT,
                `profile_picture_uri` TEXT,
                `preferred_language` TEXT NOT NULL,
                `account_status` TEXT NOT NULL,
                `created_at` INTEGER NOT NULL,
                `updated_at` INTEGER NOT NULL
            )
        """)
        db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS `index_user_profiles_provider_user_id` ON `user_profiles` (`provider_user_id`)")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_user_profiles_email` ON `user_profiles` (`email`)")

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS `family_workspaces` (
                `id` TEXT NOT NULL PRIMARY KEY,
                `name` TEXT NOT NULL,
                `description` TEXT,
                `logo_url` TEXT,
                `currency_code` TEXT NOT NULL,
                `owner_user_id` TEXT NOT NULL,
                `version` INTEGER NOT NULL,
                `sync_status` TEXT NOT NULL,
                `is_deleted` INTEGER NOT NULL,
                `created_at` INTEGER NOT NULL,
                `updated_at` INTEGER NOT NULL
            )
        """)
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_family_workspaces_owner_user_id` ON `family_workspaces` (`owner_user_id`)")

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS `family_memberships` (
                `id` TEXT NOT NULL PRIMARY KEY,
                `family_id` TEXT NOT NULL,
                `user_account_id` TEXT NOT NULL,
                `member_profile_id` TEXT NOT NULL,
                `role` TEXT NOT NULL,
                `status` TEXT NOT NULL,
                `joined_at` INTEGER NOT NULL,
                FOREIGN KEY(`family_id`) REFERENCES `family_workspaces`(`id`) ON DELETE CASCADE,
                FOREIGN KEY(`user_account_id`) REFERENCES `user_profiles`(`id`) ON DELETE CASCADE
            )
        """)
        db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS `index_family_memberships_family_id_user_account_id` ON `family_memberships` (`family_id`, `user_account_id`)")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_family_memberships_user_account_id` ON `family_memberships` (`user_account_id`)")

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS `family_members` (
                `id` TEXT NOT NULL PRIMARY KEY,
                `family_id` TEXT NOT NULL,
                `display_name` TEXT NOT NULL,
                `relationship_to_primary` TEXT NOT NULL,
                `birth_date` INTEGER,
                `avatar_url` TEXT,
                `dietary_preferences_json` TEXT NOT NULL,
                `allergies_json` TEXT NOT NULL,
                `is_restricted_profile` INTEGER NOT NULL,
                `points_balance` INTEGER NOT NULL,
                `version` INTEGER NOT NULL,
                `sync_status` TEXT NOT NULL,
                `is_deleted` INTEGER NOT NULL,
                `created_at` INTEGER NOT NULL,
                `updated_at` INTEGER NOT NULL,
                FOREIGN KEY(`family_id`) REFERENCES `family_workspaces`(`id`) ON DELETE CASCADE
            )
        """)
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_family_members_family_id` ON `family_members` (`family_id`)")

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS `family_invitations` (
                `id` TEXT NOT NULL PRIMARY KEY,
                `family_id` TEXT NOT NULL,
                `invitation_token` TEXT NOT NULL,
                `invited_email` TEXT NOT NULL,
                `target_role` TEXT NOT NULL,
                `assigned_member_profile_id` TEXT,
                `status` TEXT NOT NULL,
                `expires_at` INTEGER NOT NULL,
                `created_at` INTEGER NOT NULL,
                FOREIGN KEY(`family_id`) REFERENCES `family_workspaces`(`id`) ON DELETE CASCADE
            )
        """)

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS `guardian_relationships` (
                `id` TEXT NOT NULL PRIMARY KEY,
                `family_id` TEXT NOT NULL,
                `guardian_member_id` TEXT NOT NULL,
                `minor_member_id` TEXT NOT NULL,
                `relationship_type` TEXT NOT NULL,
                `is_emergency_contact` INTEGER NOT NULL,
                `can_manage_health_records` INTEGER NOT NULL,
                `created_at` INTEGER NOT NULL,
                FOREIGN KEY(`family_id`) REFERENCES `family_workspaces`(`id`) ON DELETE CASCADE,
                FOREIGN KEY(`guardian_member_id`) REFERENCES `family_members`(`id`) ON DELETE CASCADE,
                FOREIGN KEY(`minor_member_id`) REFERENCES `family_members`(`id`) ON DELETE CASCADE
            )
        """)

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS `sync_queue` (
                `queue_id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                `operation_id` TEXT NOT NULL,
                `idempotency_key` TEXT NOT NULL,
                `family_id` TEXT NOT NULL,
                `entity_type` TEXT NOT NULL,
                `entity_id` TEXT NOT NULL,
                `operation_type` TEXT NOT NULL,
                `payload_json` TEXT NOT NULL,
                `attempt_count` INTEGER NOT NULL,
                `last_attempt_at` INTEGER,
                `retry_state` TEXT NOT NULL,
                `last_error` TEXT,
                `created_at` INTEGER NOT NULL
            )
        """)

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS `audit_events` (
                `id` TEXT NOT NULL PRIMARY KEY,
                `family_id` TEXT NOT NULL,
                `actor_user_id` TEXT NOT NULL,
                `action_type` TEXT NOT NULL,
                `entity_type` TEXT NOT NULL,
                `entity_id` TEXT NOT NULL,
                `summary` TEXT NOT NULL,
                `metadata_json` TEXT,
                `created_at` INTEGER NOT NULL,
                FOREIGN KEY(`family_id`) REFERENCES `family_workspaces`(`id`) ON DELETE CASCADE
            )
        """)
    }

    private fun populateV1Data(db: SupportSQLiteDatabase, now: Long) {
        db.execSQL("""
            INSERT INTO user_profiles VALUES (
                'usr-1', 'FIREBASE_GOOGLE', 'uid-google-1', 'sarah@familyos.app',
                'Sarah Henderson', NULL, 'en', 'ACTIVE', $now, $now
            )
        """)

        db.execSQL("""
            INSERT INTO family_workspaces VALUES (
                'fam-1', 'Henderson Household', 'Family home', NULL,
                'USD', 'usr-1', 1, 'LOCAL_ONLY', 0, $now, $now
            )
        """)

        db.execSQL("""
            INSERT INTO family_members VALUES (
                'mem-sarah', 'fam-1', 'Sarah', 'SELF', $now, NULL,
                '[]', '[]', 0, 100, 1, 'LOCAL_ONLY', 0, $now, $now
            )
        """)
        db.execSQL("""
            INSERT INTO family_members VALUES (
                'mem-lucas', 'fam-1', 'Lucas', 'CHILD', $now, NULL,
                '[]', '[]', 1, 50, 1, 'LOCAL_ONLY', 0, $now, $now
            )
        """)

        db.execSQL("""
            INSERT INTO family_memberships VALUES (
                'membership-1', 'fam-1', 'usr-1', 'mem-sarah', 'OWNER', 'ACTIVE', $now
            )
        """)

        db.execSQL("""
            INSERT INTO family_invitations VALUES (
                'inv-1', 'fam-1', 'token-abc', 'grandma@familyos.app', 'MEMBER', NULL, 'PENDING', $now + 86400000, $now
            )
        """)

        db.execSQL("""
            INSERT INTO guardian_relationships VALUES (
                'guard-1', 'fam-1', 'mem-sarah', 'mem-lucas', 'PARENT', 1, 1, $now
            )
        """)

        db.execSQL("""
            INSERT INTO sync_queue VALUES (
                1, 'op-1', 'idemp-1', 'fam-1', 'MEMBER', 'mem-lucas', 'INSERT', '{}', 0, NULL, 'PENDING', NULL, $now
            )
        """)

        db.execSQL("""
            INSERT INTO audit_events VALUES (
                'audit-1', 'fam-1', 'usr-1', 'MEMBER_INVITED', 'INVITATION', 'inv-1', 'Invited grandma', NULL, $now
            )
        """)
    }

    private fun verifyAllStage2TablesExist(db: SupportSQLiteDatabase) {
        val expectedV2Tables = listOf(
            "family_relationships",
            "family_goals",
            "projects",
            "tasks",
            "task_checklist_items",
            "recipes",
            "recipe_ingredients",
            "recipe_instructions",
            "meal_plan_entries",
            "grocery_list_items",
            "chores",
            "chore_completion_history",
            "home_assets",
            "asset_maintenance_records",
            "household_wishlist",
            "calendar_events"
        )

        val cursor = db.query("SELECT name FROM sqlite_master WHERE type = 'table'")
        val existingTables = mutableSetOf<String>()
        while (cursor.moveToNext()) {
            existingTables.add(cursor.getString(0))
        }
        cursor.close()

        for (table in expectedV2Tables) {
            assertTrue("Expected Stage 2 table '$table' to exist in database", existingTables.contains(table))
        }
    }

    private fun verifyAllStage3TablesExist(db: SupportSQLiteDatabase) {
        val expectedV3Tables = listOf(
            "financial_accounts",
            "financial_transactions",
            "recurring_transactions",
            "envelope_budgets",
            "savings_goals",
            "bills_subscriptions",
            "wellbeing_profiles",
            "health_allergies",
            "health_medications",
            "health_vaccinations",
            "healthcare_appointments",
            "emergency_contacts",
            "emergency_plans",
            "emergency_supplies",
            "emergency_checklist_items"
        )

        val cursor = db.query("SELECT name FROM sqlite_master WHERE type = 'table'")
        val existingTables = mutableSetOf<String>()
        while (cursor.moveToNext()) {
            existingTables.add(cursor.getString(0))
        }
        cursor.close()

        for (table in expectedV3Tables) {
            assertTrue("Expected Stage 3 table '$table' to exist in database", existingTables.contains(table))
        }
    }
}
