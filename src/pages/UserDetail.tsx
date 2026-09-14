import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldX,
  KeyRound,
  UserCircle2,
  ShieldQuestion,
  Smartphone,
  History,
  Lock,
  Wallet,
  Receipt,
  ClipboardCheck,
} from 'lucide-react';
import Topbar from '../components/Topbar';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import FloatingInput from '../components/FloatingInput';
import DesktopModalCard from '../components/DesktopModalCard';
import TabNav, { TabItem } from '../components/userDetail/TabNav';
import PersonalInfoTab from '../components/userDetail/PersonalInfoTab';
import AccessPermissionTab from '../components/userDetail/AccessPermissionTab';
import DevicesTab from '../components/userDetail/DevicesTab';
import LoginHistoryTab from '../components/userDetail/LoginHistoryTab';
import SecurityTab from '../components/userDetail/SecurityTab';
import SubscriptionTab from '../components/userDetail/SubscriptionTab';
import PaymentHistoryTab from '../components/userDetail/PaymentHistoryTab';
import ApprovalsTab from '../components/userDetail/ApprovalsTab';
import { useUsers } from '../contexts/UsersContext';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';
import { User } from '../types';
import { validateMobileNumber, validateDocumentNumber } from '../utils/formOptions';

type ConfirmKind = 'disable' | 'block' | 'unblock' | 'delete' | 'reject' | null;
type TabKey = 'personal' | 'permissions' | 'devices' | 'loginHistory' | 'security' | 'subscription' | 'paymentHistory' | 'approvals';

const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();
  const { users, loading, approveUser, rejectUser, disableUser, enableUser, blockUser, unblockUser, deleteUser, updateUser } =
    useUsers();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const user = useMemo(() => users.find((u) => u.id === decodeURIComponent(id || '')), [users, id]);

  const [activeTab, setActiveTab] = useState<TabKey>('personal');
  const [editing, setEditing] = useState(false);
  // `paidAmount`/`dueAmount` are numbers on User, but the input widgets
  // work with strings — the form keeps them as strings and saveEdit()
  // converts them back to numbers before persisting.
  const [form, setForm] = useState<Partial<Omit<User, 'paidAmount' | 'dueAmount'>> & { paidAmount?: string; dueAmount?: string }>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [approveError, setApproveError] = useState('');

  const startEdit = () => {
    if (!user) return;
    setForm({
      name: user.name || '',
      email: user.email || '',
      countryCode: user.countryCode || '+880',
      mobile: user.mobile || (user.mobileNumber || '').replace(user.countryCode || '+880', '') || '',
      whatsapp: user.whatsapp || '',
      role: user.role,
      expiryDate: user.expiryDate || '',
      nationality: user.nationality || '',
      country: user.country || user.presentCountry || '',
      dob: user.dob || '',
      gender: user.gender || '',
      religion: user.religion || '',
      profession: user.profession || '',
      idIssueCountry: user.idIssueCountry || '',
      idType: user.idType || '',
      idNumber: user.idNumber || '',
      buildingNumber: user.buildingNumber || '',
      zoneNumber: user.zoneNumber || '',
      streetNumber: user.streetNumber || '',
      area: user.area || '',
      city: user.city || '',
      state: user.state || '',
      postalCode: user.postalCode || '',
      duration: user.duration || '',
      package: user.package || '',
      price: user.price || '',
      paymentMethod: user.paymentMethod || '',
      bankName: user.bankName || '',
      accountHolderName: user.accountHolderName || '',
      accountOrChequeNumber: user.accountOrChequeNumber || '',
      idExpiryDate: user.idExpiryDate || '',
      paidAmount: user.paidAmount !== undefined && user.paidAmount !== null ? String(user.paidAmount) : '',
      dueAmount: user.dueAmount !== undefined && user.dueAmount !== null ? String(user.dueAmount) : '',
    });
    setFormErrors({});
    setEditing(true);
  };

  // Coming from the edit icon in the list rows opens this page with ?edit=1
  // so the edit form is ready immediately instead of an extra tap.
  useEffect(() => {
    if (searchParams.get('edit') === '1' && user && !editing) {
      startEdit();
      const next = new URLSearchParams(searchParams);
      next.delete('edit');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, user]);

  const saveEdit = async () => {
    if (!user) return;

    // Keep every "display" field in sync with the field the mobile app
    // actually reads, so admin edits show up there immediately instead of
    // only updating the half of the record nobody else looks at:
    //   mobile      -> mobileNumber (country code + number, mobile app's canonical field)
    //   email       -> loginEmail   (what auth.ts matches logins against)
    //   country     -> presentCountry (mirrored at registration time)
    const countryCode = (form.countryCode || user.countryCode || '+880').trim();
    const mobile = (form.mobile || '').trim();

    const nextErrors: Record<string, string> = {};

    if (mobile) {
      const mobileErrorKey = validateMobileNumber(countryCode, mobile);
      if (mobileErrorKey) nextErrors.mobile = t(mobileErrorKey);
    }

    if ((form.idType || '').trim() && (form.idNumber || '').trim()) {
      const idErrorKey = validateDocumentNumber(form.idType || '', form.idNumber || '');
      if (idErrorKey) nextErrors.idNumber = t(idErrorKey);
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      showToast(t('userDetail.err.fixInput'), 'error');
      return;
    }
    setFormErrors({});

    const email = (form.email || '').trim();
    const country = (form.country || '').trim();

    setSaving(true);
    try {
      const synced: Partial<User> = {
        ...form,
        countryCode,
        mobile,
        mobileNumber: mobile ? `${countryCode}${mobile}` : '',
        email,
        loginEmail: email || undefined,
        country,
        presentCountry: country || undefined,
        paidAmount: form.paidAmount !== undefined && form.paidAmount !== '' ? Number(form.paidAmount) : undefined,
        dueAmount: form.dueAmount !== undefined && form.dueAmount !== '' ? Number(form.dueAmount) : undefined,
      };
      await updateUser({ ...user, ...synced } as User);
      showToast(t('userDetail.profileSaved'), 'success');
      setEditing(false);
    } catch (e: any) {
      showToast(e?.message || t('userDetail.saveFailed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveConfirm = async () => {
    if (!user) return;
    if (!tempPassword || tempPassword.trim().length < 4) {
      setApproveError(t('userDetail.err.passwordMinLength'));
      return;
    }
    setActionLoading(true);
    try {
      await approveUser(user.id, tempPassword.trim());
      showToast(t('userDetail.approved'), 'success');
      setApproving(false);
      setTempPassword('');
    } catch (e: any) {
      showToast(e?.message || t('userDetail.approveFailed'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const runConfirmed = async () => {
    if (!user || !confirmKind) return;
    setActionLoading(true);
    try {
      if (confirmKind === 'disable') {
        await disableUser(user.id);
        showToast(t('userDetail.deactivated'), 'success');
      } else if (confirmKind === 'reject') {
        await rejectUser(user.id);
        showToast(t('userDetail.rejected'), 'success');
      } else if (confirmKind === 'block') {
        await blockUser(user.id);
        showToast(t('userDetail.blocked'), 'success');
      } else if (confirmKind === 'unblock') {
        await unblockUser(user.id);
        showToast(t('userDetail.unblocked'), 'success');
      } else if (confirmKind === 'delete') {
        await deleteUser(user.id);
        showToast(t('userDetail.deleted'), 'success');
        navigate('/');
        return;
      }
      setConfirmKind(null);
    } catch (e: any) {
      showToast(e?.message || t('userDetail.actionFailed'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnable = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      await enableUser(user.id);
      showToast(t('userDetail.activated'), 'success');
    } catch (e: any) {
      showToast(e?.message || t('userDetail.actionFailed'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !user) {
    return (
      <div>
        <Topbar title={t('userDetail.title')} onMenuClick={openMobileNav} />
        <div className="text-center py-20 text-ink-400 text-sm font-mono">{t('common.loading')}</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <Topbar title={t('userDetail.title')} onMenuClick={openMobileNav} />
        <div className="px-6 py-16 text-center">
          <p className="text-ink-600 font-semibold mb-4">{t('userDetail.notFound')}</p>
          <button onClick={() => navigate(-1)} className="text-signal-600 font-bold text-sm hover:underline">
            {t('userDetail.goBack')}
          </button>
        </div>
      </div>
    );
  }

  const CONFIRM_COPY: Record<Exclude<ConfirmKind, null>, { title: string; message: string; danger?: boolean; label: string }> = {
    disable: { title: t('userDetail.confirmDeactivate.title'), message: t('userDetail.confirmDeactivate.body', { name: user.name }), label: t('userDetail.confirmDeactivate.action') },
    reject: { title: t('userDetail.confirmReject.title'), message: t('userDetail.confirmReject.body', { name: user.name }), danger: true, label: t('userDetail.confirmReject.action') },
    block: { title: t('userDetail.confirmBlock.title'), message: t('userDetail.confirmBlock.body', { name: user.name }), danger: true, label: t('userDetail.confirmBlock.action') },
    unblock: { title: t('userDetail.confirmUnblock.title'), message: t('userDetail.confirmUnblock.body', { name: user.name }), label: t('userDetail.confirmUnblock.action') },
    delete: {
      title: t('userDetail.confirmDelete.title'),
      message: t('userDetail.confirmDelete.body', { name: user.name }),
      danger: true,
      label: t('userDetail.confirmDelete.action'),
    },
  };

  // Global rule: Subscription only applies to mobile-app end users, never
  // to ADMIN accounts (which don't have a subscription concept at all).
  const isMobileAppUser = user.role !== 'ADMIN';

  const TABS: TabItem[] = [
    { key: 'personal', label: t('tabs.personal'), icon: UserCircle2 },
    { key: 'permissions', label: t('tabs.permissions'), icon: ShieldQuestion },
    { key: 'devices', label: t('tabs.devices'), icon: Smartphone },
    { key: 'loginHistory', label: t('tabs.loginHistory'), icon: History },
    { key: 'security', label: t('tabs.security'), icon: Lock },
    ...(isMobileAppUser ? [{ key: 'subscription', label: t('tabs.subscription'), icon: Wallet }] : []),
    ...(isMobileAppUser ? [{ key: 'paymentHistory', label: t('tabs.paymentHistory'), icon: Receipt }] : []),
    ...(isMobileAppUser ? [{ key: 'approvals', label: t('tabs.approvals'), icon: ClipboardCheck }] : []),
  ] as TabItem[];

  // If a subscription/payment-history/approvals tab was active and the role
  // got edited away from a mobile-app user, fall back to Personal so we're
  // never stuck on a now-hidden tab.
  const safeActiveTab: TabKey =
    (activeTab === 'subscription' || activeTab === 'paymentHistory' || activeTab === 'approvals') && !isMobileAppUser
      ? 'personal'
      : activeTab;

  // Prev/Next below the tab content cycles through the same TABS array the
  // top TabNav uses, mirroring the registration form's step navigation.
  const activeTabIndex = TABS.findIndex((t2) => t2.key === safeActiveTab);
  const goPrevTab = () => {
    if (activeTabIndex > 0) setActiveTab(TABS[activeTabIndex - 1].key as TabKey);
  };
  const goNextTab = () => {
    if (activeTabIndex < TABS.length - 1) setActiveTab(TABS[activeTabIndex + 1].key as TabKey);
  };

  /* Header region (Topbar, profile summary, pending-approval panel, tab
     bar) and footer region (Prev/Next between tabs) are pinned by
     DesktopModalCard — only the active tab's own content (Personal
     Information / Access Permission / Devices / Login History / Security /
     Subscription / Payment History) scrolls internally, per-section, no
     matter how long a given tab's table/list/history gets. */
  return (
    <div>
      <DesktopModalCard
        closeTo="/"
        header={
          <>
            <Topbar title={t('userDetail.title')} subtitle={user.id} onMenuClick={openMobileNav} onClose={() => navigate('/')} />

            <div className="px-4 md:px-8 pt-6">
              <button
                onClick={() => navigate(-1)}
                className="md:hidden flex items-center gap-1.5 text-xs font-bold text-ink-400 hover:text-ink-900 mb-5"
              >
                <ArrowLeft size={14} /> {t('userDetail.backToList')}
              </button>

              {/* Header card */}
              <div className="bg-surface rounded-2xl border border-ink-900/8 card-shadow p-5 mb-5 flex items-center gap-4 flex-wrap">
                <div className="w-14 h-14 rounded-full bg-signal-500/10 text-signal-600 flex items-center justify-center font-display font-bold text-lg shrink-0">
                  {(user.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-[160px]">
                  <h2 className="font-display font-extrabold text-lg text-ink-900">{user.name}</h2>
                  <p className="font-mono text-xs text-ink-400 mt-0.5">
                    {user.role}
                    {user.status === 'PENDING' 
                      ? ` · ${t('userDetail.applicationId')}: ${user.applicationId || user.id}`
                      : ` · ${t('userDetail.userId')}: ${user.userId || user.id}`
                    }
                  </p>
                </div>
                <StatusBadge user={user} />
              </div>

              {/* Pending approval action panel — shown above the tabs regardless
                  of which one is active, since it blocks everything else until resolved. */}
              {user.status === 'PENDING' && (
                <div className="bg-pending-500/5 border border-pending-500/25 card-shadow rounded-2xl p-5 mb-5">
                  <h3 className="font-display font-extrabold text-sm text-ink-900 mb-1">{t('userDetail.awaitingApproval')}</h3>
                  <p className="text-xs text-ink-600 mb-4">{t('userDetail.approvalHint')}</p>

                  {!approving ? (
                    <div className="flex gap-2.5 flex-wrap">
                      <button
                        onClick={() => setApproving(true)}
                        className="h-11 px-5 rounded-xl bg-active-500 hover:bg-emerald-600 text-white font-bold text-sm flex items-center gap-2"
                      >
                        <ShieldCheck size={16} /> {t('userDetail.approve')}
                      </button>
                      <button
                        onClick={() => setConfirmKind('reject')}
                        className="h-11 px-5 rounded-xl border border-blocked-500/30 text-blocked-500 hover:bg-blocked-500/5 font-bold text-sm flex items-center gap-2"
                      >
                        <ShieldX size={16} /> {t('userDetail.reject')}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <div className="flex-1">
                        <FloatingInput
                          label={t('userDetail.tempPassword')}
                          icon={KeyRound}
                          accent="active"
                          mono
                          value={tempPassword}
                          onChange={(v) => {
                            setTempPassword(v);
                            setApproveError('');
                          }}
                          error={approveError}
                          autoFocus
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleApproveConfirm}
                          disabled={actionLoading}
                          className="h-11 px-5 rounded-xl bg-active-500 hover:bg-emerald-600 text-white font-bold text-sm disabled:opacity-60"
                        >
                          {actionLoading ? '...' : t('common.confirm')}
                        </button>
                        <button
                          onClick={() => {
                            setApproving(false);
                            setTempPassword('');
                            setApproveError('');
                          }}
                          className="h-11 px-4 rounded-xl border border-ink-900/12 text-ink-600 font-bold text-sm"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <TabNav tabs={TABS} active={safeActiveTab} onChange={(k) => setActiveTab(k as TabKey)} />
          </>
        }
        footer={
          /* Prev / Next — same control bar style as the registration form's
             step navigation, cycling through this page's tabs instead of
             form steps. */
          <div className="px-4 md:px-8 py-4 flex items-center gap-2.5">
            <button
              type="button"
              onClick={goPrevTab}
              disabled={activeTabIndex === 0}
              className="h-11 px-4 rounded-xl border border-ink-900/12 text-ink-600 font-bold text-sm flex items-center gap-1.5 hover:bg-ink-900/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} /> {t('formStepper.prev')}
            </button>

            <div className="flex-1 text-center">
              <p className="text-[11px] font-bold text-ink-400">
                {t('formStepper.stepOf', { current: activeTabIndex + 1, total: TABS.length })}
              </p>
            </div>

            <button
              type="button"
              onClick={goNextTab}
              disabled={activeTabIndex === TABS.length - 1}
              className="h-11 px-4 rounded-xl bg-signal-500 hover:bg-signal-600 text-white font-bold text-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t('formStepper.next')} <ChevronRight size={16} />
            </button>
          </div>
        }
      >
        <div className="px-4 md:px-8 py-6">
          {/* key={safeActiveTab} forces a remount on every tab switch, which
              re-triggers the rise-in animation each panel uses — that's the
              "smooth animation on tab change" from the spec, without a
              heavier animation library. */}
          <div key={safeActiveTab}>
            {safeActiveTab === 'personal' && (
              <PersonalInfoTab
                user={user}
                editing={editing}
                form={form}
                formErrors={formErrors}
                saving={saving}
                setForm={setForm}
                startEdit={startEdit}
                cancelEdit={() => setEditing(false)}
                saveEdit={saveEdit}
              />
            )}
            {safeActiveTab === 'permissions' && <AccessPermissionTab user={user} />}
            {safeActiveTab === 'devices' && <DevicesTab user={user} />}
            {safeActiveTab === 'loginHistory' && <LoginHistoryTab user={user} />}
            {safeActiveTab === 'security' && (
              <SecurityTab
                user={user}
                onRequestConfirm={(kind) => setConfirmKind(kind)}
                onEnable={handleEnable}
                actionLoading={actionLoading}
              />
            )}
            {safeActiveTab === 'subscription' && isMobileAppUser && (
              <SubscriptionTab user={user} editing={editing} form={form} setForm={setForm} />
            )}
            {safeActiveTab === 'paymentHistory' && isMobileAppUser && <PaymentHistoryTab user={user} />}
            {safeActiveTab === 'approvals' && isMobileAppUser && <ApprovalsTab user={user} />}
          </div>
        </div>
      </DesktopModalCard>

      {confirmKind && (
        <ConfirmDialog
          open={!!confirmKind}
          title={CONFIRM_COPY[confirmKind].title}
          message={CONFIRM_COPY[confirmKind].message}
          confirmLabel={CONFIRM_COPY[confirmKind].label}
          danger={CONFIRM_COPY[confirmKind].danger}
          requireText={confirmKind === 'delete' ? user.id : undefined}
          loading={actionLoading}
          onConfirm={runConfirmed}
          onCancel={() => setConfirmKind(null)}
        />
      )}
    </div>
  );
};

export default UserDetail;
