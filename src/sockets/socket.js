const {
    registerOnlineUser,
    unregisterOnlineUser,
} = require("./onlineUsers");

const {
    registerMessageSocket,
} = require("./message.socket");

function initializeSocket(io) {

    io.on("connection", (socket) => {

        console.log("🟢 Socket Connected:", socket.id);

        /*
        ==========================================
        USER LOGIN
        ==========================================
        */

        socket.on("user:login", (userId) => {

            registerOnlineUser(
                io,
                socket,
                userId
            );

        });

        socket.on("join-user", (userId) => {

            registerOnlineUser(
                io,
                socket,
                userId
            );

        });

        /*
        ==========================================
        MESSAGE EVENTS
        ==========================================
        */

        registerMessageSocket(
            io,
            socket
        );

        /*
        ==========================================
        DISCONNECT
        ==========================================
        */

        socket.on("disconnect", () => {

            unregisterOnlineUser(
                io,
                socket
            );

            console.log(
                "🔴 Socket Disconnected:",
                socket.id
            );

        });

    });

}

module.exports = initializeSocket;