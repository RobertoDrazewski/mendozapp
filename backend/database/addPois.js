/**
 * addPois.js
 * Suma MUCHOS más puntos de interés públicos y gratuitos a los que ya cargó migrate.js --seed,
 * sin duplicar los 3 originales. Cubre: Ciudad de Mendoza (Capital), Godoy Cruz, Maipú,
 * Luján de Cuyo, Guaymallén y Las Heras — con monumentos, plazas, parques, museos y la
 * Ruta del Vino histórica (bodegas centenarias que se pueden visitar como patrimonio,
 * aparte de las bodegas que se suscriban como "comercios" para aparecer destacadas).
 *
 * Uso: node database/addPois.js
 *
 * IMPORTANTE sobre las coordenadas: son aproximadas (ubicación general del lugar/dirección
 * conocida), no verificadas GPS punto por punto. Antes de lanzar a producción, conviene
 * confirmarlas una por una contra Google Maps (clic derecho > "¿Qué hay aquí?" en cada lugar)
 * para que el pin caiga exacto en la entrada real.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const pois = [
  /* ============ CAPITAL (Ciudad de Mendoza) ============ */
  {
    tipo: 'plaza', icono: '🌳',
    nombre_es: 'Plaza España', nombre_en: 'Plaza España', nombre_pt: 'Praça España',
    sub_es: 'Centro · Azulejos españoles', sub_en: 'Downtown · Spanish tiles', sub_pt: 'Centro · Azulejos espanhóis',
    historia_es: 'Inaugurada en 1948, está decorada con miles de azulejos sevillanos que forman murales sobre la conquista de América. Es una de las plazas más fotografiadas de la ciudad, con bancos y fuentes revestidos íntegramente en cerámica española.',
    historia_en: 'Opened in 1948, it is decorated with thousands of Sevillian tiles forming murals about the conquest of the Americas. One of the most photographed squares in the city.',
    historia_pt: 'Inaugurada em 1948, é decorada com milhares de azulejos sevilhanos formando murais sobre a conquista da América.',
    lat: -32.8926, lng: -68.8390
  },
  {
    tipo: 'plaza', icono: '🌳',
    nombre_es: 'Plaza Chile', nombre_en: 'Plaza Chile', nombre_pt: 'Praça Chile',
    sub_es: 'Centro · Monumento a los Andes', sub_en: 'Downtown · Andes Monument', sub_pt: 'Centro · Monumento aos Andes',
    historia_es: 'Homenajea la hermandad entre Argentina y Chile. Su monumento central representa el cruce de los Andes y el vínculo histórico entre ambos países a través de la cordillera.',
    historia_en: 'Honors the friendship between Argentina and Chile. Its central monument represents the crossing of the Andes and the historic bond between both countries.',
    historia_pt: 'Homenageia a fraternidade entre Argentina e Chile.',
    lat: -32.8875, lng: -68.8420
  },
  {
    tipo: 'plaza', icono: '🌳',
    nombre_es: 'Plaza Italia', nombre_en: 'Plaza Italia', nombre_pt: 'Praça Itália',
    sub_es: 'Centro · Comunidad italiana', sub_en: 'Downtown · Italian community', sub_pt: 'Centro · Comunidade italiana',
    historia_es: 'Rinde homenaje a la inmensa inmigración italiana que dio forma a la industria vitivinícola mendocina. Su monumento a la Loba Romana con Rómulo y Remo es un clásico punto de encuentro.',
    historia_en: 'Honors the massive Italian immigration that shaped Mendoza\'s wine industry. Its Roman She-Wolf monument is a classic meeting point.',
    historia_pt: 'Homenageia a imensa imigração italiana que deu forma à indústria vitivinícola mendocina.',
    lat: -32.8865, lng: -68.8480
  },
  {
    tipo: 'plaza', icono: '🌳',
    nombre_es: 'Plaza San Martín', nombre_en: 'Plaza San Martín', nombre_pt: 'Praça San Martín',
    sub_es: 'Centro · Estatua ecuestre', sub_en: 'Downtown · Equestrian statue', sub_pt: 'Centro · Estátua equestre',
    historia_es: 'Domina la plaza una gran estatua ecuestre del Libertador José de San Martín, mirando hacia la cordillera que cruzó con su ejército en 1817.',
    historia_en: 'A large equestrian statue of General José de San Martín dominates the square, facing the mountains he crossed with his army in 1817.',
    historia_pt: 'Domina a praça uma grande estátua equestre do Libertador José de San Martín.',
    lat: -32.8935, lng: -68.8510
  },
  {
    tipo: 'museo', icono: '🏛️',
    nombre_es: 'Área Fundacional y Plaza Pedro del Castillo', nombre_en: 'Founding Area & Plaza Pedro del Castillo', nombre_pt: 'Área Fundacional e Praça Pedro del Castillo',
    sub_es: 'Sitio donde nació la ciudad en 1561', sub_en: 'Site where the city was founded in 1561', sub_pt: 'Local onde a cidade nasceu em 1561',
    historia_es: 'Acá fue fundada Mendoza por Pedro del Castillo en 1561, y acá también quedó reducida a escombros por el terremoto de 1861. El Museo del Área Fundacional, construido sobre las ruinas del antiguo Cabildo, muestra restos arqueológicos originales bajo vidrio, en el mismo lugar donde fueron encontrados.',
    historia_en: 'Mendoza was founded here by Pedro del Castillo in 1561, and reduced to rubble here too by the 1861 earthquake. The Founding Area Museum, built over the ruins of the old Cabildo, displays original archaeological remains under glass, right where they were found.',
    historia_pt: 'Aqui foi fundada Mendoza por Pedro del Castillo em 1561, e aqui também ficou reduzida a escombros pelo terremoto de 1861.',
    lat: -32.8843, lng: -68.8482
  },
  {
    tipo: 'iglesia', icono: '⛪',
    nombre_es: 'Basílica de San Francisco', nombre_en: 'San Francisco Basilica', nombre_pt: 'Basílica de São Francisco',
    sub_es: 'Centro · Reliquia del Terremoto de 1861', sub_en: 'Downtown · Relic of the 1861 Earthquake', sub_pt: 'Centro · Relíquia do Terremoto de 1861',
    historia_es: 'El 20 de marzo de 1861, un terremoto destruyó casi por completo Mendoza en apenas 40 segundos. Dentro de la basílica actual se guarda el Estandarte de los Andes, la bandera que San Martín bendijo antes de cruzar la cordillera.',
    historia_en: 'On March 20, 1861, an earthquake nearly destroyed Mendoza in just 40 seconds. Inside the current basilica, the Andes Standard is kept, the flag General San Martín blessed before crossing the mountains.',
    historia_pt: 'Em 20 de março de 1861, um terremoto destruiu quase completamente Mendoza em apenas 40 segundos.',
    lat: -32.8895, lng: -68.8375
  },
  {
    tipo: 'monumento', icono: '🏛️',
    nombre_es: 'Teatro Independencia', nombre_en: 'Independencia Theatre', nombre_pt: 'Teatro Independência',
    sub_es: 'Centro · Principal teatro de la provincia', sub_en: 'Downtown · The province\'s main theatre', sub_pt: 'Centro · Principal teatro da província',
    historia_es: 'Escenario histórico de la Fiesta Nacional de la Vendimia y de la vida cultural mendocina desde el siglo XX. Su fachada de mármol travertino es un ícono del centro cívico de la ciudad.',
    historia_en: 'Historic stage of the National Grape Harvest Festival and Mendoza\'s cultural life since the 20th century.',
    historia_pt: 'Palco histórico da Festa Nacional da Vindima e da vida cultural mendocina.',
    lat: -32.8895, lng: -68.8455
  },
  {
    tipo: 'monumento', icono: '🏛️',
    nombre_es: 'Casa de Gobierno de Mendoza', nombre_en: 'Mendoza Government House', nombre_pt: 'Casa de Governo de Mendoza',
    sub_es: 'Centro Cívico', sub_en: 'Civic Center', sub_pt: 'Centro Cívico',
    historia_es: 'Sede del Poder Ejecutivo provincial, parte del conjunto arquitectónico del Centro Cívico construido tras la reconstrucción moderna de la ciudad.',
    historia_en: 'Seat of the provincial Executive Power, part of the Civic Center architectural complex.',
    historia_pt: 'Sede do Poder Executivo provincial.',
    lat: -32.8908, lng: -68.8490
  },
  {
    tipo: 'mirador', icono: '⛰️',
    nombre_es: 'Cerro de la Gloria', nombre_en: 'Cerro de la Gloria', nombre_pt: 'Cerro de la Gloria',
    sub_es: 'Parque General San Martín · Vista panorámica', sub_en: 'Parque San Martín · Panoramic view', sub_pt: 'Parque San Martín · Vista panorâmica',
    historia_es: 'En la cima está el Monumento al Ejército Libertador, homenaje a San Martín y su cruce de los Andes. Desde acá se ve toda la ciudad y, en días despejados, la Cordillera completa.',
    historia_en: 'At the top stands the Monument to the Liberating Army. From here you can see the whole city and, on clear days, the full mountain range.',
    historia_pt: 'No topo está o Monumento ao Exército Libertador.',
    lat: -32.8987, lng: -68.8663
  },
  {
    tipo: 'monumento', icono: '🌳',
    nombre_es: 'Portada del Parque General San Martín', nombre_en: 'Parque San Martín Gate', nombre_pt: 'Portão do Parque San Martín',
    sub_es: 'Entrada monumental de rejas y columnas', sub_en: 'Monumental gate of iron and columns', sub_pt: 'Entrada monumental de grades e colunas',
    historia_es: 'Diseñado por el arquitecto francés Carlos Thays, el parque tiene más de 400 hectáreas, un lago artificial, el Jardín Zoológico (Ecoparque) y el Estadio Malvinas Argentinas. La portada de rejas y columnas es una de las postales clásicas de Mendoza.',
    historia_en: 'Designed by French architect Carlos Thays, the park spans over 400 hectares, with an artificial lake, the Ecoparque zoo, and the Malvinas Argentinas Stadium.',
    historia_pt: 'Projetado pelo arquiteto francês Carlos Thays, o parque tem mais de 400 hectares.',
    lat: -32.8930, lng: -68.8640
  },
  {
    tipo: 'museo', icono: '🏛️',
    nombre_es: 'Museo Municipal de Arte Moderno', nombre_en: 'Municipal Museum of Modern Art', nombre_pt: 'Museu Municipal de Arte Moderna',
    sub_es: 'Bajo la Plaza Independencia', sub_en: 'Beneath Plaza Independencia', sub_pt: 'Sob a Praça Independência',
    historia_es: 'Funciona en un nivel subterráneo excavado bajo la plaza principal, una solución típica mendocina: después del terremoto de 1861, se aprendió a construir con espacios abiertos arriba para minimizar riesgos sísmicos.',
    historia_en: 'Operates on an underground level beneath the main square, built with open space above to minimize seismic risk after the 1861 earthquake.',
    historia_pt: 'Funciona em um nível subterrâneo escavado sob a praça principal.',
    lat: -32.8908, lng: -68.8455
  },

  /* ============ GODOY CRUZ - Ruta del Vino histórica ============ */
  {
    tipo: 'historia', icono: '🍷',
    nombre_es: 'Bodega Escorihuela Gascón (patrimonio histórico)', nombre_en: 'Escorihuela Gascón Winery (heritage site)', nombre_pt: 'Vinícola Escorihuela Gascón (patrimônio histórico)',
    sub_es: 'Godoy Cruz · Fundada en 1884', sub_en: 'Godoy Cruz · Founded 1884', sub_pt: 'Godoy Cruz · Fundada em 1884',
    historia_es: `Don Miguel Escorihuela llegó desde Aragón, España, a los 19 años, y en 1884 fundó lo que hoy es una de las bodegas más antiguas de Mendoza. Su edificio conserva una pared con material de construcción original de más de 140 años.

Godoy Cruz creció urbanísticamente alrededor de bodegas como esta, junto a Arizu y Tomba, formando un patrimonio industrial que hoy se puede recorrer a pie: el complejo de la ex-Bodega Arizu, por ejemplo, fue declarado Patrimonio Histórico Nacional y en 2025 fue elegida la mejor experiencia turística/cultural de Mendoza.`,
    historia_en: `Miguel Escorihuela arrived from Aragón, Spain, at age 19, and in 1884 founded what is now one of Mendoza's oldest wineries. Its building preserves a wall with original construction material over 140 years old.

Godoy Cruz grew urbanistically around wineries like this one, alongside Arizu and Tomba, forming an industrial heritage you can walk through today.`,
    historia_pt: `Miguel Escorihuela chegou da Aragão, Espanha, aos 19 anos, e em 1884 fundou o que hoje é uma das vinícolas mais antigas de Mendoza.`,
    lat: -32.9245, lng: -68.8280
  },
  {
    tipo: 'historia', icono: '🍷',
    nombre_es: 'Ex Bodega Arizu (Patrimonio Histórico Nacional)', nombre_en: 'Former Arizu Winery (National Historic Heritage)', nombre_pt: 'Ex Vinícola Arizu (Patrimônio Histórico Nacional)',
    sub_es: 'Godoy Cruz · Complejo arquitectónico patrimonial', sub_en: 'Godoy Cruz · Heritage architectural complex', sub_pt: 'Godoy Cruz · Complexo arquitetônico patrimonial',
    historia_es: 'Funcionó como bodega durante casi un siglo y hoy es un complejo arquitectónico declarado Patrimonio Histórico Nacional. Sus cavas son las más antiguas conservadas de Mendoza, y el predio incluye una Sala de Arte abierta al público.',
    historia_en: 'Operated as a winery for nearly a century and is now an architectural complex declared National Historic Heritage. Its cellars are the oldest preserved in Mendoza.',
    historia_pt: 'Funcionou como vinícola durante quase um século e hoje é um complexo arquitetônico declarado Patrimônio Histórico Nacional.',
    lat: -32.9260, lng: -68.8300
  },

  /* ============ MAIPÚ - Ruta del Vino (Museo del Vino, Giol, Trapiche, La Rural) ============ */
  {
    tipo: 'historia', icono: '🍷',
    nombre_es: 'Museo Nacional del Vino y la Vendimia (ex Bodega Giol)', nombre_en: 'National Museum of Wine and Harvest (former Giol Winery)', nombre_pt: 'Museu Nacional do Vinho e da Vindima (ex Vinícola Giol)',
    sub_es: 'Maipú · Casa Giol, patrimonio público y gratuito', sub_en: 'Maipú · Casa Giol, free public heritage', sub_pt: 'Maipú · Casa Giol, patrimônio público e gratuito',
    historia_es: `La antigua Bodega Giol fue en su momento una de las bodegas más grandes del mundo. Hoy su edificio histórico funciona como el Museo Nacional del Vino y la Vendimia, de acceso público, donde se recorre la evolución de la vitivinicultura mendocina desde las primeras prensas hasta la industria moderna.

Es un paseo ideal para hacer caminando o en bici si vivís cerca de Maipú: a diferencia de las bodegas privadas que cobran degustación, este museo es patrimonio público.`,
    historia_en: `The old Giol Winery was once one of the largest wineries in the world. Today its historic building houses the National Museum of Wine and Harvest, open to the public, tracing the evolution of Mendoza's winemaking from the first presses to the modern industry.`,
    historia_pt: `A antiga Vinícola Giol foi em seu momento uma das maiores vinícolas do mundo. Hoje seu edifício histórico funciona como o Museu Nacional do Vinho e da Vindima, de acesso público.`,
    lat: -32.9890, lng: -68.7930
  },
  {
    tipo: 'historia', icono: '🍷',
    nombre_es: 'Bodega Trapiche (edificio histórico, patrimonio)', nombre_en: 'Trapiche Winery (historic building, heritage)', nombre_pt: 'Vinícola Trapiche (edifício histórico, patrimônio)',
    sub_es: 'Maipú · Fundada en 1883', sub_en: 'Maipú · Founded 1883', sub_pt: 'Maipú · Fundada em 1883',
    historia_es: 'Una de las casas históricas más grandes de Mendoza, con más de 140 años. Su edificio histórico combina arquitectura de época con la escala industrial que definió a la Ruta del Vino de Maipú desde fines del siglo XIX.',
    historia_en: 'One of the largest historic wine houses in Mendoza, over 140 years old. Its historic building combines period architecture with the industrial scale that defined the Maipú Wine Route.',
    historia_pt: 'Uma das casas históricas mais grandes de Mendoza, com mais de 140 anos.',
    lat: -32.9970, lng: -68.7860
  },
  {
    tipo: 'historia', icono: '🍷',
    nombre_es: 'Bodega La Rural — Galería Patrimonial del Vino', nombre_en: 'Bodega La Rural — Wine Heritage Gallery', nombre_pt: 'Vinícola La Rural — Galeria Patrimonial do Vinho',
    sub_es: 'Maipú · Fundada en 1885', sub_en: 'Maipú · Founded 1885', sub_pt: 'Maipú · Fundada em 1885',
    historia_es: `Fundada en 1885 por el inmigrante italiano Felipe Rutini, La Rural es testigo directo del nacimiento de la vitivinicultura argentina. Su Bodega Histórica tiene una galería patrimonial autoguiada con piezas de la industria del vino que se remontan al siglo XVI.

El edificio combina tradición, territorio y una de las colecciones de herramientas vitivinícolas antiguas más completas de la provincia.`,
    historia_en: `Founded in 1885 by Italian immigrant Felipe Rutini, La Rural is a direct witness to the birth of Argentine winemaking. Its Historic Winery has a self-guided heritage gallery with wine industry pieces dating back to the 16th century.`,
    historia_pt: `Fundada em 1885 pelo imigrante italiano Felipe Rutini, La Rural é testemunha direta do nascimento da vitivinicultura argentina.`,
    lat: -32.9945, lng: -68.7810
  },

  /* ============ LUJÁN DE CUYO ============ */
  {
    tipo: 'plaza', icono: '🌳',
    nombre_es: 'Plaza Departamental de Luján de Cuyo', nombre_en: 'Luján de Cuyo Main Square', nombre_pt: 'Praça Departamental de Luján de Cuyo',
    sub_es: 'Centro de Luján · Punto de partida de la Ruta del Vino de altura', sub_en: 'Luján center · Starting point of the high-altitude wine route', sub_pt: 'Centro de Luján · Ponto de partida da Rota do Vinho de altitude',
    historia_es: 'Luján de Cuyo es la "Primera Capital Nacional del Malbec", con viñedos que superan los 1.000 metros de altura. La plaza departamental es el punto de referencia clásico para arrancar cualquier recorrido por la zona de bodegas de altura.',
    historia_en: 'Luján de Cuyo is the "First National Capital of Malbec," with vineyards above 1,000 meters. The departmental square is the classic starting point for touring the high-altitude winery area.',
    historia_pt: 'Luján de Cuyo é a "Primeira Capital Nacional do Malbec".',
    lat: -33.0331, lng: -68.8800
  },
  {
    tipo: 'mirador', icono: '⛰️',
    nombre_es: 'Cacheuta (aguas termales)', nombre_en: 'Cacheuta (hot springs)', nombre_pt: 'Cacheuta (águas termais)',
    sub_es: 'Luján de Cuyo · Camino a la cordillera', sub_en: 'Luján de Cuyo · Road to the mountains', sub_pt: 'Luján de Cuyo · Caminho para a cordilheira',
    historia_es: 'Un pueblo pequeño junto al río Mendoza, conocido desde fines del siglo XIX por sus aguas termales naturales, en la ruta que sube hacia la alta montaña.',
    historia_en: 'A small town by the Mendoza river, known since the late 19th century for its natural hot springs, on the road up to the high mountains.',
    historia_pt: 'Um pequeno povoado junto ao rio Mendoza, conhecido desde o final do século XIX por suas águas termais naturais.',
    lat: -33.0167, lng: -69.1167
  },

  /* ============ GUAYMALLÉN ============ */
  {
    tipo: 'plaza', icono: '🌳',
    nombre_es: 'Plaza Departamental de Guaymallén', nombre_en: 'Guaymallén Main Square', nombre_pt: 'Praça Departamental de Guaymallén',
    sub_es: 'Centro de Guaymallén', sub_en: 'Guaymallén center', sub_pt: 'Centro de Guaymallén',
    historia_es: 'Guaymallén es el departamento más poblado del Gran Mendoza, con fuerte tradición de mercados y ferias de productores locales, además de bodegas históricas en la zona de Coquimbito.',
    historia_en: 'Guaymallén is the most populated department of Greater Mendoza, with a strong tradition of local producer markets, plus historic wineries in the Coquimbito area.',
    historia_pt: 'Guaymallén é o departamento mais populoso do Grande Mendoza.',
    lat: -32.8983, lng: -68.8150
  },

  /* ============ LAS HERAS ============ */
  {
    tipo: 'mirador', icono: '⛰️',
    nombre_es: 'Parque Provincial Aconcagua (portada / acceso)', nombre_en: 'Aconcagua Provincial Park (gateway)', nombre_pt: 'Parque Provincial Aconcagua (portão de acesso)',
    sub_es: 'Las Heras · Camino a Chile', sub_en: 'Las Heras · Road to Chile', sub_pt: 'Las Heras · Caminho para o Chile',
    historia_es: 'El acceso al parque que resguarda al Aconcagua, el pico más alto de América (6.960 m). Se puede llegar en auto desde Mendoza capital en poco más de 2 horas por la Ruta 7, la misma que usó San Martín para cruzar a Chile en 1817.',
    historia_en: 'The gateway to the park protecting Aconcagua, the highest peak in the Americas (6,960 m / 22,834 ft). Reachable by car from Mendoza city in just over 2 hours via Route 7.',
    historia_pt: 'O acesso ao parque que resguarda o Aconcágua, o pico mais alto da América (6.960 m).',
    lat: -32.8500, lng: -69.9333
  },
  {
    tipo: 'historia', icono: '🗿',
    nombre_es: 'Puente del Inca', nombre_en: 'Puente del Inca', nombre_pt: 'Puente del Inca',
    sub_es: 'Las Heras · Formación natural + ruinas termales', sub_en: 'Las Heras · Natural formation + spa ruins', sub_pt: 'Las Heras · Formação natural + ruínas termais',
    historia_es: 'Un puente de piedra natural formado por sedimentos de aguas termales, con las ruinas de un antiguo balneario de principios del siglo XX a sus pies. Un ícono geológico camino a Chile, a unos 180 km de la ciudad de Mendoza.',
    historia_en: 'A natural stone bridge formed by hot spring sediments, with the ruins of an early 20th-century spa resort at its base. A geological icon on the road to Chile, about 180 km from Mendoza city.',
    historia_pt: 'Uma ponte de pedra natural formada por sedimentos de águas termais.',
    lat: -32.8283, lng: -69.9169
  },

  /* ============ MAIPÚ - más allá del vino ============ */
  {
    tipo: 'plaza', icono: '🌳',
    nombre_es: 'Plaza Departamental de Maipú', nombre_en: 'Maipú Main Square', nombre_pt: 'Praça Departamental de Maipú',
    sub_es: 'Centro de Maipú · Corazón de la Ruta del Vino', sub_en: 'Maipú center · Heart of the Wine Route', sub_pt: 'Centro de Maipú · Coração da Rota do Vinho',
    historia_es: 'Maipú es cuna de la industria vitivinícola mendocina moderna: en sus calles se concentran más bodegas históricas por metro cuadrado que en cualquier otro departamento, muchas de ellas recorribles en bicicleta.',
    historia_en: 'Maipú is the birthplace of Mendoza\'s modern wine industry: its streets concentrate more historic wineries per square meter than any other department, many bike-friendly.',
    historia_pt: 'Maipú é berço da indústria vitivinícola mendocina moderna.',
    lat: -32.9833, lng: -68.7833
  }
];

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  console.log(`Insertando ${pois.length} nuevos puntos de interés...`);

  for (const p of pois) {
    await connection.query(
      `INSERT INTO pois (tipo, icono, nombre_es, nombre_en, nombre_pt, sub_es, sub_en, sub_pt, historia_es, historia_en, historia_pt, lat, lng)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.tipo, p.icono, p.nombre_es, p.nombre_en, p.nombre_pt, p.sub_es, p.sub_en, p.sub_pt, p.historia_es, p.historia_en, p.historia_pt, p.lat, p.lng]
    );
    console.log(`   + ${p.nombre_es}`);
  }

  await connection.end();
  console.log(`✅ Listo. Se agregaron ${pois.length} POIs nuevos.`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
