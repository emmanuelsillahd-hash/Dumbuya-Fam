import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { formatCents, toBigIntOrZero } from '../utils/financeFormatting';

export interface ContributionItem {
  id: string;
  amountCents?: number;
  amountCentsDecimal?: string;
  notes?: string;
  contributedBy?: string;
  contributedAt?: string;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetCents?: number;
  targetCentsDecimal?: string;
  currentCents?: number;
  currentCentsDecimal?: string;
  targetDate?: string;
  progressPercentage?: number;
  suggestedMonthlyContributionCents?: number;
  suggestedMonthlyContributionCentsDecimal?: string;
  plannedMonthlyContributionCents?: number;
  plannedMonthlyContributionCentsDecimal?: string;
  linkedAccountId?: string;
  contributions?: ContributionItem[];
}

export interface SavingsGoalsCardProps {
  goal: SavingsGoal;
  brandBorder: string;
  onCheckOff: (goal: SavingsGoal) => void;
}

export const SavingsGoalsCard: React.FC<SavingsGoalsCardProps> = ({
  goal,
  brandBorder,
  onCheckOff,
}) => {
  const targetBig = toBigIntOrZero(goal.targetCentsDecimal, goal.targetCents);
  const currentBig = toBigIntOrZero(goal.currentCentsDecimal, goal.currentCents);
  const pct =
    goal.progressPercentage ??
    (targetBig > 0n ? Math.min(100, Number((currentBig * 100n) / targetBig)) : 0);
  const remainingBig = targetBig > currentBig ? targetBig - currentBig : 0n;
  const contribs = goal.contributions || [];

  return (
    <div
      className="rounded-2xl p-6 bg-white border space-y-4 shadow-xs transition-all hover:shadow-md"
      style={{ borderColor: brandBorder }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span className="font-semibold text-emerald-800">Savings Reserve Goal</span>
            {goal.targetDate && (
              <>
                <span aria-hidden="true">·</span>
                <span>Target Date: {new Date(goal.targetDate).toLocaleDateString()}</span>
              </>
            )}
          </div>
          <h3 className="text-lg font-serif font-bold text-stone-900 mt-0.5">{goal.title}</h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-lg font-mono font-bold text-emerald-900">
              {formatCents(goal.currentCentsDecimal ?? goal.currentCents)}{' '}
              <span className="text-xs font-normal text-stone-500">
                / {formatCents(goal.targetCentsDecimal ?? goal.targetCents)} ({pct}%)
              </span>
            </div>
            <span className="text-[11px] text-stone-500">
              Remaining to Goal: {formatCents(remainingBig)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onCheckOff(goal)}
            className="px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Check Off</span>
          </button>
        </div>
      </div>

      {/* Goal Progress Bar */}
      <div className="w-full h-2.5 rounded-full bg-stone-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-700 transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>

      {/* Monthly Installment Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200">
          <span className="text-[11px] text-amber-900 block font-semibold">
            Suggested Monthly Contribution (Ceiling Formula)
          </span>
          <span className="text-sm font-mono font-bold text-amber-950">
            {formatCents(
              goal.suggestedMonthlyContributionCentsDecimal ?? goal.suggestedMonthlyContributionCents
            )}{' '}
            / month
          </span>
          <span className="block text-[10px] text-amber-800 mt-0.5">
            Advisory guidance only · Not a completed payment
          </span>
        </div>
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
          <span className="text-[11px] text-stone-600 block font-semibold">
            Planned Monthly Allocation Target
          </span>
          <span className="text-sm font-mono font-bold text-stone-900">
            {formatCents(
              goal.plannedMonthlyContributionCentsDecimal ?? goal.plannedMonthlyContributionCents ?? 0
            )}{' '}
            / month
          </span>
          <span className="block text-[10px] text-stone-500 mt-0.5">
            Linked Reserve Account: {goal.linkedAccountId || 'acc-2'}
          </span>
        </div>
      </div>

      {/* Contribution History */}
      <div className="pt-2 border-t border-stone-100 space-y-2 text-xs">
        <h4 className="font-semibold text-stone-800">
          Recorded Contribution History ({contribs.length})
        </h4>
        {contribs.length === 0 ? (
          <p className="text-stone-500 text-[11px]">No recorded contributions yet.</p>
        ) : (
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {contribs.map((c: any) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between py-1.5 px-3 rounded-lg bg-stone-50 border border-stone-200 text-xs"
              >
                <div>
                  <span className="font-medium text-stone-900">{c.notes || 'Savings deposit'}</span>
                  <span className="text-stone-500 ml-2">
                    · {c.contributedBy || 'Member'} · {c.contributedAt ? new Date(c.contributedAt).toLocaleDateString() : 'Recent'}
                  </span>
                </div>
                <span className="font-mono font-bold text-emerald-800">
                  +{formatCents(c.amountCentsDecimal ?? c.amountCents)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
