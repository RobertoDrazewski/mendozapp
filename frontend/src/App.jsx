import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { LangProvider } from './i18n/LangContext';
import { OnboardingProvider } from './i18n/OnboardingContext';
import BottomNav from './components/BottomNav';
import ProtectedRoute from './components/ProtectedRoute';
import OnboardingModal from './components/OnboardingModal';

import Home from './pages/Home';
import Chat from './pages/Chat';
import Places from './pages/Places';
import ComoLlegar from './pages/ComoLlegar';
import Guia from './pages/Guia';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

function Layout() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

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
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
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
