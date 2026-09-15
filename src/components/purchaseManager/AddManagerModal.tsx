import React, { useState, useMemo } from 'react';
import {
  X,
  User as UserIcon,
  Shield,
  Check,
  Phone,
  MapPin,
  Building2,
  Zap,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Globe2,
  DollarSign
} from 'lucide-react';
import { User, Partner } from '../../types';
import { saveManagerProfile } from '../../services/purchaseManager';
import SearchInput from '../SearchInput';
import FloatingInput from '../FloatingInput';
import FloatingSelect from '../FloatingSelect';
import FloatingDateInput from '../FloatingDateInput';
import { useLanguage } from '../../contexts/LanguageContext';
import { getCountries, getNationalities } from '../../utils/geoOptions';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  existingPartners: Partner[];
  onSuccess: (manager: Partner) => void;
}

const toDmy = (v?: string): string => {
  if (!v) return '';
  const trimmed = v.trim();
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(trimmed)) return trimmed;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return trimmed;
};

export const AddManagerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  users,
  existingPartners,
  onSuccess,
}) => {
  const { t } = useLanguage();

  const [step, setStep] = useState<'SELECT_USER' | 'EDIT_DETAILS'>('SELECT_USER');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
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

  const countryOptions = useMemo(() => getCountries(t), [t]);
  const nationalityOptions = useMemo(() => getNationalities(t), [t]);

  // Filter available users (non-admins)
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (u.role === 'ADMIN') return false;
      const isAlreadyActiveManager = existingPartners.some(
        (p) => p.userId === u.id && p.accountType === 'MANAGER' && p.status !== 'deleted'
      );
      if (isAlreadyActiveManager) return false;

      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        (u.name || '').toLowerCase().includes(q) ||
        (u.mobileNumber || u.mobile || '').includes(q) ||
        (u.userId || u.id || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.presentCountry || u.country || '').toLowerCase().includes(q)
      );
    });
  }, [users, existingPartners, searchQuery]);

  const handleSelectUser = (u: User) => {
    setSelectedUser(u);
    setFormName(u.name || '');
    setFormMobile(u.mobileNumber || u.mobile || '');
    setFormDob(toDmy(u.dob || ''));
    setFormNationality(u.nationality || '');
    setFormCountry(u.presentCountry || u.country || '');
    setFormStateNumber(u.state || u.stateNumber || '');
    setFormZoneNumber(u.zoneNumber || '');
    setFormBuildingNumber(u.buildingNumber || '');
    setFormElectricityNumber(u.electricityNumber || '');
    setFormAreaName(u.area || u.city || u.manualAddress || '');
    setFormMonthlySalary('');
    setFormPrice('');
    setError(null);
    setStep('EDIT_DETAILS');
  };

  const handleReset = () => {
    setStep('SELECT_USER');
    setSelectedUser(null);
    setSearchQuery('');
    setError(null);
  };

  const handleModalClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!formName.trim()) {
      setError('Manager name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const existingPartner = existingPartners.find((p) => p.userId === selectedUser.id);
      const manager = await saveManagerProfile(
        {
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
          accountType: 'MANAGER',
          status: 'active',
        },
        selectedUser,
        existingPartner
      );

      onSuccess(manager);
      handleModalClose();
    } catch (err: any) {
      console.error('Error creating manager profile:', err);
      setError(err?.message || 'Failed to create manager profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-ink-900/60 backdrop-blur-xs transition-opacity" onClick={handleModalClose} />

      <div className="relative w-full max-w-2xl bg-surface rounded-2xl shadow-2xl border border-ink-900/12 overflow-hidden z-10 my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-ink-900/8 bg-canvas/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-signal-500/10 text-signal-600 flex items-center justify-center font-bold">
              <Shield size={20} />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-ink-900">
                {step === 'SELECT_USER' ? 'Select User for Manager Profile' : 'Configure Manager Profile'}
              </h3>
              <p className="text-xs text-ink-600">
                {step === 'SELECT_USER'
                  ? 'Pick a registered user to assign as a Purchase / Mess Manager'
                  : `Assigning role to ${selectedUser?.name || 'Selected User'}`}
              </p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-400 hover:text-ink-900 hover:bg-ink-900/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2.5 text-xs text-rose-600">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: User Selection */}
        {step === 'SELECT_USER' && (
          <div className="p-6 flex-1 overflow-y-auto flex flex-col min-h-0 space-y-4">
            <SearchInput
              placeholder="Search user by name, phone, email, or user ID..."
              value={searchQuery}
              onChange={setSearchQuery}
            />

            <div className="flex-1 overflow-y-auto space-y-2 thin-scroll pr-1 max-h-[380px]">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-ink-400 text-sm">
                  {searchQuery ? 'No eligible users found matching your search.' : 'No available users found to assign.'}
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const existingP = existingPartners.find((p) => p.userId === u.id);
                  const isCurrentPartner = existingP && existingP.accountType === 'PARTNER' && existingP.status !== 'deleted';

                  return (
                    <div
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      className="group flex items-center justify-between p-3.5 rounded-xl border border-ink-900/8 hover:border-signal-500/50 hover:bg-signal-500/5 cursor-pointer transition-all bg-surface card-shadow"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-signal-500/10 text-signal-600 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden border border-ink-900/8">
                          {u.avatar ? (
                            <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                          ) : (
                            (u.name || 'U').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-ink-900 truncate">
                              {u.name || 'Unnamed User'}
                            </span>
                            {u.userId && (
                              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-canvas text-ink-600 border border-ink-900/8">
                                #{u.userId}
                              </span>
                            )}
                            {isCurrentPartner && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                Current Partner
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-ink-600 mt-0.5">
                            {(u.mobileNumber || u.mobile) && (
                              <span className="flex items-center gap-1">
                                <Phone size={11} /> {u.mobileNumber || u.mobile}
                              </span>
                            )}
                            {(u.presentCountry || u.country) && (
                              <span className="flex items-center gap-1">
                                <MapPin size={11} /> {u.presentCountry || u.country}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-lg bg-signal-500/10 group-hover:bg-signal-500 text-signal-600 group-hover:text-white font-semibold text-xs transition-colors flex items-center gap-1 shrink-0 ml-2"
                      >
                        Select <ArrowRight size={13} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Step 2: Manager Profile Configuration Form */}
        {step === 'EDIT_DETAILS' && (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col min-h-0">
            <div className="p-6 space-y-4 overflow-y-auto flex-1 thin-scroll">
              {/* Preselected User Banner */}
              <div className="flex items-center justify-between p-3.5 bg-signal-500/10 border border-signal-500/20 rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-signal-500/20 text-signal-600 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                    {selectedUser?.avatar ? (
                      <img src={selectedUser.avatar} alt={selectedUser.name} className="w-full h-full object-cover" />
                    ) : (
                      (selectedUser?.name || 'U').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-signal-600 uppercase tracking-wider">
                      Selected User
                    </p>
                    <p className="font-bold text-sm text-ink-900 truncate">{selectedUser?.name}</p>
                    <p className="text-xs text-ink-600">{selectedUser?.email || selectedUser?.id}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('SELECT_USER')}
                  className="text-xs font-semibold text-signal-600 hover:underline flex items-center gap-1"
                >
                  <ArrowLeft size={13} /> Change User
                </button>
              </div>

              {/* Form Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
                <FloatingInput
                  label="Manager Name"
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
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-ink-900/8 bg-canvas/40 shrink-0">
              <button
                type="button"
                onClick={() => setStep('SELECT_USER')}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-ink-600 hover:bg-ink-900/5 transition-colors"
              >
                Back
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-ink-600 hover:bg-ink-900/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-signal-500 hover:bg-signal-600 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  {isSubmitting ? (
                    'Saving...'
                  ) : (
                    <>
                      <Check size={16} /> Save Manager Profile
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
