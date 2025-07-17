require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.json({ type: 'application/json' }));
app.post('/cambiar-a-preparado', async (req, res) => {
    const orderId = req.body.order_id;
    const shop = 'gpk0pd-1y.myshopify.com';
    const token = process.env.SHOPIFY_ACCESS_TOKEN;
  
    try {
      // 1. Obtener fulfillment_order_id desde Shopify
      const fulfillmentOrderResp = await fetch(`https://${shop}/admin/api/2023-10/orders/${orderId}/fulfillment_orders.json`, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': token,
          'Content-Type': 'application/json'
        }
      });
  
      const fulfillmentData = await fulfillmentOrderResp.json();
      console.log("Fulfillment orders:", fulfillmentData);
  
      if (!fulfillmentData.fulfillment_orders || fulfillmentData.fulfillment_orders.length === 0) {
        return res.status(400).json({ error: "No se encontró fulfillment_order_id." });
      }
  
      const fulfillmentOrderId = fulfillmentData.fulfillment_orders[0].id;
  
      // 2. Enviar el fulfillment (marcar como preparado)
      const fulfillmentResp = await fetch(`https://${shop}/admin/api/2023-10/fulfillments.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fulfillment: {
            message: "Preparado por Flex Logistics",
            notify_customer: false,
            line_items_by_fulfillment_order: [
              {
                fulfillment_order_id: fulfillmentOrderId
              }
            ]
          }
        })
      });
  
      const fulfillmentResult = await fulfillmentResp.json();
      console.log("Resultado del fulfillment:", fulfillmentResult);
  
      res.json({ mensaje: "Orden marcada como preparada", fulfillment: fulfillmentResult });
  
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Error en el servidor." });
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
