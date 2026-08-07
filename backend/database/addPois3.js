/**
 * addPois3.js
 * Tanda de museos reales de Mendoza (capital y alrededores), sin duplicar los
 * que ya existen (Museo Municipal de Arte Moderno y Museo Nacional del Vino y
 * la Vendimia en Maipú, cargados en tandas anteriores).
 *
 * Coordenadas aproximadas por zona/dirección conocida (no verificadas pin por pin).
 * Corregible desde el admin con el botón "Usar link" de Google Maps si hace falta.
 *
 * Uso: node database/addPois3.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

function mapsLink(lat, lng) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

const pois = [
  {
    tipo: 'museo', icono: '🏛️',
    nombre_es: 'Museo del Área Fundacional', nombre_en: 'Founding Area Museum', nombre_pt: 'Museu da Área Fundacional',
    sub_es: 'Ciudad · Alberdi y Videla Castillo', sub_en: 'City · Alberdi & Videla Castillo', sub_pt: 'Cidade · Alberdi e Videla Castillo',
    historia_es: 'Construido sobre las ruinas del antiguo Cabildo colonial, muestra restos arqueológicos originales bajo vidrio en el mismo lugar donde fueron encontrados, incluyendo cimientos de la Mendoza anterior al terremoto de 1861.',
    historia_en: 'Built over the ruins of the old colonial Cabildo, it displays original archaeological remains under glass right where they were found, including foundations of Mendoza before the 1861 earthquake.',
    historia_pt: 'Construído sobre as ruínas do antigo Cabildo colonial, mostra restos arqueológicos originais sob vidro.',
    lat: -32.8843, lng: -68.8482
  },
  {
    tipo: 'museo', icono: '🎨',
    nombre_es: 'Museo Provincial de Bellas Artes "Casa de Fader"', nombre_en: 'Fader House Fine Arts Museum', nombre_pt: 'Museu Provincial de Belas Artes "Casa de Fader"',
    sub_es: 'Luján de Cuyo · Ex residencia del pintor Fernando Fader', sub_en: 'Luján de Cuyo · Former home of painter Fernando Fader', sub_pt: 'Luján de Cuyo · Ex residência do pintor Fernando Fader',
    historia_es: 'Funciona en la que fue la casa-taller del pintor Fernando Fader, uno de los grandes referentes del impresionismo argentino, rodeada de viñedos en la zona de Mayor Drummond. Conserva obra original del artista además de muestras itinerantes.',
    historia_en: 'Housed in what was the home-studio of painter Fernando Fader, one of the great figures of Argentine impressionism, surrounded by vineyards in the Mayor Drummond area. It preserves original works by the artist along with traveling exhibitions.',
    historia_pt: 'Funciona na que foi a casa-ateliê do pintor Fernando Fader, um dos grandes nomes do impressionismo argentino.',
    lat: -33.0200, lng: -68.8720
  },
  {
    tipo: 'museo', icono: '🦴',
    nombre_es: 'Museo de Ciencias Naturales y Antropológicas Juan Cornelio Moyano', nombre_en: 'Juan Cornelio Moyano Natural History Museum', nombre_pt: 'Museu de Ciências Naturais e Antropológicas Juan Cornelio Moyano',
    sub_es: 'Parque San Martín · Junto al lago', sub_en: 'Parque San Martín · By the lake', sub_pt: 'Parque San Martín · Junto ao lago',
    historia_es: 'Con la forma de un gran barco blanco y gris al sur del lago del parque, exhibe fósiles, animales embalsamados y colecciones de paleontología y etnología declaradas Bien del Patrimonio Cultural de la Provincia.',
    historia_en: 'Shaped like a large white and grey ship south of the park lake, it displays fossils, taxidermy animals, and paleontology and ethnology collections declared Provincial Cultural Heritage.',
    historia_pt: 'Com a forma de um grande navio branco e cinza ao sul do lago do parque, exibe fósseis e animais empalhados.',
    lat: -32.9080, lng: -68.8700
  },
  {
    tipo: 'museo', icono: '🍷',
    nombre_es: 'Ecomuseo Regional Maipú', nombre_en: 'Maipú Regional Ecomuseum', nombre_pt: 'Ecomuseu Regional Maipú',
    sub_es: 'Maipú · Coquimbito', sub_en: 'Maipú · Coquimbito', sub_pt: 'Maipú · Coquimbito',
    historia_es: 'Un recorrido por la historia productiva y social de Maipú, cuna de la industria vitivinícola moderna de Mendoza, con piezas rescatadas de bodegas y fincas de la zona.',
    historia_en: 'A journey through the productive and social history of Maipú, birthplace of Mendoza\'s modern wine industry, with pieces rescued from local wineries and farms.',
    historia_pt: 'Um percurso pela história produtiva e social de Maipú, berço da indústria vitivinícola moderna de Mendoza.',
    lat: -32.9780, lng: -68.7890
  },
  {
    tipo: 'museo', icono: '🏺',
    nombre_es: 'Museo del Pasado Cuyano', nombre_en: 'Cuyo Past Museum', nombre_pt: 'Museu do Passado Cuyano',
    sub_es: 'Ciudad · Ex casa del gobernador Francisco Civit', sub_en: 'City · Former home of governor Francisco Civit', sub_pt: 'Cidade · Ex-casa do governador Francisco Civit',
    historia_es: 'Funciona en la que fue la casa del ex gobernador Francisco Civit, declarada Monumento Histórico Nacional en 1971. Exhibe armas de la época de la independencia, mobiliario colonial, y la mayor biblioteca especializada en historia de Mendoza, con diarios mendocinos de 1820.',
    historia_en: 'Housed in what was the home of former governor Francisco Civit, declared a National Historic Monument in 1971. It displays weapons from the independence era, colonial furniture, and the largest specialized library on Mendoza\'s history, including local newspapers from 1820.',
    historia_pt: 'Funciona na que foi a casa do ex-governador Francisco Civit, declarada Monumento Histórico Nacional em 1971.',
    lat: -32.8895, lng: -68.8440
  },
  {
    tipo: 'museo', icono: '⚱️',
    nombre_es: 'Las Bóvedas — Museo Histórico de Uspallata', nombre_en: 'Las Bóvedas — Uspallata Historical Museum', nombre_pt: 'Las Bóvedas — Museu Histórico de Uspallata',
    sub_es: 'Uspallata · Ruta Provincial 39, km 12', sub_en: 'Uspallata · Provincial Route 39, km 12', sub_pt: 'Uspallata · Rota Provincial 39, km 12',
    historia_es: 'Antiguos hornos de fundición de metal construidos, según algunos estudios, por los jesuitas a principios del siglo XVII, usados también durante la Campaña Libertadora de San Martín. Sus cuatro salas muestran cultura indígena, fundición, mineralogía e historia sanmartiniana.',
    historia_en: 'Former metal smelting furnaces, believed by some studies to have been built by Jesuits in the early 17th century, also used during San Martín\'s Liberating Campaign. Its four rooms cover indigenous culture, smelting, mineralogy, and San Martín-era history.',
    historia_pt: 'Antigos fornos de fundição de metal construídos, segundo alguns estudos, pelos jesuítas no início do século XVII.',
    lat: -32.6180, lng: -69.3280
  },
  {
    tipo: 'museo', icono: '⛪',
    nombre_es: 'Museo Nuestra Señora de la Carrodilla', nombre_en: 'Our Lady of Carrodilla Museum', nombre_pt: 'Museu Nossa Senhora de la Carrodilla',
    sub_es: 'Luján de Cuyo · San Martín y Carrodilla', sub_en: 'Luján de Cuyo · San Martín & Carrodilla', sub_pt: 'Luján de Cuyo · San Martín e Carrodilla',
    historia_es: 'La patrona de los viñedos de Mendoza tiene su santuario acá. El museo conserva un Cristo Crucificado tallado en quebracho por los huarpes en 1750, y otros 19 Cristos de madera esculpidos por aborígenes entre los siglos XVI y XVIII.',
    historia_en: 'The patron saint of Mendoza\'s vineyards has her sanctuary here. The museum preserves a Crucified Christ carved from quebracho wood by the Huarpes in 1750, along with 19 other wooden Christs carved by indigenous artisans between the 16th and 18th centuries.',
    historia_pt: 'A padroeira dos vinhedos de Mendoza tem seu santuário aqui.',
    lat: -33.0389, lng: -68.8747
  },
  {
    tipo: 'museo', icono: '🏺',
    nombre_es: 'Museo Arqueológico y de Etnografía (UNCuyo)', nombre_en: 'Archaeology & Ethnography Museum (UNCuyo)', nombre_pt: 'Museu Arqueológico e de Etnografia (UNCuyo)',
    sub_es: 'Ciudad · Universidad Nacional de Cuyo', sub_en: 'City · National University of Cuyo', sub_pt: 'Cidade · Universidade Nacional de Cuyo',
    historia_es: 'Depende del Instituto de Arqueología y Etnología de la UNCuyo y conserva colecciones de pueblos originarios de la región cuyana, con piezas huarpes y del período prehispánico andino.',
    historia_en: 'Run by UNCuyo\'s Institute of Archaeology and Ethnology, it preserves collections from the region\'s original peoples, including Huarpe pieces and items from the pre-Hispanic Andean period.',
    historia_pt: 'Depende do Instituto de Arqueologia e Etnologia da UNCuyo e conserva coleções de povos originários da região.',
    lat: -32.8920, lng: -68.8560
  },
  {
    tipo: 'museo', icono: '🖼️',
    nombre_es: 'Mansión Stoppel — Espacio Cultural', nombre_en: 'Stoppel Mansion Cultural Space', nombre_pt: 'Mansão Stoppel — Espaço Cultural',
    sub_es: 'Ciudad · Av. Emilio Civit 348', sub_en: 'City · Av. Emilio Civit 348', sub_pt: 'Cidade · Av. Emilio Civit 348',
    historia_es: 'Casona tradicional de principios del siglo XX construida en 1912, Bien del Patrimonio Provincial. Sufrió daños en el terremoto de Caucete de 1977 y estuvo abandonada hasta su restauración, reabriendo como espacio cultural en 2018.',
    historia_en: 'A traditional early-20th-century mansion built in 1912, listed as Provincial Heritage. It was damaged in the 1977 Caucete earthquake and stood abandoned until its restoration, reopening as a cultural space in 2018.',
    historia_pt: 'Casarão tradicional do início do século XX construído em 1912, Patrimônio Provincial.',
    lat: -32.8940, lng: -68.8560
  },
  {
    tipo: 'museo', icono: '💎',
    nombre_es: 'Museo Mineralógico (UNCuyo)', nombre_en: 'Mineralogical Museum (UNCuyo)', nombre_pt: 'Museu Mineralógico (UNCuyo)',
    sub_es: 'Ciudad · Facultad de Ciencias Exactas', sub_en: 'City · Faculty of Exact Sciences', sub_pt: 'Cidade · Faculdade de Ciências Exatas',
    historia_es: 'Colección universitaria de minerales, rocas y meteoritos de Mendoza y otras provincias andinas, útil tanto para geólogos como para curiosos de la naturaleza.',
    historia_en: 'A university collection of minerals, rocks, and meteorites from Mendoza and other Andean provinces, of interest to geologists and nature lovers alike.',
    historia_pt: 'Coleção universitária de minerais, rochas e meteoritos de Mendoza e outras províncias andinas.',
    lat: -32.8900, lng: -68.8460
  },
  {
    tipo: 'museo', icono: '🏛️',
    nombre_es: 'Casa Museo Molina Pico', nombre_en: 'Molina Pico House Museum', nombre_pt: 'Casa Museu Molina Pico',
    sub_es: 'Ciudad · Casona patrimonial', sub_en: 'City · Heritage mansion', sub_pt: 'Cidade · Casarão patrimonial',
    historia_es: 'Antigua residencia familiar convertida en museo, que conserva mobiliario y objetos originales para mostrar cómo vivía la clase alta mendocina de principios del siglo XX.',
    historia_en: 'A former family residence turned museum, preserving original furniture and objects to show how Mendoza\'s upper class lived in the early 20th century.',
    historia_pt: 'Antiga residência familiar transformada em museu, que conserva mobiliário e objetos originais.',
    lat: -32.8910, lng: -68.8480
  },
  {
    tipo: 'museo', icono: '🏍️',
    nombre_es: 'Museo de Motos Antiguas', nombre_en: 'Vintage Motorcycle Museum', nombre_pt: 'Museu de Motos Antigas',
    sub_es: 'Mendoza · Colección de motos históricas', sub_en: 'Mendoza · Historic motorcycle collection', sub_pt: 'Mendoza · Coleção de motos históricas',
    historia_es: 'Una colección privada de motocicletas de distintas épocas, desde las primeras marcas europeas de principios del siglo XX hasta clásicas japonesas, todas restauradas y funcionando.',
    historia_en: 'A private collection of motorcycles from different eras, from early 20th-century European brands to classic Japanese bikes, all restored and in working order.',
    historia_pt: 'Uma coleção privada de motocicletas de diferentes épocas, todas restauradas e funcionando.',
    lat: -32.8930, lng: -68.8500
  }
];

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  console.log(`Insertando ${pois.length} museos nuevos...`);

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
  console.log(`✅ Listo. Se agregaron ${pois.length} museos nuevos.`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
