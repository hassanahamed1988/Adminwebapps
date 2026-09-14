import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { useIsMobile } from './FloatingSelect';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  label: string;
  value: string; // 'DD-MM-YYYY' or ''
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
}

const MONTH_KEYS = ['date.jan', 'date.feb', 'date.mar', 'date.apr', 'date.may', 'date.jun', 'date.jul', 'date.aug', 'date.sep', 'date.oct', 'date.nov', 'date.dec'];
const WEEKDAY_KEYS = ['date.sun', 'date.mon', 'date.tue', 'date.wed', 'date.thu', 'date.fri', 'date.sat'];

const pad = (n: number) => n.toString().padStart(2, '0');

function parseDMY(v: string): { d: number; m: number; y: number } | null {
  const match = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(v.trim());
  if (!match) return null;
  const d = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const y = parseInt(match[3], 10);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { d, m, y };
}

const formatDMY = (d: number, m: number, y: number) => `${pad(d)}-${pad(m)}-${y}`;
/** `m` is 1-based here — `new Date(y, m, 0)` lands on the last day of month `m`. */
const daysInMonth = (m: number, y: number) => new Date(y, m, 0).getDate();

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_MIN = CURRENT_YEAR - 100;

/* ─────────────────────── Mobile wheel column ─────────────────────── */
const WHEEL_ITEM_H = 40;
const WHEEL_VISIBLE = 5; // odd, so one row sits dead-center
const WHEEL_PAD = Math.floor(WHEEL_VISIBLE / 2) * WHEEL_ITEM_H;

interface WheelItem { value: number; label: string }

const WheelColumn: React.FC<{ items: WheelItem[]; selected: number; onSettle: (v: number) => void }> = ({
  items,
  selected,
  onSettle,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const lastValueRef = useRef(selected);

  // Re-sync scroll position whenever the selected value changes from
  // outside this column (e.g. day count clamped after switching month).
  useEffect(() => {
    if (!ref.current) return;
    if (selected === lastValueRef.current && ref.current.scrollTop !== 0) return;
    const idx = Math.max(0, items.findIndex((it) => it.value === selected));
    ref.current.scrollTop = idx * WHEEL_ITEM_H;
    lastValueRef.current = selected;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, items]);

  const handleScroll = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      if (!ref.current) return;
      const idx = Math.round(ref.current.scrollTop / WHEEL_ITEM_H);
      const clamped = Math.min(Math.max(idx, 0), items.length - 1);
      ref.current.scrollTo({ top: clamped * WHEEL_ITEM_H, behavior: 'smooth' });
      const item = items[clamped];
      if (item && item.value !== lastValueRef.current) {
        lastValueRef.current = item.value;
        onSettle(item.value);
      }
    }, 90);
  };

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      className="flex-1 h-[200px] overflow-y-scroll thin-scroll"
      style={{ scrollSnapType: 'y mandatory' }}
    >
      <div style={{ height: WHEEL_PAD }} />
      {items.map((it) => (
        <div
          key={it.value}
          className={`h-10 flex items-center justify-center text-base transition-colors ${
            it.value === selected ? 'font-bold text-ink-900' : 'text-ink-400'
          }`}
          style={{ scrollSnapAlign: 'center' }}
        >
          {it.label}
        </div>
      ))}
      <div style={{ height: WHEEL_PAD }} />
    </div>
  );
};

/**
 * Date-of-birth field. Mobile renders an iPhone-style scrolling wheel
 * picker (Day / Month / Year columns) in a bottom sheet; desktop renders a
 * classic calendar-grid popover with month navigation — each the natural
 * pattern for its platform, sharing one field/value contract (`DD-MM-YYYY`).
 */
const FloatingDateInput: React.FC<Props> = ({ label, value, onChange, required, error }) => {
  const { t } = useLanguage();
  const MONTHS = useMemo(() => MONTH_KEYS.map((k) => t(k)), [t]);
  const WEEKDAYS = useMemo(() => WEEKDAY_KEYS.map((k) => t(k)), [t]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; bottom: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const parsed = parseDMY(value);
  const hasValue = !!parsed;
  const today = new Date();

  /* Desktop calendar state */
  const [viewMonth, setViewMonth] = useState(parsed ? parsed.m : today.getMonth() + 1);
  const [viewYear, setViewYear] = useState(parsed ? parsed.y : today.getFullYear());

  /* Mobile wheel state */
  const [wheelD, setWheelD] = useState(parsed ? parsed.d : 1);
  const [wheelM, setWheelM] = useState(parsed ? parsed.m : 1);
  const [wheelY, setWheelY] = useState(parsed ? parsed.y : CURRENT_YEAR - 25);

  useEffect(() => {
    if (!open) return;
    if (isMobile) {
      setWheelD(parsed ? parsed.d : 1);
      setWheelM(parsed ? parsed.m : 1);
      setWheelY(parsed ? parsed.y : CURRENT_YEAR - 25);
    } else {
      setViewMonth(parsed ? parsed.m : today.getMonth() + 1);
      setViewYear(parsed ? parsed.y : today.getFullYear());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Clamp the wheel day whenever month/year makes it fall off the end (e.g. 31 → Feb).
  useEffect(() => {
    const dim = daysInMonth(wheelM, wheelY);
    if (wheelD > dim) setWheelD(dim);
  }, [wheelM, wheelY, wheelD]);

  const dayItems = useMemo<WheelItem[]>(() => {
    const dim = daysInMonth(wheelM, wheelY);
    return Array.from({ length: dim }, (_, i) => ({ value: i + 1, label: String(i + 1) }));
  }, [wheelM, wheelY]);
  const monthItems = useMemo<WheelItem[]>(() => MONTHS.map((m, i) => ({ value: i + 1, label: m })), [MONTHS]);
  const yearItems = useMemo<WheelItem[]>(
    () => Array.from({ length: CURRENT_YEAR - YEAR_MIN + 1 }, (_, i) => ({ value: YEAR_MIN + i, label: String(YEAR_MIN + i) })),
    []
  );

  const updateRect = () => {
    if (!wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, bottom: r.bottom });
  };

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

  useEffect(() => {
    if (!(open && isMobile)) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isMobile]);

  const toggleOpen = () => {
    setFocused(true);
    setOpen((o) => !o);
  };

  const closeAll = () => {
    setOpen(false);
    setFocused(false);
  };

  const pickDay = (d: number) => {
    onChange(formatDMY(d, viewMonth, viewYear));
    closeAll();
  };

  const confirmWheel = () => {
    const dim = daysInMonth(wheelM, wheelY);
    onChange(formatDMY(Math.min(wheelD, dim), wheelM, wheelY));
    closeAll();
  };

  const goPrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };
  const goNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  const firstOfMonth = new Date(viewYear, viewMonth - 1, 1);
  const startOffset = firstOfMonth.getDay();
  const totalDays = daysInMonth(viewMonth, viewYear);
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const displayText = hasValue ? formatDMY(parsed!.d, parsed!.m, parsed!.y) : '';

  return (
    <div>
      <div className="relative" ref={wrapRef}>
        <CalendarIcon
          size={16}
          aria-hidden
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none transition-opacity ease-out ${
            focused || open ? 'opacity-0 duration-0' : 'opacity-100 duration-300'
          }`}
        />
        {/* Chevron — desktop only (mobile opens a bottom-sheet wheel picker
            whose own header already makes the "tap to open" affordance
            clear, so it doesn't need one). Matches FloatingSelect's dropdown
            indicator so every field with a popover looks consistent. */}
        {!isMobile && (
          <ChevronDown
            size={15}
            className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
          />
        )}
        <button
          type="button"
          onClick={toggleOpen}
          onBlur={() => {
            if (!open) setFocused(false);
          }}
          className={`w-full h-11 flex items-center ${focused || open ? 'pl-3' : 'pl-10'} ${
            isMobile ? 'pr-3.5' : 'pr-9'
          } rounded-lg border bg-surface text-sm font-medium text-left text-ink-900 focus:outline-none focus:ring-2 transition-[padding-left,border-color,box-shadow] ease-out ${
            focused || open ? 'duration-0' : 'duration-300'
          } ${error ? 'border-blocked-500/50 ring-1 ring-blocked-500/20' : 'border-ink-900/12 focus:ring-signal-500/30 focus:border-signal-500/50'}`}
        >
          <span className="block min-w-0 truncate">{displayText}</span>
        </button>
        <label
          className={`absolute pointer-events-none transition-all duration-200 ease-out ${
            hasValue
              ? `top-0 -translate-y-1/2 left-3 text-[11px] font-bold bg-surface px-1 ${
                  focused || open ? 'text-signal-600' : 'text-ink-600'
                }`
              : `top-1/2 -translate-y-1/2 text-sm text-ink-400 ${focused || open ? 'left-3' : 'left-10'}`
          }`}
        >
          {label} {required && <span className="text-blocked-500">*</span>}
        </label>
      </div>
      {error && <p className="text-blocked-500 text-xs font-semibold mt-1">{error}</p>}

      {/* Desktop — calendar grid popover */}
      {open && !isMobile && rect &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: 'fixed', top: rect.bottom + 6, left: rect.left, width: 320 }}
            className="z-[100] rounded-2xl border border-ink-900/10 bg-surface shadow-2xl dropdown-pop p-4"
          >
            <div className="flex items-center gap-1 mb-3">
              <button
                type="button"
                onClick={goPrevMonth}
                className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-ink-500 hover:bg-ink-900/5"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Manual month + year selection — side by side, so any date
                  is reachable directly instead of clicking prev/next
                  repeatedly. Desktop calendar only; the mobile sheet uses
                  its own wheel columns for day/month/year. */}
              <div className="flex-1 flex items-center justify-center gap-1.5 min-w-0">
                <div className="relative min-w-0">
                  <select
                    value={viewMonth}
                    onChange={(e) => setViewMonth(Number(e.target.value))}
                    className="appearance-none w-full min-w-0 text-xs font-bold text-ink-900 bg-ink-900/[0.03] border border-ink-900/10 rounded-lg pl-2.5 pr-6 py-1.5 focus:outline-none focus:ring-2 focus:ring-signal-500/30 hover:bg-ink-900/[0.06] cursor-pointer truncate"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
                </div>
                <div className="relative shrink-0">
                  <select
                    value={viewYear}
                    onChange={(e) => setViewYear(Number(e.target.value))}
                    className="appearance-none text-xs font-bold text-ink-900 bg-ink-900/[0.03] border border-ink-900/10 rounded-lg pl-2.5 pr-6 py-1.5 focus:outline-none focus:ring-2 focus:ring-signal-500/30 hover:bg-ink-900/[0.06] cursor-pointer"
                  >
                    {yearItems.map((y) => (
                      <option key={y.value} value={y.value}>
                        {y.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
                </div>
              </div>

              <button
                type="button"
                onClick={goNextMonth}
                className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-ink-500 hover:bg-ink-900/5"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((w) => (
                <div key={w} className="text-[10px] font-bold text-ink-400 text-center h-6 flex items-center justify-center">
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {cells.map((d, i) => {
                const isSelected = !!(d && parsed && parsed.d === d && parsed.m === viewMonth && parsed.y === viewYear);
                const isToday = !!(d && today.getDate() === d && today.getMonth() + 1 === viewMonth && today.getFullYear() === viewYear);
                return (
                  <button
                    type="button"
                    key={i}
                    disabled={!d}
                    onClick={() => d && pickDay(d)}
                    className={`h-8 w-8 mx-auto rounded-full text-xs font-semibold flex items-center justify-center ${
                      !d
                        ? 'invisible'
                        : isSelected
                        ? 'bg-signal-500 text-white'
                        : isToday
                        ? 'border border-signal-500/50 text-signal-600'
                        : 'text-ink-700 hover:bg-ink-900/5'
                    }`}
                  >
                    {d ?? ''}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}

      {/* Mobile — iPhone-style wheel picker */}
      {open &&
        isMobile &&
        createPortal(
          <div className="fixed inset-0 z-[100]">
            <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm sheet-backdrop-in" onClick={closeAll} />
            <div
              ref={panelRef}
              className="absolute left-0 right-0 bottom-0 flex flex-col rounded-t-3xl bg-surface shadow-2xl sheet-up"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              <div className="flex justify-center pt-2.5 pb-1 shrink-0">
                <div className="w-9 h-1 rounded-full bg-ink-900/15" />
              </div>
              <div className="flex items-center justify-between px-5 pt-1 pb-3 border-b border-ink-900/8 shrink-0">
                <button type="button" onClick={closeAll} className="text-sm font-semibold text-ink-500">
                  {t('date.cancel')}
                </button>
                <p className="text-sm font-bold text-ink-900">{label}</p>
                <button type="button" onClick={confirmWheel} className="text-sm font-bold text-signal-600">
                  {t('date.done')}
                </button>
              </div>

              <div className="relative flex px-5 py-2">
                {/* Center selection band, sitting behind the three columns */}
                <div
                  className="absolute left-5 right-5 top-1/2 -translate-y-1/2 h-10 rounded-lg bg-ink-900/[0.04] pointer-events-none"
                />
                <WheelColumn items={dayItems} selected={wheelD} onSettle={setWheelD} />
                <WheelColumn items={monthItems} selected={wheelM} onSettle={setWheelM} />
                <WheelColumn items={yearItems} selected={wheelY} onSettle={setWheelY} />
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default FloatingDateInput;
