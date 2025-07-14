require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.raw({ type: 'application/json' }));

// Variables de entorno para Shopify
const SHOP_DOMAIN = process.env.SHOP_DOMAIN;
const SHOP_TOKEN = process.env.SHOP_TOKEN;

const pedidosRecibidos = [];

app.get('/', (req, res) => {
  res.send('🟢 Backend de Flete Xpress funcionando correctamente.');
});

app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

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

app.listen(PORT, () => {
  console.log(`✅ Servidor backend escuchando en el puerto ${PORT}`);
});
