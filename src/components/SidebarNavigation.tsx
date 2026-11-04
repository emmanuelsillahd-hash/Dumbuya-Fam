import React, { useState } from 'react';
import {
  Compass,
  Users,
  FolderTree,
  Calendar,
  Utensils,
  DollarSign,
  Shield,
  ChevronDown,
  ChevronRight,
  X,
  Heart,
  ChevronLeft,
  BookOpen,
  LogOut,
  UserCog,
  Database,
  Star,
  Sparkles,
  Pin,
  Sliders,
} from 'lucide-react';

export type MainTabType =
  | 'family_home'
  | 'family_presence'
  | 'people_relationships'
  | 'planning_execution'
  | 'calendar_routines'
  | 'household_hub'
  | 'finance_hub'
  | 'relationships'
  | 'parenting_growth'
  | 'life_records'
  | 'stage3'
  | 'stage2'
  | 'overview'
  | 'database'
  | 'rbac'
  | 'finance'
  | 'sync'
  | 'tests'
  | 'docs'
  | 'user_profile'
  | 'general_settings'
  | 'admin_settings';

export interface SidebarNavigationProps {
  activeTab: MainTabType;
  onSelectTab: (tab: MainTabType) => void;
  activeSubItemId?: string;
  onSelectSubItem?: (parentTab: MainTabType, subItemId: string, subTabId?: MainTabType) => void;
  selectedRole: string;
  onSelectRole: (role: string) => void;
  stage3SubTab?: 'finance' | 'wellbeing' | 'emergency';
  onSelectStage3SubTab?: (subTab: 'finance' | 'wellbeing' | 'emergency') => void;
  stage2SubTab?: 'tree' | 'goals' | 'meals' | 'chores' | 'assets' | 'calendar';
  onSelectStage2SubTab?: (subTab: 'tree' | 'goals' | 'meals' | 'chores' | 'assets' | 'calendar') => void;
  authStatusText?: string;
  isMobileOpen: boolean;
  onToggleMobile: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onLogout?: () => void;
  actorDisplayName?: string;
  actorRoleLabel?: string;
  actorAvatar?: string;
  familyLogoUrl?: string;
  themeColors?: {
    primary: string;
    primaryDark: string;
    primaryDeep: string;
    accent: string;
    accentLight: string;
  };
}

const USER_PROFILES: Record<string, { name: string; roleLabel: string; avatar: string }> = {
  OWNER: {
    name: 'Sarah Jenkins',
    roleLabel: 'Owner / Parent Head',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  },
  ADMIN: {
    name: 'David Jenkins',
    roleLabel: 'Admin / Co-Parent',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  },
  MEMBER: {
    name: 'Maya Jenkins',
    roleLabel: 'Member / Teen',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
  },
  CHILD: {
    name: 'Lucas Jenkins',
    roleLabel: 'Child / Minor',
    avatar: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?auto=format&fit=crop&w=200&q=80',
  },
  GUEST: {
    name: 'Martha Vance',
    roleLabel: 'Guest / Caregiver',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
  },
};

export interface SidebarMenuItem {
  id: MainTabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  subitems?: Array<{ id: string; label: string; tabId?: MainTabType }>;
}

export interface PinnedFavoriteItem {
  parentTab: MainTabType;
  subId: string;
  label: string;
  tabId?: MainTabType;
}

const DEFAULT_PINNED_FAVORITES: PinnedFavoriteItem[] = [
  { parentTab: 'household_hub', subId: 'house_groceries', label: 'Smart Grocery List' },
  { parentTab: 'household_hub', subId: 'house_meals', label: '7-Day Meal Planner' },
  { parentTab: 'calendar_routines', subId: 'cal_schedule', label: 'Master Calendar' },
  { parentTab: 'people_relationships', subId: 'people_gallery', label: 'Family Gallery' },
];

export const CATEGORY_1_CORE_ITEMS: SidebarMenuItem[] = [
  {
    id: 'family_home',
    label: 'Home',
    icon: Compass,
    badge: 'Dashboards',
    subitems: [
      { id: 'home_command_center', label: 'Main Command Center', tabId: 'family_home' },
      { id: 'home_finance_dashboard', label: 'Finance Dashboard', tabId: 'family_home' },
      { id: 'home_house_dashboard', label: 'Household Dashboard', tabId: 'family_home' },
      { id: 'home_goals_dashboard', label: 'Goals & Projects Dashboard', tabId: 'family_home' },
      { id: 'home_relationship_dashboard', label: 'Relationship Dashboard', tabId: 'family_home' },
      { id: 'home_parenting_dashboard', label: 'Parenting & Growth Dashboard', tabId: 'family_home' },
      { id: 'home_life_dashboard', label: 'Life Management Dashboard', tabId: 'family_home' },
    ],
  },
  {
    id: 'people_relationships',
    label: 'Family',
    icon: Users,
    badge: 'Heritage',
    subitems: [
      { id: 'home_overview', label: 'Family Home Overview', tabId: 'people_relationships' },
      { id: 'people_gallery', label: 'Family Gallery', tabId: 'people_relationships' },
      { id: 'home_constitution', label: 'Family Constitution', tabId: 'people_relationships' },
      { id: 'people_traditions', label: 'Family Traditions & Culture', tabId: 'people_relationships' },
      { id: 'people_activities', label: 'Shared Activities', tabId: 'people_relationships' },
      { id: 'people_rules', label: 'Family Rules & Principles', tabId: 'people_relationships' },
    ],
  },
];

const CATEGORY_2_PLANNER_FINANCE_ITEMS: SidebarMenuItem[] = [
  {
    id: 'calendar_routines',
    label: 'Planner',
    icon: Calendar,
    badge: 'Schedules',
    subitems: [
      { id: 'cal_schedule', label: 'Master Family Calendar' },
      { id: 'cal_events', label: 'Shared Events & Milestones' },
      { id: 'cal_routines', label: 'Daily Routines & Habits' },
      { id: 'cal_synced', label: 'Synced Household Calendar' },
    ],
  },
  {
    id: 'finance_hub',
    label: 'Money',
    icon: DollarSign,
    badge: 'Finances',
    subitems: [
      { id: 'fin_accounts', label: 'Accounts & Cash Flow' },
      { id: 'fin_transactions', label: 'Income & Expense Ledger' },
      { id: 'fin_budgets', label: 'Envelope Budgets' },
      { id: 'fin_savings', label: 'Savings & Reserves' },
      { id: 'fin_recurring', label: 'Recurring Bills & Subscriptions' },
      { id: 'fin_investments', label: 'Household Net Worth' },
    ],
  },
];

const CATEGORY_3_OPERATIONS_ITEMS: SidebarMenuItem[] = [
  {
    id: 'household_hub',
    label: 'Household',
    icon: Utensils,
    badge: 'Operations',
    subitems: [
      { id: 'house_meals', label: '7-Day Meal Planner' },
      { id: 'house_recipes', label: 'Recipe Collection' },
      { id: 'house_pantry', label: 'Pantry & Expiry Tracking' },
      { id: 'house_groceries', label: 'Smart Grocery List' },
      { id: 'house_chores', label: 'Chores & Responsibility Points' },
      { id: 'house_wardrobe', label: 'Wardrobe & Outfits' },
      { id: 'house_assets', label: 'Home Assets & Maintenance' },
    ],
  },
  {
    id: 'planning_execution',
    label: 'Goals & Projects',
    icon: FolderTree,
    badge: 'Ambitions',
    subitems: [
      { id: 'plan_goals', label: 'Strategic Family Goals' },
      { id: 'plan_projects', label: 'Active Household Projects' },
      { id: 'plan_tasks', label: 'Action Tasks & Milestones' },
      { id: 'plan_rewards', label: 'Achievement & Reward Points' },
    ],
  },
];

const CATEGORY_4_LIFE_SYSTEM_ITEMS: SidebarMenuItem[] = [
  {
    id: 'relationships',
    label: 'Relationships',
    icon: Heart,
    badge: 'Connection',
    subitems: [
      { id: 'rel_checkins', label: 'Relationship Check-ins' },
      { id: 'rel_appreciation', label: 'Gratitude & Appreciation Wall' },
      { id: 'rel_couple', label: 'Couple Connection' },
      { id: 'rel_communication', label: 'Family Communication & Meetings' },
      { id: 'rel_experiences', label: 'Shared Experiences & Memories' },
      { id: 'rel_reflection', label: 'Constructive Reflection' },
    ],
  },
  {
    id: 'parenting_growth',
    label: 'Parenting & Growth',
    icon: BookOpen,
    badge: 'Growth',
    subitems: [
      { id: 'parent_resources', label: 'Parenting Resources' },
      { id: 'parent_profiles', label: 'Child Profiles & Milestones' },
      { id: 'parent_routines', label: 'Children’s Routines' },
      { id: 'parent_education', label: 'Education & Learning' },
      { id: 'parent_personal', label: 'Personal Development' },
      { id: 'parent_micro', label: 'Micro-Learning Library' },
      { id: 'parent_wellbeing', label: 'Wellbeing & Healthy Habits' },
      { id: 'parent_family_learning', label: 'Family Learning & Curricula' },
    ],
  },
  {
    id: 'life_records',
    label: 'Life Management',
    icon: Shield,
    badge: 'Records',
    subitems: [
      { id: 'life_dashboard', label: 'Personal Dashboard' },
      { id: 'life_docs', label: 'Important Documents & Records' },
      { id: 'life_organization', label: 'Personal Organization' },
      { id: 'life_contacts', label: 'Important & Emergency Contacts' },
      { id: 'life_travel', label: 'Travel & Holiday Planning' },
      { id: 'life_vehicles', label: 'Vehicle Management' },
      { id: 'life_longterm', label: 'Long-Term Family Planning' },
    ],
  },
  {
    id: 'general_settings',
    label: 'General Settings',
    icon: Sliders,
    badge: 'System',
    subitems: [
      { id: 'general_settings', label: 'Preferences & Diagnostics', tabId: 'general_settings' },
    ],
  },
  {
    id: 'admin_settings',
    label: 'Admin Settings',
    icon: Shield,
    badge: 'Governance',
    subitems: [
      { id: 'admin_settings', label: 'Admin Settings & Security Hub', tabId: 'admin_settings' },
    ],
  },
];

export const DEFAULT_SUBITEM_BY_TAB: Record<string, string> = {
  family_home: 'home_command_center',
  people_relationships: 'home_overview',
  calendar_routines: 'cal_schedule',
  finance_hub: 'fin_accounts',
  household_hub: 'house_meals',
  planning_execution: 'plan_goals',
  relationships: 'rel_checkins',
  parenting_growth: 'parent_resources',
  life_records: 'life_dashboard',
  database: 'db_all',
  general_settings: 'general_settings',
  admin_settings: 'admin_settings',
};

export const SUBITEM_LABELS: Record<string, string> = {
  home_command_center: 'Home — Main Command Center',
  home_finance_dashboard: 'Home — Finance Dashboard',
  home_house_dashboard: 'Home — Household Dashboard',
  home_goals_dashboard: 'Home — Goals & Projects Dashboard',
  home_relationship_dashboard: 'Home — Relationship Dashboard',
  home_parenting_dashboard: 'Home — Parenting & Growth Dashboard',
  home_life_dashboard: 'Home — Life Management Dashboard',
  home_overview: 'Family — Family Home Overview',
  people_gallery: 'Family — Family Gallery',
  home_constitution: 'Family — Family Constitution',
  people_traditions: 'Family — Family Traditions & Culture',
  people_activities: 'Family — Shared Activities',
  people_rules: 'Family — Family Rules & Principles',
  cal_schedule: 'Planner — Master Family Calendar',
  cal_events: 'Planner — Shared Events & Milestones',
  cal_routines: 'Planner — Daily Routines & Habits',
  cal_synced: 'Planner — Synced Household Calendar',
  fin_accounts: 'Money — Accounts & Cash Flow',
  fin_transactions: 'Money — Income & Expense Ledger',
  fin_budgets: 'Money — Envelope Budgets',
  fin_savings: 'Money — Savings & Reserves',
  fin_recurring: 'Money — Recurring Bills & Subscriptions',
  fin_investments: 'Money — Household Net Worth',
  house_meals: 'Household — 7-Day Meal Planner',
  house_recipes: 'Household — Recipe Collection',
  house_pantry: 'Household — Pantry & Expiry Tracking',
  house_groceries: 'Household — Smart Grocery List',
  house_chores: 'Household — Chores & Responsibility Points',
  house_wardrobe: 'Household — Wardrobe & Outfits',
  house_assets: 'Household — Home Assets & Maintenance',
  plan_goals: 'Goals & Projects — Strategic Family Goals',
  plan_projects: 'Goals & Projects — Active Household Projects',
  plan_tasks: 'Goals & Projects — Action Tasks & Milestones',
  plan_rewards: 'Goals & Projects — Achievement & Reward Points',
  rel_checkins: 'Relationships — Relationship Check-ins',
  rel_appreciation: 'Relationships — Gratitude & Appreciation Wall',
  rel_couple: 'Relationships — Couple Connection',
  rel_communication: 'Relationships — Family Communication & Meetings',
  rel_experiences: 'Relationships — Shared Experiences & Memories',
  rel_reflection: 'Relationships — Constructive Reflection',
  parent_resources: 'Parenting & Growth — Parenting Resources',
  parent_profiles: 'Parenting & Growth — Child Profiles & Milestones',
  parent_routines: 'Parenting & Growth — Children’s Routines',
  parent_education: 'Parenting & Growth — Education & Learning',
  parent_personal: 'Parenting & Growth — Personal Development',
  parent_micro: 'Parenting & Growth — Micro-Learning Library',
  parent_wellbeing: 'Parenting & Growth — Wellbeing & Healthy Habits',
  parent_family_learning: 'Parenting & Growth — Family Learning & Curricula',
  life_dashboard: 'Life Management — Personal Dashboard',
  life_docs: 'Life Management — Important Documents & Records',
  life_organization: 'Life Management — Personal Organization',
  life_contacts: 'Life Management — Important & Emergency Contacts',
  life_travel: 'Life Management — Travel & Holiday Planning',
  life_vehicles: 'Life Management — Vehicle Management',
  life_longterm: 'Life Management — Long-Term Family Planning',
  db_all: 'Database Studio — All Databases & Tables',
  db_governance: 'Database Studio — Core Governance DB',
  db_finance: 'Database Studio — Financial Stewardship DB',
  db_household: 'Database Studio — Household Operations DB',
  db_planner: 'Database Studio — Planner & Routines DB',
  db_goals: 'Database Studio — Goals & Projects DB',
  db_relationships: 'Database Studio — Relationships DB',
  db_parenting: 'Database Studio — Parenting & Growth DB',
  db_life: 'Database Studio — Life Management DB',
  db_sync: 'Database Studio — Raw Synchronized Entities',
  general_settings: 'General Settings — System Preferences & Diagnostics',
  admin_settings: 'Admin Settings — Governance, RBAC & Security Hub',
};

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  activeTab,
  onSelectTab,
  activeSubItemId,
  onSelectSubItem,
  selectedRole,
  onSelectRole,
  isMobileOpen,
  onToggleMobile,
  isCollapsed: controlledIsCollapsed,
  onToggleCollapse,
  onLogout,
  actorDisplayName,
  actorRoleLabel,
  actorAvatar,
  familyLogoUrl,
  themeColors,
}) => {
  const [internalIsCollapsed, setInternalIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      return false; // Desktop view expanded by default
    }
    return true;
  });
  const [isHoverExpanded, setIsHoverExpanded] = useState<boolean>(false);
  const isCollapsed = controlledIsCollapsed !== undefined ? controlledIsCollapsed : internalIsCollapsed;
  const effectiveCollapsed = isCollapsed && !isHoverExpanded;

  const handleToggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalIsCollapsed(!internalIsCollapsed);
    }
  };

  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    core: true,
    planner: true,
    operations: true,
    life: true,
  });

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [showRoleDropdown, setShowRoleDropdown] = useState<boolean>(false);

  const [pinnedFavorites, setPinnedFavorites] = useState<PinnedFavoriteItem[]>(() => {
    try {
      const saved = localStorage.getItem('familyos_pinned_favorites');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return DEFAULT_PINNED_FAVORITES;
  });

  const togglePinFavorite = (parentTab: MainTabType, subId: string, label: string, tabId?: MainTabType) => {
    setPinnedFavorites((prev) => {
      const exists = prev.some((f) => f.subId === subId);
      let next: PinnedFavoriteItem[];
      if (exists) {
        next = prev.filter((f) => f.subId !== subId);
      } else {
        next = [...prev, { parentTab, subId, label, tabId }];
      }
      try {
        localStorage.setItem('familyos_pinned_favorites', JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const toggleCategory = (catKey: string) => {
    setOpenCategories((prev) => ({ ...prev, [catKey]: !prev[catKey] }));
  };

  const toggleSubmenu = (itemId: string) => {
    setExpandedItems((prev) => {
      const isCurrentlyOpen = !!prev[itemId];
      if (isCurrentlyOpen) {
        return {};
      } else {
        return { [itemId]: true };
      }
    });
  };

  const handleTabClick = (tab: MainTabType) => {
    onSelectTab(tab);
    if (isMobileOpen) {
      onToggleMobile();
    }
  };

  const handleSubItemClick = (parentTab: MainTabType, subId: string, subTabId?: MainTabType) => {
    if (onSelectSubItem) {
      onSelectSubItem(parentTab, subId, subTabId);
    } else {
      onSelectTab(subTabId || parentTab);
    }
    if (isMobileOpen) {
      onToggleMobile();
    }
  };

  const fallbackUser = USER_PROFILES[selectedRole] || USER_PROFILES.OWNER;
  const currentUser = {
    name: actorDisplayName || fallbackUser.name,
    roleLabel: actorRoleLabel || fallbackUser.roleLabel,
    avatar: actorAvatar || fallbackUser.avatar,
  };

  const renderMenuItem = (item: SidebarMenuItem) => {
    const Icon = item.icon;
    const isActive =
      activeTab === item.id ||
      Boolean(item.subitems && item.subitems.some((sub) => sub.tabId === activeTab));
    const hasSubitems = Boolean(item.subitems && item.subitems.length > 0);
    const isMenuExpanded = Boolean(expandedItems[item.id]);

    return (
      <div key={item.id} className="space-y-1 relative">
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setExpandedItems({ [item.id]: true });
            if (item.subitems && item.subitems.length > 0 && onSelectSubItem) {
              const firstSub = item.subitems[0];
              onSelectSubItem(item.id, firstSub.id, firstSub.tabId);
              if (isMobileOpen) onToggleMobile();
            } else {
              handleTabClick(item.id);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setExpandedItems({ [item.id]: true });
              if (item.subitems && item.subitems.length > 0 && onSelectSubItem) {
                const firstSub = item.subitems[0];
                onSelectSubItem(item.id, firstSub.id, firstSub.tabId);
                if (isMobileOpen) onToggleMobile();
              } else {
                handleTabClick(item.id);
              }
            }
          }}
          title={effectiveCollapsed ? item.label : undefined}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-colors duration-150 relative cursor-pointer select-none ${
            isActive
              ? 'bg-gradient-to-r from-emerald-800/90 via-[#173D35] to-emerald-950 text-white shadow-md border border-emerald-500/30'
              : 'text-emerald-100/80 hover:text-white hover:bg-white/5'
          }`}
          style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
        >
          {isActive && (
            <span className="absolute left-0 top-2 bottom-2 w-1.5 rounded-r-full bg-gradient-to-b from-[#E5C388] to-[#C39A60] shadow-[0_0_8px_rgba(195,154,96,0.6)]" />
          )}
          <div className="flex items-center space-x-3 min-w-0">
            <Icon
              className={`w-4 h-4 shrink-0 ${
                isActive ? 'text-[#E5C388]' : 'text-emerald-300/70'
              }`}
            />
            {!effectiveCollapsed && <span className="truncate font-medium tracking-wide">{item.label}</span>}
          </div>
          {!effectiveCollapsed && (
            <div className="flex items-center space-x-1.5 shrink-0">
              {item.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                    isActive
                      ? 'bg-[#C39A60]/20 text-[#E5C388] border border-[#C39A60]/40'
                      : 'bg-white/5 text-emerald-200/60 border border-white/10'
                  }`}
                >
                  {item.badge}
                </span>
              )}
              {hasSubitems && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSubmenu(item.id);
                  }}
                  className="p-1 rounded-lg bg-white/5 border border-white/10 transition-colors cursor-pointer"
                  title={isMenuExpanded ? 'Collapse Submenu' : 'Expand Submenu'}
                  aria-expanded={isMenuExpanded}
                >
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-emerald-300/80 transition-transform duration-200 ${
                      isMenuExpanded ? 'rotate-180 text-[#E5C388]' : 'rotate-0'
                    }`}
                  />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Manually Expanded Submenu List with Star Shortcut Toggles */}
        {!effectiveCollapsed && hasSubitems && isMenuExpanded && item.subitems && (
          <div className="ml-4 mt-1 space-y-1 border-l border-emerald-500/30 pl-3">
            {item.subitems.map((sub) => {
              const isSubActive = activeSubItemId
                ? activeSubItemId === sub.id
                : Boolean(sub.tabId && activeTab === sub.tabId);
              const isPinned = pinnedFavorites.some((f) => f.subId === sub.id);

              return (
                <div key={sub.id} className="flex items-center justify-between group/sub">
                  <button
                    type="button"
                    onClick={() => handleSubItemClick(item.id, sub.id, sub.tabId)}
                    className={`flex-1 text-left py-1.5 px-2 rounded-lg text-[11px] font-medium flex items-center justify-between cursor-pointer transition-colors ${
                      isSubActive
                        ? 'bg-[#C39A60]/20 text-[#E5C388] font-bold border border-[#C39A60]/30'
                        : 'text-emerald-200/85 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate">{sub.label}</span>
                    <ChevronRight className="w-3 h-3 opacity-60 text-[#E5C388]" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePinFavorite(item.id, sub.id, sub.label, sub.tabId);
                    }}
                    title={isPinned ? 'Unpin favorite shortcut' : 'Pin to favorite shortcuts'}
                    className={`p-1 rounded-lg hover:bg-white/10 transition-all ml-1 cursor-pointer ${
                      isPinned ? 'text-amber-400 opacity-100' : 'text-emerald-300/40 opacity-0 group-hover/sub:opacity-100 hover:text-amber-300'
                    }`}
                  >
                    <Star className={`w-3 h-3 ${isPinned ? 'fill-amber-400' : ''}`} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-stone-950/70 z-40 lg:hidden transition-all duration-300 ease-in-out"
          style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
          onClick={onToggleMobile}
          aria-hidden="true"
        />
      )}

      {/* Main Glassmorphism Sidebar Container */}
      <aside
        onMouseEnter={() => {
          if (isCollapsed) setIsHoverExpanded(true);
        }}
        onMouseLeave={() => {
          setIsHoverExpanded(false);
        }}
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          effectiveCollapsed ? 'w-20' : 'w-72 shadow-2xl ring-1 ring-white/20'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } border-r border-white/10 text-white select-none`}
        style={{
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          background: themeColors
            ? `linear-gradient(180deg, ${themeColors.primary}F2 0%, ${themeColors.primaryDark}F5 55%, ${themeColors.primaryDeep}FA 100%)`
            : 'linear-gradient(180deg, rgba(23,61,53,0.95) 0%, rgba(18,51,44,0.95) 55%, rgba(14,40,34,0.98) 100%)',
        }}
      >
        {/* Ambient Top Glow Effect */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#C39A60]/15 via-transparent to-transparent pointer-events-none" />

        {/* Sidebar Header — Brand Lockup */}
        <div
          className="relative px-4 py-3.5 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/5"
          style={{ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
        >
          <div
            onClick={effectiveCollapsed ? handleToggleCollapse : undefined}
            title={effectiveCollapsed ? "Click to open side menu" : undefined}
            className={`flex items-center space-x-3 overflow-hidden min-w-0 ${effectiveCollapsed ? 'justify-center w-full cursor-pointer hover:scale-105 transition-transform' : ''}`}
          >
            <div className="relative shrink-0 flex items-center justify-center">
              {familyLogoUrl ? (
                <img
                  src={familyLogoUrl}
                  alt="Family Crest Logo"
                  className="w-10 h-10 rounded-2xl object-cover border border-[#C39A60] shadow-[0_0_18px_rgba(195,154,96,0.4)] shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E5C388] via-[#C39A60] to-[#9E7841] flex items-center justify-center font-serif text-xl font-bold text-[#173D35] shadow-[0_0_18px_rgba(195,154,96,0.4)] shrink-0">
                  F
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-[#173D35] rounded-full shadow-xs" />
            </div>

            {!effectiveCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <h1 className="text-base font-bold text-white tracking-wide font-serif truncate drop-shadow-xs">
                    FamilyOS
                  </h1>
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-[#C39A60]/20 text-[#E5C388] border border-[#C39A60]/40 shrink-0">
                    Platform
                  </span>
                </div>
                <p className="text-[11px] text-emerald-200/70 truncate font-medium">Intelligent Household System</p>
              </div>
            )}
          </div>

          <div className="hidden lg:flex items-center space-x-1 shrink-0">
            {!effectiveCollapsed && (
              <button
                type="button"
                onClick={() => {
                  if (isCollapsed) {
                    handleToggleCollapse();
                    setIsHoverExpanded(false);
                  } else {
                    handleToggleCollapse();
                  }
                }}
                className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                  !isCollapsed
                    ? 'bg-[#C39A60]/20 text-[#E5C388] border-[#C39A60]/50 shadow-xs'
                    : 'text-emerald-200/80 hover:text-white hover:bg-white/10 border-transparent'
                }`}
                aria-label={!isCollapsed ? 'Sidebar pinned expanded' : 'Pin sidebar expanded'}
                title={!isCollapsed ? 'Sidebar is pinned expanded (Click to unpin)' : 'Pin sidebar expanded'}
              >
                <Pin className={`w-4 h-4 ${!isCollapsed ? 'fill-[#E5C388] text-[#E5C388]' : ''}`} />
              </button>
            )}

            <button
              type="button"
              onClick={handleToggleCollapse}
              className="p-1.5 rounded-xl text-emerald-200/80 hover:text-white hover:bg-white/10 border border-transparent transition-colors duration-200 cursor-pointer"
              aria-label={effectiveCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={effectiveCollapsed ? 'Expand and pin sidebar menu' : 'Collapse sidebar menu'}
            >
              {effectiveCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleMobile}
            className="lg:hidden p-1.5 rounded-xl text-emerald-200/80 hover:text-white hover:bg-white/10 border border-transparent transition-colors duration-200 cursor-pointer"
            aria-label="Close mobile sidebar"
            title="Close mobile sidebar"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* PINNED FAVORITES QUICK SHORTCUTS BAR */}
        {!effectiveCollapsed && pinnedFavorites.length > 0 && (
          <div className="px-3 py-2 border-b border-white/10 bg-white/5 space-y-1.5 shrink-0">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#E5C388] flex items-center space-x-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400 inline shrink-0" />
                <span>Pinned Favorites</span>
              </span>
              <span className="text-[9px] text-emerald-300/60 font-mono">{pinnedFavorites.length} Pinned</span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {pinnedFavorites.map((fav) => (
                <div
                  key={fav.subId}
                  className="group/fav relative flex items-center justify-between p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/20 hover:border-[#C39A60]/60 hover:bg-[#173D35] transition-all"
                >
                  <button
                    type="button"
                    onClick={() => handleSubItemClick(fav.parentTab, fav.subId, fav.tabId)}
                    className="flex-1 text-left flex items-center space-x-1.5 min-w-0 cursor-pointer"
                    title={`Jump to ${fav.label}`}
                  >
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                    <span className="text-[10px] font-medium text-emerald-100 group-hover:text-white truncate">
                      {fav.label}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePinFavorite(fav.parentTab, fav.subId, fav.label, fav.tabId);
                    }}
                    title={`Unpin ${fav.label} from favorites`}
                    className="p-0.5 rounded hover:bg-white/20 text-stone-300 hover:text-amber-300 opacity-70 group-hover/fav:opacity-100 transition-opacity cursor-pointer ml-1 shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CATEGORIZED NAVIGATION MENU ACCORDION */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5 text-xs scrollbar-thin scrollbar-thumb-white/10">
          {/* CATEGORY 1: CORE COMMAND */}
          <div className="space-y-1">
            {!effectiveCollapsed && (
              <button
                type="button"
                onClick={() => toggleCategory('core')}
                className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[#E5C388]/90 transition-colors duration-200 cursor-pointer"
              >
                <span>Core Command</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-300 ${
                    openCategories.core ? 'rotate-0' : '-rotate-90'
                  }`}
                />
              </button>
            )}
            {(effectiveCollapsed || openCategories.core) && (
              <div className="space-y-1">
                {CATEGORY_1_CORE_ITEMS.map((item) => renderMenuItem(item))}
              </div>
            )}
          </div>

          {/* CATEGORY 2: PLANNER & FINANCES */}
          <div className="space-y-1">
            {!effectiveCollapsed && (
              <button
                type="button"
                onClick={() => toggleCategory('planner')}
                className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[#E5C388]/90 transition-colors duration-200 cursor-pointer"
              >
                <span>Planner & Finances</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-300 ${
                    openCategories.planner ? 'rotate-0' : '-rotate-90'
                  }`}
                />
              </button>
            )}
            {(effectiveCollapsed || openCategories.planner) && (
              <div className="space-y-1">
                {CATEGORY_2_PLANNER_FINANCE_ITEMS.map((item) => renderMenuItem(item))}
              </div>
            )}
          </div>

          {/* CATEGORY 3: HOUSEHOLD OPERATIONS */}
          <div className="space-y-1">
            {!effectiveCollapsed && (
              <button
                type="button"
                onClick={() => toggleCategory('operations')}
                className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[#E5C388]/90 transition-colors duration-200 cursor-pointer"
              >
                <span>Operations & Ambitions</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-300 ${
                    openCategories.operations ? 'rotate-0' : '-rotate-90'
                  }`}
                />
              </button>
            )}
            {(effectiveCollapsed || openCategories.operations) && (
              <div className="space-y-1">
                {CATEGORY_3_OPERATIONS_ITEMS.map((item) => renderMenuItem(item))}
              </div>
            )}
          </div>

          {/* CATEGORY 4: LIFE, PARENTING & SYSTEM */}
          <div className="space-y-1">
            {!effectiveCollapsed && (
              <button
                type="button"
                onClick={() => toggleCategory('life')}
                className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[#E5C388]/90 transition-colors duration-200 cursor-pointer"
              >
                <span>Life, Parenting & System</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-300 ${
                    openCategories.life ? 'rotate-0' : '-rotate-90'
                  }`}
                />
              </button>
            )}
            {(effectiveCollapsed || openCategories.life) && (
              <div className="space-y-1">
                {CATEGORY_4_LIFE_SYSTEM_ITEMS.map((item) => renderMenuItem(item))}
              </div>
            )}
          </div>
        </div>

        {/* Glassmorphic Footer — User Profile Quick Action & Logout */}
        <div
          className="p-3.5 border-t border-white/10 bg-black/20 shrink-0"
          style={{ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
        >
          {!effectiveCollapsed ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleTabClick('user_profile')}
                title="View and edit your personal profile"
                className="w-full p-2 rounded-2xl border border-white/15 bg-stone-900/80 text-left flex items-center space-x-3 cursor-pointer transition-colors hover:bg-stone-800"
              >
                <div className="relative shrink-0">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-9 h-9 rounded-xl object-cover border border-[#C39A60]"
                  />
                  <span
                    className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3"
                    title="Active Online"
                  >
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-stone-900" />
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                  <p className="text-[10px] text-emerald-200/75 truncate">{currentUser.roleLabel}</p>
                  <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-[#E5C388] mt-0.5">
                    <UserCog className="w-3 h-3" />
                    <span>View Profile</span>
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onLogout) {
                    onLogout();
                  }
                }}
                className="w-full py-1.5 px-3 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/30 text-rose-200 text-xs font-semibold flex items-center justify-center space-x-2 cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2 py-1">
              <button
                type="button"
                onClick={() => handleTabClick('user_profile')}
                title={`${currentUser.name} • View Profile`}
                className="relative cursor-pointer"
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-9 h-9 rounded-xl object-cover border border-[#C39A60]"
                />
                <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5" title="Active Online">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-stone-900" />
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onLogout) {
                    onLogout();
                  }
                }}
                title="Log Out"
                className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/30 text-rose-200 cursor-pointer transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
