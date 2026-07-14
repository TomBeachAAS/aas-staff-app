'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createClient } from '@/lib/supabase/client';
import { Navigation, MapPin, Crosshair, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function fixIcons() {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

function MapClickHandler({ active, onPick }: { active: boolean; onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => { if (active) onPick(e.latlng.lat, e.latlng.lng); }
  });
  return null;
}

interface Props {
  item: {
    id: string;
    name: string;
    type: string;
    lat: number | null;
    lng: number | null;
    location_notes: string | null;
    location_updated_at: string | null;
    last_locator_name: string | null;
  };
  userId: string;
}

export function EquipmentDetailClient({ item, userId }: Props) {
  const [lat, setLat] = useState<number | null>(item.lat);
  const [lng, setLng] = useState<number | null>(item.lng);
  const [updatedAt, setUpdatedAt] = useState(item.location_updated_at);
  const [locatorName, setLocatorName] = useState(item.last_locator_name);
  const [dropPinMode, setDropPinMode] = useState(false);
  const [pendingLat, setPendingLat] = useState<number | null>(null);
  const [pendingLng, setPendingLng] = useState<number | null>(null);
  const [locationNotes, setLocationNotes] = useState(item.location_notes ?? '');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fixIcons(); }, []);

  async function saveLocation(newLat: number, newLng: number) {
    setSaving(true);
    const supabase = createClient();
    const now = new Date().toISOString();
    await supabase.from('equipment').update({
      lat: newLat, lng: newLng,
      location_notes: locationNotes || null,
      last_located_by: userId,
      location_updated_at: now,
    }).eq('id', item.id);
    setLat(newLat); setLng(newLng);
    setUpdatedAt(now); setLocatorName('You');
    setPendingLat(null); setPendingLng(null);
    setDropPinMode(false);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function useGPS() {
    setError(''); setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { saveLocation(pos.coords.latitude, pos.coords.longitude); setGpsLoading(false); },
      () => { setError('Could not get GPS. Check location permissions.'); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  const displayLat = pendingLat ?? lat;
  const displayLng = pendingLng ?? lng;
  const center: [number, number] = displayLat != null && displayLng != null
    ? [displayLat, displayLng] : [52.5, -1.5];
  const zoom = displayLat != null ? 15 : 6;

  return (
    <div className="space-y-3">
      {/* Map */}
      <div className="relative">
        <MapContainer
          key={`${lat}-${lng}`}
          center={center}
          zoom={zoom}
          style={{ height: '300px', width: '100%', borderRadius: '12px' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler active={dropPinMode} onPick={(la, ln) => { setPendingLat(la); setPendingLng(ln); }} />
          {displayLat != null && displayLng != null && (
            <Marker position={[displayLat, displayLng]} />
          )}
        </MapContainer>
        {dropPinMode && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-aas-blue text-white text-xs px-3 py-1.5 rounded-full shadow font-medium pointer-events-none">
            Tap map to place pin
          </div>
        )}
      </div>

      {/* Last updated */}
      {updatedAt && (
        <p className="text-xs text-gray-400 text-center">
          {saved ? <span className="text-green-600">✓ Location saved</span> : (
            <>Updated {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
            {locatorName && ` by ${locatorName.split(' ')[0]}`}</>
          )}
        </p>
      )}

      {/* Pending pin confirm */}
      {pendingLat != null && (
        <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 p-3">
          <input
            type="text"
            value={locationNotes}
            onChange={e => setLocationNotes(e.target.value)}
            placeholder="Location note (optional) — e.g. north field gate"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue"
          />
          <button
            onClick={() => saveLocation(pendingLat, pendingLng!)}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 bg-aas-blue text-white rounded-lg text-sm font-medium disabled:opacity-60 shrink-0"
          >
            <Check size={14} />
            {saving ? '…' : 'Save'}
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={useGPS}
          disabled={gpsLoading || saving}
          className="flex items-center justify-center gap-2 py-3 bg-aas-blue text-white rounded-xl text-sm font-medium disabled:opacity-60"
        >
          <Crosshair size={15} />
          {gpsLoading ? 'Getting GPS…' : "I'm here"}
        </button>
        <button
          onClick={() => { setDropPinMode(!dropPinMode); setPendingLat(null); setPendingLng(null); }}
          className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border transition-colors ${
            dropPinMode
              ? 'bg-amber-50 border-amber-300 text-amber-700'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <MapPin size={15} />
          {dropPinMode ? 'Cancel' : 'Drop pin'}
        </button>
        {lat != null && lng != null && (
          
            href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="col-span-2 flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl text-sm font-medium"
          >
            <Navigation size={15} />
            Get directions
          </a>
        )}
      </div>

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
    </div>
  );
}
