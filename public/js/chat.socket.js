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

    socket.on("users:online", (userIds = []) => {
      const onlineIds = new Set(userIds);
      updateAllPresence((user) => ({ ...user, online: onlineIds.has(user.id) }));
    });

    socket.on("user:online", (payload = {}) => updatePresence(payload.userId, true, payload.lastSeen));
    socket.on("user:offline", (payload = {}) => updatePresence(payload.userId, false, payload.lastSeen));
  }

  function updateAllPresence(transform) {
    context.state.users = (context.state.users || []).map(transform);
    context.state.conversations = (context.state.conversations || []).map((conversation) => {
      const key = conversation.otherUser ? "otherUser" : "user";
      return conversation[key] ? { ...conversation, [key]: transform(conversation[key]) } : conversation;
    });
    if (context.state.selectedUser) context.state.selectedUser = transform(context.state.selectedUser);
    refreshPresenceUi();
  }

  function updatePresence(userId, online, lastSeen) {
    if (!userId) return;
    updateAllPresence((user) => user.id === userId ? { ...user, online, lastSeen: lastSeen || user.lastSeen } : user);
  }

  function refreshPresenceUi() {
    window.IDEAZ_CONTACTS?.renderConversations();
    if (context.state.selectedUser) {
      window.IDEAZ_CHAT?.renderActiveChatHeader(context.elements, context.state.selectedUser);
      if (context.state.detailsPanelOpen) window.IDEAZ_CHAT?.renderDetailsPanel(context.elements, context.state.selectedUser);
    }
  }

  window.IDEAZ_CHAT_SOCKET = { initialize };
})();
