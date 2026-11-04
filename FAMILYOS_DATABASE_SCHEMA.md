# FAMILYOS — DATABASE SCHEMA ARCHITECTURE
**Version**: 4.0.0 (Stage 3.3.3 Remediation — 41 Entities)  
**Database Engine**: Room (SQLite 3.39+ with FTS5 and SQLCipher AES-256)  
**ORM / Data Types**: Pure Kotlin Data Entities, Zero Floating-Point for Currency  
**Active Schema Version**: Room Database `version = 4` with `MIGRATION_1_2`, `MIGRATION_2_3`, `MIGRATION_3_4`  

---

## 1. Core Architectural Schema Principles

1. **Monetary Values**: Stored exclusively as `Long` integer cents (e.g., $150.75 is stored as `15075L`). Storing currency as `Float` or `Double` is an automatic compilation/lint violation.
2. **Offline-Sync Metadata**: Every table that syncs to the cloud implements the `SyncableEntity` contract:
   - `id: String` (UUID v4)
   - `familyId: String` (Foreign key to active family workspace)
   - `version: Long` (Monotonically incrementing revision counter)
   - `syncStatus: String` (`LOCAL_ONLY`, `PENDING_SYNC`, `SYNCED`, `SYNC_FAILED`)
   - `syncErrorMessage: String?`
   - `isDeleted: Boolean` (Soft-delete tombstone)
   - `deletedAt: Long?` (Epoch milliseconds timestamp)
   - `updatedAt: Long` (Epoch milliseconds timestamp)
   - `createdAt: Long` (Epoch milliseconds timestamp)
3. **Indexing Strategy**: Every foreign key (`familyId`, `memberId`, `goalId`, `projectId`, `taskId`) is explicitly indexed in Room via `@Index` to prevent full table scans.

---

## 2. Core Shared Entities (Foundational Platform)

### 2.1 `user_profiles`
```sql
CREATE TABLE user_profiles (
    id TEXT PRIMARY KEY NOT NULL, -- Internal UUID
    authentication_provider TEXT NOT NULL, -- 'FIREBASE_GOOGLE', 'FIREBASE_EMAIL'
    provider_user_id TEXT NOT NULL, -- Stable Auth UID from Identity Provider
    email TEXT NOT NULL,
    display_name TEXT,
    profile_picture_uri TEXT,
    preferred_language TEXT NOT NULL DEFAULT 'en',
    account_status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_user_profiles_provider_uid ON user_profiles(provider_user_id);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
-- CRITICAL: Zero passwords, password hashes, or authentication secrets stored.
```

### 2.2 `family_workspaces`
```sql
CREATE TABLE family_workspaces (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    currency_code TEXT NOT NULL DEFAULT 'USD',
    owner_user_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY',
    is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
CREATE INDEX idx_family_workspaces_owner ON family_workspaces(owner_user_id);
```

### 2.3 `family_memberships`
```sql
CREATE TABLE family_memberships (
    id TEXT PRIMARY KEY NOT NULL,
    family_id TEXT NOT NULL,
    user_account_id TEXT NOT NULL,
    member_profile_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'MEMBER', -- 'OWNER', 'ADMIN', 'MEMBER', 'GUEST'
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'INVITED', 'REVOKED'
    joined_at INTEGER NOT NULL,
    FOREIGN KEY(family_id) REFERENCES family_workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY(user_account_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX idx_family_memberships_unique ON family_memberships(family_id, user_account_id);
CREATE INDEX idx_family_memberships_account ON family_memberships(user_account_id);
```

### 2.4 `family_members`
```sql
CREATE TABLE family_members (
    id TEXT PRIMARY KEY NOT NULL,
    family_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    relationship_to_primary TEXT NOT NULL, -- e.g. 'SELF', 'SPOUSE', 'CHILD', 'PARENT'
    birth_date INTEGER,
    avatar_url TEXT,
    dietary_preferences_json TEXT NOT NULL DEFAULT '[]',
    allergies_json TEXT NOT NULL DEFAULT '[]',
    is_restricted_profile INTEGER NOT NULL DEFAULT 0,
    points_balance INTEGER NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY',
    is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(family_id) REFERENCES family_workspaces(id) ON DELETE CASCADE
);
CREATE INDEX idx_family_members_family ON family_members(family_id);
-- Decoupled from user account. Minor children have profiles without login accounts.
```

### 2.5 `guardian_relationships`
```sql
CREATE TABLE guardian_relationships (
    id TEXT PRIMARY KEY NOT NULL,
    family_id TEXT NOT NULL,
    guardian_member_id TEXT NOT NULL,
    minor_member_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL DEFAULT 'PARENT', -- 'PARENT', 'LEGAL_GUARDIAN'
    is_emergency_contact INTEGER NOT NULL DEFAULT 1,
    can_manage_health_records INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(family_id) REFERENCES family_workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY(guardian_member_id) REFERENCES family_members(id) ON DELETE CASCADE,
    FOREIGN KEY(minor_member_id) REFERENCES family_members(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX idx_guardian_rel_unique ON guardian_relationships(family_id, guardian_member_id, minor_member_id);
```

### 2.6 `sync_queue`
```sql
CREATE TABLE sync_queue (
    queue_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    operation_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    family_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation_type TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    payload_json TEXT NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_attempt_at INTEGER,
    retry_state TEXT NOT NULL DEFAULT 'PENDING',
    last_error TEXT,
    created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_sync_queue_idempotency ON sync_queue(idempotency_key);
CREATE INDEX idx_sync_queue_lookup ON sync_queue(entity_type, entity_id);
```

### 2.7 `audit_events`
```sql
CREATE TABLE audit_events (
    id TEXT PRIMARY KEY NOT NULL,
    family_id TEXT NOT NULL,
    actor_user_id TEXT NOT NULL,
    action_type TEXT NOT NULL, -- e.g. 'MEMBER_ROLE_CHANGED', 'EXPENSE_REVERSED'
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    metadata_json TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(family_id) REFERENCES family_workspaces(id) ON DELETE CASCADE
);
CREATE INDEX idx_audit_events_family ON audit_events(family_id, created_at);
```

---

## 3. Productivity Engine Entities (Hierarchy: Goal -> Project -> Task -> Checklist)

### 3.1 `goals`
```sql
CREATE TABLE goals (
    id TEXT PRIMARY KEY NOT NULL,
    family_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- 'FINANCIAL', 'HOUSEHOLD', 'EDUCATION', 'HEALTH', 'SPIRITUAL'
    owner_member_id TEXT NOT NULL,
    target_date INTEGER,
    status TEXT NOT NULL DEFAULT 'IN_PROGRESS', -- 'NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'
    progress_percentage INTEGER NOT NULL DEFAULT 0,
    is_ai_assisted INTEGER NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY',
    is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(family_id) REFERENCES family_workspaces(id) ON DELETE CASCADE
);
CREATE INDEX idx_goals_family ON goals(family_id);
```

### 3.2 `projects`
```sql
CREATE TABLE projects (
    id TEXT PRIMARY KEY NOT NULL,
    family_id TEXT NOT NULL,
    goal_id TEXT, -- Optional linkage to a parent Goal
    name TEXT NOT NULL,
    description TEXT,
    lead_member_id TEXT NOT NULL,
    budget_cents INTEGER NOT NULL DEFAULT 0, -- Monetary Long integer cents
    start_date INTEGER,
    target_date INTEGER,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    version INTEGER NOT NULL DEFAULT 1,
    sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY',
    is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(family_id) REFERENCES family_workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE SET NULL
);
CREATE INDEX idx_projects_family ON projects(family_id);
CREATE INDEX idx_projects_goal ON projects(goal_id);
```

### 3.3 `tasks`
```sql
CREATE TABLE tasks (
    id TEXT PRIMARY KEY NOT NULL,
    family_id TEXT NOT NULL,
    project_id TEXT, -- Optional linkage to a Project
    title TEXT NOT NULL,
    notes TEXT,
    assigned_member_id TEXT,
    priority TEXT NOT NULL DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
    due_date INTEGER,
    due_time_millis INTEGER,
    is_completed INTEGER NOT NULL DEFAULT 0,
    completed_at INTEGER,
    completed_by_member_id TEXT,
    recurrence_rule TEXT, -- iCalendar RFC 5545 RRULE string or null
    version INTEGER NOT NULL DEFAULT 1,
    sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY',
    is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(family_id) REFERENCES family_workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL
);
CREATE INDEX idx_tasks_family ON tasks(family_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assignee ON tasks(assigned_member_id);
```

### 3.4 `task_checklists` & `checklist_items`
```sql
CREATE TABLE task_checklists (
    id TEXT PRIMARY KEY NOT NULL,
    task_id TEXT NOT NULL,
    title TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE checklist_items (
    id TEXT PRIMARY KEY NOT NULL,
    checklist_id TEXT NOT NULL,
    title TEXT NOT NULL,
    is_done INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(checklist_id) REFERENCES task_checklists(id) ON DELETE CASCADE
);
```

### 3.5 Stage 3.3.2 Unified 7-Tier Planning Extensions (Authoritative Firestore & Room Sync)
- **7-Tier Hierarchy**: `family_workspaces (mission, vision, values)` → `family_goals (scope: PERSONAL | COUPLE | FAMILY, horizon: SHORT_TERM | LONG_TERM, isMeasurable, metricUnit, targetValue, currentValue, reviews)` → `projects (goalId, dependencies, comments, attachments)` → `milestones (projectId, goalId, orderIndex, status, progressPercentage)` → `productivity_tasks (goalId, projectId, milestoneId, parentTaskId, sourceModule, scope, timezone, recurrenceRule, linkedCalendarEventId, rewardPoints)` → `task_checklist_items (taskId, position, isDone, assignedMemberId)` + `checklist_templates` + `rewardConfigs (enabled: false by default, disallowPunitiveDeductions: true)`.
- **Canonical Universal Task Reuse**: All 7 FamilyOS modules (`GOALS_PROJECTS`, `HOME_MANAGEMENT`, `MARRIAGE`, `PARENTING`, `SPIRITUAL_GROWTH`, `FAMILY_GOVERNANCE`, `PERSONAL_PLANNING`) store tasks in the single canonical `productivity_tasks` / `planningTasks` collection without duplicate module-specific task tables.

### 3.6 Stage 3.3.3 Shared Calendar & Reusable Routines Engine
```sql
-- Android Room Table 8 & Synchronized Cloud Entity: calendar_events
CREATE TABLE calendar_events (
    id TEXT PRIMARY KEY NOT NULL, -- UUID or 'cal-task-{taskId}'
    family_id TEXT NOT NULL,
    title TEXT NOT NULL,
    event_date INTEGER NOT NULL, -- Epoch milliseconds date
    event_time_millis INTEGER, -- Nullable for all-day events
    category TEXT NOT NULL, -- 'BIRTHDAY', 'ANNIVERSARY', 'GOAL_DUE', 'TASK_DUE', 'MEAL', 'CHORE', 'MAINTENANCE', 'FAMILY_EVENT', 'APPOINTMENT', 'ROUTINE', 'SPECIAL_OCCASION'
    scope TEXT NOT NULL DEFAULT 'FAMILY', -- 'PERSONAL', 'COUPLE', 'FAMILY'
    is_all_day INTEGER NOT NULL DEFAULT 0,
    location TEXT,
    timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    source_entity_id TEXT, -- Linked task ID, milestone ID, chore ID, etc.
    description TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(family_id) REFERENCES family_workspaces(id) ON DELETE CASCADE
);
CREATE INDEX idx_calendar_events_family_date ON calendar_events(family_id, event_date);
```
- **Authoritative Routine Definitions (`store.routines`)**: Stores cadence (`DAILY`, `WEEKDAYS`, `WEEKENDS`, `WEEKLY`, `BIWEEKLY`, `MONTHLY`, `CUSTOM`), target weekdays, target time of day, anchor month day, points reward, ordered checklist steps template, pause status (`isPaused`, `pausedReason`), and streak metrics (`streakCount`, `bestStreakCount`, `lastCompletedDate`).
- **Decoupled Routine Occurrences (`store.routineOccurrences`)**: Distinct execution instance model decoupled from routine definition. Stores `targetDate` (YYYY-MM-DD), status (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `SKIPPED`), checklist step completion map, points awarded, and `linkedTaskId`.
- **Decoupling Invariant**: Occurrence completion or checklist check-off **NEVER mutates, marks complete, or deletes the parent Routine definition**.
- **Anchor-Day Preservation**: Month-end anchor days (29th-31st) clamp to the last valid day of shorter months (e.g., Feb 28 or 29) with `isClamped: true` and automatically restore in longer months (e.g., March 31st).

---

## 4. Household Management Module Entities

### 4.1 `recipes` & `recipe_ingredients`
```sql
CREATE TABLE recipes (
    id TEXT PRIMARY KEY NOT NULL,
    family_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    image_uri TEXT,
    prep_time_minutes INTEGER NOT NULL DEFAULT 0,
    cook_time_minutes INTEGER NOT NULL DEFAULT 0,
    servings INTEGER NOT NULL DEFAULT 4,
    difficulty TEXT NOT NULL DEFAULT 'MEDIUM',
    cuisine TEXT,
    estimated_cost_cents INTEGER NOT NULL DEFAULT 0, -- Long cents
    family_rating INTEGER NOT NULL DEFAULT 0, -- 1 to 5 stars
    is_favorite INTEGER NOT NULL DEFAULT 0,
    storage_instructions TEXT,
    instructions_json TEXT NOT NULL DEFAULT '[]', -- Ordered array of step strings
    version INTEGER NOT NULL DEFAULT 1,
    sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY',
    is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(family_id) REFERENCES family_workspaces(id) ON DELETE CASCADE
);

CREATE TABLE recipe_ingredients (
    id TEXT PRIMARY KEY NOT NULL,
    recipe_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    notes TEXT,
    FOREIGN KEY(recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);
```

### 4.2 `meal_plans`
```sql
CREATE TABLE meal_plans (
    id TEXT PRIMARY KEY NOT NULL,
    family_id TEXT NOT NULL,
    plan_date INTEGER NOT NULL, -- Date epoch at 00:00:00
    meal_type TEXT NOT NULL, -- 'BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'
    recipe_id TEXT,
    custom_meal_title TEXT,
    servings INTEGER NOT NULL DEFAULT 4,
    notes TEXT,
    FOREIGN KEY(family_id) REFERENCES family_workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY(recipe_id) REFERENCES recipes(id) ON DELETE SET NULL
);
CREATE INDEX idx_meal_plans_family_date ON meal_plans(family_id, plan_date);
```

### 4.3 `food_inventory` & `chores`
```sql
CREATE TABLE food_inventory (
    id TEXT PRIMARY KEY NOT NULL,
    family_id TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    location TEXT NOT NULL, -- 'PANTRY', 'FRIDGE', 'FREEZER', 'SPICE_RACK'
    expiry_date INTEGER,
    reorder_threshold REAL NOT NULL DEFAULT 1.0,
    version INTEGER NOT NULL DEFAULT 1,
    sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY',
    is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(family_id) REFERENCES family_workspaces(id) ON DELETE CASCADE
);

CREATE TABLE chores (
    id TEXT PRIMARY KEY NOT NULL,
    family_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    assigned_member_id TEXT,
    zone TEXT NOT NULL, -- 'KITCHEN', 'LIVING_ROOM', 'BEDROOMS', 'BATHROOMS', 'OUTDOORS'
    difficulty TEXT NOT NULL DEFAULT 'EASY',
    estimated_duration_minutes INTEGER NOT NULL DEFAULT 15,
    reward_points INTEGER NOT NULL DEFAULT 10,
    recurrence_rule TEXT,
    requires_verification INTEGER NOT NULL DEFAULT 0,
    is_completed INTEGER NOT NULL DEFAULT 0,
    completed_at INTEGER,
    verified_by_member_id TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY',
    is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(family_id) REFERENCES family_workspaces(id) ON DELETE CASCADE
);
```

### 4.4 `home_assets` & `wardrobe_items`
```sql
CREATE TABLE home_assets (
    id TEXT PRIMARY KEY NOT NULL,
    family_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'APPLIANCES', 'FURNITURE', 'ELECTRONICS', 'TOOLS'
    model_number TEXT,
    serial_number TEXT,
    purchase_date INTEGER,
    purchase_price_cents INTEGER NOT NULL DEFAULT 0, -- Long cents
    warranty_expiry_date INTEGER,
    service_provider_contact TEXT,
    notes TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY',
    is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(family_id) REFERENCES family_workspaces(id) ON DELETE CASCADE
);

CREATE TABLE wardrobe_items (
    id TEXT PRIMARY KEY NOT NULL,
    family_id TEXT NOT NULL,
    owner_member_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL, -- 'TOPS', 'BOTTOMS', 'OUTERWEAR', 'SHOES', 'FORMAL'
    season TEXT NOT NULL, -- 'SPRING', 'SUMMER', 'AUTUMN', 'WINTER', 'ALL_YEAR'
    image_uri TEXT,
    storage_location TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY',
    is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(family_id) REFERENCES family_workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY(owner_member_id) REFERENCES family_members(id) ON DELETE CASCADE
);
```

---

## 5. Financial Management Engine Entities (Strict Long Integer Cents)

### 5.1 `financial_accounts`
```sql
CREATE TABLE financial_accounts (
    id TEXT PRIMARY KEY NOT NULL,
    family_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'LOAN'
    current_balance_cents INTEGER NOT NULL DEFAULT 0, -- Signed Long cents (negative for credit/loan)
    is_liability INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    version INTEGER NOT NULL DEFAULT 1,
    sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY',
    is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(family_id) REFERENCES family_workspaces(id) ON DELETE CASCADE
);
```

### 5.2 `income_records` & `expense_records`
```sql
CREATE TABLE income_records (
    id TEXT PRIMARY KEY NOT NULL,
    family_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    title TEXT NOT NULL,
    amount_cents INTEGER NOT NULL, -- Positive Long cents
    category TEXT NOT NULL, -- 'SALARY', 'BUSINESS', 'RENTAL', 'FREELANCE', 'OTHER'
    received_date INTEGER NOT NULL,
    is_recurring INTEGER NOT NULL DEFAULT 0,
    frequency TEXT, -- 'MONTHLY', 'BIWEEKLY', 'WEEKLY'
    version INTEGER NOT NULL DEFAULT 1,
    sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY',
    is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(family_id) REFERENCES family_workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY(account_id) REFERENCES financial_accounts(id) ON DELETE RESTRICT
);

CREATE TABLE expense_records (
    id TEXT PRIMARY KEY NOT NULL,
    family_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    budget_category_id TEXT,
    title TEXT NOT NULL,
    amount_cents INTEGER NOT NULL, -- Positive Long cents
    expense_type TEXT NOT NULL, -- 'FIXED_RECURRING', 'VARIABLE', 'ONE_TIME'
    transaction_date INTEGER NOT NULL,
    paid_by_member_id TEXT,
    receipt_image_uri TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY',
    is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(family_id) REFERENCES family_workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY(account_id) REFERENCES financial_accounts(id) ON DELETE RESTRICT
);
```

### 5.3 `savings_goals` & `budgets`
```sql
CREATE TABLE savings_goals (
    id TEXT PRIMARY KEY NOT NULL,
    family_id TEXT NOT NULL,
    title TEXT NOT NULL,
    target_amount_cents INTEGER NOT NULL, -- Long cents
    current_saved_cents INTEGER NOT NULL DEFAULT 0, -- Long cents
    target_date INTEGER,
    image_uri TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY',
    is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(family_id) REFERENCES family_workspaces(id) ON DELETE CASCADE
);

CREATE TABLE budgets (
    id TEXT PRIMARY KEY NOT NULL,
    family_id TEXT NOT NULL,
    category_name TEXT NOT NULL,
    monthly_limit_cents INTEGER NOT NULL, -- Long cents
    alert_threshold_percentage INTEGER NOT NULL DEFAULT 80,
    version INTEGER NOT NULL DEFAULT 1,
    sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY',
    is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(family_id) REFERENCES family_workspaces(id) ON DELETE CASCADE
);
```

---

## 6. Wellbeing, Parenting, Safety & Investment Entities

### 6.1 `spiritual_entries`
```sql
CREATE TABLE spiritual_entries (
    id TEXT PRIMARY KEY NOT NULL,
    family_id TEXT NOT NULL,
    author_member_id TEXT NOT NULL,
    entry_type TEXT NOT NULL, -- 'REFLECTION', 'GRATITUDE', 'STUDY_NOTE', 'TRADITION'
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_shared_with_family INTEGER NOT NULL DEFAULT 0, -- 0 = Private to author
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(family_id) REFERENCES family_workspaces(id) ON DELETE CASCADE
);
```

### 6.2 `health_medications` & `health_appointments`
```sql
CREATE TABLE health_medications (
    id TEXT PRIMARY KEY NOT NULL,
    family_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    medication_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    schedule_times_json TEXT NOT NULL, -- e.g. ["08:00", "20:00"]
    instructions TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(family_id) REFERENCES family_workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY(member_id) REFERENCES family_members(id) ON DELETE CASCADE
);
```

### 6.3 `emergency_contacts` & `safety_supplies`
```sql
CREATE TABLE emergency_contacts (
    id TEXT PRIMARY KEY NOT NULL,
    family_id TEXT NOT NULL,
    name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    phone_primary TEXT NOT NULL,
    phone_secondary TEXT,
    notes TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(family_id) REFERENCES family_workspaces(id) ON DELETE CASCADE
);

CREATE TABLE safety_supplies (
    id TEXT PRIMARY KEY NOT NULL,
    family_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'FIRST_AID', 'FIRE_SAFETY', 'EMERGENCY_FOOD', 'LIGHTING'
    location TEXT NOT NULL,
    inspection_due_date INTEGER,
    status TEXT NOT NULL DEFAULT 'GOOD',
    created_at INTEGER NOT NULL,
    FOREIGN KEY(family_id) REFERENCES family_workspaces(id) ON DELETE CASCADE
);
```

### 6.4 `investment_holdings`
```sql
CREATE TABLE investment_holdings (
    id TEXT PRIMARY KEY NOT NULL,
    family_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    symbol_or_name TEXT NOT NULL,
    asset_class TEXT NOT NULL, -- 'EQUITY_INDEX', 'STOCKS', 'REAL_ESTATE', 'BONDS', 'CRYPTO'
    units_held REAL NOT NULL,
    cost_basis_cents INTEGER NOT NULL, -- Long cents total spent
    current_valuation_cents INTEGER NOT NULL, -- Long cents current estimated market value
    last_valued_at INTEGER NOT NULL,
    FOREIGN KEY(family_id) REFERENCES family_workspaces(id) ON DELETE CASCADE
);
```

---

## 7. Master Stage 2 — Routine Persistence Entities (Room v4, Internal Milestone 3.3.3 — 41 Entities Total)

### 7.1 `routines` (Table #40)
```sql
CREATE TABLE routines (
    id TEXT PRIMARY KEY NOT NULL, -- UUID v4
    family_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    cadence TEXT NOT NULL, -- 'DAILY', 'WEEKDAYS', 'WEEKENDS', 'CUSTOM'
    target_weekdays_json TEXT NOT NULL DEFAULT '[]', -- JSON array of strings e.g. ["MON", "TUE"]
    target_time TEXT, -- HH:mm 24h format
    assigned_member_id TEXT,
    scope TEXT NOT NULL DEFAULT 'FAMILY', -- 'FAMILY', 'COUPLE', 'PERSONAL'
    checklist_template_json TEXT NOT NULL DEFAULT '[]', -- JSON array of template item strings
    points_reward INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1, -- Invariant: remains 1 on occurrence completion
    streak_count INTEGER NOT NULL DEFAULT 0,
    best_streak_count INTEGER NOT NULL DEFAULT 0,
    last_completed_at INTEGER, -- Epoch milliseconds
    version INTEGER NOT NULL DEFAULT 1,
    sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY',
    is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(family_id) REFERENCES family_workspaces(id) ON DELETE CASCADE
);
CREATE INDEX idx_routines_family ON routines(family_id);
CREATE INDEX idx_routines_assigned ON routines(assigned_member_id);
```

### 7.2 `routine_occurrences` (Table #41)
```sql
CREATE TABLE routine_occurrences (
    id TEXT PRIMARY KEY NOT NULL, -- UUID v4 or 'occ-{routineId}-{targetDate}'
    routine_id TEXT NOT NULL,
    family_id TEXT NOT NULL,
    target_date TEXT NOT NULL, -- YYYY-MM-DD
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'COMPLETED', 'SKIPPED'
    completed_by_member_id TEXT,
    completed_at INTEGER, -- Epoch milliseconds
    checklist_progress_json TEXT NOT NULL DEFAULT '[]', -- JSON array of {id, text, completed}
    points_awarded INTEGER NOT NULL DEFAULT 0,
    linked_task_id TEXT, -- ID if converted to canonical task
    version INTEGER NOT NULL DEFAULT 1,
    sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY',
    is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(routine_id) REFERENCES routines(id) ON DELETE CASCADE,
    FOREIGN KEY(family_id) REFERENCES family_workspaces(id) ON DELETE CASCADE
);
CREATE INDEX idx_routine_occ_routine ON routine_occurrences(routine_id);
CREATE INDEX idx_routine_occ_family_date ON routine_occurrences(family_id, target_date);
CREATE UNIQUE INDEX idx_routine_occ_unique ON routine_occurrences(routine_id, target_date);
```

### 7.3 Room Non-Destructive Migration Script (`MIGRATION_3_4`)
`MIGRATION_3_4` increments database version from 3 to 4, executes the `CREATE TABLE` and `CREATE INDEX` statements above, and leaves all 39 pre-existing tables and their stored records completely intact.

---

## 8. Master Stage 2.A — Food Pantry, Wardrobe & Outfit Planner (Room Database Version 5)

The database version is incremented from `version = 4` to `version = 5` via non-destructive migration `MIGRATION_4_5`. This adds canonical storage for Food Pantry & Fridge Inventory (`HSE-04`) and Wardrobe & Weekly Outfit Planner (`HSE-07`), bringing total Room entities to 44.

### 8.1 `pantry_items` (Table #42)
```sql
CREATE TABLE IF NOT EXISTS pantry_items (
    id TEXT PRIMARY KEY NOT NULL,
    family_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'PANTRY', -- 'PANTRY', 'FRIDGE', 'FREEZER', 'SPICES', 'SNACKS', 'BEVERAGES', 'OTHER'
    quantity REAL NOT NULL DEFAULT 1.0,
    unit TEXT NOT NULL DEFAULT 'item',
    storage_location TEXT,
    expiry_date INTEGER, -- Epoch millis
    min_threshold REAL NOT NULL DEFAULT 1.0,
    is_low_stock INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY',
    is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(family_id) REFERENCES family_workspaces(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS index_pantry_items_family_id ON pantry_items(family_id);
CREATE INDEX IF NOT EXISTS index_pantry_items_category ON pantry_items(category);
CREATE INDEX IF NOT EXISTS index_pantry_items_expiry_date ON pantry_items(expiry_date);
```

### 8.2 `wardrobe_items` (Table #43)
```sql
CREATE TABLE IF NOT EXISTS wardrobe_items (
    id TEXT PRIMARY KEY NOT NULL,
    family_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'TOPS', -- 'TOPS', 'BOTTOMS', 'DRESSES', 'OUTERWEAR', 'SHOES', 'ACCESSORIES', 'OTHER'
    color TEXT,
    season TEXT NOT NULL DEFAULT 'ALL_SEASON', -- 'SPRING', 'SUMMER', 'FALL', 'WINTER', 'ALL_SEASON'
    is_clean INTEGER NOT NULL DEFAULT 1,
    image_uri TEXT,
    notes TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY',
    is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(family_id) REFERENCES family_workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY(member_id) REFERENCES family_members(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS index_wardrobe_items_family_id ON wardrobe_items(family_id);
CREATE INDEX IF NOT EXISTS index_wardrobe_items_member_id ON wardrobe_items(member_id);
CREATE INDEX IF NOT EXISTS index_wardrobe_items_category ON wardrobe_items(category);
```

### 8.3 `outfit_plans` (Table #44)
```sql
CREATE TABLE IF NOT EXISTS outfit_plans (
    id TEXT PRIMARY KEY NOT NULL,
    family_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    day_of_week TEXT NOT NULL, -- 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'
    outfit_name TEXT NOT NULL,
    item_ids_json TEXT NOT NULL DEFAULT '[]',
    notes TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY',
    is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(family_id) REFERENCES family_workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY(member_id) REFERENCES family_members(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS index_outfit_plans_family_id ON outfit_plans(family_id);
CREATE INDEX IF NOT EXISTS index_outfit_plans_member_id ON outfit_plans(member_id);
CREATE INDEX IF NOT EXISTS index_outfit_plans_day_of_week ON outfit_plans(day_of_week);
```

### 8.4 Room Non-Destructive Migration Script (`MIGRATION_4_5`)
`MIGRATION_4_5` increments Room database version from 4 to 5, executes the DDL creating tables `pantry_items`, `wardrobe_items`, and `outfit_plans`, creates required foreign key and query performance indices, and guarantees 100% preservation across all 41 pre-existing tables without data drop or reset.

---

## 9. Master Stage 3.A.1 Entities & Room Migration v6

### 9.1 `investment_holdings` (Table #45)
Fixed-precision microshares fractional asset tracking (`INV-01`).
- `1.000000` share = `1,000,000` microshares (zero floating-point representation).
- `cost_basis_cents` = total purchase cost in signed integer cents (`Long`).
- `current_price_cents` = market price per 1.0 whole share in integer cents (`Long`).
- Current market valuation formula: `(quantity_microshares * current_price_cents) / 1,000,000`.
- Unrealized gain/loss formula: `current_valuation_cents - cost_basis_cents`.

```sql
CREATE TABLE IF NOT EXISTS investment_holdings (
    id TEXT PRIMARY KEY NOT NULL,
    family_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    asset_name TEXT NOT NULL,
    asset_type TEXT NOT NULL, -- 'STOCK', 'ETF', 'CRYPTO', 'MUTUAL_FUND', 'BOND', 'RETIREMENT'
    quantity_microshares INTEGER NOT NULL, -- 1.0 share = 1,000,000 microshares
    cost_basis_cents INTEGER NOT NULL, -- Total purchase cost in integer cents
    current_price_cents INTEGER NOT NULL, -- Market price per 1.0 whole share in cents
    currency TEXT NOT NULL DEFAULT 'USD',
    notes TEXT,
    last_price_updated_at INTEGER NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY',
    is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(family_id) REFERENCES family_workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY(account_id) REFERENCES financial_accounts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS index_investment_holdings_family_id ON investment_holdings(family_id);
CREATE INDEX IF NOT EXISTS index_investment_holdings_account_id ON investment_holdings(account_id);
CREATE INDEX IF NOT EXISTS index_investment_holdings_symbol ON investment_holdings(symbol);
```

### 9.2 Room Non-Destructive Migration Script (`MIGRATION_5_6`)
`MIGRATION_5_6` increments Room database version from 5 to 6, executes the DDL creating Table #45 (`investment_holdings`), applies required foreign key and query performance indices, and guarantees 100% data preservation across all 44 pre-existing tables.



