const pool = require('../db/pool');
const nodemailer = require('nodemailer');

/**
 * checkVencimientos()
 *
 * Corre 1 vez por día. Pasa a 'inactivo' los comercios cuya fecha_vencimiento ya
 * pasó y les avisa por mail.
 *
 * CAMBIO IMPORTANTE respecto de la versión anterior: ya NO borra comercios de
 * forma automática. Antes hacía DELETE a los 15 días de vencido, lo cual, sumado
 * al bug del webhook que no registraba los cobros mensuales recurrentes, podía
 * borrar definitivamente a un cliente que estaba pagando todos los meses.
 * Un borrado es irreversible y no hay forma de recuperar sus datos, así que ahora
 * solo se marcan como 'inactivo' y quedan listados en el panel para que decidas
 * vos a mano si eliminarlos.
 */

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function checkVencimientos() {
  console.log('[cron] Revisando suscripciones vencidas...');

  const [vencidos] = await pool.query(
    `SELECT id, nombre, email, fecha_vencimiento, aviso_vencimiento_enviado
     FROM comercios
     WHERE fecha_vencimiento IS NOT NULL
       AND fecha_vencimiento < CURDATE()
       AND estado = 'activo'`
  );

  if (vencidos.length === 0) {
    console.log('[cron] No hay suscripciones vencidas hoy.');
    return;
  }

  const transporter = process.env.SMTP_USER ? getTransporter() : null;

  for (const comercio of vencidos) {
    await pool.query(`UPDATE comercios SET estado = 'inactivo' WHERE id = ?`, [comercio.id]);
    console.log(`[cron] "${comercio.nombre}" (id ${comercio.id}) pasó a inactivo.`);

    if (!comercio.aviso_vencimiento_enviado && comercio.email && transporter) {
      try {
        await transporter.sendMail({
          from: `"Mendozapp" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
          to: comercio.email,
          subject: 'Tu suscripción a Mendozapp venció',
          html: `
            <p>Hola,</p>
            <p>La suscripción de <b>${comercio.nombre}</b> en Mendozapp venció y tu comercio dejó de mostrarse en el mapa.</p>
            <p>Para volver a aparecer, podés renovar desde
            <a href="https://www.mendozapp.com.ar/comercio/alta">mendozapp.com.ar/comercio/alta</a>.</p>
            <p>Si creés que esto es un error y tu pago está al día, respondé este mail y lo revisamos.</p>
            <p>Gracias por haber sido parte de Mendozapp.</p>
          `,
        });
        await pool.query(`UPDATE comercios SET aviso_vencimiento_enviado = TRUE WHERE id = ?`, [comercio.id]);
        console.log(`[cron] Mail de aviso enviado a ${comercio.email}`);
      } catch (err) {
        console.error(`[cron] Error enviando mail a ${comercio.email}:`, err.message);
      }
    }
  }

  // Aviso (solo log, no borra) de comercios inactivos hace mucho, para que los
  // revises a mano desde el panel.
  const [viejos] = await pool.query(
    `SELECT id, nombre, fecha_vencimiento FROM comercios
     WHERE estado = 'inactivo'
       AND fecha_vencimiento < DATE_SUB(CURDATE(), INTERVAL 30 DAY)`
  );
  if (viejos.length > 0) {
    console.log(`[cron] ${viejos.length} comercio(s) llevan +30 días inactivos. Revisalos en el panel:`);
    viejos.forEach((c) => console.log(`   - ${c.nombre} (id ${c.id}, venció ${c.fecha_vencimiento})`));
  }
}

module.exports = { checkVencimientos };
