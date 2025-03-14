const express = require('express');
const fetch = require('node-fetch');

// No need to initialize Supabase clients here
// They're available as req.supabase and req.supabaseAdmin

const router = express.Router();

// POST: Create a new order
router.post('/', async (req, res) => {
  try {
    const { order, items } = req.body;
    
    if (!order || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Order and items are required' });
    }
    
    // Insert the order
    const { data: newOrder, error: orderError } = await req.supabase
      .from('orders')
      .insert([order])
      .select()
      .single();
    
    if (orderError) {
      console.error('Error creating order:', orderError);
      return res.status(500).json({ error: 'Failed to create order' });
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
      console.error('Error creating items:', itemsError);
      
      // Attempt to delete the order if item creation fails
      await req.supabase
        .from('orders')
        .delete()
        .eq('id', newOrder.id);
      
      return res.status(500).json({ error: 'Failed to create items' });
    }
    
    // Get the created items
    const { data: createdItems, error: fetchItemsError } = await req.supabase
      .from('items')
      .select('*')
      .eq('order_id', newOrder.id);
    
    if (fetchItemsError) {
      console.error('Error fetching created items:', fetchItemsError);
    }
    
    // Return the new order with its items
    res.status(201).json({
      ...newOrder,
      items: createdItems || []
    });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT: Update order status or assignment
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { order, items } = req.body;

    // Validate that order and items are present
    if (!order || !items) {
      return res.status(400).json({ error: 'Order and items are required' });
    }

    console.log(`Updating order ${id} with ${items.length} items`);

    // Get existing items for this order
    const { data: existingItems, error: fetchError } = await req.supabase
      .from('items')
      .select('*')
      .eq('order_id', id);

    if (fetchError) {
      console.error('Error fetching existing items:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch existing items', details: fetchError });
    }

    console.log(`Found ${existingItems.length} existing items for order ${id}`);

    // Create a map of existing items by ID for quick lookup
    const existingItemMap = {};
    existingItems.forEach(item => {
      existingItemMap[item.id] = item;
    });

    // Categorize items: which to update, which to create new
    const itemsToUpdate = [];
    const newItemsToCreate = [];
    const existingItemIds = new Set(existingItems.map(item => item.id));
    const requestedItemIds = new Set();
    
    // Sort items into update vs create categories
    items.forEach(item => {
      if (item.id && existingItemIds.has(item.id)) {
        // Item exists, update it but preserve status if not explicitly changed
        const currentItem = existingItemMap[item.id];
        itemsToUpdate.push({
          ...item,
          order_id: id,
          // Only use the incoming status if it's different from the current one
          item_status: item.item_status || currentItem.item_status || 'pending'
        });
        requestedItemIds.add(item.id);
      } else {
        // New item without ID or with non-existent ID
        // Don't explicitly set id to undefined, just omit the id field altogether
        const newItem = { 
          item_name: item.item_name,
          quantity: item.quantity,
          station: item.station,
          preparation_time_minutes: item.preparation_time_minutes,
          order_id: id,
          item_status: item.item_status || 'pending'
        };
        newItemsToCreate.push(newItem);
      }
    });

    // Find items to delete (those in existing but not in requested)
    const itemIdsToDelete = Array.from(existingItemIds).filter(id => !requestedItemIds.has(id));

    console.log(`Items breakdown - To update: ${itemsToUpdate.length}, To create: ${newItemsToCreate.length}, To delete: ${itemIdsToDelete.length}`);

    // Update order in Supabase
    const { data: updatedOrder, error: updateError } = await req.supabase
      .from('orders')
      .update(order)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating order:', updateError);
      return res.status(500).json({ error: 'Failed to update order', details: updateError });
    }

    // Update existing items
    let updateItemsError = null;
    if (itemsToUpdate.length > 0) {
      const { error } = await req.supabase
        .from('items')
        .upsert(itemsToUpdate);

      if (error) {
        console.error('Error updating items:', error);
        updateItemsError = error;
      } else {
        console.log(`Successfully updated ${itemsToUpdate.length} existing items`);
      }
    }

    // Delete removed items
    let deleteItemsError = null;
    if (itemIdsToDelete.length > 0) {
      const { error } = await req.supabaseAdmin
        .from('items')
        .delete()
        .in('id', itemIdsToDelete);

      if (error) {
        console.error('Error deleting items:', error);
        deleteItemsError = error;
      } else {
        console.log(`Successfully deleted ${itemIdsToDelete.length} removed items`);
      }
    }

    // Create new items
    let createItemsError = null;
    let createdItems = [];
    if (newItemsToCreate.length > 0) {
      try {
        console.log('Inserting new items:', JSON.stringify(newItemsToCreate));
        
        // Use supabaseAdmin to bypass RLS policies for creating new items
        const { data, error } = await req.supabaseAdmin
          .from('items')
          .insert(newItemsToCreate)
          .select();
        
        if (error) {
          console.error('Error creating new items:', error);
          createItemsError = error;
        } else if (data) {
          createdItems = data;
          console.log(`Successfully created ${data.length} new items using admin client`);
        }
      } catch (error) {
        console.error('Exception creating new items:', error);
        createItemsError = error;
      }
    }

    // Get the updated order with items
    const { data: orderWithItems, error: fetchUpdatedError } = await req.supabase
      .from('orders')
      .select(`
        *,
        items:items(*)
      `)
      .eq('id', id)
      .single();

    if (fetchUpdatedError) {
      console.error('Error fetching updated order with items:', fetchUpdatedError);
      return res.status(500).json({ error: 'Failed to fetch updated order', details: fetchUpdatedError });
    }

    console.log(`Final result: Order ${id} now has ${orderWithItems.items ? orderWithItems.items.length : 0} items`);

    // Build response based on outcome
    if (createItemsError && (!updateItemsError && !deleteItemsError)) {
      return res.status(207).json({
        message: 'Order updated but new items could not be created',
        order: orderWithItems,
        error: createItemsError
      });
    }

    if (updateItemsError || deleteItemsError) {
      return res.status(500).json({
        error: 'Failed to update items',
        updateError: updateItemsError,
        deleteError: deleteItemsError
      });
    }

    // Success - return the updated order with all its items
    return res.status(200).json(orderWithItems);
  } catch (error) {
    console.error('Exception in update order route:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// GET: Retrieve all orders (with optional filtering)
router.get('/', async (req, res) => {
  try {
    const { from, to, source } = req.query;
    
    let query = req.supabase
      .from('orders')
      .select('*, items(*)');
    
    // Apply filters if provided
    if (from) {
      query = query.gte('order_time', from);
    }
    
    if (to) {
      query = query.lte('order_time', to);
    }
    
    if (source) {
      query = query.eq('source', source);
    }
    
    // Get data with most recent orders first
    const { data, error } = await query.order('order_time', { ascending: false });
    
    if (error) {
      console.error('Error fetching orders:', error);
      return res.status(500).json({ error: 'Failed to fetch orders' });
    }
    
    res.json(data);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all orders for the current day (for manager view)
router.get('/day', async (req, res) => {
  try {
    // Get current date range (start of day to end of day)
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    // Query orders for today
    const { data: orders, error } = await req.supabase
      .from('orders')
      .select('*')
      .gte('scheduled_at', startOfDay.toISOString())
      .lte('scheduled_at', endOfDay.toISOString())
      .order('scheduled_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching orders:', error);
      return res.status(500).json({ error: 'Failed to fetch orders' });
    }
    
    // For each order, get its items
    const ordersWithItems = await Promise.all(orders.map(async (order) => {
      const { data: items, error: itemsError } = await req.supabase
        .from('items')
        .select('*')
        .eq('order_id', order.id);
      
      if (itemsError) {
        console.error(`Error fetching items for order ${order.id}:`, itemsError);
        return { ...order, items: [] };
      }
      
      return { ...order, items };
    }));
    
    res.json(ordersWithItems);
  } catch (err) {
    console.error('Error processing orders:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get items for a specific order
router.get('/:id/items', async (req, res) => {
  try {
    const orderId = req.params.id;
    
    // Query items for this order
    const { data: items, error } = await req.supabase
      .from('items')
      .select('*')
      .eq('order_id', orderId);
    
    if (error) {
      console.error('Error fetching items:', error);
      return res.status(500).json({ error: 'Failed to fetch items' });
    }
    
    res.json(items);
  } catch (err) {
    console.error('Error processing items request:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET: Retrieve a specific order by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await req.supabase
      .from('orders')
      .select('*, items(*)')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching order:', error);
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(data);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 