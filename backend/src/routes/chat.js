const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

/**
 * POST /api/chat
 * body: { mensaje, lat, lng, idioma, session_id }
 *
 * Le pasamos a la IA los comercios y POIs reales cercanos (de la base de datos)
 * para que responda con datos concretos de Mendozapp, no información inventada.
 */
router.post('/', async (req, res) => {
  const { mensaje, lat, lng, idioma, session_id } = req.body;
  if (!mensaje) {
    return res.status(400).json({ error: 'Falta el mensaje.' });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'Falta configurar OPENAI_API_KEY en el servidor.' });
  }

  try {
    // Traemos comercios activos y POIs para dar contexto real a la IA
    const [comercios] = await pool.query(
      `SELECT nombre, tipo, direccion, lat, lng, telefono, whatsapp, horario_texto
       FROM comercios WHERE estado = 'activo' LIMIT 60`
    );
    const [pois] = await pool.query(
      `SELECT nombre_es, tipo, lat, lng FROM pois WHERE activo = TRUE LIMIT 60`
    );

    const idiomaTexto = idioma === 'en' ? 'English' : idioma === 'pt' ? 'português' : 'español';

    const systemPrompt = `Sos el asistente de Mendozapp, una guía turística de Mendoza, Argentina.
Respondé SIEMPRE en ${idiomaTexto}, de forma breve, cálida y útil (máximo 5-7 líneas).

Tenés DOS tipos de conocimiento, no los mezcles ni te limites solo al primero:

1) DATOS PROPIOS DE MENDOZAPP (comercios adheridos y lugares públicos cargados en la app).
   Cuando recomiendes UN NEGOCIO específico (bodega, restaurante, hotel) para que el usuario reserve
   o visite, usá ÚNICAMENTE estos datos reales, nunca inventes un comercio que no esté en esta lista:

   COMERCIOS Y BODEGAS ADHERIDOS:
   ${JSON.stringify(comercios)}

   LUGARES PÚBLICOS CARGADOS (monumentos, plazas, historia):
   ${JSON.stringify(pois)}

2) TU CONOCIMIENTO GENERAL DE MENDOZA como asistente de viaje (geografía, calles, direcciones,
   distancias, rutas de trekking, cerros, valles, clima, transporte público, costumbres locales).
   Usalo libremente para responder preguntas generales aunque el lugar no esté en la lista de arriba:
   "¿dónde queda tal calle/plaza/museo?", "¿cómo llego caminando desde el centro a tal lugar?",
   "¿qué trekkings hay cerca?", "¿cuánto se tarda a tal distrito?". No respondas "no tengo información"
   para este tipo de preguntas generales: contestá con tu conocimiento real de la ciudad y la provincia.

Si te preguntan por taxis o cómo moverse, sugerí apps como Cabify o Uber (si operan en Mendoza) o remises locales, y mencioná que en la app hay un botón de "Cómo llegar" en cada lugar.
Reservá el "no tengo información suficiente" solo para cuando de verdad no sepas algo (ej: horario exacto no publicado de un lugar), nunca como respuesta genérica.
La ubicación actual del usuario es lat=${lat}, lng=${lng} (si está disponible).`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
        max_tokens: 1500,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: mensaje }
        ]
      })
    });

    const data = await response.json();
    if (data.error) {
      console.error('Error de OpenAI:', data.error);
      return res.status(500).json({ error: data.error.message || 'Error al consultar OpenAI.' });
    }
    const respuesta = data.choices?.[0]?.message?.content || 'No pude generar una respuesta. Probá de nuevo.';

    // Guardamos el log (opcional, útil para mejorar el asistente con el tiempo)
    pool.query(
      `INSERT INTO chat_log (session_id, pregunta, respuesta, lat, lng) VALUES (?, ?, ?, ?, ?)`,
      [session_id || null, mensaje, respuesta, lat || null, lng || null]
    ).catch(err => console.error('No se pudo guardar el chat_log:', err.message));

    res.json({ respuesta });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar el asistente.' });
  }
});

module.exports = router;
