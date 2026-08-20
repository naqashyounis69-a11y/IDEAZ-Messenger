const {
    registerOnlineUser,
    unregisterOnlineUser,
} = require("./onlineUsers");

const {
    registerMessageSocket,
} = require("./message.socket");

const {
    registerCallSocket,
} = require("./call.socket");

function initializeSocket(io) {

    io.on("connection", (socket) => {

        console.log("🟢 Socket Connected:", socket.id);

        /*
        ==========================================
        USER LOGIN
        ==========================================
        */

        socket.on("user:login", async (userId) => {

            await registerOnlineUser(
                io,
                socket,
                userId
            );

        });

        socket.on("join-user", async (userId) => {

            await registerOnlineUser(
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

        registerCallSocket(
            io,
            socket
        );

        /*
        ==========================================
        DISCONNECT
        ==========================================
        */

        socket.on("disconnect", async () => {

            await unregisterOnlineUser(
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
