const onlineUsers = new Map();

function addUser(userId, socketId) {
    onlineUsers.set(userId, socketId);
}

function removeUser(socketId) {
    for (const [userId, id] of onlineUsers.entries()) {
        if (id === socketId) {
            onlineUsers.delete(userId);
            return userId;
        }
    }
    return null;
}

function getSocketId(userId) {
    return onlineUsers.get(userId);
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