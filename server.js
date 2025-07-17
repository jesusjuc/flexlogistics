require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 🧠 Variables globales
const SHOP_DOMAIN = process.env.SHOP_DOMAIN;
const SHOP_TOKEN = process.env.SHOP_TOKEN;
const pedidosRecibidos = [];
const locationId = process.env.SHOP_LOCATION_ID;


// ✅ Ruta de prueba
app.get('/', (req, res) => {
  res.send('🟢 Backend de Flete Xpress funcionando correctamente.');
});

// 🔁 Ruta de ping
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// 📩 Webhook de pedidos
app.post('/webhook/pedidos', (req, res) => {
  try {
    const payload = req.body;
    const shopDomain = req.headers['x-shopify-shop-domain'] || 'desconocido';
    payload.tienda = shopDomain;
    console.log('✅ Pedido recibido vía webhook:', payload);
    pedidosRecibidos.push(payload);
    res.status(200).send('Webhook recibido.');
  } catch (error) {
    console.error('❌ Error al procesar el webhook:', error);
    res.status(400).send('Error al procesar');
  }
});

// 📦 Listar pedidos
app.get('/pedidos', (req, res) => {
  res.json(pedidosRecibidos);
});

// ✅ Preparado usando fulfillment_order_id
app.post('/cambiar-a-preparado', async (req, res) => {
  const orderId = req.body.order_id;

  try {
    const fulfillmentOrderResp = await fetch(`https://${SHOP_DOMAIN}/admin/api/2023-10/orders/${orderId}/fulfillment_orders.json`, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': SHOP_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    const fulfillmentData = await fulfillmentOrderResp.json();
    console.log("Fulfillment orders:", fulfillmentData);

    if (!fulfillmentData.fulfillment_orders || fulfillmentData.fulfillment_orders.length === 0) {
      return res.status(400).json({ error: "No se encontró fulfillment_order_id." });
    }

    const fulfillmentOrderId = fulfillmentData.fulfillment_orders[0].id;

    const fulfillmentResp = await fetch(`https://${SHOP_DOMAIN}/admin/api/2023-10/fulfillments.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': SHOP_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fulfillment: {
          message: "Preparado por Flex Logistics",
          notify_customer: false,
          line_items_by_fulfillment_order: [
            { fulfillment_order_id: fulfillmentOrderId }
          ]
        }
      }),
    });

    const result = await fulfillmentResp.json();
    console.log("Resultado del fulfillment:", result);

    res.json({ mensaje: "Orden marcada como preparada", fulfillment: result });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error en el servidor." });
  }
});

// ✅ Fulfillment forzado sin fulfillment_order_id
app.post('/forzar-preparado', async (req, res) => {
  const orderId = req.body.order_id;

  try {
    const orderResp = await fetch(`https://${SHOP_DOMAIN}/admin/api/2023-10/orders/${orderId}.json`, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': SHOP_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    const orderData = await orderResp.json();
    const order = orderData.order;

    if (!order || !order.line_items || order.line_items.length === 0) {
      return res.status(400).json({ error: "No se encontraron artículos en la orden." });
    }

    const location_id = process.env.SHOP_LOCATION_ID;
    if (!location_id) {
      return res.status(400).json({ error: "No hay location_id configurado." });
    }
    

    const lineItems = order.line_items.map(item => ({
      id: item.id,
      quantity: item.quantity
    }));
    const locationId = 1234567890; // ← Usa tu valor real de ubicación
    const fulfillResp = await fetch(`https://${SHOP_DOMAIN}/admin/api/2023-10/fulfillments.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': SHOP_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fulfillment: {
          location_id: order.location_id,
          message: "Forzado por Flex Logistics",
          notify_customer: false,
          line_items: lineItems
        }
      })
    });

    const result = await fulfillResp.json();
    console.log("Fulfillment forzado:", result);

    res.status(200).json({ mensaje: "Fulfillment forzado con éxito", fulfillment: result });

  } catch (error) {
    console.error("Error forzando fulfillment:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor backend escuchando en el puerto ${PORT}`);
});
