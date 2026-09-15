import React from 'react';
import { X, User, Phone, MapPin, Building, Zap, Calendar, Globe, DollarSign, Shield, Edit, Trash2, Unlink, CheckCircle2, XCircle } from 'lucide-react';
import { Partner, User as UserType } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  partner: Partner | null;
  manager?: Partner | null;
  user?: UserType | null;
  onEdit: (p: Partner) => void;
  onToggleStatus: (p: Partner) => void;
  onUnlink?: (p: Partner) => void;
  onDelete: (p: Partner) => void;
}

export const PartnerDetailModal: React.FC<Props> = ({
  isOpen,
  onClose,
  partner,
  manager,
  user,
  onEdit,
  onToggleStatus,
  onUnlink,
  onDelete,
}) => {
  if (!isOpen || !partner) return null;

  const isManager = partner.accountType === 'MANAGER';
  const isActive = partner.status === 'active';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-ink-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-surface rounded-2xl shadow-2xl border border-ink-900/12 overflow-hidden z-10 my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-ink-900/8 bg-canvas/40 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-500">
              {isManager ? 'Manager Profile' : 'Partner Profile'}
            </span>
            <span className="text-ink-900/20">•</span>
            <span className="font-mono text-xs font-semibold text-signal-600">
              {partner.partnerId || partner.id}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-400 hover:text-ink-900 hover:bg-ink-900/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 thin-scroll space-y-5">
          {/* Main Identity Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-canvas border border-ink-900/8">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-16 h-16 rounded-2xl bg-signal-500/10 text-signal-600 flex items-center justify-center font-bold text-2xl shrink-0 overflow-hidden border border-ink-900/8">
                {partner.avatar || user?.avatar ? (
                  <img src={partner.avatar || user?.avatar || ''} alt={partner.name} className="w-full h-full object-cover" />
                ) : (
                  (partner.name || 'P').charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display font-bold text-lg text-ink-900 truncate">
                    {partner.name || user?.name || 'Unnamed Profile'}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                    }`}
                  >
                    {isActive ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-ink-600 mt-0.5">
                  User ID: <span className="font-mono font-medium text-ink-900">{user?.userId || partner.userId}</span>
                  {user?.email && ` • ${user.email}`}
                </p>
                {manager && !isManager && (
                  <p className="text-xs text-signal-600 mt-1 font-medium">
                    Manager: {manager.name} ({manager.partnerId})
                  </p>
                )}
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="px-3.5 py-2 rounded-xl bg-surface border border-ink-900/8 text-center min-w-[100px] card-shadow">
                <p className="text-[10px] uppercase font-bold text-ink-400">Monthly Rate</p>
                <p className="text-sm font-extrabold text-ink-900">
                  {partner.price ? `${partner.price} QAR` : 'Not Set'}
                </p>
              </div>
              {isManager && (
                <div className="px-3.5 py-2 rounded-xl bg-surface border border-ink-900/8 text-center min-w-[100px] card-shadow">
                  <p className="text-[10px] uppercase font-bold text-ink-400">Monthly Salary</p>
                  <p className="text-sm font-extrabold text-signal-600">
                    {partner.monthlySalary ? `${partner.monthlySalary} QAR` : 'Not Set'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Contact & Personal Info */}
            <div className="p-4 rounded-xl bg-canvas border border-ink-900/8 space-y-2.5 text-xs">
              <h4 className="font-bold text-ink-900 flex items-center gap-1.5 pb-1 border-b border-ink-900/8">
                <User size={14} className="text-signal-500" /> Personal & Contact Info
              </h4>
              <div className="flex justify-between items-center">
                <span className="text-ink-600">Mobile Number:</span>
                <span className="font-bold text-ink-900 flex items-center gap-1">
                  <Phone size={11} className="text-ink-400" /> {partner.mobile || user?.mobileNumber || user?.mobile || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-600">Date of Birth:</span>
                <span className="font-semibold text-ink-900">{partner.dob || user?.dob || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-600">Nationality:</span>
                <span className="font-semibold text-ink-900">{partner.nationality || user?.nationality || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-600">Country:</span>
                <span className="font-semibold text-ink-900">{partner.country || user?.presentCountry || user?.country || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-600">Joined On:</span>
                <span className="font-semibold text-ink-900">{partner.joiningDate || 'N/A'} {partner.joiningTime || ''}</span>
              </div>
            </div>

            {/* Address & Utility */}
            <div className="p-4 rounded-xl bg-canvas border border-ink-900/8 space-y-2.5 text-xs">
              <h4 className="font-bold text-ink-900 flex items-center gap-1.5 pb-1 border-b border-ink-900/8">
                <Building size={14} className="text-signal-500" /> Address & Location
              </h4>
              <div className="flex justify-between items-center">
                <span className="text-ink-600">Building Number:</span>
                <span className="font-bold text-ink-900">{partner.buildingNumber || user?.buildingNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-600">Electricity / Meter:</span>
                <span className="font-bold text-ink-900 flex items-center gap-1">
                  <Zap size={11} className="text-amber-500" /> {partner.electricityNumber || user?.electricityNumber || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-600">Zone / State:</span>
                <span className="font-semibold text-ink-900">
                  Zone {partner.zoneNumber || user?.zoneNumber || '-'}, State {partner.stateNumber || user?.state || '-'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-600">Area Name:</span>
                <span className="font-semibold text-ink-900 truncate max-w-[160px]">
                  {partner.areaName || user?.area || user?.city || user?.manualAddress || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-600">Monthly Rate / Price:</span>
                <span className="font-bold text-signal-600">
                  {partner.price ? `${partner.price} QAR` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-ink-900/8 bg-canvas/40 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleStatus(partner)}
              className={`px-3.5 py-1.5 rounded-[8px] text-xs font-bold border transition-colors ${
                isActive
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
              }`}
            >
              {isActive ? 'Deactivate' : 'Activate'}
            </button>

            {!isManager && onUnlink && partner.managerId && (
              <button
                type="button"
                onClick={() => onUnlink(partner)}
                className="px-3.5 py-1.5 rounded-[8px] text-xs font-bold border border-amber-500/20 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors flex items-center gap-1.5"
              >
                <Unlink size={13} /> Unlink from Manager
              </button>
            )}

            <button
              type="button"
              onClick={() => onDelete(partner)}
              className="px-3.5 py-1.5 rounded-[8px] text-xs font-bold border border-rose-500/30 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition-colors flex items-center gap-1.5"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-[8px] text-sm font-semibold text-ink-600 hover:bg-ink-900/5 transition-colors border border-ink-900/8"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(partner);
              }}
              className="px-4 py-2 rounded-[8px] text-sm font-bold text-white bg-signal-500 hover:bg-signal-600 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Edit size={14} /> Edit Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
