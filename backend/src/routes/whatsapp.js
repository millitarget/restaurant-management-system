const express = require('express');
const router = express.Router();

// POST: Create a new order from WhatsApp via make.com
router.post('/', async (req, res) => {
  try {
    console.log('WhatsApp order received:', JSON.stringify(req.body));
    
    const bookingData = req.body;
    
    // Transform the make.com data to order format
    const orderPayload = transformMakeData(bookingData);
    
    if (!orderPayload.order || !orderPayload.items || orderPayload.items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid order data - missing items or customer information' 
      });
    }
    
    // Insert the order using the existing orders API logic
    const { order, items } = orderPayload;
    
    // Insert the order
    const { data: newOrder, error: orderError } = await req.supabase
      .from('orders')
      .insert([order])
      .select()
      .single();
    
    if (orderError) {
      console.error('Error creating order from WhatsApp:', orderError);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create order', 
        error: orderError 
      });
    }
    
    // Prepare items with the new order ID
    const itemsWithOrderId = items.map(item => ({
      ...item,
      order_id: newOrder.id,
      item_status: item.item_status || 'pending'
    }));
    
    // Insert the items using supabaseAdmin to bypass RLS policies
    const { error: itemsError } = await req.supabaseAdmin
      .from('items')
      .insert(itemsWithOrderId);
    
    if (itemsError) {
      console.error('Error creating items for WhatsApp order:', itemsError);
      
      // Attempt to delete the order if item creation fails
      await req.supabase
        .from('orders')
        .delete()
        .eq('id', newOrder.id);
      
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create items', 
        error: itemsError 
      });
    }
    
    // Return success response
    res.status(201).json({
      success: true,
      message: 'Order received and processed successfully',
      orderId: newOrder.id
    });
  } catch (err) {
    console.error('Error processing WhatsApp order:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error', 
      error: err.message 
    });
  }
});

// Transform make.com data to the required order format
function transformMakeData(bookingData) {
  // Create items array from the make.com data structure
  const items = [];
  
  // Process meat items (carne)
  addItemIfExists(items, bookingData.carne1, bookingData.quantCarne1, 
    getSauceInfo(bookingData.molho1, bookingData.molho11));
  
  addItemIfExists(items, bookingData.carne2, bookingData.qtcarne2, 
    getSauceInfo(bookingData.molho2, bookingData.molho22));
  
  addItemIfExists(items, bookingData.carne3, bookingData.qtcarne3, 
    getSauceInfo(bookingData.molho3, bookingData.molho33));
  
  addItemIfExists(items, bookingData.carne4, bookingData.qtcarne4, 
    getSauceInfo(bookingData.molho4, bookingData.molho44));
  
  addItemIfExists(items, bookingData.carne5, bookingData.qtcarne5, 
    getSauceInfo(bookingData.molho5, bookingData.molho55));
  
  addItemIfExists(items, bookingData.carne6, bookingData.qtcarne6, 
    getSauceInfo(bookingData.molho6, bookingData.molho66));
  
  // Process salads (salada)
  addItemIfExists(items, bookingData.salada1, bookingData.qtsalada1, 
    bookingData.tempero_salada1 ? `(Tempero: ${bookingData.tempero_salada1})` : '');
  
  addItemIfExists(items, bookingData.salada2, bookingData.qtsalada2, 
    bookingData.tempero_salada2 ? `(Tempero: ${bookingData.tempero_salada2})` : '');
  
  addItemIfExists(items, bookingData.salada3, bookingData.qtsalada3, 
    bookingData.tempero_salada3 ? `(Tempero: ${bookingData.tempero_salada3})` : '');
  
  // Process side dishes (acompanhamento)
  addItemIfExists(items, bookingData.acompanhamento1, bookingData.qtacompanhamento1);
  addItemIfExists(items, bookingData.acompanhamento2, bookingData.qtacompanhamento2);
  addItemIfExists(items, bookingData.acompanhamento3, bookingData.qtacompanhamento3);
  addItemIfExists(items, bookingData.acompanhamento4, bookingData.qtacompanhamento4);
  addItemIfExists(items, bookingData.acompanhamento5, bookingData.qtacompanhamento5);
  addItemIfExists(items, bookingData.acompanhamento6, bookingData.qtacompanhamento6);
  
  // Process beverages (bebida)
  addItemIfExists(items, bookingData.bebida1, bookingData.qtbebida1);
  addItemIfExists(items, bookingData.bebida2, bookingData.qtbebida2);
  
  // Convert chosenTime to a datetime object if it exists
  let scheduledAt = null;
  if (bookingData.chosenTimeInt) {
    const chosenTimeMinutes = parseInt(bookingData.chosenTimeInt, 10);
    if (!isNaN(chosenTimeMinutes) && chosenTimeMinutes > 0) {
      scheduledAt = new Date(Date.now() + chosenTimeMinutes * 60000).toISOString();
    }
  }
  
  // Custom notes from any personalization fields
  const notes = [];
  if (bookingData.personalizacao) notes.push(bookingData.personalizacao);
  if (bookingData.personalizacao_saladas) notes.push(`Saladas: ${bookingData.personalizacao_saladas}`);
  
  // Create the final order payload
  return {
    order: {
      customer: bookingData.name || bookingData.nameautomatico || 'Cliente WhatsApp',
      source: "whatsapp",
      status: "pending",
      scheduled_at: scheduledAt,
      phone_number: bookingData.telephone || '',
      notes: notes.length > 0 ? notes.join(' | ') : ''
    },
    items: items
  };
}

function addItemIfExists(items, itemName, quantity, notes = '') {
  if (itemName && quantity) {
    const qty = parseInt(quantity, 10) || 1;
    if (qty <= 0) return; // Skip items with quantity 0 or negative
    
    const station = getStationForItem(itemName);
    
    items.push({
      item_name: notes ? `${itemName} ${notes}` : itemName,
      quantity: qty,
      station: station,
      preparation_time_minutes: getEstimatedPrepTime(itemName),
      item_status: "pending"
    });
  }
}

function getSauceInfo(sauce1, sauce2) {
  const sauces = [];
  if (sauce1) sauces.push(sauce1);
  if (sauce2) sauces.push(sauce2);
  return sauces.length > 0 ? `(Molho: ${sauces.join(', ')})` : '';
}

function getStationForItem(itemName) {
  if (!itemName) return 'other';
  
  const item = itemName.toLowerCase();
  
  if (item.includes('frango') || 
      item.includes('espetada') || 
      item.includes('entrecosto') || 
      item.includes('costeleta') ||
      item.includes('picanha') || 
      item.includes('bife') ||
      item.includes('salsicha') ||
      item.includes('févera') ||
      item.includes('coelho') ||
      item.includes('costelinha')) {
    return 'churrasco';
  }
  
  if (item.includes('batata') || 
      item.includes('arroz') || 
      item.includes('salada') || 
      item.includes('feijão') ||
      item.includes('esparregado') ||
      item.includes('broa') ||
      item.includes('trança')) {
    return 'cozinha';
  }
  
  if (item.includes('bacalhau')) {
    return 'grelha';
  }
  
  if (item.includes('refrigerante') || 
      item.includes('vinho') ||
      item.includes('bebida')) {
    return 'bar';
  }
  
  return 'other';
}

function getEstimatedPrepTime(itemName) {
  if (!itemName) return 15;
  
  const item = itemName.toLowerCase();
  
  if (item.includes('*') || item.includes('min')) {
    if (item.includes('coelho') || 
        item.includes('frango') && item.includes('30-40')) {
      return 40;
    }
    if (item.includes('bacalhau') || 
        item.includes('40 min')) {
      return 40;
    }
  }
  
  if (item.includes('frango') || 
      item.includes('espetada')) {
    return 15;
  }
  
  if (item.includes('entrecosto') || 
      item.includes('costeleta')) {
    return 20;
  }
  
  if (item.includes('batata') || 
      item.includes('arroz')) {
    return 10;
  }
  
  return 5;
}

module.exports = router; 