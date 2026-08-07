const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');

/**
 * POST /api/admin/geocode
 * body: { url }
 *
 * Recibe un link de Google Maps (corto tipo maps.app.goo.gl/xxxx, o largo tipo
 * google.com/maps/place/.../@-32.989,-68.793,17z) y devuelve { lat, lng } exactos.
 *
 * Cómo funciona: los links cortos de Google Maps son un redirect (30x) hacia la URL
 * larga real, que sí trae la coordenada en el texto. `fetch` con redirect:'follow'
 * sigue esos saltos solo, y `response.url` nos da la URL final ya expandida.
 *
 * Dentro de esa URL buscamos primero el patrón "!3d{lat}!4d{lng}" (la coordenada
 * exacta del PIN/lugar marcado, la más precisa), y si no aparece, usamos el patrón
 * "@{lat},{lng},{zoom}z" (el centro del mapa en ese momento, un poco menos exacto
 * pero normalmente suficiente).
 */
router.post('/geocode', requireAdmin, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Falta el link de Google Maps.' });

  try {
    const response = await fetch(url, { redirect: 'follow' });
    const finalUrl = response.url || url;

    // También miramos el HTML por si la coordenada solo aparece ahí (no siempre hace falta)
    let html = '';
    try {
      html = await response.text();
    } catch (e) {
      // si falla la lectura del body no pasa nada, seguimos solo con la URL
    }

    const source = finalUrl + ' ' + html;

    // 1) Coordenada exacta del pin: !3d<lat>!4d<lng>
    let match = source.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (!match) {
      // 2) Centro del mapa: @<lat>,<lng>,<zoom>z
      match = source.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    }
    if (!match) {
      // 3) Formato ?q=lat,lng
      match = source.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    }

    if (!match) {
      return res.status(422).json({
        error: 'No pude extraer la coordenada de ese link. Probá abrirlo en Google Maps, tocar el pin exacto y copiar el link desde ahí (botón Compartir).',
        finalUrl
      });
    }

    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    res.json({ lat, lng, finalUrl });
  } catch (err) {
    console.error('Error en geocode:', err);
    res.status(500).json({ error: 'Error al procesar el link. Verificá que sea un link válido de Google Maps.' });
  }
});

module.exports = router;
