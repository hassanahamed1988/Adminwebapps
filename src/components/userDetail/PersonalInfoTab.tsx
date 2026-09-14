import React from 'react';
import {
  Save,
  ShieldCheck,
  Pencil,
  X,
  UserPlus,
  Mail,
  Phone,
  MessageCircle,
  Globe2,
  Calendar,
  Users,
  BookOpen,
  Briefcase,
  FileText,
  CreditCard,
  Building2,
  MapPin,
  Map as MapIcon,
  Hash,
} from 'lucide-react';
import FloatingInput from '../FloatingInput';
import FloatingSelect from '../FloatingSelect';
import EditableFloatingSelect from '../EditableFloatingSelect';
import PhoneCountryInput from '../PhoneCountryInput';
import FloatingDateInput from '../FloatingDateInput';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatDateTime } from '../../utils/dateUtils';
import { User } from '../../types';
import { getCountries, getNationalities } from '../../utils/geoOptions';
import { documentNumberLabel, getGenders, getReligions, getProfessions, getDocumentTypes } from '../../utils/formOptions';

const ROLE_OPTIONS = [
  { value: 'USER', label: 'USER' },
  { value: 'MANAGER', label: 'MANAGER' },
  { value: 'ADMIN', label: 'ADMIN' },
];

type FormState = Partial<Omit<User, 'paidAmount'>> & { paidAmount?: string };

interface Props {
  user: User;
  editing: boolean;
  form: FormState;
  formErrors: Record<string, string>;
  saving: boolean;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  startEdit: () => void;
  cancelEdit: () => void;
  saveEdit: () => void;
}

const optionLabel = (opts: { value: string; label: string }[], v?: string) =>
  (v && opts.find((o) => o.value === v)?.label) || v || '—';

const PersonalInfoTab: React.FC<Props> = ({ user, editing, form, formErrors, saving, setForm, startEdit, cancelEdit, saveEdit }) => {
  const { t } = useLanguage();

  return (
    <div className="rise-in">
      {/* Profile fields */}
      <div className="bg-surface rounded-2xl border border-ink-900/8 card-shadow p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-extrabold text-sm text-ink-900">{t('userDetail.profileInfo')}</h3>
          {!editing ? (
            <button onClick={startEdit} className="flex items-center gap-1.5 text-xs font-bold text-signal-600 hover:underline">
              <Pencil size={13} /> {t('userCard.edit')}
            </button>
          ) : (
            <button onClick={cancelEdit} className="flex items-center gap-1.5 text-xs font-bold text-ink-400 hover:text-ink-900">
              <X size={13} /> {t('common.cancel')}
            </button>
          )}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-5">
          <FloatingInput
            label={t('userDetail.name')}
            icon={UserPlus}
            disabled={!editing}
            value={editing ? form.name || '' : user.name || ''}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
          />
          <FloatingInput
            label={t('newUserForm.email')}
            icon={Mail}
            type="email"
            disabled={!editing}
            value={editing ? form.email || '' : user.email || ''}
            onChange={(v) => setForm((f) => ({ ...f, email: v }))}
          />
          {editing ? (
            <div className="sm:col-span-2">
              <PhoneCountryInput
                label={t('userDetail.mobile')}
                countryCode={form.countryCode || '+880'}
                onCodeChange={(v) => setForm((f) => ({ ...f, countryCode: v }))}
                number={form.mobile || ''}
                onNumberChange={(v) => setForm((f) => ({ ...f, mobile: v }))}
                error={formErrors.mobile}
              />
            </div>
          ) : (
            <FloatingInput
              label={t('userDetail.mobile')}
              icon={Phone}
              disabled
              value={user.mobileNumber || (user.mobile ? `${user.countryCode || ''}${user.mobile}` : '')}
              onChange={() => {}}
            />
          )}
          <FloatingInput
            label={t('newUserForm.whatsapp')}
            icon={MessageCircle}
            disabled={!editing}
            value={editing ? form.whatsapp || '' : user.whatsapp || ''}
            onChange={(v) => setForm((f) => ({ ...f, whatsapp: v }))}
          />
          <FloatingSelect
            label={t('newAdminForm.role')}
            icon={ShieldCheck}
            disabled={!editing}
            value={editing ? form.role || user.role : user.role}
            onChange={(v) => setForm((f) => ({ ...f, role: v as User['role'] }))}
            options={ROLE_OPTIONS}
          />
          <EditableFloatingSelect
            label={t('userDetail.country')}
            icon={Globe2}
            field="country"
            disabled={!editing}
            value={editing ? form.country || '' : user.country || user.presentCountry || ''}
            onChange={(v) => setForm((f) => ({ ...f, country: v }))}
            options={getCountries(t)}
          />
          <EditableFloatingSelect
            label={t('newUserForm.nationality')}
            icon={Globe2}
            field="nationality"
            disabled={!editing}
            value={editing ? form.nationality || '' : user.nationality || ''}
            onChange={(v) => setForm((f) => ({ ...f, nationality: v }))}
            options={getNationalities(t)}
          />
        </div>

        {editing && (
          <button
            onClick={saveEdit}
            disabled={saving}
            className="mt-5 h-11 px-5 rounded-xl bg-signal-500 hover:bg-signal-600 text-white font-bold text-sm flex items-center gap-2 disabled:opacity-60"
          >
            <Save size={16} /> {saving ? t('common.saving') : t('common.save')}
          </button>
        )}

        <div className="grid sm:grid-cols-2 gap-4 mt-5 pt-5 border-t border-ink-900/8 text-xs text-ink-400 font-medium">
          <p>{t('userDetail.registeredOn')} {user.registrationDate || '—'}</p>
          <p>{t('userDetail.lastStatusUpdate')} {formatDateTime(user.statusTimestamp)}</p>
        </div>
      </div>

      {/* Additional personal info */}
      <div className="bg-surface rounded-2xl border border-ink-900/8 card-shadow p-5 mb-5">
        <h3 className="font-display font-extrabold text-sm text-ink-900 mb-4">{t('userDetail.additionalPersonalInfo')}</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-5">
          {editing ? (
            <FloatingDateInput label={t('newUserForm.dob')} value={form.dob || ''} onChange={(v) => setForm((f) => ({ ...f, dob: v }))} />
          ) : (
            <FloatingInput label={t('newUserForm.dob')} icon={Calendar} disabled value={user.dob || '—'} onChange={() => {}} />
          )}
          <EditableFloatingSelect
            label={t('field.gender')}
            icon={Users}
            field="gender"
            disabled={!editing}
            value={editing ? form.gender || '' : optionLabel(getGenders(t), user.gender)}
            onChange={(v) => setForm((f) => ({ ...f, gender: v }))}
            options={getGenders(t)}
          />
          <EditableFloatingSelect
            label={t('field.religion')}
            icon={BookOpen}
            field="religion"
            disabled={!editing}
            value={editing ? form.religion || '' : optionLabel(getReligions(t), user.religion)}
            onChange={(v) => setForm((f) => ({ ...f, religion: v }))}
            options={getReligions(t)}
          />
          <EditableFloatingSelect
            label={t('field.profession')}
            icon={Briefcase}
            field="profession"
            disabled={!editing}
            value={editing ? form.profession || '' : optionLabel(getProfessions(t), user.profession)}
            onChange={(v) => setForm((f) => ({ ...f, profession: v }))}
            options={getProfessions(t)}
          />
        </div>
      </div>

      {/* Document / ID info */}
      <div className="bg-surface rounded-2xl border border-ink-900/8 card-shadow p-5 mb-5">
        <h3 className="font-display font-extrabold text-sm text-ink-900 mb-4">{t('userDetail.document')}</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-5">
          <EditableFloatingSelect
            label={t('userDetail.idIssueCountry')}
            icon={Globe2}
            field="country"
            disabled={!editing}
            value={editing ? form.idIssueCountry || '' : user.idIssueCountry || ''}
            onChange={(v) => setForm((f) => ({ ...f, idIssueCountry: v }))}
            options={getCountries(t)}
          />
          <EditableFloatingSelect
            label={t('userDetail.documentType')}
            icon={FileText}
            field="documentType"
            disabled={!editing}
            value={editing ? form.idType || '' : optionLabel(getDocumentTypes(t), user.idType)}
            onChange={(v) => setForm((f) => ({ ...f, idType: v }))}
            options={getDocumentTypes(t)}
          />
          <FloatingInput
            label={documentNumberLabel(t, editing ? form.idType || '' : user.idType || '')}
            icon={CreditCard}
            disabled={!editing}
            mono
            value={editing ? form.idNumber || '' : user.idNumber || '—'}
            onChange={(v) => setForm((f) => ({ ...f, idNumber: v }))}
            error={formErrors.idNumber}
          />
        </div>
      </div>

      {/* Address */}
      <div className="bg-surface rounded-2xl border border-ink-900/8 card-shadow p-5">
        <h3 className="font-display font-extrabold text-sm text-ink-900 mb-4">{t('userDetail.address')}</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-5">
          <FloatingInput label={t('userDetail.buildingNumber')} icon={Building2} disabled={!editing} value={editing ? form.buildingNumber || '' : user.buildingNumber || '—'} onChange={(v) => setForm((f) => ({ ...f, buildingNumber: v }))} />
          <FloatingInput label={t('userDetail.zoneNumber')} icon={MapPin} disabled={!editing} value={editing ? form.zoneNumber || '' : user.zoneNumber || '—'} onChange={(v) => setForm((f) => ({ ...f, zoneNumber: v }))} />
          <FloatingInput label={t('userDetail.streetNumber')} icon={MapIcon} disabled={!editing} value={editing ? form.streetNumber || '' : user.streetNumber || '—'} onChange={(v) => setForm((f) => ({ ...f, streetNumber: v }))} />
          <FloatingInput label={t('newUserForm.addressArea')} icon={MapPin} disabled={!editing} value={editing ? form.area || '' : user.area || '—'} onChange={(v) => setForm((f) => ({ ...f, area: v }))} />
          <FloatingInput label={t('newUserForm.cityDivision')} icon={Building2} disabled={!editing} value={editing ? form.city || '' : user.city || '—'} onChange={(v) => setForm((f) => ({ ...f, city: v }))} />
          <FloatingInput label={t('newUserForm.stateDistrict')} icon={MapIcon} disabled={!editing} value={editing ? form.state || '' : user.state || '—'} onChange={(v) => setForm((f) => ({ ...f, state: v }))} />
          <FloatingInput label={t('newUserForm.postalCode')} icon={Hash} disabled={!editing} value={editing ? form.postalCode || '' : user.postalCode || '—'} onChange={(v) => setForm((f) => ({ ...f, postalCode: v }))} />
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoTab;
