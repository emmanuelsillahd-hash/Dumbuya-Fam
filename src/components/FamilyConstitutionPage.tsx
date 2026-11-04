import React, { useState, useEffect } from 'react';
import {
  Shield,
  BookOpen,
  CheckCircle2,
  Plus,
  Printer,
  Sparkles,
  Heart,
  Scale,
  Trash2,
  Edit3,
} from 'lucide-react';
import { Stage331WorkspaceData } from './Stage331FamilyExperience';

export interface FamilyConstitutionPageProps {
  workspaceData: Stage331WorkspaceData | null;
  sessionToken: string;
  selectedPersona: string;
}

export interface HouseRule {
  id: string;
  category: 'Communication & Respect' | 'Daily Habits' | 'Home Care & Cleanliness' | 'Digital Wellness & Boundaries';
  rule: string;
  principle: string;
  addedBy: string;
}

const INITIAL_CONSTITUTION_RULES: HouseRule[] = [
  {
    id: 'rule-1',
    category: 'Communication & Respect',
    rule: 'Speak with kindness, listen with patience, and address disagreements with calm empathy.',
    principle: 'Mutual Respect & Generational Unity',
    addedBy: 'Sarah Jenkins (Owner)',
  },
  {
    id: 'rule-2',
    category: 'Communication & Respect',
    rule: 'Assume positive intent and forgive quickly when misunderstandings occur.',
    principle: 'Grace & Understanding',
    addedBy: 'David Jenkins (Admin)',
  },
  {
    id: 'rule-3',
    category: 'Daily Habits',
    rule: 'Prepare school bags, clothes, and work items the night before to ensure serene mornings.',
    principle: 'Stewardship of Time',
    addedBy: 'Sarah Jenkins (Owner)',
  },
  {
    id: 'rule-4',
    category: 'Home Care & Cleanliness',
    rule: 'Clean up after yourself immediately in shared kitchen and living areas.',
    principle: 'Shared Responsibility',
    addedBy: 'Maya Jenkins (Teen Member)',
  },
  {
    id: 'rule-5',
    category: 'Digital Wellness & Boundaries',
    rule: 'Phones and screens are put away during family meals and 1 hour before bedtime.',
    principle: 'Present Presence',
    addedBy: 'David Jenkins (Admin)',
  },
];

export const FamilyConstitutionPage: React.FC<FamilyConstitutionPageProps> = ({
  workspaceData,
  sessionToken,
  selectedPersona,
}) => {
  const [rules, setRules] = useState<HouseRule[]>(() => {
    try {
      const saved = localStorage.getItem('familyos_constitution_rules');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return INITIAL_CONSTITUTION_RULES;
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<HouseRule['category']>('Communication & Respect');
  const [newRuleText, setNewRuleText] = useState('');
  const [newPrinciple, setNewPrinciple] = useState('');

  const [familyVisionMotto, setFamilyVisionMotto] = useState(() => {
    try {
      const saved = localStorage.getItem('familyos_family_vision_motto');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return {
      motto: workspaceData?.workspace?.motto || 'Faith, Harmony, Stewardship & Growth',
      vision: workspaceData?.workspace?.vision || 'To build a generational sanctuary of love, wisdom, resilience, and joyful service to our community.',
      coreValues: ['Stewardship', 'Kindness', 'Curiosity', 'Generational Unity', 'Integrity', 'Gratitude'],
    };
  });
  const [isEditingVision, setIsEditingVision] = useState(false);
  const [editMotto, setEditMotto] = useState(familyVisionMotto.motto);
  const [editVision, setEditVision] = useState(familyVisionMotto.vision);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('familyos_constitution_rules', JSON.stringify(rules));
      localStorage.setItem('familyos_family_vision_motto', JSON.stringify(familyVisionMotto));
    } catch {
      // Ignore
    }
  }, [rules, familyVisionMotto]);

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleText.trim()) return;

    const newRule: HouseRule = {
      id: `rule-${Date.now()}`,
      category: newCategory,
      rule: newRuleText.trim(),
      principle: newPrinciple.trim() || 'Family Growth & Harmony',
      addedBy: selectedPersona === 'OWNER' ? 'Sarah Jenkins (Owner)' : selectedPersona === 'ADMIN' ? 'David Jenkins (Admin)' : 'Family Member',
    };

    setRules((prev) => [newRule, ...prev]);
    setNewRuleText('');
    setNewPrinciple('');
    setIsAddModalOpen(false);
  };

  const handleDeleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const categories: Array<HouseRule['category']> = [
    'Communication & Respect',
    'Daily Habits',
    'Home Care & Cleanliness',
    'Digital Wellness & Boundaries',
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#173D35] to-[#0A1E19] text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-emerald-900/40">
        <div className="space-y-2 relative z-10">
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#E5C388] uppercase tracking-wider">
            <Scale className="w-4 h-4" />
            <span>Family Constitution & Principles</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold">The Family Constitution & House Rules</h2>
          <p className="text-xs sm:text-sm text-emerald-100/80 max-w-xl">
            Our ratified family preamble, core values, daily habits, and house guidelines. A shared moral compass for intentional living.
          </p>
        </div>
        <div className="relative z-10 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-[#C39A60] hover:bg-[#d4ab71] text-[#173D35] text-xs font-bold flex items-center space-x-2 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Rule</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center space-x-2 shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Constitution Poster</span>
          </button>
        </div>
      </div>

      {/* Family Vision, Motto & Core Values Section */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-emerald-900 to-[#0A1E19] text-white shadow-lg space-y-6 max-w-3xl mx-auto border border-emerald-800/50">
        <div className="flex items-center justify-between border-b border-white/15 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#C39A60]/20 border border-[#C39A60]/50 flex items-center justify-center font-bold text-[#E5C388]">
              🌟
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold text-white">Family Vision & Core Motto</h3>
              <p className="text-xs text-emerald-200/80">Our guiding North Star and generational purpose</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsEditingVision(!isEditingVision)}
              className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditingVision ? 'Done Editing' : 'Edit'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              title={isMinimized ? 'Expand section' : 'Minimize section'}
            >
              <span>{isMinimized ? '▼ Expand' : '▲ Minimize'}</span>
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {isEditingVision ? (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-[#E5C388] mb-1">Family Motto</label>
              <input
                type="text"
                value={editMotto}
                onChange={(e) => setEditMotto(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#C39A60]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#E5C388] mb-1">Family Vision Statement</label>
              <textarea
                rows={3}
                value={editVision}
                onChange={(e) => setEditVision(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#C39A60]"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setFamilyVisionMotto((prev: any) => ({ ...prev, motto: editMotto, vision: editVision }));
                  setIsEditingVision(false);
                }}
                className="px-5 py-2 rounded-xl bg-[#C39A60] text-[#173D35] font-bold hover:bg-[#d4ab71] transition-colors cursor-pointer"
              >
                Save Vision & Motto
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-center sm:text-left">
            <div className="bg-white/10 rounded-2xl p-4 border border-white/10 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#E5C388]">Official Family Motto</span>
              <p className="text-base font-serif font-bold text-white">“{familyVisionMotto.motto}”</p>
            </div>

            <div className="bg-white/10 rounded-2xl p-4 border border-white/10 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#E5C388]">Generational Vision Statement</span>
              <p className="text-xs sm:text-sm font-serif italic text-emerald-100 leading-relaxed">
                “{familyVisionMotto.vision}”
              </p>
            </div>
          </div>
        )}
          </>
        )}
      </div>

      {/* Preamble Card */}
      <div className="rounded-3xl p-8 bg-white border border-stone-200 shadow-xs space-y-4 text-center max-w-3xl mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-emerald-950 text-[#E5C388] font-serif text-xl font-bold flex items-center justify-center mx-auto">
          📜
        </div>
        <h3 className="text-xl font-serif font-bold text-stone-900">The Jenkins Family Preamble</h3>
        <p className="text-sm font-serif italic text-stone-700 leading-relaxed max-w-2xl mx-auto">
          “We, the members of {workspaceData?.workspace?.name || 'our household'}, unite with a shared commitment to love unconditionally, practice daily stewardship, encourage one another in our goals, and build a peaceful sanctuary of growth, faith, and joy.”
        </p>
        <div className="pt-2 flex flex-wrap justify-center gap-2">
          {['Stewardship', 'Kindness', 'Curiosity', 'Generational Unity'].map((v, i) => (
            <span key={i} className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200">
              ✦ {v}
            </span>
          ))}
        </div>
      </div>

      {/* Rules Categorized Grid */}
      <div className="space-y-6">
        {categories.map((cat) => {
          const catRules = rules.filter((r) => r.category === cat);
          return (
            <div key={cat} className="rounded-3xl p-6 bg-white border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-[#173D35]" />
                  <h3 className="font-serif font-bold text-lg text-stone-900">{cat}</h3>
                </div>
                <span className="text-xs font-mono font-bold text-stone-500">{catRules.length} Rules</span>
              </div>

              {catRules.length === 0 ? (
                <p className="text-xs text-stone-400 italic">No rules added in this category yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {catRules.map((r) => (
                    <div key={r.id} className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col justify-between space-y-2.5">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 uppercase">
                            {r.principle}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(r.id)}
                            className="p-1 text-stone-400 hover:text-rose-600 cursor-pointer transition-colors"
                            title="Delete Rule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-sm font-serif text-stone-900 leading-relaxed pt-1">“{r.rule}”</p>
                      </div>
                      <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px] text-stone-500">
                        <span>Added by: {r.addedBy}</span>
                        <span className="text-emerald-800 font-semibold">Active Principle</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Rule Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-stone-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="font-serif font-bold text-lg text-stone-900">Add House Rule or Principle</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddRule} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-800 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-semibold"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">Core Principle / Value Keyword</label>
                <input
                  type="text"
                  required
                  value={newPrinciple}
                  onChange={(e) => setNewPrinciple(e.target.value)}
                  placeholder="e.g. Mutual Respect & Grace"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">House Rule Statement *</label>
                <textarea
                  rows={3}
                  required
                  value={newRuleText}
                  onChange={(e) => setNewRuleText(e.target.value)}
                  placeholder="State the rule clearly and constructively..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#173D35] hover:bg-emerald-950 text-white font-bold"
                >
                  Save House Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
