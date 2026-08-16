import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import GoogleMapsLinkField from '../components/GoogleMapsLinkField';
import { api } from '../api';

/**
 * Calcula qué le falta al comercio para tener una ficha atractiva.
 * El objetivo es que el comerciante entienda que pagar la suscripción no alcanza:
 * si no carga foto y descripción, su ficha se ve vacía en el mapa.
 */
const ESTADO_BADGE = {
  activo: 'bg-green-100 text-green-700',
  prueba: 'bg-blue-100 text-blue-700',
  inactivo: 'bg-gray-200 text-gray-600',
  moroso: 'bg-red-100 text-red-700',
  pendiente: 'bg-yellow-100 text-yellow-700',
};

function formatearARS(monto) {
  if (monto === undefined || monto === null) return '';
  return `$${Number(monto).toLocaleString('es-AR')}`;
}

function analizarPerfil(c) {
  const items = [
    { key: 'foto_url', label: 'Foto principal', ok: !!c.foto_url, peso: 30 },
    { key: 'descripcion_es', label: 'Descripción / historia', ok: !!(c.descripcion_es || '').trim(), peso: 30 },
    { key: 'horario_texto', label: 'Horarios de atención', ok: !!c.horario_texto, peso: 15 },
    { key: 'telefono', label: 'Teléfono de contacto', ok: !!c.telefono, peso: 10 },
    { key: 'google_maps_link', label: 'Ubicación de Google Maps', ok: !!c.google_maps_link, peso: 10 },
    { key: 'instagram', label: 'Instagram', ok: !!c.instagram, peso: 5 },
  ];
  const puntos = items.reduce((acc, i) => acc + (i.ok ? i.peso : 0), 0);
  return { items, puntos, faltantes: items.filter((i) => !i.ok) };
}

export default function ComercioDashboard() {
  const navigate = useNavigate();
  const [comercio, setComercio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [traduciendo, setTraduciendo] = useState(false);
  const [suscribiendo, setSuscribiendo] = useState(false);
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
      const res = await api.updateComercioMe({
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
      setSuccess(
        res.traducida
          ? '¡Datos guardados! Tu descripción se tradujo automáticamente al inglés y portugués.'
          : '¡Tus datos se actualizaron correctamente!'
      );
      await cargarDatos();
      setTimeout(() => setSuccess(''), 6000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  /**
   * Genera la suscripción en Mercado Pago y manda al comerciante a autorizarla.
   * Usa el endpoint autenticado: el backend toma el id del token, así nadie
   * puede generar una suscripción a nombre de otro negocio.
   */
  async function suscribirme() {
    setSuscribiendo(true);
    setError('');
    try {
      const { init_point } = await api.crearMiSuscripcion();
      window.location.href = init_point;
    } catch (err) {
      setError(err.message);
      setSuscribiendo(false);
    }
  }

  async function retraducir() {
    setTraduciendo(true);
    setError('');
    setSuccess('');
    try {
      await api.traducirComercioMe();
      setSuccess('Descripción retraducida al inglés y portugués.');
      await cargarDatos();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setTraduciendo(false);
    }
  }

  if (loading) return <div className="h-full flex items-center justify-center bg-stone">Cargando...</div>;
  if (!comercio) return <div className="h-full flex items-center justify-center bg-stone">Error.</div>;

  const perfil = analizarPerfil(comercio);
  const tieneTraducciones = !!(comercio.descripcion_en || comercio.descripcion_pt);

  return (
    <div className="h-full flex flex-col bg-stone">
      <Header />
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="flex items-center justify-between mb-4">
          <div className="font-display text-xl font-bold text-malbec-deep">Mi Comercio</div>
          <button onClick={cerrarSesion} className="text-xs font-bold text-ink-soft bg-white px-3 py-1.5 rounded-full shadow-sm">
            Salir
          </button>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4 border-l-4 border-malbec">
          <div className="text-lg font-bold">{comercio.nombre}</div>
          <div className="text-xs text-ink-soft capitalize mb-3">{comercio.tipo}</div>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-ink-soft">Estado:</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ESTADO_BADGE[comercio.estado] || 'bg-gray-200 text-gray-700'}`}>
              {comercio.estado === 'prueba' ? 'PRUEBA GRATIS' : comercio.estado.toUpperCase()}
            </span>
            {comercio.visible_en_mapa && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                VISIBLE EN EL MAPA
              </span>
            )}
          </div>

          {/* En prueba: mostramos cuánto queda y ofrecemos suscribirse */}
          {comercio.en_prueba && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="text-sm font-bold text-blue-900 mb-1">
                {comercio.dias_restantes > 0
                  ? `Te quedan ${comercio.dias_restantes} días de prueba gratis`
                  : 'Tu prueba gratis termina hoy'}
              </div>
              <p className="text-xs text-blue-900 leading-relaxed mb-3">
                Cuando termine, tu comercio deja de mostrarse en el mapa. Activá tu suscripción
                para seguir apareciendo, por {formatearARS(comercio.precio_mensual)} por mes.
                Podés cancelarla cuando quieras desde Mercado Pago.
              </p>
              <button
                onClick={suscribirme}
                disabled={suscribiendo}
                className="w-full bg-malbec text-white font-bold py-3 rounded-xl text-sm disabled:opacity-60"
              >
                {suscribiendo ? 'Abriendo Mercado Pago…' : `Activar suscripción · ${formatearARS(comercio.precio_mensual)}/mes`}
              </button>
            </div>
          )}

          {/* Suscripción activa */}
          {comercio.estado === 'activo' && (
            <div className="text-xs text-green-800 bg-green-50 p-3 rounded-xl">
              Suscripción activa
              {comercio.dias_restantes !== null && comercio.dias_restantes >= 0 && (
                <> · se renueva en {comercio.dias_restantes} días</>
              )}
            </div>
          )}

          {/* Inactivo o moroso: no se muestra, hay que reactivar */}
          {['inactivo', 'moroso', 'pendiente'].includes(comercio.estado) && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="text-sm font-bold text-red-800 mb-1">Tu comercio no se está mostrando</div>
              <p className="text-xs text-red-800 leading-relaxed mb-3">
                Activá tu suscripción para volver al mapa por {formatearARS(comercio.precio_mensual)} por mes.
              </p>
              <button
                onClick={suscribirme}
                disabled={suscribiendo}
                className="w-full bg-malbec text-white font-bold py-3 rounded-xl text-sm disabled:opacity-60"
              >
                {suscribiendo ? 'Abriendo Mercado Pago…' : `Activar suscripción · ${formatearARS(comercio.precio_mensual)}/mes`}
              </button>
            </div>
          )}
        </div>

        {/* AVISO DE PERFIL INCOMPLETO */}
        {perfil.faltantes.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-bold text-amber-900">Tu ficha está incompleta</div>
              <span className="text-xs font-bold text-amber-900 bg-amber-200 px-2 py-0.5 rounded-full">
                {perfil.puntos}%
              </span>
            </div>
            <div className="w-full h-2 bg-amber-200 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-amber-500 transition-all" style={{ width: `${perfil.puntos}%` }} />
            </div>
            <p className="text-xs text-amber-900 leading-relaxed mb-2">
              Los turistas ven tu negocio en el mapa, pero al tocarlo tu ficha se muestra sin
              {' '}{perfil.faltantes.map((f) => f.label.toLowerCase()).join(', ')}. Completá estos datos para que
              tu comercio se vea profesional y reciba más visitas:
            </p>
            <ul className="space-y-1">
              {perfil.items.map((i) => (
                <li key={i.key} className="text-xs flex items-center gap-2">
                  <span>{i.ok ? '✅' : '⬜️'}</span>
                  <span className={i.ok ? 'text-amber-900/60 line-through' : 'text-amber-900 font-semibold'}>
                    {i.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {perfil.faltantes.length === 0 && (
          <div className="bg-green-50 border border-green-300 rounded-2xl p-4 mb-4">
            <div className="text-sm font-bold text-green-800">✅ Tu ficha está completa</div>
            <p className="text-xs text-green-800 mt-1">
              Los turistas ven tu foto, tu historia y tus datos de contacto. Mantené tus horarios actualizados.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <div className="text-sm font-bold text-malbec border-b border-stone-dark pb-1 mb-3">Información Pública</div>

          <div>
            <label className="text-xs font-semibold text-ink-soft">Descripción / Historia (la lee la app en voz alta)</label>
            <textarea
              rows="4"
              value={comercio.descripcion_es || ''}
              onChange={(e) => setComercio({ ...comercio, descripcion_es: e.target.value })}
              placeholder="Contá la historia de tu lugar: cuándo abrió, qué lo hace especial, qué puede esperar quien te visita. Los turistas escuchan este texto narrado cuando pasan cerca."
              className="w-full bg-stone rounded-lg px-3 py-2.5 text-sm mt-1 outline-none"
            />
            <div className="flex items-center justify-between mt-1.5 gap-2">
              <span className="text-[11px] text-ink-soft">
                {tieneTraducciones
                  ? '🌐 Traducida automáticamente a inglés y portugués'
                  : 'Se traduce sola al guardar (inglés y portugués)'}
              </span>
              {tieneTraducciones && (
                <button
                  type="button"
                  onClick={retraducir}
                  disabled={traduciendo}
                  className="text-[11px] font-bold text-malbec underline disabled:opacity-50 flex-shrink-0"
                >
                  {traduciendo ? 'Traduciendo…' : 'Volver a traducir'}
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-soft">Foto principal</label>
            <input
              value={comercio.foto_url || ''}
              onChange={(e) => setComercio({ ...comercio, foto_url: e.target.value })}
              placeholder="https://..."
              className="w-full bg-stone rounded-lg px-3 py-2.5 text-sm mt-1 outline-none"
            />
            <p className="text-[11px] text-ink-soft mt-1.5 leading-relaxed">
              Pegá el <b>link directo</b> a una foto que ya esté publicada en internet. Si no tenés una,
              podés subirla gratis a <a href="https://postimages.org" target="_blank" rel="noreferrer" className="text-malbec underline">postimages.org</a>{' '}
              y copiar el "Direct link" que te dan. El link tiene que terminar en .jpg o .png.
            </p>
            {comercio.foto_url && (
              <img
                src={comercio.foto_url}
                alt=""
                className="w-full h-32 object-cover rounded-lg mt-2"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                onLoad={(e) => { e.currentTarget.style.display = 'block'; }}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-soft">Teléfono / Reservas</label>
              <input
                value={comercio.telefono || ''}
                onChange={(e) => setComercio({ ...comercio, telefono: e.target.value })}
                className="w-full bg-stone rounded-lg px-3 py-2.5 text-sm mt-1 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-soft">Horarios</label>
              <input
                value={comercio.horario_texto || ''}
                onChange={(e) => setComercio({ ...comercio, horario_texto: e.target.value })}
                placeholder="Ej: Mar a Dom 10 a 18"
                className="w-full bg-stone rounded-lg px-3 py-2.5 text-sm mt-1 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-soft">Sitio Web</label>
              <input
                value={comercio.sitio_web || ''}
                onChange={(e) => setComercio({ ...comercio, sitio_web: e.target.value })}
                className="w-full bg-stone rounded-lg px-3 py-2.5 text-sm mt-1 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-soft">Instagram (@)</label>
              <input
                value={comercio.instagram || ''}
                onChange={(e) => setComercio({ ...comercio, instagram: e.target.value })}
                className="w-full bg-stone rounded-lg px-3 py-2.5 text-sm mt-1 outline-none"
              />
            </div>
          </div>

          <div className="text-sm font-bold text-malbec border-b border-stone-dark pb-1 mb-3 pt-3">Ubicación</div>
          <div>
            <label className="text-xs font-semibold text-ink-soft">Dirección</label>
            <input
              value={comercio.direccion || ''}
              onChange={(e) => setComercio({ ...comercio, direccion: e.target.value })}
              className="w-full bg-stone rounded-lg px-3 py-2.5 text-sm mt-1 outline-none"
            />
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

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-malbec text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-60 mt-4"
          >
            {saving ? 'Guardando y traduciendo...' : 'Guardar Cambios'}
          </button>
        </form>
      </div>
      <div className="bottomnav-space bg-stone" />
    </div>
  );
}
