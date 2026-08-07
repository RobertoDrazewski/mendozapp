const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');

/* ---------- PÚBLICO ---------- */

// GET /api/comercios -> solo los que están activos (suscripción al día)
router.get('/', async (req, res) => {
  try {
    const { tipo } = req.query;
    let query = 'SELECT id, nombre, tipo, descripcion_es, descripcion_en, descripcion_pt, direccion, lat, lng, telefono, whatsapp, sitio_web, instagram, foto_url, google_maps_link, horario_texto, destacado FROM comercios WHERE estado = "activo"';
    const params = [];
    if (tipo) {
      query += ' AND tipo = ?';
      params.push(tipo);
    }
    query += ' ORDER BY destacado DESC, nombre ASC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener comercios.' });
  }
});

/* ---------- ADMIN (requiere token) ---------- */

// GET /api/comercios/admin/all -> todos, con estado de suscripción, para el panel
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM comercios ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener comercios.' });
  }
});

// POST /api/comercios/admin -> crear comercio/bodega
router.post('/admin', requireAdmin, async (req, res) => {
  const {
    nombre, tipo, descripcion_es, descripcion_en, descripcion_pt,
    direccion, lat, lng, telefono, whatsapp, email, sitio_web, instagram,
    foto_url, horario_texto, destacado, plan, fecha_vencimiento
  } = req.body;

  if (!nombre || !lat || !lng) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, lat, lng.' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO comercios
       (nombre, tipo, descripcion_es, descripcion_en, descripcion_pt, direccion, lat, lng, telefono, whatsapp, email, sitio_web, instagram, foto_url, horario_texto, destacado, plan, fecha_vencimiento, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
      [nombre, tipo || 'comercio', descripcion_es, descripcion_en, descripcion_pt, direccion, lat, lng, telefono, whatsapp, email, sitio_web, instagram, foto_url, horario_texto, !!destacado, plan || 'estandar', fecha_vencimiento || null]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear comercio.' });
  }
});

// PUT /api/comercios/admin/:id -> editar comercio (incluye cambiar estado manualmente)
router.put('/admin/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const fields = req.body;
  const allowed = [
    'nombre', 'tipo', 'descripcion_es', 'descripcion_en', 'descripcion_pt',
    'direccion', 'lat', 'lng', 'telefono', 'whatsapp', 'email', 'sitio_web',
    'instagram', 'foto_url', 'horario_texto', 'destacado', 'estado', 'plan',
    'fecha_vencimiento', 'mp_subscription_id', 'mp_payer_email'
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
    await pool.query(`UPDATE comercios SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar comercio.' });
  }
});

// DELETE /api/comercios/admin/:id
router.delete('/admin/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM comercios WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar comercio.' });
  }
});

module.exports = router;
