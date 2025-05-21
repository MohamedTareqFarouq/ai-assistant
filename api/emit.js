// Import messages array from the messages endpoint
import { messages } from './messages';

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

  // If using the imported messages array, use that
  if (global.messages) {
    global.messages.push(message);
    
    // Limit array size to prevent memory issues
    if (global.messages.length > 100) {
      global.messages.shift();
    }
  } else {
    // Otherwise use the module-scoped messages array
    const messagesModule = require('./messages');
    if (messagesModule.messages) {
      messagesModule.messages.push(message);
      
      // Limit array size
      if (messagesModule.messages.length > 100) {
        messagesModule.messages.shift();
      }
    }
  }

  return res.json({ 
    status: 'success', 
    message: 'Message stored successfully' 
  });
} 