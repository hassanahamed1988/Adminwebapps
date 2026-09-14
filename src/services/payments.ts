// Payment History data layer.
//
// Backing store: `${collectionFor(user)}/{user.id}/payments` — a Firestore
// subcollection whose name was already reserved in
// UsersContext.SUBCOLLECTIONS (it's in the cascade-delete list) but had no
// reader/writer anywhere in this app until now. This module is the single
// place that reads, writes, and totals those records, so the Payment
// History tab (and anything else in the future) never recomputes an
// authoritative balance from ad-hoc frontend math — per spec Step 7,
// "Calculation Integrity".
import { getSubcollection, saveDoc, newDocId, deleteDocFrom } from './firebase';
import { collectionFor } from '../contexts/UsersContext';
import { PaymentTransaction, PaymentAuditEntry, PaymentStatus, TransactionType, User } from '../types';

export function paymentsPathFor(user: Pick<User, 'id' | 'role'>): string {
  return `${collectionFor(user)}/${user.id}/payments`;
}

/** Statuses that count toward "money the account has actually paid". */
const PAID_STATUSES: PaymentStatus[] = ['PAID', 'PARTIALLY_PAID'];

export interface PaymentSummary {
  totalPaid: number;
  totalDiscount: number;
  totalPayable: number;
  /** Positive = amount owed. Zero when settled. */
  pending: number;
  /** Set when the account has actually overpaid (pending would be negative) — shown as credit/advance instead of pending, per spec Step 2 / Card 2. */
  creditBalance: number;
}

/**
 * Total Payable = the account's package price (source of truth: packagePrice
 * from registration, falling back to the raw `price` string field for older
 * records that predate packagePrice).
 */
function totalPayableFor(user: User): number {
  if (typeof user.packagePrice === 'number' && !isNaN(user.packagePrice)) return user.packagePrice;
  const parsed = Number(user.price);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Computes the lifetime summary cards from the transaction list — never
 * from the scalar user.paidAmount/dueAmount fields directly, since those are
 * legacy snapshots that can drift. The transaction records are authoritative.
 */
export function summarizePayments(user: User, transactions: PaymentTransaction[]): PaymentSummary {
  let totalPaid = 0;
  let totalDiscount = 0;

  for (const tx of transactions) {
    if (tx.status === 'CANCELLED' || tx.status === 'FAILED') continue;

    if (PAID_STATUSES.includes(tx.status)) {
      if (tx.transactionType === 'REFUND') {
        totalPaid -= tx.paidAmount ?? tx.amount ?? 0;
      } else if (tx.transactionType !== 'DISCOUNT') {
        totalPaid += tx.paidAmount ?? tx.amount ?? 0;
      }
    }
    if (tx.transactionType === 'DISCOUNT' && tx.status !== 'CANCELLED') {
      totalDiscount += tx.discount ?? tx.amount ?? 0;
    } else if (tx.discount) {
      totalDiscount += tx.discount;
    }
  }

  const totalPayable = totalPayableFor(user);
  const rawPending = totalPayable - totalPaid - totalDiscount;

  return {
    totalPaid,
    totalDiscount,
    totalPayable,
    pending: rawPending > 0 ? rawPending : 0,
    creditBalance: rawPending < 0 ? Math.abs(rawPending) : 0,
  };
}

/**
 * Strict gatekeeper for the User Details Payment History section:
 * Only subscription payments, renewals, packages, and registration fee records
 * may be synced/displayed in this section. Payments originating from other
 * modules (such as Mess, Family, Fuel, Trip, Purchase, Invoice, Loan, Vehicle Service, etc.)
 * or general non-subscription expenses must NOT be synced into this section.
 */
export function isSubscriptionPayment(raw: any): boolean {
  if (!raw || typeof raw !== 'object') return false;

  // 1. Explicit kind check (e.g. messPayment or purchase requests stored in Firestore)
  if (raw.kind === 'messPayment' || raw.kind === 'purchase') {
    return false;
  }

  // 2. Explicit module / section / source metadata checks
  const moduleStr = String(raw.module || raw.section || raw.source || '').toLowerCase().trim();
  if (moduleStr && moduleStr !== 'subscription' && moduleStr !== 'user_renew' && moduleStr !== 'renew') {
    const nonSubscriptionModules = [
      'mess', 'family', 'fuel', 'trip', 'purchase', 'invoice',
      'loan', 'vehicle', 'service', 'maintenance', 'salary', 'commission'
    ];
    if (nonSubscriptionModules.some((m) => moduleStr.includes(m))) {
      return false;
    }
  }

  // 3. Category inspection: identify if it clearly belongs to another section
  const cat = String(raw.category || '').toLowerCase().trim();
  if (cat) {
    const nonSubscriptionCategories = [
      'family', 'family maintenance', 'mess', 'mess payment', 'fuel', 'fuel expense',
      'purchase', 'invoice', 'purchase receipt', 'trip', 'trips', 'trip payment',
      'loan', 'loan payment', 'vehicle', 'vehicle service', 'vehicle maintenance',
      'maintenance', 'salary', 'commission', 'deposit', 'withdrawal', 'food',
      'bayan', 'toll', 'personal', 'business', 'daily expense', 'general expense'
    ];
    if (nonSubscriptionCategories.some((nc) => cat.includes(nc))) {
      return false;
    }
  }

  // 4. Mobile app transaction type 'EXPENSE' indicates user expense (mess, fuel, etc.), not subscription payment
  if (String(raw.type || '').toUpperCase() === 'EXPENSE') {
    return false;
  }

  // 5. Keyword analysis in description / remarks / note for other modules
  const desc = String(raw.description || raw.remarks || raw.note || '').toLowerCase();
  const nonSubKeywords = [
    'family maintenance', 'mess payment', 'fuel expense', 'purchase receipt',
    'trip expense', 'vehicle maintenance', 'vehicle service', 'loan repayment'
  ];
  if (nonSubKeywords.some((kw) => desc.includes(kw))) {
    return false;
  }

  return true;
}

export async function fetchPayments(user: Pick<User, 'id' | 'role'>): Promise<PaymentTransaction[]> {
  const docs = await getSubcollection(paymentsPathFor(user));
  return docs
    .filter(isSubscriptionPayment)
    .map(normalizeTransaction)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

const VALID_TYPES: TransactionType[] = ['SUBSCRIPTION', 'PAYMENT', 'DISCOUNT', 'REFUND', 'ADJUSTMENT', 'CREDIT'];
const VALID_STATUSES: PaymentStatus[] = ['PAID', 'PENDING', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_PAID'];

/**
 * Defensively fills in any field a stored doc might be missing.
 */
function normalizeTransaction(raw: any): PaymentTransaction {
  let rawStatus = raw?.status;
  if (rawStatus === 'RECEIVED' || rawStatus === 'COMPLETED' || rawStatus === 'SUCCESS') {
    rawStatus = 'PAID';
  }
  const status: PaymentStatus = VALID_STATUSES.includes(rawStatus) ? rawStatus : 'PENDING';

  let transactionType: TransactionType = 'PAYMENT';
  if (VALID_TYPES.includes(raw?.transactionType)) {
    transactionType = raw.transactionType;
  } else {
    const cat = String(raw?.category || '').toLowerCase();
    const desc = String(raw?.description || '').toLowerCase();
    if (cat.includes('renew') || cat.includes('subscription') || desc.includes('renew') || desc.includes('package')) {
      transactionType = 'SUBSCRIPTION';
    }
  }

  const rawAmount = typeof raw?.amount === 'number' && !isNaN(raw.amount) ? raw.amount : Number(raw?.amount) || 0;
  const rawPaidAmount =
    typeof raw?.paidAmount === 'number' && !isNaN(raw.paidAmount)
      ? raw.paidAmount
      : status === 'PAID'
      ? rawAmount
      : undefined;

  let createdAt = raw?.createdAt;
  if (!createdAt && raw?.date) {
    createdAt = raw?.time ? `${raw.date}T${raw.time}` : raw.date;
  }
  if (!createdAt) {
    createdAt = new Date().toISOString();
  }

  const referenceId = raw?.referenceId || raw?.transactionId || raw?.txnId || undefined;

  return {
    ...raw,
    id: raw?.id || '',
    transactionType,
    status,
    amount: rawAmount,
    paidAmount: rawPaidAmount,
    createdAt: String(createdAt),
    referenceId,
    category: raw?.category || 'Subscription',
    section: raw?.section || 'subscription',
  };
}

/** Fields that are audit metadata themselves — excluded from the
 *  previous/new value snapshots on an edit so an audit entry doesn't nest
 *  a copy of the audit log (or stale id/createdAt) inside itself. */
const AUDIT_EXCLUDED_FIELDS = new Set(['id', 'createdAt', 'updatedAt', 'auditLog']);

function snapshotForAudit(tx: Partial<PaymentTransaction>): Partial<PaymentTransaction> {
  const snapshot: Partial<PaymentTransaction> = {};
  for (const key of Object.keys(tx) as (keyof PaymentTransaction)[]) {
    if (AUDIT_EXCLUDED_FIELDS.has(key as string)) continue;
    (snapshot as any)[key] = (tx as any)[key];
  }
  return snapshot;
}

export async function saveTransaction(
  user: Pick<User, 'id' | 'role'>,
  tx: Omit<PaymentTransaction, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
  editMeta?: { updatedBy: string; reason?: string }
): Promise<PaymentTransaction> {
  const path = paymentsPathFor(user);
  const isEdit = !!tx.id;
  const id = tx.id || newDocId(path);
  const now = new Date().toISOString();

  // Editing an existing transaction: fetch what's already stored and append
  // an audit entry instead of silently overwriting it — per spec Step 7,
  // history is append-only, never discarded.
  let auditLog: PaymentAuditEntry[] | undefined;
  let createdAt = tx.createdAt || now;
  if (isEdit) {
    const existing = await getSubcollection(path);
    const prior = existing.find((d: any) => d.id === id) as PaymentTransaction | undefined;
    if (prior) {
      createdAt = tx.createdAt || prior.createdAt || now;
      auditLog = Array.isArray(prior.auditLog) ? prior.auditLog.slice() : [];
      auditLog.push({
        previousValue: snapshotForAudit(prior),
        newValue: snapshotForAudit(tx),
        updatedBy: editMeta?.updatedBy || tx.createdBy || 'admin',
        updatedAt: now,
        reason: editMeta?.reason,
      });
    }
  }

  const record: PaymentTransaction = {
    ...tx,
    id,
    category: tx.category || 'Subscription',
    section: tx.section || 'subscription',
    createdAt,
    updatedAt: now,
    ...(auditLog ? { auditLog } : {}),
  };
  await saveDoc(path, id, record);
  return record;
}

/**
 * Re-fetches transactions and recomputes the summary right before a save —
 * the Add Transaction form must never trust a Pending Balance number that's
 * been sitting in frontend state, since another admin session (or the
 * mobile app) could have written a transaction in the meantime. This is the
 * closest thing to a "server-side" recheck available in this Firestore-direct
 * architecture (there is no separate backend endpoint for payments), so it's
 * the authoritative source consulted immediately before validating amount
 * and saving.
 */
export async function getAuthoritativePendingBalance(user: User): Promise<PaymentSummary> {
  const docs = await fetchPayments(user);
  return summarizePayments(user, docs);
}

/**
 * One-time backfill for accounts that predate the payments subcollection:
 * turns the legacy scalar snapshot (packagePrice/discountAmount/paidAmount)
 * into an equivalent opening transaction, so Total Paid / Total Discount in
 * the new tab stay consistent with what the account already showed
 * elsewhere instead of silently resetting to zero. Idempotent — checks for
 * an existing backfill record before writing.
 */
export async function ensureBackfilled(user: User): Promise<void> {
  const path = paymentsPathFor(user);
  const existing = await getSubcollection(path);
  if (existing.some((d: any) => d.referenceId === 'OPENING_BALANCE')) return;

  const hasAnyLegacyAmount =
    (typeof user.paidAmount === 'number' && user.paidAmount > 0) ||
    (typeof user.discountAmount === 'number' && user.discountAmount > 0);
  if (!hasAnyLegacyAmount) return;

  const openingDate = user.activationDate || user.registrationDate || new Date().toISOString();

  if (user.discountAmount && user.discountAmount > 0) {
    await saveTransaction(user, {
      transactionType: 'DISCOUNT',
      description: 'Opening balance — discount recorded at registration',
      amount: user.discountAmount,
      discount: user.discountAmount,
      status: 'PAID',
      referenceId: 'OPENING_BALANCE',
      createdBy: 'system',
      createdAt: openingDate,
    });
  }
  if (user.paidAmount && user.paidAmount > 0) {
    await saveTransaction(user, {
      transactionType: 'SUBSCRIPTION',
      description: user.package ? `Opening balance — ${user.package}` : 'Opening balance — package payment',
      amount: user.paidAmount,
      paidAmount: user.paidAmount,
      paymentMethod: user.paymentMethod,
      status: 'PAID',
      referenceId: 'OPENING_BALANCE',
      createdBy: 'system',
      createdAt: openingDate,
    });
  }
}

/**
 * Deletes a transaction record from the subcollection.
 * CAUTION: Deleting a transaction directly alters the computed lifetime summary
 * balance for the user, since the summary is re-derived dynamically from all
 * remaining transactions.
 */
export async function deleteTransaction(user: User, transactionId: string): Promise<void> {
  const path = paymentsPathFor(user);
  await deleteDocFrom(path, transactionId);
}
