import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  to: string;
  label: string;
  value: number;
  icon: LucideIcon;
  tone: 'signal' | 'active' | 'pending' | 'blocked';
  live?: boolean;
}

const TONE_CLS: Record<Props['tone'], string> = {
  signal: 'bg-signal-500/10 text-signal-600 border-signal-500/20',
  active: 'bg-active-500/10 text-active-500 border-active-500/20',
  pending: 'bg-pending-500/10 text-pending-500 border-pending-500/20',
  blocked: 'bg-blocked-500/10 text-blocked-500 border-blocked-500/20',
};

const StatCard: React.FC<Props> = ({ to, label, value, icon: Icon, tone, live }) => {
  const { t } = useLanguage();
  return (
    <Link
      to={to}
      className="group bg-surface rounded-2xl border border-ink-900/8 card-shadow p-4 md:p-5 flex flex-col gap-3 md:gap-4 hover:border-signal-500/40 hover:shadow-lg hover:shadow-signal-500/5 transition-all"
    >
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${TONE_CLS[tone]}`}>
          <Icon size={19} />
        </div>
        {live && value > 0 && (
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-active-500">
            <span className="w-1.5 h-1.5 rounded-full bg-active-500 pulse-dot" />
            {t('statCard.live')}
          </span>
        )}
      </div>
      <div>
        <p className="font-mono text-3xl font-bold text-ink-900 tabular-nums">{value}</p>
        <p className="text-xs font-semibold text-ink-400 mt-1">{label}</p>
      </div>
    </Link>
  );
};

export default StatCard;
