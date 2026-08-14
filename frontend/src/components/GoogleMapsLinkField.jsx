import React, { useState } from 'react';
import { api } from '../api';

/**
 * Campo para pegar un link de Google Maps (corto o largo) y sacar lat/lng exactos.
 *
 * IMPORTANTE: este componente lo usan DOS pantallas distintas:
 *  - el panel de admin (con token de superadmin en localStorage)
 *  - el alta pública de comercios (sin ningún token)
 *
 * Por eso elige el endpoint según haya o no sesión de admin: /api/admin/geocode
 * está protegido con requireAdmin y devolvía 401 al comerciante, dejando el alta
 * completamente bloqueada (el form exige lat/lng para poder enviarse).
 */
export default function GoogleMapsLinkField({ value, onChange, onResolved, lat, lng }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  async function resolve() {
    if (!value) return;
    setLoading(true);
    setError('');
    setOk(false);
    try {
      const esAdmin = !!localStorage.getItem('mendozapp_admin_token');
      const { lat: newLat, lng: newLng } = esAdmin
        ? await api.geocode(value)
        : await api.geocodePublico(value);
      onResolved(newLat, newLng);
      setOk(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <label className="text-xs font-semibold text-ink-soft">
        Link de Google Maps (abrí el lugar en Maps → Compartir → Copiar link, y pegalo acá)
      </label>
      <div className="flex gap-2 mt-1">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => {
            onChange(e.target.value);
            setOk(false);
          }}
          placeholder="https://maps.app.goo.gl/..."
          className="flex-1 bg-stone rounded-lg px-3 py-2.5 text-sm outline-none"
        />
        <button
          type="button"
          onClick={resolve}
          disabled={!value || loading}
          className="flex-shrink-0 bg-malbec text-white text-xs font-bold px-3 rounded-lg disabled:opacity-50"
        >
          {loading ? '…' : 'Usar link'}
        </button>
      </div>
      {ok && (
        <div className="text-[11px] text-green-700 mt-1">
          ✓ Ubicación confirmada: {lat}, {lng}
        </div>
      )}
      {error && <div className="text-[11px] text-red-600 mt-1">{error}</div>}
      {!ok && !error && (lat || lng) && (
        <div className="text-[11px] text-ink-soft mt-1">
          Coordenada actual: {lat}, {lng}
        </div>
      )}
    </div>
  );
}
