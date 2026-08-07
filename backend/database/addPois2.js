/**
 * addPois2.js
 * Segunda tanda de POIs públicos y gratuitos: grandes íconos turísticos de la
 * provincia (Manzano Histórico, Potrerillos, Caverna de las Brujas, Villavicencio,
 * Cristo Redentor, Laguna del Diamante) + plazas y puntos de varios departamentos
 * que todavía no tenían nada cargado (San Rafael, Tunuyán, Tupungato, San Carlos,
 * Malargüe, Uspallata, General Alvear, Rivadavia, Junín).
 *
 * IMPORTANTE sobre precisión: los primeros 6 lugares (marcados VERIFICADO) salen
 * de búsquedas puntuales con coordenadas reales confirmadas. El resto son
 * coordenadas aproximadas de buena fe (centro de la localidad/plaza departamental).
 * Si notás que algún pin no cae exacto, podés corregirlo en 10 segundos desde el
 * panel de admin: Editar el lugar → pegar el link real de Google Maps → "Usar link".
 *
 * Uso: node database/addPois2.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

function mapsLink(lat, lng) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

const pois = [
  /* ============ VERIFICADO por búsqueda ============ */
  {
    tipo: 'historia', icono: '🍎',
    nombre_es: 'El Manzano Histórico', nombre_en: 'El Manzano Histórico', nombre_pt: 'El Manzano Histórico',
    sub_es: 'Tunuyán · Reserva Cultural y Paisajística', sub_en: 'Tunuyán · Cultural & Landscape Reserve', sub_pt: 'Tunuyán · Reserva Cultural e Paisagística',
    historia_es: 'Acá, en enero de 1823, el General San Martín hizo un alto bajo la sombra de un manzano centenario al regresar de su campaña libertadora, conversando con el coronel Olazábal sobre las gestas que habían protagonizado juntos. El lugar fue declarado reserva natural en 1994, y desde 2012 se amplió como "Manzano-Portillo de Piuquenes". Por acá también pasó Charles Darwin años después, atraído por sus glaciares y ríos.',
    historia_en: 'Here, in January 1823, General San Martín stopped under the shade of a century-old apple tree on his way back from his liberating campaign, talking with colonel Olazábal about the battles they had fought together. The site was declared a nature reserve in 1994. Charles Darwin also passed through here years later, drawn by its glaciers and rivers.',
    historia_pt: 'Aqui, em janeiro de 1823, o General San Martín parou sob a sombra de uma macieira centenária ao retornar de sua campanha libertadora.',
    lat: -33.6022298, lng: -69.3831155
  },
  {
    tipo: 'mirador', icono: '🏞️',
    nombre_es: 'Dique Potrerillos', nombre_en: 'Potrerillos Dam', nombre_pt: 'Represa de Potrerillos',
    sub_es: 'Luján de Cuyo · Deportes náuticos y paisaje de montaña', sub_en: 'Luján de Cuyo · Water sports and mountain scenery', sub_pt: 'Luján de Cuyo · Esportes náuticos e paisagem de montanha',
    historia_es: 'A solo 69 km de la ciudad, este embalse de 1.500 hectáreas sobre el Río Mendoza es el gran espejo de agua de la cordillera: se puede hacer windsurf, kitesurf, kayak y paddle surf con las montañas de fondo. La presa se terminó de construir en 2001 y hoy también genera energía hidroeléctrica para toda la provincia.',
    historia_en: 'Just 69 km from the city, this 1,500-hectare reservoir on the Mendoza River is the great mountain lake of the Andes: windsurfing, kitesurfing, kayaking and paddle surfing, all with mountains as a backdrop. The dam was completed in 2001 and also generates hydroelectric power for the whole province.',
    historia_pt: 'A apenas 69 km da cidade, este reservatório de 1.500 hectares sobre o Rio Mendoza é o grande espelho d\'água da cordilheira.',
    lat: -32.99433, lng: -69.14445
  },
  {
    tipo: 'historia', icono: '🦇',
    nombre_es: 'Caverna de las Brujas', nombre_en: 'Witches\' Cave', nombre_pt: 'Caverna das Bruxas',
    sub_es: 'Malargüe · Monumento natural, visita guiada', sub_en: 'Malargüe · Natural monument, guided visit', sub_pt: 'Malargüe · Monumento natural, visita guiada',
    historia_es: 'A 1.830 metros de altura en el cerro Moncol, esta caverna de roca caliza esconde salas con nombres como "La Virgen" y "Los Encuentros", llenas de estalactitas y estalagmitas formadas durante millones de años. La leyenda cuenta que los pobladores veían salir mujeres de aspecto extraño al atardecer, y así nació su nombre. Solo se puede visitar con guía y equipo, recorriendo los primeros 200 metros de galerías.',
    historia_en: 'At 1,830 meters on Moncol hill, this limestone cave hides chambers named "La Virgen" and "Los Encuentros," full of stalactites and stalagmites formed over millions of years. Legend says locals saw strange-looking women leaving the cave at dusk, giving it its name. Visits are guided only, covering the first 200 meters of galleries.',
    historia_pt: 'A 1.830 metros de altura no cerro Moncol, esta caverna de rocha calcária esconde salas cheias de estalactites e estalagmites.',
    lat: -35.8019, lng: -69.8189
  },
  {
    tipo: 'historia', icono: '🏨',
    nombre_es: 'Hotel Villavicencio', nombre_en: 'Villavicencio Hotel', nombre_pt: 'Hotel Villavicencio',
    sub_es: 'Las Heras · Monumento Histórico Nacional', sub_en: 'Las Heras · National Historic Monument', sub_pt: 'Las Heras · Monumento Histórico Nacional',
    historia_es: 'Inaugurado en 1940 junto a las termas del mismo nombre, este hotel de estilo normando llegó a ser uno de los grandes destinos de montaña de Sudamérica, con 30 habitaciones, pileta y cancha de tenis. Cerró en 1979 y hoy es el corazón de la Reserva Natural Villavicencio: no funciona como hotel, pero se puede visitar su arquitectura y jardines, y su imagen es la que aparece en las etiquetas del agua mineral del mismo nombre.',
    historia_en: 'Opened in 1940 next to the hot springs of the same name, this Norman-style hotel became one of South America\'s great mountain destinations, with 30 rooms, a pool and a tennis court. It closed in 1979 and is now the heart of the Villavicencio Nature Reserve — no longer a working hotel, but its architecture and gardens can be visited, and its image appears on the bottled water label bearing its name.',
    historia_pt: 'Inaugurado em 1940 junto às termas de mesmo nome, este hotel de estilo normando chegou a ser um dos grandes destinos de montanha da América do Sul.',
    lat: -32.5267, lng: -69.0181
  },
  {
    tipo: 'monumento', icono: '✝️',
    nombre_es: 'Cristo Redentor de los Andes', nombre_en: 'Christ the Redeemer of the Andes', nombre_pt: 'Cristo Redentor dos Andes',
    sub_es: 'Las Heras · Límite con Chile, 3.832 msnm', sub_en: 'Las Heras · Border with Chile, 3,832 m', sub_pt: 'Las Heras · Fronteira com o Chile, 3.832 m',
    historia_es: 'Inaugurado en 1904 en el Paso de la Cumbre, justo en la frontera entre Argentina y Chile, este monumento de bronce fundido con cañones de guerra simboliza la paz entre ambos países tras un conflicto limítrofe que casi termina en guerra. La frase grabada en su base dice: "Se desplomarán primero estas montañas antes que argentinos y chilenos rompan la paz jurada a los pies del Cristo Redentor".',
    historia_en: 'Unveiled in 1904 at Paso de la Cumbre, right on the border between Argentina and Chile, this bronze monument (cast from war cannons) symbolizes peace between the two countries after a border dispute that nearly led to war. The inscription on its base reads: "These mountains will crumble before Argentines and Chileans break the peace sworn at the feet of the Redeeming Christ."',
    historia_pt: 'Inaugurado em 1904 no Paso de la Cumbre, bem na fronteira entre Argentina e Chile, este monumento de bronze simboliza a paz entre os dois países.',
    lat: -32.825260, lng: -70.070820
  },
  {
    tipo: 'mirador', icono: '💎',
    nombre_es: 'Laguna del Diamante', nombre_en: 'Diamante Lagoon', nombre_pt: 'Lagoa Diamante',
    sub_es: 'San Carlos · Reserva natural a 3.250 msnm', sub_en: 'San Carlos · Nature reserve at 3,250 m', sub_pt: 'San Carlos · Reserva natural a 3.250 m',
    historia_es: 'A los pies del volcán Maipo (5.323 m), esta laguna ocupa el cráter de un volcán extinto y es una de las reservas de agua dulce más importantes de la provincia. Rodeada de vegas altoandinas donde se ven manadas de guanacos, requiere reserva previa online para visitar y el camino final son 43 km de ripio desde Pareditas.',
    historia_en: 'At the foot of Maipo volcano (5,323 m), this lagoon sits in the crater of an extinct volcano and is one of the province\'s most important freshwater reserves. Surrounded by high-Andean wetlands where guanaco herds roam, it requires advance online booking and a final 43 km dirt road from Pareditas.',
    historia_pt: 'Aos pés do vulcão Maipo (5.323 m), esta lagoa ocupa a cratera de um vulcão extinto.',
    lat: -34.150, lng: -69.683
  },

  /* ============ Aproximado (centro de localidad/plaza) ============ */
  {
    tipo: 'plaza', icono: '🌳',
    nombre_es: 'Plaza San Martín (San Rafael)', nombre_en: 'San Martín Square (San Rafael)', nombre_pt: 'Praça San Martín (San Rafael)',
    sub_es: 'San Rafael · Corazón de la ciudad', sub_en: 'San Rafael · Heart of the city', sub_pt: 'San Rafael · Coração da cidade',
    historia_es: 'San Rafael es la segunda ciudad más importante de Mendoza y la puerta de entrada al Cañón del Atuel, El Nihuil y Valle Grande. Su plaza central es el punto de partida clásico para explorar bodegas, ríos y montañas del sur mendocino.',
    historia_en: 'San Rafael is Mendoza\'s second most important city and the gateway to Cañón del Atuel, El Nihuil, and Valle Grande. Its central square is the classic starting point for exploring wineries, rivers, and mountains in southern Mendoza.',
    historia_pt: 'San Rafael é a segunda cidade mais importante de Mendoza e a porta de entrada para o Cañón del Atuel.',
    lat: -34.6177, lng: -68.3301
  },
  {
    tipo: 'mirador', icono: '🏜️',
    nombre_es: 'Cañón del Atuel', nombre_en: 'Atuel Canyon', nombre_pt: 'Cânion do Atuel',
    sub_es: 'San Rafael · 40 km de paredones multicolores', sub_en: 'San Rafael · 40 km of multicolored canyon walls', sub_pt: 'San Rafael · 40 km de paredões multicoloridos',
    historia_es: 'Un cañón de 260 metros de profundidad tallado por el Río Atuel entre El Nihuil y Valle Grande, con formaciones rocosas de colores que cambian con la luz del día. Es el epicentro del turismo aventura del sur mendocino: rafting, kayak y trekking en un paisaje que pasa de desértico a verde en pocos kilómetros.',
    historia_en: 'A 260-meter-deep canyon carved by the Atuel River between El Nihuil and Valle Grande, with rock formations that change color throughout the day. It\'s the epicenter of adventure tourism in southern Mendoza: rafting, kayaking, and trekking through scenery that shifts from desert to green in just a few kilometers.',
    historia_pt: 'Um cânion de 260 metros de profundidade esculpido pelo Rio Atuel entre El Nihuil e Valle Grande.',
    lat: -34.9833, lng: -68.7500
  },
  {
    tipo: 'plaza', icono: '🌳',
    nombre_es: 'Plaza departamental de Tunuyán', nombre_en: 'Tunuyán Main Square', nombre_pt: 'Praça Departamental de Tunuyán',
    sub_es: 'Tunuyán · Valle de Uco', sub_en: 'Tunuyán · Uco Valley', sub_pt: 'Tunuyán · Valle de Uco',
    historia_es: 'Corazón del Valle de Uco, la zona vitivinícola de mayor altura de Mendoza (hasta 1.700 msnm), con algunas de las bodegas boutique más premiadas del país y vista directa a la Cordillera.',
    historia_en: 'Heart of the Uco Valley, Mendoza\'s highest-altitude wine region (up to 1,700 m), home to some of the country\'s most awarded boutique wineries with direct views of the Andes.',
    historia_pt: 'Coração do Valle de Uco, a região vitivinícola de maior altitude de Mendoza.',
    lat: -33.5808, lng: -69.0181
  },
  {
    tipo: 'plaza', icono: '🌳',
    nombre_es: 'Plaza departamental de Tupungato', nombre_en: 'Tupungato Main Square', nombre_pt: 'Praça Departamental de Tupungato',
    sub_es: 'Tupungato · A los pies del volcán homónimo', sub_en: 'Tupungato · At the foot of the volcano of the same name', sub_pt: 'Tupungato · Aos pés do vulcão homônimo',
    historia_es: 'Domina el paisaje el volcán Tupungato (6.570 m), uno de los picos más altos de América. La zona es reconocida internacionalmente por sus vinos de altura y sus paisajes de viñedos con la cordillera nevada de fondo.',
    historia_en: 'The Tupungato volcano (6,570 m), one of the highest peaks in the Americas, dominates the landscape. The area is internationally recognized for its high-altitude wines and vineyard views with the snow-capped Andes as a backdrop.',
    historia_pt: 'Domina a paisagem o vulcão Tupungato (6.570 m), um dos picos mais altos da América.',
    lat: -33.3833, lng: -69.1500
  },
  {
    tipo: 'plaza', icono: '🌳',
    nombre_es: 'Plaza departamental de San Carlos', nombre_en: 'San Carlos Main Square', nombre_pt: 'Praça Departamental de San Carlos',
    sub_es: 'San Carlos · Valle de Uco', sub_en: 'San Carlos · Uco Valley', sub_pt: 'San Carlos · Valle de Uco',
    historia_es: 'Uno de los tres departamentos que forman el Valle de Uco, con distritos como Eugenio Bustos y La Consulta rodeados de viñedos, y punto de partida hacia la Laguna del Diamante.',
    historia_en: 'One of the three departments that make up the Uco Valley, with districts like Eugenio Bustos and La Consulta surrounded by vineyards, and the starting point toward Laguna del Diamante.',
    historia_pt: 'Um dos três departamentos que formam o Valle de Uco.',
    lat: -33.7728, lng: -69.0433
  },
  {
    tipo: 'plaza', icono: '🌳',
    nombre_es: 'Plaza de Uspallata', nombre_en: 'Uspallata Square', nombre_pt: 'Praça de Uspallata',
    sub_es: 'Las Heras · Camino a la alta montaña', sub_en: 'Las Heras · Road to the high mountains', sub_pt: 'Las Heras · Caminho para a alta montanha',
    historia_es: 'Pueblo de paso obligado camino a Chile y al Cristo Redentor, en un valle amplio entre montañas que fue escenario de varias películas internacionales por su parecido con paisajes del Himalaya y el oeste de Estados Unidos.',
    historia_en: 'A must-stop town on the way to Chile and Cristo Redentor, set in a wide valley between mountains that has served as the backdrop for several international films due to its resemblance to landscapes in the Himalayas and the American West.',
    historia_pt: 'Povoado de passagem obrigatória a caminho do Chile e do Cristo Redentor.',
    lat: -32.5947, lng: -69.3419
  },
  {
    tipo: 'mirador', icono: '⛰️',
    nombre_es: 'Cerro Arco', nombre_en: 'Cerro Arco', nombre_pt: 'Cerro Arco',
    sub_es: 'Las Heras · Mountain bike y trekking', sub_en: 'Las Heras · Mountain biking and trekking', sub_pt: 'Las Heras · Mountain bike e trekking',
    historia_es: 'Uno de los cerros más populares para hacer trekking y descenso en mountain bike cerca de la ciudad, con senderos de distinta dificultad y una vista panorámica de todo el Gran Mendoza desde la cima.',
    historia_en: 'One of the most popular hills for trekking and downhill mountain biking near the city, with trails of varying difficulty and a panoramic view of all of Greater Mendoza from the summit.',
    historia_pt: 'Um dos morros mais populares para fazer trekking e descida de mountain bike perto da cidade.',
    lat: -32.8500, lng: -68.7833
  },
  {
    tipo: 'mirador', icono: '🕳️',
    nombre_es: 'Pozo de las Ánimas', nombre_en: 'Pozo de las Ánimas', nombre_pt: 'Pozo de las Ánimas',
    sub_es: 'Malargüe · Dolinas naturales gigantes', sub_en: 'Malargüe · Giant natural sinkholes', sub_pt: 'Malargüe · Dolinas naturais gigantes',
    historia_es: 'Dos enormes dolinas (pozos naturales) formadas por el colapso de cavernas subterráneas, con pequeñas lagunas en el fondo. La leyenda local dice que en las noches de luna llena se escuchan lamentos de ánimas en pena, de ahí su nombre.',
    historia_en: 'Two enormous sinkholes formed by the collapse of underground caverns, with small lagoons at the bottom. Local legend says that on full moon nights you can hear the wailing of souls in torment, hence the name.',
    historia_pt: 'Duas enormes dolinas formadas pelo colapso de cavernas subterrâneas, com pequenas lagoas no fundo.',
    lat: -35.6333, lng: -69.9833
  },
  {
    tipo: 'mirador', icono: '🏞️',
    nombre_es: 'Los Reyunos / Valle Grande', nombre_en: 'Los Reyunos / Valle Grande', nombre_pt: 'Los Reyunos / Valle Grande',
    sub_es: 'San Rafael · Embalse y deportes acuáticos', sub_en: 'San Rafael · Reservoir and water sports', sub_pt: 'San Rafael · Represa e esportes aquáticos',
    historia_es: 'Embalse artificial rodeado de serranías rojizas, muy popular para windsurf, kayak y pesca deportiva, con complejos turísticos y una vista que muchos comparan con paisajes patagónicos en miniatura.',
    historia_en: 'An artificial reservoir surrounded by reddish hills, very popular for windsurfing, kayaking, and sport fishing, with tourist resorts and views many compare to a miniature Patagonia.',
    historia_pt: 'Represa artificial rodeada de serras avermelhadas, muito popular para windsurf, caiaque e pesca esportiva.',
    lat: -34.7000, lng: -68.6333
  },
  {
    tipo: 'mirador', icono: '🎣',
    nombre_es: 'El Nihuil', nombre_en: 'El Nihuil', nombre_pt: 'El Nihuil',
    sub_es: 'San Rafael · Embalse y club de pescadores', sub_en: 'San Rafael · Reservoir and fishing club', sub_pt: 'San Rafael · Represa e clube de pescadores',
    historia_es: 'Punto de inicio del recorrido por el Cañón del Atuel, con un embalse ideal para windsurf y pesca, y un mirador panorámico sobre el cañón que es parada obligada del circuito.',
    historia_en: 'Starting point for the Atuel Canyon route, with a reservoir ideal for windsurfing and fishing, and a panoramic viewpoint over the canyon that\'s a must-stop on the circuit.',
    historia_pt: 'Ponto de partida do percurso pelo Cânion do Atuel, com uma represa ideal para windsurf e pesca.',
    lat: -35.0333, lng: -68.7333
  },
  {
    tipo: 'plaza', icono: '🌳',
    nombre_es: 'Plaza departamental de Malargüe', nombre_en: 'Malargüe Main Square', nombre_pt: 'Praça Departamental de Malargüe',
    sub_es: 'Malargüe · Puerta al sur profundo de Mendoza', sub_en: 'Malargüe · Gateway to Mendoza\'s deep south', sub_pt: 'Malargüe · Portão para o sul profundo de Mendoza',
    historia_es: 'Base para excursiones a la Caverna de las Brujas, Pozo de las Ánimas, Payunia y el volcán Malargüe. Cada año recibe la Fiesta Nacional del Chivo, celebrando la tradición ganadera caprina de la región.',
    historia_en: 'Base for excursions to the Witches\' Cave, Pozo de las Ánimas, Payunia, and Malargüe volcano. Every year it hosts the National Goat Festival, celebrating the region\'s goat-farming tradition.',
    historia_pt: 'Base para excursões à Caverna das Bruxas, Pozo de las Ánimas, Payunia e o vulcão Malargüe.',
    lat: -35.4750, lng: -69.5850
  },
  {
    tipo: 'plaza', icono: '🌳',
    nombre_es: 'Plaza departamental de General Alvear', nombre_en: 'General Alvear Main Square', nombre_pt: 'Praça Departamental de General Alvear',
    sub_es: 'General Alvear · Sur mendocino', sub_en: 'General Alvear · Southern Mendoza', sub_pt: 'General Alvear · Sul de Mendoza',
    historia_es: 'Departamento agrícola conocido por sus frutales y viñedos de zona sur, con una identidad propia dentro de la provincia por su cercanía a La Pampa.',
    historia_en: 'An agricultural department known for its orchards and southern-zone vineyards, with its own identity within the province due to its proximity to La Pampa.',
    historia_pt: 'Departamento agrícola conhecido por seus pomares e vinhedos da zona sul.',
    lat: -34.9667, lng: -67.6667
  },
  {
    tipo: 'plaza', icono: '🌳',
    nombre_es: 'Plaza departamental de Rivadavia', nombre_en: 'Rivadavia Main Square', nombre_pt: 'Praça Departamental de Rivadavia',
    sub_es: 'Rivadavia · Zona Este', sub_en: 'Rivadavia · Eastern Zone', sub_pt: 'Rivadavia · Zona Leste',
    historia_es: 'Uno de los departamentos históricos de la Zona Este, con fuerte tradición vitivinícola y frutícola, y arquitectura de principios del siglo XX en su centro.',
    historia_en: 'One of the historic departments of the Eastern Zone, with a strong wine and fruit-growing tradition, and early 20th-century architecture in its center.',
    historia_pt: 'Um dos departamentos históricos da Zona Leste, com forte tradição vitivinícola e frutícola.',
    lat: -33.1833, lng: -68.4667
  },
  {
    tipo: 'plaza', icono: '🚣',
    nombre_es: 'Club Regatas Mendoza (Dique Cipolletti)', nombre_en: 'Club Regatas Mendoza (Cipolletti Dam)', nombre_pt: 'Club Regatas Mendoza (Represa Cipolletti)',
    sub_es: 'Guaymallén/Maipú · Remo y náutica', sub_en: 'Guaymallén/Maipú · Rowing and boating', sub_pt: 'Guaymallén/Maipú · Remo e náutica',
    historia_es: 'Uno de los clubes náuticos más tradicionales de Mendoza, con actividad de remo sobre las aguas del Dique Cipolletti. Cuna de varias generaciones de remeros mendocinos que compitieron a nivel nacional.',
    historia_en: 'One of Mendoza\'s most traditional boating clubs, with rowing activity on the waters of Cipolletti Dam. It has been home to several generations of Mendoza rowers who competed nationally.',
    historia_pt: 'Um dos clubes náuticos mais tradicionais de Mendoza, com atividade de remo nas águas da Represa Cipolletti.',
    lat: -32.9000, lng: -68.8167
  }
];

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  console.log(`Insertando ${pois.length} nuevos puntos de interés (tanda 2)...`);

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
  console.log(`✅ Listo. Se agregaron ${pois.length} POIs nuevos.`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
