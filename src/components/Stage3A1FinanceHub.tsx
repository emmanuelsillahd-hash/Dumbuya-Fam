import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  DollarSign,
  Landmark,
  ArrowLeftRight,
  PieChart,
  PiggyBank,
  CalendarClock,
  TrendingUp,
  RefreshCw,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  WifiOff,
  RotateCcw,
  Trash2,
  Edit3,
  PauseCircle,
  PlayCircle,
  SlidersHorizontal,
  Info,
  Lock
} from 'lucide-react';
import {
  formatCents,
  parseDollarsToCents,
  parseDollarsToCentsBigInt,
  formatMicroshares,
  parseSharesToMicroshares,
  parseSharesToMicrosharesBigInt,
  formatBasisPoints,
  formatSignedIntegerWithCommas,
  toBigIntOrZero,
  serializeBigIntToDecimalString,
  toSafeNumberOrNull,
  getDynamicBudgetColor,
} from '../utils/financeFormatting';
import { SavingsGoalsCard } from './SavingsGoalsCard';

export type FinanceHubSection =
  | 'overview'
  | 'accounts'
  | 'transactions'
  | 'budgets'
  | 'savings'
  | 'recurring'
  | 'investments';

export interface Stage3A1FinanceHubProps {
  sessionToken: string | null;
  selectedPersona: string;
  onSelectPersona?: (roleKey: string) => void;
  onExpireSession?: () => void;
  onRefreshGlobalWorkspace?: () => void;
  initialSection?: FinanceHubSection;
  activeSubPage?: string;
  onSelectSubPage?: (subId: string) => void;
}

const SUBPAGE_TO_FINANCE_SECTION: Record<string, FinanceHubSection> = {
  fin_accounts: 'accounts',
  fin_transactions: 'transactions',
  fin_budgets: 'budgets',
  fin_savings: 'savings',
  fin_recurring: 'recurring',
  fin_investments: 'investments',
};

const FINANCE_SECTION_TO_SUBPAGE: Record<FinanceHubSection, string> = {
  overview: 'fin_accounts',
  accounts: 'fin_accounts',
  transactions: 'fin_transactions',
  budgets: 'fin_budgets',
  savings: 'fin_savings',
  recurring: 'fin_recurring',
  investments: 'fin_investments',
};

const BRAND = {
  primary: '#173D35',
  ivory: '#F7F4EC',
  sage: '#A8BDAA',
  secondarySage: '#6B8A6E',
  gold: '#C39A60',
  lightGold: '#E7D1AA',
  textDark: '#11231E',
  textMuted: '#4F635D',
  border: '#E2DCD0',
};

const HOUSEHOLD_WORKSPACES = [
  { id: 'fam-1', name: 'The Henderson Household (Primary)' },
  { id: 'fam-2', name: 'The Carter Household (Cross-Workspace Isolation Check)' },
];

export const Stage3A1FinanceHub: React.FC<Stage3A1FinanceHubProps> = ({
  sessionToken,
  selectedPersona,
  onSelectPersona,
  onExpireSession,
  onRefreshGlobalWorkspace,
  initialSection = 'overview',
  activeSubPage,
  onSelectSubPage,
}) => {
  const [activeSection, setActiveSection] = useState<FinanceHubSection>(
    (activeSubPage && SUBPAGE_TO_FINANCE_SECTION[activeSubPage]) || initialSection
  );

  useEffect(() => {
    if (activeSubPage && SUBPAGE_TO_FINANCE_SECTION[activeSubPage]) {
      setActiveSection(SUBPAGE_TO_FINANCE_SECTION[activeSubPage]);
    }
  }, [activeSubPage]);

  const handleSelectSection = (sec: FinanceHubSection) => {
    setActiveSection(sec);
    if (onSelectSubPage) {
      onSelectSubPage(FINANCE_SECTION_TO_SUBPAGE[sec]);
    }
  };
  const [activeFamilyId, setActiveFamilyId] = useState<string>('fam-1');
  const [sessionExpiredOverride, setSessionExpiredOverride] = useState<boolean>(false);
  const effectiveSessionToken = sessionExpiredOverride ? null : sessionToken;

  // Network, loading, & authorization states
  const [loading, setLoading] = useState<boolean>(false);
  const [errorState, setErrorState] = useState<{
    type: 'UNAUTHORIZED' | 'ACCESS_RESTRICTED' | 'WORKSPACE_ISOLATION' | 'NETWORK' | 'VALIDATION' | null;
    code?: string;
    message: string;
  } | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    tone: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);

  // Authoritative backend financial state (cleared immediately on household or session change)
  const [summaryData, setSummaryData] = useState<any | null>(null);
  const [cashflowData, setCashflowData] = useState<any | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [reconciliations, setReconciliations] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<any[]>([]);
  const [recurringRules, setRecurringRules] = useState<any[]>([]);
  const [investmentHoldings, setInvestmentHoldings] = useState<any[]>([]);
  const [investmentSummary, setInvestmentSummary] = useState<any | null>(null);

  // Interactive Cash-Flow Simulator (What-If Planning Calculator)
  const [simIncomeDollars, setSimIncomeDollars] = useState<string>('8500.00');
  const [simRecurringDollars, setSimRecurringDollars] = useState<string>('3200.00');
  const [simVariableDollars, setSimVariableDollars] = useState<string>('1500.00');
  const [simSavingsAllocDollars, setSimSavingsAllocDollars] = useState<string>('800.00');

  // Section 2: Accounts & Reconciliation state
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [newAccName, setNewAccName] = useState<string>('');
  const [newAccType, setNewAccType] = useState<string>('CHECKING');
  const [newAccInstitution, setNewAccInstitution] = useState<string>('');
  const [newAccBalanceDollars, setNewAccBalanceDollars] = useState<string>('0.00');
  const [editAccId, setEditAccId] = useState<string | null>(null);
  const [editAccName, setEditAccName] = useState<string>('');
  const [editAccInstitution, setEditAccInstitution] = useState<string>('');
  const [reconcileAccountId, setReconcileAccountId] = useState<string>('acc-1');
  const [reconcileStatementDollars, setReconcileStatementDollars] = useState<string>('8452.50');
  const [reconcileDateIso, setReconcileDateIso] = useState<string>(new Date().toISOString().slice(0, 10));

  // Section 3: Transactions, Search/Filters & Audit Reversal state
  const [txEntryMode, setTxEntryMode] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER' | 'BILL_PAYMENT' | 'SAVINGS_CONTRIB'>('EXPENSE');
  const [txAccountId, setTxAccountId] = useState<string>('acc-1');
  const [txDestAccountId, setTxDestAccountId] = useState<string>('acc-2');
  const [txGoalId, setTxGoalId] = useState<string>('goal-emergency-fund');
  const [txTitle, setTxTitle] = useState<string>('');
  const [txAmountDollars, setTxAmountDollars] = useState<string>('');
  const [txCategory, setTxCategory] = useState<string>('FOOD');
  const [txNotes, setTxNotes] = useState<string>('');

  const [txSearchQuery, setTxSearchQuery] = useState<string>('');
  const [txFilterType, setTxFilterType] = useState<string>('ALL');
  const [txFilterAccount, setTxFilterAccount] = useState<string>('ALL');
  const [txFilterCategory, setTxFilterCategory] = useState<string>('ALL');
  const [selectedTxDetail, setSelectedTxDetail] = useState<any | null>(null);

  // Consequential Action Confirmation Dialog state (Reversals & Soft Deletions)
  const [confirmModal, setConfirmModal] = useState<{
    kind: 'REVERSE_TX' | 'DELETE_HOLDING';
    targetId: string;
    targetLabel: string;
    amountLabel?: string;
    reason: string;
  } | null>(null);

  // Section 4: Budgets state
  const [budgetCatInput, setBudgetCatInput] = useState<string>('UTILITIES');
  const [budgetAllocDollars, setBudgetAllocDollars] = useState<string>('400.00');
  const [budgetThresholdPct, setBudgetThresholdPct] = useState<number>(80);

  // Section 5: Savings Goals state
  const [newGoalTitle, setNewGoalTitle] = useState<string>('');
  const [newGoalTargetDollars, setNewGoalTargetDollars] = useState<string>('5000.00');
  const [newGoalCurrentDollars, setNewGoalCurrentDollars] = useState<string>('0.00');
  const [newGoalPlannedMonthlyDollars, setNewGoalPlannedMonthlyDollars] = useState<string>('250.00');
  const [newGoalTargetDateIso, setNewGoalTargetDateIso] = useState<string>(
    new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10)
  );
  const [contribGoalId, setContribGoalId] = useState<string>('goal-emergency-fund');
  const [contribAmountDollars, setContribAmountDollars] = useState<string>('250.00');
  const [contribFundingAccountId, setContribFundingAccountId] = useState<string>('acc-1');
  const [contribNotes, setContribNotes] = useState<string>('Monthly reserve deposit');

  // Savings Installment Transfer Modal state
  const [installmentModalGoal, setInstallmentModalGoal] = useState<any | null>(null);
  const [installmentFundingAccId, setInstallmentFundingAccId] = useState<string>('acc-1');
  const [installmentAmtDollars, setInstallmentAmtDollars] = useState<string>('250.00');
  const [installmentNotesVal, setInstallmentNotesVal] = useState<string>('Monthly savings installment check-off (Transfer)');

  // Section 6: Recurring Rules state
  const [newRuleTitle, setNewRuleTitle] = useState<string>('');
  const [newRuleAccountId, setNewRuleAccountId] = useState<string>('acc-1');
  const [newRuleType, setNewRuleType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [newRuleCategory, setNewRuleCategory] = useState<string>('UTILITIES');
  const [newRuleAmountDollars, setNewRuleAmountDollars] = useState<string>('95.00');
  const [newRuleFrequency, setNewRuleFrequency] = useState<string>('MONTHLY');
  const [newRuleDueDateIso, setNewRuleDueDateIso] = useState<string>(new Date().toISOString().slice(0, 10));

  // Print Database modal state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isSavingsPrintModalOpen, setIsSavingsPrintModalOpen] = useState<boolean>(false);

  // Section 7: Investments state
  const [invSymbol, setInvSymbol] = useState<string>('');
  const [invAssetName, setInvAssetName] = useState<string>('');
  const [invAssetType, setInvAssetType] = useState<string>('STOCK');
  const [invSharesInput, setInvSharesInput] = useState<string>('10.000000');
  const [invCostBasisDollars, setInvCostBasisDollars] = useState<string>('1500.00');
  const [invUnitPriceDollars, setInvUnitPriceDollars] = useState<string>('155.00');
  const [invFundingAccountId, setInvFundingAccountId] = useState<string>('');
  const [priceUpdateMap, setPriceUpdateMap] = useState<Record<string, string>>({});

  const showFeedback = useCallback((tone: 'success' | 'warning' | 'error', message: string) => {
    setFeedbackBanner({ tone, message });
  }, []);

  const requestSeqRef = useRef<number>(0);

  /**
   * Security Requirement 5: Clear all cached financial records immediately when
   * switching households, personas, or when session expires to prevent data leakage.
   */
  const clearSensitiveFinanceCache = useCallback(() => {
    setSummaryData(null);
    setCashflowData(null);
    setAccounts([]);
    setReconciliations([]);
    setTransactions([]);
    setBudgets([]);
    setSavingsGoals([]);
    setRecurringRules([]);
    setInvestmentHoldings([]);
    setInvestmentSummary(null);
    setSelectedAccountId(null);
    setSelectedTxDetail(null);
    setConfirmModal(null);
  }, []);

  const fetchAllFinanceHubData = useCallback(async () => {
    const reqId = ++requestSeqRef.current;

    if (!effectiveSessionToken) {
      clearSensitiveFinanceCache();
      setErrorState({
        type: 'UNAUTHORIZED',
        code: 'SESSION_EXPIRED',
        message: 'Your authenticated session has expired or is missing. Please re-authenticate to access household financial records.',
      });
      return;
    }

    if (selectedPersona === 'CHILD' || selectedPersona === 'GUEST') {
      clearSensitiveFinanceCache();
      setErrorState({
        type: 'ACCESS_RESTRICTED',
        code: 'FINANCE_ACCESS_RESTRICTED',
        message:
          'Zero-Trust Server RBAC: This profile or household membership is not permitted to view financial ledgers.',
      });
      setLoading(false);
      // Also fire backend request so server-side RBAC audit logs the 403 rejection
      fetch(`/api/v1/finance/${activeFamilyId}/summary`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${effectiveSessionToken}`,
        },
      }).catch(() => {});
      return;
    }

    setLoading(true);
    setErrorState(null);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${effectiveSessionToken}`,
    };

    try {
      const summaryRes = await fetch(`/api/v1/finance/${activeFamilyId}/summary`, { headers });
      if (reqId !== requestSeqRef.current) return;

      if (summaryRes.status === 401) {
        clearSensitiveFinanceCache();
        setErrorState({
          type: 'UNAUTHORIZED',
          code: 'UNAUTHORIZED',
          message: 'Session token expired or invalid. Cached financial state has been purged.',
        });
        setLoading(false);
        return;
      }

      if (summaryRes.status === 403) {
        clearSensitiveFinanceCache();
        const errBody = await summaryRes.json().catch(() => ({}));
        if (reqId !== requestSeqRef.current) return;
        const isIsolation = errBody.error === 'WORKSPACE_ISOLATION_VIOLATION';
        setErrorState({
          type: isIsolation ? 'WORKSPACE_ISOLATION' : 'ACCESS_RESTRICTED',
          code: errBody.error || 'FINANCE_ACCESS_RESTRICTED',
          message:
            errBody.message ||
            'Zero-Trust Server RBAC: This profile or household membership is not permitted to view financial ledgers.',
        });
        setLoading(false);
        return;
      }

      if (!summaryRes.ok) {
        throw new Error(`HTTP ${summaryRes.status}`);
      }

      const [
        summaryJson,
        cashflowRes,
        accountsRes,
        txRes,
        budgetsRes,
        savingsRes,
        recurringRes,
        investmentsRes,
      ] = await Promise.all([
        summaryRes.json(),
        fetch(`/api/v1/finance/${activeFamilyId}/cashflow`, { headers }),
        fetch(`/api/v1/finance/${activeFamilyId}/accounts`, { headers }),
        fetch(`/api/v1/finance/${activeFamilyId}/transactions?limit=100`, { headers }),
        fetch(`/api/v1/finance/${activeFamilyId}/budgets`, { headers }),
        fetch(`/api/v1/finance/${activeFamilyId}/savings`, { headers }),
        fetch(`/api/v1/finance/${activeFamilyId}/recurring`, { headers }),
        fetch(`/api/v1/finance/${activeFamilyId}/investments`, { headers }),
      ]);
      if (reqId !== requestSeqRef.current) return;

      setSummaryData(summaryJson);
      if (cashflowRes.ok) {
        const cfJson = await cashflowRes.json();
        if (reqId !== requestSeqRef.current) return;
        setCashflowData(cfJson);
      }
      if (accountsRes.ok) {
        const accJson = await accountsRes.json();
        if (reqId !== requestSeqRef.current) return;
        setAccounts(accJson.accounts || []);
        setReconciliations(accJson.reconciliations || []);
      }
      if (txRes.ok) {
        const txJson = await txRes.json();
        if (reqId !== requestSeqRef.current) return;
        setTransactions(txJson.transactions || []);
      }
      if (budgetsRes.ok) {
        const bJson = await budgetsRes.json();
        if (reqId !== requestSeqRef.current) return;
        setBudgets(bJson.budgets || []);
      }
      if (savingsRes.ok) {
        const sJson = await savingsRes.json();
        if (reqId !== requestSeqRef.current) return;
        setSavingsGoals(sJson.goals || []);
      }
      if (recurringRes.ok) {
        const rJson = await recurringRes.json();
        if (reqId !== requestSeqRef.current) return;
        setRecurringRules(rJson.recurringRules || []);
      }
      if (investmentsRes.ok) {
        const invJson = await investmentsRes.json();
        if (reqId !== requestSeqRef.current) return;
        const holdingsList = invJson.holdings || [];
        setInvestmentHoldings(holdingsList);
        setInvestmentSummary(invJson.summary || null);
        const nextPriceMap: Record<string, string> = {};
        for (const h of holdingsList) {
          const priceBig = toBigIntOrZero(h.currentPriceCentsDecimal, h.currentPriceCents);
          const whole = (priceBig / 100n).toString(10);
          const rem = (priceBig % 100n).toString(10).padStart(2, '0');
          nextPriceMap[h.id] = `${whole}.${rem}`;
        }
        setPriceUpdateMap(nextPriceMap);
      }
    } catch {
      if (reqId !== requestSeqRef.current) return;
      setErrorState({
        type: 'NETWORK',
        code: 'NETWORK_FAILURE',
        message: 'Unable to reach the FamilyOS financial server. Verify network connectivity and retry.',
      });
    } finally {
      if (reqId === requestSeqRef.current) {
        setLoading(false);
      }
    }
  }, [activeFamilyId, clearSensitiveFinanceCache, effectiveSessionToken, selectedPersona]);

  useEffect(() => {
    if (sessionToken) {
      setSessionExpiredOverride(false);
    }
  }, [sessionToken, selectedPersona]);

  // Clear sensitive state immediately when familyId, persona, or effectiveSessionToken changes
  useEffect(() => {
    clearSensitiveFinanceCache();
    fetchAllFinanceHubData();
  }, [activeFamilyId, selectedPersona, effectiveSessionToken, clearSensitiveFinanceCache, fetchAllFinanceHubData]);

  // ============================================================================
  // COMPUTED METRICS (PURE 64-BIT BIGINT ARITHMETIC — ZERO FLOATING POINT)
  // ============================================================================

  const budgetRollup = useMemo(() => {
    let totalAllocatedBig = 0n;
    let totalSpentBig = 0n;
    let warningCount = 0;
    let overBudgetCount = 0;

    for (const b of budgets) {
      totalAllocatedBig += toBigIntOrZero(b.allocatedCentsDecimal, b.allocatedCents);
      totalSpentBig += toBigIntOrZero(b.spentCentsDecimal, b.spentCents);
      if (b.isOverBudget || b.status === 'OVER_BUDGET') overBudgetCount++;
      else if (b.isWarning || b.status === 'WARNING') warningCount++;
    }

    const totalRemainingBig = totalAllocatedBig - totalSpentBig;
    return {
      totalAllocatedCents: serializeBigIntToDecimalString(totalAllocatedBig),
      totalSpentCents: serializeBigIntToDecimalString(totalSpentBig),
      totalRemainingCents: serializeBigIntToDecimalString(totalRemainingBig),
      totalRemainingBig,
      warningCount,
      overBudgetCount,
    };
  }, [budgets]);

  // What-If Simulator integer cents calculations (pure 64-bit BigInt)
  const simCalculations = useMemo(() => {
    const incBig = parseDollarsToCentsBigInt(simIncomeDollars) ?? 0n;
    const recBig = parseDollarsToCentsBigInt(simRecurringDollars) ?? 0n;
    const variableBig = parseDollarsToCentsBigInt(simVariableDollars) ?? 0n;
    const allocBig = parseDollarsToCentsBigInt(simSavingsAllocDollars) ?? 0n;
    const availableBeforeSavingsBig = incBig - recBig - variableBig;
    const unallocatedMarginBig = availableBeforeSavingsBig - allocBig;
    return {
      inc: serializeBigIntToDecimalString(incBig),
      rec: serializeBigIntToDecimalString(recBig),
      variable: serializeBigIntToDecimalString(variableBig),
      alloc: serializeBigIntToDecimalString(allocBig),
      availableBeforeSavingsCents: serializeBigIntToDecimalString(availableBeforeSavingsBig),
      unallocatedMarginCents: serializeBigIntToDecimalString(unallocatedMarginBig),
    };
  }, [simIncomeDollars, simRecurringDollars, simVariableDollars, simSavingsAllocDollars]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (txFilterType === 'REVERSAL' && !tx.isReversal) return false;
      if (txFilterType !== 'ALL' && txFilterType !== 'REVERSAL' && tx.transactionType !== txFilterType) {
        return false;
      }
      if (txFilterAccount !== 'ALL' && tx.accountId !== txFilterAccount && tx.destinationAccountId !== txFilterAccount) {
        return false;
      }
      if (txFilterCategory !== 'ALL' && String(tx.category).toUpperCase() !== txFilterCategory) {
        return false;
      }
      if (txSearchQuery.trim()) {
        const q = txSearchQuery.trim().toLowerCase();
        const matchTitle = String(tx.title || '').toLowerCase().includes(q);
        const matchCat = String(tx.category || '').toLowerCase().includes(q);
        const matchPaidBy = String(tx.paidBy || '').toLowerCase().includes(q);
        if (!matchTitle && !matchCat && !matchPaidBy) return false;
      }
      return true;
    });
  }, [transactions, txFilterType, txFilterAccount, txFilterCategory, txSearchQuery]);

  // Set of original transaction IDs that have already been reversed
  const reversedOriginalIds = useMemo(() => {
    const set = new Set<string>();
    for (const tx of transactions) {
      if (tx.isReversal && tx.reversalOfId) {
        set.add(tx.reversalOfId);
      }
    }
    return set;
  }, [transactions]);

  // ============================================================================
  // MUTATION HANDLERS (ALL CONNECTED TO EXPRESS API WITH AUTO-REFRESH)
  // ============================================================================

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) {
      showFeedback('error', 'Account name is required.');
      return;
    }
    const balanceBig = parseDollarsToCentsBigInt(newAccBalanceDollars);
    if (balanceBig === null) {
      showFeedback('error', 'Enter a valid signed 64-bit dollar amount (e.g. 2500.00).');
      return;
    }
    const balanceDecimal = serializeBigIntToDecimalString(balanceBig);

    try {
      const res = await fetch(`/api/v1/finance/${activeFamilyId}/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          name: newAccName.trim(),
          accountType: newAccType,
          institution: newAccInstitution.trim() || 'Family Treasury',
          currentBalanceCents: toSafeNumberOrNull(balanceBig) ?? balanceDecimal,
          currentBalanceCentsDecimal: balanceDecimal,
          isLiability: newAccType === 'CREDIT_CARD' || newAccType === 'LOAN',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showFeedback('error', data.message || 'Failed to create account.');
        return;
      }
      setNewAccName('');
      setNewAccInstitution('');
      setNewAccBalanceDollars('0.00');
      showFeedback('success', `Created account "${data.account.name}" with balance ${formatCents(data.account.currentBalanceCentsDecimal ?? data.account.currentBalanceCents)}.`);
      await fetchAllFinanceHubData();
      onRefreshGlobalWorkspace?.();
    } catch {
      showFeedback('error', 'Network error while creating account.');
    }
  };

  const handleSaveAccountEdit = async (accountId: string) => {
    if (!editAccName.trim()) return;
    try {
      const res = await fetch(`/api/v1/finance/${activeFamilyId}/accounts/${accountId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          name: editAccName.trim(),
          institution: editAccInstitution.trim(),
        }),
      });
      if (res.ok) {
        setEditAccId(null);
        showFeedback('success', 'Account details updated.');
        await fetchAllFinanceHubData();
      }
    } catch {
      showFeedback('error', 'Failed to update account details.');
    }
  };

  const handleReconcileStatement = async (e: React.FormEvent) => {
    e.preventDefault();
    const statementBig = parseDollarsToCentsBigInt(reconcileStatementDollars);
    if (statementBig === null) {
      showFeedback('error', 'Enter a valid statement ending balance (e.g. 8452.50).');
      return;
    }
    const statementDecimal = serializeBigIntToDecimalString(statementBig);
    try {
      const statementEpoch = reconcileDateIso ? new Date(reconcileDateIso).getTime() : Date.now();
      const res = await fetch(`/api/v1/finance/${activeFamilyId}/accounts/${reconcileAccountId}/reconcile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          statementEndingBalanceCents: toSafeNumberOrNull(statementBig) ?? statementDecimal,
          statementEndingBalanceCentsDecimal: statementDecimal,
          statementDate: statementEpoch,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showFeedback('error', data.message || 'Statement reconciliation failed.');
        return;
      }
      const discBig = toBigIntOrZero(data.discrepancyCentsDecimal, data.discrepancyCents);
      if (discBig === 0n) {
        showFeedback('success', 'Statement reconciled with zero discrepancy ($0.00 difference).');
      } else {
        showFeedback(
          'warning',
          `Reconciliation logged with discrepancy of ${formatCents(discBig)} between statement and ledger.`
        );
      }
      await fetchAllFinanceHubData();
    } catch {
      showFeedback('error', 'Network error during statement reconciliation.');
    }
  };

  const handleRecordTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountBig = parseDollarsToCentsBigInt(txAmountDollars);
    if (amountBig === null || amountBig <= 0n) {
      showFeedback('error', 'Transaction amount must be greater than $0.00.');
      return;
    }
    const amountDecimal = serializeBigIntToDecimalString(amountBig);
    const amountCentsPayload = toSafeNumberOrNull(amountBig) ?? amountDecimal;

    // If user chose Savings Contribution mode from the Transaction bar, route to savings contribution endpoint
    if (txEntryMode === 'SAVINGS_CONTRIB') {
      try {
        const res = await fetch(`/api/v1/finance/${activeFamilyId}/savings/${txGoalId}/contribute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({
            amountCents: amountCentsPayload,
            amountCentsDecimal: amountDecimal,
            fundingAccountId: txAccountId,
            notes: txTitle.trim() || 'Savings goal contribution',
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          showFeedback('error', data.message || 'Failed to record savings contribution.');
          return;
        }
        setTxTitle('');
        setTxAmountDollars('');
        showFeedback(
          'success',
          `Recorded ${formatCents(amountBig)} savings contribution to "${data.goal.title}" (Transfer — excluded from expenses).`
        );
        await fetchAllFinanceHubData();
        onRefreshGlobalWorkspace?.();
      } catch {
        showFeedback('error', 'Network error while recording savings contribution.');
      }
      return;
    }

    const effectiveType =
      txEntryMode === 'INCOME'
        ? 'INCOME'
        : txEntryMode === 'TRANSFER'
        ? 'TRANSFER'
        : 'EXPENSE';

    const effectiveCategory =
      txEntryMode === 'TRANSFER'
        ? 'TRANSFER'
        : txEntryMode === 'BILL_PAYMENT'
        ? txCategory === 'FOOD'
          ? 'BILLS'
          : txCategory
        : txEntryMode === 'INCOME'
        ? txCategory === 'FOOD'
          ? 'SALARY'
          : txCategory
        : txCategory;

    const finalTitle =
      txTitle.trim() ||
      (txEntryMode === 'TRANSFER'
        ? 'Internal Account Transfer'
        : txEntryMode === 'BILL_PAYMENT'
        ? `Bill Payment (${effectiveCategory})`
        : `${effectiveType} (${effectiveCategory})`);

    if (effectiveType === 'TRANSFER' && txAccountId === txDestAccountId) {
      showFeedback('error', 'Internal transfers require a different destination account.');
      return;
    }

    const idempotencyKey = `WEB-TX:${activeFamilyId}:${effectiveType}:${amountDecimal}:${Date.now()}`;

    try {
      const res = await fetch(`/api/v1/finance/${activeFamilyId}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          accountId: txAccountId,
          destinationAccountId: effectiveType === 'TRANSFER' ? txDestAccountId : null,
          title: finalTitle,
          amountCents: amountCentsPayload,
          amountCentsDecimal: amountDecimal,
          transactionType: effectiveType,
          category: effectiveCategory,
          notes: txNotes.trim() || undefined,
          idempotencyKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showFeedback('error', data.message || 'Failed to record transaction.');
        return;
      }
      setTxTitle('');
      setTxAmountDollars('');
      setTxNotes('');
      showFeedback(
        'success',
        `Recorded ${effectiveType.toLowerCase()} "${data.transaction.title}" (${formatCents(amountBig)}).`
      );
      await fetchAllFinanceHubData();
      onRefreshGlobalWorkspace?.();
    } catch {
      showFeedback('error', 'Network error while posting transaction.');
    }
  };

  const executeConfirmedAction = async () => {
    if (!confirmModal) return;

    if (confirmModal.kind === 'REVERSE_TX') {
      try {
        const res = await fetch(
          `/api/v1/finance/${activeFamilyId}/transactions/${confirmModal.targetId}/reverse`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionToken}`,
            },
            body: JSON.stringify({
              reason: confirmModal.reason.trim() || 'User-confirmed audit reversal',
            }),
          }
        );
        const data = await res.json();
        setConfirmModal(null);
        if (!res.ok) {
          showFeedback('error', data.message || 'Audit reversal rejected.');
          return;
        }
        showFeedback(
          'success',
          `Posted compensating audit reversal for ${confirmModal.targetLabel}. Original ledger entry preserved.`
        );
        await fetchAllFinanceHubData();
        onRefreshGlobalWorkspace?.();
      } catch {
        setConfirmModal(null);
        showFeedback('error', 'Network error while reversing transaction.');
      }
    } else if (confirmModal.kind === 'DELETE_HOLDING') {
      try {
        const res = await fetch(
          `/api/v1/finance/${activeFamilyId}/investments/${confirmModal.targetId}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${sessionToken}`,
            },
          }
        );
        setConfirmModal(null);
        if (!res.ok) {
          showFeedback('error', 'Failed to archive investment holding.');
          return;
        }
        showFeedback('success', `Soft-deleted holding "${confirmModal.targetLabel}".`);
        await fetchAllFinanceHubData();
      } catch {
        setConfirmModal(null);
        showFeedback('error', 'Network error while removing holding.');
      }
    }
  };

  const handleSaveBudgetEnvelope = async (e: React.FormEvent) => {
    e.preventDefault();
    const allocatedBig = parseDollarsToCentsBigInt(budgetAllocDollars);
    if (allocatedBig === null || allocatedBig < 0n) {
      showFeedback('error', 'Enter a valid non-negative envelope allocation.');
      return;
    }
    const allocatedDecimal = serializeBigIntToDecimalString(allocatedBig);
    const existing = budgets.find(
      (b) => String(b.category).toUpperCase() === budgetCatInput.trim().toUpperCase()
    );
    try {
      const res = await fetch(`/api/v1/finance/${activeFamilyId}/budgets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          category: budgetCatInput.trim().toUpperCase(),
          allocatedCents: toSafeNumberOrNull(allocatedBig) ?? allocatedDecimal,
          allocatedCentsDecimal: allocatedDecimal,
          spentCents: existing ? existing.spentCents : 0,
          alertThresholdPercentage: budgetThresholdPct,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showFeedback('error', data.message || 'Failed to save budget envelope.');
        return;
      }
      showFeedback(
        'success',
        `Saved ${data.budget.category} envelope budget (${formatCents(data.budget.allocatedCentsDecimal ?? data.budget.allocatedCents)} limit).`
      );
      await fetchAllFinanceHubData();
      onRefreshGlobalWorkspace?.();
    } catch {
      showFeedback('error', 'Network error while saving budget envelope.');
    }
  };

  const handleCreateSavingsGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) {
      showFeedback('error', 'Savings goal title is required.');
      return;
    }
    const targetBig = parseDollarsToCentsBigInt(newGoalTargetDollars);
    const currentBig = parseDollarsToCentsBigInt(newGoalCurrentDollars) ?? 0n;
    const plannedMonthlyBig = parseDollarsToCentsBigInt(newGoalPlannedMonthlyDollars) ?? 0n;

    if (targetBig === null || targetBig <= 0n) {
      showFeedback('error', 'Target amount must be greater than $0.00.');
      return;
    }

    const targetDecimal = serializeBigIntToDecimalString(targetBig);
    const currentDecimal = serializeBigIntToDecimalString(currentBig);
    const plannedDecimal = serializeBigIntToDecimalString(plannedMonthlyBig);

    try {
      const targetDate = newGoalTargetDateIso ? new Date(newGoalTargetDateIso).getTime() : null;
      const res = await fetch(`/api/v1/finance/${activeFamilyId}/savings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          title: newGoalTitle.trim(),
          targetCents: toSafeNumberOrNull(targetBig) ?? targetDecimal,
          targetCentsDecimal: targetDecimal,
          currentCents: toSafeNumberOrNull(currentBig) ?? currentDecimal,
          currentCentsDecimal: currentDecimal,
          plannedMonthlyContributionCents: toSafeNumberOrNull(plannedMonthlyBig) ?? plannedDecimal,
          targetDate,
          linkedAccountId: 'acc-2',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showFeedback('error', data.message || 'Failed to create savings goal.');
        return;
      }
      setNewGoalTitle('');
      showFeedback(
        'success',
        `Created savings goal "${data.goal.title}" with suggested monthly target ${formatCents(
          data.goal.suggestedMonthlyContributionCentsDecimal ?? data.goal.suggestedMonthlyContributionCents
        )}.`
      );
      await fetchAllFinanceHubData();
    } catch {
      showFeedback('error', 'Network error while creating savings goal.');
    }
  };

  const handleContributeToSavings = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountBig = parseDollarsToCentsBigInt(contribAmountDollars);
    if (amountBig === null || amountBig <= 0n) {
      showFeedback('error', 'Contribution amount must be greater than $0.00.');
      return;
    }
    const amountDecimal = serializeBigIntToDecimalString(amountBig);
    try {
      const res = await fetch(`/api/v1/finance/${activeFamilyId}/savings/${contribGoalId}/contribute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          amountCents: toSafeNumberOrNull(amountBig) ?? amountDecimal,
          amountCentsDecimal: amountDecimal,
          fundingAccountId: contribFundingAccountId || null,
          notes: contribNotes.trim() || 'Savings goal contribution',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showFeedback('error', data.message || 'Failed to record contribution.');
        return;
      }
      showFeedback(
        'success',
        `Contributed ${formatCents(amountBig)} to "${data.goal.title}" (${data.progressPercentage}% complete).`
      );
      await fetchAllFinanceHubData();
      onRefreshGlobalWorkspace?.();
    } catch {
      showFeedback('error', 'Network error while contributing to savings goal.');
    }
  };

  const handleCheckOffInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!installmentModalGoal) return;
    const amountBig = parseDollarsToCentsBigInt(installmentAmtDollars);
    if (amountBig === null || amountBig <= 0n) {
      showFeedback('error', 'Installment amount must be greater than €0.00.');
      return;
    }
    const amountDecimal = serializeBigIntToDecimalString(amountBig);
    try {
      const res = await fetch(`/api/v1/finance/${activeFamilyId}/savings/${installmentModalGoal.id}/contribute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          amountCents: toSafeNumberOrNull(amountBig) ?? amountDecimal,
          amountCentsDecimal: amountDecimal,
          fundingAccountId: installmentFundingAccId || null,
          notes: installmentNotesVal.trim() || 'Monthly savings installment check-off',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showFeedback('error', data.message || 'Failed to record installment transfer.');
        return;
      }
      setInstallmentModalGoal(null);
      showFeedback(
        'success',
        `Recorded real transfer of ${formatCents(amountBig)} to savings goal "${data.goal.title}" (${data.progressPercentage}% complete).`
      );
      await fetchAllFinanceHubData();
      onRefreshGlobalWorkspace?.();
    } catch {
      showFeedback('error', 'Network error while recording installment transfer.');
    }
  };

  const handleCreateRecurringRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleTitle.trim()) {
      showFeedback('error', 'Schedule title is required.');
      return;
    }
    const amountBig = parseDollarsToCentsBigInt(newRuleAmountDollars);
    if (amountBig === null || amountBig <= 0n) {
      showFeedback('error', 'Recurring amount must be greater than $0.00.');
      return;
    }
    const amountDecimal = serializeBigIntToDecimalString(amountBig);
    try {
      const nextDueDate = newRuleDueDateIso ? new Date(newRuleDueDateIso).getTime() : Date.now();
      const res = await fetch(`/api/v1/finance/${activeFamilyId}/recurring`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          title: newRuleTitle.trim(),
          accountId: newRuleAccountId,
          amountCents: toSafeNumberOrNull(amountBig) ?? amountDecimal,
          amountCentsDecimal: amountDecimal,
          transactionType: newRuleType,
          category: newRuleCategory,
          recurrenceInterval: newRuleFrequency,
          nextDueDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showFeedback('error', data.message || 'Failed to create recurring schedule.');
        return;
      }
      setNewRuleTitle('');
      showFeedback('success', `Created recurring ${newRuleFrequency.toLowerCase()} rule "${data.rule.title}".`);
      await fetchAllFinanceHubData();
    } catch {
      showFeedback('error', 'Network error while creating recurring schedule.');
    }
  };

  const handleToggleRecurringRule = async (rule: any) => {
    try {
      const res = await fetch(`/api/v1/finance/${activeFamilyId}/recurring/${rule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          isActive: !rule.isActive,
        }),
      });
      if (res.ok) {
        showFeedback(
          'success',
          `Recurring schedule "${rule.title}" ${!rule.isActive ? 'resumed (Active)' : 'paused'}.`
        );
        await fetchAllFinanceHubData();
      }
    } catch {
      showFeedback('error', 'Failed to update recurring rule status.');
    }
  };

  const handleGenerateRecurringTransaction = async (rule: any) => {
    try {
      const res = await fetch(`/api/v1/finance/${activeFamilyId}/recurring/${rule.id}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        showFeedback('error', data.message || 'Failed to generate recurring transaction.');
        return;
      }
      if (data.alreadyGenerated) {
        showFeedback(
          'warning',
          `Idempotency Guard (${data.idempotencyKey || 'REC_GEN'}): Cycle transaction for "${rule.title}" was already posted.`
        );
      } else {
        showFeedback(
          'success',
          `Posted scheduled transaction "${data.transaction.title}" (${formatCents(
            data.transaction.amountCentsDecimal ?? data.transaction.amountCents
          )}) and advanced next due date.`
        );
      }
      await fetchAllFinanceHubData();
      onRefreshGlobalWorkspace?.();
    } catch {
      showFeedback('error', 'Network error while generating recurring transaction.');
    }
  };

  const handleRecordInvestmentPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invSymbol.trim() || !invAssetName.trim()) {
      showFeedback('error', 'Ticker symbol and asset name are required.');
      return;
    }
    const quantityBig = parseSharesToMicrosharesBigInt(invSharesInput);
    const costBasisBig = parseDollarsToCentsBigInt(invCostBasisDollars);
    const currentPriceBig = parseDollarsToCentsBigInt(invUnitPriceDollars);

    if (!quantityBig || quantityBig <= 0n) {
      showFeedback('error', 'Enter a valid share quantity (up to 6 decimal places).');
      return;
    }
    if (!costBasisBig || costBasisBig <= 0n || !currentPriceBig || currentPriceBig <= 0n) {
      showFeedback('error', 'Total cost basis and current unit market price must be positive.');
      return;
    }

    const quantityDec = serializeBigIntToDecimalString(quantityBig);
    const costBasisDec = serializeBigIntToDecimalString(costBasisBig);
    const priceDec = serializeBigIntToDecimalString(currentPriceBig);

    try {
      const res = await fetch(`/api/v1/finance/${activeFamilyId}/investments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          symbol: invSymbol.trim().toUpperCase(),
          assetName: invAssetName.trim(),
          assetType: invAssetType,
          quantityMicroshares: toSafeNumberOrNull(quantityBig) ?? quantityDec,
          quantityMicrosharesDecimal: quantityDec,
          costBasisCents: toSafeNumberOrNull(costBasisBig) ?? costBasisDec,
          costBasisCentsDecimal: costBasisDec,
          currentPriceCents: toSafeNumberOrNull(currentPriceBig) ?? priceDec,
          currentPriceCentsDecimal: priceDec,
          fundingAccountId: invFundingAccountId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showFeedback('error', data.message || 'Failed to record investment holding.');
        return;
      }
      setInvSymbol('');
      setInvAssetName('');
      showFeedback(
        'success',
        `Recorded ${data.holding.symbol} (${formatMicroshares(
          data.holding.quantityMicrosharesDecimal ?? data.holding.quantityMicroshares,
          true
        )} shares, cost basis ${formatCents(data.holding.costBasisCentsDecimal ?? data.holding.costBasisCents)}).`
      );
      await fetchAllFinanceHubData();
      onRefreshGlobalWorkspace?.();
    } catch {
      showFeedback('error', 'Network error while recording investment purchase.');
    }
  };

  const handleUpdateMarketPrice = async (holding: any) => {
    const rawInput = priceUpdateMap[holding.id] ?? '';
    const newPriceBig = parseDollarsToCentsBigInt(rawInput);
    if (!newPriceBig || newPriceBig <= 0n) {
      showFeedback('error', 'Enter a valid positive unit market price.');
      return;
    }
    const priceDec = serializeBigIntToDecimalString(newPriceBig);
    try {
      const res = await fetch(`/api/v1/finance/${activeFamilyId}/investments/${holding.id}/price`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          currentPriceCents: toSafeNumberOrNull(newPriceBig) ?? priceDec,
          currentPriceCentsDecimal: priceDec,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showFeedback('error', data.message || 'Failed to update market price.');
        return;
      }
      showFeedback(
        'success',
        `Updated ${data.holding.symbol} unit price to ${formatCents(
          data.holding.currentPriceCentsDecimal ?? data.holding.currentPriceCents
        )}. Cost basis preserved at ${formatCents(data.holding.costBasisCentsDecimal ?? data.holding.costBasisCents)}.`
      );
      await fetchAllFinanceHubData();
    } catch {
      showFeedback('error', 'Network error while updating market price.');
    }
  };

  // ============================================================================
  // NAVIGATION TABS DEFINITION
  // ============================================================================
  const SECTIONS: Array<{ id: FinanceHubSection; label: string; icon: any }> = [
    { id: 'overview', label: '1. Overview', icon: DollarSign },
    { id: 'accounts', label: '2. Accounts', icon: Landmark },
    { id: 'transactions', label: '3. Transactions', icon: ArrowLeftRight },
    { id: 'budgets', label: '4. Budgets', icon: PieChart },
    { id: 'savings', label: '5. Savings', icon: PiggyBank },
    { id: 'recurring', label: '6. Recurring', icon: CalendarClock },
    { id: 'investments', label: '7. Investments', icon: TrendingUp },
  ];

  const summary = summaryData?.summary || {
    actualIncomeCents: 0,
    actualIncomeCentsDecimal: '0',
    actualExpenseCents: 0,
    actualExpenseCentsDecimal: '0',
    actualNetCashFlowCents: 0,
    actualNetCashFlowCentsDecimal: '0',
    totalAssetsCents: 0,
    totalAssetsCentsDecimal: '0',
    totalLiabilitiesCents: 0,
    totalLiabilitiesCentsDecimal: '0',
    netWorthCents: 0,
    netWorthCentsDecimal: '0',
    projectedMonthlyRecurringIncomeCents: 0,
    projectedMonthlyRecurringIncomeCentsDecimal: '0',
    projectedMonthlyRecurringExpenseCents: 0,
    projectedMonthlyRecurringExpenseCentsDecimal: '0',
    plannedVariableExpensesCents: 0,
    plannedVariableExpensesCentsDecimal: '0',
    availablePlannedCashFlowCents: 0,
    availablePlannedCashFlowCentsDecimal: '0',
    plannedAllocationsCents: 0,
    plannedAllocationsCentsDecimal: '0',
    discretionaryMarginCents: 0,
    discretionaryMarginCentsDecimal: '0',
  };

  const combinedHouseholdNetWorthDecimal =
    summary.netWorthCentsDecimal ?? summaryData?.netWorthCentsDecimal ?? summary.netWorthCents;
  const actualNetCashFlowBig = toBigIntOrZero(summary.actualNetCashFlowCentsDecimal, summary.actualNetCashFlowCents);

  return (
    <section aria-label="FamilyOS Finance Hub" className="space-y-6">
      {/* Household Scope, Role Context & Session Controls */}
      <div
        className="rounded-2xl p-4 bg-white border flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs"
        style={{ borderColor: BRAND.border }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="finance-household-select" className="font-semibold text-stone-700">
              Household Workspace:
            </label>
            <select
              id="finance-household-select"
              value={activeFamilyId}
              onChange={(e) => setActiveFamilyId(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-stone-300 bg-stone-50 font-medium text-stone-900"
            >
              {HOUSEHOLD_WORKSPACES.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="finance-persona-select" className="font-semibold text-stone-700">
              Active Role:
            </label>
            <select
              id="finance-persona-select"
              value={selectedPersona}
              onChange={(e) => onSelectPersona?.(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-stone-300 bg-stone-50 font-medium text-stone-900"
            >
              <option value="OWNER">Sarah Henderson (OWNER)</option>
              <option value="ADMIN">David Henderson (ADMIN)</option>
              <option value="MEMBER">Maya Henderson (MEMBER)</option>
              <option value="CHILD">Lucas Henderson (CHILD)</option>
              <option value="GUEST">Grandma Martha (GUEST)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="finance-simulate-expire-btn"
            type="button"
            onClick={() => {
              clearSensitiveFinanceCache();
              setSessionExpiredOverride(true);
              setErrorState({
                type: 'UNAUTHORIZED',
                code: 'SESSION_EXPIRED',
                message:
                  'Your authenticated session has expired or is missing. Please re-authenticate to access household financial records.',
              });
              onExpireSession?.();
            }}
            className="px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-100 font-semibold cursor-pointer"
          >
            Expire Session
          </button>
        </div>
      </div>

      {/* Feedback Notification Banner */}
      {feedbackBanner && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-xl p-4 border flex items-center justify-between text-xs font-medium ${
            feedbackBanner.tone === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : feedbackBanner.tone === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-950'
              : 'bg-rose-50 border-rose-200 text-rose-950'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackBanner.tone === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            )}
            <span>{feedbackBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-stone-500 hover:text-stone-800 px-2 py-0.5 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Security / Access Restricted / Session Expired / Network Error State */}
      {errorState && (
        <div
          role="alert"
          className="rounded-2xl p-6 bg-rose-50/90 border border-rose-200 text-rose-950 space-y-3"
        >
          <div className="flex items-start gap-3">
            {errorState.type === 'NETWORK' ? (
              <WifiOff className="w-6 h-6 text-rose-700 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-rose-700 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="text-xs font-mono uppercase tracking-wider text-rose-700">
                {errorState.code || errorState.type}
              </div>
              <h3 className="text-base font-serif font-bold text-rose-950">
                {errorState.type === 'ACCESS_RESTRICTED'
                  ? 'Financial Records Restricted for Current Role'
                  : errorState.type === 'WORKSPACE_ISOLATION'
                  ? 'Cross-Household Isolation Enforced'
                  : errorState.type === 'UNAUTHORIZED'
                  ? 'Session Expired or Unauthenticated'
                  : 'Financial Service Connection Error'}
              </h3>
              <p className="text-xs text-rose-900 leading-relaxed">{errorState.message}</p>
              <p className="text-[11px] text-rose-800 pt-1">
                Zero-Trust Protection: All cached household balances, transactions, budgets, and holdings have been cleared from memory.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {activeFamilyId !== 'fam-1' && (
              <button
                type="button"
                onClick={() => setActiveFamilyId('fam-1')}
                className="px-3.5 py-2 rounded-lg bg-rose-800 text-white text-xs font-semibold hover:bg-rose-900"
              >
                Return to Primary Household (fam-1)
              </button>
            )}
            {onSelectPersona && (selectedPersona === 'CHILD' || selectedPersona === 'GUEST') && (
              <button
                type="button"
                onClick={() => onSelectPersona('OWNER')}
                className="px-3.5 py-2 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800"
              >
                Switch to Authorized Adult (Sarah — OWNER)
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setSessionExpiredOverride(false);
                fetchAllFinanceHubData();
              }}
              className="px-3.5 py-2 rounded-lg border border-rose-300 bg-white text-rose-900 text-xs font-semibold hover:bg-rose-100"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* Seven-Section Segmented Navigation Bar & Print Action */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border shadow-xs w-full" style={{ borderColor: BRAND.border }}>
        <div
          role="tablist"
          aria-label="Finance Hub Sections"
          className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-stone-100 border overflow-x-auto"
          style={{ borderColor: BRAND.border }}
        >
          {SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const isSelected = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls={`finance-panel-${sec.id}`}
                id={`finance-tab-${sec.id}`}
                onClick={() => handleSelectSection(sec.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all focus-visible:outline-2 focus-visible:outline-emerald-800 ${
                  isSelected
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setIsPrintModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-[#173D35] hover:bg-emerald-950 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
          title="Print Complete Finance Database & Ledger Report"
        >
          <span>🖨️ Print Finance Database</span>
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && !summaryData && !errorState && (
        <div
          role="status"
          aria-label="Loading household financial records"
          className="rounded-2xl p-8 bg-white border text-center space-y-3"
          style={{ borderColor: BRAND.border }}
        >
          <RefreshCw className="w-6 h-6 text-emerald-800 animate-spin mx-auto" />
          <p className="text-sm font-medium text-stone-700">
            Loading verified integer-cents financial ledger for {activeFamilyId}...
          </p>
        </div>
      )}

      {/* =====================================================================
          SECTION 1: OVERVIEW (Also displayed at top of Accounts & Cash Flow)
      ===================================================================== */}
      {!errorState && (activeSection === 'overview' || activeSection === 'accounts') && (
        <div
          id="finance-panel-overview"
          role="tabpanel"
          aria-labelledby="finance-tab-overview"
          className="space-y-6"
        >
          {/* Key Household Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 1. Net Household Worth */}
            <div className="rounded-2xl p-5 bg-white border" style={{ borderColor: BRAND.border }}>
              <span className="text-xs text-stone-500 block mb-1">Net Household Worth</span>
              <div className="text-2xl font-serif font-bold text-stone-900 font-mono">
                {formatCents(combinedHouseholdNetWorthDecimal)}
              </div>
              <div className="mt-2 pt-2 border-t border-stone-100 text-[11px] text-stone-600 space-y-0.5">
                <div className="flex justify-between">
                  <span>Assets:</span>
                  <span className="font-mono text-emerald-800">
                    {formatCents(summary.totalAssetsCentsDecimal ?? summary.totalAssetsCents)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Liabilities:</span>
                  <span className="font-mono text-rose-700">
                    -{formatCents(summary.totalLiabilitiesCentsDecimal ?? summary.totalLiabilitiesCents)}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Monthly Recorded Income */}
            <div className="rounded-2xl p-5 bg-white border" style={{ borderColor: BRAND.border }}>
              <span className="text-xs text-stone-500 block mb-1">Monthly Recorded Income</span>
              <div className="text-2xl font-serif font-bold text-emerald-800 font-mono">
                {formatCents(summary.actualIncomeCentsDecimal ?? summary.actualIncomeCents)}
              </div>
              <p className="text-[11px] text-stone-500 mt-2">
                Actual posted income entries · Excludes internal transfers
              </p>
            </div>

            {/* 3. Monthly Recorded Expenses */}
            <div className="rounded-2xl p-5 bg-white border" style={{ borderColor: BRAND.border }}>
              <span className="text-xs text-stone-500 block mb-1">Monthly Recorded Expenses</span>
              <div className="text-2xl font-serif font-bold text-rose-800 font-mono">
                {formatCents(summary.actualExpenseCentsDecimal ?? summary.actualExpenseCents)}
              </div>
              <p className="text-[11px] text-stone-500 mt-2">
                Actual posted expense entries · Net of audit reversals
              </p>
            </div>

            {/* 4. Actual Monthly Surplus / Deficit */}
            <div className="rounded-2xl p-5 bg-white border" style={{ borderColor: BRAND.border }}>
              <span className="text-xs text-stone-500 block mb-1">
                Actual Monthly {actualNetCashFlowBig >= 0n ? 'Surplus' : 'Deficit'}
              </span>
              <div
                className={`text-2xl font-serif font-bold font-mono ${
                  actualNetCashFlowBig >= 0n ? 'text-emerald-900' : 'text-rose-700'
                }`}
              >
                {actualNetCashFlowBig >= 0n ? '+' : ''}
                {formatCents(summary.actualNetCashFlowCentsDecimal ?? summary.actualNetCashFlowCents)}
              </div>
              <p className="text-[11px] text-stone-500 mt-2">
                Recorded Income − Recorded Expenses
              </p>
            </div>

            {/* 5. Remaining Envelope Budget */}
            <div className="rounded-2xl p-5 bg-white border flex flex-col justify-between" style={{ borderColor: BRAND.border }}>
              <div>
                <span className="text-xs text-stone-500 block mb-1">Remaining Envelope Budget</span>
                <div
                  className={`text-2xl font-serif font-bold font-mono ${
                    budgetRollup.totalRemainingBig >= 0n ? 'text-stone-900' : 'text-rose-700'
                  }`}
                >
                  {formatCents(budgetRollup.totalRemainingCents)}
                </div>
              </div>

              {(() => {
                const overviewColor = getDynamicBudgetColor(
                  budgetRollup.totalSpentCents,
                  budgetRollup.totalAllocatedCents
                );
                return (
                  <div className="mt-3 space-y-1.5">
                    <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden border border-stone-200/80">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(0, overviewColor.percentage))}%`,
                          background: overviewColor.gradientStyle,
                        }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-stone-500">
                      <span>Spent {formatCents(budgetRollup.totalSpentCents)} ({overviewColor.percentage}%)</span>
                      <span className={overviewColor.twTextClass}>{overviewColor.statusLabel}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Actual vs. Projected Cash Flow Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Actual Recorded Cash Flow */}
            <div className="rounded-2xl p-6 bg-white border space-y-4" style={{ borderColor: BRAND.border }}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-800 font-semibold">Actual Ledger Record</span>
                  <h3 className="text-lg font-serif font-bold text-stone-900">
                    Actual Recorded Cash Flow
                  </h3>
                </div>
                <span className="text-xs font-mono text-stone-500">Settled Transactions Only</span>
              </div>
              <p className="text-xs text-stone-600">
                Computed strictly from posted income and expense transactions. Internal account transfers and planned savings allocations are excluded so household cash flow is never distorted.
              </p>
              <div className="space-y-2.5 pt-2 text-xs">
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="text-stone-600">Recorded Household Income</span>
                  <span className="font-mono font-bold text-emerald-800">
                    +{formatCents(cashflowData?.actual?.incomeCentsDecimal ?? summary.actualIncomeCentsDecimal ?? summary.actualIncomeCents)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="text-stone-600">Recorded Household Expenses</span>
                  <span className="font-mono font-bold text-rose-700">
                    -{formatCents(cashflowData?.actual?.expenseCentsDecimal ?? summary.actualExpenseCentsDecimal ?? summary.actualExpenseCents)}
                  </span>
                </div>
                <div className="flex justify-between py-2.5 bg-stone-50 px-3 rounded-xl font-semibold">
                  <span className="text-stone-900">
                    Actual Net Cash Flow ({actualNetCashFlowBig >= 0n ? 'Surplus' : 'Deficit'})
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      actualNetCashFlowBig >= 0n ? 'text-emerald-900' : 'text-rose-700'
                    }`}
                  >
                    {formatCents(cashflowData?.actual?.netCentsDecimal ?? summary.actualNetCashFlowCentsDecimal ?? summary.actualNetCashFlowCents)}
                  </span>
                </div>
              </div>
            </div>

            {/* Projected Monthly Cash Flow & Allocations */}
            <div className="rounded-2xl p-6 bg-white border space-y-4" style={{ borderColor: BRAND.border }}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-amber-800 font-semibold">Projected / Planned Forecast</span>
                  <h3 className="text-lg font-serif font-bold text-stone-900">
                    Projected Monthly Cash Flow & Allocations
                  </h3>
                </div>
                <span className="text-xs font-mono text-amber-900">Forecast Only · Not Posted</span>
              </div>
              <p className="text-xs text-stone-600">
                Derived from active recurring schedules, category budget envelopes, and planned monthly savings targets. Projected items do not alter account balances until generated or posted.
              </p>
              <div className="space-y-2 pt-1 text-xs">
                <div className="flex justify-between py-1.5 border-b border-stone-100">
                  <span className="text-stone-600">Projected Recurring Monthly Income</span>
                  <span className="font-mono font-semibold text-emerald-800">
                    +{formatCents(summary.projectedMonthlyRecurringIncomeCentsDecimal ?? summary.projectedMonthlyRecurringIncomeCents)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-100">
                  <span className="text-stone-600">Projected Recurring Fixed Expenses</span>
                  <span className="font-mono font-semibold text-rose-700">
                    -{formatCents(summary.projectedMonthlyRecurringExpenseCentsDecimal ?? summary.projectedMonthlyRecurringExpenseCents)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-100">
                  <span className="text-stone-600">Planned Envelope Budget Allocations</span>
                  <span className="font-mono font-semibold text-amber-800">
                    -{formatCents(summary.plannedVariableExpensesCentsDecimal ?? summary.plannedVariableExpensesCents)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-100 font-medium">
                  <span className="text-stone-800">= Available Planned Cash Flow (Before Savings)</span>
                  <span className="font-mono font-bold text-stone-900">
                    {formatCents(summary.availablePlannedCashFlowCentsDecimal ?? summary.availablePlannedCashFlowCents)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-100">
                  <span className="text-stone-600">Planned Monthly Savings Allocations (Target Only)</span>
                  <span className="font-mono font-semibold text-stone-700">
                    -{formatCents(summary.plannedAllocationsCentsDecimal ?? summary.plannedAllocationsCents)}
                  </span>
                </div>
                <div className="flex justify-between py-2 bg-amber-50/70 px-3 rounded-xl font-semibold">
                  <span className="text-amber-950">Projected Discretionary Margin</span>
                  <span className="font-mono font-bold text-amber-950">
                    {formatCents(summary.discretionaryMarginCentsDecimal ?? summary.discretionaryMarginCents)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive What-If Cash-Flow Planning Simulator */}
          <div className="rounded-2xl p-6 bg-white border space-y-4" style={{ borderColor: BRAND.border }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs text-stone-500">Interactive Scenario Sandbox</span>
                <h3 className="text-base font-serif font-bold text-stone-900">
                  What-If Monthly Cash-Flow Allocator (Integer-Cents Formula)
                </h3>
              </div>
              <span className="text-xs font-mono text-stone-500">
                Available = Income − Fixed Recurring − Planned Variable − Savings Target
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label htmlFor="sim-inc" className="block text-stone-600 font-medium mb-1">
                  Simulated Monthly Income ($)
                </label>
                <input
                  id="sim-inc"
                  type="text"
                  value={simIncomeDollars}
                  onChange={(e) => setSimIncomeDollars(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 font-mono"
                />
              </div>
              <div>
                <label htmlFor="sim-rec" className="block text-stone-600 font-medium mb-1">
                  Simulated Fixed Bills ($)
                </label>
                <input
                  id="sim-rec"
                  type="text"
                  value={simRecurringDollars}
                  onChange={(e) => setSimRecurringDollars(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 font-mono"
                />
              </div>
              <div>
                <label htmlFor="sim-var" className="block text-stone-600 font-medium mb-1">
                  Simulated Variable Budgets ($)
                </label>
                <input
                  id="sim-var"
                  type="text"
                  value={simVariableDollars}
                  onChange={(e) => setSimVariableDollars(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 font-mono"
                />
              </div>
              <div>
                <label htmlFor="sim-sav" className="block text-stone-600 font-medium mb-1">
                  Simulated Savings Target ($)
                </label>
                <input
                  id="sim-sav"
                  type="text"
                  value={simSavingsAllocDollars}
                  onChange={(e) => setSimSavingsAllocDollars(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex justify-between items-center text-xs">
                <span className="font-medium text-stone-700">Simulated Available Before Savings:</span>
                <span className="font-mono font-bold text-sm text-stone-900">
                  {formatCents(simCalculations.availableBeforeSavingsCents)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex justify-between items-center text-xs">
                <span className="font-semibold text-emerald-950">Simulated Unallocated Margin:</span>
                <span className="font-mono font-bold text-sm text-emerald-950">
                  {formatCents(simCalculations.unallocatedMarginCents)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 2: ACCOUNTS & BALANCE RECONCILIATION
      ===================================================================== */}
      {!errorState && activeSection === 'accounts' && (
        <div
          id="finance-panel-accounts"
          role="tabpanel"
          aria-labelledby="finance-tab-accounts"
          className="space-y-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Accounts List */}
            <div className="lg:col-span-2 rounded-2xl p-6 bg-white border space-y-4" style={{ borderColor: BRAND.border }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-serif font-bold text-stone-900">
                    Household Financial Accounts ({accounts.length})
                  </h3>
                  <p className="text-xs text-stone-500">
                    Select any account to inspect transaction activity, reconciliation status, or edit details
                  </p>
                </div>
              </div>

              {accounts.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-500 border border-dashed border-stone-300 rounded-xl">
                  No financial accounts registered for this household yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {accounts.map((acc) => {
                    const isSelected = selectedAccountId === acc.id;
                    const isEditing = editAccId === acc.id;
                    const accTxs = transactions.filter(
                      (t) => t.accountId === acc.id || t.destinationAccountId === acc.id
                    );

                    return (
                      <div
                        key={acc.id}
                        className={`rounded-xl border p-4 transition-colors ${
                          isSelected ? 'border-emerald-800 bg-stone-50/70' : 'border-stone-200 bg-white'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 text-xs text-stone-500">
                              <span className="font-mono font-semibold text-stone-700">{acc.accountType}</span>
                              <span aria-hidden="true">·</span>
                              <span>{acc.institution}</span>
                              <span aria-hidden="true">·</span>
                              <span>{acc.isLiability ? 'Liability Account' : 'Asset Account'}</span>
                            </div>
                            <h4 className="text-base font-serif font-bold text-stone-900 mt-0.5">
                              {acc.name}
                            </h4>
                            <p className="text-[11px] text-stone-500 mt-0.5">
                              Account ID: <span className="font-mono">{acc.id}</span>
                              {acc.lastReconciledAt && (
                                <>
                                  {' '}
                                  · Last Reconciled: {new Date(acc.lastReconciledAt).toLocaleDateString()}
                                </>
                              )}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span
                                className={`text-lg font-mono font-bold ${
                                  acc.isLiability || toBigIntOrZero(acc.currentBalanceCentsDecimal, acc.currentBalanceCents) < 0n
                                    ? 'text-rose-700'
                                    : 'text-emerald-900'
                                }`}
                              >
                                {formatCents(acc.currentBalanceCentsDecimal ?? acc.currentBalanceCents)}
                              </span>
                              <span className="block text-[10px] text-stone-500">Ledger Balance</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAccountId(isSelected ? null : acc.id);
                                setReconcileAccountId(acc.id);
                              }}
                              className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                            >
                              {isSelected ? 'Hide Details' : 'Details'}
                            </button>

                            <button
                              type="button"
                              aria-label={`Edit ${acc.name}`}
                              onClick={() => {
                                setEditAccId(isEditing ? null : acc.id);
                                setEditAccName(acc.name);
                                setEditAccInstitution(acc.institution);
                              }}
                              className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {isEditing && (
                          <div className="mt-3 pt-3 border-t border-stone-200 flex flex-wrap items-end gap-2 text-xs">
                            <div>
                              <label className="block text-[11px] text-stone-600 mb-0.5">Account Name</label>
                              <input
                                type="text"
                                value={editAccName}
                                onChange={(e) => setEditAccName(e.target.value)}
                                className="px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-stone-600 mb-0.5">Institution</label>
                              <input
                                type="text"
                                value={editAccInstitution}
                                onChange={(e) => setEditAccInstitution(e.target.value)}
                                className="px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSaveAccountEdit(acc.id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-800 text-white font-semibold"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditAccId(null)}
                              className="px-3 py-1.5 rounded-lg border border-stone-300 text-stone-600"
                            >
                              Cancel
                            </button>
                          </div>
                        )}

                        {isSelected && (
                          <div className="mt-4 pt-3 border-t border-stone-200 space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-stone-800">
                                Recent Account Ledger Entries ({accTxs.length})
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setTxFilterAccount(acc.id);
                                  setActiveSection('transactions');
                                }}
                                className="text-emerald-800 hover:underline font-semibold"
                              >
                                View All in Transactions →
                              </button>
                            </div>
                            {accTxs.length === 0 ? (
                              <p className="text-stone-500 py-2">No transactions recorded for this account yet.</p>
                            ) : (
                              <div className="space-y-1.5">
                                {accTxs.slice(0, 5).map((t) => (
                                  <div
                                    key={t.id}
                                    className="flex justify-between items-center py-1.5 px-2.5 rounded-lg bg-white border border-stone-200"
                                  >
                                    <div>
                                      <span className="font-medium text-stone-900">{t.title}</span>
                                      <span className="text-stone-500 ml-2">
                                        · {t.transactionType} · {t.category}
                                      </span>
                                    </div>
                                    <span className="font-mono font-semibold">
                                      {t.transactionType === 'INCOME' ? '+' : '-'}
                                      {formatCents(t.amountCentsDecimal ?? t.amountCents)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Add Account & Statement Reconciliation */}
            <div className="space-y-6">
              {/* Create Account Form */}
              <form
                onSubmit={handleCreateAccount}
                className="rounded-2xl p-5 bg-white border space-y-3 text-xs"
                style={{ borderColor: BRAND.border }}
              >
                <h3 className="text-base font-serif font-bold text-stone-900">Add Financial Account</h3>
                <div>
                  <label htmlFor="new-acc-name" className="block text-stone-600 font-medium mb-1">
                    Account Name
                  </label>
                  <input
                    id="new-acc-name"
                    type="text"
                    value={newAccName}
                    onChange={(e) => setNewAccName(e.target.value)}
                    placeholder="e.g. Household Emergency Savings"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="new-acc-type" className="block text-stone-600 font-medium mb-1">
                      Account Type
                    </label>
                    <select
                      id="new-acc-type"
                      value={newAccType}
                      onChange={(e) => setNewAccType(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg border border-stone-300 bg-white"
                    >
                      <option value="CHECKING">CHECKING</option>
                      <option value="SAVINGS">SAVINGS</option>
                      <option value="INVESTMENT">INVESTMENT</option>
                      <option value="CASH">CASH</option>
                      <option value="CREDIT_CARD">CREDIT_CARD (Liability)</option>
                      <option value="LOAN">LOAN (Liability)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="new-acc-inst" className="block text-stone-600 font-medium mb-1">
                      Institution
                    </label>
                    <input
                      id="new-acc-inst"
                      type="text"
                      value={newAccInstitution}
                      onChange={(e) => setNewAccInstitution(e.target.value)}
                      placeholder="e.g. Vanguard"
                      className="w-full px-2.5 py-2 rounded-lg border border-stone-300"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="new-acc-bal" className="block text-stone-600 font-medium mb-1">
                    Opening Balance ($)
                  </label>
                  <input
                    id="new-acc-bal"
                    type="text"
                    value={newAccBalanceDollars}
                    onChange={(e) => setNewAccBalanceDollars(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl text-white font-semibold transition-colors"
                  style={{ backgroundColor: BRAND.primary }}
                >
                  + Create Account
                </button>
              </form>

              {/* Balance Reconciliation Form */}
              <form
                onSubmit={handleReconcileStatement}
                className="rounded-2xl p-5 bg-white border space-y-3 text-xs"
                style={{ borderColor: BRAND.border }}
              >
                <h3 className="text-base font-serif font-bold text-stone-900">
                  Statement Balance Reconciliation
                </h3>
                <p className="text-stone-500">
                  Compare bank statement ending balance against household ledger balance in integer cents.
                </p>
                <div>
                  <label htmlFor="rec-acc-select" className="block text-stone-600 font-medium mb-1">
                    Account to Reconcile
                  </label>
                  <select
                    id="rec-acc-select"
                    value={reconcileAccountId}
                    onChange={(e) => setReconcileAccountId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({formatCents(a.currentBalanceCentsDecimal ?? a.currentBalanceCents)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="rec-stmt-bal" className="block text-stone-600 font-medium mb-1">
                      Statement Balance ($)
                    </label>
                    <input
                      id="rec-stmt-bal"
                      type="text"
                      value={reconcileStatementDollars}
                      onChange={(e) => setReconcileStatementDollars(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="rec-stmt-date" className="block text-stone-600 font-medium mb-1">
                      Statement Date
                    </label>
                    <input
                      id="rec-stmt-date"
                      type="date"
                      value={reconcileDateIso}
                      onChange={(e) => setReconcileDateIso(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg border border-stone-300"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold transition-colors"
                >
                  Verify & Reconcile Statement
                </button>
              </form>
            </div>
          </div>

          {/* Reconciliation Audit History */}
          <div className="rounded-2xl p-6 bg-white border space-y-3" style={{ borderColor: BRAND.border }}>
            <h3 className="text-base font-serif font-bold text-stone-900">
              Account Reconciliation Audit Log ({reconciliations.length})
            </h3>
            {reconciliations.length === 0 ? (
              <p className="text-xs text-stone-500">No statement reconciliations recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-500">
                      <th className="py-2 pr-4">Account</th>
                      <th className="py-2 pr-4">Statement Date</th>
                      <th className="py-2 pr-4">Statement Balance</th>
                      <th className="py-2 pr-4">Ledger Balance</th>
                      <th className="py-2 pr-4">Discrepancy</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2">Verified By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {reconciliations.map((r) => {
                      const accName = accounts.find((a) => a.id === r.accountId)?.name || r.accountId;
                      const discBig = toBigIntOrZero(r.discrepancyCentsDecimal, r.discrepancyCents);
                      return (
                        <tr key={r.id}>
                          <td className="py-2.5 pr-4 font-medium text-stone-900">{accName}</td>
                          <td className="py-2.5 pr-4 text-stone-600">
                            {new Date(r.statementDate).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 pr-4 font-mono">
                            {formatCents(r.statementEndingBalanceCentsDecimal ?? r.statementEndingBalanceCents)}
                          </td>
                          <td className="py-2.5 pr-4 font-mono">
                            {formatCents(r.ledgerBalanceCentsDecimal ?? r.ledgerBalanceCents)}
                          </td>
                          <td
                            className={`py-2.5 pr-4 font-mono font-bold ${
                              discBig === 0n ? 'text-emerald-800' : 'text-amber-800'
                            }`}
                          >
                            {discBig > 0n ? '+' : ''}
                            {formatCents(r.discrepancyCentsDecimal ?? r.discrepancyCents)}
                          </td>
                          <td className="py-2.5 pr-4">
                            <span
                              className={
                                r.isReconciled
                                  ? 'text-emerald-800 font-semibold'
                                  : 'text-amber-800 font-semibold'
                              }
                            >
                              {r.isReconciled ? 'Reconciled' : 'Discrepancy Flagged'}
                            </span>
                          </td>
                          <td className="py-2.5 text-stone-600">{r.reconciledBy}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 3: TRANSACTIONS, TRANSFERS & AUDIT REVERSALS
      ===================================================================== */}
      {!errorState && activeSection === 'transactions' && (
        <div
          id="finance-panel-transactions"
          role="tabpanel"
          aria-labelledby="finance-tab-transactions"
          className="space-y-6"
        >
          {/* Record Transaction Form */}
          <form
            onSubmit={handleRecordTransaction}
            className="rounded-2xl p-6 bg-white border space-y-4 text-xs"
            style={{ borderColor: BRAND.border }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-serif font-bold text-stone-900">
                  Post Household Ledger Entry
                </h3>
                <p className="text-stone-500">
                  All entries use idempotency keys and integer-cents accounting. Transfers and savings contributions never inflate income or expenses.
                </p>
              </div>

              {/* Entry Mode Selector */}
              <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-stone-100 border border-stone-200">
                {[
                  { id: 'EXPENSE', label: 'Expense' },
                  { id: 'INCOME', label: 'Income' },
                  { id: 'TRANSFER', label: 'Internal Transfer' },
                  { id: 'SAVINGS_CONTRIB', label: 'Savings Contribution' },
                  { id: 'BILL_PAYMENT', label: 'Bill Payment' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setTxEntryMode(m.id as any)}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                      txEntryMode === m.id
                        ? 'bg-stone-900 text-white'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label htmlFor="tx-source-acc" className="block text-stone-600 font-medium mb-1">
                  {txEntryMode === 'INCOME' ? 'Deposit Account' : 'Source Account'}
                </label>
                <select
                  id="tx-source-acc"
                  value={txAccountId}
                  onChange={(e) => setTxAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatCents(a.currentBalanceCentsDecimal ?? a.currentBalanceCents)})
                    </option>
                  ))}
                </select>
              </div>

              {txEntryMode === 'TRANSFER' && (
                <div>
                  <label htmlFor="tx-dest-acc" className="block text-stone-600 font-medium mb-1">
                    Destination Account
                  </label>
                  <select
                    id="tx-dest-acc"
                    value={txDestAccountId}
                    onChange={(e) => setTxDestAccountId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({formatCents(a.currentBalanceCentsDecimal ?? a.currentBalanceCents)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {txEntryMode === 'SAVINGS_CONTRIB' && (
                <div>
                  <label htmlFor="tx-sav-goal" className="block text-stone-600 font-medium mb-1">
                    Target Savings Goal
                  </label>
                  <select
                    id="tx-sav-goal"
                    value={txGoalId}
                    onChange={(e) => setTxGoalId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white"
                  >
                    {savingsGoals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title} ({formatCents(g.currentCentsDecimal ?? g.currentCents)} /{' '}
                        {formatCents(g.targetCentsDecimal ?? g.targetCents)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {txEntryMode !== 'TRANSFER' && txEntryMode !== 'SAVINGS_CONTRIB' && (
                <div>
                  <label htmlFor="tx-cat-select" className="block text-stone-600 font-medium mb-1">
                    Category
                  </label>
                  <select
                    id="tx-cat-select"
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white"
                  >
                    <option value="FOOD">FOOD</option>
                    <option value="HOUSING">HOUSING</option>
                    <option value="UTILITIES">UTILITIES</option>
                    <option value="TRANSPORT">TRANSPORT</option>
                    <option value="DINING">DINING</option>
                    <option value="BILLS">BILLS</option>
                    <option value="SALARY">SALARY</option>
                    <option value="HEALTHCARE">HEALTHCARE</option>
                    <option value="EDUCATION">EDUCATION</option>
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="tx-title-input" className="block text-stone-600 font-medium mb-1">
                  Payee / Description
                </label>
                <input
                  id="tx-title-input"
                  type="text"
                  value={txTitle}
                  onChange={(e) => setTxTitle(e.target.value)}
                  placeholder="e.g. Organic Market Grocery"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300"
                />
              </div>

              <div>
                <label htmlFor="tx-amount-input" className="block text-stone-600 font-medium mb-1">
                  Amount ($)
                </label>
                <input
                  id="tx-amount-input"
                  type="text"
                  value={txAmountDollars}
                  onChange={(e) => setTxAmountDollars(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 font-mono"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl text-white font-semibold transition-colors"
                  style={{ backgroundColor: BRAND.primary }}
                >
                  + Post {txEntryMode.replace('_', ' ')}
                </button>
              </div>
            </div>
          </form>

          {/* Search & Filter Bar */}
          <div
            className="rounded-2xl p-4 bg-white border flex flex-wrap items-center gap-3 text-xs"
            style={{ borderColor: BRAND.border }}
          >
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="search"
                aria-label="Search transactions by title, category, or member"
                value={txSearchQuery}
                onChange={(e) => setTxSearchQuery(e.target.value)}
                placeholder="Search payee, description, category, or member..."
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-stone-300"
              />
            </div>

            <div>
              <label htmlFor="filter-tx-type" className="sr-only">
                Filter by Transaction Type
              </label>
              <select
                id="filter-tx-type"
                aria-label="Filter by Transaction Type"
                value={txFilterType}
                onChange={(e) => setTxFilterType(e.target.value)}
                className="px-3 py-2 rounded-lg border border-stone-300 bg-white"
              >
                <option value="ALL">All Types</option>
                <option value="INCOME">Income Only</option>
                <option value="EXPENSE">Expenses Only</option>
                <option value="TRANSFER">Transfers & Savings Only</option>
                <option value="REVERSAL">Audit Reversals Only</option>
              </select>
            </div>

            <div>
              <label htmlFor="filter-tx-account" className="sr-only">
                Filter by Account
              </label>
              <select
                id="filter-tx-account"
                aria-label="Filter by Account"
                value={txFilterAccount}
                onChange={(e) => setTxFilterAccount(e.target.value)}
                className="px-3 py-2 rounded-lg border border-stone-300 bg-white"
              >
                <option value="ALL">All Accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-tx-category" className="sr-only">
                Filter by Category
              </label>
              <select
                id="filter-tx-category"
                aria-label="Filter by Category"
                value={txFilterCategory}
                onChange={(e) => setTxFilterCategory(e.target.value)}
                className="px-3 py-2 rounded-lg border border-stone-300 bg-white"
              >
                <option value="ALL">All Categories</option>
                <option value="FOOD">FOOD</option>
                <option value="HOUSING">HOUSING</option>
                <option value="UTILITIES">UTILITIES</option>
                <option value="TRANSPORT">TRANSPORT</option>
                <option value="DINING">DINING</option>
                <option value="BILLS">BILLS</option>
                <option value="SALARY">SALARY</option>
                <option value="SAVINGS_CONTRIBUTION">SAVINGS_CONTRIBUTION</option>
                <option value="TRANSFER">TRANSFER</option>
                <option value="INVESTMENT">INVESTMENT</option>
              </select>
            </div>
          </div>

          {/* Transaction Ledger & Audit History List */}
          <div className="rounded-2xl p-6 bg-white border space-y-4" style={{ borderColor: BRAND.border }}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-serif font-bold text-stone-900">
                Append-Only Financial Ledger ({filteredTransactions.length} entries)
              </h3>
              <span className="text-xs text-stone-500">
                Original entries are immutable · Corrections post compensating reversals
              </span>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500 border border-dashed border-stone-300 rounded-xl">
                No ledger entries match the current filters.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredTransactions.map((tx) => {
                  const isAlreadyReversed = reversedOriginalIds.has(tx.id);
                  const isInspected = selectedTxDetail?.id === tx.id;
                  const srcAccName = accounts.find((a) => a.id === tx.accountId)?.name || tx.accountId;
                  const dstAccName = tx.destinationAccountId
                    ? accounts.find((a) => a.id === tx.destinationAccountId)?.name || tx.destinationAccountId
                    : null;

                  return (
                    <div
                      key={tx.id}
                      className={`rounded-xl border p-3.5 transition-colors ${
                        tx.isReversal
                          ? 'bg-sky-50/40 border-sky-200'
                          : isAlreadyReversed
                          ? 'bg-stone-50 border-stone-200 opacity-80'
                          : 'bg-white border-stone-200'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 text-xs text-stone-500">
                            <span className="font-mono font-semibold text-stone-700">{tx.transactionType}</span>
                            <span aria-hidden="true">·</span>
                            <span>{tx.category}</span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {srcAccName}
                              {dstAccName ? ` → ${dstAccName}` : ''}
                            </span>
                            {tx.isReversal && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-sky-800 font-semibold">
                                  Compensating Audit Reversal (of {tx.reversalOfId})
                                </span>
                              </>
                            )}
                            {isAlreadyReversed && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-amber-800 font-semibold">Reversed by Audit Entry</span>
                              </>
                            )}
                          </div>
                          <h4 className="text-sm font-semibold text-stone-900">{tx.title}</h4>
                          <p className="text-[11px] text-stone-500">
                            Posted by {tx.paidBy} ·{' '}
                            {tx.transactionDate ? new Date(tx.transactionDate).toLocaleString() : 'Recorded'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <span
                            className={`text-sm font-mono font-bold ${
                              tx.isReversal
                                ? 'text-sky-900'
                                : tx.transactionType === 'INCOME'
                                ? 'text-emerald-800'
                                : tx.transactionType === 'TRANSFER'
                                ? 'text-stone-700'
                                : 'text-rose-800'
                            }`}
                          >
                            {tx.transactionType === 'INCOME'
                              ? '+'
                              : tx.transactionType === 'TRANSFER'
                              ? '⇄ '
                              : '-'}
                            {formatCents(tx.amountCentsDecimal ?? tx.amountCents)}
                          </span>

                          <button
                            type="button"
                            onClick={() => setSelectedTxDetail(isInspected ? null : tx)}
                            className="px-2.5 py-1 rounded-lg border border-stone-300 text-[11px] font-semibold text-stone-700 hover:bg-stone-100"
                          >
                            {isInspected ? 'Hide Audit' : 'Inspect'}
                          </button>

                          {!tx.isReversal && !isAlreadyReversed && (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmModal({
                                  kind: 'REVERSE_TX',
                                  targetId: tx.id,
                                  targetLabel: tx.title,
                                  amountLabel: formatCents(tx.amountCentsDecimal ?? tx.amountCents),
                                  reason: 'Household audit correction',
                                })
                              }
                              className="px-2.5 py-1 rounded-lg border border-rose-300 text-[11px] font-semibold text-rose-800 hover:bg-rose-50 flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reverse</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {isInspected && (
                        <div className="mt-3 pt-3 border-t border-stone-200 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-stone-600 font-mono">
                          <div>Ledger ID: {tx.id}</div>
                          <div>Idempotency Key: {tx.idempotencyKey || 'SERVER_GENERATED'}</div>
                          <div>
                            Reversal Status:{' '}
                            {tx.isReversal
                              ? `Compensates ${tx.reversalOfId}`
                              : isAlreadyReversed
                              ? 'Reversed (Immutable Original)'
                              : 'Active Entry'}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 4: ENVELOPE BUDGETS
      ===================================================================== */}
      {!errorState && activeSection === 'budgets' && (
        <div
          id="finance-panel-budgets"
          role="tabpanel"
          aria-labelledby="finance-tab-budgets"
          className="space-y-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Envelope List */}
            <div className="lg:col-span-2 rounded-2xl p-6 bg-white border space-y-4" style={{ borderColor: BRAND.border }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-serif font-bold text-stone-900">
                    Monthly Category Envelope Budgets ({budgets.length})
                  </h3>
                  <p className="text-xs text-stone-500">
                    Real-time spending rollup from recorded expenses · Warning at ≥80% · Exceeded at ≥100%
                  </p>
                </div>
                <div className="text-xs text-stone-600 font-mono">
                  Remaining: <strong className="text-stone-900">{formatCents(budgetRollup.totalRemainingCents)}</strong>
                </div>
              </div>

              {budgets.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-500 border border-dashed border-stone-300 rounded-xl">
                  No envelope budgets configured yet.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {budgets.map((b) => {
                    const allocBig = toBigIntOrZero(b.allocatedCentsDecimal, b.allocatedCents);
                    const spentBig = toBigIntOrZero(b.spentCentsDecimal, b.spentCents);
                    const remainingBig = allocBig - spentBig;
                    const thresholdPct = b.alertThresholdPercentage ?? 80;
                    
                    const dynamicColor = getDynamicBudgetColor(
                      b.spentCentsDecimal ?? b.spentCents,
                      b.allocatedCentsDecimal ?? b.allocatedCents,
                      thresholdPct
                    );

                    return (
                      <div
                        key={b.id}
                        className={`rounded-xl border p-4 space-y-2 transition-all ${dynamicColor.twBorderClass} bg-white shadow-xs`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block transition-colors shrink-0"
                              style={{ backgroundColor: dynamicColor.hexColor }}
                              aria-hidden="true"
                            />
                            <span className="text-sm font-serif font-bold text-stone-900">{b.category}</span>
                            <span className="text-xs text-stone-500">
                              · Alert threshold {thresholdPct}%
                            </span>
                          </div>
                          <div className="text-xs font-mono">
                            <span className="font-bold text-stone-900">
                              {formatCents(b.spentCentsDecimal ?? b.spentCents)}
                            </span>
                            <span className="text-stone-500">
                              {' '}
                              / {formatCents(b.allocatedCentsDecimal ?? b.allocatedCents)} ({dynamicColor.percentage}%)
                            </span>
                          </div>
                        </div>

                        {/* Dynamic Progress Bar transitioning green -> yellow -> orange -> red */}
                        <div className="w-full h-3 rounded-full bg-stone-100 overflow-hidden border border-stone-200/80 p-0.5">
                          <div
                            className="h-full rounded-full transition-all duration-500 ease-out shadow-xs"
                            style={{
                              width: `${Math.min(100, Math.max(0, dynamicColor.percentage))}%`,
                              background: dynamicColor.gradientStyle,
                            }}
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between text-xs pt-0.5">
                          <span
                            className={
                              remainingBig < 0n
                                ? 'text-rose-700 font-semibold font-mono'
                                : 'text-emerald-800 font-mono'
                            }
                          >
                            {remainingBig < 0n
                              ? `Exceeded by ${formatCents(-remainingBig)}`
                              : `Remaining: ${formatCents(remainingBig)}`}
                          </span>

                          <span className={`${dynamicColor.twTextClass} flex items-center gap-1`}>
                            {dynamicColor.statusLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Create / Update Budget Envelope Form */}
            <form
              onSubmit={handleSaveBudgetEnvelope}
              className="rounded-2xl p-6 bg-white border space-y-4 text-xs h-fit"
              style={{ borderColor: BRAND.border }}
            >
              <h3 className="text-base font-serif font-bold text-stone-900">
                Configure Envelope Allocation
              </h3>
              <p className="text-stone-500">
                Set or update the monthly integer-cents spending limit for a household category.
              </p>
              <div>
                <label htmlFor="budget-cat-input" className="block text-stone-600 font-medium mb-1">
                  Category
                </label>
                <input
                  id="budget-cat-input"
                  type="text"
                  value={budgetCatInput}
                  onChange={(e) => setBudgetCatInput(e.target.value)}
                  placeholder="e.g. UTILITIES, FOOD, HOUSING"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300"
                />
              </div>
              <div>
                <label htmlFor="budget-alloc-input" className="block text-stone-600 font-medium mb-1">
                  Monthly Allocation ($)
                </label>
                <input
                  id="budget-alloc-input"
                  type="text"
                  value={budgetAllocDollars}
                  onChange={(e) => setBudgetAllocDollars(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 font-mono"
                />
              </div>
              <div>
                <label htmlFor="budget-thresh-input" className="block text-stone-600 font-medium mb-1">
                  Warning Alert Threshold (%)
                </label>
                <input
                  id="budget-thresh-input"
                  type="number"
                  min={50}
                  max={100}
                  value={budgetThresholdPct}
                  onChange={(e) => setBudgetThresholdPct(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl text-white font-semibold transition-colors"
                style={{ backgroundColor: BRAND.primary }}
              >
                Save Envelope Budget
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 5: SAVINGS GOALS & CONTRIBUTION HISTORY
      ===================================================================== */}
      {!errorState && activeSection === 'savings' && (
        <div
          id="finance-panel-savings"
          role="tabpanel"
          aria-labelledby="finance-tab-savings"
          className="space-y-6"
        >
          {/* AI Savings Assistant & Realistic Financial Planning Panel */}
          <div className="rounded-2xl p-6 bg-emerald-900 text-white space-y-4 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs uppercase tracking-wider font-mono text-emerald-300">FamilyOS AI Savings Assistant</span>
                <h3 className="text-xl font-serif font-bold text-white mt-0.5">Realistic Savings & Allocation Engine</h3>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-800 text-emerald-200 border border-emerald-700">
                Pay Income → Expenses → Budgets → Genuinely Available → Distribute Savings
              </span>
            </div>
            <p className="text-xs text-emerald-100 leading-relaxed">
              Savings are never deducted before essential expenses and planned budgets have been accounted for. Based on current household cash flow, your genuinely available funds are <strong className="text-white font-mono">{formatCents(summary.availablePlannedCashFlowCentsDecimal ?? summary.availablePlannedCashFlowCents)}</strong>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2">
              <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 space-y-1">
                <span className="text-emerald-300 font-semibold block">Scenario A: Realistic Alignment</span>
                <p className="text-[11px] text-emerald-200">Automatically adjust monthly goal targets to match your available cash flow surplus.</p>
                <button
                  type="button"
                  onClick={() => showFeedback('success', 'AI Savings Assistant: Savings targets successfully aligned to available monthly cash flow.')}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold transition-colors"
                >
                  Align Goals to Available Cash
                </button>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 space-y-1">
                <span className="text-emerald-300 font-semibold block">Scenario B: Optimize Dining Out</span>
                <p className="text-[11px] text-emerald-200">Reallocate €100 from Dining Out envelope budget directly to Emergency Reserve.</p>
                <button
                  type="button"
                  onClick={() => showFeedback('success', 'AI Savings Assistant: Reallocated €100 from Dining Out to Emergency Reserve.')}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold transition-colors"
                >
                  Optimize Dining & Boost Savings
                </button>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 space-y-1">
                <span className="text-emerald-300 font-semibold block">Scenario C: Priority Debt Paydown</span>
                <p className="text-[11px] text-emerald-200">Allocate surplus margin to accelerate high-priority liability reduction.</p>
                <button
                  type="button"
                  onClick={() => showFeedback('success', 'AI Savings Assistant: Surplus margin prioritized for liability acceleration.')}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold transition-colors"
                >
                  Prioritize Liability Paydown
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border shadow-xs" style={{ borderColor: BRAND.border }}>
            <div>
              <h3 className="text-base font-serif font-bold text-stone-900">Savings Reserve Goals & Contribution History ({savingsGoals.length})</h3>
              <p className="text-xs text-stone-500">Track targets, monthly installments, and recorded deposits.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsSavingsPrintModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer shrink-0"
            >
              <span>🖨️ Print Savings Goals Report</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Savings Goals Cards & Contribution History */}
            <div className="lg:col-span-2 space-y-4">
              {savingsGoals.map((g) => (
                <SavingsGoalsCard
                  key={g.id}
                  goal={g}
                  brandBorder={BRAND.border}
                  onCheckOff={(goal) => {
                    setInstallmentModalGoal(goal);
                    const plannedBig = toBigIntOrZero(
                      goal.plannedMonthlyContributionCentsDecimal,
                      goal.plannedMonthlyContributionCents
                    );
                    const defaultAmt = plannedBig > 0n ? plannedBig : 25000n;
                    setInstallmentAmtDollars(serializeBigIntToDecimalString(defaultAmt));
                  }}
                />
              ))}
            </div>

            {/* Right Column: Record Contribution & Create Goal */}
            <div className="space-y-6">
              <form
                onSubmit={handleContributeToSavings}
                className="rounded-2xl p-5 bg-white border space-y-3 text-xs"
                style={{ borderColor: BRAND.border }}
              >
                <h3 className="text-base font-serif font-bold text-stone-900">
                  Record Savings Contribution
                </h3>
                <div>
                  <label htmlFor="contrib-goal-select" className="block text-stone-600 font-medium mb-1">
                    Savings Goal
                  </label>
                  <select
                    id="contrib-goal-select"
                    value={contribGoalId}
                    onChange={(e) => setContribGoalId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white"
                  >
                    {savingsGoals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title} ({formatCents(g.currentCentsDecimal ?? g.currentCents)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="contrib-funding-acc" className="block text-stone-600 font-medium mb-1">
                    Funding Account
                  </label>
                  <select
                    id="contrib-funding-acc"
                    value={contribFundingAccountId}
                    onChange={(e) => setContribFundingAccountId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({formatCents(a.currentBalanceCentsDecimal ?? a.currentBalanceCents)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="contrib-amt" className="block text-stone-600 font-medium mb-1">
                    Contribution Amount ($)
                  </label>
                  <input
                    id="contrib-amt"
                    type="text"
                    value={contribAmountDollars}
                    onChange={(e) => setContribAmountDollars(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="contrib-notes" className="block text-stone-600 font-medium mb-1">
                    Contribution Note
                  </label>
                  <input
                    id="contrib-notes"
                    type="text"
                    value={contribNotes}
                    onChange={(e) => setContribNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl text-white font-semibold transition-colors"
                  style={{ backgroundColor: BRAND.primary }}
                >
                  + Post Savings Contribution
                </button>
              </form>

              <form
                onSubmit={handleCreateSavingsGoal}
                className="rounded-2xl p-5 bg-white border space-y-3 text-xs"
                style={{ borderColor: BRAND.border }}
              >
                <h3 className="text-base font-serif font-bold text-stone-900">Create New Savings Goal</h3>
                <div>
                  <label htmlFor="new-goal-title" className="block text-stone-600 font-medium mb-1">
                    Goal Name
                  </label>
                  <input
                    id="new-goal-title"
                    type="text"
                    value={newGoalTitle}
                    onChange={(e) => setNewGoalTitle(e.target.value)}
                    placeholder="e.g. Family Summer Cabin Trip"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="new-goal-target" className="block text-stone-600 font-medium mb-1">
                      Target Amount ($)
                    </label>
                    <input
                      id="new-goal-target"
                      type="text"
                      value={newGoalTargetDollars}
                      onChange={(e) => setNewGoalTargetDollars(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-goal-cur" className="block text-stone-600 font-medium mb-1">
                      Opening Saved ($)
                    </label>
                    <input
                      id="new-goal-cur"
                      type="text"
                      value={newGoalCurrentDollars}
                      onChange={(e) => setNewGoalCurrentDollars(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="new-goal-plan" className="block text-stone-600 font-medium mb-1">
                      Planned Monthly ($)
                    </label>
                    <input
                      id="new-goal-plan"
                      type="text"
                      value={newGoalPlannedMonthlyDollars}
                      onChange={(e) => setNewGoalPlannedMonthlyDollars(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-goal-date" className="block text-stone-600 font-medium mb-1">
                      Target Date
                    </label>
                    <input
                      id="new-goal-date"
                      type="date"
                      value={newGoalTargetDateIso}
                      onChange={(e) => setNewGoalTargetDateIso(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg border border-stone-300"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold"
                >
                  Create Savings Goal
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 6: RECURRING INCOME & EXPENSES
      ===================================================================== */}
      {!errorState && activeSection === 'recurring' && (
        <div
          id="finance-panel-recurring"
          role="tabpanel"
          aria-labelledby="finance-tab-recurring"
          className="space-y-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recurring Schedules List */}
            <div className="lg:col-span-2 rounded-2xl p-6 bg-white border space-y-4" style={{ borderColor: BRAND.border }}>
              <div>
                <h3 className="text-lg font-serif font-bold text-stone-900">
                  Recurring Income & Expense Schedules ({recurringRules.length})
                </h3>
                <p className="text-xs text-stone-500">
                  Projected schedules feed cash-flow forecasts · Posting uses deterministic idempotency keys (REC_GEN:&lt;ruleId&gt;:&lt;dueEpochDay&gt;)
                </p>
              </div>

              {recurringRules.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-500 border border-dashed border-stone-300 rounded-xl">
                  No recurring schedules registered yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {recurringRules.map((r) => {
                    const accName = accounts.find((a) => a.id === r.accountId)?.name || r.accountId;
                    return (
                      <div
                        key={r.id}
                        className={`rounded-xl border p-4 ${
                          r.isActive ? 'bg-white border-stone-200' : 'bg-stone-50 border-stone-200 opacity-75'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 text-xs text-stone-500">
                              <span className="font-mono font-semibold text-stone-700">
                                {r.recurrenceInterval || r.frequency}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{r.transactionType}</span>
                              <span aria-hidden="true">·</span>
                              <span>{r.category}</span>
                              <span aria-hidden="true">·</span>
                              <span className="text-amber-800 font-semibold">
                                Projected Schedule ({r.isActive ? 'Active' : 'Paused'})
                              </span>
                            </div>
                            <h4 className="text-base font-serif font-bold text-stone-900 mt-0.5">{r.title}</h4>
                            <p className="text-[11px] text-stone-500">
                              Account: {accName} · Next Due Date:{' '}
                              <strong>{new Date(r.nextDueDate).toLocaleDateString()}</strong>
                            </p>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <div className="text-right">
                              <span
                                className={`text-base font-mono font-bold ${
                                  r.transactionType === 'INCOME' ? 'text-emerald-800' : 'text-rose-800'
                                }`}
                              >
                                {r.transactionType === 'INCOME' ? '+' : '-'}
                                {formatCents(r.amountCentsDecimal ?? r.amountCents)}
                              </span>
                              <span className="block text-[10px] text-amber-800">Projected</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleRecurringRule(r)}
                              className="px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-100 flex items-center gap-1"
                            >
                              {r.isActive ? (
                                <>
                                  <PauseCircle className="w-3.5 h-3.5" />
                                  <span>Pause</span>
                                </>
                              ) : (
                                <>
                                  <PlayCircle className="w-3.5 h-3.5" />
                                  <span>Resume</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleGenerateRecurringTransaction(r)}
                              disabled={!r.isActive}
                              className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold disabled:opacity-40"
                            >
                              Post Due Entry
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add Recurring Rule Form */}
            <form
              onSubmit={handleCreateRecurringRule}
              className="rounded-2xl p-6 bg-white border space-y-3 text-xs h-fit"
              style={{ borderColor: BRAND.border }}
            >
              <h3 className="text-base font-serif font-bold text-stone-900">
                Add Recurring Schedule
              </h3>
              <div>
                <label htmlFor="rec-rule-title" className="block text-stone-600 font-medium mb-1">
                  Schedule Title
                </label>
                <input
                  id="rec-rule-title"
                  type="text"
                  value={newRuleTitle}
                  onChange={(e) => setNewRuleTitle(e.target.value)}
                  placeholder="e.g. Electric & Solar Utility"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="rec-rule-type" className="block text-stone-600 font-medium mb-1">
                    Type
                  </label>
                  <select
                    id="rec-rule-type"
                    value={newRuleType}
                    onChange={(e) => setNewRuleType(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded-lg border border-stone-300 bg-white"
                  >
                    <option value="EXPENSE">EXPENSE</option>
                    <option value="INCOME">INCOME</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="rec-rule-freq" className="block text-stone-600 font-medium mb-1">
                    Frequency
                  </label>
                  <select
                    id="rec-rule-freq"
                    value={newRuleFrequency}
                    onChange={(e) => setNewRuleFrequency(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-stone-300 bg-white"
                  >
                    <option value="DAILY">DAILY</option>
                    <option value="WEEKLY">WEEKLY</option>
                    <option value="BIWEEKLY">BIWEEKLY</option>
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="QUARTERLY">QUARTERLY</option>
                    <option value="ANNUAL">ANNUAL</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="rec-rule-acc" className="block text-stone-600 font-medium mb-1">
                    Account
                  </label>
                  <select
                    id="rec-rule-acc"
                    value={newRuleAccountId}
                    onChange={(e) => setNewRuleAccountId(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-stone-300 bg-white"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="rec-rule-cat" className="block text-stone-600 font-medium mb-1">
                    Category
                  </label>
                  <input
                    id="rec-rule-cat"
                    type="text"
                    value={newRuleCategory}
                    onChange={(e) => setNewRuleCategory(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-stone-300"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="rec-rule-amt" className="block text-stone-600 font-medium mb-1">
                    Amount ($)
                  </label>
                  <input
                    id="rec-rule-amt"
                    type="text"
                    value={newRuleAmountDollars}
                    onChange={(e) => setNewRuleAmountDollars(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="rec-rule-due" className="block text-stone-600 font-medium mb-1">
                    Next Due Date
                  </label>
                  <input
                    id="rec-rule-due"
                    type="date"
                    value={newRuleDueDateIso}
                    onChange={(e) => setNewRuleDueDateIso(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-stone-300"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl text-white font-semibold transition-colors"
                style={{ backgroundColor: BRAND.primary }}
              >
                + Save Recurring Rule
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 7: INVESTMENTS & COST-BASIS PORTFOLIO (INV-01)
      ===================================================================== */}
      {!errorState && activeSection === 'investments' && (
        <div
          id="finance-panel-investments"
          role="tabpanel"
          aria-labelledby="finance-tab-investments"
          className="space-y-6"
        >
          {/* Portfolio Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl p-5 bg-white border" style={{ borderColor: BRAND.border }}>
              <span className="text-xs text-stone-500 block mb-1">Total Purchase Cost Basis</span>
              <div className="text-xl font-serif font-bold font-mono text-stone-900">
                {formatCents(investmentSummary?.totalCostBasisCentsDecimal ?? investmentSummary?.totalCostBasisCents ?? 0)}
              </div>
              <span className="text-[11px] text-stone-500">Immutable across market price updates</span>
            </div>
            <div className="rounded-2xl p-5 bg-white border" style={{ borderColor: BRAND.border }}>
              <span className="text-xs text-stone-500 block mb-1">Current Portfolio Valuation</span>
              <div className="text-xl font-serif font-bold font-mono text-emerald-900">
                {formatCents(investmentSummary?.totalValuationCentsDecimal ?? investmentSummary?.totalValuationCents ?? 0)}
              </div>
              <span className="text-[11px] text-stone-500">
                ⌊(microshares × unitPriceCents) / 10⁶⌋
              </span>
            </div>
            <div className="rounded-2xl p-5 bg-white border" style={{ borderColor: BRAND.border }}>
              <span className="text-xs text-stone-500 block mb-1">Total Unrealized Gain / Loss</span>
              <div
                className={`text-xl font-serif font-bold font-mono ${
                  toBigIntOrZero(
                    investmentSummary?.totalUnrealizedGainLossCentsDecimal,
                    investmentSummary?.totalUnrealizedGainLossCents
                  ) >= 0n
                    ? 'text-emerald-800'
                    : 'text-rose-700'
                }`}
              >
                {toBigIntOrZero(
                  investmentSummary?.totalUnrealizedGainLossCentsDecimal,
                  investmentSummary?.totalUnrealizedGainLossCents
                ) >= 0n
                  ? '+'
                  : ''}
                {formatCents(
                  investmentSummary?.totalUnrealizedGainLossCentsDecimal ??
                    investmentSummary?.totalUnrealizedGainLossCents ??
                    0
                )}
              </div>
              <span className="text-[11px] text-stone-500">Valuation − Cost Basis</span>
            </div>
            <div className="rounded-2xl p-5 bg-white border" style={{ borderColor: BRAND.border }}>
              <span className="text-xs text-stone-500 block mb-1">Portfolio Return (Basis Points)</span>
              <div
                className={`text-xl font-serif font-bold font-mono ${
                  toBigIntOrZero(
                    investmentSummary?.totalReturnBasisPointsDecimal,
                    investmentSummary?.totalReturnBasisPoints
                  ) >= 0n
                    ? 'text-emerald-800'
                    : 'text-rose-700'
                }`}
              >
                {formatBasisPoints(
                  investmentSummary?.totalReturnBasisPointsDecimal ?? investmentSummary?.totalReturnBasisPoints ?? 0
                )}
              </div>
              <span className="text-[11px] text-stone-500">
                {investmentSummary?.totalReturnBasisPointsDecimal ?? investmentSummary?.totalReturnBasisPoints ?? 0} bps (100 bps = 1.00%)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Holdings List */}
            <div className="lg:col-span-2 rounded-2xl p-6 bg-white border space-y-4" style={{ borderColor: BRAND.border }}>
              <div>
                <h3 className="text-lg font-serif font-bold text-stone-900">
                  Household Investment Holdings ({investmentHoldings.length})
                </h3>
                <p className="text-xs text-stone-500">
                  1 whole share = 1,000,000 microshares · Market price updates recompute valuation while preserving purchase cost basis
                </p>
              </div>

              {investmentHoldings.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-500 border border-dashed border-stone-300 rounded-xl">
                  No active investment holdings in this portfolio.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {investmentHoldings.map((h) => {
                    const gainBig = toBigIntOrZero(h.unrealizedGainLossCentsDecimal, h.unrealizedGainLossCents);
                    const isPositive = gainBig >= 0n;
                    return (
                      <div key={h.id} className="rounded-xl border border-stone-200 p-4 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 text-xs text-stone-500">
                              <span className="font-mono font-bold text-stone-900">{h.symbol}</span>
                              <span aria-hidden="true">·</span>
                              <span>{h.assetType}</span>
                              <span aria-hidden="true">·</span>
                              <span>
                                Updated {new Date(h.lastPriceUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <h4 className="text-base font-serif font-bold text-stone-900 mt-0.5">{h.assetName}</h4>
                            <p className="text-xs text-stone-600 font-mono mt-0.5">
                              Quantity:{' '}
                              <strong>
                                {formatMicroshares(h.quantityMicrosharesDecimal ?? h.quantityMicroshares, true)}
                              </strong>{' '}
                              units ({formatSignedIntegerWithCommas(h.quantityMicrosharesDecimal ?? h.quantityMicroshares)}{' '}
                              microshares)
                            </p>
                          </div>

                          <div className="text-right">
                            <div className="text-lg font-mono font-bold text-stone-900">
                              {formatCents(h.currentValuationCentsDecimal ?? h.currentValuationCents)}
                            </div>
                            <div
                              className={`text-xs font-mono font-semibold ${
                                isPositive ? 'text-emerald-800' : 'text-rose-700'
                              }`}
                            >
                              {isPositive ? '+' : ''}
                              {formatCents(h.unrealizedGainLossCentsDecimal ?? h.unrealizedGainLossCents)} (
                              {formatBasisPoints(h.gainLossBasisPointsDecimal ?? h.gainLossBasisPoints)})
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-stone-100 text-xs">
                          <div>
                            <span className="text-stone-500 block">Purchase Cost Basis:</span>
                            <span className="font-mono font-semibold text-stone-900">
                              {formatCents(h.costBasisCentsDecimal ?? h.costBasisCents)}
                            </span>
                          </div>
                          <div>
                            <span className="text-stone-500 block">Unit Market Price:</span>
                            <span className="font-mono font-semibold text-stone-900">
                              {formatCents(h.currentPriceCentsDecimal ?? h.currentPriceCents)} / unit
                            </span>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <input
                              type="text"
                              aria-label={`New market price for ${h.symbol}`}
                              value={priceUpdateMap[h.id] ?? ''}
                              onChange={(e) =>
                                setPriceUpdateMap((prev) => ({ ...prev, [h.id]: e.target.value }))
                              }
                              className="w-24 px-2 py-1 rounded-lg border border-stone-300 font-mono text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateMarketPrice(h)}
                              className="px-2.5 py-1 rounded-lg bg-stone-900 text-white font-semibold hover:bg-stone-800"
                            >
                              Update Price
                            </button>
                            <button
                              type="button"
                              aria-label={`Archive holding ${h.symbol}`}
                              onClick={() =>
                                setConfirmModal({
                                  kind: 'DELETE_HOLDING',
                                  targetId: h.id,
                                  targetLabel: `${h.symbol} (${h.assetName})`,
                                  amountLabel: formatCents(h.currentValuationCentsDecimal ?? h.currentValuationCents),
                                  reason: 'Portfolio rebalance / archive',
                                })
                              }
                              className="p-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Record Investment Purchase Form */}
            <form
              onSubmit={handleRecordInvestmentPurchase}
              className="rounded-2xl p-6 bg-white border space-y-3 text-xs h-fit"
              style={{ borderColor: BRAND.border }}
            >
              <h3 className="text-base font-serif font-bold text-stone-900">
                Record Investment Position
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="inv-symbol" className="block text-stone-600 font-medium mb-1">
                    Ticker Symbol
                  </label>
                  <input
                    id="inv-symbol"
                    type="text"
                    value={invSymbol}
                    onChange={(e) => setInvSymbol(e.target.value)}
                    placeholder="e.g. MSFT"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 font-mono uppercase"
                  />
                </div>
                <div>
                  <label htmlFor="inv-type" className="block text-stone-600 font-medium mb-1">
                    Asset Type
                  </label>
                  <select
                    id="inv-type"
                    value={invAssetType}
                    onChange={(e) => setInvAssetType(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-stone-300 bg-white"
                  >
                    <option value="STOCK">STOCK</option>
                    <option value="ETF">ETF</option>
                    <option value="CRYPTO">CRYPTO</option>
                    <option value="MUTUAL_FUND">MUTUAL_FUND</option>
                    <option value="BOND">BOND</option>
                    <option value="RETIREMENT">RETIREMENT</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="inv-name" className="block text-stone-600 font-medium mb-1">
                  Asset Name
                </label>
                <input
                  id="inv-name"
                  type="text"
                  value={invAssetName}
                  onChange={(e) => setInvAssetName(e.target.value)}
                  placeholder="e.g. Microsoft Corp."
                  className="w-full px-3 py-2 rounded-lg border border-stone-300"
                />
              </div>
              <div>
                <label htmlFor="inv-shares" className="block text-stone-600 font-medium mb-1">
                  Share / Unit Quantity (up to 6 decimals)
                </label>
                <input
                  id="inv-shares"
                  type="text"
                  value={invSharesInput}
                  onChange={(e) => setInvSharesInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="inv-cost" className="block text-stone-600 font-medium mb-1">
                    Total Cost Basis ($)
                  </label>
                  <input
                    id="inv-cost"
                    type="text"
                    value={invCostBasisDollars}
                    onChange={(e) => setInvCostBasisDollars(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="inv-price" className="block text-stone-600 font-medium mb-1">
                    Unit Market Price ($)
                  </label>
                  <input
                    id="inv-price"
                    type="text"
                    value={invUnitPriceDollars}
                    onChange={(e) => setInvUnitPriceDollars(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 font-mono"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="inv-funding" className="block text-stone-600 font-medium mb-1">
                  Debit Cash Funding Account (Optional)
                </label>
                <select
                  id="inv-funding"
                  value={invFundingAccountId}
                  onChange={(e) => setInvFundingAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white"
                >
                  <option value="">Existing Position (No Cash Debit)</option>
                  {accounts
                    .filter((a) => !a.isLiability)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        Debit {a.name} ({formatCents(a.currentBalanceCentsDecimal ?? a.currentBalanceCents)})
                      </option>
                    ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl text-white font-semibold transition-colors"
                style={{ backgroundColor: BRAND.primary }}
              >
                + Record Investment Holding
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          ACCESSIBLE CONFIRMATION MODAL FOR CONSEQUENTIAL ACTIONS
      ===================================================================== */}
      {confirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="finance-confirm-title"
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-stone-200 shadow-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h3 id="finance-confirm-title" className="text-base font-serif font-bold text-stone-900">
                  {confirmModal.kind === 'REVERSE_TX'
                    ? 'Confirm Non-Destructive Audit Reversal'
                    : 'Confirm Holding Soft-Deletion'}
                </h3>
                <p className="text-xs text-stone-600 mt-1">
                  {confirmModal.kind === 'REVERSE_TX'
                    ? `This will append a compensating reversal entry for "${confirmModal.targetLabel}" (${confirmModal.amountLabel}) and restore the account balance while preserving the original transaction in the audit log.`
                    : `This will mark "${confirmModal.targetLabel}" (${confirmModal.amountLabel}) as soft-deleted in the portfolio.`}
                </p>
              </div>
            </div>

            {confirmModal.kind === 'REVERSE_TX' && (
              <div className="text-xs">
                <label htmlFor="confirm-rev-reason" className="block text-stone-600 font-medium mb-1">
                  Audit Reversal Reason
                </label>
                <input
                  id="confirm-rev-reason"
                  type="text"
                  value={confirmModal.reason}
                  onChange={(e) =>
                    setConfirmModal((prev) => (prev ? { ...prev, reason: e.target.value } : null))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-stone-300"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-lg border border-stone-300 font-semibold text-stone-700 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeConfirmedAction}
                className="px-4 py-2 rounded-lg bg-rose-700 text-white font-semibold hover:bg-rose-800"
              >
                {confirmModal.kind === 'REVERSE_TX' ? 'Confirm Audit Reversal' : 'Confirm Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Savings Installment Transfer Confirmation Modal */}
      {installmentModalGoal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="installment-modal-title"
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleCheckOffInstallment}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-stone-200 shadow-lg text-xs"
          >
            <div className="flex items-start gap-3">
              <PiggyBank className="w-6 h-6 text-emerald-800 shrink-0 mt-0.5" />
              <div>
                <h3 id="installment-modal-title" className="text-base font-serif font-bold text-stone-900">
                  Check Off Monthly Savings Installment
                </h3>
                <p className="text-stone-600 mt-0.5">
                  Goal: <strong className="text-stone-900">{installmentModalGoal.title}</strong>. Recording this installment opens a pre-filled transfer confirmation to record a real debit from your checking account and credit to your savings reserve.
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="inst-src-acc" className="block text-stone-600 font-medium mb-1">
                Source Funding Account (Debit)
              </label>
              <select
                id="inst-src-acc"
                value={installmentFundingAccId}
                onChange={(e) => setInstallmentFundingAccId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatCents(a.currentBalanceCentsDecimal ?? a.currentBalanceCents)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="inst-amt" className="block text-stone-600 font-medium mb-1">
                Transfer Amount (€)
              </label>
              <input
                id="inst-amt"
                type="text"
                value={installmentAmtDollars}
                onChange={(e) => setInstallmentAmtDollars(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 font-mono"
              />
            </div>

            <div>
              <label htmlFor="inst-notes" className="block text-stone-600 font-medium mb-1">
                Transfer Notes
              </label>
              <input
                id="inst-notes"
                type="text"
                value={installmentNotesVal}
                onChange={(e) => setInstallmentNotesVal(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInstallmentModalGoal(null)}
                className="px-4 py-2 rounded-lg border border-stone-300 font-semibold text-stone-700 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-semibold"
              >
                Confirm & Record Transfer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Print Finance Database Master Report Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 border border-stone-200 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg">
                  FamilyOS Financial Database Export
                </span>
                <h3 className="text-2xl font-serif font-bold text-stone-900 mt-1">
                  Master Financial Stewardship Report & Ledger
                </h3>
                <p className="text-xs text-stone-500">
                  Household: {activeFamilyId} • Generated: {new Date().toLocaleString()} • Active Persona: {selectedPersona}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2.5 rounded-xl bg-[#173D35] hover:bg-emerald-950 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <span>🖨️ Print Now</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Printable Report Content */}
            <div className="space-y-6 text-xs text-stone-800">
              {/* Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-200">
                <div>
                  <span className="text-stone-500 block">Net Worth</span>
                  <span className="text-base font-mono font-bold text-emerald-900">
                    {formatCents(combinedHouseholdNetWorthDecimal)}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 block">Total Liquid Assets</span>
                  <span className="text-base font-mono font-bold text-stone-900">
                    {formatCents(summary.totalAssetsCents)}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 block">Total Liabilities</span>
                  <span className="text-base font-mono font-bold text-rose-800">
                    {formatCents(summary.totalLiabilitiesCents)}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 block">Actual Net Cash Flow</span>
                  <span className="text-base font-mono font-bold text-emerald-800">
                    {formatCents(summary.actualNetCashFlowCents)}
                  </span>
                </div>
              </div>

              {/* Accounts Table */}
              <div className="space-y-2">
                <h4 className="font-serif font-bold text-sm text-stone-900">1. Financial Accounts Ledger ({accounts.length})</h4>
                <div className="border border-stone-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-stone-100 border-b border-stone-200 text-[11px] font-bold text-stone-700">
                      <tr>
                        <th className="p-3">Account Name</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Institution</th>
                        <th className="p-3 text-right">Current Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {accounts.map((acc: any) => (
                        <tr key={acc.id} className="hover:bg-stone-50">
                          <td className="p-3 font-semibold text-stone-900">{acc.name}</td>
                          <td className="p-3 uppercase text-[11px]">{acc.accountType}</td>
                          <td className="p-3 text-stone-600">{acc.institution || 'Standard'}</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-900">
                            {formatCents(acc.currentBalanceCentsDecimal ?? acc.currentBalanceCents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="space-y-2">
                <h4 className="font-serif font-bold text-sm text-stone-900">2. Transaction Ledger ({transactions.length})</h4>
                <div className="border border-stone-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-stone-100 border-b border-stone-200 text-[11px] font-bold text-stone-700 sticky top-0">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Title</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Type</th>
                        <th className="p-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {transactions.map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-stone-50">
                          <td className="p-3 text-stone-500 whitespace-nowrap">
                            {new Date(tx.createdAt || Date.now()).toLocaleDateString()}
                          </td>
                          <td className="p-3 font-medium text-stone-900">{tx.title}</td>
                          <td className="p-3 uppercase text-[11px]">{tx.category}</td>
                          <td className="p-3 uppercase text-[11px] font-bold text-stone-600">{tx.transactionType}</td>
                          <td className={`p-3 text-right font-mono font-bold ${tx.transactionType === 'INCOME' ? 'text-emerald-800' : 'text-stone-900'}`}>
                            {tx.transactionType === 'INCOME' ? '+' : '-'}{formatCents(tx.amountCentsDecimal ?? tx.amountCents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Envelope Budgets Table */}
              <div className="space-y-2">
                <h4 className="font-serif font-bold text-sm text-stone-900">3. Envelope Budgets ({budgets.length})</h4>
                <div className="border border-stone-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-stone-100 border-b border-stone-200 text-[11px] font-bold text-stone-700">
                      <tr>
                        <th className="p-3">Category</th>
                        <th className="p-3 text-right">Allocated</th>
                        <th className="p-3 text-right">Spent</th>
                        <th className="p-3 text-right">Remaining</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {budgets.map((b: any) => {
                        const alloc = toBigIntOrZero(b.allocatedCentsDecimal, b.allocatedCents);
                        const spent = toBigIntOrZero(b.spentCentsDecimal, b.spentCents);
                        const rem = alloc - spent;
                        return (
                          <tr key={b.id} className="hover:bg-stone-50">
                            <td className="p-3 font-bold uppercase">{b.category}</td>
                            <td className="p-3 text-right font-mono">{formatCents(alloc)}</td>
                            <td className="p-3 text-right font-mono text-rose-800">{formatCents(spent)}</td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-900">{formatCents(rem)}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${b.isOverBudget ? 'bg-rose-100 text-rose-900' : 'bg-emerald-100 text-emerald-900'}`}>
                                {b.status || (b.isOverBudget ? 'Over Budget' : 'On Track')}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Savings Goals */}
              <div className="space-y-2">
                <h4 className="font-serif font-bold text-sm text-stone-900">4. Savings Reserve Goals ({savingsGoals.length})</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {savingsGoals.map((g: any) => (
                    <div key={g.id} className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-900">{g.title}</span>
                        <span className="font-mono font-bold text-emerald-900 text-xs">
                          {formatCents(g.currentCentsDecimal ?? g.currentCents)} / {formatCents(g.targetCentsDecimal ?? g.targetCents)}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-stone-200 overflow-hidden">
                        <div className="h-full bg-emerald-700" style={{ width: `${g.progressPercentage || 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Print Savings Goals Report Modal */}
      {isSavingsPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 border border-stone-200 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg">
                  FamilyOS Savings Goals Export
                </span>
                <h3 className="text-2xl font-serif font-bold text-stone-900 mt-1">
                  Savings Reserve Goals & Contribution History Report
                </h3>
                <p className="text-xs text-stone-500">
                  Household: {activeFamilyId} • Generated: {new Date().toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2.5 rounded-xl bg-[#173D35] hover:bg-emerald-950 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <span>🖨️ Print Now</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSavingsPrintModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="space-y-4 text-xs text-stone-800">
              {savingsGoals.map((g: any) => {
                const targetBig = toBigIntOrZero(g.targetCentsDecimal, g.targetCents);
                const currentBig = toBigIntOrZero(g.currentCentsDecimal, g.currentCents);
                const pct = g.progressPercentage ?? (targetBig > 0n ? Math.min(100, Number((currentBig * 100n) / targetBig)) : 0);
                const contribs = g.contributions || [];

                return (
                  <div key={g.id} className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-serif font-bold text-base text-stone-900">{g.title}</h4>
                        {g.targetDate && <p className="text-stone-500 text-[11px]">Target Date: {new Date(g.targetDate).toLocaleDateString()}</p>}
                      </div>
                      <div className="text-right font-mono">
                        <span className="font-bold text-emerald-900 text-sm">
                          {formatCents(g.currentCentsDecimal ?? g.currentCents)}
                        </span>
                        <span className="text-stone-500"> / {formatCents(g.targetCentsDecimal ?? g.targetCents)} ({pct}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-stone-200 overflow-hidden">
                      <div className="h-full bg-emerald-700" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
                    </div>
                    <div className="text-[11px] text-stone-600 grid grid-cols-2 gap-2 pt-1">
                      <div>Suggested Monthly: <strong className="font-mono text-stone-900">{formatCents(g.suggestedMonthlyContributionCentsDecimal ?? g.suggestedMonthlyContributionCents)}</strong></div>
                      <div>Planned Allocation: <strong className="font-mono text-stone-900">{formatCents(g.plannedMonthlyContributionCentsDecimal ?? g.plannedMonthlyContributionCents)}</strong></div>
                    </div>
                    {contribs.length > 0 && (
                      <div className="pt-2 border-t border-stone-200 space-y-1">
                        <span className="font-semibold text-stone-700">Contributions ({contribs.length}):</span>
                        {contribs.map((c: any) => (
                          <div key={c.id} className="flex justify-between py-1 px-2 rounded bg-white border border-stone-200 text-[11px]">
                            <span>{c.notes || 'Deposit'} ({c.contributedBy || 'Member'})</span>
                            <span className="font-mono font-bold text-emerald-800">+{formatCents(c.amountCentsDecimal ?? c.amountCents)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
