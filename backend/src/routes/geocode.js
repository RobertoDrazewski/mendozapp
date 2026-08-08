const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');

/**
 * Función compartida: recibe un link de Google Maps y devuelve { lat, lng }.
 * La usan tanto la ruta de admin (protegida) como la pública (para el alta
 * autogestionada de comercios, donde el dueño todavía no tiene login).
 */
async function resolveGoogleMapsLink(url) {
  const response = await fetch(url, { redirect: 'follow' });
  const finalUrl = response.url || url;

  let html = '';
  try {
    html = await response.text();
  } catch (e) {
    // si falla la lectura del body no pasa nada, seguimos solo con la URL
  }

  const source = finalUrl + ' ' + html;

  let match = source.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (!match) match = source.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (!match) match = source.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (!match) match = source.match(/[?&]query=(-?\d+\.\d+),(-?\d+\.\d+)/);

  if (!match) return null;
  return { lat: parseFloat(match[1]), lng: parseFloat(match[2]), finalUrl };
}

/**
 * POST /api/admin/geocode (protegida, la usa el panel de admin)
 */
router.post('/geocode', requireAdmin, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Falta el link de Google Maps.' });
  try {
    const result = await resolveGoogleMapsLink(url);
    if (!result) {
      return res.status(422).json({
        error: 'No pude extraer la coordenada de ese link. Probá abrirlo en Google Maps, tocar el pin exacto y copiar el link desde ahí (botón Compartir).',
      });
    }
    res.json(result);
  } catch (err) {
    console.error('Error en geocode:', err);
    res.status(500).json({ error: 'Error al procesar el link. Verificá que sea un link válido de Google Maps.' });
  }
});

/**
 * POST /api/geocode-publico (SIN login, la usa el formulario de alta de comercios)
 * Mismo comportamiento, pensado para que el dueño del negocio pueda resolver
 * su propia ubicación al registrarse, sin tener credenciales de admin.
 */
router.post('/geocode-publico', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Falta el link de Google Maps.' });
  try {
    const result = await resolveGoogleMapsLink(url);
    if (!result) {
      return res.status(422).json({
        error: 'No pudimos leer la ubicación de ese link. Copiá el link desde el botón "Compartir" de Google Maps.',
      });
    }
    res.json(result);
  } catch (err) {
    console.error('Error en geocode público:', err);
    res.status(500).json({ error: 'Error al procesar el link.' });
  }
});

module.exports = router;
