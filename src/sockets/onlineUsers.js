const socketService = require("../services/socket.service");

function registerOnlineUser(io, socket, userId) {
    if (!userId) return;

    socket.userId = userId;

    socket.join(`user:${userId}`);

    socketService.addUser(userId, socket.id);

    io.emit("users:online", socketService.getOnlineUsers());

    socket.broadcast.emit("user:online", {
        userId
    });

    console.log(`🟢 User Online: ${userId}`);
}

function unregisterOnlineUser(io, socket) {
    const userId = socketService.removeUser(socket.id);

    if (!userId) return;

    io.emit("users:online", socketService.getOnlineUsers());

    socket.broadcast.emit("user:offline", {
        userId,
        lastSeen: new Date().toISOString()
    });

    console.log(`🔴 User Offline: ${userId}`);
}

module.exports = {
    registerOnlineUser,
    unregisterOnlineUser
};