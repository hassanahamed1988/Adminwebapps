import React, { useId, useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { FieldAccent, ACCENT_RING, ACCENT_LABEL } from '../styles/controls';

interface Props {
  label: string;
  icon: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  error?: string;
  mono?: boolean;
  accent?: FieldAccent;
  autoFocus?: boolean;
  /** extra content pinned to the right, e.g. a show/hide-password toggle */
  rightElement?: React.ReactNode;
}

/**
 * Dynamic Placeholder Rule:
 *   - Default state  → placeholder=" " (single space keeps the floating-label
 *     peer-[:not(:placeholder-shown)] selectors working correctly)
 *   - On focus       → placeholder="Enter <label>" (auto-generated, no
 *     manual placeholder prop needed — Developer just passes `label`)
 *   - On blur        → reverts to " " so the label floats back down when
 *     the field is empty
 *   - While typing   → the browser hides the placeholder naturally; the
 *     floating label stays elevated via peer-[:not(:placeholder-shown)]
 *
 * This logic lives entirely inside the component, so every new FloatingInput
 * automatically gets the correct placeholder without any extra prop.
 */
function buildPlaceholder(label: string): string {
  // Strip the trailing asterisk / required marker if it was embedded in label
  const clean = label.replace(/\s*\*$/, '').trim();
  return `Enter ${clean}`;
}

const FloatingInput: React.FC<Props> = ({
  label,
  icon: Icon,
  value,
  onChange,
  type = 'text',
  required,
  disabled,
  readOnly,
  error,
  mono,
  accent = 'signal',
  autoFocus,
  rightElement,
}) => {
  const id = useId();

  // Dynamic placeholder: empty string used as "not focused" sentinel so we
  // can switch between " " (unfocused) and the generated hint (focused).
  const [isFocused, setIsFocused] = useState(false);

  // When focused show the generated hint; otherwise use a single space so
  // the CSS peer-[:not(:placeholder-shown)] selector keeps working.
  const dynamicPlaceholder = isFocused ? buildPlaceholder(label) : ' ';

  return (
    <div>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          disabled={disabled}
          readOnly={readOnly}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          placeholder={dynamicPlaceholder}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`peer w-full h-11 pl-10 ${rightElement ? 'pr-11' : 'pr-3.5'} rounded-lg border bg-surface text-sm font-medium text-ink-900 placeholder:text-ink-400/70 placeholder:font-normal focus:outline-none focus:ring-2 disabled:bg-ink-900/[0.03] disabled:text-ink-600 transition-[padding-left,color,background-color,border-color,box-shadow] duration-300 ease-out focus:pl-3 focus:duration-0 ${
            error ? 'border-blocked-500/50 ring-1 ring-blocked-500/20' : `border-ink-900/12 ${ACCENT_RING[accent]}`
          } ${mono ? 'font-mono' : ''}`}
        />

        {/* Leading icon: comes after the peer input in the DOM (required
            for peer-* selectors to match) but is visually positioned to its
            left. Hides instantly the moment the field is focused — and
            stays hidden for the whole session, typed text or not — then
            fades back in smoothly only once the field is blurred. The
            input's own left padding (above) mirrors this exact same
            focus/blur timing, so typing always runs flush at the edge the
            icon vacated, then eases back right only once you click away. */}
        <Icon
          size={16}
          aria-hidden
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none opacity-100 transition-opacity duration-300 ease-out peer-focus:opacity-0 peer-focus:duration-0"
        />

        <label
          htmlFor={id}
          className={`absolute left-10 top-1/2 -translate-y-1/2 text-sm text-ink-400 pointer-events-none transition-all duration-200 ease-out
            peer-focus:left-3 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-bold peer-focus:bg-surface peer-focus:px-1 ${ACCENT_LABEL[accent]}
            peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:bg-surface peer-[:not(:placeholder-shown)]:px-1 peer-[:not(:placeholder-shown)]:text-ink-600
          `}
        >
          {label} {required && <span className="text-blocked-500">*</span>}
        </label>

        {rightElement && <div className="absolute right-2.5 top-1/2 -translate-y-1/2">{rightElement}</div>}
      </div>
      {error && <p className="text-blocked-500 text-xs font-semibold mt-1">{error}</p>}
    </div>
  );
};

export default FloatingInput;
