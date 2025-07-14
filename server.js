require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.raw({ type: 'application/json' }));

const pedidosRecibidos = [];

const apiURL = (path = '') =>
  `https://${process.env.SHOP_DOMAIN}/admin/api/2024-04${path}`;

const headers = {
  'X-Shopify-Access-Token': process.env.SHOP_TOKEN,
  'Content-Type': 'application/json',
};

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

app.get('/pedidos', (req, res) => {
  res.json(pedidosRecibidos);
});
app.get('/', (req, res) => {
    res.send('Flete Xpress backend funcionando correctamente.');
  });
  console.log("✅ PORT recibido:", PORT);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Flete Xpress escuchando en el puerto ${PORT}`);
});

app.get('/ping', (req, res) => {
    res.status(200).send('pong');
  });
  