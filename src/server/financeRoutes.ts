import { Router, Request, Response } from 'express';
import {
  getFinanceStore,
  resetFinanceStore,
  computeInvestmentValuation,
  computeUnrealizedGainLoss,
  computeGainLossBasisPoints,
  computeSuggestedMonthlyContribution,
  computeBudgetStatus,
  computeNextDueDate,
  FinancialAccount,
  FinancialTransaction,
  EnvelopeBudget,
  SavingsGoal,
  RecurringRule,
  InvestmentHolding,
  AccountReconciliation,
  CashFlowSummary,
} from './financeData';
import { loadStore, saveStoreAtomically } from '../../server.js';
import { resolveServerMembership, canPerformFinanceMutation } from './authAndRbac.js';
import type { SharedAccount, SharedTransaction, SharedBudget } from './backupAndMigration';
import {
  isValidSigned64BigInt,
  parseSigned64BigInt,
  serializeBigIntToDecimalString,
  toSafeNumberOrNull,
  MAX_SAFE_INTEGER_BIGINT,
  MIN_SAFE_INTEGER_BIGINT,
} from '../utils/financeFormatting';

export const financeRouter = Router();

/**
 * Reads an entity's authoritative 64-bit BigInt value from its `*Decimal` string property
 * and its numeric compatibility property.
 * - If the numeric property is `null` (because the stored value exceeds `MAX_SAFE_INTEGER`), returns the parsed `*Decimal` string.
 * - If both exist and the numeric property is a safe integer that was mutated by a legacy caller, syncs to the numeric value.
 */
function readEntityBigInt(entity: any, numericKey: string, decimalKey = `${numericKey}Decimal`): bigint {
  if (!entity) return 0n;
  const decVal = entity[decimalKey];
  const numVal = entity[numericKey];
  if (typeof decVal === 'string') {
    const parsedDec = parseSigned64BigInt(decVal);
    if (parsedDec !== null) {
      if (
        typeof numVal === 'number' &&
        Number.isSafeInteger(numVal) &&
        parsedDec >= MIN_SAFE_INTEGER_BIGINT &&
        parsedDec <= MAX_SAFE_INTEGER_BIGINT &&
        BigInt(numVal) !== parsedDec
      ) {
        return BigInt(numVal);
      }
      return parsedDec;
    }
  }
  return parseSigned64BigInt(numVal) ?? 0n;
}

/**
 * Writes a validated signed 64-bit `BigInt` to both the authoritative `*Decimal` string field
 * and the backward-compatible numeric field (`toSafeNumberOrNull(valBig)`, which is `null` if unsafe).
 */
function writeEntityBigInt(entity: any, numericKey: string, valBig: bigint, decimalKey = `${numericKey}Decimal`): void {
  if (!isValidSigned64BigInt(valBig)) {
    throw new RangeError(`Financial field "${numericKey}" overflowed signed 64-bit integer range.`);
  }
  entity[decimalKey] = serializeBigIntToDecimalString(valBig);
  entity[numericKey] = toSafeNumberOrNull(valBig);
}

function computeBudgetStatusBigInt(allocBig: bigint, spentBig: bigint, alertThresholdPercentage = 85): {
  status: 'NORMAL' | 'WARNING' | 'OVER_BUDGET';
  spentPercentage: number;
} {
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

function computeSuggestedMonthlyContributionBigInt(targetBig: bigint, currentBig: bigint, targetDate?: number | null): bigint {
  const remainingBig = targetBig > currentBig ? targetBig - currentBig : 0n;
  if (remainingBig === 0n) return 0n;
  if (!targetDate || targetDate <= Date.now()) return remainingBig;

  const msRemaining = targetDate - Date.now();
  const monthsRemaining = BigInt(Math.max(1, Math.ceil(msRemaining / (30.4375 * 24 * 3600 * 1000))));
  return (remainingBig + monthsRemaining - 1n) / monthsRemaining;
}

function serializeAccount(a: SharedAccount) {
  const balBig = readEntityBigInt(a, 'currentBalanceCents');
  return {
    ...a,
    currentBalanceCents: toSafeNumberOrNull(balBig),
    currentBalanceCentsDecimal: serializeBigIntToDecimalString(balBig),
  };
}

function serializeReconciliation(r: AccountReconciliation) {
  const stmtBig = readEntityBigInt(r, 'statementEndingBalanceCents');
  const ledgBig = readEntityBigInt(r, 'ledgerBalanceCents');
  const discBig = stmtBig - ledgBig;
  return {
    ...r,
    statementEndingBalanceCents: toSafeNumberOrNull(stmtBig),
    statementEndingBalanceCentsDecimal: serializeBigIntToDecimalString(stmtBig),
    ledgerBalanceCents: toSafeNumberOrNull(ledgBig),
    ledgerBalanceCentsDecimal: serializeBigIntToDecimalString(ledgBig),
    discrepancyCents: toSafeNumberOrNull(discBig),
    discrepancyCentsDecimal: serializeBigIntToDecimalString(discBig),
  };
}

function serializeTransaction(t: SharedTransaction) {
  const amtBig = readEntityBigInt(t, 'amountCents');
  return {
    ...t,
    amountCents: toSafeNumberOrNull(amtBig),
    amountCentsDecimal: serializeBigIntToDecimalString(amtBig),
  };
}


// ============================================================================
// ZERO-TRUST FAMILY MEMBERSHIP & ROLE-BASED ACCESS CONTROL MIDDLEWARE
// ============================================================================
financeRouter.param('familyId', (req: Request, res: Response, next, familyId) => {
  const actor = (req as any).actor;
  if (!actor || !actor.userAccountId) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing authenticated session.' });
  }

  const store = loadStore();
  const access = resolveServerMembership(store, actor.userAccountId, familyId);
  if (!access.allowed || !access.membership) {
    return res.status(access.httpStatus).json({
      error: access.errorCode || 'WORKSPACE_ISOLATION_VIOLATION',
      message: access.errorMessage || 'Access denied for family finance workspace.',
    });
  }

  // COPPA & Family Governance: Children and Guests are strictly barred from financial records
  const role = access.membership.role;
  if (role === 'CHILD' || role === 'GUEST') {
    return res.status(403).json({
      error: 'FINANCE_ACCESS_RESTRICTED',
      message: `Role '${role}' is not authorized to access protected family financial ledgers.`,
    });
  }

  (req as any).membership = access.membership;
  next();
});

// ============================================================================
// 1. ACCOUNTS & RECONCILIATION
// ============================================================================

// List family accounts
financeRouter.get('/:familyId/accounts', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const store = loadStore();
  const financeStore = getFinanceStore(familyId);
  const accounts = (store.accounts || []).filter((a) => a.familyId === familyId).map(serializeAccount);
  const reconciliations = Array.from(financeStore.reconciliations.values())
    .sort((a, b) => b.reconciledAt - a.reconciledAt)
    .map(serializeReconciliation);
  res.json({ accounts, reconciliations });
});

// Create new account
financeRouter.post('/:familyId/accounts', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const {
    name,
    accountType,
    currentBalanceCents = 0,
    currentBalanceCentsDecimal,
    isLiability = false,
    institution = 'Family Treasury',
  } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'ACCOUNT_NAME_REQUIRED', message: 'Valid account name is required.' });
  }

  const validTypes = ['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'CASH', 'LOAN'];
  const normalizedType = String(accountType || 'CHECKING').toUpperCase();
  if (!validTypes.includes(normalizedType)) {
    return res.status(400).json({ error: 'INVALID_ACCOUNT_TYPE', message: `accountType must be one of ${validTypes.join(', ')}.` });
  }

  // If caller explicitly supplied an unsafe numeric field without a valid decimal string, or if either fails 64-bit validation, reject
  if (
    currentBalanceCents !== undefined &&
    typeof currentBalanceCents === 'number' &&
    !Number.isSafeInteger(currentBalanceCents)
  ) {
    return res.status(400).json({ error: 'UNSAFE_NUMERIC_BALANCE', message: 'Numeric currentBalanceCents exceeds Number.MAX_SAFE_INTEGER; supply currentBalanceCentsDecimal.' });
  }

  const rawBalanceInput = currentBalanceCentsDecimal !== undefined ? currentBalanceCentsDecimal : currentBalanceCents;
  const balanceBig = parseSigned64BigInt(rawBalanceInput);
  if (balanceBig === null) {
    return res.status(400).json({ error: 'INVALID_BALANCE', message: 'currentBalanceCents must be a valid signed 64-bit integer or decimal string.' });
  }

  const store = loadStore();
  const now = Date.now();
  const newAccount: SharedAccount = {
    id: `acc-${now}-${Math.random().toString(36).slice(2, 6)}`,
    familyId,
    name: name.trim(),
    accountType: normalizedType as any,
    currentBalanceCents: toSafeNumberOrNull(balanceBig) as any,
    isLiability: Boolean(isLiability) || normalizedType === 'CREDIT_CARD' || normalizedType === 'LOAN',
    institution: institution.trim(),
    updatedAt: now,
  };
  writeEntityBigInt(newAccount, 'currentBalanceCents', balanceBig);

  store.accounts = store.accounts || [];
  store.accounts.push(newAccount);
  saveStoreAtomically(store);

  res.status(201).json({ account: serializeAccount(newAccount) });
});

// Update account (name, institution, archive)
financeRouter.put('/:familyId/accounts/:accountId', (req: Request, res: Response) => {
  const { familyId, accountId } = req.params;
  const { name, institution, isLiability, isArchived } = req.body;

  const store = loadStore();
  const account = (store.accounts || []).find((a) => a.id === accountId && a.familyId === familyId);
  if (!account) {
    return res.status(404).json({ error: 'ACCOUNT_NOT_FOUND', message: 'Account not found in this family workspace.' });
  }

  if (name && typeof name === 'string' && name.trim()) {
    account.name = name.trim();
  }
  if (institution && typeof institution === 'string') {
    account.institution = institution.trim();
  }
  if (isLiability !== undefined) {
    account.isLiability = Boolean(isLiability);
  }
  if (isArchived !== undefined) {
    (account as any).isArchived = Boolean(isArchived);
  }
  account.updatedAt = Date.now();

  saveStoreAtomically(store);
  res.json({ account: serializeAccount(account) });
});

financeRouter.delete('/:familyId/accounts/:accountId', (req: Request, res: Response) => {
  const { familyId, accountId } = req.params;
  const store = loadStore();
  const idx = (store.accounts || []).findIndex((a) => a.id === accountId && a.familyId === familyId);
  if (idx === -1) {
    return res.status(404).json({ error: 'ACCOUNT_NOT_FOUND', message: 'Account not found in this family workspace.' });
  }
  const [removed] = store.accounts.splice(idx, 1);
  saveStoreAtomically(store);
  res.json({ status: 'DELETED', account: serializeAccount(removed) });
});

// Reconcile account statement balance
financeRouter.post('/:familyId/accounts/:accountId/reconcile', (req: Request, res: Response) => {
  const { familyId, accountId } = req.params;
  const {
    statementEndingBalanceCents,
    statementEndingBalanceCentsDecimal,
    statementBalanceCents,
    statementDate = Date.now(),
  } = req.body;

  if (
    statementEndingBalanceCents !== undefined &&
    typeof statementEndingBalanceCents === 'number' &&
    !Number.isSafeInteger(statementEndingBalanceCents)
  ) {
    return res.status(400).json({ error: 'UNSAFE_STATEMENT_BALANCE', message: 'Numeric statementEndingBalanceCents exceeds Number.MAX_SAFE_INTEGER; supply statementEndingBalanceCentsDecimal.' });
  }

  const rawStmtInput =
    statementEndingBalanceCentsDecimal !== undefined
      ? statementEndingBalanceCentsDecimal
      : statementEndingBalanceCents !== undefined
      ? statementEndingBalanceCents
      : statementBalanceCents;
  const stmtBig = parseSigned64BigInt(rawStmtInput);
  if (stmtBig === null) {
    return res.status(400).json({ error: 'INVALID_STATEMENT_BALANCE', message: 'statementEndingBalanceCents must be an exact signed 64-bit integer cents amount.' });
  }

  const store = loadStore();
  const account = (store.accounts || []).find((a) => a.id === accountId && a.familyId === familyId);
  if (!account) {
    return res.status(404).json({ error: 'ACCOUNT_NOT_FOUND', message: 'Account not found.' });
  }

  const ledgerBig = readEntityBigInt(account, 'currentBalanceCents');
  const discrepancyBig = stmtBig - ledgerBig;
  if (!isValidSigned64BigInt(discrepancyBig)) {
    return res.status(400).json({ error: 'RECONCILIATION_OVERFLOW', message: 'Discrepancy exceeds signed 64-bit integer range.' });
  }
  const membership = (req as any).membership;
  const now = Date.now();

  const record: AccountReconciliation = {
    id: `rec-${now}-${Math.random().toString(36).slice(2, 6)}`,
    familyId,
    accountId,
    statementDate: Number(statementDate),
    statementEndingBalanceCents: toSafeNumberOrNull(stmtBig) as any,
    ledgerBalanceCents: toSafeNumberOrNull(ledgerBig) as any,
    discrepancyCents: toSafeNumberOrNull(discrepancyBig) as any,
    isReconciled: discrepancyBig === 0n,
    reconciledBy: membership.displayName,
    reconciledAt: now,
  };
  writeEntityBigInt(record, 'statementEndingBalanceCents', stmtBig);
  writeEntityBigInt(record, 'ledgerBalanceCents', ledgerBig);
  writeEntityBigInt(record, 'discrepancyCents', discrepancyBig);

  const financeStore = getFinanceStore(familyId);
  financeStore.reconciliations.set(record.id, record);

  account.lastReconciledAt = now;
  account.updatedAt = now;
  saveStoreAtomically(store);

  res.json({
    reconciliation: serializeReconciliation(record),
    account: serializeAccount(account),
    discrepancyCents: toSafeNumberOrNull(discrepancyBig),
    discrepancyCentsDecimal: serializeBigIntToDecimalString(discrepancyBig),
  });
});

// ============================================================================
// 2. TRANSACTIONS & AUDIT REVERSALS
// ============================================================================

// List transactions
financeRouter.get('/:familyId/transactions', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const { accountId, category, limit = 50, offset = 0 } = req.query;

  const store = loadStore();
  let txs = (store.transactions || []).filter((t) => t.familyId === familyId);

  if (accountId) {
    txs = txs.filter((t) => t.accountId === accountId || t.destinationAccountId === accountId);
  }
  if (category) {
    txs = txs.filter((t) => t.category.toUpperCase() === String(category).toUpperCase());
  }

  // Sort descending by date
  txs.sort((a, b) => b.transactionDate - a.transactionDate);

  const paginated = txs.slice(Number(offset), Number(offset) + Number(limit)).map(serializeTransaction);
  res.json({ transactions: paginated, total: txs.length });
});

// Create transaction (Income, Expense, Internal Transfer)
financeRouter.post(['/:familyId/transactions', '/:familyId/transaction'], (req: Request, res: Response) => {
  const { familyId } = req.params;
  const {
    accountId,
    destinationAccountId = null,
    title,
    merchantOrPayee,
    notes,
    amountCents,
    amountCentsDecimal,
    transactionType = 'EXPENSE',
    category = 'FOOD',
    transactionDate = Date.now(),
    idempotencyKey: bodyIdempotencyKey,
  } = req.body;

  const headerIdempotencyKey = req.headers['x-idempotency-key'];
  const idempotencyKey = String(
    (typeof headerIdempotencyKey === 'string' && headerIdempotencyKey.trim()) ||
      (typeof bodyIdempotencyKey === 'string' && bodyIdempotencyKey.trim()) ||
      `TX-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  );

  const store = loadStore();

  // Deduplication check
  if (store.processedIdempotencyKeys[idempotencyKey]?.responseReceipt?.transaction) {
    return res.status(200).json({
      transaction: serializeTransaction(
        store.processedIdempotencyKeys[idempotencyKey].responseReceipt.transaction as SharedTransaction
      ),
      deduplicated: true,
      idempotencyKey,
    });
  }

  if (amountCents !== undefined && typeof amountCents === 'number' && !Number.isSafeInteger(amountCents)) {
    return res.status(400).json({ error: 'UNSAFE_TRANSACTION_AMOUNT', message: 'Numeric amountCents exceeds Number.MAX_SAFE_INTEGER; supply amountCentsDecimal.' });
  }

  const rawAmtInput = amountCentsDecimal !== undefined ? amountCentsDecimal : amountCents;
  const amountBig = parseSigned64BigInt(rawAmtInput);
  if (amountBig === null || amountBig <= 0n) {
    return res.status(400).json({ error: 'INVALID_TRANSACTION_AMOUNT', message: 'amountCents must be a positive signed 64-bit integer.' });
  }

  const finalTitle = String(title || merchantOrPayee || notes || 'Transaction').trim();
  if (!finalTitle) {
    return res.status(400).json({ error: 'TITLE_REQUIRED', message: 'Transaction title is required.' });
  }

  const account = (store.accounts || []).find((a) => a.id === accountId && a.familyId === familyId);
  if (!account) {
    return res.status(404).json({ error: 'ACCOUNT_NOT_FOUND', message: 'Account not found in family workspace.' });
  }

  const normalizedType = String(transactionType).toUpperCase();
  let destinationAccount: SharedAccount | undefined;

  if (normalizedType === 'TRANSFER') {
    if (!destinationAccountId || destinationAccountId === account.id) {
      return res.status(400).json({ error: 'INVALID_TRANSFER_DESTINATION', message: 'Internal transfers require a distinct destination account.' });
    }
    destinationAccount = (store.accounts || []).find((a) => a.id === destinationAccountId && a.familyId === familyId);
    if (!destinationAccount) {
      return res.status(404).json({ error: 'DESTINATION_ACCOUNT_NOT_FOUND', message: 'Destination account not found in family workspace.' });
    }
  }

  const accBalBig = readEntityBigInt(account, 'currentBalanceCents');
  const nextAccBalBig = normalizedType === 'INCOME' ? accBalBig + amountBig : accBalBig - amountBig;
  if (!isValidSigned64BigInt(nextAccBalBig)) {
    return res.status(400).json({ error: 'BALANCE_OVERFLOW', message: 'Resulting account balance exceeds signed 64-bit integer bounds.' });
  }

  let nextDestBalBig = 0n;
  if (normalizedType === 'TRANSFER' && destinationAccount) {
    nextDestBalBig = readEntityBigInt(destinationAccount, 'currentBalanceCents') + amountBig;
    if (!isValidSigned64BigInt(nextDestBalBig)) {
      return res.status(400).json({ error: 'DESTINATION_BALANCE_OVERFLOW', message: 'Resulting destination account balance exceeds signed 64-bit integer bounds.' });
    }
  }

  const membership = (req as any).membership;
  const now = Date.now();
  const txId = `tx-${now}-${Math.random().toString(36).slice(2, 6)}`;

  const newTx: SharedTransaction = {
    id: txId,
    familyId,
    accountId: account.id,
    destinationAccountId: destinationAccount ? destinationAccount.id : null,
    title: finalTitle,
    amountCents: toSafeNumberOrNull(amountBig) as any,
    transactionType: normalizedType as any,
    category: String(category).toUpperCase(),
    transactionDate: Number(transactionDate),
    isReversal: false,
    reversalOfId: null,
    paidBy: membership.displayName,
    idempotencyKey,
  };
  writeEntityBigInt(newTx, 'amountCents', amountBig);

  store.transactions = store.transactions || [];
  store.transactions.unshift(newTx);

  // Atomic 64-bit account and budget updates
  writeEntityBigInt(account, 'currentBalanceCents', nextAccBalBig);
  if (normalizedType === 'TRANSFER' && destinationAccount) {
    writeEntityBigInt(destinationAccount, 'currentBalanceCents', nextDestBalBig);
  } else if (normalizedType !== 'INCOME') {
    const budget = (store.budgets || []).find(
      (b) => b.familyId === familyId && b.category.toUpperCase() === newTx.category
    );
    if (budget) {
      const nextSpentBig = readEntityBigInt(budget, 'spentCents') + amountBig;
      if (isValidSigned64BigInt(nextSpentBig)) {
        writeEntityBigInt(budget, 'spentCents', nextSpentBig);
      }
    }
  }
  account.updatedAt = now;
  if (destinationAccount) destinationAccount.updatedAt = now;

  store.processedIdempotencyKeys[idempotencyKey] = {
    operationId: `op-${txId}`,
    idempotencyKey,
    familyId,
    entityType: normalizedType,
    entityId: txId,
    operationType: 'INSERT',
    conflictPolicy: 'APPEND_ONLY_LEDGER',
    acknowledgedAt: now,
    responseReceipt: { transaction: newTx },
  };

  saveStoreAtomically(store);

  res.status(201).json({
    transaction: serializeTransaction(newTx),
    deduplicated: false,
    idempotencyKey,
  });
});

// Non-destructive audit reversal
financeRouter.post(['/:familyId/transactions/:id/reverse', '/:familyId/reverse'], (req: Request, res: Response) => {
  const { familyId } = req.params;
  const transactionId = req.params.id || req.body.transactionId;
  const { reason = 'Audit reversal' } = req.body;

  const store = loadStore();
  const original = (store.transactions || []).find((t) => t.id === transactionId && t.familyId === familyId);
  if (!original || original.isReversal) {
    return res.status(400).json({ error: 'INVALID_REVERSAL_TARGET', message: 'Original non-reversal transaction not found.' });
  }

  const alreadyReversed = (store.transactions || []).some((t) => t.reversalOfId === original.id);
  if (alreadyReversed) {
    return res.status(400).json({ error: 'DUPLICATE_REVERSAL_BLOCKED', message: 'Transaction has already been reversed.' });
  }

  const origAmtBig = readEntityBigInt(original, 'amountCents');
  const membership = (req as any).membership;
  const now = Date.now();
  const revId = `tx-rev-${now}-${Math.random().toString(36).slice(2, 6)}`;

  const reversalTx: SharedTransaction = {
    id: revId,
    familyId,
    accountId: original.accountId,
    destinationAccountId: original.destinationAccountId || null,
    title: `Reversal: ${original.title} (${reason})`,
    amountCents: toSafeNumberOrNull(origAmtBig) as any,
    transactionType: original.transactionType,
    category: original.category,
    transactionDate: now,
    isReversal: true,
    reversalOfId: original.id,
    paidBy: `${membership.displayName} (Audit Reversal)`,
  };
  writeEntityBigInt(reversalTx, 'amountCents', origAmtBig);

  store.transactions.unshift(reversalTx);

  // Restore balances in BigInt
  const account = (store.accounts || []).find((a) => a.id === original.accountId && a.familyId === familyId);
  if (account) {
    const accBalBig = readEntityBigInt(account, 'currentBalanceCents');
    if (original.transactionType === 'INCOME') {
      writeEntityBigInt(account, 'currentBalanceCents', accBalBig - origAmtBig);
    } else if (original.transactionType === 'TRANSFER' && original.destinationAccountId) {
      const destAcc = (store.accounts || []).find((a) => a.id === original.destinationAccountId && a.familyId === familyId);
      writeEntityBigInt(account, 'currentBalanceCents', accBalBig + origAmtBig);
      if (destAcc) {
        const destBalBig = readEntityBigInt(destAcc, 'currentBalanceCents');
        writeEntityBigInt(destAcc, 'currentBalanceCents', destBalBig - origAmtBig);
      }
    } else {
      writeEntityBigInt(account, 'currentBalanceCents', accBalBig + origAmtBig);
    }
    account.updatedAt = now;
  }

  if (original.transactionType === 'EXPENSE') {
    const budget = (store.budgets || []).find((b) => b.familyId === familyId && b.category.toUpperCase() === original.category.toUpperCase());
    if (budget) {
      const spentBig = readEntityBigInt(budget, 'spentCents');
      const nextSpentBig = spentBig > origAmtBig ? spentBig - origAmtBig : 0n;
      writeEntityBigInt(budget, 'spentCents', nextSpentBig);
    }
  }

  saveStoreAtomically(store);
  const serializedRev = serializeTransaction(reversalTx);
  res.status(200).json({
    reversal: serializedRev,
    reversalTransaction: serializedRev,
    originalTransactionId: original.id,
  });
});

// ============================================================================
// 3. ENVELOPE BUDGETS
// ============================================================================

function serializeBudget(b: SharedBudget) {
  const allocBig = readEntityBigInt(b, 'allocatedCents');
  const spentBig = readEntityBigInt(b, 'spentCents');
  const remBig = allocBig - spentBig;
  const { status, spentPercentage } = computeBudgetStatusBigInt(allocBig, spentBig, b.alertThresholdPercentage);
  return {
    ...b,
    allocatedCents: toSafeNumberOrNull(allocBig),
    allocatedCentsDecimal: serializeBigIntToDecimalString(allocBig),
    spentCents: toSafeNumberOrNull(spentBig),
    spentCentsDecimal: serializeBigIntToDecimalString(spentBig),
    remainingCents: toSafeNumberOrNull(remBig),
    remainingCentsDecimal: serializeBigIntToDecimalString(remBig),
    status,
    spentPercentage,
    utilizationPercentage: spentPercentage,
    isWarning: status === 'WARNING',
    isOverBudget: status === 'OVER_BUDGET',
  };
}

financeRouter.get('/:familyId/budgets', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const store = loadStore();
  const budgets = (store.budgets || []).filter((b) => b.familyId === familyId).map(serializeBudget);
  res.json({ budgets });
});

financeRouter.post('/:familyId/budgets', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const { category, allocatedCents, allocatedCentsDecimal, spentCents, spentCentsDecimal, alertThresholdPercentage = 80 } = req.body;

  if (!category || typeof category !== 'string' || !category.trim()) {
    return res.status(400).json({ error: 'CATEGORY_REQUIRED' });
  }

  if (allocatedCents !== undefined && typeof allocatedCents === 'number' && !Number.isSafeInteger(allocatedCents)) {
    return res.status(400).json({ error: 'UNSAFE_ALLOCATION', message: 'Numeric allocatedCents exceeds Number.MAX_SAFE_INTEGER; supply allocatedCentsDecimal.' });
  }

  const rawAlloc = allocatedCentsDecimal !== undefined ? allocatedCentsDecimal : allocatedCents;
  const allocBig = parseSigned64BigInt(rawAlloc);
  if (allocBig === null || allocBig < 0n) {
    return res.status(400).json({ error: 'INVALID_ALLOCATION', message: 'allocatedCents must be a non-negative signed 64-bit integer cents amount.' });
  }

  const rawSpent = spentCentsDecimal !== undefined ? spentCentsDecimal : (spentCents !== undefined ? spentCents : 0);
  const spentBig = parseSigned64BigInt(rawSpent);
  if (spentBig === null || spentBig < 0n) {
    return res.status(400).json({ error: 'INVALID_SPENT_CENTS', message: 'spentCents must be a non-negative signed 64-bit integer cents amount.' });
  }

  const store = loadStore();
  store.budgets = store.budgets || [];
  const normalizedCat = category.trim().toUpperCase();

  let budget = store.budgets.find((b) => b.familyId === familyId && b.category.toUpperCase() === normalizedCat);
  const now = Date.now();

  if (budget) {
    writeEntityBigInt(budget, 'allocatedCents', allocBig);
    writeEntityBigInt(budget, 'spentCents', spentBig);
    budget.alertThresholdPercentage = Number(alertThresholdPercentage);
    budget.updatedAt = now;
  } else {
    budget = {
      id: `b-${now}-${Math.random().toString(36).slice(2, 6)}`,
      familyId,
      category: normalizedCat,
      allocatedCents: toSafeNumberOrNull(allocBig) as any,
      spentCents: toSafeNumberOrNull(spentBig) as any,
      alertThresholdPercentage: Number(alertThresholdPercentage),
      updatedAt: now,
    };
    writeEntityBigInt(budget, 'allocatedCents', allocBig);
    writeEntityBigInt(budget, 'spentCents', spentBig);
    store.budgets.push(budget);
  }

  saveStoreAtomically(store);
  res.status(200).json({ budget: serializeBudget(budget) });
});

// ============================================================================
// 4. SAVINGS GOALS
// ============================================================================

function serializeGoal(g: SavingsGoal) {
  const targetBig = readEntityBigInt(g, 'targetCents');
  const currentBig = readEntityBigInt(g, 'currentCents');
  const plannedBig = readEntityBigInt(g, 'plannedMonthlyContributionCents');
  const suggestedBig = computeSuggestedMonthlyContributionBigInt(targetBig, currentBig, g.targetDate);
  const progressPercentage = targetBig > 0n ? Math.min(100, Number((currentBig * 100n) / targetBig)) : 0;
  const serializedContribs = (g.contributions || []).map((c: any) => {
    const cBig = readEntityBigInt(c, 'amountCents');
    return {
      ...c,
      amountCents: toSafeNumberOrNull(cBig),
      amountCentsDecimal: serializeBigIntToDecimalString(cBig),
    };
  });

  return {
    ...g,
    name: g.title,
    title: g.title,
    targetCents: toSafeNumberOrNull(targetBig),
    targetCentsDecimal: serializeBigIntToDecimalString(targetBig),
    targetAmountCents: toSafeNumberOrNull(targetBig),
    currentCents: toSafeNumberOrNull(currentBig),
    currentCentsDecimal: serializeBigIntToDecimalString(currentBig),
    currentAmountCents: toSafeNumberOrNull(currentBig),
    plannedMonthlyContributionCents: toSafeNumberOrNull(plannedBig),
    plannedMonthlyContributionCentsDecimal: serializeBigIntToDecimalString(plannedBig),
    targetDate: g.targetDate,
    targetDateEpoch: g.targetDate,
    isCompleted: currentBig >= targetBig,
    suggestedMonthlyContributionCents: toSafeNumberOrNull(suggestedBig),
    suggestedMonthlyContributionCentsDecimal: serializeBigIntToDecimalString(suggestedBig),
    progressPercentage,
    contributions: serializedContribs,
  };
}

financeRouter.get('/:familyId/savings', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const financeStore = getFinanceStore(familyId);
  const goals = Array.from(financeStore.savingsGoals.values()).map(serializeGoal);
  res.json({ goals });
});

financeRouter.post('/:familyId/savings', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const {
    title,
    name,
    targetCents,
    targetCentsDecimal,
    targetAmountCents,
    currentCents = 0,
    currentCentsDecimal,
    currentAmountCents = 0,
    plannedMonthlyContributionCents = 0,
    plannedMonthlyContributionCentsDecimal,
    targetDate = null,
    targetDateEpoch = null,
    linkedAccountId = null,
  } = req.body;

  const finalTitle = String(title || name || '').trim();
  if (!finalTitle) {
    return res.status(400).json({ error: 'TITLE_REQUIRED' });
  }

  const rawTarget = targetCentsDecimal ?? targetCents ?? targetAmountCents;
  const targetBig = parseSigned64BigInt(rawTarget);
  if (targetBig === null || targetBig <= 0n) {
    return res.status(400).json({ error: 'INVALID_TARGET_CENTS', message: 'targetCents must be a positive signed 64-bit integer cents value.' });
  }

  const rawCurrent = currentCentsDecimal ?? (currentCents || currentAmountCents || 0);
  const currentBig = parseSigned64BigInt(rawCurrent);
  if (currentBig === null || currentBig < 0n) {
    return res.status(400).json({ error: 'INVALID_CURRENT_CENTS', message: 'currentCents must be a non-negative signed 64-bit integer cents value.' });
  }

  const rawPlanned = plannedMonthlyContributionCentsDecimal ?? (plannedMonthlyContributionCents || 0);
  const plannedBig = parseSigned64BigInt(rawPlanned);
  if (plannedBig === null || plannedBig < 0n) {
    return res.status(400).json({ error: 'INVALID_PLANNED_CONTRIBUTION', message: 'plannedMonthlyContributionCents must be a non-negative signed 64-bit integer.' });
  }

  const now = Date.now();
  const goalId = `goal-${now}-${Math.random().toString(36).slice(2, 6)}`;
  const resolvedTargetDate = targetDate ? Number(targetDate) : (targetDateEpoch ? Number(targetDateEpoch) : null);
  const suggestedBig = computeSuggestedMonthlyContributionBigInt(targetBig, currentBig, resolvedTargetDate);

  const goal: SavingsGoal = {
    id: goalId,
    familyId,
    linkedAccountId,
    title: finalTitle,
    targetCents: toSafeNumberOrNull(targetBig) as any,
    currentCents: toSafeNumberOrNull(currentBig) as any,
    plannedMonthlyContributionCents: toSafeNumberOrNull(plannedBig) as any,
    targetDate: resolvedTargetDate,
    isCompleted: currentBig >= targetBig,
    suggestedMonthlyContributionCents: toSafeNumberOrNull(suggestedBig) as any,
    contributions: [],
    createdAt: now,
    updatedAt: now,
  };
  writeEntityBigInt(goal, 'targetCents', targetBig);
  writeEntityBigInt(goal, 'currentCents', currentBig);
  writeEntityBigInt(goal, 'plannedMonthlyContributionCents', plannedBig);
  writeEntityBigInt(goal, 'suggestedMonthlyContributionCents', suggestedBig);

  const financeStore = getFinanceStore(familyId);
  financeStore.savingsGoals.set(goal.id, goal);

  const serialized = serializeGoal(goal);
  res.status(201).json({ goal: serialized });
});

// Record contribution to savings goal (without double-counting)
financeRouter.post('/:familyId/savings/:goalId/contribute', (req: Request, res: Response) => {
  const { familyId, goalId } = req.params;
  const { amountCents, amountCentsDecimal, fundingAccountId, notes } = req.body;

  if (amountCents !== undefined && typeof amountCents === 'number' && !Number.isSafeInteger(amountCents)) {
    return res.status(400).json({ error: 'UNSAFE_CONTRIBUTION_AMOUNT', message: 'Numeric amountCents exceeds Number.MAX_SAFE_INTEGER; supply amountCentsDecimal.' });
  }

  const amountBig = parseSigned64BigInt(amountCentsDecimal !== undefined ? amountCentsDecimal : amountCents);
  if (amountBig === null || amountBig <= 0n) {
    return res.status(400).json({ error: 'INVALID_AMOUNT', message: 'amountCents must be a positive signed 64-bit integer.' });
  }

  const financeStore = getFinanceStore(familyId);
  const goal = financeStore.savingsGoals.get(goalId);
  if (!goal) {
    return res.status(404).json({ error: 'SAVINGS_GOAL_NOT_FOUND' });
  }

  const curGoalBig = readEntityBigInt(goal, 'currentCents');
  const nextGoalBig = curGoalBig + amountBig;
  if (!isValidSigned64BigInt(nextGoalBig)) {
    return res.status(400).json({ error: 'SAVINGS_BALANCE_OVERFLOW', message: 'Resulting savings goal balance exceeds signed 64-bit integer bounds.' });
  }

  const now = Date.now();
  const membership = (req as any).membership;

  if (fundingAccountId) {
    const store = loadStore();
    const account = (store.accounts || []).find((a) => a.id === fundingAccountId && a.familyId === familyId);
    if (account) {
      const nextFundBal = readEntityBigInt(account, 'currentBalanceCents') - amountBig;
      writeEntityBigInt(account, 'currentBalanceCents', nextFundBal);
      account.updatedAt = now;
      const destAccount = goal.linkedAccountId
        ? (store.accounts || []).find((a) => a.id === goal.linkedAccountId && a.familyId === familyId)
        : undefined;
      if (destAccount && destAccount.id !== account.id) {
        const nextDestBal = readEntityBigInt(destAccount, 'currentBalanceCents') + amountBig;
        writeEntityBigInt(destAccount, 'currentBalanceCents', nextDestBal);
        destAccount.updatedAt = now;
      }

      const tx: SharedTransaction = {
        id: `tx-sav-${now}-${Math.random().toString(36).slice(2, 6)}`,
        familyId,
        accountId: account.id,
        destinationAccountId: destAccount ? destAccount.id : null,
        title: `Savings Contribution: ${goal.title}`,
        amountCents: toSafeNumberOrNull(amountBig) as any,
        transactionType: 'TRANSFER',
        category: 'SAVINGS_CONTRIBUTION',
        transactionDate: now,
        isReversal: false,
        reversalOfId: null,
        paidBy: membership?.displayName || 'Family Member',
      };
      writeEntityBigInt(tx, 'amountCents', amountBig);
      store.transactions = store.transactions || [];
      store.transactions.unshift(tx);
      saveStoreAtomically(store);
    }
  }

  const targetBig = readEntityBigInt(goal, 'targetCents');
  writeEntityBigInt(goal, 'currentCents', nextGoalBig);
  goal.isCompleted = nextGoalBig >= targetBig;
  const suggestedBig = computeSuggestedMonthlyContributionBigInt(targetBig, nextGoalBig, goal.targetDate);
  writeEntityBigInt(goal, 'suggestedMonthlyContributionCents', suggestedBig);

  const contribEntry: any = {
    id: `contrib-${now}-${Math.random().toString(36).slice(2, 6)}`,
    goalId: goal.id,
    amountCents: toSafeNumberOrNull(amountBig),
    fundingAccountId: fundingAccountId || null,
    notes: notes ? String(notes).trim() : 'Savings deposit',
    contributedBy: membership?.displayName || 'Family Member',
    contributedAt: now,
  };
  writeEntityBigInt(contribEntry, 'amountCents', amountBig);

  goal.contributions = goal.contributions || [];
  goal.contributions.unshift(contribEntry);
  goal.updatedAt = now;

  const serialized = serializeGoal(goal);
  res.json({ goal: serialized, progressPercentage: serialized.progressPercentage });
});

// ============================================================================
// 5. RECURRING SCHEDULES & IDEMPOTENT GENERATION
// ============================================================================

function serializeRule(r: RecurringRule) {
  const amtBig = readEntityBigInt(r, 'amountCents');
  return {
    ...r,
    name: r.title,
    title: r.title,
    amountCents: toSafeNumberOrNull(amtBig),
    amountCentsDecimal: serializeBigIntToDecimalString(amtBig),
    frequency: r.recurrenceInterval,
    recurrenceInterval: r.recurrenceInterval,
    nextDueDate: r.nextDueDate,
    nextDueDateEpoch: r.nextDueDate,
  };
}

financeRouter.get('/:familyId/recurring', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const financeStore = getFinanceStore(familyId);
  const rules = Array.from(financeStore.recurringRules.values()).map(serializeRule);
  res.json({ recurringRules: rules, rules });
});

financeRouter.post('/:familyId/recurring', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const {
    accountId,
    title,
    name,
    amountCents,
    amountCentsDecimal,
    transactionType = 'EXPENSE',
    category = 'BILLS',
    recurrenceInterval = 'MONTHLY',
    frequency,
    nextDueDate = Date.now(),
    nextDueDateEpoch,
    isAutoPay = false,
  } = req.body;

  const finalTitle = String(title || name || '').trim();
  if (!finalTitle) {
    return res.status(400).json({ error: 'TITLE_REQUIRED' });
  }

  if (amountCents !== undefined && typeof amountCents === 'number' && !Number.isSafeInteger(amountCents)) {
    return res.status(400).json({ error: 'UNSAFE_RECURRING_AMOUNT', message: 'Numeric amountCents exceeds Number.MAX_SAFE_INTEGER; supply amountCentsDecimal.' });
  }

  const amountBig = parseSigned64BigInt(amountCentsDecimal !== undefined ? amountCentsDecimal : amountCents);
  if (amountBig === null || amountBig <= 0n) {
    return res.status(400).json({ error: 'INVALID_AMOUNT', message: 'amountCents must be a positive signed 64-bit integer.' });
  }

  const now = Date.now();
  const rule: RecurringRule = {
    id: `rec-${now}-${Math.random().toString(36).slice(2, 6)}`,
    familyId,
    accountId,
    title: finalTitle,
    amountCents: toSafeNumberOrNull(amountBig) as any,
    transactionType: transactionType === 'INCOME' ? 'INCOME' : 'EXPENSE',
    category: String(category).toUpperCase(),
    recurrenceInterval: (frequency || recurrenceInterval || 'MONTHLY') as any,
    nextDueDate: nextDueDateEpoch ? Number(nextDueDateEpoch) : Number(nextDueDate),
    isActive: true,
    isAutoPay: Boolean(isAutoPay),
    createdAt: now,
    updatedAt: now,
  };
  writeEntityBigInt(rule, 'amountCents', amountBig);

  const financeStore = getFinanceStore(familyId);
  financeStore.recurringRules.set(rule.id, rule);
  const serialized = serializeRule(rule);
  res.status(201).json({ rule: serialized, recurringRule: serialized });
});

financeRouter.put('/:familyId/recurring/:ruleId', (req: Request, res: Response) => {
  const { familyId, ruleId } = req.params;
  const { isActive, amountCents, amountCentsDecimal, nextDueDate, nextDueDateEpoch } = req.body;

  const financeStore = getFinanceStore(familyId);
  const rule = financeStore.recurringRules.get(ruleId);
  if (!rule) {
    return res.status(404).json({ error: 'RECURRING_RULE_NOT_FOUND' });
  }

  if (isActive !== undefined) rule.isActive = Boolean(isActive);
  if (amountCentsDecimal !== undefined || amountCents !== undefined) {
    const parsedAmt = parseSigned64BigInt(amountCentsDecimal !== undefined ? amountCentsDecimal : amountCents);
    if (parsedAmt === null || parsedAmt <= 0n) {
      return res.status(400).json({ error: 'INVALID_AMOUNT' });
    }
    writeEntityBigInt(rule, 'amountCents', parsedAmt);
  }
  if (nextDueDateEpoch) rule.nextDueDate = Number(nextDueDateEpoch);
  else if (nextDueDate) rule.nextDueDate = Number(nextDueDate);
  rule.updatedAt = Date.now();

  const serialized = serializeRule(rule);
  res.json({ rule: serialized, recurringRule: serialized });
});

// Idempotent generation of due recurring transactions
financeRouter.post(['/:familyId/recurring/:ruleId/generate', '/:familyId/recurring/generate'], (req: Request, res: Response) => {
  const { familyId } = req.params;
  const targetRuleId = req.params.ruleId || req.body.ruleId;
  const { asOfDate = Date.now() } = req.body;

  const financeStore = getFinanceStore(familyId);
  const store = loadStore();
  const now = Number(asOfDate);

  if (targetRuleId) {
    const rule = financeStore.recurringRules.get(targetRuleId);
    if (!rule) {
      return res.status(404).json({ error: 'RECURRING_RULE_NOT_FOUND' });
    }

    const dueDay = Math.floor(rule.nextDueDate / (24 * 3600 * 1000));
    const todayDay = Math.floor(now / (24 * 3600 * 1000));
    const idempotencyKey = `REC_GEN:${rule.id}:${dueDay}`;
    const todayIdempotencyKey = `REC_GEN:${rule.id}:${todayDay}`;

    const existingReceipt =
      store.processedIdempotencyKeys[idempotencyKey] ||
      store.processedIdempotencyKeys[todayIdempotencyKey] ||
      (rule.nextDueDate > now && (rule as any).lastGeneratedIdempotencyKey
        ? store.processedIdempotencyKeys[(rule as any).lastGeneratedIdempotencyKey]
        : undefined);

    if (existingReceipt) {
      const existingTx = existingReceipt.responseReceipt?.transaction as SharedTransaction | undefined;
      return res.json({
        alreadyGenerated: true,
        transaction: existingTx ? serializeTransaction(existingTx) : null,
        idempotencyKey: existingReceipt.idempotencyKey,
        rule: serializeRule(rule),
      });
    }

    const account = (store.accounts || []).find((a) => a.id === rule.accountId && a.familyId === familyId);
    if (!account) {
      return res.status(404).json({ error: 'ACCOUNT_NOT_FOUND' });
    }

    const ruleAmtBig = readEntityBigInt(rule, 'amountCents');
    const txId = `tx-rec-${now}-${Math.random().toString(36).slice(2, 6)}`;
    const tx: SharedTransaction = {
      id: txId,
      familyId,
      accountId: account.id,
      destinationAccountId: null,
      title: `${rule.title} (Auto-Scheduled)`,
      amountCents: toSafeNumberOrNull(ruleAmtBig) as any,
      transactionType: rule.transactionType,
      category: rule.category,
      transactionDate: rule.nextDueDate,
      isReversal: false,
      reversalOfId: null,
      paidBy: 'Automated Schedule',
      idempotencyKey,
    };
    writeEntityBigInt(tx, 'amountCents', ruleAmtBig);

    store.transactions = store.transactions || [];
    store.transactions.unshift(tx);

    const accBalBig = readEntityBigInt(account, 'currentBalanceCents');
    if (rule.transactionType === 'INCOME') {
      writeEntityBigInt(account, 'currentBalanceCents', accBalBig + ruleAmtBig);
    } else {
      writeEntityBigInt(account, 'currentBalanceCents', accBalBig - ruleAmtBig);
      const budget = (store.budgets || []).find((b) => b.familyId === familyId && b.category.toUpperCase() === rule.category);
      if (budget) {
        writeEntityBigInt(budget, 'spentCents', readEntityBigInt(budget, 'spentCents') + ruleAmtBig);
      }
    }
    account.updatedAt = now;

    rule.nextDueDate = computeNextDueDate(rule.recurrenceInterval, rule.nextDueDate);
    rule.updatedAt = now;
    (rule as any).lastGeneratedIdempotencyKey = idempotencyKey;

    const syncRecord = {
      operationId: `op-${txId}`,
      idempotencyKey,
      familyId,
      entityType: rule.transactionType,
      entityId: txId,
      operationType: 'INSERT',
      conflictPolicy: 'APPEND_ONLY_LEDGER',
      acknowledgedAt: now,
      responseReceipt: { transaction: tx },
    };
    store.processedIdempotencyKeys[idempotencyKey] = syncRecord;
    store.processedIdempotencyKeys[todayIdempotencyKey] = syncRecord;

    saveStoreAtomically(store);
    return res.json({ alreadyGenerated: false, transaction: serializeTransaction(tx), idempotencyKey, rule: serializeRule(rule) });
  }

  // Multi-rule evaluation
  const generated: any[] = [];
  const rulesToEvaluate = Array.from(financeStore.recurringRules.values()).filter((r) => r.isActive && r.nextDueDate <= now);

  for (const rule of rulesToEvaluate) {
    const dueDay = Math.floor(rule.nextDueDate / (24 * 3600 * 1000));
    const idempotencyKey = `REC_GEN:${rule.id}:${dueDay}`;

    if (store.processedIdempotencyKeys[idempotencyKey]) continue;

    const account = (store.accounts || []).find((a) => a.id === rule.accountId && a.familyId === familyId);
    if (!account) continue;

    const ruleAmtBig = readEntityBigInt(rule, 'amountCents');
    const txId = `tx-rec-${now}-${Math.random().toString(36).slice(2, 6)}`;
    const tx: SharedTransaction = {
      id: txId,
      familyId,
      accountId: account.id,
      destinationAccountId: null,
      title: `${rule.title} (Auto-Scheduled)`,
      amountCents: toSafeNumberOrNull(ruleAmtBig) as any,
      transactionType: rule.transactionType,
      category: rule.category,
      transactionDate: rule.nextDueDate,
      isReversal: false,
      reversalOfId: null,
      paidBy: 'Automated Schedule',
      idempotencyKey,
    };
    writeEntityBigInt(tx, 'amountCents', ruleAmtBig);

    store.transactions = store.transactions || [];
    store.transactions.unshift(tx);

    const accBalBig = readEntityBigInt(account, 'currentBalanceCents');
    if (rule.transactionType === 'INCOME') {
      writeEntityBigInt(account, 'currentBalanceCents', accBalBig + ruleAmtBig);
    } else {
      writeEntityBigInt(account, 'currentBalanceCents', accBalBig - ruleAmtBig);
      const budget = (store.budgets || []).find((b) => b.familyId === familyId && b.category.toUpperCase() === rule.category);
      if (budget) {
        writeEntityBigInt(budget, 'spentCents', readEntityBigInt(budget, 'spentCents') + ruleAmtBig);
      }
    }
    account.updatedAt = now;

    rule.nextDueDate = computeNextDueDate(rule.recurrenceInterval, rule.nextDueDate);
    rule.updatedAt = now;

    store.processedIdempotencyKeys[idempotencyKey] = {
      operationId: `op-${txId}`,
      idempotencyKey,
      familyId,
      entityType: rule.transactionType,
      entityId: txId,
      operationType: 'INSERT',
      conflictPolicy: 'APPEND_ONLY_LEDGER',
      acknowledgedAt: now,
      responseReceipt: { transaction: tx },
    };

    generated.push(serializeTransaction(tx));
  }

  saveStoreAtomically(store);
  res.json({ generatedCount: generated.length, generatedTransactions: generated });
});

// ============================================================================
// 6. INVESTMENT PORTFOLIO (INV-01)
// ============================================================================

function serializeHolding(holding: InvestmentHolding) {
  const qBig = readEntityBigInt(holding, 'quantityMicroshares');
  const pBig = readEntityBigInt(holding, 'currentPriceCents');
  const basisBig = readEntityBigInt(holding, 'costBasisCents');
  const valBig = (qBig * pBig) / 1000000n;
  const gainBig = valBig - basisBig;
  const bpsBig = basisBig > 0n ? (gainBig * 10000n) / basisBig : 0n;

  return {
    ...holding,
    quantityMicroshares: toSafeNumberOrNull(qBig),
    quantityMicrosharesDecimal: serializeBigIntToDecimalString(qBig),
    microsharesQuantity: toSafeNumberOrNull(qBig),
    costBasisCents: toSafeNumberOrNull(basisBig),
    costBasisCentsDecimal: serializeBigIntToDecimalString(basisBig),
    totalCostBasisCents: toSafeNumberOrNull(basisBig),
    currentPriceCents: toSafeNumberOrNull(pBig),
    currentPriceCentsDecimal: serializeBigIntToDecimalString(pBig),
    currentMarketPricePerShareCents: toSafeNumberOrNull(pBig),
    currentValuationCents: toSafeNumberOrNull(valBig),
    currentValuationCentsDecimal: serializeBigIntToDecimalString(valBig),
    unrealizedGainLossCents: toSafeNumberOrNull(gainBig),
    unrealizedGainLossCentsDecimal: serializeBigIntToDecimalString(gainBig),
    gainLossBasisPoints: toSafeNumberOrNull(bpsBig),
    gainLossBasisPointsDecimal: serializeBigIntToDecimalString(bpsBig),
  };
}

financeRouter.get('/:familyId/investments', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const financeStore = getFinanceStore(familyId);
  const holdings = Array.from(financeStore.investmentHoldings.values())
    .filter((h) => !h.isDeleted)
    .map(serializeHolding);

  let totalCostBasisBig = 0n;
  let totalValuationBig = 0n;
  for (const h of holdings) {
    totalCostBasisBig += parseSigned64BigInt(h.costBasisCentsDecimal) ?? 0n;
    totalValuationBig += parseSigned64BigInt(h.currentValuationCentsDecimal) ?? 0n;
  }
  const totalUnrealizedGainLossBig = totalValuationBig - totalCostBasisBig;
  const totalReturnBpsBig = totalCostBasisBig > 0n ? (totalUnrealizedGainLossBig * 10000n) / totalCostBasisBig : 0n;

  res.json({
    holdings,
    summary: {
      totalHoldingsCount: holdings.length,
      totalCostBasisCents: toSafeNumberOrNull(totalCostBasisBig),
      totalCostBasisCentsDecimal: serializeBigIntToDecimalString(totalCostBasisBig),
      totalValuationCents: toSafeNumberOrNull(totalValuationBig),
      totalValuationCentsDecimal: serializeBigIntToDecimalString(totalValuationBig),
      totalUnrealizedGainLossCents: toSafeNumberOrNull(totalUnrealizedGainLossBig),
      totalUnrealizedGainLossCentsDecimal: serializeBigIntToDecimalString(totalUnrealizedGainLossBig),
      totalReturnBasisPoints: toSafeNumberOrNull(totalReturnBpsBig),
      totalReturnBasisPointsDecimal: serializeBigIntToDecimalString(totalReturnBpsBig),
    },
  });
});

// Record investment purchase (upsert holding, log transaction, update cash account)
financeRouter.post('/:familyId/investments', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const {
    accountId,
    fundingAccountId,
    symbol,
    assetName,
    assetType,
    assetClass,
    quantityMicroshares,
    quantityMicrosharesDecimal,
    microsharesQuantity,
    costBasisCents,
    costBasisCentsDecimal,
    totalCostBasisCents,
    currentPriceCents,
    currentPriceCentsDecimal,
    currentMarketPricePerShareCents,
    currency = 'USD',
    notes = null,
  } = req.body;

  if (!symbol || !assetName) {
    return res.status(400).json({ error: 'SYMBOL_AND_NAME_REQUIRED' });
  }

  const microBig = parseSigned64BigInt(quantityMicrosharesDecimal ?? quantityMicroshares ?? microsharesQuantity);
  const basisBig = parseSigned64BigInt(costBasisCentsDecimal ?? costBasisCents ?? totalCostBasisCents);
  const priceBig = parseSigned64BigInt(currentPriceCentsDecimal ?? currentPriceCents ?? currentMarketPricePerShareCents);

  if (microBig === null || microBig <= 0n ||
      basisBig === null || basisBig <= 0n ||
      priceBig === null || priceBig <= 0n) {
    return res.status(400).json({ error: 'INVALID_INVESTMENT_AMOUNTS', message: 'quantityMicroshares, costBasisCents, and currentPriceCents must be positive signed 64-bit integers.' });
  }

  const valBig = (microBig * priceBig) / 1000000n;
  const gainBig = valBig - basisBig;
  if (!isValidSigned64BigInt(valBig) || !isValidSigned64BigInt(gainBig)) {
    return res.status(400).json({ error: 'VALUATION_OVERFLOW', message: 'Computed investment valuation exceeds signed 64-bit integer range.' });
  }
  const bpsBig = basisBig > 0n ? (gainBig * 10000n) / basisBig : 0n;

  const store = loadStore();
  const financeStore = getFinanceStore(familyId);
  const now = Date.now();

  // If funding account provided, debit it atomically in BigInt and log transaction
  if (fundingAccountId) {
    const fundingAcc = (store.accounts || []).find((a) => a.id === fundingAccountId && a.familyId === familyId);
    if (!fundingAcc) {
      return res.status(404).json({ error: 'FUNDING_ACCOUNT_NOT_FOUND' });
    }
    const nextFundBal = readEntityBigInt(fundingAcc, 'currentBalanceCents') - basisBig;
    if (!isValidSigned64BigInt(nextFundBal)) {
      return res.status(400).json({ error: 'FUNDING_BALANCE_OVERFLOW' });
    }
    writeEntityBigInt(fundingAcc, 'currentBalanceCents', nextFundBal);
    fundingAcc.updatedAt = now;

    const txId = `tx-inv-${now}-${Math.random().toString(36).slice(2, 6)}`;
    const tx: SharedTransaction = {
      id: txId,
      familyId,
      accountId: fundingAcc.id,
      destinationAccountId: null,
      title: `Investment Purchase: ${symbol.toUpperCase()}`,
      amountCents: toSafeNumberOrNull(basisBig) as any,
      transactionType: 'EXPENSE',
      category: 'INVESTMENT',
      transactionDate: now,
      isReversal: false,
      reversalOfId: null,
      paidBy: (req as any).membership.displayName,
    };
    writeEntityBigInt(tx, 'amountCents', basisBig);
    store.transactions = store.transactions || [];
    store.transactions.unshift(tx);
    saveStoreAtomically(store);
  }

  const holding: InvestmentHolding = {
    id: `inv-${now}-${Math.random().toString(36).slice(2, 6)}`,
    familyId,
    accountId: accountId || 'acc-3',
    symbol: symbol.trim().toUpperCase(),
    assetName: assetName.trim(),
    assetType: (assetClass || assetType || 'STOCK') as any,
    quantityMicroshares: toSafeNumberOrNull(microBig) as any,
    costBasisCents: toSafeNumberOrNull(basisBig) as any,
    currentPriceCents: toSafeNumberOrNull(priceBig) as any,
    currency,
    notes,
    lastPriceUpdatedAt: now,
    currentValuationCents: toSafeNumberOrNull(valBig) as any,
    unrealizedGainLossCents: toSafeNumberOrNull(gainBig) as any,
    gainLossBasisPoints: toSafeNumberOrNull(bpsBig) as any,
    version: 1,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };
  writeEntityBigInt(holding, 'quantityMicroshares', microBig);
  writeEntityBigInt(holding, 'costBasisCents', basisBig);
  writeEntityBigInt(holding, 'currentPriceCents', priceBig);
  writeEntityBigInt(holding, 'currentValuationCents', valBig);
  writeEntityBigInt(holding, 'unrealizedGainLossCents', gainBig);
  writeEntityBigInt(holding, 'gainLossBasisPoints', bpsBig);

  financeStore.investmentHoldings.set(holding.id, holding);
  res.status(201).json({ holding: serializeHolding(holding) });
});

// Update market price per share without altering cost basis
financeRouter.put('/:familyId/investments/:holdingId/price', (req: Request, res: Response) => {
  const { familyId, holdingId } = req.params;
  const { currentPriceCents, currentPriceCentsDecimal, currentMarketPricePerShareCents } = req.body;

  const priceBig = parseSigned64BigInt(currentPriceCentsDecimal ?? currentPriceCents ?? currentMarketPricePerShareCents);
  if (priceBig === null || priceBig <= 0n) {
    return res.status(400).json({ error: 'INVALID_PRICE', message: 'currentPriceCents must be a positive signed 64-bit integer.' });
  }

  const financeStore = getFinanceStore(familyId);
  const holding = financeStore.investmentHoldings.get(holdingId);
  if (!holding || holding.isDeleted) {
    return res.status(404).json({ error: 'HOLDING_NOT_FOUND' });
  }

  const qBig = readEntityBigInt(holding, 'quantityMicroshares');
  const basisBig = readEntityBigInt(holding, 'costBasisCents');
  const valBig = (qBig * priceBig) / 1000000n;
  const gainBig = valBig - basisBig;
  if (!isValidSigned64BigInt(valBig) || !isValidSigned64BigInt(gainBig)) {
    return res.status(400).json({ error: 'VALUATION_OVERFLOW', message: 'Updated valuation exceeds signed 64-bit integer range.' });
  }
  const bpsBig = basisBig > 0n ? (gainBig * 10000n) / basisBig : 0n;

  writeEntityBigInt(holding, 'currentPriceCents', priceBig);
  writeEntityBigInt(holding, 'currentValuationCents', valBig);
  writeEntityBigInt(holding, 'unrealizedGainLossCents', gainBig);
  writeEntityBigInt(holding, 'gainLossBasisPoints', bpsBig);
  holding.lastPriceUpdatedAt = Date.now();
  holding.updatedAt = Date.now();

  res.json({ holding: serializeHolding(holding) });
});

// Soft-delete holding
financeRouter.delete('/:familyId/investments/:holdingId', (req: Request, res: Response) => {
  const { familyId, holdingId } = req.params;
  const financeStore = getFinanceStore(familyId);
  const holding = financeStore.investmentHoldings.get(holdingId);
  if (!holding) {
    return res.status(404).json({ error: 'HOLDING_NOT_FOUND' });
  }

  holding.isDeleted = true;
  holding.updatedAt = Date.now();
  res.json({ success: true, deletedHoldingId: holdingId });
});

// ============================================================================
// 7. CASH FLOW & COMPLETE SUMMARY (PURE 64-BIT BIGINT ROLLUPS)
// ============================================================================

financeRouter.get('/:familyId/summary', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const store = loadStore();
  const financeStore = getFinanceStore(familyId);

  const famAccounts = (store.accounts || []).filter((a) => a.familyId === familyId);
  const famTxs = (store.transactions || []).filter((t) => t.familyId === familyId);
  const activeHoldings = Array.from(financeStore.investmentHoldings.values()).filter((h) => !h.isDeleted);

  // 1. Total Investment Valuation in BigInt
  let totalInvestmentsValuationBig = 0n;
  for (const h of activeHoldings) {
    const qBig = readEntityBigInt(h, 'quantityMicroshares');
    const pBig = readEntityBigInt(h, 'currentPriceCents');
    totalInvestmentsValuationBig += (qBig * pBig) / 1000000n;
  }

  // 2. Liquid Assets vs Liabilities in BigInt
  let totalAssetsBig = 0n;
  let totalLiabilitiesBig = 0n;
  for (const a of famAccounts) {
    const balBig = readEntityBigInt(a, 'currentBalanceCents');
    if (a.isLiability) {
      totalLiabilitiesBig += balBig < 0n ? -balBig : balBig;
    } else {
      totalAssetsBig += balBig;
    }
  }

  const netWorthBig = totalAssetsBig - totalLiabilitiesBig;

  // 3. Actual Recorded Money (Income vs Expense from non-reversal transactions) in BigInt
  let actualIncomeBig = 0n;
  let actualExpenseBig = 0n;
  for (const t of famTxs) {
    if (t.isReversal) continue;
    const amtBig = readEntityBigInt(t, 'amountCents');
    if (t.transactionType === 'INCOME') {
      actualIncomeBig += amtBig;
    } else if (t.transactionType === 'EXPENSE') {
      actualExpenseBig += amtBig;
    }
    // Transfers are strictly excluded from income/expense
  }

  // Subtract any reversals
  for (const t of famTxs) {
    if (!t.isReversal) continue;
    const amtBig = readEntityBigInt(t, 'amountCents');
    if (t.transactionType === 'INCOME') {
      actualIncomeBig -= amtBig;
    } else if (t.transactionType === 'EXPENSE') {
      actualExpenseBig -= amtBig;
    }
  }

  const actualNetCashFlowBig = actualIncomeBig - actualExpenseBig;

  // 4. Projected Recurring Cash Flow in BigInt
  const activeRules = Array.from(financeStore.recurringRules.values()).filter((r) => r.isActive);
  let projectedMonthlyRecurringIncomeBig = 0n;
  let projectedMonthlyRecurringExpenseBig = 0n;

  for (const r of activeRules) {
    const rAmtBig = readEntityBigInt(r, 'amountCents');
    let monthlyEquivalentBig = rAmtBig;
    if (r.recurrenceInterval === 'DAILY') monthlyEquivalentBig = (rAmtBig * 365n) / 12n;
    else if (r.recurrenceInterval === 'WEEKLY') monthlyEquivalentBig = (rAmtBig * 52n) / 12n;
    else if (r.recurrenceInterval === 'BIWEEKLY') monthlyEquivalentBig = (rAmtBig * 26n) / 12n;
    else if (r.recurrenceInterval === 'QUARTERLY') monthlyEquivalentBig = rAmtBig / 3n;
    else if (r.recurrenceInterval === 'ANNUAL') monthlyEquivalentBig = rAmtBig / 12n;

    if (r.transactionType === 'INCOME') {
      projectedMonthlyRecurringIncomeBig += monthlyEquivalentBig;
    } else {
      projectedMonthlyRecurringExpenseBig += monthlyEquivalentBig;
    }
  }

  // Budget planned variable expenses in BigInt
  const famBudgets = (store.budgets || []).filter((b) => b.familyId === familyId);
  let plannedVariableExpensesBig = 0n;
  for (const b of famBudgets) {
    plannedVariableExpensesBig += readEntityBigInt(b, 'allocatedCents');
  }

  const availablePlannedCashFlowBig =
    projectedMonthlyRecurringIncomeBig - projectedMonthlyRecurringExpenseBig - plannedVariableExpensesBig;

  // Planned goals allocation in BigInt
  const famGoals = Array.from(financeStore.savingsGoals.values()).filter((g) => !g.isCompleted);
  let plannedAllocationsBig = 0n;
  for (const g of famGoals) {
    plannedAllocationsBig += readEntityBigInt(g, 'plannedMonthlyContributionCents');
  }
  const discretionaryMarginBig = availablePlannedCashFlowBig - plannedAllocationsBig;

  res.json({
    summary: {
      actualIncomeCents: toSafeNumberOrNull(actualIncomeBig),
      actualIncomeCentsDecimal: serializeBigIntToDecimalString(actualIncomeBig),
      actualExpenseCents: toSafeNumberOrNull(actualExpenseBig),
      actualExpenseCentsDecimal: serializeBigIntToDecimalString(actualExpenseBig),
      actualNetCashFlowCents: toSafeNumberOrNull(actualNetCashFlowBig),
      actualNetCashFlowCentsDecimal: serializeBigIntToDecimalString(actualNetCashFlowBig),
      totalAssetsCents: toSafeNumberOrNull(totalAssetsBig),
      totalAssetsCentsDecimal: serializeBigIntToDecimalString(totalAssetsBig),
      totalLiabilitiesCents: toSafeNumberOrNull(totalLiabilitiesBig),
      totalLiabilitiesCentsDecimal: serializeBigIntToDecimalString(totalLiabilitiesBig),
      netWorthCents: toSafeNumberOrNull(netWorthBig),
      netWorthCentsDecimal: serializeBigIntToDecimalString(netWorthBig),
      projectedMonthlyRecurringIncomeCents: toSafeNumberOrNull(projectedMonthlyRecurringIncomeBig),
      projectedMonthlyRecurringIncomeCentsDecimal: serializeBigIntToDecimalString(projectedMonthlyRecurringIncomeBig),
      projectedMonthlyRecurringExpenseCents: toSafeNumberOrNull(projectedMonthlyRecurringExpenseBig),
      projectedMonthlyRecurringExpenseCentsDecimal: serializeBigIntToDecimalString(projectedMonthlyRecurringExpenseBig),
      plannedVariableExpensesCents: toSafeNumberOrNull(plannedVariableExpensesBig),
      plannedVariableExpensesCentsDecimal: serializeBigIntToDecimalString(plannedVariableExpensesBig),
      availablePlannedCashFlowCents: toSafeNumberOrNull(availablePlannedCashFlowBig),
      availablePlannedCashFlowCentsDecimal: serializeBigIntToDecimalString(availablePlannedCashFlowBig),
      plannedAllocationsCents: toSafeNumberOrNull(plannedAllocationsBig),
      plannedAllocationsCentsDecimal: serializeBigIntToDecimalString(plannedAllocationsBig),
      discretionaryMarginCents: toSafeNumberOrNull(discretionaryMarginBig),
      discretionaryMarginCentsDecimal: serializeBigIntToDecimalString(discretionaryMarginBig),
    },
    netWorthCents: toSafeNumberOrNull(netWorthBig),
    netWorthCentsDecimal: serializeBigIntToDecimalString(netWorthBig),
    totalCashCents: toSafeNumberOrNull(totalAssetsBig),
    totalAssetsCents: toSafeNumberOrNull(totalAssetsBig),
    totalAssetsCentsDecimal: serializeBigIntToDecimalString(totalAssetsBig),
    totalLiabilitiesCents: toSafeNumberOrNull(totalLiabilitiesBig),
    totalLiabilitiesCentsDecimal: serializeBigIntToDecimalString(totalLiabilitiesBig),
    accounts: famAccounts.map(serializeAccount),
    budgets: famBudgets.map(serializeBudget),
    savingsGoals: famGoals.map(serializeGoal),
    investmentValuationCents: toSafeNumberOrNull(totalInvestmentsValuationBig),
    investmentValuationCentsDecimal: serializeBigIntToDecimalString(totalInvestmentsValuationBig),
    recentTransactions: famTxs.slice(0, 10).map(serializeTransaction),
  });
});

// Dedicated Cash Flow endpoint separating actual recorded money from projected
financeRouter.get('/:familyId/cashflow', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const store = loadStore();
  const financeStore = getFinanceStore(familyId);

  const famTxs = (store.transactions || []).filter((t) => t.familyId === familyId);
  let actualIncomeBig = 0n;
  let actualExpenseBig = 0n;

  for (const t of famTxs) {
    if (t.isReversal) continue;
    const amtBig = readEntityBigInt(t, 'amountCents');
    if (t.transactionType === 'INCOME') actualIncomeBig += amtBig;
    if (t.transactionType === 'EXPENSE') actualExpenseBig += amtBig;
  }
  for (const t of famTxs) {
    if (!t.isReversal) continue;
    const amtBig = readEntityBigInt(t, 'amountCents');
    if (t.transactionType === 'INCOME') actualIncomeBig -= amtBig;
    if (t.transactionType === 'EXPENSE') actualExpenseBig -= amtBig;
  }

  const activeRules = Array.from(financeStore.recurringRules.values()).filter((r) => r.isActive);
  let projectedRecurringIncomeBig = 0n;
  let projectedRecurringExpenseBig = 0n;

  for (const r of activeRules) {
    const rAmtBig = readEntityBigInt(r, 'amountCents');
    if (r.transactionType === 'INCOME') projectedRecurringIncomeBig += rAmtBig;
    else projectedRecurringExpenseBig += rAmtBig;
  }

  const actualNetBig = actualIncomeBig - actualExpenseBig;
  const projectedNetBig = projectedRecurringIncomeBig - projectedRecurringExpenseBig;

  res.json({
    actual: {
      incomeCents: toSafeNumberOrNull(actualIncomeBig),
      incomeCentsDecimal: serializeBigIntToDecimalString(actualIncomeBig),
      expenseCents: toSafeNumberOrNull(actualExpenseBig),
      expenseCentsDecimal: serializeBigIntToDecimalString(actualExpenseBig),
      netCents: toSafeNumberOrNull(actualNetBig),
      netCentsDecimal: serializeBigIntToDecimalString(actualNetBig),
    },
    projected: {
      recurringIncomeCents: toSafeNumberOrNull(projectedRecurringIncomeBig),
      recurringIncomeCentsDecimal: serializeBigIntToDecimalString(projectedRecurringIncomeBig),
      recurringExpenseCents: toSafeNumberOrNull(projectedRecurringExpenseBig),
      recurringExpenseCentsDecimal: serializeBigIntToDecimalString(projectedRecurringExpenseBig),
      netProjectedCents: toSafeNumberOrNull(projectedNetBig),
      netProjectedCentsDecimal: serializeBigIntToDecimalString(projectedNetBig),
    },
    invariant: 'Transfers and suggested savings allocations are strictly excluded from income and expenses.',
  });
});

financeRouter.post('/:familyId/test-reset', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const role = (req as any).familyMembership?.role;
  if (role !== 'OWNER' && role !== 'ADMIN') {
    return res.status(403).json({
      error: 'FORBIDDEN_ROLE',
      message: `Role '${role}' is not authorized to reset test fixtures.`,
    });
  }
  resetFinanceStore(familyId);
  res.json({ status: 'RESET', familyId });
});

