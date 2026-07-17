(function() {
  var mc = document.getElementById('map-container');
  if (!mc) return;
  var itemId = mc.getAttribute('data-item-id');
  var latStr = mc.getAttribute('data-lat');
  var lngStr = mc.getAttribute('data-lng');
  var w3wKey = mc.getAttribute('data-w3w-key') || '';
  var initLat = latStr ? parseFloat(latStr) : null;
  var initLng = lngStr ? parseFloat(lngStr) : null;
  var pendingLat = null, pendingLng = null;
  var dropPinMode = false;
  var map = null, marker = null;

  // Load Leaflet CSS
  var cssLink = document.createElement('link');
  cssLink.rel = 'stylesheet';
  cssLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
  document.head.appendChild(cssLink);

  // Custom pin icon (red Google Maps-style)
  function makePinIcon(L) {
    return L.divIcon({
      className: '',
      html: '<div style="width:28px;height:36px;position:relative"><svg viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg"><path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22s14-12.667 14-22C28 6.268 21.732 0 14 0z" fill="#e53e3e"/><circle cx="14" cy="14" r="6" fill="white"/></svg></div>',
      iconSize: [28, 36],
      iconAnchor: [14, 36],
      popupAnchor: [0, -36]
    });
  }

  function fetchW3W(lat, lng) {
    if (!w3wKey) {
      var w3wSection = document.getElementById('w3w-section');
      var w3wWords = document.getElementById('w3w-words');
      var w3wLink = document.getElementById('w3w-link');
      if (w3wSection && w3wWords && w3wLink) {
        w3wWords.textContent = lat.toFixed(5) + ', ' + lng.toFixed(5);
        w3wLink.href = 'https://what3words.com/select-square?lat=' + lat + '&lng=' + lng;
        w3wSection.style.display = 'flex';
      }
      return;
    }
    fetch('https://api.what3words.com/v3/convert-to-3wa?coordinates=' + lat + ',' + lng + '&key=' + w3wKey)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var w3wSection = document.getElementById('w3w-section');
        var w3wWords = document.getElementById('w3w-words');
        var w3wLink = document.getElementById('w3w-link');
        if (!w3wSection || !w3wWords || !w3wLink) return;
        if (data.words) {
          w3wWords.textContent = data.words;
          w3wLink.href = 'https://what3words.com/' + data.words;
          w3wSection.style.display = 'flex';
        } else {
          w3wWords.textContent = lat.toFixed(5) + ', ' + lng.toFixed(5);
          w3wLink.href = '#';
          w3wSection.style.display = 'flex';
        }
      })
      .catch(function() {
        var w3wSection = document.getElementById('w3w-section');
        var w3wWords = document.getElementById('w3w-words');
        if (w3wSection && w3wWords) {
          w3wWords.textContent = lat.toFixed(5) + ', ' + lng.toFixed(5);
          w3wSection.style.display = 'flex';
        }
      });
  }

  // W3W address input detection: if note starts with /// treat as W3W address
  function resolveW3WInput(input, cb) {
    var val = input.trim().toLowerCase();
    if (val.startsWith('///')) {
      var words = val.replace(/^\/\/\//, '');
      if (!w3wKey) { cb(null, null); return; }
      fetch('https://api.what3words.com/v3/convert-to-coordinates?words=' + encodeURIComponent(words) + '&key=' + w3wKey)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.coordinates) {
            cb(data.coordinates.lat, data.coordinates.lng);
          } else {
            cb(null, null);
          }
        })
        .catch(function() { cb(null, null); });
      return;
    }
    cb(null, null);
  }

  var jsEl = document.createElement('script');
  jsEl.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
  jsEl.onload = function() {
    var L = window.L;
    var center = initLat !== null ? [initLat, initLng] : [52.5, -1.5];
    var zoom = initLat !== null ? 16 : 6;

    map = L.map('map-container', { zoomControl: true }).setView(center, zoom);

    // Satellite tiles (Esri World Imagery — free, no API key)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles by Esri',
      maxZoom: 19
    }).addTo(map);

    // Hybrid overlay (roads/labels on top of satellite)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      attribution: '',
      maxZoom: 19,
      opacity: 0.7
    }).addTo(map);

    var pinIcon = makePinIcon(L);

    if (initLat !== null) {
      marker = L.marker([initLat, initLng], { icon: pinIcon, draggable: true }).addTo(map);
      marker.on('dragend', function(e) {
        var pos = e.target.getLatLng();
        pendingLat = pos.lat;
        pendingLng = pos.lng;
        document.getElementById('note-section').style.display = 'flex';
      });
      fetchW3W(initLat, initLng);
    }

    map.on('click', function(e) {
      if (!dropPinMode) return;
      pendingLat = e.latlng.lat;
      pendingLng = e.latlng.lng;
      if (marker) {
        marker.setLatLng([pendingLat, pendingLng]);
      } else {
        marker = L.marker([pendingLat, pendingLng], { icon: pinIcon, draggable: true }).addTo(map);
        marker.on('dragend', function(ev) {
          var pos = ev.target.getLatLng();
          pendingLat = pos.lat;
          pendingLng = pos.lng;
          document.getElementById('note-section').style.display = 'flex';
        });
      }
      document.getElementById('note-section').style.display = 'flex';
      document.getElementById('drop-hint').style.display = 'none';
    });
  };
  document.head.appendChild(jsEl);

  document.getElementById('gps-btn').addEventListener('click', function() {
    var btn = this;
    btn.textContent = 'Getting GPS...';
    btn.disabled = true;
    navigator.geolocation.getCurrentPosition(
      function(pos) {
        saveLocation(pos.coords.latitude, pos.coords.longitude, '', function() {
          btn.textContent = 'I am here';
          btn.disabled = false;
        });
      },
      function() {
        showErr('Could not get GPS. Check location permissions.');
        btn.textContent = 'I am here';
        btn.disabled = false;
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });

  document.getElementById('pin-btn').addEventListener('click', function() {
    dropPinMode = !dropPinMode;
    this.textContent = dropPinMode ? 'Cancel' : 'Drop pin';
    this.className = dropPinMode
      ? 'flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border bg-amber-50 border-amber-300 text-amber-700'
      : 'flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border border-gray-200 text-gray-600';
    document.getElementById('drop-hint').style.display = dropPinMode ? 'block' : 'none';
    if (map) { map.getContainer().style.cursor = dropPinMode ? 'crosshair' : ''; }
    if (!dropPinMode) {
      pendingLat = null;
      pendingLng = null;
      document.getElementById('note-section').style.display = 'none';
    }
  });

  document.getElementById('save-btn').addEventListener('click', function() {
    var noteInput = document.getElementById('loc-note');
    var noteVal = noteInput ? noteInput.value : '';

    // Check if input is a W3W address
    resolveW3WInput(noteVal, function(resolvedLat, resolvedLng) {
      var lat = resolvedLat !== null ? resolvedLat : pendingLat;
      var lng = resolvedLng !== null ? resolvedLng : pendingLng;
      if (lat === null) { showErr('No location to save.'); return; }

      var btn = document.getElementById('save-btn');
      btn.textContent = '...';
      btn.disabled = true;

      saveLocation(lat, lng, noteVal, function() {
        btn.textContent = 'Save';
        btn.disabled = false;
        pendingLat = null;
        pendingLng = null;
        dropPinMode = false;
        document.getElementById('pin-btn').textContent = 'Drop pin';
        document.getElementById('pin-btn').className = 'flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border border-gray-200 text-gray-600';
        document.getElementById('drop-hint').style.display = 'none';
        document.getElementById('note-section').style.display = 'none';
        if (map) { map.getContainer().style.cursor = ''; }
      });
    });
  });

  function saveLocation(lat, lng, notes, cb) {
    var L = window.L;
    fetch('/api/equipment/' + itemId + '/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: lat, lng: lng, notes: notes })
    }).then(function(r) {
      if (!r.ok) throw new Error('fail');
      if (map && L) {
        var pinIcon = makePinIcon(L);
        if (marker) {
          marker.setLatLng([lat, lng]);
        } else {
          marker = L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(map);
          marker.on('dragend', function(e) {
            var pos = e.target.getLatLng();
            pendingLat = pos.lat;
            pendingLng = pos.lng;
            document.getElementById('note-section').style.display = 'flex';
          });
        }
        map.flyTo([lat, lng], 16, { duration: 1 });
      }
      var d = document.getElementById('dir-btn');
      if (d) {
        d.setAttribute('href', 'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng);
        d.style.display = 'flex';
      }
      var s = document.getElementById('loc-status');
      if (s) { s.textContent = 'Location saved'; s.style.color = '#16a34a'; s.style.display = 'block'; }
      setTimeout(function() { if (s) { s.style.color = ''; s.textContent = 'Updated just now'; } }, 3000);
      fetchW3W(lat, lng);
      if (cb) cb();
    }).catch(function() {
      showErr('Could not save location.');
      if (cb) cb();
    });
  }

  function showErr(msg) {
    var e = document.getElementById('err-msg');
    if (e) { e.textContent = msg; e.style.display = 'block'; }
  }
})();
