/**
 * Simple Leaflet map view. Accepts markers to render and an optional center/zoom.
 * Tiles come from OpenStreetMap (no API key required).
 */

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Marker {
  id: string;
  lat: number;
  lng: number;
  name: string;
  rssi?: number;
}

interface MapViewProps {
  markers: Marker[];
  center?: [number, number];
  zoom?: number;
  height?: string | number;
  selectedId?: string | null;
}

export function MapView({
  markers,
  center = [40.7128, -74.006],
  zoom = 15,
  height = '100%',
  selectedId,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const [initialized, setInitialized] = useState(false);

  const deviceIcon = L.divIcon({
    className: 'custom-device-icon',
    html: `
      <div style="
        position:relative;
        width:34px; height:34px;
        background:#16a34a;
        border:3px solid #fff;
        border-radius:50%;
        box-shadow:0 2px 8px rgba(0,0,0,0.25);
        display:flex;align-items:center;justify-content:center;
      ">
        <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'>
          <path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z'/>
          <circle cx='12' cy='10' r='3' />
        </svg>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

  const selectedIcon = L.divIcon({
    className: 'custom-device-icon-selected',
    html: `
      <div style="
        position:relative;
        width:44px; height:44px;
        background:#15803d;
        border:3px solid #fff;
        border-radius:50%;
        box-shadow:0 4px 12px rgba(0,0,0,0.35);
        display:flex;align-items:center;justify-content:center;
      ">
        <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'>
          <path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z'/>
          <circle cx='12' cy='10' r='3' />
        </svg>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });

  useEffect(() => {
    if (!mapRef.current || initialized) return;

    const map = L.map(mapRef.current, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    mapInstance.current = map;
    setInitialized(true);

    return () => {
      map.remove();
      mapInstance.current = null;
      setInitialized(false);
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle) {
        map.removeLayer(layer);
      }
    });

    if (selectedId) {
      const sel = markers.find((m) => m.id === selectedId);
      if (sel) {
        L.circle([sel.lat, sel.lng], {
          radius: 40,
          color: '#16a34a',
          fillColor: '#16a34a',
          fillOpacity: 0.15,
          weight: 2,
        }).addTo(map);
        L.marker([sel.lat, sel.lng], { icon: selectedIcon as any }).addTo(map);
        map.flyTo([sel.lat, sel.lng], 16, { duration: 1 });
      }
    }

    markers.forEach((m) => {
      if (selectedId && m.id === selectedId) return;
      L.marker([m.lat, m.lng], { icon: deviceIcon as any }).addTo(map);
    });
  }, [markers, selectedId]);

  return (
    <div
      ref={mapRef}
      className={`w-full rounded-2xl border border-slate-200 overflow-hidden relative ${typeof height === 'number' ? `h-[${height}px]` : `h-[${height}]}`}`}
    />
  );
}

export { L };
