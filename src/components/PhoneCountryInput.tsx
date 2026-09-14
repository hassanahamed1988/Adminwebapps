import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Phone } from 'lucide-react';
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
  { code: '+880', flag: '🇧🇩', name: 'BD' },
  { code: '+91',  flag: '🇮🇳', name: 'IN' },
  { code: '+1',   flag: '🇺🇸', name: 'US' },
  { code: '+44',  flag: '🇬🇧', name: 'GB' },
  { code: '+971', flag: '🇦🇪', name: 'AE' },
  { code: '+966', flag: '🇸🇦', name: 'SA' },
  { code: '+974', flag: '🇶🇦', name: 'QA' },
  { code: '+965', flag: '🇰🇼', name: 'KW' },
  { code: '+968', flag: '🇴🇲', name: 'OM' },
  { code: '+973', flag: '🇧🇭', name: 'BH' },
  { code: '+60',  flag: '🇲🇾', name: 'MY' },
  { code: '+65',  flag: '🇸🇬', name: 'SG' },
  { code: '+81',  flag: '🇯🇵', name: 'JP' },
  { code: '+82',  flag: '🇰🇷', name: 'KR' },
  { code: '+86',  flag: '🇨🇳', name: 'CN' },
  { code: '+49',  flag: '🇩🇪', name: 'DE' },
  { code: '+33',  flag: '🇫🇷', name: 'FR' },
  { code: '+39',  flag: '🇮🇹', name: 'IT' },
  { code: '+7',   flag: '🇷🇺', name: 'RU' },
  { code: '+55',  flag: '🇧🇷', name: 'BR' },
  { code: '+27',  flag: '🇿🇦', name: 'ZA' },
  { code: '+61',  flag: '🇦🇺', name: 'AU' },
  { code: '+64',  flag: '🇳🇿', name: 'NZ' },
  { code: '+92',  flag: '🇵🇰', name: 'PK' },
  { code: '+94',  flag: '🇱🇰', name: 'LK' },
  { code: '+977', flag: '🇳🇵', name: 'NP' },
  { code: '+20',  flag: '🇪🇬', name: 'EG' },
  { code: '+234', flag: '🇳🇬', name: 'NG' },
  { code: '+254', flag: '🇰🇪', name: 'KE' },
  { code: '+212', flag: '🇲🇦', name: 'MA' },
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
}

/** Minimum popover/list width for the country-code picker — the trigger
 * itself is only as wide as "🇧🇩 +880", far too narrow to read a list of
 * country names against, so unlike FloatingSelect this one keeps a fixed
 * comfortable width instead of mirroring the trigger's own width. */
const CODE_PANEL_WIDTH = 240;

const PhoneCountryInput: React.FC<PhoneCountryInputProps> = ({
  countryCode, onCodeChange, number, onNumberChange, required, error, label,
}) => {
  const { t } = useLanguage();
  const resolvedLabel = label ?? t('phone.mobileNumber');
  const [focused, setFocused] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
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
        }`}
      >
        {/* Country code selector */}
        <div className="relative flex-shrink-0">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setCodeOpen((o) => !o)}
            className="h-full pl-2.5 pr-6 text-sm font-bold text-ink-900 bg-transparent focus:outline-none cursor-pointer border-r border-ink-900/10"
          >
            {selectedCode.flag} {selectedCode.code}
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
                className="z-[100] max-h-72 overflow-y-auto thin-scroll rounded-xl border border-ink-900/10 bg-surface shadow-2xl dropdown-pop py-1.5"
              >
                {COUNTRY_CODES.map((c) => (
                  <button
                    key={c.code + c.name}
                    type="button"
                    onClick={() => handlePick(c.code)}
                    className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm text-left hover:bg-ink-900/5 ${
                      c.code === countryCode ? 'font-bold text-signal-600' : 'font-medium text-ink-900'
                    }`}
                  >
                    <span>{c.flag} {c.code} <span className="text-ink-400 font-medium">{c.name}</span></span>
                    {c.code === countryCode && <Check size={15} className="shrink-0" />}
                  </button>
                ))}
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
                  <div className="overflow-y-auto thin-scroll py-1.5">
                    {COUNTRY_CODES.map((c) => (
                      <button
                        key={c.code + c.name}
                        type="button"
                        onClick={() => handlePick(c.code)}
                        className={`w-full flex items-center justify-between gap-2 px-5 py-3.5 text-[15px] text-left active:bg-ink-900/5 ${
                          c.code === countryCode ? 'font-bold text-signal-600' : 'font-medium text-ink-900'
                        }`}
                      >
                        <span>{c.flag} {c.code} <span className="text-ink-400 font-medium">{c.name}</span></span>
                        {c.code === countryCode && <Check size={17} className="shrink-0" />}
                      </button>
                    ))}
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
