/**
 * addFotosTable.js
 * Crea la tabla donde se guardan las fotos que suben los comercios.
 *
 * Por qué en MySQL y no en el disco del servidor: Railway usa un filesystem
 * efímero — todo lo que se escriba en disco se borra en el próximo deploy. Una
 * foto subida el lunes desaparecería el martes al publicar un cambio.
 *
 * Va en tabla aparte (no como columna de `comercios`) para que las consultas
 * del mapa, que traen todos los comercios, no arrastren los binarios de las
 * imágenes en cada request.
 *
 * Uso: node database/addFotosTable.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS comercio_fotos (
      comercio_id INT PRIMARY KEY,
      mime VARCHAR(50) NOT NULL DEFAULT 'image/jpeg',
      data MEDIUMBLOB NOT NULL,
      bytes INT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (comercio_id) REFERENCES comercios(id) ON DELETE CASCADE
    )
  `);
  console.log('✅ Tabla comercio_fotos creada/verificada.');

  await connection.end();
  console.log('\n✅ Migración terminada.');
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
