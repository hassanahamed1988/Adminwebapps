import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Menu, RefreshCw, Sun, Moon, Bell, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useUsers } from '../contexts/UsersContext';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  children?: React.ReactNode;
  /** Pop-up module usage (New Account / New Admin desktop modal): when
   *  provided, the notification and theme icons are hidden on desktop
   *  (still shown on the mobile full-page view) and a close control
   *  appears on the right instead. */
  onClose?: () => void;
}

const Topbar: React.FC<Props> = ({ title, subtitle, onMenuClick, onRefresh, refreshing, children, onClose }) => {
  const { theme, toggleTheme } = useTheme();
  const { users } = useUsers();
  const { t } = useLanguage();
  const navigate = useNavigate();
  // Supplied by Layout via the route Outlet — every page that renders
  // Topbar sits inside that Outlet, so this is always available here.
  const { sidebarOpen, toggleSidebar } = useOutletContext<{ sidebarOpen: boolean; toggleSidebar: () => void }>();

  const pendingCount = users.filter((u) => u.role !== 'ADMIN' && u.status === 'PENDING').length;

  return (
    <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur border-b border-ink-900/8 transition-colors">
      <div className="flex items-center gap-3 px-4 md:px-8 py-4">
        {/* Mobile — opens the slide-in nav drawer */}
        <button
          onClick={onMenuClick}
          className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-ink-600 hover:bg-ink-900/5"
        >
          <Menu size={20} />
        </button>

        {/* Desktop — toggles the sidebar open/closed */}
        <button
          onClick={toggleSidebar}
          title={sidebarOpen ? t('sidebar.collapse') : t('topbar.openSidebar')}
          aria-label={sidebarOpen ? t('sidebar.collapse') : t('topbar.openSidebar')}
          className="hidden md:flex w-9 h-9 rounded-lg items-center justify-center text-ink-600 hover:bg-ink-900/5"
        >
          <Menu size={20} />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="font-display font-extrabold text-lg text-ink-900 truncate">{title}</h1>
          {subtitle && <p className="text-xs text-ink-400 font-medium mt-0.5">{subtitle}</p>}
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-600 hover:bg-ink-900/5 shrink-0"
            title={t('topbar.refresh')}
          >
            <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />
          </button>
        )}

        {/* Notifications: surfaces pending-approval requests, the one thing
            in this v1 that genuinely needs an admin's attention. */}
        <button
          onClick={() => navigate('/pending')}
          className={`relative w-9 h-9 rounded-lg flex items-center justify-center text-ink-600 hover:bg-ink-900/5 shrink-0 ${
            onClose ? 'md:hidden' : ''
          }`}
          title={t('topbar.pendingNotifications')}
        >
          <Bell size={17} />
          {pendingCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-[3px] rounded-full bg-blocked-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </button>

        {/* Theme toggle: defaults to light; preference is remembered locally. */}
        <button
          onClick={toggleTheme}
          className={`w-9 h-9 rounded-lg flex items-center justify-center text-ink-600 hover:bg-ink-900/5 shrink-0 ${
            onClose ? 'md:hidden' : ''
          }`}
          title={theme === 'light' ? t('topbar.darkTheme') : t('topbar.lightTheme')}
        >
          {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
        </button>

        {/* Close control — desktop pop-up module header only (mobile keeps
            the normal full-page Topbar with notification/theme icons). */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title={t('topbar.close')}
            aria-label={t('topbar.close')}
            className="hidden md:flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-ink-600 hover:bg-ink-900/5 shrink-0 font-bold text-sm"
          >
            <X size={16} />
            {t('topbar.closeShort')}
          </button>
        )}

        {children}
      </div>
    </header>
  );
};

export default Topbar;
