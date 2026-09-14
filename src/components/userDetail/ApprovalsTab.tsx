import React, { useEffect, useState } from 'react';
import {
  ShoppingCart,
  Banknote,
  Check,
  X,
  Calendar,
  Store,
  CreditCard,
  Hash,
  StickyNote,
  Landmark,
  Clock3,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import ConfirmDialog from '../ConfirmDialog';
import {
  fetchPurchaseRequests,
  setPurchaseStatus,
  fetchMessPaymentRequests,
  setMessPaymentStatus,
} from '../../services/approvals';
import { PurchaseRequest, MessPaymentRequest, ApprovalStatus, User } from '../../types';

interface Props {
  user: User;
}

const fmtMoney = (n: number | undefined | null) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

const STATUS_STYLE: Record<ApprovalStatus, string> = {
  pending: 'text-pending-500 bg-pending-500/10',
  approved: 'text-active-500 bg-active-500/10',
  rejected: 'text-blocked-500 bg-blocked-500/10',
};

type Kind = 'purchase' | 'messPayment';
interface PendingAction {
  kind: Kind;
  item: PurchaseRequest | MessPaymentRequest;
  nextStatus: ApprovalStatus;
}

const ApprovalsTab: React.FC<Props> = ({ user }) => {
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [purchases, setPurchases] = useState<PurchaseRequest[]>([]);
  const [messPayments, setMessPayments] = useState<MessPaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [p, m] = await Promise.all([fetchPurchaseRequests(user), fetchMessPaymentRequests(user)]);
        if (!cancelled) {
          setPurchases(p);
          setMessPayments(m);
        }
      } catch {
        if (!cancelled) showToast(t('approvals.loadFailed'), 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const confirmAction = async () => {
    if (!pendingAction) return;
    const { kind, item, nextStatus } = pendingAction;
    setActing(true);
    setBusyId(item.id);
    try {
      if (kind === 'purchase') {
        await setPurchaseStatus(user, item as PurchaseRequest, nextStatus);
        setPurchases((prev) => prev.map((p) => (p.id === item.id ? { ...p, status: nextStatus } : p)));
      } else {
        await setMessPaymentStatus(user, item as MessPaymentRequest, nextStatus);
        setMessPayments((prev) => prev.map((p) => (p.id === item.id ? { ...p, status: nextStatus } : p)));
      }
      showToast(nextStatus === 'approved' ? t('approvals.approved') : t('approvals.rejected'), 'success');
    } catch {
      showToast(t('approvals.actionFailed'), 'error');
    } finally {
      setActing(false);
      setBusyId(null);
      setPendingAction(null);
    }
  };

  const pendingPurchases = purchases.filter((p) => p.status === 'pending');
  const otherPurchases = purchases.filter((p) => p.status !== 'pending');
  const pendingMessPayments = messPayments.filter((p) => p.status === 'pending');
  const otherMessPayments = messPayments.filter((p) => p.status !== 'pending');

  if (loading) {
    return <p className="text-sm text-ink-400 py-8 text-center">{t('common.loading')}</p>;
  }

  const StatusBadge: React.FC<{ status: ApprovalStatus }> = ({ status }) => (
    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${STATUS_STYLE[status]}`}>
      {t(`approvals.status.${status}`)}
    </span>
  );

  const ActionButtons: React.FC<{ kind: Kind; item: PurchaseRequest | MessPaymentRequest }> = ({ kind, item }) => (
    <div className="flex gap-2 shrink-0">
      <button
        type="button"
        disabled={busyId === item.id}
        onClick={() => setPendingAction({ kind, item, nextStatus: 'approved' })}
        className="w-8 h-8 rounded-lg bg-active-500/10 text-active-500 flex items-center justify-center hover:bg-active-500/20 disabled:opacity-50"
        title={t('approvals.approve')}
      >
        <Check size={15} />
      </button>
      <button
        type="button"
        disabled={busyId === item.id}
        onClick={() => setPendingAction({ kind, item, nextStatus: 'rejected' })}
        className="w-8 h-8 rounded-lg bg-blocked-500/10 text-blocked-500 flex items-center justify-center hover:bg-blocked-500/20 disabled:opacity-50"
        title={t('approvals.reject')}
      >
        <X size={15} />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Purchase requests */}
      <div className="bg-surface rounded-2xl border border-ink-900/8 card-shadow p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-extrabold text-sm text-ink-900 flex items-center gap-2">
            <ShoppingCart size={16} className="text-signal-600" /> {t('approvals.purchaseRequests')}
          </h3>
          {pendingPurchases.length > 0 && (
            <span className="text-[11px] font-bold text-pending-500 bg-pending-500/10 px-2.5 py-1 rounded-full">
              {t('approvals.pendingCount', { count: pendingPurchases.length })}
            </span>
          )}
        </div>

        {purchases.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm font-semibold text-ink-600">{t('approvals.noPurchases')}</p>
            <p className="text-xs text-ink-400 mt-1">{t('approvals.noPurchasesHint')}</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {[...pendingPurchases, ...otherPurchases].map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-ink-900/8">
                <span className="w-10 h-10 rounded-xl bg-signal-500/10 text-signal-600 flex items-center justify-center shrink-0">
                  <Store size={17} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink-900 truncate">{p.hypermarketName || '—'}</p>
                  <p className="text-xs text-ink-400 flex items-center gap-1 mt-0.5">
                    <Calendar size={11} /> {p.date} · {(p.items || []).length} {t('approvals.items')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-sm font-bold text-ink-900">{fmtMoney(p.amount)}</p>
                  <StatusBadge status={p.status} />
                </div>
                {p.status === 'pending' && <ActionButtons kind="purchase" item={p} />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mess / partner payments */}
      <div className="bg-surface rounded-2xl border border-ink-900/8 card-shadow p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-extrabold text-sm text-ink-900 flex items-center gap-2">
            <Banknote size={16} className="text-signal-600" /> {t('approvals.messPayments')}
          </h3>
          {pendingMessPayments.length > 0 && (
            <span className="text-[11px] font-bold text-pending-500 bg-pending-500/10 px-2.5 py-1 rounded-full">
              {t('approvals.pendingCount', { count: pendingMessPayments.length })}
            </span>
          )}
        </div>

        {messPayments.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm font-semibold text-ink-600">{t('approvals.noMessPayments')}</p>
            <p className="text-xs text-ink-400 mt-1">{t('approvals.noMessPaymentsHint')}</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {[...pendingMessPayments, ...otherMessPayments].map((p) => (
              <div key={p.id} className="flex items-start gap-3 p-3.5 rounded-xl border border-ink-900/8">
                <span className="w-10 h-10 rounded-xl bg-signal-500/10 text-signal-600 flex items-center justify-center shrink-0 mt-0.5">
                  <CreditCard size={17} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-mono text-sm font-bold text-ink-900">{fmtMoney(p.amount)}</p>
                    <span className="text-xs text-ink-400">{p.method}</span>
                  </div>
                  <p className="text-xs text-ink-400 flex items-center gap-1 mt-1">
                    <Clock3 size={11} /> {p.date} {p.time ? `· ${p.time}` : ''}
                  </p>
                  {p.transactionId && (
                    <p className="text-xs text-ink-400 flex items-center gap-1 mt-0.5 font-mono">
                      <Hash size={11} /> {p.transactionId}
                    </p>
                  )}
                  {p.bankDetails?.bankName && (
                    <p className="text-xs text-ink-400 flex items-center gap-1 mt-0.5">
                      <Landmark size={11} /> {p.bankDetails.bankName}
                      {p.bankDetails.accountNumber ? ` · ${p.bankDetails.accountNumber}` : ''}
                    </p>
                  )}
                  {p.remarks && (
                    <p className="text-xs text-ink-400 flex items-center gap-1 mt-0.5">
                      <StickyNote size={11} /> {p.remarks}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <StatusBadge status={p.status} />
                </div>
                {p.status === 'pending' && <ActionButtons kind="messPayment" item={p} />}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingAction}
        title={pendingAction?.nextStatus === 'approved' ? t('approvals.confirmApproveTitle') : t('approvals.confirmRejectTitle')}
        message={pendingAction?.nextStatus === 'approved' ? t('approvals.confirmApproveBody') : t('approvals.confirmRejectBody')}
        confirmLabel={pendingAction?.nextStatus === 'approved' ? t('approvals.approve') : t('approvals.reject')}
        danger={pendingAction?.nextStatus === 'rejected'}
        loading={acting}
        onConfirm={confirmAction}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
};

export default ApprovalsTab;
