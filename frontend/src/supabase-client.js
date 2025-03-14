// Supabase client initialization
const supabaseUrl = 'https://your-supabase-project-url.supabase.co';
const supabaseKey = 'your-supabase-anon-key';

// Mock Supabase client for local testing
const supabase = {
  createClient: function() {
    return {
      channel: function(channelName) {
        return {
          on: function(event, filter, callback) {
            // Just return this for chaining
            return this;
          },
          subscribe: function() {
            console.log('Subscribed to mock channel:', channelName);
            return this;
          }
        };
      }
    };
  }
};

// Format date/time for display
function formatDateTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Format just the time for display
function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Helper to create a station tag with color
function createStationTag(station) {
  const stationColors = {
    'fries': '#FF9800',  // Orange
    'grill': '#F44336',  // Red
    'kitchen': '#4CAF50', // Green
    'assembly': '#2196F3' // Blue
  };
  
  const tag = document.createElement('span');
  tag.className = 'station-tag';
  tag.textContent = station;
  tag.style.backgroundColor = stationColors[station] || '#9E9E9E';
  return tag;
}

// Helper to create a source badge
function createSourceBadge(source) {
  const badge = document.createElement('span');
  badge.className = 'source-badge';
  badge.textContent = source.toUpperCase();
  
  // Different color for different sources
  if (source.toLowerCase() === 'whatsapp') {
    badge.style.backgroundColor = '#25D366';
  } else if (source.toLowerCase() === 'winrest' || source.toLowerCase() === 'pos') {
    badge.style.backgroundColor = '#3a86ff';
  }
  
  return badge;
}

// Subscribe to real-time updates for a table
function subscribeToChanges(table, callback) {
  console.log('Setting up mock subscription to', table);
  // This is a mock implementation that doesn't actually subscribe
  // In a real implementation, this would use Supabase's real-time subscription
  return {
    unsubscribe: function() {
      console.log('Unsubscribed from mock channel:', table);
    }
  };
} 