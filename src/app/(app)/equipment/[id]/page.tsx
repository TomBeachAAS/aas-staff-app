'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Navigation, MapPin, Crosshair, Check, Wrench, Truck, Pencil } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function EquipmentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [item, setItem] = useState<any>(null);
  const [userId, setUserId] = useState('');
  const [isManager, setIsManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const dropPinModeRef = useRef(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [locatorName, setLocatorName] = useState<string | null>(null);
  const [dropPinMode, setDropPinMode] = useState(false);
  const [pendingLat, setPendingLat] = useState<number | null>(null);
  const [pendingLng, setPendingLng] = useState<number | null>(null);
  const [locationNotes, setLocationNotes] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUserId(user.id);
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      setIsManager(['administrator', 'manager'].includes(profile?.role ?? ''));
      const { data } = await supabase
        .from('equipment')
        .select('*, last_locator:last_located_by(full_name)')
        .eq('id', id)
        .single();
      if (!data) { router.push('/equipment'); return; }
      setItem(data);
      setLat(data.lat ?? null);
      setLng(data.lng ?? null);
      setUpdatedAt(data.location_updated_at ?? null);
      setLocatorName((data.last_locator as any)?.full_name ?? null);
      setLocationNotes(data.location_notes ?? '');
      setLoading(false);
    };
    load();
  }, [id]);

  useEffect(() => { dropPinModeRef.current = dropPinMode; }, [dropPinMode]);

  useEffect(() => {
    if (!item || !containerRef.current || mapRef.current) return;
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
      const center: [number, number] = item.lat != null ? [item.lat, item.lng] : [52.5, -1.5];
      const map = L.map(containerRef.current!).setView(center, item.lat != null ? 15 : 6);
      mapRef.current = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: 'OpenStreetMap' }).addTo(map);
      if (item.lat != null) {
        markerRef.current = L.marker([item.lat, item.lng]).addTo(map);
      }
      map.on('click', (e: any) => {
        if (!dropPinModeRef.current) return;
        const { lat: la, lng: ln } = e.latlng;
        setPendingLat(la);
        setPendingLng(ln);
        if (markerRef.current) {
          markerRef.current.setLatLng([la, ln]);
        } else {
          markerRef.current = L.marker([la, ln]).addTo(map);
        }
      });
    });
    return () => { mapRef.current?.remove(); mapRef.current = null; markerRef.current = null; };
  }, [item]);

  async function saveLocation(newLat: number, newLng: number) {
    setSaving(true);
    const supabase = createClient();
    const now = new Date().toISOString();
    await supabase.from('equipment').update({
      lat: newLat, lng: newLng,
      location_notes: locationNotes || null,
      last_located_by: userId,
      location_updated_at: now,
    }).eq('id', id);
    import('leaflet').then(({ default: L }) => {
      if (!mapRef.current) return;
      if (markerRef.current) {
        markerRef.current.setLatLng([newLat, newLng]);
      } else {
        markerRef.current = L.marker([newLat, newLng]).addTo(mapRef.current);
      }
      mapRef.current.setView([newLat, newLng], 15);
    });
    setLat(newLat); setLng(newLng);
    setUpdatedAt(now); setLocatorName('You');
    setPendingLat(null); setPendingLng(null);
    setDropPinMode(false); dropPinModeRef.current = false;
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleGPS() {
    setError(''); setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => { saveLocation(pos.coords.latitude, pos.coords.longitude); setGpsLoading(false); },
      () => { setError('Could not get GPS. Check location permissions.'); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.type === 'vehicle' ? 'bg-green-50' : 'bg-blue-50'}`}>
            {item.type === 'vehicle'
              ? <Truck size={18} className="text-green-600" />
              : <Wrench size={18} className="text-aas-blue" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">{item.name}</h2>
            <p className="text-xs text-gray-400 capitalize">{item.type}</p>
          </div>
        </div>
        {isManager && (
          <Link href={`/equipment/${id}/edit`} className="p-2 text-gray-400 hover:text-aas-blue transition-colors">
            <Pencil size={16} />
          </Link>
        )}
      </div>

      {item.description && (
        <p className="text-sm text-gray-500 bg-white rounded-xl border border-gray-100 px-4 py-3">
          {item.description}
        </p>
      )}

      <div className="space-y-3">
        <div className="relative">
          <div ref={containerRef} style={{ height: '300px', width: '100%', borderRadius: '12px' }} />
          {dropPinMode && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-aas-blue text-white text-xs px-3 py-1.5 rounded-full shadow font-medium pointer-events-none">
              Tap map to place pin
            </div>
          )}
        </div>

        {updatedAt && (
          <p className="text-xs text-gray-400 text-center">
            {saved
              ? <span className="text-green-600">Location saved</span>
              : <>Updated {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}{locatorName && ` by ${locatorName.split(' ')[0]}`}</>}
          </p>
        )}

        {pendingLat != null && (
          <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 p-3">
            <input
              type="text"
              value={locationNotes}
              onChange={e => setLocationNotes(e.target.value)}
              placeholder="Location note e.g. north field gate"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue"
            />
            <button
              onClick={() => saveLocation(pendingLat, pendingLng!)}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 bg-aas-blue text-white rounded-lg text-sm font-medium disabled:opacity-60 shrink-0"
            >
              <Check size={14} />
              {saving ? '...' : 'Save'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleGPS}
            disabled={gpsLoading || saving}
            className="flex items-center justify-center gap-2 py-3 bg-aas-blue text-white rounded-xl text-sm font-medium disabled:opacity-60"
          >
            <Crosshair size={15} />
            {gpsLoading ? 'Getting GPS...' : "I'm here"}
          </button>
          <button
            onClick={() => { setDropPinMode(v => !v); setPendingLat(null); setPendingLng(null); }}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border transition-colors ${
              dropPinMode ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
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

      <Link href="/equipment" className="text-sm text-aas-blue hover:underline">Back to equipment</Link>
    </div>
  );
}
