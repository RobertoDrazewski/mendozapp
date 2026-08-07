const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');

/* ---------- PÚBLICO ---------- */

// GET /api/pois -> todos los espacios públicos activos (monumentos, plazas, historia)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM pois WHERE activo = TRUE ORDER BY id');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los puntos de interés.' });
  }
});

/* ---------- ADMIN (requiere token) ---------- */

// GET /api/pois/admin/all -> todos, activos o no, para el panel
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM pois ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los puntos de interés.' });
  }
});

// POST /api/pois/admin -> crear espacio público nuevo (gratis, sin suscripción)
router.post('/admin', requireAdmin, async (req, res) => {
  const {
    tipo, icono, nombre_es, nombre_en, nombre_pt,
    sub_es, sub_en, sub_pt, historia_es, historia_en, historia_pt,
    lat, lng, google_maps_link, activo
  } = req.body;

  if (!nombre_es || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: nombre_es, lat, lng.' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO pois
       (tipo, icono, nombre_es, nombre_en, nombre_pt, sub_es, sub_en, sub_pt, historia_es, historia_en, historia_pt, lat, lng, google_maps_link, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tipo || 'otro', icono || '📍', nombre_es, nombre_en, nombre_pt, sub_es, sub_en, sub_pt, historia_es, historia_en, historia_pt, lat, lng, google_maps_link || null, activo !== false]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el punto de interés.' });
  }
});

// PUT /api/pois/admin/:id -> editar
router.put('/admin/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const fields = req.body;
  const allowed = [
    'tipo', 'icono', 'nombre_es', 'nombre_en', 'nombre_pt',
    'sub_es', 'sub_en', 'sub_pt', 'historia_es', 'historia_en', 'historia_pt',
    'lat', 'lng', 'google_maps_link', 'activo'
  ];
  const updates = [];
  const values = [];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(fields[key]);
    }
  }
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No hay campos para actualizar.' });
  }
  values.push(id);
  try {
    await pool.query(`UPDATE pois SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el punto de interés.' });
  }
});

// DELETE /api/pois/admin/:id
router.delete('/admin/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM pois WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar el punto de interés.' });
  }
});

module.exports = router;
