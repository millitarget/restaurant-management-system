// Supabase client initialization
const supabaseUrl = 'https://mwjijtujxhsirwtyivcc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13amlqdHVqeGhzaXJ3dHlpdmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3MDQ5NzMsImV4cCI6MjA1NzI4MDk3M30.CN0FcWSQGmagq7wbj1Lrm9ZKGhTHYjWyWL09tOpZpXA';

// Initialize the Supabase client - use the global supabaseJs object correctly
const supabase = supabaseJs.createClient(supabaseUrl, supabaseKey);

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
  return supabase
    .channel(`public:${table}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table }, payload => {
      callback(payload.new);
    })
    .subscribe();
} 