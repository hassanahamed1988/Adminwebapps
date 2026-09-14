import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getCollection, saveDoc } from '../services/firebase';

/**
 * Every dropdown in the registration form (and anywhere else that reuses
 * these lists) that admins should be able to extend without a code change.
 * Add a new key here + register its built-in options in DEFAULT_OPTIONS in
 * MobileAppNewUserForm.tsx's companion file below to plug in a new manageable field.
 */
export type DropdownField = 'gender' | 'religion' | 'profession' | 'documentType' | 'duration' | 'nationality' | 'country' | 'bankName';

export interface OptionItem {
  value: string;
  label: string;
}

/** Translation key (in src/i18n) for each field's section-header label. */
export const FIELD_LABEL_KEYS: Record<DropdownField, string> = {
  gender: 'field.gender',
  religion: 'field.religion',
  profession: 'field.profession',
  documentType: 'field.documentType',
  duration: 'field.duration',
  nationality: 'field.nationality',
  country: 'field.country',
  bankName: 'field.bankName',
};

const COLLECTION = 'appSettings';
const DOC_ID = 'dropdownOptions';

type CustomOptionsMap = Record<DropdownField, OptionItem[]>;

const EMPTY_MAP: CustomOptionsMap = {
  gender: [],
  religion: [],
  profession: [],
  documentType: [],
  duration: [],
  nationality: [],
  country: [],
  bankName: [],
};

interface Ctx {
  /** Admin-added items only, per field — merge with each field's built-in
   *  defaults at the point of use (see mergedOptions helper in MobileAppNewUserForm.tsx). */
  customOptions: CustomOptionsMap;
  loading: boolean;
  addOption: (field: DropdownField, label: string) => Promise<OptionItem>;
  removeOption: (field: DropdownField, value: string) => Promise<void>;
}

const DropdownOptionsContext = createContext<Ctx | undefined>(undefined);

export const DropdownOptionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customOptions, setCustomOptions] = useState<CustomOptionsMap>(EMPTY_MAP);
  const [loading, setLoading] = useState(true);
  const ref = useRef<CustomOptionsMap>(EMPTY_MAP);
  ref.current = customOptions;

  useEffect(() => {
    (async () => {
      try {
        const docs = await getCollection(COLLECTION);
        const found = docs.find((d) => d.id === DOC_ID);
        if (found) {
          setCustomOptions({
            gender: found.gender || [],
            religion: found.religion || [],
            profession: found.profession || [],
            documentType: found.documentType || [],
            duration: found.duration || [],
            nationality: found.nationality || [],
            country: found.country || [],
            bankName: found.bankName || [],
          });
        }
      } catch {
        // Firestore unreachable — the form still works with built-in options.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addOption = useCallback(async (field: DropdownField, rawLabel: string) => {
    const label = rawLabel.trim();
    if (!label) throw new Error('dropdownCtx.nameRequired');
    const current = ref.current;
    const existing = current[field] || [];
    const dupe = existing.find((o) => o.value.toLowerCase() === label.toLowerCase());
    if (dupe) return dupe;

    const item: OptionItem = { value: label, label };
    const next: CustomOptionsMap = { ...current, [field]: [...existing, item] };
    setCustomOptions(next);
    try {
      await saveDoc(COLLECTION, DOC_ID, next);
    } catch (e) {
      // Roll back on failure so the UI doesn't show an item that never saved.
      setCustomOptions(current);
      throw e;
    }
    return item;
  }, []);

  const removeOption = useCallback(async (field: DropdownField, value: string) => {
    const current = ref.current;
    const next: CustomOptionsMap = { ...current, [field]: (current[field] || []).filter((o) => o.value !== value) };
    setCustomOptions(next);
    try {
      await saveDoc(COLLECTION, DOC_ID, next);
    } catch (e) {
      setCustomOptions(current);
      throw e;
    }
  }, []);

  return (
    <DropdownOptionsContext.Provider value={{ customOptions, loading, addOption, removeOption }}>
      {children}
    </DropdownOptionsContext.Provider>
  );
};

export function useDropdownOptions(): Ctx {
  const ctx = useContext(DropdownOptionsContext);
  if (!ctx) throw new Error('useDropdownOptions must be used within DropdownOptionsProvider');
  return ctx;
}
