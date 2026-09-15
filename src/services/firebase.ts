import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword as fbSignIn } from 'firebase/auth';
import {
  initializeFirestore,
  collection,
  collectionGroup,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-config.json';
import { applyMaskingBeforeSave, decryptSensitiveFields } from './security';

const app = initializeApp(firebaseConfig as any);

// CRITICAL: the named database id must be passed exactly like the mobile
// app does, otherwise the client points at the (default) database instead
// of the real "fleetpromanager" database and every read returns empty.
export const db = initializeFirestore(
  app,
  {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  },
  (firebaseConfig as any).firestoreDatabaseId
);

export const auth = getAuth(app);

/** Fetch every document from a top-level collection (e.g. "users", "admins"). */
export async function getCollection(collectionName: string): Promise<any[]> {
  const snap = await getDocs(collection(db, collectionName));
  const items: any[] = [];
  snap.forEach((d) => items.push(decryptSensitiveFields({ ...d.data(), id: d.id })));
  return items;
}

/** Fetch documents from a nested subcollection, e.g. "users/{id}/trips". */
export async function getSubcollection(path: string): Promise<any[]> {
  const snap = await getDocs(collection(db, path));
  const items: any[] = [];
  snap.forEach((d) => items.push(decryptSensitiveFields({ ...d.data(), id: d.id })));
  return items;
}

/** Generates a fresh Firestore auto-ID for a doc under a (sub)collection
 * path, without writing anything — used when creating a new record (e.g. a
 * payment transaction) where the caller needs the id up front. */
export function newDocId(collectionPath: string): string {
  return doc(collection(db, collectionPath)).id;
}

export async function saveDoc(collectionName: string, docId: string, data: any): Promise<void> {
  let cleaned = JSON.parse(JSON.stringify(data));
  cleaned = applyMaskingBeforeSave(cleaned);
  await setDoc(doc(db, collectionName, docId), cleaned, { merge: true });
}

export async function deleteDocFrom(collectionName: string, docId: string): Promise<void> {
  await deleteDoc(doc(db, collectionName, docId));
}

export async function trySignInFirebaseAuth(email: string, password: string): Promise<boolean> {
  try {
    if (!email || !email.includes('@')) return false;
    await fbSignIn(auth, email, password);
    return true;
  } catch {
    return false;
  }
}

/**
 * Subscribes to real-time changes on a Firestore top-level collection.
 * Returns an unsubscribe callback.
 */
export function subscribeCollection(
  collectionName: string,
  onData: (items: any[]) => void,
  onError?: (err: any) => void
): () => void {
  return onSnapshot(
    collection(db, collectionName),
    (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push(decryptSensitiveFields({ ...d.data(), id: d.id })));
      onData(items);
    },
    (err) => {
      console.error(`Error subscribing to collection ${collectionName}:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribes to real-time changes on a Firestore collectionGroup (e.g. 'Purchase').
 * Returns an unsubscribe callback.
 */
export function subscribeCollectionGroup(
  groupName: string,
  onData: (items: any[]) => void,
  onError?: (err: any) => void
): () => void {
  return onSnapshot(
    collectionGroup(db, groupName),
    (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push(decryptSensitiveFields({ ...d.data(), id: d.id })));
      onData(items);
    },
    (err) => {
      console.error(`Error subscribing to collection group ${groupName}:`, err);
      if (onError) onError(err);
    }
  );
}

