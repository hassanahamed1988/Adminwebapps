import React from 'react';
import { Clock3, Package, Wallet, Calendar, CalendarClock, Landmark, User as UserIcon, Hash, IdCard, Banknote } from 'lucide-react';
import FloatingInput from '../FloatingInput';
import FloatingSelect from '../FloatingSelect';
import EditableFloatingSelect from '../EditableFloatingSelect';
import { useLanguage } from '../../contexts/LanguageContext';
import { User } from '../../types';
import { getDurations, getPaymentMethods, getPaymentFieldLabels, getBankNames } from '../../utils/formOptions';

type FormState = Partial<Omit<User, 'paidAmount' | 'dueAmount'>> & { paidAmount?: string; dueAmount?: string };

interface Props {
  user: User;
  editing: boolean;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}

const SubscriptionTab: React.FC<Props> = ({ user, editing, form, setForm }) => {
  const { t } = useLanguage();

  return (
    <div className="rise-in">
      {/* Subscription */}
      <div className="bg-surface rounded-2xl border border-ink-900/8 card-shadow p-5 mb-5">
        <h3 className="font-display font-extrabold text-sm text-ink-900 mb-4">{t('newUserForm.step.subscription')}</h3>
        <div className="grid sm:grid-cols-2 gap-x-4 gap-y-5">
          <EditableFloatingSelect
            label={t('newUserForm.duration')}
            icon={Clock3}
            field="duration"
            disabled={!editing}
            value={editing ? form.duration || '' : user.duration || ''}
            onChange={(v) => setForm((f) => ({ ...f, duration: v }))}
            options={getDurations(t)}
          />
          <FloatingInput label={t('newUserForm.packageName')} icon={Package} disabled={!editing} value={editing ? form.package || '' : user.package || '—'} onChange={(v) => setForm((f) => ({ ...f, package: v }))} />
          <FloatingInput label={t('userDetail.price')} icon={Wallet} disabled={!editing} value={editing ? form.price || '' : user.price || '—'} onChange={(v) => setForm((f) => ({ ...f, price: v }))} />
          <FloatingInput label={t('userDetail.activationDate')} icon={Calendar} disabled value={user.activationDate || '—'} onChange={() => {}} />
          <FloatingInput
            label={t('userDetail.expiryDate')}
            icon={CalendarClock}
            disabled={!editing}
            value={editing ? form.expiryDate || '' : user.expiryDate || 'Lifetime'}
            onChange={(v) => setForm((f) => ({ ...f, expiryDate: v }))}
          />
        </div>
      </div>

      {/* Payment */}
      <div className="bg-surface rounded-2xl border border-ink-900/8 card-shadow p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-extrabold text-sm text-ink-900">{t('userDetail.paymentInfo')}</h3>
          {(() => {
            const due = Number(user.dueAmount || 0);
            const pending = due > 0;
            return (
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                  pending ? 'text-pending-500 bg-pending-500/10' : 'text-active-500 bg-active-500/10'
                }`}
              >
                {pending ? t('userDetail.paymentStatusPending') : t('userDetail.paymentStatusPaid')}
              </span>
            );
          })()}
        </div>
        <div className="grid sm:grid-cols-2 gap-x-4 gap-y-5">
          {editing ? (
            <div className="sm:col-span-2">
              <FloatingSelect
                label={t('userDetail.paymentMethod')}
                icon={Wallet}
                value={form.paymentMethod || ''}
                onChange={(v) =>
                  setForm((f) => ({ ...f, paymentMethod: v, bankName: '', accountHolderName: '', accountOrChequeNumber: '', paidAmount: f.paidAmount }))
                }
                options={getPaymentMethods(t)}
              />
            </div>
          ) : (
            <FloatingInput label={t('userDetail.paymentMethod')} icon={Wallet} disabled value={user.paymentMethod || '—'} onChange={() => {}} />
          )}

          {(() => {
            const method = editing ? form.paymentMethod || '' : user.paymentMethod || '';
            const labels = getPaymentFieldLabels(t)[method];

            if (!editing) {
              return (
                <>
                  <FloatingInput label={t('newUserForm.bankName')} icon={Landmark} disabled value={user.bankName || '—'} onChange={() => {}} />
                  <FloatingInput label={t('userDetail.accountHolderName')} icon={UserIcon} disabled value={user.accountHolderName || '—'} onChange={() => {}} />
                  <FloatingInput label={t('userDetail.accountOrChequeNumber')} icon={Hash} disabled mono value={user.accountOrChequeNumber || '—'} onChange={() => {}} />
                  <FloatingInput
                    label={t('userDetail.paidAmount')}
                    icon={Wallet}
                    disabled
                    value={user.paidAmount !== undefined && user.paidAmount !== null ? String(user.paidAmount) : '—'}
                    onChange={() => {}}
                  />
                  <FloatingInput
                    label={t('userDetail.dueAmount')}
                    icon={Banknote}
                    disabled
                    value={user.dueAmount !== undefined && user.dueAmount !== null ? String(user.dueAmount) : '—'}
                    onChange={() => {}}
                  />
                </>
              );
            }

            return (
              <>
                {(method === 'BANK_TRANSFER' || method === 'CHEQUE') && (
                  <EditableFloatingSelect
                    label={labels?.bankName || t('newUserForm.bankName')}
                    icon={Landmark}
                    field="bankName"
                    value={form.bankName || ''}
                    onChange={(v) => setForm((f) => ({ ...f, bankName: v }))}
                    options={getBankNames(t)}
                  />
                )}
                {method === 'BANK_TRANSFER' && (
                  <FloatingInput
                    label={labels?.holderName || t('userDetail.accountHolderName')}
                    icon={UserIcon}
                    value={form.accountHolderName || ''}
                    onChange={(v) => setForm((f) => ({ ...f, accountHolderName: v }))}
                  />
                )}
                {(method === 'BANK_TRANSFER' || method === 'CHEQUE') && (
                  <FloatingInput
                    label={labels?.accountOrCheque || t('userDetail.accountOrChequeNumber')}
                    icon={method === 'CHEQUE' ? IdCard : Hash}
                    mono
                    value={form.accountOrChequeNumber || ''}
                    onChange={(v) => setForm((f) => ({ ...f, accountOrChequeNumber: v }))}
                  />
                )}
                <FloatingInput
                  label={t('userDetail.paidAmount')}
                  icon={method === 'CASH' ? Banknote : Wallet}
                  type="number"
                  mono
                  value={form.paidAmount || ''}
                  onChange={(v) => setForm((f) => ({ ...f, paidAmount: v }))}
                />
                <FloatingInput
                  label={t('userDetail.dueAmount')}
                  icon={Banknote}
                  type="number"
                  mono
                  value={form.dueAmount || ''}
                  onChange={(v) => setForm((f) => ({ ...f, dueAmount: v }))}
                />
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionTab;
