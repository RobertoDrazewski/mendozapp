const mysql = require('mysql2/promise');

if (!process.env.DATABASE_URL) {
  console.warn('⚠️  DATABASE_URL no está definida. Configurala en el .env o en las variables de entorno de Railway.');
}

const pool = mysql.createPool(process.env.DATABASE_URL);

module.exports = pool;
