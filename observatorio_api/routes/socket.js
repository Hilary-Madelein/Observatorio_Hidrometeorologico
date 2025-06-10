let io;

module.exports = {
  init: (server) => {
    const { Server } = require('socket.io');
    io = new Server(server, {
      path: "/hid/socket.io/",  
      cors: {
        origin: "https://computacion.unl.edu.ec",
        methods: ["GET", "POST"],
        credentials: true
      }
    });
    return io;
  },
  getIO: () => {
    if (!io) throw new Error('Socket.io no inicializado');
    return io;
  }
};
