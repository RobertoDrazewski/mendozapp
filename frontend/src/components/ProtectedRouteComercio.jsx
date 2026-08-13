import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRouteComercio({ children }) {
  const token = localStorage.getItem('mendozapp_comercio_token');
  if (!token) return <Navigate to="/comercio/login" replace />;
  return children;
}