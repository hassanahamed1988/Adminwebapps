import React, { useEffect, useMemo, useState } from 'react';
import {
  Wallet,
  Clock3,
  BadgePercent,
  Receipt,
  SlidersHorizontal,
  X,
  Eye,
  Calendar,
  Tag,
  CreditCard,
  ListFilter,
  ChevronDown,
  Plus,
  FileText,
  Landmark,
  Banknote,
  StickyNote,
  Building2,
  UserCheck,
  Hash,
  Smartphone,
  Phone,
  AlertTriangle,
  LucideIcon,
  Trash2,
} from 'lucide-react';
import FloatingInput from '../FloatingInput';
import FloatingSelect from '../FloatingSelect';
import SearchInput from '../SearchInput';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { formatDateTime } from '../../utils/dateUtils';
import {
  getTransactionTypes,
  getPaymentStatuses,
  getTransactionPaymentMethods,
  getTransactionPaymentFields,
  getTransactionPaymentFieldLabelMap,
} from '../../utils/formOptions';
import {
  fetchPayments,
  summarizePayments,
  saveTransaction,
  deleteTransaction,
  getAuthoritativePendingBalance,
  PaymentSummary,
} from '../../services/payments';
import { PaymentTransaction, PaymentStatus, TransactionType, User } from '../../types';

interface Props {
  user: User;
}

const STATUS_STYLE: Record<PaymentStatus, string> = {
  PAID: 'text-active-500 bg-active-500/10',
  PENDING: 'text-pending-500 bg-pending-500/10',
  FAILED: 'text-blocked-500 bg-blocked-500/10',
  CANCELLED: 'text-ink-400 bg-ink-400/10',
  REFUNDED: 'text-signal-600 bg-signal-500/10',
  PARTIALLY_PAID: 'text-pending-500 bg-pending-500/10',
};

const QUICK_FILTERS = ['ALL', 'PAID', 'PENDING', 'FAILED', 'REFUNDED'] as const;
type QuickFilter = (typeof QUICK_FILTERS)[number];

const fmtMoney = (n: number | undefined | null) => {
  const v = Number(n || 0);
  return v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const PaymentHistoryTab: React.FC<Props> = ({ user }) => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');

  const [selected, setSelected] = useState<PaymentTransaction | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const loadTransactions = async (isCancelled?: () => boolean) => {
    setLoading(true);
    try {
      const docs = await fetchPayments(user);
      if (!isCancelled?.()) setTransactions(docs);
    } catch {
      if (!isCancelled?.()) setTransactions([]);
    } finally {
      if (!isCancelled?.()) setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteTransaction(user, deleteId);
      showToast(t('common.deleteSuccess'), 'success');
      setDeleteId(null);
      setSelected(null);
      loadTransactions();
    } catch (err: any) {
      showToast(err.message || t('common.error'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    loadTransactions(() => cancelled);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  // Lifetime summary — always computed from the full transaction list,
  // never from the filtered subset (spec Step 4: "Default Summary Cards
  // সবসময় account-level lifetime total দেখাবে").
  const lifetimeSummary = useMemo(() => summarizePayments(user, transactions), [user, transactions]);
  const paymentFieldLabelMap = useMemo(() => getTransactionPaymentFieldLabelMap(t), [t]);
  const paymentMethodLabelMap = useMemo(
    () => Object.fromEntries(getTransactionPaymentMethods(t).map((o) => [o.value, o.label])),
    [t]
  );

  const activeFilterCount = [dateFrom, dateTo, typeFilter, methodFilter, statusFilter, amountMin, amountMax].filter(
    Boolean
  ).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (quickFilter !== 'ALL' && tx.status !== quickFilter) return false;
      if (typeFilter && tx.transactionType !== typeFilter) return false;
      if (methodFilter && tx.paymentMethod !== methodFilter) return false;
      if (statusFilter && tx.status !== statusFilter) return false;
      if (dateFrom && tx.createdAt < dateFrom) return false;
      if (dateTo && tx.createdAt > `${dateTo}T23:59:59`) return false;
      if (amountMin && Number(tx.amount || 0) < Number(amountMin)) return false;
      if (amountMax && Number(tx.amount || 0) > Number(amountMax)) return false;
      if (q) {
        const haystack = `${tx.id} ${tx.referenceId || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, quickFilter, typeFilter, methodFilter, statusFilter, dateFrom, dateTo, amountMin, amountMax, search]);

  const isFilterActive = activeFilterCount > 0 || quickFilter !== 'ALL' || !!search.trim();
  const filteredTotalPaid = useMemo(
    () =>
      filtered.reduce((sum, tx) => {
        if (tx.status === 'CANCELLED' || tx.status === 'FAILED') return sum;
        if (tx.transactionType === 'REFUND') return sum - (tx.paidAmount ?? tx.amount ?? 0);
        if (tx.transactionType === 'DISCOUNT') return sum;
        return sum + (tx.paidAmount ?? tx.amount ?? 0);
      }, 0),
    [filtered]
  );

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setTypeFilter('');
    setMethodFilter('');
    setStatusFilter('');
    setAmountMin('');
    setAmountMax('');
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every(tx => selectedIds.has(tx.id));
  
  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const next = new Set(selectedIds);
      filtered.forEach(tx => next.delete(tx.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      filtered.forEach(tx => next.add(tx.id));
      setSelectedIds(next);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      await Promise.all(Array.from(selectedIds).map(id => deleteTransaction(user, id)));
      showToast(t('common.deleteSuccess'), 'success');
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
      loadTransactions();
    } catch (err: any) {
      showToast(err.message || t('common.error'), 'error');
    } finally {
      setBulkDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="rise-in">
        <div className="text-center py-16 text-ink-400 text-sm font-mono">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="rise-in">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3 className="font-display font-extrabold text-sm text-ink-900">{t('paymentHistory.title')}</h3>
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="h-9 px-3.5 rounded-xl bg-signal-500 hover:bg-signal-600 text-white font-bold text-xs flex items-center gap-1.5 shrink-0"
        >
          <Plus size={14} /> {t('paymentHistory.add')}
        </button>
      </div>
      <p className="text-xs text-ink-500 mb-4">{t('paymentHistory.subtitle')}</p>

      {/* Summary Cards — Step 9: 1 col mobile, 2 col tablet, 3 col desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-5">
        <div className="bg-surface rounded-2xl border border-ink-900/8 card-shadow p-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-active-500/10 text-active-500 border-active-500/20 mb-3.5">
            <Wallet size={19} />
          </div>
          <p className="font-mono text-2xl font-bold text-ink-900 tabular-nums">{fmtMoney(lifetimeSummary.totalPaid)}</p>
          <p className="text-xs font-semibold text-ink-400 mt-1">{t('paymentHistory.totalPaid')}</p>
        </div>

        <div className="bg-surface rounded-2xl border border-ink-900/8 card-shadow p-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-pending-500/10 text-pending-500 border-pending-500/20 mb-3.5">
            <Clock3 size={19} />
          </div>
          {lifetimeSummary.creditBalance > 0 ? (
            <>
              <p className="font-mono text-2xl font-bold text-signal-600 tabular-nums">{fmtMoney(lifetimeSummary.creditBalance)}</p>
              <p className="text-xs font-semibold text-ink-400 mt-1">{t('paymentHistory.credit')}</p>
            </>
          ) : (
            <>
              <p className="font-mono text-2xl font-bold text-ink-900 tabular-nums">{fmtMoney(lifetimeSummary.pending)}</p>
              <p className="text-xs font-semibold text-ink-400 mt-1">{t('paymentHistory.pending')}</p>
            </>
          )}
        </div>

        <div className="bg-surface rounded-2xl border border-ink-900/8 card-shadow p-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-signal-500/10 text-signal-600 border-signal-500/20 mb-3.5">
            <BadgePercent size={19} />
          </div>
          <p className="font-mono text-2xl font-bold text-ink-900 tabular-nums">{fmtMoney(lifetimeSummary.totalDiscount)}</p>
          <p className="text-xs font-semibold text-ink-400 mt-1">{t('paymentHistory.totalDiscount')}</p>
        </div>
      </div>

      {isFilterActive && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-signal-500/5 border border-signal-500/15 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-semibold text-ink-600">{t('paymentHistory.filteredTotal')}</span>
          <span className="font-mono text-sm font-bold text-signal-600 tabular-nums">{fmtMoney(filteredTotalPaid)}</span>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-signal-500/10 border border-signal-500/20 flex items-center justify-between gap-2 rise-in">
          <span className="text-sm font-bold text-signal-700">
            {selectedIds.size} {t('common.selected')}
          </span>
          <button
            onClick={() => setShowBulkDeleteConfirm(true)}
            className="px-3.5 py-1.5 rounded-lg bg-blocked-500 hover:bg-red-600 text-white font-bold text-xs flex items-center gap-1.5 shrink-0"
          >
            <Trash2 size={14} /> {t('common.delete')}
          </button>
        </div>
      )}

      {/* Search + quick filters + filter toggle */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-3.5">
        <div className="flex-1">
          <SearchInput value={search} onChange={setSearch} placeholder={t('paymentHistory.searchPlaceholder')} />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          className={`h-11 px-4 rounded-xl border font-bold text-sm flex items-center gap-1.5 shrink-0 ${
            showFilters || activeFilterCount > 0
              ? 'border-signal-500/40 text-signal-600 bg-signal-500/5'
              : 'border-ink-900/12 text-ink-600 hover:bg-ink-900/5'
          }`}
        >
          <SlidersHorizontal size={15} /> {t('paymentHistory.filters')}
          {activeFilterCount > 0 && (
            <span className="w-4.5 h-4.5 rounded-full bg-signal-500 text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto no-scrollbar">
        {QUICK_FILTERS.map((qf) => (
          <button
            key={qf}
            onClick={() => setQuickFilter(qf)}
            className={`px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
              quickFilter === qf ? 'bg-signal-500 text-white' : 'bg-ink-900/5 text-ink-600 hover:bg-ink-900/10'
            }`}
          >
            {t(`paymentHistory.quickFilter.${qf.toLowerCase()}`)}
          </button>
        ))}
      </div>

      {showFilters && (
        <div className="bg-surface rounded-2xl border border-ink-900/8 card-shadow p-4 sm:p-5 mb-5 rise-in">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-5">
            <FloatingInput label={t('paymentHistory.filter.dateFrom')} icon={Calendar} type="date" value={dateFrom} onChange={setDateFrom} />
            <FloatingInput label={t('paymentHistory.filter.dateTo')} icon={Calendar} type="date" value={dateTo} onChange={setDateTo} />
            <FloatingSelect label={t('paymentHistory.filter.transactionType')} icon={Tag} value={typeFilter} onChange={setTypeFilter} options={getTransactionTypes(t)} />
            <FloatingSelect label={t('paymentHistory.filter.paymentMethod')} icon={CreditCard} value={methodFilter} onChange={setMethodFilter} options={getTransactionPaymentMethods(t)} />
            <FloatingSelect label={t('paymentHistory.filter.status')} icon={ListFilter} value={statusFilter} onChange={setStatusFilter} options={getPaymentStatuses(t)} />
            <div className="grid grid-cols-2 gap-3">
              <FloatingInput label={t('paymentHistory.filter.amountMin')} icon={Wallet} type="number" mono value={amountMin} onChange={setAmountMin} />
              <FloatingInput label={t('paymentHistory.filter.amountMax')} icon={Wallet} type="number" mono value={amountMax} onChange={setAmountMax} />
            </div>
          </div>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="mt-4 text-xs font-bold text-blocked-500 hover:underline">
              {t('paymentHistory.filter.clear')}
            </button>
          )}
        </div>
      )}

      {/* Transaction table */}
      {filtered.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-dashed border-ink-900/15 p-8 text-center">
          <Receipt size={22} className="mx-auto text-ink-400 mb-2.5" />
          <p className="text-sm font-semibold text-ink-600">
            {transactions.length === 0 ? t('paymentHistory.empty') : t('paymentHistory.noResults')}
          </p>
          {transactions.length === 0 && (
            <p className="text-xs text-ink-400 mt-1 max-w-sm mx-auto">{t('paymentHistory.emptyHint')}</p>
          )}
        </div>
      ) : (
        <>
          {/* Desktop/tablet: real table with horizontal scroll if needed */}
          <div className="hidden md:block bg-surface rounded-2xl border border-ink-900/8 card-shadow overflow-x-auto thin-scroll">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-ink-900/8 text-left">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-ink-900/20 text-signal-500 focus:ring-signal-500 w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold text-ink-400 uppercase tracking-wide">{t('paymentHistory.table.transactionId')}</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-ink-400 uppercase tracking-wide">{t('paymentHistory.table.dateTime')}</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-ink-400 uppercase tracking-wide">{t('paymentHistory.table.type')}</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-ink-400 uppercase tracking-wide">{t('paymentHistory.table.amount')}</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-ink-400 uppercase tracking-wide">{t('paymentHistory.table.discount')}</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-ink-400 uppercase tracking-wide">{t('paymentHistory.table.paidAmount')}</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-ink-400 uppercase tracking-wide">{t('paymentHistory.table.status')}</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-ink-400 uppercase tracking-wide">{t('paymentHistory.table.action')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => (
                  <tr key={tx.id} className={`border-b border-ink-900/6 last:border-0 hover:bg-ink-900/[0.02] ${selectedIds.has(tx.id) ? 'bg-signal-500/[0.03]' : ''}`}>
                    <td className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(tx.id)}
                        onChange={() => toggleSelect(tx.id)}
                        className="rounded border-ink-900/20 text-signal-500 focus:ring-signal-500 w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-600 truncate max-w-[140px]">{tx.referenceId || tx.id}</td>
                    <td className="px-4 py-3 text-xs text-ink-600 whitespace-nowrap">{formatDateTime(tx.createdAt)}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-ink-900">{t(`paymentHistory.type.${tx.transactionType.toLowerCase()}`)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-900 tabular-nums">{fmtMoney(tx.amount)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-600 tabular-nums">{tx.discount ? fmtMoney(tx.discount) : '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-ink-900 tabular-nums">{fmtMoney(tx.paidAmount ?? tx.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${STATUS_STYLE[tx.status]}`}>
                        {t(`paymentHistory.status.${tx.status.toLowerCase()}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelected(tx)}
                        className="text-signal-600 hover:text-signal-700 flex items-center gap-1 text-xs font-bold"
                      >
                        <Eye size={13} /> {t('paymentHistory.view')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: card transformation */}
          <div className="md:hidden space-y-2.5">
            {filtered.map((tx) => (
              <div
                key={tx.id}
                className={`w-full flex items-start gap-3 text-left bg-surface rounded-2xl border ${selectedIds.has(tx.id) ? 'border-signal-500/30 ring-1 ring-signal-500/30 bg-signal-500/[0.02]' : 'border-ink-900/8'} card-shadow p-4 transition-all`}
              >
                <div className="pt-0.5">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(tx.id)}
                    onChange={() => toggleSelect(tx.id)}
                    className="rounded border-ink-900/20 text-signal-500 focus:ring-signal-500 w-4 h-4 cursor-pointer"
                  />
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelected(tx)}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-ink-900">{t(`paymentHistory.type.${tx.transactionType.toLowerCase()}`)}</p>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${STATUS_STYLE[tx.status]}`}>
                      {t(`paymentHistory.status.${tx.status.toLowerCase()}`)}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-ink-400 truncate mt-0.5">{tx.referenceId || tx.id}</p>
                  <div className="flex items-center justify-between mt-2.5">
                    <p className="text-[11px] text-ink-400">{formatDateTime(tx.createdAt)}</p>
                    <p className="font-mono text-sm font-bold text-ink-900 tabular-nums">{fmtMoney(tx.paidAmount ?? tx.amount)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Transaction Details modal */}
      {selected && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto thin-scroll p-6 rise-in">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center text-ink-400 hover:bg-ink-900/5"
            >
              <X size={16} />
            </button>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-signal-500/10 text-signal-600">
              <Receipt size={20} />
            </div>
            <h3 className="font-display font-extrabold text-base text-ink-900 mb-4">{t('paymentHistory.detail.title')}</h3>

            <dl className="space-y-3 text-sm">
              <Row label={t('paymentHistory.table.transactionId')} value={selected.id} mono />
              <Row label={t('paymentHistory.table.reference')} value={selected.referenceId || '—'} mono />
              <Row label={t('paymentHistory.table.dateTime')} value={formatDateTime(selected.createdAt)} />
              <Row label={t('paymentHistory.table.type')} value={t(`paymentHistory.type.${selected.transactionType.toLowerCase()}`)} />
              <Row label={t('paymentHistory.detail.originalAmount')} value={fmtMoney(selected.amount)} mono />
              <Row label={t('paymentHistory.table.discount')} value={selected.discount ? fmtMoney(selected.discount) : '—'} mono />
              <Row
                label={t('paymentHistory.detail.netPayable')}
                value={fmtMoney((selected.amount || 0) - (selected.discount || 0))}
                mono
              />
              <Row label={t('paymentHistory.table.paidAmount')} value={fmtMoney(selected.paidAmount ?? selected.amount)} mono />
              <Row
                label={t('paymentHistory.detail.pendingAmount')}
                value={fmtMoney(Math.max(0, (selected.amount || 0) - (selected.discount || 0) - (selected.paidAmount ?? selected.amount ?? 0)))}
                mono
              />
              <Row
                label={t('paymentHistory.table.paymentMethod')}
                value={selected.paymentMethod ? paymentMethodLabelMap[selected.paymentMethod] || selected.paymentMethod : '—'}
              />
              {selected.paymentDetails && Object.keys(selected.paymentDetails).length > 0 && (
                <div className="pt-1 mt-1 border-t border-ink-900/8">
                  <p className="text-[11px] font-bold text-ink-400 uppercase tracking-wide mb-2">
                    {t('paymentHistory.detail.paymentDetailsHeading')}
                  </p>
                  <div className="space-y-2">
                    {Object.entries(selected.paymentDetails)
                      .filter(([, v]) => !!v)
                      .map(([key, value]) => (
                        <Row key={key} label={paymentFieldLabelMap[key] || key} value={value} />
                      ))}
                  </div>
                </div>
              )}
              <Row
                label={t('paymentHistory.table.status')}
                value={
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${STATUS_STYLE[selected.status]}`}>
                    {t(`paymentHistory.status.${selected.status.toLowerCase()}`)}
                  </span>
                }
              />
              {selected.note && <Row label={t('paymentHistory.detail.note')} value={selected.note} />}
              <Row label={t('paymentHistory.table.createdBy')} value={selected.createdBy || '—'} />
              <Row label={t('paymentHistory.detail.createdAt')} value={formatDateTime(selected.createdAt)} />
              {selected.updatedAt && <Row label={t('paymentHistory.detail.updatedAt')} value={formatDateTime(selected.updatedAt)} />}
            </dl>

            <div className="mt-6 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setDeleteId(selected.id)}
                className="w-full sm:flex-1 h-11 rounded-xl border border-blocked-500/20 text-blocked-500 font-bold text-sm hover:bg-blocked-500/10 flex items-center justify-center gap-1.5"
              >
                <Trash2 size={16} /> {t('common.delete')}
              </button>
              <button
                onClick={() => setSelected(null)}
                className="w-full sm:flex-1 h-11 rounded-xl border border-ink-900/12 font-bold text-sm text-ink-600 hover:bg-ink-900/5"
              >
                {t('paymentHistory.detail.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={() => !deleting && setDeleteId(null)} />
          <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 rise-in text-center">
            <div className="w-12 h-12 rounded-full bg-blocked-500/10 text-blocked-500 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} />
            </div>
            <h3 className="font-display font-extrabold text-lg text-ink-900 mb-2">{t('common.confirmDelete')}</h3>
            <p className="text-sm text-ink-500 mb-6">{t('common.deleteWarning')}</p>
            
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="flex-1 h-11 rounded-xl border border-ink-900/12 text-ink-600 font-bold text-sm hover:bg-ink-900/5 disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 h-11 rounded-xl bg-blocked-500 hover:bg-red-600 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center"
              >
                {deleting ? '...' : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={() => !bulkDeleting && setShowBulkDeleteConfirm(false)} />
          <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 rise-in text-center">
            <div className="w-12 h-12 rounded-full bg-blocked-500/10 text-blocked-500 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} />
            </div>
            <h3 className="font-display font-extrabold text-lg text-ink-900 mb-2">{t('common.confirmDelete')}</h3>
            <p className="text-sm text-ink-500 mb-6">{t('common.bulkDeleteWarning')}</p>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                disabled={bulkDeleting}
                className="flex-1 h-11 rounded-xl border border-ink-900/12 text-ink-600 font-bold text-sm hover:bg-ink-900/5 disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex-1 h-11 rounded-xl bg-blocked-500 hover:bg-red-600 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center"
              >
                {bulkDeleting ? '...' : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddForm && (
        <AddTransactionModal
          user={user}
          initialPendingHint={lifetimeSummary.pending}
          onClose={() => setShowAddForm(false)}
          onSaved={async () => {
            setShowAddForm(false);
            await loadTransactions();
          }}
        />
      )}
    </div>
  );
};

const Row: React.FC<{ label: string; value: React.ReactNode; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="flex items-center justify-between gap-3">
    <dt className="text-xs font-semibold text-ink-400 shrink-0">{label}</dt>
    <dd className={`text-xs font-bold text-ink-900 text-right truncate ${mono ? 'font-mono' : ''}`}>{value}</dd>
  </div>
);

interface AddTransactionModalProps {
  user: User;
  /** Last-known pending balance from the parent's already-loaded transaction
   *  list — shown immediately so the form never renders blank while the
   *  authoritative re-fetch below is in flight. */
  initialPendingHint: number;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

// Icon per dynamic field key (Step 8: every field still uses the existing
// global input/dropdown components — this only picks which icon each gets).
const FIELD_ICONS: Record<string, LucideIcon> = {
  bankName: Landmark,
  branchName: Building2,
  accountHolderName: UserCheck,
  accountNumber: Hash,
  transactionRef: Hash,
  paymentDate: Calendar,
  mobileBankingProvider: Smartphone,
  accountMobileNumber: Phone,
  receivedBy: UserCheck,
  receiptNumber: Hash,
  chequeNumber: Hash,
  chequeDate: Calendar,
};

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ user, initialPendingHint, onClose, onSaved }) => {
  const { t } = useLanguage();
  const { admin } = useAuth();
  const { showToast } = useToast();

  const [transactionType, setTransactionType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [discount, setDiscount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDetails, setPaymentDetails] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string>('');
  const [referenceId, setReferenceId] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Pending Balance shown at the top of the form — Step 2: must come from
  // backend data, never be hardcoded. Seeded with the parent's last-loaded
  // value, then replaced by a fresh re-fetch as soon as the modal opens so
  // it reflects anything written since the tab last loaded (Step 9: the
  // frontend must not be the authoritative source).
  const [pendingSummary, setPendingSummary] = useState<PaymentSummary | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const summary = await getAuthoritativePendingBalance(user);
        if (!cancelled) setPendingSummary(summary);
      } catch {
        // Leave pendingSummary null — the UI falls back to initialPendingHint.
      } finally {
        if (!cancelled) setLoadingBalance(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const currentPendingBalance = pendingSummary ? pendingSummary.pending : initialPendingHint;

  // Transaction-type dropdown re-uses the same option list as the filter
  // panel, but without the "All Types" blank entry — an actual record must
  // have a concrete type.
  const typeOptions = getTransactionTypes(t).filter((o) => o.value !== '');
  const statusOptions = getPaymentStatuses(t).filter((o) => o.value !== '');
  const methodOptions = getTransactionPaymentMethods(t).filter((o) => o.value !== '');
  const methodFieldMap = useMemo(() => getTransactionPaymentFields(t), [t]);
  const activeMethodFields = paymentMethod ? methodFieldMap[paymentMethod] || [] : [];

  const isDiscountType = transactionType === 'DISCOUNT';
  const isRefundType = transactionType === 'REFUND';
  // "Payment-like" types are the ones that reduce the pending balance —
  // matches summarizePayments' own totalPaid rule (everything except
  // Discount and Refund).
  const isPaymentLikeType = !!transactionType && !isDiscountType && !isRefundType;

  const amountNum = Number(amount);
  const willOverpay =
    isPaymentLikeType &&
    amount.trim() !== '' &&
    !isNaN(amountNum) &&
    amountNum > 0 &&
    currentPendingBalance > 0 &&
    amountNum > currentPendingBalance;
  const overpayAmount = willOverpay ? amountNum - currentPendingBalance : 0;

  const handleMethodChange = (value: string) => {
    setPaymentMethod(value);
    setPaymentDetails({}); // fields differ per method — stale values from a previous method shouldn't carry over
  };

  const handleSave = async () => {
    const nextErrors: Record<string, string> = {};
    if (!transactionType) nextErrors.transactionType = t('paymentHistory.addForm.err.typeRequired');
    if (!status) nextErrors.status = t('paymentHistory.addForm.err.statusRequired');
    if (!amount.trim() || isNaN(amountNum) || amountNum <= 0) nextErrors.amount = t('paymentHistory.addForm.err.amountRequired');

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      // Re-check the pending balance immediately before writing — Step 9:
      // the value shown when the form opened may already be stale by the
      // time the admin hits Save (another admin session, or the mobile app,
      // could have written a transaction in between). If it moved, stop and
      // let the admin see the updated figure rather than saving against a
      // number that's already wrong.
      try {
        const freshSummary = await getAuthoritativePendingBalance(user);
        if (Math.abs(freshSummary.pending - currentPendingBalance) > 0.005) {
          setPendingSummary(freshSummary);
          showToast(t('paymentHistory.addForm.staleBalanceError'), 'error');
          setSaving(false);
          return;
        }
      } catch {
        // Couldn't re-verify — proceed with the last known value rather than blocking the save entirely.
      }

      const cleanedDetails = Object.fromEntries(Object.entries(paymentDetails).filter(([, v]) => v.trim() !== ''));

      await saveTransaction(user, {
        transactionType: transactionType as TransactionType,
        description: description.trim() || undefined,
        amount: amountNum,
        discount: discount.trim() ? Number(discount) : undefined,
        paidAmount: paidAmount.trim()
          ? Number(paidAmount)
          : isDiscountType || isRefundType
          ? undefined
          : amountNum - (discount.trim() ? Number(discount) : 0),
        paymentMethod: paymentMethod || undefined,
        paymentDetails: Object.keys(cleanedDetails).length > 0 ? cleanedDetails : undefined,
        status: status as PaymentStatus,
        referenceId: referenceId.trim() || undefined,
        note: note.trim() || undefined,
        createdBy: admin?.name || admin?.email || admin?.id || 'admin',
      });
      // Overpayment (Step 5) is never shown as a negative Pending Balance —
      // summarizePayments already turns any excess into creditBalance on the
      // next load, so there's nothing extra to compute or store here beyond
      // the transaction itself.
      showToast(t('paymentHistory.addForm.saved'), 'success');
      await onSaved();
    } catch (e: any) {
      showToast(e?.message || t('paymentHistory.addForm.saveFailed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={saving ? undefined : onClose} />
      <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto thin-scroll p-6 rise-in">
        <button
          onClick={onClose}
          disabled={saving}
          className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center text-ink-400 hover:bg-ink-900/5"
        >
          <X size={16} />
        </button>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-signal-500/10 text-signal-600">
          <Plus size={20} />
        </div>
        <h3 className="font-display font-extrabold text-base text-ink-900 mb-1.5">{t('paymentHistory.addForm.title')}</h3>
        <p className="text-xs text-ink-500 mb-4">{t('paymentHistory.addForm.subtitle')}</p>

        {/* Pending Balance — Step 2: dynamically loaded from backend data, never hardcoded */}
        <div className="flex items-center justify-between gap-3 mb-5 px-4 py-3 rounded-xl bg-pending-500/10 border border-pending-500/20">
          <span className="text-xs font-semibold text-ink-600">{t('paymentHistory.addForm.currentPendingBalance')}</span>
          {loadingBalance && !pendingSummary ? (
            <span className="text-xs font-semibold text-ink-400">{t('paymentHistory.addForm.checkingBalance')}</span>
          ) : (
            <span className="font-mono text-base font-bold text-pending-500 tabular-nums">{fmtMoney(currentPendingBalance)}</span>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-x-4 gap-y-5">
          <div className="sm:col-span-2">
            <FloatingSelect
              label={t('paymentHistory.addForm.type')}
              icon={Tag}
              value={transactionType}
              onChange={setTransactionType}
              options={typeOptions}
              required
              error={errors.transactionType}
            />
          </div>
          <div className="sm:col-span-2">
            <FloatingInput label={t('paymentHistory.addForm.description')} icon={FileText} value={description} onChange={setDescription} />
          </div>
          <div>
            <FloatingInput
              label={t('paymentHistory.addForm.amount')}
              icon={Wallet}
              type="number"
              mono
              required
              value={amount}
              onChange={setAmount}
              error={errors.amount}
            />
            {willOverpay && (
              <p className="mt-1.5 text-[11px] font-semibold text-pending-500 flex items-start gap-1">
                <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                {t('paymentHistory.addForm.overpayHint', { amount: fmtMoney(overpayAmount) })}
              </p>
            )}
          </div>
          <FloatingInput label={t('paymentHistory.addForm.discount')} icon={BadgePercent} type="number" mono value={discount} onChange={setDiscount} />
          {!isDiscountType && (
            <FloatingInput
              label={t('paymentHistory.addForm.paidAmount')}
              icon={Banknote}
              type="number"
              mono
              value={paidAmount}
              onChange={setPaidAmount}
            />
          )}
          <FloatingSelect
            label={t('paymentHistory.addForm.status')}
            icon={ListFilter}
            value={status}
            onChange={setStatus}
            options={statusOptions}
            required
            error={errors.status}
          />
          {!isDiscountType && (
            <FloatingSelect
              label={t('paymentHistory.table.paymentMethod')}
              icon={CreditCard}
              value={paymentMethod}
              onChange={handleMethodChange}
              options={methodOptions}
            />
          )}
          {/* Dynamic Payment Method fields — Step 4: only the fields relevant
              to the selected method are shown; adding a new method later is
              purely a config change in getTransactionPaymentFields. */}
          {activeMethodFields.map((field) =>
            field.type === 'select' ? (
              <FloatingSelect
                key={field.key}
                label={field.label}
                icon={FIELD_ICONS[field.key] || Tag}
                value={paymentDetails[field.key] || ''}
                onChange={(v) => setPaymentDetails((d) => ({ ...d, [field.key]: v }))}
                options={field.options || []}
              />
            ) : (
              <FloatingInput
                key={field.key}
                label={field.label}
                icon={FIELD_ICONS[field.key] || Tag}
                type={field.type === 'date' ? 'date' : 'text'}
                value={paymentDetails[field.key] || ''}
                onChange={(v) => setPaymentDetails((d) => ({ ...d, [field.key]: v }))}
              />
            )
          )}
          <FloatingInput label={t('paymentHistory.addForm.reference')} icon={Landmark} value={referenceId} onChange={setReferenceId} />
          <div className="sm:col-span-2">
            <FloatingInput label={t('paymentHistory.addForm.note')} icon={StickyNote} value={note} onChange={setNote} />
          </div>
        </div>

        <div className="flex gap-2.5 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 h-11 rounded-xl border border-ink-900/12 font-bold text-sm text-ink-600 hover:bg-ink-900/5"
          >
            {t('paymentHistory.addForm.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-11 rounded-xl bg-signal-500 hover:bg-signal-600 text-white font-bold text-sm disabled:opacity-60"
          >
            {saving ? t('paymentHistory.addForm.saving') : t('paymentHistory.addForm.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentHistoryTab;
