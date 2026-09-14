import React, { useMemo, useState } from 'react';
import { LucideIcon, Plus, X } from 'lucide-react';
import FloatingSelect from './FloatingSelect';
import FloatingInput from './FloatingInput';
import { useDropdownOptions, DropdownField, FIELD_LABEL_KEYS } from '../contexts/DropdownOptionsContext';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';
import { FieldAccent } from '../styles/controls';

interface Option {
  value: string;
  label: string;
}

const ADD_NEW_SENTINEL = '__ADD_NEW__';

interface Props {
  label: string;
  icon: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  /** Built-in options for this field (e.g. GENDERS, RELIGIONS...). */
  options: Option[];
  field: DropdownField;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  accent?: FieldAccent;
}

/**
 * Drop-in replacement for FloatingSelect that lets an admin add a brand-new
 * item to the dropdown right from the registration form — no code change,
 * no separate settings screen required. Admin-added items are shared across
 * every admin (persisted via DropdownOptionsContext) and show up instantly
 * in every select for that field, including this one.
 */
const EditableFloatingSelect: React.FC<Props> = ({
  label,
  icon,
  value,
  onChange,
  options,
  field,
  required,
  disabled,
  error,
  accent,
}) => {
  const { customOptions, addOption } = useDropdownOptions();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const mergedOptions = useMemo<Option[]>(() => {
    const custom = customOptions[field] || [];
    const seen = new Set(options.map((o) => o.value.toLowerCase()));
    const extra = custom.filter((o) => !seen.has(o.value.toLowerCase()));
    const combined = [...options, ...extra];

    // If the field already holds a value that isn't in the built-in or
    // custom lists (e.g. free text typed before this field became a
    // dropdown), show it as a selectable entry so switching to a select
    // doesn't blank out or silently change existing records.
    const combinedSeen = new Set(combined.map((o) => o.value.toLowerCase()));
    if (value && !combinedSeen.has(value.toLowerCase())) {
      combined.push({ value, label: value });
    }

    return [...combined, { value: ADD_NEW_SENTINEL, label: t('editableSelect.addNew') }];
  }, [options, customOptions, field, value, t]);

  const handleChange = (v: string) => {
    if (v === ADD_NEW_SENTINEL) {
      setNewLabel('');
      setAdding(true);
      return;
    }
    onChange(v);
  };

  const handleSaveNew = async () => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const item = await addOption(field, trimmed);
      onChange(item.value);
      showToast(t('editableSelect.added', { label: item.label }), 'success');
      setAdding(false);
      setNewLabel('');
    } catch (e: any) {
      showToast(t(e?.message) || t('editableSelect.addFailed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <FloatingSelect
        label={label}
        icon={icon}
        value={value}
        onChange={handleChange}
        options={mergedOptions}
        required={required}
        disabled={disabled}
        error={error}
        accent={accent}
      />

      {adding && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
            onClick={saving ? undefined : () => setAdding(false)}
          />
          <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 rise-in">
            <button
              onClick={() => setAdding(false)}
              disabled={saving}
              className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center text-ink-400 hover:bg-ink-900/5"
            >
              <X size={16} />
            </button>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-signal-500/10 text-signal-600">
              <Plus size={20} />
            </div>
            <h3 className="font-display font-extrabold text-base text-ink-900 mb-1.5">{t('editableSelect.modalTitle')}</h3>
            <p className="text-sm text-ink-600 leading-relaxed mb-4">
              {t('editableSelect.modalDescription', { field: t(FIELD_LABEL_KEYS[field]) })}
            </p>

            <div className="mb-5">
              <FloatingInput
                label={t('editableSelect.newItemName')}
                icon={Plus}
                value={newLabel}
                onChange={setNewLabel}
                autoFocus
              />
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => setAdding(false)}
                disabled={saving}
                className="flex-1 h-11 rounded-xl border border-ink-900/12 font-bold text-sm text-ink-600 hover:bg-ink-900/5"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveNew}
                disabled={saving || !newLabel.trim()}
                className="flex-1 h-11 rounded-xl font-bold text-sm text-white bg-signal-500 hover:bg-signal-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? '...' : t('editableSelect.add')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditableFloatingSelect;
