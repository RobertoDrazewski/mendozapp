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
    // Si el admin cargó descripción en español, la traducimos al instante.
    // Antes esto solo pasaba cuando guardaba el propio comercio desde su panel,
    // así que todo lo que cargabas vos quedaba sin versión en inglés ni portugués.
    if (f.descripcion_es?.trim()) {
      traducirYGuardar(result.insertId, f.descripcion_es).catch((e) =>
        console.error('[traducción] falló en alta admin:', e.message)
      );
    }

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

    let traducida = false;
    if (fields.descripcion_es?.trim() && fields.descripcion_en === undefined) {
      traducida = await traducirYGuardar(id, fields.descripcion_es, fields.forzar_traduccion);
    }

    res.json({ ok: true, traducida });
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


/* ---------- FOTOS ---------- */

const MAX_FOTO_BYTES = 3 * 1024 * 1024; // 3 MB después de comprimir en el navegador
const MIMES_OK = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * URL pública de la foto de un comercio.
 * Se arma absoluta para que sirva tal cual en <img src>, sin que el frontend
 * tenga que saber dónde vive la API.
 */
function urlFoto(req, comercioId, version) {
  const base =
    process.env.API_PUBLIC_URL ||
    `${req.headers['x-forwarded-proto'] || req.protocol}://${req.get('host')}`;
  return `${base}/api/comercios/foto/${comercioId}?v=${version || Date.now()}`;
}

/**
 * GET /api/comercios/foto/:id  (público)
 * Devuelve la imagen. Lleva cache largo porque la URL cambia con ?v= cada vez
 * que el comercio sube una foto nueva.
 */
router.get('/foto/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT mime, data FROM comercio_fotos WHERE comercio_id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).send('Sin foto');
    res.set('Content-Type', rows[0].mime);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(rows[0].data);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

/**
 * POST /api/comercios/me/foto  (comercio autenticado)
 * body: { dataUrl: "data:image/jpeg;base64,..." }
 *
 * El navegador ya redimensiona y comprime antes de mandar (ver compressImage
 * en el frontend), así que acá solo validamos tamaño y tipo.
 */
router.post('/me/foto', requireComercio, async (req, res) => {
  const { dataUrl } = req.body;
  if (!dataUrl || typeof dataUrl !== 'string') {
    return res.status(400).json({ error: 'No llegó ninguna imagen.' });
  }

  const match = dataUrl.match(/^data:([\w/+.-]+);base64,(.+)$/);
  if (!match) return res.status(400).json({ error: 'Formato de imagen inválido.' });

  const mime = match[1];
  if (!MIMES_OK.includes(mime)) {
    return res.status(400).json({ error: 'Formato no soportado. Usá JPG, PNG o WEBP.' });
  }

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_FOTO_BYTES) {
    return res.status(413).json({ error: 'La imagen es demasiado pesada. Probá con una más chica.' });
  }

  try {
    await pool.query(
      `INSERT INTO comercio_fotos (comercio_id, mime, data, bytes)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE mime = VALUES(mime), data = VALUES(data), bytes = VALUES(bytes)`,
      [req.comercio.id, mime, buffer, buffer.length]
    );

    // Guardamos la URL en foto_url para que el mapa, el listado y la ficha la
    // usen sin ningún cambio: para ellos sigue siendo una URL cualquiera.
    const url = urlFoto(req, req.comercio.id);
    await pool.query('UPDATE comercios SET foto_url = ? WHERE id = ?', [url, req.comercio.id]);

    res.json({ ok: true, foto_url: url, bytes: buffer.length });
  } catch (err) {
    console.error('Error guardando foto:', err);
    res.status(500).json({ error: 'No se pudo guardar la imagen.' });
  }
});

/** DELETE /api/comercios/me/foto */
router.delete('/me/foto', requireComercio, async (req, res) => {
  try {
    await pool.query('DELETE FROM comercio_fotos WHERE comercio_id = ?', [req.comercio.id]);
    await pool.query('UPDATE comercios SET foto_url = NULL WHERE id = ?', [req.comercio.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo borrar la imagen.' });
  }
});


/**
 * Traduce la descripción en español de un comercio y guarda las versiones en
 * inglés y portugués. Devuelve true si tradujo.
 *
 * Solo traduce si falta alguna versión, salvo que se fuerce: así editar el
 * teléfono de un comercio no gasta una llamada a OpenAI cada vez.
 */
async function traducirYGuardar(comercioId, textoEs, forzar = false) {
  if (!textoEs?.trim()) return false;
  if (!forzar) {
    const [prev] = await pool.query(
      'SELECT descripcion_en, descripcion_pt FROM comercios WHERE id = ?',
      [comercioId]
    );
    const faltaAlguna = !prev[0]?.descripcion_en?.trim() || !prev[0]?.descripcion_pt?.trim();
    if (!faltaAlguna) return false;
  }
  const t = await traducirDescripcion(textoEs);
  if (!t) return false;
  await pool.query(
    'UPDATE comercios SET descripcion_en = ?, descripcion_pt = ? WHERE id = ?',
    [t.en, t.pt, comercioId]
  );
  console.log(`[traducción] Comercio ${comercioId} traducido a EN y PT.`);
  return true;
}

/**
 * POST /api/comercios/admin/:id/traducir  -> fuerza retraducir uno
 */
router.post('/admin/:id/traducir', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT descripcion_es FROM comercios WHERE id = ?', [req.params.id]);
    const textoEs = rows[0]?.descripcion_es;
    if (!textoEs?.trim()) return res.status(400).json({ error: 'Este comercio no tiene descripción en español.' });

    const ok = await traducirYGuardar(req.params.id, textoEs, true);
    if (!ok) return res.status(500).json({ error: 'No se pudo traducir. Revisá que OPENAI_API_KEY esté configurada.' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al traducir.' });
  }
});

/**
 * POST /api/comercios/admin/traducir-pendientes
 * Traduce de una todos los comercios que tengan descripción en español pero les
 * falte inglés o portugués. Útil para poner al día los que ya cargaste antes.
 */
router.post('/admin/traducir-pendientes', requireAdmin, async (req, res) => {
  try {
    const [pendientes] = await pool.query(
      `SELECT id, nombre, descripcion_es FROM comercios
       WHERE descripcion_es IS NOT NULL AND TRIM(descripcion_es) <> ''
         AND (descripcion_en IS NULL OR TRIM(descripcion_en) = ''
              OR descripcion_pt IS NULL OR TRIM(descripcion_pt) = '')`
    );

    const resultados = [];
    for (const c of pendientes) {
      const ok = await traducirYGuardar(c.id, c.descripcion_es, true);
      resultados.push({ id: c.id, nombre: c.nombre, ok });
    }

    res.json({
      total: pendientes.length,
      traducidos: resultados.filter((r) => r.ok).length,
      detalle: resultados,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al traducir pendientes.' });
  }
});

module.exports = router;
