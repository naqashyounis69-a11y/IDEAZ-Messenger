const onlineUsers = new Map();

function addUser(userId, socketId) {
    const sockets = onlineUsers.get(userId) || new Set();
    sockets.add(socketId);
    onlineUsers.set(userId, sockets);
}

function removeUser(socketId) {
    for (const [userId, sockets] of onlineUsers.entries()) {
        if (sockets.has(socketId)) {
            sockets.delete(socketId);
            const isLastConnection = sockets.size === 0;
            if (isLastConnection) onlineUsers.delete(userId);
            return { userId, isLastConnection };
        }
    }
    return null;
}

function getSocketId(userId) {
    return onlineUsers.get(userId)?.values().next().value;
}

function isOnline(userId) {
    return onlineUsers.has(userId);
}

function getOnlineUsers() {
    return [...onlineUsers.keys()];
}

module.exports = {
    addUser,
    removeUser,
    getSocketId,
    isOnline,
    getOnlineUsers
};
