/**
 * FAMILYOS — AUTHORITATIVE FINANCIAL DATA MODELS & CALCULATION ENGINE
 * Exact 64-bit integer cents (Long) & fixed-precision microshares (10^6).
 * 
 * Rules:
 * 1. Floating-point arithmetic is strictly forbidden for money.
 * 2. 1 whole share = 1,000,000 microshares.
 * 3. Double-entry / transfer integrity: Net household impact = 0 cents.
 * 4. Audit reversals: Original records immutable; compensating reversal records posted.
 */

export interface FinancialAccount {
  id: string;
  familyId: string;
  name: string;
  accountType: 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'INVESTMENT' | 'CASH' | 'LOAN';
  currentBalanceCents: number; // Signed integer cents
  isLiability: boolean;
  institution: string;
  currency: string;
  isArchived: boolean;
  lastReconciledAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface FinancialTransaction {
  id: string;
  familyId: string;
  accountId: string;
  destinationAccountId?: string | null;
  title: string;
  amountCents: number; // Positive integer cents
  transactionType: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  category: string;
  transactionDate: number;
  isCleared: boolean;
  isReversal: boolean;
  reversalOfId?: string | null;
  paidBy: string;
  notes?: string;
  idempotencyKey?: string;
  createdAt: number;
}

export interface EnvelopeBudget {
  id: string;
  familyId: string;
  category: string;
  allocatedCents: number;
  spentCents: number;
  alertThresholdPercentage: number;
  status: 'NORMAL' | 'WARNING' | 'OVER_BUDGET';
  monthEpoch: number;
  updatedAt: number;
}

export interface SavingsContribution {
  id: string;
  goalId: string;
  amountCents: number;
  fundingAccountId?: string | null;
  notes?: string;
  contributedBy: string;
  contributedAt: number;
}

export interface SavingsGoal {
  id: string;
  familyId: string;
  linkedAccountId?: string | null;
  title: string;
  targetCents: number;
  currentCents: number;
  plannedMonthlyContributionCents: number;
  targetDate?: number | null;
  isCompleted: boolean;
  suggestedMonthlyContributionCents: number;
  contributions?: SavingsContribution[];
  createdAt: number;
  updatedAt: number;
}

export interface RecurringRule {
  id: string;
  familyId: string;
  accountId: string;
  title: string;
  amountCents: number;
  transactionType: 'INCOME' | 'EXPENSE';
  category: string;
  recurrenceInterval: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  nextDueDate: number;
  isActive: boolean;
  isAutoPay: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface InvestmentHolding {
  id: string;
  familyId: string;
  accountId: string;
  symbol: string;
  assetName: string;
  assetType: 'STOCK' | 'ETF' | 'CRYPTO' | 'MUTUAL_FUND' | 'BOND' | 'RETIREMENT';
  quantityMicroshares: number; // 1 share = 1,000,000 microshares
  costBasisCents: number; // Total cost in integer cents
  currentPriceCents: number; // Price per 1.0 whole share in integer cents
  currency: string;
  notes?: string | null;
  lastPriceUpdatedAt: number;
  currentValuationCents: number;
  unrealizedGainLossCents: number;
  gainLossBasisPoints: number; // 100 bps = 1.00%
  version: number;
  isDeleted: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AccountReconciliation {
  id: string;
  familyId: string;
  accountId: string;
  statementDate: number;
  statementEndingBalanceCents: number;
  ledgerBalanceCents: number;
  discrepancyCents: number;
  isReconciled: boolean;
  reconciledBy: string;
  reconciledAt: number;
}

export interface CashFlowSummary {
  // Actual Recorded Money (Cleared Ledger Transactions)
  actualIncomeCents: number;
  actualExpenseCents: number;
  actualNetCashFlowCents: number;
  
  // Total Balances Across Accounts
  totalAssetsCents: number;
  totalLiabilitiesCents: number;
  netWorthCents: number;
  
  // Projected Recurring Cash Flow
  projectedMonthlyRecurringIncomeCents: number;
  projectedMonthlyRecurringExpenseCents: number;
  plannedVariableExpensesCents: number;
  availablePlannedCashFlowCents: number;
  plannedAllocationsCents: number;
  discretionaryMarginCents: number;
}

// ============================================================================
// DETERMINISTIC INTEGER-CENTS MATHEMATICAL FORMULAS
// ============================================================================

export function computeInvestmentValuation(quantityMicroshares: number | bigint | string, currentPriceCents: number | bigint | string): number {
  const q = BigInt(quantityMicroshares);
  const p = BigInt(currentPriceCents);
  if (q <= 0n || p <= 0n) return 0;
  return Number((q * p) / 1000000n);
}

export function computeInvestmentValuationBigInt(quantityMicroshares: number | bigint | string, currentPriceCents: number | bigint | string): bigint {
  const q = BigInt(quantityMicroshares);
  const p = BigInt(currentPriceCents);
  if (q <= 0n || p <= 0n) return 0n;
  return (q * p) / 1000000n;
}

export function computeUnrealizedGainLoss(currentValuationCents: number | bigint | string, costBasisCents: number | bigint | string): number {
  return Number(BigInt(currentValuationCents) - BigInt(costBasisCents));
}

export function computeUnrealizedGainLossBigInt(currentValuationCents: number | bigint | string, costBasisCents: number | bigint | string): bigint {
  return BigInt(currentValuationCents) - BigInt(costBasisCents);
}

export function computeGainLossBasisPoints(unrealizedGainLossCents: number | bigint | string, costBasisCents: number | bigint | string): number {
  const basis = BigInt(costBasisCents);
  if (basis <= 0n) return 0;
  const gain = BigInt(unrealizedGainLossCents);
  return Number((gain * 10000n) / basis);
}

export function computeGainLossBasisPointsBigInt(unrealizedGainLossCents: number | bigint | string, costBasisCents: number | bigint | string): bigint {
  const basis = BigInt(costBasisCents);
  if (basis <= 0n) return 0n;
  const gain = BigInt(unrealizedGainLossCents);
  return (gain * 10000n) / basis;
}

export function computeSuggestedMonthlyContribution(targetCents: number, currentCents: number, targetDate?: number | null): number {
  const targetBig = BigInt(Math.trunc(targetCents));
  const currentBig = BigInt(Math.trunc(currentCents));
  const remainingBig = targetBig > currentBig ? targetBig - currentBig : 0n;
  if (remainingBig === 0n) return 0;
  if (!targetDate || targetDate <= Date.now()) return Number(remainingBig);

  const msRemaining = targetDate - Date.now();
  const monthsRemaining = BigInt(Math.max(1, Math.ceil(msRemaining / (30.4375 * 24 * 3600 * 1000))));
  // Ceiling integer division in BigInt: (remainingBig + monthsRemaining - 1n) / monthsRemaining
  return Number((remainingBig + monthsRemaining - 1n) / monthsRemaining);
}

export function computeBudgetStatus(allocatedCents: number, spentCents: number, alertThresholdPercentage = 85): {
  status: 'NORMAL' | 'WARNING' | 'OVER_BUDGET';
  spentPercentage: number;
} {
  const allocBig = BigInt(Math.trunc(allocatedCents));
  const spentBig = BigInt(Math.trunc(spentCents));
  if (allocBig <= 0n) {
    return {
      status: spentBig > 0n ? 'OVER_BUDGET' : 'NORMAL',
      spentPercentage: spentBig > 0n ? 100 : 0,
    };
  }

  const spentPercentage = Number((spentBig * 100n) / allocBig);
  let status: 'NORMAL' | 'WARNING' | 'OVER_BUDGET' = 'NORMAL';
  if (spentBig >= allocBig) {
    status = 'OVER_BUDGET';
  } else if (spentPercentage >= 80 || spentPercentage >= alertThresholdPercentage) {
    status = 'WARNING';
  }
  return { status, spentPercentage };
}

export function computeNextDueDate(interval: RecurringRule['recurrenceInterval'], currentDueDate: number): number {
  const date = new Date(currentDueDate);
  const dayMs = 24 * 3600 * 1000;

  switch (interval) {
    case 'DAILY':
      return currentDueDate + dayMs;
    case 'WEEKLY':
      return currentDueDate + 7 * dayMs;
    case 'BIWEEKLY':
      return currentDueDate + 14 * dayMs;
    case 'MONTHLY': {
      const targetMonth = date.getMonth() + 1;
      const targetYear = date.getFullYear() + (targetMonth > 11 ? 1 : 0);
      const normalizedMonth = targetMonth % 12;
      const originalDay = date.getDate();
      const lastDayOfTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
      const clampedDay = Math.min(originalDay, lastDayOfTargetMonth);
      const nextDate = new Date(targetYear, normalizedMonth, clampedDay, date.getHours(), date.getMinutes(), date.getSeconds());
      return nextDate.getTime();
    }
    case 'QUARTERLY': {
      const targetMonth = date.getMonth() + 3;
      const targetYear = date.getFullYear() + Math.floor(targetMonth / 12);
      const normalizedMonth = targetMonth % 12;
      const originalDay = date.getDate();
      const lastDayOfTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
      const clampedDay = Math.min(originalDay, lastDayOfTargetMonth);
      const nextDate = new Date(targetYear, normalizedMonth, clampedDay, date.getHours(), date.getMinutes(), date.getSeconds());
      return nextDate.getTime();
    }
    case 'ANNUAL': {
      const targetYear = date.getFullYear() + 1;
      const originalMonth = date.getMonth();
      const originalDay = date.getDate();
      const lastDayOfTargetMonth = new Date(targetYear, originalMonth + 1, 0).getDate();
      const clampedDay = Math.min(originalDay, lastDayOfTargetMonth);
      const nextDate = new Date(targetYear, originalMonth, clampedDay, date.getHours(), date.getMinutes(), date.getSeconds());
      return nextDate.getTime();
    }
    default:
      return currentDueDate + 30 * dayMs;
  }
}

// ============================================================================
// IN-MEMORY FINANCE STORE REPOSITORY (Family-Scoped)
// ============================================================================

export interface FamilyFinanceStore {
  savingsGoals: Map<string, SavingsGoal>;
  recurringRules: Map<string, RecurringRule>;
  investmentHoldings: Map<string, InvestmentHolding>;
  reconciliations: Map<string, AccountReconciliation>;
}

const financeStoresByFamily = new Map<string, FamilyFinanceStore>();

export function getFinanceStore(familyId: string): FamilyFinanceStore {
  let store = financeStoresByFamily.get(familyId);
  if (!store) {
    store = {
      savingsGoals: new Map(),
      recurringRules: new Map(),
      investmentHoldings: new Map(),
      reconciliations: new Map(),
    };
    financeStoresByFamily.set(familyId, store);
    seedDefaultFinanceData(familyId, store);
  }
  return store;
}

export function resetFinanceStore(familyId: string): FamilyFinanceStore {
  financeStoresByFamily.delete(familyId);
  return getFinanceStore(familyId);
}

function seedDefaultFinanceData(familyId: string, store: FamilyFinanceStore) {
  const now = Date.now();
  const dayMs = 24 * 3600 * 1000;

  // 1. Savings Goals
  const g1: SavingsGoal = {
    id: 'goal-emergency-fund',
    familyId,
    linkedAccountId: 'acc-2',
    title: '6-Month Emergency Reserve',
    targetCents: 3000000, // $30,000.00
    currentCents: 2450000, // $24,500.00
    plannedMonthlyContributionCents: 50000, // $500.00
    targetDate: now + 120 * dayMs,
    isCompleted: false,
    suggestedMonthlyContributionCents: computeSuggestedMonthlyContribution(3000000, 2450000, now + 120 * dayMs),
    contributions: [
      {
        id: 'contrib-em-1',
        goalId: 'goal-emergency-fund',
        amountCents: 150000,
        fundingAccountId: 'acc-1',
        notes: 'Quarterly household reserve allocation',
        contributedBy: 'Sarah Henderson',
        contributedAt: now - 30 * dayMs,
      },
      {
        id: 'contrib-em-2',
        goalId: 'goal-emergency-fund',
        amountCents: 50000,
        fundingAccountId: 'acc-1',
        notes: 'Monthly reserve deposit',
        contributedBy: 'David Henderson',
        contributedAt: now - 10 * dayMs,
      },
    ],
    createdAt: now - 90 * dayMs,
    updatedAt: now,
  };
  const g2: SavingsGoal = {
    id: 'goal-college-fund',
    familyId,
    linkedAccountId: 'acc-2',
    title: 'Children College Tuition Reserve',
    targetCents: 5000000, // $50,000.00
    currentCents: 1850000, // $18,500.00
    plannedMonthlyContributionCents: 35000, // $350.00
    targetDate: now + 365 * dayMs,
    isCompleted: false,
    suggestedMonthlyContributionCents: computeSuggestedMonthlyContribution(5000000, 1850000, now + 365 * dayMs),
    contributions: [
      {
        id: 'contrib-col-1',
        goalId: 'goal-college-fund',
        amountCents: 100000,
        fundingAccountId: 'acc-1',
        notes: 'Annual 529 tuition contribution',
        contributedBy: 'Sarah Henderson',
        contributedAt: now - 45 * dayMs,
      },
    ],
    createdAt: now - 60 * dayMs,
    updatedAt: now,
  };
  store.savingsGoals.set(g1.id, g1);
  store.savingsGoals.set(g2.id, g2);

  // Seed initial statement reconciliation
  store.reconciliations.set('rec-init-acc-1', {
    id: 'rec-init-acc-1',
    familyId,
    accountId: 'acc-1',
    statementDate: now - 7 * dayMs,
    statementEndingBalanceCents: 845250,
    ledgerBalanceCents: 845250,
    discrepancyCents: 0,
    isReconciled: true,
    reconciledBy: 'Sarah Henderson',
    reconciledAt: now - 7 * dayMs,
  });

  // 2. Recurring Rules
  const r1: RecurringRule = {
    id: 'rec-salary-david',
    familyId,
    accountId: 'acc-1',
    title: 'Primary Tech Salary Deposit',
    amountCents: 425000, // $4,250.00
    transactionType: 'INCOME',
    category: 'SALARY',
    recurrenceInterval: 'BIWEEKLY',
    nextDueDate: now + 6 * dayMs,
    isActive: true,
    isAutoPay: false,
    createdAt: now - 30 * dayMs,
    updatedAt: now,
  };
  const r2: RecurringRule = {
    id: 'rec-mortgage-housing',
    familyId,
    accountId: 'acc-1',
    title: 'Residential Mortgage Payment',
    amountCents: 215000, // $2,150.00
    transactionType: 'EXPENSE',
    category: 'HOUSING',
    recurrenceInterval: 'MONTHLY',
    nextDueDate: now + 12 * dayMs,
    isActive: true,
    isAutoPay: true,
    createdAt: now - 30 * dayMs,
    updatedAt: now,
  };
  const r3: RecurringRule = {
    id: 'rec-fiber-internet',
    familyId,
    accountId: 'acc-1',
    title: 'High-Speed Fiber Internet',
    amountCents: 8500, // $85.00
    transactionType: 'EXPENSE',
    category: 'UTILITIES',
    recurrenceInterval: 'MONTHLY',
    nextDueDate: now + 18 * dayMs,
    isActive: true,
    isAutoPay: true,
    createdAt: now - 30 * dayMs,
    updatedAt: now,
  };
  store.recurringRules.set(r1.id, r1);
  store.recurringRules.set(r2.id, r2);
  store.recurringRules.set(r3.id, r3);

  // 3. Investment Holdings (INV-01)
  // Reconciled with verified Phase 1 fixtures:
  // AAPL: 1.500000 shares @ $225.00/share, Cost $300.00
  const inv1Val = computeInvestmentValuation(1500000, 22500);
  const inv1Gain = computeUnrealizedGainLoss(inv1Val, 30000);
  const inv1: InvestmentHolding = {
    id: 'inv-aapl',
    familyId,
    accountId: 'acc-3',
    symbol: 'AAPL',
    assetName: 'Apple Inc.',
    assetType: 'STOCK',
    quantityMicroshares: 1500000,
    costBasisCents: 30000,
    currentPriceCents: 22500,
    currency: 'USD',
    notes: 'Long-term family tech holding',
    lastPriceUpdatedAt: now,
    currentValuationCents: inv1Val,
    unrealizedGainLossCents: inv1Gain,
    gainLossBasisPoints: computeGainLossBasisPoints(inv1Gain, 30000),
    version: 1,
    isDeleted: false,
    createdAt: now - 90 * dayMs,
    updatedAt: now,
  };

  // VTI: 50.250000 shares @ $240.00/share, Cost $11,000.00
  const inv2Val = computeInvestmentValuation(50250000, 24000);
  const inv2Gain = computeUnrealizedGainLoss(inv2Val, 1100000);
  const inv2: InvestmentHolding = {
    id: 'inv-vti',
    familyId,
    accountId: 'acc-3',
    symbol: 'VTI',
    assetName: 'Vanguard Total Stock Market ETF',
    assetType: 'ETF',
    quantityMicroshares: 50250000,
    costBasisCents: 1100000,
    currentPriceCents: 24000,
    currency: 'USD',
    notes: 'Core broad-market index position',
    lastPriceUpdatedAt: now,
    currentValuationCents: inv2Val,
    unrealizedGainLossCents: inv2Gain,
    gainLossBasisPoints: computeGainLossBasisPoints(inv2Gain, 1100000),
    version: 1,
    isDeleted: false,
    createdAt: now - 180 * dayMs,
    updatedAt: now,
  };

  // BTC: 0.052000 BTC @ $65,000.00/whole BTC, Cost $3,000.00
  const inv3Val = computeInvestmentValuation(52000, 6500000);
  const inv3Gain = computeUnrealizedGainLoss(inv3Val, 300000);
  const inv3: InvestmentHolding = {
    id: 'inv-btc',
    familyId,
    accountId: 'acc-3',
    symbol: 'BTC',
    assetName: 'Bitcoin',
    assetType: 'CRYPTO',
    quantityMicroshares: 52000,
    costBasisCents: 300000,
    currentPriceCents: 6500000,
    currency: 'USD',
    notes: 'Sovereign digital reserve allocation',
    lastPriceUpdatedAt: now,
    currentValuationCents: inv3Val,
    unrealizedGainLossCents: inv3Gain,
    gainLossBasisPoints: computeGainLossBasisPoints(inv3Gain, 300000),
    version: 1,
    isDeleted: false,
    createdAt: now - 45 * dayMs,
    updatedAt: now,
  };

  store.investmentHoldings.set(inv1.id, inv1);
  store.investmentHoldings.set(inv2.id, inv2);
  store.investmentHoldings.set(inv3.id, inv3);
}
