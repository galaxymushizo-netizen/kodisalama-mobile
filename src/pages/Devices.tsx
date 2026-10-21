/**
 * Devices screen — list of nearby Bluetooth devices with RSSI, distance, status.
 */

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { DeviceCard, EmptyState } from '../components/ui';
import { Shell, type TabId } from '../components/Shell';
import { startScanAndMerge } from '../lib/ble';
import { loadDevices } from '../lib/store';
import { type Device } from '../lib/ble';

type Filter = 'all' | 'nearby' | 'saved';

interface DevicesProps {
  onNavigateToTracking: (id: string) => void;
}

export default function Devices({ onNavigateToTracking }: DevicesProps) {
  const [tab, setTab] = useState<TabId>('devices');
  const [filter, setFilter] = useState<Filter>('all');
  const [devices, setDevices] = useState<Device[]>([]);
  const [scanning, setScanning] = useState(false);

  const refresh = useCallback(async () => {
    setScanning(true);
    try {
      const updated = await startScanAndMerge((d) => setDevices(d), 10000);
      setDevices(updated);
    } catch {
      // keep existing
    } finally {
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    const existing = loadDevices();
    if (existing.length > 0) {
      setDevices(existing);
    }
    void refresh();
  }, [refresh]);

  const counts = {
    all: devices.length,
    nearby: devices.filter((d) => d.nearby).length,
    saved: 0,
  };

  const filtered = devices.filter((d) => {
    if (filter === 'nearby') return d.nearby;
    if (filter === 'saved') return false;
    return true;
  });

  return (
    <Shell tab={tab} onTab={setTab}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Devices</h2>
          <p className="text-xs text-slate-500">Nearby Bluetooth devices</p>
        </div>
        <button
          onClick={refresh}
          disabled={scanning}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 active:scale-95 transition"
        >
          {scanning ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {scanning ? 'Scanning…' : 'Refresh'}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'all' as const, label: `All (${counts.all})` },
          { key: 'nearby' as const, label: `Nearby (${counts.nearby})` },
          { key: 'saved' as const, label: `Saved (${counts.saved})` },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border ${
              filter === f.key
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title="No devices found"
          subtitle="Make sure Bluetooth is on and devices are nearby, then refresh to scan."
        />
      ) : (
        <div className="space-y-1">
          {filtered.map((d) => (
            <DeviceCard
              key={d.id}
              device={d}
              onPress={() => onNavigateToTracking(d.id)}
            />
          ))}
        </div>
      )}
    </Shell>
  );
}
