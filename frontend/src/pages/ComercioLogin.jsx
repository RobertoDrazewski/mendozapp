import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import { api } from '../api';

export default function ComercioLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Si ya tiene token, lo mandamos derecho al dashboard
  useEffect(() => {
    if (localStorage.getItem('mendozapp_comercio_token')) {
      navigate('/comercio/dashboard');
    }
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await api.comercioLogin(email, password);
      localStorage.setItem('mendozapp_comercio_token', token);
      navigate('/comercio/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full flex flex-col bg-stone">
      <Header />
      
      {/* Contenedor con scroll propio para que nunca se corte la vista */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col items-center">
        
        {/* --- SECCIÓN DE MARKETING (Pitch de por qué sumarse) --- */}
        <div className="w-full max-w-[400px] bg-gradient-to-br from-malbec to-malbec-deep text-white rounded-3xl p-6 shadow-xl mb-6 text-center relative overflow-hidden flex-shrink-0">
          <div className="text-3xl mb-2 relative z-10">🚀</div>
          <h2 className="font-display text-xl font-bold mb-2 relative z-10">¿Por qué Mendozapp es mejor que Google Maps?</h2>
          <p className="text-xs text-white/90 mb-4 leading-relaxed relative z-10">
            Una guía turística inteligente pensada para llevar clientes reales directamente a tu puerta o WhatsApp.
          </p>
          
          <div className="flex flex-col gap-2.5 text-left bg-black/20 rounded-2xl p-3.5 text-xs mb-5 relative z-10">
            <div className="flex items-start gap-2">
              <span className="text-sun text-sm leading-none mt-0.5">🔔</span> 
              <span><strong className="text-white">Alertas de proximidad:</strong> Le avisamos al turista en su celular cuando pasa cerca de tu local. (Google Maps no hace esto).</span>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="text-sun text-sm leading-none mt-0.5">🎙️</span> 
              <span><strong className="text-white">IA en 3 idiomas:</strong> Narramos la historia de tu comercio automáticamente según el idioma del visitante.</span>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="text-sun text-sm leading-none mt-0.5">🎯</span> 
              <span><strong className="text-white">Público filtrado:</strong> Quien usa la app está buscando activamente consumir, comer y recorrer Mendoza.</span>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="text-sun text-sm leading-none mt-0.5">💰</span> 
              <span><strong className="text-white">Cero comisiones:</strong> Suscripción mensual fija y accesible. Todo lo que vendés es 100% tuyo.</span>
            </div>
          </div>

          <Link 
            to="/comercio/alta" 
            className="block w-full bg-sun text-malbec-deep font-bold py-3 rounded-xl text-xs shadow-md active:scale-[0.98] transition-transform relative z-10"
          >
            Sumar mi negocio al mapa
          </Link>
        </div>

        {/* --- FORMULARIO DE LOGIN (Recuperado y completo) --- */}
        <form onSubmit={handleSubmit} className="w-full max-w-[400px] bg-white rounded-3xl p-6 shadow-sm border border-black/5 flex-shrink-0 mb-6">
          <div className="font-display text-lg font-bold text-malbec-deep mb-1 text-center">Acceso Comercios</div>
          <p className="text-xs text-ink-soft text-center mb-5">
            Ingresá con tu email y la contraseña que te enviamos al suscribirte.
          </p>

          <label className="text-xs font-semibold text-ink-soft">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-stone rounded-lg px-3 py-2.5 text-sm mt-1 mb-3 outline-none"
            required
          />

          <label className="text-xs font-semibold text-ink-soft">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-stone rounded-lg px-3 py-2.5 text-sm mt-1 mb-4 outline-none"
            required
          />

          {error && <div className="text-xs text-red-600 mb-3 text-center">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-malbec text-white font-bold py-3 rounded-lg text-sm disabled:opacity-60"
          >
            {loading ? 'Ingresando...' : 'Entrar a mi cuenta'}
          </button>
        </form>
        
      </div>
      
      <div className="bottomnav-space bg-stone" />
    </div>
  );
}