package com.familyos

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.familyos.core.designsystem.*
import com.familyos.core.domain.*
import com.familyos.core.navigation.DeepLinkResult
import com.familyos.core.navigation.FamilyOSAppShell
import com.familyos.core.navigation.FamilyOSDestination
import com.familyos.core.navigation.RecipeDeepLinkParser
import com.familyos.core.viewmodel.FamilyOSViewModel
import com.familyos.feature.assets.HomeAssetsScreen
import com.familyos.feature.calendar.CalendarScreen
import com.familyos.feature.chores.ChoresScreen
import com.familyos.feature.dashboard.DashboardScreen
import com.familyos.feature.family.FamilyTreeScreen
import com.familyos.feature.finance.FinanceScreen
import com.familyos.feature.goals.GoalsScreen
import com.familyos.feature.meals.MealPlannerScreen
import com.familyos.feature.pantry.PantryScreen
import com.familyos.feature.recipes.RecipeLibraryScreen
import com.familyos.feature.safety.EmergencyScreen
import com.familyos.feature.wardrobe.WardrobeScreen
import com.familyos.feature.wellbeing.WellbeingScreen

class MainActivity : ComponentActivity() {

    private val viewModel: FamilyOSViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val initialDeepLink = parseDeepLink(intent)
        val initialRecipeId = (initialDeepLink as? DeepLinkResult.RecipeDetail)?.recipeId

        setContent {
            FamilyOSTheme {
                val activeWorkspace by viewModel.activeWorkspace.collectAsState()
                val pendingSyncCount by viewModel.pendingSyncCount.collectAsState()
                val members by viewModel.members.collectAsState()
                val relationships by viewModel.relationships.collectAsState()
                val goals by viewModel.goals.collectAsState()
                val projects by viewModel.projects.collectAsState()
                val tasks by viewModel.tasks.collectAsState()
                val recipes by viewModel.recipes.collectAsState()
                val mealPlans by viewModel.mealPlans.collectAsState()
                val groceryItems by viewModel.groceryItems.collectAsState()
                val chores by viewModel.chores.collectAsState()
                val assets by viewModel.assets.collectAsState()
                val wishlist by viewModel.wishlist.collectAsState()
                val calendarEvents by viewModel.calendarEvents.collectAsState()
                val accounts by viewModel.accounts.collectAsState()
                val budgets by viewModel.budgets.collectAsState()
                val transactions by viewModel.transactions.collectAsState()
                val bills by viewModel.bills.collectAsState()
                val wellbeingProfiles by viewModel.wellbeingProfiles.collectAsState()
                val allergies by viewModel.allergies.collectAsState()
                val medications by viewModel.medications.collectAsState()
                val appointments by viewModel.appointments.collectAsState()
                val emergencyContacts by viewModel.emergencyContacts.collectAsState()
                val emergencyPlan by viewModel.emergencyPlan.collectAsState()
                val emergencySupplies by viewModel.emergencySupplies.collectAsState()
                val emergencyChecklist by viewModel.emergencyChecklist.collectAsState()
                val currentActorMemberId by viewModel.currentActorMemberId.collectAsState()
                val currentActorRole by viewModel.currentActorRole.collectAsState()
                val milestones by viewModel.milestones.collectAsState()
                val checklistTemplates by viewModel.checklistTemplates.collectAsState()
                val rewardConfig by viewModel.rewardConfig.collectAsState()
                val announcements by viewModel.announcements.collectAsState()
                val reminders by viewModel.reminders.collectAsState()
                val approvedAiSuggestions by viewModel.approvedAiSuggestions.collectAsState()
                val invitations by viewModel.invitations.collectAsState()
                val recentAudits by viewModel.recentAudits.collectAsState()
                val routines by viewModel.routines.collectAsState()
                val routineOccurrences by viewModel.routineOccurrences.collectAsState()
                val pantryItems by viewModel.pantryItems.collectAsState()
                val wardrobeItems by viewModel.wardrobeItems.collectAsState()
                val outfitPlans by viewModel.outfitPlans.collectAsState()


                var currentDestination by remember {
                    mutableStateOf(
                        if (initialDeepLink is DeepLinkResult.RecipeDetail) {
                            FamilyOSDestination.HOUSEHOLD
                        } else {
                            FamilyOSDestination.OVERVIEW
                        }
                    )
                }

                // Household Hub sub-navigation: 0 = Meals, 1 = Recipes, 2 = Chores, 3 = Home Assets
                var householdSubTab by remember {
                    mutableStateOf(if (initialRecipeId != null) 1 else 0)
                }

                // Interactive creation dialog state
                var activeDialog by remember { mutableStateOf<String?>(null) }
                var dialogMemberIdTarget by remember { mutableStateOf<String?>(null) }

                val familyName = activeWorkspace?.name ?: "Family Workspace"
                val syncLabel = if (pendingSyncCount > 0) {
                    "Offline-First • $pendingSyncCount Queued"
                } else {
                    "Encrypted Room DB • Synced"
                }

                FamilyOSAppShell(
                    currentDestination = currentDestination,
                    onNavigate = { destination ->
                        currentDestination = destination
                    },
                    activeFamilyName = familyName,
                    syncStatusLabel = syncLabel
                ) {
                    when (currentDestination) {
                        FamilyOSDestination.OVERVIEW -> {
                            DashboardScreen(
                                workspace = activeWorkspace,
                                members = members,
                                actorRole = currentActorRole,
                                calendarEvents = calendarEvents,
                                mealPlans = mealPlans,
                                tasks = tasks,
                                goals = goals,
                                projects = projects,
                                reminders = reminders,
                                announcements = announcements,
                                approvedAiSuggestions = approvedAiSuggestions,
                                recentAudits = recentAudits,
                                onToggleTaskComplete = { taskId, completed ->
                                    viewModel.toggleTaskCompleted(taskId, completed)
                                },
                                onToggleReminder = { reminderId ->
                                    viewModel.toggleReminderCompleted(reminderId)
                                },
                                onAddAnnouncement = { title, body ->
                                    viewModel.postFamilyAnnouncement(title, body, false)
                                },
                                onUpdateIdentity = { name, motto, mission, vision, values ->
                                    viewModel.updateFamilyIdentity(
                                        name = name,
                                        motto = motto,
                                        mission = mission,
                                        vision = vision,
                                        values = values
                                    )
                                },
                                onQuickAction = { action ->
                                    when (action) {
                                        "PLAN_MEAL" -> {
                                            householdSubTab = 0
                                            currentDestination = FamilyOSDestination.HOUSEHOLD
                                        }
                                        "ASSIGN_CHORE" -> {
                                            householdSubTab = 4
                                            currentDestination = FamilyOSDestination.HOUSEHOLD
                                        }
                                        "LOG_EXPENSE" -> currentDestination = FamilyOSDestination.FINANCE
                                        "ADD_MEMBER" -> currentDestination = FamilyOSDestination.FAMILY
                                        "VIEW_CALENDAR" -> currentDestination = FamilyOSDestination.CALENDAR
                                    }
                                }
                            )
                        }
                        FamilyOSDestination.FAMILY -> {
                            FamilyTreeScreen(
                                members = members,
                                relationships = relationships,
                                invitations = invitations,
                                actorMemberId = currentActorMemberId,
                                actorRole = currentActorRole,
                                onAddMember = { activeDialog = "ADD_MEMBER" },
                                onCreateRelationship = { m1, m2, relType, notes ->
                                    viewModel.addFamilyRelationship(m1, m2, relType, notes)
                                },
                                onUpdateMemberProfile = { memberId, displayName, rel, resp, emName, emPhone, personalNotes, sharedBio ->
                                    viewModel.updateMemberProfile(
                                        memberId = memberId,
                                        displayName = displayName,
                                        relationshipToPrimary = rel,
                                        responsibilities = resp,
                                        emergencyContactName = emName,
                                        emergencyContactPhone = emPhone,
                                        personalNotes = personalNotes,
                                        sharedBio = sharedBio
                                    )
                                },
                                onRemoveMember = { memberId ->
                                    viewModel.removeFamilyMember(memberId)
                                },
                                onInviteMember = { email, name, role ->
                                    viewModel.inviteFamilyMember(email, name, role)
                                },
                                onApproveMembership = { memberId ->
                                    viewModel.approveMemberAccess(memberId)
                                },
                                onChangeRole = { memberId, newRole ->
                                    viewModel.changeMemberRole(memberId, newRole)
                                }
                            )
                        }
                        FamilyOSDestination.GOALS_PROJECTS -> {
                            GoalsScreen(
                                workspace = activeWorkspace,
                                actorMemberId = currentActorMemberId,
                                actorRole = currentActorRole,
                                goals = goals,
                                projects = projects,
                                milestones = milestones,
                                tasks = tasks,
                                checklistTemplates = checklistTemplates,
                                rewardConfig = rewardConfig,
                                onAddGoal = { activeDialog = "ADD_GOAL" },
                                onAddTask = { activeDialog = "ADD_TASK" },
                                onToggleTaskComplete = { taskId, completed ->
                                    viewModel.toggleTaskCompleted(taskId, completed)
                                },
                                onToggleMilestoneComplete = { milestoneId, completed ->
                                    viewModel.toggleMilestoneCompleted(milestoneId, completed)
                                },
                                onConfigureRewards = { enabled ->
                                    viewModel.configureRewardSystem(enabled)
                                }
                            )
                        }
                        FamilyOSDestination.HOUSEHOLD -> {
                            Column(modifier = Modifier.fillMaxSize()) {
                                // Household Hub Sub-Navigation Bar (Meals, Recipes, Chores, Home Assets)
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .background(FamilyOSColors.WarmIvoryDark)
                                        .padding(horizontal = FamilyOSSpacing.md, vertical = FamilyOSSpacing.xs),
                                    horizontalArrangement = Arrangement.spacedBy(FamilyOSSpacing.xs)
                                ) {
                                    val subTabs = listOf(
                                        "Meal Planner",
                                        "Recipe Library",
                                        "Food Pantry",
                                        "Wardrobe & Outfits",
                                        "Chores & Points",
                                        "Home Assets"
                                    )
                                    subTabs.forEachIndexed { idx, label ->
                                        FilterChip(
                                            selected = householdSubTab == idx,
                                            onClick = { householdSubTab = idx },
                                            label = {
                                                Text(
                                                    text = label,
                                                    fontWeight = if (householdSubTab == idx) FontWeight.Bold else FontWeight.Normal
                                                )
                                            },
                                            colors = FilterChipDefaults.filterChipColors(
                                                selectedContainerColor = FamilyOSColors.PrimaryForestGreen,
                                                selectedLabelColor = Color.White
                                            )
                                        )
                                    }
                                }

                                Box(modifier = Modifier.weight(1f)) {
                                    when (householdSubTab) {
                                        0 -> MealPlannerScreen(
                                            mealPlans = mealPlans,
                                            groceryItems = groceryItems,
                                            onAddMeal = { activeDialog = "ADD_MEAL" },
                                            onGenerateGroceryList = { viewModel.generateGroceryListFromWeek() },
                                            onToggleGroceryPurchased = { id, purchased ->
                                                viewModel.toggleGroceryPurchased(id, purchased)
                                            }
                                        )
                                        1 -> RecipeLibraryScreen(
                                            recipes = recipes,
                                            initialSelectedRecipeId = initialRecipeId,
                                            onAddRecipe = { activeDialog = "ADD_RECIPE" },
                                            onToggleFavorite = { id, fav ->
                                                viewModel.toggleRecipeFavorite(id, fav)
                                            }
                                        )
                                        2 -> PantryScreen(
                                            pantryItems = pantryItems,
                                            onAddItem = { activeDialog = "ADD_PANTRY_ITEM" },
                                            onConsumeItem = { id, qty ->
                                                viewModel.consumePantryItem(id, qty)
                                            },
                                            onDeleteItem = { id ->
                                                viewModel.deletePantryItem(id)
                                            }
                                        )
                                        3 -> WardrobeScreen(
                                            wardrobeItems = wardrobeItems,
                                            outfitPlans = outfitPlans,
                                            members = members,
                                            onAddWardrobeItem = { activeDialog = "ADD_WARDROBE_ITEM" },
                                            onToggleCleanStatus = { id, clean ->
                                                viewModel.toggleWardrobeCleanStatus(id, clean)
                                            },
                                            onSaveOutfitPlan = { memberId, day, name, notes ->
                                                viewModel.saveOutfitPlan(memberId, day, name, notes)
                                            }
                                        )
                                        4 -> ChoresScreen(
                                            chores = chores,
                                            onAddChore = { activeDialog = "ADD_CHORE" },
                                            onCompleteChore = { choreId ->
                                                viewModel.completeChore(choreId)
                                            }
                                        )
                                        5 -> HomeAssetsScreen(
                                            assets = assets,
                                            wishlist = wishlist,
                                            onAddAsset = { activeDialog = "ADD_ASSET" },
                                            onAddWishlistItem = { activeDialog = "ADD_WISHLIST" }
                                        )
                                    }
                                }
                            }
                        }
                        FamilyOSDestination.FINANCE -> {
                            FinanceScreen(
                                accounts = accounts,
                                budgets = budgets,
                                transactions = transactions,
                                bills = bills,
                                onAddAccount = { activeDialog = "ADD_ACCOUNT" },
                                onAddTransaction = { txType ->
                                    activeDialog = if (txType == TransactionType.INCOME) "ADD_INCOME" else "ADD_EXPENSE"
                                },
                                onTransfer = { activeDialog = "ADD_TRANSFER" },
                                onReverseTransaction = { txId ->
                                    viewModel.reverseFinancialTransaction(txId)
                                }
                            )
                        }
                        FamilyOSDestination.HEALTH_FITNESS -> {
                            WellbeingScreen(
                                members = members,
                                profiles = wellbeingProfiles,
                                allergies = allergies,
                                medications = medications,
                                appointments = appointments,
                                onAddAllergy = { memberId ->
                                    dialogMemberIdTarget = memberId
                                    activeDialog = "ADD_ALLERGY"
                                },
                                onAddMedication = { memberId ->
                                    dialogMemberIdTarget = memberId
                                    activeDialog = "ADD_MEDICATION"
                                }
                            )
                        }
                        FamilyOSDestination.FAMILY_SAFETY -> {
                            EmergencyScreen(
                                contacts = emergencyContacts,
                                emergencyPlan = emergencyPlan,
                                supplies = emergencySupplies,
                                checklistItems = emergencyChecklist,
                                onAddContact = { activeDialog = "ADD_EMERGENCY_CONTACT" },
                                onToggleSupplyChecked = { id, checked ->
                                    viewModel.toggleEmergencySupplyChecked(id, checked)
                                },
                                onToggleChecklistCompleted = { id, completed ->
                                    viewModel.toggleEmergencyChecklistItem(id, completed)
                                }
                            )
                        }
                        FamilyOSDestination.CALENDAR -> {
                            CalendarScreen(
                                events = calendarEvents,
                                routines = routines,
                                occurrences = routineOccurrences,
                                onAddEvent = { title, dateMillis, cat, scope, isAllDay ->
                                    viewModel.createCalendarEvent(title, dateMillis, cat, null, scope, isAllDay)
                                },
                                onUpdateEvent = { eventId, title, dateMillis, cat, scope, isAllDay, tz, desc, loc, rrule, exceptions ->
                                    viewModel.updateCalendarEvent(
                                        eventId = eventId,
                                        title = title,
                                        eventDate = dateMillis,
                                        category = cat,
                                        description = desc,
                                        scope = scope,
                                        isAllDay = isAllDay,
                                        location = loc,
                                        timezone = tz,
                                        recurrenceRule = rrule,
                                        recurrenceExceptions = exceptions
                                    )
                                },
                                onDeleteEvent = { eventId -> viewModel.deleteCalendarEvent(eventId) },
                                onCompleteRoutineOccurrence = { rId, occId -> viewModel.completeRoutineOccurrence(rId, occId) },
                                onSkipRoutineOccurrence = { rId, occId -> viewModel.skipRoutineOccurrence(rId, occId) },
                                onToggleRoutineStep = { rId, occId, sId, done -> viewModel.toggleRoutineStep(rId, occId, sId, done) },
                                onPauseResumeRoutine = { rId, paused -> viewModel.pauseResumeRoutine(rId, paused) },
                                onConvertRoutineToTask = { rId, occId -> viewModel.convertRoutineToTask(rId, occId) }
                            )
                        }
                        else -> {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(24.dp)
                            ) {
                                FamilyOSEmptyState(
                                    title = "${currentDestination.title} Module",
                                    description = "Database schemas, repositories and permission rules have been formalized. Full UI workflows activate in their designated development stage.",
                                    actionText = "Return to Overview",
                                    onActionClick = { currentDestination = FamilyOSDestination.OVERVIEW },
                                    icon = currentDestination.icon
                                )
                            }
                        }
                    }
                }

                // Shared Quick-Creation Modal Dialog wired directly to Room via FamilyOSViewModel
                if (activeDialog != null) {
                    QuickCreateDialog(
                        dialogType = activeDialog!!,
                        onDismiss = { activeDialog = null },
                        onSubmit = { primaryText, secondaryText, numericValue ->
                            when (activeDialog) {
                                "ADD_MEMBER" -> viewModel.addFamilyMember(
                                    displayName = primaryText,
                                    relationship = secondaryText.ifBlank { "MEMBER" },
                                    isRestricted = secondaryText.equals("CHILD", ignoreCase = true)
                                )
                                "ADD_RELATIONSHIP" -> {
                                    val m1 = members.getOrNull(0)?.id
                                    val m2 = members.getOrNull(1)?.id
                                    if (m1 != null && m2 != null) {
                                        viewModel.addFamilyRelationship(m1, m2, RelationshipType.PARENT_CHILD)
                                    }
                                }
                                "ADD_GOAL" -> viewModel.createGoal(primaryText, secondaryText)
                                "ADD_TASK" -> viewModel.createTask(primaryText)
                                "ADD_MEAL" -> viewModel.addMealPlan(primaryText, MealType.DINNER, numericValue.toInt().coerceAtLeast(1))
                                "ADD_RECIPE" -> viewModel.addRecipe(primaryText, secondaryText.ifBlank { "Dinner" }, 15, 30, numericValue.toInt().coerceAtLeast(2))
                                "ADD_CHORE" -> viewModel.addChore(primaryText, secondaryText.ifBlank { "HOME" }, numericValue.toInt().coerceAtLeast(10))
                                "ADD_ASSET" -> viewModel.addHomeAsset(primaryText, secondaryText.ifBlank { "Home" }, numericValue)
                                "ADD_WISHLIST" -> viewModel.addWishlistItem(primaryText, numericValue)
                                "ADD_CALENDAR_EVENT" -> viewModel.addCalendarEvent(primaryText)
                                "ADD_ACCOUNT" -> viewModel.addFinancialAccount(primaryText, secondaryText.ifBlank { "Local Bank" }, numericValue)
                                "ADD_INCOME" -> viewModel.recordFinancialTransaction(primaryText, numericValue, secondaryText.ifBlank { "SALARY" }, TransactionType.INCOME)
                                "ADD_EXPENSE" -> viewModel.recordFinancialTransaction(primaryText, numericValue, secondaryText.ifBlank { "FOOD" }, TransactionType.EXPENSE)
                                "ADD_TRANSFER" -> viewModel.recordInternalTransfer(numericValue, primaryText.ifBlank { "Internal Transfer" })
                                "ADD_ALLERGY" -> {
                                    val targetId = dialogMemberIdTarget ?: members.firstOrNull()?.id ?: "mem-lucas"
                                    viewModel.addHealthAllergy(targetId, primaryText, "MODERATE", secondaryText.ifBlank { "Hives" }, "Follow physician guidance")
                                }
                                "ADD_MEDICATION" -> {
                                    val targetId = dialogMemberIdTarget ?: members.firstOrNull()?.id ?: "mem-sarah"
                                    viewModel.addHealthMedication(targetId, primaryText, secondaryText.ifBlank { "1 dose daily" }, "Take as scheduled")
                                }
                                "ADD_EMERGENCY_CONTACT" -> viewModel.addEmergencyContact(primaryText, "Emergency Contact", secondaryText.ifBlank { "555-0199" }, false)
                                "ADD_PANTRY_ITEM" -> viewModel.addPantryItem(
                                    itemName = primaryText,
                                    category = secondaryText.ifBlank { "PANTRY" },
                                    quantity = numericValue.toDouble().coerceAtLeast(1.0),
                                    unit = "item",
                                    storageLocation = "Pantry Shelf"
                                )
                                "ADD_WARDROBE_ITEM" -> {
                                    val targetId = dialogMemberIdTarget ?: members.firstOrNull()?.id ?: "mem-sarah"
                                    viewModel.addWardrobeItem(
                                        memberId = targetId,
                                        itemName = primaryText,
                                        category = secondaryText.ifBlank { "TOPS" },
                                        season = "ALL_SEASON",
                                        color = secondaryText.ifBlank { "Navy" }
                                    )
                                }
                            }
                            activeDialog = null
                        }
                    )
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        parseDeepLink(intent)
    }

    private fun parseDeepLink(intent: Intent?): DeepLinkResult {
        val uriString = intent?.dataString
        return RecipeDeepLinkParser.parse(uriString)
    }
}

@Composable
private fun QuickCreateDialog(
    dialogType: String,
    onDismiss: () -> Unit,
    onSubmit: (String, String, Long) -> Unit
) {
    var primaryText by remember { mutableStateOf("") }
    var secondaryText by remember { mutableStateOf("") }
    var amountText by remember { mutableStateOf("2500") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = dialogType.replace("_", " "),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = primaryText,
                    onValueChange = { primaryText = it },
                    label = { Text("Title / Name") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = secondaryText,
                    onValueChange = { secondaryText = it },
                    label = { Text("Category / Details / Phone") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = amountText,
                    onValueChange = { amountText = it.filter { ch -> ch.isDigit() } },
                    label = { Text("Amount in Cents / Servings / Points") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    if (primaryText.isNotBlank()) {
                        val numeric = amountText.toLongOrNull() ?: 0L
                        onSubmit(primaryText.trim(), secondaryText.trim(), numeric)
                    }
                }
            ) {
                Text("Save to Room DB")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}
