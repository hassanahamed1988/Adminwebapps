import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UserListPage from './pages/UserListPage';
import UserDetail from './pages/UserDetail';
import MobileAppNewUserForm from './pages/MobileAppNewUserForm';
import NewAdminForm from './pages/NewAdminForm';
import DropdownSettings from './pages/DropdownSettings';
import ServerSettings from './pages/ServerSettings';
import Settings from './pages/Settings';

const App: React.FC = () => {
  return (
    <HashRouter>
      <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/new-account" element={<MobileAppNewUserForm />} />
                <Route path="/new-admin" element={<NewAdminForm />} />
                <Route path="/pending" element={<UserListPage bucket="PENDING" />} />
                <Route path="/active" element={<UserListPage bucket="ACTIVE" />} />
                <Route path="/inactive" element={<UserListPage bucket="INACTIVE" />} />
                <Route path="/blocked" element={<UserListPage bucket="BLOCKED" />} />
                <Route path="/user/:id" element={<UserDetail />} />
                <Route path="/dropdown-settings" element={<DropdownSettings />} />
                <Route path="/server-settings" element={<ServerSettings />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
      </LanguageProvider>
    </HashRouter>
  );
};

export default App;
