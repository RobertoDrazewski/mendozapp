/**
 * translateService.js
 * Traduce la descripción de un comercio del español al inglés y portugués usando
 * la misma API de OpenAI que ya usa el chat.
 *
 * Por qué existe: la tabla comercios tiene descripcion_es / _en / _pt, pero el
 * comerciante solo carga el español desde su panel. Sin esto, un turista con la
 * app en inglés o portugués veía la ficha vacía — pagaba la suscripción y su
 * negocio se mostraba sin descripción a buena parte de los visitantes.
 *
 * Es best-effort: si OpenAI falla o no está configurada, devolvemos null y el
 * guardado del comercio sigue adelante igual. Nunca queremos que una falla de
 * traducción impida que el comerciante guarde sus datos.
 */

async function traducirDescripcion(textoEs) {
  if (!textoEs || !textoEs.trim()) return null;
  if (!process.env.OPENAI_API_KEY) {
    console.warn('[translate] Falta OPENAI_API_KEY, no se traduce.');
    return null;
  }

  const systemPrompt = `Sos un traductor profesional especializado en turismo.
Te paso la descripción de un comercio turístico de Mendoza, Argentina, escrita en español.
Traducila al inglés y al portugués de Brasil.

Reglas:
- Mantené el tono y la extensión del original.
- NO traduzcas nombres propios (nombres de bodegas, marcas, calles, varietales como Malbec o Torrontés).
- Si el original tiene errores de tipeo, corregilos en la traducción.
- Respondé ÚNICAMENTE con un objeto JSON válido, sin markdown, sin explicaciones,
  con exactamente esta forma: {"en": "...", "pt": "..."}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
        max_tokens: 1200,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: textoEs },
        ],
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error('[translate] Error de OpenAI:', data.error.message);
      return null;
    }

    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return null;

    const limpio = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(limpio);

    if (!parsed.en && !parsed.pt) return null;
    return { en: parsed.en || null, pt: parsed.pt || null };
  } catch (err) {
    console.error('[translate] Falló la traducción:', err.message);
    return null;
  }
}

module.exports = { traducirDescripcion };
