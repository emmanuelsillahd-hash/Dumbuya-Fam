import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Utensils,
  BookOpen,
  CheckSquare,
  Package,
  Shirt,
  Wrench,
  ShoppingCart,
  Plus,
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronRight,
  Trash2,
  Edit3,
  ArrowRight,
  Upload,
  Check,
  X,
  Shield,
  DollarSign,
  MapPin,
  Filter,
  RotateCcw,
  Printer,
  FileText,
  Tag,
  FolderPlus,
  Settings,
} from 'lucide-react';
import { offlineSyncEngine } from '../services/offlineSyncEngine';

interface Stage2HouseholdExperienceProps {
  sessionToken: string | null;
  selectedPersona: string;
  activeSubPage?: string;
  onSelectSubPage?: (subId: string) => void;
}

type HouseholdSubTab = 'meals' | 'recipes' | 'pantry' | 'groceries' | 'chores' | 'wardrobe' | 'assets';

const SUBPAGE_TO_HOUSEHOLD_TAB: Record<string, HouseholdSubTab> = {
  house_meals: 'meals',
  house_recipes: 'recipes',
  house_pantry: 'pantry',
  house_groceries: 'groceries',
  house_chores: 'chores',
  house_wardrobe: 'wardrobe',
  house_assets: 'assets',
};

const HOUSEHOLD_TAB_TO_SUBPAGE: Record<HouseholdSubTab, string> = {
  meals: 'house_meals',
  recipes: 'house_recipes',
  pantry: 'house_pantry',
  groceries: 'house_groceries',
  chores: 'house_chores',
  wardrobe: 'house_wardrobe',
  assets: 'house_assets',
};

const BRAND = {
  primary: '#173D35',
  ivory: '#F7F4EC',
  sage: '#A8BDAA',
  secondarySage: '#6B8A6E',
  gold: '#C39A60',
  lightGold: '#E7D1AA',
  border: '#E2DCD0',
};

const FAMILY_MEMBERS = [
  { id: 'mem-sarah', name: 'Sarah Jenkins (Head/Mother)' },
  { id: 'mem-david', name: 'David Jenkins (Admin/Father)' },
  { id: 'mem-maya-child', name: 'Maya Jenkins (Teen)' },
  { id: 'mem-lucas-child', name: 'Lucas Jenkins (Child)' },
  { id: 'mem-martha', name: 'Martha Vance (Caregiver/Guest)' },
];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface VisualCardHeaderProps {
  itemId: string;
  title: string;
  description?: string;
  category?: string;
  imageUrl?: string;
  onPhotoUpload: (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  onGenerateAi: (itemId: string, title: string, description: string, category: string) => void;
  isGenerating?: boolean;
}

const VisualCardHeader: React.FC<VisualCardHeaderProps> = ({
  itemId,
  title,
  description = '',
  category = '',
  imageUrl,
  onPhotoUpload,
  onGenerateAi,
  isGenerating,
}) => {
  return (
    <div className="relative w-full h-32 rounded-2xl overflow-hidden bg-gradient-to-br from-[#173D35] via-[#12332C] to-[#0E2822] mb-3 group border border-white/10 shadow-xs">
      {imageUrl ? (
        <img src={imageUrl} alt={title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
          <Sparkles className="w-5 h-5 text-[#E5C388] mb-1 animate-pulse" />
          <span className="font-serif font-bold text-white text-xs line-clamp-1">{title}</span>
          <span className="text-[10px] text-emerald-200/70 truncate max-w-xs">{description || category || 'Visual Representation'}</span>
        </div>
      )}

      {/* Hover Controls */}
      <div className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 p-2 backdrop-blur-xs">
        <label className="cursor-pointer px-2.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-[11px] font-semibold flex items-center space-x-1 border border-white/30 backdrop-blur-md transition">
          <Upload className="w-3.5 h-3.5" />
          <span>Upload</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPhotoUpload(itemId, e)}
          />
        </label>

        <button
          type="button"
          disabled={isGenerating}
          onClick={() => onGenerateAi(itemId, title, description, category)}
          className="px-2.5 py-1.5 rounded-xl bg-[#C39A60] hover:bg-[#E5C388] text-[#173D35] text-[11px] font-bold flex items-center space-x-1 shadow-md transition disabled:opacity-50"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
          <span>{isGenerating ? 'Generating...' : 'AI Visual'}</span>
        </button>
      </div>
    </div>
  );
};

export const Stage2HouseholdExperience: React.FC<Stage2HouseholdExperienceProps> = ({
  sessionToken,
  selectedPersona,
  activeSubPage,
  onSelectSubPage,
}) => {
  const [subTab, setSubTab] = useState<HouseholdSubTab>(
    (activeSubPage && SUBPAGE_TO_HOUSEHOLD_TAB[activeSubPage]) || 'meals'
  );

  useEffect(() => {
    if (activeSubPage && SUBPAGE_TO_HOUSEHOLD_TAB[activeSubPage]) {
      setSubTab(SUBPAGE_TO_HOUSEHOLD_TAB[activeSubPage]);
    }
  }, [activeSubPage]);

  const handleSelectSubTab = (tab: HouseholdSubTab) => {
    setSubTab(tab);
    if (onSelectSubPage) {
      onSelectSubPage(HOUSEHOLD_TAB_TO_SUBPAGE[tab]);
    }
  };

  const [loading, setLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Data states
  const [meals, setMeals] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [chores, setChores] = useState<any[]>([]);
  const [choreHistory, setChoreHistory] = useState<any[]>([]);
  const [pantry, setPantry] = useState<any[]>([]);
  const [wardrobe, setWardrobe] = useState<any[]>([]);
  const [outfits, setOutfits] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [groceries, setGroceries] = useState<any[]>([]);

  // Dynamic Pantry Locations & Categories
  const [pantryLocations, setPantryLocations] = useState<string[]>([
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
  ]);
  const [pantryCategories, setPantryCategories] = useState<string[]>([
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
  ]);

  // Visual Image Map & AI Generation States
  const [itemImages, setItemImages] = useState<Record<string, string>>({});
  const [generatingAiMap, setGeneratingAiMap] = useState<Record<string, boolean>>({});

  const familyId = 'fam-1';

  const authHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
  }), [sessionToken]);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handlePhotoUpload = (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setItemImages(prev => ({ ...prev, [itemId]: reader.result as string }));
        showFeedback('Custom photo visual uploaded!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAiVisual = async (itemId: string, title: string, description: string, category: string) => {
    setGeneratingAiMap(prev => ({ ...prev, [itemId]: true }));
    try {
      const res = await fetch('/api/v1/ai/generate-image', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ title, description, category }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        setItemImages(prev => ({ ...prev, [itemId]: data.imageUrl }));
        showFeedback(`AI generated visual for "${title}"!`);
      }
    } catch (err) {
      console.error(err);
      showFeedback('Error generating AI visual.');
    } finally {
      setGeneratingAiMap(prev => ({ ...prev, [itemId]: false }));
    }
  };

  // Fetch all household data with offline cache fallback
  const fetchHouseholdData = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, rRes, cRes, pRes, wRes, oRes, aRes, gRes] = await Promise.all([
        fetch(`/api/v1/household/${familyId}/meals`, { headers: authHeaders }).catch(() => null),
        fetch(`/api/v1/household/${familyId}/recipes`, { headers: authHeaders }).catch(() => null),
        fetch(`/api/v1/household/${familyId}/chores`, { headers: authHeaders }).catch(() => null),
        fetch(`/api/v1/household/${familyId}/pantry`, { headers: authHeaders }).catch(() => null),
        fetch(`/api/v1/household/${familyId}/wardrobe`, { headers: authHeaders }).catch(() => null),
        fetch(`/api/v1/household/${familyId}/outfits`, { headers: authHeaders }).catch(() => null),
        fetch(`/api/v1/household/${familyId}/assets`, { headers: authHeaders }).catch(() => null),
        fetch(`/api/v1/household/${familyId}/groceries`, { headers: authHeaders }).catch(() => null),
      ]);

      if (mRes && mRes.ok) {
        const mData = (await mRes.json()).meals || [];
        setMeals(mData);
        offlineSyncEngine.setCache(`household_meals_${familyId}`, mData);
      } else {
        const cachedMeals = offlineSyncEngine.getCache<any[]>(`household_meals_${familyId}`);
        if (cachedMeals) setMeals(cachedMeals);
      }

      if (rRes && rRes.ok) {
        const rData = (await rRes.json()).recipes || [];
        setRecipes(rData);
        offlineSyncEngine.setCache(`household_recipes_${familyId}`, rData);
      } else {
        const cachedRecipes = offlineSyncEngine.getCache<any[]>(`household_recipes_${familyId}`);
        if (cachedRecipes) setRecipes(cachedRecipes);
      }

      if (cRes && cRes.ok) {
        const cData = await cRes.json();
        const choresList = cData.chores || [];
        const histList = cData.history || [];
        setChores(choresList);
        setChoreHistory(histList);
        offlineSyncEngine.setCache(`household_chores_${familyId}`, choresList);
        offlineSyncEngine.setCache(`household_chore_hist_${familyId}`, histList);
      } else {
        const cachedChores = offlineSyncEngine.getCache<any[]>(`household_chores_${familyId}`);
        const cachedHist = offlineSyncEngine.getCache<any[]>(`household_chore_hist_${familyId}`);
        if (cachedChores) setChores(cachedChores);
        if (cachedHist) setChoreHistory(cachedHist);
      }

      if (pRes && pRes.ok) {
        const pData = await pRes.json();
        const pList = pData.pantry || [];
        setPantry(pList);
        offlineSyncEngine.setCache(`household_pantry_${familyId}`, pList);
        if (Array.isArray(pData.locations) && pData.locations.length > 0) {
          setPantryLocations(pData.locations);
          offlineSyncEngine.setCache(`household_pantry_locations_${familyId}`, pData.locations);
        }
        if (Array.isArray(pData.categories) && pData.categories.length > 0) {
          setPantryCategories(pData.categories);
          offlineSyncEngine.setCache(`household_pantry_categories_${familyId}`, pData.categories);
        }
      } else {
        const cachedPantry = offlineSyncEngine.getCache<any[]>(`household_pantry_${familyId}`);
        const cachedLocs = offlineSyncEngine.getCache<string[]>(`household_pantry_locations_${familyId}`);
        const cachedCats = offlineSyncEngine.getCache<string[]>(`household_pantry_categories_${familyId}`);
        if (cachedPantry) setPantry(cachedPantry);
        if (cachedLocs) setPantryLocations(cachedLocs);
        if (cachedCats) setPantryCategories(cachedCats);
      }

      if (wRes && wRes.ok) {
        const wData = (await wRes.json()).wardrobe || [];
        setWardrobe(wData);
        offlineSyncEngine.setCache(`household_wardrobe_${familyId}`, wData);
      } else {
        const cachedW = offlineSyncEngine.getCache<any[]>(`household_wardrobe_${familyId}`);
        if (cachedW) setWardrobe(cachedW);
      }

      if (oRes && oRes.ok) {
        const oData = (await oRes.json()).outfits || [];
        setOutfits(oData);
        offlineSyncEngine.setCache(`household_outfits_${familyId}`, oData);
      } else {
        const cachedO = offlineSyncEngine.getCache<any[]>(`household_outfits_${familyId}`);
        if (cachedO) setOutfits(cachedO);
      }

      if (aRes && aRes.ok) {
        const aData = (await aRes.json()).assets || [];
        setAssets(aData);
        offlineSyncEngine.setCache(`household_assets_${familyId}`, aData);
      } else {
        const cachedA = offlineSyncEngine.getCache<any[]>(`household_assets_${familyId}`);
        if (cachedA) setAssets(cachedA);
      }

      if (gRes && gRes.ok) {
        const gData = (await gRes.json()).groceries || [];
        setGroceries(gData);
        offlineSyncEngine.setCache(`household_groceries_${familyId}`, gData);
      } else {
        const cachedG = offlineSyncEngine.getCache<any[]>(`household_groceries_${familyId}`);
        if (cachedG) setGroceries(cachedG);
      }
    } catch (err) {
      console.warn('Network offline or error fetching household data, loaded from offline cache:', err);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, familyId]);

  useEffect(() => {
    fetchHouseholdData();
  }, [fetchHouseholdData]);

  // ==========================================
  // PDF / PRINT CENTER MODAL STATE
  // ==========================================
  type PrintDocType =
    | 'all_operations'
    | 'meal_plan'
    | 'groceries'
    | 'pantry_inventory'
    | 'chores_board'
    | 'assets_maintenance'
    | 'wardrobe_outfits';

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedPrintDoc, setSelectedPrintDoc] = useState<PrintDocType>('meal_plan');

  const handleTriggerPrint = () => {
    window.print();
  };

  // ==========================================
  // MANAGE INVENTORY LOCATIONS & CATEGORIES MODAL
  // ==========================================
  const [showManageLocationsModal, setShowManageLocationsModal] = useState(false);
  const [newLocationInput, setNewLocationInput] = useState('');
  const [newCategoryInput, setNewCategoryInput] = useState('');

  const handleAddLocation = async () => {
    const loc = newLocationInput.trim();
    if (!loc) return;
    try {
      const res = await fetch(`/api/v1/household/${familyId}/pantry/locations`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ location: loc }),
      });
      if (res.ok) {
        const data = await res.json();
        setPantryLocations(data.locations);
        setNewLocationInput('');
        showFeedback(`Added storage location: "${loc}"`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteLocation = async (loc: string) => {
    try {
      const res = await fetch(`/api/v1/household/${familyId}/pantry/locations/${encodeURIComponent(loc)}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        setPantryLocations(data.locations);
        showFeedback(`Removed storage location: "${loc}"`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCategory = async () => {
    const cat = newCategoryInput.trim();
    if (!cat) return;
    try {
      const res = await fetch(`/api/v1/household/${familyId}/pantry/categories`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ category: cat }),
      });
      if (res.ok) {
        const data = await res.json();
        setPantryCategories(data.categories);
        setNewCategoryInput('');
        showFeedback(`Added inventory category: "${cat.toUpperCase()}"`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCategory = async (cat: string) => {
    try {
      const res = await fetch(`/api/v1/household/${familyId}/pantry/categories/${encodeURIComponent(cat)}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        setPantryCategories(data.categories);
        showFeedback(`Removed inventory category: "${cat}"`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // 1. MEAL PLANNER STATE & HANDLERS
  // ==========================================
  const [showMealModal, setShowMealModal] = useState(false);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [mealDate, setMealDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [mealSlot, setMealSlot] = useState<string>('DINNER');
  const [mealRecipeId, setMealRecipeId] = useState<string>('');
  const [mealCustomTitle, setMealCustomTitle] = useState<string>('');
  const [mealServings, setMealServings] = useState<number>(4);
  const [mealNotes, setMealNotes] = useState<string>('');

  const currentMondayEpoch = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const weekDayDates = useMemo(() => {
    const dates: { dayName: string; epoch: number; iso: string; formatted: string }[] = [];
    const dayMs = 24 * 60 * 60 * 1000;
    for (let i = 0; i < 7; i++) {
      const epoch = currentMondayEpoch + i * dayMs;
      const d = new Date(epoch);
      dates.push({
        dayName: DAYS_OF_WEEK[i],
        epoch,
        iso: d.toISOString().split('T')[0],
        formatted: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      });
    }
    return dates;
  }, [currentMondayEpoch]);

  const handleSaveMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    const planDate = new Date(mealDate).getTime();
    const payload = {
      planDate,
      mealType: mealSlot,
      recipeId: mealRecipeId || undefined,
      customMealTitle: mealCustomTitle || (recipes.find(r => r.id === mealRecipeId)?.title || 'Planned Meal'),
      servings: mealServings,
      notes: mealNotes,
    };

    try {
      if (editingMealId) {
        const res = await fetch(`/api/v1/household/${familyId}/meals/${editingMealId}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          showFeedback('Meal plan updated!');
          setShowMealModal(false);
          fetchHouseholdData();
        }
      } else {
        const res = await fetch(`/api/v1/household/${familyId}/meals`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          showFeedback('New meal added to weekly plan!');
          setShowMealModal(false);
          fetchHouseholdData();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMeal = async (mealId: string) => {
    try {
      const res = await fetch(`/api/v1/household/${familyId}/meals/${mealId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        showFeedback('Meal removed from plan.');
        fetchHouseholdData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAutoFillWeek = async () => {
    try {
      const res = await fetch(`/api/v1/household/${familyId}/meals/batch-schedule-week`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ startEpoch: currentMondayEpoch }),
      });
      if (res.ok) {
        const data = await res.json();
        showFeedback(`Whole week scheduled with ${data.addedCount} balanced family meals!`);
        fetchHouseholdData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSyncMealsToGroceries = async () => {
    try {
      const res = await fetch(`/api/v1/household/${familyId}/workflow/sync-meals-to-groceries`, {
        method: 'POST',
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        showFeedback(`Synced with Smart Groceries: ${data.itemsAddedOrUpdated} items added to shopping list!`);
        fetchHouseholdData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // 2. RECIPES IN FULL STATE & HANDLERS
  // ==========================================
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [recipeTitle, setRecipeTitle] = useState('');
  const [recipeDescription, setRecipeDescription] = useState('');
  const [recipeCategory, setRecipeCategory] = useState('DINNER');
  const [recipePrepTime, setRecipePrepTime] = useState(15);
  const [recipeCookTime, setRecipeCookTime] = useState(30);
  const [recipeServings, setRecipeServings] = useState(4);
  const [recipeDifficulty, setRecipeDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [recipeDietary, setRecipeDietary] = useState('Gluten-Free, Dairy-Free');
  const [recipeIngredientsList, setRecipeIngredientsList] = useState<
    { id: string; itemName: string; quantity: number; unit: string; notes?: string }[]
  >([{ id: '1', itemName: '', quantity: 1, unit: 'item' }]);
  const [recipeInstructionsList, setRecipeInstructionsList] = useState<
    { id: string; stepNumber: number; instructionText: string }[]
  >([{ id: '1', stepNumber: 1, instructionText: '' }]);
  const [recipeServingsScale, setRecipeServingsScale] = useState<Record<string, number>>({});

  const handleOpenAddRecipe = () => {
    setEditingRecipeId(null);
    setRecipeTitle('');
    setRecipeDescription('');
    setRecipeCategory('DINNER');
    setRecipePrepTime(15);
    setRecipeCookTime(30);
    setRecipeServings(4);
    setRecipeDifficulty('MEDIUM');
    setRecipeDietary('Healthy, Fresh');
    setRecipeIngredientsList([
      { id: '1', itemName: 'Olive Oil', quantity: 2, unit: 'tbsp' },
      { id: '2', itemName: 'Garlic Cloves', quantity: 3, unit: 'cloves' },
    ]);
    setRecipeInstructionsList([
      { id: '1', stepNumber: 1, instructionText: 'Prep and measure all fresh ingredients.' },
      { id: '2', stepNumber: 2, instructionText: 'Cook over medium heat until fragrant and tender.' },
    ]);
    setShowRecipeModal(true);
  };

  const handleOpenEditRecipe = (r: any) => {
    setEditingRecipeId(r.id);
    setRecipeTitle(r.title);
    setRecipeDescription(r.description || '');
    setRecipeCategory(r.category || 'DINNER');
    setRecipePrepTime(r.prepTimeMinutes || 15);
    setRecipeCookTime(r.cookTimeMinutes || 30);
    setRecipeServings(r.servings || 4);
    setRecipeDifficulty(r.difficulty || 'MEDIUM');
    setRecipeDietary(r.dietaryNotes || '');
    setRecipeIngredientsList(
      r.ingredients && r.ingredients.length > 0
        ? r.ingredients
        : [{ id: '1', itemName: '', quantity: 1, unit: 'item' }]
    );
    setRecipeInstructionsList(
      r.instructions && r.instructions.length > 0
        ? r.instructions
        : [{ id: '1', stepNumber: 1, instructionText: '' }]
    );
    setShowRecipeModal(true);
  };

  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeTitle.trim()) return;

    const payload = {
      title: recipeTitle,
      description: recipeDescription,
      category: recipeCategory,
      prepTimeMinutes: recipePrepTime,
      cookTimeMinutes: recipeCookTime,
      servings: recipeServings,
      difficulty: recipeDifficulty,
      dietaryNotes: recipeDietary,
      ingredients: recipeIngredientsList.filter(i => i.itemName.trim()),
      instructions: recipeInstructionsList.filter(s => s.instructionText.trim()),
    };

    try {
      if (editingRecipeId) {
        const res = await fetch(`/api/v1/household/${familyId}/recipes/${editingRecipeId}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          showFeedback(`Recipe "${recipeTitle}" updated in full!`);
          setShowRecipeModal(false);
          fetchHouseholdData();
        }
      } else {
        const res = await fetch(`/api/v1/household/${familyId}/recipes`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          showFeedback(`Recipe "${recipeTitle}" created in full with ingredients and steps!`);
          setShowRecipeModal(false);
          fetchHouseholdData();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    try {
      const res = await fetch(`/api/v1/household/${familyId}/recipes/${recipeId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        showFeedback('Recipe archived.');
        fetchHouseholdData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // 3. PANTRY & INVENTORIES LOCATIONS
  // ==========================================
  const [showPantryModal, setShowPantryModal] = useState(false);
  const [editingPantryId, setEditingPantryId] = useState<string | null>(null);
  const [pantryFilterLocation, setPantryFilterLocation] = useState<string>('ALL');
  const [pantryFilterCategory, setPantryFilterCategory] = useState<string>('ALL');
  const [pantryItemName, setPantryItemName] = useState('');
  const [pantryCategory, setPantryCategory] = useState('PANTRY');
  const [pantryLocation, setPantryLocation] = useState('Pantry Shelf 1');
  const [pantryQty, setPantryQty] = useState(1);
  const [pantryUnit, setPantryUnit] = useState('item');
  const [pantryMinThreshold, setPantryMinThreshold] = useState(1);
  const [pantryExpiryDays, setPantryExpiryDays] = useState(14);
  const [pantryNotes, setPantryNotes] = useState('');

  // Inline Add Location & Category toggle
  const [showInlineAddLoc, setShowInlineAddLoc] = useState(false);
  const [inlineLocInput, setInlineLocInput] = useState('');
  const [showInlineAddCat, setShowInlineAddCat] = useState(false);
  const [inlineCatInput, setInlineCatInput] = useState('');

  const handleOpenAddPantry = () => {
    setEditingPantryId(null);
    setPantryItemName('');
    setPantryCategory(pantryCategories[0] || 'PANTRY');
    setPantryLocation(pantryLocations[0] || 'Pantry Shelf 1');
    setPantryQty(2);
    setPantryUnit('item');
    setPantryMinThreshold(1);
    setPantryExpiryDays(14);
    setPantryNotes('');
    setShowInlineAddLoc(false);
    setShowInlineAddCat(false);
    setShowPantryModal(true);
  };

  const handleOpenEditPantry = (item: any) => {
    setEditingPantryId(item.id);
    setPantryItemName(item.itemName);
    setPantryCategory(item.category);
    setPantryLocation(item.storageLocation || pantryLocations[0] || 'Pantry Shelf 1');
    setPantryQty(item.quantity);
    setPantryUnit(item.unit);
    setPantryMinThreshold(item.minThreshold || 1);
    const daysLeft = item.expiryDate ? Math.max(1, Math.round((item.expiryDate - Date.now()) / (24 * 60 * 60 * 1000))) : 14;
    setPantryExpiryDays(daysLeft);
    setPantryNotes(item.notes || '');
    setShowInlineAddLoc(false);
    setShowInlineAddCat(false);
    setShowPantryModal(true);
  };

  const handleSavePantry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pantryItemName.trim()) return;

    let finalLoc = pantryLocation;
    if (showInlineAddLoc && inlineLocInput.trim()) {
      finalLoc = inlineLocInput.trim();
      void fetch(`/api/v1/household/${familyId}/pantry/locations`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ location: finalLoc }),
      });
      if (!pantryLocations.includes(finalLoc)) {
        setPantryLocations([...pantryLocations, finalLoc]);
      }
    }

    let finalCat = pantryCategory;
    if (showInlineAddCat && inlineCatInput.trim()) {
      finalCat = inlineCatInput.trim().toUpperCase();
      void fetch(`/api/v1/household/${familyId}/pantry/categories`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ category: finalCat }),
      });
      if (!pantryCategories.includes(finalCat)) {
        setPantryCategories([...pantryCategories, finalCat]);
      }
    }

    const expiryDate = Date.now() + pantryExpiryDays * 24 * 60 * 60 * 1000;
    const payload = {
      itemName: pantryItemName,
      category: finalCat,
      storageLocation: finalLoc,
      quantity: pantryQty,
      unit: pantryUnit,
      minThreshold: pantryMinThreshold,
      expiryDate,
      notes: pantryNotes,
    };

    try {
      if (editingPantryId) {
        const res = await fetch(`/api/v1/household/${familyId}/pantry/${editingPantryId}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          showFeedback(`Pantry item "${pantryItemName}" updated.`);
          setShowPantryModal(false);
          fetchHouseholdData();
        }
      } else {
        const res = await fetch(`/api/v1/household/${familyId}/pantry`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          showFeedback(`Added "${pantryItemName}" to inventory at ${finalLoc}.`);
          setShowPantryModal(false);
          fetchHouseholdData();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConsumePantry = async (itemId: string, amt = 1) => {
    try {
      const res = await fetch(`/api/v1/household/${familyId}/pantry/${itemId}/consume`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ amount: amt }),
      });
      if (res.ok) {
        const data = await res.json();
        showFeedback(data.pantryItem.isLowStock ? 'Consumed! Alert: Low stock threshold reached.' : 'Item consumed from stock.');
        fetchHouseholdData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestockPantry = async (itemId: string, amt = 1) => {
    try {
      const res = await fetch(`/api/v1/household/${familyId}/pantry/${itemId}/restock`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ amount: amt }),
      });
      if (res.ok) {
        showFeedback(`Stock replenished (+${amt}).`);
        fetchHouseholdData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePantry = async (itemId: string) => {
    try {
      const res = await fetch(`/api/v1/household/${familyId}/pantry/${itemId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        showFeedback('Item removed from inventory.');
        fetchHouseholdData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSyncLowStock = async () => {
    try {
      const res = await fetch(`/api/v1/household/${familyId}/workflow/sync-pantry-low-stock-to-groceries`, {
        method: 'POST',
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        showFeedback(`Pantry low-stock queued: ${data.addedLowStockCount} items added to Smart Grocery List!`);
        fetchHouseholdData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredPantry = useMemo(() => {
    return pantry.filter((p) => {
      const matchesLoc =
        pantryFilterLocation === 'ALL' ||
        (p.storageLocation && p.storageLocation.toLowerCase().includes(pantryFilterLocation.toLowerCase()));
      const matchesCat =
        pantryFilterCategory === 'ALL' ||
        p.category === pantryFilterCategory;
      return matchesLoc && matchesCat;
    });
  }, [pantry, pantryFilterLocation, pantryFilterCategory]);

  // ==========================================
  // 4. SMART GROCERY LISTS
  // ==========================================
  const [showGroceryModal, setShowGroceryModal] = useState(false);
  const [editingGroceryId, setEditingGroceryId] = useState<string | null>(null);
  const [groceryName, setGroceryName] = useState('');
  const [groceryCategory, setGroceryCategory] = useState('PRODUCE');
  const [groceryQuantity, setGroceryQuantity] = useState(1);
  const [groceryUnit, setGroceryUnit] = useState('item');

  const handleOpenAddGrocery = () => {
    setEditingGroceryId(null);
    setGroceryName('');
    setGroceryCategory('PRODUCE');
    setGroceryQuantity(1);
    setGroceryUnit('item');
    setShowGroceryModal(true);
  };

  const handleOpenEditGrocery = (g: any) => {
    setEditingGroceryId(g.id);
    setGroceryName(g.itemName);
    setGroceryCategory(g.category || 'PANTRY');
    setGroceryQuantity(g.quantity || 1);
    setGroceryUnit(g.unit || 'item');
    setShowGroceryModal(true);
  };

  const handleSaveGrocery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groceryName.trim()) return;

    const payload = {
      itemName: groceryName,
      category: groceryCategory,
      quantity: groceryQuantity,
      unit: groceryUnit,
    };

    try {
      if (editingGroceryId) {
        const res = await fetch(`/api/v1/household/${familyId}/groceries/${editingGroceryId}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          showFeedback(`Grocery item "${groceryName}" updated.`);
          setShowGroceryModal(false);
          fetchHouseholdData();
        }
      } else {
        const res = await fetch(`/api/v1/household/${familyId}/groceries`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          showFeedback(`Added "${groceryName}" to grocery list.`);
          setShowGroceryModal(false);
          fetchHouseholdData();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePurchaseGrocery = async (groceryId: string) => {
    try {
      const res = await fetch(`/api/v1/household/${familyId}/groceries/${groceryId}/purchase`, {
        method: 'POST',
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        showFeedback(`Purchased ${data.groceryItem.itemName}! Pantry inventory auto-restocked (+${data.groceryItem.quantity} ${data.groceryItem.unit}).`);
        fetchHouseholdData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGrocery = async (groceryId: string) => {
    try {
      const res = await fetch(`/api/v1/household/${familyId}/groceries/${groceryId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        showFeedback('Grocery item removed.');
        fetchHouseholdData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearPurchasedGroceries = async () => {
    try {
      const res = await fetch(`/api/v1/household/${familyId}/groceries/clear-purchased`, {
        method: 'POST',
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        showFeedback(`Cleared ${data.clearedCount} completed items from grocery list.`);
        fetchHouseholdData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // 5. CHORES, LOCATIONS & CHECKLISTS
  // ==========================================
  const [showChoreModal, setShowChoreModal] = useState(false);
  const [editingChoreId, setEditingChoreId] = useState<string | null>(null);
  const [choreZoneFilter, setChoreZoneFilter] = useState('ALL');
  const [choreTitle, setChoreTitle] = useState('');
  const [choreDescription, setChoreDescription] = useState('');
  const [choreZone, setChoreZone] = useState('KITCHEN');
  const [choreLocation, setChoreLocation] = useState('Kitchen Island & Sink');
  const [choreFrequency, setChoreFrequency] = useState('DAILY');
  const [chorePoints, setChorePoints] = useState(15);
  const [choreAssigned, setChoreAssigned] = useState('mem-maya-child');
  const [choreChecklist, setChoreChecklist] = useState<{ id: string; text: string; isDone: boolean }[]>([
    { id: '1', text: 'Clear surfaces', isDone: false },
    { id: '2', text: 'Sanitize & wipe down', isDone: false },
  ]);

  const handleOpenAddChore = () => {
    setEditingChoreId(null);
    setChoreTitle('');
    setChoreDescription('');
    setChoreZone('KITCHEN');
    setChoreLocation('Kitchen & Dining Area');
    setChoreFrequency('DAILY');
    setChorePoints(15);
    setChoreAssigned('mem-maya-child');
    setChoreChecklist([
      { id: '1', text: 'Clear countertops & sink', isDone: false },
      { id: '2', text: 'Run dishwasher', isDone: false },
      { id: '3', text: 'Take out trash & recycling', isDone: false },
    ]);
    setShowChoreModal(true);
  };

  const handleOpenEditChore = (c: any) => {
    setEditingChoreId(c.id);
    setChoreTitle(c.title);
    setChoreDescription(c.description || '');
    setChoreZone(c.zone || 'KITCHEN');
    setChoreLocation(c.location || 'Household');
    setChoreFrequency(c.frequency || 'DAILY');
    setChorePoints(c.rewardPoints || 10);
    setChoreAssigned(c.assignedMemberId || 'mem-sarah');
    setChoreChecklist(
      c.checklist && c.checklist.length > 0
        ? c.checklist
        : [{ id: '1', text: 'Complete standard inspection', isDone: false }]
    );
    setShowChoreModal(true);
  };

  const handleSaveChore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!choreTitle.trim()) return;

    const payload = {
      title: choreTitle,
      description: choreDescription,
      zone: choreZone,
      location: choreLocation,
      frequency: choreFrequency,
      rewardPoints: chorePoints,
      assignedMemberId: choreAssigned,
      checklist: choreChecklist.filter(c => c.text.trim()),
    };

    try {
      if (editingChoreId) {
        const res = await fetch(`/api/v1/household/${familyId}/chores/${editingChoreId}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          showFeedback(`Chore "${choreTitle}" updated!`);
          setShowChoreModal(false);
          fetchHouseholdData();
        }
      } else {
        const res = await fetch(`/api/v1/household/${familyId}/chores`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          showFeedback(`New chore "${choreTitle}" created with checklist!`);
          setShowChoreModal(false);
          fetchHouseholdData();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleChoreChecklistItem = async (chore: any, stepId: string) => {
    const updatedChecklist = (chore.checklist || []).map((step: any) =>
      step.id === stepId ? { ...step, isDone: !step.isDone } : step
    );

    try {
      const res = await fetch(`/api/v1/household/${familyId}/chores/${chore.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ checklist: updatedChecklist }),
      });
      if (res.ok) {
        setChores(prev =>
          prev.map(c => (c.id === chore.id ? { ...c, checklist: updatedChecklist } : c))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteChore = async (choreId: string) => {
    try {
      const res = await fetch(`/api/v1/household/${familyId}/chores/${choreId}/complete`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ memberId: 'mem-maya-child' }),
      });
      if (res.ok) {
        const data = await res.json();
        showFeedback(`Chore completed! Awarded +${data.completionRecord.pointsEarned} family points.`);
        fetchHouseholdData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteChore = async (choreId: string) => {
    try {
      const res = await fetch(`/api/v1/household/${familyId}/chores/${choreId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        showFeedback('Chore removed.');
        fetchHouseholdData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredChores = useMemo(() => {
    if (choreZoneFilter === 'ALL') return chores;
    return chores.filter(c => c.zone === choreZoneFilter || (c.location && c.location.toLowerCase().includes(choreZoneFilter.toLowerCase())));
  }, [chores, choreZoneFilter]);

  // ==========================================
  // 6. WARDROBE, SEASONS & LAUNDRY HAMPER
  // ==========================================
  const [showWardrobeModal, setShowWardrobeModal] = useState(false);
  const [showOutfitModal, setShowOutfitModal] = useState(false);
  const [wardrobeSeasonFilter, setWardrobeSeasonFilter] = useState('ALL');
  const [wardrobeName, setWardrobeName] = useState('');
  const [wardrobeCategory, setWardrobeCategory] = useState('TOPS');
  const [wardrobeMember, setWardrobeMember] = useState('mem-maya-child');
  const [wardrobeColor, setWardrobeColor] = useState('Blue');
  const [wardrobeSeason, setWardrobeSeason] = useState('ALL_SEASON');

  const [outfitDate, setOutfitDate] = useState(new Date().toISOString().split('T')[0]);
  const [outfitName, setOutfitName] = useState('');
  const [outfitMember, setOutfitMember] = useState('mem-maya-child');
  const [outfitOccasion, setOutfitOccasion] = useState('SCHOOL');
  const [outfitItemIds, setOutfitItemIds] = useState<string[]>([]);
  const [outfitNotes, setOutfitNotes] = useState('');

  const handleSaveWardrobeItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wardrobeName.trim()) return;

    const payload = {
      memberId: wardrobeMember,
      itemName: wardrobeName,
      category: wardrobeCategory,
      color: wardrobeColor,
      season: wardrobeSeason,
      isClean: true,
    };

    try {
      const res = await fetch(`/api/v1/household/${familyId}/wardrobe`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showFeedback(`Added "${wardrobeName}" to wardrobe.`);
        setShowWardrobeModal(false);
        setWardrobeName('');
        fetchHouseholdData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleLaundry = async (item: any) => {
    try {
      const res = await fetch(`/api/v1/household/${familyId}/wardrobe/${item.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ isClean: !item.isClean }),
      });
      if (res.ok) {
        showFeedback(`${item.itemName} marked as ${!item.isClean ? 'Clean' : 'Needs Laundry'}.`);
        fetchHouseholdData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunLaundryCycle = async () => {
    try {
      const res = await fetch(`/api/v1/household/${familyId}/wardrobe/laundry-cycle`, {
        method: 'POST',
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        showFeedback(`🧺 Laundry cycle completed! ${data.cleanedCount} items washed and marked clean!`);
        fetchHouseholdData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteWardrobeItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/v1/household/${familyId}/wardrobe/${itemId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        showFeedback('Wardrobe item removed.');
        fetchHouseholdData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveOutfit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outfitName.trim()) return;

    const payload = {
      memberId: outfitMember,
      planDate: outfitDate,
      outfitName,
      occasion: outfitOccasion,
      itemIds: outfitItemIds,
      notes: outfitNotes,
    };

    try {
      const res = await fetch(`/api/v1/household/${familyId}/outfits`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showFeedback(`Planned outfit "${outfitName}" scheduled for ${outfitDate}!`);
        setShowOutfitModal(false);
        setOutfitName('');
        setOutfitItemIds([]);
        fetchHouseholdData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteOutfit = async (outfitId: string) => {
    try {
      const res = await fetch(`/api/v1/household/${familyId}/outfits/${outfitId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        showFeedback('Outfit plan removed.');
        fetchHouseholdData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredWardrobe = useMemo(() => {
    if (wardrobeSeasonFilter === 'ALL') return wardrobe;
    return wardrobe.filter(w => w.season === wardrobeSeasonFilter || w.season === 'ALL_SEASON');
  }, [wardrobe, wardrobeSeasonFilter]);

  const laundryHamperItems = useMemo(() => {
    return wardrobe.filter(w => !w.isClean);
  }, [wardrobe]);

  // ==========================================
  // 7. HOME ASSETS & MAINTENANCE SYSTEM
  // ==========================================
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [selectedAssetForMaint, setSelectedAssetForMaint] = useState<any | null>(null);
  const [assetName, setAssetName] = useState('');
  const [assetCategory, setAssetCategory] = useState('HVAC');
  const [assetDescription, setAssetDescription] = useState('');
  const [assetPrice, setAssetPrice] = useState(1500);
  const [assetLocation, setAssetLocation] = useState('Basement');
  const [assetWarrantyMonths, setAssetWarrantyMonths] = useState(36);
  const [assetMaintFreqMonths, setAssetMaintFreqMonths] = useState(6);

  const [maintPerformedBy, setMaintPerformedBy] = useState('Precision Air Tech');
  const [maintCost, setMaintCost] = useState(120);
  const [maintNotes, setMaintNotes] = useState('Replaced filters, checked refrigerant pressure, cleaned coils.');
  const [maintNextMonths, setMaintNextMonths] = useState(6);

  const handleOpenAddAsset = () => {
    setAssetName('');
    setAssetCategory('HVAC');
    setAssetDescription('High-Efficiency Heating & Air Conditioning Unit');
    setAssetPrice(3200);
    setAssetLocation('Basement / Exterior');
    setAssetWarrantyMonths(60);
    setAssetMaintFreqMonths(6);
    setShowAssetModal(true);
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName.trim()) return;

    const warrantyExpiration = Date.now() + assetWarrantyMonths * 30 * 24 * 60 * 60 * 1000;
    const payload = {
      name: assetName,
      category: assetCategory,
      description: assetDescription,
      purchasePriceCents: Math.round(assetPrice * 100),
      location: assetLocation,
      warrantyExpiration,
      maintenanceFrequencyMonths: assetMaintFreqMonths,
    };

    try {
      const res = await fetch(`/api/v1/household/${familyId}/assets`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showFeedback(`Added "${assetName}" to home asset registry!`);
        setShowAssetModal(false);
        fetchHouseholdData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenMaintenanceModal = (asset: any) => {
    setSelectedAssetForMaint(asset);
    setMaintPerformedBy('Home Technician');
    setMaintCost(85);
    setMaintNotes('Routine inspection, safety test, and cleaning complete.');
    setMaintNextMonths(asset.maintenanceFrequencyMonths || 6);
    setShowMaintenanceModal(true);
  };

  const handleSaveMaintenanceRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetForMaint) return;

    const nextDueDate = Date.now() + maintNextMonths * 30 * 24 * 60 * 60 * 1000;
    const payload = {
      performedBy: maintPerformedBy,
      costCents: Math.round(maintCost * 100),
      notes: maintNotes,
      nextDueDate,
    };

    try {
      const res = await fetch(`/api/v1/household/${familyId}/assets/${selectedAssetForMaint.id}/maintenance`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showFeedback(`Maintenance recorded for ${selectedAssetForMaint.name}! Next service scheduled.`);
        setShowMaintenanceModal(false);
        fetchHouseholdData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    try {
      const res = await fetch(`/api/v1/household/${familyId}/assets/${assetId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        showFeedback('Home asset removed.');
        fetchHouseholdData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-3xl p-6 sm:p-8 border shadow-xs relative overflow-hidden bg-white" style={{ borderColor: BRAND.border }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase tracking-widest font-bold px-3 py-1 rounded-full" style={{ backgroundColor: BRAND.gold, color: '#173D35' }}>
                Household Operations System
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                100% Authoritative & Synced
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 mt-2">
              Household Operations & Stewardship
            </h2>
            <p className="text-sm text-stone-600 mt-1 max-w-3xl">
              Complete management across 7-day meal plans, recipe catalog, pantry stock with custom locations & categories, smart grocery lists, chores with checklists, seasonal wardrobe & laundry, and home assets with maintenance scheduling.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowPrintModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#173D35] bg-[#E7D1AA] hover:bg-[#C39A60] transition cursor-pointer shadow-xs"
              title="Generate printable sheets and export to PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Operations PDF</span>
            </button>
            <button
              onClick={fetchHouseholdData}
              disabled={loading}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-medium flex items-center space-x-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 mt-6 border-t pt-4" style={{ borderColor: BRAND.border }}>
          {[
            { id: 'meals', label: 'Whole Week Meal Plan', icon: Utensils, count: meals.length },
            { id: 'recipes', label: 'Full Recipes & Scaler', icon: BookOpen, count: recipes.length },
            { id: 'pantry', label: 'Inventories & Locations', icon: Package, count: pantry.length },
            { id: 'groceries', label: 'Smart Grocery List', icon: ShoppingCart, count: groceries.filter(g => !g.isPurchased).length },
            { id: 'chores', label: 'Chores & Checklists', icon: CheckSquare, count: chores.length },
            { id: 'wardrobe', label: 'Outfits, Seasons & Laundry', icon: Shirt, count: wardrobe.length },
            { id: 'assets', label: 'Assets & Maintenance', icon: Wrench, count: assets.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = subTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleSelectSubTab(tab.id as HouseholdSubTab)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isCurrent
                    ? 'shadow-xs text-white'
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
                style={{
                  backgroundColor: isCurrent ? BRAND.primary : undefined,
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isCurrent ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. RECIPE PLAN FOR THE WHOLE WEEK */}
      {/* ========================================================================= */}
      {subTab === 'meals' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border" style={{ borderColor: BRAND.border }}>
            <div>
              <h3 className="font-bold text-stone-900 text-lg">7-Day Recipe Schedule (Monday – Sunday)</h3>
              <p className="text-xs text-stone-600">Plan breakfast, lunch, dinner, and snacks for each day of the week, with direct grocery generation.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleAutoFillWeek}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#E7D1AA] text-[#173D35] hover:bg-[#C39A60] transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#173D35]" />
                <span>Quick-Schedule Week</span>
              </button>
              <button
                onClick={handleSyncMealsToGroceries}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition cursor-pointer"
                style={{ backgroundColor: BRAND.primary }}
              >
                <ShoppingCart className="w-3.5 h-3.5 text-amber-300" />
                <span>Auto-Generate Groceries</span>
              </button>
              <button
                onClick={() => {
                  setEditingMealId(null);
                  setMealDate(new Date().toISOString().split('T')[0]);
                  setMealSlot('DINNER');
                  setMealRecipeId(recipes[0]?.id || '');
                  setMealCustomTitle('');
                  setMealServings(4);
                  setMealNotes('');
                  setShowMealModal(true);
                }}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-stone-900 text-white hover:bg-black transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Scheduled Meal</span>
              </button>
            </div>
          </div>

          {/* 7-Day Calendar Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
            {weekDayDates.map((day) => {
              const dayMeals = meals.filter(m => {
                const mealDateStr = new Date(m.planDate).toISOString().split('T')[0];
                return mealDateStr === day.iso;
              });

              return (
                <div
                  key={day.dayName}
                  className="bg-white rounded-2xl border p-3 flex flex-col justify-between min-h-[260px] shadow-xs"
                  style={{ borderColor: BRAND.border }}
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                      <div>
                        <span className="font-serif font-bold text-stone-900 text-sm block">{day.dayName}</span>
                        <span className="text-[10px] text-stone-500 font-semibold">{day.formatted}</span>
                      </div>
                      <button
                        onClick={() => {
                          setEditingMealId(null);
                          setMealDate(day.iso);
                          setMealSlot('DINNER');
                          setMealRecipeId(recipes[0]?.id || '');
                          setMealCustomTitle('');
                          setMealServings(4);
                          setMealNotes('');
                          setShowMealModal(true);
                        }}
                        className="p-1 rounded-lg bg-stone-100 hover:bg-[#173D35] hover:text-white text-stone-600 transition"
                        title="Add meal to this day"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="mt-2.5 space-y-2">
                      {dayMeals.length === 0 ? (
                        <div className="text-center py-6">
                          <Utensils className="w-5 h-5 text-stone-300 mx-auto mb-1" />
                          <span className="text-[11px] text-stone-400 italic">No meals scheduled</span>
                        </div>
                      ) : (
                        dayMeals.map((m) => {
                          const recipe = recipes.find(r => r.id === m.recipeId);
                          const title = m.customMealTitle || recipe?.title || 'Scheduled Meal';
                          return (
                            <div
                              key={m.id}
                              className="p-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 transition group relative"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-900">
                                  {m.mealType}
                                </span>
                                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => {
                                      setEditingMealId(m.id);
                                      setMealDate(day.iso);
                                      setMealSlot(m.mealType);
                                      setMealRecipeId(m.recipeId || '');
                                      setMealCustomTitle(m.customMealTitle || '');
                                      setMealServings(m.servings || 4);
                                      setMealNotes(m.notes || '');
                                      setShowMealModal(true);
                                    }}
                                    className="p-1 hover:text-stone-900 text-stone-400"
                                    title="Edit meal"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMeal(m.id)}
                                    className="p-1 hover:text-red-600 text-stone-400"
                                    title="Remove meal"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <h5 className="font-bold text-stone-900 text-xs mt-1 line-clamp-1">{title}</h5>
                              <div className="flex items-center justify-between text-[10px] text-stone-500 mt-1">
                                <span>👥 {m.servings} Servings</span>
                                {recipe && <span>⏱️ {recipe.prepTimeMinutes + recipe.cookTimeMinutes}m</span>}
                              </div>
                              {m.notes && <p className="text-[10px] text-stone-500 italic mt-0.5 truncate">"{m.notes}"</p>}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setEditingMealId(null);
                      setMealDate(day.iso);
                      setMealSlot('DINNER');
                      setShowMealModal(true);
                    }}
                    className="w-full mt-2 py-1.5 text-center text-[11px] font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-50 rounded-xl transition border border-dashed border-stone-200"
                  >
                    + Plan
                  </button>
                </div>
              );
            })}
          </div>

          {/* All Scheduled Meals Cards Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-stone-200">
            {meals.map((meal) => {
              const dateStr = new Date(meal.planDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              const recipe = recipes.find(r => r.id === meal.recipeId);
              const mealTitle = meal.customMealTitle || recipe?.title || 'Scheduled Meal';

              return (
                <div key={meal.id} className="bg-white p-5 rounded-3xl border shadow-xs flex flex-col justify-between" style={{ borderColor: BRAND.border }}>
                  <div>
                    <VisualCardHeader
                      itemId={meal.id}
                      title={mealTitle}
                      description={meal.notes || recipe?.description}
                      category={meal.mealType}
                      imageUrl={itemImages[meal.id]}
                      onPhotoUpload={handlePhotoUpload}
                      onGenerateAi={handleGenerateAiVisual}
                      isGenerating={generatingAiMap[meal.id]}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                        {dateStr}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {meal.mealType}
                      </span>
                    </div>
                    <h4 className="font-serif font-bold text-stone-900 text-base mt-2">{mealTitle}</h4>
                    {recipe && (
                      <div className="text-xs text-stone-600 mt-1 flex items-center space-x-2">
                        <span>⏱️ {recipe.prepTimeMinutes + recipe.cookTimeMinutes} mins</span>
                        <span>•</span>
                        <span>👥 {meal.servings} Servings</span>
                      </div>
                    )}
                    {meal.notes && <p className="text-xs text-stone-500 italic mt-2">"{meal.notes}"</p>}
                  </div>

                  <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: BRAND.border }}>
                    <span className="text-stone-500">Recipe: {recipe ? '✅ Linked' : 'Custom'}</span>
                    <button
                      onClick={() => handleDeleteMeal(meal.id)}
                      className="text-stone-400 hover:text-red-600 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. FULL RECIPES BUILDER & SCALER */}
      {/* ========================================================================= */}
      {subTab === 'recipes' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3" style={{ borderColor: BRAND.border }}>
            <div>
              <h3 className="font-bold text-stone-900 text-lg">Family Recipe Catalog & Dynamic Scaler</h3>
              <p className="text-xs text-stone-600">Create full recipes with complete ingredient quantities, units, and numbered instructions.</p>
            </div>
            <button
              onClick={handleOpenAddRecipe}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition cursor-pointer"
              style={{ backgroundColor: BRAND.primary }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Recipe in Full</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {recipes.map((recipe) => {
              const currentScale = recipeServingsScale[recipe.id] || recipe.servings;
              const scaleFactor = currentScale / (recipe.servings || 1);

              return (
                <div key={recipe.id} className="bg-white p-6 rounded-3xl border shadow-xs space-y-4" style={{ borderColor: BRAND.border }}>
                  <VisualCardHeader
                    itemId={recipe.id}
                    title={recipe.title}
                    description={recipe.description}
                    category={recipe.category}
                    imageUrl={itemImages[recipe.id]}
                    onPhotoUpload={handlePhotoUpload}
                    onGenerateAi={handleGenerateAiVisual}
                    isGenerating={generatingAiMap[recipe.id]}
                  />

                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-800">
                          {recipe.category}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800">
                          ⭐ {recipe.familyRating || 5}/5
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                          {recipe.difficulty}
                        </span>
                      </div>
                      <h4 className="font-serif font-bold text-stone-900 text-xl mt-1">{recipe.title}</h4>
                      <p className="text-xs text-stone-600 mt-1">{recipe.description}</p>
                      {recipe.dietaryNotes && (
                        <span className="inline-block mt-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                          🥗 {recipe.dietaryNotes}
                        </span>
                      )}
                    </div>

                    {/* Servings Adjuster */}
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[11px] font-bold text-stone-500 uppercase">Scale Servings</span>
                      <div className="flex items-center space-x-1.5 mt-1 bg-stone-100 p-1 rounded-xl">
                        <button
                          onClick={() => setRecipeServingsScale({ ...recipeServingsScale, [recipe.id]: Math.max(1, currentScale - 1) })}
                          className="w-6 h-6 rounded-lg bg-white font-bold text-stone-700 hover:bg-stone-200 flex items-center justify-center text-xs"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold px-1.5">{currentScale}</span>
                        <button
                          onClick={() => setRecipeServingsScale({ ...recipeServingsScale, [recipe.id]: currentScale + 1 })}
                          className="w-6 h-6 rounded-lg bg-white font-bold text-stone-700 hover:bg-stone-200 flex items-center justify-center text-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Scaled Ingredients */}
                  <div className="bg-stone-50 p-4 rounded-2xl border" style={{ borderColor: BRAND.border }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">Required Ingredients</span>
                      <span className="text-[11px] text-stone-500">Scaled for {currentScale} servings</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {(recipe.ingredients || []).map((ing: any) => {
                        const scaledQty = (ing.quantity * scaleFactor).toFixed(1).replace(/\.0$/, '');
                        return (
                          <div key={ing.id} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-stone-200">
                            <span className="text-stone-800">{ing.itemName}</span>
                            <span className="font-bold text-emerald-900">{scaledQty} {ing.unit}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Numbered Steps */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">Cooking Instructions</span>
                    {(recipe.instructions || []).map((ins: any) => (
                      <div key={ins.id} className="flex items-start space-x-2 text-xs text-stone-700">
                        <span className="font-bold text-stone-900 shrink-0">{ins.stepNumber}.</span>
                        <span>{ins.instructionText}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: BRAND.border }}>
                    <span className="text-stone-500">⏱️ Prep: {recipe.prepTimeMinutes}m • Cook: {recipe.cookTimeMinutes}m</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleOpenEditRecipe(recipe)}
                        className="px-3 py-1 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold"
                      >
                        Edit Recipe
                      </button>
                      <button
                        onClick={() => handleDeleteRecipe(recipe.id)}
                        className="p-1.5 text-stone-400 hover:text-red-600"
                        title="Delete recipe"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. INVENTORIES & LOCATIONS (PANTRY, FRIDGE, FREEZER, CELLAR) */}
      {/* ========================================================================= */}
      {subTab === 'pantry' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border" style={{ borderColor: BRAND.border }}>
            <div>
              <h3 className="font-bold text-stone-900 text-lg">Inventory Tracking by Storage Location & Category</h3>
              <p className="text-xs text-stone-600">Add custom storage locations and categories, monitor stock quantities, track expiry dates, and restock automatically.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowManageLocationsModal(true)}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-800 transition cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-stone-600" />
                <span>Manage Locations & Categories</span>
              </button>
              <button
                onClick={handleSyncLowStock}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Queue Low Stock to Grocery</span>
              </button>
              <button
                onClick={handleOpenAddPantry}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition cursor-pointer"
                style={{ backgroundColor: BRAND.primary }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Inventory Item</span>
              </button>
            </div>
          </div>

          {/* Location & Category Filter Controls */}
          <div className="space-y-2 bg-white p-4 rounded-2xl border" style={{ borderColor: BRAND.border }}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider mr-1 flex items-center space-x-1">
                <MapPin className="w-3 h-3 text-stone-400" />
                <span>Location:</span>
              </span>
              <button
                onClick={() => setPantryFilterLocation('ALL')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  pantryFilterLocation === 'ALL'
                    ? 'bg-[#173D35] text-white shadow-xs'
                    : 'bg-stone-50 text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                All Locations
              </button>
              {pantryLocations.map((loc) => (
                <button
                  key={loc}
                  onClick={() => setPantryFilterLocation(loc)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    pantryFilterLocation === loc
                      ? 'bg-[#173D35] text-white shadow-xs'
                      : 'bg-stone-50 text-stone-700 hover:bg-stone-100 border border-stone-200'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider mr-1 flex items-center space-x-1">
                <Tag className="w-3 h-3 text-stone-400" />
                <span>Category:</span>
              </span>
              <button
                onClick={() => setPantryFilterCategory('ALL')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  pantryFilterCategory === 'ALL'
                    ? 'bg-[#C39A60] text-[#173D35] font-bold shadow-xs'
                    : 'bg-stone-50 text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                All Categories
              </button>
              {pantryCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setPantryFilterCategory(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    pantryFilterCategory === cat
                      ? 'bg-[#C39A60] text-[#173D35] font-bold shadow-xs'
                      : 'bg-stone-50 text-stone-700 hover:bg-stone-100 border border-stone-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Inventory Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPantry.map((item) => {
              const isExpired = item.expiryStatus === 'EXPIRED';
              const isExpiringSoon = item.expiryStatus === 'EXPIRING_SOON';
              const expiryDateStr = item.expiryDate
                ? new Date(item.expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'No Expiry Set';

              return (
                <div key={item.id} className="bg-white p-5 rounded-3xl border shadow-xs flex flex-col justify-between" style={{ borderColor: BRAND.border }}>
                  <div>
                    <VisualCardHeader
                      itemId={item.id}
                      title={item.itemName}
                      description={`Location: ${item.storageLocation || item.category}. Stock: ${item.quantity} ${item.unit}.`}
                      category={item.category}
                      imageUrl={itemImages[item.id]}
                      onPhotoUpload={handlePhotoUpload}
                      onGenerateAi={handleGenerateAiVisual}
                      isGenerating={generatingAiMap[item.id]}
                    />

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-stone-500" />
                        <span>{item.storageLocation || 'Main Pantry'}</span>
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                        {item.category}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <h4 className="font-serif font-bold text-stone-900 text-lg">{item.itemName}</h4>
                      {isExpired && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300">
                          🚨 EXPIRED
                        </span>
                      )}
                      {isExpiringSoon && !isExpired && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                          ⚠️ EXPIRING SOON
                        </span>
                      )}
                      {!isExpired && !isExpiringSoon && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800">
                          Fresh
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-stone-600 mt-1 flex items-center space-x-2">
                      <span>Expires: <strong>{expiryDateStr}</strong></span>
                    </div>

                    {item.isLowStock && (
                      <div className="mt-2 text-xs font-semibold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        ⚠️ Low Stock Warning: At or below min threshold of {item.minThreshold} {item.unit}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t flex items-center justify-between" style={{ borderColor: BRAND.border }}>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-xl font-bold text-stone-900">{item.quantity}</span>
                      <span className="text-xs text-stone-500 font-medium">{item.unit}</span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleConsumePantry(item.id, 1)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800"
                        title="Consume 1 unit"
                      >
                        -1 Consume
                      </button>
                      <button
                        onClick={() => handleRestockPantry(item.id, 1)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200"
                        title="Restock 1 unit"
                      >
                        +1 Restock
                      </button>
                      <button
                        onClick={() => handleOpenEditPantry(item)}
                        className="p-1 text-stone-400 hover:text-stone-800"
                        title="Edit inventory item"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePantry(item.id)}
                        className="p-1 text-stone-400 hover:text-red-600"
                        title="Delete inventory item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SMART GROCERY LIST */}
      {/* ========================================================================= */}
      {subTab === 'groceries' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border" style={{ borderColor: BRAND.border }}>
            <div>
              <h3 className="font-bold text-stone-900 text-lg">Smart Household Shopping List</h3>
              <p className="text-xs text-stone-600">Auto-aggregated from 7-day meal plan ingredient requirements and low-stock pantry triggers.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSyncMealsToGroceries}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#E7D1AA] text-[#173D35] hover:bg-[#C39A60] transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Sync from Meal Plan</span>
              </button>
              <button
                onClick={handleClearPurchasedGroceries}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
              >
                <span>Clear Purchased</span>
              </button>
              <button
                onClick={handleOpenAddGrocery}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition cursor-pointer"
                style={{ backgroundColor: BRAND.primary }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Grocery Item</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {groceries.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition flex items-center justify-between ${
                  item.isPurchased ? 'bg-stone-50 opacity-60' : 'bg-white shadow-xs'
                }`}
                style={{ borderColor: BRAND.border }}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <button
                    onClick={() => handlePurchaseGrocery(item.id)}
                    disabled={item.isPurchased}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition shrink-0 cursor-pointer ${
                      item.isPurchased ? 'bg-emerald-600 text-white' : 'border border-stone-300 hover:border-emerald-600'
                    }`}
                    title={item.isPurchased ? 'Purchased & restocked' : 'Mark purchased & restock inventory'}
                  >
                    {item.isPurchased && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                  <div className="min-w-0">
                    <h5 className={`font-bold text-sm text-stone-900 truncate ${item.isPurchased ? 'line-through text-stone-500' : ''}`}>
                      {item.itemName}
                    </h5>
                    <span className="text-xs text-stone-500">
                      {item.quantity} {item.unit} • <span className="font-semibold text-stone-600">{item.category}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {!item.isPurchased && (
                    <button
                      onClick={() => handlePurchaseGrocery(item.id)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
                    >
                      <span>Restock Pantry</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenEditGrocery(item)}
                    className="p-1 text-stone-400 hover:text-stone-800"
                    title="Edit grocery item"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteGrocery(item.id)}
                    className="p-1 text-stone-400 hover:text-red-600"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. CHORES LOCATIONS & CHECKLISTS */}
      {/* ========================================================================= */}
      {subTab === 'chores' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3" style={{ borderColor: BRAND.border }}>
            <div>
              <h3 className="font-bold text-stone-900 text-lg">Household Chores, Locations & Checklists</h3>
              <p className="text-xs text-stone-600">Track multi-step chore completion across home zones with point reward incentives.</p>
            </div>
            <button
              onClick={handleOpenAddChore}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition cursor-pointer"
              style={{ backgroundColor: BRAND.primary }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Chore with Checklist</span>
            </button>
          </div>

          {/* Zone Location Filter */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'ALL', label: 'All Zones' },
              { id: 'KITCHEN', label: '🍳 Kitchen & Dining' },
              { id: 'LIVING_ROOM', label: '🛋️ Living Room' },
              { id: 'BEDROOMS', label: '🛏️ Bedrooms' },
              { id: 'BATHROOMS', label: '🚿 Bathrooms' },
              { id: 'OUTDOORS', label: '🌿 Yard & Garden' },
            ].map((z) => (
              <button
                key={z.id}
                onClick={() => setChoreZoneFilter(z.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  choreZoneFilter === z.id
                    ? 'bg-[#173D35] text-white shadow-xs'
                    : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                {z.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredChores.map((chore) => {
              const dueStr = new Date(chore.nextDueDate).toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
              const assignedName = FAMILY_MEMBERS.find(m => m.id === chore.assignedMemberId)?.name || chore.assignedMemberId || 'Anyone';
              const checklist = chore.checklist || [];
              const completedCount = checklist.filter((s: any) => s.isDone).length;
              const totalCount = checklist.length;

              return (
                <div key={chore.id} className="bg-white p-5 rounded-3xl border shadow-xs space-y-3 flex flex-col justify-between" style={{ borderColor: BRAND.border }}>
                  <div>
                    <VisualCardHeader
                      itemId={chore.id}
                      title={chore.title}
                      description={chore.description || `Location: ${chore.location || chore.zone}`}
                      category={chore.zone}
                      imageUrl={itemImages[chore.id]}
                      onPhotoUpload={handlePhotoUpload}
                      onGenerateAi={handleGenerateAiVisual}
                      isGenerating={generatingAiMap[chore.id]}
                    />

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-stone-500" />
                        <span>{chore.location || chore.zone} • {chore.frequency}</span>
                      </span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                        🪙 +{chore.rewardPoints} Points
                      </span>
                    </div>

                    <h4 className="font-bold text-stone-900 text-base mt-2">{chore.title}</h4>
                    <p className="text-xs text-stone-600 mt-1">{chore.description}</p>
                    <span className="text-xs text-stone-500 mt-1 block">Due: {dueStr}</span>

                    {/* Step-by-Step Checklist */}
                    {totalCount > 0 && (
                      <div className="mt-3 bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-stone-700">
                          <span>Chore Checklist</span>
                          <span className="text-emerald-800 font-bold">{completedCount}/{totalCount} Steps Done</span>
                        </div>
                        <div className="space-y-1.5">
                          {checklist.map((step: any) => (
                            <button
                              key={step.id}
                              type="button"
                              onClick={() => handleToggleChoreChecklistItem(chore, step.id)}
                              className="w-full flex items-center space-x-2 text-left text-xs p-1.5 rounded-lg hover:bg-white transition cursor-pointer"
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                step.isDone ? 'bg-emerald-700 border-emerald-700 text-white' : 'border-stone-400 bg-white'
                              }`}>
                                {step.isDone && <Check className="w-3 h-3" />}
                              </div>
                              <span className={`text-stone-800 ${step.isDone ? 'line-through text-stone-400' : ''}`}>
                                {step.text}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: BRAND.border }}>
                    <span className="text-xs text-stone-600 font-medium truncate max-w-[150px]">
                      👤 {assignedName}
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleOpenEditChore(chore)}
                        className="p-1.5 text-stone-400 hover:text-stone-800"
                        title="Edit chore"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteChore(chore.id)}
                        className="p-1.5 text-stone-400 hover:text-red-600"
                        title="Delete chore"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleCompleteChore(chore.id)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs transition cursor-pointer"
                        style={{ backgroundColor: BRAND.primary }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Complete & Claim</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chore History Log Drawer */}
          {choreHistory.length > 0 && (
            <div className="bg-stone-50 p-4 rounded-3xl border border-stone-200">
              <h5 className="font-bold text-stone-900 text-xs uppercase tracking-wider mb-2">Recent Chore Completions & Points Ledger</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {choreHistory.slice(-6).reverse().map((rec) => (
                  <div key={rec.id} className="bg-white p-2.5 rounded-xl border border-stone-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-stone-800">{rec.choreId}</span>
                      <span className="text-[10px] text-stone-500 block">{new Date(rec.completedAt).toLocaleTimeString()}</span>
                    </div>
                    <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
                      +{rec.pointsEarned} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. OUTFITS FOR SEASONS & LAUNDRY HAMPER */}
      {/* ========================================================================= */}
      {subTab === 'wardrobe' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border" style={{ borderColor: BRAND.border }}>
            <div>
              <h3 className="font-bold text-stone-900 text-lg">Seasonal Wardrobe, Outfits & Laundry Care</h3>
              <p className="text-xs text-stone-600">Organize clothing for all 4 seasons, plan school and work outfits, and manage the family laundry hamper.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleRunLaundryCycle}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#E7D1AA] text-[#173D35] hover:bg-[#C39A60] transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Wash All Dirty Clothes ({laundryHamperItems.length})</span>
              </button>
              <button
                onClick={() => setShowOutfitModal(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-stone-900 text-white hover:bg-black transition cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Plan New Outfit</span>
              </button>
              <button
                onClick={() => setShowWardrobeModal(true)}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition cursor-pointer"
                style={{ backgroundColor: BRAND.primary }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Clothing Item</span>
              </button>
            </div>
          </div>

          {/* Season Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'ALL', label: 'All Seasons' },
              { id: 'SPRING', label: '🌸 Spring' },
              { id: 'SUMMER', label: '☀️ Summer' },
              { id: 'FALL', label: '🍂 Fall' },
              { id: 'WINTER', label: '❄️ Winter' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setWardrobeSeasonFilter(s.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  wardrobeSeasonFilter === s.id
                    ? 'bg-[#173D35] text-white shadow-xs'
                    : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Planned Outfits Strip */}
          <div className="bg-emerald-50/60 border border-emerald-200 p-5 rounded-3xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">Planned Outfits for Upcoming Events</span>
              <span className="text-xs text-emerald-700 font-medium">Synced with Member Calendars</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {outfits.map((o) => (
                <div key={o.id} className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs relative group">
                  <div className="flex items-center justify-between text-[11px] font-bold text-stone-600">
                    <span>{o.planDate}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900">{o.occasion}</span>
                  </div>
                  <h5 className="font-bold text-stone-900 text-sm mt-1">{o.outfitName}</h5>
                  <p className="text-xs text-stone-500 mt-0.5">👤 {FAMILY_MEMBERS.find(m => m.id === o.memberId)?.name || o.memberId}</p>
                  {o.notes && <p className="text-xs text-stone-400 italic mt-1 truncate">"{o.notes}"</p>}
                  <button
                    onClick={() => handleDeleteOutfit(o.id)}
                    className="absolute top-2 right-2 p-1 text-stone-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Wardrobe Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredWardrobe.map((item) => (
              <div key={item.id} className="bg-white p-5 rounded-3xl border shadow-xs space-y-3 flex flex-col justify-between" style={{ borderColor: BRAND.border }}>
                <div>
                  <VisualCardHeader
                    itemId={item.id}
                    title={item.itemName}
                    description={`Color: ${item.color || 'Standard'}. Season: ${item.season}.`}
                    category={item.category}
                    imageUrl={itemImages[item.id]}
                    onPhotoUpload={handlePhotoUpload}
                    onGenerateAi={handleGenerateAiVisual}
                    isGenerating={generatingAiMap[item.id]}
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-800">
                      {item.category} • {item.season}
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      item.isClean ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                      {item.isClean ? '✨ Clean' : '🧺 Needs Laundry'}
                    </span>
                  </div>

                  <h4 className="font-bold text-stone-900 text-sm mt-2">{item.itemName}</h4>
                  <div className="text-xs text-stone-500 mt-1 flex items-center space-x-2">
                    <span>Color: <strong>{item.color || 'Standard'}</strong></span>
                    <span>•</span>
                    <span>👤 {FAMILY_MEMBERS.find(m => m.id === item.memberId)?.name?.split(' ')[0] || item.memberId}</span>
                  </div>
                </div>

                <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: BRAND.border }}>
                  <button
                    onClick={() => handleToggleLaundry(item)}
                    className="text-xs font-semibold text-stone-600 hover:text-stone-900 underline cursor-pointer"
                  >
                    Toggle {item.isClean ? 'to Laundry' : 'to Clean'}
                  </button>
                  <button
                    onClick={() => handleDeleteWardrobeItem(item.id)}
                    className="p-1 text-stone-400 hover:text-red-600"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. HOME ASSETS & MAINTENANCE SYSTEM */}
      {/* ========================================================================= */}
      {subTab === 'assets' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3" style={{ borderColor: BRAND.border }}>
            <div>
              <h3 className="font-bold text-stone-900 text-lg">Home Assets, Equipment & Maintenance System</h3>
              <p className="text-xs text-stone-600">Keep warranty details, purchase costs, service logs, and preventive maintenance cadences in order.</p>
            </div>
            <button
              onClick={handleOpenAddAsset}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition cursor-pointer"
              style={{ backgroundColor: BRAND.primary }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Home Asset</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assets.map((asset) => {
              const priceStr = `$${(asset.purchasePriceCents / 100).toFixed(2)}`;
              const nextMaintStr = asset.nextMaintenanceDate
                ? new Date(asset.nextMaintenanceDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Not Scheduled';
              const warrantyStr = asset.warrantyExpiration
                ? new Date(asset.warrantyExpiration).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                : 'None';
              const isDueSoon = asset.nextMaintenanceDate && asset.nextMaintenanceDate < Date.now() + 30 * 24 * 60 * 60 * 1000;

              return (
                <div key={asset.id} className="bg-white p-6 rounded-3xl border shadow-xs space-y-4 flex flex-col justify-between" style={{ borderColor: BRAND.border }}>
                  <div>
                    <VisualCardHeader
                      itemId={asset.id}
                      title={asset.name}
                      description={asset.description || `Location: ${asset.location}`}
                      category={asset.category}
                      imageUrl={itemImages[asset.id]}
                      onPhotoUpload={handlePhotoUpload}
                      onGenerateAi={handleGenerateAiVisual}
                      isGenerating={generatingAiMap[asset.id]}
                    />

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-100 text-stone-800">
                        {asset.category}
                      </span>
                      <span className="text-xs font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {priceStr}
                      </span>
                    </div>

                    <h4 className="font-serif font-bold text-stone-900 text-lg mt-2">{asset.name}</h4>
                    <p className="text-xs text-stone-600 mt-1">{asset.description}</p>

                    <div className="text-xs text-stone-500 mt-3 space-y-1 bg-stone-50 p-3 rounded-2xl border border-stone-200">
                      <p>📍 Location: <strong>{asset.location || 'Household'}</strong></p>
                      <p>🛡️ Warranty Expiry: <strong>{warrantyStr}</strong></p>
                      <p className={isDueSoon ? 'text-amber-800 font-bold' : ''}>
                        🔧 Service Cadence: Every {asset.maintenanceFrequencyMonths || 6} months (Next: <strong>{nextMaintStr}</strong>)
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: BRAND.border }}>
                    <button
                      onClick={() => handleOpenMaintenanceModal(asset)}
                      className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Log Service Record</span>
                    </button>
                    <button
                      onClick={() => handleDeleteAsset(asset.id)}
                      className="p-1.5 text-stone-400 hover:text-red-600"
                      title="Delete asset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MANAGE INVENTORY LOCATIONS & CATEGORIES */}
      {/* ========================================================================= */}
      {showManageLocationsModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full border shadow-2xl space-y-5 my-8" style={{ borderColor: BRAND.border }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: BRAND.border }}>
              <div>
                <h4 className="font-serif font-bold text-stone-900 text-xl">Manage Storage Locations & Categories</h4>
                <p className="text-xs text-stone-500">Configure household rooms, shelves, bins, and custom item classifications.</p>
              </div>
              <button type="button" onClick={() => setShowManageLocationsModal(false)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Storage Locations Manager */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 uppercase flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-800" />
                  <span>Storage Locations ({pantryLocations.length})</span>
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="New location name (e.g. Garage Freezer, Pantry Shelf 3)..."
                  value={newLocationInput}
                  onChange={(e) => setNewLocationInput(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl border text-xs"
                  style={{ borderColor: BRAND.border }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddLocation();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddLocation}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs"
                  style={{ backgroundColor: BRAND.primary }}
                >
                  Add Location
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 bg-stone-50 rounded-2xl border border-stone-200">
                {pantryLocations.map((loc) => (
                  <span
                    key={loc}
                    className="inline-flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-xl text-xs border border-stone-200 text-stone-800 shadow-2xs"
                  >
                    <span>📍 {loc}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteLocation(loc)}
                      className="text-stone-400 hover:text-red-600 transition"
                      title={`Delete ${loc}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Inventory Categories Manager */}
            <div className="space-y-3 border-t pt-4" style={{ borderColor: BRAND.border }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 uppercase flex items-center space-x-1">
                  <Tag className="w-3.5 h-3.5 text-amber-700" />
                  <span>Item Categories ({pantryCategories.length})</span>
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="New category name (e.g. BAKING, SNACKS, BEVERAGES)..."
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl border text-xs"
                  style={{ borderColor: BRAND.border }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs"
                  style={{ backgroundColor: BRAND.primary }}
                >
                  Add Category
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 bg-stone-50 rounded-2xl border border-stone-200">
                {pantryCategories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-xl text-xs border border-stone-200 text-stone-800 shadow-2xs"
                  >
                    <span>🏷️ {cat}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat)}
                      className="text-stone-400 hover:text-red-600 transition"
                      title={`Delete ${cat}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t" style={{ borderColor: BRAND.border }}>
              <button
                type="button"
                onClick={() => setShowManageLocationsModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-stone-900 text-white hover:bg-black transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PRINT OPERATIONS PDF & PREVIEW */}
      {/* ========================================================================= */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-4xl w-full border shadow-2xl space-y-4 my-8" style={{ borderColor: BRAND.border }}>
            <div className="flex items-center justify-between border-b pb-3 no-print" style={{ borderColor: BRAND.border }}>
              <div>
                <h4 className="font-serif font-bold text-stone-900 text-xl flex items-center space-x-2">
                  <Printer className="w-5 h-5 text-emerald-800" />
                  <span>Household Operations Printout & PDF Export</span>
                </h4>
                <p className="text-xs text-stone-500">Select a document format to print or save as PDF via your browser print dialog.</p>
              </div>
              <button type="button" onClick={() => setShowPrintModal(false)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Selector Bar */}
            <div className="flex flex-wrap gap-2 no-print">
              {[
                { id: 'meal_plan', label: '📅 7-Day Meal Plan' },
                { id: 'groceries', label: '🛒 Grocery Checklist' },
                { id: 'pantry_inventory', label: '🥫 Inventory by Location' },
                { id: 'chores_board', label: '✅ Family Chore Chart' },
                { id: 'assets_maintenance', label: '🔧 Equipment & Service Log' },
                { id: 'wardrobe_outfits', label: '👔 Outfit & Wardrobe Plan' },
                { id: 'all_operations', label: '📑 Master Operations Dossier' },
              ].map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedPrintDoc(doc.id as PrintDocType)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    selectedPrintDoc === doc.id
                      ? 'bg-[#173D35] text-white shadow-xs'
                      : 'bg-stone-50 text-stone-700 hover:bg-stone-100 border border-stone-200'
                  }`}
                >
                  {doc.label}
                </button>
              ))}
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between bg-stone-50 p-3 rounded-2xl border border-stone-200 no-print">
              <span className="text-xs text-stone-600 font-medium">
                💡 Tip: Click <strong>"Print / Save to PDF"</strong> to send directly to your printer or choose <em>"Save as PDF"</em>.
              </span>
              <button
                type="button"
                onClick={handleTriggerPrint}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition cursor-pointer"
                style={{ backgroundColor: BRAND.primary }}
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save to PDF</span>
              </button>
            </div>

            {/* The Actual Printable Content Area */}
            <div
              id="household-print-area"
              className="border border-stone-200 p-6 rounded-2xl bg-white max-h-[60vh] overflow-y-auto space-y-6 text-stone-900"
            >
              {/* Document Header */}
              <div className="border-b-2 border-stone-900 pb-3 flex items-start justify-between">
                <div>
                  <h1 className="font-serif font-bold text-2xl tracking-tight text-stone-900">FamilyOS • Household Operations</h1>
                  <p className="text-xs text-stone-600 font-medium mt-0.5">
                    Family Workspace: Jenkins Household • Generated on {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div className="text-right text-xs text-stone-500 font-mono">
                  Official Household Record
                </div>
              </div>

              {/* TEMPLATE 1: 7-DAY MEAL PLAN */}
              {(selectedPrintDoc === 'meal_plan' || selectedPrintDoc === 'all_operations') && (
                <div className="space-y-3 print-avoid-break">
                  <div className="flex items-center justify-between border-b pb-1 border-stone-300">
                    <h2 className="font-serif font-bold text-lg text-stone-900 uppercase tracking-wide">
                      Weekly Meal Schedule & Kitchen Menu
                    </h2>
                    <span className="text-xs text-stone-500">Monday through Sunday</span>
                  </div>

                  <table className="w-full text-xs text-left border-collapse border border-stone-300">
                    <thead>
                      <tr className="bg-stone-100 border-b border-stone-300">
                        <th className="p-2 border-r border-stone-300 font-bold w-24">Day</th>
                        <th className="p-2 border-r border-stone-300 font-bold w-24">Slot</th>
                        <th className="p-2 border-r border-stone-300 font-bold">Planned Dish / Recipe</th>
                        <th className="p-2 border-r border-stone-300 font-bold w-20 text-center">Servings</th>
                        <th className="p-2 font-bold">Cook & Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weekDayDates.map((day) => {
                        const dayMeals = meals.filter(m => new Date(m.planDate).toISOString().split('T')[0] === day.iso);
                        if (dayMeals.length === 0) {
                          return (
                            <tr key={day.dayName} className="border-b border-stone-200">
                              <td className="p-2 border-r border-stone-200 font-bold">{day.dayName} ({day.formatted})</td>
                              <td className="p-2 border-r border-stone-200 text-stone-400 italic" colSpan={4}>No meals scheduled</td>
                            </tr>
                          );
                        }
                        return dayMeals.map((m, idx) => (
                          <tr key={m.id} className="border-b border-stone-200">
                            {idx === 0 ? (
                              <td className="p-2 border-r border-stone-200 font-bold" rowSpan={dayMeals.length}>
                                {day.dayName}
                                <span className="block text-[10px] text-stone-500 font-normal">{day.formatted}</span>
                              </td>
                            ) : null}
                            <td className="p-2 border-r border-stone-200 font-semibold uppercase text-[10px]">{m.mealType}</td>
                            <td className="p-2 border-r border-stone-200 font-bold text-stone-900">
                              {m.customMealTitle || recipes.find(r => r.id === m.recipeId)?.title || 'Scheduled Meal'}
                            </td>
                            <td className="p-2 border-r border-stone-200 text-center">{m.servings}</td>
                            <td className="p-2 text-stone-600">{m.notes || '—'}</td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TEMPLATE 2: SMART GROCERY SHOPPING LIST */}
              {(selectedPrintDoc === 'groceries' || selectedPrintDoc === 'all_operations') && (
                <div className="space-y-3 print-avoid-break">
                  <div className="flex items-center justify-between border-b pb-1 border-stone-300">
                    <h2 className="font-serif font-bold text-lg text-stone-900 uppercase tracking-wide">
                      Household Grocery Shopping Checklist
                    </h2>
                    <span className="text-xs text-stone-500">{groceries.length} Total Items</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {['PRODUCE', 'DAIRY', 'MEAT', 'PANTRY', 'BAKERY', 'FROZEN', 'OTHER'].map((cat) => {
                      const itemsInCat = groceries.filter(g => (g.category || 'PANTRY').toUpperCase() === cat);
                      if (itemsInCat.length === 0) return null;

                      return (
                        <div key={cat} className="border border-stone-200 rounded-xl p-3">
                          <h4 className="font-bold text-xs uppercase tracking-wider text-stone-800 border-b pb-1 border-stone-200 mb-2">
                            {cat} ({itemsInCat.length})
                          </h4>
                          <div className="space-y-1.5">
                            {itemsInCat.map((item) => (
                              <div key={item.id} className="flex items-center space-x-2 text-xs">
                                <span className="inline-block w-3.5 h-3.5 border border-stone-400 rounded-xs"></span>
                                <span className="font-medium text-stone-900">{item.itemName}</span>
                                <span className="text-[10px] text-stone-500">({item.quantity} {item.unit})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TEMPLATE 3: INVENTORY BY LOCATION */}
              {(selectedPrintDoc === 'pantry_inventory' || selectedPrintDoc === 'all_operations') && (
                <div className="space-y-3 print-avoid-break">
                  <div className="flex items-center justify-between border-b pb-1 border-stone-300">
                    <h2 className="font-serif font-bold text-lg text-stone-900 uppercase tracking-wide">
                      Pantry, Fridge & Storage Locations Audit Sheet
                    </h2>
                    <span className="text-xs text-stone-500">{pantry.length} Tracked Items</span>
                  </div>

                  <table className="w-full text-xs text-left border-collapse border border-stone-300">
                    <thead>
                      <tr className="bg-stone-100 border-b border-stone-300">
                        <th className="p-2 border-r border-stone-300 font-bold">Storage Location</th>
                        <th className="p-2 border-r border-stone-300 font-bold">Item Name</th>
                        <th className="p-2 border-r border-stone-300 font-bold">Category</th>
                        <th className="p-2 border-r border-stone-300 font-bold text-center">Stock Quantity</th>
                        <th className="p-2 border-r border-stone-300 font-bold">Expiry Date</th>
                        <th className="p-2 font-bold text-center">Stock Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pantry.map((item) => (
                        <tr key={item.id} className="border-b border-stone-200">
                          <td className="p-2 border-r border-stone-200 font-semibold">{item.storageLocation || 'Main Storage'}</td>
                          <td className="p-2 border-r border-stone-200 font-bold">{item.itemName}</td>
                          <td className="p-2 border-r border-stone-200 text-stone-600">{item.category}</td>
                          <td className="p-2 border-r border-stone-200 text-center font-bold">{item.quantity} {item.unit}</td>
                          <td className="p-2 border-r border-stone-200">
                            {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="p-2 text-center">
                            {item.isLowStock ? '⚠️ Low Stock' : item.expiryStatus === 'EXPIRED' ? '🚨 Expired' : 'Fresh'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TEMPLATE 4: CHORES & CHECKLISTS BOARD */}
              {(selectedPrintDoc === 'chores_board' || selectedPrintDoc === 'all_operations') && (
                <div className="space-y-3 print-avoid-break">
                  <div className="flex items-center justify-between border-b pb-1 border-stone-300">
                    <h2 className="font-serif font-bold text-lg text-stone-900 uppercase tracking-wide">
                      Family Weekly Chore Chart & Duty Board
                    </h2>
                    <span className="text-xs text-stone-500">Positive Reward Ledger</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {chores.map((chore) => {
                      const assigned = FAMILY_MEMBERS.find(m => m.id === chore.assignedMemberId)?.name || chore.assignedMemberId || 'Anyone';
                      return (
                        <div key={chore.id} className="border border-stone-200 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between border-b pb-1 border-stone-200">
                            <span className="font-bold text-sm text-stone-900">{chore.title}</span>
                            <span className="font-bold text-xs bg-stone-100 px-2 py-0.5 rounded-sm">
                              +{chore.rewardPoints} pts
                            </span>
                          </div>
                          <div className="text-xs text-stone-600 space-y-0.5">
                            <p>📍 Location: <strong>{chore.location || chore.zone}</strong> • Frequency: {chore.frequency}</p>
                            <p>👤 Assigned: <strong>{assigned}</strong></p>
                          </div>
                          {chore.checklist && chore.checklist.length > 0 && (
                            <div className="space-y-1 pt-1">
                              {chore.checklist.map((step: any, idx: number) => (
                                <div key={step.id || idx} className="flex items-center space-x-2 text-xs text-stone-700">
                                  <span className="w-3.5 h-3.5 border border-stone-400 rounded-xs inline-block"></span>
                                  <span>{step.text}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TEMPLATE 5: HOME ASSETS & MAINTENANCE */}
              {(selectedPrintDoc === 'assets_maintenance' || selectedPrintDoc === 'all_operations') && (
                <div className="space-y-3 print-avoid-break">
                  <div className="flex items-center justify-between border-b pb-1 border-stone-300">
                    <h2 className="font-serif font-bold text-lg text-stone-900 uppercase tracking-wide">
                      Household Equipment Registry & Service Log
                    </h2>
                    <span className="text-xs text-stone-500">Preventive Maintenance</span>
                  </div>

                  <table className="w-full text-xs text-left border-collapse border border-stone-300">
                    <thead>
                      <tr className="bg-stone-100 border-b border-stone-300">
                        <th className="p-2 border-r border-stone-300 font-bold">Equipment / Asset</th>
                        <th className="p-2 border-r border-stone-300 font-bold">Category</th>
                        <th className="p-2 border-r border-stone-300 font-bold">Location</th>
                        <th className="p-2 border-r border-stone-300 font-bold">Purchase Cost</th>
                        <th className="p-2 border-r border-stone-300 font-bold">Warranty Expiry</th>
                        <th className="p-2 font-bold">Next Service Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assets.map((asset) => (
                        <tr key={asset.id} className="border-b border-stone-200">
                          <td className="p-2 border-r border-stone-200 font-bold">{asset.name}</td>
                          <td className="p-2 border-r border-stone-200">{asset.category}</td>
                          <td className="p-2 border-r border-stone-200">{asset.location || 'Household'}</td>
                          <td className="p-2 border-r border-stone-200">${(asset.purchasePriceCents / 100).toFixed(2)}</td>
                          <td className="p-2 border-r border-stone-200">
                            {asset.warrantyExpiration ? new Date(asset.warrantyExpiration).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="p-2 font-semibold">
                            {asset.nextMaintenanceDate ? new Date(asset.nextMaintenanceDate).toLocaleDateString() : 'Every 6 Mos'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TEMPLATE 6: WARDROBE & OUTFITS */}
              {(selectedPrintDoc === 'wardrobe_outfits' || selectedPrintDoc === 'all_operations') && (
                <div className="space-y-3 print-avoid-break">
                  <div className="flex items-center justify-between border-b pb-1 border-stone-300">
                    <h2 className="font-serif font-bold text-lg text-stone-900 uppercase tracking-wide">
                      Family Weekly Outfit Schedule & Packing Plan
                    </h2>
                    <span className="text-xs text-stone-500">School & Event Coordination</span>
                  </div>

                  <table className="w-full text-xs text-left border-collapse border border-stone-300">
                    <thead>
                      <tr className="bg-stone-100 border-b border-stone-300">
                        <th className="p-2 border-r border-stone-300 font-bold w-28">Date</th>
                        <th className="p-2 border-r border-stone-300 font-bold">Member</th>
                        <th className="p-2 border-r border-stone-300 font-bold">Outfit Plan</th>
                        <th className="p-2 border-r border-stone-300 font-bold">Occasion</th>
                        <th className="p-2 font-bold">Notes / Accessories</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outfits.map((o) => (
                        <tr key={o.id} className="border-b border-stone-200">
                          <td className="p-2 border-r border-stone-200 font-bold">{o.planDate}</td>
                          <td className="p-2 border-r border-stone-200">{FAMILY_MEMBERS.find(m => m.id === o.memberId)?.name || o.memberId}</td>
                          <td className="p-2 border-r border-stone-200 font-semibold">{o.outfitName}</td>
                          <td className="p-2 border-r border-stone-200 uppercase text-[10px] font-bold">{o.occasion}</td>
                          <td className="p-2 text-stone-600">{o.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Print Footer */}
              <div className="pt-4 border-t border-stone-300 text-center text-[10px] text-stone-500 font-serif">
                FamilyOS • Intentional Living • Generated for Household Management Binder
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT SCHEDULED MEAL */}
      {/* ========================================================================= */}
      {showMealModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveMeal} className="bg-white rounded-3xl p-6 max-w-md w-full border shadow-2xl space-y-4" style={{ borderColor: BRAND.border }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: BRAND.border }}>
              <h4 className="font-serif font-bold text-stone-900 text-xl">
                {editingMealId ? 'Edit Scheduled Meal' : 'Add Meal to Whole Week Plan'}
              </h4>
              <button type="button" onClick={() => setShowMealModal(false)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700">Date (YYYY-MM-DD)</label>
                <input
                  type="date"
                  required
                  value={mealDate}
                  onChange={(e) => setMealDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border text-xs"
                  style={{ borderColor: BRAND.border }}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700">Meal Slot</label>
                <select
                  value={mealSlot}
                  onChange={(e) => setMealSlot(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border text-xs"
                  style={{ borderColor: BRAND.border }}
                >
                  <option value="BREAKFAST">Breakfast</option>
                  <option value="LUNCH">Lunch</option>
                  <option value="DINNER">Dinner</option>
                  <option value="SNACK">Snack</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700">Choose from Recipe Catalog (Optional)</label>
              <select
                value={mealRecipeId}
                onChange={(e) => {
                  setMealRecipeId(e.target.value);
                  const found = recipes.find(r => r.id === e.target.value);
                  if (found) {
                    setMealCustomTitle(found.title);
                    setMealServings(found.servings || 4);
                  }
                }}
                className="w-full mt-1 px-3 py-2 rounded-xl border text-xs"
                style={{ borderColor: BRAND.border }}
              >
                <option value="">-- Custom Dish / Enter Below --</option>
                {recipes.map(r => (
                  <option key={r.id} value={r.id}>{r.title} ({r.category})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700">Dish Title / Meal Name</label>
              <input
                type="text"
                required
                value={mealCustomTitle}
                onChange={(e) => setMealCustomTitle(e.target.value)}
                placeholder="e.g. Garlic Butter Salmon with Roasted Potatoes"
                className="w-full mt-1 px-3.5 py-2 rounded-xl border text-sm"
                style={{ borderColor: BRAND.border }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700">Servings</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={mealServings}
                  onChange={(e) => setMealServings(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 rounded-xl border text-sm"
                  style={{ borderColor: BRAND.border }}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700">Cook / Notes</label>
                <input
                  type="text"
                  value={mealNotes}
                  onChange={(e) => setMealNotes(e.target.value)}
                  placeholder="Cook: David, Kids love this"
                  className="w-full mt-1 px-3 py-2 rounded-xl border text-xs"
                  style={{ borderColor: BRAND.border }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t" style={{ borderColor: BRAND.border }}>
              <button
                type="button"
                onClick={() => setShowMealModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs"
                style={{ backgroundColor: BRAND.primary }}
              >
                Save Scheduled Meal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CREATE / EDIT RECIPE IN FULL */}
      {/* ========================================================================= */}
      {showRecipeModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={handleSaveRecipe} className="bg-white rounded-3xl p-6 max-w-2xl w-full border shadow-2xl space-y-4 my-8" style={{ borderColor: BRAND.border }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: BRAND.border }}>
              <h4 className="font-serif font-bold text-stone-900 text-xl">
                {editingRecipeId ? 'Edit Recipe in Full' : 'Create Recipe in Full'}
              </h4>
              <button type="button" onClick={() => setShowRecipeModal(false)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700">Recipe Title</label>
                <input
                  type="text"
                  required
                  value={recipeTitle}
                  onChange={(e) => setRecipeTitle(e.target.value)}
                  placeholder="e.g. Slow Cooker Tuscan Beef Stew"
                  className="w-full mt-1 px-3.5 py-2 rounded-xl border text-sm"
                  style={{ borderColor: BRAND.border }}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700">Course / Category</label>
                <select
                  value={recipeCategory}
                  onChange={(e) => setRecipeCategory(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border text-xs"
                  style={{ borderColor: BRAND.border }}
                >
                  <option value="DINNER">Dinner</option>
                  <option value="LUNCH">Lunch</option>
                  <option value="BREAKFAST">Breakfast</option>
                  <option value="DESSERT">Dessert</option>
                  <option value="SNACK">Snack</option>
                  <option value="SIDE">Side Dish</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700">Description</label>
              <textarea
                rows={2}
                value={recipeDescription}
                onChange={(e) => setRecipeDescription(e.target.value)}
                placeholder="Savory, heartwarming slow-cooked stew with root vegetables..."
                className="w-full mt-1 px-3.5 py-2 rounded-xl border text-xs"
                style={{ borderColor: BRAND.border }}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700">Prep (Mins)</label>
                <input
                  type="number"
                  value={recipePrepTime}
                  onChange={(e) => setRecipePrepTime(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 rounded-xl border text-xs"
                  style={{ borderColor: BRAND.border }}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700">Cook (Mins)</label>
                <input
                  type="number"
                  value={recipeCookTime}
                  onChange={(e) => setRecipeCookTime(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 rounded-xl border text-xs"
                  style={{ borderColor: BRAND.border }}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700">Servings</label>
                <input
                  type="number"
                  value={recipeServings}
                  onChange={(e) => setRecipeServings(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 rounded-xl border text-xs"
                  style={{ borderColor: BRAND.border }}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700">Difficulty</label>
                <select
                  value={recipeDifficulty}
                  onChange={(e) => setRecipeDifficulty(e.target.value as any)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border text-xs"
                  style={{ borderColor: BRAND.border }}
                >
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700">Dietary & Allergen Notes</label>
              <input
                type="text"
                value={recipeDietary}
                onChange={(e) => setRecipeDietary(e.target.value)}
                placeholder="e.g. Gluten-Free, Dairy-Free, Nut-Free"
                className="w-full mt-1 px-3.5 py-2 rounded-xl border text-xs"
                style={{ borderColor: BRAND.border }}
              />
            </div>

            {/* Dynamic Ingredients Builder */}
            <div className="space-y-2 border-t pt-3" style={{ borderColor: BRAND.border }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 uppercase">Ingredients List</span>
                <button
                  type="button"
                  onClick={() => setRecipeIngredientsList([
                    ...recipeIngredientsList,
                    { id: String(Date.now()), itemName: '', quantity: 1, unit: 'item' }
                  ])}
                  className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Ingredient</span>
                </button>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {recipeIngredientsList.map((ing, idx) => (
                  <div key={ing.id} className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Item (e.g. Yellow Onion)"
                      value={ing.itemName}
                      onChange={(e) => {
                        const copy = [...recipeIngredientsList];
                        copy[idx].itemName = e.target.value;
                        setRecipeIngredientsList(copy);
                      }}
                      className="flex-1 px-3 py-1.5 rounded-xl border text-xs"
                      style={{ borderColor: BRAND.border }}
                    />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Qty"
                      value={ing.quantity}
                      onChange={(e) => {
                        const copy = [...recipeIngredientsList];
                        copy[idx].quantity = Number(e.target.value);
                        setRecipeIngredientsList(copy);
                      }}
                      className="w-16 px-2 py-1.5 rounded-xl border text-xs text-center"
                      style={{ borderColor: BRAND.border }}
                    />
                    <input
                      type="text"
                      placeholder="Unit"
                      value={ing.unit}
                      onChange={(e) => {
                        const copy = [...recipeIngredientsList];
                        copy[idx].unit = e.target.value;
                        setRecipeIngredientsList(copy);
                      }}
                      className="w-20 px-2 py-1.5 rounded-xl border text-xs"
                      style={{ borderColor: BRAND.border }}
                    />
                    <button
                      type="button"
                      onClick={() => setRecipeIngredientsList(recipeIngredientsList.filter((_, i) => i !== idx))}
                      className="p-1 text-stone-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Dynamic Instructions Builder */}
            <div className="space-y-2 border-t pt-3" style={{ borderColor: BRAND.border }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 uppercase">Numbered Instructions</span>
                <button
                  type="button"
                  onClick={() => setRecipeInstructionsList([
                    ...recipeInstructionsList,
                    { id: String(Date.now()), stepNumber: recipeInstructionsList.length + 1, instructionText: '' }
                  ])}
                  className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Step</span>
                </button>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {recipeInstructionsList.map((step, idx) => (
                  <div key={step.id} className="flex items-start space-x-2">
                    <span className="font-bold text-stone-600 text-xs pt-2 shrink-0">{idx + 1}.</span>
                    <input
                      type="text"
                      placeholder="Step instruction..."
                      value={step.instructionText}
                      onChange={(e) => {
                        const copy = [...recipeInstructionsList];
                        copy[idx].instructionText = e.target.value;
                        setRecipeInstructionsList(copy);
                      }}
                      className="flex-1 px-3 py-1.5 rounded-xl border text-xs"
                      style={{ borderColor: BRAND.border }}
                    />
                    <button
                      type="button"
                      onClick={() => setRecipeInstructionsList(recipeInstructionsList.filter((_, i) => i !== idx))}
                      className="p-1 pt-2 text-stone-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t" style={{ borderColor: BRAND.border }}>
              <button
                type="button"
                onClick={() => setShowRecipeModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl text-xs font-bold text-white shadow-xs"
                style={{ backgroundColor: BRAND.primary }}
              >
                Save Recipe
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: INVENTORY ITEM & LOCATION */}
      {/* ========================================================================= */}
      {showPantryModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSavePantry} className="bg-white rounded-3xl p-6 max-w-md w-full border shadow-2xl space-y-4" style={{ borderColor: BRAND.border }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: BRAND.border }}>
              <h4 className="font-serif font-bold text-stone-900 text-xl">
                {editingPantryId ? 'Edit Inventory Item' : 'Add Inventory & Storage Location'}
              </h4>
              <button type="button" onClick={() => setShowPantryModal(false)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700">Item Name</label>
              <input
                type="text"
                required
                value={pantryItemName}
                onChange={(e) => setPantryItemName(e.target.value)}
                placeholder="e.g. Organic Almond Butter, Sourdough Bread"
                className="w-full mt-1 px-3.5 py-2 rounded-xl border text-sm"
                style={{ borderColor: BRAND.border }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-700">Storage Category</label>
                  <button
                    type="button"
                    onClick={() => setShowInlineAddCat(!showInlineAddCat)}
                    className="text-[10px] text-emerald-800 hover:underline font-bold"
                  >
                    {showInlineAddCat ? 'Cancel' : '+ New'}
                  </button>
                </div>
                {showInlineAddCat ? (
                  <input
                    type="text"
                    placeholder="e.g. BAKING, SNACKS"
                    value={inlineCatInput}
                    onChange={(e) => setInlineCatInput(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border text-xs"
                    style={{ borderColor: BRAND.border }}
                  />
                ) : (
                  <select
                    value={pantryCategory}
                    onChange={(e) => setPantryCategory(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border text-xs"
                    style={{ borderColor: BRAND.border }}
                  >
                    {pantryCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-700">Location / Shelf</label>
                  <button
                    type="button"
                    onClick={() => setShowInlineAddLoc(!showInlineAddLoc)}
                    className="text-[10px] text-emerald-800 hover:underline font-bold"
                  >
                    {showInlineAddLoc ? 'Cancel' : '+ New'}
                  </button>
                </div>
                {showInlineAddLoc ? (
                  <input
                    type="text"
                    placeholder="e.g. Garage Fridge"
                    value={inlineLocInput}
                    onChange={(e) => setInlineLocInput(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border text-xs"
                    style={{ borderColor: BRAND.border }}
                  />
                ) : (
                  <select
                    value={pantryLocation}
                    onChange={(e) => setPantryLocation(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border text-xs"
                    style={{ borderColor: BRAND.border }}
                  >
                    {pantryLocations.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700">Quantity</label>
                <input
                  type="number"
                  step="0.5"
                  value={pantryQty}
                  onChange={(e) => setPantryQty(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 rounded-xl border text-sm text-center"
                  style={{ borderColor: BRAND.border }}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700">Unit</label>
                <input
                  type="text"
                  value={pantryUnit}
                  onChange={(e) => setPantryUnit(e.target.value)}
                  placeholder="jars, cans"
                  className="w-full mt-1 px-3 py-2 rounded-xl border text-xs"
                  style={{ borderColor: BRAND.border }}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700">Min Alert</label>
                <input
                  type="number"
                  value={pantryMinThreshold}
                  onChange={(e) => setPantryMinThreshold(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 rounded-xl border text-sm text-center"
                  style={{ borderColor: BRAND.border }}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700">Days Until Expiry</label>
              <input
                type="number"
                value={pantryExpiryDays}
                onChange={(e) => setPantryExpiryDays(Number(e.target.value))}
                className="w-full mt-1 px-3.5 py-2 rounded-xl border text-sm"
                style={{ borderColor: BRAND.border }}
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t" style={{ borderColor: BRAND.border }}>
              <button
                type="button"
                onClick={() => setShowPantryModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs"
                style={{ backgroundColor: BRAND.primary }}
              >
                Save Inventory Item
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: SMART GROCERY ITEM */}
      {/* ========================================================================= */}
      {showGroceryModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveGrocery} className="bg-white rounded-3xl p-6 max-w-md w-full border shadow-2xl space-y-4" style={{ borderColor: BRAND.border }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: BRAND.border }}>
              <h4 className="font-serif font-bold text-stone-900 text-xl">
                {editingGroceryId ? 'Edit Grocery Item' : 'Add to Smart Grocery List'}
              </h4>
              <button type="button" onClick={() => setShowGroceryModal(false)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700">Item Name</label>
              <input
                type="text"
                required
                value={groceryName}
                onChange={(e) => setGroceryName(e.target.value)}
                placeholder="e.g. Grass-Fed Butter, Organic Eggs"
                className="w-full mt-1 px-3.5 py-2 rounded-xl border text-sm"
                style={{ borderColor: BRAND.border }}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700">Category</label>
                <select
                  value={groceryCategory}
                  onChange={(e) => setGroceryCategory(e.target.value)}
                  className="w-full mt-1 px-2 py-2 rounded-xl border text-xs"
                  style={{ borderColor: BRAND.border }}
                >
                  <option value="PRODUCE">Produce</option>
                  <option value="DAIRY">Dairy</option>
                  <option value="MEAT">Meat</option>
                  <option value="PANTRY">Pantry</option>
                  <option value="BAKERY">Bakery</option>
                  <option value="FROZEN">Frozen</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700">Quantity</label>
                <input
                  type="number"
                  step="0.5"
                  value={groceryQuantity}
                  onChange={(e) => setGroceryQuantity(Number(e.target.value))}
                  className="w-full mt-1 px-2 py-2 rounded-xl border text-sm text-center"
                  style={{ borderColor: BRAND.border }}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700">Unit</label>
                <input
                  type="text"
                  value={groceryUnit}
                  onChange={(e) => setGroceryUnit(e.target.value)}
                  placeholder="item, lbs"
                  className="w-full mt-1 px-2 py-2 rounded-xl border text-xs"
                  style={{ borderColor: BRAND.border }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t" style={{ borderColor: BRAND.border }}>
              <button
                type="button"
                onClick={() => setShowGroceryModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs"
                style={{ backgroundColor: BRAND.primary }}
              >
                Save Item
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: CHORE WITH CHECKLIST */}
      {/* ========================================================================= */}
      {showChoreModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={handleSaveChore} className="bg-white rounded-3xl p-6 max-w-lg w-full border shadow-2xl space-y-4 my-8" style={{ borderColor: BRAND.border }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: BRAND.border }}>
              <h4 className="font-serif font-bold text-stone-900 text-xl">
                {editingChoreId ? 'Edit Chore & Checklist' : 'Add Chore with Location & Checklist'}
              </h4>
              <button type="button" onClick={() => setShowChoreModal(false)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700">Chore Title</label>
              <input
                type="text"
                required
                value={choreTitle}
                onChange={(e) => setChoreTitle(e.target.value)}
                placeholder="e.g. Bathroom Deep Clean & Restock"
                className="w-full mt-1 px-3.5 py-2 rounded-xl border text-sm"
                style={{ borderColor: BRAND.border }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700">Zone</label>
                <select
                  value={choreZone}
                  onChange={(e) => setChoreZone(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border text-xs"
                  style={{ borderColor: BRAND.border }}
                >
                  <option value="KITCHEN">Kitchen</option>
                  <option value="LIVING_ROOM">Living Room</option>
                  <option value="BEDROOMS">Bedrooms</option>
                  <option value="BATHROOMS">Bathrooms</option>
                  <option value="OUTDOORS">Yard & Outdoors</option>
                  <option value="GENERAL">General</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700">Specific Location</label>
                <input
                  type="text"
                  value={choreLocation}
                  onChange={(e) => setChoreLocation(e.target.value)}
                  placeholder="e.g. Master Ensuite"
                  className="w-full mt-1 px-3 py-2 rounded-xl border text-xs"
                  style={{ borderColor: BRAND.border }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700">Frequency</label>
                <select
                  value={choreFrequency}
                  onChange={(e) => setChoreFrequency(e.target.value)}
                  className="w-full mt-1 px-2 py-2 rounded-xl border text-xs"
                  style={{ borderColor: BRAND.border }}
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="BIWEEKLY">Bi-Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700">Points</label>
                <input
                  type="number"
                  value={chorePoints}
                  onChange={(e) => setChorePoints(Number(e.target.value))}
                  className="w-full mt-1 px-2 py-2 rounded-xl border text-sm text-center"
                  style={{ borderColor: BRAND.border }}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700">Assigned Member</label>
                <select
                  value={choreAssigned}
                  onChange={(e) => setChoreAssigned(e.target.value)}
                  className="w-full mt-1 px-2 py-2 rounded-xl border text-xs"
                  style={{ borderColor: BRAND.border }}
                >
                  {FAMILY_MEMBERS.map(m => (
                    <option key={m.id} value={m.id}>{m.name.split(' ')[0]}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Checklist Steps Builder */}
            <div className="space-y-2 border-t pt-3" style={{ borderColor: BRAND.border }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 uppercase">Checklist Steps</span>
                <button
                  type="button"
                  onClick={() => setChoreChecklist([
                    ...choreChecklist,
                    { id: String(Date.now()), text: '', isDone: false }
                  ])}
                  className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Step</span>
                </button>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {choreChecklist.map((step, idx) => (
                  <div key={step.id} className="flex items-center space-x-2">
                    <span className="text-xs text-stone-500 font-bold">{idx + 1}.</span>
                    <input
                      type="text"
                      placeholder="Step (e.g. Disinfect counter and mirror)"
                      value={step.text}
                      onChange={(e) => {
                        const copy = [...choreChecklist];
                        copy[idx].text = e.target.value;
                        setChoreChecklist(copy);
                      }}
                      className="flex-1 px-3 py-1.5 rounded-xl border text-xs"
                      style={{ borderColor: BRAND.border }}
                    />
                    <button
                      type="button"
                      onClick={() => setChoreChecklist(choreChecklist.filter((_, i) => i !== idx))}
                      className="p-1 text-stone-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t" style={{ borderColor: BRAND.border }}>
              <button
                type="button"
                onClick={() => setShowChoreModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs"
                style={{ backgroundColor: BRAND.primary }}
              >
                Save Chore
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: ADD CLOTHING ITEM */}
      {/* ========================================================================= */}
      {showWardrobeModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveWardrobeItem} className="bg-white rounded-3xl p-6 max-w-md w-full border shadow-2xl space-y-4" style={{ borderColor: BRAND.border }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: BRAND.border }}>
              <h4 className="font-serif font-bold text-stone-900 text-xl">Add Clothing Item to Wardrobe</h4>
              <button type="button" onClick={() => setShowWardrobeModal(false)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700">Item Name</label>
              <input
                type="text"
                required
                value={wardrobeName}
                onChange={(e) => setWardrobeName(e.target.value)}
                placeholder="e.g. Wool Peacoat, Linen Shirt"
                className="w-full mt-1 px-3.5 py-2 rounded-xl border text-sm"
                style={{ borderColor: BRAND.border }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700">Category</label>
                <select
                  value={wardrobeCategory}
                  onChange={(e) => setWardrobeCategory(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border text-xs"
                  style={{ borderColor: BRAND.border }}
                >
                  <option value="TOPS">Tops & Shirts</option>
                  <option value="BOTTOMS">Pants & Skirts</option>
                  <option value="DRESSES">Dresses</option>
                  <option value="OUTERWEAR">Outerwear & Jackets</option>
                  <option value="SHOES">Shoes & Footwear</option>
                  <option value="ACCESSORIES">Accessories</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700">Season</label>
                <select
                  value={wardrobeSeason}
                  onChange={(e) => setWardrobeSeason(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border text-xs"
                  style={{ borderColor: BRAND.border }}
                >
                  <option value="ALL_SEASON">All Season</option>
                  <option value="SPRING">Spring</option>
                  <option value="SUMMER">Summer</option>
                  <option value="FALL">Fall</option>
                  <option value="WINTER">Winter</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700">Member</label>
                <select
                  value={wardrobeMember}
                  onChange={(e) => setWardrobeMember(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border text-xs"
                  style={{ borderColor: BRAND.border }}
                >
                  {FAMILY_MEMBERS.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700">Color</label>
                <input
                  type="text"
                  value={wardrobeColor}
                  onChange={(e) => setWardrobeColor(e.target.value)}
                  placeholder="e.g. Navy, Camel"
                  className="w-full mt-1 px-3 py-2 rounded-xl border text-xs"
                  style={{ borderColor: BRAND.border }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t" style={{ borderColor: BRAND.border }}>
              <button
                type="button"
                onClick={() => setShowWardrobeModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs"
                style={{ backgroundColor: BRAND.primary }}
              >
                Save Item
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: PLAN OUTFIT */}
      {/* ========================================================================= */}
      {showOutfitModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveOutfit} className="bg-white rounded-3xl p-6 max-w-md w-full border shadow-2xl space-y-4" style={{ borderColor: BRAND.border }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: BRAND.border }}>
              <h4 className="font-serif font-bold text-stone-900 text-xl">Plan an Outfit</h4>
              <button type="button" onClick={() => setShowOutfitModal(false)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700">Outfit Title</label>
              <input
                type="text"
                required
                value={outfitName}
                onChange={(e) => setOutfitName(e.target.value)}
                placeholder="e.g. Wednesday School Science Fair"
                className="w-full mt-1 px-3.5 py-2 rounded-xl border text-sm"
                style={{ borderColor: BRAND.border }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700">Scheduled Date</label>
                <input
                  type="date"
                  required
                  value={outfitDate}
                  onChange={(e) => setOutfitDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border text-xs"
                  style={{ borderColor: BRAND.border }}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700">Occasion</label>
                <select
                  value={outfitOccasion}
                  onChange={(e) => setOutfitOccasion(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border text-xs"
                  style={{ borderColor: BRAND.border }}
                >
                  <option value="SCHOOL">School</option>
                  <option value="WORK">Work</option>
                  <option value="CASUAL">Casual</option>
                  <option value="SPORTS">Sports / Active</option>
                  <option value="FORMAL">Formal Event</option>
                  <option value="CHURCH">Sunday Service</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700">Member</label>
              <select
                value={outfitMember}
                onChange={(e) => setOutfitMember(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl border text-xs"
                style={{ borderColor: BRAND.border }}
              >
                {FAMILY_MEMBERS.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700">Notes / Accessories</label>
              <input
                type="text"
                value={outfitNotes}
                onChange={(e) => setOutfitNotes(e.target.value)}
                placeholder="e.g. Bring extra sweater, pack sneakers"
                className="w-full mt-1 px-3.5 py-2 rounded-xl border text-xs"
                style={{ borderColor: BRAND.border }}
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t" style={{ borderColor: BRAND.border }}>
              <button
                type="button"
                onClick={() => setShowOutfitModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs"
                style={{ backgroundColor: BRAND.primary }}
              >
                Save Outfit Plan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 8: ADD HOME ASSET */}
      {/* ========================================================================= */}
      {showAssetModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveAsset} className="bg-white rounded-3xl p-6 max-w-md w-full border shadow-2xl space-y-4" style={{ borderColor: BRAND.border }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: BRAND.border }}>
              <h4 className="font-serif font-bold text-stone-900 text-xl">Register Home Asset</h4>
              <button type="button" onClick={() => setShowAssetModal(false)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700">Asset / Equipment Name</label>
              <input
                type="text"
                required
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder="e.g. Bosch 800 Series Dishwasher"
                className="w-full mt-1 px-3.5 py-2 rounded-xl border text-sm"
                style={{ borderColor: BRAND.border }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700">Category</label>
                <select
                  value={assetCategory}
                  onChange={(e) => setAssetCategory(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border text-xs"
                  style={{ borderColor: BRAND.border }}
                >
                  <option value="HVAC">HVAC & Heating</option>
                  <option value="APPLIANCES">Major Appliances</option>
                  <option value="PLUMBING">Plumbing & Water</option>
                  <option value="ELECTRICAL">Electrical & Solar</option>
                  <option value="ELECTRONICS">Electronics & Smart Home</option>
                  <option value="VEHICLES">Vehicles & Lawn</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700">Location</label>
                <input
                  type="text"
                  value={assetLocation}
                  onChange={(e) => setAssetLocation(e.target.value)}
                  placeholder="e.g. Kitchen, Basement"
                  className="w-full mt-1 px-3 py-2 rounded-xl border text-xs"
                  style={{ borderColor: BRAND.border }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700">Cost ($)</label>
                <input
                  type="number"
                  value={assetPrice}
                  onChange={(e) => setAssetPrice(Number(e.target.value))}
                  className="w-full mt-1 px-2 py-2 rounded-xl border text-sm text-center"
                  style={{ borderColor: BRAND.border }}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700">Warranty (Mos)</label>
                <input
                  type="number"
                  value={assetWarrantyMonths}
                  onChange={(e) => setAssetWarrantyMonths(Number(e.target.value))}
                  className="w-full mt-1 px-2 py-2 rounded-xl border text-xs text-center"
                  style={{ borderColor: BRAND.border }}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700">Service Cadence</label>
                <select
                  value={assetMaintFreqMonths}
                  onChange={(e) => setAssetMaintFreqMonths(Number(e.target.value))}
                  className="w-full mt-1 px-1 py-2 rounded-xl border text-xs"
                  style={{ borderColor: BRAND.border }}
                >
                  <option value={3}>3 Months</option>
                  <option value={6}>6 Months</option>
                  <option value={12}>1 Year</option>
                  <option value={24}>2 Years</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700">Description / Model</label>
              <input
                type="text"
                value={assetDescription}
                onChange={(e) => setAssetDescription(e.target.value)}
                placeholder="Serial, model, or contractor warranty info"
                className="w-full mt-1 px-3.5 py-2 rounded-xl border text-xs"
                style={{ borderColor: BRAND.border }}
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t" style={{ borderColor: BRAND.border }}>
              <button
                type="button"
                onClick={() => setShowAssetModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs"
                style={{ backgroundColor: BRAND.primary }}
              >
                Register Asset
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 9: LOG SERVICE & MAINTENANCE RECORD */}
      {/* ========================================================================= */}
      {showMaintenanceModal && selectedAssetForMaint && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveMaintenanceRecord} className="bg-white rounded-3xl p-6 max-w-md w-full border shadow-2xl space-y-4" style={{ borderColor: BRAND.border }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: BRAND.border }}>
              <div>
                <h4 className="font-serif font-bold text-stone-900 text-lg">Log Maintenance Service</h4>
                <p className="text-xs text-stone-500 font-semibold">{selectedAssetForMaint.name}</p>
              </div>
              <button type="button" onClick={() => setShowMaintenanceModal(false)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700">Technician / Company</label>
                <input
                  type="text"
                  required
                  value={maintPerformedBy}
                  onChange={(e) => setMaintPerformedBy(e.target.value)}
                  placeholder="e.g. Apex Appliance Repair"
                  className="w-full mt-1 px-3.5 py-2 rounded-xl border text-xs"
                  style={{ borderColor: BRAND.border }}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700">Cost ($)</label>
                <input
                  type="number"
                  value={maintCost}
                  onChange={(e) => setMaintCost(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 rounded-xl border text-sm"
                  style={{ borderColor: BRAND.border }}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700">Service Notes / Work Done</label>
              <textarea
                rows={2}
                value={maintNotes}
                onChange={(e) => setMaintNotes(e.target.value)}
                placeholder="Details of parts replaced, inspection results, or technician comments..."
                className="w-full mt-1 px-3.5 py-2 rounded-xl border text-xs"
                style={{ borderColor: BRAND.border }}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700">Schedule Next Service In</label>
              <select
                value={maintNextMonths}
                onChange={(e) => setMaintNextMonths(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 rounded-xl border text-xs"
                style={{ borderColor: BRAND.border }}
              >
                <option value={3}>3 Months</option>
                <option value={6}>6 Months</option>
                <option value={12}>12 Months (1 Year)</option>
                <option value={24}>24 Months (2 Years)</option>
              </select>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t" style={{ borderColor: BRAND.border }}>
              <button
                type="button"
                onClick={() => setShowMaintenanceModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs"
                style={{ backgroundColor: BRAND.primary }}
              >
                Record Service
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
