import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import bcrypt from 'bcryptjs';
import { getCollection, getSubcollection, saveDoc, deleteDocFrom } from '../services/firebase';
import { User } from '../types';
import { generateUserId } from '../utils/accountUtils';

const SUBCOLLECTIONS = [
  'trips',
  'profiles',
  'finances',
  'monthlyFiles',
  'payments',
  'notifications',
  'fuels',
  'walletTransactions',
  'settlements',
  'Purchase',
  'messPayments',
  'loans',
  'loanPayments',
];

export function collectionFor(user: Pick<User, 'role'>): 'admins' | 'users' {
  return user.role === 'ADMIN' ? 'admins' : 'users';
}

interface UsersContextValue {
  users: User[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  approveUser: (id: string, tempPassword: string) => Promise<void>;
  rejectUser: (id: string) => Promise<void>;
  disableUser: (id: string) => Promise<void>;
  enableUser: (id: string) => Promise<void>;
  blockUser: (id: string) => Promise<void>;
  unblockUser: (id: string) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  createUser: (user: User, rawPassword: string) => Promise<void>;
  resetPassword: (id: string, newPassword: string) => Promise<void>;
}

const UsersContext = createContext<UsersContextValue | undefined>(undefined);

export const UsersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const usersRef = useRef<User[]>([]);
  usersRef.current = users;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersCol, adminsCol] = await Promise.all([getCollection('users'), getCollection('admins')]);
      const normalizedUsers = usersCol.filter((u) => u.id !== 'Admin').map((u) => {
        // Fallback checks for Identity Document fields
        const idType = u.idType || u.documentType || u.docType || u.idCardType || '';
        const idNumber = u.idNumber || u.documentNumber || u.idNo || u.docNo || u.idCardNumber || u.nid || u.passport || '';
        const idIssueCountry = u.idIssueCountry || u.documentIssueCountry || u.issueCountry || '';
        const idExpiryDate = u.idExpiryDate || u.documentExpiry || u.expiryDate || u.docExpiry || '';
        return {
          ...u,
          idType,
          idNumber,
          idIssueCountry,
          idExpiryDate,
        };
      });
      const merged: User[] = [
        ...normalizedUsers,
        ...adminsCol.map((a) => {
          const idType = a.idType || a.documentType || a.docType || a.idCardType || '';
          const idNumber = a.idNumber || a.documentNumber || a.idNo || a.docNo || a.idCardNumber || a.nid || a.passport || '';
          const idIssueCountry = a.idIssueCountry || a.documentIssueCountry || a.issueCountry || '';
          const idExpiryDate = a.idExpiryDate || a.documentExpiry || a.expiryDate || a.docExpiry || '';
          return {
            ...a,
            role: 'ADMIN' as const,
            idType,
            idNumber,
            idIssueCountry,
            idExpiryDate,
          };
        }),
      ];
      setUsers(merged);
    } catch (e: any) {
      setError(e?.message || 'usersCtx.loadFailed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const patchLocal = (id: string, patch: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  };

  const approveUser = useCallback(async (id: string, tempPassword: string) => {
    const target = usersRef.current.find((u) => u.id === id);
    if (!target) return;
    const hashed = await bcrypt.hash(tempPassword, 10);
    
    // User ID is only generated upon admin approval if it does not exist yet.
    const finalUserId = target.userId || generateUserId(usersRef.current);

    const updated: User = { 
      ...target, 
      userId: finalUserId,
      status: 'ENABLED', 
      statusTimestamp: new Date().toISOString(), 
      password: hashed 
    };
    await saveDoc(collectionFor(updated), updated.id, updated);
    patchLocal(id, { 
      userId: finalUserId,
      status: 'ENABLED', 
      statusTimestamp: updated.statusTimestamp 
    });
  }, []);

  const rejectUser = useCallback(async (id: string) => {
    const target = usersRef.current.find((u) => u.id === id);
    if (!target) return;
    const updated: User = { ...target, status: 'DISABLED', statusTimestamp: new Date().toISOString() };
    await saveDoc(collectionFor(updated), updated.id, updated);
    patchLocal(id, { status: 'DISABLED', statusTimestamp: updated.statusTimestamp });
  }, []);

  const disableUser = useCallback(async (id: string) => {
    const target = usersRef.current.find((u) => u.id === id);
    if (!target) return;
    const updated: User = { ...target, status: 'DISABLED', statusTimestamp: new Date().toISOString() };
    await saveDoc(collectionFor(updated), updated.id, updated);
    patchLocal(id, { status: 'DISABLED', statusTimestamp: updated.statusTimestamp });
  }, []);

  const enableUser = useCallback(async (id: string) => {
    const target = usersRef.current.find((u) => u.id === id);
    if (!target) return;
    const updated: User = { ...target, status: 'ENABLED', statusTimestamp: new Date().toISOString() };
    await saveDoc(collectionFor(updated), updated.id, updated);
    patchLocal(id, { status: 'ENABLED', statusTimestamp: updated.statusTimestamp });
  }, []);

  const blockUser = useCallback(async (id: string) => {
    const target = usersRef.current.find((u) => u.id === id);
    if (!target) return;
    const now = new Date().toISOString();
    const updated: User = { ...target, status: 'BLOCKED', statusTimestamp: now, blockTimestamp: now };
    await saveDoc(collectionFor(updated), updated.id, updated);
    patchLocal(id, { status: 'BLOCKED', statusTimestamp: now, blockTimestamp: now });
  }, []);

  const unblockUser = useCallback(async (id: string) => {
    const target = usersRef.current.find((u) => u.id === id);
    if (!target) return;
    const updated: User = { ...target, status: 'ENABLED', statusTimestamp: new Date().toISOString() };
    await saveDoc(collectionFor(updated), updated.id, updated);
    patchLocal(id, { status: 'ENABLED', statusTimestamp: updated.statusTimestamp });
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    await Promise.all([
      deleteDocFrom('users', id).catch(() => {}),
      deleteDocFrom('admins', id).catch(() => {}),
    ]);
    // Cascade-delete subcollections under both possible parent paths, mirroring
    // the mobile app's removeUser handler so no orphaned data is left behind.
    for (const parentCol of ['users', 'admins']) {
      for (const sub of SUBCOLLECTIONS) {
        const subPath = `${parentCol}/${id}/${sub}`;
        try {
          const docs = await getSubcollection(subPath);
          await Promise.all(docs.map((d) => deleteDocFrom(subPath, d.id).catch(() => {})));
        } catch {
          /* subcollection may not exist */
        }
      }
    }
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const updateUser = useCallback(async (user: User) => {
    const updated: User = { ...user, statusTimestamp: new Date().toISOString() };
    await saveDoc(collectionFor(updated), updated.id, updated);
    patchLocal(user.id, updated);
  }, []);

  const resetPassword = useCallback(async (id: string, newPassword: string) => {
    const target = usersRef.current.find((u) => u.id === id);
    if (!target) return;
    const hashed = await bcrypt.hash(newPassword, 10);
    const now = new Date().toISOString();
    // passwordChangedAt is written so a future mobile-app update can check
    // it against a locally-cached session timestamp and force re-login —
    // there's no server-side session/token store in this Firebase-client-SDK
    // architecture to actually revoke an active session from here today.
    const updated: User = { ...target, password: hashed, passwordChangedAt: now, isFirstLogin: true };
    await saveDoc(collectionFor(updated), updated.id, updated);
    patchLocal(id, { passwordChangedAt: now, isFirstLogin: true });
  }, []);

  const createUser = useCallback(async (user: User, rawPassword: string) => {
    const hashed = await bcrypt.hash(rawPassword, 10);
    const now = new Date();
    const timestamp = now.toLocaleString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const finalUser: User = {
      ...user,
      password: hashed,
      isFirstLogin: true,
      registrationDate: user.registrationDate || timestamp,
      statusTimestamp: now.toISOString(),
    };
    await saveDoc(collectionFor(finalUser), finalUser.id, finalUser);
    setUsers((prev) => [...prev, finalUser]);
  }, []);

  return (
    <UsersContext.Provider
      value={{
        users,
        loading,
        error,
        refresh,
        approveUser,
        rejectUser,
        disableUser,
        enableUser,
        blockUser,
        unblockUser,
        deleteUser,
        updateUser,
        createUser,
        resetPassword,
      }}
    >
      {children}
    </UsersContext.Provider>
  );
};

export function useUsers(): UsersContextValue {
  const ctx = useContext(UsersContext);
  if (!ctx) throw new Error('useUsers must be used within UsersProvider');
  return ctx;
}
