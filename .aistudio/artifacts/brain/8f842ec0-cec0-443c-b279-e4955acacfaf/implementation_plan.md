# Extended Family Heritage Map & Relative Recognition System

An interactive dual-lineage and geographic family map inside **Family Home Overview** that helps children and family members visually recognize extended relatives across both paternal and maternal lineages—complete with rounded portrait avatars, age, occupation, city/region, visit conversation starters, and collaborative family growth, mentorship, and prayer/encouragement tracking.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following product and design choices have been confirmed from your answers and will govern the implementation while preserving the existing 6 canonical Family submenu destinations and the One-Family-Per-Account architecture.

- **Confirmed Decision 1 — Visualization Mode**: **Dual-Lineage Tree + Geographic Location View**. Users can toggle between a *Dual-Lineage Heritage Tree* (Father's Lineage on the left wing, Mother's Lineage on the right wing, and the core household anchored at the center) and a *Geographic Relative Map & Regional Grouping View* showing where each extended relative lives.
- **Confirmed Decision 2 — Relative Recognition & Learning Tools**: **Interactive Profile Popover + Visit Conversation Starters**. Clicking any relative's rounded photo node opens a rich recognition drawer/popover displaying their portrait, exact age (calculated from birth year/date), relationship title, occupation ("What they do for a living"), city/country, shared interests, and curated conversation starters for children when visiting or calling them.
- **Confirmed Decision 3 — Extended Relative Growth & Support Model**: **Collaborative Family Support Goals, Mentorship, and Prayer / Encouragement Notes**. Family members (including children and parents) can view and contribute supportive growth areas, mentorship connections (e.g., an uncle mentoring a child in engineering, or the family supporting a cousin's university transition), and encouragement/prayer notes for each extended relative.
- **Confirmed Decision 4 — Navigation Placement**: **Integrated inside Family Home Overview (`home_overview`) as an interactive Heritage Map tab/workspace**. This preserves the strict 6-item Family menu contract while making the Extended Family Heritage Map immediately accessible from the primary Family landing view.

---

## 1. Overview & Core Concept

- **What It Does**:
  - Transforms **Family Home Overview** into both a household directory and a living **Multi-Generational Heritage & Relative Recognition Map**.
  - Allows parents to add extended relatives on both the **Paternal (Father's) Side** and **Maternal (Mother's) Side** across generations (Grandparents, Aunts & Uncles, Cousins, Great-Grandparents, and Extended Kin) without requiring those relatives to have login accounts.
  - Renders each relative as a tactile node with a **circular portrait photo**, name, relationship badge, age, occupation, and current city.
  - Equips children with **Before-We-Meet Recognition Cards & Conversation Prompts** so they immediately recognize a relative's face, know what they do for a living and where they live, and have meaningful questions to ask.
  - Provides a **Collaborative Growth & Encouragement Tracker** on every relative's profile where the household can identify potential growth areas, mentorship opportunities, active support goals, and encouragement/prayer notes.
- **Target Audience / Persona**:
  - **Parents (`OWNER` / `ADMIN`)**: Curate paternal and maternal family history, upload relative portraits, record occupations and locations, and guide family support/mentorship goals.
  - **Children & Youth (`CHILD` / `MEMBER`)**: Explore their heritage visually, recognize extended family faces before gatherings, learn what relatives do and where they live, and contribute encouragement notes or mentorship check-ins.
- **Key Value**:
  - Bridges generational and geographic distance so children grow up knowing the faces, stories, professions, locations, and growth journeys of both their father's and mother's extended families.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Entering the Heritage Map (`Family` → `Family Home Overview`)**:
   - At the top of `Family Home Overview`, a clean segmented view switcher allows switching between:
     - **Household Overview & Directory** (the existing core household identity, members, invitations, and announcements)
     - **Extended Family Heritage Map** (the new dual-lineage & geographic explorer)
2. **Exploring the Dual-Lineage Tree View**:
   - Displays a structured, scannable canvas organized into three columns/wings and generational tiers (`Grandparents & Elders` → `Parents, Aunts & Uncles` → `Children & Cousins`):
     - **Father's Side (Paternal Lineage)**
     - **Core Household Anchor** (Parents & Children at the center)
     - **Mother's Side (Maternal Lineage)**
   - Each relative node features a **56px circular portrait avatar** (`rounded-full` with lineage-coded ring: warm antique gold `#C39A60` for Paternal, botanical sage `#2E6F5E` for Maternal), full name, relationship to the children (e.g., *Paternal Uncle*, *Maternal Grandmother*), age (`tabular-nums`), occupation, and city/country separated by clean typographic dots (`·`).
3. **Switching to the Geographic Location View**:
   - Toggling to **Geographic Where-They-Live Map** plots relatives onto an interactive SVG world/regional coordinate canvas and groups them by **Country / City Hubs** (e.g., *London, UK*, *Lagos, Nigeria*, *Atlanta, USA*, *Toronto, Canada*), showing rounded photo clusters at each location and local time/distance context.
4. **Inspecting a Relative's Recognition & Growth Popover**:
   - Clicking any relative node opens the **Relative Recognition & Growth Drawer**:
     - **Face & Identity Header**: Large circular portrait photo, full name, traditional/family title, lineage side, exact age, birth year, city/country, and occupation/vocation summary.
     - **What They Do & Life Story**: Kid-friendly explanation of their profession, skills they can teach, and family background story.
     - **Visit Conversation Starters & Shared Interests**: Curated prompts children can use when interacting with them (e.g., *"Ask Uncle Samuel about how civil engineers design bridges"* or *"Ask Grandma Grace about growing up in..."*).
     - **Collaborative Growth Areas, Mentorship & Encouragement**:
       - *Growth & Support Areas*: Constructive ways the family is supporting or praying for this relative (e.g., *Career transition into healthcare*, *Launching a local bakery*, *Health & mobility recovery*, *Youth university mentorship*).
       - *Add Growth Goal / Encouragement Note*: Any family member (adults and children) can log a new growth milestone, mentorship link, or encouragement/prayer note persisted to the backend.
5. **Adding or Editing an Extended Relative**:
   - Clicking **Add Extended Relative** opens a guided modal supporting photo upload (or rich SVG portrait avatar generation), lineage side (`PATERNAL`, `MATERNAL`, `SHARED`), generation tier (`ELDERS_GRANDPARENTS`, `PARENTS_AUNTS_UNCLES`, `COUSINS_YOUTH`), relationship label to children, age/birth year, occupation, city & country, latitude/longitude preset or region, shared interests, conversation starters, and initial growth/support areas.

### Visual Identity & Theme

- **Aesthetic Direction**: Heritage Editorial Cartography — warm, dignified, and tactile, blending heirloom genealogy charts with clean modern spatial dashboards.
- **Color Palette & 60-30-10 Distribution**:
  - **60% Neutral Canvas**: Warm alabaster / stone (`#F7F4EC` / `bg-stone-50`) with crisp white structural containers (`#FFFFFF`).
  - **30% Structural Surfaces & Lineage Distinction**: Deep forest green (`#173D35`) for core household anchors, warm bronze-slate borders (`border-stone-200/90`), Paternal lineage ring accent (`#C39A60` antique gold), and Maternal lineage ring accent (`#2E6F5E` botanical emerald).
  - **10% High-Intent Accent**: Antique gold (`#C39A60`) and forest green (`#173D35`) for active view toggles and primary action buttons.
- **Typography & Hierarchy**:
  - **Display Headings**: Serif (`font-serif` / `Fraunces` / `Playfair Display`) with `text-wrap: balance` for lineage headers and relative names.
  - **Body & UI Controls**: Clean sans-serif (`Plus Jakarta Sans`) at 13px–15px for bios, occupations, conversation starters, and growth notes.
  - **Numeric & Age Metrics**: Strictly `tabular-nums` for ages, birth years, generation counts, and growth progress indicators.
- **Zero-Pill Metadata Discipline**:
  - All inline card metadata (`42 yrs · Civil Engineer · London, UK`) uses clean unboxed text with `·` separators rather than cluttered badge sandwiches.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dedicated Extended Relative Entity (`FAMILY_EXTENDED_RELATIVE`) Linked to Canonical `familyId`**
  - *Chosen Approach*: Store extended family map nodes as synchronized domain records (`FAMILY_EXTENDED_RELATIVE`) in `store.synchronizedEntities` under the family's single canonical `familyId`, while also cross-linking any existing household `familyMembers` who are part of the core tree.
  - *Why*: Extended relatives (grandparents, aunts, uncles, cousins across both parents' backgrounds) are profile-only heritage nodes and should not pollute login account memberships or require authentication accounts, while still enjoying full atomic persistence, Firestore mirroring, and family data isolation.
  - *Alternatives Considered*: Forcing every extended relative into `store.memberships` was rejected because it would clutter operational chore/finance member pickers with dozens of distant relatives.
- **Decision 2: Collaborative Growth & Encouragement Ledger per Relative**
  - *Chosen Approach*: Embed structured `growthAreas` (category, title, mentorshipOrSupportPlan, status, suggestedByMemberName) and `encouragementNotes` (authorName, note, createdAt) directly inside each `FAMILY_EXTENDED_RELATIVE` record with dedicated mutation endpoints so both parents and children (`OWNER`, `ADMIN`, `MEMBER`, `CHILD`) can contribute encouragement and growth ideas, while `GUEST` remains read-only.
  - *Why*: Encourages children to actively think about empathy, service, mentorship, and mutual growth when interacting with extended family members.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     Family Section (Stage331FamilyExperience)                │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Destination 1: Family Home Overview (home_overview)                    │  │
│  │  ┌───────────────────────────────┐  ┌───────────────────────────────┐  │  │
│  │  │ [Tab 1] Household Overview    │  │ [Tab 2] Extended Family       │  │  │
│  │  │ • Identity Banner & Metrics   │  │         Heritage Map          │  │  │
│  │  │ • Core Member Directory       │  │  ├─ Lineage Filter & Search   │  │  │
│  │  │ • Invitations & Announcements │  │  ├─ View 1: Dual-Lineage Tree │  │  │
│  │  └───────────────────────────────┘  │  │   (Father's ◄─ Core ─►     │  │  │
│  │                                     │  │    Mother's Lineage)       │  │  │
│  │                                     │  ├─ View 2: Geographic Map    │  │  │
│  │                                     │  │   (Regional Hubs & Pins)   │  │  │
│  │                                     │  └─ Interactive Relative      │  │  │
│  │                                     │     Popover & Growth Drawer   │  │  │
│  │                                     └──────────────┬────────────────┘  │  │
│  └────────────────────────────────────────────────────┼───────────────────┘  │
└───────────────────────────────────────────────────────┼──────────────────────┘
                                                        │ REST JSON API
                                                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                Express Backend (src/server/familySectionRoutes.ts)           │
│  • GET    /api/v1/family-section/:familyId (includes extendedRelatives[])    │
│  • POST   /api/v1/family-section/:familyId/extended-relatives                │
│  • PUT    /api/v1/family-section/:familyId/extended-relatives/:relativeId    │
│  • POST   /api/v1/family-section/:familyId/extended-relatives/:id/growth     │
│  • DELETE /api/v1/family-section/:familyId/extended-relatives/:relativeId    │
└───────────────────────────────────────────────────────┬──────────────────────┘
                                                        │ Atomic Tx
                                                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│      Authoritative SharedStore + Firestore Mirror (FAMILY_EXTENDED_RELATIVE) │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State (`FAMILY_EXTENDED_RELATIVE`)

Each extended relative record belongs to the canonical `familyId` and contains:
- **Identity & Lineage**:
  - `id`, `familyId`, `fullName`, `preferredTitle` (e.g., *"Uncle Kwame"*, *"Grandma Eleanor"*)
  - `lineageSide`: `'PATERNAL'` (Father's Side) | `'MATERNAL'` (Mother's Side) | `'CORE_HOUSEHOLD'`
  - `generationTier`: `'ELDERS_GRANDPARENTS'` | `'PARENTS_AUNTS_UNCLES'` | `'CHILDREN_COUSINS'`
  - `relationshipToChildren`: string (e.g., *"Paternal Grandfather"*, *"Maternal Aunt"*, *"First Cousin"*)
  - `avatarUrl`: circular portrait data URL or uploaded photo URL
- **Recognition Attributes (Face, Age, Occupation, Location)**:
  - `birthYear`: number & optional `birthDate`: string (computes live `age` in years)
  - `occupation`: string (*What they do for a living*, e.g., *"Pediatric Nurse & Community Health Educator"*)
  - `workplaceOrSpecialty`: string (e.g., *"Teaching Hospital • Maternal & Child Care"*)
  - `city`: string, `country`: string, `regionTag`: string
  - `mapCoordinates`: `{ xPercent: number; yPercent: number }` (for plotting rounded photo pins on the interactive geographic canvas)
- **Connection & Learning Prompts**:
  - `bioAndHeritageStory`: string (background story and family roots)
  - `sharedInterests`: `string[]`
  - `conversationStarters`: `string[]` (kid-friendly questions to ask when interacting)
- **Potential Growth Areas, Mentorship & Encouragement**:
  - `growthAreas`: Array of `{ id, title, category: 'CAREER_SKILL' | 'WELLBEING_HEALTH' | 'SPIRITUAL_CHARACTER' | 'EDUCATION_MENTORSHIP' | 'FAMILY_BOND', description, howKidsCanSupport, status: 'EXPLORING' | 'ACTIVE_SUPPORT' | 'CELEBRATED', addedByName, createdAt }`
  - `encouragementNotes`: Array of `{ id, authorName, authorRole, message, createdAt }`

### Interactive Component & State Mapping

1. **Lineage & Generation Filtering**:
   - Filter controls inside the Heritage Map toolbar let children or parents filter by `All Family`, `Father's Side (Paternal)`, `Mother's Side (Maternal)`, or search by name, profession, or city.
2. **Dual-Lineage Tree Canvas**:
   - Renders Paternal and Maternal branches side-by-side across generational rows with visual connector lines and rounded portrait badges (`w-14 h-14 rounded-full object-cover`) so children can visually trace how each relative connects to their father or mother.
3. **Geographic Location Map & City Hubs**:
   - Renders an interactive world/regional SVG map with rounded photo pins positioned at each relative's location, plus grouped City/Country cards below so children can see everyone who lives in a given city before a family trip.
4. **Relative Recognition Popover & Collaborative Growth Form**:
   - Selecting any relative opens the detail drawer where children can read conversation starters, view what the relative does for a living, and submit a new **Potential Growth Area / Support Idea** or **Encouragement & Prayer Note**, which immediately persists via `POST /api/v1/family-section/:familyId/extended-relatives/:relativeId/growth` and updates the live state.
