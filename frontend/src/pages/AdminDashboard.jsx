import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLang } from '../i18n/LangContext';
import { api } from '../api';
import logo from '../assets/logo.png';
import GoogleMapsLinkField from '../components/GoogleMapsLinkField';

const ESTADO_COLOR = {
  activo: 'bg-green-100 text-green-700',
  inactivo: 'bg-gray-200 text-gray-600',
  pendiente: 'bg-yellow-100 text-yellow-700',
  moroso: 'bg-red-100 text-red-700',
};

const EMPTY_COMERCIO = {
  nombre: '', tipo: 'bodega', descripcion_es: '', direccion: '',
  lat: '', lng: '', google_maps_link: '', foto_url: '',
  telefono: '', whatsapp: '', email: '',
  sitio_web: '', instagram: '', horario_texto: '', destacado: false,
  estado: 'pendiente', plan: 'estandar', fecha_vencimiento: '',
};

const EMPTY_POI = {
  tipo: 'monumento', icono: '📍',
  nombre_es: '', nombre_en: '', nombre_pt: '',
  sub_es: '', sub_en: '', sub_pt: '',
  historia_es: '', historia_en: '', historia_pt: '',
  lat: '', lng: '', google_maps_link: '', activo: true,
};

const EMPTY_BANNER = {
  texto_es: '', texto_en: '', texto_pt: '', link: '', color_fondo: '#6B1E3C', activo: true, orden: 0,
};

const POI_TIPOS = ['monumento', 'plaza', 'historia', 'mirador', 'museo', 'iglesia', 'emergencia', 'otro'];
const POI_ICONOS = [
  '📍', '🗿', '🌳', '⛪', '⛰️', '🏛️', '🍷', '🏞️',
  '🚨', '👮', '🚑', '🚒', // emergencias
  '🏨', '✝️', '💎', '🎖️', '🐎', '⛲', // monumentos e historia
  '🦇', '🕳️', '🎣', '🍎', // naturaleza
  '🦴', '🏺', '🖼️', '🏍️', // museos
  '🏄', '🚣', '🎭', '🥾', // deportes/aventura
];

export default function AdminDashboard() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [tab, setTab] = useState('comercios');
  const [comercios, setComercios] = useState([]);
  const [pois, setPois] = useState([]);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showComercioForm, setShowComercioForm] = useState(false);
  const [editingComercio, setEditingComercio] = useState(null);
  const [comercioForm, setComercioForm] = useState(EMPTY_COMERCIO);

  const [showPoiForm, setShowPoiForm] = useState(false);
  const [editingPoi, setEditingPoi] = useState(null);
  const [poiForm, setPoiForm] = useState(EMPTY_POI);

  const [showBannerForm, setShowBannerForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [bannerForm, setBannerForm] = useState(EMPTY_BANNER);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [c, p, b] = await Promise.all([api.getAllComercios(), api.getAllPois(), api.getAllBanners()]);
      setComercios(c);
      setPois(p);
      setBanners(b);
    } catch (err) {
      if (err.message.includes('Token') || err.message.includes('autorizado')) {
        localStorage.removeItem('mendozapp_admin_token');
        navigate('/admin/login');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('mendozapp_admin_token');
    navigate('/');
  }

  /* ---------- COMERCIOS ---------- */
  function openNewComercio() {
    setEditingComercio(null);
    setComercioForm(EMPTY_COMERCIO);
    setShowComercioForm(true);
  }
  function openEditComercio(c) {
    setEditingComercio(c);
    setComercioForm({ ...EMPTY_COMERCIO, ...c, fecha_vencimiento: c.fecha_vencimiento ? c.fecha_vencimiento.slice(0, 10) : '' });
    setShowComercioForm(true);
  }
  async function saveComercio(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...comercioForm, lat: parseFloat(comercioForm.lat), lng: parseFloat(comercioForm.lng) };
      if (editingComercio) await api.updateComercio(editingComercio.id, payload);
      else await api.createComercio(payload);
      setShowComercioForm(false);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }
  async function deleteComercio(id, nombre) {
    if (!window.confirm(`¿Eliminar "${nombre}" definitivamente?`)) return;
    try { await api.deleteComercio(id); loadAll(); } catch (err) { setError(err.message); }
  }

  /* ---------- POIS (espacios públicos) ---------- */
  function openNewPoi() {
    setEditingPoi(null);
    setPoiForm(EMPTY_POI);
    setShowPoiForm(true);
  }
  function openEditPoi(p) {
    setEditingPoi(p);
    setPoiForm({ ...EMPTY_POI, ...p });
    setShowPoiForm(true);
  }
  async function savePoi(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...poiForm, lat: parseFloat(poiForm.lat), lng: parseFloat(poiForm.lng) };
      if (editingPoi) await api.updatePoi(editingPoi.id, payload);
      else await api.createPoi(payload);
      setShowPoiForm(false);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }
  async function deletePoi(id, nombre) {
    if (!window.confirm(`¿Eliminar "${nombre}" definitivamente?`)) return;
    try { await api.deletePoi(id); loadAll(); } catch (err) { setError(err.message); }
  }

  /* ---------- BANNERS ---------- */
  function openNewBanner() {
    setEditingBanner(null);
    setBannerForm(EMPTY_BANNER);
    setShowBannerForm(true);
  }
  function openEditBanner(b) {
    setEditingBanner(b);
    setBannerForm({ ...EMPTY_BANNER, ...b });
    setShowBannerForm(true);
  }
  async function saveBanner(e) {
    e.preventDefault();
    setError('');
    try {
      if (editingBanner) await api.updateBanner(editingBanner.id, bannerForm);
      else await api.createBanner(bannerForm);
      setShowBannerForm(false);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }
  async function toggleBanner(b) {
    await api.updateBanner(b.id, { activo: !b.activo });
    loadAll();
  }
  async function deleteBanner(id) {
    if (!window.confirm('¿Eliminar este banner definitivamente?')) return;
    try { await api.deleteBanner(id); loadAll(); } catch (err) { setError(err.message); }
  }

  if (loading) return <div className="h-full flex items-center justify-center text-ink-soft text-sm">…</div>;

  return (
    <div className="h-full flex flex-col bg-stone">
      <div className="bg-gradient-to-b from-malbec to-malbec-deep text-white px-4 py-3 flex items-center justify-between">
        <img src={logo} alt="Mendozapp" className="h-6 object-contain object-left" />
        <div className="flex items-center gap-2">
          <Link to="/" className="text-xs font-semibold bg-white/10 px-3 py-2 rounded-lg">← {t.back_to_web}</Link>
          <button onClick={logout} className="text-xs font-semibold bg-white/10 px-3 py-2 rounded-lg">{t.logout}</button>
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="font-display text-lg font-bold text-malbec-deep">{t.admin_panel}</div>
      </div>

      <div className="flex gap-2 px-4 pt-3 overflow-x-auto">
        <button onClick={() => setTab('comercios')} className={`flex-shrink-0 text-xs font-bold px-4 py-2 rounded-full ${tab === 'comercios' ? 'bg-malbec text-white' : 'bg-white text-ink-soft'}`}>
          Comercios ({comercios.length})
        </button>
        <button onClick={() => setTab('pois')} className={`flex-shrink-0 text-xs font-bold px-4 py-2 rounded-full ${tab === 'pois' ? 'bg-malbec text-white' : 'bg-white text-ink-soft'}`}>
          Espacios públicos ({pois.length})
        </button>
        <button onClick={() => setTab('banners')} className={`flex-shrink-0 text-xs font-bold px-4 py-2 rounded-full ${tab === 'banners' ? 'bg-malbec text-white' : 'bg-white text-ink-soft'}`}>
          Banners ({banners.length})
        </button>
      </div>

      {error && <div className="mx-4 mt-3 text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</div>}

      {/* TAB COMERCIOS */}
      {tab === 'comercios' && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
          <button onClick={openNewComercio} className="w-full bg-sun text-malbec-deep font-bold py-3 rounded-xl text-sm mb-2">
            + Nuevo comercio / bodega (con suscripción)
          </button>
          {comercios.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm flex gap-3">
              {c.foto_url ? (
                <img src={c.foto_url} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-stone flex items-center justify-center text-xl flex-shrink-0">🍇</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate">{c.nombre}</div>
                    <div className="text-xs text-ink-soft">{c.tipo} · {c.direccion || 'sin dirección'}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${ESTADO_COLOR[c.estado]}`}>{c.estado}</span>
                </div>
                <div className="flex gap-2 mt-2.5">
                  <button onClick={() => openEditComercio(c)} className="flex-1 text-xs font-bold bg-stone text-ink py-2 rounded-lg">Editar</button>
                  <button onClick={() => deleteComercio(c.id, c.nombre)} className="flex-1 text-xs font-bold bg-red-50 text-red-600 py-2 rounded-lg">Eliminar</button>
                </div>
              </div>
            </div>
          ))}
          {comercios.length === 0 && <div className="text-center text-ink-soft text-sm mt-8">Todavía no cargaste comercios.</div>}
        </div>
      )}

      {/* TAB ESPACIOS PÚBLICOS */}
      {tab === 'pois' && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
          <button onClick={openNewPoi} className="w-full bg-sun text-malbec-deep font-bold py-3 rounded-xl text-sm mb-2">
            + Nuevo espacio público (gratis, sin suscripción)
          </button>
          {pois.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="text-lg flex-shrink-0">{p.icono}</span>
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate">{p.nombre_es}</div>
                    <div className="text-xs text-ink-soft">{p.tipo} · {p.lat}, {p.lng}</div>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${p.activo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                  {p.activo ? 'visible' : 'oculto'}
                </span>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => openEditPoi(p)} className="flex-1 text-xs font-bold bg-stone text-ink py-2 rounded-lg">Editar</button>
                <button onClick={() => deletePoi(p.id, p.nombre_es)} className="flex-1 text-xs font-bold bg-red-50 text-red-600 py-2 rounded-lg">Eliminar</button>
              </div>
            </div>
          ))}
          {pois.length === 0 && <div className="text-center text-ink-soft text-sm mt-8">Todavía no hay espacios públicos cargados.</div>}
        </div>
      )}

      {/* TAB BANNERS */}
      {tab === 'banners' && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
          <button onClick={openNewBanner} className="w-full bg-sun text-malbec-deep font-bold py-3 rounded-xl text-sm mb-2">
            + Nuevo banner
          </button>
          {banners.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="text-sm font-semibold">{b.texto_es}</div>
              <div className="text-xs text-ink-soft mt-0.5">{b.activo ? 'Activo' : 'Oculto'}</div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => openEditBanner(b)} className="flex-1 text-xs font-bold bg-stone text-ink py-2 rounded-lg">Editar</button>
                <button onClick={() => toggleBanner(b)} className={`flex-1 text-xs font-bold py-2 rounded-lg ${b.activo ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                  {b.activo ? 'Ocultar' : 'Activar'}
                </button>
                <button onClick={() => deleteBanner(b.id)} className="flex-1 text-xs font-bold bg-red-50 text-red-600 py-2 rounded-lg">Eliminar</button>
              </div>
            </div>
          ))}
          {banners.length === 0 && <div className="text-center text-ink-soft text-sm mt-8">No hay banners creados todavía.</div>}
        </div>
      )}

      {/* MODAL COMERCIO */}
      {showComercioForm && (
        <div className="fixed inset-0 z-[2000] bg-black/50 flex items-end justify-center">
          <div className="w-full max-w-[520px] bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto p-5">
            <div className="font-display text-lg font-bold text-malbec-deep mb-4">
              {editingComercio ? 'Editar comercio' : 'Nuevo comercio'}
            </div>
            <form onSubmit={saveComercio} className="space-y-3">
              <Field label="Nombre *" value={comercioForm.nombre} onChange={(v) => setComercioForm({ ...comercioForm, nombre: v })} required />
              <div>
                <label className="text-xs font-semibold text-ink-soft">Tipo</label>
                <select value={comercioForm.tipo} onChange={(e) => setComercioForm({ ...comercioForm, tipo: e.target.value })} className="w-full bg-stone rounded-lg px-3 py-2.5 text-sm mt-1">
                  <option value="bodega">Bodega</option>
                  <option value="restaurante">Restaurante</option>
                  <option value="comercio">Comercio</option>
                  <option value="hotel">Hotel</option>
                  <option value="turismo_aventura">Turismo aventura</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <Field label="Descripción" value={comercioForm.descripcion_es} onChange={(v) => setComercioForm({ ...comercioForm, descripcion_es: v })} textarea />
              <Field label="Foto (URL de la imagen)" value={comercioForm.foto_url} onChange={(v) => setComercioForm({ ...comercioForm, foto_url: v })} placeholder="https://..." />
              {comercioForm.foto_url && <img src={comercioForm.foto_url} alt="" className="w-full h-32 object-cover rounded-lg" />}
              <Field label="Dirección" value={comercioForm.direccion} onChange={(v) => setComercioForm({ ...comercioForm, direccion: v })} />

              <GoogleMapsLinkField
                value={comercioForm.google_maps_link}
                onChange={(v) => setComercioForm({ ...comercioForm, google_maps_link: v })}
                onResolved={(lat, lng) => setComercioForm((f) => ({ ...f, lat, lng }))}
                lat={comercioForm.lat}
                lng={comercioForm.lng}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Latitud *" value={comercioForm.lat} onChange={(v) => setComercioForm({ ...comercioForm, lat: v })} required />
                <Field label="Longitud *" value={comercioForm.lng} onChange={(v) => setComercioForm({ ...comercioForm, lng: v })} required />
              </div>

              <Field label="Teléfono" value={comercioForm.telefono} onChange={(v) => setComercioForm({ ...comercioForm, telefono: v })} />
              <Field label="WhatsApp" value={comercioForm.whatsapp} onChange={(v) => setComercioForm({ ...comercioForm, whatsapp: v })} />
              <Field label="Email" value={comercioForm.email} onChange={(v) => setComercioForm({ ...comercioForm, email: v })} />
              <Field label="Sitio web" value={comercioForm.sitio_web} onChange={(v) => setComercioForm({ ...comercioForm, sitio_web: v })} />
              <Field label="Instagram" value={comercioForm.instagram} onChange={(v) => setComercioForm({ ...comercioForm, instagram: v })} />
              <Field label="Horario" value={comercioForm.horario_texto} onChange={(v) => setComercioForm({ ...comercioForm, horario_texto: v })} />

              <div>
                <label className="text-xs font-semibold text-ink-soft">Estado de suscripción</label>
                <select value={comercioForm.estado} onChange={(e) => setComercioForm({ ...comercioForm, estado: e.target.value })} className="w-full bg-stone rounded-lg px-3 py-2.5 text-sm mt-1">
                  <option value="pendiente">Pendiente</option>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="moroso">Moroso</option>
                </select>
              </div>
              <Field label="Vencimiento" value={comercioForm.fecha_vencimiento} onChange={(v) => setComercioForm({ ...comercioForm, fecha_vencimiento: v })} type="date" />

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!comercioForm.destacado} onChange={(e) => setComercioForm({ ...comercioForm, destacado: e.target.checked })} />
                Destacado (aparece primero en el listado)
              </label>

              <div className="flex gap-2.5 pt-2 pb-2">
                <button type="button" onClick={() => setShowComercioForm(false)} className="flex-1 bg-stone text-ink font-bold py-3 rounded-xl text-sm">Cancelar</button>
                <button type="submit" className="flex-1 bg-malbec text-white font-bold py-3 rounded-xl text-sm">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL POI (espacio público) */}
      {showPoiForm && (
        <div className="fixed inset-0 z-[2000] bg-black/50 flex items-end justify-center">
          <div className="w-full max-w-[520px] bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto p-5">
            <div className="font-display text-lg font-bold text-malbec-deep mb-4">
              {editingPoi ? 'Editar espacio público' : 'Nuevo espacio público'}
            </div>
            <form onSubmit={savePoi} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-ink-soft">Tipo</label>
                  <select value={poiForm.tipo} onChange={(e) => setPoiForm({ ...poiForm, tipo: e.target.value })} className="w-full bg-stone rounded-lg px-3 py-2.5 text-sm mt-1">
                    {POI_TIPOS.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-soft">Ícono</label>
                  <select value={poiForm.icono} onChange={(e) => setPoiForm({ ...poiForm, icono: e.target.value })} className="w-full bg-stone rounded-lg px-3 py-2.5 text-sm mt-1">
                    {POI_ICONOS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                  </select>
                </div>
              </div>

              <Field label="Nombre (español) *" value={poiForm.nombre_es} onChange={(v) => setPoiForm({ ...poiForm, nombre_es: v })} required />
              <Field label="Nombre (inglés)" value={poiForm.nombre_en} onChange={(v) => setPoiForm({ ...poiForm, nombre_en: v })} />
              <Field label="Nombre (portugués)" value={poiForm.nombre_pt} onChange={(v) => setPoiForm({ ...poiForm, nombre_pt: v })} />

              <Field label="Subtítulo (español)" value={poiForm.sub_es} onChange={(v) => setPoiForm({ ...poiForm, sub_es: v })} placeholder="Ej: Maipú · Fundada en 1900" />
              <Field label="Subtítulo (inglés)" value={poiForm.sub_en} onChange={(v) => setPoiForm({ ...poiForm, sub_en: v })} />
              <Field label="Subtítulo (portugués)" value={poiForm.sub_pt} onChange={(v) => setPoiForm({ ...poiForm, sub_pt: v })} />

              <Field label="Historia (español)" value={poiForm.historia_es} onChange={(v) => setPoiForm({ ...poiForm, historia_es: v })} textarea />
              <Field label="Historia (inglés)" value={poiForm.historia_en} onChange={(v) => setPoiForm({ ...poiForm, historia_en: v })} textarea />
              <Field label="Historia (portugués)" value={poiForm.historia_pt} onChange={(v) => setPoiForm({ ...poiForm, historia_pt: v })} textarea />

              <GoogleMapsLinkField
                value={poiForm.google_maps_link}
                onChange={(v) => setPoiForm({ ...poiForm, google_maps_link: v })}
                onResolved={(lat, lng) => setPoiForm((f) => ({ ...f, lat, lng }))}
                lat={poiForm.lat}
                lng={poiForm.lng}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Latitud *" value={poiForm.lat} onChange={(v) => setPoiForm({ ...poiForm, lat: v })} required />
                <Field label="Longitud *" value={poiForm.lng} onChange={(v) => setPoiForm({ ...poiForm, lng: v })} required />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!poiForm.activo} onChange={(e) => setPoiForm({ ...poiForm, activo: e.target.checked })} />
                Visible en el mapa
              </label>

              <div className="flex gap-2.5 pt-2 pb-2">
                <button type="button" onClick={() => setShowPoiForm(false)} className="flex-1 bg-stone text-ink font-bold py-3 rounded-xl text-sm">Cancelar</button>
                <button type="submit" className="flex-1 bg-malbec text-white font-bold py-3 rounded-xl text-sm">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL BANNER */}
      {showBannerForm && (
        <div className="fixed inset-0 z-[2000] bg-black/50 flex items-end justify-center">
          <div className="w-full max-w-[520px] bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto p-5">
            <div className="font-display text-lg font-bold text-malbec-deep mb-4">
              {editingBanner ? 'Editar banner' : 'Nuevo banner'}
            </div>
            <form onSubmit={saveBanner} className="space-y-3">
              <Field label="Texto (español) *" value={bannerForm.texto_es} onChange={(v) => setBannerForm({ ...bannerForm, texto_es: v })} required />
              <Field label="Texto (inglés)" value={bannerForm.texto_en} onChange={(v) => setBannerForm({ ...bannerForm, texto_en: v })} />
              <Field label="Texto (portugués)" value={bannerForm.texto_pt} onChange={(v) => setBannerForm({ ...bannerForm, texto_pt: v })} />
              <Field label="Link (opcional)" value={bannerForm.link} onChange={(v) => setBannerForm({ ...bannerForm, link: v })} placeholder="https://..." />
              <div>
                <label className="text-xs font-semibold text-ink-soft">Color de fondo</label>
                <input type="color" value={bannerForm.color_fondo} onChange={(e) => setBannerForm({ ...bannerForm, color_fondo: e.target.value })} className="w-full h-10 mt-1 rounded-lg" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!bannerForm.activo} onChange={(e) => setBannerForm({ ...bannerForm, activo: e.target.checked })} />
                Activo
              </label>
              <div className="flex gap-2.5 pt-2 pb-2">
                <button type="button" onClick={() => setShowBannerForm(false)} className="flex-1 bg-stone text-ink font-bold py-3 rounded-xl text-sm">Cancelar</button>
                <button type="submit" className="flex-1 bg-malbec text-white font-bold py-3 rounded-xl text-sm">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, required, textarea, type = 'text', placeholder }) {
  return (
    <div>
      <label className="text-xs font-semibold text-ink-soft">{label}</label>
      {textarea ? (
        <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} rows={3} placeholder={placeholder} className="w-full bg-stone rounded-lg px-3 py-2.5 text-sm mt-1 outline-none" />
      ) : (
        <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder} className="w-full bg-stone rounded-lg px-3 py-2.5 text-sm mt-1 outline-none" />
      )}
    </div>
  );
}
