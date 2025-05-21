// Simple in-memory message store
// In a production app, you'd use a database instead
export const messages = [];

// Store messages in global scope to share between serverless functions
if (!global.messages) {
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
  
  // Handle unimplemented methods
  return res.status(405).json({ message: 'Method not allowed' });
} 