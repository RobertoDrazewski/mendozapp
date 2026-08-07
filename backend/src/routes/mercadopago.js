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

module.exports = router;
