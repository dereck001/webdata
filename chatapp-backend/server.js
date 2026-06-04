const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const rooms = new Map(); // roomId -> { host: socket, guest: socket|null }

io.on("connection", (socket) => {
  console.log(`Verbonden: ${socket.id}`);

  socket.on("join-room", ({ roomId, peerId }) => {
    socket.peerId = peerId;
    socket.roomId = roomId;

    if (!rooms.has(roomId)) {
      // Eerste persoon = host
      rooms.set(roomId, { host: socket, guest: null });
      socket.emit("waiting", "Wachten op deelnemer...");
      console.log(`Room aangemaakt: ${roomId}`);
    } else {
      const room = rooms.get(roomId);
      if (room.guest) {
        socket.emit("room-full", "Deze room is al vol.");
        return;
      }
      // Tweede persoon = guest, start de call
      room.guest = socket;
      room.host.emit("matched", { partnerId: peerId, initiator: true });
      socket.emit("matched", { partnerId: room.host.peerId, initiator: false });
      console.log(`Match in room ${roomId}: ${room.host.peerId} <-> ${peerId}`);
    }
  });

  socket.on("disconnect", () => {
    const roomId = socket.roomId;
    if (!roomId || !rooms.has(roomId)) return;

    const room = rooms.get(roomId);
    // Stuur de andere persoon een melding
    if (room.host?.id === socket.id && room.guest) {
      room.guest.emit("peer-left", "De host heeft de call verlaten.");
    } else if (room.guest?.id === socket.id && room.host) {
      room.host.emit("peer-left", "De gast heeft de call verlaten.");
    }
    rooms.delete(roomId);
    console.log(`Room verwijderd: ${roomId}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Backend draait op poort ${PORT}`));
