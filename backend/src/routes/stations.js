const express = require('express');
// No need to create Supabase client here as it's available from req.supabaseAdmin
// Remove these commented imports as well
// const { authenticateToken } = require('../middleware/auth');
// const { determineItemPrepStatus, determineOrderStatus, shouldShowItemAtStation } = require('../utils/prep-helpers');

// Helper functions for item preparation status
const determineItemPrepStatus = (item, order, currentTime) => {
  // Default status message
  let status = 'Wait';
  
  // If the item is already in progress or done, return that
  if (item.item_status === 'in_progress') return 'In Progress';
  if (item.item_status === 'done') return 'Done';
  
  // Get scheduled time (or order time if no scheduled time)
  const scheduledTime = new Date(order.scheduled_at || order.order_time);
  
  // Calculate target start time based on preparation time
  const prepTimeMinutes = item.preparation_time_minutes || 15; // Default to 15 minutes
  const targetStartTime = new Date(scheduledTime.getTime() - (prepTimeMinutes * 60 * 1000));
  
  // If we're past the target start time, it's urgent
  if (currentTime >= targetStartTime) {
    status = 'START NOW';
    
    // If the customer has arrived (order is in_progress), it's very urgent
    if (order.status === 'in_progress') {
      status = 'URGENT - START NOW';
    }
  } else {
    // Calculate minutes until we need to start
    const minutesUntilStart = Math.round((targetStartTime - currentTime) / (60 * 1000));
    status = `Wait ${minutesUntilStart} min`;
  }
  
  return status;
};

const determineOrderStatus = (order, items, currentTime) => {
  // Default status
  let status = 'On time';
  
  // If the order is already in progress, the customer has arrived
  if (order.status === 'in_progress') {
    return 'Customer arrived';
  }
  
  // Check if any items are urgent
  const hasUrgentItems = items.some(item => {
    const itemStatus = determineItemPrepStatus(item, order, currentTime);
    return itemStatus.includes('NOW');
  });
  
  if (hasUrgentItems) {
    status = 'Start preparation';
  }
  
  return status;
};

const shouldShowItemAtStation = (item, order, currentTime) => {
  // Always show items that are already in progress or done
  if (item.item_status === 'in_progress' || item.item_status === 'done') {
    return true;
  }
  
  // If item is not "ready_to_start", check if it should be visible
  if (item.item_status !== 'ready_to_start') {
    // For kitchen and grill stations, always show items
    if (item.station === 'kitchen' || item.station === 'grill') {
      return true;
    }
    
    // For fries station, only show if grill/kitchen items are done or nearly done
    if (item.station === 'fries') {
      // Show if order status is in_progress (customer arrived)
      if (order.status === 'in_progress') {
        return true;
      }
      
      // Otherwise, check schedule - show fries 10 minutes before scheduled time
      const scheduledTime = new Date(order.scheduled_at || order.order_time);
      const tenMinutesBefore = new Date(scheduledTime.getTime() - (10 * 60 * 1000));
      
      return currentTime >= tenMinutesBefore;
    }
    
    // For assembly station, only show when food is nearly ready
    if (item.station === 'assembly') {
      // Show if order status is in_progress (customer arrived)
      if (order.status === 'in_progress') {
        return true;
      }
      
      // Otherwise, check schedule - show assembly 5 minutes before scheduled time
      const scheduledTime = new Date(order.scheduled_at || order.order_time);
      const fiveMinutesBefore = new Date(scheduledTime.getTime() - (5 * 60 * 1000));
      
      return currentTime >= fiveMinutesBefore;
    }
  }
  
  // Default: show the item
  return true;
};

const router = express.Router();

// Debug endpoint to get all orders directly from database
router.get('/debug/all', async (req, res) => {
  try {
    const { data: orders, error } = await req.supabaseAdmin
      .from('orders')
      .select('id, source, customer, order_time, order_number, status, assigned_to, scheduled_at')
      .order('order_time', { ascending: false });
    
    if (error) {
      console.error('Error fetching all orders for debug:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`Debug: Found ${orders.length} orders in database`);
    return res.json(orders);
  } catch (err) {
    console.error('Unexpected error in debug/all endpoint:', err);
    return res.status(500).json({ error: err.message });
  }
});

// IMPORTANT: Define specialized station routes BEFORE the wildcard /:station route
// This ensures they are matched first

// Assembly Station endpoint
router.get('/assembly', async (req, res) => {
  try {
    const now = new Date();
    const startTime = new Date(now);
    startTime.setHours(0, 0, 0, 0); // Start of day
    
    console.log(`Fetching assembly orders from ${startTime.toISOString()}`);
    
    const { data: allOrders, error: ordersError } = await req.supabaseAdmin
      .from('orders')
      .select('id, source, customer, order_time, order_number, status, assigned_to, scheduled_at')
      .gte('order_time', startTime.toISOString())
      .neq('status', 'done')
      .order('scheduled_at', { ascending: true });
    
    if (ordersError) {
      console.error('Error fetching orders for assembly station:', ordersError);
      return res.status(500).json({ error: 'Failed to fetch assembly station data' });
    }
    
    console.log(`Found ${allOrders.length} orders before filtering for assembly items`);
    
    const ordersWithItems = [];
    
    for (const order of allOrders) {
      // First, check if this order has assembly items
      const { data: assemblyItems, error: assemblyItemsError } = await req.supabaseAdmin
        .from('items')
        .select('id')
        .eq('order_id', order.id)
        .eq('station', 'assembly');
      
      if (assemblyItemsError) {
        console.error(`Error fetching assembly items for order ${order.id}:`, assemblyItemsError);
        continue;
      }
      
      if (assemblyItems && assemblyItems.length > 0) {
        console.log(`Order ${order.id} has ${assemblyItems.length} assembly items`);
        
        try {
          // Get ALL items for this order (across all stations)
          const { data: allItems, error: allItemsError } = await req.supabaseAdmin
            .from('items')
            .select('*')
            .eq('order_id', order.id);
          
          if (allItemsError) {
            console.error(`Error fetching all items for order ${order.id}:`, allItemsError);
            continue;
          }
          
          // Add preparation status to each item
          allItems.forEach(item => {
            item.prep_status = determineItemPrepStatus(item, order, now);
            // Ensure item_status is set
            if (!item.item_status) {
              item.item_status = 'pending';
            }
          });
          
          // Group items by station
          const groupedItems = {};
          allItems.forEach(item => {
            if (!groupedItems[item.station]) {
              groupedItems[item.station] = [];
            }
            groupedItems[item.station].push(item);
          });
          
          ordersWithItems.push({
            ...order,
            items: allItems,
            groupedItems,
            order_prep_status: determineOrderStatus(order, allItems, now)
          });
        } catch (orderError) {
          console.error(`Error processing order ${order.id}:`, orderError);
        }
      }
    }
    
    // Sort orders by preparation urgency
    ordersWithItems.sort((a, b) => {
      // First prioritize orders where customer has arrived
      if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
      if (a.status !== 'in_progress' && b.status === 'in_progress') return 1;
      
      // Then by scheduled time
      const aTime = new Date(a.scheduled_at || a.order_time);
      const bTime = new Date(b.scheduled_at || b.order_time);
      return aTime - bTime;
    });
    
    console.log(`Returning ${ordersWithItems.length} orders with all items`);
    res.json(ordersWithItems);
  } catch (error) {
    console.error('Error in assembly station endpoint:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Assembly history endpoint
router.get('/assembly/history', async (req, res) => {
  try {
    // Default to showing orders from the last 24 hours
    const timeframe = req.query.timeframe || 'day';
    const now = new Date();
    let startTime = new Date(now);
    
    if (timeframe === 'day') {
      startTime.setDate(startTime.getDate() - 1);
    } else if (timeframe === 'week') {
      startTime.setDate(startTime.getDate() - 7);
    } else if (timeframe === 'month') {
      startTime.setMonth(startTime.getMonth() - 1);
    } else {
      // Default to day if invalid timeframe
      startTime.setDate(startTime.getDate() - 1);
    }
    
    console.log(`Fetching assembly history from ${startTime.toISOString()}`);
    
    // First, find completed orders with at least one assembly item
    const { data: assemblyOrderIds, error: assemblyError } = await req.supabaseAdmin
      .from('items')
      .select('order_id')
      .eq('station', 'assembly')
      .order('order_id', { ascending: false })
      .limit(50);
    
    if (assemblyError) {
      console.error('Error fetching assembly order IDs:', assemblyError);
      return res.status(500).json({ error: 'Failed to fetch completed orders' });
    }
    
    if (!assemblyOrderIds || assemblyOrderIds.length === 0) {
      return res.json([]);
    }
    
    // Extract unique order IDs
    const uniqueOrderIds = [...new Set(assemblyOrderIds.map(item => item.order_id))];
    console.log(`Found ${uniqueOrderIds.length} unique order IDs with assembly items`);
    
    // Get completed orders
    const { data: completedOrders, error: ordersError } = await req.supabaseAdmin
      .from('orders')
      .select('id, source, customer, order_time, order_number, status, scheduled_at')
      .in('id', uniqueOrderIds)
      .eq('status', 'done')
      .order('order_time', { ascending: false })
      .limit(50);
    
    if (ordersError) {
      console.error('Error fetching completed orders:', ordersError);
      return res.status(500).json({ error: 'Failed to fetch completed orders' });
    }
    
    console.log(`Found ${completedOrders.length} completed orders`);
    
    // For each completed order, get all its items
    const ordersWithItems = [];
    
    for (const order of completedOrders) {
      const { data: allItems, error: itemsError } = await req.supabaseAdmin
        .from('items')
        .select('*')
        .eq('order_id', order.id);
      
      if (itemsError) {
        console.error(`Error fetching items for completed order ${order.id}:`, itemsError);
        continue;
      }
      
      console.log(`Completed order ${order.id} has ${allItems.length} total items`);
      
      // Group items by station
      const groupedItems = {};
      allItems.forEach(item => {
        if (!groupedItems[item.station]) {
          groupedItems[item.station] = [];
        }
        groupedItems[item.station].push(item);
      });
      
      ordersWithItems.push({
        ...order,
        items: allItems,
        groupedItems: groupedItems
      });
    }
    
    console.log(`Returning ${ordersWithItems.length} completed orders with all items`);
    res.json(ordersWithItems);
  } catch (error) {
    console.error('Error in assembly history endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Grill Station endpoint
router.get('/grill', async (req, res) => {
  try {
    const now = new Date();
    const startTime = new Date(now);
    startTime.setHours(0, 0, 0, 0); // Start of day
    
    console.log(`Fetching grill orders from ${startTime.toISOString()}`);
    
    const { data: allOrders, error: ordersError } = await req.supabaseAdmin
      .from('orders')
      .select('id, source, customer, order_time, order_number, status, assigned_to, scheduled_at')
      .gte('order_time', startTime.toISOString())
      .neq('status', 'done')
      .order('scheduled_at', { ascending: true });
    
    if (ordersError) {
      console.error('Error fetching orders for grill station:', ordersError);
      return res.status(500).json({ error: 'Failed to fetch grill station data' });
    }
    
    console.log(`Found ${allOrders.length} orders before filtering for grill items`);
    
    // Get orders with grill items and determine preparation status
    const ordersWithItems = [];
    
    for (const order of allOrders) {
      try {
        const { data: grillItems, error: itemsError } = await req.supabaseAdmin
          .from('items')
          .select('*')
          .eq('order_id', order.id)
          .eq('station', 'grill');
        
        if (itemsError) {
          console.error(`Error fetching grill items for order ${order.id}:`, itemsError);
          continue;
        }
        
        if (grillItems && grillItems.length > 0) {
          console.log(`Order ${order.id} has ${grillItems.length} grill items`);
          
          // Add preparation status to each item
          grillItems.forEach(item => {
            item.prep_status = determineItemPrepStatus(item, order, now);
            // Make sure item_status exists
            if (!item.item_status) {
              item.item_status = 'pending';
            }
          });
          
          // Sort items by urgency (those that need to be prepared first)
          grillItems.sort((a, b) => {
            if (a.prep_status.includes('NOW') && !b.prep_status.includes('NOW')) return -1;
            if (!a.prep_status.includes('NOW') && b.prep_status.includes('NOW')) return 1;
            return a.preparation_time_minutes - b.preparation_time_minutes;
          });
          
          ordersWithItems.push({
            ...order,
            items: grillItems,
            order_prep_status: determineOrderStatus(order, grillItems, now)
          });
        }
      } catch (orderError) {
        console.error(`Error processing order ${order.id}:`, orderError);
      }
    }
    
    // Sort orders by preparation urgency
    ordersWithItems.sort((a, b) => {
      const aHasUrgent = a.items.some(item => item.prep_status.includes('NOW'));
      const bHasUrgent = b.items.some(item => item.prep_status.includes('NOW'));
      
      if (aHasUrgent && !bHasUrgent) return -1;
      if (!aHasUrgent && bHasUrgent) return 1;
      
      // If tie, sort by scheduled time
      const aTime = new Date(a.scheduled_at || a.order_time);
      const bTime = new Date(b.scheduled_at || b.order_time);
      return aTime - bTime;
    });
    
    console.log(`Returning ${ordersWithItems.length} orders with grill items`);
    res.json(ordersWithItems);
  } catch (error) {
    console.error('Error in grill station endpoint:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Fries Station endpoint
router.get('/fries', async (req, res) => {
  try {
    const now = new Date();
    const startTime = new Date(now);
    startTime.setHours(0, 0, 0, 0); // Start of day
    
    console.log(`Fetching fries orders from ${startTime.toISOString()}`);
    
    const { data: allOrders, error: ordersError } = await req.supabaseAdmin
      .from('orders')
      .select('id, source, customer, order_time, order_number, status, assigned_to, scheduled_at')
      .gte('order_time', startTime.toISOString())
      .neq('status', 'done')
      .order('scheduled_at', { ascending: true });
    
    if (ordersError) {
      console.error('Error fetching orders for fries station:', ordersError);
      return res.status(500).json({ error: 'Failed to fetch fries station data' });
    }
    
    console.log(`Found ${allOrders.length} orders before filtering for fries items`);
    
    // Get orders with fries items
    const ordersWithItems = [];
    
    for (const order of allOrders) {
      try {
        const { data: friesItems, error: itemsError } = await req.supabaseAdmin
          .from('items')
          .select('*')
          .eq('order_id', order.id)
          .eq('station', 'fries');
        
        if (itemsError) {
          console.error(`Error fetching fries items for order ${order.id}:`, itemsError);
          continue;
        }
        
        if (friesItems && friesItems.length > 0) {
          console.log(`Order ${order.id} has ${friesItems.length} fries items`);
          
          // Add preparation status to each item
          friesItems.forEach(item => {
            item.prep_status = determineItemPrepStatus(item, order, now);
            // Make sure item_status exists
            if (!item.item_status) {
              item.item_status = 'pending';
            }
          });
          
          // Sort items by urgency
          friesItems.sort((a, b) => {
            if (a.prep_status.includes('NOW') && !b.prep_status.includes('NOW')) return -1;
            if (!a.prep_status.includes('NOW') && b.prep_status.includes('NOW')) return 1;
            return a.preparation_time_minutes - b.preparation_time_minutes;
          });
          
          ordersWithItems.push({
            ...order,
            items: friesItems,
            order_prep_status: determineOrderStatus(order, friesItems, now)
          });
        }
      } catch (orderError) {
        console.error(`Error processing order ${order.id}:`, orderError);
      }
    }
    
    // Sort orders by preparation urgency
    ordersWithItems.sort((a, b) => {
      const aHasUrgent = a.items.some(item => item.prep_status.includes('NOW'));
      const bHasUrgent = b.items.some(item => item.prep_status.includes('NOW'));
      
      if (aHasUrgent && !bHasUrgent) return -1;
      if (!aHasUrgent && bHasUrgent) return 1;
      
      // If tie, sort by scheduled time
      const aTime = new Date(a.scheduled_at || a.order_time);
      const bTime = new Date(b.scheduled_at || b.order_time);
      return aTime - bTime;
    });
    
    console.log(`Returning ${ordersWithItems.length} orders with fries items`);
    res.json(ordersWithItems);
  } catch (error) {
    console.error('Error in fries station endpoint:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Generic Station endpoint for other stations (kitchen, etc.)
// MUST BE DEFINED LAST in the router
router.get('/:station', async (req, res) => {
  try {
    const { station } = req.params;
    const { timeframe } = req.query;
    
    // Validate station parameter
    const validStations = ['kitchen']; // Only kitchen should use this generic endpoint
    if (!validStations.includes(station)) {
      return res.status(400).json({ 
        error: 'Invalid station', 
        validStations: ['fries', 'grill', 'kitchen', 'assembly']
      });
    }
    
    // Set time range based on optional timeframe parameter (default to current day)
    const now = new Date();
    let startTime;
    
    switch (timeframe) {
      case 'hour':
        startTime = new Date(now.setHours(now.getHours() - 1));
        break;
      case 'week':
        startTime = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startTime = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'day':
      default:
        startTime = new Date(now.setHours(0, 0, 0, 0));
        break;
    }
    
    console.log(`Fetching ${station} orders from ${startTime.toISOString()}`);
    
    // Base query to get recent orders with their items
    const { data: orders, error: ordersError } = await req.supabaseAdmin
      .from('orders')
      .select('id, source, customer, order_time, scheduled_at, items!inner(*)')
      .gte('order_time', startTime.toISOString())
      .neq('status', 'done')
      .order('order_time', { ascending: false });
    
    if (ordersError) {
      console.error('Error fetching orders for station:', ordersError);
      return res.status(500).json({ error: 'Failed to fetch station data' });
    }
    
    // For other stations, aggregate item quantities
    const stationItems = {};
    let totalQuantity = 0;
    
    // Filter for items relevant to this station
    orders.forEach(order => {
      order.items.forEach(item => {
        if (item.station === station) {
          if (!stationItems[item.item_name]) {
            stationItems[item.item_name] = {
              name: item.item_name,
              total: 0,
              orders: []
            };
          }
          
          stationItems[item.item_name].total += item.quantity;
          totalQuantity += item.quantity;
          
          stationItems[item.item_name].orders.push({
            order_id: order.id,
            order_time: order.order_time,
            scheduled_at: order.scheduled_at || order.order_time,
            customer: order.customer,
            source: order.source,
            quantity: item.quantity,
            item_status: item.item_status || 'pending'
          });
        }
      });
    });
    
    res.json({
      station,
      totalQuantity,
      items: Object.values(stationItems)
    });
    
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update order status endpoint
router.put('/:station/order/:id', async (req, res) => {
  const { id } = req.params;
  const { status, assigned_to } = req.body;
  
  try {
    console.log(`Updating order ${id} with status=${status}, assigned_to=${assigned_to}`);
    
    const { data, error } = await req.supabaseAdmin
      .from('orders')
      .update({ status, assigned_to })
      .eq('id', id);
    
    if (error) {
      console.error(`Error updating order ${id}:`, error);
      return res.status(500).json({ error: 'Failed to update order' });
    }
    
    console.log(`Order ${id} updated successfully using Supabase client`);
    res.json({ success: true });
  } catch (error) {
    console.error(`Error in update order endpoint:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update item status endpoint
router.put('/item/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!status || !['pending', 'ready_to_start', 'in_progress', 'done'].includes(status)) {
    return res.status(400).json({ 
      error: 'Invalid status. Must be one of: pending, ready_to_start, in_progress, done' 
    });
  }
  
  try {
    console.log(`Updating item ${id} status to ${status}`);
    
    // First get the current item to check its station
    const { data: item, error: fetchError } = await req.supabaseAdmin
      .from('items')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error(`Error fetching item ${id}:`, fetchError);
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Update the item status
    const { data, error } = await req.supabaseAdmin
      .from('items')
      .update({ item_status: status })
      .eq('id', id);
    
    if (error) {
      console.error(`Error updating item ${id} status:`, error);
      return res.status(500).json({ error: 'Failed to update item status' });
    }
    
    console.log(`Item ${id} status updated to ${status}`);
    
    // If item is marked as done, check if we need to update dependent items
    if (status === 'done') {
      console.log(`Checking if dependent items need to be updated for item ${id}`);
      
      // The database trigger will handle the dependency logic
      // But for a immediate check, we can verify the status of other items
      if (item.station === 'grill' || item.station === 'kitchen') {
        // Check if all grill and kitchen items for this order are done
        const { data: pendingItems, error: pendingError } = await req.supabaseAdmin
          .from('items')
          .select('id')
          .eq('order_id', item.order_id)
          .in('station', ['grill', 'kitchen'])
          .neq('item_status', 'done');
        
        if (!pendingError && (!pendingItems || pendingItems.length === 0)) {
          console.log(`All grill/kitchen items for order ${item.order_id} are done. Fries items can now be prepared.`);
          
          // Update fries items (this would be done by trigger, but doing here for immediate effect)
          const { error: updateError } = await req.supabaseAdmin
            .from('items')
            .update({ item_status: 'ready_to_start' })
            .eq('order_id', item.order_id)
            .eq('station', 'fries')
            .eq('item_status', 'pending');
          
          if (updateError) {
            console.error(`Error updating fries items for order ${item.order_id}:`, updateError);
          }
        }
      } else if (item.station === 'fries') {
        // Check if all fries items for this order are done
        const { data: pendingFries, error: pendingFriesError } = await req.supabaseAdmin
          .from('items')
          .select('id')
          .eq('order_id', item.order_id)
          .eq('station', 'fries')
          .neq('item_status', 'done');
        
        if (!pendingFriesError && (!pendingFries || pendingFries.length === 0)) {
          // Also check if all grill and kitchen items are done
          const { data: pendingOther, error: pendingOtherError } = await req.supabaseAdmin
            .from('items')
            .select('id')
            .eq('order_id', item.order_id)
            .in('station', ['grill', 'kitchen'])
            .neq('item_status', 'done');
          
          if (!pendingOtherError && (!pendingOther || pendingOther.length === 0)) {
            console.log(`All items for order ${item.order_id} ready for assembly.`);
            
            // Update assembly items (this would be done by trigger, but doing here for immediate effect)
            const { error: updateError } = await req.supabaseAdmin
              .from('items')
              .update({ item_status: 'ready_to_start' })
              .eq('order_id', item.order_id)
              .eq('station', 'assembly')
              .eq('item_status', 'pending');
            
            if (updateError) {
              console.error(`Error updating assembly items for order ${item.order_id}:`, updateError);
            }
          }
        }
      }
    }
    
    res.json({ 
      success: true, 
      message: `Item ${id} status updated to ${status}` 
    });
  } catch (error) {
    console.error(`Error in update item status endpoint:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 