import React from 'react';
import { User } from '../types';
import { isExpired } from '../utils/dateUtils';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  user: Pick<User, 'status' | 'expiryDate'>;
}

const StatusBadge: React.FC<Props> = ({ user }) => {
  const { t } = useLanguage();
  const expired = user.status === 'ENABLED' && isExpired(user.expiryDate);

  let label = t('status.inactive');
  let cls = 'bg-ink-400/10 text-ink-600 border-ink-400/20';
  let dot = false;

  if (user.status === 'PENDING') {
    label = t('status.pending');
    cls = 'bg-pending-500/10 text-pending-500 border-pending-500/25';
  } else if (user.status === 'BLOCKED') {
    label = t('status.blocked');
    cls = 'bg-blocked-500/10 text-blocked-500 border-blocked-500/25';
  } else if (user.status === 'ENABLED' && expired) {
    label = t('status.expired');
    cls = 'bg-pending-500/10 text-pending-500 border-pending-500/25';
  } else if (user.status === 'ENABLED') {
    label = t('status.active');
    cls = 'bg-active-500/10 text-active-500 border-active-500/25';
    dot = true;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wide ${cls}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current pulse-dot" />}
      {label}
    </span>
  );
};

export default StatusBadge;
