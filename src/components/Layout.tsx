import React, { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileDrawer from './MobileDrawer';
import { useAuth } from '../contexts/AuthContext';
import { UsersProvider } from '../contexts/UsersContext';
import { DropdownOptionsProvider } from '../contexts/DropdownOptionsContext';
import { useLanguage } from '../contexts/LanguageContext';

const Layout: React.FC = () => {
  const { admin, isLoading } = useAuth();
  const { t } = useLanguage();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Desktop sidebar open/collapsed state — separate from the mobile drawer
  // above. The Sidebar itself always stays mounted/visible on desktop;
  // when "closed" it collapses to an icons-only rail (labels hidden)
  // instead of disappearing entirely, so it's never left with no way to
  // reopen it — this also covers "desktop site" mode in a mobile browser,
  // which can force the `md` breakpoint on even while the physical screen
  // is narrow. Toggled from the menu icon in Topbar (desktop) alongside
  // the same icon inside the Sidebar itself.
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-canvas text-ink-400 font-mono text-sm">
        {t('common.loading')}
      </div>
    );
  }

  if (!admin) return <Navigate to="/login" replace />;

  // UsersProvider is mounted only once we know an admin/manager is signed
  // in, so the login screen never fires Firestore reads it doesn't need.
  return (
    <UsersProvider>
      <DropdownOptionsProvider>
        <div className="flex min-h-screen bg-canvas">
          <Sidebar collapsed={!sidebarOpen} onToggle={() => setSidebarOpen((o) => !o)} />
          <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

          <div className="flex-1 min-w-0">
            <Outlet context={{ openMobileNav: () => setDrawerOpen(true), sidebarOpen, toggleSidebar: () => setSidebarOpen((o) => !o) }} />
          </div>
        </div>
      </DropdownOptionsProvider>
    </UsersProvider>
  );
};

export default Layout;
