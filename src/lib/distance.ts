/**
 * RSSI → distance estimation using the log-distance path loss model.
 *
 * distance = 10 ^ ((txPower - rssi) / (10 * n))
 *
 * txPower: expected RSSI at 1 metre (dBm). Typical BLE beacons advertise
 * around -59 dBm at 1 m. We use -63 dBm as a conservative default.
 * n: path-loss exponent. 2 = free space, 4 = heavy obstruction.
 */

const TX_POWER = -63; // dBm at 1 m
const N = 2.4; // path-loss exponent for indoor/outdoor mixed

export function rssiToDistance(rssi: number): number {
  if (rssi === 0 || rssi > -10) return 0.1; // unrealistically strong, clamp
  if (rssi < -100) return 100; // too weak to trust
  const ratio = (TX_POWER - rssi) / (10 * N);
  const distance = Math.pow(10, ratio);
  return Math.round(distance * 10) / 10; // 1 decimal place
}

export function rssiToSignalLabel(rssi: number): { label: string; color: string } {
  if (rssi >= -50) return { label: 'Strong', color: '#15803d' };
  if (rssi >= -70) return { label: 'Good', color: '#16a34a' };
  if (rssi >= -85) return { label: 'Fair', color: '#ca8a04' };
  return { label: 'Weak', color: '#dc2626' };
}

export function rssiToNearby(rssi: number): boolean {
  return rssi >= -80;
}

export function formatDistance(meters: number): string {
  if (meters < 1) return '<1 m';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatRssi(rssi: number): string {
  return `${rssi} dBm`;
}
