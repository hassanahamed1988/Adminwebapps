import { collection, collectionGroup, doc, setDoc, getDocs, onSnapshot } from 'firebase/firestore';
import { db, saveDoc, deleteDocFrom, subscribeCollection, subscribeCollectionGroup } from './firebase';
import { Partner, PurchaseDoc, User, PartnerAccountType, PartnerStatus } from '../types';

/**
 * Real-time listener for the top-level 'partners' collection.
 */
export function subscribePartners(
  onData: (partners: Partner[]) => void,
  onError?: (err: any) => void
): () => void {
  return subscribeCollection('partners', onData, onError);
}

/**
 * Real-time listener for all purchases across users using collectionGroup('Purchase').
 */
export function subscribeAllPurchases(
  onData: (purchases: PurchaseDoc[]) => void,
  onError?: (err: any) => void
): () => void {
  return subscribeCollectionGroup('Purchase', onData, onError);
}

/**
 * Generate a random 7-digit Manager or Partner ID.
 */
export function generateManagerId(): string {
  const rand = Math.floor(1000000 + Math.random() * 9000000);
  return `MGR-${rand}`;
}

export function generatePartnerId(): string {
  const rand = Math.floor(1000000 + Math.random() * 9000000);
  return String(rand);
}

/**
 * Create or update a Manager profile.
 * Writes to 'partners' collection and updates the user's role to 'MANAGER' in 'users'.
 */
export async function saveManagerProfile(
  managerData: Partial<Partner>,
  user: User,
  existingPartner?: Partner | null
): Promise<Partner> {
  const currentDate = new Date().toISOString().split('T')[0];
  const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false });
  const docId = managerData.id || existingPartner?.id || `PARTNER-${Date.now()}`;

  let partnerId = managerData.partnerId || existingPartner?.partnerId;
  if (!partnerId || !partnerId.startsWith('MGR-')) {
    partnerId = generateManagerId();
  }

  const payload: Partner = {
    id: docId,
    partnerId: partnerId,
    userId: user.id,
    name: managerData.name || user.name || '',
    mobile: managerData.mobile || user.mobileNumber || user.mobile || '',
    dob: managerData.dob || user.dob || '',
    nationality: managerData.nationality || user.nationality || '',
    country: managerData.country || user.presentCountry || user.country || '',
    stateNumber: managerData.stateNumber || user.state || user.stateNumber || '',
    zoneNumber: managerData.zoneNumber || user.zoneNumber || '',
    buildingNumber: managerData.buildingNumber || user.buildingNumber || '',
    electricityNumber: managerData.electricityNumber || user.electricityNumber || '',
    areaName: managerData.areaName || user.area || user.city || user.manualAddress || '',
    monthlySalary: managerData.monthlySalary || '',
    price: managerData.price || '',
    joiningDate: managerData.joiningDate || existingPartner?.joiningDate || currentDate,
    joiningTime: managerData.joiningTime || existingPartner?.joiningTime || currentTime,
    createdAt: existingPartner?.createdAt || Date.now(),
    avatar: managerData.avatar || user.avatar || null,
    accountType: 'MANAGER',
    managerId: '',
    status: (managerData.status as PartnerStatus) || existingPartner?.status || 'active',
  };

  // 1. Save Partner document
  await saveDoc('partners', docId, payload);

  // 2. Update user's role in the 'users' collection
  await saveDoc('users', user.id, {
    role: 'MANAGER',
    managerId: '',
  });

  return payload;
}

/**
 * Link a registered user to a Manager as a Partner.
 */
export async function linkUserToManager(
  manager: Partner,
  user: User,
  existingPartner?: Partner | null
): Promise<Partner> {
  const currentDate = new Date().toISOString().split('T')[0];
  const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false });
  const docId = existingPartner?.id || `PARTNER-${Date.now()}`;

  let partnerId = existingPartner?.partnerId;
  if (!partnerId || partnerId.startsWith('MGR-')) {
    partnerId = generatePartnerId();
  }

  const partnerPayload: Partner = {
    id: docId,
    partnerId: partnerId,
    userId: user.id,
    name: user.name || existingPartner?.name || '',
    mobile: user.mobileNumber || user.mobile || existingPartner?.mobile || '',
    dob: user.dob || existingPartner?.dob || '',
    nationality: user.nationality || existingPartner?.nationality || '',
    country: user.presentCountry || user.country || existingPartner?.country || '',
    stateNumber: user.state || user.stateNumber || existingPartner?.stateNumber || '',
    zoneNumber: user.zoneNumber || existingPartner?.zoneNumber || '',
    buildingNumber: user.buildingNumber || existingPartner?.buildingNumber || '',
    electricityNumber: user.electricityNumber || existingPartner?.electricityNumber || '',
    areaName: user.area || user.city || user.manualAddress || existingPartner?.areaName || '',
    monthlySalary: existingPartner?.monthlySalary || '',
    price: existingPartner?.price || '',
    joiningDate: existingPartner?.joiningDate || currentDate,
    joiningTime: existingPartner?.joiningTime || currentTime,
    createdAt: existingPartner?.createdAt || Date.now(),
    avatar: user.avatar || existingPartner?.avatar || null,
    accountType: 'PARTNER',
    managerId: manager.id,
    status: 'active',
  };

  // 1. Save to 'partners'
  await saveDoc('partners', docId, partnerPayload);

  // 2. Update user's managerId
  await saveDoc('users', user.id, {
    managerId: manager.id,
  });

  return partnerPayload;
}

/**
 * Unlink a partner from their manager.
 */
export async function unlinkPartnerFromManager(
  partner: Partner,
  user?: User | null
): Promise<void> {
  const updatedPartner: Partner = {
    ...partner,
    managerId: '',
  };
  await saveDoc('partners', partner.id, updatedPartner);

  const userId = partner.userId || user?.id;
  if (userId) {
    await saveDoc('users', userId, {
      managerId: '',
    });
  }
}

/**
 * Toggle a Partner or Manager's status between 'active' and 'inactive'.
 */
export async function togglePartnerStatus(partner: Partner): Promise<PartnerStatus> {
  const newStatus: PartnerStatus = partner.status === 'inactive' ? 'active' : 'inactive';
  await saveDoc('partners', partner.id, {
    ...partner,
    status: newStatus,
  });
  return newStatus;
}

/**
 * Soft delete or remove a Partner / Manager.
 * For Manager: resets the corresponding user's role to 'USER'.
 * For Partner: unlinks the user's managerId.
 */
export async function deletePartnerRecord(partner: Partner): Promise<void> {
  // Mark as deleted in partners
  await saveDoc('partners', partner.id, {
    ...partner,
    status: 'deleted',
  });

  if (partner.userId) {
    if (partner.accountType === 'MANAGER') {
      await saveDoc('users', partner.userId, {
        role: 'USER',
      });
    } else {
      await saveDoc('users', partner.userId, {
        managerId: '',
      });
    }
  }
}
