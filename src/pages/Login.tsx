import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, Loader2, UserCircle, KeyRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { loginAdmin } from '../services/auth';
import logo from '../assets/logo.png';

/**
 * Dynamic placeholder helper — same rule as FloatingInput:
 *   focused  → "Enter <label>"
 *   blurred  → " " (single space to keep floating-label peer selectors working)
 */
function buildPlaceholder(label: string, focused: boolean): string {
  if (!focused) return ' ';
  const clean = label.replace(/\s*\*$/, '').trim();
  return `Enter ${clean}`;
}

const Login: React.FC = () => {
  const { admin, login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Focus tracking for dynamic placeholders
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  if (admin) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await loginAdmin(username, password);
    setLoading(false);
    if (!result.ok || !result.user) {
      setError(result.error ? t(result.error) : t('login.failed'));
      return;
    }
    login(result.user);
    navigate('/');
  };

  // Login keeps its own permanently-dark styling, so it mirrors the shared
  // FloatingInput behavior (instant-hide / smooth-reveal icon, floating
  // label) with dark-appropriate colors rather than reusing that
  // light-surface component directly. Radius must stay rounded-lg (8px) to
  // match the app-wide field standard in src/styles/controls.ts.
  const darkFieldCls =
    'peer w-full h-11 pl-10 pr-4 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-signal-500/50 focus:border-signal-500/50 transition-[padding-left,border-color,box-shadow] duration-300 ease-out focus:pl-3 focus:duration-0';
  const darkIconCls =
    'absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none opacity-100 transition-opacity duration-300 ease-out peer-focus:opacity-0 peer-focus:duration-0';
  const darkLabelCls =
    'absolute left-10 top-1/2 -translate-y-1/2 text-sm text-white/40 pointer-events-none transition-all duration-200 ease-out peer-focus:left-3 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-bold peer-focus:text-signal-500 peer-focus:bg-rail-900 peer-focus:px-1 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:text-white/60 peer-[:not(:placeholder-shown)]:bg-rail-900 peer-[:not(:placeholder-shown)]:px-1';

  return (
    <div className="min-h-screen bg-rail-900 flex items-center justify-center px-4 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '38px 38px',
        }}
      />
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-signal-500/20 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-7">
          <img src={logo} alt="FleetPro" className="w-16 h-16 rounded-2xl object-cover shadow-xl mb-4" />
          <h1 className="font-display font-extrabold text-xl text-white tracking-tight">FleetPro Admin</h1>
          <p className="text-white/45 text-xs font-mono uppercase tracking-widest mt-1">{t('brand.controlTowerAccess')}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/[0.04] backdrop-blur border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="relative">
            <input
              id="login-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onFocus={() => setUsernameFocused(true)}
              onBlur={() => setUsernameFocused(false)}
              autoFocus
              placeholder={buildPlaceholder(t('login.userIdOrEmail'), usernameFocused)}
              className={darkFieldCls}
            />
            <UserCircle size={16} aria-hidden className={darkIconCls} />
            <label htmlFor="login-username" className={darkLabelCls}>
              {t('login.userIdOrEmail')}
            </label>
          </div>

          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              placeholder={buildPlaceholder(t('login.password'), passwordFocused)}
              className={`${darkFieldCls} pr-11`}
            />
            <KeyRound size={16} aria-hidden className={darkIconCls} />
            <label htmlFor="login-password" className={darkLabelCls}>
              {t('login.password')}
            </label>
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          {error && (
            <div className="bg-blocked-500/10 border border-blocked-500/25 text-rose-300 text-xs font-semibold rounded-lg px-3.5 py-2.5">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-signal-500 hover:bg-signal-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
          >
            {loading ? <Loader2 size={17} className="animate-spin" /> : <ShieldCheck size={17} />}
            {t('login.submit')}
          </button>
        </form>

        <p className="text-center text-white/30 text-[11px] font-medium mt-5">
          {t('login.restrictedNote')}
        </p>
      </div>
    </div>
  );
};

export default Login;
