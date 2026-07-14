'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function fixIcons() {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

function makeIcon(type: string) {
  const color = type === 'vehicle' ? '#16a34a' : '#2563eb';
  return L.divIcon({
    html: `<div style="background:${color};width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
    className: '',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
  });
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(L.latLngBounds(positions), { padding: [30, 30] });
    } else if (positions.length === 1) {
      map.setView(positions[0], 14);
    }
  }, []);
  return null;
}

interface EquipmentItem {
  id: string;
  name: string;
  type: string;
  lat: number | null;
  lng: number | null;
  location_notes: string | null;
}

export function EquipmentMapView({ equipment }: { equipment: EquipmentItem[] }) {
  useEffect(() => { fixIcons(); }, []);

  const located = equipment.filter(e => e.lat != null && e.lng != null);
  const positions = located.map(e => [e.lat!, e.lng!] as [number, number]);
  const center: [number, number] = positions[0] ?? [52.5, -1.5];

  return (
    <MapContainer
      center={center}
      zoom={6}
      style={{ height: '260px', width: '100%', borderRadius: '12px' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds positions={positions} />
      {located.map(item => (
        <Marker key={item.id} position={[item.lat!, item.lng!]} icon={makeIcon(item.type)}>
          <Popup>
            <div className="text-sm space-y-1">
              <p className="font-semibold">{item.name}</p>
              <p className="text-gray-400 text-xs capitalize">{item.type}</p>
              {item.location_notes && <p className="text-xs">{item.location_notes}</p>}
              
                href={`https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 text-xs underline block"
              >
                Get directions →
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
