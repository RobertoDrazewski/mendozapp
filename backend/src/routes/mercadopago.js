const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Configuración de correo (misma que usás en checkVencimientos.js)
function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

// Función para generar contraseña aleatoria de 6 caracteres
function generarPassword() {
  return crypto.randomBytes(3).toString('hex').toUpperCase(); // Ej: "A4F8B2"
}

router.post('/webhook', async (req, res) => {
  const { type, data, action } = req.body;
  console.log('Webhook MP recibido:', { type, action, data });

  try {
    if (type === 'subscription_preapproval' || type === 'preapproval') {
      const preapprovalId = data?.id;
      if (!preapprovalId) return res.sendStatus(200);

      const mpResponse = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` }
      });
      const preapproval = await mpResponse.json();

      const estadoMP = preapproval.status;
      const nuevoEstado = estadoMP === 'authorized' ? 'activo' : estadoMP === 'paused' ? 'moroso' : 'inactivo';
      const externalReference = preapproval.external_reference; // Es el comercio_id

      if (externalReference) {
        // Buscamos si ya tiene contraseña (para no pisársela si renueva)
        const [comercioRows] = await pool.query('SELECT nombre, email, password_hash FROM comercios WHERE id = ?', [externalReference]);
        const comercio = comercioRows[0];

        let passGenerada = null;
        let queryUpdate = `UPDATE comercios SET estado = ?, mp_subscription_id = ?, mp_payer_email = ?, fecha_vencimiento = DATE_ADD(CURDATE(), INTERVAL 1 MONTH) WHERE id = ?`;
        let paramsUpdate = [nuevoEstado, preapprovalId, preapproval.payer_email, externalReference];

        // Si se activó por primera vez y no tiene contraseña, se la creamos
        if (nuevoEstado === 'activo' && comercio && !comercio.password_hash) {
          passGenerada = generarPassword();
          const hash = await bcrypt.hash(passGenerada, 10);
          queryUpdate = `UPDATE comercios SET estado = ?, mp_subscription_id = ?, mp_payer_email = ?, fecha_vencimiento = DATE_ADD(CURDATE(), INTERVAL 1 MONTH), password_hash = ? WHERE id = ?`;
          paramsUpdate = [nuevoEstado, preapprovalId, preapproval.payer_email, hash, externalReference];
        }

        await pool.query(queryUpdate, paramsUpdate);

        // Si le generamos contraseña, enviamos el mail
        if (passGenerada && comercio.email && process.env.SMTP_USER) {
          const transporter = getTransporter();
          await transporter.sendMail({
            from: `"Mendozapp" <${process.env.SMTP_USER}>`,
            to: comercio.email,
            subject: '¡Bienvenido a Mendozapp! Tu suscripción está activa',
            html: `
              <h2>¡Hola ${comercio.nombre}!</h2>
              <p>Tu suscripción a Mendozapp ya está activa y tu comercio empezó a mostrarse en nuestro mapa.</p>
              <p>Ahora podés entrar al panel de autogestión para editar tu bio, fotos y redes sociales:</p>
              <ul>
                <li><b>Link de acceso:</b> <a href="https://www.mendozapp.com.ar/mi-comercio">mendozapp.com.ar/mi-comercio</a></li>
                <li><b>Email:</b> ${comercio.email}</li>
                <li><b>Contraseña provisoria:</b> ${passGenerada}</li>
              </ul>
              <p>¡Gracias por sumarte!</p>
            `
          });
          console.log(`Mail de bienvenida enviado a ${comercio.email}`);
        }
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('Error procesando webhook de MP:', err);
    res.sendStatus(200);
  }
});

router.post('/crear-suscripcion', async (req, res) => {
  const { comercio_id, email } = req.body;
  if (!comercio_id || !email) return res.status(400).json({ error: 'Falta comercio_id o email.' });
  if (!process.env.MP_ACCESS_TOKEN) return res.status(500).json({ error: 'Falta MP_ACCESS_TOKEN.' });

  try {
    // 1. Buscamos el tipo de comercio en la BD para saber cuánto cobrarle
    const [rows] = await pool.query('SELECT tipo FROM comercios WHERE id = ?', [comercio_id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Comercio no encontrado.' });
    
    const tipo = rows[0].tipo;
    let monto = 10000; // Por defecto (quioscos, stands, artesanos, etc)
    if (tipo === 'bodega') monto = 50000;
    else if (tipo === 'restaurante') monto = 30000;

    // 2. Creamos la suscripción en MP con el monto dinámico
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
        back_url: process.env.FRONTEND_URL || 'https://www.mendozapp.com.ar/mi-comercio',
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
    if (!mpResponse.ok) return res.status(500).json({ error: data.message || 'Error en Mercado Pago.' });

    res.json({ init_point: data.init_point, preapproval_id: data.id });
  } catch (err) {
    console.error('Error creando suscripción:', err);
    res.status(500).json({ error: 'Error al conectar con Mercado Pago.' });
  }
});

module.exports = router;