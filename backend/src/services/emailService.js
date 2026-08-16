const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const PANEL_URL = 'https://mendozapp.com.ar/comercio/login';
const ALTA_URL = 'https://mendozapp.com.ar/comercio/alta';

function getTransporter() {
  if (!process.env.SMTP_USER) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function generarPassword() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

/**
 * Envío genérico. Nunca lanza excepción hacia arriba: si el mail falla, lo
 * registramos y seguimos. Un problema de SMTP no debe impedir que un comercio
 * se dé de alta ni que un pago se procese.
 */
async function enviar({ to, subject, html }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('[mail] SMTP no configurado, no se envía nada.');
    return false;
  }
  try {
    await transporter.sendMail({
      from: `"Mendozapp" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[mail] Enviado a ${to}: ${subject}`);
    return true;
  } catch (err) {
    console.error(`[mail] Falló el envío a ${to}:`, err.message);
    return false;
  }
}

const layout = (contenido) => `
  <div style="font-family: Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #241B1E;">
    <div style="background: #6B1E3C; padding: 20px; text-align: center;">
      <span style="color: #F2C572; font-size: 22px; font-weight: bold;">Mendozapp</span>
    </div>
    <div style="padding: 24px; background: #FFFDFB;">
      ${contenido}
    </div>
    <div style="padding: 16px; text-align: center; font-size: 11px; color: #6B5D5F;">
      Mendozapp · Guía turística de Mendoza · mendozapp.com.ar
    </div>
  </div>
`;

/** Bienvenida al arrancar el período de prueba gratis */
async function mailInicioPrueba(comercio, password, diasPrueba) {
  return enviar({
    to: comercio.email,
    subject: `¡${comercio.nombre} ya está en el mapa de Mendozapp!`,
    html: layout(`
      <h2 style="color:#4A1329;">¡Hola ${comercio.nombre}!</h2>
      <p>Tu comercio <b>ya se está mostrando en el mapa</b> de Mendozapp para todos los turistas que usan la app.</p>
      <p>Tenés <b>${diasPrueba} días de prueba gratis</b>, sin tarjeta ni compromiso.</p>
      <div style="background:#F3EFE9; padding:16px; border-radius:10px; margin:18px 0;">
        <p style="margin:0 0 8px;"><b>Entrá a tu panel para completar tu ficha:</b></p>
        <p style="margin:4px 0;">Panel: <a href="${PANEL_URL}" style="color:#6B1E3C;">${PANEL_URL}</a></p>
        <p style="margin:4px 0;">Email: <b>${comercio.email}</b></p>
        <p style="margin:4px 0;">Contraseña: <b style="font-size:16px;">${password}</b></p>
      </div>
      <p><b>Importante:</b> hasta que no cargues tu foto y tu descripción, los turistas ven tu negocio
      en el mapa pero con la ficha vacía. Los comercios con foto e historia reciben muchas más visitas.</p>
      <p style="font-size:13px; color:#6B5D5F;">Cuando termine la prueba te vamos a avisar para que decidas si querés seguir.</p>
    `),
  });
}

/** Bienvenida / confirmación cuando pagó la suscripción */
async function mailSuscripcionActiva(comercio, password) {
  const bloquePass = password
    ? `<div style="background:#F3EFE9; padding:16px; border-radius:10px; margin:18px 0;">
         <p style="margin:0 0 8px;"><b>Datos de acceso a tu panel:</b></p>
         <p style="margin:4px 0;">Panel: <a href="${PANEL_URL}" style="color:#6B1E3C;">${PANEL_URL}</a></p>
         <p style="margin:4px 0;">Email: <b>${comercio.email}</b></p>
         <p style="margin:4px 0;">Contraseña: <b style="font-size:16px;">${password}</b></p>
       </div>`
    : `<p>Podés entrar a tu panel en <a href="${PANEL_URL}" style="color:#6B1E3C;">${PANEL_URL}</a> con la contraseña que ya tenías.</p>`;

  return enviar({
    to: comercio.email,
    subject: '¡Tu suscripción a Mendozapp está activa!',
    html: layout(`
      <h2 style="color:#4A1329;">¡Gracias ${comercio.nombre}!</h2>
      <p>Tu suscripción está <b>activa</b> y tu comercio se muestra en el mapa para los turistas.</p>
      ${bloquePass}
      <p>Mantené tus horarios y tu descripción actualizados para aprovechar al máximo la app.</p>
    `),
  });
}

/** Aviso de que la prueba gratis está por terminar */
async function mailPruebaPorVencer(comercio, diasRestantes) {
  return enviar({
    to: comercio.email,
    subject: `Tu prueba gratis en Mendozapp termina en ${diasRestantes} días`,
    html: layout(`
      <h2 style="color:#4A1329;">Hola ${comercio.nombre},</h2>
      <p>Tu período de prueba gratis termina en <b>${diasRestantes} días</b>.</p>
      <p>Para que <b>${comercio.nombre}</b> siga apareciendo en el mapa para los turistas, activá tu suscripción:</p>
      <p style="text-align:center; margin:24px 0;">
        <a href="${ALTA_URL}" style="background:#6B1E3C; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">Activar mi suscripción</a>
      </p>
      <p style="font-size:13px; color:#6B5D5F;">Si tenés dudas, respondé este mail y te ayudamos.</p>
    `),
  });
}

/** Aviso de que venció (prueba o suscripción) y ya no se muestra */
async function mailVencido(comercio, eraPrueba) {
  return enviar({
    to: comercio.email,
    subject: eraPrueba
      ? 'Terminó tu prueba gratis en Mendozapp'
      : 'Tu suscripción a Mendozapp venció',
    html: layout(`
      <h2 style="color:#4A1329;">Hola ${comercio.nombre},</h2>
      <p>${eraPrueba
        ? 'Terminó tu período de prueba gratis y tu comercio dejó de mostrarse en el mapa.'
        : 'Tu suscripción venció y tu comercio dejó de mostrarse en el mapa.'}</p>
      <p style="text-align:center; margin:24px 0;">
        <a href="${ALTA_URL}" style="background:#6B1E3C; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">Volver a activarme</a>
      </p>
      <p style="font-size:13px; color:#6B5D5F;">Si creés que esto es un error, respondé este mail y lo revisamos.</p>
    `),
  });
}

/** Reenvío manual de acceso desde el panel de admin */
async function mailReenvioAcceso(comercio, password) {
  return enviar({
    to: comercio.email,
    subject: 'Tus datos de acceso a Mendozapp',
    html: layout(`
      <h2 style="color:#4A1329;">Hola ${comercio.nombre},</h2>
      <p>Estos son tus datos para entrar al panel de tu comercio:</p>
      <div style="background:#F3EFE9; padding:16px; border-radius:10px; margin:18px 0;">
        <p style="margin:4px 0;">Panel: <a href="${PANEL_URL}" style="color:#6B1E3C;">${PANEL_URL}</a></p>
        <p style="margin:4px 0;">Email: <b>${comercio.email}</b></p>
        <p style="margin:4px 0;">Contraseña nueva: <b style="font-size:16px;">${password}</b></p>
      </div>
      <p style="font-size:13px; color:#6B5D5F;">Esta contraseña reemplaza a la anterior.</p>
    `),
  });
}

module.exports = {
  generarPassword,
  hashPassword,
  enviar,
  mailInicioPrueba,
  mailSuscripcionActiva,
  mailPruebaPorVencer,
  mailVencido,
  mailReenvioAcceso,
};
