const http = require("http");
const { Server } = require("socket.io");
const dotenv = require("dotenv");
const { PrismaClient } = require("@prisma/client");

dotenv.config();

const app = require("./src/app");
const initializeSocket = require("./src/sockets/socket");

const prisma = new PrismaClient();

const PORT =
  Number(process.env.PORT) || 3000;

const HOST = "0.0.0.0";

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
    ],
  },

  transports: [
    "websocket",
    "polling",
  ],

  maxHttpBufferSize:
    Number(process.env.MAX_FILE_SIZE) ||
    100 * 1024 * 1024,
});

/*
|--------------------------------------------------------------------------
| Socket.IO
|--------------------------------------------------------------------------
*/

initializeSocket(io);

/*
|--------------------------------------------------------------------------
| Controllers ke liye Socket.IO
|--------------------------------------------------------------------------
*/

app.set("io", io);

/*
|--------------------------------------------------------------------------
| Server Start
|--------------------------------------------------------------------------
*/

async function startServer() {
  try {
    await prisma.$connect();

    console.log(
      "PostgreSQL database connected successfully."
    );

    server.listen(
      PORT,
      HOST,
      function serverStarted() {
        console.log(
          "======================================="
        );

        console.log(
          "      IDEAZ Messenger Server"
        );

        console.log(
          "======================================="
        );

        console.log(
          "Server Running Successfully ✅"
        );

        console.log("");

        console.log(
          `Local: http://localhost:${PORT}`
        );

        console.log(
          `Network: http://192.168.10.4:${PORT}`
        );

        console.log(
          `Health: http://localhost:${PORT}/health`
        );

        console.log(
          "======================================="
        );
      }
    );
  } catch (error) {
    console.error(
      "Server startup failed:"
    );

    console.error(error);

    process.exit(1);
  }
}

/*
|--------------------------------------------------------------------------
| Graceful Shutdown
|--------------------------------------------------------------------------
*/

async function shutdown(signal) {
  console.log(
    `${signal} received. Server band ho raha hai...`
  );

  io.close();

  server.close(
    async function closeServer() {
      try {
        await prisma.$disconnect();
      } catch (error) {
        console.error(
          "Prisma disconnect error:",
          error
        );
      }

      process.exit(0);
    }
  );

  setTimeout(
    function forceExit() {
      process.exit(1);
    },
    10000
  ).unref();
}

process.on(
  "SIGINT",
  function handleSigint() {
    shutdown("SIGINT");
  }
);

process.on(
  "SIGTERM",
  function handleSigterm() {
    shutdown("SIGTERM");
  }
);

process.on(
  "unhandledRejection",
  function handleUnhandledRejection(reason) {
    console.error(
      "Unhandled Promise Rejection:",
      reason
    );
  }
);

process.on(
  "uncaughtException",
  function handleUncaughtException(error) {
    console.error(
      "Uncaught Exception:",
      error
    );

    process.exit(1);
  }
);

startServer();