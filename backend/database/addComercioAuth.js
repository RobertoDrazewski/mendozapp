/**
 * addComercioAuth.js
 * MIGRACIÓN CRÍTICA — sin esto, el webhook de Mercado Pago FALLA en silencio y
 * un comercio puede pagar sin quedar nunca activo.
 *
 * La tabla `comercios` no tiene la columna `password_hash`, pero
 * routes/mercadopago.js hace SELECT y UPDATE sobre ella al activar una
 * suscripción. MySQL responde "Unknown column 'password_hash'", el try/catch del
 * webhook se traga el error y responde 200 a Mercado Pago (así que MP cree que
 * todo salió bien y no reintenta), pero el comercio queda en 'pendiente' para
 * siempre y nunca recibe su contraseña.
 *
 * También agrega un índice único en email: el login de comercios busca por email
 * (SELECT * FROM comercios WHERE email = ?) y toma rows[0] — con dos comercios
 * con el mismo email, siempre entraría al primero, sin importar de quién sea la
 * contraseña.
 *
 * Uso: node database/addComercioAuth.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function columnExists(connection, table, column) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS count FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0].count > 0;
}

async function indexExists(connection, table, indexName) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS count FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, indexName]
  );
  return rows[0].count > 0;
}

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  // 1. password_hash: necesaria para que el comercio pueda entrar a su panel
  if (!(await columnExists(connection, 'comercios', 'password_hash'))) {
    await connection.query(
      `ALTER TABLE comercios ADD COLUMN password_hash VARCHAR(255) NULL AFTER email`
    );
    console.log('✅ comercios.password_hash agregada.');
  } else {
    console.log('   comercios.password_hash ya existía.');
  }

  // 2. Marca de si ya se le mandó el mail de bienvenida (evita re-enviarlo si MP
  //    manda el mismo webhook dos veces, cosa que hace bastante seguido)
  if (!(await columnExists(connection, 'comercios', 'bienvenida_enviada'))) {
    await connection.query(
      `ALTER TABLE comercios ADD COLUMN bienvenida_enviada BOOLEAN DEFAULT FALSE`
    );
    console.log('✅ comercios.bienvenida_enviada agregada.');
  } else {
    console.log('   comercios.bienvenida_enviada ya existía.');
  }

  // 3. Email único: sin esto el login de comercios es ambiguo
  const [dupes] = await connection.query(
    `SELECT email, COUNT(*) AS c FROM comercios
     WHERE email IS NOT NULL AND email <> ''
     GROUP BY email HAVING c > 1`
  );

  if (dupes.length > 0) {
    console.log('⚠️  NO se pudo crear el índice único de email porque hay duplicados:');
    dupes.forEach((d) => console.log(`     ${d.email} (${d.c} veces)`));
    console.log('   Resolvelos a mano desde el panel de admin y volvé a correr este script.');
  } else if (!(await indexExists(connection, 'comercios', 'idx_comercios_email_unique'))) {
    await connection.query(
      `ALTER TABLE comercios ADD UNIQUE INDEX idx_comercios_email_unique (email)`
    );
    console.log('✅ Índice único en comercios.email creado.');
  } else {
    console.log('   Índice único de email ya existía.');
  }

  await connection.end();
  console.log('\n✅ Migración terminada.');
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
