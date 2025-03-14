// Mock data for local testing
const now = new Date();

// Helper to create a date with offset in minutes
function getTimeWithOffset(minutesOffset) {
  const date = new Date(now);
  date.setMinutes(date.getMinutes() - minutesOffset);
  return date.toISOString();
}

// Mock orders
const orders = [
  {
    id: 1,
    source: 'whatsapp',
    customer: 'João Silva',
    order_time: getTimeWithOffset(5),
    items: [
      { id: 1, order_id: 1, item_name: 'French Fries', quantity: 2, station: 'fries' },
      { id: 2, order_id: 1, item_name: 'Chicken Wings', quantity: 1, station: 'grill' },
      { id: 3, order_id: 1, item_name: 'White Rice', quantity: 1, station: 'kitchen' }
    ]
  },
  {
    id: 2,
    source: 'pos',
    customer: 'Maria Oliveira',
    order_time: getTimeWithOffset(12),
    items: [
      { id: 4, order_id: 2, item_name: 'Sweet Potato Fries', quantity: 1, station: 'fries' },
      { id: 5, order_id: 2, item_name: 'Steak', quantity: 2, station: 'grill' },
      { id: 6, order_id: 2, item_name: 'Salad', quantity: 1, station: 'kitchen' }
    ]
  },
  {
    id: 3,
    source: 'whatsapp',
    customer: 'Carlos Ferreira',
    order_time: getTimeWithOffset(18),
    items: [
      { id: 7, order_id: 3, item_name: 'Curly Fries', quantity: 3, station: 'fries' },
      { id: 8, order_id: 3, item_name: 'Pork Ribs', quantity: 2, station: 'grill' },
      { id: 9, order_id: 3, item_name: 'Brown Rice', quantity: 2, station: 'kitchen' }
    ]
  },
  {
    id: 4,
    source: 'pos',
    customer: null,
    order_time: getTimeWithOffset(25),
    items: [
      { id: 10, order_id: 4, item_name: 'French Fries', quantity: 2, station: 'fries' },
      { id: 11, order_id: 4, item_name: 'Beef Skewer', quantity: 3, station: 'grill' }
    ]
  }
];

// Helper to generate station-specific data
function generateStationData(stationName) {
  if (stationName === 'assembly') {
    return orders;
  }

  const stationItems = {};
  let totalQuantity = 0;

  orders.forEach(order => {
    order.items.forEach(item => {
      if (item.station === stationName) {
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
          customer: order.customer,
          source: order.source,
          quantity: item.quantity
        });
      }
    });
  });

  return {
    station: stationName,
    totalQuantity,
    items: Object.values(stationItems)
  };
}

module.exports = {
  orders,
  generateStationData
}; 