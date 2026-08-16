/**
 * addEstadoPrueba.js
 * Agrega 'prueba' como estado válido de un comercio.
 *
 * Por qué: hasta ahora, si alguien completaba el formulario de alta y después
 * volvía atrás sin pagar, quedaba un registro huérfano en 'pendiente' — invisible
 * para el turista e inútil para vos. Con el período de prueba, ese mismo registro
 * pasa a ser un cliente en trial de 30 días: se muestra en el mapa desde el
 * primer minuto, recibe su contraseña, y ve el valor del producto antes de pagar.
 *
 * Uso: node database/addEstadoPrueba.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  await connection.query(
    `ALTER TABLE comercios MODIFY COLUMN estado
     ENUM('activo','inactivo','pendiente','moroso','prueba') NOT NULL DEFAULT 'pendiente'`
  );
  console.log('✅ Estado "prueba" agregado al enum de comercios.');

  // Marca para saber si ya se le avisó que la prueba está por terminar
  const [cols] = await connection.query(
    `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comercios'
       AND COLUMN_NAME = 'aviso_prueba_enviado'`
  );
  if (cols[0].c === 0) {
    await connection.query(
      `ALTER TABLE comercios ADD COLUMN aviso_prueba_enviado BOOLEAN DEFAULT FALSE`
    );
    console.log('✅ comercios.aviso_prueba_enviado agregada.');
  } else {
    console.log('   comercios.aviso_prueba_enviado ya existía.');
  }

  await connection.end();
  console.log('\n✅ Migración terminada.');
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
