/**
 * Tracking screen — live signal strength gauge, distance, and stop tracking.
 */

import { useEffect, useState } from 'react';
import { ChevronLeft, Wifi } from 'lucide-react';
import { Shell, type TabId } from '../components/Shell';
import { loadDevices } from '../lib/store';
import { type Device } from '../lib/ble';

interface TrackingProps {
  deviceId?: string;
  onBack: () => void;
}

export default function Tracking({ deviceId, onBack }: TrackingProps) {
  const [tab, setTab] = useState<TabId>('home');
  const [device, setDevice] = useState<Device | null>(null);
  const [tracking, setTracking] = useState(true);
  const [rssi, setRssi] = useState(-78);
  const [distance, setDistance] = useState(12);

  // Simulate live signal fluctuations while tracking
  useEffect(() => {
    if (!tracking) return;
    const iv = setInterval(() => {
      setRssi((prev) => {
        const jitter = (Math.random() - 0.5) * 6;
        const next = Math.min(-45, Math.max(-95, prev + jitter));
        return next;
      });
      setDistance((d) => Math.max(1, Math.round(d + (Math.random() - 0.5) * 2)));
    }, 2500);
    return () => clearInterval(iv);
  }, [tracking]);

  useEffect(() => {
    const devices = loadDevices();
    const targetId = deviceId ?? 'ble-A42E5C118F23';
    const d = devices.find((x) => x.id === targetId) ?? null;
    setDevice(d);
    if (d) {
      setRssi(d.rssi);
      setDistance(d.distance);
    }
  }, [deviceId]);

  if (!device) {
    return (
      <Shell tab={tab} onTab={setTab}>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Wifi size={48} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900">Device not found</h3>
        </div>
      </Shell>
    );
  }

  return (
    <Shell tab={tab} onTab={setTab}>
      <header className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm font-semibold text-emerald-700 active:scale-95 transition"
        >
          <ChevronLeft size={16} />
          Devices
        </button>
        <div className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
          Nearby
        </div>
      </header>

      {/* Big circular signal indicator */}
      <div className="relative flex flex-col items-center justify-center mb-6">
        <div className="relative w-48 h-48">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              stroke="#e5e7eb"
              strokeWidth="10"
              fill="none"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              stroke="#16a34a"
              strokeWidth="10"
              fill="none"
              strokeDasharray="35 88"
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Wifi size={32} className="text-emerald-500 mb-1" />
            <span className="text-2xl font-bold text-slate-900">{rssi} dBm</span>
          </div>
        </div>
        <div className="mt-4 text-sm text-slate-500">
          Signal getting stronger — You're getting closer.
        </div>
      </div>

      <div className="space-y-4">
        <div className="px-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tracking</span>
            <span className="text-xs font-medium text-emerald-600">{device.name}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-300 via-emerald-500 to-emerald-600 transition-all duration-700"
              style={{ width: '75%' }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 uppercase tracking-wide">RSSI</span>
            <span className="text-xl font-bold text-slate-900">{rssi} dBm</span>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-slate-500 uppercase tracking-wide">Distance (approx.)</span>
            <span className="text-xl font-bold text-slate-900">~{distance} m</span>
          </div>
        </div>

        <div className="px-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="text-slate-400">•</span>
            <span>Last seen</span>
            <span className="font-medium text-slate-900">Today, 9:37 AM</span>
          </div>
        </div>

        <button
          onClick={() => setTracking(false)}
          className="w-full mt-6 py-3.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 active:bg-slate-50 transition"
        >
          Stop Tracking
        </button>
      </div>
    </Shell>
  );
}
