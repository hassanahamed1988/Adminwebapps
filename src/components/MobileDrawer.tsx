import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutGrid, UserCheck, UserX, Ban, Clock3, LogOut, X, UserPlus, UserCog, ListChecks, Server, Settings as SettingsIcon, Briefcase } from 'lucide-react';
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
  open: boolean;
  onClose: () => void;
}

const MobileDrawer: React.FC<Props> = ({ open, onClose }) => {
  const { admin, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm sheet-backdrop-in" onClick={onClose} />

      <div className="absolute left-0 top-0 bottom-0 w-72 bg-rail-bg text-rail-ink flex flex-col drawer-slide-in shadow-2xl border-r border-rail-border">
        <div className="flex items-center justify-between px-5 py-5 border-b border-rail-border">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="FleetPro" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-display font-extrabold text-sm">FleetPro Admin</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-rail-hover">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item, i) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors drawer-item-in ${
                  isActive ? 'bg-signal-500 text-white' : 'text-rail-ink-muted hover:bg-rail-hover'
                }`
              }
              style={{ animationDelay: `${80 + i * 30}ms` }}
            >
              <item.icon size={18} />
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 pb-5 pt-3 border-t border-rail-border">
          <p className="px-2.5 pb-2 text-xs font-bold text-rail-ink">{admin?.name}</p>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-rail-ink-muted hover:bg-blocked-500/10 hover:text-blocked-500"
          >
            <LogOut size={18} />
            {t('sidebar.logout')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileDrawer;
