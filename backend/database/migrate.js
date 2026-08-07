/**
 * migrate.js
 * Corre el schema.sql contra la base de datos MySQL definida en DATABASE_URL (.env)
 * y opcionalmente carga datos de ejemplo (POIs + un admin inicial).
 *
 * Uso:
 *   node database/migrate.js          -> crea las tablas
 *   node database/migrate.js --seed   -> crea las tablas Y carga POIs de ejemplo + admin
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ Falta DATABASE_URL en el archivo .env');
    process.exit(1);
  }

  console.log('Conectando a MySQL...');
  const connection = await mysql.createConnection(connectionString);

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Ejecutando ${statements.length} sentencias del schema...`);
  for (const stmt of statements) {
    await connection.query(stmt);
  }
  console.log('✅ Tablas creadas/verificadas correctamente.');

  if (process.argv.includes('--seed')) {
    console.log('Cargando datos de ejemplo...');

    // Superadmin inicial (cambiar la password desde MySQL directamente después del primer login,
    // o agregar una pantalla de "cambiar password" más adelante)
    const passwordHash = await bcrypt.hash('mendozapp123', 10);
    await connection.query(
      `INSERT INTO admins (email, password_hash, nombre)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE email = email`,
      ['drazewski@gmail.com', passwordHash, 'Roberto Drazewski']
    );
    console.log('   Superadmin creado -> drazewski@gmail.com / mendozapp123 (CAMBIAR password apenas puedas)');

    // POIs de ejemplo (espacios públicos - gratis, siempre visibles)
    const pois = [
      {
        tipo: 'historia', icono: '⛪',
        nombre_es: 'Basílica de San Francisco', nombre_en: 'San Francisco Basilica', nombre_pt: 'Basílica de São Francisco',
        sub_es: 'Centro · Reliquia del Terremoto de 1861', sub_en: 'Downtown · Relic of the 1861 Earthquake', sub_pt: 'Centro · Relíquia do Terremoto de 1861',
        historia_es: 'El 20 de marzo de 1861, un terremoto destruyó casi por completo la ciudad de Mendoza en apenas 40 segundos. De la iglesia original solo quedaron en pie las ruinas que todavía podés ver hoy. Dentro de la basílica actual se guarda el Estandarte de los Andes, la bandera que San Martín bendijo antes de cruzar la cordillera.',
        historia_en: 'On March 20, 1861, an earthquake nearly destroyed Mendoza in just 40 seconds. Only the ruins of the original church remain standing today. Inside the current basilica, the Andes Standard is kept, the flag General San Martín blessed before crossing the mountains.',
        historia_pt: 'Em 20 de março de 1861, um terremoto destruiu quase completamente Mendoza em apenas 40 segundos. Da igreja original só restaram as ruínas que ainda podem ser vistas hoje.',
        lat: -32.8895, lng: -68.8458
      },
      {
        tipo: 'plaza', icono: '🌳',
        nombre_es: 'Plaza Independencia', nombre_en: 'Independencia Square', nombre_pt: 'Praça Independência',
        sub_es: 'Centro · Corazón de la ciudad', sub_en: 'Downtown · Heart of the city', sub_pt: 'Centro · Coração da cidade',
        historia_es: 'Bajo la plaza funciona el Museo Municipal de Arte Moderno, construido bajo tierra después del terremoto de 1861 para minimizar riesgos sísmicos. Los fines de semana se llena con la tradicional Feria de Artesanos.',
        historia_en: 'Beneath the square is the Municipal Museum of Modern Art, built underground after the 1861 earthquake to minimize seismic risk. On weekends it fills with the traditional Craft Fair.',
        historia_pt: 'Sob a praça funciona o Museu Municipal de Arte Moderna, construído no subsolo depois do terremoto de 1861.',
        lat: -32.8908, lng: -68.8455
      },
      {
        tipo: 'mirador', icono: '⛰️',
        nombre_es: 'Cerro de la Gloria', nombre_en: 'Cerro de la Gloria', nombre_pt: 'Cerro de la Gloria',
        sub_es: 'Parque General San Martín · Vista panorámica', sub_en: 'Parque San Martín · Panoramic view', sub_pt: 'Parque San Martín · Vista panorâmica',
        historia_es: 'En la cima se encuentra el Monumento al Ejército Libertador, homenaje a San Martín y su cruce de los Andes. Desde acá se ve toda la ciudad y, en días despejados, la Cordillera completa.',
        historia_en: 'At the top stands the Monument to the Liberating Army, honoring San Martín and his crossing of the Andes. From here you can see the whole city and, on clear days, the full mountain range.',
        historia_pt: 'No topo está o Monumento ao Exército Libertador, homenagem a San Martín.',
        lat: -32.8987, lng: -68.8663
      }
    ];

    for (const p of pois) {
      await connection.query(
        `INSERT INTO pois (tipo, icono, nombre_es, nombre_en, nombre_pt, sub_es, sub_en, sub_pt, historia_es, historia_en, historia_pt, lat, lng)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.tipo, p.icono, p.nombre_es, p.nombre_en, p.nombre_pt, p.sub_es, p.sub_en, p.sub_pt, p.historia_es, p.historia_en, p.historia_pt, p.lat, p.lng]
      );
    }
    console.log(`   ${pois.length} POIs de ejemplo cargados.`);

    // Banner de ejemplo
    await connection.query(
      `INSERT INTO banners (texto_es, texto_en, texto_pt, activo, orden)
       VALUES (?, ?, ?, TRUE, 1)`,
      ['🍇 Descubrí las bodegas de Mendoza con historias narradas por IA', '🍇 Discover Mendoza wineries with AI-narrated stories', '🍇 Descubra as vinícolas de Mendoza com histórias narradas por IA']
    );
    console.log('   Banner de ejemplo cargado.');
  }

  await connection.end();
  console.log('✅ Listo.');
}

main().catch(err => {
  console.error('❌ Error en la migración:', err);
  process.exit(1);
});
