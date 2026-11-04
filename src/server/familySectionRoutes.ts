import type { Express, Request, Response, NextFunction } from 'express';
import type { SharedStore, SynchronizedEntityRecord } from './backupAndMigration';
import {
  canAccessCoupleEnclave,
  canManageMemberships,
  canPerformFinanceMutation,
  resolveServerMembership,
  sanitizeMemberForCaller,
} from './authAndRbac';
import { getFinanceStore } from './financeData';
import { getHouseholdStore } from './householdData';

function computePantryExpiryStatus(expiryDate?: number): 'OK' | 'EXPIRING_SOON' | 'EXPIRED' {
  if (!expiryDate) return 'OK';
  const now = Date.now();
  if (expiryDate < now) return 'EXPIRED';
  if (expiryDate - now <= 5 * 24 * 60 * 60 * 1000) return 'EXPIRING_SOON';
  return 'OK';
}
import {
  canViewGoal,
  canViewProject,
  canViewTask,
  recalculatePlanningHierarchyProgress,
} from './planningAndExecution';
import { canViewCalendarEvent, seedDefaultCalendarAndRoutines } from './calendarAndRoutines';
import { canCallerReadDomainEntity } from './domainModulesRoutes';

export interface FamilySectionRouteDependencies {
  requireAuth: (req: Request, res: Response, next: NextFunction) => void;
  loadStore: () => SharedStore;
  withAtomicStoreTransaction: <T>(fn: (store: SharedStore) => Promise<T> | T) => Promise<T>;
  bumpWorkspaceVersion: (store: SharedStore, familyId: string, now?: number) => number;
  mirrorEntityToFirestore: (record: SynchronizedEntityRecord) => Promise<void>;
}

function createSampleSvgDataUrl(title: string, subtitle: string, bgHex = '#173D35', accentHex = '#C39A60'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgHex}" />
        <stop offset="100%" stop-color="#0F2922" />
      </linearGradient>
    </defs>
    <rect width="800" height="500" fill="url(#bg)" rx="24" />
    <circle cx="680" cy="110" r="140" fill="${accentHex}" opacity="0.16" />
    <circle cx="120" cy="400" r="180" fill="#A8BDAA" opacity="0.12" />
    <rect x="56" y="56" width="88" height="6" rx="3" fill="${accentHex}" />
    <text x="56" y="250" fill="#F7F4EC" font-family="Georgia, serif" font-size="38" font-weight="bold">${title
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')}</text>
    <text x="56" y="298" fill="#E7D1AA" font-family="sans-serif" font-size="20">${subtitle
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')}</text>
    <text x="56" y="440" fill="#A8BDAA" font-family="sans-serif" font-size="14" letter-spacing="2">FAMILYOS HERITAGE GALLERY</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf-8').toString('base64')}`;
}

function createRelativePortraitSvgDataUrl(opts: {
  initials: string;
  bgHex: string;
  ringHex: string;
  skinHex: string;
  hairHex: string;
  shirtHex: string;
  hasGlasses?: boolean;
  hasBeard?: boolean;
}): string {
  const safeInitials = String(opts.initials || 'FM')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .slice(0, 2)
    .toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
    <defs>
      <radialGradient id="pbg" cx="50%" cy="35%" r="70%">
        <stop offset="0%" stop-color="${opts.bgHex}" />
        <stop offset="100%" stop-color="#0F2620" />
      </radialGradient>
      <clipPath id="circleClip">
        <circle cx="120" cy="120" r="112" />
      </clipPath>
    </defs>
    <circle cx="120" cy="120" r="118" fill="${opts.ringHex}" />
    <g clip-path="url(#circleClip)">
      <rect width="240" height="240" fill="url(#pbg)" />
      <circle cx="185" cy="48" r="46" fill="${opts.ringHex}" opacity="0.18" />
      <!-- Shoulders / Attire -->
      <path d="M42 242 C42 184, 198 184, 198 242 Z" fill="${opts.shirtHex}" />
      <path d="M96 188 L120 218 L144 188" fill="#F7F4EC" opacity="0.88" />
      <!-- Neck -->
      <rect x="104" y="146" width="32" height="34" rx="12" fill="${opts.skinHex}" />
      <!-- Hair Back -->
      <ellipse cx="120" cy="98" rx="48" ry="48" fill="${opts.hairHex}" />
      <!-- Face -->
      <ellipse cx="120" cy="112" rx="40" ry="46" fill="${opts.skinHex}" />
      <!-- Hair Top -->
      <path d="M78 102 C78 64, 162 64, 162 102 C148 82, 92 82, 78 102 Z" fill="${opts.hairHex}" />
      <!-- Eyes -->
      <circle cx="104" cy="108" r="4.2" fill="#1C1917" />
      <circle cx="136" cy="108" r="4.2" fill="#1C1917" />
      ${
        opts.hasGlasses
          ? `<rect x="91" y="99" width="26" height="18" rx="6" fill="none" stroke="#D6B377" stroke-width="2.6" />
             <rect x="123" y="99" width="26" height="18" rx="6" fill="none" stroke="#D6B377" stroke-width="2.6" />
             <line x1="117" y1="107" x2="123" y2="107" stroke="#D6B377" stroke-width="2.6" />`
          : ''
      }
      ${
        opts.hasBeard
          ? `<path d="M84 122 C86 158, 154 158, 156 122 C146 138, 94 138, 84 122 Z" fill="${opts.hairHex}" opacity="0.88" />`
          : ''
      }
      <!-- Warm Smile -->
      <path d="M106 130 Q120 141 134 130" fill="none" stroke="#5C2D24" stroke-width="3.2" stroke-linecap="round" />
      <!-- Corner Monogram Badge -->
      <circle cx="188" cy="188" r="22" fill="#173D35" stroke="${opts.ringHex}" stroke-width="2.5" />
      <text x="188" y="194" text-anchor="middle" fill="#F7F4EC" font-family="Georgia, serif" font-size="14" font-weight="bold">${safeInitials}</text>
    </g>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf-8').toString('base64')}`;
}

/**
 * Ensures initial baseline records exist for a family's Gallery, Constitution, Traditions, Shared Activities, and Rules
 * so the Family section immediately renders rich, real database records that can be edited, archived, or deleted.
 */
export function ensureFamilySectionSeedData(store: SharedStore, familyId: string): boolean {
  store.synchronizedEntities = store.synchronizedEntities || {};
  const ws = store.workspaces?.[familyId] || (store.workspace?.id === familyId ? store.workspace : null);
  const familyName = ws?.name || 'Our Family';
  const ownerUserId = ws?.ownerUserId || 'usr-sarah-owner';
  const members = (store.familyMembers || []).filter((m) => m.familyId === familyId && !m.isDeleted);
  const primaryMember = members.find((m) => m.role === 'OWNER') || members[0];
  const primaryMemberId = primaryMember?.id || 'mem-owner';
  const primaryMemberName = primaryMember?.displayName || 'Family Head';

  const existingForFamily = Object.values(store.synchronizedEntities).filter(
    (e) => e.familyId === familyId
  );

  let mutated = false;
  const now = Date.now();

  // 1. Seed Gallery Albums & Photos if none exist for this family
  const hasAlbums = existingForFamily.some((e) => e.entityType === 'FAMILY_GALLERY_ALBUM');
  if (!hasAlbums) {
    const album1Id = `alb-${familyId}-milestones`;
    const album2Id = `alb-${familyId}-gatherings`;
    const albums = [
      {
        id: album1Id,
        familyId,
        title: `${familyName} Milestones & Celebrations`,
        description: 'Cherished family milestones, birthdays, graduations, and achievements.',
        category: 'Milestones',
        coverPhotoUrl: createSampleSvgDataUrl(`${familyName} Milestones`, 'Celebrations & Achievements', '#173D35', '#C39A60'),
        createdByUserId: ownerUserId,
        createdByName: primaryMemberName,
        createdAt: now - 86400000 * 30,
        updatedAt: now - 86400000 * 5,
      },
      {
        id: album2Id,
        familyId,
        title: 'Sunday Dinners & Seasonal Retreats',
        description: 'Photos from our weekly family table, outdoor adventures, and holiday traditions.',
        category: 'Traditions',
        coverPhotoUrl: createSampleSvgDataUrl('Sunday Family Table', 'Shared Meals & Retreats', '#2C4A3E', '#D97757'),
        createdByUserId: ownerUserId,
        createdByName: primaryMemberName,
        createdAt: now - 86400000 * 14,
        updatedAt: now - 86400000 * 2,
      },
    ];

    for (const alb of albums) {
      store.synchronizedEntities[`FAMILY_GALLERY_ALBUM:${alb.id}`] = {
        id: alb.id,
        familyId,
        entityType: 'FAMILY_GALLERY_ALBUM',
        version: 1,
        isDeleted: false,
        updatedAt: alb.updatedAt,
        updatedByUserId: ownerUserId,
        data: alb,
      };
    }

    const photos = [
      {
        id: `pho-${familyId}-1`,
        familyId,
        albumId: album1Id,
        title: 'Annual Family Charter Signing & Dinner',
        caption: 'Celebrating another year of shared stewardship, gratitude, and togetherness around the home table.',
        eventName: 'Founder Day Dinner',
        takenDate: new Date(now - 86400000 * 12).toISOString().slice(0, 10),
        imageUrl: createSampleSvgDataUrl('Annual Charter Dinner', `${familyName} • Together in Stewardship`, '#173D35', '#C39A60'),
        taggedMemberIds: members.slice(0, 3).map((m) => m.id),
        taggedMemberNames: members.slice(0, 3).map((m) => m.displayName),
        isFavorite: true,
        visibility: 'FAMILY',
        uploadedByUserId: ownerUserId,
        uploadedByMemberId: primaryMemberId,
        uploadedByName: primaryMemberName,
        createdAt: now - 86400000 * 12,
        updatedAt: now - 86400000 * 12,
      },
      {
        id: `pho-${familyId}-2`,
        familyId,
        albumId: album2Id,
        title: 'Autumn Botanical Garden Walk',
        caption: 'Saturday morning outdoor exploration and family picnic under the redwoods.',
        eventName: 'Weekend Family Excursion',
        takenDate: new Date(now - 86400000 * 4).toISOString().slice(0, 10),
        imageUrl: createSampleSvgDataUrl('Autumn Garden Walk', 'Weekend Excursion & Picnic', '#234B3C', '#D97757'),
        taggedMemberIds: members.map((m) => m.id),
        taggedMemberNames: members.map((m) => m.displayName),
        isFavorite: false,
        visibility: 'FAMILY',
        uploadedByUserId: ownerUserId,
        uploadedByMemberId: primaryMemberId,
        uploadedByName: primaryMemberName,
        createdAt: now - 86400000 * 4,
        updatedAt: now - 86400000 * 4,
      },
    ];

    for (const pho of photos) {
      store.synchronizedEntities[`FAMILY_GALLERY_PHOTO:${pho.id}`] = {
        id: pho.id,
        familyId,
        entityType: 'FAMILY_GALLERY_PHOTO',
        version: 1,
        isDeleted: false,
        updatedAt: pho.updatedAt,
        updatedByUserId: ownerUserId,
        data: pho,
      };
    }
    mutated = true;
  }

  // 2. Seed Family Constitution if none exists
  const hasConstitution = existingForFamily.some((e) => e.entityType === 'FAMILY_CONSTITUTION_VERSION');
  if (!hasConstitution) {
    const constId = `const-${familyId}-v1`;
    const constitutionData = {
      id: constId,
      familyId,
      versionNumber: 1,
      motto: ws?.motto || 'Together in Stewardship, Kindness, and Purpose',
      missionStatement:
        ws?.mission ||
        'To cultivate a warm, resilient, and intellectually curious home where every member is supported to grow, contribute, and thrive.',
      visionStatement:
        ws?.vision ||
        'A multi-generational family anchored by trust, financial wisdom, shared service, and lifelong mutual support.',
      coreValues: Array.isArray(ws?.values) && ws.values.length > 0
        ? ws.values
        : ['Unconditional Respect', 'Honest Communication', 'Financial Stewardship', 'Lifelong Curiosity', 'Generosity & Gratitude'],
      familyIdentityStatement: `${familyName} stands for intentional living, calm cooperation, and celebrating every person's unique strengths.`,
      sharedAspirations: [
        'Gather for unhurried family meals at least four evenings every week.',
        'Support each member’s educational, creative, and personal wellbeing goals.',
        'Maintain a debt-free, transparent, and generous household economy.',
      ],
      memberCommitments: [
        'We listen first with empathy before offering correction or advice.',
        'We honor our shared home spaces and leave rooms better than we found them.',
        'We repair misunderstandings quickly and never let resentment linger overnight.',
      ],
      legacyStatement:
        'May the habits of kindness, courage, and stewardship we practice in this home ripple outward to bless our community and future generations.',
      editedByUserId: ownerUserId,
      editedByName: primaryMemberName,
      acknowledgments: [
        {
          memberId: primaryMemberId,
          userAccountId: ownerUserId,
          displayName: primaryMemberName,
          acknowledgedAt: now - 86400000 * 7,
          versionNumber: 1,
        },
      ],
      createdAt: now - 86400000 * 14,
      updatedAt: now - 86400000 * 7,
    };

    store.synchronizedEntities[`FAMILY_CONSTITUTION_VERSION:${constId}`] = {
      id: constId,
      familyId,
      entityType: 'FAMILY_CONSTITUTION_VERSION',
      version: 1,
      isDeleted: false,
      updatedAt: constitutionData.updatedAt,
      updatedByUserId: ownerUserId,
      data: constitutionData,
    };
    mutated = true;
  }

  // 3. Seed Family Traditions & Culture if none exist
  const hasTraditions = existingForFamily.some((e) => e.entityType === 'FAMILY_TRADITION');
  if (!hasTraditions) {
    const traditions = [
      {
        id: `trad-${familyId}-sunday-feast`,
        familyId,
        title: 'Sunday Evening Gratitude & Roast Dinner',
        category: 'Special Family Meal',
        frequency: 'Weekly (Sundays at 6:00 PM)',
        nextPlannedDate: new Date(now + 86400000 * 3).toISOString().slice(0, 10),
        meaningAndOrigin:
          'Started when our household was founded so that no matter how busy the week becomes, we close Sunday with homemade food and each person sharing three things they appreciated.',
        culturalBackground: 'Multi-generational family hospitality tradition',
        linkedRecipeId: 'rec-1',
        linkedRecipeTitle: 'Herb-Crusted Sunday Roast & Root Vegetables',
        responsibleMemberIds: [primaryMemberId],
        responsibleMemberNames: [primaryMemberName],
        memoriesAndNotes: [
          'Everyone takes turns lighting the table candle and reading the weekly gratitude jar notes.',
        ],
        status: 'ACTIVE',
        createdByUserId: ownerUserId,
        createdAt: now - 86400000 * 30,
        updatedAt: now - 86400000 * 3,
      },
      {
        id: `trad-${familyId}-solstice-retreat`,
        familyId,
        title: 'Annual Year-End Reflection & Vision Retreat',
        category: 'Annual Tradition',
        frequency: 'Annually (Last weekend of December)',
        nextPlannedDate: `${new Date().getFullYear()}-12-27`,
        meaningAndOrigin:
          'A two-day family retreat where we review our photo gallery from the past 12 months, celebrate milestones, and set our shared goals for the coming year.',
        culturalBackground: 'Family Stewardship & Heritage Practice',
        linkedRecipeId: '',
        linkedRecipeTitle: 'Spiced Mulled Cider & Cinnamon Rolls',
        responsibleMemberIds: members.slice(0, 2).map((m) => m.id),
        responsibleMemberNames: members.slice(0, 2).map((m) => m.displayName),
        memoriesAndNotes: [
          'Includes writing time-capsule letters to open the following December.',
        ],
        status: 'ACTIVE',
        createdByUserId: ownerUserId,
        createdAt: now - 86400000 * 60,
        updatedAt: now - 86400000 * 10,
      },
    ];

    for (const tr of traditions) {
      store.synchronizedEntities[`FAMILY_TRADITION:${tr.id}`] = {
        id: tr.id,
        familyId,
        entityType: 'FAMILY_TRADITION',
        version: 1,
        isDeleted: false,
        updatedAt: tr.updatedAt,
        updatedByUserId: ownerUserId,
        data: tr,
      };
    }
    mutated = true;
  }

  // 4. Seed Shared Activities if none exist
  const hasActivities = existingForFamily.some((e) => e.entityType === 'FAMILY_SHARED_ACTIVITY');
  if (!hasActivities) {
    const actDateIso = new Date(now + 86400000 * 2).toISOString().slice(0, 10);
    const actId = `act-${familyId}-game-night`;
    const calEventId = `cal-act-${actId}`;
    const activity = {
      id: actId,
      familyId,
      title: 'Friday Family Strategy Board Game & Homemade Pizza Night',
      description: 'Unplugged evening of cooperative board games, homemade sourdough pizzas, and family trivia.',
      dateIso: actDateIso,
      startTime: '18:30',
      endTime: '21:00',
      location: 'Family Living Room & Kitchen',
      category: 'Game Night',
      organizerMemberId: primaryMemberId,
      organizerName: primaryMemberName,
      participantMemberIds: members.map((m) => m.id),
      rsvps: members.map((m) => ({
        memberId: m.id,
        displayName: m.displayName,
        status: 'GOING',
      })),
      budgetCents: 3500,
      preparationChecklist: [
        { id: 'chk-1', text: 'Prep pizza dough in the afternoon', completed: true },
        { id: 'chk-2', text: 'Pick two board games together', completed: false },
        { id: 'chk-3', text: 'Dock phones in charging station at 6:15 PM', completed: false },
      ],
      status: 'PLANNED',
      recurrence: 'WEEKLY',
      memoryNotes: '',
      linkedCalendarEventId: calEventId,
      createdByUserId: ownerUserId,
      createdAt: now - 86400000 * 5,
      updatedAt: now - 86400000 * 1,
    };

    store.synchronizedEntities[`FAMILY_SHARED_ACTIVITY:${actId}`] = {
      id: actId,
      familyId,
      entityType: 'FAMILY_SHARED_ACTIVITY',
      version: 1,
      isDeleted: false,
      updatedAt: activity.updatedAt,
      updatedByUserId: ownerUserId,
      data: activity,
    };
    mutated = true;
  }

  // 5. Seed Family Rules & Principles if none exist
  const hasRules = existingForFamily.some((e) => e.entityType === 'FAMILY_RULE');
  if (!hasRules) {
    const rules = [
      {
        id: `rule-${familyId}-devices`,
        familyId,
        title: 'Device-Free Meals & Restful Bedrooms',
        category: 'Digital & Devices',
        principleStatement:
          'We prioritize face-to-face connection during meals and protect restful sleep by docking phones and tablets in the kitchen charging station by 9:00 PM.',
        practicalExpectations: [
          'All phones, tablets, and earbuds stay off the dining table during breakfast and dinner.',
          'Youth devices dock in the common charging station 45 minutes before bedtime.',
        ],
        appliesTo: 'All Family Members',
        ownerMemberId: primaryMemberId,
        ownerName: primaryMemberName,
        status: 'ACTIVE',
        revisionDate: new Date(now - 86400000 * 10).toISOString().slice(0, 10),
        acknowledgments: [
          {
            memberId: primaryMemberId,
            displayName: primaryMemberName,
            acknowledgedAt: now - 86400000 * 10,
          },
        ],
        createdByUserId: ownerUserId,
        createdAt: now - 86400000 * 20,
        updatedAt: now - 86400000 * 10,
      },
      {
        id: `rule-${familyId}-spaces`,
        familyId,
        title: 'Shared Spaces Evening Reset',
        category: 'Shared Spaces',
        principleStatement:
          'A calm morning begins the night before. Every member contributes 10 minutes after dinner to reset the kitchen, living room, and entryway.',
        practicalExpectations: [
          'Clear personal items, backpacks, and shoes from the living room and hallway.',
          'Load dishes into the dishwasher and wipe kitchen counters before winding down.',
        ],
        appliesTo: 'All Family Members',
        ownerMemberId: primaryMemberId,
        ownerName: primaryMemberName,
        status: 'ACTIVE',
        revisionDate: new Date(now - 86400000 * 15).toISOString().slice(0, 10),
        acknowledgments: [
          {
            memberId: primaryMemberId,
            displayName: primaryMemberName,
            acknowledgedAt: now - 86400000 * 15,
          },
        ],
        createdByUserId: ownerUserId,
        createdAt: now - 86400000 * 25,
        updatedAt: now - 86400000 * 15,
      },
      {
        id: `rule-${familyId}-communication`,
        familyId,
        title: 'Kind Speech & Constructive Repair',
        category: 'Respect & Communication',
        principleStatement:
          'We speak to one another with dignity even when frustrated. Disagreements are addressed calmly without दरवाजे slamming, name-calling, or sarcasm.',
        practicalExpectations: [
          'Ask for a 10-minute cool-down pause if emotions are running too high.',
          'Offer a genuine apology and repair when we make a mistake.',
        ],
        appliesTo: 'All Family Members',
        ownerMemberId: primaryMemberId,
        ownerName: primaryMemberName,
        status: 'ACTIVE',
        revisionDate: new Date(now - 86400000 * 20).toISOString().slice(0, 10),
        acknowledgments: [
          {
            memberId: primaryMemberId,
            displayName: primaryMemberName,
            acknowledgedAt: now - 86400000 * 20,
          },
        ],
        createdByUserId: ownerUserId,
        createdAt: now - 86400000 * 30,
        updatedAt: now - 86400000 * 20,
      },
    ];

    for (const rule of rules) {
      store.synchronizedEntities[`FAMILY_RULE:${rule.id}`] = {
        id: rule.id,
        familyId,
        entityType: 'FAMILY_RULE',
        version: 1,
        isDeleted: false,
        updatedAt: rule.updatedAt,
        updatedByUserId: ownerUserId,
        data: rule,
      };
    }
    mutated = true;
  }

  // 6. Seed Extended Family Heritage Map Relatives (Father's & Mother's Lineages) if none exist
  const hasExtendedRelatives = existingForFamily.some((e) => e.entityType === 'FAMILY_EXTENDED_RELATIVE');
  if (!hasExtendedRelatives) {
    const currentYear = new Date().getFullYear();
    const relatives = [
      {
        id: `rel-ext-${familyId}-paternal-grandpa`,
        familyId,
        fullName: 'Arthur Henderson',
        preferredTitle: 'Grandpa Arthur',
        lineageSide: 'PATERNAL',
        generationTier: 'ELDERS_GRANDPARENTS',
        relationshipToChildren: 'Paternal Grandfather (Father’s Dad)',
        birthYear: currentYear - 68,
        age: 68,
        occupation: 'Retired Structural Architect & Master Woodworker',
        workplaceOrSpecialty: 'Historic Timber & Stone Civic Architecture',
        city: 'Edinburgh',
        country: 'Scotland, UK',
        regionTag: 'Europe',
        mapCoordinates: { xPercent: 47, yPercent: 26 },
        avatarUrl: createRelativePortraitSvgDataUrl({
          initials: 'AH',
          bgHex: '#25443B',
          ringHex: '#C39A60',
          skinHex: '#E0B596',
          hairHex: '#D6D3D1',
          shirtHex: '#334155',
          hasGlasses: true,
          hasBeard: true,
        }),
        bioAndHeritageStory:
          'Taught your father how to sketch buildings, measure twice before cutting once, and value patience. He still builds heirloom oak bookshelves in his workshop.',
        sharedInterests: ['Woodworking', 'Architectural Sketching', 'Chess', 'Scottish History'],
        conversationStarters: [
          'Ask Grandpa Arthur what was the tallest building he ever helped design.',
          'Ask him to show you how he carves dovetail joints in his workshop.',
        ],
        growthAreas: [
          {
            id: `gr-${familyId}-1`,
            title: 'Digitizing 40 Years of Architectural Blueprints & Family Letters',
            category: 'EDUCATION_MENTORSHIP',
            description: 'Helping Grandpa organize and scan his hand-drawn sketches and family history journals into digital archives.',
            howKidsCanSupport: 'Interview him for 15 minutes on video call and label each sketch together.',
            status: 'ACTIVE_SUPPORT',
            addedByName: primaryMemberName,
            createdAt: now - 86400000 * 14,
          },
          {
            id: `gr-${familyId}-2`,
            title: 'Daily Mobility & Knee Strengthening Walks',
            category: 'WELLBEING_HEALTH',
            description: 'Maintaining daily 30-minute morning walks after his knee physical therapy.',
            howKidsCanSupport: 'Share weekend step counts and cheer him on during Sunday family calls.',
            status: 'ACTIVE_SUPPORT',
            addedByName: primaryMemberName,
            createdAt: now - 86400000 * 7,
          },
        ],
        encouragementNotes: [
          {
            id: `enc-${familyId}-1`,
            authorName: primaryMemberName,
            authorRole: 'OWNER',
            message: 'Thank you for teaching the kids how to play chess with patience and grace!',
            createdAt: now - 86400000 * 5,
          },
        ],
        createdByUserId: ownerUserId,
        createdAt: now - 86400000 * 30,
        updatedAt: now - 86400000 * 5,
      },
      {
        id: `rel-ext-${familyId}-paternal-grandma`,
        familyId,
        fullName: 'Beatrice Henderson',
        preferredTitle: 'Grandma Bea',
        lineageSide: 'PATERNAL',
        generationTier: 'ELDERS_GRANDPARENTS',
        relationshipToChildren: 'Paternal Grandmother (Father’s Mom)',
        birthYear: currentYear - 65,
        age: 65,
        occupation: 'Botanical Illustrator & Community Garden Director',
        workplaceOrSpecialty: 'Royal Botanic Conservatory & Youth Seed Library',
        city: 'Edinburgh',
        country: 'Scotland, UK',
        regionTag: 'Europe',
        mapCoordinates: { xPercent: 49, yPercent: 28 },
        avatarUrl: createRelativePortraitSvgDataUrl({
          initials: 'BH',
          bgHex: '#2C4A3E',
          ringHex: '#C39A60',
          skinHex: '#E6BFA4',
          hairHex: '#E7E5E4',
          shirtHex: '#7C2D12',
          hasGlasses: true,
          hasBeard: false,
        }),
        bioAndHeritageStory:
          'Grew up tending orchards and paints watercolor illustrations of medicinal and heirloom plants. She started our Sunday roast dinner tradition.',
        sharedInterests: ['Watercolor Painting', 'Heirloom Gardening', 'Sourdough Baking', 'Choir'],
        conversationStarters: [
          'Ask Grandma Bea which vegetables are easiest for kids to grow at home.',
          'Ask her about the secret spice in her Sunday apple crumble.',
        ],
        growthAreas: [
          {
            id: `gr-${familyId}-3`,
            title: 'Publishing Her Illustrated Family Recipe & Herb Book',
            category: 'CAREER_SKILL',
            description: 'Compiling her botanical drawings and family recipes into a printed keepsake book.',
            howKidsCanSupport: 'Test-bake her recipes together and send photos for the book pages.',
            status: 'ACTIVE_SUPPORT',
            addedByName: primaryMemberName,
            createdAt: now - 86400000 * 12,
          },
        ],
        encouragementNotes: [],
        createdByUserId: ownerUserId,
        createdAt: now - 86400000 * 30,
        updatedAt: now - 86400000 * 6,
      },
      {
        id: `rel-ext-${familyId}-paternal-uncle`,
        familyId,
        fullName: 'Samuel Henderson',
        preferredTitle: 'Uncle Sam',
        lineageSide: 'PATERNAL',
        generationTier: 'PARENTS_AUNTS_UNCLES',
        relationshipToChildren: 'Paternal Uncle (Father’s Younger Brother)',
        birthYear: currentYear - 41,
        age: 41,
        occupation: 'Senior Civil & Renewable Infrastructure Engineer',
        workplaceOrSpecialty: 'Thames Clean Water & Suspension Bridge Projects',
        city: 'London',
        country: 'United Kingdom',
        regionTag: 'Europe',
        mapCoordinates: { xPercent: 48, yPercent: 32 },
        avatarUrl: createRelativePortraitSvgDataUrl({
          initials: 'SH',
          bgHex: '#1E3A34',
          ringHex: '#C39A60',
          skinHex: '#D9A987',
          hairHex: '#44403C',
          shirtHex: '#1E3A8A',
          hasGlasses: false,
          hasBeard: true,
        }),
        bioAndHeritageStory:
          'Your father’s younger brother who loves building suspension bridges, running marathons, and mentoring young engineers in STEM.',
        sharedInterests: ['Bridge Engineering', 'Distance Running', 'Science Museums', 'Acoustic Guitar'],
        conversationStarters: [
          'Ask Uncle Sam how engineers keep giant bridges from swaying in strong winds.',
          'Ask him what his favorite science experiment was when he was 10 years old.',
        ],
        growthAreas: [
          {
            id: `gr-${familyId}-4`,
            title: 'Executive Leadership Transition & Work-Life Rest Rhythm',
            category: 'CAREER_SKILL',
            description: 'Stepping into Regional Engineering Director while protecting restful weekends.',
            howKidsCanSupport: 'Send him encouraging voice notes before his big project presentations.',
            status: 'EXPLORING',
            addedByName: primaryMemberName,
            createdAt: now - 86400000 * 9,
          },
        ],
        encouragementNotes: [
          {
            id: `enc-${familyId}-2`,
            authorName: primaryMemberName,
            authorRole: 'OWNER',
            message: 'Praying for wisdom and calm as you lead the new bridge safety team in London!',
            createdAt: now - 86400000 * 3,
          },
        ],
        createdByUserId: ownerUserId,
        createdAt: now - 86400000 * 28,
        updatedAt: now - 86400000 * 3,
      },
      {
        id: `rel-ext-${familyId}-maternal-grandma`,
        familyId,
        fullName: 'Grace Okafor-Vance',
        preferredTitle: 'Grandma Grace',
        lineageSide: 'MATERNAL',
        generationTier: 'ELDERS_GRANDPARENTS',
        relationshipToChildren: 'Maternal Grandmother (Mother’s Mom)',
        birthYear: currentYear - 64,
        age: 64,
        occupation: 'University Comparative Literature Professor & Author',
        workplaceOrSpecialty: 'Storytelling, African & Diaspora Folklore, and Youth Literacy',
        city: 'Toronto',
        country: 'Canada',
        regionTag: 'North America',
        mapCoordinates: { xPercent: 27, yPercent: 33 },
        avatarUrl: createRelativePortraitSvgDataUrl({
          initials: 'GV',
          bgHex: '#173D35',
          ringHex: '#2E6F5E',
          skinHex: '#8D5524',
          hairHex: '#292524',
          shirtHex: '#0F766E',
          hasGlasses: true,
          hasBeard: false,
        }),
        bioAndHeritageStory:
          'Raised your mother with a deep love for books, proverbs, hospitality, and music. She has mentored hundreds of university students and writes children’s fables.',
        sharedInterests: ['Folklore & Storytelling', 'Poetry', 'Piano', 'Community Literacy'],
        conversationStarters: [
          'Ask Grandma Grace to tell you her favorite childhood proverb and what it means.',
          'Ask her what books your mother loved reading most when she was a child.',
        ],
        growthAreas: [
          {
            id: `gr-${familyId}-5`,
            title: 'Recording Audio Stories of Maternal Family Origins',
            category: 'FAMILY_BOND',
            description: 'Capturing Grandma Grace’s oral histories and songs so the children and future generations know their maternal roots.',
            howKidsCanSupport: 'Pick one question each month for Grandma Grace’s audio story podcast.',
            status: 'ACTIVE_SUPPORT',
            addedByName: primaryMemberName,
            createdAt: now - 86400000 * 15,
          },
        ],
        encouragementNotes: [
          {
            id: `enc-${familyId}-3`,
            authorName: primaryMemberName,
            authorRole: 'OWNER',
            message: 'Your stories at dinner inspire the children to read and write with such imagination!',
            createdAt: now - 86400000 * 4,
          },
        ],
        createdByUserId: ownerUserId,
        createdAt: now - 86400000 * 28,
        updatedAt: now - 86400000 * 4,
      },
      {
        id: `rel-ext-${familyId}-maternal-aunt`,
        familyId,
        fullName: 'Dr. Elena Vance',
        preferredTitle: 'Auntie Elena',
        lineageSide: 'MATERNAL',
        generationTier: 'PARENTS_AUNTS_UNCLES',
        relationshipToChildren: 'Maternal Aunt (Mother’s Sister)',
        birthYear: currentYear - 36,
        age: 36,
        occupation: 'Pediatrician & Child Wellness Specialist',
        workplaceOrSpecialty: 'Children’s Hospital Preventive Care & Nutrition Clinic',
        city: 'Boston',
        country: 'United States',
        regionTag: 'North America',
        mapCoordinates: { xPercent: 29, yPercent: 37 },
        avatarUrl: createRelativePortraitSvgDataUrl({
          initials: 'EV',
          bgHex: '#1F4B3F',
          ringHex: '#2E6F5E',
          skinHex: '#A56B46',
          hairHex: '#1C1917',
          shirtHex: '#047857',
          hasGlasses: false,
          hasBeard: false,
        }),
        bioAndHeritageStory:
          'Your mother’s younger sister who takes care of newborn babies and children at the hospital and loves organizing summer family beach trips.',
        sharedInterests: ['Pediatric Medicine', 'Healthy Cooking', 'Kayaking', 'Photography'],
        conversationStarters: [
          'Ask Auntie Elena why she decided to become a children’s doctor.',
          'Ask her how the human heart and lungs work when we exercise.',
        ],
        growthAreas: [
          {
            id: `gr-${familyId}-6`,
            title: 'Launching Community Youth Health & Nutrition Workshops',
            category: 'EDUCATION_MENTORSHIP',
            description: 'Building a weekend preventative wellness program for local families in Boston.',
            howKidsCanSupport: 'Help design kid-friendly healthy snack cards for her clinic.',
            status: 'ACTIVE_SUPPORT',
            addedByName: primaryMemberName,
            createdAt: now - 86400000 * 10,
          },
        ],
        encouragementNotes: [],
        createdByUserId: ownerUserId,
        createdAt: now - 86400000 * 25,
        updatedAt: now - 86400000 * 2,
      },
      {
        id: `rel-ext-${familyId}-maternal-cousin`,
        familyId,
        fullName: 'Maya Vance',
        preferredTitle: 'Cousin Maya',
        lineageSide: 'MATERNAL',
        generationTier: 'CHILDREN_COUSINS',
        relationshipToChildren: 'Maternal First Cousin (Auntie Elena’s Daughter)',
        birthYear: currentYear - 14,
        age: 14,
        occupation: 'High School Honors Student & Youth Robotics Captain',
        workplaceOrSpecialty: 'STEM Robotics Club & Youth Symphony Cello Section',
        city: 'Boston',
        country: 'United States',
        regionTag: 'North America',
        mapCoordinates: { xPercent: 30, yPercent: 38 },
        avatarUrl: createRelativePortraitSvgDataUrl({
          initials: 'MV',
          bgHex: '#234B3C',
          ringHex: '#2E6F5E',
          skinHex: '#A56B46',
          hairHex: '#1C1917',
          shirtHex: '#B45309',
          hasGlasses: false,
          hasBeard: false,
        }),
        bioAndHeritageStory:
          'Loves coding autonomous Lego/VEX robots, playing classical cello, and teaming up with her cousins for summer coding and trivia challenges.',
        sharedInterests: ['Robotics & Coding', 'Cello', 'Strategy Board Games', 'Astronomy'],
        conversationStarters: [
          'Ask Cousin Maya what her robot has to do in this year’s competition.',
          'Ask her what song she is practicing on the cello right now.',
        ],
        growthAreas: [
          {
            id: `gr-${familyId}-7`,
            title: 'Preparing for Regional Robotics Championship & Confidence in Public Speaking',
            category: 'EDUCATION_MENTORSHIP',
            description: 'Practicing her engineering judge presentation and leading her 6-student team.',
            howKidsCanSupport: 'Do a practice presentation together on video call and cheer her team on!',
            status: 'ACTIVE_SUPPORT',
            addedByName: primaryMemberName,
            createdAt: now - 86400000 * 6,
          },
        ],
        encouragementNotes: [],
        createdByUserId: ownerUserId,
        createdAt: now - 86400000 * 20,
        updatedAt: now - 86400000 * 2,
      },
    ];

    for (const rel of relatives) {
      store.synchronizedEntities[`FAMILY_EXTENDED_RELATIVE:${rel.id}`] = {
        id: rel.id,
        familyId,
        entityType: 'FAMILY_EXTENDED_RELATIVE',
        version: 1,
        isDeleted: false,
        updatedAt: rel.updatedAt,
        updatedByUserId: ownerUserId,
        data: rel,
      };
    }
    mutated = true;
  }

  return mutated;
}

/**
 * Synchronizes a Shared Activity (`FAMILY_SHARED_ACTIVITY`) into the canonical Family Calendar
 * (`store.calendarEvents` and `store.synchronizedEntities['CALENDAR_EVENT:...']`).
 */
function syncSharedActivityToCalendar(
  store: SharedStore,
  familyId: string,
  activity: Record<string, any>,
  actorUserId: string,
  isDeleted = false
): string {
  const calEventId = String(activity.linkedCalendarEventId || `cal-act-${activity.id}`);
  const now = Date.now();
  store.calendarEvents = store.calendarEvents || [];
  store.synchronizedEntities = store.synchronizedEntities || {};

  if (isDeleted || activity.status === 'CANCELLED') {
    const existingCal = store.calendarEvents.find((e) => e.id === calEventId && e.familyId === familyId);
    if (existingCal) {
      existingCal.isDeleted = true;
      existingCal.updatedAt = now;
    }
    if (store.synchronizedEntities[`CALENDAR_EVENT:${calEventId}`]) {
      store.synchronizedEntities[`CALENDAR_EVENT:${calEventId}`].isDeleted = true;
      store.synchronizedEntities[`CALENDAR_EVENT:${calEventId}`].updatedAt = now;
    }
    return calEventId;
  }

  const dateIso = String(activity.dateIso || new Date(now).toISOString().slice(0, 10));
  const startTime = String(activity.startTime || '18:00');
  const endTime = String(activity.endTime || '20:00');
  const eventEpoch = Date.parse(`${dateIso}T${startTime}:00`) || now;
  const endEpoch = Date.parse(`${dateIso}T${endTime}:00`) || eventEpoch + 7200000;
  const todayIso = new Date().toISOString().slice(0, 10);

  const calRecordData: any = {
    id: calEventId,
    familyId,
    title: String(activity.title || 'Family Shared Activity'),
    description: String(activity.description || ''),
    category: 'FAMILY_EVENT',
    scope: 'FAMILY',
    dateIso,
    date: dateIso,
    dateLabel: dateIso === todayIso ? 'Today' : dateIso,
    startTime,
    endTime,
    timeRange: `${startTime} - ${endTime}`,
    eventEpoch,
    endEpoch,
    isAllDay: false,
    isToday: dateIso === todayIso,
    location: String(activity.location || 'Home'),
    organizerMemberId: String(activity.organizerMemberId || ''),
    participantMemberIds: Array.isArray(activity.participantMemberIds) ? activity.participantMemberIds : [],
    sourceModule: 'FAMILY_ACTIVITIES',
    linkedSourceId: String(activity.id),
    version: 1,
    createdAt: Number(activity.createdAt || now),
    updatedAt: now,
    isDeleted: false,
  };

  const existingIdx = store.calendarEvents.findIndex((e) => e.id === calEventId && e.familyId === familyId);
  if (existingIdx >= 0) {
    calRecordData.version = (store.calendarEvents[existingIdx].version || 1) + 1;
    store.calendarEvents[existingIdx] = calRecordData;
  } else {
    store.calendarEvents.push(calRecordData);
  }

  store.synchronizedEntities[`CALENDAR_EVENT:${calEventId}`] = {
    id: calEventId,
    familyId,
    entityType: 'CALENDAR_EVENT',
    version: calRecordData.version,
    isDeleted: false,
    updatedAt: now,
    updatedByUserId: actorUserId,
    data: calRecordData,
  };

  return calEventId;
}

export function registerFamilySectionAndHomeDashboardRoutes(
  app: Express,
  deps: FamilySectionRouteDependencies
): void {
  const {
    requireAuth,
    loadStore,
    withAtomicStoreTransaction,
    bumpWorkspaceVersion,
    mirrorEntityToFirestore,
  } = deps;

  // ============================================================================
  // 1. GET /api/v1/family-section/:familyId — Complete Family Section Hydration
  // ============================================================================
  app.get('/api/v1/family-section/:familyId', requireAuth, async (req: Request, res: Response) => {
    const familyId = String(req.params.familyId || '').trim();
    const actor = req.actor!;

    await withAtomicStoreTransaction(async (store) => {
      const access = resolveServerMembership(store, actor.userAccountId, familyId);
      if (!access.allowed || !access.membership) {
        res.status(access.httpStatus).json({ error: access.errorCode, message: access.errorMessage });
        return;
      }

      const caller = access.membership;
      ensureFamilySectionSeedData(store, familyId);

      const entities = Object.values(store.synchronizedEntities || {}).filter(
        (e) => e.familyId === familyId && !e.isDeleted
      );

      const albums = entities
        .filter((e) => e.entityType === 'FAMILY_GALLERY_ALBUM')
        .map((e) => ({ ...e.data, id: e.id, version: e.version, updatedAt: e.updatedAt }))
        .sort((a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0));

      const photos = entities
        .filter((e) => e.entityType === 'FAMILY_GALLERY_PHOTO')
        .filter((e) => {
          const vis = String(e.data.visibility || 'FAMILY').toUpperCase();
          if (vis === 'PRIVATE') {
            return (
              e.data.uploadedByUserId === caller.userAccountId ||
              e.data.uploadedByMemberId === caller.memberProfileId
            );
          }
          if (vis === 'PARENTS_ONLY') {
            return ['OWNER', 'ADMIN'].includes(caller.role);
          }
          return true;
        })
        .map((e) => ({ ...e.data, id: e.id, version: e.version, updatedAt: e.updatedAt }))
        .sort((a: any, b: any) => (b.createdAt || b.updatedAt || 0) - (a.createdAt || a.updatedAt || 0));

      const constitutionVersions = entities
        .filter((e) => e.entityType === 'FAMILY_CONSTITUTION_VERSION')
        .map((e) => ({ ...e.data, id: e.id, version: e.version, updatedAt: e.updatedAt }))
        .sort((a: any, b: any) => (b.versionNumber || b.version || 0) - (a.versionNumber || a.version || 0));

      const currentConstitution = constitutionVersions[0] || null;

      const traditions = entities
        .filter((e) => e.entityType === 'FAMILY_TRADITION')
        .map((e) => ({ ...e.data, id: e.id, version: e.version, updatedAt: e.updatedAt }))
        .sort((a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0));

      const sharedActivities = entities
        .filter((e) => e.entityType === 'FAMILY_SHARED_ACTIVITY')
        .map((e) => {
          const copy: Record<string, any> = { ...e.data, id: e.id, version: e.version, updatedAt: e.updatedAt };
          if (!canPerformFinanceMutation(caller.role)) {
            delete copy.budgetCents;
          }
          return copy;
        })
        .sort((a: any, b: any) => String(a.dateIso || '').localeCompare(String(b.dateIso || '')));

      const rules = entities
        .filter((e) => e.entityType === 'FAMILY_RULE')
        .map((e) => ({ ...e.data, id: e.id, version: e.version, updatedAt: e.updatedAt }))
        .sort((a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0));

      const currentYear = new Date().getFullYear();
      const extendedRelatives = entities
        .filter((e) => e.entityType === 'FAMILY_EXTENDED_RELATIVE')
        .map((e) => {
          const d = e.data || {};
          const computedAge =
            typeof d.birthYear === 'number' && d.birthYear > 1900 && d.birthYear <= currentYear
              ? currentYear - d.birthYear
              : Number(d.age || 35);
          return {
            ...d,
            id: e.id,
            age: computedAge,
            version: e.version,
            updatedAt: e.updatedAt,
          };
        })
        .sort((a: any, b: any) => (b.age || 0) - (a.age || 0));

      const householdStore = getHouseholdStore(familyId);
      const availableRecipes = Array.from(householdStore.recipes.values()).map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
      }));

      res.status(200).json({
        familyId,
        callerRole: caller.role,
        canManageGovernance: canManageMemberships(caller.role),
        albums,
        photos,
        currentConstitution,
        constitutionHistory: constitutionVersions,
        traditions,
        sharedActivities,
        rules,
        extendedRelatives,
        availableRecipes,
      });
    });
  });

  // ============================================================================
  // 2. FAMILY GALLERY — ALBUMS & PHOTOS CRUD
  // ============================================================================
  app.post('/api/v1/family-section/:familyId/albums', requireAuth, async (req: Request, res: Response) => {
    const familyId = String(req.params.familyId || '').trim();
    const actor = req.actor!;
    const { title, description = '', category = 'Family Memories', coverPhotoUrl = '' } = req.body || {};

    if (!title || !String(title).trim()) {
      res.status(400).json({ error: 'INVALID_ALBUM_TITLE', message: 'Album title is required.' });
      return;
    }

    await withAtomicStoreTransaction(async (store) => {
      const access = resolveServerMembership(store, actor.userAccountId, familyId);
      if (!access.allowed || !access.membership) {
        res.status(access.httpStatus).json({ error: access.errorCode, message: access.errorMessage });
        return;
      }
      if (access.membership.role === 'GUEST') {
        res.status(403).json({ error: 'PERMISSION_DENIED', message: 'GUEST role cannot create albums.' });
        return;
      }

      const now = Date.now();
      const albumId = `alb-${now}-${Math.random().toString(36).slice(2, 6)}`;
      const cleanTitle = String(title).trim();
      const albumData = {
        id: albumId,
        familyId,
        title: cleanTitle,
        description: String(description || '').trim(),
        category: String(category || 'Family Memories').trim(),
        coverPhotoUrl:
          coverPhotoUrl && String(coverPhotoUrl).trim()
            ? String(coverPhotoUrl).trim()
            : createSampleSvgDataUrl(cleanTitle, String(category || 'Family Album')),
        createdByUserId: actor.userAccountId,
        createdByName: access.membership.displayName,
        createdAt: now,
        updatedAt: now,
      };

      store.synchronizedEntities = store.synchronizedEntities || {};
      const record: SynchronizedEntityRecord = {
        id: albumId,
        familyId,
        entityType: 'FAMILY_GALLERY_ALBUM',
        version: 1,
        isDeleted: false,
        updatedAt: now,
        updatedByUserId: actor.userAccountId,
        data: albumData,
      };
      store.synchronizedEntities[`FAMILY_GALLERY_ALBUM:${albumId}`] = record;
      bumpWorkspaceVersion(store, familyId, now);
      void mirrorEntityToFirestore(record);

      res.status(201).json({ album: albumData });
    });
  });

  app.delete('/api/v1/family-section/:familyId/albums/:albumId', requireAuth, async (req: Request, res: Response) => {
    const familyId = String(req.params.familyId || '').trim();
    const albumId = String(req.params.albumId || '').trim();
    const actor = req.actor!;

    await withAtomicStoreTransaction(async (store) => {
      const access = resolveServerMembership(store, actor.userAccountId, familyId);
      if (!access.allowed || !access.membership) {
        res.status(access.httpStatus).json({ error: access.errorCode, message: access.errorMessage });
        return;
      }

      const key = `FAMILY_GALLERY_ALBUM:${albumId}`;
      const existing = store.synchronizedEntities?.[key];
      if (!existing || existing.familyId !== familyId || existing.isDeleted) {
        res.status(404).json({ error: 'ALBUM_NOT_FOUND', message: 'Album not found.' });
        return;
      }

      if (
        existing.data.createdByUserId !== actor.userAccountId &&
        !canManageMemberships(access.membership.role)
      ) {
        res.status(403).json({ error: 'PERMISSION_DENIED', message: 'Only the creator or an admin can delete this album.' });
        return;
      }

      const now = Date.now();
      existing.isDeleted = true;
      existing.version += 1;
      existing.updatedAt = now;
      bumpWorkspaceVersion(store, familyId, now);

      res.status(200).json({ deleted: true, albumId });
    });
  });

  app.post('/api/v1/family-section/:familyId/photos', requireAuth, async (req: Request, res: Response) => {
    const familyId = String(req.params.familyId || '').trim();
    const actor = req.actor!;
    const {
      albumId = '',
      title,
      caption = '',
      eventName = '',
      takenDate = '',
      imageUrl = '',
      taggedMemberIds = [],
      isFavorite = false,
      visibility = 'FAMILY',
    } = req.body || {};

    if (!title || !String(title).trim()) {
      res.status(400).json({ error: 'INVALID_PHOTO_TITLE', message: 'Photo title is required.' });
      return;
    }

    const rawUrl = String(imageUrl || '').trim();
    if (
      rawUrl &&
      !rawUrl.startsWith('data:image/') &&
      !rawUrl.startsWith('/api/v1/media/') &&
      !rawUrl.startsWith('https://')
    ) {
      res.status(400).json({
        error: 'INVALID_PHOTO_FORMAT',
        message: 'Photo must be a valid image data URL, uploaded media URL, or HTTPS image URL.',
      });
      return;
    }

    await withAtomicStoreTransaction(async (store) => {
      const access = resolveServerMembership(store, actor.userAccountId, familyId);
      if (!access.allowed || !access.membership) {
        res.status(access.httpStatus).json({ error: access.errorCode, message: access.errorMessage });
        return;
      }
      if (access.membership.role === 'GUEST') {
        res.status(403).json({ error: 'PERMISSION_DENIED', message: 'GUEST role cannot upload photos.' });
        return;
      }

      const now = Date.now();
      const photoId = `pho-${now}-${Math.random().toString(36).slice(2, 6)}`;
      const cleanTitle = String(title).trim();
      const resolvedUrl =
        rawUrl || createSampleSvgDataUrl(cleanTitle, String(eventName || caption || 'Family Memory'));

      const familyMembers = (store.familyMembers || []).filter((m) => m.familyId === familyId && !m.isDeleted);
      const validMemberIds = Array.isArray(taggedMemberIds)
        ? taggedMemberIds.map((id) => String(id)).filter((id) => familyMembers.some((m) => m.id === id))
        : [];
      const taggedMemberNames = validMemberIds
        .map((id) => familyMembers.find((m) => m.id === id)?.displayName)
        .filter(Boolean);

      const photoData = {
        id: photoId,
        familyId,
        albumId: String(albumId || '').trim(),
        title: cleanTitle,
        caption: String(caption || '').trim(),
        eventName: String(eventName || '').trim(),
        takenDate: String(takenDate || new Date(now).toISOString().slice(0, 10)).trim(),
        imageUrl: resolvedUrl,
        taggedMemberIds: validMemberIds,
        taggedMemberNames,
        isFavorite: Boolean(isFavorite),
        visibility: ['FAMILY', 'PARENTS_ONLY', 'PRIVATE'].includes(String(visibility).toUpperCase())
          ? String(visibility).toUpperCase()
          : 'FAMILY',
        uploadedByUserId: actor.userAccountId,
        uploadedByMemberId: access.membership.memberProfileId,
        uploadedByName: access.membership.displayName,
        createdAt: now,
        updatedAt: now,
      };

      store.synchronizedEntities = store.synchronizedEntities || {};
      const record: SynchronizedEntityRecord = {
        id: photoId,
        familyId,
        entityType: 'FAMILY_GALLERY_PHOTO',
        version: 1,
        isDeleted: false,
        updatedAt: now,
        updatedByUserId: actor.userAccountId,
        data: photoData,
      };
      store.synchronizedEntities[`FAMILY_GALLERY_PHOTO:${photoId}`] = record;
      bumpWorkspaceVersion(store, familyId, now);
      void mirrorEntityToFirestore(record);

      res.status(201).json({ photo: photoData, persisted: true });
    });
  });

  app.put('/api/v1/family-section/:familyId/photos/:photoId', requireAuth, async (req: Request, res: Response) => {
    const familyId = String(req.params.familyId || '').trim();
    const photoId = String(req.params.photoId || '').trim();
    const actor = req.actor!;

    await withAtomicStoreTransaction(async (store) => {
      const access = resolveServerMembership(store, actor.userAccountId, familyId);
      if (!access.allowed || !access.membership) {
        res.status(access.httpStatus).json({ error: access.errorCode, message: access.errorMessage });
        return;
      }
      if (access.membership.role === 'GUEST') {
        res.status(403).json({ error: 'PERMISSION_DENIED', message: 'GUEST role cannot edit photos.' });
        return;
      }

      const key = `FAMILY_GALLERY_PHOTO:${photoId}`;
      const existing = store.synchronizedEntities?.[key];
      if (!existing || existing.familyId !== familyId || existing.isDeleted) {
        res.status(404).json({ error: 'PHOTO_NOT_FOUND', message: 'Photo not found.' });
        return;
      }

      const now = Date.now();
      const incoming = req.body || {};
      const familyMembers = (store.familyMembers || []).filter((m) => m.familyId === familyId && !m.isDeleted);
      const validMemberIds = Array.isArray(incoming.taggedMemberIds)
        ? incoming.taggedMemberIds.map((id: any) => String(id)).filter((id: string) => familyMembers.some((m) => m.id === id))
        : existing.data.taggedMemberIds || [];
      const taggedMemberNames = validMemberIds
        .map((id: string) => familyMembers.find((m) => m.id === id)?.displayName)
        .filter(Boolean);

      const updatedData = {
        ...existing.data,
        title: incoming.title !== undefined ? String(incoming.title).trim() : existing.data.title,
        caption: incoming.caption !== undefined ? String(incoming.caption).trim() : existing.data.caption,
        albumId: incoming.albumId !== undefined ? String(incoming.albumId).trim() : existing.data.albumId,
        eventName: incoming.eventName !== undefined ? String(incoming.eventName).trim() : existing.data.eventName,
        takenDate: incoming.takenDate !== undefined ? String(incoming.takenDate).trim() : existing.data.takenDate,
        isFavorite: incoming.isFavorite !== undefined ? Boolean(incoming.isFavorite) : existing.data.isFavorite,
        visibility: incoming.visibility !== undefined ? String(incoming.visibility).toUpperCase() : existing.data.visibility,
        taggedMemberIds: validMemberIds,
        taggedMemberNames,
        updatedAt: now,
      };

      existing.version += 1;
      existing.updatedAt = now;
      existing.updatedByUserId = actor.userAccountId;
      existing.data = updatedData;
      bumpWorkspaceVersion(store, familyId, now);

      res.status(200).json({ photo: updatedData });
    });
  });

  app.delete('/api/v1/family-section/:familyId/photos/:photoId', requireAuth, async (req: Request, res: Response) => {
    const familyId = String(req.params.familyId || '').trim();
    const photoId = String(req.params.photoId || '').trim();
    const actor = req.actor!;

    await withAtomicStoreTransaction(async (store) => {
      const access = resolveServerMembership(store, actor.userAccountId, familyId);
      if (!access.allowed || !access.membership) {
        res.status(access.httpStatus).json({ error: access.errorCode, message: access.errorMessage });
        return;
      }

      const key = `FAMILY_GALLERY_PHOTO:${photoId}`;
      const existing = store.synchronizedEntities?.[key];
      if (!existing || existing.familyId !== familyId || existing.isDeleted) {
        res.status(404).json({ error: 'PHOTO_NOT_FOUND', message: 'Photo not found.' });
        return;
      }

      const isUploader =
        existing.data.uploadedByUserId === actor.userAccountId ||
        existing.data.uploadedByMemberId === access.membership.memberProfileId;
      if (!isUploader && !canManageMemberships(access.membership.role)) {
        res.status(403).json({
          error: 'PERMISSION_DENIED',
          message: 'Only the uploader or a family OWNER/ADMIN can delete this photo.',
        });
        return;
      }

      const now = Date.now();
      existing.isDeleted = true;
      existing.version += 1;
      existing.updatedAt = now;
      bumpWorkspaceVersion(store, familyId, now);

      res.status(200).json({ deleted: true, photoId });
    });
  });

  // ============================================================================
  // 3. FAMILY CONSTITUTION — VERSIONED GOVERNANCE & MEMBER ACKNOWLEDGMENTS
  // ============================================================================
  app.put('/api/v1/family-section/:familyId/constitution', requireAuth, async (req: Request, res: Response) => {
    const familyId = String(req.params.familyId || '').trim();
    const actor = req.actor!;

    await withAtomicStoreTransaction(async (store) => {
      const access = resolveServerMembership(store, actor.userAccountId, familyId);
      if (!access.allowed || !access.membership) {
        res.status(access.httpStatus).json({ error: access.errorCode, message: access.errorMessage });
        return;
      }

      if (!canManageMemberships(access.membership.role)) {
        res.status(403).json({
          error: 'PERMISSION_DENIED',
          message: 'Only OWNER or ADMIN roles can revise the Family Constitution.',
        });
        return;
      }

      ensureFamilySectionSeedData(store, familyId);
      const existingVersions = Object.values(store.synchronizedEntities || {})
        .filter((e) => e.familyId === familyId && e.entityType === 'FAMILY_CONSTITUTION_VERSION' && !e.isDeleted)
        .map((e) => e.data as Record<string, any>)
        .sort((a, b) => (b.versionNumber || 0) - (a.versionNumber || 0));

      const latest = existingVersions[0] || {};
      const nextVersionNumber = Number(latest.versionNumber || 0) + 1;
      const now = Date.now();
      const constId = `const-${familyId}-v${nextVersionNumber}-${now}`;

      const {
        motto,
        missionStatement,
        visionStatement,
        coreValues,
        familyIdentityStatement,
        sharedAspirations,
        memberCommitments,
        legacyStatement,
      } = req.body || {};

      const cleanValues = Array.isArray(coreValues)
        ? coreValues.map((v) => String(v).trim()).filter(Boolean)
        : latest.coreValues || [];
      const cleanAspirations = Array.isArray(sharedAspirations)
        ? sharedAspirations.map((v) => String(v).trim()).filter(Boolean)
        : latest.sharedAspirations || [];
      const cleanCommitments = Array.isArray(memberCommitments)
        ? memberCommitments.map((v) => String(v).trim()).filter(Boolean)
        : latest.memberCommitments || [];

      const newConstitution = {
        id: constId,
        familyId,
        versionNumber: nextVersionNumber,
        motto: motto !== undefined ? String(motto).trim() : String(latest.motto || ''),
        missionStatement:
          missionStatement !== undefined ? String(missionStatement).trim() : String(latest.missionStatement || ''),
        visionStatement:
          visionStatement !== undefined ? String(visionStatement).trim() : String(latest.visionStatement || ''),
        coreValues: cleanValues,
        familyIdentityStatement:
          familyIdentityStatement !== undefined
            ? String(familyIdentityStatement).trim()
            : String(latest.familyIdentityStatement || ''),
        sharedAspirations: cleanAspirations,
        memberCommitments: cleanCommitments,
        legacyStatement:
          legacyStatement !== undefined ? String(legacyStatement).trim() : String(latest.legacyStatement || ''),
        editedByUserId: actor.userAccountId,
        editedByName: access.membership.displayName,
        acknowledgments: [
          {
            memberId: access.membership.memberProfileId,
            userAccountId: actor.userAccountId,
            displayName: access.membership.displayName,
            acknowledgedAt: now,
            versionNumber: nextVersionNumber,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };

      store.synchronizedEntities = store.synchronizedEntities || {};
      const record: SynchronizedEntityRecord = {
        id: constId,
        familyId,
        entityType: 'FAMILY_CONSTITUTION_VERSION',
        version: nextVersionNumber,
        isDeleted: false,
        updatedAt: now,
        updatedByUserId: actor.userAccountId,
        data: newConstitution,
      };
      store.synchronizedEntities[`FAMILY_CONSTITUTION_VERSION:${constId}`] = record;

      // Also keep workspace motto, mission, vision, values in sync
      const ws = store.workspaces?.[familyId] || (store.workspace?.id === familyId ? store.workspace : null);
      if (ws) {
        ws.motto = newConstitution.motto;
        ws.mission = newConstitution.missionStatement;
        ws.vision = newConstitution.visionStatement;
        ws.values = newConstitution.coreValues;
        ws.updatedAt = now;
      }

      bumpWorkspaceVersion(store, familyId, now);
      void mirrorEntityToFirestore(record);

      res.status(200).json({
        constitution: newConstitution,
        versionNumber: nextVersionNumber,
      });
    });
  });

  app.post('/api/v1/family-section/:familyId/constitution/acknowledge', requireAuth, async (req: Request, res: Response) => {
    const familyId = String(req.params.familyId || '').trim();
    const actor = req.actor!;

    await withAtomicStoreTransaction(async (store) => {
      const access = resolveServerMembership(store, actor.userAccountId, familyId);
      if (!access.allowed || !access.membership) {
        res.status(access.httpStatus).json({ error: access.errorCode, message: access.errorMessage });
        return;
      }

      ensureFamilySectionSeedData(store, familyId);
      const versions = Object.values(store.synchronizedEntities || {})
        .filter((e) => e.familyId === familyId && e.entityType === 'FAMILY_CONSTITUTION_VERSION' && !e.isDeleted)
        .sort((a, b) => Number(b.data.versionNumber || 0) - Number(a.data.versionNumber || 0));

      const current = versions[0];
      if (!current) {
        res.status(404).json({ error: 'CONSTITUTION_NOT_FOUND', message: 'No family constitution found.' });
        return;
      }

      const now = Date.now();
      const acks = Array.isArray(current.data.acknowledgments) ? [...current.data.acknowledgments] : [];
      const existingIdx = acks.findIndex(
        (a: any) =>
          a.memberId === access.membership!.memberProfileId || a.userAccountId === actor.userAccountId
      );
      const ackEntry = {
        memberId: access.membership.memberProfileId,
        userAccountId: actor.userAccountId,
        displayName: access.membership.displayName,
        acknowledgedAt: now,
        versionNumber: current.data.versionNumber || 1,
      };
      if (existingIdx >= 0) {
        acks[existingIdx] = ackEntry;
      } else {
        acks.push(ackEntry);
      }

      current.data.acknowledgments = acks;
      current.data.updatedAt = now;
      current.version += 1;
      current.updatedAt = now;
      bumpWorkspaceVersion(store, familyId, now);

      res.status(200).json({ constitution: current.data });
    });
  });

  // ============================================================================
  // 4. FAMILY TRADITIONS & CULTURE CRUD
  // ============================================================================
  app.post('/api/v1/family-section/:familyId/traditions', requireAuth, async (req: Request, res: Response) => {
    const familyId = String(req.params.familyId || '').trim();
    const actor = req.actor!;
    const {
      title,
      category = 'Annual Tradition',
      frequency = 'Annually',
      nextPlannedDate = '',
      meaningAndOrigin = '',
      culturalBackground = '',
      linkedRecipeId = '',
      linkedRecipeTitle = '',
      responsibleMemberIds = [],
      memoriesAndNotes = [],
    } = req.body || {};

    if (!title || !String(title).trim()) {
      res.status(400).json({ error: 'INVALID_TRADITION_TITLE', message: 'Tradition title is required.' });
      return;
    }

    await withAtomicStoreTransaction(async (store) => {
      const access = resolveServerMembership(store, actor.userAccountId, familyId);
      if (!access.allowed || !access.membership) {
        res.status(access.httpStatus).json({ error: access.errorCode, message: access.errorMessage });
        return;
      }
      if (access.membership.role === 'GUEST') {
        res.status(403).json({ error: 'PERMISSION_DENIED', message: 'GUEST role cannot create traditions.' });
        return;
      }

      const now = Date.now();
      const tradId = `trad-${now}-${Math.random().toString(36).slice(2, 6)}`;
      const familyMembers = (store.familyMembers || []).filter((m) => m.familyId === familyId && !m.isDeleted);
      const validIds = Array.isArray(responsibleMemberIds)
        ? responsibleMemberIds.map((id) => String(id)).filter((id) => familyMembers.some((m) => m.id === id))
        : [access.membership.memberProfileId];
      const respNames = validIds
        .map((id) => familyMembers.find((m) => m.id === id)?.displayName)
        .filter(Boolean);

      const traditionData = {
        id: tradId,
        familyId,
        title: String(title).trim(),
        category: String(category || 'Annual Tradition').trim(),
        frequency: String(frequency || 'Annually').trim(),
        nextPlannedDate: String(nextPlannedDate || '').trim(),
        meaningAndOrigin: String(meaningAndOrigin || '').trim(),
        culturalBackground: String(culturalBackground || '').trim(),
        linkedRecipeId: String(linkedRecipeId || '').trim(),
        linkedRecipeTitle: String(linkedRecipeTitle || '').trim(),
        responsibleMemberIds: validIds,
        responsibleMemberNames: respNames.length > 0 ? respNames : [access.membership.displayName],
        memoriesAndNotes: Array.isArray(memoriesAndNotes)
          ? memoriesAndNotes.map((n) => String(n).trim()).filter(Boolean)
          : [],
        status: 'ACTIVE',
        createdByUserId: actor.userAccountId,
        createdAt: now,
        updatedAt: now,
      };

      store.synchronizedEntities = store.synchronizedEntities || {};
      const record: SynchronizedEntityRecord = {
        id: tradId,
        familyId,
        entityType: 'FAMILY_TRADITION',
        version: 1,
        isDeleted: false,
        updatedAt: now,
        updatedByUserId: actor.userAccountId,
        data: traditionData,
      };
      store.synchronizedEntities[`FAMILY_TRADITION:${tradId}`] = record;
      bumpWorkspaceVersion(store, familyId, now);
      void mirrorEntityToFirestore(record);

      res.status(201).json({ tradition: traditionData });
    });
  });

  app.put('/api/v1/family-section/:familyId/traditions/:traditionId', requireAuth, async (req: Request, res: Response) => {
    const familyId = String(req.params.familyId || '').trim();
    const traditionId = String(req.params.traditionId || '').trim();
    const actor = req.actor!;

    await withAtomicStoreTransaction(async (store) => {
      const access = resolveServerMembership(store, actor.userAccountId, familyId);
      if (!access.allowed || !access.membership) {
        res.status(access.httpStatus).json({ error: access.errorCode, message: access.errorMessage });
        return;
      }
      if (access.membership.role === 'GUEST') {
        res.status(403).json({ error: 'PERMISSION_DENIED', message: 'GUEST role cannot edit traditions.' });
        return;
      }

      const key = `FAMILY_TRADITION:${traditionId}`;
      const existing = store.synchronizedEntities?.[key];
      if (!existing || existing.familyId !== familyId || existing.isDeleted) {
        res.status(404).json({ error: 'TRADITION_NOT_FOUND', message: 'Tradition not found.' });
        return;
      }

      const now = Date.now();
      const inc = req.body || {};
      const familyMembers = (store.familyMembers || []).filter((m) => m.familyId === familyId && !m.isDeleted);
      const validIds = Array.isArray(inc.responsibleMemberIds)
        ? inc.responsibleMemberIds.map((id: any) => String(id)).filter((id: string) => familyMembers.some((m) => m.id === id))
        : existing.data.responsibleMemberIds || [];
      const respNames = validIds
        .map((id: string) => familyMembers.find((m) => m.id === id)?.displayName)
        .filter(Boolean);

      const updatedData = {
        ...existing.data,
        title: inc.title !== undefined ? String(inc.title).trim() : existing.data.title,
        category: inc.category !== undefined ? String(inc.category).trim() : existing.data.category,
        frequency: inc.frequency !== undefined ? String(inc.frequency).trim() : existing.data.frequency,
        nextPlannedDate: inc.nextPlannedDate !== undefined ? String(inc.nextPlannedDate).trim() : existing.data.nextPlannedDate,
        meaningAndOrigin: inc.meaningAndOrigin !== undefined ? String(inc.meaningAndOrigin).trim() : existing.data.meaningAndOrigin,
        culturalBackground: inc.culturalBackground !== undefined ? String(inc.culturalBackground).trim() : existing.data.culturalBackground,
        linkedRecipeId: inc.linkedRecipeId !== undefined ? String(inc.linkedRecipeId).trim() : existing.data.linkedRecipeId,
        linkedRecipeTitle: inc.linkedRecipeTitle !== undefined ? String(inc.linkedRecipeTitle).trim() : existing.data.linkedRecipeTitle,
        responsibleMemberIds: validIds,
        responsibleMemberNames: respNames.length > 0 ? respNames : existing.data.responsibleMemberNames,
        memoriesAndNotes: Array.isArray(inc.memoriesAndNotes)
          ? inc.memoriesAndNotes.map((n: any) => String(n).trim()).filter(Boolean)
          : existing.data.memoriesAndNotes,
        status: inc.status !== undefined ? String(inc.status).toUpperCase() : existing.data.status,
        updatedAt: now,
      };

      existing.version += 1;
      existing.updatedAt = now;
      existing.updatedByUserId = actor.userAccountId;
      existing.data = updatedData;
      bumpWorkspaceVersion(store, familyId, now);

      res.status(200).json({ tradition: updatedData });
    });
  });

  app.delete('/api/v1/family-section/:familyId/traditions/:traditionId', requireAuth, async (req: Request, res: Response) => {
    const familyId = String(req.params.familyId || '').trim();
    const traditionId = String(req.params.traditionId || '').trim();
    const actor = req.actor!;

    await withAtomicStoreTransaction(async (store) => {
      const access = resolveServerMembership(store, actor.userAccountId, familyId);
      if (!access.allowed || !access.membership) {
        res.status(access.httpStatus).json({ error: access.errorCode, message: access.errorMessage });
        return;
      }
      if (!canManageMemberships(access.membership.role)) {
        res.status(403).json({ error: 'PERMISSION_DENIED', message: 'Only OWNER or ADMIN can delete family traditions.' });
        return;
      }

      const key = `FAMILY_TRADITION:${traditionId}`;
      const existing = store.synchronizedEntities?.[key];
      if (!existing || existing.familyId !== familyId || existing.isDeleted) {
        res.status(404).json({ error: 'TRADITION_NOT_FOUND', message: 'Tradition not found.' });
        return;
      }

      const now = Date.now();
      existing.isDeleted = true;
      existing.version += 1;
      existing.updatedAt = now;
      bumpWorkspaceVersion(store, familyId, now);

      res.status(200).json({ deleted: true, traditionId });
    });
  });

  // ============================================================================
  // 5. SHARED ACTIVITIES — PLANNER + TWO-WAY CALENDAR SYNC + RSVP
  // ============================================================================
  app.post('/api/v1/family-section/:familyId/activities', requireAuth, async (req: Request, res: Response) => {
    const familyId = String(req.params.familyId || '').trim();
    const actor = req.actor!;
    const {
      title,
      description = '',
      dateIso = '',
      startTime = '18:00',
      endTime = '20:00',
      location = 'Home',
      category = 'Family Outing',
      participantMemberIds = [],
      budgetCents = 0,
      preparationChecklist = [],
      recurrence = 'NONE',
      status = 'PLANNED',
      memoryNotes = '',
    } = req.body || {};

    if (!title || !String(title).trim()) {
      res.status(400).json({ error: 'INVALID_ACTIVITY_TITLE', message: 'Activity title is required.' });
      return;
    }

    await withAtomicStoreTransaction(async (store) => {
      const access = resolveServerMembership(store, actor.userAccountId, familyId);
      if (!access.allowed || !access.membership) {
        res.status(access.httpStatus).json({ error: access.errorCode, message: access.errorMessage });
        return;
      }
      if (access.membership.role === 'GUEST') {
        res.status(403).json({ error: 'PERMISSION_DENIED', message: 'GUEST role cannot create shared activities.' });
        return;
      }

      const now = Date.now();
      const actId = `act-${now}-${Math.random().toString(36).slice(2, 6)}`;
      const familyMembers = (store.familyMembers || []).filter((m) => m.familyId === familyId && !m.isDeleted);
      const validParticipants =
        Array.isArray(participantMemberIds) && participantMemberIds.length > 0
          ? participantMemberIds.map((id) => String(id)).filter((id) => familyMembers.some((m) => m.id === id))
          : familyMembers.map((m) => m.id);

      const rsvps = validParticipants.map((memberId) => {
        const mem = familyMembers.find((m) => m.id === memberId);
        return {
          memberId,
          displayName: mem?.displayName || 'Family Member',
          status: memberId === access.membership!.memberProfileId ? 'GOING' : 'INVITED',
        };
      });

      const resolvedDateIso = String(dateIso || new Date(now + 86400000).toISOString().slice(0, 10)).trim();
      const calEventId = `cal-act-${actId}`;

      const activityData: Record<string, any> = {
        id: actId,
        familyId,
        title: String(title).trim(),
        description: String(description || '').trim(),
        dateIso: resolvedDateIso,
        startTime: String(startTime || '18:00').trim(),
        endTime: String(endTime || '20:00').trim(),
        location: String(location || 'Home').trim(),
        category: String(category || 'Family Outing').trim(),
        organizerMemberId: access.membership.memberProfileId,
        organizerName: access.membership.displayName,
        participantMemberIds: validParticipants,
        rsvps,
        budgetCents: Math.max(0, Math.round(Number(budgetCents || 0))),
        preparationChecklist: Array.isArray(preparationChecklist)
          ? preparationChecklist.map((item: any, idx: number) => ({
              id: String(item.id || `chk-${now}-${idx}`),
              text: String(item.text || item).trim(),
              completed: Boolean(item.completed),
            }))
          : [],
        status: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(String(status).toUpperCase())
          ? String(status).toUpperCase()
          : 'PLANNED',
        recurrence: String(recurrence || 'NONE').toUpperCase(),
        memoryNotes: String(memoryNotes || '').trim(),
        linkedCalendarEventId: calEventId,
        createdByUserId: actor.userAccountId,
        createdAt: now,
        updatedAt: now,
      };

      syncSharedActivityToCalendar(store, familyId, activityData, actor.userAccountId, false);

      store.synchronizedEntities = store.synchronizedEntities || {};
      const record: SynchronizedEntityRecord = {
        id: actId,
        familyId,
        entityType: 'FAMILY_SHARED_ACTIVITY',
        version: 1,
        isDeleted: false,
        updatedAt: now,
        updatedByUserId: actor.userAccountId,
        data: activityData,
      };
      store.synchronizedEntities[`FAMILY_SHARED_ACTIVITY:${actId}`] = record;
      bumpWorkspaceVersion(store, familyId, now);
      void mirrorEntityToFirestore(record);

      res.status(201).json({
        activity: activityData,
        linkedCalendarEventId: calEventId,
      });
    });
  });

  app.put('/api/v1/family-section/:familyId/activities/:activityId', requireAuth, async (req: Request, res: Response) => {
    const familyId = String(req.params.familyId || '').trim();
    const activityId = String(req.params.activityId || '').trim();
    const actor = req.actor!;

    await withAtomicStoreTransaction(async (store) => {
      const access = resolveServerMembership(store, actor.userAccountId, familyId);
      if (!access.allowed || !access.membership) {
        res.status(access.httpStatus).json({ error: access.errorCode, message: access.errorMessage });
        return;
      }
      if (access.membership.role === 'GUEST') {
        res.status(403).json({ error: 'PERMISSION_DENIED', message: 'GUEST role cannot modify shared activities.' });
        return;
      }

      const key = `FAMILY_SHARED_ACTIVITY:${activityId}`;
      const existing = store.synchronizedEntities?.[key];
      if (!existing || existing.familyId !== familyId || existing.isDeleted) {
        res.status(404).json({ error: 'ACTIVITY_NOT_FOUND', message: 'Shared activity not found.' });
        return;
      }

      const now = Date.now();
      const inc = req.body || {};
      const updatedData: Record<string, any> = {
        ...existing.data,
        title: inc.title !== undefined ? String(inc.title).trim() : existing.data.title,
        description: inc.description !== undefined ? String(inc.description).trim() : existing.data.description,
        dateIso: inc.dateIso !== undefined ? String(inc.dateIso).trim() : existing.data.dateIso,
        startTime: inc.startTime !== undefined ? String(inc.startTime).trim() : existing.data.startTime,
        endTime: inc.endTime !== undefined ? String(inc.endTime).trim() : existing.data.endTime,
        location: inc.location !== undefined ? String(inc.location).trim() : existing.data.location,
        category: inc.category !== undefined ? String(inc.category).trim() : existing.data.category,
        budgetCents:
          inc.budgetCents !== undefined
            ? Math.max(0, Math.round(Number(inc.budgetCents)))
            : existing.data.budgetCents,
        preparationChecklist:
          inc.preparationChecklist !== undefined && Array.isArray(inc.preparationChecklist)
            ? inc.preparationChecklist.map((item: any, idx: number) => ({
                id: String(item.id || `chk-${now}-${idx}`),
                text: String(item.text || item).trim(),
                completed: Boolean(item.completed),
              }))
            : existing.data.preparationChecklist,
        status: inc.status !== undefined ? String(inc.status).toUpperCase() : existing.data.status,
        recurrence: inc.recurrence !== undefined ? String(inc.recurrence).toUpperCase() : existing.data.recurrence,
        memoryNotes: inc.memoryNotes !== undefined ? String(inc.memoryNotes).trim() : existing.data.memoryNotes,
        updatedAt: now,
      };

      syncSharedActivityToCalendar(store, familyId, updatedData, actor.userAccountId, false);

      existing.version += 1;
      existing.updatedAt = now;
      existing.updatedByUserId = actor.userAccountId;
      existing.data = updatedData;
      bumpWorkspaceVersion(store, familyId, now);

      res.status(200).json({ activity: updatedData });
    });
  });

  app.post('/api/v1/family-section/:familyId/activities/:activityId/rsvp', requireAuth, async (req: Request, res: Response) => {
    const familyId = String(req.params.familyId || '').trim();
    const activityId = String(req.params.activityId || '').trim();
    const { status = 'GOING', memberId } = req.body || {};
    const actor = req.actor!;

    await withAtomicStoreTransaction(async (store) => {
      const access = resolveServerMembership(store, actor.userAccountId, familyId);
      if (!access.allowed || !access.membership) {
        res.status(access.httpStatus).json({ error: access.errorCode, message: access.errorMessage });
        return;
      }

      const key = `FAMILY_SHARED_ACTIVITY:${activityId}`;
      const existing = store.synchronizedEntities?.[key];
      if (!existing || existing.familyId !== familyId || existing.isDeleted) {
        res.status(404).json({ error: 'ACTIVITY_NOT_FOUND', message: 'Shared activity not found.' });
        return;
      }

      const targetMemberId = String(memberId || access.membership.memberProfileId);
      const now = Date.now();
      const rsvps = Array.isArray(existing.data.rsvps) ? [...existing.data.rsvps] : [];
      const idx = rsvps.findIndex((r: any) => r.memberId === targetMemberId);
      const mem = (store.familyMembers || []).find((m) => m.id === targetMemberId && m.familyId === familyId);
      const entry = {
        memberId: targetMemberId,
        displayName: mem?.displayName || access.membership.displayName,
        status: ['GOING', 'MAYBE', 'DECLINED'].includes(String(status).toUpperCase())
          ? String(status).toUpperCase()
          : 'GOING',
      };
      if (idx >= 0) {
        rsvps[idx] = entry;
      } else {
        rsvps.push(entry);
      }

      existing.data.rsvps = rsvps;
      existing.data.updatedAt = now;
      existing.version += 1;
      existing.updatedAt = now;
      bumpWorkspaceVersion(store, familyId, now);

      res.status(200).json({ activity: existing.data });
    });
  });

  app.delete('/api/v1/family-section/:familyId/activities/:activityId', requireAuth, async (req: Request, res: Response) => {
    const familyId = String(req.params.familyId || '').trim();
    const activityId = String(req.params.activityId || '').trim();
    const actor = req.actor!;

    await withAtomicStoreTransaction(async (store) => {
      const access = resolveServerMembership(store, actor.userAccountId, familyId);
      if (!access.allowed || !access.membership) {
        res.status(access.httpStatus).json({ error: access.errorCode, message: access.errorMessage });
        return;
      }
      if (access.membership.role === 'GUEST') {
        res.status(403).json({ error: 'PERMISSION_DENIED', message: 'GUEST role cannot delete shared activities.' });
        return;
      }

      const key = `FAMILY_SHARED_ACTIVITY:${activityId}`;
      const existing = store.synchronizedEntities?.[key];
      if (!existing || existing.familyId !== familyId || existing.isDeleted) {
        res.status(404).json({ error: 'ACTIVITY_NOT_FOUND', message: 'Shared activity not found.' });
        return;
      }

      const now = Date.now();
      syncSharedActivityToCalendar(store, familyId, existing.data, actor.userAccountId, true);
      existing.isDeleted = true;
      existing.version += 1;
      existing.updatedAt = now;
      bumpWorkspaceVersion(store, familyId, now);

      res.status(200).json({ deleted: true, activityId });
    });
  });

  // ============================================================================
  // 6. FAMILY RULES & PRINCIPLES — GOVERNANCE CRUD & ACKNOWLEDGMENTS
  // ============================================================================
  app.post('/api/v1/family-section/:familyId/rules', requireAuth, async (req: Request, res: Response) => {
    const familyId = String(req.params.familyId || '').trim();
    const actor = req.actor!;
    const {
      title,
      category = 'Household Conduct',
      principleStatement = '',
      practicalExpectations = [],
      appliesTo = 'All Family Members',
      ownerMemberId,
    } = req.body || {};

    if (!title || !String(title).trim()) {
      res.status(400).json({ error: 'INVALID_RULE_TITLE', message: 'Rule title is required.' });
      return;
    }

    await withAtomicStoreTransaction(async (store) => {
      const access = resolveServerMembership(store, actor.userAccountId, familyId);
      if (!access.allowed || !access.membership) {
        res.status(access.httpStatus).json({ error: access.errorCode, message: access.errorMessage });
        return;
      }
      if (!canManageMemberships(access.membership.role)) {
        res.status(403).json({
          error: 'PERMISSION_DENIED',
          message: 'Only OWNER or ADMIN roles can create or modify Family Rules & Principles.',
        });
        return;
      }

      const now = Date.now();
      const ruleId = `rule-${now}-${Math.random().toString(36).slice(2, 6)}`;
      const resolvedOwnerId = String(ownerMemberId || access.membership.memberProfileId);
      const ownerMem = (store.familyMembers || []).find((m) => m.id === resolvedOwnerId && m.familyId === familyId);

      const ruleData = {
        id: ruleId,
        familyId,
        title: String(title).trim(),
        category: String(category || 'Household Conduct').trim(),
        principleStatement: String(principleStatement || '').trim(),
        practicalExpectations: Array.isArray(practicalExpectations)
          ? practicalExpectations.map((e) => String(e).trim()).filter(Boolean)
          : [],
        appliesTo: String(appliesTo || 'All Family Members').trim(),
        ownerMemberId: resolvedOwnerId,
        ownerName: ownerMem?.displayName || access.membership.displayName,
        status: 'ACTIVE',
        revisionDate: new Date(now).toISOString().slice(0, 10),
        acknowledgments: [
          {
            memberId: access.membership.memberProfileId,
            displayName: access.membership.displayName,
            acknowledgedAt: now,
          },
        ],
        createdByUserId: actor.userAccountId,
        createdAt: now,
        updatedAt: now,
      };

      store.synchronizedEntities = store.synchronizedEntities || {};
      const record: SynchronizedEntityRecord = {
        id: ruleId,
        familyId,
        entityType: 'FAMILY_RULE',
        version: 1,
        isDeleted: false,
        updatedAt: now,
        updatedByUserId: actor.userAccountId,
        data: ruleData,
      };
      store.synchronizedEntities[`FAMILY_RULE:${ruleId}`] = record;
      bumpWorkspaceVersion(store, familyId, now);
      void mirrorEntityToFirestore(record);

      res.status(201).json({ rule: ruleData });
    });
  });

  app.put('/api/v1/family-section/:familyId/rules/:ruleId', requireAuth, async (req: Request, res: Response) => {
    const familyId = String(req.params.familyId || '').trim();
    const ruleId = String(req.params.ruleId || '').trim();
    const actor = req.actor!;

    await withAtomicStoreTransaction(async (store) => {
      const access = resolveServerMembership(store, actor.userAccountId, familyId);
      if (!access.allowed || !access.membership) {
        res.status(access.httpStatus).json({ error: access.errorCode, message: access.errorMessage });
        return;
      }
      if (!canManageMemberships(access.membership.role)) {
        res.status(403).json({
          error: 'PERMISSION_DENIED',
          message: 'Only OWNER or ADMIN roles can edit or archive Family Rules & Principles.',
        });
        return;
      }

      const key = `FAMILY_RULE:${ruleId}`;
      const existing = store.synchronizedEntities?.[key];
      if (!existing || existing.familyId !== familyId || existing.isDeleted) {
        res.status(404).json({ error: 'RULE_NOT_FOUND', message: 'Rule not found.' });
        return;
      }

      const now = Date.now();
      const inc = req.body || {};
      const updatedData = {
        ...existing.data,
        title: inc.title !== undefined ? String(inc.title).trim() : existing.data.title,
        category: inc.category !== undefined ? String(inc.category).trim() : existing.data.category,
        principleStatement:
          inc.principleStatement !== undefined
            ? String(inc.principleStatement).trim()
            : existing.data.principleStatement,
        practicalExpectations: Array.isArray(inc.practicalExpectations)
          ? inc.practicalExpectations.map((e: any) => String(e).trim()).filter(Boolean)
          : existing.data.practicalExpectations,
        appliesTo: inc.appliesTo !== undefined ? String(inc.appliesTo).trim() : existing.data.appliesTo,
        status: inc.status !== undefined ? String(inc.status).toUpperCase() : existing.data.status,
        revisionDate: new Date(now).toISOString().slice(0, 10),
        updatedAt: now,
      };

      existing.version += 1;
      existing.updatedAt = now;
      existing.updatedByUserId = actor.userAccountId;
      existing.data = updatedData;
      bumpWorkspaceVersion(store, familyId, now);

      res.status(200).json({ rule: updatedData });
    });
  });

  app.post('/api/v1/family-section/:familyId/rules/:ruleId/acknowledge', requireAuth, async (req: Request, res: Response) => {
    const familyId = String(req.params.familyId || '').trim();
    const ruleId = String(req.params.ruleId || '').trim();
    const actor = req.actor!;

    await withAtomicStoreTransaction(async (store) => {
      const access = resolveServerMembership(store, actor.userAccountId, familyId);
      if (!access.allowed || !access.membership) {
        res.status(access.httpStatus).json({ error: access.errorCode, message: access.errorMessage });
        return;
      }

      const key = `FAMILY_RULE:${ruleId}`;
      const existing = store.synchronizedEntities?.[key];
      if (!existing || existing.familyId !== familyId || existing.isDeleted) {
        res.status(404).json({ error: 'RULE_NOT_FOUND', message: 'Rule not found.' });
        return;
      }

      const now = Date.now();
      const acks = Array.isArray(existing.data.acknowledgments) ? [...existing.data.acknowledgments] : [];
      const idx = acks.findIndex((a: any) => a.memberId === access.membership!.memberProfileId);
      const entry = {
        memberId: access.membership.memberProfileId,
        displayName: access.membership.displayName,
        acknowledgedAt: now,
      };
      if (idx >= 0) {
        acks[idx] = entry;
      } else {
        acks.push(entry);
      }

      existing.data.acknowledgments = acks;
      existing.data.updatedAt = now;
      existing.version += 1;
      existing.updatedAt = now;
      bumpWorkspaceVersion(store, familyId, now);

      res.status(200).json({ rule: existing.data });
    });
  });

  app.delete('/api/v1/family-section/:familyId/rules/:ruleId', requireAuth, async (req: Request, res: Response) => {
    const familyId = String(req.params.familyId || '').trim();
    const ruleId = String(req.params.ruleId || '').trim();
    const actor = req.actor!;

    await withAtomicStoreTransaction(async (store) => {
      const access = resolveServerMembership(store, actor.userAccountId, familyId);
      if (!access.allowed || !access.membership) {
        res.status(access.httpStatus).json({ error: access.errorCode, message: access.errorMessage });
        return;
      }
      if (!canManageMemberships(access.membership.role)) {
        res.status(403).json({ error: 'PERMISSION_DENIED', message: 'Only OWNER or ADMIN can delete family rules.' });
        return;
      }

      const key = `FAMILY_RULE:${ruleId}`;
      const existing = store.synchronizedEntities?.[key];
      if (!existing || existing.familyId !== familyId || existing.isDeleted) {
        res.status(404).json({ error: 'RULE_NOT_FOUND', message: 'Rule not found.' });
        return;
      }

      const now = Date.now();
      existing.isDeleted = true;
      existing.version += 1;
      existing.updatedAt = now;
      bumpWorkspaceVersion(store, familyId, now);

      res.status(200).json({ deleted: true, ruleId });
    });
  });

  // ============================================================================
  // 6B. EXTENDED FAMILY HERITAGE MAP & RELATIVE RECOGNITION CRUD + GROWTH LEDGER
  // ============================================================================
  app.post('/api/v1/family-section/:familyId/extended-relatives', requireAuth, async (req: Request, res: Response) => {
    const familyId = String(req.params.familyId || '').trim();
    const actor = req.actor!;
    const {
      fullName,
      preferredTitle = '',
      lineageSide = 'PATERNAL',
      generationTier = 'PARENTS_AUNTS_UNCLES',
      relationshipToChildren = 'Extended Relative',
      birthYear,
      age,
      occupation = '',
      workplaceOrSpecialty = '',
      city = '',
      country = '',
      regionTag = 'North America',
      mapCoordinates,
      avatarUrl = '',
      bioAndHeritageStory = '',
      sharedInterests = [],
      conversationStarters = [],
      growthAreas = [],
    } = req.body || {};

    if (!fullName || !String(fullName).trim()) {
      res.status(400).json({ error: 'INVALID_RELATIVE_NAME', message: 'Full name is required.' });
      return;
    }

    await withAtomicStoreTransaction(async (store) => {
      const access = resolveServerMembership(store, actor.userAccountId, familyId);
      if (!access.allowed || !access.membership) {
        res.status(access.httpStatus).json({ error: access.errorCode, message: access.errorMessage });
        return;
      }
      if (access.membership.role === 'GUEST') {
        res.status(403).json({ error: 'PERMISSION_DENIED', message: 'GUEST role cannot add extended family profiles.' });
        return;
      }

      const now = Date.now();
      const currentYear = new Date().getFullYear();
      const relId = `rel-ext-${now}-${Math.random().toString(36).slice(2, 6)}`;
      const cleanName = String(fullName).trim();
      const initials = cleanName
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      const resolvedSide = ['PATERNAL', 'MATERNAL', 'CORE_HOUSEHOLD'].includes(String(lineageSide).toUpperCase())
        ? String(lineageSide).toUpperCase()
        : 'PATERNAL';
      const resolvedTier = ['ELDERS_GRANDPARENTS', 'PARENTS_AUNTS_UNCLES', 'CHILDREN_COUSINS'].includes(
        String(generationTier).toUpperCase()
      )
        ? String(generationTier).toUpperCase()
        : 'PARENTS_AUNTS_UNCLES';

      const parsedAge = age !== undefined && Number(age) > 0 ? Math.round(Number(age)) : 40;
      const parsedBirthYear =
        birthYear !== undefined && Number(birthYear) > 1900
          ? Math.round(Number(birthYear))
          : currentYear - parsedAge;
      const finalAge = currentYear - parsedBirthYear;

      const defaultCoords =
        mapCoordinates && typeof mapCoordinates.xPercent === 'number' && typeof mapCoordinates.yPercent === 'number'
          ? {
              xPercent: Math.min(92, Math.max(8, Number(mapCoordinates.xPercent))),
              yPercent: Math.min(88, Math.max(12, Number(mapCoordinates.yPercent))),
            }
          : resolvedSide === 'PATERNAL'
          ? { xPercent: 46 + (now % 9), yPercent: 30 + (now % 12) }
          : { xPercent: 26 + (now % 9), yPercent: 34 + (now % 12) };

      const resolvedAvatar =
        avatarUrl && String(avatarUrl).trim()
          ? String(avatarUrl).trim()
          : createRelativePortraitSvgDataUrl({
              initials,
              bgHex: resolvedSide === 'PATERNAL' ? '#25443B' : '#173D35',
              ringHex: resolvedSide === 'PATERNAL' ? '#C39A60' : '#2E6F5E',
              skinHex: '#D9A987',
              hairHex: resolvedTier === 'ELDERS_GRANDPARENTS' ? '#D6D3D1' : '#292524',
              shirtHex: resolvedSide === 'PATERNAL' ? '#1E3A8A' : '#0F766E',
              hasGlasses: resolvedTier === 'ELDERS_GRANDPARENTS',
              hasBeard: false,
            });

      const relativeData = {
        id: relId,
        familyId,
        fullName: cleanName,
        preferredTitle: String(preferredTitle || cleanName).trim(),
        lineageSide: resolvedSide,
        generationTier: resolvedTier,
        relationshipToChildren: String(relationshipToChildren || 'Extended Relative').trim(),
        birthYear: parsedBirthYear,
        age: finalAge,
        occupation: String(occupation || 'Family Steward & Mentor').trim(),
        workplaceOrSpecialty: String(workplaceOrSpecialty || '').trim(),
        city: String(city || 'Hometown').trim(),
        country: String(country || '').trim(),
        regionTag: String(regionTag || 'Family Region').trim(),
        mapCoordinates: defaultCoords,
        avatarUrl: resolvedAvatar,
        bioAndHeritageStory: String(bioAndHeritageStory || '').trim(),
        sharedInterests: Array.isArray(sharedInterests)
          ? sharedInterests.map((s) => String(s).trim()).filter(Boolean)
          : [],
        conversationStarters: Array.isArray(conversationStarters)
          ? conversationStarters.map((s) => String(s).trim()).filter(Boolean)
          : [],
        growthAreas: Array.isArray(growthAreas)
          ? growthAreas.map((g: any, idx: number) => ({
              id: String(g.id || `gr-${now}-${idx}`),
              title: String(g.title || '').trim(),
              category: String(g.category || 'FAMILY_BOND').toUpperCase(),
              description: String(g.description || '').trim(),
              howKidsCanSupport: String(g.howKidsCanSupport || '').trim(),
              status: String(g.status || 'ACTIVE_SUPPORT').toUpperCase(),
              addedByName: access.membership!.displayName,
              createdAt: now,
            }))
          : [],
        encouragementNotes: [],
        createdByUserId: actor.userAccountId,
        createdAt: now,
        updatedAt: now,
      };

      store.synchronizedEntities = store.synchronizedEntities || {};
      const record: SynchronizedEntityRecord = {
        id: relId,
        familyId,
        entityType: 'FAMILY_EXTENDED_RELATIVE',
        version: 1,
        isDeleted: false,
        updatedAt: now,
        updatedByUserId: actor.userAccountId,
        data: relativeData,
      };
      store.synchronizedEntities[`FAMILY_EXTENDED_RELATIVE:${relId}`] = record;
      bumpWorkspaceVersion(store, familyId, now);
      void mirrorEntityToFirestore(record);

      res.status(201).json({ relative: relativeData });
    });
  });

  app.put('/api/v1/family-section/:familyId/extended-relatives/:relativeId', requireAuth, async (req: Request, res: Response) => {
    const familyId = String(req.params.familyId || '').trim();
    const relativeId = String(req.params.relativeId || '').trim();
    const actor = req.actor!;

    await withAtomicStoreTransaction(async (store) => {
      const access = resolveServerMembership(store, actor.userAccountId, familyId);
      if (!access.allowed || !access.membership) {
        res.status(access.httpStatus).json({ error: access.errorCode, message: access.errorMessage });
        return;
      }
      if (access.membership.role === 'GUEST') {
        res.status(403).json({ error: 'PERMISSION_DENIED', message: 'GUEST role cannot edit extended family profiles.' });
        return;
      }

      const key = `FAMILY_EXTENDED_RELATIVE:${relativeId}`;
      const existing = store.synchronizedEntities?.[key];
      if (!existing || existing.familyId !== familyId || existing.isDeleted) {
        res.status(404).json({ error: 'RELATIVE_NOT_FOUND', message: 'Extended relative profile not found.' });
        return;
      }

      const now = Date.now();
      const currentYear = new Date().getFullYear();
      const inc = req.body || {};

      const nextBirthYear =
        inc.birthYear !== undefined
          ? Math.round(Number(inc.birthYear))
          : inc.age !== undefined
          ? currentYear - Math.round(Number(inc.age))
          : existing.data.birthYear;
      const nextAge = currentYear - Number(nextBirthYear || currentYear - 40);

      const updatedData = {
        ...existing.data,
        fullName: inc.fullName !== undefined ? String(inc.fullName).trim() : existing.data.fullName,
        preferredTitle: inc.preferredTitle !== undefined ? String(inc.preferredTitle).trim() : existing.data.preferredTitle,
        lineageSide: inc.lineageSide !== undefined ? String(inc.lineageSide).toUpperCase() : existing.data.lineageSide,
        generationTier: inc.generationTier !== undefined ? String(inc.generationTier).toUpperCase() : existing.data.generationTier,
        relationshipToChildren:
          inc.relationshipToChildren !== undefined
            ? String(inc.relationshipToChildren).trim()
            : existing.data.relationshipToChildren,
        birthYear: nextBirthYear,
        age: nextAge,
        occupation: inc.occupation !== undefined ? String(inc.occupation).trim() : existing.data.occupation,
        workplaceOrSpecialty:
          inc.workplaceOrSpecialty !== undefined
            ? String(inc.workplaceOrSpecialty).trim()
            : existing.data.workplaceOrSpecialty,
        city: inc.city !== undefined ? String(inc.city).trim() : existing.data.city,
        country: inc.country !== undefined ? String(inc.country).trim() : existing.data.country,
        regionTag: inc.regionTag !== undefined ? String(inc.regionTag).trim() : existing.data.regionTag,
        mapCoordinates:
          inc.mapCoordinates && typeof inc.mapCoordinates.xPercent === 'number'
            ? inc.mapCoordinates
            : existing.data.mapCoordinates,
        avatarUrl: inc.avatarUrl !== undefined && String(inc.avatarUrl).trim() ? String(inc.avatarUrl).trim() : existing.data.avatarUrl,
        bioAndHeritageStory:
          inc.bioAndHeritageStory !== undefined
            ? String(inc.bioAndHeritageStory).trim()
            : existing.data.bioAndHeritageStory,
        sharedInterests: Array.isArray(inc.sharedInterests)
          ? inc.sharedInterests.map((s: any) => String(s).trim()).filter(Boolean)
          : existing.data.sharedInterests,
        conversationStarters: Array.isArray(inc.conversationStarters)
          ? inc.conversationStarters.map((s: any) => String(s).trim()).filter(Boolean)
          : existing.data.conversationStarters,
        updatedAt: now,
      };

      existing.version += 1;
      existing.updatedAt = now;
      existing.updatedByUserId = actor.userAccountId;
      existing.data = updatedData;
      bumpWorkspaceVersion(store, familyId, now);
      void mirrorEntityToFirestore(existing);

      res.status(200).json({ relative: updatedData });
    });
  });

  app.post('/api/v1/family-section/:familyId/extended-relatives/:relativeId/growth', requireAuth, async (req: Request, res: Response) => {
    const familyId = String(req.params.familyId || '').trim();
    const relativeId = String(req.params.relativeId || '').trim();
    const actor = req.actor!;
    const {
      action = 'ADD_GROWTH_AREA',
      title = '',
      category = 'EDUCATION_MENTORSHIP',
      description = '',
      howKidsCanSupport = '',
      status = 'ACTIVE_SUPPORT',
      growthAreaId = '',
      message = '',
    } = req.body || {};

    await withAtomicStoreTransaction(async (store) => {
      const access = resolveServerMembership(store, actor.userAccountId, familyId);
      if (!access.allowed || !access.membership) {
        res.status(access.httpStatus).json({ error: access.errorCode, message: access.errorMessage });
        return;
      }
      if (access.membership.role === 'GUEST') {
        res.status(403).json({
          error: 'PERMISSION_DENIED',
          message: 'GUEST role cannot modify growth areas or encouragement notes.',
        });
        return;
      }

      const key = `FAMILY_EXTENDED_RELATIVE:${relativeId}`;
      const existing = store.synchronizedEntities?.[key];
      if (!existing || existing.familyId !== familyId || existing.isDeleted) {
        res.status(404).json({ error: 'RELATIVE_NOT_FOUND', message: 'Extended relative profile not found.' });
        return;
      }

      const now = Date.now();
      const actionUpper = String(action).toUpperCase();
      const growthAreas = Array.isArray(existing.data.growthAreas) ? [...existing.data.growthAreas] : [];
      const encouragementNotes = Array.isArray(existing.data.encouragementNotes)
        ? [...existing.data.encouragementNotes]
        : [];

      if (actionUpper === 'ADD_GROWTH_AREA') {
        if (!String(title).trim()) {
          res.status(400).json({ error: 'INVALID_GROWTH_TITLE', message: 'Growth area title is required.' });
          return;
        }
        growthAreas.unshift({
          id: `gr-${now}-${Math.random().toString(36).slice(2, 5)}`,
          title: String(title).trim(),
          category: String(category || 'EDUCATION_MENTORSHIP').toUpperCase(),
          description: String(description || '').trim(),
          howKidsCanSupport: String(howKidsCanSupport || '').trim(),
          status: ['EXPLORING', 'ACTIVE_SUPPORT', 'CELEBRATED'].includes(String(status).toUpperCase())
            ? String(status).toUpperCase()
            : 'ACTIVE_SUPPORT',
          addedByName: access.membership.displayName,
          addedByRole: access.membership.role,
          createdAt: now,
        });
      } else if (actionUpper === 'UPDATE_GROWTH_STATUS') {
        const target = growthAreas.find((g: any) => g.id === String(growthAreaId));
        if (!target) {
          res.status(404).json({ error: 'GROWTH_AREA_NOT_FOUND', message: 'Growth area not found.' });
          return;
        }
        target.status = ['EXPLORING', 'ACTIVE_SUPPORT', 'CELEBRATED'].includes(String(status).toUpperCase())
          ? String(status).toUpperCase()
          : 'CELEBRATED';
      } else if (actionUpper === 'ADD_ENCOURAGEMENT_NOTE') {
        if (!String(message).trim()) {
          res.status(400).json({ error: 'INVALID_NOTE_MESSAGE', message: 'Encouragement message is required.' });
          return;
        }
        encouragementNotes.unshift({
          id: `enc-${now}-${Math.random().toString(36).slice(2, 5)}`,
          authorName: access.membership.displayName,
          authorRole: access.membership.role,
          message: String(message).trim(),
          createdAt: now,
        });
      }

      existing.data = {
        ...existing.data,
        growthAreas,
        encouragementNotes,
        updatedAt: now,
      };
      existing.version += 1;
      existing.updatedAt = now;
      existing.updatedByUserId = actor.userAccountId;
      bumpWorkspaceVersion(store, familyId, now);
      void mirrorEntityToFirestore(existing);

      res.status(200).json({ relative: existing.data });
    });
  });

  app.delete('/api/v1/family-section/:familyId/extended-relatives/:relativeId', requireAuth, async (req: Request, res: Response) => {
    const familyId = String(req.params.familyId || '').trim();
    const relativeId = String(req.params.relativeId || '').trim();
    const actor = req.actor!;

    await withAtomicStoreTransaction(async (store) => {
      const access = resolveServerMembership(store, actor.userAccountId, familyId);
      if (!access.allowed || !access.membership) {
        res.status(access.httpStatus).json({ error: access.errorCode, message: access.errorMessage });
        return;
      }
      if (!canManageMemberships(access.membership.role)) {
        res.status(403).json({
          error: 'PERMISSION_DENIED',
          message: 'Only OWNER or ADMIN can remove extended family profiles.',
        });
        return;
      }

      const key = `FAMILY_EXTENDED_RELATIVE:${relativeId}`;
      const existing = store.synchronizedEntities?.[key];
      if (!existing || existing.familyId !== familyId || existing.isDeleted) {
        res.status(404).json({ error: 'RELATIVE_NOT_FOUND', message: 'Extended relative profile not found.' });
        return;
      }

      const now = Date.now();
      existing.isDeleted = true;
      existing.version += 1;
      existing.updatedAt = now;
      bumpWorkspaceVersion(store, familyId, now);

      res.status(200).json({ deleted: true, relativeId });
    });
  });

  // ============================================================================
  // 7. GET /api/v1/home-dashboards/:familyId — Live Aggregated Data for All 7 Home Dashboards
  // ============================================================================
  app.get('/api/v1/home-dashboards/:familyId', requireAuth, (req: Request, res: Response) => {
    try {
    const familyId = String(req.params.familyId || '').trim();
    const store = loadStore();
    const actor = req.actor!;

    const access = resolveServerMembership(store, actor.userAccountId, familyId);
    if (!access.allowed || !access.membership) {
      res.status(access.httpStatus).json({ error: access.errorCode, message: access.errorMessage });
      return;
    }

    const caller = access.membership;
    const isFinanceAuthorized = canPerformFinanceMutation(caller.role);
    const isCoupleAuthorized = canAccessCoupleEnclave(caller.role);

    ensureFamilySectionSeedData(store, familyId);
    seedDefaultCalendarAndRoutines(store, familyId);
    recalculatePlanningHierarchyProgress(store, familyId);

    const ws = store.workspaces?.[familyId] || (store.workspace?.id === familyId ? store.workspace : store.workspace);
    const rawMembers = (store.familyMembers || []).filter((m) => m.familyId === familyId && !m.isDeleted);
    const members = rawMembers.map((m) => sanitizeMemberForCaller(store, caller, m));

    // 1. Finance Engine Snapshot
    const finStore = getFinanceStore(familyId);
    let financeSummary: Record<string, any> = {
      authorized: isFinanceAuthorized,
      netWorthCents: 0,
      availableCashCents: 0,
      totalAssetsCents: 0,
      totalLiabilitiesCents: 0,
      monthlyIncomeCents: 0,
      monthlyExpensesCents: 0,
      monthlySurplusCents: 0,
      accounts: [],
      budgets: [],
      savingsGoals: [],
      recurringRules: [],
      investments: [],
      recentTransactions: [],
      alerts: [],
    };

    if (isFinanceAuthorized) {
      const accounts = (store.accounts || []).filter((a) => a.familyId === familyId && !(a as any).isArchived);
      let assetsCents = 0;
      let liabilitiesCents = 0;
      let cashCents = 0;
      for (const acc of accounts) {
        const bal = Number((acc as any).balanceCents ?? (acc as any).currentBalanceCents ?? 0);
        const typeUpper = String((acc as any).type || (acc as any).accountType || 'CHECKING').toUpperCase();
        const isLiab = Boolean((acc as any).isLiability) || ['CREDIT_CARD', 'LOAN', 'MORTGAGE', 'LIABILITY'].includes(typeUpper) || bal < 0;
        if (isLiab) {
          liabilitiesCents += Math.abs(bal);
        } else {
          assetsCents += bal;
          if (['CHECKING', 'SAVINGS', 'CASH'].includes(typeUpper)) {
            cashCents += bal;
          }
        }
      }
      const investments = Array.from(finStore.investmentHoldings.values()).filter((i) => !i.isDeleted);
      for (const inv of investments) {
        const val = Number(inv.currentValuationCents ?? Math.round((Number(inv.quantityMicroshares || 0) / 1_000_000) * Number(inv.currentPriceCents || 0)));
        assetsCents += val;
      }

      const transactions = (store.transactions || [])
        .filter((t) => t.familyId === familyId && !(t as any).isDeleted)
        .sort((a: any, b: any) => Number(b.timestamp || b.transactionDate || 0) - Number(a.timestamp || a.transactionDate || 0));

      let monthlyIncomeCents = 0;
      let monthlyExpensesCents = 0;
      for (const tx of transactions) {
        if ((tx as any).isReversal) continue;
        const txType = String((tx as any).type || (tx as any).transactionType || '').toUpperCase();
        // Strictly exclude TRANSFER from income/expense totals
        if (txType === 'INCOME') {
          monthlyIncomeCents += Math.abs(Number(tx.amountCents || 0));
        } else if (txType === 'EXPENSE') {
          monthlyExpensesCents += Math.abs(Number(tx.amountCents || 0));
        }
      }

      const budgets = (store.budgets || []).filter((b) => b.familyId === familyId);
      const savingsGoals = Array.from(finStore.savingsGoals.values());
      const recurringRules = Array.from(finStore.recurringRules.values()).filter((r) => r.isActive);

      const alerts: Array<{ id: string; severity: 'HIGH' | 'MEDIUM' | 'INFO'; title: string; detail: string }> = [];
      for (const b of budgets) {
        const alloc = Number((b as any).limitCents ?? (b as any).allocatedCents ?? 0);
        const spent = Number(b.spentCents || 0);
        const pct = alloc > 0 ? Math.round((spent / alloc) * 100) : 0;
        if (pct >= 100) {
          alerts.push({
            id: `fin-alert-over-${b.id}`,
            severity: 'HIGH',
            title: `${b.category} Budget Exceeded (${pct}%)`,
            detail: `Spent $${(spent / 100).toFixed(2)} of $${(alloc / 100).toFixed(2)} allocation.`,
          });
        } else if (pct >= ((b as any).alertThresholdPercentage || 85)) {
          alerts.push({
            id: `fin-alert-warn-${b.id}`,
            severity: 'MEDIUM',
            title: `${b.category} Approaching Limit (${pct}%)`,
            detail: `$${((alloc - spent) / 100).toFixed(2)} remaining this month.`,
          });
        }
      }

      financeSummary = {
        authorized: true,
        netWorthCents: assetsCents - liabilitiesCents,
        availableCashCents: cashCents,
        totalAssetsCents: assetsCents,
        totalLiabilitiesCents: liabilitiesCents,
        monthlyIncomeCents,
        monthlyExpensesCents,
        monthlySurplusCents: monthlyIncomeCents - monthlyExpensesCents,
        accounts: accounts.map((a: any) => ({
          ...a,
          accountType: a.accountType || a.type || 'CHECKING',
          currentBalanceCents: Number(a.currentBalanceCents ?? a.balanceCents ?? 0),
        })),
        budgets: budgets.map((b: any) => ({
          ...b,
          allocatedCents: Number(b.allocatedCents ?? b.limitCents ?? 0),
          spentCents: Number(b.spentCents ?? 0),
        })),
        savingsGoals,
        recurringRules,
        investments,
        recentTransactions: transactions.slice(0, 8).map((t: any) => ({
          ...t,
          transactionType: t.transactionType || t.type || 'EXPENSE',
          transactionDate: Number(t.transactionDate || t.timestamp || Date.now()),
        })),
        alerts,
      };
    }

    // 2. Household Engine Snapshot
    const hhStore = getHouseholdStore(familyId);
    const meals = Array.from(hhStore.meals.values()).sort((a, b) => a.planDate - b.planDate);
    const recipes = Array.from(hhStore.recipes.values());
    const chores = Array.from(hhStore.chores.values());
    const pantry = Array.from(hhStore.pantry.values()).map((p) => ({
      ...p,
      expiryStatus: computePantryExpiryStatus(p.expiryDate),
    }));
    const groceries = Array.from(hhStore.groceries.values());
    const wardrobe = Array.from(hhStore.wardrobe.values());
    const outfits = Array.from(hhStore.outfits.values());
    const assets = Array.from(hhStore.assets.values());

    // 3. Goals, Projects & Tasks Snapshot
    const visibleGoals = (store.goals || [])
      .filter((g) => canViewGoal(store, caller, g) && !g.isDeleted)
      .map((g) => {
        if (!isFinanceAuthorized) {
          const copy = { ...g };
          delete copy.budgetCents;
          delete copy.currentCents;
          return copy;
        }
        return g;
      });
    const visibleProjects = (store.projects || []).filter((p) => canViewProject(store, caller, p) && !p.isDeleted);
    const visibleTasks = (store.planningTasks || store.tasks || []).filter((t) => canViewTask(store, caller, t) && !t.isDeleted);
    const visibleMilestones = (store.milestones || []).filter((m) => m.familyId === familyId && !m.isDeleted);
    const visibleChecklists = ((store as any).checklistItems || []).filter((c: any) => c.familyId === familyId && !c.isDeleted);

    // 4. Calendar & Routines Snapshot
    const calendarEvents = (store.calendarEvents || [])
      .filter((e) => e.familyId === familyId && !e.isDeleted)
      .filter((e) => canViewCalendarEvent(store, caller, e))
      .sort((a, b) => (a.eventEpoch || 0) - (b.eventEpoch || 0));

    // 5. Domain Entities (Relationships, Parenting, Life Management, Family Section)
    const domainEntities = Object.values(store.synchronizedEntities || {}).filter(
      (e) => e.familyId === familyId && !e.isDeleted && canCallerReadDomainEntity(store, caller, e)
    );
    const byType = (type: string) =>
      domainEntities
        .filter((e) => e.entityType === type)
        .map((e) => ({ ...e.data, id: e.id, version: e.version, updatedAt: e.updatedAt }));

    const relationshipDashboard = {
      canAccessCoupleEnclave: isCoupleAuthorized,
      checkins: byType('REL_CHECKIN'),
      gratitude: byType('REL_GRATITUDE'),
      couplePlans: isCoupleAuthorized ? byType('REL_COUPLE_PLAN') : [],
      meetings: byType('REL_MEETING'),
      experiences: byType('REL_EXPERIENCE'),
      agreements: byType('REL_AGREEMENT'),
    };

    const parentingDashboard = {
      childProfiles: byType('PAR_CHILD_PROFILE'),
      childRoutines: byType('PAR_CHILD_ROUTINE'),
      studyItems: byType('PAR_STUDY_ITEM'),
      personalGrowthGoals: byType('PAR_PERSONAL_GOAL'),
      lessons: byType('PAR_MICRO_LESSON'),
      habits: byType('PAR_HABIT'),
      familyLearningItems: byType('PAR_FAMILY_LEARNING'),
    };

    const lifeDashboard = {
      personalTasks: byType('LIFE_PERSONAL_TASK'),
      documents: byType('LIFE_DOCUMENT'),
      personalLists: byType('LIFE_PERSONAL_LIST'),
      contacts: byType('LIFE_CONTACT'),
      trips: byType('LIFE_TRAVEL_PLAN'),
      vehicles: byType('LIFE_VEHICLE'),
      longTermPlans: byType('LIFE_LONG_TERM_PLAN'),
      emergencySupplies: byType('EMERGENCY_SUPPLY'),
    };

    // Upcoming birthdays & anniversaries from member profiles
    const upcomingCelebrations: Array<{ id: string; memberName: string; label: string; dateIso: string; category: string }> = [];
    for (const m of members) {
      if (m.birthDate) {
        upcomingCelebrations.push({
          id: `bday-${m.id}`,
          memberName: m.displayName,
          label: `${m.displayName}'s Birthday`,
          dateIso: m.birthDate,
          category: 'BIRTHDAY',
        });
      }
      for (const dt of m.importantDates || []) {
        upcomingCelebrations.push({
          id: dt.id || `dt-${m.id}-${dt.label}`,
          memberName: m.displayName,
          label: dt.label,
          dateIso: dt.dateIso || (dt as any).date || '',
          category: dt.category || 'MILESTONE',
        });
      }
    }

    res.status(200).json({
      familyId,
      caller: {
        userAccountId: caller.userAccountId,
        memberProfileId: caller.memberProfileId,
        displayName: caller.displayName,
        role: caller.role,
      },
      workspace: {
        id: ws.id,
        name: ws.name,
        motto: ws.motto || 'Together in Stewardship',
        mission: ws.mission || '',
        vision: ws.vision || '',
        values: ws.values || [],
        currencyCode: ws.currencyCode || 'USD',
        announcements: ws.announcements || [],
        reminders: ws.reminders || [],
      },
      members,
      financeDashboard: financeSummary,
      householdDashboard: {
        meals,
        recipes,
        chores,
        pantry,
        groceries,
        wardrobe,
        outfits,
        assets,
      },
      goalsDashboard: {
        goals: visibleGoals,
        projects: visibleProjects,
        tasks: visibleTasks,
        milestones: visibleMilestones,
        checklistItems: visibleChecklists,
      },
      calendarEvents,
      relationshipDashboard,
      parentingDashboard,
      lifeDashboard,
      upcomingCelebrations,
      sharedActivities: byType('FAMILY_SHARED_ACTIVITY'),
    });
    } catch (err: any) {
      console.error('HOME_DASHBOARDS_ERR:', err);
      res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message, stack: err?.stack });
    }
  });
}
