import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  TrendingUp,
  Award,
  CheckCircle2,
  Clock,
  Heart,
  Users,
  Sparkles,
  Shield,
  Search,
  Trash2,
  Plus,
  Download
} from 'lucide-react';
import {
  readNamespacedCache,
  writeNamespacedCache,
  IS_DEV_FIXTURE_MODE,
} from '../utils/namespacedStorage';

interface ChildDevProfile {
  id: string;
  name: string;
  age: number;
  grade: string;
  milestones: string[];
  learningActivities: string[];
  interests: string[];
  readingProgress: string;
  skillsDevelopment: string[];
  achievements: string[];
  version?: number;
}

interface ChildRoutine {
  id: string;
  childName: string;
  title: string;
  schedule: string;
  steps: Array<{ id: string; text: string; completed: boolean }>;
  version?: number;
}

interface MicroLesson {
  id: string;
  topic: string;
  category: string;
  objective: string;
  explanation: string;
  practicalExample: string;
  reflectionQuestion: string;
  suggestedActivity: string;
  completed: boolean;
  userReflection?: string;
  version?: number;
}

export interface ParentingGrowthCenterProps {
  selectedRole: string;
  sessionToken?: string;
  familyId?: string;
  actorUserId?: string;
  actorMemberId?: string;
  actorDisplayName?: string;
  activeSubPage?: string;
  onSelectSubPage?: (subId: string) => void;
}

type ParentingSubTab =
  | 'child_profiles'
  | 'child_routines'
  | 'education'
  | 'resources'
  | 'personal_dev'
  | 'micro_learning'
  | 'wellbeing'
  | 'family_learning';

const SUBPAGE_TO_PARENTING_TAB: Record<string, ParentingSubTab> = {
  parent_resources: 'resources',
  parent_profiles: 'child_profiles',
  parent_routines: 'child_routines',
  parent_education: 'education',
  parent_personal: 'personal_dev',
  parent_micro: 'micro_learning',
  parent_wellbeing: 'wellbeing',
  parent_family_learning: 'family_learning',
};

const PARENTING_TAB_TO_SUBPAGE: Record<ParentingSubTab, string> = {
  resources: 'parent_resources',
  child_profiles: 'parent_profiles',
  child_routines: 'parent_routines',
  education: 'parent_education',
  personal_dev: 'parent_personal',
  micro_learning: 'parent_micro',
  wellbeing: 'parent_wellbeing',
  family_learning: 'parent_family_learning',
};

const DEFAULT_CHILD_PROFILES: ChildDevProfile[] = [
  {
    id: 'cd-lucas',
    name: 'Lucas Jenkins',
    age: 9,
    grade: 'Grade 4 • Westfield Elementary',
    milestones: [
      'Completed first 200-page chapter book independently',
      'Mastered multiplication tables 1–12',
      'Elected team captain for youth soccer practice',
    ],
    learningActivities: ['LEGO Robotics Builders Club', 'Weekly library reading log', 'Beginner piano chords'],
    interests: ['Soccer', 'Space Exploration', 'LEGO Engineering', 'Science Experiments'],
    readingProgress: '25 minutes daily • Currently reading "The Wild Robot" (Chapter 18)',
    skillsDevelopment: ['Teamwork & sportsmanship', 'Saving 20% of chore points', 'Morning routine independence'],
    achievements: ['Student of the Month — Kindness Award', 'Completed 14-day reading streak'],
  },
  {
    id: 'cd-maya',
    name: 'Maya Jenkins',
    age: 16,
    grade: 'Grade 10 • Westfield High School',
    milestones: [
      'Selected for Regional Youth Photography Exhibition',
      'Varsity 400m Track personal best',
      'Completed First Aid & Babysitting Certification',
    ],
    learningActivities: ['AP World History seminar', 'Digital Darkroom & Composition course', 'Personal budgeting & debit management'],
    interests: ['Digital Photography', 'Track & Field', 'Environmental Science', 'Acoustic Guitar'],
    readingProgress: '35 minutes daily • Reading "Atomic Habits" & AP History primary sources',
    skillsDevelopment: ['Time blocking for exams', 'Public speaking', 'Financial literacy & expense tracking'],
    achievements: ['Honor Roll Fall Semester', '1st Place School Photo Essay'],
  },
];

const DEFAULT_ROUTINES: ChildRoutine[] = [
  {
    id: 'cr-1',
    childName: 'Lucas Jenkins',
    title: 'Morning School Preparation',
    schedule: 'Weekdays • 7:00 AM – 7:45 AM',
    steps: [
      { id: 's1', text: 'Make bed and open curtains', completed: true },
      { id: 's2', text: 'Brush teeth and get dressed', completed: true },
      { id: 's3', text: 'Eat healthy breakfast & clear plate', completed: true },
      { id: 's4', text: 'Pack homework folder and water bottle', completed: false },
    ],
  },
  {
    id: 'cr-2',
    childName: 'Lucas Jenkins',
    title: 'After-School & Bedtime Wind-Down',
    schedule: 'Weekdays • 4:00 PM – 8:30 PM',
    steps: [
      { id: 's5', text: '20 minutes homework & math practice', completed: true },
      { id: 's6', text: 'Outdoor play / soccer practice', completed: true },
      { id: 's7', text: '25 minutes chapter book reading', completed: false },
      { id: 's8', text: 'Lay out tomorrow’s clothes & lights out by 8:30 PM', completed: false },
    ],
  },
  {
    id: 'cr-3',
    childName: 'Maya Jenkins',
    title: 'High School Study & Evening Routine',
    schedule: 'Weekdays • 4:30 PM – 10:00 PM',
    steps: [
      { id: 's9', text: 'Focused AP study block (45 mins)', completed: true },
      { id: 's10', text: 'Camera gear / track bag prep', completed: true },
      { id: 's11', text: 'Evening reading & journal reflection', completed: false },
    ],
  },
];

const DEFAULT_STUDY_ITEMS = [
  {
    id: 'ed-1',
    student: 'Lucas Jenkins',
    subject: 'STEM & Reading List',
    goal: 'Read 12 chapter books this semester & build solar rover kit',
    status: '8 of 12 books completed',
    schedule: 'Mon–Fri • 4:15 PM',
    completed: false,
    version: 1,
  },
  {
    id: 'ed-2',
    student: 'Maya Jenkins',
    subject: 'AP World History & Portfolio Homework',
    goal: 'Complete primary source essay and prepare 15-piece portfolio',
    status: '11 of 15 pieces curated',
    schedule: 'Mon–Thu • 5:00 PM',
    completed: false,
    version: 1,
  },
];

const DEFAULT_LESSONS: MicroLesson[] = [
  {
    id: 'ml-1',
    topic: 'Active Listening in Family Conversations',
    category: 'Communication',
    objective: 'Practice reflective listening before offering advice or solutions.',
    explanation: 'When family members feel heard first, defensiveness drops and collaborative problem-solving becomes natural.',
    practicalExample: 'Instead of "You should just do X," try: "It sounds like today felt overwhelming because of Y—is that right?"',
    reflectionQuestion: 'When did you feel most listened to by a family member this week?',
    suggestedActivity: 'Practice a 3-minute uninterrupted listening turn during dinner tonight.',
    completed: true,
    userReflection: 'Practiced during Tuesday dinner; helped Maya talk through her exam schedule calmly.',
  },
  {
    id: 'ml-2',
    topic: 'Teaching Children the 3-Jar Money Habit',
    category: 'Financial Literacy',
    objective: 'Help children allocate allowances or reward points into Save, Spend, and Share.',
    explanation: 'Visualizing money in distinct buckets builds delayed gratification and generosity early in life.',
    practicalExample: 'Lucas allocates 50% of chore points to his LEGO Space Station goal, 30% to spending, and 20% to family gifts.',
    reflectionQuestion: 'What savings milestone can we celebrate together this month?',
    suggestedActivity: 'Review savings goal progress together in the FamilyOS Money hub.',
    completed: false,
    userReflection: '',
  },
  {
    id: 'ml-3',
    topic: 'Designing Calm Evening Wind-Downs',
    category: 'Time Management & Wellbeing',
    objective: 'Create a 30-minute screen-free transition before sleep for both adults and children.',
    explanation: 'Lowering visual stimulation and preparing tomorrow’s essentials reduces morning rush and improves sleep quality.',
    practicalExample: 'At 8:00 PM, dim living room lights, pack backpacks, and read together for 20 minutes.',
    reflectionQuestion: 'What single evening habit makes your next morning feel 50% calmer?',
    suggestedActivity: 'Test a household-wide 8:30 PM device dock challenge for 5 nights.',
    completed: false,
    userReflection: '',
  },
];

const DEFAULT_PERSONAL_GOALS = [
  { id: 'pg-1', member: 'Sarah Jenkins', ownerUserId: 'usr-sarah-owner', category: 'Leadership & Wellbeing', title: 'Executive Mindful Leadership & Half-Marathon Prep', progress: 75, nextAction: 'Complete Saturday 10km trail run and Chapter 6 reflection', isPrivate: false, version: 1 },
  { id: 'pg-2', member: 'David Jenkins', ownerUserId: 'usr-david-admin', category: 'Financial Literacy & Craft', title: 'Generational Estate Stewardship & Custom Furniture Joinery', progress: 60, nextAction: 'Finish oak bookshelf joinery with Lucas on Sunday', isPrivate: false, version: 1 },
  { id: 'pg-3', member: 'Maya Jenkins', ownerUserId: 'usr-maya-teen', category: 'Time Management & Life Skills', title: 'Independent Monthly Budget & College Prep Portfolio', progress: 80, nextAction: 'Reconcile October personal expenses in Money hub', isPrivate: false, version: 1 },
];

const DEFAULT_HABITS = [
  { id: 'hb-1', title: 'Family Outdoor Walk or Active Play (30+ mins)', member: 'Whole Family', streakDays: 9, completedToday: true, version: 1 },
  { id: 'hb-2', title: '8 Glasses Hydration & Whole-Food Meals', member: 'Sarah & David', streakDays: 14, completedToday: true, version: 1 },
  { id: 'hb-3', title: 'Evening Gratitude & Reading Before Sleep', member: 'Maya & Lucas', streakDays: 11, completedToday: false, version: 1 },
];

const DEFAULT_FAMILY_LEARNING = [
  { id: 'fl-1', title: 'Weekly Family Reading Hour', category: 'Reading Challenge', schedule: 'Sundays • 4:00 PM', topic: 'Everyone reads in the living room with herbal tea & shares one favorite insight.', version: 1 },
  { id: 'fl-2', title: 'Monthly Household Financial Literacy Workshop', category: 'Financial Literacy', schedule: 'First Saturday • 10:00 AM', topic: 'Review how household utility budgets and savings goals work in age-appropriate terms.', version: 1 },
  { id: 'fl-3', title: 'Hands-On Life Skills: Cooking & Home Care', category: 'Life Skills', schedule: 'Wednesdays • 5:30 PM', topic: 'Maya and Lucas co-lead preparing a family recipe from the Recipe Library.', version: 1 },
];

export const ParentingGrowthCenter: React.FC<ParentingGrowthCenterProps> = ({
  selectedRole,
  sessionToken,
  familyId,
  actorUserId,
  actorMemberId,
  actorDisplayName,
  activeSubPage,
  onSelectSubPage,
}) => {
  const resolvedFamilyId = familyId || '';
  const resolvedUserId = actorUserId || '';
  const cacheScope = resolvedFamilyId && resolvedUserId ? { userAccountId: resolvedUserId, familyId: resolvedFamilyId } : null;

  const [activeSubTab, setActiveSubTab] = useState<ParentingSubTab>(
    (activeSubPage && SUBPAGE_TO_PARENTING_TAB[activeSubPage]) || 'resources'
  );

  useEffect(() => {
    if (activeSubPage && SUBPAGE_TO_PARENTING_TAB[activeSubPage]) {
      setActiveSubTab(SUBPAGE_TO_PARENTING_TAB[activeSubPage]);
    }
  }, [activeSubPage]);

  const handleSelectParentingTab = (tab: ParentingSubTab) => {
    setActiveSubTab(tab);
    setValidationError(null);
    if (onSelectSubPage) {
      onSelectSubPage(PARENTING_TAB_TO_SUBPAGE[tab]);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [conflictBanner, setConflictBanner] = useState<string | null>(null);

  const parentingResources = [
    {
      id: 'pr-1',
      topic: 'Positive Parenting & Encouragement',
      category: 'Positive Parenting',
      summary: 'Focus on Effort Over Outcome: Acknowledge specific effort, patience, and kindness rather than only final results.',
      ageGroup: 'All Ages',
      practiceTip: 'Use "I noticed how patiently you..." during evening family check-ins.',
    },
    {
      id: 'pr-2',
      topic: 'Emotion Coaching During Transitions',
      category: 'Emotional Development',
      summary: 'Help children name feelings before problem-solving when transitioning from play or screens to homework and bedtime.',
      ageGroup: 'Ages 5–12',
      practiceTip: 'Give a 10-minute gentle heads-up before changing activities.',
    },
    {
      id: 'pr-3',
      topic: 'Building Autonomy & Responsibility in Teens',
      category: 'Parent-Child Relationships',
      summary: 'Invite teenagers to co-design their study schedule and personal savings goals so they build self-management confidence.',
      ageGroup: 'Ages 13–18',
      practiceTip: 'Hold a 15-minute Sunday planning chat where your teen leads the agenda.',
    },
    {
      id: 'pr-4',
      topic: 'Constructive Discipline & Natural Consequences',
      category: 'Discipline Approaches',
      summary: 'Establish clear, calm household expectations connected to shared responsibility rather than reactive punishment.',
      ageGroup: 'All Ages',
      practiceTip: 'Review shared household expectations together during calm moments.',
    },
  ];

  const [childProfiles, setChildProfiles] = useState<ChildDevProfile[]>(() =>
    readNamespacedCache(cacheScope, 'parenting', 'childProfiles', IS_DEV_FIXTURE_MODE ? DEFAULT_CHILD_PROFILES : [])
  );
  const [newMilestoneChildId, setNewMilestoneChildId] = useState('cd-lucas');
  const [newMilestoneText, setNewMilestoneText] = useState('');

  const [childRoutines, setChildRoutines] = useState<ChildRoutine[]>(() =>
    readNamespacedCache(cacheScope, 'parenting', 'childRoutines', IS_DEV_FIXTURE_MODE ? DEFAULT_ROUTINES : [])
  );
  const [newRoutineStepText, setNewRoutineStepText] = useState<Record<string, string>>({});

  const [studyItems, setStudyItems] = useState(() =>
    readNamespacedCache(cacheScope, 'parenting', 'studyItems', IS_DEV_FIXTURE_MODE ? DEFAULT_STUDY_ITEMS : [])
  );
  const [newStudyStudent, setNewStudyStudent] = useState('Lucas Jenkins');
  const [newStudySubject, setNewStudySubject] = useState('');
  const [newStudyGoal, setNewStudyGoal] = useState('');

  const [personalGrowthGoals, setPersonalGrowthGoals] = useState(() =>
    readNamespacedCache(cacheScope, 'parenting', 'personalGrowthGoals', IS_DEV_FIXTURE_MODE ? DEFAULT_PERSONAL_GOALS : [])
  );
  const [newPersonalMember, setNewPersonalMember] = useState(actorDisplayName || 'Sarah Jenkins');
  const [newPersonalTitle, setNewPersonalTitle] = useState('');
  const [newPersonalAction, setNewPersonalAction] = useState('');

  const [lessons, setLessons] = useState<MicroLesson[]>(() =>
    readNamespacedCache(cacheScope, 'parenting', 'lessons', IS_DEV_FIXTURE_MODE ? DEFAULT_LESSONS : [])
  );

  const [habits, setHabits] = useState(() =>
    readNamespacedCache(cacheScope, 'parenting', 'habits', IS_DEV_FIXTURE_MODE ? DEFAULT_HABITS : [])
  );
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitMember, setNewHabitMember] = useState('Whole Family');

  const [familyLearningItems, setFamilyLearningItems] = useState(() =>
    readNamespacedCache(cacheScope, 'parenting', 'familyLearningItems', IS_DEV_FIXTURE_MODE ? DEFAULT_FAMILY_LEARNING : [])
  );
  const [newFlTitle, setNewFlTitle] = useState('');
  const [newFlCategory, setNewFlCategory] = useState('Reading Challenge');
  const [newFlTopic, setNewFlTopic] = useState('');

  // Authoritative bidirectional GET hydration
  useEffect(() => {
    if (!sessionToken || !resolvedFamilyId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/v1/domain/${encodeURIComponent(resolvedFamilyId)}/parenting`, {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        if (!res.ok || cancelled) return;
        const payload = await res.json();
        const cols = payload?.collections;
        if (!cols || cancelled) return;
        if (Array.isArray(cols.childProfiles)) setChildProfiles(cols.childProfiles);
        if (Array.isArray(cols.childRoutines)) setChildRoutines(cols.childRoutines);
        if (Array.isArray(cols.studyItems)) setStudyItems(cols.studyItems);
        if (Array.isArray(cols.personalGrowthGoals)) setPersonalGrowthGoals(cols.personalGrowthGoals);
        if (Array.isArray(cols.lessons)) setLessons(cols.lessons);
        if (Array.isArray(cols.habits)) setHabits(cols.habits);
        if (Array.isArray(cols.familyLearningItems)) setFamilyLearningItems(cols.familyLearningItems);
      } catch {
        // Offline fallback uses namespaced cache
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionToken, resolvedFamilyId, resolvedUserId, selectedRole]);

  // Namespaced cache write
  useEffect(() => {
    if (!cacheScope) return;
    writeNamespacedCache(cacheScope, 'parenting', 'childProfiles', childProfiles);
    writeNamespacedCache(cacheScope, 'parenting', 'childRoutines', childRoutines);
    writeNamespacedCache(cacheScope, 'parenting', 'studyItems', studyItems);
    writeNamespacedCache(cacheScope, 'parenting', 'personalGrowthGoals', personalGrowthGoals);
    writeNamespacedCache(cacheScope, 'parenting', 'lessons', lessons);
    writeNamespacedCache(cacheScope, 'parenting', 'habits', habits);
    writeNamespacedCache(cacheScope, 'parenting', 'familyLearningItems', familyLearningItems);
  }, [cacheScope?.userAccountId, cacheScope?.familyId, childProfiles, childRoutines, studyItems, personalGrowthGoals, lessons, habits, familyLearningItems]);

  const persistSingleRecord = async (collection: string, recordId: string, recordData: Record<string, any>) => {
    if (!sessionToken || !resolvedFamilyId) return;
    try {
      const res = await fetch(
        `/api/v1/domain/${encodeURIComponent(resolvedFamilyId)}/parenting/${encodeURIComponent(collection)}/${encodeURIComponent(recordId)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({
            baseVersion: typeof recordData.version === 'number' ? recordData.version : undefined,
            data: recordData,
          }),
        }
      );
      if (res.status === 409) {
        const conflictJson = await res.json();
        setConflictBanner(
          conflictJson?.error || 'Concurrent edit conflict detected. Please refresh or review changes.'
        );
      }
    } catch {
      // Offline fallback retained in namespaced cache
    }
  };

  const deleteSingleRecord = async (collection: string, recordId: string) => {
    if (!sessionToken || !resolvedFamilyId) return;
    try {
      await fetch(
        `/api/v1/domain/${encodeURIComponent(resolvedFamilyId)}/parenting/${encodeURIComponent(collection)}/${encodeURIComponent(recordId)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${sessionToken}` },
        }
      );
    } catch {
      // Offline fallback
    }
  };

  const showToast = (msg: string) => {
    setStatusNotice(msg);
    setValidationError(null);
    setTimeout(() => setStatusNotice(null), 3500);
  };

  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneText.trim()) {
      setValidationError('Please enter a milestone description before saving.');
      return;
    }
    const target = childProfiles.find((cp) => cp.id === newMilestoneChildId);
    if (target) {
      const updated = { ...target, milestones: [newMilestoneText.trim(), ...target.milestones] };
      setChildProfiles((prev) => prev.map((cp) => (cp.id === newMilestoneChildId ? updated : cp)));
      void persistSingleRecord('childProfiles', updated.id, updated);
    }
    setNewMilestoneText('');
    showToast('Developmental milestone recorded.');
  };

  const handleToggleRoutineStep = (routineId: string, stepId: string) => {
    const target = childRoutines.find((r) => r.id === routineId);
    if (!target) return;
    const updated: ChildRoutine = {
      ...target,
      steps: target.steps.map((s) => (s.id === stepId ? { ...s, completed: !s.completed } : s)),
    };
    setChildRoutines((prev) => prev.map((r) => (r.id === routineId ? updated : r)));
    void persistSingleRecord('childRoutines', routineId, updated);
  };

  const handleAddRoutineStep = (routineId: string) => {
    const text = (newRoutineStepText[routineId] || '').trim();
    if (!text) return;
    const target = childRoutines.find((r) => r.id === routineId);
    if (!target) return;
    const updated: ChildRoutine = {
      ...target,
      steps: [...target.steps, { id: `step-${Date.now()}`, text, completed: false }],
    };
    setChildRoutines((prev) => prev.map((r) => (r.id === routineId ? updated : r)));
    void persistSingleRecord('childRoutines', routineId, updated);
    setNewRoutineStepText((prev) => ({ ...prev, [routineId]: '' }));
    showToast('Routine step added.');
  };

  const handleAddStudyItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudySubject.trim() || !newStudyGoal.trim()) {
      setValidationError('Both subject and learning goal are required.');
      return;
    }
    const newItem = {
      id: `ed-${Date.now()}`,
      student: newStudyStudent,
      subject: newStudySubject.trim(),
      goal: newStudyGoal.trim(),
      status: 'Active Learning Plan',
      schedule: 'Weekly Study Schedule',
      completed: false,
      version: 1,
    };
    setStudyItems([newItem, ...studyItems]);
    void persistSingleRecord('studyItems', newItem.id, newItem);
    setNewStudySubject('');
    setNewStudyGoal('');
    showToast('Homework & study goal saved.');
  };

  const handleAddPersonalGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonalTitle.trim()) {
      setValidationError('Please enter a personal development goal title.');
      return;
    }
    const newGoal = {
      id: `pg-${Date.now()}`,
      member: newPersonalMember,
      ownerUserId: resolvedUserId || '',
      ownerMemberId: actorMemberId || '',
      category: 'Personal Growth',
      title: newPersonalTitle.trim(),
      progress: 25,
      nextAction: newPersonalAction.trim() || 'Schedule weekly practice block',
      isPrivate: false,
      version: 1,
    };
    setPersonalGrowthGoals([newGoal, ...personalGrowthGoals]);
    void persistSingleRecord('personalGrowthGoals', newGoal.id, newGoal);
    setNewPersonalTitle('');
    setNewPersonalAction('');
    showToast('Personal development goal created.');
  };

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) {
      setValidationError('Please enter a habit title.');
      return;
    }
    const newHabit = {
      id: `hb-${Date.now()}`,
      title: newHabitTitle.trim(),
      member: newHabitMember,
      streakDays: 1,
      completedToday: true,
      version: 1,
    };
    setHabits([newHabit, ...habits]);
    void persistSingleRecord('habits', newHabit.id, newHabit);
    setNewHabitTitle('');
    showToast('Healthy habit added.');
  };

  const handleAddFamilyLearning = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlTitle.trim()) {
      setValidationError('Please enter a family learning activity title.');
      return;
    }
    const newFl = {
      id: `fl-${Date.now()}`,
      title: newFlTitle.trim(),
      category: newFlCategory,
      schedule: 'Weekly Family Session',
      topic: newFlTopic.trim() || 'Shared family learning activity.',
      version: 1,
    };
    setFamilyLearningItems([newFl, ...familyLearningItems]);
    void persistSingleRecord('familyLearningItems', newFl.id, newFl);
    setNewFlTitle('');
    setNewFlTopic('');
    showToast('Family learning session added.');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl p-6 sm:p-8 bg-[#173D35] text-white shadow-xs">
        <div className="max-w-3xl space-y-2">
          <div className="text-xs font-semibold text-[#E5C388] tracking-wide">
            Parenting & Growth — The Development Center
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
            Child Development, Education, Wellbeing & Lifelong Family Learning
          </h2>
          <p className="text-sm text-emerald-100/90 leading-relaxed">
            Support children’s milestones, routines, and school progress while encouraging continuous personal development and healthy habits without comparing children against one another.
          </p>
        </div>

        {/* Sub-navigation */}
        <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-white/15">
          {[
            { id: 'resources', label: 'Parenting Resources' },
            { id: 'child_profiles', label: 'Child Profiles & Milestones' },
            { id: 'child_routines', label: 'Children’s Routines' },
            { id: 'education', label: 'Education & Learning' },
            { id: 'personal_dev', label: 'Personal Development' },
            { id: 'micro_learning', label: 'Micro-Learning Library' },
            { id: 'wellbeing', label: 'Wellbeing & Healthy Habits' },
            { id: 'family_learning', label: 'Family Learning & Curricula' },
          ].map((tab) => {
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectParentingTab(tab.id as ParentingSubTab)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#C39A60] text-[#173D35]'
                    : 'bg-white/10 text-emerald-100 hover:bg-white/15'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Progress Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search milestones, routines, books, lessons, or habits..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-stone-200 text-xs"
          />
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200">
            {childProfiles.reduce((acc, c) => acc + c.milestones.length, 0)} Milestones Recorded
          </span>
          <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-900 font-semibold border border-amber-200">
            {lessons.filter((l) => l.completed).length}/{lessons.length} Micro-Lessons Completed
          </span>
        </div>
      </div>

      {conflictBanner && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-medium flex items-center justify-between">
          <span>{conflictBanner}</span>
          <button type="button" onClick={() => setConflictBanner(null)} className="font-bold underline ml-3">
            Dismiss
          </button>
        </div>
      )}

      {validationError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium flex items-center justify-between">
          <span>{validationError}</span>
          <button type="button" onClick={() => setValidationError(null)} className="font-bold underline ml-3">
            Dismiss
          </button>
        </div>
      )}

      {statusNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-medium flex items-center justify-between">
          <span>{statusNotice}</span>
          <button type="button" onClick={() => setStatusNotice(null)} className="font-bold underline ml-3">
            Dismiss
          </button>
        </div>
      )}

      {/* 8.2 CHILD PROFILES & DEVELOPMENT */}
      {activeSubTab === 'child_profiles' && (
        <div className="space-y-6">
          <div className="rounded-3xl p-5 bg-white border border-stone-200 shadow-xs">
            <form onSubmit={handleAddMilestone} className="flex flex-wrap items-center gap-3 text-xs">
              <span className="font-bold text-stone-900">Record New Developmental Milestone:</span>
              <select
                value={newMilestoneChildId}
                onChange={(e) => setNewMilestoneChildId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-stone-300 bg-white"
              >
                {childProfiles.map((cp) => (
                  <option key={cp.id} value={cp.id}>{cp.name}</option>
                ))}
              </select>
              <input
                type="text"
                value={newMilestoneText}
                onChange={(e) => setNewMilestoneText(e.target.value)}
                placeholder="Describe milestone, skill, or achievement... *"
                className="flex-1 min-w-[240px] px-3 py-2 rounded-xl border border-stone-300"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#173D35] text-white font-semibold hover:bg-emerald-950 cursor-pointer"
              >
                + Record Milestone
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {childProfiles.map((cp) => (
              <div key={cp.id} className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div>
                    <h3 className="font-serif font-bold text-xl text-stone-900">{cp.name}</h3>
                    <p className="text-xs text-stone-500">Age {cp.age} • {cp.grade}</p>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-900">
                    Individual Growth Profile
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs space-y-1">
                  <span className="font-bold text-amber-950 block">Reading Progress</span>
                  <p className="text-amber-900">{cp.readingProgress}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
                    <span className="font-bold text-stone-900 block">Recent Milestones</span>
                    <ul className="space-y-1.5 text-stone-600">
                      {cp.milestones
                        .filter((m) => !searchQuery.trim() || m.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((m, i) => (
                          <li key={i} className="flex items-start justify-between gap-2">
                            <span>• {m}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = {
                                  ...cp,
                                  milestones: cp.milestones.filter((_, idx) => idx !== i),
                                };
                                setChildProfiles((prev) =>
                                  prev.map((prof) => (prof.id === cp.id ? updated : prof))
                                );
                                void persistSingleRecord('childProfiles', cp.id, updated);
                              }}
                              className="text-stone-400 hover:text-rose-600 shrink-0 cursor-pointer"
                              title="Remove milestone"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </li>
                        ))}
                    </ul>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
                    <span className="font-bold text-stone-900 block">Skills & Learning Activities</span>
                    <ul className="space-y-1 text-stone-600 list-disc list-inside">
                      {cp.learningActivities.map((act, i) => (
                        <li key={i}>{act}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {cp.interests.map((interest, idx) => (
                    <span key={idx} className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8.3 CHILDREN'S ROUTINES */}
      {activeSubTab === 'child_routines' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {childRoutines.map((r) => {
            const doneCount = r.steps.filter((s) => s.completed).length;
            return (
              <div key={r.id} className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="border-b border-stone-100 pb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">{r.childName}</span>
                      <span className="text-[11px] font-mono font-bold text-stone-500">
                        {doneCount}/{r.steps.length} Done
                      </span>
                    </div>
                    <h3 className="font-serif font-bold text-lg text-stone-900 mt-0.5">{r.title}</h3>
                    <p className="text-xs text-stone-500 mt-0.5">{r.schedule}</p>
                  </div>
                  <div className="space-y-2 text-xs">
                    {r.steps.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleToggleRoutineStep(r.id, s.id)}
                        className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                          s.completed
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                            : 'bg-stone-50 border-stone-200 text-stone-800 hover:bg-stone-100'
                        }`}
                      >
                        <span className={s.completed ? 'line-through text-stone-500' : 'font-medium'}>{s.text}</span>
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${s.completed ? 'text-emerald-700' : 'text-stone-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 flex gap-2 text-xs">
                  <input
                    type="text"
                    value={newRoutineStepText[r.id] || ''}
                    onChange={(e) => setNewRoutineStepText({ ...newRoutineStepText, [r.id]: e.target.value })}
                    placeholder="Add routine step..."
                    className="flex-1 px-2.5 py-1.5 rounded-xl border border-stone-300"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddRoutineStep(r.id)}
                    className="px-3 py-1.5 rounded-xl bg-[#173D35] text-white font-semibold cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 8.4 EDUCATION, READING LISTS & HOMEWORK PLANNER */}
      {activeSubTab === 'education' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-lg text-stone-900">Add Homework, Book or Study Goal</h3>
            <p className="text-xs text-stone-500">
              Coordinate reading lists, school projects, study schedules, and learning goals.
            </p>
            <form onSubmit={handleAddStudyItem} className="space-y-3 text-xs">
              <select
                value={newStudyStudent}
                onChange={(e) => setNewStudyStudent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
              >
                <option value="Lucas Jenkins">Lucas Jenkins</option>
                <option value="Maya Jenkins">Maya Jenkins</option>
              </select>
              <input
                type="text"
                value={newStudySubject}
                onChange={(e) => setNewStudySubject(e.target.value)}
                placeholder="Subject or Book Title (e.g. Science Fair / The Wild Robot) *"
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
              />
              <input
                type="text"
                value={newStudyGoal}
                onChange={(e) => setNewStudyGoal(e.target.value)}
                placeholder="Target Milestone or Assignment Due Date *"
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#173D35] text-white font-semibold hover:bg-emerald-950 cursor-pointer"
              >
                + Save Learning Plan
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {studyItems.map((ed) => (
              <div key={ed.id} className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">{ed.student} • {ed.subject}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-stone-500">{ed.schedule}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = {
                          ...ed,
                          completed: !ed.completed,
                          status: !ed.completed ? 'Completed ✓' : 'Active Learning Plan',
                        };
                        setStudyItems((prev) => prev.map((item) => (item.id === ed.id ? updated : item)));
                        void persistSingleRecord('studyItems', ed.id, updated);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 text-xs font-semibold cursor-pointer"
                    >
                      {ed.completed ? 'Completed ✓' : 'Mark Complete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStudyItems((prev) => prev.filter((item) => item.id !== ed.id));
                        void deleteSingleRecord('studyItems', ed.id);
                      }}
                      className="p-1 text-rose-600 hover:text-rose-800 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h4 className={`font-serif font-bold text-base ${ed.completed ? 'line-through text-stone-400' : 'text-stone-900'}`}>
                  {ed.goal}
                </h4>
                <p className="text-xs text-stone-500">Progress: {ed.status}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8.1 PARENTING RESOURCES */}
      {activeSubTab === 'resources' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950">
            <strong>Educational Guidance Note:</strong> Parenting resources in FamilyOS are designed for supportive household education and never replace licensed medical or developmental diagnoses.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {parentingResources
              .filter(
                (pr) =>
                  !searchQuery.trim() ||
                  pr.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  pr.summary.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((pr) => (
                <div key={pr.id} className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                      {pr.category}
                    </span>
                    <span className="text-xs font-mono text-stone-500">{pr.ageGroup}</span>
                  </div>
                  <h3 className="font-serif font-bold text-lg text-stone-900">{pr.topic}</h3>
                  <p className="text-xs text-stone-600 leading-relaxed">{pr.summary}</p>
                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-emerald-950">
                    <strong>Practical Tip:</strong> {pr.practiceTip}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 8.5 PERSONAL DEVELOPMENT */}
      {activeSubTab === 'personal_dev' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-lg text-stone-900">Add Personal Development Goal</h3>
            <form onSubmit={handleAddPersonalGoal} className="space-y-3 text-xs">
              <select
                value={newPersonalMember}
                onChange={(e) => setNewPersonalMember(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
              >
                <option value="Sarah Jenkins">Sarah Jenkins</option>
                <option value="David Jenkins">David Jenkins</option>
                <option value="Maya Jenkins">Maya Jenkins</option>
              </select>
              <input
                type="text"
                value={newPersonalTitle}
                onChange={(e) => setNewPersonalTitle(e.target.value)}
                placeholder="Learning or Growth Goal Title *"
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
              />
              <input
                type="text"
                value={newPersonalAction}
                onChange={(e) => setNewPersonalAction(e.target.value)}
                placeholder="Next Action Step"
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#173D35] text-white font-semibold hover:bg-emerald-950 cursor-pointer"
              >
                + Save Personal Goal
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {personalGrowthGoals.map((pg) => (
              <div key={pg.id} className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
                <div>
                  <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">{pg.member}</span>
                  <h3 className="font-serif font-bold text-lg text-stone-900 mt-0.5">{pg.title}</h3>
                  <span className="text-xs text-stone-500">{pg.category}</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Progress</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{pg.progress}%</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...pg, progress: Math.min(100, pg.progress + 10) };
                          setPersonalGrowthGoals((prev) =>
                            prev.map((item) => (item.id === pg.id ? updated : item))
                          );
                          void persistSingleRecord('personalGrowthGoals', pg.id, updated);
                        }}
                        className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] font-bold cursor-pointer"
                      >
                        +10%
                      </button>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div className="h-full bg-[#173D35] rounded-full transition-all" style={{ width: `${pg.progress}%` }} />
                  </div>
                </div>
                <p className="text-xs text-stone-600">
                  <strong>Next Step:</strong> {pg.nextAction}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8.6 MICRO-LEARNING LIBRARY */}
      {activeSubTab === 'micro_learning' && (
        <div className="space-y-4">
          {lessons.map((ml) => (
            <div key={ml.id} className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                <div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
                    5-Minute Lesson • {ml.category}
                  </span>
                  <h3 className="font-serif font-bold text-lg text-stone-900 mt-1">{ml.topic}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...ml, completed: !ml.completed };
                    setLessons((prev) =>
                      prev.map((item) => (item.id === ml.id ? updated : item))
                    );
                    void persistSingleRecord('lessons', ml.id, updated);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                    ml.completed
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'bg-[#173D35] text-white hover:bg-emerald-950'
                  }`}
                >
                  {ml.completed ? 'Completed ✓' : 'Mark Lesson Complete'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                  <span className="font-bold text-stone-900 block">Lesson Objective & Key Explanation</span>
                  <p className="text-stone-700 font-medium">{ml.objective}</p>
                  <p className="text-stone-600">{ml.explanation}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-1">
                  <span className="font-bold text-emerald-950 block">Practical Example & Activity</span>
                  <p className="text-emerald-900">{ml.practicalExample}</p>
                  <p className="text-emerald-800 font-medium mt-1">Try this: {ml.suggestedActivity}</p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <p className="italic text-stone-600">
                  <strong>Reflection Question:</strong> “{ml.reflectionQuestion}”
                </p>
                <input
                  type="text"
                  value={ml.userReflection || ''}
                  onChange={(e) => {
                    const updated = { ...ml, userReflection: e.target.value };
                    setLessons((prev) =>
                      prev.map((item) => (item.id === ml.id ? updated : item))
                    );
                    void persistSingleRecord('lessons', ml.id, updated);
                  }}
                  placeholder="Write your personal or family reflection note here (auto-saves)..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 8.7 WELLBEING & HEALTHY HABITS */}
      {activeSubTab === 'wellbeing' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-lg text-stone-900">Add Healthy Family Habit</h3>
            <p className="text-xs text-stone-500">
              Track supportive daily routines without punitive comparisons.
            </p>
            <form onSubmit={handleAddHabit} className="space-y-3 text-xs">
              <input
                type="text"
                value={newHabitTitle}
                onChange={(e) => setNewHabitTitle(e.target.value)}
                placeholder="Habit Title (e.g. 20-Min Evening Stretch) *"
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
              />
              <input
                type="text"
                value={newHabitMember}
                onChange={(e) => setNewHabitMember(e.target.value)}
                placeholder="Participants (e.g. Whole Family)"
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#173D35] text-white font-semibold hover:bg-emerald-950 cursor-pointer"
              >
                + Add Habit
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {habits.map((h) => (
              <div key={h.id} className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-950">
                    {h.streakDays}-Day Consistency
                  </span>
                  <h3 className="font-serif font-bold text-base text-stone-900 mt-3">{h.title}</h3>
                  <p className="text-xs text-stone-500 mt-1">Participants: {h.member}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const updated = {
                      ...h,
                      completedToday: !h.completedToday,
                      streakDays: !h.completedToday ? h.streakDays + 1 : Math.max(0, h.streakDays - 1),
                    };
                    setHabits((prev) => prev.map((item) => (item.id === h.id ? updated : item)));
                    void persistSingleRecord('habits', h.id, updated);
                  }}
                  className={`w-full py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                    h.completedToday
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-800'
                  }`}
                >
                  {h.completedToday ? 'Completed Today ✓' : 'Check Off for Today'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8.8 FAMILY LEARNING */}
      {activeSubTab === 'family_learning' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-lg text-stone-900">Schedule Family Learning Session</h3>
            <form onSubmit={handleAddFamilyLearning} className="space-y-3 text-xs">
              <input
                type="text"
                value={newFlTitle}
                onChange={(e) => setNewFlTitle(e.target.value)}
                placeholder="Session Title *"
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
              />
              <select
                value={newFlCategory}
                onChange={(e) => setNewFlCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
              >
                <option value="Reading Challenge">Reading Challenge</option>
                <option value="Financial Literacy">Financial Literacy</option>
                <option value="Life Skills">Life Skills</option>
                <option value="Educational Game">Educational Game</option>
              </select>
              <textarea
                rows={2}
                value={newFlTopic}
                onChange={(e) => setNewFlTopic(e.target.value)}
                placeholder="Topic or activity notes..."
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#173D35] text-white font-semibold hover:bg-emerald-950 cursor-pointer"
              >
                + Add Family Learning Session
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {familyLearningItems.map((fl) => (
              <div key={fl.id} className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                    {fl.category}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFamilyLearningItems((prev) => prev.filter((item) => item.id !== fl.id));
                      void deleteSingleRecord('familyLearningItems', fl.id);
                    }}
                    className="p-1 text-rose-600 hover:text-rose-800 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h3 className="font-serif font-bold text-lg text-stone-900">{fl.title}</h3>
                <p className="text-xs font-mono text-stone-500">{fl.schedule}</p>
                <p className="text-xs text-stone-600 leading-relaxed">{fl.topic}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
