import React, { useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Clock3, UserCheck, UserX, Ban, Users } from 'lucide-react';
import Topbar from '../components/Topbar';
import StatCard from '../components/StatCard';
import UserListCard from '../components/UserListCard';
import { useUsers } from '../contexts/UsersContext';
import { useLanguage } from '../contexts/LanguageContext';
import { isExpired } from '../utils/dateUtils';

const Dashboard: React.FC = () => {
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();
  const { users, loading, error, refresh } = useUsers();
  const { t } = useLanguage();

  const buckets = useMemo(() => {
    const nonAdmin = users.filter((u) => u.role !== 'ADMIN');
    const pending = nonAdmin.filter((u) => u.status === 'PENDING');
    const active = nonAdmin.filter((u) => u.status === 'ENABLED' && !isExpired(u.expiryDate));
    const inactive = nonAdmin.filter((u) => u.status === 'DISABLED' || (u.status === 'ENABLED' && isExpired(u.expiryDate)));
    const blocked = nonAdmin.filter((u) => u.status === 'BLOCKED');
    return { pending, active, inactive, blocked, total: nonAdmin.length };
  }, [users]);

  return (
    <div>
      <Topbar
        title={t('nav.dashboard')}
        subtitle={t('dashboard.totalUsers', { count: buckets.total })}
        onMenuClick={openMobileNav}
        onRefresh={refresh}
        refreshing={loading}
      />

      <div className="px-4 md:px-8 py-6 max-w-6xl @container">
        {error && (
          <div className="mb-5 bg-blocked-500/10 border border-blocked-500/25 text-rose-700 text-sm font-semibold rounded-xl px-4 py-3">
            {t(error)}
          </div>
        )}

        <h2 className="font-display font-extrabold text-sm text-ink-900 mb-4">{t('dashboard.overview')}</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          <StatCard to="/pending" label={t('nav.pending')} value={buckets.pending.length} icon={Clock3} tone="pending" live />
          <StatCard to="/active" label={t('nav.active')} value={buckets.active.length} icon={UserCheck} tone="active" />
          <StatCard to="/inactive" label={t('dashboard.inactiveExpired')} value={buckets.inactive.length} icon={UserX} tone="signal" />
          <StatCard to="/blocked" label={t('nav.blocked')} value={buckets.blocked.length} icon={Ban} tone="blocked" />
        </div>

        <div className="flex items-center justify-between mb-3.5">
          <h2 className="font-display font-extrabold text-sm text-ink-900 flex items-center gap-2">
            <Clock3 size={16} className="text-pending-500" />
            {t('dashboard.recentPending')}
          </h2>
          {buckets.pending.length > 0 && (
            <Link to="/pending" className="text-xs font-bold text-signal-600 hover:underline">
              {t('dashboard.seeAll')}
            </Link>
          )}
        </div>

        {loading && users.length === 0 ? (
          <div className="text-center py-14 text-ink-400 text-sm font-mono">{t('common.loading')}</div>
        ) : buckets.pending.length === 0 ? (
          <div className="bg-surface rounded-2xl border border-dashed border-ink-900/12 py-12 flex flex-col items-center text-ink-400">
            <Users size={30} className="mb-2 opacity-50" />
            <p className="text-sm font-semibold">{t('dashboard.noPendingRequests')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {buckets.pending.slice(0, 5).map((u) => (
              <UserListCard key={u.id} user={u} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
