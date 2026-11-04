import React, { useState, useRef, useMemo } from 'react';
import {
  Image,
  Upload,
  Plus,
  Trash2,
  Check,
  X,
  Sparkles,
  Camera,
  Maximize2,
  Star,
  Tag,
  Calendar,
  Layers,
  ArrowRight,
  Shield,
  Download,
  Link,
  Eye,
} from 'lucide-react';
import { Stage331WorkspaceData } from './Stage331FamilyExperience';
import { offlineSyncEngine } from '../services/offlineSyncEngine';

interface FamilyBrandingGalleryCenterProps {
  workspaceData: Stage331WorkspaceData;
  sessionToken: string;
  selectedRole: string;
  onRefreshWorkspace: () => void;
}

interface GalleryPhotoItem {
  id: string;
  url: string;
  title: string;
  category: 'CELEBRATION' | 'MILESTONE' | 'HOLIDAY' | 'TRADITION' | 'EVERYDAY' | 'PORTRAIT';
  date: string;
  notes?: string;
  isCover?: boolean;
  isLogo?: boolean;
}

const DEFAULT_COVER_PRESETS = [
  {
    title: 'Sanctuary Estate',
    url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80',
  },
  {
    title: 'Alpine Mountain Lodge',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80',
  },
  {
    title: 'Peaceful Lakeside Cottage',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
  },
  {
    title: 'Generational Homestead',
    url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80',
  },
];

const DEFAULT_LOGO_PRESETS = [
  {
    title: 'Gold Heritage Monogram',
    url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=400&q=80',
  },
  {
    title: 'Forest Hearth Crest',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80',
  },
  {
    title: 'Sanctuary Tree of Life',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=400&q=80',
  },
];

export const FamilyBrandingGalleryCenter: React.FC<FamilyBrandingGalleryCenterProps> = ({
  workspaceData,
  sessionToken,
  selectedRole,
  onRefreshWorkspace,
}) => {
  const familyId = workspaceData.familyId || workspaceData.workspace.id || 'fam-1';
  const canManage = workspaceData.permissions.canManageIdentity || selectedRole === 'OWNER' || selectedRole === 'ADMIN';

  // Feedback banner state
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');

  const showFeedback = (msg: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg(msg);
    setFeedbackType(type);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Modals
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<GalleryPhotoItem | null>(null);

  // Form inputs
  const [logoInputUrl, setLogoInputUrl] = useState('');
  const [coverInputUrl, setCoverInputUrl] = useState('');

  // Add photo inputs
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoTitle, setNewPhotoTitle] = useState('');
  const [newPhotoCategory, setNewPhotoCategory] = useState<GalleryPhotoItem['category']>('CELEBRATION');
  const [newPhotoDate, setNewPhotoDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPhotoNotes, setNewPhotoNotes] = useState('');

  // Local file input refs
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

  // Derive initial gallery from server mediaAssets + local cached gallery records
  const initialGallery = useMemo<GalleryPhotoItem[]>(() => {
    const fromMedia: GalleryPhotoItem[] = (workspaceData.mediaAssets || [])
      .filter((m: any) => m.category === 'FAMILY_PHOTO' || m.category === 'FAMILY_LOGO')
      .map((m: any) => ({
        id: m.id,
        url: m.dataUrl || (m as any).mediaUrl || '',
        title: m.fileName || 'Family Moment',
        category: 'CELEBRATION',
        date: new Date().toISOString().split('T')[0],
      }));

    // Check local offline gallery items
    const cachedGallery = offlineSyncEngine.getCache<GalleryPhotoItem[]>(`family_gallery_${familyId}`) || [];

    // Merge by id
    const mergedMap = new Map<string, GalleryPhotoItem>();
    [...cachedGallery, ...fromMedia].forEach((item) => {
      if (item.url) mergedMap.set(item.id, item);
    });

    if (mergedMap.size === 0) {
      // Seed initial high-fidelity gallery photos if none exist yet
      return [
        {
          id: 'gal-1',
          url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=80',
          title: 'Annual Summer Lakehouse Reunion',
          category: 'HOLIDAY',
          date: '2026-07-15',
          notes: 'Full family trip to Lake Tahoe. Boat morning and sunset dinner on the pier.',
        },
        {
          id: 'gal-2',
          url: 'https://images.unsplash.com/photo-1542037104857-ffbb0b9155fb?auto=format&fit=crop&w=1200&q=80',
          title: 'Maya High School Honors Recognition',
          category: 'MILESTONE',
          date: '2026-05-28',
          notes: 'Maya placed 1st in the regional science and robotics showcase.',
        },
        {
          id: 'gal-3',
          url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=80',
          title: 'Family Thanksgiving Hearth Gathering',
          category: 'TRADITION',
          date: '2025-11-27',
          notes: 'Three generations celebrating our heritage recipes and gratitude circle.',
        },
        {
          id: 'gal-4',
          url: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80',
          title: 'Autumn Trail Hike in the Cascades',
          category: 'EVERYDAY',
          date: '2026-10-12',
          notes: 'Sunday morning family trek with gold and crimson leaves.',
        },
      ];
    }

    return Array.from(mergedMap.values());
  }, [familyId, workspaceData.mediaAssets]);

  const [galleryItems, setGalleryItems] = useState<GalleryPhotoItem[]>(initialGallery);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Filtered gallery
  const filteredGallery = useMemo(() => {
    if (selectedCategoryFilter === 'ALL') return galleryItems;
    return galleryItems.filter((item) => item.category === selectedCategoryFilter);
  }, [galleryItems, selectedCategoryFilter]);

  // Persist gallery to offline cache
  const saveGalleryItems = (updated: GalleryPhotoItem[]) => {
    setGalleryItems(updated);
    offlineSyncEngine.setCache(`family_gallery_${familyId}`, updated);
  };

  // --- Handlers for Family Logo ---
  const handleUpdateLogo = async (url: string) => {
    if (!url.trim()) return;
    try {
      const res = await fetch(`/api/v1/workspace/${encodeURIComponent(familyId)}/identity`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ logoUrl: url.trim() }),
      });

      if (res.ok) {
        showFeedback('Family logo updated successfully!');
        setShowLogoModal(false);
        setLogoInputUrl('');
        onRefreshWorkspace();
      } else {
        showFeedback('Failed to update family logo.', 'error');
      }
    } catch {
      // Offline fallback
      offlineSyncEngine.enqueueMutation({
        url: `/api/v1/workspace/${encodeURIComponent(familyId)}/identity`,
        method: 'PUT',
        body: { logoUrl: url.trim() },
        headers: { Authorization: `Bearer ${sessionToken}` },
        domain: 'workspace',
        actionDescription: 'Update Family Logo (Offline)',
      });
      showFeedback('Saved family logo locally (will sync when online).');
      setShowLogoModal(false);
    }
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        await handleUpdateLogo(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // --- Handlers for Family Cover Photo ---
  const handleUpdateCover = async (url: string) => {
    if (!url.trim()) return;
    try {
      const res = await fetch(`/api/v1/workspace/${encodeURIComponent(familyId)}/identity`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ photoUrl: url.trim() }),
      });

      if (res.ok) {
        showFeedback('Family cover photo updated successfully!');
        setShowCoverModal(false);
        setCoverInputUrl('');
        onRefreshWorkspace();
      } else {
        showFeedback('Failed to update cover photo.', 'error');
      }
    } catch {
      // Offline fallback
      offlineSyncEngine.enqueueMutation({
        url: `/api/v1/workspace/${encodeURIComponent(familyId)}/identity`,
        method: 'PUT',
        body: { photoUrl: url.trim() },
        headers: { Authorization: `Bearer ${sessionToken}` },
        domain: 'workspace',
        actionDescription: 'Update Family Cover Photo (Offline)',
      });
      showFeedback('Saved family cover photo locally (will sync when online).');
      setShowCoverModal(false);
    }
  };

  const handleCoverFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        await handleUpdateCover(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // --- Handlers for Adding Photos to Gallery ---
  const handleAddPhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhotoUrl.trim() && !newPhotoTitle.trim()) {
      showFeedback('Please provide a photo or title.', 'error');
      return;
    }

    const newItem: GalleryPhotoItem = {
      id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      url: newPhotoUrl.trim(),
      title: newPhotoTitle.trim() || 'Family Photo',
      category: newPhotoCategory,
      date: newPhotoDate || new Date().toISOString().split('T')[0],
      notes: newPhotoNotes.trim() || undefined,
    };

    const updated = [newItem, ...galleryItems];
    saveGalleryItems(updated);

    // Also attempt server sync if dataUrl
    if (newItem.url.startsWith('data:image/')) {
      try {
        await fetch(`/api/v1/media/${encodeURIComponent(familyId)}/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({
            category: 'FAMILY_PHOTO',
            fileName: `${newItem.title}.png`,
            dataUrl: newItem.url,
            visibility: 'SHARED',
          }),
        });
      } catch {
        // Offline queue
      }
    }

    showFeedback(`Added "${newItem.title}" to Family Gallery!`);
    setShowAddPhotoModal(false);
    setNewPhotoUrl('');
    setNewPhotoTitle('');
    setNewPhotoNotes('');
  };

  const handleGalleryFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        setNewPhotoUrl(dataUrl);
        if (!newPhotoTitle) {
          setNewPhotoTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeletePhoto = (id: string, title: string) => {
    const updated = galleryItems.filter((i) => i.id !== id);
    saveGalleryItems(updated);
    showFeedback(`Removed "${title}" from gallery.`);
  };

  const currentLogo = workspaceData.workspace.logoUrl || '';
  const currentCover =
    workspaceData.workspace.photoUrl ||
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80';

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between border shadow-lg animate-fade-in ${
            feedbackType === 'success'
              ? 'bg-emerald-900/90 text-emerald-100 border-emerald-600'
              : 'bg-rose-900/90 text-rose-100 border-rose-600'
          }`}
        >
          <span>{feedbackMsg}</span>
          <button type="button" onClick={() => setFeedbackMsg(null)} className="text-white hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner & Family Cover Photo Hero */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-[#E2DCD0] bg-[#0E2822]">
        {/* Cover Image Background */}
        <div className="relative h-64 sm:h-80 w-full overflow-hidden">
          <img
            src={currentCover}
            alt="Family Cover Photo"
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
          />
          {/* Multi-Stop Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0E2822] via-[#0E2822]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0E2822]/80 via-transparent to-[#0E2822]/40" />
        </div>

        {/* Change Cover Button (Top Right) */}
        {canManage && (
          <div className="absolute top-4 right-4 z-10 flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowCoverModal(true)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 text-white text-xs font-semibold backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-lg"
              title="Change Family Cover Photo"
            >
              <Camera className="w-3.5 h-3.5 text-[#C39A60]" />
              <span>Change Cover Photo</span>
            </button>
          </div>
        )}

        {/* Bottom Lockup: Family Logo Crest + Name + Motto */}
        <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 z-10">
          <div className="flex items-center space-x-4">
            {/* Family Logo Crest */}
            <div className="relative group">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl p-1 bg-gradient-to-br from-[#E7D1AA] via-[#C39A60] to-[#9A7236] shadow-2xl flex items-center justify-center shrink-0">
                {currentLogo ? (
                  <img
                    src={currentLogo}
                    alt="Family Crest"
                    className="w-full h-full rounded-[22px] object-cover bg-[#0E2822]"
                  />
                ) : (
                  <div className="w-full h-full rounded-[22px] bg-[#0E2822] flex flex-col items-center justify-center text-white">
                    <span className="font-serif text-3xl font-bold text-[#C39A60]">
                      {workspaceData.workspace.name.charAt(0) || 'F'}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-[#E7D1AA]/70 font-sans">Crest</span>
                  </div>
                )}
              </div>

              {canManage && (
                <button
                  type="button"
                  onClick={() => setShowLogoModal(true)}
                  className="absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-[#C39A60] hover:bg-[#b08850] text-[#0E2822] shadow-md border border-[#E7D1AA] transition-transform hover:scale-110 cursor-pointer"
                  title="Change Family Logo / Crest"
                >
                  <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              )}
            </div>

            {/* Family Name & Motto */}
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide truncate drop-shadow-md">
                  {workspaceData.workspace.name}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-[#C39A60]/30 text-[#E7D1AA] border border-[#C39A60]/50 text-[10px] font-bold uppercase tracking-wider">
                  Established
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-300 font-serif italic mt-0.5 max-w-xl line-clamp-1 drop-shadow-xs">
                &ldquo;{workspaceData.workspace.motto || 'Strength, Harmony & Generational Purpose'}&rdquo;
              </p>
            </div>
          </div>

          {/* Quick Action: Add Photo Button */}
          <button
            type="button"
            onClick={() => setShowAddPhotoModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-[#C39A60] hover:bg-[#b08850] text-[#0A1E19] text-xs font-bold shadow-xl border border-[#E7D1AA] transition-all hover:scale-105 cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Family Photo</span>
          </button>
        </div>
      </div>

      {/* Main Branding & Gallery Grid Control Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-[#C39A60]" />
          <div>
            <h2 className="text-lg font-bold text-[#11231E] font-serif">Family Photo Archive & Memories</h2>
            <p className="text-xs text-[#4F635D]">
              {galleryItems.length} {galleryItems.length === 1 ? 'photograph' : 'photographs'} celebrating your family heritage
            </p>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto max-w-full pb-1">
          {[
            { id: 'ALL', label: 'All Photos' },
            { id: 'CELEBRATION', label: 'Celebrations' },
            { id: 'MILESTONE', label: 'Milestones' },
            { id: 'HOLIDAY', label: 'Holidays' },
            { id: 'TRADITION', label: 'Traditions' },
            { id: 'EVERYDAY', label: 'Everyday' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategoryFilter === cat.id
                  ? 'bg-[#173D35] text-white shadow-xs'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Photo Gallery Grid */}
      {filteredGallery.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-stone-300 shadow-xs">
          <Camera className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800 font-serif">No Photos in this Category</h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            Upload family memories, celebrations, and milestone photos to preserve your household story.
          </p>
          <button
            type="button"
            onClick={() => setShowAddPhotoModal(true)}
            className="mt-4 inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#173D35] hover:bg-[#12332C] text-white text-xs font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload First Photo</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredGallery.map((photo) => (
            <div
              key={photo.id}
              className="group relative bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col"
            >
              {/* Image Container */}
              <div className="relative aspect-4/3 w-full bg-stone-100 overflow-hidden cursor-pointer" onClick={() => setLightboxPhoto(photo)}>
                <img
                  src={photo.url}
                  alt={photo.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="p-2 rounded-full bg-white/20 text-white backdrop-blur-xs">
                    <Maximize2 className="w-5 h-5" />
                  </div>
                </div>

                {/* Category Pill Tag */}
                <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] font-semibold text-white uppercase tracking-wider border border-white/20">
                  {photo.category}
                </div>
              </div>

              {/* Photo Information & Actions */}
              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-stone-900 font-serif truncate" title={photo.title}>
                    {photo.title}
                  </h4>
                  <p className="text-[10px] text-stone-400 flex items-center space-x-1 mt-0.5">
                    <Calendar className="w-3 h-3" />
                    <span>{photo.date}</span>
                  </p>
                  {photo.notes && (
                    <p className="text-[11px] text-stone-600 mt-1.5 line-clamp-2 leading-relaxed">
                      {photo.notes}
                    </p>
                  )}
                </div>

                {/* Quick Actions Footer */}
                {canManage && (
                  <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateCover(photo.url)}
                        className="px-2 py-1 rounded-lg bg-stone-50 hover:bg-[#C39A60]/20 text-[10px] font-semibold text-stone-700 hover:text-[#9A7236] transition-colors cursor-pointer"
                        title="Set this photo as Family Cover Banner"
                      >
                        Set as Cover
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateLogo(photo.url)}
                        className="px-2 py-1 rounded-lg bg-stone-50 hover:bg-[#C39A60]/20 text-[10px] font-semibold text-stone-700 hover:text-[#9A7236] transition-colors cursor-pointer"
                        title="Set this photo as Family Logo Crest"
                      >
                        Set as Logo
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(photo.id, photo.title)}
                      className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Remove from gallery"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: CHANGE FAMILY LOGO / CREST                     */}
      {/* ======================================================== */}
      {showLogoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white border border-[#E2DCD0] shadow-2xl p-6 text-stone-900 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-[#C39A60]" />
                <h3 className="text-base font-bold font-serif text-[#173D35]">Update Family Crest / Logo</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoModal(false)}
                className="p-1 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* File Upload Trigger */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Upload Logo Image File</label>
                <input
                  type="file"
                  ref={logoFileInputRef}
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleLogoFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoFileInputRef.current?.click()}
                  className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-[#C39A60]/50 hover:border-[#C39A60] bg-[#F7F4EC]/60 hover:bg-[#F7F4EC] text-xs font-semibold text-[#173D35] flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-[#C39A60]" />
                  <span>Choose file from device (PNG, SVG, JPG)</span>
                </button>
              </div>

              {/* Or Direct Image URL */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Or Paste Image URL</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="url"
                    value={logoInputUrl}
                    onChange={(e) => setLogoInputUrl(e.target.value)}
                    placeholder="https://example.com/family-crest.png"
                    className="flex-1 px-3 py-2 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-[#C39A60] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdateLogo(logoInputUrl)}
                    disabled={!logoInputUrl.trim()}
                    className="px-3 py-2 rounded-xl bg-[#173D35] hover:bg-[#12332C] text-white text-xs font-semibold disabled:opacity-50"
                  >
                    Save URL
                  </button>
                </div>
              </div>

              {/* Or Select from Presets */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-2">Or Choose a Heritage Crest Preset</label>
                <div className="grid grid-cols-3 gap-2">
                  {DEFAULT_LOGO_PRESETS.map((preset) => (
                    <button
                      key={preset.title}
                      type="button"
                      onClick={() => handleUpdateLogo(preset.url)}
                      className="group relative rounded-xl overflow-hidden border border-stone-200 hover:border-[#C39A60] transition-all cursor-pointer p-1"
                    >
                      <img src={preset.url} alt={preset.title} className="w-full h-16 object-cover rounded-lg" />
                      <span className="block text-[10px] text-stone-600 font-semibold truncate mt-1">
                        {preset.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CHANGE FAMILY COVER PHOTO BANNER               */}
      {/* ======================================================== */}
      {showCoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-[#E2DCD0] shadow-2xl p-6 text-stone-900 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center space-x-2">
                <Camera className="w-5 h-5 text-[#C39A60]" />
                <h3 className="text-base font-bold font-serif text-[#173D35]">Update Family Cover Photo</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCoverModal(false)}
                className="p-1 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* File Upload Trigger */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Upload Panoramic Banner File</label>
                <input
                  type="file"
                  ref={coverFileInputRef}
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleCoverFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => coverFileInputRef.current?.click()}
                  className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-[#C39A60]/50 hover:border-[#C39A60] bg-[#F7F4EC]/60 hover:bg-[#F7F4EC] text-xs font-semibold text-[#173D35] flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-[#C39A60]" />
                  <span>Choose wide photo from device (JPG, PNG)</span>
                </button>
              </div>

              {/* Paste URL */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Or Paste Image URL</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="url"
                    value={coverInputUrl}
                    onChange={(e) => setCoverInputUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 px-3 py-2 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-[#C39A60] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdateCover(coverInputUrl)}
                    disabled={!coverInputUrl.trim()}
                    className="px-3 py-2 rounded-xl bg-[#173D35] hover:bg-[#12332C] text-white text-xs font-semibold disabled:opacity-50"
                  >
                    Save URL
                  </button>
                </div>
              </div>

              {/* Choose from Curated Presets */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-2">Or Choose from Curated Estates & Sanctuaries</label>
                <div className="grid grid-cols-2 gap-2">
                  {DEFAULT_COVER_PRESETS.map((preset) => (
                    <button
                      key={preset.title}
                      type="button"
                      onClick={() => handleUpdateCover(preset.url)}
                      className="group relative rounded-xl overflow-hidden border border-stone-200 hover:border-[#C39A60] transition-all cursor-pointer h-20 text-left"
                    >
                      <img src={preset.url} alt={preset.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-2">
                        <span className="text-[10px] text-white font-bold leading-tight drop-shadow-sm">
                          {preset.title}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: ADD PHOTO TO FAMILY GALLERY                    */}
      {/* ======================================================== */}
      {showAddPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-[#E2DCD0] shadow-2xl p-6 text-stone-900 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center space-x-2">
                <Plus className="w-5 h-5 text-[#C39A60]" />
                <h3 className="text-base font-bold font-serif text-[#173D35]">Add Photograph to Family Archive</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPhotoModal(false)}
                className="p-1 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPhotoSubmit} className="mt-4 space-y-3.5">
              {/* File upload or URL */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Photograph File or URL</label>
                <input
                  type="file"
                  ref={galleryFileInputRef}
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleGalleryFileUpload}
                  className="hidden"
                />
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => galleryFileInputRef.current?.click()}
                    className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold flex items-center space-x-1.5 shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload File</span>
                  </button>
                  <input
                    type="text"
                    value={newPhotoUrl.startsWith('data:') ? 'Image file loaded from device' : newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    placeholder="Or paste public image URL..."
                    className="flex-1 px-3 py-2 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-[#C39A60] focus:outline-none"
                  />
                </div>
              </div>

              {/* Title / Caption */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Photo Title / Caption *</label>
                <input
                  type="text"
                  required
                  value={newPhotoTitle}
                  onChange={(e) => setNewPhotoTitle(e.target.value)}
                  placeholder="e.g., Grandparent 50th Anniversary Dinner"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-[#C39A60] focus:outline-none"
                />
              </div>

              {/* Category & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Category</label>
                  <select
                    value={newPhotoCategory}
                    onChange={(e) => setNewPhotoCategory(e.target.value as GalleryPhotoItem['category'])}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-[#C39A60] focus:outline-none bg-white"
                  >
                    <option value="CELEBRATION">Celebration</option>
                    <option value="MILESTONE">Milestone</option>
                    <option value="HOLIDAY">Holiday & Travel</option>
                    <option value="TRADITION">Tradition</option>
                    <option value="EVERYDAY">Everyday Moment</option>
                    <option value="PORTRAIT">Portrait</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Date Taken</label>
                  <input
                    type="date"
                    value={newPhotoDate}
                    onChange={(e) => setNewPhotoDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-[#C39A60] focus:outline-none"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Memory Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={newPhotoNotes}
                  onChange={(e) => setNewPhotoNotes(e.target.value)}
                  placeholder="Who was present, location, memories..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-[#C39A60] focus:outline-none"
                />
              </div>

              {/* Submit */}
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPhotoModal(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#173D35] hover:bg-[#12332C] text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Save Photo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* LIGHTBOX VIEWER                                         */}
      {/* ======================================================== */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxPhoto(null)}
              className="absolute -top-10 right-0 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <img
              src={lightboxPhoto.url}
              alt={lightboxPhoto.title}
              className="max-h-[75vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
            />

            <div className="mt-3 text-center text-white">
              <h3 className="text-base font-bold font-serif">{lightboxPhoto.title}</h3>
              <p className="text-xs text-stone-300 mt-0.5">
                {lightboxPhoto.category} &bull; {lightboxPhoto.date}
              </p>
              {lightboxPhoto.notes && <p className="text-xs text-stone-300 max-w-xl mx-auto mt-1 italic">&ldquo;{lightboxPhoto.notes}&rdquo;</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
