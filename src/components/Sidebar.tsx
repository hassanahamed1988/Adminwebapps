import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutGrid, UserCheck, UserX, Ban, Clock3, LogOut, UserPlus, UserCog, ListChecks, Server, Settings as SettingsIcon, Menu, Briefcase } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import logo from '../assets/logo.png';

const NAV_ITEMS = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutGrid, end: true },
  { to: '/new-account', labelKey: 'nav.newAccount', icon: UserPlus },
  { to: '/new-admin', labelKey: 'nav.newAdmin', icon: UserCog },
  { to: '/pending', labelKey: 'nav.pending', icon: Clock3 },
  { to: '/active', labelKey: 'nav.active', icon: UserCheck },
  { to: '/inactive', labelKey: 'nav.inactive', icon: UserX },
  { to: '/blocked', labelKey: 'nav.blocked', icon: Ban },
  { to: '/purchase-manager', labelKey: 'nav.purchaseManager', icon: Briefcase },
  { to: '/dropdown-settings', labelKey: 'nav.dropdownSettings', icon: ListChecks },
  { to: '/server-settings', labelKey: 'nav.serverSettings', icon: Server },
  { to: '/settings', labelKey: 'nav.settings', icon: SettingsIcon },
];

interface Props {
  /** When true, the rail collapses to icons-only (no labels) — the sidebar
   *  itself always stays visible/mounted on desktop; only its width and
   *  label visibility change. Reopening happens from the same menu icon
   *  in Topbar (kept in sync via the `collapsed` state in Layout). */
  collapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<Props> = ({ collapsed, onToggle }) => {
  const { admin, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <aside
      className={`hidden md:flex ${
        collapsed ? 'md:w-[68px]' : 'md:w-64'
      } shrink-0 flex-col bg-rail-bg text-rail-ink h-screen sticky top-0 border-r border-rail-border transition-all duration-200`}
    >
      <div className={`flex items-center gap-3 py-6 border-b border-rail-border ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
        <img src={logo} alt="FleetPro" className="w-9 h-9 rounded-lg object-cover shrink-0" />
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="font-display font-extrabold text-sm tracking-wide">FleetPro</p>
            <p className="text-[10px] text-rail-ink-muted font-mono uppercase tracking-widest">{t('brand.adminControl')}</p>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={onToggle}
            title={t('sidebar.collapse')}
            aria-label={t('sidebar.collapse')}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-rail-ink-muted hover:bg-rail-hover hover:text-rail-ink shrink-0"
          >
            <Menu size={16} />
          </button>
        )}
      </div>

      <nav className={`flex-1 py-5 space-y-1 thin-scroll overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={collapsed ? t(item.labelKey) : undefined}
            className={({ isActive }) =>
              `flex items-center rounded-xl text-sm font-semibold transition-colors ${
                collapsed ? 'justify-center h-11 w-11 mx-auto' : 'gap-3 px-3.5 py-2.5'
              } ${isActive ? 'bg-signal-500 text-white' : 'text-rail-ink-muted hover:bg-rail-hover hover:text-rail-ink'}`
            }
          >
            <item.icon size={18} className="shrink-0" />
            {!collapsed && t(item.labelKey)}
          </NavLink>
        ))}
      </nav>

      <div className={`pb-5 pt-3 border-t border-rail-border ${collapsed ? 'px-2' : 'px-3'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-2.5 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-signal-500/20 text-signal-500 flex items-center justify-center font-bold text-xs shrink-0">
              {(admin?.name || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">{admin?.name || 'Admin'}</p>
              <p className="text-[10px] text-rail-ink-muted font-mono uppercase truncate">{admin?.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          title={collapsed ? t('sidebar.logout') : undefined}
          className={`flex items-center rounded-xl text-sm font-semibold text-rail-ink-muted hover:bg-blocked-500/10 hover:text-blocked-500 transition-colors ${
            collapsed ? 'justify-center h-11 w-11 mx-auto' : 'w-full gap-3 px-3.5 py-2.5'
          }`}
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && t('sidebar.logout')}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
