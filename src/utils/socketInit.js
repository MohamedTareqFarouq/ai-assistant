import io from 'socket.io-client';

// Ensure socket is initialized
let socket;

export const initSocket = async () => {
  if (!socket) {
    // In production, need to initialize the socket first
    if (process.env.NODE_ENV === 'production') {
      await fetch('/api/socket');
    }
    
    const socketUrl = process.env.NODE_ENV === 'production' 
      ? window.location.origin 
      : 'http://localhost:3000';
      
    socket = io(socketUrl, {
      path: '/api/socket',
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    console.log('Socket initialized');
  }
  
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    throw new Error('Socket not initialized. Call initSocket() first.');
  }
  return socket;
}; 