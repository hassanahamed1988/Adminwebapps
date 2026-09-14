// Purchase & Mess-Payment approvals data layer.
//
// Both are request queues a mobile user submits (a hypermarket purchase to
// be reimbursed, or a payment made to a partner/merchant) that previously
// could ONLY be approved or rejected from inside the mobile app's own admin
// Notifications screen — there was no reader/writer for either subcollection
// anywhere in this web admin app, so an admin using only this panel had no
// way to even see these requests existed, let alone act on them.
import { getSubcollection, saveDoc } from './firebase';
import { collectionFor } from '../contexts/UsersContext';
import { PurchaseRequest, MessPaymentRequest, ApprovalStatus, User } from '../types';

export function purchasePathFor(user: Pick<User, 'id' | 'role'>): string {
  return `${collectionFor(user)}/${user.id}/Purchase`;
}

export function messPaymentsPathFor(user: Pick<User, 'id' | 'role'>): string {
  return `${collectionFor(user)}/${user.id}/messPayments`;
}

export async function fetchPurchaseRequests(user: Pick<User, 'id' | 'role'>): Promise<PurchaseRequest[]> {
  const docs = await getSubcollection(purchasePathFor(user));
  return docs.map((d) => ({ ...d, amount: Number(d.amount) || 0 })) as PurchaseRequest[];
}

export async function setPurchaseStatus(
  user: Pick<User, 'id' | 'role'>,
  purchase: PurchaseRequest,
  status: ApprovalStatus
): Promise<void> {
  await saveDoc(purchasePathFor(user), purchase.id, { ...purchase, status });
}

export async function fetchMessPaymentRequests(user: Pick<User, 'id' | 'role'>): Promise<MessPaymentRequest[]> {
  const docs = await getSubcollection(messPaymentsPathFor(user));
  return docs.map((d) => ({ ...d, amount: Number(d.amount) || 0 })) as MessPaymentRequest[];
}

export async function setMessPaymentStatus(
  user: Pick<User, 'id' | 'role'>,
  payment: MessPaymentRequest,
  status: ApprovalStatus
): Promise<void> {
  await saveDoc(messPaymentsPathFor(user), payment.id, { ...payment, status });
}
