import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Languages, Check, ListChecks, ChevronRight } from 'lucide-react';
import Topbar from '../components/Topbar';
import { useLanguage, LANGUAGE_META, Language } from '../contexts/LanguageContext';

const Settings: React.FC = () => {
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();
  const { language, setLanguage, t } = useLanguage();

  return (
    <div>
      <Topbar title={t('settings.title')} subtitle={t('settings.subtitle')} onMenuClick={openMobileNav} />

      <div className="px-4 md:px-8 py-6 max-w-2xl space-y-5">
        {/* Language card */}
        <div className="bg-surface rounded-2xl border border-ink-900/8 card-shadow p-5">
          <div className="flex items-center gap-2.5 mb-1">
            <Languages size={17} className="text-signal-600" />
            <h3 className="font-display font-extrabold text-sm text-ink-900">{t('settings.language')}</h3>
          </div>
          <p className="text-xs text-ink-500 mb-4">{t('settings.languageHint')}</p>

          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(LANGUAGE_META) as Language[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLanguage(code)}
                className={`flex items-center justify-between gap-2 h-12 px-4 rounded-xl border font-bold text-sm transition-colors ${
                  language === code
                    ? 'border-signal-500 bg-signal-500/10 text-signal-600'
                    : 'border-ink-900/12 text-ink-600 hover:bg-ink-900/5'
                }`}
              >
                {/* Each language's own native name — so it's always
                    legible to someone picking it out, even if the
                    currently-active language is a different script. */}
                {LANGUAGE_META[code].nativeName}
                {language === code && <Check size={16} />}
              </button>
            ))}
          </div>
        </div>

        {/* Link to the existing Dropdown Settings page */}
        <Link
          to="/dropdown-settings"
          className="flex items-center gap-3.5 bg-surface rounded-2xl border border-ink-900/8 card-shadow p-5 hover:border-signal-500/40 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-signal-500/10 text-signal-600 shrink-0">
            <ListChecks size={19} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-extrabold text-sm text-ink-900">{t('settings.dropdownSettingsCard')}</h3>
            <p className="text-xs text-ink-500 mt-0.5">{t('settings.dropdownSettingsCardHint')}</p>
          </div>
          <ChevronRight size={18} className="text-ink-400 shrink-0" />
        </Link>
      </div>
    </div>
  );
};

export default Settings;
