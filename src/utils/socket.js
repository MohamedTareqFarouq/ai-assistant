import io from 'socket.io-client';

// In development, connect to localhost, in production use the deployment URL
const SOCKET_URL = process.env.NODE_ENV === 'production' 
  ? window.location.origin 
  : 'http://localhost:3000';

export const socket = io(SOCKET_URL, {
  path: '/api/socket',
  addTrailingSlash: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
}); 