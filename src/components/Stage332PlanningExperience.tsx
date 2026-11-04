import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderTree,
  Flag,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Award,
  Plus,
  Lock,
  Users,
  RefreshCw,
  ListChecks,
  Layers,
  Repeat,
  Archive,
  MessageSquare,
  Shield,
  ChevronRight,
  X,
  Sparkles,
} from 'lucide-react';

const BRAND = {
  primary: '#173D35',
  ivory: '#F7F4EC',
  sage: '#A8BDAA',
  secondarySage: '#6B8A6E',
  gold: '#C39A60',
  lightGold: '#E7D1AA',
  textDark: '#11231E',
  textMuted: '#4F635D',
  cardBg: '#FFFFFF',
  border: '#E2DCD0',
};

const SOURCE_MODULES = [
  'GOALS_PROJECTS',
  'HOME_MANAGEMENT',
  'MARRIAGE',
  'PARENTING',
  'SPIRITUAL_GROWTH',
  'FAMILY_GOVERNANCE',
  'PERSONAL_PLANNING',
] as const;

interface Stage332Props {
  sessionToken: string;
  selectedPersona: string;
  onSelectPersona: (role: string) => void;
  activeSubPage?: string;
  onSelectSubPage?: (subId: string) => void;
}

type PlanningSubView = 'hierarchy' | 'projects' | 'task_center' | 'calendar_sync' | 'rewards';

const SUBPAGE_TO_PLANNING_VIEW: Record<string, PlanningSubView> = {
  plan_goals: 'hierarchy',
  plan_projects: 'projects',
  plan_tasks: 'task_center',
  plan_rewards: 'rewards',
};

const PLANNING_VIEW_TO_SUBPAGE: Record<PlanningSubView, string> = {
  hierarchy: 'plan_goals',
  projects: 'plan_projects',
  task_center: 'plan_tasks',
  calendar_sync: 'plan_tasks',
  rewards: 'plan_rewards',
};

export const Stage332PlanningExperience: React.FC<Stage332Props> = ({
  sessionToken,
  selectedPersona,
  onSelectPersona,
  activeSubPage,
  onSelectSubPage,
}) => {
  const [planningData, setPlanningData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeSubView, setActiveSubView] = useState<PlanningSubView>(
    (activeSubPage && SUBPAGE_TO_PLANNING_VIEW[activeSubPage]) || 'hierarchy'
  );

  useEffect(() => {
    if (activeSubPage && SUBPAGE_TO_PLANNING_VIEW[activeSubPage]) {
      setActiveSubView(SUBPAGE_TO_PLANNING_VIEW[activeSubPage]);
    }
  }, [activeSubPage]);

  const handleSelectSubView = (view: PlanningSubView) => {
    setActiveSubView(view);
    if (onSelectSubPage) {
      onSelectSubPage(PLANNING_VIEW_TO_SUBPAGE[view]);
    }
  };
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'FAMILY' | 'COUPLE' | 'PERSONAL'>('ALL');
  const [taskViewMode, setTaskViewMode] = useState<
    'ALL' | 'MY_TASKS' | 'FAMILY_TASKS' | 'KANBAN' | 'OVERDUE' | 'UPCOMING' | 'COMPLETED' | 'ARCHIVED'
  >('ALL');
  const [moduleFilter, setModuleFilter] = useState<string>('ALL');

  // Interactive Creation Forms
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDesc, setNewGoalDesc] = useState('');
  const [newGoalScope, setNewGoalScope] = useState<'FAMILY' | 'COUPLE' | 'PERSONAL'>('FAMILY');
  const [newGoalHorizon, setNewGoalHorizon] = useState<'SHORT_TERM' | 'LONG_TERM'>('LONG_TERM');
  const [newGoalMeasurable, setNewGoalMeasurable] = useState(true);
  const [newGoalTargetVal, setNewGoalTargetVal] = useState(100);
  const [newGoalUnit, setNewGoalUnit] = useState('%');
  const [newGoalImageUrl, setNewGoalImageUrl] = useState('');
  const [isGeneratingGoalImage, setIsGeneratingGoalImage] = useState(false);

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectGoalId, setNewProjectGoalId] = useState('');
  const [newProjectBudgetDollars, setNewProjectBudgetDollars] = useState(500);

  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneProjectId, setNewMilestoneProjectId] = useState('');

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskModule, setNewTaskModule] = useState<string>('GOALS_PROJECTS');
  const [newTaskScope, setNewTaskScope] = useState<'FAMILY' | 'COUPLE' | 'PERSONAL'>('FAMILY');
  const [newTaskPriority, setNewTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('HIGH');
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>('mem-sarah');
  const [newTaskProjectId, setNewTaskProjectId] = useState<string>('');
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>(
    new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
  );
  const [newTaskRecurrence, setNewTaskRecurrence] = useState<string>('');
  const [newTaskRewardPoints, setNewTaskRewardPoints] = useState<number>(15);

  const [newChecklistTitleByTask, setNewChecklistTitleByTask] = useState<Record<string, string>>({});
  const [newReviewNotesByGoal, setNewReviewNotesByGoal] = useState<Record<string, string>>({});

  // AI Goal Assistant State
  const [showAiGoalModal, setShowAiGoalModal] = useState<boolean>(false);
  const [aiScopeChoice, setAiScopeChoice] = useState<'FAMILY' | 'PERSONAL'>('FAMILY');
  const [aiSuggestionsList, setAiSuggestionsList] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Reward Redemption State
  const [redeemTitle, setRedeemTitle] = useState('Friday Movie Night Choice');
  const [redeemPoints, setRedeemPoints] = useState(25);

  const fetchPlanningData = useCallback(async () => {
    if (!sessionToken) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/planning/fam-1', {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatusBanner({
          type: 'error',
          text: err.message || err.error || `Access denied (${res.status})`,
        });
        if (res.status === 403) {
          setPlanningData(null);
        }
        return;
      }
      const data = await res.json();
      setPlanningData(data);
      if (data.goals?.length > 0 && !newProjectGoalId) {
        setNewProjectGoalId(data.goals[0].id);
      }
      if (data.projects?.length > 0 && !newMilestoneProjectId) {
        setNewMilestoneProjectId(data.projects[0].id);
        setNewTaskProjectId(data.projects[0].id);
      }
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  }, [sessionToken, newProjectGoalId, newMilestoneProjectId]);

  useEffect(() => {
    fetchPlanningData();
  }, [fetchPlanningData]);

  const handleGenerateGoalAiImage = async (title: string, desc: string, targetGoalId?: string) => {
    if (!sessionToken) return;
    if (!title.trim()) {
      setStatusBanner({ type: 'error', text: 'Please enter a Goal Title before generating an AI vision banner.' });
      return;
    }
    setIsGeneratingGoalImage(true);
    try {
      const res = await fetch('/api/v1/ai/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: desc.trim(),
          category: 'Family Goal Vision Banner',
          prompt: `High-quality cinematic visual representing family goal: "${title.trim()}". ${desc ? desc.trim() : ''}. Warm family environment, inspiring lighting, rich colors, professional aesthetic.`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.imageUrl) {
        setStatusBanner({ type: 'error', text: data.warning || data.message || 'Failed to generate AI vision banner.' });
      } else {
        if (targetGoalId) {
          await fetch(`/api/v1/goals/fam-1/${targetGoalId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionToken}`,
            },
            body: JSON.stringify({ imageUrl: data.imageUrl, bannerUrl: data.imageUrl }),
          });
          setStatusBanner({ type: 'success', text: 'Generated and attached AI Vision Banner to goal!' });
          await fetchPlanningData();
        } else {
          setNewGoalImageUrl(data.imageUrl);
          setStatusBanner({ type: 'success', text: '✨ AI Vision Banner generated! Preview attached below.' });
        }
      }
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err.message || 'Error generating AI goal vision banner.' });
    } finally {
      setIsGeneratingGoalImage(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim() || !sessionToken) return;
    const res = await fetch('/api/v1/goals/fam-1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        title: newGoalTitle.trim(),
        description: newGoalDesc.trim(),
        scope: newGoalScope,
        horizon: newGoalHorizon,
        isMeasurable: newGoalMeasurable,
        targetMetricValue: newGoalMeasurable ? newGoalTargetVal : null,
        metricUnit: newGoalMeasurable ? newGoalUnit : null,
        imageUrl: newGoalImageUrl || null,
        bannerUrl: newGoalImageUrl || null,
        linkedToMission: true,
        linkedToVision: true,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatusBanner({ type: 'error', text: body.message || body.error || 'Failed to create goal' });
      return;
    }
    setNewGoalTitle('');
    setNewGoalDesc('');
    setNewGoalImageUrl('');
    setStatusBanner({ type: 'success', text: `Created ${newGoalScope} goal "${body.goal?.title}"` });
    await fetchPlanningData();
  };

  const handleAddGoalReview = async (goalId: string) => {
    const notes = (newReviewNotesByGoal[goalId] || '').trim();
    if (!notes || !sessionToken) return;
    const res = await fetch(`/api/v1/goals/fam-1/${goalId}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ notes }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatusBanner({ type: 'error', text: body.message || body.error || 'Failed to add review' });
      return;
    }
    setNewReviewNotesByGoal((prev) => ({ ...prev, [goalId]: '' }));
    setStatusBanner({ type: 'success', text: 'Logged goal review reflection' });
    await fetchPlanningData();
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !sessionToken) return;
    const res = await fetch('/api/v1/projects/fam-1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        goalId: newProjectGoalId || null,
        name: newProjectName.trim(),
        budgetCents: Math.round(newProjectBudgetDollars * 100),
        scope: 'FAMILY',
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatusBanner({ type: 'error', text: body.message || body.error || 'Failed to create project' });
      return;
    }
    setNewProjectName('');
    setStatusBanner({ type: 'success', text: `Created project "${body.project?.name}"` });
    await fetchPlanningData();
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim() || !newMilestoneProjectId || !sessionToken) return;
    const res = await fetch('/api/v1/milestones/fam-1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        projectId: newMilestoneProjectId,
        title: newMilestoneTitle.trim(),
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatusBanner({ type: 'error', text: body.message || body.error || 'Failed to create milestone' });
      return;
    }
    setNewMilestoneTitle('');
    setStatusBanner({ type: 'success', text: `Added milestone "${body.milestone?.title}"` });
    await fetchPlanningData();
  };

  const handleToggleMilestone = async (milestoneId: string, isCompleted: boolean) => {
    if (!sessionToken) return;
    const res = await fetch(`/api/v1/milestones/fam-1/${milestoneId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ isCompleted }),
    });
    if (res.ok) {
      await fetchPlanningData();
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !sessionToken) return;
    const res = await fetch('/api/v1/tasks/fam-1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        title: newTaskTitle.trim(),
        sourceModule: newTaskModule,
        scope: newTaskScope,
        priority: newTaskPriority,
        assignedMemberId: newTaskAssignee,
        projectId: newTaskProjectId || null,
        dueDate: newTaskDueDate ? new Date(`${newTaskDueDate}T17:00:00.000Z`).toISOString() : null,
        recurrenceRule: newTaskRecurrence || null,
        rewardPoints: newTaskRewardPoints,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatusBanner({ type: 'error', text: body.message || body.error || 'Task creation rejected by RBAC' });
      return;
    }
    setNewTaskTitle('');
    setStatusBanner({
      type: 'success',
      text: `Created canonical task "${body.task?.title}" in module ${body.task?.sourceModule}`,
    });
    await fetchPlanningData();
  };

  const handleToggleTaskComplete = async (taskId: string, isCompleted: boolean) => {
    if (!sessionToken) return;
    const res = await fetch(`/api/v1/tasks/fam-1/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ isCompleted }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatusBanner({ type: 'error', text: body.message || body.error || 'Failed to update task' });
      return;
    }
    if (body.spawnedRecurringTask) {
      setStatusBanner({
        type: 'success',
        text: `Task completed! Recurring rule spawned next occurrence due ${body.spawnedRecurringTask.dueDate?.slice(0, 10)}`,
      });
    }
    await fetchPlanningData();
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    if (!sessionToken) return;
    const res = await fetch(`/api/v1/tasks/fam-1/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ status, isCompleted: status === 'COMPLETED' }),
    });
    if (res.ok) {
      await fetchPlanningData();
    }
  };

  const handleAddChecklistItem = async (taskId: string) => {
    const title = (newChecklistTitleByTask[taskId] || '').trim();
    if (!title || !sessionToken) return;
    const res = await fetch(`/api/v1/tasks/fam-1/${taskId}/checklist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      setNewChecklistTitleByTask((prev) => ({ ...prev, [taskId]: '' }));
      await fetchPlanningData();
    }
  };

  const handleToggleChecklistItem = async (taskId: string, itemId: string, isDone: boolean) => {
    if (!sessionToken) return;
    const res = await fetch(`/api/v1/tasks/fam-1/${taskId}/checklist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ itemId, isDone }),
    });
    if (res.ok) {
      await fetchPlanningData();
    }
  };

  const handleApplyChecklistTemplate = async (taskId: string, templateId: string) => {
    if (!templateId || !sessionToken) return;
    const res = await fetch(`/api/v1/tasks/fam-1/${taskId}/checklist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ applyTemplateId: templateId }),
    });
    if (res.ok) {
      setStatusBanner({ type: 'success', text: 'Applied reusable checklist template and recalculated progress' });
      await fetchPlanningData();
    }
  };

  const handleRescheduleCalendarEvent = async (eventId: string, newDateIso: string) => {
    if (!sessionToken) return;
    const res = await fetch(`/api/v1/calendar/fam-1/${eventId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ date: newDateIso }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      setStatusBanner({
        type: 'success',
        text: body.updatedTask
          ? `Rescheduled calendar event & bidirectionally updated canonical task "${body.updatedTask.title}"`
          : 'Updated calendar event schedule',
      });
      await fetchPlanningData();
    }
  };

  const handleFetchAiGoalSuggestions = async (scope: 'FAMILY' | 'PERSONAL') => {
    if (!sessionToken) return;
    setAiLoading(true);
    setAiError(null);
    setAiScopeChoice(scope);
    try {
      const res = await fetch('/api/v1/ai/suggest-goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          type: scope,
          vision: scope === 'FAMILY' ? planningData?.missionAndVision?.vision || '' : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setAiError(body.error || body.message || 'Failed to generate AI suggestions');
        setAiSuggestionsList([]);
      } else {
        setAiSuggestionsList(body.suggestions || []);
      }
    } catch (err: any) {
      setAiError(err.message || 'Network error generating suggestions');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAcceptAiGoal = async (sug: any) => {
    if (!sessionToken) return;
    try {
      const res = await fetch('/api/v1/goals/fam-1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          title: sug.title,
          description: `${sug.description} (AI Reason: ${sug.reasoning})`,
          scope: sug.scope || aiScopeChoice,
          horizon: sug.horizon || 'LONG_TERM',
          category: sug.category || 'FAMILY_GOVERNANCE',
          priority: sug.priority || 'HIGH',
          isMeasurable: sug.targetMetricValue ? true : false,
          targetMetricValue: sug.targetMetricValue || 100,
          metricUnit: sug.metricUnit || '%',
          linkedToMission: true,
          linkedToVision: true,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatusBanner({ type: 'error', text: body.message || body.error || 'Failed to create AI suggested goal' });
        return;
      }
      setStatusBanner({ type: 'success', text: `Accepted AI Goal: "${sug.title}"!` });
      // Remove accepted suggestion from list
      setAiSuggestionsList((prev) => prev.filter((item) => item.title !== sug.title));
      await fetchPlanningData();
    } catch (err: any) {
      setStatusBanner({ type: 'error', text: err.message });
    }
  };

  const handleToggleRewardConfig = async (enabled: boolean) => {
    if (!sessionToken) return;
    const res = await fetch('/api/v1/rewards/fam-1/config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        enabled,
        currencyName: planningData?.rewardConfig?.currencyName || 'Family Coins',
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatusBanner({ type: 'error', text: body.message || body.error || 'Failed to update reward config' });
      return;
    }
    setStatusBanner({
      type: 'success',
      text: `Optional Family Reward System is now ${enabled ? 'ENABLED' : 'DISABLED BY DEFAULT'}`,
    });
    await fetchPlanningData();
  };

  const handleAiGenerateProjects = async (goalId: string, goalTitle: string, goalDesc: string) => {
    if (!sessionToken) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/v1/ai/generate-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({ goalId, goalTitle, goalDesc }),
      });
      const body = await res.json();
      if (res.ok) {
        setStatusBanner({ type: 'success', text: `Generated ${body.projects.length} project ideas!` });
        // Need to add them to projects or prompt user to add them?
        // For now, let's just log them or set a temporary state.
        console.log('AI projects:', body.projects);
      }
    } catch (e) {
      setStatusBanner({ type: 'error', text: 'Failed to generate projects' });
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiGenerateTasks = async (projectId: string, projectName: string) => {
    if (!sessionToken) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/v1/ai/generate-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({ projectId, projectName }),
      });
      const body = await res.json();
      if (res.ok) {
        setStatusBanner({ type: 'success', text: `Generated ${body.tasks.length} task ideas!` });
        console.log('AI tasks:', body.tasks);
      }
    } catch (e) {
      setStatusBanner({ type: 'error', text: 'Failed to generate tasks' });
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiGenerateChecklist = async (taskId: string, taskTitle: string) => {
    if (!sessionToken) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/v1/ai/generate-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({ taskId, taskTitle }),
      });
      const body = await res.json();
      if (res.ok) {
        setStatusBanner({ type: 'success', text: 'Generated checklist items!' });
        console.log('AI checklist:', body.checklist);
      }
    } catch (e) {
      setStatusBanner({ type: 'error', text: 'Failed to generate checklist' });
    } finally {
      setAiLoading(false);
    }
  };

  const handleRedeemRewards = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken) return;
    const res = await fetch('/api/v1/rewards/fam-1/redeem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        memberId: 'mem-lucas',
        pointsCost: redeemPoints,
        reason: redeemTitle,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatusBanner({ type: 'error', text: body.message || body.error || 'Redemption failed' });
      return;
    }
    setStatusBanner({ type: 'success', text: `Submitted reward redemption request (${body.entry?.status})` });
    await fetchPlanningData();
  };

  const handleApproveRedemption = async (entryId: string) => {
    if (!sessionToken) return;
    const res = await fetch(`/api/v1/rewards/fam-1/redemptions/${entryId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
    });
    if (res.ok) {
      setStatusBanner({ type: 'success', text: 'Approved reward redemption & updated member points balance' });
      await fetchPlanningData();
    }
  };

  const goals: any[] = planningData?.goals || [];
  const projects: any[] = planningData?.projects || [];
  const milestones: any[] = planningData?.milestones || [];
  const tasks: any[] = planningData?.tasks || [];
  const taskViews = planningData?.taskViews || {};
  const checklistTemplates: any[] = planningData?.checklistTemplates || [];
  const calendarEvents: any[] = planningData?.calendarEvents || [];
  const rewardConfig = planningData?.rewardConfig || {
    enabled: false,
    currencyName: 'Family Coins',
    disallowPunitiveDeductions: true,
    history: [],
  };

  const filteredGoals = goals.filter((g) => scopeFilter === 'ALL' || g.scope === scopeFilter);

  const displayedTasks: any[] = (() => {
    let base: any[] = tasks.filter((t) => !t.isArchived);
    if (taskViewMode === 'MY_TASKS') base = taskViews.myTasks || [];
    else if (taskViewMode === 'FAMILY_TASKS') base = taskViews.familyTasks || [];
    else if (taskViewMode === 'OVERDUE') base = taskViews.overdueTasks || [];
    else if (taskViewMode === 'UPCOMING') base = taskViews.upcomingDeadlines || [];
    else if (taskViewMode === 'COMPLETED') base = taskViews.completedTasks || [];
    else if (taskViewMode === 'ARCHIVED') base = taskViews.archivedWork || [];
    if (moduleFilter !== 'ALL') {
      base = base.filter((t) => t.sourceModule === moduleFilter);
    }
    return base;
  })();

  return (
    <div className="space-y-6">
      {/* Stage 3.3.2 Top Banner + Persona Switcher */}
      <div
        className="rounded-3xl p-6 sm:p-8 border shadow-xs bg-white"
        style={{ borderColor: BRAND.border }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span
                className="text-xs uppercase tracking-widest font-bold px-3 py-1 rounded-full"
                style={{ backgroundColor: BRAND.gold, color: '#173D35' }}
              >
                Stage 3.3.2 • Unified Planning & Execution
              </span>
              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200">
                7-Tier Hierarchy + Canonical Tasks
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 mt-2">
              Goals, Projects, Milestones, Tasks & Checklists
            </h2>
            <p className="text-sm text-stone-600 mt-1 max-w-3xl">
              Authoritative Firebase-backed 7-tier execution engine:{' '}
              <strong>
                Family Mission → Family Vision → Goals → Projects → Milestones → Tasks → Checklists
              </strong>
              . Personal goals and tasks remain strictly private to their owner.
            </p>
          </div>

          {/* Role / Persona Selector for Zero-Trust Verification */}
          <div className="flex flex-col items-end space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Active Server Session Persona
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { role: 'OWNER', label: 'Sarah (OWNER)' },
                { role: 'ADMIN', label: 'David (ADMIN)' },
                { role: 'MEMBER', label: 'Maya (MEMBER)' },
                { role: 'CHILD', label: 'Lucas (CHILD)' },
                { role: 'GUEST', label: 'Martha (GUEST)' },
              ].map((p) => (
                <button
                  key={p.role}
                  onClick={() => onSelectPersona(p.role)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedPersona === p.role
                      ? 'bg-emerald-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={fetchPlanningData}
                className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700"
                title="Refresh Authoritative Planning Store"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Tier 1 & Tier 2: Family Mission & Vision Alignment Bar */}
        {planningData?.missionAndVision && (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-2xl bg-emerald-950 text-white">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300 block">
                Tier 1 • Family Mission
              </span>
              <p className="text-xs sm:text-sm font-medium text-emerald-50 mt-0.5">
                {planningData.missionAndVision.mission}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300 block">
                Tier 2 • Family Vision
              </span>
              <p className="text-xs sm:text-sm font-medium text-emerald-50 mt-0.5">
                {planningData.missionAndVision.vision}
              </p>
            </div>
          </div>
        )}

        {/* Section Sub-Navigation */}
        <div
          className="flex flex-wrap gap-2 mt-5 pt-4 border-t"
          style={{ borderColor: BRAND.border }}
        >
          {[
            { id: 'hierarchy', label: `Goal Hierarchy (${goals.length})`, icon: Flag },
            { id: 'projects', label: `Projects & Milestones (${projects.length})`, icon: FolderTree },
            { id: 'task_center', label: `Universal Task Center (${tasks.length})`, icon: ListChecks },
            { id: 'calendar_sync', label: `Calendar & Due Dates (${calendarEvents.length})`, icon: Calendar },
            {
              id: 'rewards',
              label: `Optional Family Rewards (${rewardConfig.enabled ? 'ON' : 'OFF'})`,
              icon: Award,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeSubView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleSelectSubView(tab.id as PlanningSubView)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  active
                    ? 'text-white shadow-xs'
                    : 'bg-stone-50 text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
                style={{ backgroundColor: active ? BRAND.primary : undefined }}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {statusBanner && (
        <div
          className={`p-4 rounded-2xl border text-xs font-medium flex items-center justify-between ${
            statusBanner.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <span>{statusBanner.text}</span>
          <button
            onClick={() => setStatusBanner(null)}
            className="text-xs underline ml-4 opacity-75 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* SUB-VIEW 1: UNIFIED 7-TIER GOAL HIERARCHY */}
      {activeSubView === 'hierarchy' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: Goals + Linked Projects + Milestones + Tasks */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-4 rounded-2xl border" style={{ borderColor: BRAND.border }}>
              <div className="flex flex-wrap items-center gap-1.5">
                {(['ALL', 'FAMILY', 'COUPLE', 'PERSONAL'] as const).map((sc) => (
                  <button
                    key={sc}
                    onClick={() => setScopeFilter(sc)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                      scopeFilter === sc
                        ? 'bg-emerald-900 text-white'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {sc} Scope
                  </button>
                ))}
                <button
                  onClick={() => {
                    setShowAiGoalModal(true);
                    if (aiSuggestionsList.length === 0) {
                      handleFetchAiGoalSuggestions(aiScopeChoice);
                    }
                  }}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs transition-all"
                >
                  <span className="text-sm">✨</span>
                  <span>AI Goal Suggestions</span>
                </button>
              </div>
              <span className="text-xs text-stone-500">
                Showing {filteredGoals.length} privacy-verified goals for {selectedPersona}
              </span>
            </div>

            {filteredGoals.map((goal) => {
              const goalProjects = projects.filter((p) => p.goalId === goal.id);
              return (
                <div
                  key={goal.id}
                  className="rounded-3xl p-6 bg-white border shadow-xs space-y-4 overflow-hidden"
                  style={{ borderColor: BRAND.border }}
                >
                  {(goal.imageUrl || goal.bannerUrl) ? (
                    <div className="w-full h-44 rounded-2xl overflow-hidden relative bg-stone-100 border border-stone-200">
                      <img
                        src={goal.imageUrl || goal.bannerUrl}
                        alt={goal.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-stone-900/70 via-stone-900/20 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-stone-950">
                          AI Visual Banner
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleGenerateGoalAiImage(goal.title, goal.description || '', goal.id)}
                        disabled={isGeneratingGoalImage}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 flex items-center space-x-1 transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>{isGeneratingGoalImage ? 'Generating Visual...' : '✨ Generate AI Vision Banner'}</span>
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-900 text-white">
                          {goal.scope}
                        </span>
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700">
                          {goal.horizon?.replace('_', ' ')}
                        </span>
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
                          {goal.category} • {goal.priority}
                        </span>
                        {goal.scope === 'PERSONAL' && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Private to Owner ({goal.ownerMemberId})
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-serif font-bold text-stone-900 mt-2">{goal.title}</h3>
                      <p className="text-xs text-stone-600 mt-0.5">{goal.description}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-2xl font-mono font-bold text-emerald-900">
                        {goal.progressPercent}%
                      </span>
                      <span className="block text-[11px] text-stone-500">Deterministic Rollup</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-800 transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, goal.progressPercent || 0))}%` }}
                    />
                  </div>

                  {goal.isMeasurable && (
                    <div className="text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-200 flex justify-between">
                      <span>
                        <strong>Measurable Target:</strong> {goal.currentMetricValue || 0} /{' '}
                        {goal.targetMetricValue} {goal.metricUnit}
                      </span>
                      <span>
                        Target Date: {goal.targetDate ? goal.targetDate.slice(0, 10) : 'Ongoing'}
                      </span>
                    </div>
                  )}

                  {/* Linked Projects & Milestones */}
                  {goalProjects.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-stone-100">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 block">
                        Tier 4 & 5 • Linked Projects & Milestones ({goalProjects.length})
                      </span>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-bold text-stone-800">Projects</h4>
                      <button
                        onClick={() => handleAiGenerateProjects(goal.id, goal.title, goal.description)}
                        className="text-xs font-bold px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 hover:bg-amber-200"
                      >
                        ✨ Generate with AI
                      </button>
                    </div>
                    {goalProjects.map((proj) => {
                        const projMilestones = milestones.filter((m) => m.projectId === proj.id);
                        const projTasks = tasks.filter((t) => t.projectId === proj.id && !t.isArchived);
                        return (
                          <div
                            key={proj.id}
                            className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-sm font-bold text-stone-900">
                                  Project: {proj.name}
                                </span>
                                <span className="block text-[11px] text-stone-500">
                                  Status: {proj.status} • Progress: {proj.progressPercent}%
                                </span>
                              </div>
                              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-white border border-stone-200">
                                {projTasks.filter((t) => t.isCompleted).length}/{projTasks.length} Tasks
                              </span>
                            </div>

                            {projMilestones.length > 0 && (
                              <div className="space-y-1.5 pl-2 border-l-2 border-emerald-700">
                                {projMilestones.map((ms) => (
                                  <label
                                    key={ms.id}
                                    className="flex items-center justify-between text-xs bg-white p-2 rounded-xl border border-stone-200 cursor-pointer"
                                  >
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        checked={!!ms.isCompleted}
                                        onChange={(e) => handleToggleMilestone(ms.id, e.target.checked)}
                                        className="rounded text-emerald-800"
                                      />
                                      <span className={ms.isCompleted ? 'line-through text-stone-400' : 'font-medium text-stone-800'}>
                                        Milestone: {ms.title}
                                      </span>
                                    </div>
                                    <span className="font-mono text-[11px] text-emerald-800 font-semibold">
                                      {ms.progressPercent}%
                                    </span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Goal Reviews History & Form */}
                  <div className="pt-2 border-t border-stone-100 space-y-2">
                    <span className="text-xs font-bold text-stone-700 block">
                      Goal Reviews & Reflections ({(goal.reviews || []).length})
                    </span>
                    {(goal.reviews || []).map((rev: any) => (
                      <div key={rev.id} className="text-xs p-2.5 rounded-xl bg-amber-50/60 border border-amber-200 text-stone-800">
                        <span className="font-semibold">{rev.notes}</span>
                        <span className="block text-[10px] text-stone-500 mt-0.5">
                          Progress Snapshot: {rev.progressSnapshotPercent}% • {rev.reviewedAt?.slice(0, 10)}
                        </span>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newReviewNotesByGoal[goal.id] || ''}
                        onChange={(e) =>
                          setNewReviewNotesByGoal((prev) => ({ ...prev, [goal.id]: e.target.value }))
                        }
                        placeholder="Add goal review note..."
                        className="flex-1 text-xs px-3 py-1.5 rounded-xl border border-stone-300"
                      />
                      <button
                        onClick={() => handleAddGoalReview(goal.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-800 text-white hover:bg-stone-900"
                      >
                        Log Review
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Create Goal Form */}
          <div className="space-y-4">
            <form
              onSubmit={handleCreateGoal}
              className="rounded-3xl p-6 bg-white border shadow-xs space-y-4"
              style={{ borderColor: BRAND.border }}
            >
              <h3 className="font-serif font-bold text-lg text-stone-900">Create New Goal (Tier 3)</h3>
              <p className="text-xs text-stone-500">
                Link directly to the Family Mission & Vision with Personal, Couple, or Family privacy scope.
              </p>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Goal Title</label>
                <input
                  type="text"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="e.g., Complete Autumn Emergency Prep"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Description</label>
                <textarea
                  value={newGoalDesc}
                  onChange={(e) => setNewGoalDesc(e.target.value)}
                  placeholder="Desired outcome & alignment with family values"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300"
                  rows={2}
                />
              </div>

              {/* AI Goal Vision Banner Generator */}
              <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>AI Vision Banner</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleGenerateGoalAiImage(newGoalTitle, newGoalDesc)}
                    disabled={isGeneratingGoalImage || !newGoalTitle.trim()}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 shadow-xs transition-all disabled:opacity-50"
                  >
                    {isGeneratingGoalImage ? 'Generating...' : '✨ Generate Banner'}
                  </button>
                </div>
                {newGoalImageUrl ? (
                  <div className="relative w-full h-32 rounded-xl overflow-hidden border border-amber-300">
                    <img src={newGoalImageUrl} alt="Goal vision banner preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setNewGoalImageUrl('')}
                      className="absolute top-2 right-2 p-1 rounded-full bg-stone-900/80 text-white hover:bg-rose-600 transition-all"
                      title="Remove Banner"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : isGeneratingGoalImage ? (
                  <div className="p-3 rounded-xl bg-white text-center text-xs font-semibold text-amber-900 flex items-center justify-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                    <span>Generating visual banner with Gemini AI...</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-stone-500 italic">
                    Click above to generate a visual image representation for this goal using AI.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Privacy Scope</label>
                  <select
                    value={newGoalScope}
                    onChange={(e) => setNewGoalScope(e.target.value as any)}
                    className="w-full text-xs px-2.5 py-2 rounded-xl border border-stone-300"
                  >
                    <option value="FAMILY">FAMILY (Shared)</option>
                    <option value="COUPLE">COUPLE (Spouses)</option>
                    <option value="PERSONAL">PERSONAL (Private)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Time Horizon</label>
                  <select
                    value={newGoalHorizon}
                    onChange={(e) => setNewGoalHorizon(e.target.value as any)}
                    className="w-full text-xs px-2.5 py-2 rounded-xl border border-stone-300"
                  >
                    <option value="SHORT_TERM">Short-Term</option>
                    <option value="LONG_TERM">Long-Term</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center space-x-2 text-xs text-stone-700">
                <input
                  type="checkbox"
                  checked={newGoalMeasurable}
                  onChange={(e) => setNewGoalMeasurable(e.target.checked)}
                />
                <span>Measurable Goal Target</span>
              </label>

              {newGoalMeasurable && (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={newGoalTargetVal}
                    onChange={(e) => setNewGoalTargetVal(Number(e.target.value))}
                    className="text-xs px-3 py-1.5 rounded-xl border border-stone-300"
                    placeholder="Target Value"
                  />
                  <input
                    type="text"
                    value={newGoalUnit}
                    onChange={(e) => setNewGoalUnit(e.target.value)}
                    className="text-xs px-3 py-1.5 rounded-xl border border-stone-300"
                    placeholder="Unit (USD, %, books)"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white shadow-xs"
                style={{ backgroundColor: BRAND.primary }}
              >
                Save Goal to Authoritative Store
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: PROJECTS & MILESTONES DASHBOARD */}
      {activeSubView === 'projects' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-bold text-stone-800">Projects</h4>
              <button
                onClick={() => {
                  const goalId = projects[0]?.goalId; // Find goal ID if possible or just use a placeholder
                  handleAiGenerateProjects(goalId || 'placeholder-id', 'Family Project', 'Family project description');
                }}
                className="text-xs font-bold px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 hover:bg-amber-200"
              >
                ✨ Generate Projects
              </button>
            </div>
            {projects.map((proj) => {
              const projMilestones = milestones.filter((m) => m.projectId === proj.id);
              const projTasks = tasks.filter((t) => t.projectId === proj.id && !t.isArchived);
              return (
                <div
                  key={proj.id}
                  className="rounded-3xl p-6 bg-white border shadow-xs space-y-4"
                  style={{ borderColor: BRAND.border }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                        {proj.status} • {proj.scope}
                      </span>
                      <h3 className="text-lg font-serif font-bold text-stone-900 mt-1">{proj.name}</h3>
                      <p className="text-xs text-stone-600">{proj.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-mono font-bold text-emerald-900">
                        {proj.progressPercent}%
                      </span>
                      <span className="block text-[11px] text-stone-500">
                        Budget: ${(proj.budgetCents / 100).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-stone-700 block">
                      Milestones ({projMilestones.length})
                    </span>
                    {projMilestones.map((ms) => (
                      <label
                        key={ms.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-200 text-xs cursor-pointer"
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={!!ms.isCompleted}
                            onChange={(e) => handleToggleMilestone(ms.id, e.target.checked)}
                          />
                          <span className={ms.isCompleted ? 'line-through text-stone-400' : 'font-semibold text-stone-800'}>
                            {ms.title}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-emerald-900">
                          {ms.progressPercent}% ({projTasks.filter((t) => t.milestoneId === ms.id).length} tasks)
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-4">
            <form
              onSubmit={handleCreateProject}
              className="rounded-3xl p-6 bg-white border shadow-xs space-y-3"
              style={{ borderColor: BRAND.border }}
            >
              <h3 className="font-serif font-bold text-base text-stone-900">New Project (Tier 4)</h3>
              <select
                value={newProjectGoalId}
                onChange={(e) => setNewProjectGoalId(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300"
              >
                <option value="">Standalone Project</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    Goal: {g.title}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project Name"
                className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300"
                required
              />
              <button
                type="submit"
                className="w-full py-2 rounded-xl text-xs font-bold text-white"
                style={{ backgroundColor: BRAND.primary }}
              >
                Create Project
              </button>
            </form>

            <form
              onSubmit={handleCreateMilestone}
              className="rounded-3xl p-6 bg-white border shadow-xs space-y-3"
              style={{ borderColor: BRAND.border }}
            >
              <h3 className="font-serif font-bold text-base text-stone-900">New Milestone (Tier 5)</h3>
              <select
                value={newMilestoneProjectId}
                onChange={(e) => setNewMilestoneProjectId(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    Project: {p.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={newMilestoneTitle}
                onChange={(e) => setNewMilestoneTitle(e.target.value)}
                placeholder="Milestone Title"
                className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300"
                required
              />
              <button
                type="submit"
                className="w-full py-2 rounded-xl text-xs font-bold text-white"
                style={{ backgroundColor: BRAND.primary }}
              >
                Add Milestone
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: UNIVERSAL CANONICAL TASK CENTER & CHECKLISTS */}
      {activeSubView === 'task_center' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Task Center View Switcher + Canonical Source Module Filter */}
            <div
              className="p-4 rounded-2xl bg-white border space-y-3"
              style={{ borderColor: BRAND.border }}
            >
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'ALL', label: 'List View (All)' },
                  { id: 'MY_TASKS', label: 'My Tasks' },
                  { id: 'FAMILY_TASKS', label: 'Family Tasks' },
                  { id: 'KANBAN', label: 'Kanban Board' },
                  { id: 'OVERDUE', label: 'Overdue' },
                  { id: 'UPCOMING', label: 'Upcoming Deadlines' },
                  { id: 'COMPLETED', label: 'Completed' },
                  { id: 'ARCHIVED', label: 'Archived Work' },
                ].map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setTaskViewMode(v.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                      taskViewMode === v.id
                        ? 'bg-emerald-900 text-white'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100">
                <span className="text-[11px] font-bold text-stone-500 uppercase">
                  Canonical Source Module:
                </span>
                <select
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-stone-300"
                >
                  <option value="ALL">All 7 FamilyOS Modules</option>
                  {SOURCE_MODULES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {taskViewMode === 'KANBAN' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['TODO', 'IN_PROGRESS', 'COMPLETED'] as const).map((col) => {
                  const colTasks = displayedTasks.filter((t) =>
                    col === 'COMPLETED' ? t.isCompleted : !t.isCompleted && (t.status === col || (col === 'TODO' && t.status !== 'IN_PROGRESS'))
                  );
                  return (
                    <div
                      key={col}
                      className="p-4 rounded-2xl bg-stone-100/80 border border-stone-200 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-stone-700">
                          {col.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white">
                          {colTasks.length}
                        </span>
                      </div>
                      {colTasks.map((t) => (
                        <div key={t.id} className="p-3 rounded-xl bg-white border border-stone-200 space-y-2 text-xs">
                          <span className="font-bold text-stone-900 block">{t.title}</span>
                          <div className="flex flex-wrap gap-1">
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 font-semibold">
                              {t.sourceModule}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-900 font-semibold">
                              {t.priority}
                            </span>
                          </div>
                          <div className="flex gap-1 pt-1">
                            {col !== 'TODO' && (
                              <button
                                onClick={() => handleUpdateTaskStatus(t.id, 'TODO')}
                                className="text-[10px] px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200"
                              >
                                To Do
                              </button>
                            )}
                            {col !== 'IN_PROGRESS' && (
                              <button
                                onClick={() => handleUpdateTaskStatus(t.id, 'IN_PROGRESS')}
                                className="text-[10px] px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200"
                              >
                                In Progress
                              </button>
                            )}
                            {col !== 'COMPLETED' && (
                              <button
                                onClick={() => handleUpdateTaskStatus(t.id, 'COMPLETED')}
                                className="text-[10px] px-2 py-0.5 rounded bg-emerald-800 text-white"
                              >
                                Complete
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {displayedTasks.map((task) => {
                  const isOverdue =
                    !task.isCompleted &&
                    task.dueDate &&
                    new Date(task.dueDate).getTime() < Date.now();
                  return (
                    <div
                      key={task.id}
                      className="p-5 rounded-3xl bg-white border shadow-xs space-y-3"
                      style={{ borderColor: BRAND.border }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <label className="flex items-start space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!task.isCompleted}
                            onChange={(e) => handleToggleTaskComplete(task.id, e.target.checked)}
                            className="mt-1 w-4 h-4 rounded text-emerald-800"
                          />
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-900 text-white">
                                {task.sourceModule}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                                {task.scope}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                                {task.priority}
                              </span>
                              {task.recurrenceRule && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-900 flex items-center gap-1">
                                  <Repeat className="w-3 h-3" /> {task.recurrenceRule}
                                </span>
                              )}
                              {isOverdue && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                                  OVERDUE
                                </span>
                              )}
                            </div>
                            <h4
                              className={`text-sm font-bold mt-1 ${
                                task.isCompleted ? 'line-through text-stone-400' : 'text-stone-900'
                              }`}
                            >
                              {task.title}
                            </h4>
                            <button
                              onClick={() => handleAiGenerateChecklist(task.id, task.title)}
                              className="text-[10px] font-bold px-2 py-1 my-2 rounded-lg bg-amber-100 text-amber-900 hover:bg-amber-200"
                            >
                              ✨ AI Checklist
                            </button>
                            <p className="text-xs text-stone-500">
                              Assignee: {task.assignedMemberId || 'Unassigned'} • Due:{' '}
                              {task.dueDate ? task.dueDate.slice(0, 10) : 'None'} ({task.timezone})
                            </p>
                          </div>
                        </label>
                        <span className="text-xs font-mono font-bold text-emerald-900">
                          {task.progressPercent}%
                        </span>
                      </div>

                      {/* Tier 7: Task Checklists & Reusable Template Selector */}
                      <div className="pl-7 space-y-2 pt-2 border-t border-stone-100">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-stone-600">
                            Tier 7 • Checklist Items ({(task.checklist || []).filter((c: any) => c.isDone).length}/
                            {(task.checklist || []).length})
                          </span>
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleApplyChecklistTemplate(task.id, e.target.value);
                                e.target.value = '';
                              }
                            }}
                            className="text-[11px] px-2 py-1 rounded-lg border border-stone-300 bg-stone-50"
                          >
                            <option value="">+ Apply Reusable Template...</option>
                            {checklistTemplates.map((tpl) => (
                              <option key={tpl.id} value={tpl.id}>
                                {tpl.name} ({tpl.items?.length || 0} items)
                              </option>
                            ))}
                          </select>
                        </div>

                        {(task.checklist || []).map((chk: any) => (
                          <label
                            key={chk.id}
                            className="flex items-center space-x-2 text-xs text-stone-700 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={!!chk.isDone}
                              onChange={(e) =>
                                handleToggleChecklistItem(task.id, chk.id, e.target.checked)
                              }
                              className="rounded text-emerald-800"
                            />
                            <span className={chk.isDone ? 'line-through text-stone-400' : ''}>
                              {chk.title}
                            </span>
                          </label>
                        ))}

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newChecklistTitleByTask[task.id] || ''}
                            onChange={(e) =>
                              setNewChecklistTitleByTask((prev) => ({
                                ...prev,
                                [task.id]: e.target.value,
                              }))
                            }
                            placeholder="Add checklist step..."
                            className="flex-1 text-xs px-2.5 py-1 rounded-lg border border-stone-300"
                          />
                          <button
                            onClick={() => handleAddChecklistItem(task.id)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-800 text-white"
                          >
                            Add Step
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Create Canonical Task Form */}
          <div>
            <form
              onSubmit={handleCreateTask}
              className="rounded-3xl p-6 bg-white border shadow-xs space-y-3"
              style={{ borderColor: BRAND.border }}
            >
              <h3 className="font-serif font-bold text-base text-stone-900">
                Create Canonical Task (Tier 6)
              </h3>
              <p className="text-xs text-stone-500">
                Single universal task table shared across all 7 FamilyOS modules with automatic Calendar due-date sync.
              </p>

              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Task title..."
                className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300"
                required
              />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block">Module</label>
                  <select
                    value={newTaskModule}
                    onChange={(e) => setNewTaskModule(e.target.value)}
                    className="w-full text-xs px-2 py-1.5 rounded-xl border border-stone-300"
                  >
                    {SOURCE_MODULES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block">Scope</label>
                  <select
                    value={newTaskScope}
                    onChange={(e) => setNewTaskScope(e.target.value as any)}
                    className="w-full text-xs px-2 py-1.5 rounded-xl border border-stone-300"
                  >
                    <option value="FAMILY">FAMILY</option>
                    <option value="COUPLE">COUPLE</option>
                    <option value="PERSONAL">PERSONAL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block">Assignee</label>
                  <select
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full text-xs px-2 py-1.5 rounded-xl border border-stone-300"
                  >
                    <option value="mem-sarah">Sarah (OWNER)</option>
                    <option value="mem-david">David (ADMIN)</option>
                    <option value="mem-maya">Maya (MEMBER)</option>
                    <option value="mem-lucas">Lucas (CHILD)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full text-xs px-2 py-1.5 rounded-xl border border-stone-300"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block">Due Date</label>
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full text-xs px-2 py-1.5 rounded-xl border border-stone-300"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block">Recurrence</label>
                  <select
                    value={newTaskRecurrence}
                    onChange={(e) => setNewTaskRecurrence(e.target.value)}
                    className="w-full text-xs px-2 py-1.5 rounded-xl border border-stone-300"
                  >
                    <option value="">One-Time</option>
                    <option value="FREQ=DAILY">DAILY</option>
                    <option value="FREQ=WEEKLY">WEEKLY</option>
                    <option value="FREQ=BIWEEKLY">BIWEEKLY</option>
                    <option value="FREQ=MONTHLY">MONTHLY</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white shadow-xs"
                style={{ backgroundColor: BRAND.primary }}
              >
                Create Canonical Task
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: BIDIRECTIONAL CALENDAR & ROUTINES INTEGRATION */}
      {activeSubView === 'calendar_sync' && (
        <div
          className="rounded-3xl p-6 bg-white border shadow-xs space-y-4"
          style={{ borderColor: BRAND.border }}
        >
          <div>
            <h3 className="text-xl font-serif font-bold text-stone-900">
              Bidirectional Calendar & Task Due-Date Synchronization
            </h3>
            <p className="text-xs text-stone-500">
              Tasks with due dates automatically project into the household Calendar. Updating a task's calendar date below updates the canonical task in real time.
            </p>
          </div>

          <div className="space-y-2.5">
            {calendarEvents.map((ev: any) => (
              <div
                key={ev.id}
                className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-stone-900">{ev.title}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                      {ev.category}
                    </span>
                    {ev.scope === 'PERSONAL' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-900">
                        PERSONAL PRIVATE
                      </span>
                    )}
                  </div>
                  <span className="text-stone-500 block mt-0.5">
                    Date: {ev.date?.slice(0, 10)} • Timezone: {ev.timezone || 'America/New_York'}
                  </span>
                </div>

                {ev.sourceEntityId && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="date"
                      defaultValue={ev.date?.slice(0, 10)}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleRescheduleCalendarEvent(
                            ev.id,
                            new Date(`${e.target.value}T17:00:00.000Z`).toISOString()
                          );
                        }
                      }}
                      className="text-xs px-2.5 py-1 rounded-lg border border-stone-300 bg-white"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW 5: OPTIONAL FAMILY REWARD SYSTEM (DISABLED BY DEFAULT) */}
      {activeSubView === 'rewards' && (
        <div
          className="rounded-3xl p-6 bg-white border shadow-xs space-y-5"
          style={{ borderColor: BRAND.border }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-100 text-amber-900">
                Section 10 • Optional Family Reward System
              </span>
              <h3 className="text-xl font-serif font-bold text-stone-900 mt-2">
                {rewardConfig.currencyName} ({rewardConfig.enabled ? 'Enabled' : 'Disabled by Default'})
              </h3>
              <p className="text-xs text-stone-600 max-w-2xl mt-1">
                Rewards are <strong>disabled by default</strong> and never required to complete ordinary household responsibilities. Punitive point deductions are strictly prohibited at the server level.
              </p>
            </div>

            {(selectedPersona === 'OWNER' || selectedPersona === 'ADMIN') && (
              <button
                onClick={() => handleToggleRewardConfig(!rewardConfig.enabled)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  rewardConfig.enabled
                    ? 'bg-stone-200 text-stone-800 hover:bg-stone-300'
                    : 'bg-emerald-900 text-white hover:bg-emerald-950'
                }`}
              >
                {rewardConfig.enabled ? 'Disable Reward System' : 'Enable Optional Reward System'}
              </button>
            )}
          </div>

          {rewardConfig.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-stone-100">
              <form onSubmit={handleRedeemRewards} className="space-y-3 p-4 rounded-2xl bg-stone-50 border border-stone-200">
                <h4 className="font-serif font-bold text-sm text-stone-900">
                  Request Reward Redemption
                </h4>
                <input
                  type="text"
                  value={redeemTitle}
                  onChange={(e) => setRedeemTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 bg-white"
                  placeholder="Reward description"
                />
                <input
                  type="number"
                  min={1}
                  value={redeemPoints}
                  onChange={(e) => setRedeemPoints(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 bg-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white"
                  style={{ backgroundColor: BRAND.primary }}
                >
                  Request Redemption ({redeemPoints} {rewardConfig.currencyName})
                </button>
              </form>

              <div className="space-y-2">
                <h4 className="font-serif font-bold text-sm text-stone-900">
                  Reward & Redemption Ledger ({(rewardConfig.history || []).length})
                </h4>
                {(rewardConfig.history || []).map((entry: any) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-stone-900 block">{entry.reason}</span>
                      <span className="text-[11px] text-stone-500">
                        {entry.type} • {entry.pointsDelta > 0 ? `+${entry.pointsDelta}` : entry.pointsDelta}{' '}
                        pts • Status: {entry.status}
                      </span>
                    </div>
                    {entry.status === 'PENDING_APPROVAL' &&
                      (selectedPersona === 'OWNER' || selectedPersona === 'ADMIN') && (
                        <button
                          onClick={() => handleApproveRedemption(entry.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-800 text-white text-[11px] font-semibold"
                        >
                          Approve
                        </button>
                      )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Goal Assistant Modal */}
      {showAiGoalModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto border border-stone-200 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between border-b border-stone-200 pb-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-950">
                  Gemini 3.8 Intelligence Engine
                </span>
                <h3 className="text-2xl font-serif font-bold text-stone-900 mt-1">
                  ✨ AI Goal Suggestions
                </h3>
                <p className="text-xs text-stone-600 mt-0.5">
                  Tailored suggestions based on your family vision or current personal profile statement, interests, and hobbies.
                </p>
              </div>
              <button
                onClick={() => setShowAiGoalModal(false)}
                className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex gap-2 p-1.5 rounded-2xl bg-stone-100 text-xs font-semibold">
              <button
                onClick={() => handleFetchAiGoalSuggestions('FAMILY')}
                className={`flex-1 py-2.5 rounded-xl transition-all ${
                  aiScopeChoice === 'FAMILY'
                    ? 'bg-emerald-950 text-white shadow-xs'
                    : 'text-stone-700 hover:bg-stone-200'
                }`}
              >
                🏠 Family Goal Suggestions (From Family Vision)
              </button>
              <button
                onClick={() => handleFetchAiGoalSuggestions('PERSONAL')}
                className={`flex-1 py-2.5 rounded-xl transition-all ${
                  aiScopeChoice === 'PERSONAL'
                    ? 'bg-purple-950 text-white shadow-xs'
                    : 'text-stone-700 hover:bg-stone-200'
                }`}
              >
                👤 Personal Goal Suggestions (From User Profile)
              </button>
            </div>

            {/* Content Area */}
            {aiLoading ? (
              <div className="p-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-amber-600 mx-auto" />
                <p className="text-xs font-semibold text-stone-700">
                  Synthesizing {aiScopeChoice} suggestions using Gemini 3.8...
                </p>
              </div>
            ) : aiError ? (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2">
                <p className="font-bold">Generation Error:</p>
                <p>{aiError}</p>
                <button
                  onClick={() => handleFetchAiGoalSuggestions(aiScopeChoice)}
                  className="px-3 py-1 rounded-xl bg-rose-900 text-white font-semibold"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {aiSuggestionsList.length === 0 ? (
                  <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-200 text-stone-500 text-xs">
                    No suggestions available. Click a mode above to generate.
                  </div>
                ) : (
                  aiSuggestionsList.map((sug, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-2xl bg-stone-50 border border-stone-200 hover:border-amber-400/80 transition-all space-y-2 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                            {sug.category || 'FAMILY_GOVERNANCE'}
                          </span>
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                            {sug.priority || 'HIGH'} PRIORITY
                          </span>
                        </div>
                        <button
                          onClick={() => handleAcceptAiGoal(sug)}
                          className="px-3 py-1.5 rounded-xl font-bold bg-emerald-900 hover:bg-emerald-950 text-white flex items-center space-x-1 shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Accept & Add Goal</span>
                        </button>
                      </div>

                      <h4 className="font-serif font-bold text-base text-stone-900">{sug.title}</h4>
                      <p className="text-stone-700 leading-relaxed">{sug.description}</p>

                      <div className="pt-2 border-t border-stone-200/80 flex items-start space-x-2 text-[11px] text-amber-900">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <p>
                          <strong>AI Reasoning:</strong> {sug.reasoning}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
