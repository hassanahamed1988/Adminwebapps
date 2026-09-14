import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Phone, Search, X } from 'lucide-react';
import { useIsMobile } from './FloatingSelect';
import { useLanguage } from '../contexts/LanguageContext';

/* ─────────────────── Country-code dropdown + input ─────────────────
   A compound field: a slim <select> pinned to the left edge (showing the
   dial code) followed by the number input. Both sit inside one rounded
   container so they look like a single field, matching the height / border /
   focus style of every other FloatingInput.

   Shared between MobileAppNewUserForm and NewAdminForm so both stay in
   sync on the same country-code list and behaviour.                    */
export const COUNTRY_CODES = [
  { code: '+880', flag: '🇧🇩', name: 'Bangladesh' },
  { code: '+91',  flag: '🇮🇳', name: 'India' },
  { code: '+1',   flag: '🇺🇸', name: 'United States' },
  { code: '+44',  flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+971', flag: '🇦🇪', name: 'United Arab Emirates' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+974', flag: '🇶🇦', name: 'Qatar' },
  { code: '+965', flag: '🇰🇼', name: 'Kuwait' },
  { code: '+968', flag: '🇴🇲', name: 'Oman' },
  { code: '+973', flag: '🇧🇭', name: 'Bahrain' },
  { code: '+60',  flag: '🇲🇾', name: 'Malaysia' },
  { code: '+65',  flag: '🇸🇬', name: 'Singapore' },
  { code: '+81',  flag: '🇯🇵', name: 'Japan' },
  { code: '+82',  flag: '🇰🇷', name: 'South Korea' },
  { code: '+86',  flag: '🇨🇳', name: 'China' },
  { code: '+49',  flag: '🇩🇪', name: 'Germany' },
  { code: '+33',  flag: '🇫🇷', name: 'France' },
  { code: '+39',  flag: '🇮🇹', name: 'Italy' },
  { code: '+7',   flag: '🇷🇺', name: 'Russia' },
  { code: '+55',  flag: '🇧🇷', name: 'Brazil' },
  { code: '+27',  flag: '🇿🇦', name: 'South Africa' },
  { code: '+61',  flag: '🇦🇺', name: 'Australia' },
  { code: '+64',  flag: '🇳🇿', name: 'New Zealand' },
  { code: '+92',  flag: '🇵🇰', name: 'Pakistan' },
  { code: '+94',  flag: '🇱🇰', name: 'Sri Lanka' },
  { code: '+977', flag: '🇳🇵', name: 'Nepal' },
  { code: '+20',  flag: '🇪🇬', name: 'Egypt' },
  { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: '+212', flag: '🇲🇦', name: 'Morocco' },
];

export interface PhoneCountryInputProps {
  countryCode: string;
  onCodeChange: (v: string) => void;
  number: string;
  onNumberChange: (v: string) => void;
  required?: boolean;
  error?: string;
  /** Field label shown above the number input (defaults to the mobile-app wording). */
  label?: string;
  disabled?: boolean;
}

/** Minimum popover/list width for the country-code picker */
const CODE_PANEL_WIDTH = 280;

const PhoneCountryInput: React.FC<PhoneCountryInputProps> = ({
  countryCode, onCodeChange, number, onNumberChange, required, error, label, disabled,
}) => {
  const { t } = useLanguage();
  const resolvedLabel = label ?? t('phone.mobileNumber');
  const [focused, setFocused] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Clear search query on close
  useEffect(() => {
    if (!codeOpen) {
      setSearchQuery('');
    }
  }, [codeOpen]);

  const filteredCountryCodes = useMemo(() => {
    if (!searchQuery.trim()) return COUNTRY_CODES;
    const q = searchQuery.toLowerCase().trim();
    return COUNTRY_CODES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const [rect, setRect] = useState<{ top: number; left: number; bottom: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const placeholder = focused ? 'Enter Mobile Number' : ' ';
  const selectedCode = COUNTRY_CODES.find((c) => c.code === countryCode) ?? COUNTRY_CODES[0];

  const updateRect = () => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, bottom: r.bottom, right: r.right });
  };

  useLayoutEffect(() => {
    if (!codeOpen || isMobile) return;
    updateRect();
    const onReflow = () => updateRect();
    window.addEventListener('scroll', onReflow, true);
    window.addEventListener('resize', onReflow);
    return () => {
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeOpen, isMobile]);

  useEffect(() => {
    if (!codeOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setCodeOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCodeOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [codeOpen]);

  useEffect(() => {
    if (!(codeOpen && isMobile)) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [codeOpen, isMobile]);

  const handlePick = (code: string) => {
    onCodeChange(code);
    setCodeOpen(false);
  };

  return (
    <div>
      <div
        className={`flex h-11 rounded-lg border bg-surface transition-[border-color,box-shadow] duration-200 ${
          error
            ? 'border-blocked-500/50 ring-1 ring-blocked-500/20'
            : focused
            ? `border-signal-500/50 ring-2 ring-signal-500/30`
            : 'border-ink-900/12'
        } ${disabled ? 'opacity-60 bg-ink-900/5 pointer-events-none' : ''}`}
      >
        {/* Country code selector */}
        <div className="relative flex-shrink-0">
          <button
            ref={triggerRef}
            type="button"
            disabled={disabled}
            onClick={() => setCodeOpen((o) => !o)}
            className="h-full pl-3 pr-6 text-sm font-bold text-ink-900 bg-transparent focus:outline-none cursor-pointer border-r border-ink-900/10 flex items-center gap-1.5 shrink-0"
          >
            <span className="text-base leading-none">{selectedCode.flag}</span>
            <span>{selectedCode.code}</span>
          </button>
          <ChevronDown
            size={12}
            className={`absolute right-1.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none transition-transform duration-200 ${
              codeOpen ? 'rotate-180' : ''
            }`}
          />

          {/* Desktop popover — fixed comfortable width, not the (too narrow) trigger width */}
          {codeOpen && !isMobile && rect &&
            createPortal(
              <div
                ref={panelRef}
                style={{ position: 'fixed', top: rect.bottom + 6, left: rect.left, width: CODE_PANEL_WIDTH }}
                className="z-[100] flex flex-col max-h-72 rounded-xl border border-ink-900/10 bg-surface shadow-2xl dropdown-pop overflow-hidden"
              >
                {/* Search input */}
                <div className="p-2 border-b border-ink-900/8 bg-ink-900/[0.01] shrink-0 flex items-center gap-1.5">
                  <Search size={14} className="text-ink-400 shrink-0 ml-1" />
                  <input
                    type="text"
                    placeholder={t('common.search') || 'Search...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs bg-transparent focus:outline-none text-ink-900 font-medium placeholder-ink-400"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="p-0.5 rounded hover:bg-ink-900/5 text-ink-400 hover:text-ink-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* List container */}
                <div className="overflow-y-auto thin-scroll py-1.5 flex-1">
                  {filteredCountryCodes.length === 0 ? (
                    <div className="px-3.5 py-3 text-xs text-ink-400 font-medium text-center">
                      {t('common.noResults') || 'No results found'}
                    </div>
                  ) : (
                    filteredCountryCodes.map((c) => (
                      <button
                        key={c.code + c.name}
                        type="button"
                        onClick={() => handlePick(c.code)}
                        className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2 text-sm text-left hover:bg-ink-900/5 transition-colors ${
                          c.code === countryCode ? 'font-bold text-signal-600 bg-signal-500/5' : 'font-medium text-ink-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0 leading-none">{c.flag}</span>
                          <span className="truncate">{c.name}</span>
                          <span className="text-ink-400 font-semibold text-xs shrink-0">({c.code})</span>
                        </div>
                        {c.code === countryCode && <Check size={15} className="shrink-0 text-signal-600" />}
                      </button>
                    ))
                  )}
                </div>
              </div>,
              document.body
            )}

          {/* Mobile bottom sheet */}
          {codeOpen &&
            isMobile &&
            createPortal(
              <div className="fixed inset-0 z-[100]">
                <div
                  className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm sheet-backdrop-in"
                  onClick={() => setCodeOpen(false)}
                />
                <div
                  ref={panelRef}
                  className="absolute left-0 right-0 bottom-0 flex flex-col max-h-[75vh] rounded-t-3xl bg-surface shadow-2xl sheet-up"
                  style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                >
                  <div className="flex justify-center pt-2.5 pb-1 shrink-0">
                    <div className="w-9 h-1 rounded-full bg-ink-900/15" />
                  </div>
                  <div className="px-5 pt-1 pb-3 border-b border-ink-900/8 shrink-0">
                    <p className="text-sm font-bold text-ink-900">{t('phone.countryCode')}</p>
                  </div>

                  {/* Mobile Search input */}
                  <div className="px-5 py-2 border-b border-ink-900/8 bg-ink-900/[0.01] shrink-0 flex items-center gap-2">
                    <Search size={16} className="text-ink-400 shrink-0" />
                    <input
                      type="text"
                      placeholder={t('common.search') || 'Search...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-sm bg-transparent focus:outline-none text-ink-900 font-medium placeholder-ink-400 py-1"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="p-1 rounded-lg hover:bg-ink-900/5 text-ink-400 hover:text-ink-600 flex items-center justify-center"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  <div className="overflow-y-auto thin-scroll py-1.5 flex-1">
                    {filteredCountryCodes.length === 0 ? (
                      <div className="px-5 py-6 text-sm text-ink-400 font-medium text-center">
                        {t('common.noResults') || 'No results found'}
                      </div>
                    ) : (
                      filteredCountryCodes.map((c) => (
                        <button
                          key={c.code + c.name}
                          type="button"
                          onClick={() => handlePick(c.code)}
                          className={`w-full flex items-center justify-between gap-2.5 px-5 py-3 text-[15px] text-left active:bg-ink-900/5 transition-colors ${
                            c.code === countryCode ? 'font-bold text-signal-600 bg-signal-500/5' : 'font-medium text-ink-900'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-lg shrink-0 leading-none">{c.flag}</span>
                            <span className="truncate">{c.name}</span>
                            <span className="text-ink-400 font-semibold text-xs shrink-0">({c.code})</span>
                          </div>
                          {c.code === countryCode && <Check size={17} className="shrink-0 text-signal-600" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>,
              document.body
            )}
        </div>

        {/* Number input */}
        <div className="relative flex-1">
          <Phone
            size={15}
            aria-hidden
            className={`absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none transition-opacity duration-300 ease-out ${
              focused ? 'opacity-0 duration-0' : 'opacity-100'
            }`}
          />
          <input
            type="tel"
            disabled={disabled}
            value={number}
            onChange={(e) => onNumberChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            className={`peer w-full h-full text-sm font-medium text-ink-900 bg-transparent focus:outline-none transition-[padding-left] duration-300 ease-out pr-3.5 rounded-r-lg placeholder:text-ink-400/70 placeholder:font-normal ${
              focused ? 'pl-3 duration-0' : 'pl-9'
            }`}
          />
          {/* Floating label */}
          <label
            className={`absolute text-ink-400 pointer-events-none transition-all duration-200 ease-out ${
              focused || number
                ? 'left-3 top-0 -translate-y-1/2 text-[11px] font-bold bg-surface px-1 text-signal-600'
                : 'left-9 top-1/2 -translate-y-1/2 text-sm'
            }`}
          >
            {resolvedLabel} {required && <span className="text-blocked-500">*</span>}
          </label>
        </div>
      </div>
      {error && <p className="text-blocked-500 text-xs font-semibold mt-1">{error}</p>}
    </div>
  );
};

export default PhoneCountryInput;
