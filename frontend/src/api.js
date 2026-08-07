const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function request(path, options = {}) {
  const token = localStorage.getItem('mendozapp_admin_token');
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

  // Auth
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

  // POIs (espacios públicos, admin)
  getAllPois: () => request('/api/pois/admin/all'),
  createPoi: (data) => request('/api/pois/admin', { method: 'POST', body: JSON.stringify(data) }),
  updatePoi: (id, data) => request(`/api/pois/admin/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePoi: (id) => request(`/api/pois/admin/${id}`, { method: 'DELETE' }),

  // Geocodificación desde link de Google Maps
  geocode: (url) => request('/api/admin/geocode', { method: 'POST', body: JSON.stringify({ url }) }),
};

export default API_URL;
