import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Shield,
  Users,
  Plus,
  Phone,
  Building,
  Zap,
  MapPin,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  ChevronRight
} from 'lucide-react';
import Topbar from '../components/Topbar';
import SearchInput from '../components/SearchInput';
import { useUsers } from '../contexts/UsersContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Partner } from '../types';
import {
  subscribePartners,
  togglePartnerStatus,
  deletePartnerRecord
} from '../services/purchaseManager';
import { AddManagerModal } from '../components/purchaseManager/AddManagerModal';
import { EditPartnerModal } from '../components/purchaseManager/EditPartnerModal';
import { ManagerDetailView } from '../components/purchaseManager/ManagerDetailView';

export const PurchaseManager: React.FC = () => {
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();
  const { users, refresh: refreshUsers } = useUsers();
  const { t } = useLanguage();

  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [confirmDeleteManager, setConfirmDeleteManager] = useState<Partner | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Real-time Firestore Subscriptions for Manager & Partner Accounts only
  useEffect(() => {
    setLoading(true);
    const unsubPartners = subscribePartners(
      (data) => {
        setPartners(data);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to subscribe to partners', err);
        setLoading(false);
      }
    );

    return () => {
      unsubPartners();
    };
  }, []);

  const handleRefresh = async () => {
    await refreshUsers();
  };

  // Filter all managers
  const allManagers = useMemo(() => {
    return partners.filter(
      (p) => p.accountType === 'MANAGER' && p.status !== 'deleted'
    );
  }, [partners]);

  const activeManagers = useMemo(() => {
    return allManagers.filter((m) => m.status === 'active');
  }, [allManagers]);

  const inactiveManagers = useMemo(() => {
    return allManagers.filter((m) => m.status === 'inactive');
  }, [allManagers]);

  // Total linked partners across all managers
  const totalLinkedPartnersCount = useMemo(() => {
    return partners.filter(
      (p) => p.accountType === 'PARTNER' && p.status !== 'deleted' && Boolean(p.managerId)
    ).length;
  }, [partners]);

  // Filtered displayed managers based on active tab and search
  const displayedManagers = useMemo(() => {
    let list = allManagers;
    if (activeTab === 'ACTIVE') list = activeManagers;
    else if (activeTab === 'INACTIVE') list = inactiveManagers;

    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;

    return list.filter((m) => {
      const u = users.find((user) => user.id === m.userId);
      return (
        (m.name || '').toLowerCase().includes(q) ||
        (m.partnerId || '').toLowerCase().includes(q) ||
        (m.mobile || '').includes(q) ||
        (m.buildingNumber || '').toLowerCase().includes(q) ||
        (m.electricityNumber || '').includes(q) ||
        (m.areaName || '').toLowerCase().includes(q) ||
        (u?.userId || '').toLowerCase().includes(q) ||
        (u?.name || '').toLowerCase().includes(q)
      );
    });
  }, [allManagers, activeManagers, inactiveManagers, activeTab, searchQuery, users]);

  // Selected manager object if in detail view
  const selectedManager = useMemo(() => {
    if (!selectedManagerId) return null;
    return allManagers.find((m) => m.id === selectedManagerId) || null;
  }, [selectedManagerId, allManagers]);

  // Handlers
  const handleToggleStatus = async (m: Partner) => {
    try {
      await togglePartnerStatus(m);
    } catch (err) {
      console.error('Failed to toggle manager status', err);
    }
  };

  const handleExecuteDelete = async () => {
    if (!confirmDeleteManager) return;
    setActionLoading(true);
    try {
      await deletePartnerRecord(confirmDeleteManager);
      if (selectedManagerId === confirmDeleteManager.id) {
        setSelectedManagerId(null);
      }
      setConfirmDeleteManager(null);
    } catch (err) {
      console.error('Failed to delete manager', err);
    } finally {
      setActionLoading(false);
    }
  };

  // If viewing a single Manager's profile & linked partners
  if (selectedManager) {
    return (
      <div>
        <Topbar
          title={`${selectedManager.name} • Manager Profile`}
          subtitle={`Manager ID: ${selectedManager.partnerId || 'N/A'}`}
          onMenuClick={openMobileNav}
          onRefresh={handleRefresh}
          refreshing={loading}
        />
        <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto">
          <ManagerDetailView
            manager={selectedManager}
            allPartners={partners}
            users={users}
            onBack={() => setSelectedManagerId(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Topbar
        title={t('nav.purchaseManager')}
        subtitle={`${allManagers.length} Total Managers • ${totalLinkedPartnersCount} Linked Partners`}
        onMenuClick={openMobileNav}
        onRefresh={handleRefresh}
        refreshing={loading}
      />

      <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto space-y-6 animate-fadeIn pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-signal-500/10 text-signal-600 flex items-center justify-center font-bold">
                <Shield size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-black font-display tracking-tight text-ink-900">
                  {t('nav.purchaseManager')}
                </h1>
                <p className="text-xs text-ink-600">
                  Manage Purchase / Mess Managers and assign partners under supervisor profiles
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4.5 py-2.5 rounded-xl bg-signal-500 hover:bg-signal-600 text-white font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 shrink-0"
          >
            <Plus size={16} /> Add Manager Profile
          </button>
        </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-2xl border border-ink-900/8 p-4.5 card-shadow flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-signal-500/10 text-signal-600 flex items-center justify-center shrink-0">
            <Shield size={22} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] uppercase font-bold text-ink-400 block tracking-wider">Total Managers</span>
            <span className="text-2xl font-black font-display text-ink-900">
              {allManagers.length}
            </span>
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-ink-900/8 p-4.5 card-shadow flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <UserCheck size={22} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] uppercase font-bold text-ink-400 block tracking-wider">Active Managers</span>
            <span className="text-2xl font-black font-display text-emerald-600">
              {activeManagers.length}
            </span>
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-ink-900/8 p-4.5 card-shadow flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <UserX size={22} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] uppercase font-bold text-ink-400 block tracking-wider">Inactive Managers</span>
            <span className="text-2xl font-black font-display text-amber-600">
              {inactiveManagers.length}
            </span>
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-ink-900/8 p-4.5 card-shadow flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
            <Users size={22} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] uppercase font-bold text-ink-400 block tracking-wider">Linked Partners</span>
            <span className="text-2xl font-black font-display text-indigo-600">
              {totalLinkedPartnersCount}
            </span>
          </div>
        </div>
      </div>

      {/* Main List Container */}
      <div className="bg-surface rounded-2xl border border-ink-900/8 p-6 card-shadow space-y-5">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Tab Switcher */}
          <div className="flex items-center p-1 bg-canvas rounded-xl border border-ink-900/8 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('ACTIVE')}
              className={`px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'ACTIVE'
                  ? 'bg-signal-500 text-white shadow-xs'
                  : 'text-ink-600 hover:text-ink-900'
              }`}
            >
              <UserCheck size={13} /> Active ({activeManagers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('INACTIVE')}
              className={`px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'INACTIVE'
                  ? 'bg-signal-500 text-white shadow-xs'
                  : 'text-ink-600 hover:text-ink-900'
              }`}
            >
              <UserX size={13} /> Inactive ({inactiveManagers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'ALL'
                  ? 'bg-signal-500 text-white shadow-xs'
                  : 'text-ink-600 hover:text-ink-900'
              }`}
            >
              All ({allManagers.length})
            </button>
          </div>

          {/* Search Bar */}
          <div className="w-full sm:w-80">
            <SearchInput
              placeholder="Search by manager name, ID, phone..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>
        </div>

        {/* Managers Cards Grid */}
        {loading ? (
          <div className="text-center py-20 text-ink-400 text-sm">Loading purchase managers...</div>
        ) : displayedManagers.length === 0 ? (
          <div className="text-center py-16 px-4 bg-canvas rounded-xl border border-dashed border-ink-900/12">
            <div className="w-14 h-14 rounded-2xl bg-signal-500/10 text-signal-600 flex items-center justify-center mx-auto mb-3">
              <Shield size={26} />
            </div>
            <h4 className="font-bold text-base text-ink-900">
              {searchQuery ? 'No managers match your search' : 'No Purchase Managers found'}
            </h4>
            <p className="text-xs text-ink-600 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'Try checking for typos or searching by phone number / manager ID.'
                : 'Create your first manager profile to start assigning and managing partners.'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="mt-4 px-4.5 py-2 rounded-xl bg-signal-500 hover:bg-signal-600 text-white font-bold text-xs transition-colors inline-flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={14} /> Add Manager Profile
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedManagers.map((manager) => {
              const u = users.find((user) => user.id === manager.userId);
              const isActive = manager.status === 'active';
              const linkedList = partners.filter(
                (p) => String(p.managerId) === String(manager.id) && p.accountType === 'PARTNER' && p.status !== 'deleted'
              );

              return (
                <div
                  key={manager.id}
                  className="bg-surface border border-ink-900/8 rounded-2xl p-5 card-shadow hover:border-signal-500/40 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-13 h-13 rounded-2xl bg-signal-500/10 text-signal-600 flex items-center justify-center font-extrabold text-lg shrink-0 overflow-hidden border border-ink-900/8">
                          {manager.avatar || u?.avatar ? (
                            <img src={manager.avatar || u?.avatar || ''} alt={manager.name} className="w-full h-full object-cover" />
                          ) : (
                            (manager.name || 'M').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-base text-ink-900 truncate">
                            {manager.name || u?.name || 'Unnamed Manager'}
                          </h3>
                          <span className="font-mono text-xs font-bold text-signal-600 block">
                            {manager.partnerId || 'MGR-0000000'}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                          isActive
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        }`}
                      >
                        {isActive ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Details Rows */}
                    <div className="space-y-1.5 text-xs text-ink-600 bg-canvas p-3 rounded-xl border border-ink-900/8">
                      {(manager.mobile || u?.mobileNumber || u?.mobile) && (
                        <div className="flex items-center gap-1.5 font-medium text-ink-900">
                          <Phone size={12} className="text-ink-400 shrink-0" />
                          <span className="truncate">{manager.mobile || u?.mobileNumber || u?.mobile}</span>
                        </div>
                      )}
                      {(manager.buildingNumber || manager.electricityNumber) && (
                        <div className="flex items-center gap-3 text-[11px]">
                          {manager.buildingNumber && (
                            <span className="flex items-center gap-1">
                              <Building size={11} className="text-ink-400" /> Bldg {manager.buildingNumber}
                            </span>
                          )}
                          {manager.electricityNumber && (
                            <span className="flex items-center gap-1">
                              <Zap size={11} className="text-amber-500" /> Meter {manager.electricityNumber}
                            </span>
                          )}
                        </div>
                      )}
                      {manager.areaName && (
                        <div className="flex items-center gap-1.5 text-[11px] truncate">
                          <MapPin size={11} className="text-ink-400 shrink-0" />
                          <span className="truncate">{manager.areaName}</span>
                        </div>
                      )}
                    </div>

                    {/* Linked Partners Count Badge */}
                    <div className="flex items-center justify-between px-3 py-2 bg-signal-500/5 rounded-xl border border-signal-500/15">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-signal-700">
                        <Users size={14} /> Assigned Partners
                      </div>
                      <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-lg bg-signal-500 text-white">
                        {linkedList.length}
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-ink-900/8">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        title="Edit Manager Info"
                        onClick={() => setEditingPartner(manager)}
                        className="p-2 rounded-[8px] bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border border-blue-500/20 transition-colors shadow-xs"
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        type="button"
                        title={isActive ? 'Deactivate Manager' : 'Activate Manager'}
                        onClick={() => handleToggleStatus(manager)}
                        className={`p-2 rounded-[8px] border transition-colors shadow-xs ${
                          isActive
                            ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20'
                        }`}
                      >
                        {isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                      </button>
                      <button
                        type="button"
                        title="Delete Manager"
                        onClick={() => setConfirmDeleteManager(manager)}
                        className="p-2 rounded-[8px] bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border border-rose-500/20 transition-colors shadow-xs"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedManagerId(manager.id)}
                      className="px-3.5 py-1.5 rounded-[8px] bg-signal-500 hover:bg-signal-600 text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-xs"
                    >
                      Manage <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Manager Modal */}
      <AddManagerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        users={users}
        existingPartners={partners}
        onSuccess={(created) => {
          setSelectedManagerId(created.id);
        }}
      />

      {/* Edit Partner / Manager Modal */}
      <EditPartnerModal
        isOpen={!!editingPartner}
        onClose={() => setEditingPartner(null)}
        partner={editingPartner}
        users={users}
        onSuccess={() => {}}
      />

      {/* Confirm Delete Manager Dialog */}
      {confirmDeleteManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-ink-900/60 backdrop-blur-xs" onClick={() => setConfirmDeleteManager(null)} />
          <div className="relative w-full max-w-md bg-surface rounded-2xl p-6 border border-ink-900/12 shadow-2xl z-10 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="text-center">
              <h4 className="font-bold text-base text-ink-900">Delete Manager Profile?</h4>
              <p className="text-xs text-ink-600 mt-1">
                Are you sure you want to delete <span className="font-bold text-ink-900">{confirmDeleteManager.name}</span>?
                This will reset the user's role back to standard USER.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteManager(null)}
                className="px-4 py-2 rounded-[8px] text-sm font-semibold text-ink-600 hover:bg-ink-900/5 transition-colors border border-ink-900/8"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleExecuteDelete}
                className="px-5 py-2 rounded-[8px] text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-50 transition-colors shadow-sm"
              >
                {actionLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
export default PurchaseManager;
