require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const authRoutes = require('./routes/auth');
const comerciosRoutes = require('./routes/comercios');
const poisRoutes = require('./routes/pois');
const bannersRoutes = require('./routes/banners');
const chatRoutes = require('./routes/chat');
const mercadopagoRoutes = require('./routes/mercadopago');
const geocodeRoutes = require('./routes/geocode');
const { checkVencimientos } = require('./jobs/checkVencimientos');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.json({ ok: true, servicio: 'Mendozapp API' }));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/comercios', comerciosRoutes);
app.use('/api/pois', poisRoutes);
app.use('/api/banners', bannersRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/mercadopago', mercadopagoRoutes);
app.use('/api/admin', geocodeRoutes);

// Cron: todos los días a las 8am revisa suscripciones vencidas
cron.schedule('0 8 * * *', () => {
  checkVencimientos().catch(err => console.error('Error en checkVencimientos:', err));
});

app.listen(PORT, () => {
  console.log(`🍇 Mendozapp API corriendo en el puerto ${PORT}`);
});
