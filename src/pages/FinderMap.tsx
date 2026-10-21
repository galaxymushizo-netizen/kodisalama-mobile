/**
 * Finder Map screen — full-screen map with a selected device pinned,
 * plus a "last seen location" card at the bottom.
 */

import { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Shell, type TabId } from '../components/Shell';
import { MapView } from '../components/MapView';
import { DeviceIcon } from '../components/ui';
import { loadDevices } from '../lib/store';
import { type Device } from '../lib/ble';
import { formatDistance, formatRssi } from '../lib/distance';

const DEMO_LOCATIONS: Record<string, { lat: number; lng: number; address: string }> = {
  'ble-A42E5C118F23': { lat: 40.7829, lng: -73.9654, address: 'Riverside Park, New York, NY' },
  'ble-B86A9D33441A': { lat: 40.781, lng: -73.967, address: 'Central Park, NY' },
  'ble-C47F2A88115E': { lat: 40.785, lng: -73.963, address: '5th Ave, NY' },
  'ble-E19B445522AA': { lat: 40.779, lng: -73.969, address: 'Times Square, NY' },
  'ble-F38C1A2299DD': { lat: 40.787, lng: -73.961, address: 'Hudson River Park, NY' },
};

export default function FinderMap() {
  const [tab, setTab] = useState<TabId>('map');
  const [device, setDevice] = useState<Device | null>(null);

  useEffect(() => {
    const devices = loadDevices();
    const d = devices.find((x) => x.name === 'JBL Flip 6') ?? devices[0] ?? null;
    setDevice(d);
  }, []);

  if (!device) {
    return (
      <Shell tab={tab} onTab={setTab}>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ChevronLeft size={48} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900">No device selected</h3>
          <p className="text-sm text-slate-500 mt-2">Pick a device from Devices to locate it on the map.</p>
        </div>
      </Shell>
    );
  }

  const loc = DEMO_LOCATIONS[device.id] ?? { lat: 40.7829, lng: -73.9654, address: 'Unknown location' };

  return (
    <Shell tab={tab} onTab={setTab}>
      <header className="flex items-center justify-between mb-4">
        <button
          onClick={() => setTab('home')}
          className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm font-semibold text-emerald-700 active:scale-95 transition"
        >
          <ChevronLeft size={16} />
          Devices
        </button>
      </header>

      <div className="flex-1 mb-4 relative">
        <MapView
          markers={[{ id: device.id, name: device.name, lat: loc.lat, lng: loc.lng, rssi: device.rssi }]}
          center={[loc.lat, loc.lng]}
          zoom={16}
          height="100%"
          selectedId={device.id}
        />
      </div>

      {/* Device info overlay on map */}
      <div className="absolute left-4 top-4 z-20">
        <div className="flex items-center gap-2 rounded-xl bg-white/95 backdrop-blur px-3 py-2 border border-slate-200 shadow-md">
          <DeviceIcon deviceType={device.deviceType} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-900">{device.name}</div>
            <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <span>Last seen {Math.max(0, Math.round((Date.now() - device.lastSeen) / 60000))} min ago</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom card: last seen location */}
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="text-emerald-500 mt-0.5">📍</span>
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-900">Last seen location</div>
            <div className="text-sm text-slate-600">{loc.address}</div>
            <div className="mt-1 text-xs text-slate-500">
              Today, 9:37 AM • {formatRssi(device.rssi)} • {formatDistance(device.distance)}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
