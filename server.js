require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

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

async function firstLocationId() {
  const { data } = await axios.get(apiURL('/locations.json'), { headers });
  if (!data.locations.length) throw new Error('Sin ubicaciones activas');
  return data.locations[0].id;
}

// Endpoint principal
app.get('/', (req, res) => {
  res.send('🚚 Backend de Flete Xpress funcionando correctamente.');
});

// Obtener todos los pedidos
app.get('/orders', async (_req, res) => {
  try {
    const { data } = await axios.get(apiURL('/orders.json?status=any'), { headers });
    res.json(data.orders);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'No se pudieron obtener pedidos' });
  }
});

// Obtener pedido por ID
app.get('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data } = await axios.get(apiURL(`/orders/${id}.json`), { headers });
    res.json(data.order);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'No se pudo obtener el pedido' });
  }
});

// Cambiar estado del pedido
app.post('/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  try {
    let { data: foData } = await axios.get(apiURL(`/orders/${id}/fulfillment_orders.json`), { headers });
    let fo = foData.fulfillment_orders?.[0];

    if (!fo) {
      console.log('⚠️ No hay fulfillment_orders – se crea legacy pending');
      const locId = await firstLocationId();
      const { data: ord } = await axios.get(apiURL(`/orders/${id}.json`), { headers });

      await axios.post(apiURL(`/orders/${id}/fulfillments.json`), {
        fulfillment: {
          status: 'pending',
          location_id: locId,
          notify_customer: false,
          line_items: ord.order.line_items.map(l => ({ id: l.id, quantity: l.quantity })),
        },
      }, { headers });

      foData = await axios.get(apiURL(`/orders/${id}/fulfillment_orders.json`), { headers });
      fo = foData.data.fulfillment_orders[0];
    }

    const lines = fo.line_items.map(l => ({ id: l.id, quantity: l.quantity }));

    if (estado === 'PREPARACION') {
      await axios.put(apiURL(`/fulfillments/${fo.fulfillments[0]?.id}.json`), {
        fulfillment: { status: 'pending' },
      }, { headers });
    }

    if (estado === 'LISTO_ENVIO') {
      const fPend = fo.fulfillments?.find(f => f.status === 'pending');
      if (fPend) {
        await axios.put(apiURL(`/fulfillments/${fPend.id}.json`), {
          fulfillment: { id: fPend.id, status: 'in_progress' },
        }, { headers });
      } else {
        await axios.post(apiURL('/fulfillments.json'), {
          fulfillment: {
            status: 'in_progress',
            location_id: fo.assigned_location_id,
            notify_customer: false,
            fulfillment_order_id: fo.id,
            line_items_by_fulfillment_order: [{
              fulfillment_order_id: fo.id,
              fulfillment_order_line_items: lines,
            }],
          },
        }, { headers });
      }
    }

    if (estado === 'ENTREGADO') {
      await axios.post(apiURL('/fulfillments.json'), {
        fulfillment: {
          status: 'success',
          location_id: fo.assigned_location_id,
          notify_customer: false,
          fulfillment_order_id: fo.id,
          line_items_by_fulfillment_order: [{
            fulfillment_order_id: fo.id,
            fulfillment_order_line_items: lines,
          }],
        },
      }, { headers });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('❌', err.response?.data || err.message);
    res.status(500).json({ error: 'Shopify rechazó la operación' });
  }
});

// Webhook para pedidos
app.post('/webhook/pedidos', (req, res) => {
  try {
    const payload = JSON.parse(req.body.toString());
    console.log('✅ Webhook recibido');
    console.log('📦 Pedido recibido vía webhook:', payload);

    pedidosRecibidos.push(payload);
    res.status(200).send('Webhook recibido');
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
app.post('/webhook', async (req, res) => {
    try {
      const pedido = req.body;
  
      // Puedes guardar el pedido recibido donde desees
      console.log('Pedido recibido desde Shopify:', pedido);
  
      // También podrías almacenarlo en un array temporal
      pedidosRecibidos.push(pedido);
  
      res.status(200).send('Webhook recibido correctamente.');
    } catch (error) {
      console.error('Error procesando webhook:', error);
      res.status(500).send('Error interno al procesar webhook.');
    }
  });
  