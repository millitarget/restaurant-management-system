require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// Import routes
const ordersRoutes = require('./routes/orders');
const stationsRoutes = require('./routes/stations');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase clients
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || supabaseKey;

// Regular client for authenticated operations
const supabase = createClient(supabaseUrl, supabaseKey);

// Admin client for bypassing RLS policies
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Log environment settings
console.log(`Supabase URL: ${supabaseUrl}`);
console.log(`Supabase Key is set: ${!!supabaseKey}`);
console.log(`Supabase Service Key is set: ${!!supabaseServiceKey}`);

// Middleware
app.use(cors());
app.use(express.json());

// Make supabase clients available to routes
app.use((req, res, next) => {
  req.supabase = supabase;
  req.supabaseAdmin = supabaseAdmin;
  next();
});

// Routes
app.use('/orders', ordersRoutes);
app.use('/stations', stationsRoutes);

// Home route
app.get('/', (req, res) => {
  res.json({ message: 'Restaurant Order Management API' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Connected to Supabase at ${supabaseUrl}`);
}); 