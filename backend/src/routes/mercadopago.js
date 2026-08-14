const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const PRECIOS = {
  bodega: 50000,
  restaurante: 30000,
  hotel: 30000,
  turismo_aventura: 30000,
  comercio: 10000,
  otro: 10000,
};

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function generarPassword() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

async function mpFetch(path) {
  const r = await fetch(`https://api.mercadopago.com${path}`, {
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.message || `Mercado Pago respondió ${r.status} en ${path}`);
  return data;
}

/**
 * Activa (o reactiva) un comercio y, si es su primera activación, le genera
 * contraseña y le manda el mail de bienvenida.
 */
async function activarComercio(comercioId, { preapprovalId, payerEmail } = {}) {
  const [rows] = await pool.query(
    'SELECT id, nombre, email, password_hash, bienvenida_enviada FROM comercios WHERE id = ?',
    [comercioId]
  );
  const comercio = rows[0];
  if (!comercio) {
    console.warn(`[MP] external_reference ${comercioId} no corresponde a ningún comercio.`);
    return;
  }

  let passGenerada = null;
  let hash = null;
  if (!comercio.password_hash) {
    passGenerada = generarPassword();
    hash = await bcrypt.hash(passGenerada, 10);
  }

  // Renovamos SIEMPRE desde la fecha de vencimiento vigente si todavía está en el
  // futuro (así un pago adelantado suma un mes en vez de recortarlo a hoy+1mes).
  await pool.query(
    `UPDATE comercios
     SET estado = 'activo',
         mp_subscription_id = COALESCE(?, mp_subscription_id),
         mp_payer_email = COALESCE(?, mp_payer_email),
         fecha_vencimiento = DATE_ADD(
           GREATEST(COALESCE(fecha_vencimiento, CURDATE()), CURDATE()),
           INTERVAL 1 MONTH
         ),
         aviso_vencimiento_enviado = FALSE,
         password_hash = COALESCE(?, password_hash)
     WHERE id = ?`,
    [preapprovalId || null, payerEmail || null, hash, comercioId]
  );

  console.log(`[MP] Comercio ${comercioId} (${comercio.nombre}) ACTIVO hasta +1 mes.`);

  // Mail de bienvenida: solo la primera vez, y solo si SMTP está configurado
  if (passGenerada && comercio.email && !comercio.bienvenida_enviada && process.env.SMTP_USER) {
    try {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: `"Mendozapp" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: comercio.email,
        subject: '¡Bienvenido a Mendozapp! Tu suscripción está activa',
        html: `
          <h2>¡Hola ${comercio.nombre}!</h2>
          <p>Tu suscripción a Mendozapp ya está activa y tu comercio empezó a mostrarse en el mapa para los turistas.</p>
          <p>Entrá a tu panel para cargar tu descripción, foto, horarios y redes:</p>
          <ul>
            <li><b>Panel:</b> <a href="https://www.mendozapp.com.ar/comercio/login">mendozapp.com.ar/comercio/login</a></li>
            <li><b>Email:</b> ${comercio.email}</li>
            <li><b>Contraseña provisoria:</b> ${passGenerada}</li>
          </ul>
          <p>Te recomendamos completar tu perfil cuanto antes: los comercios con foto y descripción reciben muchas más visitas.</p>
          <p>¡Gracias por sumarte!</p>
        `,
      });
      await pool.query('UPDATE comercios SET bienvenida_enviada = TRUE WHERE id = ?', [comercioId]);
      console.log(`[MP] Mail de bienvenida enviado a ${comercio.email}`);
    } catch (mailErr) {
      // Importante: si falla el mail NO tiramos el webhook abajo. El comercio ya
      // quedó activo y pagó; la contraseña se puede reenviar desde el admin.
      console.error('[MP] Falló el envío del mail de bienvenida:', mailErr.message);
    }
  }
}

/**
 * Validación de firma del webhook (x-signature).
 * Solo se aplica si MP_WEBHOOK_SECRET está definido — así no rompe si todavía no
 * lo configuraste en el panel de Mercado Pago.
 */
function firmaValida(req) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // sin secreto configurado, no validamos

  const signature = req.headers['x-signature'];
  const requestId = req.headers['x-request-id'];
  if (!signature) return false;

  const parts = Object.fromEntries(
    signature.split(',').map((p) => p.split('=').map((s) => s.trim()))
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const dataId = req.query['data.id'] || req.body?.data?.id || '';
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(v1));
  } catch {
    return false;
  }
}

/**
 * POST /api/mercadopago/webhook
 *
 * Maneja TRES tipos de aviso de Mercado Pago:
 *  - preapproval / subscription_preapproval → alta, pausa o cancelación de la suscripción
 *  - subscription_authorized_payment        → COBRO MENSUAL RECURRENTE (renovación)
 *  - payment                                → pago suelto con external_reference
 *
 * El segundo es el que faltaba: sin él, el comercio pagaba todos los meses pero
 * fecha_vencimiento nunca se extendía, así que el cron de checkVencimientos lo
 * daba de baja al mes de haberse suscripto.
 */
router.post('/webhook', async (req, res) => {
  if (!firmaValida(req)) {
    console.warn('[MP] Webhook con firma inválida, descartado.');
    return res.sendStatus(401);
  }

  const { type, data, action } = req.body || {};
  console.log('[MP] Webhook recibido:', { type, action, id: data?.id });

  // Respondemos 200 enseguida: Mercado Pago corta a los ~22s y reintenta si no
  // contesta rápido. El procesamiento sigue por detrás.
  res.sendStatus(200);

  try {
    const id = data?.id;
    if (!id) return;

    if (type === 'preapproval' || type === 'subscription_preapproval') {
      const pre = await mpFetch(`/preapproval/${id}`);
      const comercioId = pre.external_reference;
      if (!comercioId) return;

      if (pre.status === 'authorized') {
        await activarComercio(comercioId, { preapprovalId: id, payerEmail: pre.payer_email });
      } else {
        // paused / cancelled: NO tocamos fecha_vencimiento — el comercio ya pagó
        // el mes en curso y tiene derecho a usarlo hasta que venza.
        const nuevoEstado = pre.status === 'paused' ? 'moroso' : 'inactivo';
        await pool.query(
          'UPDATE comercios SET estado = ?, mp_subscription_id = ? WHERE id = ?',
          [nuevoEstado, id, comercioId]
        );
        console.log(`[MP] Comercio ${comercioId} pasó a ${nuevoEstado} (status MP: ${pre.status}).`);
      }
      return;
    }

    if (type === 'subscription_authorized_payment') {
      // Cobro mensual recurrente de una suscripción ya autorizada
      const pago = await mpFetch(`/authorized_payments/${id}`);
      const estadoPago = pago.payment?.status || pago.status;
      if (estadoPago !== 'approved') {
        console.log(`[MP] Cobro recurrente ${id} en estado ${estadoPago}, no se renueva.`);
        return;
      }
      const preapprovalId = pago.preapproval_id;
      const pre = await mpFetch(`/preapproval/${preapprovalId}`);
      const comercioId = pre.external_reference;
      if (comercioId) {
        await activarComercio(comercioId, { preapprovalId, payerEmail: pre.payer_email });
      }
      return;
    }

    if (type === 'payment') {
      const pago = await mpFetch(`/v1/payments/${id}`);
      if (pago.status === 'approved' && pago.external_reference) {
        await activarComercio(pago.external_reference, { payerEmail: pago.payer?.email });
      }
      return;
    }
  } catch (err) {
    console.error('[MP] Error procesando webhook:', err.message);
  }
});

/**
 * POST /api/mercadopago/crear-suscripcion
 */
router.post('/crear-suscripcion', async (req, res) => {
  const { comercio_id, email } = req.body;
  if (!comercio_id || !email) return res.status(400).json({ error: 'Falta comercio_id o email.' });
  if (!process.env.MP_ACCESS_TOKEN) return res.status(500).json({ error: 'Falta MP_ACCESS_TOKEN.' });

  try {
    const [rows] = await pool.query('SELECT tipo FROM comercios WHERE id = ?', [comercio_id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Comercio no encontrado.' });

    const tipo = rows[0].tipo;
    const monto = PRECIOS[tipo] ?? PRECIOS.otro;

    const backUrl = `${process.env.FRONTEND_URL || 'https://www.mendozapp.com.ar'}/comercio/login`;

    const mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        reason: `Suscripción Mendozapp - ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`,
        external_reference: String(comercio_id),
        payer_email: email,
        back_url: backUrl,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: monto,
          currency_id: 'ARS',
        },
        status: 'pending',
      }),
    });

    const data = await mpResponse.json();
    if (!mpResponse.ok) {
      console.error('[MP] Error creando preapproval:', data);
      return res.status(500).json({ error: data.message || 'Error en Mercado Pago.' });
    }

    // Guardamos el preapproval_id desde ya, así el admin puede rastrear el intento
    // aunque el comerciante abandone antes de pagar.
    await pool.query('UPDATE comercios SET mp_subscription_id = ? WHERE id = ?', [data.id, comercio_id]);

    res.json({ init_point: data.init_point, preapproval_id: data.id, monto });
  } catch (err) {
    console.error('Error creando suscripción:', err);
    res.status(500).json({ error: 'Error al conectar con Mercado Pago.' });
  }
});

module.exports = router;
