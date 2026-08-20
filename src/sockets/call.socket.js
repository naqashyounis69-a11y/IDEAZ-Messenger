const prisma = require("../config/prisma");
const pushService = require("../services/push.service");
const pendingCalls = new Map();

function registerCallSocket(io, socket) {
  function forward(eventName, payload = {}) {
    const targetUserId = String(payload.targetUserId || "").trim();
    if (!socket.userId || !targetUserId) return;

    io.to(`user:${targetUserId}`).emit(eventName, {
      ...payload,
      targetUserId: undefined,
      fromUserId: socket.userId,
    });
  }

  socket.on("call:offer", async (payload = {}) => {
    const targetUserId = String(payload.targetUserId || "").trim();
    if (!socket.userId || !targetUserId) return;

    try {
      const receiver = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { allowCallsFromAnyone: true },
      });
      if (!receiver || !receiver.allowCallsFromAnyone) {
        socket.emit("call:unavailable", {
          targetUserId,
          reason: "Is user ne incoming calls band ki hui hain.",
        });
        return;
      }
      const offerPayload = { ...payload, targetUserId: undefined, fromUserId: socket.userId };
      pendingCalls.set(targetUserId, { payload: offerPayload, expiresAt: Date.now() + 45000 });
      io.to(`user:${targetUserId}`).emit("call:offer", offerPayload);
      pushService.sendToUser(targetUserId, {
        type: "call", title: `${payload.caller?.fullName || "Someone"} calling`,
        body: payload.type === "video" ? "Incoming video call" : "Incoming voice call",
        url: "/chat?incomingCall=1", tag: `call-${socket.userId}`, requireInteraction: true
      }).catch(() => {});
    } catch (_error) {
      socket.emit("call:unavailable", {
        targetUserId,
        reason: "Call privacy check nahi ho saka. Dobara try karein.",
      });
    }
  });
  socket.on("call:ready", () => {
    const pending = pendingCalls.get(socket.userId);
    if (!pending) return;
    if (pending.expiresAt < Date.now()) return pendingCalls.delete(socket.userId);
    socket.emit("call:offer", pending.payload);
  });
  socket.on("call:answer", (payload) => { pendingCalls.delete(socket.userId); forward("call:answer", payload); });
  socket.on("call:ice-candidate", (payload) => forward("call:ice-candidate", payload));
  socket.on("call:reject", (payload) => { pendingCalls.delete(socket.userId); forward("call:reject", payload); });
  socket.on("call:end", (payload) => { pendingCalls.delete(payload?.targetUserId); forward("call:end", payload); });
}

module.exports = { registerCallSocket };
