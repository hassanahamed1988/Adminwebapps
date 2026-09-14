import React, { useEffect, useState } from 'react';
import { History, CheckCircle2, XCircle, Ban } from 'lucide-react';
import { getSubcollection } from '../../services/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { collectionFor } from '../../contexts/UsersContext';
import { formatDateTime } from '../../utils/dateUtils';
import { User } from '../../types';

interface LoginRecord {
  id: string;
  loginAt?: string;
  deviceName?: string;
  deviceId?: string;
  ip?: string;
  location?: string;
  browserOrApp?: string;
  status?: 'SUCCESS' | 'FAILED' | 'BLOCKED';
  logoutAt?: string;
}

interface Props {
  user: User;
}

const STATUS_STYLE: Record<string, { icon: typeof CheckCircle2; cls: string }> = {
  SUCCESS: { icon: CheckCircle2, cls: 'text-active-500 bg-active-500/10' },
  FAILED: { icon: XCircle, cls: 'text-pending-500 bg-pending-500/10' },
  BLOCKED: { icon: Ban, cls: 'text-blocked-500 bg-blocked-500/10' },
};

const LoginHistoryTab: React.FC<Props> = ({ user }) => {
  const { t } = useLanguage();
  const [records, setRecords] = useState<LoginRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const subPath = `${collectionFor(user)}/${user.id}/loginHistory`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSubcollection(subPath)
      .then((docs) => {
        if (cancelled) return;
        const sorted = (docs as LoginRecord[]).sort((a, b) =>
          (b.loginAt || '').localeCompare(a.loginAt || '')
        );
        setRecords(sorted);
      })
      .catch(() => {
        if (!cancelled) setRecords([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  return (
    <div className="rise-in">
      <h3 className="font-display font-extrabold text-sm text-ink-900 mb-1">{t('loginHistory.title')}</h3>
      <p className="text-xs text-ink-500 mb-4">{t('loginHistory.subtitle')}</p>

      {loading ? (
        <div className="text-center py-10 text-ink-400 text-sm font-mono">{t('common.loading')}</div>
      ) : records.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-dashed border-ink-900/15 p-8 text-center">
          <History size={22} className="mx-auto text-ink-400 mb-2.5" />
          <p className="text-sm font-semibold text-ink-600">{t('loginHistory.empty')}</p>
          <p className="text-xs text-ink-400 mt-1 max-w-sm mx-auto">{t('loginHistory.emptyHint')}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {records.map((r) => {
            const style = STATUS_STYLE[r.status || 'SUCCESS'] || STATUS_STYLE.SUCCESS;
            const StatusIcon = style.icon;
            return (
              <div
                key={r.id}
                className="bg-surface rounded-2xl border border-ink-900/8 card-shadow p-4 flex items-start gap-3.5"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${style.cls}`}>
                  <StatusIcon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-bold text-ink-900">{r.loginAt ? formatDateTime(r.loginAt) : '—'}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${style.cls}`}>
                      {t(`loginHistory.status.${(r.status || 'SUCCESS').toLowerCase()}`)}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-400 font-mono truncate mt-0.5">
                    {[r.deviceName, r.browserOrApp, r.ip].filter(Boolean).join(' · ')}
                  </p>
                  {r.location && <p className="text-[11px] text-ink-400 mt-0.5">{r.location}</p>}
                  {r.logoutAt && (
                    <p className="text-[11px] text-ink-400 mt-0.5">
                      {t('loginHistory.loggedOutAt')}: {formatDateTime(r.logoutAt)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LoginHistoryTab;
