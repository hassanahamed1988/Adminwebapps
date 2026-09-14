import React from 'react';
import { useNavigate } from 'react-router-dom';

interface Props {
  /** Scrollable main content — the ONLY part of the module that ever
   *  overflows/scrolls. Everything else (header, footer) stays fixed in
   *  place regardless of how tall this content gets. */
  children: React.ReactNode;
  /** Pinned top region: Topbar, plus any secondary nav that belongs with
   *  it (StepTracker for the registration forms, profile card + TabNav
   *  for the View module). Never scrolls. */
  header?: React.ReactNode;
  /** Pinned bottom region: Prev/Next/Submit controls. Never scrolls. */
  footer?: React.ReactNode;
  /** Route to return to when the pop-up is closed. Defaults to the dashboard. */
  closeTo?: string;
  /** Render the outer shell as a <form> instead of a <div> so a footer
   *  submit button (type="submit") still works even though it now lives
   *  outside the body's own markup — pass the form's onSubmit/onKeyDown
   *  etc. via `formProps`. */
  as?: 'div' | 'form';
  formProps?: React.FormHTMLAttributes<HTMLFormElement>;
  /** Extra classes for the scrollable body wrapper (e.g. max-width/centering). */
  bodyClassName?: string;
}

/**
 * ─────────────────────────────────────────────────────────────────────
 * GLOBAL layout-height & scrolling shell — reused, unmodified, by every
 * Registration form and every View-module popup (Personal Information,
 * Access Permission, Devices, Login History, Security & Password,
 * Subscription, Payment History, etc.). Do not fork per-page copies of
 * this logic — add a new header/footer/body slot usage instead.
 *
 * Rules this component enforces everywhere it's used:
 *  1. The module always takes a viewport-based height — it never grows
 *     taller than the screen just because its content is long.
 *  2. `header` and `footer` are rendered in fixed (`shrink-0`) regions.
 *     Only the middle `children` region scrolls when content overflows.
 *  3. When content is short, no leftover blank space is forced — the
 *     body simply doesn't scroll, and the card itself doesn't shrink to
 *     fake extra height either since header/footer already size to
 *     their own content.
 *  4. The same fixed-viewport + internal-scroll behavior applies at
 *     every breakpoint (mobile/tablet/desktop) — only the presentation
 *     changes (full-screen panel on mobile, centered card on desktop).
 * ───────────────────────────────────────────────────────────────────── */
const DesktopModalCard: React.FC<Props> = ({
  children,
  header,
  footer,
  closeTo = '/',
  as = 'div',
  formProps,
  bodyClassName = '',
}) => {
  const navigate = useNavigate();
  const close = () => navigate(closeTo);

  const cardClassName =
    'relative flex flex-col w-full h-[100dvh] md:h-auto md:max-h-[85vh] md:w-full md:max-w-3xl bg-surface md:rounded-2xl md:shadow-2xl overflow-hidden modal-pop-in';

  const cardContent = (
    <>
      {/* Fixed header — Topbar/step-tracker/tab-nav/profile summary, never scrolls */}
      {header && <div className="shrink-0">{header}</div>}

      {/* The one scrollable region. min-h-0 is required alongside flex-1 so
          this actually shrinks below its content size instead of forcing
          the whole card taller (the classic flexbox overflow trap). */}
      <div className={`flex-1 min-h-0 overflow-y-auto thin-scroll ${bodyClassName}`}>{children}</div>

      {/* Fixed footer — Prev/Next/Submit controls, never scrolls */}
      {footer && <div className="shrink-0 border-t border-ink-900/8 bg-surface">{footer}</div>}
    </>
  );

  return (
    <div className="fixed inset-0 z-40 flex md:items-center md:justify-center md:p-6">
      {/* Backdrop — desktop only, click to close */}
      <div
        className="hidden md:block md:absolute md:inset-0 md:bg-ink-900/40 md:backdrop-blur-sm"
        onClick={close}
      />

      {/* Card / full-screen panel */}
      {as === 'form' ? (
        <form {...formProps} className={cardClassName}>
          {cardContent}
        </form>
      ) : (
        <div className={cardClassName}>{cardContent}</div>
      )}
    </div>
  );
};

export default DesktopModalCard;
