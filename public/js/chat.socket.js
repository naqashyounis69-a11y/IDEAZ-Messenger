(function () {
  let context;
  let socket;

  function initialize(value) {
    context = value;
    socket = window.IDEAZ_SOCKET?.getSocket();
    if (!socket) return;

    socket.on("new-message", (payload) => {
      const message = payload?.message || payload;
      if (!message?.id) return;
      window.IDEAZ_CONTACTS?.receiveMessage(message);

      if (document.hidden && window.IDEAZ_NOTIFICATIONS?.showMessage) {
        window.IDEAZ_NOTIFICATIONS.showMessage(payload?.sender, message);
      }
    });

    socket.on("message-deleted", ({ messageId }) => {
      if (!messageId) return;
      context.state.messages = context.state.messages.filter((message) => message.id !== messageId);
      window.IDEAZ_CONTACTS?.renderMessages(context.state.messages);
    });

    socket.on("typing-start", ({ userId }) => {
      if (context.state.selectedUser?.id !== userId) return;
      context.elements.typingIndicatorText.textContent = `${context.state.selectedUser.fullName || "Contact"} typing...`;
      context.elements.typingIndicator.classList.remove("hidden");
    });

    socket.on("typing-stop", ({ userId }) => {
      if (context.state.selectedUser?.id !== userId) return;
      context.elements.typingIndicator.classList.add("hidden");
    });
  }

  window.IDEAZ_CHAT_SOCKET = { initialize };
})();
