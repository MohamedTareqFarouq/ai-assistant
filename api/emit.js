// Initialize the global messages array if it doesn't exist
if (typeof global.messages === 'undefined') {
  global.messages = [];
}

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const data = req.body;
  console.log('📨 Data received:', data);

  // Create a message object
  const message = {
    id: Date.now(),
    timestamp: Date.now(),
    content: data.message || data.body || "No message content",
    type: 'ai'
  };

  // Add the message to the global messages array
  global.messages.push(message);
  
  // Limit array size to prevent memory issues
  if (global.messages.length > 100) {
    global.messages.shift();
  }

  return res.json({ 
    status: 'success', 
    message: 'Message stored successfully' 
  });
} 