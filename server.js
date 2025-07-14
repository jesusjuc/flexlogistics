require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json()); // primero JSON para rutas normales

const pedidosRecibidos = [];

const apiURL = (path = '') =>
  `https://${process.env.SHOP_DOMAIN}/admin/api/2024-04${path}`;

const headers = {
  'X-Shopify-Access-Token': process.env.SHOP_TOKEN,
  'Content-Type': 'application/json',
};

// Webhook con raw parser solo aquí
app.post(
  '/webhook/pedidos',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    try {
      const payload = JSON.parse(req.body.toString());
      console.log('✅ Pedido recibido vía webhook:', payload);
      pedidosRecibidos.push(payload);
      res.status(200).send('Webhook recibido.');
    } catch (error) {
      console.error('❌ Error al procesar el webhook:', error);
      res.status(400).send('Error al procesar');
    }
  }
);

// Ruta para consultar pedidos guardados
app.get('/pedidos', (req, res) => {
  res.json(pedidosRecibidos);
});

// Ruta principal
app.get('/', (req, res) => {
  res.send('🟢 Flete Xpress backend funcionando correctamente.');
});

// Ping
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Escuchar
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Flete Xpress escuchando en el puerto ${PORT}`);
});
