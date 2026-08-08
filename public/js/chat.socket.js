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

    socket.on("group-message", (message) => {
      if (!message?.id || context.state.selectedGroup?.id !== message.groupId) return;
      context.state.groupMessages = context.state.groupMessages || [];
      if (context.state.groupMessages.some((item) => item.id === message.id)) return;
      context.state.groupMessages.push(message);
      const box = context.elements.groupMessages;
      if (!box) return;
      const row = document.createElement("div");
      row.className = `group-message ${message.senderId === context.state.currentUser.id ? "mine" : ""}`;
      const sender = document.createElement("strong"); sender.textContent = message.sender?.fullName || "Member";
      const text = document.createElement("span"); text.textContent = message.text || "Attachment";
      row.append(sender, text); box.appendChild(row); box.scrollTop = box.scrollHeight;
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
