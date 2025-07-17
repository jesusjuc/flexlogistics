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
      return res.status(400).json({ error: "Falta el ID de la orden." });
    }
  
    try {
      // 1. Consultar la orden en tiempo real
      // 👇 Antes de pedir fulfillment_orders
const ordenCruda = await fetch(`https://${SHOP_DOMAIN}/admin/api/2025-07/orders/${order_id}.json`, {
    headers: {
      'X-Shopify-Access-Token': SHOP_TOKEN,
      'Content-Type': 'application/json'
    }
  });
  const orden = await ordenCruda.json();
  
  // ❌ Si aún no está pagada, cortamos
  if (orden.order.financial_status !== 'paid') {
    return res.status(400).json({ error: 'La orden aún no está pagada. No se puede preparar.' });
  }
  
      const orderResponse = await fetch(`https://${SHOP_DOMAIN}/admin/api/2025-07/orders/${order_id}.json`, {
        headers: {
          'X-Shopify-Access-Token': SHOP_TOKEN,
          'Content-Type': 'application/json'
        }
      });
      const orderData = await orderResponse.json();
  
      if (!orderData.order) {
        return res.status(404).json({ error: "Orden no encontrada en Shopify." });
      }
  
      // 2. Validar que esté pagada
      if (orderData.order.financial_status !== 'paid') {
        return res.status(400).json({ error: "La orden aún no ha sido marcada como pagada en Shopify." });
      }
  
      // 3. Buscar el fulfillment_order_id
      const fulfillmentOrdersResponse = await fetch(`https://${SHOP_DOMAIN}/admin/api/2025-07/orders/${order_id}/fulfillment_orders.json`, {
        headers: {
          'X-Shopify-Access-Token': SHOP_TOKEN,
          'Content-Type': 'application/json'
        }
      });
      const fulfillmentOrdersData = await fulfillmentOrdersResponse.json();
  
      if (!fulfillmentOrdersData.fulfillment_orders || fulfillmentOrdersData.fulfillment_orders.length === 0) {
        return res.status(404).json({ error: "No se encontraron fulfillment_orders para esta orden." });
      }
  
      const fulfillmentOrderId = fulfillmentOrdersData.fulfillment_orders[0].id;
  
      // 4. Crear el fulfillment
      const fulfillmentResponse = await fetch(`https://${SHOP_DOMAIN}/admin/api/2025-07/fulfillments.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': SHOP_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fulfillment: {
            message: "Preparado desde FlexLogistics",
            notify_customer: false,
            line_items_by_fulfillment_order: [
              {
                fulfillment_order_id: fulfillmentOrderId
              }
            ]
          }
        })
      });
  
      const fulfillmentData = await fulfillmentResponse.json();
  
      if (fulfillmentResponse.ok) {
        res.status(200).json({ success: true, data: fulfillmentData });
      } else {
        console.error("❌ Error al crear el fulfillment:", fulfillmentData);
        res.status(500).json({ error: fulfillmentData });
      }
  
    } catch (err) {
      console.error("❌ Error inesperado:", err);
      res.status(500).json({ error: "Error al actualizar la orden." });
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
