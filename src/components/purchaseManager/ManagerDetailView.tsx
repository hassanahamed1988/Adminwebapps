import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Users,
  UserCheck,
  UserX,
  Plus,
  Phone,
  Building,
  Zap,
  MapPin,
  Edit,
  Trash2,
  Unlink,
  Eye,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Partner, User } from '../../types';
import SearchInput from '../SearchInput';
import { LinkPartnerModal } from './LinkPartnerModal';
import { EditPartnerModal } from './EditPartnerModal';
import { PartnerDetailModal } from './PartnerDetailModal';
import {
  unlinkPartnerFromManager,
  togglePartnerStatus,
  deletePartnerRecord
} from '../../services/purchaseManager';

interface Props {
  manager: Partner;
  allPartners: Partner[];
  users: User[];
  onBack: () => void;
  onRefresh?: () => void;
}

export const ManagerDetailView: React.FC<Props> = ({
  manager,
  allPartners,
  users,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [inspectingPartner, setInspectingPartner] = useState<Partner | null>(null);
  const [confirmUnlinkPartner, setConfirmUnlinkPartner] = useState<Partner | null>(null);
  const [confirmDeletePartner, setConfirmDeletePartner] = useState<Partner | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Find manager's User doc
  const managerUser = users.find((u) => u.id === manager.userId);

  // Find linked partners under this manager
  const linkedPartners = useMemo(() => {
    return allPartners.filter(
      (p) => String(p.managerId) === String(manager.id) && p.accountType === 'PARTNER' && p.status !== 'deleted'
    );
  }, [allPartners, manager.id]);

  const activePartners = useMemo(() => {
    return linkedPartners.filter((p) => p.status === 'active');
  }, [linkedPartners]);

  const inactivePartners = useMemo(() => {
    return linkedPartners.filter((p) => p.status === 'inactive');
  }, [linkedPartners]);

  // Filtered displayed partners
  const displayedPartners = useMemo(() => {
    const list = activeTab === 'ACTIVE' ? activePartners : inactivePartners;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter((p) => {
      const u = users.find((user) => user.id === p.userId);
      return (
        (p.name || '').toLowerCase().includes(q) ||
        (p.partnerId || '').includes(q) ||
        (p.mobile || '').includes(q) ||
        (p.buildingNumber || '').toLowerCase().includes(q) ||
        (p.electricityNumber || '').includes(q) ||
        (p.areaName || '').toLowerCase().includes(q) ||
        (u?.userId || '').toLowerCase().includes(q) ||
        (u?.name || '').toLowerCase().includes(q)
      );
    });
  }, [activeTab, activePartners, inactivePartners, searchQuery, users]);

  // Handlers
  const handleToggleStatus = async (p: Partner) => {
    try {
      await togglePartnerStatus(p);
    } catch (err) {
      console.error('Failed to toggle status', err);
    }
  };

  const handleExecuteUnlink = async () => {
    if (!confirmUnlinkPartner) return;
    setActionLoading(true);
    try {
      const u = users.find((user) => user.id === confirmUnlinkPartner.userId);
      await unlinkPartnerFromManager(confirmUnlinkPartner, u);
      setConfirmUnlinkPartner(null);
    } catch (err) {
      console.error('Failed to unlink partner', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteDelete = async () => {
    if (!confirmDeletePartner) return;
    setActionLoading(true);
    try {
      await deletePartnerRecord(confirmDeletePartner);
      if (confirmDeletePartner.id === manager.id) {
        onBack();
      }
      setConfirmDeletePartner(null);
    } catch (err) {
      console.error('Failed to delete partner', err);
    } finally {
      setActionLoading(false);
    }
  };

  const isManagerActive = manager.status === 'active';

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[8px] bg-surface border border-ink-900/8 text-sm font-bold text-ink-900 hover:bg-ink-900/5 transition-colors card-shadow"
        >
          <ArrowLeft size={16} /> Back to All Managers
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditingPartner(manager)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border border-blue-500/20 text-xs font-bold transition-colors card-shadow"
          >
            <Edit size={14} /> Edit Manager Info
          </button>
          <button
            type="button"
            onClick={() => handleToggleStatus(manager)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-xs font-bold border transition-colors card-shadow ${
              isManagerActive
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
            }`}
          >
            {isManagerActive ? 'Deactivate Manager' : 'Activate Manager'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmDeletePartner(manager)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] border border-rose-500/30 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 text-xs font-bold transition-colors card-shadow"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* Manager Profile Hero Card */}
      <div className="bg-surface rounded-2xl border border-ink-900/8 p-6 card-shadow overflow-hidden relative">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4 min-w-0">
            <div className="w-18 h-18 rounded-2xl bg-signal-500/10 text-signal-600 flex items-center justify-center font-extrabold text-2xl shrink-0 overflow-hidden border border-ink-900/8 card-shadow">
              {manager.avatar || managerUser?.avatar ? (
                <img src={manager.avatar || managerUser?.avatar || ''} alt={manager.name} className="w-full h-full object-cover" />
              ) : (
                (manager.name || 'M').charAt(0).toUpperCase()
              )}
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="font-display font-black text-xl sm:text-2xl text-ink-900 truncate">
                  {manager.name || managerUser?.name || 'Unnamed Manager'}
                </h2>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-signal-500/10 text-signal-600 border border-signal-500/20">
                  {manager.partnerId || 'MGR-0000000'}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    isManagerActive
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                  }`}
                >
                  {isManagerActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  {isManagerActive ? 'Active Manager' : 'Inactive'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-ink-600">
                {(manager.mobile || managerUser?.mobileNumber || managerUser?.mobile) && (
                  <span className="flex items-center gap-1 font-medium text-ink-900">
                    <Phone size={13} className="text-ink-400" />
                    {manager.mobile || managerUser?.mobileNumber || managerUser?.mobile}
                  </span>
                )}
                {managerUser?.userId && (
                  <span className="font-mono text-ink-600">
                    User: #{managerUser.userId}
                  </span>
                )}
                {(manager.buildingNumber || managerUser?.buildingNumber) && (
                  <span className="flex items-center gap-1">
                    <Building size={13} className="text-ink-400" />
                    Building {manager.buildingNumber || managerUser?.buildingNumber}
                  </span>
                )}
                {(manager.electricityNumber || managerUser?.electricityNumber) && (
                  <span className="flex items-center gap-1">
                    <Zap size={13} className="text-amber-500" />
                    Meter {manager.electricityNumber || managerUser?.electricityNumber}
                  </span>
                )}
                {(manager.areaName || managerUser?.area) && (
                  <span className="flex items-center gap-1">
                    <MapPin size={13} className="text-ink-400" />
                    {manager.areaName || managerUser?.area}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick CTA to link users */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsLinkModalOpen(true)}
              className="w-full sm:w-auto px-4.5 py-2.5 rounded-[8px] bg-signal-500 hover:bg-signal-600 text-white font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Link User / Add Partner
            </button>
          </div>
        </div>

        {/* Manager Financial & Metadata Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-5 border-t border-ink-900/8 text-xs">
          <div className="p-3 rounded-xl bg-canvas border border-ink-900/8">
            <span className="text-[10px] uppercase font-bold text-ink-400 block mb-0.5">Monthly Salary</span>
            <span className="font-extrabold text-sm text-ink-900">
              {manager.monthlySalary ? `${manager.monthlySalary} QAR` : 'Not Set'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-canvas border border-ink-900/8">
            <span className="text-[10px] uppercase font-bold text-ink-400 block mb-0.5">Monthly Rate / Share</span>
            <span className="font-extrabold text-sm text-ink-900">
              {manager.price ? `${manager.price} QAR` : 'Not Set'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-canvas border border-ink-900/8">
            <span className="text-[10px] uppercase font-bold text-ink-400 block mb-0.5">Total Assigned</span>
            <span className="font-extrabold text-sm text-signal-600">
              {linkedPartners.length} Users
            </span>
          </div>
          <div className="p-3 rounded-xl bg-canvas border border-ink-900/8">
            <span className="text-[10px] uppercase font-bold text-ink-400 block mb-0.5">Active Partners</span>
            <span className="font-extrabold text-sm text-emerald-600">
              {activePartners.length} Active
            </span>
          </div>
        </div>
      </div>

      {/* Linked Partners Section */}
      <div className="bg-surface rounded-2xl border border-ink-900/8 p-6 card-shadow space-y-5">
        {/* Section Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-900/8 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-signal-500/10 text-signal-600 flex items-center justify-center font-bold">
              <Users size={18} />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-ink-900">
                Assigned Partners ({linkedPartners.length})
              </h3>
              <p className="text-xs text-ink-600">Users assigned under {manager.name}'s mess & purchase management</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 bg-canvas rounded-xl border border-ink-900/8 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('ACTIVE')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'ACTIVE'
                    ? 'bg-signal-500 text-white shadow-xs'
                    : 'text-ink-600 hover:text-ink-900'
                }`}
              >
                <UserCheck size={13} /> Active ({activePartners.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('INACTIVE')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'INACTIVE'
                    ? 'bg-signal-500 text-white shadow-xs'
                    : 'text-ink-600 hover:text-ink-900'
                }`}
              >
                <UserX size={13} /> Inactive ({inactivePartners.length})
              </button>
            </div>
          </div>
        </div>

        {/* Search Filter Bar */}
        <div className="w-full">
          <SearchInput
            placeholder="Search linked partners by name, ID, phone..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>

        {/* Partners List / Table */}
        {displayedPartners.length === 0 ? (
          <div className="text-center py-14 px-4 bg-canvas rounded-xl border border-dashed border-ink-900/12">
            <div className="w-12 h-12 rounded-2xl bg-signal-500/10 text-signal-600 flex items-center justify-center mx-auto mb-3">
              <Users size={22} />
            </div>
            <h4 className="font-bold text-sm text-ink-900">
              {searchQuery ? 'No matching partners found' : activeTab === 'ACTIVE' ? 'No active partners assigned' : 'No inactive partners'}
            </h4>
            <p className="text-xs text-ink-600 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'Try searching with a different term, phone number, or ID.'
                : 'Click the button below to assign registered users to this manager.'}
            </p>
            {!searchQuery && activeTab === 'ACTIVE' && (
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(true)}
                className="mt-4 px-4 py-2 rounded-[8px] bg-signal-500 hover:bg-signal-600 text-white font-bold text-xs transition-colors inline-flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={14} /> Link User / Add Partner
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto border border-ink-900/8 rounded-xl bg-surface">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-ink-900/8 bg-canvas text-ink-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Partner Profile</th>
                  <th className="py-3 px-4">Contact & IDs</th>
                  <th className="py-3 px-4">Address & Meter</th>
                  <th className="py-3 px-4">Monthly Rate / Share</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-900/8">
                {displayedPartners.map((partner) => {
                  const u = users.find((user) => user.id === partner.userId);
                  const isPActive = partner.status === 'active';

                  return (
                    <tr key={partner.id} className="hover:bg-canvas/50 transition-colors">
                      {/* Avatar & Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-signal-500/10 text-signal-600 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden border border-ink-900/8">
                            {partner.avatar || u?.avatar ? (
                              <img src={partner.avatar || u?.avatar || ''} alt={partner.name} className="w-full h-full object-cover" />
                            ) : (
                              (partner.name || u?.name || 'P').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-sm text-ink-900 block truncate">
                              {partner.name || u?.name || 'Unnamed Partner'}
                            </span>
                            <span className="text-[10px] text-ink-400 block">
                              Joined: {partner.joiningDate || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact & ID */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-ink-900 font-semibold">
                            <Phone size={11} className="text-ink-400" />
                            <span>{partner.mobile || u?.mobileNumber || u?.mobile || 'No Phone'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-signal-600">
                              ID: {partner.partnerId || 'N/A'}
                            </span>
                            {u?.userId && (
                              <span className="font-mono text-[10px] text-ink-400">
                                User #{u.userId}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Address & Meter */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5 text-ink-600">
                          {(partner.buildingNumber || u?.buildingNumber) && (
                            <div className="flex items-center gap-1 font-medium text-ink-900">
                              <Building size={11} className="text-ink-400" />
                              <span>Bldg {partner.buildingNumber || u?.buildingNumber}</span>
                            </div>
                          )}
                          {(partner.electricityNumber || u?.electricityNumber) && (
                            <div className="flex items-center gap-1 font-medium text-ink-900">
                              <Zap size={11} className="text-amber-500" />
                              <span>Meter {partner.electricityNumber || u?.electricityNumber}</span>
                            </div>
                          )}
                          {(partner.areaName || u?.area) && (
                            <div className="text-[10px] text-ink-400 truncate max-w-[140px]">
                              {partner.areaName || u?.area}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Monthly Rate / Share */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-ink-900">
                          {partner.price ? `${partner.price} QAR` : 'Not Set'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(partner)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                            isPActive
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20'
                          }`}
                        >
                          {isPActive ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                          {isPActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            title="View Full Profile"
                            onClick={() => setInspectingPartner(partner)}
                            className="p-1.5 rounded-[8px] bg-signal-500/10 text-signal-600 hover:bg-signal-500/20 border border-signal-500/20 transition-colors shadow-xs"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            title="Edit Partner Profile"
                            onClick={() => setEditingPartner(partner)}
                            className="p-1.5 rounded-[8px] bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border border-blue-500/20 transition-colors shadow-xs"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            type="button"
                            title="Unlink from Manager"
                            onClick={() => setConfirmUnlinkPartner(partner)}
                            className="p-1.5 rounded-[8px] bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/20 transition-colors shadow-xs"
                          >
                            <Unlink size={15} />
                          </button>
                          <button
                            type="button"
                            title="Delete Partner"
                            onClick={() => setConfirmDeletePartner(partner)}
                            className="p-1.5 rounded-[8px] bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border border-rose-500/20 transition-colors shadow-xs"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Link Partner Modal */}
      <LinkPartnerModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        manager={manager}
        users={users}
        allPartners={allPartners}
        onSuccess={() => {}}
      />

      {/* Edit Partner / Manager Modal */}
      <EditPartnerModal
        isOpen={!!editingPartner}
        onClose={() => setEditingPartner(null)}
        partner={editingPartner}
        users={users}
        onSuccess={() => {}}
      />

      {/* Partner Detail Modal */}
      <PartnerDetailModal
        isOpen={!!inspectingPartner}
        onClose={() => setInspectingPartner(null)}
        partner={inspectingPartner}
        manager={manager}
        user={inspectingPartner ? users.find((u) => u.id === inspectingPartner.userId) : null}
        onEdit={(p) => setEditingPartner(p)}
        onToggleStatus={handleToggleStatus}
        onUnlink={(p) => setConfirmUnlinkPartner(p)}
        onDelete={(p) => setConfirmDeletePartner(p)}
      />

      {/* Confirm Unlink Dialog */}
      {confirmUnlinkPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-ink-900/60 backdrop-blur-xs" onClick={() => setConfirmUnlinkPartner(null)} />
          <div className="relative w-full max-w-md bg-surface rounded-2xl p-6 border border-ink-900/12 shadow-2xl z-10 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
              <Unlink size={24} />
            </div>
            <div className="text-center">
              <h4 className="font-bold text-base text-ink-900">Unlink Partner from Manager?</h4>
              <p className="text-xs text-ink-600 mt-1">
                Are you sure you want to remove <span className="font-bold text-ink-900">{confirmUnlinkPartner.name}</span> from {manager.name}'s manager profile?
                The user will become unassigned and can be linked to another manager anytime.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmUnlinkPartner(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-ink-600 hover:bg-ink-900/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleExecuteUnlink}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 transition-colors shadow-sm"
              >
                {actionLoading ? 'Unlinking...' : 'Confirm Unlink'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      {confirmDeletePartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-ink-900/60 backdrop-blur-xs" onClick={() => setConfirmDeletePartner(null)} />
          <div className="relative w-full max-w-md bg-surface rounded-2xl p-6 border border-ink-900/12 shadow-2xl z-10 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="text-center">
              <h4 className="font-bold text-base text-ink-900">
                Delete {confirmDeletePartner.accountType === 'MANAGER' ? 'Manager Profile' : 'Partner Profile'}?
              </h4>
              <p className="text-xs text-ink-600 mt-1">
                Are you sure you want to delete <span className="font-bold text-ink-900">{confirmDeletePartner.name}</span>?
                {confirmDeletePartner.accountType === 'MANAGER'
                  ? ' This will reset the user role back to standard USER.'
                  : ' This will remove the partner from the system.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeletePartner(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-ink-600 hover:bg-ink-900/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleExecuteDelete}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-50 transition-colors shadow-sm"
              >
                {actionLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
