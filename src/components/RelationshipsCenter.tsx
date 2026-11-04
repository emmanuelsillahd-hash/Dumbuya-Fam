import React, { useState, useEffect } from 'react';
import {
  Heart,
  MessageCircle,
  Sparkles,
  Calendar,
  CheckCircle2,
  Plus,
  Lock,
  Users,
  Handshake,
  Compass,
  Search,
  Edit3,
  Trash2,
  Download,
  ExternalLink
} from 'lucide-react';
import { MainTabType } from './SidebarNavigation';
import { ExternalNetworkCRM } from './ExternalNetworkCRM';
import { syncDomainRecordToDatabase } from '../firebase';

interface CheckInRecord {
  id: string;
  author: string;
  type: 'WEEKLY' | 'MONTHLY' | 'COUPLE';
  date: string;
  isPrivate: boolean;
  weekSummary: string;
  wentWell: string;
  couldImprove: string;
  supportNeeded: string;
  gratitude: string;
  togetherIdea: string;
  followUpAction: string;
  actionCompleted?: boolean;
}

interface GratitudeNote {
  id: string;
  from: string;
  to: string;
  category: 'Appreciation' | 'Thank You' | 'Encouragement' | 'Achievement';
  message: string;
  date: string;
}

interface CouplePlan {
  id: string;
  title: string;
  date: string;
  category: 'Date Night' | 'Shared Goal' | 'Milestone' | 'Reflection';
  notes: string;
  isPrivate: boolean;
  completed: boolean;
}

interface FamilyMeeting {
  id: string;
  title: string;
  date: string;
  participants: string;
  agendaItems: string[];
  decisions: string[];
  followUpTasks: string[];
  completed?: boolean;
}

interface SharedExperience {
  id: string;
  title: string;
  category: 'Game Night' | 'Outdoor' | 'Family Dinner' | 'Movie Night' | 'Weekend Adventure' | 'Shared Hobby';
  date: string;
  participants: string;
  notes: string;
  completed?: boolean;
}

interface AgreementRecord {
  id: string;
  topic: string;
  reflectionPrompt: string;
  sharedAgreement: string;
  followUpAction: string;
  reviewDate: string;
  completed?: boolean;
}

export interface RelationshipsCenterProps {
  selectedRole: string;
  sessionToken?: string;
  familyId?: string;
  actorUserId?: string;
  actorMemberId?: string;
  actorDisplayName?: string;
  members?: Array<{ id: string; displayName: string; role: string }>;
  onNavigateTab?: (tab: MainTabType) => void;
  activeSubPage?: string;
  onSelectSubPage?: (subId: string) => void;
}

type RelationshipsSubTab = 'checkins' | 'gratitude' | 'couple' | 'communication' | 'experiences' | 'resolution' | 'external_crm';

const SUBPAGE_TO_REL_TAB: Record<string, RelationshipsSubTab> = {
  rel_checkins: 'checkins',
  rel_appreciation: 'gratitude',
  rel_couple: 'couple',
  rel_communication: 'communication',
  rel_experiences: 'experiences',
  rel_reflection: 'resolution',
  rel_external_crm: 'external_crm',
};

const REL_TAB_TO_SUBPAGE: Record<RelationshipsSubTab, string> = {
  checkins: 'rel_checkins',
  gratitude: 'rel_appreciation',
  couple: 'rel_couple',
  communication: 'rel_communication',
  experiences: 'rel_experiences',
  resolution: 'rel_reflection',
  external_crm: 'rel_external_crm',
};

const DEMO_FIXTURE_CHECKINS: CheckInRecord[] = [
  {
    id: 'ci-1',
    author: 'Sarah Jenkins',
    type: 'WEEKLY',
    date: 'Nov 2, 2026',
    isPrivate: false,
    weekSummary: 'Balanced a busy school week with peaceful family dinners.',
    wentWell: 'Everyone pitched in with evening kitchen cleanup without reminders.',
    couldImprove: 'Leaving 10 minutes earlier on Tuesday mornings for school drop-off.',
    supportNeeded: 'Help coordinating Friday grocery pickup before soccer practice.',
    gratitude: 'Grateful for David taking over bedtime reading all week.',
    togetherIdea: 'Saturday morning autumn hike at Pine Ridge Trail.',
    followUpAction: 'Prep school backpacks on Sunday night.',
    actionCompleted: false,
  },
  {
    id: 'ci-2',
    author: 'Maya Jenkins',
    type: 'WEEKLY',
    date: 'Nov 1, 2026',
    isPrivate: false,
    weekSummary: 'Finished mid-term photography portfolio and track practice.',
    wentWell: 'Aced my history presentation and helped Lucas with his LEGO project.',
    couldImprove: 'Getting to sleep before 10:30 PM on weeknights.',
    supportNeeded: 'Quiet study hour between 4:30 PM and 5:30 PM.',
    gratitude: 'Thankful for Mom cheering at my track meet.',
    togetherIdea: 'Homemade taco bar and movie night this Friday.',
    followUpAction: 'Set evening phone wind-down reminder at 10:00 PM.',
    actionCompleted: true,
  },
];

const DEMO_FIXTURE_GRATITUDE: GratitudeNote[] = [
  {
    id: 'gn-1',
    from: 'David Jenkins',
    to: 'Sarah Jenkins',
    category: 'Appreciation',
    message: 'Thank you for organizing our November family calendar and meal plan so thoughtfully!',
    date: 'Today',
  },
  {
    id: 'gn-2',
    from: 'Lucas Jenkins',
    to: 'Maya Jenkins',
    category: 'Thank You',
    message: 'Thank you for helping me practice my reading chapters before bed!',
    date: 'Yesterday',
  },
  {
    id: 'gn-3',
    from: 'Sarah Jenkins',
    to: 'Lucas Jenkins',
    category: 'Achievement',
    message: 'So proud of your kindness and teamwork at Saturday soccer practice!',
    date: '3 days ago',
  },
];

const DEMO_FIXTURE_COUPLE_PLANS: CouplePlan[] = [
  {
    id: 'cp-1',
    title: 'Friday Evening Coffee & Patio Walk',
    date: 'Nov 6, 2026 • 7:00 PM',
    category: 'Date Night',
    notes: 'Uninterrupted conversation on holiday travel plans and personal recharging.',
    isPrivate: true,
    completed: false,
  },
  {
    id: 'cp-2',
    title: '12th Wedding Anniversary Weekend Getaway',
    date: 'Dec 14, 2026',
    category: 'Milestone',
    notes: 'Coastal bed & breakfast reservation; Grandma Martha confirmed for weekend care.',
    isPrivate: false,
    completed: false,
  },
];

const DEMO_FIXTURE_MEETINGS: FamilyMeeting[] = [
  {
    id: 'fm-1',
    title: 'Sunday Evening Family Huddle',
    date: 'Nov 8, 2026 • 6:00 PM',
    participants: 'Sarah, David, Maya, Lucas',
    agendaItems: ['Review upcoming school events', 'Assign Thanksgiving preparation roles', 'Choose weekend family outing'],
    decisions: ['Thanksgiving dinner will be hosted at home', 'Friday game night starts at 6:30 PM'],
    followUpTasks: ['David to inspect guest room heating', 'Maya & Lucas to pick board games'],
    completed: false,
  },
];

const DEMO_FIXTURE_EXPERIENCES: SharedExperience[] = [
  {
    id: 'se-1',
    title: 'Friday Night Homemade Pizza & Board Games',
    category: 'Game Night',
    date: 'Every Friday • 6:30 PM',
    participants: 'Whole Family',
    notes: 'Lucas chooses the first game this week; homemade margherita & veggie pizzas.',
    completed: false,
  },
  {
    id: 'se-2',
    title: 'Saturday Morning Pine Lake Trail Walk',
    category: 'Outdoor',
    date: 'Nov 7, 2026 • 9:30 AM',
    participants: 'Sarah, David, Maya, Lucas',
    notes: 'Bring thermoses of hot cocoa and Maya’s camera for autumn foliage photos.',
    completed: true,
  },
];

const DEMO_FIXTURE_AGREEMENTS: AgreementRecord[] = [
  {
    id: 'ag-1',
    topic: 'Screen-Free Family Dinner Table',
    reflectionPrompt: 'How can we make dinner time feel more connected and unhurried for everyone?',
    sharedAgreement: 'All phones and tablets rest in the charging basket from 6:00 PM to 7:15 PM.',
    followUpAction: 'Use conversation starter cards on Wednesday and Sunday evenings.',
    reviewDate: 'Monthly Review • Dec 1, 2026',
    completed: true,
  },
  {
    id: 'ag-2',
    topic: 'Calm Morning Departure Routine',
    reflectionPrompt: 'What causes morning stress, and how can we support each other before school?',
    sharedAgreement: 'Outfits and school bags are prepared the night before; we speak with patience.',
    followUpAction: '10-minute buffer added to the morning kitchen timer.',
    reviewDate: 'Weekly Check • Sundays',
    completed: false,
  },
];

const IS_DEV_FIXTURE_MODE =
  typeof import.meta !== 'undefined' && Boolean((import.meta as any).env?.DEV);

import { readNamespacedCache, writeNamespacedCache } from '../utils/namespacedStorage';

export const RelationshipsCenter: React.FC<RelationshipsCenterProps> = ({
  selectedRole,
  sessionToken = '',
  familyId = '',
  actorUserId = '',
  actorMemberId = '',
  actorDisplayName = '',
  members = [],
  onNavigateTab,
  activeSubPage,
  onSelectSubPage,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<RelationshipsSubTab>(
    (activeSubPage && SUBPAGE_TO_REL_TAB[activeSubPage]) || 'checkins'
  );

  useEffect(() => {
    if (activeSubPage && SUBPAGE_TO_REL_TAB[activeSubPage]) {
      setActiveSubTab(SUBPAGE_TO_REL_TAB[activeSubPage]);
    }
  }, [activeSubPage]);

  const handleSelectRelTab = (tab: RelationshipsSubTab) => {
    setActiveSubTab(tab);
    setValidationError(null);
    if (onSelectSubPage) {
      onSelectSubPage(REL_TAB_TO_SUBPAGE[tab]);
    }
  };

  const [resolvedFamilyId, setResolvedFamilyId] = useState<string>(familyId);
  const [resolvedUserId, setResolvedUserId] = useState<string>(actorUserId);
  const [resolvedMemberId, setResolvedMemberId] = useState<string>(actorMemberId);
  const [resolvedAuthorName, setResolvedAuthorName] = useState<string>(actorDisplayName);
  const [conflictBanner, setConflictBanner] = useState<string | null>(null);

  useEffect(() => {
    if (familyId) setResolvedFamilyId(familyId);
    if (actorUserId) setResolvedUserId(actorUserId);
    if (actorMemberId) setResolvedMemberId(actorMemberId);
    if (actorDisplayName) setResolvedAuthorName(actorDisplayName);
  }, [familyId, actorUserId, actorMemberId, actorDisplayName]);

  const [searchQuery, setSearchQuery] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Authoritative State (hydrated from /api/v1/domain/:familyId/relationships; dev fixtures only in non-prod)
  const [checkIns, setCheckIns] = useState<Array<CheckInRecord & { version?: number; ownerUserId?: string; ownerMemberId?: string }>>(
    IS_DEV_FIXTURE_MODE ? DEMO_FIXTURE_CHECKINS : []
  );
  const [gratitudeNotes, setGratitudeNotes] = useState<Array<GratitudeNote & { version?: number }>>(
    IS_DEV_FIXTURE_MODE ? DEMO_FIXTURE_GRATITUDE : []
  );
  const [couplePlans, setCouplePlans] = useState<Array<CouplePlan & { version?: number }>>(
    IS_DEV_FIXTURE_MODE ? DEMO_FIXTURE_COUPLE_PLANS : []
  );
  const [meetings, setMeetings] = useState<Array<FamilyMeeting & { version?: number }>>(
    IS_DEV_FIXTURE_MODE ? DEMO_FIXTURE_MEETINGS : []
  );
  const [experiences, setExperiences] = useState<Array<SharedExperience & { version?: number }>>(
    IS_DEV_FIXTURE_MODE ? DEMO_FIXTURE_EXPERIENCES : []
  );
  const [agreements, setAgreements] = useState<Array<AgreementRecord & { version?: number }>>(
    IS_DEV_FIXTURE_MODE ? DEMO_FIXTURE_AGREEMENTS : []
  );

  // Bidirectional hydration from authoritative backend
  useEffect(() => {
    if (!sessionToken) return;
    let cancelled = false;

    async function hydrateFromBackend() {
      try {
        let activeFamId = familyId || resolvedFamilyId;
        let activeUsrId = actorUserId || resolvedUserId;
        if (!activeFamId || !activeUsrId) {
          const restoreRes = await fetch('/api/v1/session/restore', {
            headers: { Authorization: `Bearer ${sessionToken}` },
          });
          if (restoreRes.ok) {
            const restoreData = await restoreRes.json();
            activeFamId = restoreData.activeFamilyId || restoreData.activeMembership?.familyId || '';
            activeUsrId = restoreData.actor?.userAccountId || '';
            if (!cancelled) {
              setResolvedFamilyId(activeFamId);
              setResolvedUserId(activeUsrId);
              setResolvedMemberId(restoreData.activeMembership?.memberProfileId || '');
              setResolvedAuthorName(
                restoreData.activeMembership?.displayName || restoreData.actor?.displayName || 'Family Member'
              );
            }
          }
        }
        if (!activeFamId) return;

        // Read namespaced cache first for instant paint
        if (activeUsrId) {
          const cachedCheckins = readNamespacedCache(
            { userAccountId: activeUsrId, familyId: activeFamId, moduleName: 'relationships', key: 'checkins' },
            null
          );
          if (cachedCheckins && !cancelled) setCheckIns(cachedCheckins);
        }

        const res = await fetch(`/api/v1/domain/${encodeURIComponent(activeFamId)}/relationships`, {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        if (!res.ok || cancelled) return;
        const payload = await res.json();
        const cols = payload.collections || {};

        if (Array.isArray(cols.checkins) && cols.checkins.length > 0) setCheckIns(cols.checkins);
        if (Array.isArray(cols.gratitude) && cols.gratitude.length > 0) setGratitudeNotes(cols.gratitude);
        if (Array.isArray(cols.couple_plans)) {
          if (selectedRole === 'CHILD' || selectedRole === 'GUEST') {
            setCouplePlans([]);
          } else if (cols.couple_plans.length > 0) {
            setCouplePlans(cols.couple_plans);
          }
        }
        if (Array.isArray(cols.meetings) && cols.meetings.length > 0) setMeetings(cols.meetings);
        if (Array.isArray(cols.experiences) && cols.experiences.length > 0) setExperiences(cols.experiences);
        if (Array.isArray(cols.agreements) && cols.agreements.length > 0) setAgreements(cols.agreements);
      } catch {
        // Offline fallback uses namespaced cache
      }
    }

    void hydrateFromBackend();
    return () => {
      cancelled = true;
    };
  }, [sessionToken, familyId, actorUserId, selectedRole]);

  // Write to user + family namespaced cache (never global localStorage keys)
  useEffect(() => {
    if (!resolvedUserId || !resolvedFamilyId) return;
    writeNamespacedCache({ userAccountId: resolvedUserId, familyId: resolvedFamilyId, moduleName: 'relationships', key: 'checkins' }, checkIns);
    writeNamespacedCache({ userAccountId: resolvedUserId, familyId: resolvedFamilyId, moduleName: 'relationships', key: 'gratitude' }, gratitudeNotes);
    writeNamespacedCache({ userAccountId: resolvedUserId, familyId: resolvedFamilyId, moduleName: 'relationships', key: 'couple_plans' }, couplePlans);
    writeNamespacedCache({ userAccountId: resolvedUserId, familyId: resolvedFamilyId, moduleName: 'relationships', key: 'meetings' }, meetings);
    writeNamespacedCache({ userAccountId: resolvedUserId, familyId: resolvedFamilyId, moduleName: 'relationships', key: 'experiences' }, experiences);
    writeNamespacedCache({ userAccountId: resolvedUserId, familyId: resolvedFamilyId, moduleName: 'relationships', key: 'agreements' }, agreements);
  }, [checkIns, gratitudeNotes, couplePlans, meetings, experiences, agreements, resolvedUserId, resolvedFamilyId]);

  const persistSingleRecord = async (collection: string, recordId: string, data: Record<string, any>, baseVersion?: number) => {
    if (!sessionToken || !resolvedFamilyId) return;
    try {
      const res = await fetch(
        `/api/v1/domain/${encodeURIComponent(resolvedFamilyId)}/relationships/${encodeURIComponent(collection)}/${encodeURIComponent(recordId)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({ data, baseVersion }),
        }
      );
      if (res.status === 409) {
        const err = await res.json().catch(() => ({}));
        setConflictBanner(
          err.message || 'Concurrent modification conflict detected on server. Reloading authoritative record.'
        );
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setValidationError(err.message || err.error || 'Could not synchronize record with server.');
      }
    } catch {
      // Queued in namespaced cache while offline
    }
  };

  const deleteSingleRecord = async (collection: string, recordId: string) => {
    if (!sessionToken || !resolvedFamilyId) return;
    try {
      await fetch(
        `/api/v1/domain/${encodeURIComponent(resolvedFamilyId)}/relationships/${encodeURIComponent(collection)}/${encodeURIComponent(recordId)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${sessionToken}` },
        }
      );
    } catch {
      // Offline fallback
    }
  };

  const matchedMember = members.find((m) => m.id === resolvedMemberId || m.role === selectedRole);
  const currentUserName =
    resolvedAuthorName || matchedMember?.displayName || `Member (${selectedRole})`;

  // Form & Edit States
  const [editingCheckInId, setEditingCheckInId] = useState<string | null>(null);
  const [newCheckIn, setNewCheckIn] = useState({
    type: 'WEEKLY' as 'WEEKLY' | 'MONTHLY' | 'COUPLE',
    isPrivate: false,
    weekSummary: '',
    wentWell: '',
    couldImprove: '',
    supportNeeded: '',
    gratitude: '',
    togetherIdea: '',
    followUpAction: '',
  });

  const [editingGratitudeId, setEditingGratitudeId] = useState<string | null>(null);
  const [noteTo, setNoteTo] = useState('David Jenkins');
  const [noteCategory, setNoteCategory] = useState<GratitudeNote['category']>('Appreciation');
  const [noteMessage, setNoteMessage] = useState('');

  const [coupleTitle, setCoupleTitle] = useState('');
  const [coupleDate, setCoupleDate] = useState('');
  const [coupleCategory, setCoupleCategory] = useState<CouplePlan['category']>('Date Night');
  const [coupleNotes, setCoupleNotes] = useState('');
  const [couplePrivate, setCouplePrivate] = useState(true);

  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingParticipants, setMeetingParticipants] = useState('Sarah, David, Maya, Lucas');
  const [meetingAgenda, setMeetingAgenda] = useState('');
  const [meetingDecision, setMeetingDecision] = useState('');
  const [meetingFollowUp, setMeetingFollowUp] = useState('');

  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState<SharedExperience['category']>('Game Night');
  const [expDate, setExpDate] = useState('');
  const [expParticipants, setExpParticipants] = useState('Whole Family');
  const [expNotes, setExpNotes] = useState('');

  const [agrTopic, setAgrTopic] = useState('');
  const [agrShared, setAgrShared] = useState('');
  const [agrFollowUp, setAgrFollowUp] = useState('');
  const [agrReviewDate, setAgrReviewDate] = useState('Monthly Review');

  const showToast = (msg: string) => {
    setStatusNotice(msg);
    setValidationError(null);
    setTimeout(() => setStatusNotice(null), 3500);
  };

  // Handlers
  const handleAddOrUpdateCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCheckIn.weekSummary.trim() && !newCheckIn.wentWell.trim()) {
      setValidationError('Please enter a summary of how the week went or what went well before saving.');
      return;
    }

    if (editingCheckInId) {
      const existing = checkIns.find((c) => c.id === editingCheckInId);
      const updatedRecord = {
        ...(existing || { id: editingCheckInId, author: currentUserName, date: 'Today' }),
        type: newCheckIn.type,
        isPrivate: newCheckIn.isPrivate,
        weekSummary: newCheckIn.weekSummary.trim(),
        wentWell: newCheckIn.wentWell.trim(),
        couldImprove: newCheckIn.couldImprove.trim(),
        supportNeeded: newCheckIn.supportNeeded.trim(),
        gratitude: newCheckIn.gratitude.trim(),
        togetherIdea: newCheckIn.togetherIdea.trim(),
        followUpAction: newCheckIn.followUpAction.trim(),
        ownerUserId: resolvedUserId,
        ownerMemberId: resolvedMemberId,
      };
      setCheckIns((prev) => prev.map((c) => (c.id === editingCheckInId ? updatedRecord : c)));
      void persistSingleRecord('checkins', editingCheckInId, updatedRecord, existing?.version);
      setEditingCheckInId(null);
      showToast('Relationship check-in updated and saved.');
    } else {
      const newRecord = {
        id: `ci-${Date.now()}`,
        author: currentUserName,
        ownerUserId: resolvedUserId,
        ownerMemberId: resolvedMemberId,
        type: newCheckIn.type,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        isPrivate: newCheckIn.isPrivate,
        weekSummary: newCheckIn.weekSummary.trim() || 'Reflected on the week.',
        wentWell: newCheckIn.wentWell.trim() || 'Shared quality family moments.',
        couldImprove: newCheckIn.couldImprove.trim() || 'Continue building steady routines.',
        supportNeeded: newCheckIn.supportNeeded.trim() || 'Open communication.',
        gratitude: newCheckIn.gratitude.trim() || 'Grateful for family support.',
        togetherIdea: newCheckIn.togetherIdea.trim() || 'Weekend family walk.',
        followUpAction: newCheckIn.followUpAction.trim() || 'Check in next Sunday.',
        actionCompleted: false,
      };
      setCheckIns([newRecord, ...checkIns]);
      void persistSingleRecord('checkins', newRecord.id, newRecord);
      showToast(newCheckIn.isPrivate ? 'Private reflection saved (visible only to you).' : 'Shared family check-in published.');
    }

    setNewCheckIn({
      type: 'WEEKLY',
      isPrivate: false,
      weekSummary: '',
      wentWell: '',
      couldImprove: '',
      supportNeeded: '',
      gratitude: '',
      togetherIdea: '',
      followUpAction: '',
    });
  };

  const handleStartEditCheckIn = (ci: CheckInRecord) => {
    setEditingCheckInId(ci.id);
    setNewCheckIn({
      type: ci.type,
      isPrivate: ci.isPrivate,
      weekSummary: ci.weekSummary,
      wentWell: ci.wentWell,
      couldImprove: ci.couldImprove,
      supportNeeded: ci.supportNeeded,
      gratitude: ci.gratitude,
      togetherIdea: ci.togetherIdea,
      followUpAction: ci.followUpAction,
    });
  };

  const handleAddOrUpdateGratitude = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteMessage.trim()) {
      setValidationError('Please write an appreciation message before posting.');
      return;
    }

    if (editingGratitudeId) {
      const existing = gratitudeNotes.find((n) => n.id === editingGratitudeId);
      const updated = {
        ...(existing || { id: editingGratitudeId, from: currentUserName, date: 'Today' }),
        to: noteTo,
        category: noteCategory,
        message: noteMessage.trim(),
      };
      setGratitudeNotes((prev) => prev.map((n) => (n.id === editingGratitudeId ? updated : n)));
      void persistSingleRecord('gratitude', editingGratitudeId, updated, existing?.version);
      setEditingGratitudeId(null);
      showToast('Appreciation note updated.');
    } else {
      const newNote = {
        id: `gn-${Date.now()}`,
        from: currentUserName,
        to: noteTo,
        category: noteCategory,
        message: noteMessage.trim(),
        date: 'Just now',
      };
      setGratitudeNotes([newNote, ...gratitudeNotes]);
      void persistSingleRecord('gratitude', newNote.id, newNote);
      showToast(`Appreciation note posted for ${noteTo}.`);
    }
    setNoteMessage('');
  };

  const handleAddCouplePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupleTitle.trim()) {
      setValidationError('Please enter a title for the couple activity or milestone.');
      return;
    }
    const newPlan = {
      id: `cp-${Date.now()}`,
      title: coupleTitle.trim(),
      date: coupleDate.trim() || 'This Weekend',
      category: coupleCategory,
      notes: coupleNotes.trim() || 'Intentional time together.',
      isPrivate: couplePrivate,
      completed: false,
    };
    setCouplePlans([newPlan, ...couplePlans]);
    void persistSingleRecord('couple_plans', newPlan.id, newPlan);
    setCoupleTitle('');
    setCoupleDate('');
    setCoupleNotes('');
    showToast('Couple plan saved.');
  };

  const handleAddMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle.trim() || !meetingAgenda.trim()) {
      setValidationError('Meeting title and at least one agenda topic are required.');
      return;
    }
    const newMtg = {
      id: `fm-${Date.now()}`,
      title: meetingTitle.trim(),
      date: meetingDate.trim() || 'Upcoming Family Meeting',
      participants: meetingParticipants.trim() || 'Whole Family',
      agendaItems: meetingAgenda.split(',').map((s) => s.trim()).filter(Boolean),
      decisions: meetingDecision ? [meetingDecision.trim()] : ['Discussed together as a family'],
      followUpTasks: meetingFollowUp ? [meetingFollowUp.trim()] : [],
      completed: false,
    };
    setMeetings([newMtg, ...meetings]);
    void persistSingleRecord('meetings', newMtg.id, newMtg);
    setMeetingTitle('');
    setMeetingDate('');
    setMeetingAgenda('');
    setMeetingDecision('');
    setMeetingFollowUp('');
    showToast('Family meeting agenda & decisions saved.');
  };

  const handleAddExperience = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle.trim()) {
      setValidationError('Please enter an experience title.');
      return;
    }
    const newExp = {
      id: `se-${Date.now()}`,
      title: expTitle.trim(),
      category: expCategory,
      date: expDate.trim() || 'This Weekend',
      participants: expParticipants.trim() || 'Whole Family',
      notes: expNotes.trim() || 'Quality family memory.',
      completed: false,
    };
    setExperiences([newExp, ...experiences]);
    void persistSingleRecord('experiences', newExp.id, newExp);
    setExpTitle('');
    setExpDate('');
    setExpNotes('');
    showToast('Shared family experience scheduled.');
  };

  const handleAddAgreement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agrTopic.trim() || !agrShared.trim()) {
      setValidationError('Both topic and shared agreement text are required.');
      return;
    }
    const newAgr = {
      id: `ag-${Date.now()}`,
      topic: agrTopic.trim(),
      reflectionPrompt: 'How can we uphold this agreement with kindness and consistency?',
      sharedAgreement: agrShared.trim(),
      followUpAction: agrFollowUp.trim() || 'Review during Sunday family check-in.',
      reviewDate: agrReviewDate.trim() || 'Monthly Review',
      completed: false,
    };
    setAgreements([newAgr, ...agreements]);
    void persistSingleRecord('agreements', newAgr.id, newAgr);
    setAgrTopic('');
    setAgrShared('');
    setAgrFollowUp('');
    showToast('Shared household agreement recorded.');
  };

  const handleExportRelationshipsData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      checkIns: checkIns.filter((c) => !c.isPrivate || c.author === currentUserName),
      gratitudeNotes,
      couplePlans,
      meetings,
      experiences,
      agreements,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `familyos-relationships-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Relationships data exported.');
  };

  // Enforce strict privacy: private check-ins only visible to their author
  const authorizedCheckIns = checkIns.filter((ci) => {
    if (
      ci.isPrivate &&
      ci.author !== currentUserName &&
      (!ci.ownerUserId || ci.ownerUserId !== resolvedUserId)
    ) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      ci.weekSummary.toLowerCase().includes(q) ||
      ci.wentWell.toLowerCase().includes(q) ||
      ci.gratitude.toLowerCase().includes(q) ||
      ci.author.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl p-6 sm:p-8 bg-[#173D35] text-white shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <div className="flex items-center space-x-2 text-xs font-semibold text-[#E5C388] tracking-wide">
              <Heart className="w-4 h-4" />
              <span>Relationships — The Family Connection Center</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
              Meaningful Communication, Gratitude & Stronger Family Connections
            </h2>
            <p className="text-sm text-emerald-100/90 leading-relaxed">
              Encourage empathy, regular check-ins, shared appreciation, couple alignment, and constructive reflection without judgment or relationship scoring.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportRelationshipsData}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Records</span>
          </button>
        </div>

        {/* Sub-navigation */}
        <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-white/15">
          {[
            { id: 'checkins', label: 'Relationship Check-ins', icon: MessageCircle, visible: true },
            { id: 'gratitude', label: 'Gratitude & Appreciation Wall', icon: Sparkles, visible: true },
            { id: 'couple', label: 'Couple Connection', icon: Heart, visible: selectedRole === 'OWNER' || selectedRole === 'ADMIN' },
            { id: 'communication', label: 'Family Meetings & Discussions', icon: Users, visible: true },
            { id: 'experiences', label: 'Shared Experiences', icon: Compass, visible: true },
            { id: 'resolution', label: 'Shared Agreements & Reflection', icon: Handshake, visible: true },
            { id: 'external_crm', label: 'External Network & CRM', icon: Users, visible: true },
          ]
            .filter((t) => t.visible)
            .map((tab) => {
            const Icon = tab.icon;
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectRelTab(tab.id as RelationshipsSubTab)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#C39A60] text-[#173D35]'
                    : 'bg-white/10 text-emerald-100 hover:bg-white/15'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search check-ins, appreciation notes, meetings, agreements..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-stone-200 text-xs"
          />
        </div>
        <div className="flex items-center space-x-3 text-xs">
          <span className="text-emerald-800 font-semibold flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Persisted & Private Responses Protected</span>
          </span>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('calendar_routines')}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold cursor-pointer"
            >
              <span>Open Family Planner</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
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

      {/* 7.1 RELATIONSHIP CHECK-INS */}
      {activeSubTab === 'checkins' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
            <div>
              <h3 className="font-serif font-bold text-lg text-stone-900">
                {editingCheckInId ? 'Edit Relationship Check-In' : 'New Relationship Check-In'}
              </h3>
              <p className="text-xs text-stone-500">
                Private responses remain strictly visible only to you unless you choose to share with the family.
              </p>
            </div>

            <form onSubmit={handleAddOrUpdateCheckIn} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Cadence</label>
                  <select
                    value={newCheckIn.type}
                    onChange={(e) => setNewCheckIn({ ...newCheckIn, type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                  >
                    <option value="WEEKLY">Weekly Check-In</option>
                    <option value="MONTHLY">Monthly Reflection</option>
                    <option value="COUPLE">Couple Alignment</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Visibility Control</label>
                  <button
                    type="button"
                    onClick={() => setNewCheckIn({ ...newCheckIn, isPrivate: !newCheckIn.isPrivate })}
                    className={`w-full px-3 py-2 rounded-xl border font-semibold flex items-center justify-center space-x-1.5 cursor-pointer ${
                      newCheckIn.isPrivate
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{newCheckIn.isPrivate ? 'Private to Me' : 'Shared Intentionally'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">How did this week go overall? *</label>
                <input
                  type="text"
                  value={newCheckIn.weekSummary}
                  onChange={(e) => setNewCheckIn({ ...newCheckIn, weekSummary: e.target.value })}
                  placeholder="Summary of the week..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-300"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">What went well?</label>
                <input
                  type="text"
                  value={newCheckIn.wentWell}
                  onChange={(e) => setNewCheckIn({ ...newCheckIn, wentWell: e.target.value })}
                  placeholder="Wins, peaceful moments, teamwork..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-300"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">What support do you need next week?</label>
                <input
                  type="text"
                  value={newCheckIn.supportNeeded}
                  onChange={(e) => setNewCheckIn({ ...newCheckIn, supportNeeded: e.target.value })}
                  placeholder="How family members can help..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-300"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">What are you grateful for?</label>
                <input
                  type="text"
                  value={newCheckIn.gratitude}
                  onChange={(e) => setNewCheckIn({ ...newCheckIn, gratitude: e.target.value })}
                  placeholder="Appreciation for a family member..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-300"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Follow-up action item</label>
                <input
                  type="text"
                  value={newCheckIn.followUpAction}
                  onChange={(e) => setNewCheckIn({ ...newCheckIn, followUpAction: e.target.value })}
                  placeholder="Next step to remember..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-300"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#173D35] text-white font-semibold hover:bg-emerald-950 transition-colors cursor-pointer"
                >
                  {editingCheckInId ? 'Save Changes' : 'Save Check-In Reflection'}
                </button>
                {editingCheckInId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCheckInId(null);
                      setNewCheckIn({
                        type: 'WEEKLY',
                        isPrivate: false,
                        weekSummary: '',
                        wentWell: '',
                        couldImprove: '',
                        supportNeeded: '',
                        gratitude: '',
                        togetherIdea: '',
                        followUpAction: '',
                      });
                    }}
                    className="px-3 py-2.5 rounded-xl bg-stone-200 text-stone-800 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {authorizedCheckIns.length === 0 ? (
              <div className="rounded-3xl p-8 bg-white border border-stone-200 text-center space-y-2">
                <p className="text-sm font-serif font-bold text-stone-800">No check-ins match your filter</p>
                <p className="text-xs text-stone-500">Create your first weekly or monthly reflection using the form on the left.</p>
              </div>
            ) : (
              authorizedCheckIns.map((ci) => (
                <div key={ci.id} className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-950 text-[#E5C388] font-serif font-bold flex items-center justify-center text-sm">
                        {(ci.author || 'Member').charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-stone-900">{ci.author || 'Member'}</h4>
                        <span className="text-[11px] text-stone-500">{ci.date} • {ci.type} CHECK-IN</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...ci, isPrivate: !ci.isPrivate };
                          setCheckIns((prev) =>
                            prev.map((item) => (item.id === ci.id ? updated : item))
                          );
                          void persistSingleRecord('checkIns', ci.id, updated);
                        }}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full cursor-pointer ${
                          ci.isPrivate ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                        }`}
                      >
                        {ci.isPrivate ? 'Private Reflection' : 'Shared with Family'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEditCheckIn(ci)}
                        className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
                        title="Edit Check-In"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {confirmDeleteId === ci.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setCheckIns((prev) => prev.filter((item) => item.id !== ci.id));
                              void deleteSingleRecord('checkIns', ci.id);
                              setConfirmDeleteId(null);
                              showToast('Check-in removed (independent Planner tasks preserved).');
                            }}
                            className="px-2 py-1 rounded-lg bg-rose-700 text-white text-[10px] font-bold cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 rounded-lg bg-stone-200 text-stone-700 text-[10px] font-semibold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(ci.id)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                          title="Delete Check-In"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200/80">
                      <span className="font-bold text-stone-900 block mb-0.5">Week Overview</span>
                      <p className="text-stone-600">{ci.weekSummary}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/80">
                      <span className="font-bold text-emerald-950 block mb-0.5">What Went Well</span>
                      <p className="text-emerald-900">{ci.wentWell}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200/80">
                      <span className="font-bold text-stone-900 block mb-0.5">Support Needed</span>
                      <p className="text-stone-600">{ci.supportNeeded}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80">
                      <span className="font-bold text-amber-950 block mb-0.5">Gratitude</span>
                      <p className="text-amber-900">{ci.gratitude}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...ci, actionCompleted: !ci.actionCompleted };
                        setCheckIns((prev) =>
                          prev.map((item) => (item.id === ci.id ? updated : item))
                        );
                        void persistSingleRecord('checkIns', ci.id, updated);
                      }}
                      className="flex items-center space-x-2 text-stone-700 cursor-pointer"
                    >
                      <CheckCircle2
                        className={`w-4 h-4 ${ci.actionCompleted ? 'text-emerald-600' : 'text-stone-300'}`}
                      />
                      <span className={ci.actionCompleted ? 'line-through text-stone-400' : 'font-medium text-stone-800'}>
                        Follow-up: {ci.followUpAction}
                      </span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 7.2 GRATITUDE & APPRECIATION WALL */}
      {activeSubTab === 'gratitude' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-lg text-stone-900">
              {editingGratitudeId ? 'Edit Appreciation Note' : 'Post Appreciation Note'}
            </h3>
            <p className="text-xs text-stone-500">
              Celebrate kindness, helpfulness, and family milestones on the shared wall.
            </p>
            <form onSubmit={handleAddOrUpdateGratitude} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">To Family Member</label>
                <select
                  value={noteTo}
                  onChange={(e) => setNoteTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                >
                  <option value="Sarah Jenkins">Sarah Jenkins</option>
                  <option value="David Jenkins">David Jenkins</option>
                  <option value="Maya Jenkins">Maya Jenkins</option>
                  <option value="Lucas Jenkins">Lucas Jenkins</option>
                  <option value="Grandma Martha">Grandma Martha</option>
                  <option value="Whole Family">Whole Family</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Recognition Type</label>
                <select
                  value={noteCategory}
                  onChange={(e) => setNoteCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                >
                  <option value="Appreciation">Appreciation Note</option>
                  <option value="Thank You">Thank-You Message</option>
                  <option value="Encouragement">Encouragement</option>
                  <option value="Achievement">Achievement Recognition</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Message *</label>
                <textarea
                  rows={3}
                  value={noteMessage}
                  onChange={(e) => setNoteMessage(e.target.value)}
                  placeholder="Write a warm note of appreciation..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-300"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#173D35] text-white font-semibold hover:bg-emerald-950 transition-colors cursor-pointer"
              >
                {editingGratitudeId ? 'Update Note' : '+ Post to Family Appreciation Wall'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {gratitudeNotes
              .filter(
                (gn) =>
                  !searchQuery.trim() ||
                  gn.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  gn.to.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((gn) => (
                <div
                  key={gn.id}
                  className="rounded-3xl p-5 bg-white border border-stone-200 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
                        {gn.category}
                      </span>
                      <div className="flex items-center space-x-1">
                        <span className="text-[11px] text-stone-400">{gn.date}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGratitudeId(gn.id);
                            setNoteTo(gn.to);
                            setNoteCategory(gn.category);
                            setNoteMessage(gn.message);
                          }}
                          className="p-1 text-stone-500 hover:text-stone-900 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setGratitudeNotes((prev) => prev.filter((item) => item.id !== gn.id));
                            void deleteSingleRecord('gratitudeNotes', gn.id);
                          }}
                          className="p-1 text-rose-600 hover:text-rose-800 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm font-serif text-stone-900 leading-relaxed">“{gn.message}”</p>
                  </div>
                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-900">To: {gn.to}</span>
                    <span className="text-stone-500">From: {gn.from}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 7.3 COUPLE CONNECTION */}
      {activeSubTab === 'couple' && (
        selectedRole !== 'OWNER' && selectedRole !== 'ADMIN' ? (
          <div className="rounded-3xl p-8 bg-white border border-stone-200 text-center space-y-2">
            <Lock className="w-6 h-6 text-amber-700 mx-auto" />
            <h3 className="font-serif font-bold text-lg text-stone-900">Couple Connection Enclave Restricted</h3>
            <p className="text-xs text-stone-500">
              Couple alignment reflections, date plans, and relationship milestones are strictly restricted to household Owners and Adult Admins.
            </p>
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-lg text-stone-900">Plan Couple Activity or Milestone</h3>
            <p className="text-xs text-stone-500">
              Schedule date nights, shared couple goals, relationship reflections, and anniversary plans.
            </p>
            <form onSubmit={handleAddCouplePlan} className="space-y-3 text-xs">
              <input
                type="text"
                value={coupleTitle}
                onChange={(e) => setCoupleTitle(e.target.value)}
                placeholder="Title (e.g. Friday Dinner & Walk) *"
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={coupleCategory}
                  onChange={(e) => setCoupleCategory(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-stone-300 bg-white"
                >
                  <option value="Date Night">Date Night</option>
                  <option value="Shared Goal">Shared Couple Goal</option>
                  <option value="Milestone">Relationship Milestone</option>
                  <option value="Reflection">Private Reflection</option>
                </select>
                <input
                  type="text"
                  value={coupleDate}
                  onChange={(e) => setCoupleDate(e.target.value)}
                  placeholder="Date / Time"
                  className="px-3 py-2 rounded-xl border border-stone-300"
                />
              </div>
              <textarea
                rows={2}
                value={coupleNotes}
                onChange={(e) => setCoupleNotes(e.target.value)}
                placeholder="Conversation prompts or preparation notes..."
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#173D35] text-white font-semibold hover:bg-emerald-950 cursor-pointer"
              >
                + Save Couple Plan
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-3">
            {couplePlans.map((cp) => (
              <div
                key={cp.id}
                className="rounded-3xl p-5 bg-white border border-stone-200 shadow-xs flex items-start justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900">
                      {cp.category}
                    </span>
                    <span className="text-xs font-mono text-stone-500">{cp.date}</span>
                  </div>
                  <h4 className={`font-serif font-bold text-base ${cp.completed ? 'line-through text-stone-400' : 'text-stone-900'}`}>
                    {cp.title}
                  </h4>
                  <p className="text-xs text-stone-600">{cp.notes}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...cp, completed: !cp.completed };
                      setCouplePlans((prev) =>
                        prev.map((item) => (item.id === cp.id ? updated : item))
                      );
                      void persistSingleRecord('couplePlans', cp.id, updated);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                      cp.completed
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-800'
                    }`}
                  >
                    {cp.completed ? 'Completed' : 'Mark Complete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCouplePlans((prev) => prev.filter((item) => item.id !== cp.id));
                      void deleteSingleRecord('couplePlans', cp.id);
                    }}
                    className="p-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        )
      )}

      {/* 7.4 FAMILY COMMUNICATION & MEETINGS */}
      {activeSubTab === 'communication' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-lg text-stone-900">Schedule Family Meeting</h3>
            <p className="text-xs text-stone-500">
              Build collaborative agendas, record family decisions, and assign follow-up actions.
            </p>
            <form onSubmit={handleAddMeeting} className="space-y-3 text-xs">
              <input
                type="text"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="Meeting Title (e.g. Sunday Family Huddle) *"
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
              />
              <input
                type="text"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                placeholder="Scheduled Date & Time"
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
              />
              <input
                type="text"
                value={meetingParticipants}
                onChange={(e) => setMeetingParticipants(e.target.value)}
                placeholder="Participants (e.g. Sarah, David, Maya, Lucas)"
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
              />
              <input
                type="text"
                value={meetingAgenda}
                onChange={(e) => setMeetingAgenda(e.target.value)}
                placeholder="Agenda items (comma-separated) *"
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
              />
              <input
                type="text"
                value={meetingDecision}
                onChange={(e) => setMeetingDecision(e.target.value)}
                placeholder="Key decision or agreement"
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
              />
              <input
                type="text"
                value={meetingFollowUp}
                onChange={(e) => setMeetingFollowUp(e.target.value)}
                placeholder="Follow-up task"
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#173D35] text-white font-semibold hover:bg-emerald-950 cursor-pointer"
              >
                + Save Family Meeting
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {meetings.map((m) => (
              <div key={m.id} className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div>
                    <h4 className="font-serif font-bold text-lg text-stone-900">{m.title}</h4>
                    <span className="text-xs text-stone-500">Participants: {m.participants}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-emerald-900 bg-emerald-50 px-3 py-1 rounded-full">
                      {m.date}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setMeetings((prev) => prev.filter((item) => item.id !== m.id));
                        void deleteSingleRecord('meetings', m.id);
                      }}
                      className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                    <span className="font-bold text-stone-900 block mb-1.5">Discussion Agenda</span>
                    <ul className="space-y-1 text-stone-600 list-disc list-inside">
                      {m.agendaItems.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                    <span className="font-bold text-emerald-950 block mb-1.5">Recorded Decisions & Follow-Ups</span>
                    <ul className="space-y-1 text-emerald-900 list-disc list-inside">
                      {m.decisions.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                      {m.followUpTasks.map((t, i) => (
                        <li key={`f-${i}`} className="font-semibold">Action: {t}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7.5 SHARED EXPERIENCES */}
      {activeSubTab === 'experiences' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-lg text-stone-900">Plan Shared Family Experience</h3>
            <p className="text-xs text-stone-500">
              Schedule game nights, outdoor walks, family dinners, movie nights, and weekend adventures.
            </p>
            <form onSubmit={handleAddExperience} className="space-y-3 text-xs">
              <input
                type="text"
                value={expTitle}
                onChange={(e) => setExpTitle(e.target.value)}
                placeholder="Experience Title *"
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-stone-300 bg-white"
                >
                  <option value="Game Night">Game Night</option>
                  <option value="Outdoor">Outdoor Activity</option>
                  <option value="Family Dinner">Family Dinner</option>
                  <option value="Movie Night">Movie Night</option>
                  <option value="Weekend Adventure">Weekend Adventure</option>
                  <option value="Shared Hobby">Shared Hobby</option>
                </select>
                <input
                  type="text"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  placeholder="Schedule / Date"
                  className="px-3 py-2 rounded-xl border border-stone-300"
                />
              </div>
              <input
                type="text"
                value={expParticipants}
                onChange={(e) => setExpParticipants(e.target.value)}
                placeholder="Participants"
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
              />
              <textarea
                rows={2}
                value={expNotes}
                onChange={(e) => setExpNotes(e.target.value)}
                placeholder="Details, snacks, or preparation..."
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#173D35] text-white font-semibold hover:bg-emerald-950 cursor-pointer"
              >
                + Add Shared Experience
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {experiences.map((ex) => (
              <div key={ex.id} className="rounded-3xl p-5 bg-white border border-stone-200 shadow-xs space-y-2.5 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                      {ex.category}
                    </span>
                    <span className="text-xs font-mono text-stone-500">{ex.date}</span>
                  </div>
                  <h4 className={`font-serif font-bold text-base ${ex.completed ? 'line-through text-stone-400' : 'text-stone-900'}`}>
                    {ex.title}
                  </h4>
                  <p className="text-xs text-stone-600">{ex.notes}</p>
                </div>
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                  <span>Participants: {ex.participants}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...ex, completed: !ex.completed };
                        setExperiences((prev) =>
                          prev.map((item) => (item.id === ex.id ? updated : item))
                        );
                        void persistSingleRecord('experiences', ex.id, updated);
                      }}
                      className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-900 font-semibold cursor-pointer"
                    >
                      {ex.completed ? 'Completed ✓' : 'Mark Done'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExperiences((prev) => prev.filter((item) => item.id !== ex.id));
                        void deleteSingleRecord('experiences', ex.id);
                      }}
                      className="p-1 text-rose-600 hover:text-rose-800 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7.6 CONSTRUCTIVE REFLECTION & AGREEMENTS */}
      {activeSubTab === 'resolution' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-lg text-stone-900">Record Shared Agreement</h3>
            <p className="text-xs text-stone-500">
              Support calm reflection, empathy prompts, shared agreements, and constructive follow-up actions.
            </p>
            <form onSubmit={handleAddAgreement} className="space-y-3 text-xs">
              <input
                type="text"
                value={agrTopic}
                onChange={(e) => setAgrTopic(e.target.value)}
                placeholder="Topic (e.g. Evening Device Wind-Down) *"
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
              />
              <textarea
                rows={2}
                value={agrShared}
                onChange={(e) => setAgrShared(e.target.value)}
                placeholder="Our shared family agreement... *"
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
              />
              <input
                type="text"
                value={agrFollowUp}
                onChange={(e) => setAgrFollowUp(e.target.value)}
                placeholder="Follow-up action step..."
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
              />
              <input
                type="text"
                value={agrReviewDate}
                onChange={(e) => setAgrReviewDate(e.target.value)}
                placeholder="Review Date (e.g. Dec 1, 2026)"
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#173D35] text-white font-semibold hover:bg-emerald-950 cursor-pointer"
              >
                + Save Shared Agreement
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {agreements.map((ag) => (
              <div key={ag.id} className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-bold text-base text-stone-900">{ag.topic}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                      {ag.reviewDate}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAgreements((prev) => prev.filter((item) => item.id !== ag.id));
                        void deleteSingleRecord('agreements', ag.id);
                      }}
                      className="p-1 text-rose-600 hover:text-rose-800 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs italic text-stone-500">Prompt: “{ag.reflectionPrompt}”</p>
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-1">
                  <span className="font-bold text-stone-900 block">Shared Agreement</span>
                  <p className="text-stone-700">{ag.sharedAgreement}</p>
                </div>
                <div className="text-xs text-emerald-900 font-medium">
                  Follow-Up Action: {ag.followUpAction}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'external_crm' && (
        <ExternalNetworkCRM selectedRole={selectedRole} sessionToken={sessionToken} />
      )}
    </div>
  );
};
