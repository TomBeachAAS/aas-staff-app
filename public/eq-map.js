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
        if (marker) { marker.setLatLng([lat, lng]); }
        else { marker = window.L.marker([lat, lng]).addTo(map); }
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
