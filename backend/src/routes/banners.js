const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');

// GET /api/banners -> banners activos y vigentes por fecha, para mostrar arriba del mapa
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM banners
       WHERE activo = TRUE
       AND (fecha_inicio IS NULL OR fecha_inicio <= CURDATE())
       AND (fecha_fin IS NULL OR fecha_fin >= CURDATE())
       ORDER BY orden ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener banners.' });
  }
});

// ADMIN
router.get('/admin/all', requireAdmin, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM banners ORDER BY orden ASC');
  res.json(rows);
});

router.post('/admin', requireAdmin, async (req, res) => {
  const { texto_es, texto_en, texto_pt, link, color_fondo, activo, fecha_inicio, fecha_fin, orden } = req.body;
  if (!texto_es) return res.status(400).json({ error: 'Falta texto_es.' });
  const [result] = await pool.query(
    `INSERT INTO banners (texto_es, texto_en, texto_pt, link, color_fondo, activo, fecha_inicio, fecha_fin, orden)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [texto_es, texto_en, texto_pt, link, color_fondo || '#6B1E3C', activo !== false, fecha_inicio || null, fecha_fin || null, orden || 0]
  );
  res.status(201).json({ id: result.insertId });
});

router.put('/admin/:id', requireAdmin, async (req, res) => {
  const fields = req.body;
  const allowed = ['texto_es', 'texto_en', 'texto_pt', 'link', 'color_fondo', 'activo', 'fecha_inicio', 'fecha_fin', 'orden'];
  const updates = [];
  const values = [];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(fields[key]);
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'Nada para actualizar.' });
  values.push(req.params.id);
  await pool.query(`UPDATE banners SET ${updates.join(', ')} WHERE id = ?`, values);
  res.json({ ok: true });
});

router.delete('/admin/:id', requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM banners WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
