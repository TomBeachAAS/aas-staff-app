'use client';

import { useEffect, useRef } from 'react';

interface EquipmentItem {
  id: string; name: string; type: string;
  lat: number | null; lng: number | null; location_notes: string | null;
}

export function EquipmentMapView({ equipment }: { equipment: EquipmentItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const located = equipment.filter(e => e.lat != null && e.lng != null);

  useEffect(() => {
    if (!containerRef.current || located.length === 0 || mapRef.current) return;

    if (!document.querySelector('#leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(link);
    }

    import('leaflet').then(({ default: L }) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current!).setView([52.5, -1.5], 6);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map);

      const latlngs: [number, number][] = [];

      located.forEach(item => {
        const color = item.type === 'vehicle' ? '#16a34a' : '#2563eb';
        const icon = L.divIcon({
          html: `<div style="background:${color};width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
          className: '',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          popupAnchor: [0, -12],
        });
        L.marker([item.lat!, item.lng!], { icon })
          .addTo(map)
          .bindPopup(`<strong>${item.name}</strong><br/><span style="font-size:11px;color:#6b7280">${item.type}</span>${item.location_notes ? `<br/><span style="font-size:11px">${item.location_notes}</span>` : ''}<br/><a href="https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}" target="_blank" style="font-size:11px;color:#2563eb">Get directions →</a>`);
        latlngs.push([item.lat!, item.lng!]);
      });

      if (latlngs.length > 1) {
        map.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30] });
      } else {
        map.setView(latlngs[0], 14);
      }
    });

    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  if (located.length === 0) return null;

  return <div ref={containerRef} style={{ height: '260px', width: '100%', borderRadius: '12px' }} />;
}
