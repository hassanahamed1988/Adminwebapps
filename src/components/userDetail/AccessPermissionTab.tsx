import React, { useState } from 'react';
import { useUsers } from '../../contexts/UsersContext';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { User } from '../../types';
import {
  APP_MODULES,
  MODULE_ICONS,
  DEFAULT_MODULE_ICON,
  moduleLabel,
  isModuleAllowed,
  toggleModule,
} from '../../utils/permissionModules';

interface Props {
  user: User;
}

const AccessPermissionTab: React.FC<Props> = ({ user }) => {
  const { updateUser } = useUsers();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [busyId, setBusyId] = useState<string | null>(null);

  const allowedCount = APP_MODULES.filter((m) =>
    isModuleAllowed(m.id, user.permissions, user.deniedPermissions)
  ).length;

  const handleToggle = async (moduleId: string, nextAllowed: boolean) => {
    setBusyId(moduleId);
    try {
      const { permissions, deniedPermissions } = toggleModule(
        moduleId,
        nextAllowed,
        user.permissions,
        user.deniedPermissions
      );
      await updateUser({ ...user, permissions, deniedPermissions });
      showToast(
        nextAllowed ? t('permissions.moduleAllowed') : t('permissions.moduleDenied'),
        'success'
      );
    } catch (e: any) {
      showToast(e?.message || t('userDetail.actionFailed'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="rise-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-extrabold text-sm text-ink-900">{t('permissions.title')}</h3>
          <p className="text-xs text-ink-500 mt-0.5">{t('permissions.subtitle')}</p>
        </div>
        <span className="shrink-0 text-[11px] font-bold text-signal-600 bg-signal-500/10 px-2.5 py-1 rounded-full">
          {allowedCount}/{APP_MODULES.length}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {APP_MODULES.map((m) => {
          const Icon = MODULE_ICONS[m.id] || DEFAULT_MODULE_ICON;
          const allowed = isModuleAllowed(m.id, user.permissions, user.deniedPermissions);
          const busy = busyId === m.id;
          return (
            <button
              key={m.id}
              type="button"
              disabled={busy}
              onClick={() => handleToggle(m.id, !allowed)}
              aria-pressed={allowed}
              className={`flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-2xl border-2 text-center transition-colors ${
                allowed
                  ? 'border-signal-500 bg-signal-500/10'
                  : 'border-ink-900/10 bg-surface hover:bg-ink-900/5'
              } ${busy ? 'opacity-60' : ''}`}
            >
              <span
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                  allowed ? 'bg-signal-500 text-white' : 'bg-ink-900/5 text-ink-400'
                }`}
              >
                <Icon size={20} />
              </span>
              <span className={`text-[11px] font-bold leading-tight ${allowed ? 'text-signal-600' : 'text-ink-600'}`}>
                {moduleLabel(t, m.id)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AccessPermissionTab;
