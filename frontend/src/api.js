const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Agregamos un tercer parámetro para saber qué token usar en cada petición
async function request(path, options = {}, tokenKey = 'mendozapp_admin_token') {
  const token = localStorage.getItem(tokenKey);
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error de red');
  return data;
}

export const api = {
  // Público
  getPois: () => request('/api/pois'),
  getComercios: (tipo) => request(`/api/comercios${tipo ? `?tipo=${tipo}` : ''}`),
  getBanners: () => request('/api/banners'),
  chat: (payload) => request('/api/chat', { method: 'POST', body: JSON.stringify(payload) }),

  // Auth Superadmin
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  // Admin
  getAllComercios: () => request('/api/comercios/admin/all'),
  createComercio: (data) => request('/api/comercios/admin', { method: 'POST', body: JSON.stringify(data) }),
  updateComercio: (id, data) => request(`/api/comercios/admin/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteComercio: (id) => request(`/api/comercios/admin/${id}`, { method: 'DELETE' }),

  getAllBanners: () => request('/api/banners/admin/all'),
  createBanner: (data) => request('/api/banners/admin', { method: 'POST', body: JSON.stringify(data) }),
  updateBanner: (id, data) => request(`/api/banners/admin/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBanner: (id) => request(`/api/banners/admin/${id}`, { method: 'DELETE' }),

  getAllPois: () => request('/api/pois/admin/all'),
  createPoi: (data) => request('/api/pois/admin', { method: 'POST', body: JSON.stringify(data) }),
  updatePoi: (id, data) => request(`/api/pois/admin/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePoi: (id) => request(`/api/pois/admin/${id}`, { method: 'DELETE' }),

  geocode: (url) => request('/api/admin/geocode', { method: 'POST', body: JSON.stringify({ url }) }),

  // Geocode SIN login: lo usa el alta pública de comercios (el comerciante no
  // tiene token de admin, así que /api/admin/geocode le devolvía 401).
  geocodePublico: (url) => request('/api/geocode-publico', { method: 'POST', body: JSON.stringify({ url }) }),

  // ---------- NUEVO: RUTAS DE COMERCIOS (AUTOGESTIÓN Y PAGOS) ----------
  
  // Da de alta el comercio (público, no necesita token)
  altaComercio: (data) => request('/api/comercios/alta', { method: 'POST', body: JSON.stringify(data) }),
  
  // Genera el link de pago de MP
  crearSuscripcionMP: (comercio_id, email) => request('/api/mercadopago/crear-suscripcion', { method: 'POST', body: JSON.stringify({ comercio_id, email }) }),
  
  // Login del comercio con la clave que le llegó por mail
  comercioLogin: (email, password) => request('/api/auth/comercio/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  
  // Obtiene y actualiza los datos del comercio logueado usando su propio token
  getComercioMe: () => request('/api/comercios/me', {}, 'mendozapp_comercio_token'),
  updateComercioMe: (data) => request('/api/comercios/me', { method: 'PUT', body: JSON.stringify(data) }, 'mendozapp_comercio_token'),
};

export default API_URL;