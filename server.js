require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.json({ type: 'application/json' }));
try {
    console.log("Buscando orden", order_id);
    const ordenCruda = await fetch(`https://${SHOP_DOMAIN}/admin/api/2025-07/orders/${order_id}.json`, {
      headers: {
        'X-Shopify-Access-Token': SHOP_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    const orden = await ordenCruda.json();
  
    console.log("Orden recibida:", orden);
  
    if (orden.order.financial_status !== 'paid') {
      console.log("Orden no está pagada");
      return res.status(400).json({ error: 'La orden aún no está pagada. No se puede preparar.' });
    }
  
    console.log("Obteniendo fulfillment_orders...");
    const fulfillmentOrdersResponse = await fetch(`https://${SHOP_DOMAIN}/admin/api/2025-07/orders/${order_id}/fulfillment_orders.json`, {
      headers: {
        'X-Shopify-Access-Token': SHOP_TOKEN,
        'Content-Type': 'application/json'
      }
    });
  
    const fulfillmentOrders = await fulfillmentOrdersResponse.json();
    console.log("Fulfillment Orders:", fulfillmentOrders);
  
    const fulfillmentOrderId = fulfillmentOrders.fulfillment_orders?.[0]?.id;
    if (!fulfillmentOrderId) {
      console.log("No se encontró fulfillment_order_id");
      return res.status(400).json({ error: 'No se encontró fulfillment_order_id' });
    }
  
    console.log("Preparando fulfillment...");
    const preparar = await fetch(`https://${SHOP_DOMAIN}/admin/api/2025-07/fulfillments.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': SHOP_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fulfillment: {
          message: "Pedido preparado por Flex Logistics",
          notify_customer: true,
          tracking_info: {
            number: "123456",
            url: "https://flexlogistics.cl/seguimiento/123456"
          },
          line_items_by_fulfillment_order: [
            {
              fulfillment_order_id: fulfillmentOrderId
            }
          ]
        }
      })
    });
  
    const respuesta = await preparar.json();
    console.log("Respuesta de fulfillment:", respuesta);
  
    res.status(200).json({ mensaje: "Estado actualizado en Shopify." });
  } catch (error) {
    console.error("ERROR REAL:", error);
    res.status(500).json({ error: "Error al actualizar la orden." });
  }
  
  

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
