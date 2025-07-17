require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.json({ type: 'application/json' }));
app.post('/cambiar-a-preparado', async (req, res) => {
    const { order_id } = req.body;
  
    if (!order_id) {
      return res.status(400).json({ error: 'Falta el ID de la orden.' });
    }
  
    try {
      console.log("Recibida solicitud para cambiar a preparado, ID:", order_id);
  
      // 1. Consultar orden
      const ordenCruda = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2025-07/orders/${order_id}.json`, {
        headers: {
          'X-Shopify-Access-Token': process.env.SHOP_TOKEN,
          'Content-Type': 'application/json',
        },
      });
      const orden = await ordenCruda.json();
      console.log("Orden recibida:", orden);
  
      if (orden.order.financial_status !== 'paid') {
        console.log("La orden no está pagada:", orden.order.financial_status);
        return res.status(400).json({ error: 'La orden no está pagada.' });
      }
  
      const fulfillmentCrudo = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2025-07/orders/${order_id}/fulfillment_orders.json`, {
        headers: {
          'X-Shopify-Access-Token': process.env.SHOP_TOKEN,
          'Content-Type': 'application/json',
        },
      });
      const fulfillmentData = await fulfillmentCrudo.json();
      console.log("Fulfillment Orders:", fulfillmentData);
  
      const fulfillment_order_id = fulfillmentData.fulfillment_orders?.[0]?.id;
      if (!fulfillment_order_id) {
        return res.status(400).json({ error: 'No se encontró fulfillment_order_id.' });
      }
  
      // Crear el fulfillment
      const fulfillResponse = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2025-07/fulfillments.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': process.env.SHOP_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fulfillment: {
            message: "Pedido preparado por Flex Logistics",
            notify_customer: true,
            tracking_info: {
              number: null,
              url: null
            },
            line_items_by_fulfillment_order: [
              {
                fulfillment_order_id
              }
            ]
          }
        }),
      });
  
      const fulfillResult = await fulfillResponse.json();
      console.log("Resultado fulfillment:", fulfillResult);
  
      res.json({ ok: true, fulfillResult });
  
    } catch (err) {
        console.error("❌ Error inesperado:", err.message);
        console.error(err); // muestra toda la traza
        res.status(500).json({ error: "Error al actualizar la orden: " + err.message });
      }
      
  });
  
  

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
      const payload = req.body; // ✅ Ya es un objeto
      // 🛍️ Captura el dominio de la tienda que envió el webhook
const shopDomain = req.headers['x-shopify-shop-domain'] || 'desconocido';

// 📌 Añade el campo 'tienda' al payload
payload.tienda = shopDomain;

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
  console.log("Servidor listo y escuchando en /cambiar-a-preparado");

});
