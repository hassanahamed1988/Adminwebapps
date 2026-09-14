import React, { useEffect, useState } from 'react';
import { Smartphone, Monitor, Tablet, Ban, RadioTower } from 'lucide-react';
import { getSubcollection, deleteDocFrom } from '../../services/firebase';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { collectionFor } from '../../contexts/UsersContext';
import { formatDateTime } from '../../utils/dateUtils';
import { User } from '../../types';

interface DeviceRecord {
  id: string;
  deviceName?: string;
  deviceId?: string;
  platform?: string;
  appOrBrowser?: string;
  firstLogin?: string;
  lastActive?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

interface Props {
  user: User;
}

function deviceIcon(platform?: string) {
  const p = (platform || '').toLowerCase();
  if (p.includes('tablet') || p.includes('ipad')) return Tablet;
  if (p.includes('android') || p.includes('ios') || p.includes('mobile')) return Smartphone;
  return Monitor;
}

const DevicesTab: React.FC<Props> = ({ user }) => {
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [terminatingId, setTerminatingId] = useState<string | null>(null);

  const subPath = `${collectionFor(user)}/${user.id}/devices`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSubcollection(subPath)
      .then((docs) => {
        if (!cancelled) setDevices(docs as DeviceRecord[]);
      })
      .catch(() => {
        if (!cancelled) setDevices([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const handleTerminate = async (deviceId: string) => {
    setTerminatingId(deviceId);
    try {
      await deleteDocFrom(subPath, deviceId);
      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
      showToast(t('devices.terminated'), 'success');
    } catch (e: any) {
      showToast(e?.message || t('userDetail.actionFailed'), 'error');
    } finally {
      setTerminatingId(null);
    }
  };

  return (
    <div className="rise-in">
      <h3 className="font-display font-extrabold text-sm text-ink-900 mb-1">{t('devices.title')}</h3>
      <p className="text-xs text-ink-500 mb-4">{t('devices.subtitle')}</p>

      {loading ? (
        <div className="text-center py-10 text-ink-400 text-sm font-mono">{t('common.loading')}</div>
      ) : devices.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-dashed border-ink-900/15 p-8 text-center">
          <RadioTower size={22} className="mx-auto text-ink-400 mb-2.5" />
          <p className="text-sm font-semibold text-ink-600">{t('devices.empty')}</p>
          <p className="text-xs text-ink-400 mt-1 max-w-sm mx-auto">{t('devices.emptyHint')}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {devices.map((d) => {
            const Icon = deviceIcon(d.platform);
            const active = d.status !== 'INACTIVE';
            return (
              <div
                key={d.id}
                className="bg-surface rounded-2xl border border-ink-900/8 card-shadow p-4 flex items-center gap-3.5"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    active ? 'bg-active-500/10 text-active-500' : 'bg-ink-900/5 text-ink-400'
                  }`}
                >
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-ink-900 truncate">{d.deviceName || t('devices.unknownDevice')}</p>
                    {active && (
                      <span className="text-[10px] font-bold text-active-500 bg-active-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                        {t('devices.active')}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-ink-400 font-mono truncate mt-0.5">
                    {[d.platform, d.appOrBrowser, d.deviceId].filter(Boolean).join(' · ')}
                  </p>
                  <p className="text-[11px] text-ink-400 mt-0.5">
                    {t('devices.lastActive')}: {d.lastActive ? formatDateTime(d.lastActive) : '—'}
                  </p>
                </div>
                <button
                  onClick={() => handleTerminate(d.id)}
                  disabled={terminatingId === d.id}
                  title={t('devices.terminate')}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-400 hover:text-blocked-500 hover:bg-blocked-500/10 transition-colors shrink-0 disabled:opacity-50"
                >
                  <Ban size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DevicesTab;
