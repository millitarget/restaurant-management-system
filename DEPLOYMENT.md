# Restaurant Order Management System - Deployment Guide

This guide will help you deploy the Restaurant Order Management System to production.

## Prerequisites

- Node.js (v14+)
- Supabase account (sign up at https://supabase.com)
- WINREST POS system (for in-person orders)
- Make.com account (for WhatsApp integration)

## 1. Supabase Setup

1. Create a new Supabase project:
   - Go to https://supabase.com and sign in
   - Click "New Project" and follow the setup wizard
   - Take note of your Supabase URL and anon key

2. Run the database schema:
   - Go to your Supabase project's SQL Editor
   - Copy and paste the contents of `backend/supabase-schema.sql`
   - Execute the SQL to create your tables and functions

3. Enable real-time functionality:
   - Go to "Database" > "Replication" in your Supabase dashboard
   - Ensure that the "orders" and "items" tables are enabled for real-time

## 2. Backend Setup

1. Configure environment variables:
   - Edit the `.env` file in the `backend` directory
   - Replace `your_supabase_url` with your actual Supabase URL
   - Replace `your_supabase_anon_key` with your actual Supabase anon key
   - If using thermal printers, uncomment and set the printer configuration

2. Install dependencies:
   ```
   cd backend
   npm install
   ```

3. Test the backend locally:
   ```
   npm start
   ```
   
4. Deploy to your server:
   - Copy the entire `backend` directory to your server
   - Install dependencies with `npm install --production`
   - Start the server with your preferred process manager (PM2, systemd, etc.)
   - Ensure your server has the appropriate environment variables set

## 3. Frontend Setup

1. Configure Supabase client:
   - Edit `frontend/public/supabase-client.js`
   - Replace the Supabase URL and key with your actual credentials
   - Save the changes

2. Test locally:
   ```
   cd frontend
   npx http-server public -c-1 -p 8080
   ```
   
3. Deploy to your server:
   - Copy the `frontend/public` directory to your web server
   - Configure your web server (nginx, Apache, etc.) to serve the static files

## 4. Integration Setup

### Make.com (WhatsApp Integration)

1. Create a new scenario in Make.com:
   - Use Botpress as a trigger (or any WhatsApp integration)
   - Add an HTTP POST action to your backend's `/orders` endpoint
   - Format the JSON payload as shown in the example below

2. Example order payload:
   ```json
   {
     "source": "whatsapp",
     "customer": "Customer Name",
     "items": [
       {
         "name": "French Fries",
         "quantity": 2,
         "station": "fries"
       },
       {
         "name": "Grilled Chicken",
         "quantity": 1,
         "station": "grill"
       }
     ]
   }
   ```

### WINREST POS Integration

Choose one of these methods:

1. **Manual CSV Import**:
   - Export orders from WINREST to CSV periodically
   - Create a script to transform and import these into the system

2. **Print Stream Capture**:
   - Capture the print stream from WINREST
   - Parse the receipt data and send it to your API

## 5. Station Displays

Set up displays at each station in your restaurant:

1. Configure each device to load the appropriate URL:
   - Fries Station: `http://your-server/fries.html`
   - Grill Station: `http://your-server/grill.html`
   - Kitchen Station: `http://your-server/kitchen.html`
   - Assembly Stations: `http://your-server/assembly.html`

2. For best results:
   - Use a device that can be mounted securely at each station
   - Configure the browser to run in kiosk mode (full screen)
   - Set the browser to automatically refresh if connection is lost
   - Consider using a dedicated display solution like a tablet or digital signage system

## 6. Thermal Printer Integration (Optional)

If you want to use thermal printers:

1. Install the printer drivers on your server
2. Set the appropriate environment variables:
   ```
   PRINTER_DEVICE_PATH=/dev/usb/lp0  # Path to your printer device
   PRINTER_TYPE=epson                # Or "star" depending on your printer
   ```
3. Test printing with a small order

## 7. Monitoring and Maintenance

1. Monitor backend logs for errors
2. Set up a system to automatically restart the backend if it crashes
3. Create regular backups of your Supabase database
4. Consider setting up alerts for system issues

## Troubleshooting

- **Connection Issues**: Ensure your firewall allows connections to/from Supabase
- **Real-time Updates Not Working**: Verify that Supabase real-time is enabled for your tables
- **Backend Crashes**: Check the logs for error messages
- **Station Displays Not Updating**: Check browser console for JavaScript errors

For more detailed help, refer to the main README.md file or contact the system administrators. 