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

  socket.on("call:offer", (payload) => forward("call:offer", payload));
  socket.on("call:answer", (payload) => forward("call:answer", payload));
  socket.on("call:ice-candidate", (payload) => forward("call:ice-candidate", payload));
  socket.on("call:reject", (payload) => forward("call:reject", payload));
  socket.on("call:end", (payload) => forward("call:end", payload));
}

module.exports = { registerCallSocket };
