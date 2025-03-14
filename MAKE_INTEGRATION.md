# Make.com Integration for WhatsApp Orders

This document describes how to set up a Make.com (formerly Integromat) scenario to receive orders from Botpress WhatsApp conversations and send them to our Restaurant Order Management system.

## Overview

The Make.com scenario will:
1. Receive webhook data from Botpress containing order information
2. Transform the data into the format expected by our API
3. Map the items to appropriate stations
4. Send the order to our backend API

## Setup Instructions

### 1. Create a New Scenario in Make.com

1. Sign in to your Make.com account
2. Click "Create a new scenario"
3. Start with a webhook trigger module

### 2. Configure the Webhook Trigger

1. Add a "Custom webhook" trigger
2. Copy the webhook URL provided by Make.com
3. Configure Botpress to send the `bookingData` payload to this webhook URL when an order is completed

### 3. Add a JSON Parser Module

1. Connect a "JSON Parser" module to the webhook
2. Configure it to parse the incoming webhook data
3. Use `{{1.body}}` as the source data to parse

### 4. Add a Router Module

1. Connect a "Router" module to handle different order types
2. Set up a route for WhatsApp orders 

### 5. Add an Array Aggregator Module

1. Add an "Array Aggregator" module to collect all the items
2. Configure it to iterate through the following fields from `bookingData`:
   - `carne1` through `carne6` (with associated `quantCarne1`, etc.)
   - `acompanhamento1` through `acompanhamento6` (with associated `qtacompanhamento1`, etc.)
   - `salada1` through `salada3` (with associated `qtsalada1`, etc.)
   - `bebida1` through `bebida2` (with associated `qtbebida1`, etc.)

### 6. Add a Data Mapping Function

Create a JavaScript code module to map the items to stations:

```javascript
// Input data: bookingData from Botpress
const items = [];

// Process meat items
for (let i = 1; i <= 6; i++) {
  const meatItem = data['carne' + i];
  const meatQty = parseInt(data['quantCarne' + i] || 0);
  const sauce1 = data['molho' + i];
  const sauce2 = data['molho' + (i * 10 + i)];
  
  if (meatItem && meatQty > 0) {
    let itemName = meatItem;
    if (sauce1) itemName += ` with ${sauce1}`;
    if (sauce2) itemName += ` and ${sauce2}`;
    
    items.push({
      name: itemName,
      quantity: meatQty,
      station: "grill"
    });
  }
}

// Process sides
for (let i = 1; i <= 6; i++) {
  const side = data['acompanhamento' + i];
  const sideQty = parseInt(data['qtacompanhamento' + i] || 0);
  
  if (side && sideQty > 0) {
    const station = side.toLowerCase().includes('fries') || 
                   side.toLowerCase().includes('batata') ? 
                   "fryers" : "kitchen";
    
    items.push({
      name: side,
      quantity: sideQty,
      station: station
    });
  }
}

// Process salads
for (let i = 1; i <= 3; i++) {
  const salad = data['salada' + i];
  const saladQty = parseInt(data['qtsalada' + i] || 0);
  const saladDressing = data['tempero_salada' + i];
  
  if (salad && saladQty > 0) {
    let itemName = salad;
    if (saladDressing) itemName += ` with ${saladDressing}`;
    
    items.push({
      name: itemName,
      quantity: saladQty,
      station: "kitchen"
    });
  }
}

// Process drinks
for (let i = 1; i <= 2; i++) {
  const drink = data['bebida' + i];
  const drinkQty = parseInt(data['qtbebida' + i] || 0);
  
  if (drink && drinkQty > 0) {
    items.push({
      name: drink,
      quantity: drinkQty,
      station: "assembly"
    });
  }
}

// Return mapped order data
return {
  source: "WhatsApp",
  customer: data.name || data.nameautomatico || data.telephone,
  scheduled_at: data.chosenTime || new Date().toISOString(),
  order_number: null,
  status: "pending",
  assigned_to: null,
  items: items
};
```

### 7. Add an HTTP Module to Send the Order

1. Add an "HTTP" module
2. Configure it to make a POST request to your API endpoint:
   - URL: `https://your-restaurant-api.com/orders`
   - Method: POST
   - Headers: `{ "Content-Type": "application/json" }`
   - Body: Mapped data from the previous step

### 8. Add Error Handling

1. Add error handling to your scenario
2. Configure notifications for failed orders
3. Set up retries for transient failures

### 9. Test the Integration

1. Manually trigger the webhook or complete a test order in Botpress
2. Check the execution log in Make.com to verify data transformation
3. Confirm the order appears in your Restaurant Management System

## Customizing the Integration

You can customize the data mapping based on your specific menu items and station assignments. Update the JavaScript code in step 6 to match your restaurant's specific needs.

## Troubleshooting

If you encounter issues with the integration:

1. Check the webhook payload format from Botpress
2. Verify that the data mapping correctly transforms the data
3. Check the API endpoint URL and authentication
4. Review the Make.com execution logs for detailed error messages

## Best Practices

1. Always validate incoming data
2. Add logging to track order flow
3. Set up alerts for failed integrations
4. Test with different order combinations
5. Create a fallback mechanism for orders that fail to process 