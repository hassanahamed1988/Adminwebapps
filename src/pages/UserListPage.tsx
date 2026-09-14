import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Users } from 'lucide-react';
import Topbar from '../components/Topbar';
import SearchInput from '../components/SearchInput';
import UserListCard from '../components/UserListCard';
import { useUsers } from '../contexts/UsersContext';
import { useLanguage } from '../contexts/LanguageContext';
import { isExpired } from '../utils/dateUtils';
import { AccountBucket, User } from '../types';

const TITLE_KEYS: Record<AccountBucket, { title: string; empty: string; placeholder: string }> = {
  PENDING: { title: 'nav.pending', empty: 'userList.noPending', placeholder: 'userList.searchPending' },
  ACTIVE: { title: 'nav.active', empty: 'userList.noActive', placeholder: 'userList.searchActive' },
  INACTIVE: { title: 'nav.inactive', empty: 'userList.noInactive', placeholder: 'userList.searchInactive' },
  BLOCKED: { title: 'nav.blocked', empty: 'userList.noBlocked', placeholder: 'userList.searchBlocked' },
};

function matchesBucket(u: User, bucket: AccountBucket): boolean {
  if (u.role === 'ADMIN') return false;
  switch (bucket) {
    case 'PENDING':
      return u.status === 'PENDING';
    case 'ACTIVE':
      return u.status === 'ENABLED' && !isExpired(u.expiryDate);
    case 'INACTIVE':
      // Manually disabled accounts always land here, regardless of
      // subscription expiry — and an ENABLED account whose subscription
      // has lapsed is effectively inactive too, so it's included as well.
      return u.status === 'DISABLED' || (u.status === 'ENABLED' && isExpired(u.expiryDate));
    case 'BLOCKED':
      return u.status === 'BLOCKED';
    default:
      return false;
  }
}

const UserListPage: React.FC<{ bucket: AccountBucket }> = ({ bucket }) => {
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();
  const { users, loading, refresh } = useUsers();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const metaKeys = TITLE_KEYS[bucket];

  const list = useMemo(() => {
    const base = users.filter((u) => matchesBucket(u, bucket));
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (u) =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.id || '').toLowerCase().includes(q) ||
        (u.userId || '').toLowerCase().includes(q) ||
        (u.mobile || u.mobileNumber || '').toLowerCase().includes(q)
    );
  }, [users, bucket, search]);

  return (
    <div>
      <Topbar title={t(metaKeys.title)} subtitle={t('userList.count', { count: list.length })} onMenuClick={openMobileNav} onRefresh={refresh} refreshing={loading} />

      <div className="px-4 md:px-8 py-6 max-w-4xl">
        <div className="mb-5 max-w-md">
          <SearchInput value={search} onChange={setSearch} placeholder={t(metaKeys.placeholder)} />
        </div>

        {loading && users.length === 0 ? (
          <div className="text-center py-14 text-ink-400 text-sm font-mono">{t('common.loading')}</div>
        ) : list.length === 0 ? (
          <div className="bg-surface rounded-2xl border border-dashed border-ink-900/12 py-14 flex flex-col items-center text-ink-400">
            <Users size={32} className="mb-2 opacity-50" />
            <p className="text-sm font-semibold">{search ? t('userList.noResults') : t(metaKeys.empty)}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {list.map((u) => (
              <UserListCard key={u.id} user={u} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserListPage;
