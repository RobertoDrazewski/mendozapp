const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { requireAdmin, requireComercio } = require('../middleware/auth');
const { precioPara } = require('../config/precios');
const { traducirDescripcion } = require('../services/translateService');
const {
  generarPassword,
  hashPassword,
  mailInicioPrueba,
  mailReenvioAcceso,
} = require('../services/emailService');

// Días de prueba gratis al darse de alta
const DIAS_PRUEBA = 30;

// Estados en los que un comercio SE MUESTRA al turista
const ESTADOS_VISIBLES = ['activo', 'prueba'];

/**
 * Convierte los strings vacíos que manda el formulario en NULL.
 *
 * Por qué existe: el form del admin manda fecha_vencimiento: "" cuando está en
 * blanco. MySQL en modo estricto rechaza "" en una columna DATE con
 * "Incorrect date value", el UPDATE tira 500 y el admin ve "no me deja guardar"
 * sin ninguna pista de qué pasó. Lo mismo con lat/lng cuando quedan en NaN.
 */
function limpiarValor(key, value) {
  if (value === '' || value === undefined) return null;
  if ((key === 'lat' || key === 'lng') && (value === null || Number.isNaN(Number(value)))) return null;
  return value;
}

/* ---------- PÚBLICO ---------- */

// GET /api/comercios -> los visibles para el turista (suscriptos + en prueba)
router.get('/', async (req, res) => {
  try {
    const { tipo } = req.query;
    const placeholders = ESTADOS_VISIBLES.map(() => '?').join(',');
    let query = `SELECT id, nombre, tipo, descripcion_es, descripcion_en, descripcion_pt,
                        direccion, lat, lng, telefono, whatsapp, sitio_web, instagram,
                        foto_url, google_maps_link, horario_texto, destacado
                 FROM comercios
                 WHERE estado IN (${placeholders})`;
    const params = [...ESTADOS_VISIBLES];
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

/* ---------- ALTA PÚBLICA (autogestión, sin login) ---------- */

/**
 * POST /api/comercios/alta
 *
 * El comercio arranca con PRUEBA GRATIS: queda visible en el mapa desde el
 * primer minuto y recibe su contraseña por mail. No depende de que complete el
 * pago — antes, si abandonaba el checkout de Mercado Pago, quedaba un registro
 * huérfano invisible y sin acceso.
 */
router.post('/alta', async (req, res) => {
  const { nombre, tipo, email, telefono, direccion, lat, lng, google_maps_link, foto_url } = req.body;

  if (!nombre || !email || !telefono || !direccion || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, email, teléfono, dirección y ubicación.' });
  }

  try {
    // El email es único: si ya existe, avisamos en vez de tirar error de SQL
    const [existe] = await pool.query('SELECT id, estado FROM comercios WHERE email = ?', [email]);
    if (existe.length > 0) {
      return res.status(409).json({
        error: 'Ya hay un comercio registrado con ese email. Entrá a mendozapp.com.ar/comercio/login o escribinos si perdiste el acceso.',
        comercio_id: existe[0].id,
      });
    }

    const password = generarPassword();
    const hash = await hashPassword(password);

    const [result] = await pool.query(
      `INSERT INTO comercios
        (nombre, tipo, email, password_hash, telefono, direccion, lat, lng,
         google_maps_link, foto_url, estado, plan, fecha_vencimiento, bienvenida_enviada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'prueba', 'estandar', DATE_ADD(CURDATE(), INTERVAL ? DAY), TRUE)`,
      [nombre, tipo || 'comercio', email, hash, telefono, direccion, lat, lng,
       google_maps_link || null, foto_url || null, DIAS_PRUEBA]
    );

    // Mail con la contraseña. Si falla el envío, el alta igual queda hecha.
    await mailInicioPrueba({ nombre, email }, password, DIAS_PRUEBA);

    res.status(201).json({ id: result.insertId, dias_prueba: DIAS_PRUEBA });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar el comercio.' });
  }
});

/* ---------- LOGIN Y PANEL DEL COMERCIO ---------- */

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Falta email o contraseña.' });

  try {
    const [rows] = await pool.query('SELECT * FROM comercios WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Email o contraseña incorrectos.' });

    const comercio = rows[0];
    if (!comercio.password_hash) {
      return res.status(401).json({ error: 'Tu cuenta todavía no tiene contraseña. Escribinos y te la enviamos.' });
    }

    const valid = await bcrypt.compare(password, comercio.password_hash);
    if (!valid) return res.status(401).json({ error: 'Email o contraseña incorrectos.' });

    const token = jwt.sign(
      { id: comercio.id, email: comercio.email, rol: 'comercio' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, comercio: { id: comercio.id, nombre: comercio.nombre, email: comercio.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al iniciar sesión.' });
  }
});

// GET /api/comercios/me
router.get('/me', requireComercio, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, nombre, tipo, descripcion_es, descripcion_en, descripcion_pt, direccion,
              lat, lng, telefono, whatsapp, email, sitio_web, instagram, foto_url,
              google_maps_link, horario_texto, estado, plan, fecha_vencimiento
       FROM comercios WHERE id = ?`,
      [req.comercio.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Comercio no encontrado.' });

    const c = rows[0];
    // Datos calculados que el panel necesita para mostrar el estado de la suscripción
    let dias_restantes = null;
    if (c.fecha_vencimiento) {
      const vence = new Date(c.fecha_vencimiento);
      const hoy = new Date();
      vence.setHours(0, 0, 0, 0);
      hoy.setHours(0, 0, 0, 0);
      dias_restantes = Math.round((vence - hoy) / 86400000);
    }

    res.json({
      ...c,
      precio_mensual: precioPara(c.tipo),
      dias_restantes,
      en_prueba: c.estado === 'prueba',
      visible_en_mapa: ESTADOS_VISIBLES.includes(c.estado),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener tus datos.' });
  }
});

// PUT /api/comercios/me -> el comercio actualiza su propia info
router.put('/me', requireComercio, async (req, res) => {
  const fields = req.body;
  const allowed = [
    'descripcion_es', 'descripcion_en', 'descripcion_pt',
    'direccion', 'lat', 'lng', 'telefono', 'whatsapp', 'sitio_web',
    'instagram', 'foto_url', 'horario_texto', 'google_maps_link',
  ];
  const updates = [];
  const values = [];

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(limpiarValor(key, fields[key]));
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'No hay campos permitidos para actualizar.' });
  values.push(req.comercio.id);

  try {
    await pool.query(`UPDATE comercios SET ${updates.join(', ')} WHERE id = ?`, values);

    let traducida = false;
    if (fields.descripcion_es !== undefined && fields.descripcion_es?.trim()) {
      const [prev] = await pool.query(
        'SELECT descripcion_en, descripcion_pt FROM comercios WHERE id = ?',
        [req.comercio.id]
      );
      const faltaAlguna = !prev[0]?.descripcion_en || !prev[0]?.descripcion_pt;
      if (faltaAlguna || fields.forzar_traduccion) {
        const t = await traducirDescripcion(fields.descripcion_es);
        if (t) {
          await pool.query(
            'UPDATE comercios SET descripcion_en = ?, descripcion_pt = ? WHERE id = ?',
            [t.en, t.pt, req.comercio.id]
          );
          traducida = true;
        }
      }
    }
    res.json({ ok: true, traducida });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar tus datos.' });
  }
});

// POST /api/comercios/me/traducir
router.post('/me/traducir', requireComercio, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT descripcion_es FROM comercios WHERE id = ?', [req.comercio.id]);
    const textoEs = rows[0]?.descripcion_es;
    if (!textoEs || !textoEs.trim()) {
      return res.status(400).json({ error: 'Primero escribí y guardá tu descripción en español.' });
    }
    const t = await traducirDescripcion(textoEs);
    if (!t) return res.status(500).json({ error: 'No se pudo traducir en este momento. Probá de nuevo en un rato.' });

    await pool.query(
      'UPDATE comercios SET descripcion_en = ?, descripcion_pt = ? WHERE id = ?',
      [t.en, t.pt, req.comercio.id]
    );
    res.json({ ok: true, en: t.en, pt: t.pt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al traducir.' });
  }
});

/* ---------- ADMIN ---------- */

router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM comercios ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener comercios.' });
  }
});

router.post('/admin', requireAdmin, async (req, res) => {
  const f = req.body;
  if (!f.nombre || f.lat === undefined || f.lng === undefined) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, lat, lng.' });
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO comercios
        (nombre, tipo, descripcion_es, descripcion_en, descripcion_pt, direccion, lat, lng,
         telefono, whatsapp, email, sitio_web, instagram, foto_url, google_maps_link,
         horario_texto, destacado, plan, fecha_vencimiento, estado)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        f.nombre, f.tipo || 'comercio',
        limpiarValor('descripcion_es', f.descripcion_es),
        limpiarValor('descripcion_en', f.descripcion_en),
        limpiarValor('descripcion_pt', f.descripcion_pt),
        limpiarValor('direccion', f.direccion),
        limpiarValor('lat', f.lat), limpiarValor('lng', f.lng),
        limpiarValor('telefono', f.telefono), limpiarValor('whatsapp', f.whatsapp),
        limpiarValor('email', f.email), limpiarValor('sitio_web', f.sitio_web),
        limpiarValor('instagram', f.instagram), limpiarValor('foto_url', f.foto_url),
        limpiarValor('google_maps_link', f.google_maps_link),
        limpiarValor('horario_texto', f.horario_texto),
        !!f.destacado, f.plan || 'estandar',
        limpiarValor('fecha_vencimiento', f.fecha_vencimiento),
        f.estado || 'pendiente',
      ]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe un comercio con ese email.' });
    }
    res.status(500).json({ error: 'Error al crear comercio.' });
  }
});

// PUT /api/comercios/admin/:id
router.put('/admin/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const fields = req.body;
  const allowed = [
    'nombre', 'tipo', 'descripcion_es', 'descripcion_en', 'descripcion_pt',
    'direccion', 'lat', 'lng', 'telefono', 'whatsapp', 'email', 'sitio_web',
    'instagram', 'foto_url', 'google_maps_link', 'horario_texto', 'destacado',
    'estado', 'plan', 'fecha_vencimiento', 'mp_subscription_id', 'mp_payer_email',
  ];
  const updates = [];
  const values = [];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(limpiarValor(key, fields[key]));
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar.' });
  values.push(id);

  try {
    await pool.query(`UPDATE comercios SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error actualizando comercio:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe otro comercio con ese email.' });
    }
    res.status(500).json({ error: `Error al actualizar: ${err.sqlMessage || err.message}` });
  }
});

/**
 * POST /api/comercios/admin/:id/reenviar-acceso
 * Genera una contraseña nueva y se la manda por mail al comercio DESDE EL SERVIDOR.
 *
 * Reemplaza al botón "mailto:" que había antes en el panel, que no hacía nada en
 * navegadores sin cliente de correo configurado (el caso más común en Chrome).
 */
router.post('/admin/:id/reenviar-acceso', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, nombre, email FROM comercios WHERE id = ?', [req.params.id]);
    const comercio = rows[0];
    if (!comercio) return res.status(404).json({ error: 'Comercio no encontrado.' });
    if (!comercio.email) return res.status(400).json({ error: 'Este comercio no tiene email cargado.' });

    const password = generarPassword();
    const hash = await hashPassword(password);
    await pool.query('UPDATE comercios SET password_hash = ? WHERE id = ?', [hash, comercio.id]);

    const enviado = await mailReenvioAcceso(comercio, password);
    if (!enviado) {
      // La contraseña ya se cambió, así que se la devolvemos para que se la pases a mano
      return res.status(200).json({
        ok: false,
        password,
        error: 'No se pudo enviar el mail (revisá la configuración SMTP). La contraseña nueva es la de abajo, pasásela vos.',
      });
    }
    res.json({ ok: true, email: comercio.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al reenviar el acceso.' });
  }
});

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
