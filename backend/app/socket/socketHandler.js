// app/socket/socketHandler.js

const { Server } = require('socket.io');
const ROLES = require('../../constants/roles');

let io;

function initSocket(server) {
    io = new Server(server, {
        cors: {
            origin:  process.env.CLIENT_URL || '*',
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', (socket) => {
        const { user_id, role_id, branch_id } = socket.handshake.auth;

        if (!user_id || !role_id) {
            socket.disconnect();
            return;
        }

        // Requestors join a private room for real-time status updates
        // on their own blood requests
        if (role_id === ROLES.REQUESTOR) {
            socket.join(`user_${user_id}`);
        }

        // Staff and field roles join branch room
        if (branch_id) {
            socket.join(`branch_${branch_id}`);
        }

        // Admins also join global room
        if (role_id === ROLES.ADMIN) {
            socket.join('admin_global');
        }

        socket.on('disconnect', () => {});
    });
}

function emitToRoom(room, event, data) {
    if (!io) return;
    io.to(room).emit(event, data);
}

function getIO() {
    return io;
}

module.exports = { initSocket, emitToRoom, getIO };