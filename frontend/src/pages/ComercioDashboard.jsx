import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import GoogleMapsLinkField from '../components/GoogleMapsLinkField';
import { api } from '../api';

export default function ComercioDashboard() {
  const navigate = useNavigate();
  const [comercio, setComercio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    try {
      const data = await api.getComercioMe();
      setComercio(data);
    } catch (err) {
      if (err.message.includes('Token') || err.message.includes('autorizado')) {
        cerrarSesion();
      } else {
        setError('Error al cargar tus datos.');
      }
    } finally {
      setLoading(false);
    }
  }

  function cerrarSesion() {
    localStorage.removeItem('mendozapp_comercio_token');
    navigate('/comercio/login');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.updateComercioMe({
        descripcion_es: comercio.descripcion_es,
        direccion: comercio.direccion,
        lat: parseFloat(comercio.lat),
        lng: parseFloat(comercio.lng),
        telefono: comercio.telefono,
        whatsapp: comercio.whatsapp,
        sitio_web: comercio.sitio_web,
        instagram: comercio.instagram,
        foto_url: comercio.foto_url,
        horario_texto: comercio.horario_texto,
        google_maps_link: comercio.google_maps_link,
      });
      setSuccess('¡Tus datos se actualizaron correctamente!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="h-full flex items-center justify-center bg-stone">Cargando...</div>;
  if (!comercio) return <div className="h-full flex items-center justify-center bg-stone">Error.</div>;

  return (
    <div className="h-full flex flex-col bg-stone">
      <Header />
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="flex items-center justify-between mb-4">
          <div className="font-display text-xl font-bold text-malbec-deep">Mi Comercio</div>
          <button onClick={cerrarSesion} className="text-xs font-bold text-ink-soft bg-white px-3 py-1.5 rounded-full shadow-sm">Salir</button>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4 border-l-4 border-malbec">
          <div className="text-lg font-bold">{comercio.nombre}</div>
          <div className="text-xs text-ink-soft capitalize mb-2">{comercio.tipo}</div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-ink-soft">Estado de suscripción:</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${comercio.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {comercio.estado.toUpperCase()}
            </span>
          </div>
          {comercio.estado !== 'activo' && (
            <div className="mt-3 text-xs text-red-600 font-semibold bg-red-50 p-2 rounded-lg">
              Tu comercio no se está mostrando en el mapa. Por favor, regularizá tu suscripción.
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <div className="text-sm font-bold text-malbec border-b border-stone-dark pb-1 mb-3">Información Pública</div>
          
          <div>
            <label className="text-xs font-semibold text-ink-soft">Descripción / Historia (Leída por IA)</label>
            <textarea rows="3" value={comercio.descripcion_es || ''} onChange={e => setComercio({...comercio, descripcion_es: e.target.value})} className="w-full bg-stone rounded-lg px-3 py-2.5 text-sm mt-1 outline-none" />
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-soft">Foto principal (Link de imagen)</label>
            <input value={comercio.foto_url || ''} onChange={e => setComercio({...comercio, foto_url: e.target.value})} placeholder="https://..." className="w-full bg-stone rounded-lg px-3 py-2.5 text-sm mt-1 outline-none" />
            {comercio.foto_url && <img src={comercio.foto_url} alt="" className="w-full h-24 object-cover rounded-lg mt-2" />}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-soft">Teléfono / Reservas</label>
              <input value={comercio.telefono || ''} onChange={e => setComercio({...comercio, telefono: e.target.value})} className="w-full bg-stone rounded-lg px-3 py-2.5 text-sm mt-1 outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-soft">Horarios</label>
              <input value={comercio.horario_texto || ''} onChange={e => setComercio({...comercio, horario_texto: e.target.value})} placeholder="Ej: Mar a Dom 10 a 18" className="w-full bg-stone rounded-lg px-3 py-2.5 text-sm mt-1 outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-soft">Sitio Web</label>
              <input value={comercio.sitio_web || ''} onChange={e => setComercio({...comercio, sitio_web: e.target.value})} className="w-full bg-stone rounded-lg px-3 py-2.5 text-sm mt-1 outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-soft">Instagram (@)</label>
              <input value={comercio.instagram || ''} onChange={e => setComercio({...comercio, instagram: e.target.value})} className="w-full bg-stone rounded-lg px-3 py-2.5 text-sm mt-1 outline-none" />
            </div>
          </div>

          <div className="text-sm font-bold text-malbec border-b border-stone-dark pb-1 mb-3 pt-3">Ubicación</div>
          <div>
            <label className="text-xs font-semibold text-ink-soft">Dirección</label>
            <input value={comercio.direccion || ''} onChange={e => setComercio({...comercio, direccion: e.target.value})} className="w-full bg-stone rounded-lg px-3 py-2.5 text-sm mt-1 outline-none" />
          </div>

          <div className="bg-stone-dark/30 p-3 rounded-xl border border-stone-dark">
            <GoogleMapsLinkField
              value={comercio.google_maps_link}
              onChange={(v) => setComercio({ ...comercio, google_maps_link: v })}
              onResolved={(lat, lng) => setComercio({ ...comercio, lat, lng })}
              lat={comercio.lat}
              lng={comercio.lng}
            />
          </div>

          {error && <div className="text-xs text-red-600 font-semibold bg-red-50 p-2 rounded-lg">{error}</div>}
          {success && <div className="text-xs text-green-700 font-semibold bg-green-50 p-2 rounded-lg">{success}</div>}

          <button type="submit" disabled={saving} className="w-full bg-malbec text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-60 mt-4">
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      </div>
      <div className="bottomnav-space bg-stone" />
    </div>
  );
}