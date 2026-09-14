import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  APP_MODULES,
  MODULE_ICONS,
  DEFAULT_MODULE_ICON,
  moduleLabel,
  isModuleAllowed,
  toggleModule,
} from '../utils/permissionModules';

interface PermissionState {
  permissions: string[];
  deniedPermissions: string[];
}

interface Props extends PermissionState {
  onChange: (next: PermissionState) => void;
}

/**
 * The Access Permission step's icon grid — one selectable card per mobile
 * app module. Reuses the exact same isModuleAllowed/toggleModule logic the
 * UserDetail "Permissions" tab already uses on existing users, so a module
 * picked here has the identical real effect once the account is created,
 * not just a cosmetic checkbox.
 *
 * Layout: 2 columns on mobile (no horizontal overflow — CSS grid wraps
 * rows automatically), 4 columns from the md breakpoint up. Row count
 * isn't fixed at 4; with 23 modules today it naturally wraps to 6 rows on
 * desktop, and however many more a future module list needs — "4 columns"
 * is the fixed part, "rows" is whatever the content requires.
 */
const PermissionGrid: React.FC<Props> = ({ permissions, deniedPermissions, onChange }) => {
  const { t } = useLanguage();
  const selectedCount = APP_MODULES.filter((m) => isModuleAllowed(m.id, permissions, deniedPermissions)).length;

  return (
    <div>
      <p className="text-xs text-ink-400 leading-relaxed mb-3">{t('newUserForm.permissionsHint')}</p>
      <p className="text-xs font-bold text-signal-600 mb-4">
        {t('newUserForm.permissionsSelectedCount', { count: selectedCount, total: APP_MODULES.length })}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {APP_MODULES.map((m) => {
          const Icon = MODULE_ICONS[m.id] || DEFAULT_MODULE_ICON;
          const allowed = isModuleAllowed(m.id, permissions, deniedPermissions);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(toggleModule(m.id, !allowed, permissions, deniedPermissions))}
              aria-pressed={allowed}
              className={`flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-2xl border-2 text-center transition-colors ${
                allowed
                  ? 'border-signal-500 bg-signal-500/10'
                  : 'border-ink-900/10 bg-surface hover:bg-ink-900/5'
              }`}
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

export default PermissionGrid;
