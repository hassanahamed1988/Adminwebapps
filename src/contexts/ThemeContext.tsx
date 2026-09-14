import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark';
const THEME_KEY = 'fleetpro_admin_theme';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Theme color tokens — must stay in sync with index.css @theme block.
 *
 * `theme-color` meta tag controls:
 *   • Android Chrome / WebAPK  → system status bar background
 *   • Android WebView / TWA    → status bar + nav bar (if manifest sets it)
 *   • iOS Safari (PWA)         → status bar background
 *
 * We also write `--color-canvas` to `<meta name="msapplication-navbutton-color">`
 * for legacy Edge/IE coverage, and keep a `<meta name="apple-mobile-web-app-status-bar-style">`
 * hint so iOS Safari respects the dark/light status bar text colour.
 */
const THEME_COLORS: Record<Theme, { canvas: string; surface: string }> = {
  light: { canvas: '#f3f5f8', surface: '#ffffff' },
  dark:  { canvas: '#0b1220', surface: '#121b2e' },
};

function applyThemeColorMeta(theme: Theme) {
  const { canvas } = THEME_COLORS[theme];

  // ── theme-color (Chrome Android status bar + navbar, Safari PWA status bar) ──
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = canvas;

  // ── media-query variants so Chrome respects both light + dark OS preference ──
  // Remove any old media-scoped tags we previously injected, then re-add them.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"][media]').forEach((el) => el.remove());

  const lightMeta = document.createElement('meta');
  lightMeta.name = 'theme-color';
  lightMeta.media = '(prefers-color-scheme: light)';
  lightMeta.content = THEME_COLORS.light.canvas;
  document.head.appendChild(lightMeta);

  const darkMeta = document.createElement('meta');
  darkMeta.name = 'theme-color';
  darkMeta.media = '(prefers-color-scheme: dark)';
  darkMeta.content = THEME_COLORS.dark.canvas;
  document.head.appendChild(darkMeta);

  // ── msapplication-navbutton-color (legacy Edge) ──
  let msMeta = document.querySelector<HTMLMetaElement>('meta[name="msapplication-navbutton-color"]');
  if (!msMeta) {
    msMeta = document.createElement('meta');
    msMeta.name = 'msapplication-navbutton-color';
    document.head.appendChild(msMeta);
  }
  msMeta.content = canvas;

  // ── apple-mobile-web-app-status-bar-style ──
  // 'default' = light text-over-dark not supported; 'black-translucent' = dark
  let appleMeta = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (!appleMeta) {
    appleMeta = document.createElement('meta');
    appleMeta.name = 'apple-mobile-web-app-status-bar-style';
    document.head.appendChild(appleMeta);
  }
  appleMeta.content = theme === 'dark' ? 'black-translucent' : 'default';

  // ── <body> background-color ─ keeps the native nav-bar color (Android
  //    Chromium reads it for bottom nav bar tinting in some OEM builds) ──
  document.body.style.backgroundColor = canvas;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default is always 'light' regardless of system preference.
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      return saved === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    applyThemeColorMeta(theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  }, []);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
