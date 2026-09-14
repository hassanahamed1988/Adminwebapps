import React, { useState } from 'react';
import { KeyRound, ShieldCheck, ShieldX, Ban, Unlock, Trash2, Info } from 'lucide-react';
import FloatingInput from '../FloatingInput';
import { useUsers } from '../../contexts/UsersContext';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatDateTime } from '../../utils/dateUtils';
import { User } from '../../types';

interface Props {
  user: User;
  onRequestConfirm: (kind: 'disable' | 'block' | 'unblock' | 'delete') => void;
  onEnable: () => void;
  actionLoading: boolean;
}

const SecurityTab: React.FC<Props> = ({ user, onRequestConfirm, onEnable, actionLoading }) => {
  const { resetPassword } = useUsers();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleReset = async () => {
    setError('');
    if (!newPassword || newPassword.length < 4) {
      setError(t('security.err.minLength'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('security.err.mismatch'));
      return;
    }
    setSaving(true);
    try {
      await resetPassword(user.id, newPassword);
      showToast(t('security.passwordReset'), 'success');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      showToast(e?.message || t('userDetail.actionFailed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rise-in space-y-5">
      {/* Password reset */}
      <div className="bg-surface rounded-2xl border border-ink-900/8 card-shadow p-5">
        <h3 className="font-display font-extrabold text-sm text-ink-900 mb-1">{t('security.resetPassword')}</h3>
        <p className="text-xs text-ink-500 mb-4">{t('security.resetPasswordHint')}</p>

        <div className="grid sm:grid-cols-2 gap-4">
          <FloatingInput
            label={t('security.newPassword')}
            icon={KeyRound}
            mono
            value={newPassword}
            onChange={(v) => {
              setNewPassword(v);
              setError('');
            }}
          />
          <FloatingInput
            label={t('security.confirmPassword')}
            icon={KeyRound}
            mono
            value={confirmPassword}
            onChange={(v) => {
              setConfirmPassword(v);
              setError('');
            }}
            error={error}
          />
        </div>

        <button
          onClick={handleReset}
          disabled={saving}
          className="mt-4 h-11 px-5 rounded-xl bg-signal-500 hover:bg-signal-600 text-white font-bold text-sm disabled:opacity-60"
        >
          {saving ? t('common.saving') : t('security.resetPassword')}
        </button>

        {user.passwordChangedAt && (
          <p className="text-[11px] text-ink-400 mt-3">
            {t('security.lastChanged')}: {formatDateTime(user.passwordChangedAt)}
          </p>
        )}

        <div className="flex items-start gap-2 mt-4 pt-4 border-t border-ink-900/8 text-[11px] text-ink-400 leading-relaxed">
          <Info size={13} className="shrink-0 mt-0.5" />
          <p>{t('security.sessionNote')}</p>
        </div>
      </div>

      {/* Account control */}
      {user.status !== 'PENDING' && (
        <div className="bg-surface rounded-2xl border border-ink-900/8 card-shadow p-5">
          <h3 className="font-display font-extrabold text-sm text-ink-900 mb-4">{t('userDetail.accountControl')}</h3>
          <div className="flex flex-wrap gap-2.5">
            {user.status === 'ENABLED' && (
              <button
                onClick={() => onRequestConfirm('disable')}
                className="h-11 px-4 rounded-xl border border-ink-900/12 text-ink-600 hover:bg-ink-900/5 font-bold text-sm flex items-center gap-2"
              >
                <ShieldX size={16} /> {t('userDetail.confirmDeactivate.action')}
              </button>
            )}
            {user.status === 'DISABLED' && (
              <button
                onClick={onEnable}
                disabled={actionLoading}
                className="h-11 px-4 rounded-xl bg-active-500 hover:bg-emerald-600 text-white font-bold text-sm flex items-center gap-2 disabled:opacity-60"
              >
                <ShieldCheck size={16} /> {t('userDetail.activate')}
              </button>
            )}
            {user.status === 'BLOCKED' ? (
              <button
                onClick={() => onRequestConfirm('unblock')}
                className="h-11 px-4 rounded-xl bg-active-500 hover:bg-emerald-600 text-white font-bold text-sm flex items-center gap-2"
              >
                <Unlock size={16} /> {t('userDetail.unblock')}
              </button>
            ) : (
              <button
                onClick={() => onRequestConfirm('block')}
                className="h-11 px-4 rounded-xl border border-blocked-500/30 text-blocked-500 hover:bg-blocked-500/5 font-bold text-sm flex items-center gap-2"
              >
                <Ban size={16} /> {t('userDetail.block')}
              </button>
            )}
            <button
              onClick={() => onRequestConfirm('delete')}
              className="h-11 px-4 rounded-xl border border-blocked-500/30 text-blocked-500 hover:bg-blocked-500/5 font-bold text-sm flex items-center gap-2 ml-auto"
            >
              <Trash2 size={16} /> {t('userDetail.deletePermanently')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityTab;
