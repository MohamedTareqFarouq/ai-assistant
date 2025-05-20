export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const data = req.body;
  console.log('📨 Data received from n8n:', data);

  // Get the Socket.IO server instance
  const io = res.socket.server.io;

  if (io) {
    io.emit('n8n-message', data);
    return res.json({ status: 'emitted', data });
  }

  return res.status(500).json({ message: 'Socket.IO server not initialized' });
} 