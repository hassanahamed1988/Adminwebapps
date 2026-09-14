import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Server,
  Globe,
  RefreshCw,
  Activity,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Check,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import Topbar from '../components/Topbar';
import FloatingInput from '../components/FloatingInput';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import {
  fetchBackendUrl,
  saveBackendUrl,
  clearBackendUrl,
  testBackendHealth,
} from '../services/backendSettings';

const ServerSettings: React.FC = () => {
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();
  const { t } = useLanguage();
  const { showToast } = useToast();

  // Backend / OCR URL state
  const [backendUrl, setBackendUrl] = useState('');
  const [activeUrl, setActiveUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  // Load configured backend URL on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const url = await fetchBackendUrl();
      if (mounted) {
        setBackendUrl(url);
        setActiveUrl(url);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSaveUrl = async () => {
    const trimmed = backendUrl.trim();
    if (trimmed && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      const err = t('settings.backendUrlInvalid');
      setUrlError(err);
      showToast(err, 'error');
      return;
    }

    setUrlError('');
    setSaving(true);
    setTestResult(null);

    try {
      if (trimmed) {
        const saved = await saveBackendUrl(trimmed);
        setActiveUrl(saved);
        setBackendUrl(saved);
      } else {
        await clearBackendUrl();
        setActiveUrl('');
        setBackendUrl('');
      }
      showToast(t('settings.backendUrlSaved'), 'success');
    } catch (err: any) {
      console.error('Failed to save backend URL:', err);
      showToast(err?.message || 'Failed to save configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClearUrl = async () => {
    setSaving(true);
    setUrlError('');
    setTestResult(null);

    try {
      await clearBackendUrl();
      setActiveUrl('');
      setBackendUrl('');
      showToast(t('settings.backendUrlCleared'), 'info');
    } catch (err: any) {
      console.error('Failed to clear backend URL:', err);
      showToast(err?.message || 'Failed to clear configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    const urlToTest = backendUrl.trim() || activeUrl.trim();
    if (!urlToTest) {
      setUrlError(t('settings.backendUrlInvalid'));
      return;
    }

    setTesting(true);
    setTestResult(null);

    const res = await testBackendHealth(urlToTest);
    setTestResult(res);
    setTesting(false);

    if (res.success) {
      showToast(`Connection successful! (${res.latencyMs || 0}ms)`, 'success');
    } else {
      showToast(res.message, 'error');
    }
  };

  return (
    <div>
      <Topbar
        title={t('serverSettings.title') || 'Server Settings'}
        subtitle={t('serverSettings.subtitle') || 'Configure Backend & OCR server for FleetPro mobile app'}
        onMenuClick={openMobileNav}
      />

      <div className="px-4 md:px-8 py-6 max-w-2xl space-y-5">
        {/* Global OCR & Backend API Configuration card */}
        <div className="bg-surface rounded-2xl border border-ink-900/8 card-shadow p-5">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-signal-500/10 text-signal-600 shrink-0">
                <Server size={18} />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-sm text-ink-900">
                  {t('settings.ocrBackendTitle')}
                </h3>
                <p className="text-[11px] text-ink-400 font-medium">
                  Firestore: <code className="bg-ink-900/5 px-1.5 py-0.5 rounded text-ink-600">settings/backend</code>
                </p>
              </div>
            </div>

            {/* Active Status Badge */}
            {activeUrl ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 text-[11px] font-semibold border border-emerald-500/20 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{t('settings.currentActiveUrl')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ink-900/5 text-ink-500 text-[11px] font-medium border border-ink-900/8 shrink-0">
                <span className="w-2 h-2 rounded-full bg-ink-400" />
                <span>{t('settings.notConfigured')}</span>
              </div>
            )}
          </div>

          <p className="text-xs text-ink-500 mb-4 mt-2 leading-relaxed">
            {t('settings.ocrBackendHint')}
          </p>

          {/* Current URL preview banner if configured */}
          {activeUrl && (
            <div className="mb-4 p-3 rounded-xl bg-ink-900/4 border border-ink-900/8 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Globe size={14} className="text-signal-600 shrink-0" />
                <span className="font-mono text-ink-700 truncate">{activeUrl}</span>
              </div>
              <a
                href={activeUrl}
                target="_blank"
                rel="noreferrer"
                className="text-signal-600 hover:text-signal-700 flex items-center gap-1 shrink-0 font-medium hover:underline text-[11px]"
              >
                <span>Open</span>
                <ExternalLink size={12} />
              </a>
            </div>
          )}

          {/* URL Input */}
          <div className="space-y-2">
            <FloatingInput
              label={t('settings.backendUrlLabel')}
              icon={Globe}
              value={backendUrl}
              onChange={(v) => {
                setBackendUrl(v);
                if (urlError) setUrlError('');
              }}
              placeholder={t('settings.backendUrlPlaceholder')}
              error={urlError}
              mono
              disabled={loading || saving}
            />

            <p className="text-[11px] text-ink-400 px-1 leading-normal">
              {t('settings.backendUrlHelp')}
            </p>
          </div>

          {/* Connectivity Test Result Feedback */}
          {testResult && (
            <div
              className={`mt-3 p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-800'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{testResult.message}</p>
                {testResult.latencyMs !== undefined && (
                  <p className="text-[11px] opacity-80 mt-0.5">Latency: {testResult.latencyMs}ms</p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 mt-5 pt-4 border-t border-ink-900/8">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || saving || (!backendUrl.trim() && !activeUrl.trim())}
              className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl border border-ink-900/15 text-ink-700 text-xs font-bold hover:bg-ink-900/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Activity size={14} className={testing ? 'animate-spin text-signal-600' : ''} />
              <span>{testing ? 'Pinging...' : t('settings.testConnection')}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearUrl}
                disabled={saving || loading || (!activeUrl && !backendUrl)}
                className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl border border-rose-500/20 text-rose-600 hover:bg-rose-500/10 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw size={13} className={saving ? 'animate-spin' : ''} />
                <span>{t('settings.clearUrl')}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveUrl}
                disabled={saving || loading || (backendUrl.trim() === activeUrl && !urlError)}
                className="inline-flex items-center gap-1.5 h-10 px-5 rounded-xl bg-signal-500 hover:bg-signal-600 text-white text-xs font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Check size={14} />
                <span>{saving ? 'Saving...' : t('settings.saveUrl')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Real-time Architecture Notice */}
        <div className="bg-surface rounded-2xl border border-ink-900/8 card-shadow p-5 flex items-start gap-3.5 text-xs text-ink-600">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <Cpu size={16} />
          </div>
          <div className="space-y-1 leading-relaxed">
            <h4 className="font-bold text-ink-900">Real-Time Mobile Synchronization</h4>
            <p className="text-ink-500 text-[11px]">
              Connected FleetPro mobile apps continuously observe <code className="bg-ink-900/5 px-1 py-0.5 rounded text-ink-700">settings/backend</code> in Firestore. Any change saved here updates all active drivers and user devices immediately without requiring an APK update.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerSettings;
