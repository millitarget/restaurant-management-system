-- Create orders table
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  customer TEXT,
  order_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  order_number TEXT,
  status TEXT DEFAULT 'pending',
  assigned_to TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Create items table
CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  station TEXT NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_items_order_id ON items(order_id);
CREATE INDEX idx_items_station ON items(station);
CREATE INDEX idx_orders_time ON orders(order_time);

-- Enable Row Level Security (RLS)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (for station screens)
CREATE POLICY "Public read access for orders"
  ON orders FOR SELECT
  USING (true);

CREATE POLICY "Public read access for items"
  ON items FOR SELECT
  USING (true);

-- Only authenticated requests can insert new orders
CREATE POLICY "Auth insert access for orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Auth insert access for items"
  ON items FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create a function to notify on new orders via Supabase realtime
CREATE OR REPLACE FUNCTION notify_on_order_insert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('new_order', json_build_object(
    'id', NEW.id,
    'source', NEW.source,
    'time', NEW.order_time
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the notification function
CREATE TRIGGER order_inserted
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_on_order_insert();

-- Enable Supabase realtime for the tables
ALTER PUBLICATION supabase_realtime ADD TABLE orders, items; 