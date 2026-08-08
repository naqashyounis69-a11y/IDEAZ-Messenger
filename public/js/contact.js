(function () {
  let context;

  function escapeHtml(value) {
    const node = document.createElement("div");
    node.textContent = String(value || "");
    return node.innerHTML;
  }

  function conversationUser(conversation) {
    return conversation.otherUser || conversation.user || null;
  }

  function initials(user) {
    return String(user?.fullName || user?.username || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  async function initialize(value) {
    context = value;
    context.elements.conversationList.addEventListener("click", handleConversationClick);
    context.elements.newChatUserList?.addEventListener("click", handleNewChatUserClick);

    try {
      const [usersResponse, conversationsResponse] = await Promise.all([
        window.IDEAZ_API.users(),
        window.IDEAZ_API.conversations(),
      ]);

      context.state.users = usersResponse.data?.users || usersResponse.data || [];
      context.state.conversations = conversationsResponse.data?.conversations || [];
      renderConversations();
    } catch (error) {
      console.error("Contacts load error:", error);
      context.elements.conversationList.innerHTML =
        '<div class="empty-list-state"><p>Chats load nahi ho sakin.</p></div>';
    }
  }

  function renderConversations() {
    if (!context) return;
    const list = context.elements.conversationList;

    if (!context.state.conversations.length) {
      list.innerHTML =
        '<div class="empty-list-state"><p>Abhi koi conversation nahi.</p><small>New chat se kisi ko message karein.</small></div>';
      return;
    }

    list.innerHTML = context.state.conversations.map((conversation) => {
      const user = conversationUser(conversation);
      const lastMessage = conversation.lastMessage?.text || "Conversation";
      const time = conversation.updatedAt
        ? new Date(conversation.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "";

      return `<button class="conversation-item" type="button" data-conversation-id="${escapeHtml(conversation.id)}" data-user-id="${escapeHtml(user?.id)}">
        <span class="conversation-avatar-wrapper"><span class="conversation-avatar conversation-initials">${escapeHtml(initials(user))}</span>${user?.online ? '<span class="conversation-online-badge"></span>' : ""}</span>
        <span class="conversation-content"><span class="conversation-top-row"><strong>${escapeHtml(user?.fullName || user?.username || "Chat")}</strong><time>${escapeHtml(time)}</time></span><span class="conversation-bottom-row"><small>${escapeHtml(lastMessage)}</small>${conversation.unreadCount ? `<span class="unread-badge">${conversation.unreadCount}</span>` : ""}</span></span>
      </button>`;
    }).join("");
  }

  async function handleConversationClick(event) {
    const button = event.target.closest(".conversation-item");
    if (!button || !context) return;

    const conversation = context.state.conversations.find(
      (item) => item.id === button.dataset.conversationId
    );
    const user = conversationUser(conversation);
    if (!conversation || !user) return;

    context.elements.conversationList
      .querySelectorAll(".conversation-item.active")
      .forEach((item) => item.classList.remove("active"));
    button.classList.add("active");

    window.IDEAZ_CHAT.openConversation(
      context.elements,
      context.state,
      conversation,
      user
    );

    await loadMessages(user.id);
  }

  async function loadMessages(userId) {
    const list = context.elements.messagesList;
    list.innerHTML = '<div class="message-date-divider">Messages load ho rahe hain...</div>';

    try {
      const response = await window.IDEAZ_API.messages(userId);
      const messages = response.data?.messages || [];
      context.state.messages = messages;
      renderMessages(messages);
      window.IDEAZ_API.markSeen(userId).catch(() => {});
    } catch (error) {
      list.innerHTML = `<div class="message-date-divider">${escapeHtml(error.message)}</div>`;
    }
  }

  function renderMessages(messages) {
    const list = context.elements.messagesList;
    if (!messages.length) {
      list.innerHTML = '<div class="message-date-divider">Abhi koi message nahi—hello kahein!</div>';
      return;
    }

    list.innerHTML = messages.map((message) => {
      const outgoing = message.senderId === context.state.currentUser.id;
      const time = new Date(message.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      let content = `<p class="message-text">${escapeHtml(message.text)}</p>`;
      if (message.file) {
        const type = String(message.fileType || "");
        if (type.startsWith("audio/")) {
          content = `<div class="voice-message"><span class="voice-message-icon">🎙️</span><audio controls preload="metadata" src="${escapeHtml(message.file)}"></audio></div>`;
        } else if (type.startsWith("image/")) {
          content = `<a href="${escapeHtml(message.file)}" target="_blank" rel="noopener"><img class="chat-image" src="${escapeHtml(message.file)}" alt="Shared image" loading="lazy"></a>${message.text ? `<p class="message-text">${escapeHtml(message.text)}</p>` : ""}`;
        } else if (type.startsWith("video/")) {
          content = `<video class="chat-video" src="${escapeHtml(message.file)}" controls preload="metadata"></video>${message.text ? `<p class="message-text">${escapeHtml(message.text)}</p>` : ""}`;
        } else {
          content = `<a class="chat-file" href="${escapeHtml(message.file)}" target="_blank" rel="noopener" download><span>📄</span><strong>File download karein</strong></a>${message.text ? `<p class="message-text">${escapeHtml(message.text)}</p>` : ""}`;
        }
      }
      return `<div class="message-row ${outgoing ? "outgoing" : "incoming"}"><div class="message-bubble">${content}<div class="message-meta"><time>${escapeHtml(time)}</time>${outgoing ? `<span class="message-status ${message.seen ? "seen" : ""}">✓✓</span>` : ""}</div></div></div>`;
    }).join("");

    window.IDEAZ_CHAT.scrollMessagesToBottom(context.elements);
  }

  async function searchUsers(query) {
    if (!context) return;
    try {
      const response = query
        ? await window.IDEAZ_API.searchUsers(query)
        : await window.IDEAZ_API.users();
      context.state.users = response.data?.users || response.data || [];
      renderUserSearchResults();
    } catch (error) {
      console.error("User search error:", error);
      context.elements.newChatUserList.innerHTML = "";
      context.elements.newChatEmptyState.textContent = error.message || "Users search nahi ho sake.";
      context.elements.newChatEmptyState.classList.remove("hidden");
    }
  }

  function renderUserSearchResults() {
    const users = context.state.users || [];
    const list = context.elements.newChatUserList;
    const empty = context.elements.newChatEmptyState;

    if (!users.length) {
      list.innerHTML = "";
      empty.textContent = "Koi matching user nahi mila.";
      empty.classList.remove("hidden");
      return;
    }

    empty.classList.add("hidden");
    list.innerHTML = users.map((user) => `
      <button class="modal-user-item" type="button" data-user-id="${escapeHtml(user.id)}">
        <span class="modal-user-avatar">${escapeHtml(initials(user))}</span>
        <span class="modal-user-info">
          <strong>${escapeHtml(user.fullName || user.username)}</strong>
          <span>@${escapeHtml(user.username)}</span>
        </span>
      </button>
    `).join("");
  }

  async function handleNewChatUserClick(event) {
    const button = event.target.closest(".modal-user-item");
    if (!button || !context) return;
    const user = context.state.users.find((item) => item.id === button.dataset.userId);
    if (!user) return;

    context.state.newChatModalOpen = false;
    context.elements.newChatModal.classList.add("hidden");
    window.IDEAZ_CHAT.openConversation(context.elements, context.state, null, user);
    await loadMessages(user.id);
  }

  async function receiveMessage(message) {
    if (!context || context.state.messages.some((item) => item.id === message.id)) return;
    const selectedUserId = context.state.selectedUser?.id;
    const belongsToOpenChat = selectedUserId &&
      (message.senderId === selectedUserId || message.receiverId === selectedUserId);

    if (belongsToOpenChat) {
      context.state.messages.push(message);
      renderMessages(context.state.messages);
      window.IDEAZ_API.markSeen(selectedUserId).catch(() => {});
    }

    try {
      const response = await window.IDEAZ_API.conversations();
      context.state.conversations = response.data?.conversations || [];
      renderConversations();
    } catch (error) {
      console.error("Conversation refresh error:", error);
    }
  }

  window.IDEAZ_CONTACTS = {
    initialize,
    renderConversations,
    renderMessages,
    loadMessages,
    receiveMessage,
    searchUsers,
  };
})();
