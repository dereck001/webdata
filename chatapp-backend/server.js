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

const rooms = new Map();
const MAX_PARTICIPANTS = 6;

io.on("connection", (socket) => {
  console.log(`Connected: ${socket.id}`);

  socket.on("join-room", ({ roomId, peerId, name, mode }) => {
    socket.peerId = peerId;
    socket.roomId = roomId;
    socket.displayName = name || "Anoniem";
    socket.mode = mode || "video";

    if (!rooms.has(roomId)) {
      rooms.set(roomId, []);
    }

    const room = rooms.get(roomId);

    if (room.length >= MAX_PARTICIPANTS) {
      socket.emit(
        "room-full",
        `Room is vol (max ${MAX_PARTICIPANTS} deelnemers).`,
      );
      return;
    }

    // Send existing participants to new joiner
    const existing = room.map((s) => ({
      peerId: s.peerId,
      name: s.displayName,
      mode: s.mode,
    }));
    socket.emit("room-peers", existing);

    // Notify existing participants of new joiner
    room.forEach((s) => {
      s.emit("peer-joined", { peerId, name: socket.displayName, mode });
    });

    room.push(socket);
    socket.emit("joined", { roomId, participantCount: room.length });
    console.log(
      `${socket.displayName} joined room ${roomId} (${room.length}/${MAX_PARTICIPANTS})`,
    );
  });

  socket.on("disconnect", () => {
    const roomId = socket.roomId;
    if (!roomId || !rooms.has(roomId)) return;

    let room = rooms.get(roomId);
    room = room.filter((s) => s.id !== socket.id);

    if (room.length === 0) {
      rooms.delete(roomId);
      console.log(`Room deleted: ${roomId}`);
    } else {
      rooms.set(roomId, room);
      room.forEach((s) => {
        s.emit("peer-left", {
          peerId: socket.peerId,
          name: socket.displayName,
        });
      });
    }
    console.log(`Disconnected: ${socket.displayName} from ${roomId}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
