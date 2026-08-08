const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

/**
 * POST /api/mercadopago/webhook
 *
 * Mercado Pago llama a esta URL cuando pasa algo con un pago o una suscripción
 * (mismo patrón que ya usás en Kalyber). Hay que configurar esta URL en el panel
 * de MP: https://www.mercadopago.com.ar/developers/panel/webhooks
 *
 * IMPORTANTE: esto es un esqueleto funcional. Antes de ir a producción hay que:
 * 1. Validar la firma del webhook (x-signature) para evitar webhooks falsos.
 * 2. Reemplazar la búsqueda de comercio por mp_payer_email con la lógica real
 *    que uses al momento de generar el link de suscripción (idealmente guardando
 *    el comercio_id como "external_reference" al crear la preapproval en MP).
 */
router.post('/webhook', async (req, res) => {
  const { type, data, action } = req.body;
  console.log('Webhook MP recibido:', { type, action, data });

  try {
    if (type === 'subscription_preapproval' || type === 'preapproval') {
      const preapprovalId = data?.id;
      if (!preapprovalId) return res.sendStatus(200);

      // Consultamos el estado real a la API de Mercado Pago
      const mpResponse = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` }
      });
      const preapproval = await mpResponse.json();

      const estadoMP = preapproval.status; // authorized, paused, cancelled
      const nuevoEstado = estadoMP === 'authorized' ? 'activo' : estadoMP === 'paused' ? 'moroso' : 'inactivo';
      const externalReference = preapproval.external_reference; // debería ser el comercio_id

      if (externalReference) {
        await pool.query(
          `UPDATE comercios SET estado = ?, mp_subscription_id = ?, mp_payer_email = ? WHERE id = ?`,
          [nuevoEstado, preapprovalId, preapproval.payer_email, externalReference]
        );

        await pool.query(
          `INSERT INTO suscripciones_log (comercio_id, mp_payment_id, tipo_evento, estado, raw_payload)
           VALUES (?, ?, ?, ?, ?)`,
          [externalReference, preapprovalId, type, estadoMP, JSON.stringify(req.body)]
        );
      }
    }

    if (type === 'payment') {
      const paymentId = data?.id;
      if (!paymentId) return res.sendStatus(200);

      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` }
      });
      const payment = await mpResponse.json();
      const externalReference = payment.external_reference;

      if (externalReference && payment.status === 'approved') {
        // Pago aprobado -> reactivar y extender vencimiento 1 mes
        await pool.query(
          `UPDATE comercios
           SET estado = 'activo',
               fecha_vencimiento = DATE_ADD(CURDATE(), INTERVAL 1 MONTH),
               aviso_vencimiento_enviado = FALSE
           WHERE id = ?`,
          [externalReference]
        );
        await pool.query(
          `INSERT INTO suscripciones_log (comercio_id, mp_payment_id, tipo_evento, estado, monto, raw_payload)
           VALUES (?, ?, 'payment', 'approved', ?, ?)`,
          [externalReference, paymentId, payment.transaction_amount, JSON.stringify(req.body)]
        );
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Error procesando webhook de MP:', err);
    res.sendStatus(200); // Igual respondemos 200 para que MP no reintente indefinidamente
  }
});

/**
 * POST /api/mercadopago/crear-suscripcion
 * body: { comercio_id, email }
 *
 * Crea una "preapproval" (suscripción recurrente) en Mercado Pago por $20.000 ARS/mes,
 * y devuelve el link (init_point) al que hay que mandar al comerciante para que
 * autorice el pago. El comercio_id se guarda como external_reference: cuando MP
 * nos avise por webhook, así sabemos a qué comercio activar.
 *
 * IMPORTANTE: esto pega directo a la API real de Mercado Pago con tu MP_ACCESS_TOKEN.
 * Probalo primero con credenciales de TEST de Mercado Pago antes de usar las de
 * producción, para no cobrar de verdad mientras estás probando el flujo.
 */
router.post('/crear-suscripcion', async (req, res) => {
  const { comercio_id, email } = req.body;
  if (!comercio_id || !email) {
    return res.status(400).json({ error: 'Falta comercio_id o email.' });
  }
  if (!process.env.MP_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'Falta configurar MP_ACCESS_TOKEN en el servidor.' });
  }

  try {
    const mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        reason: 'Suscripción mensual Mendozapp',
        external_reference: String(comercio_id),
        payer_email: email,
        back_url: process.env.FRONTEND_URL || 'https://www.mendozapp.com.ar',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: 20000,
          currency_id: 'ARS',
        },
        status: 'pending',
      }),
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('Error de Mercado Pago:', data);
      return res.status(500).json({ error: data.message || 'Error al crear la suscripción en Mercado Pago.' });
    }

    // init_point es el link al que mandamos al comerciante para que autorice el pago
    res.json({ init_point: data.init_point, preapproval_id: data.id });
  } catch (err) {
    console.error('Error creando suscripción:', err);
    res.status(500).json({ error: 'Error al conectar con Mercado Pago.' });
  }
});

module.exports = router;
