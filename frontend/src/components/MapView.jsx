import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { api } from '../api';
import { useLang } from '../i18n/LangContext';

function distMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ICONS = { monumento: '🗿', plaza: '🌳', historia: '⛪', mirador: '⛰️', museo: '🏛️', iglesia: '⛪', otro: '📍' };
const COMERCIO_ICONS = { bodega: '🍇', restaurante: '🍽️', comercio: '🛍️', hotel: '🏨', turismo_aventura: '🥾', otro: '📍' };

const STREETS_LAYER = () =>
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap',
  });

const SATELLITE_LAYER = () =>
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri',
  });

export default function MapView({ onSelectPlace }) {
  const { t, lang } = useLang();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const userMarkerRef = useRef(null);
  const markersRef = useRef([]);
  const streetsLayerRef = useRef(null);
  const satelliteLayerRef = useRef(null);
  const [mode, setMode] = useState('walking'); // walking | driving
  const [view, setView] = useState('streets'); // streets | satellite
  const [statusText, setStatusText] = useState(t.searching);
  const [statusVisible, setStatusVisible] = useState(true);
  const visitedProximity = useRef(new Set());
  const [proximityAlert, setProximityAlert] = useState(null);

  useEffect(() => {
    if (mapInstance.current) return;
    const map = L.map(mapRef.current, { zoomControl: false }).setView([-32.895, -68.85], 13);

    streetsLayerRef.current = STREETS_LAYER().addTo(map);
    satelliteLayerRef.current = SATELLITE_LAYER();

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapInstance.current = map;

    // Salvaguarda: en iOS modo standalone a veces el contenedor arranca con
    // altura 0 antes de que el navegador resuelva el alto real de pantalla.
    // Forzamos a Leaflet a recalcular su tamaño una vez que el layout ya asentó.
    requestAnimationFrame(() => map.invalidateSize());
    setTimeout(() => map.invalidateSize(), 300);
    setTimeout(() => map.invalidateSize(), 1000);

    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    loadPlaces(map);
    locate(map);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      map.remove();
      mapInstance.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleView() {
    const map = mapInstance.current;
    if (!map) return;
    if (view === 'streets') {
      map.removeLayer(streetsLayerRef.current);
      satelliteLayerRef.current.addTo(map);
      setView('satellite');
    } else {
      map.removeLayer(satelliteLayerRef.current);
      streetsLayerRef.current.addTo(map);
      setView('streets');
    }
  }

  async function loadPlaces(map) {
    try {
      const [pois, comercios] = await Promise.all([api.getPois(), api.getComercios()]);
      markersRef.current.forEach((m) => map.removeLayer(m));
      markersRef.current = [];

      const allPlaces = [
        ...pois.map((p) => ({ ...p, _kind: 'poi', icon: ICONS[p.tipo] || p.icono || '📍' })),
        ...comercios.map((c) => ({ ...c, _kind: 'comercio', icon: COMERCIO_ICONS[c.tipo] || '📍' })),
      ];

      allPlaces.forEach((place) => {
        const el = document.createElement('div');
        el.className = 'poi-marker';
        el.style.background = place._kind === 'comercio' ? '#6B1E3C' : '#3C5A45';
        el.innerHTML = `<span>${place.icon}</span>`;
        const icon = L.divIcon({ html: el.outerHTML, className: '', iconSize: [34, 34], iconAnchor: [17, 34] });
        const marker = L.marker([place.lat, place.lng], { icon }).addTo(map);
        marker.on('click', () => onSelectPlace(place));
        markersRef.current.push(marker);
      });

      window.__mendozappPlaces = allPlaces; // usado para chequeo de proximidad
    } catch (err) {
      console.error('Error cargando lugares:', err);
    }
  }

  function locate(map) {
    if (!navigator.geolocation) {
      setStatusText(t.activateGps);
      setStatusVisible(true);
      return;
    }
    setStatusText(t.searching);
    setStatusVisible(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setStatusText(t.found);
        map.setView([latitude, longitude], 15);
        setUserLocation(map, latitude, longitude);
        setTimeout(() => setStatusVisible(false), 1800);

        navigator.geolocation.watchPosition(
          (p) => setUserLocation(map, p.coords.latitude, p.coords.longitude),
          () => {},
          { enableHighAccuracy: true }
        );
      },
      (err) => {
        // Mensaje claro según la razón real (permiso denegado, timeout, etc.)
        if (err.code === 1) {
          setStatusText('Permiso de ubicación denegado. Activalo en la configuración del navegador/celular.');
        } else if (err.code === 2) {
          setStatusText('No se pudo determinar tu ubicación. Probá de nuevo.');
        } else {
          setStatusText(t.activateGps);
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function setUserLocation(map, lat, lng) {
    if (!userMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'user-dot';
      const icon = L.divIcon({ html: el.outerHTML, className: '', iconSize: [18, 18], iconAnchor: [9, 9] });
      userMarkerRef.current = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng([lat, lng]);
    }
    checkProximity(lat, lng);
  }

  function checkProximity(lat, lng) {
    const places = window.__mendozappPlaces || [];
    const radius = mode === 'walking' ? 150 : 400;
    for (const place of places) {
      const id = `${place._kind}-${place.id}`;
      const d = distMeters(lat, lng, place.lat, place.lng);
      if (d < radius && !visitedProximity.current.has(id)) {
        visitedProximity.current.add(id);
        setProximityAlert({ place, meters: Math.round(d) });
        setTimeout(() => setProximityAlert(null), 6000);
        break;
      }
    }
  }

  return (
    <div className="relative flex-1 min-h-0">
      <div ref={mapRef} className="absolute inset-0" />

      {/* Status pill */}
      {statusVisible && (
        <div className="absolute top-3.5 left-1/2 -translate-x-1/2 z-[800] bg-ink/85 text-stone text-xs px-3.5 py-2 rounded-full flex items-center gap-2 max-w-[86%] text-center shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-sun animate-pulse-dot flex-shrink-0" />
          {statusText}
        </div>
      )}

      {/* Proximity toast */}
      {proximityAlert && (
        <div className="absolute left-3.5 right-3.5 top-[70px] z-[1100] bg-paper rounded-2xl p-3.5 flex gap-3 items-center shadow-xl border-l-4 border-sun animate-[fadeIn_.3s]">
          <div className="w-10 h-10 rounded-full bg-stone flex items-center justify-center text-xl flex-shrink-0">
            {proximityAlert.place.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wide text-sun font-bold">{t.nearby}</div>
            <div className="text-sm font-bold truncate">
              {proximityAlert.place._kind === 'poi' ? proximityAlert.place[`nombre_${lang}`] : proximityAlert.place.nombre}
            </div>
            <div className="text-xs text-ink-soft">{t.away(proximityAlert.meters)}</div>
          </div>
          <button
            onClick={() => {
              mapInstance.current.flyTo([proximityAlert.place.lat, proximityAlert.place.lng], 16);
              onSelectPlace(proximityAlert.place);
              setProximityAlert(null);
            }}
            className="bg-malbec text-white text-xs font-bold rounded-lg px-3 py-2 flex-shrink-0"
          >
            {t.view}
          </button>
        </div>
      )}

      {/* Walking / Driving toggle */}
      <div className="absolute left-3.5 bottom-28 z-[800] bg-ink/85 rounded-full p-1 flex gap-1">
        <button
          onClick={() => setMode('walking')}
          className={`text-xs font-semibold px-3 py-2 rounded-full transition-colors ${
            mode === 'walking' ? 'bg-sun text-malbec-deep' : 'text-white/70'
          }`}
        >
          🚶 {t.walking}
        </button>
        <button
          onClick={() => setMode('driving')}
          className={`text-xs font-semibold px-3 py-2 rounded-full transition-colors ${
            mode === 'driving' ? 'bg-sun text-malbec-deep' : 'text-white/70'
          }`}
        >
          🚗 {t.driving}
        </button>
      </div>

      {/* Locate button */}
      <button
        onClick={() => locate(mapInstance.current)}
        className="absolute right-3.5 bottom-28 z-[800] w-11 h-11 rounded-full bg-paper shadow-lg flex items-center justify-center"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#6B1E3C" strokeWidth="2" className="w-5 h-5">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
      </button>

      {/* Satellite / streets toggle */}
      <button
        onClick={toggleView}
        className="absolute right-3.5 bottom-[184px] z-[800] w-11 h-11 rounded-full bg-paper shadow-lg flex items-center justify-center text-lg"
        title={view === 'streets' ? 'Ver satélite' : 'Ver mapa'}
      >
        {view === 'streets' ? '🛰️' : '🗺️'}
      </button>
    </div>
  );
}
