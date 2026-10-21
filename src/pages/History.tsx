/**
 * History screen — recent device locations with timestamps and signal data.
 */

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { Shell, type TabId } from '../components/Shell';
import { EmptyState, DeviceIcon } from '../components/ui';
import { loadHistory, addHistoryEntry } from '../lib/store';
import { type DeviceHistory } from '../lib/ble';
import { formatRssi, formatDistance } from '../lib/distance';

export default function History() {
  const [tab, setTab] = useState<TabId>('history');
  const [history, setHistory] = useState<DeviceHistory[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
    const h = loadHistory();
    if (h.length === 0) {
      const now = Date.now();
      const seed: DeviceHistory[] = [
        {
          id: 'h-1',
          deviceId: 'ble-A42E5C118F23',
          deviceName: 'JBL Flip 6',
          deviceType: 'speaker',
          rssi: -78,
          distance: 12,
          latitude: 40.7829,
          longitude: -73.9654,
          address: 'Riverside Park, New York, NY',
          timestamp: now - 120000,
        },
        {
          id: 'h-2',
          deviceId: 'ble-B86A9D33441A',
          deviceName: 'Galaxy S23',
          deviceType: 'phone',
          rssi: -65,
          distance: 4,
          latitude: 40.781,
          longitude: -73.967,
          address: 'Central Park, NY',
          timestamp: now - 3600000,
        },
        {
          id: 'h-3',
          deviceId: 'ble-C47F2A88115E',
          deviceName: 'Apple Watch',
          deviceType: 'watch',
          rssi: -92,
          distance: 28,
          latitude: 40.785,
          longitude: -73.963,
          address: '5th Ave, NY',
          timestamp: now - 86400000,
        },
        {
          id: 'h-4',
          deviceId: 'ble-E19B445522AA',
          deviceName: 'AirPods Pro',
          deviceType: 'earbuds',
          rssi: -90,
          distance: 35,
          latitude: 40.779,
          longitude: -73.969,
          address: 'Times Square, NY',
          timestamp: now - 172800000,
        },
        {
          id: 'h-5',
          deviceId: 'ble-F38C1A2299DD',
          deviceName: 'JBL Charge 5',
          deviceType: 'speaker',
          rssi: -102,
          distance: 72,
          latitude: 40.787,
          longitude: -73.961,
          address: 'Hudson River Park, NY',
          timestamp: now - 259200000,
        },
      ];
      seed.forEach((e) => addHistoryEntry(e));
      setHistory(seed);
    }
  }, []);

  const sorted = [...history].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <Shell tab={tab} onTab={setTab}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold text-slate-900">History</h2>
      </div>
      <p className="text-xs text-slate-500 mb-6">Recent device locations</p>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No history yet"
          subtitle="Device locations will appear here once you start tracking."
        />
      ) : (
        <div className="space-y-1">
          {sorted.map((entry) => {
            const minsAgo = Math.max(0, Math.round((Date.now() - entry.timestamp) / 60000));
            const timeAgo = minsAgo < 60 ? `${minsAgo} min ago` : `${Math.round(minsAgo / 60)} h ago`;
            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm"
              >
                <DeviceIcon deviceType={entry.deviceType} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 truncate">{entry.deviceName}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {formatRssi(entry.rssi)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <span>{formatDistance(entry.distance)}</span>
                    <span className="w-px h-2 bg-slate-300 mx-1"></span>
                    <span>{timeAgo}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 truncate">{entry.address}</div>
                </div>
                <span className="text-slate-400">•</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom info card from design */}
      <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="text-emerald-500 mt-0.5">🕒</span>
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-900">Keep your device nearby</div>
            <div className="mt-1 text-sm text-slate-600 leading-relaxed">
              We'll save the last known location when the device disconnects.
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
