import React, { useState, useMemo } from 'react';
import { X, Users, Phone, MapPin, Building, Zap, Check, AlertTriangle, ArrowRight, ArrowLeft, Mail, Calendar, Globe } from 'lucide-react';
import { User, Partner } from '../../types';
import { linkUserToManager } from '../../services/purchaseManager';
import SearchInput from '../SearchInput';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  manager: Partner;
  users: User[];
  allPartners: Partner[];
  onSuccess: (partner: Partner) => void;
}

export const LinkPartnerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  manager,
  users,
  allPartners,
  onSuccess,
}) => {
  const [step, setStep] = useState<'SELECT' | 'CONFIRM'>('SELECT');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alreadyLinkedAlert, setAlreadyLinkedAlert] = useState<{ user: User; currentManagerName?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Available users list (excluding Admins and the manager themselves)
  const candidateUsers = useMemo(() => {
    return users.filter((u) => {
      if (u.role === 'ADMIN') return false;
      if (u.id === manager.userId) return false;

      // Don't show if already linked to THIS manager
      const isAlreadyLinkedToThisManager = allPartners.some(
        (p) => p.userId === u.id && String(p.managerId) === String(manager.id) && p.status !== 'deleted'
      );
      if (isAlreadyLinkedToThisManager) return false;

      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        (u.name || '').toLowerCase().includes(q) ||
        (u.mobileNumber || u.mobile || '').includes(q) ||
        (u.userId || u.id || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.presentCountry || u.country || '').toLowerCase().includes(q) ||
        (u.area || u.city || u.manualAddress || '').toLowerCase().includes(q)
      );
    });
  }, [users, manager, allPartners, searchQuery]);

  const handleSelectCandidate = (u: User) => {
    // Check if linked to another manager
    const linkedPartner = allPartners.find(
      (p) => p.userId === u.id && p.accountType === 'PARTNER' && p.status !== 'deleted' && p.managerId && p.managerId !== manager.id
    );

    if (linkedPartner) {
      const currentMgr = allPartners.find((p) => p.id === linkedPartner.managerId);
      setAlreadyLinkedAlert({
        user: u,
        currentManagerName: currentMgr?.name || 'Another Manager',
      });
      return;
    }

    setSelectedUser(u);
    setError(null);
    setStep('CONFIRM');
  };

  const handleProceedAfterAlert = () => {
    if (!alreadyLinkedAlert) return;
    const u = alreadyLinkedAlert.user;
    setAlreadyLinkedAlert(null);
    setSelectedUser(u);
    setError(null);
    setStep('CONFIRM');
  };

  const handleReset = () => {
    setStep('SELECT');
    setSelectedUser(null);
    setSearchQuery('');
    setAlreadyLinkedAlert(null);
    setError(null);
  };

  const handleModalClose = () => {
    handleReset();
    onClose();
  };

  const handleConfirmLink = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const existingPartner = allPartners.find((p) => p.userId === selectedUser.id);
      const linked = await linkUserToManager(manager, selectedUser, existingPartner);
      onSuccess(linked);
      handleModalClose();
    } catch (err: any) {
      console.error('Error linking user to manager:', err);
      setError(err?.message || 'Failed to link user. Please try again.');
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
              <Users size={20} />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-ink-900">
                {step === 'SELECT' ? 'Link Partner / User' : 'Confirm Partner Assignment'}
              </h3>
              <p className="text-xs text-ink-600">
                Supervising Manager: <span className="font-semibold text-signal-600">{manager.name}</span> ({manager.partnerId})
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
            <AlertTriangle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: User Selection */}
        {step === 'SELECT' && !alreadyLinkedAlert && (
          <div className="p-6 flex-1 overflow-y-auto flex flex-col min-h-0 space-y-4">
            <SearchInput
              placeholder="Search registered user by name, phone, email, or ID..."
              value={searchQuery}
              onChange={setSearchQuery}
            />

            <div className="flex-1 overflow-y-auto space-y-2 thin-scroll pr-1 max-h-[380px]">
              {candidateUsers.length === 0 ? (
                <div className="text-center py-12 text-ink-400 text-sm">
                  {searchQuery ? 'No eligible users found matching search criteria.' : 'No available users found to link.'}
                </div>
              ) : (
                candidateUsers.map((u) => {
                  const linkedOtherMgr = allPartners.find(
                    (p) => p.userId === u.id && p.accountType === 'PARTNER' && p.status !== 'deleted' && p.managerId && p.managerId !== manager.id
                  );
                  const otherMgr = linkedOtherMgr ? allPartners.find((p) => p.id === linkedOtherMgr.managerId) : null;

                  return (
                    <div
                      key={u.id}
                      onClick={() => handleSelectCandidate(u)}
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
                            {otherMgr && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                Assigned to {otherMgr.name}
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
                            {(u.buildingNumber || u.area) && (
                              <span className="flex items-center gap-1">
                                <Building size={11} /> {u.buildingNumber || u.area}
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

        {/* Already Linked Warning Pop-up within modal */}
        {alreadyLinkedAlert && (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h4 className="text-base font-bold text-ink-900">
                User Already Linked to Another Manager
              </h4>
              <p className="text-xs text-ink-600 mt-1 max-w-md mx-auto">
                <span className="font-semibold text-ink-900">{alreadyLinkedAlert.user.name}</span> is currently assigned under{' '}
                <span className="font-bold text-signal-600">{alreadyLinkedAlert.currentManagerName}</span>.
                Would you like to transfer and link this partner to <span className="font-bold text-signal-600">{manager.name}</span>?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAlreadyLinkedAlert(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-ink-600 hover:bg-ink-900/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedAfterAlert}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-signal-500 hover:bg-signal-600 transition-colors shadow-sm"
              >
                Proceed with Reassignment
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Confirm Linking Sheet */}
        {step === 'CONFIRM' && selectedUser && (
          <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
            <div className="p-6 space-y-4 overflow-y-auto flex-1 thin-scroll">
              {/* Profile Card Header */}
              <div className="flex items-center gap-4 p-4 bg-signal-500/10 border border-signal-500/20 rounded-2xl">
                <div className="w-14 h-14 rounded-2xl bg-signal-500/20 text-signal-600 flex items-center justify-center font-bold text-xl shrink-0 overflow-hidden border border-ink-900/8">
                  {selectedUser.avatar ? (
                    <img src={selectedUser.avatar} alt={selectedUser.name} className="w-full h-full object-cover" />
                  ) : (
                    (selectedUser.name || 'U').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-base font-extrabold text-ink-900 truncate">
                    {selectedUser.name}
                  </h4>
                  <p className="text-xs text-ink-600">
                    User ID: <span className="font-mono font-semibold text-signal-600">{selectedUser.userId || selectedUser.id}</span>
                  </p>
                  <p className="text-xs text-ink-600 truncate">{selectedUser.email || 'No email provided'}</p>
                </div>
              </div>

              {/* Details Key-Value Table */}
              <div className="bg-canvas border border-ink-900/8 rounded-xl divide-y divide-ink-900/8 text-xs">
                <div className="flex justify-between items-center px-4 py-2.5">
                  <span className="text-ink-600 font-medium">Mobile Number</span>
                  <span className="font-bold text-ink-900 flex items-center gap-1">
                    <Phone size={12} className="text-ink-400" /> {selectedUser.mobileNumber || selectedUser.mobile || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5">
                  <span className="text-ink-600 font-medium">Date of Birth</span>
                  <span className="font-bold text-ink-900 flex items-center gap-1">
                    <Calendar size={12} className="text-ink-400" /> {selectedUser.dob || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5">
                  <span className="text-ink-600 font-medium">Nationality</span>
                  <span className="font-bold text-ink-900 flex items-center gap-1">
                    <Globe size={12} className="text-ink-400" /> {selectedUser.nationality || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5">
                  <span className="text-ink-600 font-medium">Country</span>
                  <span className="font-bold text-ink-900">
                    {selectedUser.presentCountry || selectedUser.country || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5">
                  <span className="text-ink-600 font-medium">Building Number</span>
                  <span className="font-bold text-ink-900 flex items-center gap-1">
                    <Building size={12} className="text-ink-400" /> {selectedUser.buildingNumber || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5">
                  <span className="text-ink-600 font-medium">Electricity Number</span>
                  <span className="font-bold text-ink-900 flex items-center gap-1">
                    <Zap size={12} className="text-amber-500" /> {selectedUser.electricityNumber || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5">
                  <span className="text-ink-600 font-medium">Zone / State Number</span>
                  <span className="font-bold text-ink-900">
                    Zone {selectedUser.zoneNumber || '-'}, State {selectedUser.state || selectedUser.stateNumber || '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5">
                  <span className="text-ink-600 font-medium">Area / Address</span>
                  <span className="font-bold text-ink-900 truncate max-w-[240px]">
                    {selectedUser.area || selectedUser.city || selectedUser.manualAddress || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-ink-900/8 bg-canvas/40 shrink-0">
              <button
                type="button"
                onClick={() => setStep('SELECT')}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-ink-600 hover:bg-ink-900/5 transition-colors flex items-center gap-1"
              >
                <ArrowLeft size={14} /> Back
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
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmLink}
                  className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-signal-500 hover:bg-signal-600 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  {isSubmitting ? (
                    'Linking...'
                  ) : (
                    <>
                      <Check size={16} /> Confirm & Link Partner
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
