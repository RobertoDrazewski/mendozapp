const pool = require('../db/pool');
const nodemailer = require('nodemailer');

/**
 * checkVencimientos()
 *
 * Revisa comercios cuya fecha_vencimiento ya pasó:
 * - Si todavía no se les avisó, les manda un mail avisando que tienen que
 *   volver a suscribirse o serán eliminados, y marca aviso_vencimiento_enviado = TRUE.
 * - Los pasa a estado 'inactivo' (dejan de aparecer en el mapa para los usuarios).
 *
 * Pensado para correr 1 vez por día (ver cron en server.js).
 */

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

async function checkVencimientos() {
  console.log('[cron] Revisando suscripciones vencidas...');

  const [vencidos] = await pool.query(
    `SELECT * FROM comercios
     WHERE fecha_vencimiento IS NOT NULL
     AND fecha_vencimiento < CURDATE()
     AND estado = 'activo'`
  );

  if (vencidos.length === 0) {
    console.log('[cron] No hay suscripciones vencidas hoy.');
    return;
  }

  const transporter = process.env.SMTP_HOST ? getTransporter() : null;

  for (const comercio of vencidos) {
    // Pasar a inactivo -> deja de mostrarse en el mapa
    await pool.query(`UPDATE comercios SET estado = 'inactivo' WHERE id = ?`, [comercio.id]);
    console.log(`[cron] Comercio "${comercio.nombre}" (id ${comercio.id}) pasado a inactivo.`);

    if (!comercio.aviso_vencimiento_enviado && comercio.email && transporter) {
      try {
        await transporter.sendMail({
          from: `"Mendozapp" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
          to: comercio.email,
          subject: 'Tu suscripción a Mendozapp venció',
          html: `
            <p>Hola,</p>
            <p>Tu suscripción de <b>${comercio.nombre}</b> en Mendozapp venció y tu comercio ya no se muestra en el mapa para los usuarios.</p>
            <p>Si querés seguir apareciendo en Mendozapp, volvé a suscribirte desde el panel:
            <a href="https://www.mendozapp.com.ar/suscribirse">https://www.mendozapp.com.ar/suscribirse</a></p>
            <p>Si no renovás dentro de los próximos 15 días, tu ficha será eliminada definitivamente de la plataforma.</p>
            <p>Gracias por ser parte de Mendozapp.</p>
          `
        });
        await pool.query(`UPDATE comercios SET aviso_vencimiento_enviado = TRUE WHERE id = ?`, [comercio.id]);
        console.log(`[cron] Mail de aviso enviado a ${comercio.email}`);
      } catch (err) {
        console.error(`[cron] Error enviando mail a ${comercio.email}:`, err.message);
      }
    }
  }

  // Eliminación definitiva de comercios inactivos hace más de 15 días sin renovar
  const [eliminados] = await pool.query(
    `SELECT id, nombre FROM comercios
     WHERE estado = 'inactivo'
     AND fecha_vencimiento < DATE_SUB(CURDATE(), INTERVAL 15 DAY)`
  );
  for (const c of eliminados) {
    await pool.query(`DELETE FROM comercios WHERE id = ?`, [c.id]);
    console.log(`[cron] Comercio "${c.nombre}" (id ${c.id}) eliminado definitivamente (15+ días sin renovar).`);
  }
}

module.exports = { checkVencimientos };
