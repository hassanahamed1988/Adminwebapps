import React from 'react';
import { Check, ChevronLeft, ChevronRight, LucideIcon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export interface StepDef {
  key: string;
  title: string;
  icon: LucideIcon;
}

interface TrackerProps {
  steps: StepDef[];
  activeIndex: number;
}

/**
 * Step header — sits at the top of the form, beneath Topbar, showing which
 * category (Personal / Document / Address / Security / …) the admin is on
 * and how many remain. Prev/Next controls live separately in
 * `StepNavigation`, pinned to the bottom of the module by DesktopModalCard's
 * `footer` slot — see there. This tracker itself lives in that same
 * component's `header` slot, so it never needs its own sticky positioning —
 * only the form's field content in between scrolls.
 */
export const StepTracker: React.FC<TrackerProps> = ({ steps, activeIndex }) => {
  const { t } = useLanguage();
  return (
    <div className="px-4 md:px-8 py-3 bg-surface border-b border-ink-900/8">
      <p className="text-[11px] font-bold text-ink-400 text-center mb-2">
        {t('formStepper.stepOf', { current: activeIndex + 1, total: steps.length })}
      </p>

      <div className="flex items-center gap-1 overflow-x-auto thin-scroll pb-1">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const done = i < activeIndex;
          const active = i === activeIndex;
          return (
            <React.Fragment key={s.key}>
              <div
                className={`flex items-center gap-1.5 px-2.5 h-8 rounded-lg shrink-0 text-xs font-bold whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-signal-500/10 text-signal-600'
                    : done
                    ? 'text-active-500'
                    : 'text-ink-400'
                }`}
              >
                {done ? <Check size={13} /> : <Icon size={13} />}
                <span className="hidden sm:inline">{s.title}</span>
              </div>
              {i < steps.length - 1 && <div className="w-3 md:w-5 h-px bg-ink-900/10 shrink-0" />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

interface NavProps {
  activeIndex: number;
  totalSteps: number;
  onPrev: () => void;
  onNext: () => void;
  /** When false the "পরবর্তী" (Next) button is disabled — e.g. current step invalid. */
  canGoNext?: boolean;
  isLastStep: boolean;
  submitting?: boolean;
  nextLabel?: string;
}

/**
 * Prev / Next (or Submit) control bar — rendered into DesktopModalCard's
 * `footer` slot, so it's pinned to the bottom of the module (viewport-based
 * layout) instead of trailing after the scrollable field content the way a
 * normal in-flow element would. The border/background that used to live on
 * this element is now supplied by that shared footer wrapper instead, so
 * every module's footer looks consistent.
 */
export const StepNavigation: React.FC<NavProps> = ({
  activeIndex,
  totalSteps,
  onPrev,
  onNext,
  canGoNext = true,
  isLastStep,
  submitting,
  nextLabel,
}) => {
  const { t } = useLanguage();
  return (
    <div className="px-4 md:px-8 py-4 flex items-center gap-2.5">
      <button
        type="button"
        onClick={onPrev}
        disabled={activeIndex === 0 || submitting}
        className="h-11 px-4 rounded-xl border border-ink-900/12 text-ink-600 font-bold text-sm flex items-center gap-1.5 hover:bg-ink-900/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft size={16} /> {t('formStepper.prev')}
      </button>

      <div className="flex-1 text-center">
        <p className="text-[11px] font-bold text-ink-400">
          {t('formStepper.stepOf', { current: activeIndex + 1, total: totalSteps })}
        </p>
      </div>

      {!isLastStep ? (
        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext || submitting}
          className="h-11 px-4 rounded-xl bg-signal-500 hover:bg-signal-600 text-white font-bold text-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {nextLabel || t('formStepper.next')} <ChevronRight size={16} />
        </button>
      ) : (
        <button
          type="submit"
          disabled={submitting || !canGoNext}
          className="h-11 px-4 rounded-xl bg-active-500 hover:bg-active-600 text-white font-bold text-sm flex items-center gap-1.5 disabled:opacity-60 transition-colors"
        >
          {submitting ? t('formStepper.creating') : t('formStepper.submit')}
        </button>
      )}
    </div>
  );
};
