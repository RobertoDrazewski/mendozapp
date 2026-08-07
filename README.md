# Mendozapp — v1 (primera versión para probar)

Guía turística de Mendoza: mapa con geolocalización, historias de bodegas/monumentos narradas por IA,
asistente por chat, itinerarios generados, y panel de administración para gestionar comercios adheridos
por suscripción (Mercado Pago).

## Estructura

```
mendozapp-project/
├── backend/          Node.js + Express + MySQL
│   ├── database/
│   │   ├── schema.sql       Estructura de todas las tablas
│   │   └── migrate.js       Script para crear tablas + cargar datos de ejemplo
│   └── src/
│       ├── routes/          auth, comercios, pois, banners, chat, mercadopago
│       ├── jobs/             checkVencimientos.js (cron diario)
│       └── server.js
└── frontend/         React + Vite + Tailwind (mobile-first)
    └── src/
        ├── pages/            Home (mapa), Chat, Places, ComoLlegar, Guia, AdminLogin, AdminDashboard
        ├── components/       Header, BottomNav, MapView, PlaceSheet, BannerBar
        └── i18n/             es / en / pt
```

## 1. Backend — puesta en marcha

```bash
cd backend
npm install
cp .env.example .env
```

Completá el `.env` con:
- `DATABASE_URL`: la de tu MySQL en Railway. **En local usá la URL pública** (Railway → tu servicio MySQL →
  pestaña "Connect" → "Public Network"), porque `mysql.railway.internal` solo funciona dentro de la red
  privada de Railway (o sea, entre tus propios servicios ya desplegados ahí).
- `JWT_SECRET`: cualquier string largo y random.
- `ANTHROPIC_API_KEY`: para que funcione el chat con IA.
- `MP_ACCESS_TOKEN`: tu access token de Mercado Pago (de prueba o de producción).
- `SMTP_*`: para que se manden los mails de aviso de vencimiento (podés usar el mismo Resend/Gmail que ya usás en AgroTech).

Crear las tablas y cargar datos de ejemplo (POIs de Mendoza + tu usuario superadmin):

```bash
npm run migrate:seed
```

Esto crea tu login de superadmin: **drazewski@gmail.com / mendozapp123** — cambiala apenas puedas
(desde MySQL directamente, actualizando el campo `password_hash` con un hash bcrypt nuevo; todavía no
hay pantalla de "cambiar contraseña" en esta v1).

Levantar el servidor:

```bash
npm run dev
```

Debería quedar corriendo en `http://localhost:3001`.

## 2. Frontend — puesta en marcha

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Se abre en `http://localhost:5173`. Probalo desde el celular conectado a la misma red usando la IP de
tu compu (Vite te la muestra en la consola al arrancar, algo como `http://192.168.x.x:5173`) — así podés
probar la geolocalización real en el teléfono.

## 3. Deploy a producción (Railway, mismo patrón que Kalyber)

1. Backend: nuevo servicio en Railway, conectado a este repo (carpeta `/backend`), con las mismas
   variables de entorno del `.env` cargadas ahí. Railway te va a dar la URL pública del backend
   (ej: `mendozapp-backend-production.up.railway.app`).
2. Frontend: otro servicio (o desplegalo en Vercel/Netlify si preferís, es más simple para un sitio
   estático). Variable `VITE_API_URL` apuntando a la URL del backend de Railway.
3. Dominio: apuntá `www.mendozapp.com.ar` al frontend.
4. Mercado Pago: configurá el webhook en el panel de MP apuntando a
   `https://tu-backend.up.railway.app/api/mercadopago/webhook`.

## 4. Pendientes conocidos de esta v1 (no inventar soluciones, son las tareas reales que faltan)

- **Google Maps real**: el prototipo usa OpenStreetMap (gratis, sin key) para que puedas probarlo ya.
  Para producción, cambiar el `tileLayer` de `MapView.jsx` por Google Maps JavaScript API (necesita tu
  propia API key con billing habilitado en Google Cloud) y traer los comercios que quieras auto-sugerir
  desde Google Places API en vez de solo tu base de datos.
- **Firma del webhook de Mercado Pago**: el endpoint actual no valida `x-signature`. Antes de producción
  hay que agregar esa validación para que nadie pueda simular pagos falsos.
- **Flujo de alta de suscripción**: falta la pantalla donde un comercio nuevo genera su link de pago de
  MP (`preapproval`) guardando su `comercio_id` como `external_reference`, para que el webhook sepa a
  qué comercio activar.
- **Texto-a-voz**: usa la voz nativa del navegador (gratis pero robótica). Para algo más natural, se puede
  integrar ElevenLabs u otro servicio de voz.
- **Traducción de historias**: cuando cargues un comercio nuevo en el panel, por ahora solo hay campo de
  descripción en español. Falta un botón "traducir con IA" que genere el en/pt automáticamente al guardar.
- **Cambio de contraseña del superadmin**: por ahora hay que hacerlo a mano en la base de datos.
