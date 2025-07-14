require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json()); // Para requests JSON normales
app.use(express.raw({ type: 'application/json' })); // Para Webhooks de Shopify

const pedidosRecibidos = [];

const apiURL = (path = '') =>
  `https://${process.env.SHOP_DOMAIN}/admin/api/2024-04${path}`;

const headers = {
  'X-Shopify-Access-Token': process.env.SHOP_TOKEN,
  'Content-Type': 'application/json',
};

// Verificación de estado
app.get('/', (req, res) => {
  res.send('🟢 Backend de Flete Xpress funcionando correctamente.');
});

// Webhook para pedidos
app.post('/webhook/pedidos', (req, res) => {
  try {
    const payload = JSON.parse(req.body.toString());
    console.log('✅ Pedido recibido vía webhook:', payload);
    pedidosRecibidos.push(payload);
    res.status(200).send('Webhook recibido.');
  } catch (error) {
    console.error('❌ Error al procesar el webhook:', error);
    res.status(400).send('Error al procesar');
  }
});

// Ver pedidos guardados
app.get('/pedidos', (req, res) => {
  res.json(pedidosRecibidos);
});

// Lanzar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Flete Xpress escuchando en el puerto ${PORT}`);
});
