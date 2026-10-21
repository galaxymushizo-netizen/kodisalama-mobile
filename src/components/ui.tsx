/**
 * Shared UI primitives for FindTrack.
 */

import { type Device } from '../lib/ble';
import { formatDistance, formatRssi, rssiToSignalLabel, rssiToNearby } from '../lib/distance';

export function EmptyState({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
        <Icon size={32} className="text-emerald-500" strokeWidth={2} />
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

export function DeviceIcon({ deviceType }: { deviceType: string }) {
  const getIcon = () => {
    switch (deviceType) {
      case 'speaker':
        return '🔊';
      case 'phone':
        return '📱';
      case 'watch':
        return '⌚';
      case 'earbuds':
        return '🎧';
      case 'tablet':
        return '📲';
      default:
        return '📟';
    }
  };
  return (
    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-xl">
      {getIcon()}
    </div>
  );
}

export function DeviceCard({ device, onPress }: { device: Device; onPress?: () => void }) {
  const signal = rssiToSignalLabel(device.rssi);
  const nearby = rssiToNearby(device.rssi);
  const minsAgo = Math.max(0, Math.round((Date.now() - device.lastSeen) / 60000));

  return (
    <button
      onClick={onPress}
      className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm hover:bg-emerald-50 active:scale-95 transition-all"
    >
      <DeviceIcon deviceType={device.deviceType} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-900 truncate">{device.name}</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
            {nearby ? 'Nearby' : 'Far'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500">
          <span>{formatRssi(device.rssi)}</span>
          <span className="w-px h-2 bg-slate-300 mx-1"></span>
          <span>{formatDistance(device.distance)}</span>
          <span className="w-px h-2 bg-slate-300 mx-1"></span>
          <span>{minsAgo} min ago</span>
        </div>
      </div>
      <span className="text-xs font-medium text-emerald-600">{signal.label}</span>
    </button>
  );
}

export function SignalGauge({ rssi }: { rssi: number }) {
  const signal = rssiToSignalLabel(rssi);
  const pct = Math.min(100, Math.max(0, ((rssi + 100) / 60) * 100));

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <span className="text-xs text-slate-500">RSSI</span>
        <span className="text-2xl font-bold text-slate-900">{formatRssi(rssi)}</span>
        <span className={`text-xs font-bold ${signal.color}`}>{signal.label}</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
