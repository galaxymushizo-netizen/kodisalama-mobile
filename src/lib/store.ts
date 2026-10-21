import type { Device, DeviceHistory } from './ble';

const DEVICES_KEY = 'findtrack:devices:v1';
const HISTORY_KEY = 'findtrack:history:v1';

export function loadDevices(): Device[] {
  try {
    const raw = localStorage.getItem(DEVICES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Device[];
  } catch {
    return [];
  }
}

export function saveDevices(devices: Device[]): void {
  try {
    localStorage.setItem(DEVICES_KEY, JSON.stringify(devices));
  } catch {
    // quota exceeded or private mode — silently ignore
  }
}

export function loadHistory(): DeviceHistory[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DeviceHistory[];
  } catch {
    return [];
  }
}

export function saveHistory(history: DeviceHistory[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // silently ignore
  }
}

export function addHistoryEntry(entry: DeviceHistory): void {
  const history = loadHistory();
  // Keep only the latest entry per device, then prepend
  const filtered = history.filter((h) => h.deviceId !== entry.deviceId);
  filtered.unshift(entry);
  // Cap at 200 entries
  saveHistory(filtered.slice(0, 200));
}

export function seedDefaultDevices(): Device[] {
  const existing = loadDevices();
  if (existing.length > 0) return existing;

  const now = Date.now();
  const defaults: Device[] = [
    {
      id: 'dev-1',
      name: 'JBL Flip 6',
      address: 'A4:2E:5C:11:8F:23',
      rssi: -78,
      distance: 12,
      lastSeen: now - 120000,
      nearby: true,
      deviceType: 'speaker',
    },
    {
      id: 'dev-2',
      name: 'Galaxy S23',
      address: 'B8:6A:9D:33:44:1A',
      rssi: -65,
      distance: 4,
      lastSeen: now - 240000,
      nearby: true,
      deviceType: 'phone',
    },
    {
      id: 'dev-3',
      name: 'Apple Watch',
      address: 'C4:7F:2A:88:11:5E',
      rssi: -92,
      distance: 28,
      lastSeen: now - 3600000,
      nearby: false,
      deviceType: 'watch',
    },
    {
      id: 'dev-4',
      name: 'AirPods Pro',
      address: 'E1:9B:44:55:22:AA',
      rssi: -90,
      distance: 35,
      lastSeen: now - 7200000,
      nearby: false,
      deviceType: 'earbuds',
    },
    {
      id: 'dev-5',
      name: 'JBL Charge 5',
      address: 'F3:8C:1A:22:99:DD',
      rssi: -102,
      distance: 72,
      lastSeen: now - 10800000,
      nearby: false,
      deviceType: 'speaker',
    },
  ];
  saveDevices(defaults);
  return defaults;
}
