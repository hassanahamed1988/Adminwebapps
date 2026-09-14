/**
 * Standard sizing for every form control in the app (text input, select,
 * search bar). The search bar set the baseline (44px / h-11) — everything
 * else must match it.
 *
 * For any NEW input/select, use <FloatingInput> / <FloatingSelect> from
 * src/components/ (see the "Floating-label standard" block below) — don't
 * write a raw <input>/<select> by hand. The raw class strings in this file
 * (inputCls, selectCls, inputBaseCls, inputWithIconCls) are kept only for
 * reference/back-compat; every field in the app already uses the floating
 * components. If the standard height ever needs to change, change
 * CONTROL_HEIGHT here and it applies everywhere.
 *
 * Standard corner radius for every field is 8px (Tailwind `rounded-lg`).
 * This is baked into inputBaseCls/inputWithIconCls here and into
 * <FloatingInput>/<FloatingSelect> directly — any new field must use one
 * of those instead of a hand-rolled radius so it stays 8px automatically.
 */

export const CONTROL_HEIGHT = 'h-11'; // 44px — matches SearchInput
export const CONTROL_RADIUS = 'rounded-lg'; // 8px — standard corner radius for every field

// Structural base only: height, padding, radius, border, text sizing.
// No focus-ring color baked in, so contexts that need a different accent
// (e.g. a destructive confirm dialog) can still share the standard size.
export const inputBaseCls =
  'w-full h-11 px-3.5 rounded-lg border border-ink-900/12 bg-surface text-sm font-medium text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 disabled:bg-ink-900/[0.03] disabled:text-ink-400 transition-colors';

export const inputCls = `${inputBaseCls} focus:ring-signal-500/30 focus:border-signal-500/40`;

// Selects render the same as text inputs, so they share the class.
export const selectCls = inputCls;

// Icon-prefixed inputs — superseded by <FloatingInput> (below) for new
// fields; kept only in case a one-off non-floating icon input is ever needed.
export const inputWithIconCls =
  'w-full h-11 pl-10 pr-4 rounded-lg bg-surface border border-ink-900/10 text-sm font-medium text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-signal-500/30 focus:border-signal-500/40';

/**
 * Floating-label standard (v2): every text/select field in the app is a
 * <FloatingInput>/<FloatingSelect> — a name-matched leading icon, plus a
 * label that sits inline until the field is focused or filled, then floats
 * up onto the border line. Build new fields with those components (in
 * src/components/) instead of raw <input>/<select> so every box keeps this
 * exact behavior automatically:
 *   - label floats up (small, on the border) on focus, or whenever the
 *     field has a value — drops back only when blurred while empty.
 *   - the leading icon hides *instantly* the moment you focus the field —
 *     and stays hidden for the whole time you're focused in it, typed or
 *     not — then fades back in *smoothly* only once you blur back out.
 *   - the typed text's own left inset mirrors that exact same timing: it
 *     snaps flush to the edge the instant you focus, then eases back
 *     right, in step with the icon, only once you click away.
 * Accent colors (signal/active/blocked) are shared here so every field
 * that needs a non-default ring (e.g. a destructive confirm box) still
 * matches the same shape/timing.
 */
export type FieldAccent = 'signal' | 'active' | 'blocked';

// Applied directly on the <input>/<select> itself (which is the "peer"),
// so this must use plain `focus:` — `peer-focus:` only works on elements
// *after* the peer in the DOM (e.g. the label), never on the peer itself.
export const ACCENT_RING: Record<FieldAccent, string> = {
  signal: 'focus:ring-signal-500/30 focus:border-signal-500/50',
  active: 'focus:ring-active-500/30 focus:border-active-500/50',
  blocked: 'focus:ring-blocked-500/30 focus:border-blocked-500/50',
};

// Applied on the <label> (a sibling after the peer), so peer-focus: is
// correct here.
export const ACCENT_LABEL: Record<FieldAccent, string> = {
  signal: 'peer-focus:text-signal-600',
  active: 'peer-focus:text-active-500',
  blocked: 'peer-focus:text-blocked-500',
};
