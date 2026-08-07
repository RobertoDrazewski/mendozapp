/**
 * addPois5.js
 * Servicios de emergencia reales que un turista puede necesitar: policía
 * turística (UPAT), bomberos, hospital. Requiere haber corrido antes
 * addEmergenciaType.js para que el tipo 'emergencia' exista en el enum.
 *
 * Uso: node database/addEmergenciaType.js   (una sola vez)
 *      node database/addPois5.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

function mapsLink(lat, lng) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

const pois = [
  {
    tipo: 'emergencia', icono: '👮',
    nombre_es: 'Policía Turística (UPAT) — Gran Mendoza', nombre_en: 'Tourist Police (UPAT) — Greater Mendoza', nombre_pt: 'Polícia Turística (UPAT) — Grande Mendoza',
    sub_es: 'Ciudad · Av. San Martín 1143 · Tel: 0261-4132135', sub_en: 'City · Av. San Martín 1143 · Tel: 0261-4132135', sub_pt: 'Cidade · Av. San Martín 1143 · Tel: 0261-4132135',
    historia_es: 'La Unidad Policial de Asistencia al Turista (UPAT) es la más antigua del país en su tipo, con oficiales que hablan inglés, italiano, francés, portugués y alemán. Ayudan con pérdida de documentación, problemas con prestadores turísticos, o cualquier inconveniente durante tu estadía. Sedes también en la Terminal de Ómnibus, Maipú y San Rafael.',
    historia_en: 'The Tourist Police Unit (UPAT) is the oldest of its kind in the country, with officers who speak English, Italian, French, Portuguese, and German. They help with lost documents, issues with tour operators, or any problem during your stay. Also present at the Bus Terminal, Maipú, and San Rafael.',
    historia_pt: 'A Unidade Policial de Assistência ao Turista (UPAT) é a mais antiga do país no seu tipo, com policiais que falam vários idiomas.',
    lat: -32.8845, lng: -68.8380
  },
  {
    tipo: 'emergencia', icono: '🚑',
    nombre_es: 'Hospital Central de Mendoza', nombre_en: 'Mendoza Central Hospital', nombre_pt: 'Hospital Central de Mendoza',
    sub_es: 'Ciudad · Av. Alem 450 esq. Salta', sub_en: 'City · Av. Alem 450 & Salta', sub_pt: 'Cidade · Av. Alem 450 esq. Salta',
    historia_es: 'El hospital público de mayor complejidad de la provincia y referencia de todo el oeste argentino, con guardia de urgencias las 24 horas. Fue fundado en 1941 y jugó un rol clave atendiendo heridos del terremoto de San Juan de 1944.',
    historia_en: 'The province\'s highest-complexity public hospital and a reference point for all of western Argentina, with a 24-hour emergency room. Founded in 1941, it played a key role treating the injured after the 1944 San Juan earthquake.',
    historia_pt: 'O hospital público de maior complexidade da província, com pronto-socorro 24 horas.',
    lat: -32.8895, lng: -68.8535
  },
  {
    tipo: 'emergencia', icono: '🚒',
    nombre_es: 'Cuartel Central de Bomberos', nombre_en: 'Central Fire Station', nombre_pt: 'Quartel Central de Bombeiros',
    sub_es: 'Ciudad · Sargento Cabral 108 · Tel: 0261-4203317', sub_en: 'City · Sargento Cabral 108 · Tel: 0261-4203317', sub_pt: 'Cidade · Sargento Cabral 108 · Tel: 0261-4203317',
    historia_es: 'Sede central del cuerpo de bomberos de la Ciudad de Mendoza, con cobertura de incendios, rescates y emergencias diversas en el área metropolitana.',
    historia_en: 'Central headquarters of the Mendoza City fire department, covering fires, rescues, and various emergencies in the metropolitan area.',
    historia_pt: 'Sede central do corpo de bombeiros da Cidade de Mendoza.',
    lat: -32.8870, lng: -68.8420
  },
  {
    tipo: 'emergencia', icono: '👮',
    nombre_es: 'Policía Turística — Terminal de Ómnibus', nombre_en: 'Tourist Police — Bus Terminal', nombre_pt: 'Polícia Turística — Terminal de Ônibus',
    sub_es: 'Guaymallén · Gob. Ricardo Videla 5519 (ETOM)', sub_en: 'Guaymallén · Gob. Ricardo Videla 5519 (ETOM)', sub_pt: 'Guaymallén · Gob. Ricardo Videla 5519 (ETOM)',
    historia_es: 'Mendoza es la única provincia argentina con Policía Turística dentro de su propia terminal de ómnibus, asistiendo a viajeros que llegan desde otras provincias o desde Chile. Con más de 700 intervenciones mensuales.',
    historia_en: 'Mendoza is the only Argentine province with Tourist Police inside its own bus terminal, assisting travelers arriving from other provinces or from Chile. Handles over 700 interventions monthly.',
    historia_pt: 'Mendoza é a única província argentina com Polícia Turística dentro de sua própria rodoviária.',
    lat: -32.8930, lng: -68.8280
  },
  {
    tipo: 'emergencia', icono: '👮',
    nombre_es: 'Policía Turística — Maipú (Ruta del Vino)', nombre_en: 'Tourist Police — Maipú (Wine Route)', nombre_pt: 'Polícia Turística — Maipú (Rota do Vinho)',
    sub_es: 'Maipú · Ruta 60 y carril Urquiza, Coquimbito', sub_en: 'Maipú · Ruta 60 & carril Urquiza, Coquimbito', sub_pt: 'Maipú · Ruta 60 e carril Urquiza, Coquimbito',
    historia_es: 'Delegación de la Policía Turística en pleno corazón de la Ruta del Vino de Maipú, cubriendo los departamentos de Maipú y Luján de Cuyo — justo la zona con mayor concentración de bodegas de la provincia.',
    historia_en: 'Tourist Police branch right in the heart of the Maipú Wine Route, covering the Maipú and Luján de Cuyo departments — exactly the area with the highest concentration of wineries in the province.',
    historia_pt: 'Delegação da Polícia Turística no coração da Rota do Vinho de Maipú.',
    lat: -32.9780, lng: -68.7870
  }
];

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  console.log(`Insertando ${pois.length} puntos de emergencia...`);

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
  console.log(`✅ Listo. Se agregaron ${pois.length} puntos de emergencia.`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
