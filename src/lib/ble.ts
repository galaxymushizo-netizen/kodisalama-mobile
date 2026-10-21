/**
 * Bluetooth LE wrapper around @capacitor-community/bluetooth-le.
 *
 * Provides a simple scan() API that returns discovered devices with RSSI.
 * Falls back gracefully when the plugin is unavailable (e.g. running in a
 * plain browser) so the app still renders with seeded demo data.
 */

import { loadDevices, saveDevices } from './store';
import { rssiToDistance, rssiToNearby } from './distance';

export type DeviceType = 'speaker' | 'phone' | 'watch' | 'earbuds' | 'tablet' | 'other';

export interface Device {
  id: string;
  name: string;
  address: string;
  rssi: number;
  distance: number;
  lastSeen: number;
  nearby: boolean;
  deviceType: DeviceType;
}

export interface ScanResult {
  name: string | null;
  address: string;
  rssi: number;
}

export interface DeviceHistory {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  rssi: number;
  distance: number;
  latitude: number;
  longitude: number;
  address: string;
  timestamp: number;
}

interface BLEPlugin {
  requestPermissions: () => Promise<{ granted: boolean }>;
  initialize: () => Promise<void>;
  scan: (
    config: { serviceUuids?: string[]; allowDuplicates: boolean },
    callback: (result: any) => void,
  ) => Promise<{ scanning: boolean }>;
  stopScan: () => Promise<void>;
  enabled: () => Promise<{ enabled: boolean }>;
}

declare const Capacitor: {
  isPluginAvailable: (id: string) => boolean;
  getPlatform: () => string;
};

function getPlugin(): BLEPlugin | null {
  const Plugins = (window as any).Capacitor?.Plugins;
  if (!Plugins || !Plugins.BluetoothLe) return null;
  return Plugins.BluetoothLe as BLEPlugin;
}

export function isBleAvailable(): boolean {
  try {
    return Boolean(getPlugin());
  } catch {
    return false;
  }
}

export function isNative(): boolean {
  try {
    return Capacitor.getPlatform() !== 'web';
  } catch {
    return false;
  }
}

export async function requestBlePermissions(): Promise<boolean> {
  const plugin = getPlugin();
  if (!plugin) return false;
  try {
    const result = await plugin.requestPermissions();
    return result.granted === true;
  } catch {
    return false;
  }
}

export async function ensureBleEnabled(): Promise<boolean> {
  const plugin = getPlugin();
  if (!plugin) return false;
  try {
    const result = await plugin.enabled();
    return result.enabled === true;
  } catch {
    return false;
  }
}

export async function initializeBle(): Promise<boolean> {
  const plugin = getPlugin();
  if (!plugin) return false;
  try {
    await plugin.initialize();
    return true;
  } catch {
    return false;
  }
}

export async function scanDevices({
  onDevice,
  durationMs = 8000,
}: {
  onDevice: (result: ScanResult) => void;
  durationMs?: number;
}): Promise<void> {
  const plugin = getPlugin();
  if (!plugin) {
    return;
  }

  let stopped = false;
  const timer = setTimeout(() => {
    if (!stopped) {
      stopped = true;
      void plugin.stopScan().catch(() => {});
    }
  }, durationMs);

  try {
    await plugin.scan(
      { serviceUuids: [], allowDuplicates: true },
      (result: any) => {
        if (stopped) return;
        const name = result.name || null;
        const address = result.address || '';
        const rssi = typeof result.rssi === 'number' ? result.rssi : -100;
        if (!address) return;
        onDevice({ name, address, rssi });
      },
    );
  } finally {
    if (!stopped) {
      stopped = true;
      clearTimeout(timer);
      try {
        await plugin.stopScan();
      } catch {
        // ignore
      }
    }
  }
}

export function toDevice(
  result: ScanResult,
  existing: Device | null,
  now = Date.now(),
): Device {
  const prev = existing;
  const rssi = result.rssi;
  const distance = rssiToDistance(rssi);
  const nearby = rssiToNearby(rssi);
  const deviceType = guessDeviceType(result.name, prev?.deviceType);

  return {
    id: `ble-${result.address.toUpperCase().replace(/:/g, '')}`,
    name: result.name || 'Unknown Device',
    address: result.address.toUpperCase(),
    rssi,
    distance,
    lastSeen: now,
    nearby,
    deviceType,
  };
}

function guessDeviceType(name: string | null, fallback: DeviceType = 'other'): DeviceType {
  const n = (name || '').toLowerCase();
  if (n.includes('pod') || n.includes('bud')) return 'earbuds';
  if (n.includes('watch')) return 'watch';
  if (n.includes('galaxy') || n.includes('iphone') || n.includes('pixel')) return 'phone';
  if (n.includes('ipad') || n.includes('tab')) return 'tablet';
  if (n.includes('jbl') || n.includes('charge') || n.includes('flip') || n.includes('speaker'))
    return 'speaker';
  return fallback;
}

export async function startScanAndMerge(
  onProgress: (devices: Device[]) => void,
  durationMs = 8000,
): Promise<Device[]> {
  const devices = loadDevices();
  const byAddress = new Map(devices.map((d) => [d.address, d]));

  await scanDevices({
    durationMs,
    onDevice: (result) => {
      const existing = byAddress.get(result.address) ?? null;
      const merged = toDevice(result, existing);
      byAddress.set(merged.address, merged);
      onProgress(Array.from(byAddress.values()));
    },
  });

  const updated = Array.from(byAddress.values());
  updated.sort((a, b) => b.rssi - a.rssi);
  saveDevices(updated);
  return updated;
}
