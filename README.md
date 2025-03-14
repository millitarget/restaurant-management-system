# Restaurant Order Management System

A complete order management system for restaurants that aggregates orders from WhatsApp (via Botpress and Make.com) and in-person orders (via WINREST POS), displaying them on station-specific screens in real-time.

## Features

- **Multiple Order Sources**: Accepts orders from WhatsApp (via Botpress/Make.com) and in-person POS (WINREST)
- **Real-time Updates**: Instant updates to all station screens using Supabase real-time subscriptions
- **Station-specific Views**: Dedicated screens for:
  - Potato Fryers (fries)
  - Barbecue Grill (meats)
  - Kitchen (rice/salads)
  - Assembly stations (complete order details)
- **Thermal Printer Integration**: Optional printing of order tickets for specific stations
- **Aggregated Data**: Shows aggregated item counts and order details

## System Architecture

- **Frontend**: Simple HTML/CSS/JavaScript for station displays
- **Backend**: Node.js with Express API
- **Database**: Supabase (PostgreSQL with real-time capabilities)
- **Integration Points**:
  - Make.com webhook for WhatsApp orders
  - WINREST POS integration

## Prerequisites

- Node.js (v14+)
- Supabase account
- WINREST POS system (for in-person orders)
- Make.com account (for WhatsApp integration)

## Installation

### 1. Supabase Setup

1. Create a new Supabase project
2. Run the SQL queries in `backend/supabase-schema.sql` in the Supabase SQL editor
3. Enable realtime functionality for the tables

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file from example
cp .env.example .env

# Update .env with your Supabase credentials
# Edit .env file to add your Supabase URL and key
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Update Supabase credentials
# Edit src/supabase-client.js to add your Supabase URL and key
```

## Running the System

### Start the Backend

```bash
cd backend
npm start
```

The API server will run on http://localhost:3000

### Start the Frontend

```bash
cd frontend
npm start
```

The frontend server will run on http://localhost:8080

### Access Station Screens

- Fries Station: http://localhost:8080/fries.html
- Grill Station: http://localhost:8080/grill.html
- Kitchen Station: http://localhost:8080/kitchen.html
- Assembly Station: http://localhost:8080/assembly.html

## API Endpoints

- `POST /orders` - Create a new order
- `GET /orders` - Get all orders (with optional filtering)
- `GET /orders/:id` - Get a specific order
- `GET /stations/:station` - Get data for a specific station

## Integrations

### Make.com (for WhatsApp Orders)

1. Create a new scenario in Make.com
2. Use Botpress as a trigger
3. Set up an HTTP POST action to send order data to `http://your-api-url/orders`
4. Format the JSON payload as:

```json
{
  "source": "whatsapp",
  "customer": "Customer Name",
  "items": [
    {
      "name": "Item Name",
      "quantity": 2,
      "station": "fries"
    },
    {
      "name": "Another Item",
      "quantity": 1,
      "station": "grill"
    }
  ]
}
```

### WINREST POS Integration

Two options are available:

1. **Manual CSV Import**: Export orders data from WINREST and import using a script
2. **Print Stream Capture**: Integrate with the existing printer data stream

## License

This project is licensed under the MIT License. 