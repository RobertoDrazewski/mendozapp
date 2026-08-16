const pool = require('../db/pool');
const { mailPruebaPorVencer, mailVencido } = require('../services/emailService');

const DIAS_AVISO_PREVIO = 5;

/**
 * checkVencimientos()
 * Corre 1 vez por día. Tres tareas:
 *   1. Avisar a los que están en prueba que les quedan pocos días
 *   2. Desactivar a los vencidos (prueba o suscripción) y avisarles
 *   3. Listar en el log los que llevan mucho inactivos, para que los revises
 *
 * NO borra comercios automáticamente: un DELETE es irreversible y no queremos
 * perder los datos de alguien por un error de sincronización con Mercado Pago.
 */
async function checkVencimientos() {
  console.log('[cron] Revisando vencimientos...');

  /* 1. Aviso previo a los que están en prueba */
  const [porVencer] = await pool.query(
    `SELECT id, nombre, email, fecha_vencimiento,
            DATEDIFF(fecha_vencimiento, CURDATE()) AS dias_restantes
     FROM comercios
     WHERE estado = 'prueba'
       AND fecha_vencimiento IS NOT NULL
       AND DATEDIFF(fecha_vencimiento, CURDATE()) BETWEEN 0 AND ?
       AND aviso_prueba_enviado = FALSE
       AND email IS NOT NULL`,
    [DIAS_AVISO_PREVIO]
  );

  for (const c of porVencer) {
    const enviado = await mailPruebaPorVencer(c, c.dias_restantes);
    if (enviado) {
      await pool.query('UPDATE comercios SET aviso_prueba_enviado = TRUE WHERE id = ?', [c.id]);
      console.log(`[cron] Aviso de fin de prueba enviado a "${c.nombre}" (${c.dias_restantes} días).`);
    }
  }

  /* 2. Vencidos: prueba o suscripción */
  const [vencidos] = await pool.query(
    `SELECT id, nombre, email, estado, aviso_vencimiento_enviado
     FROM comercios
     WHERE fecha_vencimiento IS NOT NULL
       AND fecha_vencimiento < CURDATE()
       AND estado IN ('activo', 'prueba')`
  );

  for (const c of vencidos) {
    const eraPrueba = c.estado === 'prueba';
    await pool.query(`UPDATE comercios SET estado = 'inactivo' WHERE id = ?`, [c.id]);
    console.log(`[cron] "${c.nombre}" (id ${c.id}) pasó a inactivo${eraPrueba ? ' (terminó la prueba)' : ''}.`);

    if (!c.aviso_vencimiento_enviado && c.email) {
      const enviado = await mailVencido(c, eraPrueba);
      if (enviado) {
        await pool.query('UPDATE comercios SET aviso_vencimiento_enviado = TRUE WHERE id = ?', [c.id]);
      }
    }
  }

  /* 3. Inactivos hace mucho: solo log, para que los revises a mano */
  const [viejos] = await pool.query(
    `SELECT id, nombre, fecha_vencimiento FROM comercios
     WHERE estado = 'inactivo'
       AND fecha_vencimiento < DATE_SUB(CURDATE(), INTERVAL 30 DAY)`
  );
  if (viejos.length > 0) {
    console.log(`[cron] ${viejos.length} comercio(s) llevan +30 días inactivos:`);
    viejos.forEach((c) => console.log(`   - ${c.nombre} (id ${c.id}, venció ${c.fecha_vencimiento})`));
  }

  if (porVencer.length === 0 && vencidos.length === 0) {
    console.log('[cron] Sin novedades hoy.');
  }
}

module.exports = { checkVencimientos };
