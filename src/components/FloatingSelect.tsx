import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, LucideIcon } from 'lucide-react';
import { FieldAccent, ACCENT_RING } from '../styles/controls';

interface Option {
  value: string;
  label: string;
}

interface Props {
  label: string;
  icon: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  required?: boolean;
  disabled?: boolean;
  error?: string;
  accent?: FieldAccent;
}

type Rect = { top: number; left: number; bottom: number; width: number };

const MOBILE_QUERY = '(max-width: 767px)';

/** Tracks whether we're currently under the `md` breakpoint, so the same
 * dropdown can render as a desktop popover or a mobile bottom sheet.
 * Exported so other custom dropdowns (e.g. the phone country-code picker
 * in MobileAppNewUserForm.tsx) can share the exact same breakpoint logic. */
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
};

/**
 * FloatingSelect — floating label + leading icon, matches FloatingInput exactly.
 *
 * v2: the native <select> has been replaced with a custom trigger button +
 * a portalled option panel. This unlocks two things a native select can't
 * do on its own:
 *
 *   1. DESKTOP — the panel's width always matches the trigger field's own
 *      width exactly (measured live via getBoundingClientRect, so it holds
 *      even if the field is inside a responsive grid).
 *   2. MOBILE  — under the `md` breakpoint, the same options render as an
 *      iOS-style bottom sheet: slides up from the bottom edge, rounded top
 *      corners, grab handle, backdrop tap-to-close, safe-area aware.
 *
 * The public props are unchanged from v1, so every existing call site
 * (FloatingSelect / EditableFloatingSelect usage) keeps working as-is.
 */
const FloatingSelect: React.FC<Props> = ({
  label,
  icon: Icon,
  value,
  onChange,
  options,
  required,
  disabled,
  error,
  accent = 'signal',
}) => {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const hasValue = value !== '';
  const selected = options.find((o) => o.value === value);
  // The blank sentinel ({ value: '', label: '...নির্বাচন করুন' }) exists so
  // the field has a "no selection" state for validation — the floating
  // label already communicates that, so we don't show it as a row.
  const visibleOptions = options.filter((o) => o.value !== '');

  // Icon hides the moment the field is focused/open (same as FloatingInput).
  const iconHidden = focused || open;

  const ACCENT_COLOR_MAP: Record<FieldAccent, string> = {
    signal: 'text-signal-600',
    active: 'text-active-500',
    blocked: 'text-blocked-500',
  };
  const focusedLabelColor = focused || open ? ACCENT_COLOR_MAP[accent] : '';

  const updateRect = () => {
    if (!wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, bottom: r.bottom, width: r.width });
  };

  // Keep the desktop panel glued to the trigger's live width/position while open.
  useLayoutEffect(() => {
    if (!open || isMobile) return;
    updateRect();
    const onReflow = () => updateRect();
    window.addEventListener('scroll', onReflow, true);
    window.addEventListener('resize', onReflow);
    return () => {
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isMobile]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
      setFocused(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Lock background scroll while the mobile sheet is open.
  useEffect(() => {
    if (!(open && isMobile)) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isMobile]);

  const toggleOpen = () => {
    if (disabled) return;
    setFocused(true);
    setOpen((o) => !o);
  };

  const handleSelect = (v: string) => {
    onChange(v);
    setOpen(false);
    setFocused(false);
  };

  return (
    <div>
      <div className="relative" ref={wrapRef}>
        {/* Leading icon */}
        <Icon
          size={16}
          aria-hidden
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none transition-opacity ease-out ${
            iconHidden ? 'opacity-0 duration-0' : 'opacity-100 duration-300'
          }`}
        />

        {/* Chevron — rotates open */}
        <ChevronDown
          size={15}
          className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />

        {/* Trigger button — replaces the native <select> */}
        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={toggleOpen}
          onBlur={() => {
            if (!open) setFocused(false);
          }}
          className={`w-full h-11 flex items-center ${iconHidden ? 'pl-3' : 'pl-10'} pr-9 rounded-lg border bg-surface text-sm font-medium text-left text-ink-900 focus:outline-none focus:ring-2 disabled:bg-ink-900/[0.03] disabled:text-ink-600 disabled:cursor-not-allowed transition-[padding-left,border-color,box-shadow] ease-out ${
            iconHidden ? 'duration-0' : 'duration-300'
          } ${
            error
              ? 'border-blocked-500/50 ring-1 ring-blocked-500/20'
              : `border-ink-900/12 ${ACCENT_RING[accent]}`
          }`}
        >
          <span className="block min-w-0 truncate">{hasValue ? selected?.label ?? value : ''}</span>
        </button>

        {/* Floating label — Global Dropdown Placeholder Rule: this floats to
            the border line ONLY when a real option is selected (hasValue).
            Focus/open alone must never float it — opening the panel with
            nothing chosen keeps the label sitting inline as a placeholder,
            exactly like an empty text input does. When inline, its left
            offset mirrors the icon's hide/show state so it never overlaps
            the vanished icon's old position. */}
        <label
          htmlFor={id}
          className={`absolute pointer-events-none transition-all duration-200 ease-out ${
            hasValue
              ? `top-0 -translate-y-1/2 left-3 text-[11px] font-bold bg-surface px-1 ${
                  focused || open ? focusedLabelColor : 'text-ink-600'
                }`
              : `top-1/2 -translate-y-1/2 text-sm text-ink-400 ${iconHidden ? 'left-3' : 'left-10'}`
          }`}
        >
          {label} {required && <span className="text-blocked-500">*</span>}
        </label>
      </div>
      {error && <p className="text-blocked-500 text-xs font-semibold mt-1">{error}</p>}

      {/* Desktop popover — width always mirrors the trigger field's own width */}
      {open && !isMobile && rect &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: 'fixed', top: rect.bottom + 6, left: rect.left, width: rect.width }}
            className="z-[100] max-h-64 overflow-y-auto thin-scroll rounded-xl border border-ink-900/10 bg-surface shadow-2xl dropdown-pop py-1.5"
          >
            {visibleOptions.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => handleSelect(o.value)}
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm text-left hover:bg-ink-900/5 ${
                  o.value === value ? 'font-bold text-signal-600' : 'font-medium text-ink-900'
                }`}
              >
                <span className="truncate">{o.label}</span>
                {o.value === value && <Check size={15} className="shrink-0" />}
              </button>
            ))}
          </div>,
          document.body
        )}

      {/* Mobile bottom sheet — iPhone-style action sheet */}
      {open &&
        isMobile &&
        createPortal(
          <div className="fixed inset-0 z-[100]">
            <div
              className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm sheet-backdrop-in"
              onClick={() => setOpen(false)}
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
                <p className="text-sm font-bold text-ink-900">{label}</p>
              </div>
              <div className="overflow-y-auto thin-scroll py-1.5">
                {visibleOptions.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => handleSelect(o.value)}
                    className={`w-full flex items-center justify-between gap-2 px-5 py-3.5 text-[15px] text-left active:bg-ink-900/5 ${
                      o.value === value ? 'font-bold text-signal-600' : 'font-medium text-ink-900'
                    }`}
                  >
                    <span className="truncate">{o.label}</span>
                    {o.value === value && <Check size={17} className="shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default FloatingSelect;
