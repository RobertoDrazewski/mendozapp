/**
 * precios.js
 * Precio mensual de la suscripción según el tipo de comercio, en ARS.
 *
 * Vive acá y no dentro de una ruta para que el backend y el panel del comercio
 * muestren siempre el mismo número. Si cambiás un precio, cambialo solo acá.
 */
const PRECIOS = {
  bodega: 50000,
  restaurante: 30000,
  hotel: 30000,
  turismo_aventura: 30000,
  comercio: 10000,
  otro: 10000,
};

function precioPara(tipo) {
  return PRECIOS[tipo] ?? PRECIOS.otro;
}

function formatearARS(monto) {
  return `$${monto.toLocaleString('es-AR')}`;
}

module.exports = { PRECIOS, precioPara, formatearARS };
