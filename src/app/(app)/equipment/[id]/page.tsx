import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { Wrench, Truck, Pencil } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function EquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isManager = ['administrator', 'manager'].includes(profile?.role ?? '');
  const { data: item } = await supabase
    .from('equipment')
    .select('*, last_locator:last_located_by(full_name)')
    .eq('id', id)
    .single();
  if (!item) notFound();
  const locatorName: string | null = (item.last_locator as any)?.full_name ?? null;
  const hasLocation = item.lat != null && item.lng != null;

  const mapScript = `
(function() {
  var mc = document.getElementById('map-container');
  if (!mc) return;
  var itemId = mc.getAttribute('data-item-id');
  var latStr = mc.getAttribute('data-lat');
  var lngStr = mc.getAttribute('data-lng');
  var initLat = latStr ? parseFloat(latStr) : null;
  var initLng = lngStr ? parseFloat(lngStr) : null;
  var pendingLat = null, pendingLng = null;
  var dropPinMode = false;
  var map = null, marker = null;
  var cssLink = document.createElement('link');
  cssLink.rel = 'stylesheet';
  cssLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
  document.head.appendChild(cssLink);
  var jsEl = document.createElement('script');
  jsEl.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
  jsEl.onload = function() {
    var L = window.L;
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
    });
    var center = initLat !== null ? [initLat, initLng] : [52.5, -1.5];
    map = L.map('map-container').setView(center, initLat !== null ? 15 : 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: 'OpenStreetMap'}).addTo(map);
    if (initLat !== null) { marker = L.marker([initLat, initLng]).addTo(map); }
    map.on('click', function(e) {
      if (!dropPinMode) return;
      pendingLat = e.latlng.lat; pendingLng = e.latlng.lng;
      if (marker) { marker.setLatLng([pendingLat, pendingLng]); }
      else { marker = L.marker([pendingLat, pendingLng]).addTo(map); }
      document.getElementById('note-section').style.display = 'flex';
    });
  };
  document.head.appendChild(jsEl);
  document.getElementById('gps-btn').addEventListener('click', function() {
    var btn = this; btn.textContent = 'Getting GPS...'; btn.disabled = true;
    navigator.geolocation.getCurrentPosition(
      function(pos) { saveLocation(pos.coords.latitude, pos.coords.longitude, function() { btn.textContent = 'I am here'; btn.disabled = false; }); },
      function() { showErr('Could not get GPS. Check location permissions.'); btn.textContent = 'I am here'; btn.disabled = false; },
      {enableHighAccuracy: true, timeout: 15000}
    );
  });
  document.getElementById('pin-btn').addEventListener('click', function() {
    dropPinMode = !dropPinMode;
    this.textContent = dropPinMode ? 'Cancel' : 'Drop pin';
    this.className = dropPinMode
      ? 'flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border bg-amber-50 border-amber-300 text-amber-700'
      : 'flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border border-gray-200 text-gray-600';
    document.getElementById('drop-hint').style.display = dropPinMode ? 'block' : 'none';
    if (!dropPinMode) { pendingLat = null; pendingLng = null; document.getElementById('note-section').style.display = 'none'; }
  });
  document.getElementById('save-btn').addEventListener('click', function() {
    if (pendingLat === null) return;
    var btn = this; btn.textContent = '...'; btn.disabled = true;
    saveLocation(pendingLat, pendingLng, function() {
      btn.textContent = 'Save'; btn.disabled = false;
      pendingLat = null; pendingLng = null; dropPinMode = false;
      document.getElementById('pin-btn').textContent = 'Drop pin';
      document.getElementById('drop-hint').style.display = 'none';
      document.getElementById('note-section').style.display = 'none';
    });
  });
  function saveLocation(lat, lng, cb) {
    var notes = document.getElementById('loc-note') ? document.getElementById('loc-note').value : '';
    fetch('/api/equipment/' + itemId + '/location', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({lat: lat, lng: lng, notes: notes})
    }).then(function(r) {
      if (!r.ok) throw new Error('fail');
      if (map && window.L) {
        if (marker) { marker.setLatLng([lat, lng]); } else { marker = window.L.marker([lat, lng]).addTo(map); }
        map.setView([lat, lng], 15);
      }
      var d = document.getElementById('dir-btn');
      d.setAttribute('href', 'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng);
      d.style.display = 'flex';
      var s = document.getElementById('loc-status');
      s.textContent = 'Location saved'; s.style.color = '#16a34a'; s.style.display = 'block';
      setTimeout(function() { s.style.color = ''; s.textContent = 'Updated just now'; }, 3000);
      if (cb) cb();
    }).catch(function() { showErr('Could not save location.'); if (cb) cb(); });
  }
  function showErr(msg) { var e = document.getElementById('err-msg'); e.textContent = msg; e.style.display = 'block'; }
})();
  `;

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
          <div
            id="map-container"
            data-item-id={id}
            data-lat={item.lat?.toString() ?? ''}
            data-lng={item.lng?.toString() ?? ''}
            style={{ height: '300px', width: '100%', borderRadius: '12px' }}
          />
          <div id="drop-hint" style={{ display: 'none' }} className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-aas-blue text-white text-xs px-3 py-1.5 rounded-full shadow font-medium pointer-events-none">
            Tap map to place pin
          </div>
        </div>
        <p id="loc-status" style={{ display: hasLocation ? 'block' : 'none' }} className="text-xs text-gray-400 text-center">
          {item.location_updated_at ? `Last updated${locatorName ? ' by ' + locatorName.split(' ')[0] : ''}` : ''}
        </p>
        <div id="note-section" style={{ display: 'none' }} className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 p-3">
          <input
            id="loc-note"
            type="text"
            placeholder="Location note e.g. north field gate"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
          />
          <button id="save-btn" className="px-3 py-2 bg-aas-blue text-white rounded-lg text-sm font-medium">
            Save
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button id="gps-btn" className="flex items-center justify-center gap-2 py-3 bg-aas-blue text-white rounded-xl text-sm font-medium">
            I am here
          </button>
          <button id="pin-btn" className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border border-gray-200 text-gray-600">
            Drop pin
          </button>
          
            id="dir-btn"
            href={hasLocation ? `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}` : '#'}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: hasLocation ? 'flex' : 'none' }}
            className="col-span-2 flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl text-sm font-medium"
          >
            Get directions
          </a>
        </div>
        <p id="err-msg" style={{ display: 'none' }} className="text-sm text-red-500 text-center" />
      </div>
      <Link href="/equipment" className="text-sm text-aas-blue hover:underline">Back to equipment</Link>
      <Script id="eq-map" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: mapScript }} />
    </div>
  );
}
