import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { LangProvider } from './i18n/LangContext';
import { OnboardingProvider } from './i18n/OnboardingContext';
import BottomNav from './components/BottomNav';
import ProtectedRoute from './components/ProtectedRoute';
import ProtectedRouteComercio from './components/ProtectedRouteComercio';
import OnboardingModal from './components/OnboardingModal';

import Home from './pages/Home';
import Chat from './pages/Chat';
import Places from './pages/Places';
import ComoLlegar from './pages/ComoLlegar';
import Guia from './pages/Guia';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

// Nuevas pantallas
import ComercioLogin from './pages/ComercioLogin';
import ComercioAlta from './pages/ComercioAlta';
import ComercioDashboard from './pages/ComercioDashboard';

function Layout() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isComercioRoute = location.pathname.startsWith('/comercio');

  // Solo escondemos el menú de abajo si es el superadmin. Los comercios sí lo ven.
  return (
    <div className="app-height w-screen max-w-[520px] mx-auto flex flex-col bg-stone overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/asistente" element={<Chat />} />
          <Route path="/lugares" element={<Places />} />
          <Route path="/como-llegar" element={<ComoLlegar />} />
          <Route path="/guia" element={<Guia />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          
          {/* Rutas para Comercios */}
          <Route path="/comercio/login" element={<ComercioLogin />} />
          <Route path="/comercio/alta" element={<ComercioAlta />} />
          <Route path="/comercio/dashboard" element={
            <ProtectedRouteComercio>
              <ComercioDashboard />
            </ProtectedRouteComercio>
          } />
        </Routes>
      </div>
      {!isAdminRoute && <BottomNav />}
      {!isAdminRoute && <OnboardingModal />}
    </div>
  );
}

export default function App() {
  return (
    <LangProvider>
      <OnboardingProvider>
        <BrowserRouter>
          <Layout />
        </BrowserRouter>
      </OnboardingProvider>
    </LangProvider>
  );
}