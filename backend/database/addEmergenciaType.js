/**
 * addEmergenciaType.js
 * Agrega 'emergencia' como tipo válido de POI (policía, bomberos, hospital),
 * modificando el ENUM de la columna tipo en la tabla pois.
 *
 * Uso: node database/addEmergenciaType.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  await connection.query(
    `ALTER TABLE pois MODIFY COLUMN tipo
     ENUM('monumento','plaza','historia','mirador','museo','iglesia','emergencia','transporte','otro') NOT NULL`
  );
  console.log('✅ Tipos "emergencia" y "transporte" agregados al enum de pois.');
  await connection.end();
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
