import { Router, Request, Response } from 'express';
import {
  getHouseholdStore,
  computeExpiryStatus,
  syncMealPlanToGroceryList,
  purchaseGroceryItem,
  recordChoreCompletion,
  Recipe,
  MealPlanEntry,
  Chore,
  HomeAsset,
  PantryItem,
  WardrobeItem,
  OutfitPlan,
  GroceryListItem,
} from './householdData';
import { loadStore } from '../../server.js';
import { resolveServerMembership } from './authAndRbac.js';

export const householdRouter = Router();

// ============================================================================
// ZERO-TRUST FAMILY MEMBERSHIP AUTHORIZATION PARAMETER MIDDLEWARE
// ============================================================================
householdRouter.param('familyId', (req: Request, res: Response, next, familyId) => {
  const actor = (req as any).actor;
  if (!actor || !actor.userAccountId) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing authenticated session.' });
  }

  const store = loadStore();
  const access = resolveServerMembership(store, actor.userAccountId, familyId);
  if (!access.allowed || !access.membership) {
    return res.status(access.httpStatus).json({
      error: access.errorCode || 'WORKSPACE_ISOLATION_VIOLATION',
      message: access.errorMessage || 'Access denied for family workspace.',
    });
  }

  (req as any).membership = access.membership;
  next();
});

// ==========================================
// 1. MEALS & 7-DAY MEAL PLANNER
// ==========================================

householdRouter.get('/:familyId/meals', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const store = getHouseholdStore(familyId);
  const meals = Array.from(store.meals.values()).sort((a, b) => a.planDate - b.planDate);
  res.json({ meals });
});

householdRouter.post('/:familyId/meals', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const { planDate, mealType, recipeId, customMealTitle, servings, notes } = req.body;

  if (!planDate || !mealType) {
    return res.status(400).json({ error: 'MISSING_REQUIRED_FIELDS' });
  }

  const store = getHouseholdStore(familyId);
  const newMeal: MealPlanEntry = {
    id: `meal-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    familyId,
    planDate: Number(planDate),
    mealType,
    recipeId: recipeId || undefined,
    customMealTitle: customMealTitle || undefined,
    servings: servings ? Number(servings) : 4,
    notes: notes || undefined,
    createdAt: Date.now(),
  };

  store.meals.set(newMeal.id, newMeal);
  res.status(201).json({ meal: newMeal });
});

householdRouter.delete('/:familyId/meals/:mealId', (req: Request, res: Response) => {
  const { familyId, mealId } = req.params;
  const store = getHouseholdStore(familyId);
  const exists = store.meals.has(mealId);
  if (!exists) {
    return res.status(404).json({ error: 'MEAL_NOT_FOUND' });
  }
  store.meals.delete(mealId);
  res.json({ success: true, deletedMealId: mealId });
});

householdRouter.put('/:familyId/meals/:mealId', (req: Request, res: Response) => {
  const { familyId, mealId } = req.params;
  const store = getHouseholdStore(familyId);
  const meal = store.meals.get(mealId);
  if (!meal) {
    return res.status(404).json({ error: 'MEAL_NOT_FOUND' });
  }

  const { planDate, mealType, recipeId, customMealTitle, servings, notes } = req.body;
  if (planDate !== undefined) meal.planDate = Number(planDate);
  if (mealType !== undefined) meal.mealType = mealType;
  if (recipeId !== undefined) meal.recipeId = recipeId || undefined;
  if (customMealTitle !== undefined) meal.customMealTitle = customMealTitle;
  if (servings !== undefined) meal.servings = Number(servings);
  if (notes !== undefined) meal.notes = notes;

  res.json({ meal });
});

// Batch Schedule or Auto-Fill 7-Day Meal Plan
householdRouter.post('/:familyId/meals/batch-schedule-week', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const { startEpoch, mealsList } = req.body;
  const store = getHouseholdStore(familyId);
  const recipes = Array.from(store.recipes.values()).filter(r => !r.isArchived);

  // If explicit mealsList provided, use it
  if (Array.isArray(mealsList) && mealsList.length > 0) {
    const created: MealPlanEntry[] = [];
    for (const m of mealsList) {
      const newMeal: MealPlanEntry = {
        id: `meal-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        familyId,
        planDate: Number(m.planDate),
        mealType: m.mealType || 'DINNER',
        recipeId: m.recipeId || undefined,
        customMealTitle: m.customMealTitle || undefined,
        servings: m.servings ? Number(m.servings) : 4,
        notes: m.notes || undefined,
        createdAt: Date.now(),
      };
      store.meals.set(newMeal.id, newMeal);
      created.push(newMeal);
    }
    return res.status(201).json({ success: true, count: created.length, meals: Array.from(store.meals.values()) });
  }

  // Otherwise, auto-fill standard 7-day schedule starting from Monday
  const start = startEpoch ? Number(startEpoch) : (() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  })();

  const dayMs = 24 * 60 * 60 * 1000;
  const defaults = [
    { dayOffset: 0, mealType: 'BREAKFAST', title: 'Avocado Toast & Scrambled Eggs', servings: 4 },
    { dayOffset: 0, mealType: 'DINNER', title: recipes[0]?.title || 'Hearty Chicken Vegetable Soup', recipeId: recipes[0]?.id, servings: 6 },
    { dayOffset: 1, mealType: 'LUNCH', title: 'Quinoa Grain Bowl with Greens', servings: 3 },
    { dayOffset: 1, mealType: 'DINNER', title: 'Garlic Herb Baked Salmon with Asparagus', servings: 4 },
    { dayOffset: 2, mealType: 'DINNER', title: 'Taco Tuesday with Fresh Pico & Guacamole', servings: 5 },
    { dayOffset: 3, mealType: 'DINNER', title: 'Slow Cooker Beef Stew', servings: 6 },
    { dayOffset: 4, mealType: 'DINNER', title: 'Artisanal Pizza Night & Caesar Salad', servings: 5 },
    { dayOffset: 5, mealType: 'BREAKFAST', title: 'Fluffy Buttermilk Pancakes & Berries', servings: 4 },
    { dayOffset: 5, mealType: 'DINNER', title: 'Grilled Lemon Herb Chicken & Roasted Veggies', servings: 4 },
    { dayOffset: 6, mealType: 'DINNER', title: 'Sunday Family Roast with Mashed Potatoes', servings: 6 },
  ];

  const added: MealPlanEntry[] = [];
  for (const def of defaults) {
    const planDate = start + def.dayOffset * dayMs;
    const newMeal: MealPlanEntry = {
      id: `meal-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      familyId,
      planDate,
      mealType: def.mealType as any,
      recipeId: def.recipeId,
      customMealTitle: def.title,
      servings: def.servings,
      notes: 'Scheduled for weekly family nourishment',
      createdAt: Date.now(),
    };
    store.meals.set(newMeal.id, newMeal);
    added.push(newMeal);
  }

  res.status(201).json({
    success: true,
    addedCount: added.length,
    meals: Array.from(store.meals.values()).sort((a, b) => a.planDate - b.planDate),
  });
});

// ==========================================
// 2. RECIPES & INGREDIENTS
// ==========================================

householdRouter.get('/:familyId/recipes', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const store = getHouseholdStore(familyId);
  const recipes = Array.from(store.recipes.values()).filter(r => !r.isArchived);
  res.json({ recipes });
});

householdRouter.post('/:familyId/recipes', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const {
    title,
    description,
    prepTimeMinutes,
    cookTimeMinutes,
    servings,
    difficulty,
    category,
    dietaryNotes,
    ingredients,
    instructions,
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'TITLE_REQUIRED' });
  }

  const store = getHouseholdStore(familyId);
  const now = Date.now();
  const recipeId = `rec-${now}-${Math.random().toString(36).substr(2, 5)}`;

  const formattedIngredients = (ingredients || []).map((ing: any, idx: number) => ({
    id: ing.id || `ing-${now}-${idx}`,
    recipeId,
    itemName: ing.itemName || 'Ingredient',
    quantity: Number(ing.quantity) || 1,
    unit: ing.unit || 'item',
    notes: ing.notes,
  }));

  const formattedInstructions = (instructions || []).map((ins: any, idx: number) => ({
    id: ins.id || `ins-${now}-${idx}`,
    recipeId,
    stepNumber: ins.stepNumber || idx + 1,
    instructionText: ins.instructionText || String(ins),
  }));

  const newRecipe: Recipe = {
    id: recipeId,
    familyId,
    title,
    description: description || undefined,
    prepTimeMinutes: prepTimeMinutes ? Number(prepTimeMinutes) : 15,
    cookTimeMinutes: cookTimeMinutes ? Number(cookTimeMinutes) : 30,
    servings: servings ? Number(servings) : 4,
    difficulty: difficulty || 'MEDIUM',
    category: category || 'DINNER',
    dietaryNotes: dietaryNotes || undefined,
    familyRating: 5,
    isFavorite: false,
    ingredients: formattedIngredients,
    instructions: formattedInstructions,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };

  store.recipes.set(newRecipe.id, newRecipe);
  res.status(201).json({ recipe: newRecipe });
});

householdRouter.put('/:familyId/recipes/:recipeId', (req: Request, res: Response) => {
  const { familyId, recipeId } = req.params;
  const store = getHouseholdStore(familyId);
  const recipe = store.recipes.get(recipeId);
  if (!recipe) {
    return res.status(404).json({ error: 'RECIPE_NOT_FOUND' });
  }

  const updates = req.body;
  if (updates.title) recipe.title = updates.title;
  if (updates.description !== undefined) recipe.description = updates.description;
  if (updates.servings) recipe.servings = Number(updates.servings);
  if (updates.difficulty) recipe.difficulty = updates.difficulty;
  if (updates.category) recipe.category = updates.category;
  if (updates.isFavorite !== undefined) recipe.isFavorite = Boolean(updates.isFavorite);
  if (updates.ingredients) recipe.ingredients = updates.ingredients;
  if (updates.instructions) recipe.instructions = updates.instructions;
  recipe.updatedAt = Date.now();

  res.json({ recipe });
});

householdRouter.delete('/:familyId/recipes/:recipeId', (req: Request, res: Response) => {
  const { familyId, recipeId } = req.params;
  const store = getHouseholdStore(familyId);
  const recipe = store.recipes.get(recipeId);
  if (!recipe) {
    return res.status(404).json({ error: 'RECIPE_NOT_FOUND' });
  }
  recipe.isArchived = true;
  res.json({ success: true, archivedRecipeId: recipeId });
});

householdRouter.get('/:familyId/recipes/:recipeId/scale', (req: Request, res: Response) => {
  const { familyId, recipeId } = req.params;
  const { targetServings } = req.query;
  const store = getHouseholdStore(familyId);
  const recipe = store.recipes.get(recipeId);
  if (!recipe) {
    return res.status(404).json({ error: 'RECIPE_NOT_FOUND' });
  }

  const target = targetServings ? Number(targetServings) : recipe.servings;
  const scaleRatio = target / (recipe.servings || 1);

  const scaledIngredients = recipe.ingredients.map(ing => ({
    ...ing,
    originalQuantity: ing.quantity,
    quantity: Math.round(ing.quantity * scaleRatio * 100) / 100,
  }));

  res.json({
    recipe: {
      ...recipe,
      servings: target,
      ingredients: scaledIngredients,
    },
    targetServings: target,
    scaleRatio,
  });
});

// ==========================================
// 3. CHORES & POINTS LEDGER
// ==========================================

householdRouter.get('/:familyId/chores', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const store = getHouseholdStore(familyId);
  const chores = Array.from(store.chores.values()).filter(c => !c.isArchived);
  res.json({ chores, history: store.choreHistory });
});

householdRouter.post('/:familyId/chores', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const { title, description, assignedMemberId, zone, location, frequency, rewardPoints, nextDueDate, requiresVerification, checklist } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'CHORE_TITLE_REQUIRED' });
  }

  const store = getHouseholdStore(familyId);
  const now = Date.now();
  const formattedChecklist = Array.isArray(checklist)
    ? checklist.map((c: any, i: number) => ({
        id: c.id || `step-${now}-${i}`,
        text: typeof c === 'string' ? c : c.text || `Step ${i + 1}`,
        isDone: Boolean(c.isDone),
      }))
    : undefined;

  const newChore: Chore = {
    id: `chore-${now}-${Math.random().toString(36).substr(2, 5)}`,
    familyId,
    title,
    description: description || undefined,
    assignedMemberId: assignedMemberId || undefined,
    zone: zone || 'GENERAL',
    location: location || undefined,
    frequency: frequency || 'DAILY',
    rewardPoints: rewardPoints ? Number(rewardPoints) : 10,
    nextDueDate: nextDueDate ? Number(nextDueDate) : now + 24 * 60 * 60 * 1000,
    requiresVerification: Boolean(requiresVerification),
    isCompleted: false,
    checklist: formattedChecklist,
    isArchived: false,
    createdAt: now,
  };

  store.chores.set(newChore.id, newChore);
  res.status(201).json({ chore: newChore });
});

householdRouter.put('/:familyId/chores/:choreId', (req: Request, res: Response) => {
  const { familyId, choreId } = req.params;
  const store = getHouseholdStore(familyId);
  const chore = store.chores.get(choreId);
  if (!chore) {
    return res.status(404).json({ error: 'CHORE_NOT_FOUND' });
  }

  const { title, description, assignedMemberId, zone, location, frequency, rewardPoints, nextDueDate, isCompleted, checklist } = req.body;
  if (title !== undefined) chore.title = title;
  if (description !== undefined) chore.description = description;
  if (assignedMemberId !== undefined) chore.assignedMemberId = assignedMemberId;
  if (zone !== undefined) chore.zone = zone;
  if (location !== undefined) chore.location = location;
  if (frequency !== undefined) chore.frequency = frequency;
  if (rewardPoints !== undefined) chore.rewardPoints = Number(rewardPoints);
  if (nextDueDate !== undefined) chore.nextDueDate = Number(nextDueDate);
  if (isCompleted !== undefined) chore.isCompleted = Boolean(isCompleted);
  if (checklist !== undefined) chore.checklist = checklist;

  res.json({ chore });
});

householdRouter.delete('/:familyId/chores/:choreId', (req: Request, res: Response) => {
  const { familyId, choreId } = req.params;
  const store = getHouseholdStore(familyId);
  if (!store.chores.has(choreId)) {
    return res.status(404).json({ error: 'CHORE_NOT_FOUND' });
  }
  store.chores.delete(choreId);
  res.json({ success: true, deletedChoreId: choreId });
});

householdRouter.post('/:familyId/chores/:choreId/complete', (req: Request, res: Response) => {
  const { familyId, choreId } = req.params;
  const store = getHouseholdStore(familyId);
  const chore = store.chores.get(choreId);
  if (!chore) {
    return res.status(404).json({ error: 'CHORE_NOT_FOUND' });
  }

  const memberId = req.body?.memberId || chore.assignedMemberId || 'mem-sarah';

  try {
    const result = recordChoreCompletion(familyId, choreId, memberId);
    res.json({
      chore: result.chore,
      completionRecord: result.completionRecord,
      pointsAwarded: result.completionRecord.pointsEarned,
      pointsEarned: result.completionRecord.pointsEarned,
      alreadyCompleted: result.alreadyCompleted,
      assignedMemberId: memberId,
    });
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'CHORE_COMPLETION_FAILED' });
  }
});

// ==========================================
// 4. HOME ASSETS & MAINTENANCE
// ==========================================

householdRouter.get('/:familyId/assets', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const store = getHouseholdStore(familyId);
  const assets = Array.from(store.assets.values()).filter(a => !a.isArchived);
  res.json({ assets, maintenance: store.assetMaintenance });
});

householdRouter.post('/:familyId/assets', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const { name, category, description, purchasePriceCents, location, warrantyExpiration, maintenanceFrequencyMonths } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'ASSET_NAME_REQUIRED' });
  }

  const store = getHouseholdStore(familyId);
  const now = Date.now();
  const newAsset: HomeAsset = {
    id: `asset-${now}-${Math.random().toString(36).substr(2, 5)}`,
    familyId,
    name,
    category: category || 'APPLIANCES',
    description: description || undefined,
    purchasePriceCents: purchasePriceCents ? Number(purchasePriceCents) : 0,
    location: location || undefined,
    warrantyExpiration: warrantyExpiration ? Number(warrantyExpiration) : undefined,
    maintenanceFrequencyMonths: maintenanceFrequencyMonths ? Number(maintenanceFrequencyMonths) : 6,
    lastMaintenanceDate: now,
    nextMaintenanceDate: maintenanceFrequencyMonths ? now + Number(maintenanceFrequencyMonths) * 30 * 24 * 60 * 60 * 1000 : undefined,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };

  store.assets.set(newAsset.id, newAsset);
  res.status(201).json({ asset: newAsset });
});

householdRouter.put('/:familyId/assets/:assetId', (req: Request, res: Response) => {
  const { familyId, assetId } = req.params;
  const store = getHouseholdStore(familyId);
  const asset = store.assets.get(assetId);
  if (!asset) {
    return res.status(404).json({ error: 'ASSET_NOT_FOUND' });
  }

  const { name, category, description, purchasePriceCents, location, warrantyExpiration, maintenanceFrequencyMonths, lastMaintenanceDate, nextMaintenanceDate } = req.body;
  if (name !== undefined) asset.name = name;
  if (category !== undefined) asset.category = category;
  if (description !== undefined) asset.description = description;
  if (purchasePriceCents !== undefined) asset.purchasePriceCents = Number(purchasePriceCents);
  if (location !== undefined) asset.location = location;
  if (warrantyExpiration !== undefined) asset.warrantyExpiration = warrantyExpiration ? Number(warrantyExpiration) : undefined;
  if (maintenanceFrequencyMonths !== undefined) asset.maintenanceFrequencyMonths = Number(maintenanceFrequencyMonths);
  if (lastMaintenanceDate !== undefined) asset.lastMaintenanceDate = Number(lastMaintenanceDate);
  if (nextMaintenanceDate !== undefined) asset.nextMaintenanceDate = Number(nextMaintenanceDate);
  asset.updatedAt = Date.now();

  res.json({ asset });
});

householdRouter.delete('/:familyId/assets/:assetId', (req: Request, res: Response) => {
  const { familyId, assetId } = req.params;
  const store = getHouseholdStore(familyId);
  if (!store.assets.has(assetId)) {
    return res.status(404).json({ error: 'ASSET_NOT_FOUND' });
  }
  store.assets.delete(assetId);
  res.json({ success: true, deletedAssetId: assetId });
});

householdRouter.post('/:familyId/assets/:assetId/maintenance', (req: Request, res: Response) => {
  const { familyId, assetId } = req.params;
  const { performedBy, costCents, notes, nextDueDate } = req.body;

  const store = getHouseholdStore(familyId);
  const asset = store.assets.get(assetId);
  if (!asset) {
    return res.status(404).json({ error: 'ASSET_NOT_FOUND' });
  }

  const now = Date.now();
  const record = {
    id: `maint-${now}-${Math.random().toString(36).substr(2, 5)}`,
    assetId,
    familyId,
    maintenanceDate: now,
    performedBy: performedBy || 'Household',
    costCents: costCents ? Number(costCents) : 0,
    notes: notes || undefined,
    nextDueDate: nextDueDate ? Number(nextDueDate) : undefined,
  };

  store.assetMaintenance.push(record);
  asset.lastMaintenanceDate = now;
  if (nextDueDate) {
    asset.nextMaintenanceDate = Number(nextDueDate);
  }
  asset.updatedAt = now;

  res.json({ asset, record });
});

// ==========================================
// 5. FOOD PANTRY & FRIDGE INVENTORY (HSE-04)
// ==========================================

householdRouter.get('/:familyId/pantry', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const store = getHouseholdStore(familyId);
  const items = Array.from(store.pantry.values()).map(item => ({
    ...item,
    expiryStatus: computeExpiryStatus(item.expiryDate),
  }));
  res.json({
    pantry: items,
    locations: Array.from(store.customLocations || []),
    categories: Array.from(store.customCategories || []),
  });
});

householdRouter.get('/:familyId/pantry/meta', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const store = getHouseholdStore(familyId);
  res.json({
    locations: Array.from(store.customLocations || []),
    categories: Array.from(store.customCategories || []),
  });
});

householdRouter.post('/:familyId/pantry/locations', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const { location } = req.body;
  if (!location || !String(location).trim()) {
    return res.status(400).json({ error: 'LOCATION_NAME_REQUIRED' });
  }
  const store = getHouseholdStore(familyId);
  const trimmed = String(location).trim();
  store.customLocations.add(trimmed);
  res.status(201).json({ success: true, location: trimmed, locations: Array.from(store.customLocations) });
});

householdRouter.delete('/:familyId/pantry/locations/:locationName', (req: Request, res: Response) => {
  const { familyId, locationName } = req.params;
  const store = getHouseholdStore(familyId);
  const decoded = decodeURIComponent(locationName);
  store.customLocations.delete(decoded);
  res.json({ success: true, deletedLocation: decoded, locations: Array.from(store.customLocations) });
});

householdRouter.post('/:familyId/pantry/categories', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const { category } = req.body;
  if (!category || !String(category).trim()) {
    return res.status(400).json({ error: 'CATEGORY_NAME_REQUIRED' });
  }
  const store = getHouseholdStore(familyId);
  const trimmed = String(category).trim().toUpperCase();
  store.customCategories.add(trimmed);
  res.status(201).json({ success: true, category: trimmed, categories: Array.from(store.customCategories) });
});

householdRouter.delete('/:familyId/pantry/categories/:categoryName', (req: Request, res: Response) => {
  const { familyId, categoryName } = req.params;
  const store = getHouseholdStore(familyId);
  const decoded = decodeURIComponent(categoryName).toUpperCase();
  store.customCategories.delete(decoded);
  res.json({ success: true, deletedCategory: decoded, categories: Array.from(store.customCategories) });
});

householdRouter.post('/:familyId/pantry', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const { itemName, category, quantity, unit, storageLocation, expiryDate, minThreshold, notes } = req.body;

  if (!itemName) {
    return res.status(400).json({ error: 'ITEM_NAME_REQUIRED' });
  }

  const store = getHouseholdStore(familyId);
  const now = Date.now();
  const q = quantity !== undefined ? Number(quantity) : 1;
  const thresh = minThreshold !== undefined ? Number(minThreshold) : 1;

  const newItem: PantryItem = {
    id: `pan-${now}-${Math.random().toString(36).substr(2, 5)}`,
    familyId,
    itemName,
    category: category || 'PANTRY',
    quantity: q,
    unit: unit || 'item',
    storageLocation: storageLocation || undefined,
    expiryDate: expiryDate ? Number(expiryDate) : undefined,
    minThreshold: thresh,
    isLowStock: q <= thresh,
    notes: notes || undefined,
    createdAt: now,
    updatedAt: now,
  };

  store.pantry.set(newItem.id, newItem);
  res.status(201).json({
    pantryItem: {
      ...newItem,
      expiryStatus: computeExpiryStatus(newItem.expiryDate),
    },
  });
});

householdRouter.put('/:familyId/pantry/:itemId', (req: Request, res: Response) => {
  const { familyId, itemId } = req.params;
  const store = getHouseholdStore(familyId);
  const item = store.pantry.get(itemId);
  if (!item) {
    return res.status(404).json({ error: 'PANTRY_ITEM_NOT_FOUND' });
  }

  const updates = req.body;
  if (updates.itemName) item.itemName = updates.itemName;
  if (updates.category) item.category = updates.category;
  if (updates.quantity !== undefined) {
    item.quantity = Number(updates.quantity);
    item.isLowStock = item.quantity <= item.minThreshold;
  }
  if (updates.unit) item.unit = updates.unit;
  if (updates.storageLocation !== undefined) item.storageLocation = updates.storageLocation;
  if (updates.expiryDate !== undefined) item.expiryDate = updates.expiryDate ? Number(updates.expiryDate) : undefined;
  if (updates.minThreshold !== undefined) {
    item.minThreshold = Number(updates.minThreshold);
    item.isLowStock = item.quantity <= item.minThreshold;
  }
  if (updates.notes !== undefined) item.notes = updates.notes;
  item.updatedAt = Date.now();

  res.json({
    pantryItem: {
      ...item,
      expiryStatus: computeExpiryStatus(item.expiryDate),
    },
  });
});

householdRouter.post('/:familyId/pantry/:itemId/consume', (req: Request, res: Response) => {
  const { familyId, itemId } = req.params;
  const { amount } = req.body;
  const consumeAmount = amount ? Number(amount) : 1;

  const store = getHouseholdStore(familyId);
  const item = store.pantry.get(itemId);
  if (!item) {
    return res.status(404).json({ error: 'PANTRY_ITEM_NOT_FOUND' });
  }

  item.quantity = Math.max(0, item.quantity - consumeAmount);
  item.isLowStock = item.quantity <= item.minThreshold;
  item.updatedAt = Date.now();

  res.json({
    pantryItem: {
      ...item,
      expiryStatus: computeExpiryStatus(item.expiryDate),
    },
  });
});

householdRouter.delete('/:familyId/pantry/:itemId', (req: Request, res: Response) => {
  const { familyId, itemId } = req.params;
  const store = getHouseholdStore(familyId);
  if (!store.pantry.has(itemId)) {
    return res.status(404).json({ error: 'PANTRY_ITEM_NOT_FOUND' });
  }
  store.pantry.delete(itemId);
  res.json({ success: true, deletedItemId: itemId });
});

householdRouter.post('/:familyId/pantry/:itemId/restock', (req: Request, res: Response) => {
  const { familyId, itemId } = req.params;
  const { amount } = req.body;
  const restockAmount = amount ? Number(amount) : 1;

  const store = getHouseholdStore(familyId);
  const item = store.pantry.get(itemId);
  if (!item) {
    return res.status(404).json({ error: 'PANTRY_ITEM_NOT_FOUND' });
  }

  item.quantity = item.quantity + restockAmount;
  item.isLowStock = item.quantity <= item.minThreshold;
  item.updatedAt = Date.now();

  res.json({
    pantryItem: {
      ...item,
      expiryStatus: computeExpiryStatus(item.expiryDate),
    },
  });
});

// ==========================================
// 6. WARDROBE & OUTFIT PLANNER (HSE-07)
// ==========================================

householdRouter.get('/:familyId/wardrobe', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const { memberId } = req.query;
  const store = getHouseholdStore(familyId);
  let items = Array.from(store.wardrobe.values());
  if (memberId) {
    items = items.filter(w => w.memberId === String(memberId));
  }
  res.json({ wardrobe: items });
});

householdRouter.post('/:familyId/wardrobe', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const { memberId, itemName, category, color, season, isClean, notes } = req.body;

  if (!itemName || !memberId) {
    return res.status(400).json({ error: 'ITEM_NAME_AND_MEMBER_REQUIRED' });
  }

  const store = getHouseholdStore(familyId);
  const now = Date.now();
  const newItem: WardrobeItem = {
    id: `ward-${now}-${Math.random().toString(36).substr(2, 5)}`,
    familyId,
    memberId,
    itemName,
    category: category || 'TOPS',
    color: color || undefined,
    season: season || 'ALL_SEASON',
    isClean: isClean !== undefined ? Boolean(isClean) : true,
    notes: notes || undefined,
    createdAt: now,
    updatedAt: now,
  };

  store.wardrobe.set(newItem.id, newItem);
  res.status(201).json({ wardrobeItem: newItem });
});

householdRouter.put('/:familyId/wardrobe/:itemId', (req: Request, res: Response) => {
  const { familyId, itemId } = req.params;
  const store = getHouseholdStore(familyId);
  const item = store.wardrobe.get(itemId);
  if (!item) {
    return res.status(404).json({ error: 'WARDROBE_ITEM_NOT_FOUND' });
  }

  const updates = req.body;
  if (updates.itemName) item.itemName = updates.itemName;
  if (updates.category) item.category = updates.category;
  if (updates.color !== undefined) item.color = updates.color;
  if (updates.season) item.season = updates.season;
  if (updates.isClean !== undefined) item.isClean = Boolean(updates.isClean);
  if (updates.notes !== undefined) item.notes = updates.notes;
  item.updatedAt = Date.now();

  res.json({ wardrobeItem: item });
});

householdRouter.put('/:familyId/wardrobe/:itemId/clean', (req: Request, res: Response) => {
  const { familyId, itemId } = req.params;
  const store = getHouseholdStore(familyId);
  const item = store.wardrobe.get(itemId);
  if (!item) {
    return res.status(404).json({ error: 'WARDROBE_ITEM_NOT_FOUND' });
  }

  const { isClean } = req.body;
  item.isClean = Boolean(isClean);
  item.updatedAt = Date.now();
  res.json({ wardrobeItem: item });
});

householdRouter.get('/:familyId/outfits', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const { memberId } = req.query;
  const store = getHouseholdStore(familyId);
  let outfits = Array.from(store.outfits.values());
  if (memberId) {
    outfits = outfits.filter(o => o.memberId === String(memberId));
  }
  res.json({ outfits });
});

householdRouter.post('/:familyId/outfits', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const { memberId, planDate, outfitName, itemIds, occasion, notes } = req.body;

  if (!memberId || !planDate || !outfitName) {
    return res.status(400).json({ error: 'MEMBER_DATE_AND_NAME_REQUIRED' });
  }

  const store = getHouseholdStore(familyId);
  const now = Date.now();
  const newOutfit: OutfitPlan = {
    id: `outfit-${now}-${Math.random().toString(36).substr(2, 5)}`,
    familyId,
    memberId,
    planDate,
    outfitName,
    itemIds: Array.isArray(itemIds) ? itemIds : [],
    occasion: occasion || 'CASUAL',
    notes: notes || undefined,
    createdAt: now,
    updatedAt: now,
  };

  store.outfits.set(newOutfit.id, newOutfit);
  res.status(201).json({ outfitPlan: newOutfit });
});

householdRouter.delete('/:familyId/outfits/:outfitId', (req: Request, res: Response) => {
  const { familyId, outfitId } = req.params;
  const store = getHouseholdStore(familyId);
  if (!store.outfits.has(outfitId)) {
    return res.status(404).json({ error: 'OUTFIT_NOT_FOUND' });
  }
  store.outfits.delete(outfitId);
  res.json({ success: true, deletedOutfitId: outfitId });
});

householdRouter.delete('/:familyId/wardrobe/:itemId', (req: Request, res: Response) => {
  const { familyId, itemId } = req.params;
  const store = getHouseholdStore(familyId);
  if (!store.wardrobe.has(itemId)) {
    return res.status(404).json({ error: 'WARDROBE_ITEM_NOT_FOUND' });
  }
  store.wardrobe.delete(itemId);
  res.json({ success: true, deletedItemId: itemId });
});

// 1-Click Laundry Cycle: washes all dirty clothing items for the family
householdRouter.post('/:familyId/wardrobe/laundry-cycle', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const store = getHouseholdStore(familyId);
  let cleanedCount = 0;
  for (const item of store.wardrobe.values()) {
    if (!item.isClean) {
      item.isClean = true;
      item.updatedAt = Date.now();
      cleanedCount++;
    }
  }
  res.json({ success: true, cleanedCount, wardrobe: Array.from(store.wardrobe.values()) });
});

// ==========================================
// 7. GROCERY LISTS & WORKFLOW INTEGRATION
// ==========================================

householdRouter.get('/:familyId/groceries', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const store = getHouseholdStore(familyId);
  const groceries = Array.from(store.groceries.values());
  res.json({ groceries });
});

householdRouter.post('/:familyId/groceries', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const { itemName, category, quantity, unit } = req.body;

  if (!itemName) {
    return res.status(400).json({ error: 'ITEM_NAME_REQUIRED' });
  }

  const store = getHouseholdStore(familyId);
  const newGroc: GroceryListItem = {
    id: `groc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    familyId,
    itemName,
    category: category || 'PANTRY',
    quantity: quantity ? Number(quantity) : 1,
    unit: unit || 'item',
    isPurchased: false,
    createdAt: Date.now(),
  };

  store.groceries.set(newGroc.id, newGroc);
  res.status(201).json({ groceryItem: newGroc });
});

householdRouter.put('/:familyId/groceries/:itemId', (req: Request, res: Response) => {
  const { familyId, itemId } = req.params;
  const store = getHouseholdStore(familyId);
  const item = store.groceries.get(itemId);
  if (!item) {
    return res.status(404).json({ error: 'GROCERY_ITEM_NOT_FOUND' });
  }

  const { itemName, category, quantity, unit, isPurchased } = req.body;
  if (itemName !== undefined) item.itemName = itemName;
  if (category !== undefined) item.category = category;
  if (quantity !== undefined) item.quantity = Number(quantity);
  if (unit !== undefined) item.unit = unit;
  if (isPurchased !== undefined) item.isPurchased = Boolean(isPurchased);

  res.json({ groceryItem: item });
});

householdRouter.delete('/:familyId/groceries/:itemId', (req: Request, res: Response) => {
  const { familyId, itemId } = req.params;
  const store = getHouseholdStore(familyId);
  if (!store.groceries.has(itemId)) {
    return res.status(404).json({ error: 'GROCERY_ITEM_NOT_FOUND' });
  }
  store.groceries.delete(itemId);
  res.json({ success: true, deletedItemId: itemId });
});

householdRouter.post('/:familyId/groceries/clear-purchased', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const store = getHouseholdStore(familyId);
  let clearedCount = 0;
  for (const [id, item] of Array.from(store.groceries.entries())) {
    if (item.isPurchased) {
      store.groceries.delete(id);
      clearedCount++;
    }
  }
  res.json({ success: true, clearedCount, groceries: Array.from(store.groceries.values()) });
});

householdRouter.post('/:familyId/groceries/:itemId/purchase', (req: Request, res: Response) => {
  const { familyId, itemId } = req.params;
  try {
    const result = purchaseGroceryItem(familyId, itemId);
    res.json({
      ...result,
      restockedPantryItem: result.pantryItem,
    });
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'PURCHASE_FAILED' });
  }
});

// Workflow: Compare Meal Plan Ingredients with Pantry Stock & Auto-Generate Groceries
householdRouter.post('/:familyId/workflow/sync-meals-to-groceries', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const added = syncMealPlanToGroceryList(familyId);
  const store = getHouseholdStore(familyId);
  res.json({
    success: true,
    itemsAddedOrUpdated: added.length,
    allGroceries: Array.from(store.groceries.values()),
  });
});

// Workflow: Add all low-stock pantry items to grocery list
householdRouter.post('/:familyId/workflow/sync-pantry-low-stock-to-groceries', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const store = getHouseholdStore(familyId);
  const added: GroceryListItem[] = [];

  for (const item of store.pantry.values()) {
    if (item.isLowStock) {
      // Check if already in unpurchased groceries
      let existing: GroceryListItem | undefined;
      for (const g of store.groceries.values()) {
        if (!g.isPurchased && g.itemName.toLowerCase() === item.itemName.toLowerCase()) {
          existing = g;
          break;
        }
      }

      if (!existing) {
        const newG: GroceryListItem = {
          id: `groc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          familyId,
          itemName: item.itemName,
          category: item.category === 'FRIDGE' || item.category === 'FREEZER' ? 'DAIRY' : 'PANTRY',
          quantity: item.minThreshold * 2,
          unit: item.unit,
          isPurchased: false,
          sourcePantryItemId: item.id,
          createdAt: Date.now(),
        };
        store.groceries.set(newG.id, newG);
        added.push(newG);
      }
    }
  }

  res.json({
    success: true,
    addedLowStockCount: added.length,
    groceries: Array.from(store.groceries.values()),
  });
});

// ==========================================
// 8. CONSOLIDATED HOUSEHOLD HUB SUMMARY
// ==========================================

householdRouter.get('/:familyId/summary', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const store = getHouseholdStore(familyId);

  let expiredCount = 0;
  let expiringSoonCount = 0;
  let lowStockCount = 0;

  for (const item of store.pantry.values()) {
    if (item.isLowStock) lowStockCount++;
    const status = computeExpiryStatus(item.expiryDate);
    if (status === 'EXPIRED') expiredCount++;
    if (status === 'EXPIRING_SOON') expiringSoonCount++;
  }

  const choresList = Array.from(store.chores.values());
  const pendingChores = choresList.filter(c => !c.isCompleted).length;
  const completedChores = choresList.filter(c => c.isCompleted).length;

  const wardrobeList = Array.from(store.wardrobe.values());
  const laundryPendingCount = wardrobeList.filter(w => !w.isClean).length;

  const groceriesList = Array.from(store.groceries.values());
  const groceriesRemaining = groceriesList.filter(g => !g.isPurchased).length;

  res.json({
    success: true,
    summary: {
      familyId,
      mealCount: store.meals.size,
      recipeCount: store.recipes.size,
      pantryCount: store.pantry.size,
      lowStockCount,
      expiredCount,
      expiringSoonCount,
      groceriesRemaining,
      completedChoresToday: completedChores,
      pendingChores,
      wardrobeCount: store.wardrobe.size,
      laundryPendingCount,
      outfitPlansCount: store.outfits.size,
      assetsCount: store.assets.size,
    },
  });
});

