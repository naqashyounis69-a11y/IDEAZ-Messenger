const socketService = require("../services/socket.service");
const prisma = require("../config/prisma");

async function registerOnlineUser(io, socket, userId) {
    if (!userId) return;

    if (socket.userId && socket.userId !== userId) return;

    socket.userId = userId;

    socket.join(`user:${userId}`);

    socketService.addUser(userId, socket.id);

    const user = await prisma.user.update({
        where: { id: userId },
        data: { online: true },
        select: { id: true, online: true, lastSeen: true }
    }).catch(() => null);

    io.emit("users:online", socketService.getOnlineUsers());

    io.emit("user:online", {
        userId,
        online: true,
        lastSeen: user?.lastSeen || null
    });

    console.log(`🟢 User Online: ${userId}`);
}

async function unregisterOnlineUser(io, socket) {
    const removed = socketService.removeUser(socket.id);

    if (!removed || !removed.isLastConnection) return;
    const { userId } = removed;
    const lastSeen = new Date();
    await prisma.user.update({
        where: { id: userId },
        data: { online: false, lastSeen }
    }).catch(() => null);

    io.emit("users:online", socketService.getOnlineUsers());

    io.emit("user:offline", {
        userId,
        online: false,
        lastSeen: lastSeen.toISOString()
    });

    console.log(`🔴 User Offline: ${userId}`);
}

module.exports = {
    registerOnlineUser,
    unregisterOnlineUser
};
