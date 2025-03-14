// Optional thermal printer integration
const ThermalPrinter = require('node-thermal-printer').printer;
const PrinterTypes = require('node-thermal-printer').types;

// Check if printer configuration exists
const isPrinterConfigured = () => {
  return process.env.PRINTER_DEVICE_PATH && process.env.PRINTER_TYPE;
};

// Initialize printer
const initPrinter = () => {
  if (!isPrinterConfigured()) {
    return null;
  }
  
  let printer;
  
  try {
    printer = new ThermalPrinter({
      type: process.env.PRINTER_TYPE === 'epson' ? PrinterTypes.EPSON : PrinterTypes.STAR,
      interface: process.env.PRINTER_DEVICE_PATH,
      options: {
        timeout: 5000
      }
    });
    
    return printer;
  } catch (error) {
    console.error('Failed to initialize printer:', error);
    return null;
  }
};

// Print an order for a specific station
const printStationOrder = async (order, items, station) => {
  if (!isPrinterConfigured()) {
    console.log('Printer not configured, skipping print');
    return false;
  }
  
  const printer = initPrinter();
  if (!printer) {
    return false;
  }
  
  try {
    // Filter items for this station
    const stationItems = items.filter(item => item.station === station);
    
    if (stationItems.length === 0) {
      return false; // No items for this station
    }
    
    // Start printing
    printer.clear();
    printer.alignCenter();
    printer.bold(true);
    printer.setTextSize(1, 1);
    printer.println(`ORDER #${order.id}`);
    printer.println(`STATION: ${station.toUpperCase()}`);
    printer.bold(false);
    printer.drawLine();
    
    printer.alignLeft();
    printer.println(`Time: ${new Date(order.order_time).toLocaleTimeString()}`);
    printer.println(`Source: ${order.source}`);
    if (order.customer) {
      printer.println(`Customer: ${order.customer}`);
    }
    printer.drawLine();
    
    printer.bold(true);
    printer.println('ITEMS:');
    printer.bold(false);
    
    stationItems.forEach(item => {
      printer.println(`${item.quantity}x ${item.item_name}`);
    });
    
    printer.drawLine();
    printer.cut();
    
    // Execute print
    await printer.execute();
    console.log(`Order #${order.id} printed for station ${station}`);
    return true;
  } catch (error) {
    console.error('Error printing order:', error);
    return false;
  }
};

module.exports = {
  printStationOrder
}; 