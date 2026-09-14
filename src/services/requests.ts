// Purchase & Mess/Family Payment request approvals.
//
// Backing stores: `${collectionFor(user)}/{user.id}/Purchase` and
// `.../messPayments` — both are Firestore subcollections the mobile app's
// own Purchase.tsx already writes real pending requests into (a user
// submits a monthly purchase list, or a mess/family payment to a partner)
// and its Notifications.tsx already has an admin approve/reject UI for —
// but only reachable by logging into the *mobile app* as an admin. Neither
// subcollection had a reader anywhere in this web admin app before now, so
// these requests were effectively invisible here.
//
// IMPORTANT — status casing: unlike every other status field in this app
// (User.status is 'PENDING' | 'ENABLED' | ...), the mobile app writes
// lowercase 'pending' / 'approved' / 'rejected' for these two
// subcollections specifically (see Purchase.tsx / Notifications.tsx). This
// file preserves that exact casing when writing, since the mobile app's own
// filtering reads it back as a plain string, not a normalized enum.
import { getSubcollection, saveDoc } from './firebase';
import { collectionFor } from '../contexts/UsersContext';
import { User } from '../types';

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface PurchaseItem {
  id?: string;
  name?: string;
  price?: string | number;
  quantity?: string | number;
  unit?: string;
  total?: number;
}

export interface PurchaseRequest {
  id: string;
  kind: 'purchase';
  hypermarketName?: string;
  items?: PurchaseItem[];
  amount: number;
  status: RequestStatus;
  date?: string;
  createdAt?: string | number;
}

export interface MessPaymentRequest {
  id: string;
  kind: 'messPayment';
  userId?: string;
  partnerId?: string;
  amount: number;
  method?: string;
  transactionId?: string;
  date?: string;
  time?: string;
  remarks?: string;
  status: RequestStatus;
  createdAt?: string | number;
  bankDetails?: { country?: string; bankName?: string; branch?: string; accountTitle?: string; accountNumber?: string } | null;
  mobileDetails?: { provider?: string; senderNumber?: string; txnId?: string } | null;
  cardDetails?: { cardType?: string; cardHolderName?: string; cardLastFour?: string } | null;
}

export type AnyRequest = PurchaseRequest | MessPaymentRequest;

function purchasePathFor(user: Pick<User, 'id' | 'role'>): string {
  return `${collectionFor(user)}/${user.id}/Purchase`;
}
function messPaymentPathFor(user: Pick<User, 'id' | 'role'>): string {
  return `${collectionFor(user)}/${user.id}/messPayments`;
}

const VALID_STATUSES: RequestStatus[] = ['pending', 'approved', 'rejected'];
function normalizeStatus(raw: any): RequestStatus {
  const lower = typeof raw === 'string' ? raw.toLowerCase() : '';
  return (VALID_STATUSES as string[]).includes(lower) ? (lower as RequestStatus) : 'pending';
}

/** Both request kinds fetched and merged, newest first — the same combined,
 * per-user "requests inbox" view the mobile app's own Notifications.tsx
 * shows an admin, just reachable from the web instead. */
export async function fetchRequests(user: Pick<User, 'id' | 'role'>): Promise<AnyRequest[]> {
  const [purchaseDocs, paymentDocs] = await Promise.all([
    getSubcollection(purchasePathFor(user)),
    getSubcollection(messPaymentPathFor(user)),
  ]);

  const purchases: PurchaseRequest[] = purchaseDocs.map((raw: any) => ({
    ...raw,
    id: raw?.id || '',
    kind: 'purchase',
    amount: typeof raw?.amount === 'number' && !isNaN(raw.amount) ? raw.amount : Number(raw?.amount) || 0,
    status: normalizeStatus(raw?.status),
  }));

  const payments: MessPaymentRequest[] = paymentDocs.map((raw: any) => ({
    ...raw,
    id: raw?.id || '',
    kind: 'messPayment',
    amount: typeof raw?.amount === 'number' && !isNaN(raw.amount) ? raw.amount : Number(raw?.amount) || 0,
    status: normalizeStatus(raw?.status),
  }));

  return [...purchases, ...payments].sort((a, b) => {
    const aTime = typeof a.createdAt === 'number' ? a.createdAt : Date.parse(a.createdAt || '') || 0;
    const bTime = typeof b.createdAt === 'number' ? b.createdAt : Date.parse(b.createdAt || '') || 0;
    return bTime - aTime;
  });
}

export async function setRequestStatus(
  user: Pick<User, 'id' | 'role'>,
  request: AnyRequest,
  status: RequestStatus
): Promise<void> {
  const path = request.kind === 'purchase' ? purchasePathFor(user) : messPaymentPathFor(user);
  const { kind, ...rest } = request as any;
  await saveDoc(path, request.id, { ...rest, status });
}
