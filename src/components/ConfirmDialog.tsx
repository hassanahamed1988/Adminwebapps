import React, { useState } from 'react';
import { AlertTriangle, X, Type } from 'lucide-react';
import FloatingInput from './FloatingInput';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  /** if provided, the user must type this exact text before confirming (used for delete) */
  requireText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<Props> = ({
  open,
  title,
  message,
  confirmLabel,
  danger,
  requireText,
  loading,
  onConfirm,
  onCancel,
}) => {
  const { t } = useLanguage();
  const [typed, setTyped] = useState('');

  if (!open) return null;

  const resolvedConfirmLabel = confirmLabel ?? t('confirmDialog.confirm');

  const disabled = loading || (!!requireText && typed.trim() !== requireText);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={loading ? undefined : onCancel} />
      <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 rise-in">
        <button
          onClick={onCancel}
          disabled={loading}
          className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center text-ink-400 hover:bg-ink-900/5"
        >
          <X size={16} />
        </button>
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${
            danger ? 'bg-blocked-500/10 text-blocked-500' : 'bg-signal-500/10 text-signal-600'
          }`}
        >
          <AlertTriangle size={20} />
        </div>
        <h3 className="font-display font-extrabold text-base text-ink-900 mb-1.5">{title}</h3>
        <p className="text-sm text-ink-600 leading-relaxed mb-4">{message}</p>

        {requireText && (
          <div className="mb-4">
            <p className="text-xs text-ink-400 mb-1.5">
              {t('confirmDialog.typeToConfirmPrefix')} <span className="font-mono font-bold text-ink-900">{requireText}</span> {t('confirmDialog.typeToConfirmSuffix')}
            </p>
            <FloatingInput label={requireText} icon={Type} accent="blocked" mono value={typed} onChange={setTyped} autoFocus />
          </div>
        )}

        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 h-11 rounded-xl border border-ink-900/12 font-bold text-sm text-ink-600 hover:bg-ink-900/5"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={disabled}
            className={`flex-1 h-11 rounded-xl font-bold text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed ${
              danger ? 'bg-blocked-500 hover:bg-rose-600' : 'bg-signal-500 hover:bg-signal-600'
            }`}
          >
            {loading ? '...' : resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
