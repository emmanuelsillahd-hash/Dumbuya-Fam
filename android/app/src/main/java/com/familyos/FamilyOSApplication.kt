package com.familyos

import android.app.Application
import com.familyos.core.data.*
import com.familyos.core.database.FamilyOSDatabase
import com.familyos.core.domain.*
import com.familyos.core.sync.HttpRemoteSyncGateway
import com.familyos.core.sync.SyncRepositoryImpl
import com.familyos.core.sync.SyncWorker

/**
 * Main Application class for FamilyOS.
 * Initializes the SQLCipher-encrypted Room database, domain repositories, and background SyncWorker.
 */
class FamilyOSApplication : Application() {

    lateinit var database: FamilyOSDatabase
        private set

    lateinit var syncRepository: SyncRepository
        private set

    lateinit var workspaceRepository: FamilyWorkspaceRepository
        private set

    lateinit var memberRepository: FamilyMemberRepository
        private set

    lateinit var relationshipRepository: FamilyRelationshipRepository
        private set

    lateinit var goalsRepository: GoalsAndTasksRepository
        private set

    lateinit var recipeRepository: RecipeRepository
        private set

    lateinit var mealPlannerRepository: MealPlannerRepository
        private set

    lateinit var groceryRepository: GroceryListRepository
        private set

    lateinit var choresRepository: ChoresRepository
        private set

    lateinit var assetsRepository: HomeAssetsRepository
        private set

    lateinit var calendarRepository: CalendarRepository
        private set

    lateinit var financeRepository: FinanceRepository
        private set

    lateinit var wellbeingRepository: WellbeingRepository
        private set

    lateinit var emergencyRepository: EmergencyRepository
        private set

    lateinit var routineRepository: RoutineRepository
        private set

    lateinit var householdRepository: HouseholdRepository
        private set

    override fun onCreate() {
        super.onCreate()
        database = FamilyOSDatabase.getInstance(this, useEncryption = true)

        val gateway = HttpRemoteSyncGateway(
            endpointUrlProvider = {
                val prefs = getSharedPreferences("familyos_sync_config", MODE_PRIVATE)
                prefs.getString("backend_base_url", null)
            },
            authTokenProvider = {
                val prefs = getSharedPreferences("familyos_sync_config", MODE_PRIVATE)
                prefs.getString("auth_bearer_token", null)
            }
        )
        syncRepository = SyncRepositoryImpl(
            syncQueueDao = database.syncQueueDao(),
            remoteGateway = gateway
        )

        workspaceRepository = FamilyWorkspaceRepositoryImpl(database.familyWorkspaceDao())
        memberRepository = FamilyMemberRepositoryImpl(database.familyMemberDao())
        relationshipRepository = FamilyRelationshipRepositoryImpl(database.familyRelationshipDao())
        goalsRepository = GoalsAndTasksRepositoryImpl(database.goalsAndTasksDao())
        recipeRepository = RecipeRepositoryImpl(database.recipesDao())
        mealPlannerRepository = MealPlannerRepositoryImpl(
            mealDao = database.mealPlannerDao(),
            groceryDao = database.groceryListDao(),
            recipeDao = database.recipesDao()
        )
        groceryRepository = GroceryListRepositoryImpl(database.groceryListDao())
        choresRepository = ChoresRepositoryImpl(database.choresDao())
        assetsRepository = HomeAssetsRepositoryImpl(database.homeAssetsDao())
        calendarRepository = CalendarRepositoryImpl(database.calendarDao())
        financeRepository = FinanceRepositoryImpl(database.financeDao())
        wellbeingRepository = WellbeingRepositoryImpl(database.wellbeingDao())
        emergencyRepository = EmergencyRepositoryImpl(database.emergencyDao())
        routineRepository = RoutineRepositoryImpl(database.routineDao())
        householdRepository = HouseholdRepositoryImpl(
            pantryDao = database.pantryDao(),
            wardrobeDao = database.wardrobeDao(),
            outfitDao = database.outfitDao()
        )

        try {
            SyncWorker.schedulePeriodicSync(this)
        } catch (_: Exception) {
            // WorkManager may not be initialized in unit test environments
        }
    }
}
