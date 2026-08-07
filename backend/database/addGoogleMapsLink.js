/**
 * addGoogleMapsLink.js
 * Agrega la columna google_maps_link a "comercios" y "pois" en una base que ya existe
 * (no rompe nada si ya la corriste antes, chequea si la columna existe primero).
 *
 * Uso: node database/addGoogleMapsLink.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function columnExists(connection, table, column) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) as count FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0].count > 0;
}

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  if (!(await columnExists(connection, 'comercios', 'google_maps_link'))) {
    await connection.query(`ALTER TABLE comercios ADD COLUMN google_maps_link VARCHAR(500) AFTER foto_url`);
    console.log('✅ Columna google_maps_link agregada a comercios.');
  } else {
    console.log('   comercios.google_maps_link ya existía, no se tocó.');
  }

  if (!(await columnExists(connection, 'pois', 'google_maps_link'))) {
    await connection.query(`ALTER TABLE pois ADD COLUMN google_maps_link VARCHAR(500) AFTER lng`);
    console.log('✅ Columna google_maps_link agregada a pois.');
  } else {
    console.log('   pois.google_maps_link ya existía, no se tocó.');
  }

  await connection.end();
  console.log('Listo.');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
