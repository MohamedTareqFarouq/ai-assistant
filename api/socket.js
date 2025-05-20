import { Server } from 'socket.io';

const ioHandler = (req, res) => {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    io.on('connection', (socket) => {
      console.log('🔌 A client connected:', socket.id);

      socket.on('disconnect', () => {
        console.log('❌ Client disconnected:', socket.id);
      });
    });

    res.socket.server.io = io;
  }

  res.end();
};

export default ioHandler; 