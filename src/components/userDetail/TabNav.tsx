import React, { useEffect, useRef, useState } from 'react';
import { LucideIcon } from 'lucide-react';

export interface TabItem {
  key: string;
  label: string;
  icon: LucideIcon;
}

interface Props {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
}

/**
 * Underline slides to the active tab's measured position/width on every
 * change — measured via refs rather than hard-coded percentages so it stays
 * correct regardless of how many tabs are visible (Subscription is hidden
 * for ADMIN accounts, see UserDetail.tsx) or how long each label is in the
 * active language.
 */
const TabNav: React.FC<Props> = ({ tabs, active, onChange }) => {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  useEffect(() => {
    const el = tabRefs.current[active];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [active, tabs.length]);

  return (
    <div className="relative border-b border-ink-900/8 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-1 px-4 md:px-8 min-w-max">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              ref={(el) => (tabRefs.current[tab.key] = el)}
              onClick={() => onChange(tab.key)}
              className={`flex items-center gap-1.5 px-3.5 py-3 text-xs font-bold whitespace-nowrap transition-colors ${
                isActive ? 'text-signal-600' : 'text-ink-400 hover:text-ink-900'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        className="absolute bottom-0 h-[2.5px] bg-signal-500 rounded-full transition-all duration-300 ease-out"
        style={{ left: indicator.left, width: indicator.width }}
      />
    </div>
  );
};

export default TabNav;
