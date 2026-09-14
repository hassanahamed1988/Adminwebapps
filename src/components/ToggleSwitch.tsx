import React from 'react';

interface Props {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  loading?: boolean;
  title?: string;
}

const ToggleSwitch: React.FC<Props> = ({ checked, onChange, disabled, loading, title }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={title}
      disabled={disabled || loading}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled && !loading) onChange();
      }}
      className={`relative shrink-0 inline-flex items-center h-6 w-11 rounded-full border transition-colors duration-200 ${
        checked
          ? 'bg-active-500 border-active-500'
          : 'bg-ink-900/15 border-ink-900/15'
      } ${disabled || loading ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-[18px] w-[18px] rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
          checked ? 'translate-x-[22px]' : 'translate-x-[3px]'
        }`}
      />
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="h-3 w-3 rounded-full border-2 border-white/70 border-t-transparent animate-spin" />
        </span>
      )}
    </button>
  );
};

export default ToggleSwitch;
