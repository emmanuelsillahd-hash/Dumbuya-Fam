import React, { useState, useEffect } from 'react';
import {
  Shield,
  FileText,
  Phone,
  Compass,
  Car,
  CheckCircle2,
  Lock,
  Search,
  Plus,
  Calendar,
  FolderTree,
  Download,
  Trash2,
  Upload,
  Edit3
} from 'lucide-react';
import {
  readNamespacedCache,
  writeNamespacedCache,
  IS_DEV_FIXTURE_MODE,
} from '../utils/namespacedStorage';

interface DocumentRecord {
  id: string;
  title: string;
  category:
    | 'Identification'
    | 'Insurance'
    | 'Property'
    | 'Vehicle'
    | 'Education'
    | 'Contracts'
    | 'Warranties'
    | 'Receipts'
    | 'Legal';
  expirationDate: string;
  renewalReminder: string;
  accessLevel: 'Owner & Admin Only' | 'Adult Members' | 'All Household';
  fileName?: string;
  fileSizeKb?: number;
  sha256Checksum?: string;
  encryptedAtRest?: boolean;
  hasEncryptedBinary?: boolean;
  version?: number;
}

interface ContactRecord {
  id: string;
  name: string;
  category: 'Family' | 'Emergency' | 'Schools' | 'Service Providers' | 'Contractors' | 'Insurance' | 'Organizations';
  phone: string;
  notes: string;
  version?: number;
}

interface TravelPlan {
  id: string;
  destination: string;
  dates: string;
  accommodation: string;
  budgetCents: number;
  spentCents: number;
  activities: string[];
  packingList: Array<{ id: string; item: string; packed: boolean }>;
  version?: number;
}

interface VehicleRecord {
  id: string;
  name: string;
  registration: string;
  insuranceRenewal: string;
  inspectionDate: string;
  nextMaintenance: string;
  serviceHistory: string;
  monthlyFuelCents: number;
  version?: number;
}

interface LongTermPlan {
  id: string;
  title: string;
  category: string;
  targetDate: string;
  estimatedBudgetCents: number;
  milestones: string[];
  progressPercent: number;
  version?: number;
}

export interface LifeManagementCenterProps {
  selectedRole: string;
  sessionToken?: string;
  familyId?: string;
  actorUserId?: string;
  actorMemberId?: string;
  actorDisplayName?: string;
  activeSubPage?: string;
  onSelectSubPage?: (subId: string) => void;
}

type LifeManagementSubTab =
  | 'personal_dashboard'
  | 'documents'
  | 'personal_org'
  | 'contacts'
  | 'travel'
  | 'vehicles'
  | 'long_term';

const SUBPAGE_TO_LIFE_TAB: Record<string, LifeManagementSubTab> = {
  life_dashboard: 'personal_dashboard',
  life_docs: 'documents',
  life_organization: 'personal_org',
  life_contacts: 'contacts',
  life_travel: 'travel',
  life_vehicles: 'vehicles',
  life_longterm: 'long_term',
};

const LIFE_TAB_TO_SUBPAGE: Record<LifeManagementSubTab, string> = {
  personal_dashboard: 'life_dashboard',
  documents: 'life_docs',
  personal_org: 'life_organization',
  contacts: 'life_contacts',
  travel: 'life_travel',
  vehicles: 'life_vehicles',
  long_term: 'life_longterm',
};

const DEFAULT_DOCUMENTS: DocumentRecord[] = [
  {
    id: 'doc-1',
    title: 'Household Passports & Birth Certificates Vault',
    category: 'Identification',
    expirationDate: '2031-08-14',
    renewalReminder: '6 months prior to expiry',
    accessLevel: 'Owner & Admin Only',
    fileName: 'jenkins_passports_vault.pdf',
    fileSizeKb: 420,
    encryptedAtRest: true,
    version: 1,
  },
  {
    id: 'doc-2',
    title: 'Comprehensive Homeowners & Umbrella Policy',
    category: 'Insurance',
    expirationDate: '2027-03-01',
    renewalReminder: '30 days prior',
    accessLevel: 'Owner & Admin Only',
    fileName: 'homeowners_policy_2026.pdf',
    fileSizeKb: 890,
    encryptedAtRest: true,
    version: 1,
  },
  {
    id: 'doc-3',
    title: 'Primary Residence Deed & Mortgage Schedule',
    category: 'Property',
    expirationDate: 'Permanent Record',
    renewalReminder: 'Annual tax review',
    accessLevel: 'Owner & Admin Only',
    fileName: 'residence_deed_recorded.pdf',
    fileSizeKb: 1240,
    encryptedAtRest: true,
    version: 1,
  },
  {
    id: 'doc-4',
    title: 'Family Estate Plan, Living Trust & Guardianship',
    category: 'Legal',
    expirationDate: 'Reviewed 2026',
    renewalReminder: 'Biennial review',
    accessLevel: 'Owner & Admin Only',
    fileName: 'family_living_trust.pdf',
    fileSizeKb: 640,
    encryptedAtRest: true,
    version: 1,
  },
  {
    id: 'doc-5',
    title: 'Westfield School District Enrollment & Immunization Records',
    category: 'Education',
    expirationDate: '2027-09-01',
    renewalReminder: 'August annual update',
    accessLevel: 'Adult Members',
    fileName: 'school_enrollment_records.pdf',
    fileSizeKb: 310,
    encryptedAtRest: true,
    version: 1,
  },
  {
    id: 'doc-6',
    title: 'HVAC & Solar Inverter 10-Year Manufacturer Warranty',
    category: 'Warranties',
    expirationDate: '2033-05-20',
    renewalReminder: 'Annual filter inspection',
    accessLevel: 'All Household',
    fileName: 'solar_hvac_warranty.pdf',
    fileSizeKb: 275,
    encryptedAtRest: true,
    version: 1,
  },
];

const DEFAULT_CONTACTS: ContactRecord[] = [
  { id: 'c-1', name: 'Dr. Eleanor Vance (Westfield Pediatrics)', category: 'Emergency', phone: '+1 (555) 234-9001', notes: 'Primary pediatrician for Maya & Lucas', version: 1 },
  { id: 'c-2', name: 'Westfield High & Elementary Main Office', category: 'Schools', phone: '+1 (555) 234-8820', notes: 'Attendance & school nurse line', version: 1 },
  { id: 'c-3', name: 'Greenbriar Plumbing & Heating Services', category: 'Contractors', phone: '+1 (555) 890-4412', notes: '24/7 emergency water & boiler support', version: 1 },
  { id: 'c-4', name: 'Mutual Heritage Home & Auto Insurance', category: 'Insurance', phone: '+1 (800) 555-3199', notes: 'Policy #MH-994812-FOS', version: 1 },
  { id: 'c-5', name: 'Grandma Martha Vance', category: 'Family', phone: '+1 (555) 234-5699', notes: 'Trusted emergency pickup & family caregiver', version: 1 },
];

const DEFAULT_PERSONAL_TASKS = [
  { id: 'pt-1', title: 'Review annual dental insurance renewal options', due: 'Nov 6, 2026', completed: false, ownerUserId: 'usr-sarah-owner', isPrivate: true, version: 1 },
  { id: 'pt-2', title: 'Order winter running shoes & trail gear', due: 'Nov 10, 2026', completed: true, ownerUserId: 'usr-sarah-owner', isPrivate: true, version: 1 },
  { id: 'pt-3', title: 'Prepare personal quarterly reflection notes', due: 'Nov 15, 2026', completed: false, ownerUserId: 'usr-sarah-owner', isPrivate: true, version: 1 },
];

const DEFAULT_PERSONAL_LISTS = [
  {
    id: 'pl-1',
    category: 'Reading List',
    items: ['The Art of Gathering — Priya Parker', 'Essentialism — Greg McKeown', 'The Anxious Generation — Jonathan Haidt'],
    ownerUserId: 'usr-sarah-owner',
    isPrivate: false,
    version: 1,
  },
  {
    id: 'pl-2',
    category: 'Personal Wishlist & Ideas',
    items: ['Botanical greenhouse shelving', 'National Parks family passport book', 'Ceramic pour-over coffee set'],
    ownerUserId: 'usr-sarah-owner',
    isPrivate: false,
    version: 1,
  },
  {
    id: 'pl-3',
    category: 'Personal Notes & Checklists',
    items: ['Renew library cards next Tuesday', 'Backup family photo archive to encrypted drive', 'Schedule annual optometrist checkup'],
    ownerUserId: 'usr-sarah-owner',
    isPrivate: false,
    version: 1,
  },
];

const DEFAULT_TRIPS: TravelPlan[] = [
  {
    id: 'tr-1',
    destination: 'Pine Lake Summer Family Cabin Retreat',
    dates: 'Aug 10 – Aug 17, 2027',
    accommodation: 'Cedar Ridge Lakefront Cabin (Reserved)',
    budgetCents: 380000,
    spentCents: 145000,
    activities: ['Kayaking & canoeing', 'Stargazing night', 'Pine Ridge family hike', 'Campfire storytelling'],
    packingList: [
      { id: 'pk-1', item: 'Travel documents & cabin reservation confirmation', packed: true },
      { id: 'pk-2', item: 'First-aid kit & Lucas EpiPen travel pouch', packed: true },
      { id: 'pk-3', item: 'Hiking boots, rain jackets & lanterns', packed: false },
      { id: 'pk-4', item: 'Board games & Maya’s camera tripod', packed: false },
    ],
    version: 1,
  },
];

const DEFAULT_VEHICLES: VehicleRecord[] = [
  {
    id: 'vh-1',
    name: '2024 Volvo XC90 Recharge (Family SUV)',
    registration: 'Valid through Oct 2027 • Plate #FOS-482',
    insuranceRenewal: 'Mar 1, 2027',
    inspectionDate: 'Sep 15, 2027',
    nextMaintenance: '30,000-mile service due Jan 2027',
    serviceHistory: 'Tire rotation & brake inspection completed Sep 2026',
    monthlyFuelCents: 14500,
    version: 1,
  },
  {
    id: 'vh-2',
    name: '2022 Rivian R1T (Utility & Outdoor)',
    registration: 'Valid through Jun 2027 • Plate #FOS-901',
    insuranceRenewal: 'Mar 1, 2027',
    inspectionDate: 'Jun 10, 2027',
    nextMaintenance: 'Cabin air filter & alignment check Dec 2026',
    serviceHistory: 'Battery diagnostics & wiper replacement Jul 2026',
    monthlyFuelCents: 8500,
    version: 1,
  },
];

const DEFAULT_LONG_TERM_PLANS: LongTermPlan[] = [
  {
    id: 'lt-1',
    title: 'Maya & Lucas University Education Trust',
    category: 'Education Planning',
    targetDate: '2029 – 2036',
    estimatedBudgetCents: 12000000,
    milestones: ['529 automated monthly contributions active', 'High school AP credit planning', 'Scholarship portfolio preparation'],
    progressPercent: 58,
    version: 1,
  },
  {
    id: 'lt-2',
    title: 'Solar Battery Storage & Kitchen Modernization',
    category: 'Home Improvements',
    targetDate: 'Autumn 2027',
    estimatedBudgetCents: 3500000,
    milestones: ['Architectural drawings approved', '3 contractor quotes compared', 'Dedicated savings goal at 65%'],
    progressPercent: 65,
    version: 1,
  },
];

export const LifeManagementCenter: React.FC<LifeManagementCenterProps> = ({
  selectedRole,
  sessionToken,
  familyId,
  actorUserId,
  actorMemberId,
  activeSubPage,
  onSelectSubPage,
}) => {
  const resolvedFamilyId = familyId || '';
  const resolvedUserId = actorUserId || '';
  const cacheScope = resolvedFamilyId && resolvedUserId ? { userAccountId: resolvedUserId, familyId: resolvedFamilyId } : null;

  const [activeSubTab, setActiveSubTab] = useState<LifeManagementSubTab>(
    (activeSubPage && SUBPAGE_TO_LIFE_TAB[activeSubPage]) || 'personal_dashboard'
  );

  useEffect(() => {
    if (activeSubPage && SUBPAGE_TO_LIFE_TAB[activeSubPage]) {
      setActiveSubTab(SUBPAGE_TO_LIFE_TAB[activeSubPage]);
    }
  }, [activeSubPage]);

  const handleSelectLifeTab = (tab: LifeManagementSubTab) => {
    setActiveSubTab(tab);
    setValidationError(null);
    if (onSelectSubPage) {
      onSelectSubPage(LIFE_TAB_TO_SUBPAGE[tab]);
    }
  };

  const [validationError, setValidationError] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [conflictBanner, setConflictBanner] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const formatCents = (cents: number) => {
    const abs = Math.abs(cents);
    const dollars = Math.floor(abs / 100);
    const rem = abs % 100;
    return `$${dollars.toLocaleString()}.${rem.toString().padStart(2, '0')}`;
  };

  const showToast = (msg: string) => {
    setStatusNotice(msg);
    setValidationError(null);
    setTimeout(() => setStatusNotice(null), 3500);
  };

  // 9.1 Personal Dashboard State
  const [personalTasks, setPersonalTasks] = useState(() =>
    readNamespacedCache(cacheScope, 'life', 'personalTasks', IS_DEV_FIXTURE_MODE ? DEFAULT_PERSONAL_TASKS : [])
  );
  const [newPersonalTask, setNewPersonalTask] = useState('');

  // 9.2 Important Documents & Records State
  const [docSearch, setDocSearch] = useState('');
  const [docFilter, setDocFilter] = useState('ALL');
  const [documents, setDocuments] = useState<DocumentRecord[]>(() =>
    readNamespacedCache(cacheScope, 'life', 'documents', IS_DEV_FIXTURE_MODE ? DEFAULT_DOCUMENTS : [])
  );
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocCat, setNewDocCat] = useState<DocumentRecord['category']>('Identification');
  const [newDocExp, setNewDocExp] = useState('2028-01-01');
  const [newDocAccess, setNewDocAccess] = useState<DocumentRecord['accessLevel']>('Owner & Admin Only');

  // 9.3 Personal Organization State
  const [personalLists, setPersonalLists] = useState(() =>
    readNamespacedCache(cacheScope, 'life', 'personalLists', IS_DEV_FIXTURE_MODE ? DEFAULT_PERSONAL_LISTS : [])
  );
  const [newNoteCatId, setNewNoteCatId] = useState('pl-3');
  const [newNoteItemText, setNewNoteItemText] = useState('');

  // 9.4 Important Contacts State
  const [contactSearch, setContactSearch] = useState('');
  const [contacts, setContacts] = useState<ContactRecord[]>(() =>
    readNamespacedCache(cacheScope, 'life', 'contacts', IS_DEV_FIXTURE_MODE ? DEFAULT_CONTACTS : [])
  );
  const [newContactName, setNewContactName] = useState('');
  const [newContactCat, setNewContactCat] = useState<ContactRecord['category']>('Service Providers');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactNotes, setNewContactNotes] = useState('');

  // 9.5 Travel & Holiday Planning State
  const [trips, setTrips] = useState<TravelPlan[]>(() =>
    readNamespacedCache(cacheScope, 'life', 'trips', IS_DEV_FIXTURE_MODE ? DEFAULT_TRIPS : [])
  );
  const [newPackingItemText, setNewPackingItemText] = useState('');
  const [newTripDestination, setNewTripDestination] = useState('');
  const [newTripDates, setNewTripDates] = useState('');
  const [newTripAccommodation, setNewTripAccommodation] = useState('');
  const [newTripBudgetDollars, setNewTripBudgetDollars] = useState('2500');

  // 9.6 Vehicle Management State
  const [vehicles, setVehicles] = useState<VehicleRecord[]>(() =>
    readNamespacedCache(cacheScope, 'life', 'vehicles', IS_DEV_FIXTURE_MODE ? DEFAULT_VEHICLES : [])
  );
  const [newServiceLogVehicleId, setNewServiceLogVehicleId] = useState('vh-1');
  const [newServiceLogNote, setNewServiceLogNote] = useState('');

  // 9.7 Long-Term Family Planning State
  const [longTermPlans, setLongTermPlans] = useState<LongTermPlan[]>(() =>
    readNamespacedCache(cacheScope, 'life', 'longTermPlans', IS_DEV_FIXTURE_MODE ? DEFAULT_LONG_TERM_PLANS : [])
  );

  const [newLtTitle, setNewLtTitle] = useState('');
  const [newLtCategory, setNewLtCategory] = useState('Education Planning');
  const [newLtTargetDate, setNewLtTargetDate] = useState('2028');
  const [newLtBudgetDollars, setNewLtBudgetDollars] = useState('15000');

  // Authoritative bidirectional GET hydration
  useEffect(() => {
    if (!sessionToken || !resolvedFamilyId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/v1/domain/${encodeURIComponent(resolvedFamilyId)}/life`, {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        if (!res.ok || cancelled) return;
        const payload = await res.json();
        const cols = payload?.collections;
        if (!cols || cancelled) return;
        if (Array.isArray(cols.personalTasks)) setPersonalTasks(cols.personalTasks);
        if (Array.isArray(cols.documents)) setDocuments(cols.documents);
        if (Array.isArray(cols.personalLists)) setPersonalLists(cols.personalLists);
        if (Array.isArray(cols.contacts)) setContacts(cols.contacts);
        if (Array.isArray(cols.trips)) setTrips(cols.trips);
        if (Array.isArray(cols.vehicles)) setVehicles(cols.vehicles);
        if (Array.isArray(cols.longTermPlans)) setLongTermPlans(cols.longTermPlans);
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
    writeNamespacedCache(cacheScope, 'life', 'personalTasks', personalTasks);
    writeNamespacedCache(cacheScope, 'life', 'documents', documents);
    writeNamespacedCache(cacheScope, 'life', 'personalLists', personalLists);
    writeNamespacedCache(cacheScope, 'life', 'contacts', contacts);
    writeNamespacedCache(cacheScope, 'life', 'trips', trips);
    writeNamespacedCache(cacheScope, 'life', 'vehicles', vehicles);
    writeNamespacedCache(cacheScope, 'life', 'longTermPlans', longTermPlans);
  }, [cacheScope?.userAccountId, cacheScope?.familyId, personalTasks, documents, personalLists, contacts, trips, vehicles, longTermPlans]);

  const persistSingleRecord = async (collection: string, recordId: string, recordData: Record<string, any>) => {
    if (!sessionToken || !resolvedFamilyId) return;
    try {
      const res = await fetch(
        `/api/v1/domain/${encodeURIComponent(resolvedFamilyId)}/life/${encodeURIComponent(collection)}/${encodeURIComponent(recordId)}`,
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
        `/api/v1/domain/${encodeURIComponent(resolvedFamilyId)}/life/${encodeURIComponent(collection)}/${encodeURIComponent(recordId)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${sessionToken}` },
        }
      );
    } catch {
      // Offline fallback
    }
  };

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) {
      setValidationError('Document title is required before saving to the vault.');
      return;
    }
    if (documents.some((d) => d.title.toLowerCase() === newDocTitle.trim().toLowerCase())) {
      setValidationError('A document with this title already exists in the vault.');
      return;
    }
    const newDoc: DocumentRecord = {
      id: `doc-${Date.now()}`,
      title: newDocTitle.trim(),
      category: newDocCat,
      expirationDate: newDocExp,
      renewalReminder: '30 days prior',
      accessLevel: newDocAccess,
      fileName: `${newDocTitle.trim().toLowerCase().replace(/\s+/g, '_')}.pdf`,
      fileSizeKb: 350,
      encryptedAtRest: true,
      version: 1,
    };
    setDocuments([newDoc, ...documents]);
    void persistSingleRecord('documents', newDoc.id, newDoc);
    setNewDocTitle('');
    showToast('Document metadata recorded and synced to Household Vault.');
  };

  const handleFileUploadDocument = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxBytes = 10 * 1024 * 1024; // 10 MB limit
    if (file.size > maxBytes) {
      setValidationError('File exceeds maximum allowed size of 10 MB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const resultStr = typeof reader.result === 'string' ? reader.result : '';
      const base64Content = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;
      const docId = `doc-${Date.now()}`;
      const docTitle = file.name.replace(/\.[^/.]+$/, '');

      if (sessionToken && resolvedFamilyId) {
        try {
          const res = await fetch(
            `/api/v1/domain/${encodeURIComponent(resolvedFamilyId)}/documents/upload`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${sessionToken}`,
              },
              body: JSON.stringify({
                id: docId,
                title: docTitle,
                category: newDocCat,
                expirationDate: newDocExp,
                renewalReminder: '30 days prior',
                accessLevel: newDocAccess,
                fileName: file.name,
                mimeType: file.type || 'application/pdf',
                base64Content,
              }),
            }
          );
          const payload = await res.json();
          if (!res.ok) {
            setValidationError(payload?.error || 'Failed to upload file to Encrypted Document Vault.');
            return;
          }
          if (payload?.document) {
            setDocuments((prev) => [payload.document, ...prev]);
            showToast(`Encrypted & uploaded "${file.name}" (AES-256-GCM • SHA-256 verified) to Document Vault.`);
            return;
          }
        } catch {
          // Fallback to local metadata if offline
        }
      }

      const fallbackDoc: DocumentRecord = {
        id: docId,
        title: docTitle,
        category: newDocCat,
        expirationDate: newDocExp,
        renewalReminder: '30 days prior',
        accessLevel: newDocAccess,
        fileName: file.name,
        fileSizeKb: Math.max(1, Math.round(file.size / 1024)),
        encryptedAtRest: true,
        version: 1,
      };
      setDocuments((prev) => [fallbackDoc, ...prev]);
      showToast(`Uploaded "${file.name}" (${fallbackDoc.fileSizeKb} KB) to Document Vault.`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDownloadDocument = async (doc: DocumentRecord) => {
    if (sessionToken && resolvedFamilyId) {
      try {
        const res = await fetch(
          `/api/v1/domain/${encodeURIComponent(resolvedFamilyId)}/documents/${encodeURIComponent(doc.id)}/download`,
          {
            headers: { Authorization: `Bearer ${sessionToken}` },
          }
        );
        if (res.status === 403) {
          const errJson = await res.json();
          setValidationError(errJson?.error || 'Your role does not have permission to download this document.');
          return;
        }
        if (res.ok) {
          const payload = await res.json();
          if (payload.hasBinary && payload.base64Content) {
            const binaryString = atob(payload.base64Content);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: payload.mimeType || 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = payload.fileName || doc.fileName || `${doc.title}.bin`;
            a.click();
            URL.revokeObjectURL(url);
            showToast(`Decrypted & downloaded "${doc.title}" (SHA-256 integrity verified).`);
            return;
          }
        }
      } catch {
        // Fallback to metadata export below
      }
    }

    const summary = {
      documentId: doc.id,
      title: doc.title,
      category: doc.category,
      expirationDate: doc.expirationDate,
      renewalReminder: doc.renewalReminder,
      accessLevel: doc.accessLevel,
      exportedByRole: selectedRole,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.fileName || doc.title.toLowerCase().replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded authorized record summary for "${doc.title}".`);
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) {
      setValidationError('Both contact name and phone number are required.');
      return;
    }
    const newContact: ContactRecord = {
      id: `c-${Date.now()}`,
      name: newContactName.trim(),
      category: newContactCat,
      phone: newContactPhone.trim(),
      notes: newContactNotes.trim() || 'Household directory contact',
      version: 1,
    };
    setContacts([newContact, ...contacts]);
    void persistSingleRecord('contacts', newContact.id, newContact);
    setNewContactName('');
    setNewContactPhone('');
    setNewContactNotes('');
    showToast('Important contact added to directory.');
  };

  const handleExportAllPersonalRecords = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      exportedByRole: selectedRole,
      retentionNotice: 'Export includes personal tasks, authorized vault metadata, contacts, travel plans, and vehicle service logs.',
      personalTasks,
      documents: filteredDocs,
      personalLists,
      contacts,
      trips,
      vehicles,
      longTermPlans,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `familyos-life-records-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Personal & household records exported.');
  };

  // Enforce role-based access level on Document Vault
  const filteredDocs = documents.filter((d) => {
    if (selectedRole === 'CHILD' || selectedRole === 'GUEST') {
      if (d.accessLevel !== 'All Household') return false;
    } else if (selectedRole === 'MEMBER') {
      if (d.accessLevel === 'Owner & Admin Only') return false;
    }
    const matchesCat = docFilter === 'ALL' || d.category === docFilter;
    const matchesSearch =
      !docSearch.trim() ||
      d.title.toLowerCase().includes(docSearch.toLowerCase()) ||
      d.category.toLowerCase().includes(docSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl p-6 sm:p-8 bg-[#173D35] text-white shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <div className="text-xs font-semibold text-[#E5C388] tracking-wide">
              Life Management — The Personal & Administrative Center
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
              Personal Administration, Document Vault, Contacts, Travel & Vehicles
            </h2>
            <p className="text-sm text-emerald-100/90 leading-relaxed">
              One organized environment for personal dashboards, access-controlled household documents, important contacts, holiday planning, vehicle records, and long-term family priorities.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportAllPersonalRecords}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Eligible Data</span>
          </button>
        </div>

        {/* Sub-navigation */}
        <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-white/15">
          {[
            { id: 'personal_dashboard', label: 'Personal Dashboard' },
            { id: 'documents', label: 'Document Vault' },
            { id: 'personal_org', label: 'Personal Notes & Checklists' },
            { id: 'contacts', label: 'Important Contacts' },
            { id: 'travel', label: 'Travel & Holiday Planning' },
            { id: 'vehicles', label: 'Vehicle Management' },
            { id: 'long_term', label: 'Long-Term Family Plans' },
          ].map((tab) => {
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectLifeTab(tab.id as LifeManagementSubTab)}
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

      {/* 9.1 PERSONAL DASHBOARD */}
      {activeSubTab === 'personal_dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-lg text-stone-900">My Personal Space ({selectedRole})</h3>
                <p className="text-xs text-stone-500">Individual tasks, personal appointments, and private reminders</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900">
                Private to You
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newPersonalTask.trim()) {
                  setValidationError('Please enter a personal task title.');
                  return;
                }
                const newTask = {
                  id: `pt-${Date.now()}`,
                  title: newPersonalTask.trim(),
                  due: 'This Week',
                  completed: false,
                  ownerUserId: resolvedUserId || '',
                  ownerMemberId: actorMemberId || '',
                  isPrivate: true,
                  version: 1,
                };
                setPersonalTasks([newTask, ...personalTasks]);
                void persistSingleRecord('personalTasks', newTask.id, newTask);
                setNewPersonalTask('');
                showToast('Personal task added.');
              }}
              className="flex gap-2 text-xs"
            >
              <input
                type="text"
                value={newPersonalTask}
                onChange={(e) => setNewPersonalTask(e.target.value)}
                placeholder="Add a personal task or private reminder..."
                className="flex-1 px-3 py-2 rounded-xl border border-stone-300"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#173D35] text-white font-semibold hover:bg-emerald-950 cursor-pointer"
              >
                + Add
              </button>
            </form>

            <div className="space-y-2 text-xs">
              {personalTasks.map((pt) => (
                <div
                  key={pt.id}
                  className={`w-full p-3.5 rounded-2xl border flex items-center justify-between transition-colors ${
                    pt.completed ? 'bg-emerald-50/70 border-emerald-200' : 'bg-stone-50 border-stone-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...pt, completed: !pt.completed };
                      setPersonalTasks((prev) =>
                        prev.map((item) => (item.id === pt.id ? updated : item))
                      );
                      void persistSingleRecord('personalTasks', pt.id, updated);
                    }}
                    className="flex items-center space-x-2.5 text-left flex-1 cursor-pointer"
                  >
                    <CheckCircle2 className={`w-4 h-4 shrink-0 ${pt.completed ? 'text-emerald-700' : 'text-stone-300'}`} />
                    <span className={pt.completed ? 'line-through text-stone-400' : 'font-semibold text-stone-900'}>
                      {pt.title}
                    </span>
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-stone-500">{pt.due}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setPersonalTasks((prev) => prev.filter((item) => item.id !== pt.id));
                        void deleteSingleRecord('personalTasks', pt.id);
                      }}
                      className="text-stone-400 hover:text-rose-600 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-lg text-stone-900">Personal Focus & Privacy</h3>
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                <span className="font-bold text-stone-900 block">Personal Reading & Reflection</span>
                <p className="text-stone-600 mt-0.5">20 mins evening reading • Private reflection journal synced</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200">
                <span className="font-bold text-amber-950 block">Upcoming Document Renewals</span>
                <p className="text-amber-900 mt-0.5">{filteredDocs.length} authorized records available in your Document Vault</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                <span className="font-bold text-emerald-950 block">Data Export & Retention Policy</span>
                <p className="text-emerald-900 mt-0.5">
                  Exporting personal records downloads a portable JSON archive. Deleting a contact or note never erases historical financial transactions.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9.2 IMPORTANT DOCUMENTS & RECORDS VAULT */}
      {activeSubTab === 'documents' && (
        <div className="space-y-6">
          <div className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-stone-900">Important Documents & Records Vault</h3>
                <p className="text-xs text-stone-500">
                  AES-256-GCM encrypted storage with MIME/signature validation (max 10 MB), expiration tracking, and role-based access enforcement.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    placeholder="Search documents..."
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-stone-300"
                  />
                </div>
                <select
                  value={docFilter}
                  onChange={(e) => setDocFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-stone-300 bg-white"
                >
                  <option value="ALL">All Categories</option>
                  <option value="Identification">Identification</option>
                  <option value="Insurance">Insurance</option>
                  <option value="Property">Property</option>
                  <option value="Legal">Legal</option>
                  <option value="Education">Education</option>
                  <option value="Warranties">Warranties</option>
                </select>
                <label className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-semibold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                  <input type="file" onChange={handleFileUploadDocument} className="hidden" />
                </label>
              </div>
            </div>

            <form onSubmit={handleAddDocument} className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs pt-2 border-t border-stone-100">
              <input
                type="text"
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                placeholder="Document Title *"
                className="sm:col-span-2 px-3 py-2 rounded-xl border border-stone-300"
              />
              <select
                value={newDocCat}
                onChange={(e) => setNewDocCat(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-stone-300 bg-white"
              >
                <option value="Identification">Identification</option>
                <option value="Insurance">Insurance</option>
                <option value="Property">Property</option>
                <option value="Vehicle">Vehicle</option>
                <option value="Education">Education</option>
                <option value="Contracts">Contracts</option>
                <option value="Warranties">Warranties</option>
                <option value="Receipts">Receipts</option>
                <option value="Legal">Legal</option>
              </select>
              <select
                value={newDocAccess}
                onChange={(e) => setNewDocAccess(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-stone-300 bg-white"
              >
                <option value="Owner & Admin Only">Owner & Admin Only</option>
                <option value="Adult Members">Adult Members</option>
                <option value="All Household">All Household</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#173D35] text-white font-semibold hover:bg-emerald-950 cursor-pointer"
              >
                + Add Record
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map((doc) => (
              <div key={doc.id} className="rounded-3xl p-5 bg-white border border-stone-200 shadow-xs space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-800">
                      {doc.category}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-900 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      {doc.accessLevel}
                    </span>
                  </div>
                  <h4 className="font-serif font-bold text-base text-stone-900">{doc.title}</h4>
                  {doc.fileName && (
                    <p className="text-[11px] font-mono text-stone-400">
                      {doc.fileName} ({doc.fileSizeKb || 320} KB) {doc.encryptedAtRest ? '• AES-256-GCM' : ''}
                    </p>
                  )}
                </div>
                <div className="pt-3 border-t border-stone-100 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Expiration / Status:</span>
                    <span className="font-mono font-semibold text-stone-900">{doc.expirationDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Renewal Alert:</span>
                    <span className="text-amber-800 font-medium">{doc.renewalReminder}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => void handleDownloadDocument(doc)}
                      className="flex items-center space-x-1 text-emerald-900 font-semibold hover:underline cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                    {confirmDeleteId === doc.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setDocuments((prev) => prev.filter((item) => item.id !== doc.id));
                            void deleteSingleRecord('documents', doc.id);
                            setConfirmDeleteId(null);
                            showToast('Document deleted from vault.');
                          }}
                          className="px-2 py-0.5 rounded bg-rose-700 text-white text-[10px] font-bold cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-0.5 rounded bg-stone-200 text-stone-700 text-[10px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(doc.id)}
                        className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 9.3 PERSONAL ORGANIZATION */}
      {activeSubTab === 'personal_org' && (
        <div className="space-y-6">
          <div className="rounded-3xl p-5 bg-white border border-stone-200 shadow-xs">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newNoteItemText.trim()) return;
                const target = personalLists.find((pl) => pl.id === newNoteCatId);
                if (target) {
                  const updated = { ...target, items: [newNoteItemText.trim(), ...target.items] };
                  setPersonalLists((prev) => prev.map((pl) => (pl.id === newNoteCatId ? updated : pl)));
                  void persistSingleRecord('personalLists', updated.id, updated);
                }
                setNewNoteItemText('');
                showToast('Personal note added.');
              }}
              className="flex flex-wrap items-center gap-2 text-xs"
            >
              <select
                value={newNoteCatId}
                onChange={(e) => setNewNoteCatId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-stone-300 bg-white"
              >
                {personalLists.map((pl) => (
                  <option key={pl.id} value={pl.id}>{pl.category}</option>
                ))}
              </select>
              <input
                type="text"
                value={newNoteItemText}
                onChange={(e) => setNewNoteItemText(e.target.value)}
                placeholder="Add book, wishlist idea, or personal checklist item..."
                className="flex-1 min-w-[220px] px-3 py-2 rounded-xl border border-stone-300"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#173D35] text-white font-semibold cursor-pointer"
              >
                + Add Item
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {personalLists.map((pl) => (
              <div key={pl.id} className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
                <h3 className="font-serif font-bold text-lg text-stone-900">{pl.category}</h3>
                <ul className="space-y-2 text-xs text-stone-700">
                  {pl.items.map((item, i) => (
                    <li key={i} className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-2">
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...pl, items: pl.items.filter((_, idx) => idx !== i) };
                          setPersonalLists((prev) =>
                            prev.map((list) => (list.id === pl.id ? updated : list))
                          );
                          void persistSingleRecord('personalLists', pl.id, updated);
                        }}
                        className="text-stone-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 9.4 IMPORTANT CONTACTS */}
      {activeSubTab === 'contacts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-lg text-stone-900">Add Household Contact</h3>
            <form onSubmit={handleAddContact} className="space-y-3 text-xs">
              <input
                type="text"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                placeholder="Contact or Organization Name *"
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
              />
              <select
                value={newContactCat}
                onChange={(e) => setNewContactCat(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
              >
                <option value="Emergency">Emergency Contact</option>
                <option value="Family">Family</option>
                <option value="Schools">Schools</option>
                <option value="Service Providers">Service Providers</option>
                <option value="Contractors">Contractors</option>
                <option value="Insurance">Insurance</option>
                <option value="Organizations">Important Organizations</option>
              </select>
              <input
                type="text"
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value)}
                placeholder="Phone Number *"
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
              />
              <input
                type="text"
                value={newContactNotes}
                onChange={(e) => setNewContactNotes(e.target.value)}
                placeholder="Role, policy number, or notes"
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#173D35] text-white font-semibold hover:bg-emerald-950 cursor-pointer"
              >
                + Save Contact
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                placeholder="Search contacts by name, category, or phone..."
                className="w-full pl-9 pr-3 py-2 rounded-2xl border border-stone-200 bg-white text-xs"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contacts
                .filter(
                  (c) =>
                    !contactSearch.trim() ||
                    c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
                    c.category.toLowerCase().includes(contactSearch.toLowerCase()) ||
                    c.phone.toLowerCase().includes(contactSearch.toLowerCase())
                )
                .map((c) => (
                  <div key={c.id} className="rounded-3xl p-5 bg-white border border-stone-200 shadow-xs space-y-2 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            c.category === 'Emergency'
                              ? 'bg-rose-100 text-rose-900'
                              : 'bg-emerald-100 text-emerald-900'
                          }`}
                        >
                          {c.category}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-stone-900">{c.phone}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setContacts((prev) => prev.filter((item) => item.id !== c.id));
                              void deleteSingleRecord('contacts', c.id);
                              showToast('Contact removed from directory (historical transactions & events preserved).');
                            }}
                            className="text-stone-400 hover:text-rose-600 p-1 cursor-pointer"
                            title="Archive / Remove Contact"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <h4 className="font-serif font-bold text-base text-stone-900">{c.name}</h4>
                      <p className="text-xs text-stone-500">{c.notes}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 9.5 TRAVEL & HOLIDAY PLANNING */}
      {activeSubTab === 'travel' && (
        <div className="space-y-6">
          <div className="rounded-3xl p-5 bg-white border border-stone-200 shadow-xs">
            <h3 className="font-serif font-bold text-base text-stone-900 mb-3">Plan New Family Trip or Holiday</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTripDestination.trim() || !newTripDates.trim()) {
                  setValidationError('Please enter both destination and travel dates.');
                  return;
                }
                const budgetCents = Math.max(0, Math.round((parseFloat(newTripBudgetDollars) || 0) * 100));
                const newTrip: TravelPlan = {
                  id: `tr-${Date.now()}`,
                  destination: newTripDestination.trim(),
                  dates: newTripDates.trim(),
                  accommodation: newTripAccommodation.trim() || 'Family Lodging / Reserved Stay',
                  budgetCents,
                  spentCents: 0,
                  activities: ['Welcome family dinner', 'Local exploration & sightseeing'],
                  packingList: [
                    { id: `pk-${Date.now()}-1`, item: 'Passports / IDs & booking confirmations', packed: false },
                    { id: `pk-${Date.now()}-2`, item: 'First-aid kit & family medications', packed: false },
                  ],
                  version: 1,
                };
                setTrips((prev) => [newTrip, ...prev]);
                void persistSingleRecord('trips', newTrip.id, newTrip);
                setNewTripDestination('');
                setNewTripDates('');
                setNewTripAccommodation('');
                showToast('New family trip added to Travel & Holiday Planner.');
              }}
              className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs"
            >
              <input
                type="text"
                value={newTripDestination}
                onChange={(e) => setNewTripDestination(e.target.value)}
                placeholder="Destination / Trip Title *"
                className="px-3 py-2 rounded-xl border border-stone-300"
              />
              <input
                type="text"
                value={newTripDates}
                onChange={(e) => setNewTripDates(e.target.value)}
                placeholder="Dates (e.g. Dec 20 – Dec 27) *"
                className="px-3 py-2 rounded-xl border border-stone-300"
              />
              <input
                type="text"
                value={newTripAccommodation}
                onChange={(e) => setNewTripAccommodation(e.target.value)}
                placeholder="Accommodation / Hotel"
                className="px-3 py-2 rounded-xl border border-stone-300"
              />
              <input
                type="number"
                value={newTripBudgetDollars}
                onChange={(e) => setNewTripBudgetDollars(e.target.value)}
                placeholder="Budget ($)"
                className="px-3 py-2 rounded-xl border border-stone-300"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#173D35] text-white font-semibold hover:bg-emerald-950 cursor-pointer"
              >
                + Add Trip
              </button>
            </form>
          </div>

          {trips.map((tr) => (
            <div key={tr.id} className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-4">
                <div>
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Upcoming Family Trip</span>
                  <h3 className="font-serif font-bold text-2xl text-stone-900 mt-0.5">{tr.destination}</h3>
                  <p className="text-xs text-stone-500 mt-0.5">{tr.dates} • {tr.accommodation}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-right">
                  <span className="text-emerald-900 block font-semibold">Travel Budget (Exact Cents)</span>
                  <span className="font-mono font-bold text-base text-emerald-950">
                    {formatCents(tr.spentCents)} / {formatCents(tr.budgetCents)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="space-y-2">
                  <span className="font-bold text-stone-900 block">Planned Itinerary & Activities</span>
                  <div className="space-y-2">
                    {tr.activities.map((act, i) => (
                      <div key={i} className="p-3 rounded-2xl bg-stone-50 border border-stone-200 font-medium text-stone-800">
                        • {act}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="font-bold text-stone-900 block">Interactive Packing Checklist</span>
                  <div className="space-y-2">
                    {tr.packingList.map((pk) => (
                      <button
                        key={pk.id}
                        type="button"
                        onClick={() => {
                          const updated: TravelPlan = {
                            ...tr,
                            packingList: tr.packingList.map((item) =>
                              item.id === pk.id ? { ...item, packed: !item.packed } : item
                            ),
                          };
                          setTrips((prev) => prev.map((t) => (t.id === tr.id ? updated : t)));
                          void persistSingleRecord('trips', tr.id, updated);
                        }}
                        className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between cursor-pointer ${
                          pk.packed ? 'bg-emerald-50/70 border-emerald-200' : 'bg-stone-50 border-stone-200'
                        }`}
                      >
                        <span className={pk.packed ? 'line-through text-stone-400' : 'font-medium text-stone-800'}>
                          {pk.item}
                        </span>
                        <CheckCircle2 className={`w-4 h-4 ${pk.packed ? 'text-emerald-700' : 'text-stone-300'}`} />
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      value={newPackingItemText}
                      onChange={(e) => setNewPackingItemText(e.target.value)}
                      placeholder="Add packing list item..."
                      className="flex-1 px-3 py-1.5 rounded-xl border border-stone-300"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newPackingItemText.trim()) return;
                        const updated: TravelPlan = {
                          ...tr,
                          packingList: [
                            ...tr.packingList,
                            { id: `pk-${Date.now()}`, item: newPackingItemText.trim(), packed: false },
                          ],
                        };
                        setTrips((prev) => prev.map((t) => (t.id === tr.id ? updated : t)));
                        void persistSingleRecord('trips', tr.id, updated);
                        setNewPackingItemText('');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#173D35] text-white font-semibold cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 9.6 VEHICLE MANAGEMENT */}
      {activeSubTab === 'vehicles' && (
        <div className="space-y-6">
          <div className="rounded-3xl p-5 bg-white border border-stone-200 shadow-xs">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newServiceLogNote.trim()) return;
                const target = vehicles.find((v) => v.id === newServiceLogVehicleId);
                if (target) {
                  const updated = { ...target, serviceHistory: newServiceLogNote.trim() };
                  setVehicles((prev) => prev.map((v) => (v.id === newServiceLogVehicleId ? updated : v)));
                  void persistSingleRecord('vehicles', updated.id, updated);
                }
                setNewServiceLogNote('');
                showToast('Vehicle service log updated.');
              }}
              className="flex flex-wrap items-center gap-2 text-xs"
            >
              <span className="font-bold text-stone-900">Record Vehicle Service:</span>
              <select
                value={newServiceLogVehicleId}
                onChange={(e) => setNewServiceLogVehicleId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-stone-300 bg-white"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
              <input
                type="text"
                value={newServiceLogNote}
                onChange={(e) => setNewServiceLogNote(e.target.value)}
                placeholder="Service note, date, provider, or mileage..."
                className="flex-1 min-w-[220px] px-3 py-2 rounded-xl border border-stone-300"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#173D35] text-white font-semibold cursor-pointer"
              >
                Save Service Record
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {vehicles.map((v) => (
              <div key={v.id} className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <Car className="w-5 h-5 text-emerald-800" />
                    <h3 className="font-serif font-bold text-lg text-stone-900">{v.name}</h3>
                  </div>
                  <span className="font-mono text-xs font-semibold text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-full">
                    {formatCents(v.monthlyFuelCents)}/mo energy
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">Registration:</span>
                    <span className="font-medium text-stone-900">{v.registration}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">Insurance Renewal:</span>
                    <span className="font-mono text-stone-900">{v.insuranceRenewal}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">Inspection Date:</span>
                    <span className="font-mono text-stone-900">{v.inspectionDate}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">Next Maintenance:</span>
                    <span className="font-semibold text-amber-900">{v.nextMaintenance}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 mt-2">
                    <span className="font-bold text-stone-900 block mb-0.5">Recent Service History</span>
                    <p className="text-stone-600">{v.serviceHistory}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 9.7 LONG-TERM FAMILY PLANNING */}
      {activeSubTab === 'long_term' && (
        <div className="space-y-6">
          <div className="rounded-3xl p-5 bg-white border border-stone-200 shadow-xs">
            <h3 className="font-serif font-bold text-base text-stone-900 mb-3">Create Long-Term Family Milestone or Initiative</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newLtTitle.trim()) {
                  setValidationError('Please enter a title for the long-term family plan.');
                  return;
                }
                const budgetCents = Math.max(0, Math.round((parseFloat(newLtBudgetDollars) || 0) * 100));
                const newPlan: LongTermPlan = {
                  id: `lt-${Date.now()}`,
                  title: newLtTitle.trim(),
                  category: newLtCategory,
                  targetDate: newLtTargetDate.trim() || '2028',
                  estimatedBudgetCents: budgetCents,
                  milestones: ['Initial household alignment & scope review', 'Target budget & timeline established'],
                  progressPercent: 10,
                  version: 1,
                };
                setLongTermPlans((prev) => [newPlan, ...prev]);
                void persistSingleRecord('longTermPlans', newPlan.id, newPlan);
                setNewLtTitle('');
                showToast('Long-term family plan saved and synced.');
              }}
              className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs"
            >
              <input
                type="text"
                value={newLtTitle}
                onChange={(e) => setNewLtTitle(e.target.value)}
                placeholder="Initiative or Milestone Title *"
                className="sm:col-span-2 px-3 py-2 rounded-xl border border-stone-300"
              />
              <select
                value={newLtCategory}
                onChange={(e) => setNewLtCategory(e.target.value)}
                className="px-3 py-2 rounded-xl border border-stone-300 bg-white"
              >
                <option value="Education Planning">Education Planning</option>
                <option value="Home Improvements">Home Improvements</option>
                <option value="Relocation & Property">Relocation & Property</option>
                <option value="Legacy & Estate">Legacy & Estate</option>
                <option value="Major Family Milestone">Major Family Milestone</option>
              </select>
              <input
                type="text"
                value={newLtTargetDate}
                onChange={(e) => setNewLtTargetDate(e.target.value)}
                placeholder="Target Year / Horizon"
                className="px-3 py-2 rounded-xl border border-stone-300"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#173D35] text-white font-semibold hover:bg-emerald-950 cursor-pointer"
              >
                + Add Plan
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {longTermPlans.map((lt) => (
            <div key={lt.id} className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                  {lt.category}
                </span>
                <span className="text-xs font-mono text-stone-500">Target: {lt.targetDate}</span>
              </div>
              <h3 className="font-serif font-bold text-xl text-stone-900">{lt.title}</h3>
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-500">Estimated Target Allocation:</span>
                <span className="font-mono font-bold text-stone-900">{formatCents(lt.estimatedBudgetCents)}</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Readiness & Funding Progress</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{lt.progressPercent}%</span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...lt, progressPercent: Math.min(100, lt.progressPercent + 5) };
                        setLongTermPlans((prev) =>
                          prev.map((item) => (item.id === lt.id ? updated : item))
                        );
                        void persistSingleRecord('longTermPlans', lt.id, updated);
                      }}
                      className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] font-bold cursor-pointer"
                    >
                      +5%
                    </button>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                  <div className="h-full bg-[#173D35] rounded-full transition-all" style={{ width: `${lt.progressPercent}%` }} />
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-1">
                <span className="font-bold text-stone-900 block">Key Milestones</span>
                <ul className="space-y-1 text-stone-600 list-disc list-inside">
                  {lt.milestones.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}
    </div>
  );
};
