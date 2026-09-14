import { User } from '../types';

/** Random 7-digit user ID, unique against the currently loaded user list —
 * same format the mobile app's new-user screen generates. */
export function generateUserId(existing: User[]): string {
  let candidate = '';
  let isUnique = false;
  while (!isUnique) {
    candidate = Math.floor(1000000 + Math.random() * 9000000).toString();
    isUnique = !existing.some((u) => u.userId === candidate || u.id === candidate);
  }
  return candidate;
}

/** "2050" + 10 random digits, matching the mobile app's account number format. */
export function generateAccountNumber(): string {
  const random10 = Math.floor(1000000000 + Math.random() * 9000000000).toString();
  return `2050${random10}`;
}

/** Firestore document IDs can't contain "/" and can't be "." or "..".
 * Keeps the id safe no matter what gets typed into the name field. */
export function sanitizeDocId(raw: string): string {
  return raw.trim().replace(/\//g, '-').replace(/^\.+$/, 'doc');
}

export function computeExpiryDate(duration: string): string {
  const date = new Date();
  if (duration === '1 MONTH') date.setMonth(date.getMonth() + 1);
  else if (duration === '3 MONTHS') date.setMonth(date.getMonth() + 3);
  else if (duration === '6 MONTHS') date.setMonth(date.getMonth() + 6);
  else if (duration === '1 YEAR') date.setFullYear(date.getFullYear() + 1);
  else return ''; // Lifetime
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}
