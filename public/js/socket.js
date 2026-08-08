(function () {
  let socket = null;
  let typingTimer = null;
  let typingTarget = null;

  window.IDEAZ_SOCKET = {
    initialize(options = {}) {
      const token = localStorage.getItem("ideaz_access_token");
      if (!window.io || !token) return;
      socket = window.io({ auth: { token } });
      socket.on("connect", () => {
        if (options.currentUser?.id) socket.emit("join-user", options.currentUser.id);
        options.onConnected?.();
      });
      socket.on("disconnect", () => options.onDisconnected?.());
      return socket;
    },
    disconnect() {
      socket?.disconnect();
      socket = null;
    },
    handleTypingInput(conversation, value) {
      const user = conversation?.otherUser || conversation?.user;
      if (!socket || !user?.id) return;
      typingTarget = user.id;
      window.clearTimeout(typingTimer);
      if (String(value || "").trim()) {
        socket.emit("typing-start", { receiverId: user.id, conversationId: conversation.id });
        typingTimer = window.setTimeout(() => {
          socket?.emit("typing-stop", { receiverId: typingTarget, conversationId: conversation.id });
        }, 1200);
      } else {
        socket.emit("typing-stop", { receiverId: user.id, conversationId: conversation.id });
      }
    },
    getSocket() { return socket; },
  };
})();
