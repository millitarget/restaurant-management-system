// api-config.js
// This file provides API URL configuration based on the environment

const API_CONFIG = {
  // In development, the server runs at localhost:3000
  // In production (Vercel), use relative path with /api prefix
  getBaseUrl: function() {
    // Check if we're in a production-like environment
    if (window.location.hostname !== 'localhost' && 
        window.location.hostname !== '127.0.0.1') {
      // In production, use relative API paths with the /api prefix
      return '/api';
    } else {
      // In development, use the local server
      return 'http://localhost:3000';
    }
  },
  
  // Helper function to build API endpoints
  getUrl: function(endpoint) {
    return `${this.getBaseUrl()}${endpoint}`;
  },
  
  // Example usage:
  // fetchOrders: async function() {
  //   const response = await fetch(this.getUrl('/orders'));
  //   return response.json();
  // }
}; 