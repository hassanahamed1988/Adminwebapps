import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Phone, Mail } from 'lucide-react';
import { User } from '../types';
import { useUsers } from '../contexts/UsersContext';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';
import StatusBadge from './StatusBadge';
import ToggleSwitch from './ToggleSwitch';

interface Props {
  user: User;
}

const UserListCard: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const { enableUser, disableUser } = useUsers();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [toggling, setToggling] = useState(false);

  // The active/inactive switch only makes sense for accounts that are
  // already approved. PENDING needs the approve-with-password flow and
  // BLOCKED needs an explicit unblock, so the switch stays disabled there.
  const switchEditable = user.status === 'ENABLED' || user.status === 'DISABLED';
  const isActive = user.status === 'ENABLED';

  const handleToggle = async () => {
    setToggling(true);
    try {
      if (isActive) {
        await disableUser(user.id);
        showToast(t('userCard.deactivated'), 'success');
      } else {
        await enableUser(user.id);
        showToast(t('userCard.activated'), 'success');
      }
    } catch (e: any) {
      showToast(e?.message || t('userCard.statusChangeFailed'), 'error');
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="bg-surface rounded-2xl border border-ink-900/8 card-shadow overflow-hidden hover:border-signal-500/40 hover:shadow-md transition-all">
      {/* Horizontally scrollable row: on narrow/mobile frames the row can be
          wider than the viewport, so it scrolls left/right with a finger
          swipe instead of wrapping or clipping the columns. Scrollbar is
          hidden (no-scrollbar) — swipe still works, just no visible bar. */}
      <div className="overflow-x-auto no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="flex items-center gap-4 p-4 min-w-[700px]">
          <button
            onClick={() => navigate(`/user/${encodeURIComponent(user.id)}`)}
            className="flex items-center gap-3 min-w-[220px] flex-1 text-left group"
          >
            <div className="w-11 h-11 rounded-full bg-signal-500/10 text-signal-600 flex items-center justify-center font-display font-bold text-sm shrink-0">
              {(user.name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-ink-900 truncate group-hover:text-signal-600">
                  {user.name || t('userCard.noName')}
                </h3>
                <span className="font-mono text-[10px] text-ink-400 bg-ink-900/5 px-1.5 py-0.5 rounded shrink-0">
                  {user.role}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-ink-400 font-medium">
                {user.email && (
                  <span className="flex items-center gap-1 truncate">
                    <Mail size={11} /> {user.email}
                  </span>
                )}
                {(user.mobile || user.mobileNumber) && (
                  <span className="flex items-center gap-1 shrink-0">
                    <Phone size={11} /> {user.mobile || user.mobileNumber}
                  </span>
                )}
              </div>
            </div>
          </button>

          <div className="shrink-0 w-[110px]">
            <StatusBadge user={user} />
          </div>

          <div
            className="shrink-0 flex items-center gap-2 w-[70px]"
            title={switchEditable ? undefined : t('userCard.notApplicable')}
          >
            <ToggleSwitch
              checked={isActive}
              onChange={handleToggle}
              disabled={!switchEditable}
              loading={toggling}
              title={isActive ? t('userCard.activeTapToDisable') : t('userCard.inactiveTapToEnable')}
            />
          </div>

          <div className="shrink-0 flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/user/${encodeURIComponent(user.id)}`);
              }}
              title={t('userCard.view')}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-400 hover:text-signal-600 hover:bg-signal-500/10 transition-colors"
            >
              <Eye size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/user/${encodeURIComponent(user.id)}?edit=1`);
              }}
              title={t('userCard.edit')}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-400 hover:text-signal-600 hover:bg-signal-500/10 transition-colors"
            >
              <Pencil size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserListCard;
