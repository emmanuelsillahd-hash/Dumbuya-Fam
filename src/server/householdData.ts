/**
 * FAMILYOS — Authoritative Household Data Engine (Master Stage 2)
 * Unifies Meals, Recipes, Chores, Home Assets, Food Pantry, Wardrobe, and Workflows.
 */

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  itemName: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface RecipeInstruction {
  id: string;
  recipeId: string;
  stepNumber: number;
  instructionText: string;
}

export interface Recipe {
  id: string;
  familyId: string;
  title: string;
  description?: string;
  imageUri?: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  category: string;
  dietaryNotes?: string;
  familyRating: number;
  isFavorite: boolean;
  source?: string;
  storageInstructions?: string;
  ingredients: RecipeIngredient[];
  instructions: RecipeInstruction[];
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface MealPlanEntry {
  id: string;
  familyId: string;
  planDate: number; // Epoch millis start of day
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  recipeId?: string;
  customMealTitle?: string;
  servings: number;
  notes?: string;
  createdAt: number;
}

export interface GroceryListItem {
  id: string;
  familyId: string;
  itemName: string;
  category: 'PRODUCE' | 'DAIRY' | 'MEAT' | 'PANTRY' | 'BAKERY' | 'FROZEN' | 'OTHER';
  quantity: number;
  unit: string;
  isPurchased: boolean;
  sourceRecipeId?: string;
  sourcePantryItemId?: string;
  createdAt: number;
}

export interface ChoreChecklistItem {
  id: string;
  text: string;
  isDone: boolean;
}

export interface Chore {
  id: string;
  familyId: string;
  title: string;
  description?: string;
  assignedMemberId?: string;
  zone: 'KITCHEN' | 'LIVING_ROOM' | 'BEDROOMS' | 'BATHROOMS' | 'OUTDOORS' | 'GENERAL' | string;
  location?: string;
  frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM' | string;
  rewardPoints: number;
  nextDueDate: number; // Epoch millis
  requiresVerification: boolean;
  isCompleted: boolean;
  checklist?: ChoreChecklistItem[];
  isArchived: boolean;
  createdAt: number;
}

export interface ChoreCompletionRecord {
  id: string;
  choreId: string;
  familyId: string;
  completedByMemberId: string;
  completedAt: number;
  pointsEarned: number;
}

export interface AssetMaintenanceRecord {
  id: string;
  assetId: string;
  familyId: string;
  maintenanceDate: number;
  performedBy: string;
  costCents: number;
  notes?: string;
  nextDueDate?: number;
}

export interface HomeAsset {
  id: string;
  familyId: string;
  name: string;
  category: 'APPLIANCES' | 'FURNITURE' | 'ELECTRONICS' | 'VEHICLES' | 'TOOLS' | 'HVAC' | 'PLUMBING' | 'OTHER';
  description?: string;
  purchaseDate?: number;
  purchasePriceCents: number;
  modelNumber?: string;
  serialNumber?: string;
  location?: string;
  warrantyExpiration?: number;
  maintenanceFrequencyMonths?: number;
  lastMaintenanceDate?: number;
  nextMaintenanceDate?: number;
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PantryItem {
  id: string;
  familyId: string;
  itemName: string;
  category: 'PANTRY' | 'FRIDGE' | 'FREEZER' | 'SPICES' | 'SNACKS' | 'BEVERAGES' | 'OTHER';
  quantity: number;
  unit: string;
  storageLocation?: string;
  expiryDate?: number; // Epoch millis
  minThreshold: number;
  isLowStock: boolean;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface WardrobeItem {
  id: string;
  familyId: string;
  memberId: string;
  itemName: string;
  category: 'TOPS' | 'BOTTOMS' | 'DRESSES' | 'OUTERWEAR' | 'SHOES' | 'ACCESSORIES' | 'OTHER';
  color?: string;
  season: 'SPRING' | 'SUMMER' | 'FALL' | 'WINTER' | 'ALL_SEASON';
  isClean: boolean;
  imageUri?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface OutfitPlan {
  id: string;
  familyId: string;
  memberId: string;
  planDate: string; // YYYY-MM-DD
  outfitName: string;
  itemIds: string[];
  occasion: 'SCHOOL' | 'WORK' | 'CHURCH' | 'CASUAL' | 'SPORTS' | 'FORMAL' | 'OTHER';
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// In-memory store keyed by familyId
interface FamilyHouseholdStore {
  recipes: Map<string, Recipe>;
  meals: Map<string, MealPlanEntry>;
  groceries: Map<string, GroceryListItem>;
  chores: Map<string, Chore>;
  choreHistory: ChoreCompletionRecord[];
  assets: Map<string, HomeAsset>;
  assetMaintenance: AssetMaintenanceRecord[];
  pantry: Map<string, PantryItem>;
  wardrobe: Map<string, WardrobeItem>;
  outfits: Map<string, OutfitPlan>;
  customLocations: Set<string>;
  customCategories: Set<string>;
}

const familyStores = new Map<string, FamilyHouseholdStore>();

export function getHouseholdStore(familyId: string): FamilyHouseholdStore {
  let store = familyStores.get(familyId);
  if (!store) {
    store = {
      recipes: new Map(),
      meals: new Map(),
      groceries: new Map(),
      chores: new Map(),
      choreHistory: [],
      assets: new Map(),
      assetMaintenance: [],
      pantry: new Map(),
      wardrobe: new Map(),
      outfits: new Map(),
      customLocations: new Set([
        'Pantry Shelf 1',
        'Pantry Shelf 2',
        'Walk-in Pantry',
        'Main Fridge Door',
        'Main Fridge Top Shelf',
        'Main Fridge Crisper',
        'Deep Freezer',
        'Spice Rack',
        'Root Cellar',
        'Wine & Beverage Cellar',
        'Garage Utility Storage',
      ]),
      customCategories: new Set([
        'PANTRY',
        'FRIDGE',
        'FREEZER',
        'SPICES',
        'BAKING',
        'SNACKS',
        'BEVERAGES',
        'PRODUCE',
        'DAIRY',
        'MEAT & SEAFOOD',
        'CANNED GOODS',
      ]),
    };
    seedHouseholdStore(familyId, store);
    familyStores.set(familyId, store);
  }
  return store;
}

function seedHouseholdStore(familyId: string, store: FamilyHouseholdStore) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // 1. Seed Recipes
  const r1: Recipe = {
    id: 'rec-1',
    familyId,
    title: 'Hearty Chicken Vegetable Soup',
    description: 'Nourishing homemade vegetable and chicken soup with fresh herbs.',
    prepTimeMinutes: 20,
    cookTimeMinutes: 40,
    servings: 6,
    difficulty: 'EASY',
    category: 'DINNER',
    dietaryNotes: 'Gluten-Free, Dairy-Free',
    familyRating: 5,
    isFavorite: true,
    isArchived: false,
    ingredients: [
      { id: 'ing-1', recipeId: 'rec-1', itemName: 'Chicken Breast', quantity: 2, unit: 'lbs' },
      { id: 'ing-2', recipeId: 'rec-1', itemName: 'Carrots', quantity: 4, unit: 'item' },
      { id: 'ing-3', recipeId: 'rec-1', itemName: 'Celery Ribs', quantity: 3, unit: 'item' },
      { id: 'ing-4', recipeId: 'rec-1', itemName: 'Chicken Broth', quantity: 4, unit: 'can' },
      { id: 'ing-5', recipeId: 'rec-1', itemName: 'Fresh Thyme', quantity: 1, unit: 'pack' },
    ],
    instructions: [
      { id: 'ins-1', recipeId: 'rec-1', stepNumber: 1, instructionText: 'Chop carrots, celery, and chicken breast into bite-sized cubes.' },
      { id: 'ins-2', recipeId: 'rec-1', stepNumber: 2, instructionText: 'Simmer chicken broth with vegetables and herbs for 35 minutes until tender.' },
    ],
    createdAt: now - 5 * dayMs,
    updatedAt: now - 5 * dayMs,
  };
  store.recipes.set(r1.id, r1);

  // 2. Seed Pantry Items
  const p1: PantryItem = {
    id: 'pan-1',
    familyId,
    itemName: 'Chicken Broth',
    category: 'PANTRY',
    quantity: 1, // Below recipe requirement -> triggers low stock
    unit: 'can',
    storageLocation: 'Pantry Shelf 2',
    expiryDate: now + 60 * dayMs,
    minThreshold: 2,
    isLowStock: true,
    notes: 'Low sodium preferred',
    createdAt: now - 10 * dayMs,
    updatedAt: now,
  };
  const p2: PantryItem = {
    id: 'pan-2',
    familyId,
    itemName: 'Organic Whole Milk',
    category: 'FRIDGE',
    quantity: 2,
    unit: 'L',
    storageLocation: 'Main Fridge Door',
    expiryDate: now + 2 * dayMs, // Expiring soon (<3 days)
    minThreshold: 1,
    isLowStock: false,
    createdAt: now - 3 * dayMs,
    updatedAt: now,
  };
  const p3: PantryItem = {
    id: 'pan-3',
    familyId,
    itemName: 'Rolled Oats',
    category: 'PANTRY',
    quantity: 3,
    unit: 'lbs',
    storageLocation: 'Cereal Bin',
    expiryDate: now + 180 * dayMs,
    minThreshold: 1,
    isLowStock: false,
    createdAt: now - 20 * dayMs,
    updatedAt: now,
  };
  store.pantry.set(p1.id, p1);
  store.pantry.set(p2.id, p2);
  store.pantry.set(p3.id, p3);

  // 3. Seed Meal Plans
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const m1: MealPlanEntry = {
    id: 'meal-1',
    familyId,
    planDate: todayStart,
    mealType: 'DINNER',
    recipeId: 'rec-1',
    customMealTitle: 'Hearty Chicken Vegetable Soup',
    servings: 6,
    notes: 'Serve with warm sourdough',
    createdAt: now - 2 * dayMs,
  };
  store.meals.set(m1.id, m1);

  // 4. Seed Chores
  const c1: Chore = {
    id: 'chore-1',
    familyId,
    title: 'Dishes & Kitchen Reset',
    description: 'Empty dishwasher, wipe countertops, and clean sink.',
    assignedMemberId: 'mem-leo-teen',
    zone: 'KITCHEN',
    location: 'Kitchen & Dining Room',
    frequency: 'DAILY',
    rewardPoints: 15,
    nextDueDate: todayStart + 20 * 60 * 60 * 1000, // 8:00 PM today
    requiresVerification: false,
    isCompleted: false,
    checklist: [
      { id: 'step-1', text: 'Empty clean dishes from dishwasher', isDone: true },
      { id: 'step-2', text: 'Wipe down dining table and kitchen island', isDone: false },
      { id: 'step-3', text: 'Scrub sink and replace sponge', isDone: false },
    ],
    isArchived: false,
    createdAt: now - 7 * dayMs,
  };
  const c2: Chore = {
    id: 'chore-2',
    familyId,
    title: 'Living Room Tidy & Vacuum',
    description: 'Put away toys, fluff pillows, and vacuum carpet.',
    assignedMemberId: 'mem-maya-child',
    zone: 'LIVING_ROOM',
    location: 'Main Living Room',
    frequency: 'WEEKLY',
    rewardPoints: 25,
    nextDueDate: todayStart + 2 * dayMs,
    requiresVerification: true,
    isCompleted: false,
    checklist: [
      { id: 'step-2-1', text: 'Put away board games and books', isDone: true },
      { id: 'step-2-2', text: 'Fluff couch cushions and fold throw blankets', isDone: true },
      { id: 'step-2-3', text: 'Vacuum central rug and corners', isDone: false },
    ],
    isArchived: false,
    createdAt: now - 7 * dayMs,
  };
  store.chores.set(c1.id, c1);
  store.chores.set(c2.id, c2);

  // 5. Seed Home Assets
  const a1: HomeAsset = {
    id: 'asset-1',
    familyId,
    name: 'HVAC Heating & Cooling Unit',
    category: 'HVAC',
    description: 'Trane XR14 High Efficiency Heat Pump',
    purchasePriceCents: 450000, // $4,500.00
    location: 'Basement / Exterior',
    warrantyExpiration: now + 730 * dayMs,
    maintenanceFrequencyMonths: 6,
    lastMaintenanceDate: now - 90 * dayMs,
    nextMaintenanceDate: now + 90 * dayMs,
    isArchived: false,
    createdAt: now - 90 * dayMs,
    updatedAt: now - 90 * dayMs,
  };
  store.assets.set(a1.id, a1);

  // 6. Seed Wardrobe & Outfit Items
  const w1: WardrobeItem = {
    id: 'ward-1',
    familyId,
    memberId: 'mem-maya-child',
    itemName: 'Navy Blue School Cardigan',
    category: 'OUTERWEAR',
    color: 'Navy Blue',
    season: 'ALL_SEASON',
    isClean: true,
    createdAt: now - 30 * dayMs,
    updatedAt: now,
  };
  const w2: WardrobeItem = {
    id: 'ward-2',
    familyId,
    memberId: 'mem-maya-child',
    itemName: 'Pleated School Skirt',
    category: 'BOTTOMS',
    color: 'Plaid Grey',
    season: 'ALL_SEASON',
    isClean: true,
    createdAt: now - 30 * dayMs,
    updatedAt: now,
  };
  store.wardrobe.set(w1.id, w1);
  store.wardrobe.set(w2.id, w2);

  const o1: OutfitPlan = {
    id: 'outfit-1',
    familyId,
    memberId: 'mem-maya-child',
    planDate: new Date().toISOString().split('T')[0],
    outfitName: 'Monday School Uniform',
    itemIds: ['ward-1', 'ward-2'],
    occasion: 'SCHOOL',
    notes: 'School photo day',
    createdAt: now,
    updatedAt: now,
  };
  store.outfits.set(o1.id, o1);

  // 7. Seed Initial Groceries
  const g1: GroceryListItem = {
    id: 'groc-1',
    familyId,
    itemName: 'Chicken Broth',
    category: 'PANTRY',
    quantity: 3,
    unit: 'can',
    isPurchased: false,
    sourcePantryItemId: 'pan-1',
    createdAt: now - 1 * dayMs,
  };
  store.groceries.set(g1.id, g1);
}

// ==========================================
// WORKFLOW LOGIC & CROSS-MODULE INTEGRATION
// ==========================================

export function computeExpiryStatus(expiryDate?: number): 'EXPIRED' | 'EXPIRING_SOON' | 'SAFE' | 'UNKNOWN' {
  if (!expiryDate) return 'UNKNOWN';
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  if (expiryDate < now) return 'EXPIRED';
  if (expiryDate <= now + 3 * dayMs) return 'EXPIRING_SOON';
  return 'SAFE';
}

/**
 * Workflow A: Inspects meal plan ingredients and compares with pantry inventory.
 * Automatically adds missing or insufficient ingredients to the grocery list.
 */
export function syncMealPlanToGroceryList(familyId: string): GroceryListItem[] {
  const store = getHouseholdStore(familyId);
  const addedItems: GroceryListItem[] = [];

  for (const meal of store.meals.values()) {
    if (!meal.recipeId) continue;
    const recipe = store.recipes.get(meal.recipeId);
    if (!recipe) continue;

    for (const ingredient of recipe.ingredients) {
      // Find matching pantry item by name (case-insensitive)
      let foundPantry: PantryItem | undefined;
      for (const item of store.pantry.values()) {
        if (item.itemName.toLowerCase() === ingredient.itemName.toLowerCase()) {
          foundPantry = item;
          break;
        }
      }

      const pantryQty = foundPantry ? foundPantry.quantity : 0;
      const neededQty = ingredient.quantity;

      if (pantryQty < neededQty) {
        const missingQty = Math.max(1, neededQty - pantryQty);
        
        // Check if already in grocery list
        let existingGrocery: GroceryListItem | undefined;
        for (const g of store.groceries.values()) {
          if (!g.isPurchased && g.itemName.toLowerCase() === ingredient.itemName.toLowerCase()) {
            existingGrocery = g;
            break;
          }
        }

        if (existingGrocery) {
          existingGrocery.quantity = Math.max(existingGrocery.quantity, missingQty);
          addedItems.push(existingGrocery);
        } else {
          const newGroc: GroceryListItem = {
            id: `groc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            familyId,
            itemName: ingredient.itemName,
            category: 'PANTRY',
            quantity: missingQty,
            unit: ingredient.unit,
            isPurchased: false,
            sourceRecipeId: recipe.id,
            sourcePantryItemId: foundPantry?.id,
            createdAt: Date.now(),
          };
          store.groceries.set(newGroc.id, newGroc);
          addedItems.push(newGroc);
        }
      }
    }
  }

  return addedItems;
}

/**
 * Workflow B: Marks a grocery list item as purchased and auto-replenishes or creates pantry inventory.
 */
export function purchaseGroceryItem(familyId: string, groceryItemId: string): { groceryItem: GroceryListItem; pantryItem: PantryItem; alreadyPurchased: boolean } {
  const store = getHouseholdStore(familyId);
  const grocery = store.groceries.get(groceryItemId);
  if (!grocery) {
    throw new Error('GROCERY_ITEM_NOT_FOUND');
  }

  // Idempotency check: If already purchased, do not increment pantry a second time!
  if (grocery.isPurchased) {
    let matchedPantry = grocery.sourcePantryItemId ? store.pantry.get(grocery.sourcePantryItemId) : undefined;
    if (!matchedPantry) {
      for (const p of store.pantry.values()) {
        if (p.itemName.toLowerCase() === grocery.itemName.toLowerCase()) {
          matchedPantry = p;
          break;
        }
      }
    }
    return { groceryItem: grocery, pantryItem: matchedPantry!, alreadyPurchased: true };
  }

  grocery.isPurchased = true;

  // Match or create pantry item
  let matchedPantry: PantryItem | undefined;
  if (grocery.sourcePantryItemId) {
    matchedPantry = store.pantry.get(grocery.sourcePantryItemId);
  }
  if (!matchedPantry) {
    for (const p of store.pantry.values()) {
      if (p.itemName.toLowerCase() === grocery.itemName.toLowerCase()) {
        matchedPantry = p;
        break;
      }
    }
  }

  const now = Date.now();
  if (matchedPantry) {
    matchedPantry.quantity += grocery.quantity;
    matchedPantry.isLowStock = matchedPantry.quantity <= matchedPantry.minThreshold;
    matchedPantry.updatedAt = now;
  } else {
    matchedPantry = {
      id: `pan-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      familyId,
      itemName: grocery.itemName,
      category: grocery.category === 'PRODUCE' || grocery.category === 'DAIRY' || grocery.category === 'MEAT' ? 'FRIDGE' : 'PANTRY',
      quantity: grocery.quantity,
      unit: grocery.unit,
      minThreshold: 1,
      isLowStock: false,
      createdAt: now,
      updatedAt: now,
    };
    store.pantry.set(matchedPantry.id, matchedPantry);
  }

  return { groceryItem: grocery, pantryItem: matchedPantry, alreadyPurchased: false };
}

/**
 * Workflow C: Records chore completion, awards points to member, and rolls next due date forward.
 * Idempotency safeguard: If already completed on this cycle, returns 0 points without rolling date again.
 */
export function recordChoreCompletion(
  familyId: string,
  choreId: string,
  memberId: string
): { chore: Chore; completionRecord: ChoreCompletionRecord; alreadyCompleted?: boolean } {
  const store = getHouseholdStore(familyId);
  const chore = store.chores.get(choreId);
  if (!chore) {
    throw new Error('CHORE_NOT_FOUND');
  }

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  if (chore.isCompleted) {
    const dupRecord: ChoreCompletionRecord = {
      id: `c-comp-dup-${now}-${Math.random().toString(36).substr(2, 5)}`,
      choreId: chore.id,
      familyId,
      completedByMemberId: memberId,
      completedAt: now,
      pointsEarned: 0,
    };
    return { chore, completionRecord: dupRecord, alreadyCompleted: true };
  }

  chore.isCompleted = true;

  // Roll nextDueDate forward
  if (chore.frequency === 'DAILY') {
    chore.nextDueDate += dayMs;
  } else if (chore.frequency === 'WEEKLY') {
    chore.nextDueDate += 7 * dayMs;
  } else if (chore.frequency === 'BIWEEKLY') {
    chore.nextDueDate += 14 * dayMs;
  } else if (chore.frequency === 'MONTHLY') {
    chore.nextDueDate += 30 * dayMs;
  }

  const record: ChoreCompletionRecord = {
    id: `c-comp-${now}-${Math.random().toString(36).substr(2, 5)}`,
    choreId: chore.id,
    familyId,
    completedByMemberId: memberId,
    completedAt: now,
    pointsEarned: chore.rewardPoints,
  };
  store.choreHistory.push(record);

  return { chore, completionRecord: record, alreadyCompleted: false };
}

