/**
 * addPois4.js
 * Monumentos reales de Mendoza que faltaban (la categoría "monumento" solo tenía
 * 4 lugares porque varios habían quedado mal categorizados como "historia" en
 * tandas anteriores). Esta tanda se enfoca específicamente en eso.
 *
 * Uso: node database/addPois4.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

function mapsLink(lat, lng) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

const pois = [
  {
    tipo: 'monumento', icono: '⛲',
    nombre_es: 'Fuente de los Continentes', nombre_en: 'Fountain of the Continents', nombre_pt: 'Fonte dos Continentes',
    sub_es: 'Parque San Martín · Junto al Rosedal', sub_en: 'Parque San Martín · By the Rose Garden', sub_pt: 'Parque San Martín · Junto ao Roseiral',
    historia_es: 'Comprada en Francia en 1909 e inaugurada en 1911, esta fuente monumental fundida en los talleres franceses Val d\'Osne representa los cuatro continentes: América, Asia, Europa y África. Es una de solo tres piezas de este tipo registradas en el mundo, inspirada en la fuente de los Cuatro Continentes de los Jardines de Luxemburgo en París.',
    historia_en: 'Purchased in France in 1909 and inaugurated in 1911, this monumental fountain, cast at the French Val d\'Osne workshops, represents the four continents: America, Asia, Europe, and Africa. It\'s one of only three known pieces of its kind in the world, inspired by the Fountain of the Four Continents in Paris\'s Luxembourg Gardens.',
    historia_pt: 'Comprada na França em 1909 e inaugurada em 1911, esta fonte monumental representa os quatro continentes.',
    lat: -32.8985, lng: -68.8670
  },
  {
    tipo: 'monumento', icono: '🗿',
    nombre_es: 'Monumento al Ejército Libertador', nombre_en: 'Monument to the Liberating Army', nombre_pt: 'Monumento ao Exército Libertador',
    sub_es: 'Cerro de la Gloria · Homenaje a San Martín', sub_en: 'Cerro de la Gloria · Tribute to San Martín', sub_pt: 'Cerro de la Gloria · Homenagem a San Martín',
    historia_es: 'En la cima del Cerro de la Gloria, este gran conjunto escultórico de bronce homenajea al General San Martín y al Ejército de los Andes que cruzó la cordillera en 1817 para liberar Chile y Perú. Es uno de los monumentos más grandes de Sudamérica dedicados a un hecho histórico militar.',
    historia_en: 'At the top of Cerro de la Gloria, this large bronze sculptural ensemble honors General San Martín and the Army of the Andes that crossed the mountains in 1817 to liberate Chile and Peru. It\'s one of the largest monuments in South America dedicated to a military historical event.',
    historia_pt: 'No topo do Cerro de la Gloria, este grande conjunto escultórico de bronze homenageia o General San Martín.',
    lat: -32.8987, lng: -68.8663
  },
  {
    tipo: 'monumento', icono: '🎖️',
    nombre_es: 'Monumento a los Caídos de Malvinas', nombre_en: 'Falklands War Memorial', nombre_pt: 'Monumento aos Caídos de Malvinas',
    sub_es: 'Ciudad · Homenaje a los veteranos mendocinos', sub_en: 'City · Tribute to Mendoza veterans', sub_pt: 'Cidade · Homenagem aos veteranos mendocinos',
    historia_es: 'Monumento en homenaje a los soldados mendocinos caídos en la Guerra de Malvinas de 1982, con los nombres grabados de los combatientes de la provincia. Es sitio de actos conmemorativos cada 2 de abril.',
    historia_en: 'A monument honoring Mendoza soldiers who died in the 1982 Falklands War, with the names of the province\'s combatants engraved. It hosts commemorative ceremonies every April 2nd.',
    historia_pt: 'Monumento em homenagem aos soldados mendocinos mortos na Guerra das Malvinas de 1982.',
    lat: -32.8905, lng: -68.8455
  },
  {
    tipo: 'monumento', icono: '🐎',
    nombre_es: 'Monumento Ecuestre al General San Martín', nombre_en: 'Equestrian Monument to General San Martín', nombre_pt: 'Monumento Equestre ao General San Martín',
    sub_es: 'Plaza San Martín · Mirando hacia la cordillera', sub_en: 'Plaza San Martín · Facing the Andes', sub_pt: 'Praça San Martín · Olhando para a cordilheira',
    historia_es: 'La gran estatua ecuestre que domina la Plaza San Martín mira hacia la cordillera que el Libertador cruzó con su ejército en 1817. Es una de las imágenes más reproducidas de la ciudad y punto de referencia obligado del centro.',
    historia_en: 'The large equestrian statue that dominates Plaza San Martín faces the mountains the Liberator crossed with his army in 1817. It\'s one of the most photographed images of the city and a must-see downtown landmark.',
    historia_pt: 'A grande estátua equestre que domina a Praça San Martín olha para a cordilheira que o Libertador cruzou.',
    lat: -32.8935, lng: -68.8510
  },
  {
    tipo: 'monumento', icono: '⚱️',
    nombre_es: 'Monumento al Trabajo', nombre_en: 'Monument to Labor', nombre_pt: 'Monumento ao Trabalho',
    sub_es: 'Ciudad · Homenaje al esfuerzo mendocino', sub_en: 'City · Tribute to Mendoza\'s work ethic', sub_pt: 'Cidade · Homenagem ao esforço mendocino',
    historia_es: 'Escultura que rinde homenaje a los trabajadores que reconstruyeron Mendoza tras el terremoto de 1861 y a quienes forjaron su industria vitivinícola desde cero, muchos de ellos inmigrantes europeos.',
    historia_en: 'A sculpture honoring the workers who rebuilt Mendoza after the 1861 earthquake and those who built its wine industry from scratch, many of them European immigrants.',
    historia_pt: 'Escultura que homenageia os trabalhadores que reconstruíram Mendoza após o terremoto de 1861.',
    lat: -32.8920, lng: -68.8430
  }
];

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  console.log(`Insertando ${pois.length} monumentos nuevos...`);

  for (const p of pois) {
    const link = mapsLink(p.lat, p.lng);
    await connection.query(
      `INSERT INTO pois (tipo, icono, nombre_es, nombre_en, nombre_pt, sub_es, sub_en, sub_pt, historia_es, historia_en, historia_pt, lat, lng, google_maps_link)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.tipo, p.icono, p.nombre_es, p.nombre_en, p.nombre_pt, p.sub_es, p.sub_en, p.sub_pt, p.historia_es, p.historia_en, p.historia_pt, p.lat, p.lng, link]
    );
    console.log(`   + ${p.nombre_es}`);
  }

  await connection.end();
  console.log(`✅ Listo. Se agregaron ${pois.length} monumentos nuevos.`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
