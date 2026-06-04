const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors()); 

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

let waitingUsers = [];

io.on('connection', (socket) => {
    console.log(`Gebruiker verbonden: ${socket.id}`);

    socket.on('join-matchmaking', (peerId) => {
        socket.peerId = peerId;

        if (waitingUsers.length > 0) {
            const partnerSocket = waitingUsers.shift();
            socket.emit('matched', { partnerId: partnerSocket.peerId, initiator: true });
            partnerSocket.emit('matched', { partnerId: socket.peerId, initiator: false });
            console.log(`Match: ${socket.peerId} <-> ${partnerSocket.peerId}`);
        } else {
            waitingUsers.push(socket);
            socket.emit('waiting', 'Wachten op een beschikbare vreemde...');
        }
    });

    socket.on('disconnect', () => {
        waitingUsers = waitingUsers.filter(s => s.id !== socket.id);
        console.log(`Gebruiker verbroken: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Backend draait live op poort ${PORT}`);
});

