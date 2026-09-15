import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Edit,
  Check,
  AlertCircle,
  User as UserIcon,
  Phone,
  Globe2,
  Building2,
  Zap,
  MapPin,
  DollarSign,
  ShieldCheck,
  Briefcase
} from 'lucide-react';
import { Partner, User } from '../../types';
import { saveDoc } from '../../services/firebase';
import FloatingInput from '../FloatingInput';
import FloatingSelect from '../FloatingSelect';
import FloatingDateInput from '../FloatingDateInput';
import { useLanguage } from '../../contexts/LanguageContext';
import { getCountries, getNationalities } from '../../utils/geoOptions';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  partner: Partner | null;
  users: User[];
  onSuccess: (updated: Partner) => void;
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'MANAGER', label: 'MANAGER' },
  { value: 'PARTNER', label: 'PARTNER' },
];

const toDmy = (v?: string): string => {
  if (!v) return '';
  const trimmed = v.trim();
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(trimmed)) return trimmed;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return trimmed;
};

export const EditPartnerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  partner,
  users,
  onSuccess,
}) => {
  const { t } = useLanguage();

  const [formName, setFormName] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formDob, setFormDob] = useState('');
  const [formNationality, setFormNationality] = useState('');
  const [formCountry, setFormCountry] = useState('');
  const [formStateNumber, setFormStateNumber] = useState('');
  const [formZoneNumber, setFormZoneNumber] = useState('');
  const [formBuildingNumber, setFormBuildingNumber] = useState('');
  const [formElectricityNumber, setFormElectricityNumber] = useState('');
  const [formAreaName, setFormAreaName] = useState('');
  const [formMonthlySalary, setFormMonthlySalary] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formAccountType, setFormAccountType] = useState<'MANAGER' | 'PARTNER'>('PARTNER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const countryOptions = useMemo(() => getCountries(t), [t]);
  const nationalityOptions = useMemo(() => getNationalities(t), [t]);

  useEffect(() => {
    if (partner) {
      const u = users.find((user) => user.id === partner.userId);
      setFormName(partner.name || u?.name || '');
      setFormMobile(partner.mobile || u?.mobileNumber || u?.mobile || '');
      setFormDob(toDmy(partner.dob || u?.dob || ''));
      setFormNationality(partner.nationality || u?.nationality || '');
      setFormCountry(partner.country || u?.presentCountry || u?.country || '');
      setFormStateNumber(partner.stateNumber || u?.state || u?.stateNumber || '');
      setFormZoneNumber(partner.zoneNumber || u?.zoneNumber || '');
      setFormBuildingNumber(partner.buildingNumber || u?.buildingNumber || '');
      setFormElectricityNumber(partner.electricityNumber || u?.electricityNumber || '');
      setFormAreaName(partner.areaName || u?.area || u?.city || u?.manualAddress || '');
      setFormMonthlySalary(partner.monthlySalary ? String(partner.monthlySalary) : '');
      setFormPrice(partner.price ? String(partner.price) : '');
      setFormStatus(partner.status === 'inactive' ? 'inactive' : 'active');
      setFormAccountType(partner.accountType || 'PARTNER');
      setError(null);
    }
  }, [partner, users]);

  if (!isOpen || !partner) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setError('Name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updatedPayload: Partner = {
        ...partner,
        name: formName.trim(),
        mobile: formMobile.trim(),
        dob: formDob.trim(),
        nationality: formNationality.trim(),
        country: formCountry.trim(),
        stateNumber: formStateNumber.trim(),
        zoneNumber: formZoneNumber.trim(),
        buildingNumber: formBuildingNumber.trim(),
        electricityNumber: formElectricityNumber.trim(),
        areaName: formAreaName.trim(),
        monthlySalary: formMonthlySalary.trim(),
        price: formPrice.trim(),
        status: formStatus,
        accountType: formAccountType,
      };

      // Save to 'partners'
      await saveDoc('partners', partner.id, updatedPayload);

      // If user role needs update
      if (partner.userId) {
        await saveDoc('users', partner.userId, {
          role: formAccountType === 'MANAGER' ? 'MANAGER' : 'USER',
        });
      }

      onSuccess(updatedPayload);
      onClose();
    } catch (err: any) {
      console.error('Error updating partner profile:', err);
      setError(err?.message || 'Failed to update profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isManager = partner.accountType === 'MANAGER';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-ink-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-panel rounded-2xl shadow-2xl border border-edge overflow-hidden z-10 my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-edge bg-canvas/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-signal-500/10 text-signal-600 dark:text-signal-400 flex items-center justify-center font-bold">
              <Edit size={20} />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-ink-900 dark:text-ink-100">
                Edit {isManager ? 'Manager Profile' : 'Partner Profile'}
              </h3>
              <p className="text-xs text-ink-500">
                ID: <span className="font-mono font-semibold text-signal-600 dark:text-signal-400">{partner.partnerId || partner.id}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-400 hover:text-ink-900 hover:bg-edge/40 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2.5 text-xs text-rose-600 dark:text-rose-400">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col min-h-0">
          <div className="p-6 space-y-5 overflow-y-auto flex-1 thin-scroll">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
              <FloatingInput
                label="Full Name"
                icon={UserIcon}
                required
                value={formName}
                onChange={setFormName}
              />

              <FloatingInput
                label="Mobile Number"
                icon={Phone}
                type="tel"
                value={formMobile}
                onChange={setFormMobile}
              />

              <FloatingDateInput
                label="Date of Birth"
                value={formDob}
                onChange={setFormDob}
              />

              <FloatingSelect
                label="Nationality"
                icon={Globe2}
                value={formNationality}
                onChange={setFormNationality}
                options={nationalityOptions}
              />

              <FloatingSelect
                label="Country"
                icon={Globe2}
                value={formCountry}
                onChange={setFormCountry}
                options={countryOptions}
              />

              <FloatingInput
                label="Building Number"
                icon={Building2}
                value={formBuildingNumber}
                onChange={setFormBuildingNumber}
              />

              <FloatingInput
                label="Electricity Number (Meter)"
                icon={Zap}
                value={formElectricityNumber}
                onChange={setFormElectricityNumber}
              />

              <div className="grid grid-cols-2 gap-2">
                <FloatingInput
                  label="State No"
                  icon={MapPin}
                  value={formStateNumber}
                  onChange={setFormStateNumber}
                />
                <FloatingInput
                  label="Zone No"
                  icon={MapPin}
                  value={formZoneNumber}
                  onChange={setFormZoneNumber}
                />
              </div>

              <div className="sm:col-span-2">
                <FloatingInput
                  label="Area Name / Address"
                  icon={MapPin}
                  value={formAreaName}
                  onChange={setFormAreaName}
                />
              </div>

              <FloatingInput
                label="Monthly Salary (QAR)"
                icon={DollarSign}
                type="number"
                value={formMonthlySalary}
                onChange={setFormMonthlySalary}
              />

              <FloatingInput
                label="Monthly Price / Share (QAR)"
                icon={DollarSign}
                type="number"
                value={formPrice}
                onChange={setFormPrice}
              />

              <FloatingSelect
                label="Status"
                icon={ShieldCheck}
                value={formStatus}
                onChange={(val) => setFormStatus(val as 'active' | 'inactive')}
                options={STATUS_OPTIONS}
              />

              <FloatingSelect
                label="Account Type"
                icon={Briefcase}
                value={formAccountType}
                onChange={(val) => setFormAccountType(val as 'MANAGER' | 'PARTNER')}
                options={ACCOUNT_TYPE_OPTIONS}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-edge bg-canvas/40 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-ink-700 dark:text-ink-300 hover:bg-edge/40 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-signal-500 hover:bg-signal-600 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              {isSubmitting ? 'Saving...' : <><Check size={16} /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
