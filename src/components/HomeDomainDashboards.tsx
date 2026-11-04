import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Utensils,
  FolderTree,
  Heart,
  BookOpen,
  Shield,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Calendar,
  ShoppingCart,
  Award,
  Car,
  FileText,
  Plane,
  Phone,
  Lock,
  TrendingUp,
  PiggyBank,
  SlidersHorizontal
} from 'lucide-react';
import { syncDomainRecordToDatabase } from '../firebase';
import { MainTabType } from './SidebarNavigation';

export type HomeDashboardSubPageId =
  | 'home_command_center'
  | 'home_finance_dashboard'
  | 'home_house_dashboard'
  | 'home_goals_dashboard'
  | 'home_relationship_dashboard'
  | 'home_parenting_dashboard'
  | 'home_life_dashboard';

export interface HomeDomainDashboardsProps {
  activeDashboardId: HomeDashboardSubPageId;
  onSelectDashboard: (id: HomeDashboardSubPageId) => void;
  workspaceData: any;
  sessionToken: string;
  selectedRole: string;
  onRefreshWorkspace: () => void;
  onNavigateModule: (tab: MainTabType, subItemId?: string) => void;
}

export const HOME_DASHBOARD_TABS: Array<{
  id: HomeDashboardSubPageId;
  shortLabel: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  moduleTab: MainTabType;
}> = [
  {
    id: 'home_command_center',
    shortLabel: 'Command Center',
    title: 'Main Family Command Center',
    subtitle: 'Unified household pulse, today’s overview, priority attention center & quick actions',
    icon: Sparkles,
    moduleTab: 'family_home',
  },
  {
    id: 'home_finance_dashboard',
    shortLabel: 'Finance Dashboard',
    title: 'Household Finance Dashboard',
    subtitle: 'Net worth, cash flow, envelope budgets, upcoming bills, savings goals & quick transaction ledger',
    icon: DollarSign,
    moduleTab: 'finance_hub',
  },
  {
    id: 'home_house_dashboard',
    shortLabel: 'House Dashboard',
    title: 'Household Operations Dashboard',
    subtitle: '7-day meal planner, smart grocery checklist, family chores & points, pantry expiry & home assets',
    icon: Utensils,
    moduleTab: 'household_hub',
  },
  {
    id: 'home_goals_dashboard',
    shortLabel: 'Goals & Projects',
    title: 'Goals & Projects Execution Dashboard',
    subtitle: 'Strategic family goals, active household projects, priority tasks & achievement reward points',
    icon: FolderTree,
    moduleTab: 'planning_execution',
  },
  {
    id: 'home_relationship_dashboard',
    shortLabel: 'Relationships',
    title: 'Family Relationships & Connection Dashboard',
    subtitle: 'Emotional check-ins, gratitude & appreciation wall, couple rituals, family council & shared memories',
    icon: Heart,
    moduleTab: 'relationships',
  },
  {
    id: 'home_parenting_dashboard',
    shortLabel: 'Parenting & Growth',
    title: 'Parenting, Child Milestones & Growth Dashboard',
    subtitle: 'Child developmental profiles, daily routines, homework tracker, healthy habit streaks & micro-learning',
    icon: BookOpen,
    moduleTab: 'parenting_growth',
  },
  {
    id: 'home_life_dashboard',
    shortLabel: 'Life Administration',
    title: 'Life Administration & Preparedness Dashboard',
    subtitle: 'Document vault & expiry alerts, personal task organizer, emergency contacts, travel & vehicle fleet',
    icon: Shield,
    moduleTab: 'life_records',
  },
];

function formatCentsUsd(cents: number): string {
  const abs = Math.abs(Math.round(cents || 0));
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${(abs / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const HomeDomainDashboards: React.FC<HomeDomainDashboardsProps> = ({
  activeDashboardId,
  workspaceData,
  sessionToken,
  selectedRole,
  onRefreshWorkspace,
  onNavigateModule,
}) => {
  const resolvedFamilyId: string = workspaceData?.family?.id || 'fam-1';
  const resolvedUserId: string = workspaceData?.actor?.userAccountId || `role-${selectedRole.toLowerCase()}`;
  const scopedPrefix = `familyos_v4:${resolvedUserId}:${resolvedFamilyId}:home_dashboards`;

  const readScopedStorage = <T,>(key: string, fallback: T): T => {
    try {
      const raw = localStorage.getItem(`${scopedPrefix}:${key}`);
      if (raw) return JSON.parse(raw) as T;
    } catch {
      // Fallback
    }
    return fallback;
  };

  const writeScopedStorage = <T,>(key: string, value: T): void => {
    try {
      localStorage.setItem(`${scopedPrefix}:${key}`, JSON.stringify(value));
    } catch {
      // Ignore quota
    }
  };

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  const notify = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Widget Customizer State across all 6 Dashboards
  const [hiddenWidgets, setHiddenWidgets] = useState<Record<string, boolean>>(() =>
    readScopedStorage('hidden_widgets', {})
  );

  const toggleWidget = (widgetKey: string) => {
    setHiddenWidgets((prev) => {
      const updated = { ...prev, [widgetKey]: !prev[widgetKey] };
      writeScopedStorage('hidden_widgets', updated);
      return updated;
    });
  };

  // ============================================================================
  // 1. FINANCE DASHBOARD STATE & ACTIONS
  // ============================================================================
  const [txTitle, setTxTitle] = useState('');
  const [txAmountDollars, setTxAmountDollars] = useState('45.00');
  const [txType, setTxType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [txCategory, setTxCategory] = useState('FOOD');
  const [txAccountId, setTxAccountId] = useState('acc-1');
  const [savingsGoals, setSavingsGoals] = useState<Array<{
    id: string;
    name: string;
    savedCents: number;
    targetCents: number;
    dueLabel: string;
  }>>(() =>
    readScopedStorage('savings_goals', [
      { id: 'sg-1', name: '6-Month Emergency Reserve', savedCents: 2840000, targetCents: 3500000, dueLabel: 'Dec 2026' },
      { id: 'sg-2', name: 'Summer Coastal Family Vacation', savedCents: 420000, targetCents: 600000, dueLabel: 'Jul 2027' },
      { id: 'sg-3', name: 'Maya & Lucas Education 529 Boost', savedCents: 950000, targetCents: 1200000, dueLabel: 'Sep 2027' },
    ])
  );

  const [upcomingBills, setUpcomingBills] = useState<Array<{
    id: string;
    title: string;
    amountCents: number;
    dueDate: string;
    category: string;
    isPaid: boolean;
  }>>(() =>
    readScopedStorage('upcoming_bills', [
      { id: 'bill-1', title: 'City Water & Electric Utility', amountCents: 18500, dueDate: 'Due in 3 days', category: 'UTILITIES', isPaid: false },
      { id: 'bill-2', title: 'Fiber Gigabit Home Internet', amountCents: 8900, dueDate: 'Due in 5 days', category: 'UTILITIES', isPaid: false },
      { id: 'bill-3', title: 'Youth Soccer & Music Tuition', amountCents: 14000, dueDate: 'Due in 7 days', category: 'EDUCATION', isPaid: false },
    ])
  );

  const handleQuickAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txTitle.trim()) {
      notify('error', 'Please enter a transaction description.');
      return;
    }
    const parsedDollars = parseFloat(txAmountDollars);
    if (isNaN(parsedDollars) || parsedDollars <= 0) {
      notify('error', 'Please enter a valid positive dollar amount.');
      return;
    }
    const amountCents = Math.round(parsedDollars * 100);
    const idempotencyKey = `home-fin-tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    try {
      const res = await fetch('/api/v1/finance/transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          familyId: resolvedFamilyId,
          accountId: txAccountId,
          title: txTitle.trim(),
          amountCents,
          transactionType: txType,
          category: txCategory,
          idempotencyKey,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        notify('error', data.message || data.error || 'Could not record transaction.');
        return;
      }
      await syncDomainRecordToDatabase({
        familyId: resolvedFamilyId,
        entityType: txType,
        entityId: data.transaction?.id || `tx-${Date.now()}`,
        data: data.transaction || { title: txTitle.trim(), amountCents, category: txCategory },
        sessionToken,
      });
      setTxTitle('');
      notify('success', `Recorded ${txType.toLowerCase()} "${txTitle.trim()}" (${formatCentsUsd(amountCents)})!`);
      onRefreshWorkspace();
    } catch {
      notify('error', 'Network error while posting transaction.');
    }
  };

  const handlePayBill = async (billId: string) => {
    const bill = upcomingBills.find((b) => b.id === billId);
    if (!bill || bill.isPaid) return;

    const idempotencyKey = `home-bill-pay-${bill.id}-${Date.now()}`;
    try {
      const res = await fetch('/api/v1/finance/transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          familyId: resolvedFamilyId,
          accountId: 'acc-1',
          title: `Bill Payment: ${bill.title}`,
          amountCents: bill.amountCents,
          transactionType: 'EXPENSE',
          category: bill.category,
          idempotencyKey,
        }),
      });
      if (res.ok) {
        const updated = upcomingBills.map((b) => (b.id === billId ? { ...b, isPaid: true } : b));
        setUpcomingBills(updated);
        writeScopedStorage('upcoming_bills', updated);
        notify('success', `Marked "${bill.title}" paid and recorded in ledger!`);
        onRefreshWorkspace();
      } else {
        const err = await res.json().catch(() => ({}));
        notify('error', err.message || 'Only authorized roles can pay household bills.');
      }
    } catch {
      notify('error', 'Failed to record bill payment.');
    }
  };

  const handleContributeSavings = async (goalId: string, boostCents: number) => {
    const updated = savingsGoals.map((g) =>
      g.id === goalId ? { ...g, savedCents: Math.min(g.targetCents, g.savedCents + boostCents) } : g
    );
    setSavingsGoals(updated);
    writeScopedStorage('savings_goals', updated);
    const targetGoal = updated.find((g) => g.id === goalId);
    if (targetGoal) {
      await syncDomainRecordToDatabase({
        familyId: resolvedFamilyId,
        entityType: 'SAVINGS_GOAL',
        entityId: goalId,
        data: { ...targetGoal, updatedAt: Date.now() },
        sessionToken,
      });
    }
    notify('success', `Added ${formatCentsUsd(boostCents)} to savings goal!`);
  };

  // ============================================================================
  // 2. HOUSE DASHBOARD STATE & ACTIONS
  // ============================================================================
  const [houseMeals, setHouseMeals] = useState<any[]>([]);
  const [houseGroceries, setHouseGroceries] = useState<any[]>([]);
  const [houseChores, setHouseChores] = useState<any[]>([]);
  const [housePantry, setHousePantry] = useState<any[]>([]);
  const [houseAssets, setHouseAssets] = useState<any[]>([]);
  const [newGroceryName, setNewGroceryName] = useState('');
  const [newGroceryCategory, setNewGroceryCategory] = useState('Produce');
  const [newMealDay, setNewMealDay] = useState('Monday');
  const [newMealType, setNewMealType] = useState('DINNER');
  const [newMealTitle, setNewMealTitle] = useState('');

  const fetchHouseDashboardData = useCallback(async () => {
    if (!sessionToken || !resolvedFamilyId) return;
    setLoadingData(true);
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken}`,
    };
    try {
      const [mRes, gRes, cRes, pRes, aRes] = await Promise.all([
        fetch(`/api/v1/household/${encodeURIComponent(resolvedFamilyId)}/meals`, { headers }),
        fetch(`/api/v1/household/${encodeURIComponent(resolvedFamilyId)}/groceries`, { headers }),
        fetch(`/api/v1/household/${encodeURIComponent(resolvedFamilyId)}/chores`, { headers }),
        fetch(`/api/v1/household/${encodeURIComponent(resolvedFamilyId)}/pantry`, { headers }),
        fetch(`/api/v1/household/${encodeURIComponent(resolvedFamilyId)}/assets`, { headers }),
      ]);
      if (mRes.ok) setHouseMeals((await mRes.json()).meals || []);
      if (gRes.ok) setHouseGroceries((await gRes.json()).groceries || []);
      if (cRes.ok) setHouseChores((await cRes.json()).chores || []);
      if (pRes.ok) setHousePantry((await pRes.json()).pantry || []);
      if (aRes.ok) setHouseAssets((await aRes.json()).assets || []);
    } catch {
      // Fallback
    } finally {
      setLoadingData(false);
    }
  }, [sessionToken, resolvedFamilyId]);

  const handleToggleGrocery = async (itemId: string) => {
    try {
      const res = await fetch(`/api/v1/household/${encodeURIComponent(resolvedFamilyId)}/groceries/${itemId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      if (res.ok) {
        await fetchHouseDashboardData();
        notify('success', 'Updated grocery item status!');
      }
    } catch {
      notify('error', 'Failed to toggle grocery item.');
    }
  };

  const handleQuickAddGrocery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroceryName.trim()) return;
    try {
      const res = await fetch(`/api/v1/household/${encodeURIComponent(resolvedFamilyId)}/groceries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          name: newGroceryName.trim(),
          category: newGroceryCategory,
          quantity: 1,
          unit: 'item',
        }),
      });
      if (res.ok) {
        setNewGroceryName('');
        await fetchHouseDashboardData();
        notify('success', `Added "${newGroceryName.trim()}" to Smart Grocery List!`);
      }
    } catch {
      notify('error', 'Failed to add grocery item.');
    }
  };

  const handleCompleteChore = async (choreId: string, title: string) => {
    try {
      const res = await fetch(`/api/v1/household/${encodeURIComponent(resolvedFamilyId)}/chores/${choreId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ completedBy: selectedRole }),
      });
      if (res.ok) {
        await fetchHouseDashboardData();
        onRefreshWorkspace();
        notify('success', `Completed chore "${title}" and awarded responsibility points!`);
      }
    } catch {
      notify('error', 'Failed to complete chore.');
    }
  };

  const handleQuickAddMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMealTitle.trim()) return;
    try {
      const res = await fetch(`/api/v1/household/${encodeURIComponent(resolvedFamilyId)}/meals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          dayOfWeek: newMealDay,
          mealType: newMealType,
          title: newMealTitle.trim(),
          servings: 4,
        }),
      });
      if (res.ok) {
        setNewMealTitle('');
        await fetchHouseDashboardData();
        notify('success', `Scheduled "${newMealTitle.trim()}" for ${newMealDay} (${newMealType})!`);
      }
    } catch {
      notify('error', 'Failed to schedule meal.');
    }
  };

  // ============================================================================
  // 3. GOALS & PROJECT DASHBOARD STATE & ACTIONS
  // ============================================================================
  const [planningState, setPlanningState] = useState<any>(null);
  const [quickGoalTitle, setQuickGoalTitle] = useState('');
  const [quickGoalCategory, setQuickGoalCategory] = useState('FAMILY');
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskPriority, setQuickTaskPriority] = useState<'HIGH' | 'MEDIUM' | 'URGENT'>('HIGH');

  const fetchPlanningDashboardData = useCallback(async () => {
    if (!sessionToken || !resolvedFamilyId) return;
    setLoadingData(true);
    try {
      const res = await fetch(`/api/v1/planning/${encodeURIComponent(resolvedFamilyId)}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (res.ok) {
        setPlanningState(await res.json());
      }
    } catch {
      // Ignore
    } finally {
      setLoadingData(false);
    }
  }, [sessionToken, resolvedFamilyId]);

  const handleQuickGoalProgress = async (goal: any, delta: number) => {
    const nextPct = Math.min(100, Math.max(0, Number(goal.progressPercentage || 0) + delta));
    try {
      const res = await fetch(`/api/v1/goals/${encodeURIComponent(resolvedFamilyId)}/${goal.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          progressPercentage: nextPct,
          currentValue: nextPct,
        }),
      });
      if (res.ok) {
        await fetchPlanningDashboardData();
        onRefreshWorkspace();
        notify('success', `Updated "${goal.title}" progress to ${nextPct}%!`);
      }
    } catch {
      notify('error', 'Failed to update goal progress.');
    }
  };

  const handleQuickCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickGoalTitle.trim()) return;
    try {
      const res = await fetch(`/api/v1/goals/${encodeURIComponent(resolvedFamilyId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          title: quickGoalTitle.trim(),
          description: 'Created from Home Goals & Project Dashboard',
          scope: quickGoalCategory,
          horizon: 'LONG_TERM',
          isMeasurable: true,
          targetMetricValue: 100,
          metricUnit: '%',
        }),
      });
      if (res.ok) {
        setQuickGoalTitle('');
        await fetchPlanningDashboardData();
        onRefreshWorkspace();
        notify('success', `Created strategic goal "${quickGoalTitle.trim()}"!`);
      }
    } catch {
      notify('error', 'Failed to create goal.');
    }
  };

  const handleQuickCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;
    try {
      const res = await fetch(`/api/v1/tasks/${encodeURIComponent(resolvedFamilyId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          title: quickTaskTitle.trim(),
          priority: quickTaskPriority,
          scope: 'SHARED',
          sourceModule: 'GOALS_PROJECTS',
          dueDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
          rewardPoints: 15,
        }),
      });
      if (res.ok) {
        setQuickTaskTitle('');
        await fetchPlanningDashboardData();
        onRefreshWorkspace();
        notify('success', `Created priority task "${quickTaskTitle.trim()}"!`);
      }
    } catch {
      notify('error', 'Failed to create task.');
    }
  };

  const handleTogglePlanningTask = async (task: any) => {
    try {
      const res = await fetch(`/api/v1/tasks/${encodeURIComponent(resolvedFamilyId)}/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          isCompleted: !task.isCompleted,
          status: !task.isCompleted ? 'COMPLETED' : 'TODO',
        }),
      });
      if (res.ok) {
        await fetchPlanningDashboardData();
        onRefreshWorkspace();
        notify('success', !task.isCompleted ? `Completed "${task.title}"!` : `Reopened "${task.title}".`);
      }
    } catch {
      notify('error', 'Failed to update task.');
    }
  };

  // ============================================================================
  // 4. RELATIONSHIP DASHBOARD STATE & ACTIONS
  // ============================================================================
  const [relCheckIns, setRelCheckIns] = useState<any[]>(() =>
    readScopedStorage('rel_checkins', [
      { id: 'chk-1', memberName: 'Sarah Jenkins', mood: ' Energized & Grateful', energyScore: 9, note: 'Loved our family walk after dinner.', date: 'Today' },
      { id: 'chk-2', memberName: 'David Jenkins', mood: 'Focused & Calm', energyScore: 8, note: 'Wrapped up Q4 budget planning early.', date: 'Today' },
      { id: 'chk-3', memberName: 'Maya Jenkins', mood: 'Excited for Exhibition', energyScore: 9, note: 'Selected final 3 prints for photography show.', date: 'Yesterday' },
    ])
  );
  const [newCheckInMood, setNewCheckInMood] = useState('Grateful & Connected');
  const [newCheckInEnergy, setNewCheckInEnergy] = useState(9);
  const [newCheckInNote, setNewCheckInNote] = useState('');

  const [relGratitude, setRelGratitude] = useState<any[]>(() =>
    readScopedStorage('rel_gratitude', [
      { id: 'gr-1', from: 'Sarah', to: 'David', message: 'Thank you for coaching Lucas’s soccer practice in the rain!', likes: 5, date: 'Today' },
      { id: 'gr-2', from: 'Maya', to: 'Sarah', message: 'Thanks Mom for helping mat my photo exhibition frames.', likes: 4, date: 'Yesterday' },
    ])
  );
  const [newGratitudeTo, setNewGratitudeTo] = useState('David Jenkins');
  const [newGratitudeMsg, setNewGratitudeMsg] = useState('');

  const handleAddCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCheckInNote.trim()) {
      notify('error', 'Please share a brief check-in note.');
      return;
    }
    const activeMember =
      workspaceData?.members?.find((m: any) => m.id === workspaceData?.actor?.memberId) ||
      workspaceData?.members?.[0];
    const entry = {
      id: `chk-${Date.now()}`,
      author: activeMember?.displayName || 'Sarah Jenkins',
      ownerUserId: resolvedUserId,
      memberName: activeMember?.displayName || 'Sarah Jenkins',
      mood: newCheckInMood,
      energyScore: newCheckInEnergy,
      note: newCheckInNote.trim(),
      weekSummary: newCheckInNote.trim(),
      wentWell: newCheckInMood,
      couldImprove: '',
      supportNeeded: '',
      gratitude: '',
      togetherIdea: '',
      followUpAction: '',
      isPrivate: false,
      actionCompleted: false,
      type: 'WEEKLY',
      date: 'Just now',
    };
    const updated = [entry, ...relCheckIns];
    setRelCheckIns(updated);
    writeScopedStorage('rel_checkins', updated);
    await syncDomainRecordToDatabase({
      familyId: resolvedFamilyId,
      entityType: 'REL_CHECKIN',
      entityId: entry.id,
      data: entry,
      sessionToken,
    });
    setNewCheckInNote('');
    notify('success', 'Logged your family relationship & emotional check-in!');
  };

  const handleAddGratitude = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGratitudeMsg.trim()) return;
    const activeMember =
      workspaceData?.members?.find((m: any) => m.id === workspaceData?.actor?.memberId) ||
      workspaceData?.members?.[0];
    const item = {
      id: `gr-${Date.now()}`,
      from: activeMember?.displayName?.split(' ')[0] || 'Sarah',
      to: newGratitudeTo,
      category: 'Appreciation',
      message: newGratitudeMsg.trim(),
      likes: 1,
      date: 'Just now',
    };
    const updated = [item, ...relGratitude];
    setRelGratitude(updated);
    writeScopedStorage('rel_gratitude', updated);
    await syncDomainRecordToDatabase({
      familyId: resolvedFamilyId,
      entityType: 'REL_GRATITUDE_NOTE',
      entityId: item.id,
      data: item,
      sessionToken,
    });
    setNewGratitudeMsg('');
    notify('success', `Posted appreciation note for ${newGratitudeTo}!`);
  };

  // ============================================================================
  // 5. PARENTING & GROWTH DASHBOARD STATE & ACTIONS
  // ============================================================================
  const [childRoutines, setChildRoutines] = useState<Array<{
    id: string;
    childName: string;
    title: string;
    timeOfDay: string;
    completedToday: boolean;
    streakDays: number;
  }>>(() =>
    readScopedStorage('parenting_routines', [
      { id: 'pr-1', childName: 'Lucas Jenkins', title: 'Morning Backpack, Teeth & Reading Log', timeOfDay: '07:30 AM', completedToday: true, streakDays: 12 },
      { id: 'pr-2', childName: 'Maya Jenkins', title: 'AP History Review & Camera Gear Prep', timeOfDay: '04:30 PM', completedToday: false, streakDays: 9 },
      { id: 'pr-3', childName: 'Lucas Jenkins', title: '20-Min Evening Chapter Book & Lights Out', timeOfDay: '08:15 PM', completedToday: false, streakDays: 18 },
    ])
  );

  const [growthHabits, setGrowthHabits] = useState<Array<{
    id: string;
    title: string;
    owner: string;
    streak: number;
    target: string;
  }>>(() =>
    readScopedStorage('growth_habits', [
      { id: 'hb-1', title: 'Screen-Free Family Dinner & Conversation', owner: 'Whole Family', streak: 21, target: 'Daily at 6:00 PM' },
      { id: 'hb-2', title: '30-Minute Outdoor Movement / Walk', owner: 'Sarah & David', streak: 14, target: '5x / Week' },
      { id: 'hb-3', title: 'Daily Youth Coding & Math Puzzle', owner: 'Lucas', streak: 11, target: '15 Mins / Day' },
    ])
  );

  const [newMilestoneChild, setNewMilestoneChild] = useState('Lucas Jenkins');
  const [newMilestoneNote, setNewMilestoneNote] = useState('');
  const [childMilestones, setChildMilestones] = useState<Array<{
    id: string;
    child: string;
    milestone: string;
    date: string;
  }>>([
    { id: 'cm-1', child: 'Lucas Jenkins (Age 9)', milestone: 'Finished reading full Percy Jackson series & built LEGO robotics rover', date: 'Nov 2026' },
    { id: 'cm-2', child: 'Maya Jenkins (Age 15)', milestone: 'Selected as Lead Photographer for High School Yearbook & Regional Showcase', date: 'Oct 2026' },
  ]);

  const handleToggleChildRoutine = async (routineId: string) => {
    const updated = childRoutines.map((r) =>
      r.id === routineId
        ? {
            ...r,
            completedToday: !r.completedToday,
            streakDays: !r.completedToday ? r.streakDays + 1 : Math.max(0, r.streakDays - 1),
          }
        : r
    );
    setChildRoutines(updated);
    writeScopedStorage('parenting_routines', updated);
    const targetRoutine = updated.find((r) => r.id === routineId);
    if (targetRoutine) {
      await syncDomainRecordToDatabase({
        familyId: resolvedFamilyId,
        entityType: 'PAR_CHILD_ROUTINE',
        entityId: routineId,
        data: { ...targetRoutine, updatedAt: Date.now() },
        sessionToken,
      });
    }
    notify('success', 'Updated child routine & streak counter!');
  };

  const handleIncrementHabitStreak = async (habitId: string) => {
    const updated = growthHabits.map((h) => (h.id === habitId ? { ...h, streak: h.streak + 1 } : h));
    setGrowthHabits(updated);
    writeScopedStorage('growth_habits', updated);
    const targetHabit = updated.find((h) => h.id === habitId);
    if (targetHabit) {
      await syncDomainRecordToDatabase({
        familyId: resolvedFamilyId,
        entityType: 'PAR_HABIT',
        entityId: habitId,
        data: { ...targetHabit, streakDays: targetHabit.streak, updatedAt: Date.now() },
        sessionToken,
      });
    }
    notify('success', 'Incremented family habit streak (+1 Day)!');
  };

  const handleAddChildMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneNote.trim()) return;
    const item = {
      id: `cm-${Date.now()}`,
      child: newMilestoneChild,
      milestone: newMilestoneNote.trim(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    };
    const updated = [item, ...childMilestones];
    setChildMilestones(updated);
    setNewMilestoneNote('');
    await syncDomainRecordToDatabase({
      familyId: resolvedFamilyId,
      entityType: 'PAR_CHILD_PROFILE',
      entityId: item.id,
      data: { ...item, updatedAt: Date.now() },
      sessionToken,
    });
    notify('success', `Recorded new milestone for ${newMilestoneChild}!`);
  };

  // ============================================================================
  // 6. LIFE MANAGEMENT DASHBOARD STATE & ACTIONS
  // ============================================================================
  const [lifeDocs, setLifeDocs] = useState<Array<{
    id: string;
    title: string;
    category: string;
    expiryDate: string;
    status: 'VALID' | 'EXPIRING_SOON';
  }>>(() =>
    readScopedStorage('life_docs', [
      { id: 'doc-1', title: 'Homeowners Comprehensive Insurance Policy', category: 'Insurance', expiryDate: '2026-12-15', status: 'EXPIRING_SOON' },
      { id: 'doc-2', title: 'Family Passports (Sarah, David, Maya, Lucas)', category: 'Identity', expiryDate: '2029-05-20', status: 'VALID' },
      { id: 'doc-3', title: 'Jenkins Family Living Trust & Healthcare Directives', category: 'Estate & Legal', expiryDate: 'Reviewed 2026', status: 'VALID' },
    ])
  );

  const [lifeVehicles, setLifeVehicles] = useState<Array<{
    id: string;
    name: string;
    mileage: number;
    nextService: string;
    status: string;
  }>>(() =>
    readScopedStorage('life_vehicles', [
      { id: 'veh-1', name: '2024 Volvo XC90 Recharge (Family SUV)', mileage: 18420, nextService: 'Tire Rotation at 20,000 mi', status: 'Optimal' },
      { id: 'veh-2', name: '2023 Subaru Outback Wilderness', mileage: 27890, nextService: 'Registration Renewal Dec 2026', status: 'Service Due Soon' },
    ])
  );

  const [personalAdminTasks, setPersonalAdminTasks] = useState<Array<{
    id: string;
    title: string;
    category: string;
    done: boolean;
  }>>(() =>
    readScopedStorage('life_tasks', [
      { id: 'lt-1', title: 'Upload signed pediatric dental forms for Lucas', category: 'Medical Admin', done: false },
      { id: 'lt-2', title: 'Confirm Thanksgiving cabin reservation deposit', category: 'Travel', done: true },
      { id: 'lt-3', title: 'Renew annual umbrella liability policy quote', category: 'Insurance', done: false },
    ])
  );
  const [newLifeTaskTitle, setNewLifeTaskTitle] = useState('');

  const handleRenewDocument = async (docId: string) => {
    const updated = lifeDocs.map((d) =>
      d.id === docId ? { ...d, status: 'VALID' as const, expiryDate: '2027-12-15 (Renewed)' } : d
    );
    setLifeDocs(updated);
    writeScopedStorage('life_docs', updated);
    const targetDoc = updated.find((d) => d.id === docId);
    if (targetDoc) {
      await syncDomainRecordToDatabase({
        familyId: resolvedFamilyId,
        entityType: 'LIFE_DOCUMENT',
        entityId: docId,
        data: { ...targetDoc, accessLevel: 'All Household', updatedAt: Date.now() },
        sessionToken,
      });
    }
    notify('success', 'Marked document as renewed & verified in vault!');
  };

  const handleLogVehicleService = async (vehId: string) => {
    const updated = lifeVehicles.map((v) =>
      v.id === vehId
        ? { ...v, mileage: v.mileage + 250, status: 'Serviced & Verified', nextService: 'Next inspection in 5,000 mi' }
        : v
    );
    setLifeVehicles(updated);
    writeScopedStorage('life_vehicles', updated);
    const targetVeh = updated.find((v) => v.id === vehId);
    if (targetVeh) {
      await syncDomainRecordToDatabase({
        familyId: resolvedFamilyId,
        entityType: 'LIFE_VEHICLE',
        entityId: vehId,
        data: { ...targetVeh, updatedAt: Date.now() },
        sessionToken,
      });
    }
    notify('success', 'Logged vehicle maintenance & updated odometer!');
  };

  const handleToggleLifeTask = async (taskId: string) => {
    const updated = personalAdminTasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t));
    setPersonalAdminTasks(updated);
    writeScopedStorage('life_tasks', updated);
    const targetTask = updated.find((t) => t.id === taskId);
    if (targetTask) {
      await syncDomainRecordToDatabase({
        familyId: resolvedFamilyId,
        entityType: 'LIFE_PERSONAL_TASK',
        entityId: taskId,
        data: { ...targetTask, ownerUserId: resolvedUserId, isPrivate: true, updatedAt: Date.now() },
        sessionToken,
      });
    }
  };

  const handleAddLifeTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLifeTaskTitle.trim()) return;
    const item = {
      id: `lt-${Date.now()}`,
      title: newLifeTaskTitle.trim(),
      category: 'Life Admin',
      done: false,
    };
    const updated = [item, ...personalAdminTasks];
    setPersonalAdminTasks(updated);
    writeScopedStorage('life_tasks', updated);
    setNewLifeTaskTitle('');
    await syncDomainRecordToDatabase({
      familyId: resolvedFamilyId,
      entityType: 'LIFE_PERSONAL_TASK',
      entityId: item.id,
      data: { ...item, updatedAt: Date.now() },
      sessionToken,
    });
    notify('success', `Added "${item.title}" to Life Management checklist!`);
  };

  // Load domain data when switching dashboards
  useEffect(() => {
    if (activeDashboardId === 'home_house_dashboard') {
      fetchHouseDashboardData();
    } else if (activeDashboardId === 'home_goals_dashboard') {
      fetchPlanningDashboardData();
    }
  }, [activeDashboardId, fetchHouseDashboardData, fetchPlanningDashboardData]);

  const activeMeta =
    HOME_DASHBOARD_TABS.find((t) => t.id === activeDashboardId) || HOME_DASHBOARD_TABS[1];
  const HeaderIcon = activeMeta.icon;

  return (
    <div className="space-y-6">
      {/* Feedback Toast Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-semibold shadow-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-rose-50 border-rose-200 text-rose-950'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="px-2 py-0.5 rounded bg-black/5 hover:bg-black/10 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Domain Dashboard Hero Header */}
      <div className="rounded-3xl p-6 sm:p-8 bg-[#173D35] text-white shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-[#C39A60]/20 border border-[#C39A60]/50 flex items-center justify-center shrink-0">
              <HeaderIcon className="w-7 h-7 text-[#E5C388]" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-[#E5C388] font-mono uppercase tracking-wider">
                <span>Home Sub-Dashboard</span>
                <span>•</span>
                <span>Viewing as {selectedRole}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white mt-0.5">
                {activeMeta.title}
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/90 mt-0.5">
                {activeMeta.subtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onRefreshWorkspace();
                if (activeDashboardId === 'home_house_dashboard') fetchHouseDashboardData();
                if (activeDashboardId === 'home_goals_dashboard') fetchPlanningDashboardData();
                notify('success', 'Refreshed live dashboard widgets!');
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
              <span>Refresh Widgets</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateModule(activeMeta.moduleTab)}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#C39A60] hover:bg-[#d4ab71] text-[#173D35] shadow-xs cursor-pointer"
            >
              <span>Open Full Module</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ====================================================================
          DASHBOARD 1: FINANCE DASHBOARD (home_finance_dashboard)
         ==================================================================== */}
      {activeDashboardId === 'home_finance_dashboard' && (
        <div className="space-y-6">
          {/* Widget Visibility Bar */}
          <div className="p-3.5 rounded-2xl bg-white border border-stone-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-stone-700 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-800" />
              <span>Finance Dashboard Widgets:</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'fin_kpi', label: 'Net Worth & Cash Flow KPIs' },
                { id: 'fin_logger', label: 'Quick Transaction Logger' },
                { id: 'fin_budgets', label: 'Envelope Budgets' },
                { id: 'fin_bills', label: 'Upcoming Bills & Auto-Pay' },
                { id: 'fin_savings', label: 'Savings & Reserves' },
              ].map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => toggleWidget(w.id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                    !hiddenWidgets[w.id]
                      ? 'bg-[#173D35] text-white'
                      : 'bg-stone-100 text-stone-500'
                  }`}
                >
                  {!hiddenWidgets[w.id] ? '✓ ' : '+ '}{w.label}
                </button>
              ))}
            </div>
          </div>

          {!workspaceData?.permissions?.canViewFinances ? (
            <div className="rounded-3xl p-8 bg-amber-50 border border-amber-200 text-amber-950 flex items-center space-x-4">
              <Lock className="w-8 h-8 text-amber-700 shrink-0" />
              <div>
                <h3 className="text-lg font-serif font-bold">Financial Privacy Protection Active</h3>
                <p className="text-xs text-amber-900 mt-1">
                  Your current role ({selectedRole}) has restricted access to household bank balances and net worth ledgers. Switch to Sarah (Owner), David (Admin), or Maya (Member) to interact with financial widgets.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Widget 1: Net Worth & Cash Flow KPIs */}
              {!hiddenWidgets.fin_kpi && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    {
                      label: 'Household Net Worth',
                      value: formatCentsUsd(workspaceData?.netWorth?.netWorthCents || 49125000),
                      sub: 'Assets Minus Liabilities',
                      targetSub: 'fin_investments',
                    },
                    {
                      label: 'Total Liquid & Invested Assets',
                      value: formatCentsUsd(workspaceData?.netWorth?.totalAssetsCents || 51540000),
                      sub: `${workspaceData?.accounts?.length || 3} Active Accounts`,
                      targetSub: 'fin_accounts',
                    },
                    {
                      label: 'Total Liabilities',
                      value: formatCentsUsd(workspaceData?.netWorth?.totalLiabilitiesCents || 2415000),
                      sub: 'Credit & Loans',
                      targetSub: 'fin_accounts',
                    },
                    {
                      label: 'Monthly Cash Surplus',
                      value: '+$3,800.00',
                      sub: '$8,500 In · $4,700 Out',
                      targetSub: 'fin_transactions',
                    },
                  ].map((kpi, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onNavigateModule('finance_hub', kpi.targetSub)}
                      className="p-5 rounded-3xl bg-white border border-stone-200 shadow-2xs text-left hover:border-emerald-800/50 transition-all cursor-pointer"
                    >
                      <span className="text-xs text-stone-500 block">{kpi.label}</span>
                      <span className="text-[20px] font-serif font-bold text-stone-900 font-mono tabular-nums block mt-1">
                        {kpi.value}
                      </span>
                      <span className="text-[11px] text-emerald-800 font-semibold block mt-1">
                        {kpi.sub} &rarr;
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Widget 2: Quick Transaction Logger */}
                {!hiddenWidgets.fin_logger && (
                  <div className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-serif font-bold text-lg text-stone-900">Quick Ledger Entry</h3>
                        <p className="text-xs text-stone-500">Post atomic cent-exact income or expense</p>
                      </div>
                      <DollarSign className="w-5 h-5 text-emerald-800" />
                    </div>

                    <form onSubmit={handleQuickAddTransaction} className="space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setTxType('EXPENSE')}
                          className={`py-2 rounded-xl font-bold border cursor-pointer ${
                            txType === 'EXPENSE'
                              ? 'bg-rose-900 text-white border-rose-900'
                              : 'bg-stone-50 text-stone-700 border-stone-200'
                          }`}
                        >
                          - Expense
                        </button>
                        <button
                          type="button"
                          onClick={() => setTxType('INCOME')}
                          className={`py-2 rounded-xl font-bold border cursor-pointer ${
                            txType === 'INCOME'
                              ? 'bg-[#173D35] text-white border-[#173D35]'
                              : 'bg-stone-50 text-stone-700 border-stone-200'
                          }`}
                        >
                          + Income
                        </button>
                      </div>

                      <div>
                        <label className="font-semibold text-stone-700 block mb-1">Description</label>
                        <input
                          type="text"
                          value={txTitle}
                          onChange={(e) => setTxTitle(e.target.value)}
                          placeholder="e.g., Whole Foods Weekly Groceries"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="font-semibold text-stone-700 block mb-1">Amount ($ USD)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={txAmountDollars}
                            onChange={(e) => setTxAmountDollars(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-stone-700 block mb-1">Category</label>
                          <select
                            value={txCategory}
                            onChange={(e) => setTxCategory(e.target.value)}
                            className="w-full px-2.5 py-2 rounded-xl border border-stone-300 bg-white"
                          >
                            <option value="FOOD">FOOD</option>
                            <option value="HOUSING">HOUSING</option>
                            <option value="UTILITIES">UTILITIES</option>
                            <option value="TRANSPORTATION">TRANSPORTATION</option>
                            <option value="EDUCATION">EDUCATION</option>
                            <option value="INCOME">INCOME</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="font-semibold text-stone-700 block mb-1">Account</label>
                        <select
                          value={txAccountId}
                          onChange={(e) => setTxAccountId(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-xl border border-stone-300 bg-white"
                        >
                          {(workspaceData?.accounts || []).map((acc: any) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name} ({formatCentsUsd(acc.currentBalanceCents)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-xl font-bold bg-[#173D35] hover:bg-emerald-950 text-white cursor-pointer"
                      >
                        Post to Family Ledger
                      </button>
                    </form>
                  </div>
                )}

                {/* Widget 3: Envelope Budgets Health */}
                {!hiddenWidgets.fin_budgets && (
                  <div className="lg:col-span-2 rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-serif font-bold text-lg text-stone-900">Envelope Budgets & Spending</h3>
                        <p className="text-xs text-stone-500">Real-time category utilization from posted transactions</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigateModule('finance_hub', 'fin_budgets')}
                        className="text-xs font-bold text-emerald-900 hover:underline cursor-pointer"
                      >
                        Manage Budgets &rarr;
                      </button>
                    </div>

                    <div className="space-y-3 text-xs">
                      {(workspaceData?.budgets || []).map((b: any) => {
                        const pct = b.limitCents > 0 ? Math.min(100, Math.round((b.spentCents / b.limitCents) * 100)) : 0;
                        const remaining = b.limitCents - b.spentCents;
                        return (
                          <div key={b.id} className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-stone-900">{b.category}</span>
                              <span className="font-mono font-semibold text-stone-700">
                                {formatCentsUsd(b.spentCents)} / {formatCentsUsd(b.limitCents)} ({pct}%)
                              </span>
                            </div>
                            <div className="w-full h-2.5 rounded-full bg-stone-200 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  pct >= 90 ? 'bg-rose-600' : pct >= 75 ? 'bg-amber-500' : 'bg-[#173D35]'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[11px] text-stone-500">
                              <span>{remaining >= 0 ? `${formatCentsUsd(remaining)} remaining` : `${formatCentsUsd(Math.abs(remaining))} over budget`}</span>
                              <span>Monthly Envelope</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Widget 4: Upcoming Bills & Widget 5: Savings Goals */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {!hiddenWidgets.fin_bills && (
                  <div className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-serif font-bold text-lg text-stone-900">Upcoming Bills & Subscriptions</h3>
                        <p className="text-xs text-stone-500">1-click bill payment posts directly to your checking ledger</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigateModule('finance_hub', 'fin_recurring')}
                        className="text-xs font-bold text-emerald-900 hover:underline cursor-pointer"
                      >
                        All Bills &rarr;
                      </button>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      {upcomingBills.map((bill) => (
                        <div
                          key={bill.id}
                          className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-3"
                        >
                          <div>
                            <span className="font-bold text-stone-900 block">{bill.title}</span>
                            <span className="text-[11px] text-stone-500">
                              {bill.dueDate} · {bill.category} · <strong className="font-mono text-stone-800">{formatCentsUsd(bill.amountCents)}</strong>
                            </span>
                          </div>
                          {bill.isPaid ? (
                            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[11px]">
                              ✓ Paid
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handlePayBill(bill.id)}
                              className="px-3 py-1.5 rounded-xl bg-[#173D35] hover:bg-emerald-950 text-white font-semibold cursor-pointer shrink-0"
                            >
                              Record Payment
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!hiddenWidgets.fin_savings && (
                  <div className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-serif font-bold text-lg text-stone-900">Savings & Reserve Goals</h3>
                        <p className="text-xs text-stone-500">Track emergency funds and milestone family targets</p>
                      </div>
                      <PiggyBank className="w-5 h-5 text-emerald-800" />
                    </div>

                    <div className="space-y-3 text-xs">
                      {savingsGoals.map((sg) => {
                        const pct = Math.min(100, Math.round((sg.savedCents / sg.targetCents) * 100));
                        return (
                          <div key={sg.id} className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-stone-900">{sg.name}</span>
                              <span className="font-mono font-bold text-emerald-900">{pct}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-stone-200 overflow-hidden">
                              <div className="h-full rounded-full bg-[#C39A60]" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[11px] text-stone-600 font-mono">
                                {formatCentsUsd(sg.savedCents)} of {formatCentsUsd(sg.targetCents)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleContributeSavings(sg.id, 25000)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-900/10 hover:bg-emerald-900/20 text-emerald-950 font-bold cursor-pointer"
                              >
                                + Boost $250
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ====================================================================
          DASHBOARD 2: HOUSE DASHBOARD (home_house_dashboard)
         ==================================================================== */}
      {activeDashboardId === 'home_house_dashboard' && (
        <div className="space-y-6">
          {/* KPI Summary Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: '7-Day Meal Plan', value: `${houseMeals.length} Meals`, sub: 'Scheduled This Week', subId: 'house_meals' },
              { label: 'Smart Grocery List', value: `${houseGroceries.filter((g) => !g.checked).length} Needed`, sub: `${houseGroceries.filter((g) => g.checked).length} In Cart`, subId: 'house_groceries' },
              { label: 'Active Chores', value: `${houseChores.filter((c) => c.status !== 'COMPLETED').length} Open`, sub: 'Responsibility Points', subId: 'house_chores' },
              { label: 'Pantry & Home Assets', value: `${housePantry.length} Items · ${houseAssets.length} Assets`, sub: 'Inventory & Maintenance', subId: 'house_pantry' },
            ].map((card, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onNavigateModule('household_hub', card.subId)}
                className="p-5 rounded-3xl bg-white border border-stone-200 shadow-2xs text-left hover:border-emerald-800/50 transition-all cursor-pointer"
              >
                <span className="text-xs text-stone-500 block">{card.label}</span>
                <span className="text-xl font-serif font-bold text-stone-900 block mt-1">{card.value}</span>
                <span className="text-[11px] text-emerald-800 font-semibold block mt-1">{card.sub} &rarr;</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Meal Planner Widget */}
            <div className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-900">Weekly Meal Planner</h3>
                  <p className="text-xs text-stone-500">Upcoming family dinners & lunches</p>
                </div>
                <Utensils className="w-5 h-5 text-emerald-800" />
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto text-xs">
                {houseMeals.slice(0, 6).map((m: any) => (
                  <div key={m.id} className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-stone-900 block">{m.title}</span>
                      <span className="text-[11px] text-stone-500">{m.dayOfWeek} · {m.mealType}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-900 font-semibold text-[10px]">
                      {m.servings || 4} Servings
                    </span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleQuickAddMeal} className="pt-3 border-t border-stone-100 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newMealDay}
                    onChange={(e) => setNewMealDay(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white"
                  >
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <select
                    value={newMealType}
                    onChange={(e) => setNewMealType(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white"
                  >
                    <option value="BREAKFAST">Breakfast</option>
                    <option value="LUNCH">Lunch</option>
                    <option value="DINNER">Dinner</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMealTitle}
                    onChange={(e) => setNewMealTitle(e.target.value)}
                    placeholder="Add meal (e.g., Herb Roast Chicken)..."
                    className="flex-1 px-3 py-1.5 rounded-xl border border-stone-300"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-xl bg-[#173D35] text-white font-bold cursor-pointer"
                  >
                    + Plan
                  </button>
                </div>
              </form>
            </div>

            {/* Smart Grocery List Widget */}
            <div className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-900">Smart Grocery Checklist</h3>
                  <p className="text-xs text-stone-500">Click items to check off in real time</p>
                </div>
                <ShoppingCart className="w-5 h-5 text-emerald-800" />
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto text-xs">
                {houseGroceries.slice(0, 7).map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleGrocery(item.id)}
                    className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between cursor-pointer hover:bg-stone-100"
                  >
                    <div className="flex items-center space-x-2.5">
                      <input type="checkbox" checked={Boolean(item.checked)} readOnly className="w-4 h-4 rounded" />
                      <span className={item.checked ? 'line-through text-stone-400' : 'font-semibold text-stone-900'}>
                        {item.name}
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-200/70 text-stone-700">
                      {item.category}
                    </span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleQuickAddGrocery} className="pt-3 border-t border-stone-100 flex gap-2 text-xs">
                <input
                  type="text"
                  value={newGroceryName}
                  onChange={(e) => setNewGroceryName(e.target.value)}
                  placeholder="Add grocery item..."
                  className="flex-1 px-3 py-1.5 rounded-xl border border-stone-300"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-[#173D35] text-white font-bold cursor-pointer"
                >
                  + Add
                </button>
              </form>
            </div>

            {/* Chores & Responsibility Points Widget */}
            <div className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-900">Household Chores & Points</h3>
                  <p className="text-xs text-stone-500">Complete chores to award member points</p>
                </div>
                <Award className="w-5 h-5 text-[#C39A60]" />
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto text-xs">
                {houseChores.map((c: any) => (
                  <div key={c.id} className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-2">
                    <div>
                      <span className={`font-bold block ${c.status === 'COMPLETED' ? 'line-through text-stone-400' : 'text-stone-900'}`}>
                        {c.title}
                      </span>
                      <span className="text-[11px] text-stone-500">
                        Assigned: {c.assignedToName || c.assignedTo} · +{c.points || 15} pts
                      </span>
                    </div>
                    {c.status === 'COMPLETED' ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[10px]">
                        ✓ Done
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCompleteChore(c.id, c.title)}
                        className="px-3 py-1.5 rounded-xl bg-[#173D35] hover:bg-emerald-950 text-white font-semibold cursor-pointer shrink-0"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          DASHBOARD 3: GOALS & PROJECT DASHBOARD (home_goals_dashboard)
         ==================================================================== */}
      {activeDashboardId === 'home_goals_dashboard' && (
        <div className="space-y-6">
          {/* KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: 'Strategic Family Goals',
                value: `${(planningState?.goals || workspaceData?.homeSummary?.goalProgress || []).length} Active`,
                sub: 'Long & Short-Term Ambitions',
                subId: 'plan_goals',
              },
              {
                label: 'Active Household Projects',
                value: `${(planningState?.projects || []).length || 3} Projects`,
                sub: 'Milestones & Budgets',
                subId: 'plan_projects',
              },
              {
                label: 'Priority Action Tasks',
                value: `${(planningState?.tasks || workspaceData?.homeSummary?.priorityTasks || []).filter((t: any) => !t.isCompleted).length} Open`,
                sub: 'Assigned Across Family',
                subId: 'plan_tasks',
              },
              {
                label: 'Family Reward Points',
                value: `${(workspaceData?.members || []).reduce((acc: number, m: any) => acc + (m.pointsBalance || 0), 0)} Pts`,
                sub: 'Earned by Household',
                subId: 'plan_rewards',
              },
            ].map((kpi, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onNavigateModule('planning_execution', kpi.subId)}
                className="p-5 rounded-3xl bg-white border border-stone-200 shadow-2xs text-left hover:border-emerald-800/50 transition-all cursor-pointer"
              >
                <span className="text-xs text-stone-500 block">{kpi.label}</span>
                <span className="text-xl font-serif font-bold text-stone-900 block mt-1">{kpi.value}</span>
                <span className="text-[11px] text-emerald-800 font-semibold block mt-1">{kpi.sub} &rarr;</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Strategic Family Goals Widget */}
            <div className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-900">Strategic Family Goals</h3>
                  <p className="text-xs text-stone-500">Update milestone progress directly from Home</p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateModule('planning_execution', 'plan_goals')}
                  className="text-xs font-bold text-emerald-900 hover:underline cursor-pointer"
                >
                  Open Goals Hierarchy &rarr;
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {(planningState?.goals || workspaceData?.homeSummary?.goalProgress || []).map((g: any) => {
                  const pct = Number(g.progressPercentage ?? g.progressPercent ?? 50);
                  return (
                    <div key={g.id} className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-900 text-sm">{g.title}</span>
                        <span className="font-mono font-bold text-emerald-900">{pct}%</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-stone-200 overflow-hidden">
                        <div className="h-full rounded-full bg-[#173D35]" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-stone-500">
                          {g.scope || g.category || 'FAMILY'} · Target: {g.targetDate || '2026'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleQuickGoalProgress(g, 10)}
                            className="px-2.5 py-1 rounded-lg bg-[#173D35] text-white font-semibold cursor-pointer"
                          >
                            +10% Progress
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleQuickCreateGoal} className="pt-3 border-t border-stone-100 flex gap-2 text-xs">
                <input
                  type="text"
                  value={quickGoalTitle}
                  onChange={(e) => setQuickGoalTitle(e.target.value)}
                  placeholder="Create new family goal..."
                  className="flex-1 px-3 py-2 rounded-xl border border-stone-300"
                />
                <select
                  value={quickGoalCategory}
                  onChange={(e) => setQuickGoalCategory(e.target.value)}
                  className="px-2.5 py-2 rounded-xl border border-stone-300 bg-white"
                >
                  <option value="FAMILY">Family</option>
                  <option value="COUPLE">Couple</option>
                  <option value="PERSONAL">Personal</option>
                </select>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#173D35] text-white font-bold cursor-pointer"
                >
                  + Goal
                </button>
              </form>
            </div>

            {/* Active Projects & Priority Tasks Widget */}
            <div className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-900">Action Tasks & Project Execution</h3>
                  <p className="text-xs text-stone-500">Check off tasks or dispatch a new household priority</p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateModule('planning_execution', 'plan_tasks')}
                  className="text-xs font-bold text-emerald-900 hover:underline cursor-pointer"
                >
                  Task Center &rarr;
                </button>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto text-xs">
                {(planningState?.tasks || workspaceData?.homeSummary?.priorityTasks || []).slice(0, 7).map((t: any) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center space-x-2.5">
                      <input
                        type="checkbox"
                        checked={Boolean(t.isCompleted)}
                        onChange={() => handleTogglePlanningTask(t)}
                        className="w-4 h-4 rounded cursor-pointer"
                      />
                      <div>
                        <span className={`font-bold block ${t.isCompleted ? 'line-through text-stone-400' : 'text-stone-900'}`}>
                          {t.title}
                        </span>
                        <span className="text-[11px] text-stone-500">
                          Priority: {t.priority} · Assigned: {t.assignedToName || 'Household'}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-950 font-mono font-bold text-[10px]">
                      +{t.rewardPoints || 15} pts
                    </span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleQuickCreateTask} className="pt-3 border-t border-stone-100 flex gap-2 text-xs">
                <input
                  type="text"
                  value={quickTaskTitle}
                  onChange={(e) => setQuickTaskTitle(e.target.value)}
                  placeholder="Dispatch new priority task..."
                  className="flex-1 px-3 py-2 rounded-xl border border-stone-300"
                />
                <select
                  value={quickTaskPriority}
                  onChange={(e) => setQuickTaskPriority(e.target.value as any)}
                  className="px-2.5 py-2 rounded-xl border border-stone-300 bg-white"
                >
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                  <option value="MEDIUM">Medium</option>
                </select>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#173D35] text-white font-bold cursor-pointer"
                >
                  + Task
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          DASHBOARD 4: RELATIONSHIP DASHBOARD (home_relationship_dashboard)
         ==================================================================== */}
      {activeDashboardId === 'home_relationship_dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Emotional Check-Ins', value: `${relCheckIns.length} Logged`, sub: 'Weekly Connection Pulse', subId: 'rel_checkins' },
              { label: 'Gratitude Wall', value: `${relGratitude.length} Notes`, sub: 'Family Appreciation', subId: 'rel_appreciation' },
              { label: 'Couple Connection', value: 'Friday Date Night', sub: 'Weekly Ritual Active', subId: 'rel_couple' },
              { label: 'Family Council', value: 'Sunday 6:00 PM', sub: 'Communication & Decisions', subId: 'rel_communication' },
            ].map((kpi, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onNavigateModule('relationships', kpi.subId)}
                className="p-5 rounded-3xl bg-white border border-stone-200 shadow-2xs text-left hover:border-emerald-800/50 transition-all cursor-pointer"
              >
                <span className="text-xs text-stone-500 block">{kpi.label}</span>
                <span className="text-xl font-serif font-bold text-stone-900 block mt-1">{kpi.value}</span>
                <span className="text-[11px] text-emerald-800 font-semibold block mt-1">{kpi.sub} &rarr;</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Relationship Check-In Widget */}
            <div className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-900">Family Emotional & Connection Check-Ins</h3>
                  <p className="text-xs text-stone-500">Share how you’re feeling and how the family can support you</p>
                </div>
                <Heart className="w-5 h-5 text-rose-600" />
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto text-xs">
                {relCheckIns.map((c) => (
                  <div key={c.id} className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900">{c.memberName}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[10px]">
                        {c.mood} · Energy {c.energyScore}/10
                      </span>
                    </div>
                    <p className="text-stone-600">{c.note}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddCheckIn} className="pt-3 border-t border-stone-100 space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newCheckInMood}
                    onChange={(e) => setNewCheckInMood(e.target.value)}
                    className="px-2.5 py-2 rounded-xl border border-stone-300 bg-white"
                  >
                    <option value="Grateful & Connected">Grateful & Connected</option>
                    <option value="Energized & Happy">Energized & Happy</option>
                    <option value="Calm & Focused">Calm & Focused</option>
                    <option value="Tired — Need Quiet Evening">Tired — Need Quiet Evening</option>
                  </select>
                  <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-stone-300 bg-stone-50">
                    <span className="font-semibold text-stone-700">Energy:</span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={newCheckInEnergy}
                      onChange={(e) => setNewCheckInEnergy(Number(e.target.value))}
                      className="w-12 font-mono font-bold text-stone-900 bg-transparent"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCheckInNote}
                    onChange={(e) => setNewCheckInNote(e.target.value)}
                    placeholder="Share a quick reflection with the family..."
                    className="flex-1 px-3 py-2 rounded-xl border border-stone-300"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#173D35] text-white font-bold cursor-pointer"
                  >
                    Check In
                  </button>
                </div>
              </form>
            </div>

            {/* Gratitude & Appreciation Wall Widget */}
            <div className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-900">Gratitude & Appreciation Wall</h3>
                  <p className="text-xs text-stone-500">Celebrate kindness and everyday effort across the household</p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateModule('relationships', 'rel_appreciation')}
                  className="text-xs font-bold text-emerald-900 hover:underline cursor-pointer"
                >
                  Full Wall &rarr;
                </button>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto text-xs">
                {relGratitude.map((g) => (
                  <div key={g.id} className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900">
                        From {g.from} &rarr; To {g.to}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = relGratitude.map((item) =>
                            item.id === g.id ? { ...item, likes: (item.likes || 1) + 1 } : item
                          );
                          setRelGratitude(updated);
                          localStorage.setItem('familyos_rel_gratitude_v1', JSON.stringify(updated));
                        }}
                        className="px-2.5 py-0.5 rounded-full bg-white border border-amber-300 text-amber-950 font-bold cursor-pointer"
                      >
                        👏 {g.likes || 1}
                      </button>
                    </div>
                    <p className="text-stone-700 leading-relaxed">“{g.message}”</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddGratitude} className="pt-3 border-t border-stone-100 space-y-2 text-xs">
                <div className="flex gap-2">
                  <select
                    value={newGratitudeTo}
                    onChange={(e) => setNewGratitudeTo(e.target.value)}
                    className="px-2.5 py-2 rounded-xl border border-stone-300 bg-white"
                  >
                    <option value="Sarah Jenkins">To: Sarah</option>
                    <option value="David Jenkins">To: David</option>
                    <option value="Maya Jenkins">To: Maya</option>
                    <option value="Lucas Jenkins">To: Lucas</option>
                    <option value="Whole Family">To: Whole Family</option>
                  </select>
                  <input
                    type="text"
                    value={newGratitudeMsg}
                    onChange={(e) => setNewGratitudeMsg(e.target.value)}
                    placeholder="Write an appreciation note..."
                    className="flex-1 px-3 py-2 rounded-xl border border-stone-300"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#C39A60] text-[#173D35] font-bold cursor-pointer"
                  >
                    Post
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          DASHBOARD 5: PARENTING & GROWTH DASHBOARD (home_parenting_dashboard)
         ==================================================================== */}
      {activeDashboardId === 'home_parenting_dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Child Milestones', value: `${childMilestones.length} Recorded`, sub: 'Maya (15) & Lucas (9)', subId: 'parent_profiles' },
              { label: 'Children’s Routines', value: `${childRoutines.filter((r) => r.completedToday).length}/${childRoutines.length} Done`, sub: 'Morning & Bedtime', subId: 'parent_routines' },
              { label: 'Healthy Habit Streaks', value: `${Math.max(...growthHabits.map((h) => h.streak))} Day Best`, sub: 'Family Wellbeing', subId: 'parent_wellbeing' },
              { label: 'Micro-Learning Library', value: '6 Guides Ready', sub: '5-Min Parenting Modules', subId: 'parent_micro' },
            ].map((kpi, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onNavigateModule('parenting_growth', kpi.subId)}
                className="p-5 rounded-3xl bg-white border border-stone-200 shadow-2xs text-left hover:border-emerald-800/50 transition-all cursor-pointer"
              >
                <span className="text-xs text-stone-500 block">{kpi.label}</span>
                <span className="text-xl font-serif font-bold text-stone-900 block mt-1">{kpi.value}</span>
                <span className="text-[11px] text-emerald-800 font-semibold block mt-1">{kpi.sub} &rarr;</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Child Routines Interactive Checklist */}
            <div className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-900">Children’s Daily Routines</h3>
                  <p className="text-xs text-stone-500">Toggle completion & build consistency streaks</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-800" />
              </div>

              <div className="space-y-2.5 text-xs">
                {childRoutines.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => handleToggleChildRoutine(r.id)}
                    className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-2 cursor-pointer hover:bg-stone-100"
                  >
                    <div className="flex items-center space-x-2.5">
                      <input type="checkbox" checked={r.completedToday} readOnly className="w-4 h-4 rounded" />
                      <div>
                        <span className={`font-bold block ${r.completedToday ? 'line-through text-stone-400' : 'text-stone-900'}`}>
                          {r.title}
                        </span>
                        <span className="text-[11px] text-stone-500">
                          {r.childName} · {r.timeOfDay}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-950 font-mono font-bold text-[10px] shrink-0">
                      🔥 {r.streakDays}d
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Child Milestones Logger */}
            <div className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-900">Child Profiles & Milestones</h3>
                  <p className="text-xs text-stone-500">Capture academic, creative & growth wins</p>
                </div>
                <BookOpen className="w-5 h-5 text-emerald-800" />
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto text-xs">
                {childMilestones.map((m) => (
                  <div key={m.id} className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-950">{m.child}</span>
                      <span className="text-[10px] text-stone-500">{m.date}</span>
                    </div>
                    <p className="text-stone-700">{m.milestone}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddChildMilestone} className="pt-3 border-t border-stone-100 space-y-2 text-xs">
                <select
                  value={newMilestoneChild}
                  onChange={(e) => setNewMilestoneChild(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white"
                >
                  <option value="Lucas Jenkins (Age 9)">Lucas Jenkins (Age 9)</option>
                  <option value="Maya Jenkins (Age 15)">Maya Jenkins (Age 15)</option>
                </select>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMilestoneNote}
                    onChange={(e) => setNewMilestoneNote(e.target.value)}
                    placeholder="Record new milestone..."
                    className="flex-1 px-3 py-1.5 rounded-xl border border-stone-300"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-xl bg-[#173D35] text-white font-bold cursor-pointer"
                  >
                    + Save
                  </button>
                </div>
              </form>
            </div>

            {/* Wellbeing & Habit Streaks */}
            <div className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-900">Wellbeing & Habit Streaks</h3>
                  <p className="text-xs text-stone-500">Daily intentional habits for parents & kids</p>
                </div>
                <TrendingUp className="w-5 h-5 text-emerald-800" />
              </div>

              <div className="space-y-2.5 text-xs">
                {growthHabits.map((h) => (
                  <div key={h.id} className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-stone-900 block">{h.title}</span>
                      <span className="text-[11px] text-stone-500">
                        {h.owner} · {h.target}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleIncrementHabitStreak(h.id)}
                      className="px-3 py-1.5 rounded-xl bg-[#173D35] hover:bg-emerald-950 text-white font-mono font-bold cursor-pointer shrink-0"
                    >
                      🔥 {h.streak}d (+1)
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          DASHBOARD 6: LIFE MANAGEMENT DASHBOARD (home_life_dashboard)
         ==================================================================== */}
      {activeDashboardId === 'home_life_dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Important Documents', value: `${lifeDocs.length} Vault Records`, sub: `${lifeDocs.filter((d) => d.status === 'EXPIRING_SOON').length} Renewal Alert`, subId: 'life_docs' },
              { label: 'Personal Admin Tasks', value: `${personalAdminTasks.filter((t) => !t.done).length} Pending`, sub: 'Life Organization', subId: 'life_organization' },
              { label: 'Vehicle Fleet', value: `${lifeVehicles.length} Vehicles`, sub: 'Service & Registration', subId: 'life_vehicles' },
              { label: 'Travel & Estate Readiness', value: '95% Prepared', sub: 'Trips & Emergency Contacts', subId: 'life_travel' },
            ].map((kpi, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onNavigateModule('life_records', kpi.subId)}
                className="p-5 rounded-3xl bg-white border border-stone-200 shadow-2xs text-left hover:border-emerald-800/50 transition-all cursor-pointer"
              >
                <span className="text-xs text-stone-500 block">{kpi.label}</span>
                <span className="text-xl font-serif font-bold text-stone-900 block mt-1">{kpi.value}</span>
                <span className="text-[11px] text-emerald-800 font-semibold block mt-1">{kpi.sub} &rarr;</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Document Vault & Renewal Alerts */}
            <div className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-900">Important Documents Vault</h3>
                  <p className="text-xs text-stone-500">Passports, policies, legal records & expiry tracking</p>
                </div>
                <FileText className="w-5 h-5 text-emerald-800" />
              </div>

              <div className="space-y-2.5 text-xs">
                {lifeDocs.map((doc) => (
                  <div key={doc.id} className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900">{doc.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          doc.status === 'EXPIRING_SOON'
                            ? 'bg-amber-100 text-amber-950'
                            : 'bg-emerald-100 text-emerald-900'
                        }`}
                      >
                        {doc.status === 'EXPIRING_SOON' ? 'Expiring Soon' : 'Verified'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-stone-500">
                      <span>{doc.category} · Exp: {doc.expiryDate}</span>
                      {doc.status === 'EXPIRING_SOON' && (
                        <button
                          type="button"
                          onClick={() => handleRenewDocument(doc.id)}
                          className="px-2.5 py-1 rounded-lg bg-[#173D35] text-white font-semibold cursor-pointer"
                        >
                          Mark Renewed
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Personal Admin & Life Organization Checklist */}
            <div className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-900">Personal Organization & Admin</h3>
                  <p className="text-xs text-stone-500">Track paperwork, renewals & life logistics</p>
                </div>
                <Shield className="w-5 h-5 text-emerald-800" />
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto text-xs">
                {personalAdminTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handleToggleLifeTask(t.id)}
                    className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between cursor-pointer hover:bg-stone-100"
                  >
                    <div className="flex items-center space-x-2.5">
                      <input type="checkbox" checked={t.done} readOnly className="w-4 h-4 rounded" />
                      <span className={t.done ? 'line-through text-stone-400' : 'font-semibold text-stone-900'}>
                        {t.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-500">{t.category}</span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddLifeTask} className="pt-3 border-t border-stone-100 flex gap-2 text-xs">
                <input
                  type="text"
                  value={newLifeTaskTitle}
                  onChange={(e) => setNewLifeTaskTitle(e.target.value)}
                  placeholder="Add life admin item..."
                  className="flex-1 px-3 py-1.5 rounded-xl border border-stone-300"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-[#173D35] text-white font-bold cursor-pointer"
                >
                  + Add
                </button>
              </form>
            </div>

            {/* Vehicle Fleet & Emergency Readiness */}
            <div className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-900">Vehicle Fleet & Travel Readiness</h3>
                  <p className="text-xs text-stone-500">Odometer, service logs & emergency contacts</p>
                </div>
                <Car className="w-5 h-5 text-emerald-800" />
              </div>

              <div className="space-y-2.5 text-xs">
                {lifeVehicles.map((v) => (
                  <div key={v.id} className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900">{v.name}</span>
                      <span className="font-mono text-[11px] font-bold text-emerald-900">
                        {v.mileage.toLocaleString()} mi
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-stone-500">
                      <span>{v.nextService}</span>
                      <button
                        type="button"
                        onClick={() => handleLogVehicleService(v.id)}
                        className="px-2.5 py-1 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-900 font-semibold cursor-pointer"
                      >
                        + Log Service
                      </button>
                    </div>
                  </div>
                ))}

                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <Phone className="w-4 h-4 text-emerald-900 shrink-0" />
                    <div>
                      <span className="font-bold text-emerald-950 block">Emergency & Medical Contacts</span>
                      <span className="text-[11px] text-emerald-800">Pediatrician, Poison Control, Nearest ER</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateModule('life_records', 'life_contacts')}
                    className="text-xs font-bold text-emerald-950 hover:underline cursor-pointer"
                  >
                    Open &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
