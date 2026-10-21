/**
 * Home screen — map with nearby devices, scanning banner, bottom device sheet.
 * Matches the FindTrack home design.
 */

import { useEffect, useState, useCallback } from 'react';
import { Bluetooth, Wifi } from 'lucide-react';
import { MapView } from '../components/MapView';
import { DeviceIcon } from '../components/ui';
import { Shell, type TabId } from '../components/Shell';
import { seedDefaultDevices } from '../lib/store';
import { type Device } from '../lib/ble';
import { rssiToNearby } from '../lib/distance';

interface HomeProps {
  onNavigateToTracking: () => void;
}

// Demo coordinates for markers (scattered around Riverside Park / NYC area)
const DEMO_LOCATIONS: Record<string, [number, number]> = {
  'ble-A42E5C118F23': [40.7829, -73.9654], // JBL Flip 6
  'ble-B86A9D33441A': [40.781, -73.967], // Galaxy S23
  'ble-C47F2A88115E': [40.785, -73.963], // Apple Watch
  'ble-E19B445522AA': [40.779, -73.969], // AirPods Pro
  'ble-F38C1A2299DD': [40.787, -73.961], // JBL Charge 5
};

export default function Home({ onNavigateToTracking }: HomeProps) {
  const [tab, setTab] = useState<TabId>('home');
  const [devices, setDevices] = useState<Device[]>([]);
  const [scanning, setScanning] = useState(false);

  const nearbyCount = devices.filter((d) => rssiToNearby(d.rssi)).length;

  const initialize = useCallback(async () => {
    try {
      await import('../lib/ble').then((m) => m.isBleAvailable());
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Seed default devices on first load
  useEffect(() => {
    if (devices.length === 0) {
      setDevices(seedDefaultDevices());
    }
  }, []);

  const startScan = async () => {
    setScanning(true);
    try {
      const { startScanAndMerge: ssm } = await import('../lib/ble');
      const updated = await ssm((d) => setDevices(d), 10000);
      setDevices(updated);
    } catch {
      // scan failed — keep existing data
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    if (devices.length > 0) {
      void startScan();
    }
  }, [devices.length]);

  return (
    <Shell tab={tab} onTab={setTab}>
      {/* Scanning banner */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 rounded-xl border border-emerald-100 mb-4">
        <div className="relative w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div>
        <Bluetooth size={14} className="text-emerald-600" />
        <span className="text-sm text-emerald-700 font-medium">
          Scanning for devices…
        </span>
        <span className="ml-auto text-xs text-emerald-500">{nearbyCount} devices nearby</span>
      </div>

      {/* Map */}
      <div className="flex-1 min-h-[320px] mb-4 relative">
        <MapView
          markers={devices.map((d) => ({
            id: d.id,
            name: d.name,
            lat: DEMO_LOCATIONS[d.id]?.[0] ?? 40.7829 + (Math.random() - 0.5) * 0.01,
            lng: DEMO_LOCATIONS[d.id]?.[1] ?? -73.9654 + (Math.random() - 0.5) * 0.01,
          }))}
          center={[40.7829, -73.9654]}
          zoom={15}
          height="100%"
        />
        {/* Scan / floating action */}
        <div className="absolute right-4 bottom-4 flex flex-col gap-2 z-20">
          <button
            onClick={startScan}
            disabled={scanning}
            className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-lg active:scale-95 transition"
            aria-label="Scan"
          >
            <Bluetooth size={20} />
          </button>
          <button
            onClick={() => setTab('map')}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-600 shadow-md active:scale-95 transition border border-slate-200"
            aria-label="Map"
          >
            <Wifi size={18} />
          </button>
        </div>
      </div>

      {/* Bottom device sheet (JBL Flip 6 card from design) */}
      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <DeviceIcon deviceType="speaker" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-900">JBL Flip 6</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                Nearby
              </span>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <span>RSSI -78 dBm</span>
              <span className="w-px h-3 bg-slate-300 mx-1"></span>
              <span>2 min ago</span>
            </div>
          </div>
        </div>
        <div className="pt-3 border-t border-slate-100/50">
          <button
            onClick={onNavigateToTracking}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm shadow-lg active:scale-95 transition"
          >
            <Wifi size={16} className="text-emerald-100" />
            Start Tracking
          </button>
        </div>
      </div>
    </Shell>
  );
}
