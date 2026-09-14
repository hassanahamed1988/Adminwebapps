import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ListChecks, Plus, X } from 'lucide-react';
import Topbar from '../components/Topbar';
import FloatingInput from '../components/FloatingInput';
import { useDropdownOptions, DropdownField, FIELD_LABEL_KEYS } from '../contexts/DropdownOptionsContext';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';
import { COUNTRY_VALUES, NATIONALITY_VALUES } from '../utils/geoOptions';

/* Built-in (non-removable) options for each field — kept in sync with the
   lists defined in MobileAppNewUserForm.tsx / geoOptions.ts so admins can see the full
   picture: what ships with the app vs. what they've added themselves. */
const BUILT_IN: Record<DropdownField, string[]> = {
  gender: ['পুরুষ (Male)', 'নারী (Female)', 'অন্যান্য (Other)'],
  religion: [
    'ইসলাম (Islam)', 'হিন্দু (Hinduism)', 'খ্রিস্টান (Christianity)', 'বৌদ্ধ (Buddhism)',
    'ইহুদি (Judaism)', 'শিখ (Sikhism)', 'অন্যান্য (Other)',
  ],
  profession: [
    'ছাত্র/ছাত্রী (Student)', 'চাকরিজীবী (Service)', 'ব্যবসায়ী (Business)', 'চিকিৎসক (Doctor)',
    'প্রকৌশলী (Engineer)', 'শিক্ষক (Teacher)', 'আইনজীবী (Lawyer)', 'কৃষক (Farmer)', 'চালক (Driver)',
    'শ্রমিক (Worker)', 'ফ্রিল্যান্সার (Freelancer)', 'গৃহিণী (Housewife)', 'অবসরপ্রাপ্ত (Retired)', 'অন্যান্য (Other)',
  ],
  documentType: ['National ID', 'Passport', 'Birth Registration Number', 'Visa Number', 'Residency Number'],
  duration: ['১ মাস', '৩ মাস', '৬ মাস', '১ বছর', 'লাইফটাইম'],
  country: COUNTRY_VALUES.filter(Boolean),
  nationality: NATIONALITY_VALUES.filter(Boolean),
};

const FIELD_ORDER: DropdownField[] = ['gender', 'religion', 'profession', 'documentType', 'duration', 'country', 'nationality'];

const DropdownSettings: React.FC = () => {
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();
  const { customOptions, loading, addOption, removeOption } = useDropdownOptions();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [drafts, setDrafts] = useState<Record<DropdownField, string>>({
    gender: '', religion: '', profession: '', documentType: '', duration: '', country: '', nationality: '',
  });
  const [savingField, setSavingField] = useState<DropdownField | null>(null);
  const [removingValue, setRemovingValue] = useState<string | null>(null);

  const handleAdd = async (field: DropdownField) => {
    const label = (drafts[field] || '').trim();
    if (!label) return;
    setSavingField(field);
    try {
      const item = await addOption(field, label);
      showToast(t('editableSelect.added', { label: item.label }), 'success');
      setDrafts((d) => ({ ...d, [field]: '' }));
    } catch (e: any) {
      showToast(t(e?.message) || t('editableSelect.addFailed'), 'error');
    } finally {
      setSavingField(null);
    }
  };

  const handleRemove = async (field: DropdownField, value: string) => {
    setRemovingValue(`${field}:${value}`);
    try {
      await removeOption(field, value);
      showToast(t('dropdownSettings.itemDeleted'), 'success');
    } catch (e: any) {
      showToast(t(e?.message) || t('dropdownSettings.deleteFailed'), 'error');
    } finally {
      setRemovingValue(null);
    }
  };

  return (
    <div>
      <Topbar
        title={t('dropdownSettings.title')}
        subtitle={t('dropdownSettings.subtitle')}
        onMenuClick={openMobileNav}
      />

      <div className="px-4 md:px-8 py-6 max-w-3xl">
        {loading ? (
          <div className="text-center py-14 text-ink-400 text-sm font-mono">{t('common.loading')}</div>
        ) : (
          <div className="flex flex-col gap-5">
            {FIELD_ORDER.map((field) => {
              const custom = customOptions[field] || [];
              return (
                <div key={field} className="bg-surface rounded-2xl border border-ink-900/8 card-shadow p-5">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-signal-500/10 text-signal-600 flex items-center justify-center shrink-0">
                      <ListChecks size={16} />
                    </div>
                    <h3 className="font-display font-extrabold text-sm text-ink-900">{t(FIELD_LABEL_KEYS[field])}</h3>
                  </div>

                  {/* Built-in options — shown so admins know what's already there, not removable */}
                  <p className="text-[11px] font-bold text-ink-400 uppercase tracking-wide mb-2">{t('dropdownSettings.builtIn')}</p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {BUILT_IN[field].map((l) => (
                      <span
                        key={l}
                        className="text-xs font-medium text-ink-600 bg-ink-900/5 px-2.5 py-1 rounded-full"
                      >
                        {l}
                      </span>
                    ))}
                  </div>

                  {/* Custom (admin-added) options — removable */}
                  <p className="text-[11px] font-bold text-ink-400 uppercase tracking-wide mb-2">
                    {custom.length > 0 ? t('dropdownSettings.yourAddedCount', { count: custom.length }) : t('dropdownSettings.yourAdded')}
                  </p>
                  {custom.length === 0 ? (
                    <p className="text-xs text-ink-400 mb-4">{t('dropdownSettings.noCustomYet')}</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {custom.map((o) => (
                        <span
                          key={o.value}
                          className="flex items-center gap-1.5 text-xs font-bold text-signal-600 bg-signal-500/10 border border-signal-500/20 pl-2.5 pr-1.5 py-1 rounded-full"
                        >
                          {o.label}
                          <button
                            onClick={() => handleRemove(field, o.value)}
                            disabled={removingValue === `${field}:${o.value}`}
                            title={t('dropdownSettings.remove')}
                            className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-signal-500/20 disabled:opacity-40"
                          >
                            {removingValue === `${field}:${o.value}` ? (
                              <span className="h-2.5 w-2.5 rounded-full border-2 border-signal-600/70 border-t-transparent animate-spin" />
                            ) : (
                              <X size={11} />
                            )}
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Add new */}
                  <div className="flex items-end gap-2.5 pt-1">
                    <div className="flex-1">
                      <FloatingInput
                        label={t('editableSelect.newItemName')}
                        icon={Plus}
                        value={drafts[field]}
                        onChange={(v) => setDrafts((d) => ({ ...d, [field]: v }))}
                      />
                    </div>
                    <button
                      onClick={() => handleAdd(field)}
                      disabled={savingField === field || !drafts[field].trim()}
                      className="h-11 px-4 rounded-xl bg-signal-500 hover:bg-signal-600 text-white font-bold text-sm shrink-0 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      <Plus size={15} />
                      {savingField === field ? '...' : t('editableSelect.add')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DropdownSettings;
