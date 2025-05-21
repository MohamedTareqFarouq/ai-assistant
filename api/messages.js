// Simple in-memory message store (this will be reset on cold starts)
// In a production app, you'd use a database instead
export const messages = [];

// Initialize the global messages array if it doesn't exist
if (typeof global.messages === 'undefined') {
  global.messages = messages;
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
  
  // GET - retrieve messages
  if (req.method === 'GET') {
    const since = req.query.since ? parseInt(req.query.since, 10) : 0;
    
    // Add a mock message if no messages exist (for testing)
    if (global.messages.length === 0 && since === 0) {
      global.messages.push({
        id: Date.now(),
        timestamp: Date.now(),
        content: "Welcome to the AI Assistant! Your messages will appear here.",
        type: 'ai'
      });
    }
    
    // Filter to only return messages newer than the timestamp
    const newMessages = global.messages.filter(msg => msg.timestamp > since);
    
    // Get the latest timestamp
    const lastTimestamp = newMessages.length > 0 
      ? newMessages[newMessages.length - 1].timestamp 
      : since;
    
    return res.status(200).json({
      messages: newMessages,
      lastTimestamp
    });
  }
  
  // Handle POST requests to add messages (for testing)
  if (req.method === 'POST') {
    try {
      const message = {
        id: Date.now(),
        timestamp: Date.now(),
        content: req.body.message || "Test message",
        type: req.body.type || 'ai'
      };
      
      global.messages.push(message);
      
      // Limit array size to prevent memory issues
      if (global.messages.length > 100) {
        global.messages.shift();
      }
      
      return res.status(200).json({ success: true, message });
    } catch (error) {
      return res.status(400).json({ error: 'Invalid message data' });
    }
  }
  
  // Handle unimplemented methods
  return res.status(405).json({ message: 'Method not allowed' });
} 