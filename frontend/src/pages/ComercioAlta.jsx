import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import GoogleMapsLinkField from '../components/GoogleMapsLinkField';
import { api } from '../api';

export default function ComercioAlta() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nombre: '', tipo: 'bodega', email: '', telefono: '', direccion: '', lat: '', lng: '', google_maps_link: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.lat || !form.lng) {
      setError('Por favor usá el botón "Usar link" de Google Maps para obtener tu ubicación exacta.');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      // 1. Guardamos el comercio en estado pendiente en la BD
      const { id } = await api.altaComercio(form);
      
      // 2. Generamos la suscripción en Mercado Pago con el precio correcto según el tipo
      const { init_point } = await api.crearSuscripcionMP(id, form.email);
      
      // 3. Redirigimos al usuario a pagar
      window.location.href = init_point;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="h-full flex flex-col bg-stone">
      <Header />
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <button onClick={() => navigate(-1)} className="text-sm font-bold text-malbec mb-4">← Volver</button>
        <div className="font-display text-xl font-bold text-malbec-deep mb-1">Sumá tu comercio</div>
        <p className="text-sm text-ink-soft mb-6">
          Completá tus datos. Al finalizar serás redirigido a Mercado Pago para activar tu suscripción mensual (sin comisiones por venta).
        </p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <label className="text-xs font-semibold text-ink-soft">Nombre del comercio *</label>
            <input required value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="w-full bg-stone rounded-lg px-3 py-2.5 text-sm mt-1 outline-none" />
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-soft">Categoría *</label>
            <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="w-full bg-stone rounded-lg px-3 py-2.5 text-sm mt-1 outline-none">
              <option value="bodega">Bodega ($50.000/mes)</option>
              <option value="restaurante">Restaurante ($30.000/mes)</option>
              <option value="comercio">Pequeño Comercio / Puesto ($10.000/mes)</option>
              <option value="hotel">Hotel ($30.000/mes)</option>
              <option value="turismo_aventura">Turismo Aventura ($30.000/mes)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-soft">Email *</label>
              <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-stone rounded-lg px-3 py-2.5 text-sm mt-1 outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-soft">WhatsApp / Teléfono *</label>
              <input required value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} className="w-full bg-stone rounded-lg px-3 py-2.5 text-sm mt-1 outline-none" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-soft">Dirección física *</label>
            <input required value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})} placeholder="Ej: San Martín 123, Mendoza" className="w-full bg-stone rounded-lg px-3 py-2.5 text-sm mt-1 outline-none" />
          </div>

          <div className="bg-stone-dark/30 p-3 rounded-xl border border-stone-dark">
            <GoogleMapsLinkField
              value={form.google_maps_link}
              onChange={(v) => setForm({ ...form, google_maps_link: v })}
              onResolved={(lat, lng) => setForm({ ...form, lat, lng })}
              lat={form.lat}
              lng={form.lng}
            />
          </div>

          {error && <div className="text-xs text-red-600 font-semibold bg-red-50 p-2 rounded-lg">{error}</div>}

          <button type="submit" disabled={loading} className="w-full bg-sun text-malbec-deep font-bold py-3.5 rounded-xl text-sm disabled:opacity-60 mt-2">
            {loading ? 'Procesando...' : 'Ir a pagar suscripción'}
          </button>
        </form>
      </div>
      <div className="bottomnav-space bg-stone" />
    </div>
  );
}