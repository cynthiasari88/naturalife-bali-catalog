/* Naturalife Bali — map pin picker (Leaflet, loaded only when a customer opens the map).
   NLMapPin.mount(element, { center: [lat, lng], zoom, value: {lat, lng} | null, text: {...}, onChange(coords) }) */
(() => {
  "use strict";
  const LEAFLET_JS = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
  const LEAFLET_CSS = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
  const TILES = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
  const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>';
  let loading = null;

  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      if (!document.querySelector('link[data-leaflet]')) {
        const css = document.createElement("link");
        css.rel = "stylesheet"; css.href = LEAFLET_CSS; css.setAttribute("data-leaflet", "");
        document.head.appendChild(css);
      }
      const js = document.createElement("script");
      js.src = LEAFLET_JS;
      js.onload = () => (window.L ? resolve(window.L) : reject(new Error("Leaflet missing")));
      js.onerror = () => { loading = null; reject(new Error("Map library could not be loaded")); };
      document.head.appendChild(js);
    });
    return loading;
  }

  const round = n => Math.round(n * 1e6) / 1e6;

  async function mount(el, opts) {
    const t = opts.text || {};
    el.innerHTML =
      '<div class="pin-map" role="application" aria-label="' + (t.mapLabel || "Map") + '"></div>' +
      '<div class="pin-tools"><button type="button" class="pin-locate">' + (t.useMyLocation || "Use my location") + '</button>' +
      '<span class="pin-status" aria-live="polite"></span></div>';
    const mapEl = el.querySelector(".pin-map"), status = el.querySelector(".pin-status"), locate = el.querySelector(".pin-locate");
    status.textContent = t.loading || "Loading map…";
    let L;
    try { L = await loadLeaflet(); } catch (e) { status.textContent = t.mapFailed || "The map could not be loaded."; locate.hidden = true; throw e; }
    status.textContent = "";

    const start = opts.value ? [opts.value.lat, opts.value.lng] : opts.center;
    const map = L.map(mapEl, { center: start, zoom: opts.value ? 16 : (opts.zoom || 12), scrollWheelZoom: false, tap: true });
    L.tileLayer(TILES, { maxZoom: 19, subdomains: "abcd", attribution: ATTRIBUTION }).addTo(map);
    const icon = L.divIcon({ className: "pin-marker", html: '<span></span>', iconSize: [30, 42], iconAnchor: [15, 40] });
    let marker = null;

    function place(latlng, pan) {
      if (!marker) {
        marker = L.marker(latlng, { draggable: true, icon, keyboard: true, title: t.pinTitle || "Delivery location" }).addTo(map);
        marker.on("dragend", () => emit(marker.getLatLng()));
      } else marker.setLatLng(latlng);
      if (pan) map.setView(latlng, Math.max(map.getZoom(), 16));
      emit(marker.getLatLng());
    }
    function emit(ll) {
      const coords = { lat: round(ll.lat), lng: round(ll.lng) };
      status.textContent = (t.pinned || "Pinned") + " · " + coords.lat.toFixed(5) + ", " + coords.lng.toFixed(5);
      if (opts.onChange) opts.onChange(coords);
    }
    if (opts.value) { marker = null; place(L.latLng(opts.value.lat, opts.value.lng), false); }
    else status.textContent = t.tapHint || "Tap the map to drop a pin.";
    map.on("click", e => place(e.latlng, false));

    locate.onclick = () => {
      if (!navigator.geolocation) { status.textContent = t.locationUnavailable || "Location is not available on this device."; return; }
      status.textContent = t.locating || "Finding your location…";
      navigator.geolocation.getCurrentPosition(
        pos => place(L.latLng(pos.coords.latitude, pos.coords.longitude), true),
        () => { status.textContent = t.locationDenied || "Location permission was denied. Tap the map instead."; },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
      );
    };
    // Leaflet needs a size recalculation when it is shown inside a dialog that was hidden.
    setTimeout(() => map.invalidateSize(), 60);
    return { map, setCenter: (c, z) => { if (!marker) map.setView(c, z || 12); }, invalidate: () => map.invalidateSize() };
  }

  window.NLMapPin = { mount, loadLeaflet };
})();
