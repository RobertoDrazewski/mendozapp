/**
 * addPois6.js
 * Estaciones del Metrotranvía de Mendoza (tren liviano), la única fuente de
 * transporte público con nombres reales que encontramos en el portal de datos
 * abiertos (las paradas de colectivo del dataset municipal no tienen nombre,
 * dirección ni coordenadas útiles - solo un ID numérico, así que se descartaron).
 *
 * Requiere haber corrido antes addEmergenciaType.js (agrega el tipo 'transporte').
 *
 * IMPORTANTE sobre precisión: coordenadas aproximadas siguiendo el trazado real
 * de la línea (confirmado: Gutiérrez en Maipú -> Godoy Cruz -> Ciudad -> Avellaneda
 * en Las Heras), pero no verificadas estación por estación. Corregible desde el
 * admin con el botón "Usar link" de Google Maps.
 *
 * Uso: node database/addPois6.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

function mapsLink(lat, lng) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

// Aproximación siguiendo el corredor real de la línea, de sur (Maipú) a norte (Las Heras)
const estaciones = [
  { nombre: 'Estación Gutiérrez', depto: 'Maipú', lat: -32.9850, lng: -68.7950 },
  { nombre: 'Estación Luzuriaga', depto: 'Maipú', lat: -32.9700, lng: -68.8100 },
  { nombre: 'Estación Maza', depto: 'Maipú', lat: -32.9600, lng: -68.8200 },
  { nombre: 'Estación Alta Italia', depto: 'Maipú', lat: -32.9500, lng: -68.8280 },
  { nombre: 'Estación Piedra Buena', depto: 'Maipú', lat: -32.9420, lng: -68.8320 },
  { nombre: 'Estación 9 de Julio', depto: 'Godoy Cruz', lat: -32.9300, lng: -68.8360 },
  { nombre: 'Estación Independencia', depto: 'Godoy Cruz', lat: -32.9230, lng: -68.8390 },
  { nombre: 'Estación Progreso', depto: 'Godoy Cruz', lat: -32.9170, lng: -68.8410 },
  { nombre: 'Estación Mitre', depto: 'Godoy Cruz', lat: -32.9120, lng: -68.8430 },
  { nombre: 'Estación San Martín', depto: 'Godoy Cruz', lat: -32.9080, lng: -68.8450 },
  { nombre: 'Estación Pellegrini', depto: 'Godoy Cruz', lat: -32.9030, lng: -68.8460 },
  { nombre: 'Estación 25 de Mayo', depto: 'Godoy Cruz', lat: -32.8980, lng: -68.8465 },
  { nombre: 'Estación Belgrano', depto: 'Ciudad de Mendoza', lat: -32.8930, lng: -68.8470 },
  { nombre: 'Estación Pedro Molina', depto: 'Ciudad de Mendoza', lat: -32.8890, lng: -68.8480 },
  { nombre: 'Estación Mendoza (Terminal)', depto: 'Ciudad de Mendoza', lat: -32.8916, lng: -68.8460 },
  { nombre: 'Estación Suipacha', depto: 'Ciudad de Mendoza', lat: -32.8850, lng: -68.8500 },
  { nombre: 'Estación Moldes', depto: 'Ciudad de Mendoza', lat: -32.8790, lng: -68.8530 },
  { nombre: 'Estación Lugones', depto: 'Ciudad de Mendoza', lat: -32.8730, lng: -68.8560 },
  { nombre: 'Estación Rubilar', depto: 'Ciudad de Mendoza', lat: -32.8670, lng: -68.8590 },
  { nombre: 'Estación Godoy', depto: 'Las Heras', lat: -32.8610, lng: -68.8620 },
  { nombre: 'Estación Patricias Mendocinas', depto: 'Las Heras', lat: -32.8550, lng: -68.8650 },
  { nombre: 'Estación Roca', depto: 'Las Heras', lat: -32.8490, lng: -68.8680 },
  { nombre: 'Estación Burgos', depto: 'Las Heras', lat: -32.8430, lng: -68.8710 },
  { nombre: 'Estación Avellaneda', depto: 'Las Heras', lat: -32.8370, lng: -68.8740 },
];

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  console.log(`Insertando ${estaciones.length} estaciones del Metrotranvía...`);

  for (const e of estaciones) {
    const link = mapsLink(e.lat, e.lng);
    await connection.query(
      `INSERT INTO pois (tipo, icono, nombre_es, nombre_en, nombre_pt, sub_es, sub_en, sub_pt, historia_es, historia_en, historia_pt, lat, lng, google_maps_link)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'transporte', '🚊',
        e.nombre, e.nombre, e.nombre,
        `${e.depto} · Metrotranvía`, `${e.depto} · Light rail`, `${e.depto} · Metrotranvia`,
        `Estación del Metrotranvía de Mendoza, la línea de tren liviano de 17 km que conecta Maipú, Godoy Cruz, Ciudad y Las Heras. El boleto se paga con tarjeta SUBE, la misma que se usa en los colectivos.`,
        `Metrotranvía light rail station, the 17 km line connecting Maipú, Godoy Cruz, City, and Las Heras. Tickets are paid with the SUBE card, the same one used on buses.`,
        `Estação do Metrotranvía de Mendoza, a linha de trem leve de 17 km que conecta Maipú, Godoy Cruz, Cidade e Las Heras.`,
        e.lat, e.lng, link
      ]
    );
    console.log(`   + ${e.nombre}`);
  }

  await connection.end();
  console.log(`✅ Listo. Se agregaron ${estaciones.length} estaciones.`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
