(function initializeIdeazChat() {
  "use strict";

  document.addEventListener(
    "DOMContentLoaded",
    startChatApplication
  );

  async function startChatApplication() {
    const elements = getElements();

    if (!validateRequiredElements(elements)) {
      console.error(
        "Chat page ke required HTML elements nahi mile."
      );

      return;
    }

    if (
      !window.IDEAZ_CONFIG ||
      !window.IDEAZ_STORAGE ||
      !window.IDEAZ_API
    ) {
      showStartupError(
        elements,
        "Chat dependencies load nahi hui. config.js, storage.js aur api.js check karein."
      );

      return;
    }

    const state = {
      currentUser: null,
      selectedConversation: null,
      selectedUser: null,
      conversations: [],
      users: [],
      messages: [],
      currentFilter: "all",
      searchText: "",
      detailsPanelOpen: false,
      profileMenuOpen: false,
      newChatModalOpen: false,
      messageSearchOpen: false,
      replyingToMessage: null,
      selectedAttachment: null,
      selectedAttachments: [],
      socketConnected: false,
    };

    window.IDEAZ_CHAT_STATE = state;

    applySavedTheme(elements);
    bindGlobalEvents(elements, state);

    try {
      const token =
        await window.IDEAZ_STORAGE.getToken();

      if (!token) {
        redirectToLogin();
        return;
      }

      const profileResponse =
        await window.IDEAZ_API.profile();

      const currentUser =
        profileResponse &&
        profileResponse.data &&
        profileResponse.data.user;

      if (!currentUser) {
        throw new Error(
          "Logged-in user profile nahi mili."
        );
      }

      state.currentUser = currentUser;

      await window.IDEAZ_STORAGE.setUser(
        currentUser,
        true
      );

      renderCurrentUser(
        elements,
        currentUser
      );

      initializeOptionalModules(
        elements,
        state
      );

      showMessenger(elements);

      if (window.innerWidth <= 760) {
        const sidebar = document.querySelector(
          ".conversation-sidebar"
        );

        const workspace = document.querySelector(
          ".chat-workspace"
        );

        sidebar?.classList.remove(
          "mobile-hidden"
        );

        workspace?.classList.add(
          "mobile-hidden"
        );

        workspace?.classList.remove(
          "mobile-chat-open"
        );
      }

      showToast(
        elements,
        `Welcome, ${currentUser.fullName}`,
        "success"
      );
    } catch (error) {
      console.error(
        "Chat startup error:",
        error
      );

      await window.IDEAZ_STORAGE.clearSession();

      showStartupError(
        elements,
        error.message ||
          "Messenger load nahi ho saka."
      );

      window.setTimeout(
        redirectToLogin,
        1400
      );
    }
  }

  function getElements() {
    return {
      appLoader:
        document.getElementById(
          "appLoader"
        ),

      messengerApp:
        document.getElementById(
          "messengerApp"
        ),

      navigationAvatar:
        document.getElementById(
          "navigationAvatar"
        ),

      navigationOnlineBadge:
        document.getElementById(
          "navigationOnlineBadge"
        ),

      themeToggle:
        document.getElementById(
          "themeToggle"
        ),

      themeToggleIcon:
        document.getElementById(
          "themeToggleIcon"
        ),

      openSettingsButton:
        document.getElementById(
          "openSettingsButton"
        ),

      profileMenuButton:
        document.getElementById(
          "profileMenuButton"
        ),

      profileMenu:
        document.getElementById(
          "profileMenu"
        ),

      viewProfileButton:
        document.getElementById(
          "viewProfileButton"
        ),

      profileSettingsButton:
        document.getElementById(
          "profileSettingsButton"
        ),

      profileModal: document.getElementById("profileModal"),
      closeProfileModal: document.getElementById("closeProfileModal"),
      cancelProfileButton: document.getElementById("cancelProfileButton"),
      profileForm: document.getElementById("profileForm"),
      profileAvatarInput: document.getElementById("profileAvatarInput"),
      profileAvatarPreview: document.getElementById("profileAvatarPreview"),
      profileUsernameInput: document.getElementById("profileUsernameInput"),
      profileFullNameInput: document.getElementById("profileFullNameInput"),
      profileAboutInput: document.getElementById("profileAboutInput"),
      saveProfileButton: document.getElementById("saveProfileButton"),

      logoutButton:
        document.getElementById(
          "logoutButton"
        ),

      navigationButtons:
        Array.from(
          document.querySelectorAll(
            ".navigation-button[data-section]"
          )
        ),

      conversationSearchInput:
        document.getElementById(
          "conversationSearchInput"
        ),

      clearConversationSearch:
        document.getElementById(
          "clearConversationSearch"
        ),

      conversationFilters:
        Array.from(
          document.querySelectorAll(
            ".conversation-filter"
          )
        ),

      conversationList:
        document.getElementById(
          "conversationList"
        ),

      conversationListState:
        document.getElementById(
          "conversationListState"
        ),

      conversationListStateText:
        document.getElementById(
          "conversationListStateText"
        ),

      newChatButton:
        document.getElementById(
          "newChatButton"
        ),

      newChatModal:
        document.getElementById(
          "newChatModal"
        ),

      closeNewChatModal:
        document.getElementById(
          "closeNewChatModal"
        ),

      newChatSearchInput:
        document.getElementById(
          "newChatSearchInput"
        ),

      newChatUserList:
        document.getElementById(
          "newChatUserList"
        ),

      newChatEmptyState:
        document.getElementById(
          "newChatEmptyState"
        ),

      sidebarMenuButton:
        document.getElementById(
          "sidebarMenuButton"
        ),

      chatEmptyState:
        document.getElementById(
          "chatEmptyState"
        ),

      activeChatPanel:
        document.getElementById(
          "activeChatPanel"
        ),

      mobileBackButton:
        document.getElementById(
          "mobileBackButton"
        ),

      activeChatAvatar:
        document.getElementById(
          "activeChatAvatar"
        ),

      activeChatName:
        document.getElementById(
          "activeChatName"
        ),

      activeChatStatus:
        document.getElementById(
          "activeChatStatus"
        ),

      activeChatOnlineBadge:
        document.getElementById(
          "activeChatOnlineBadge"
        ),

      chatUserProfileButton:
        document.getElementById(
          "chatUserProfileButton"
        ),

      voiceCallButton:
        document.getElementById(
          "voiceCallButton"
        ),

      videoCallButton:
        document.getElementById(
          "videoCallButton"
        ),

      chatSearchButton:
        document.getElementById(
          "chatSearchButton"
        ),

      chatMenuButton:
        document.getElementById(
          "chatMenuButton"
        ),

      messageSearchBar:
        document.getElementById(
          "messageSearchBar"
        ),

      messageSearchInput:
        document.getElementById(
          "messageSearchInput"
        ),

      messageSearchCount:
        document.getElementById(
          "messageSearchCount"
        ),

      previousSearchResult:
        document.getElementById(
          "previousSearchResult"
        ),

      nextSearchResult:
        document.getElementById(
          "nextSearchResult"
        ),

      closeMessageSearch:
        document.getElementById(
          "closeMessageSearch"
        ),

      messagesViewport:
        document.getElementById(
          "messagesViewport"
        ),

      messagesList:
        document.getElementById(
          "messagesList"
        ),

      loadOlderMessagesButton:
        document.getElementById(
          "loadOlderMessagesButton"
        ),

      scrollToBottomButton:
        document.getElementById(
          "scrollToBottomButton"
        ),

      newMessageCounter:
        document.getElementById(
          "newMessageCounter"
        ),

      typingIndicator:
        document.getElementById(
          "typingIndicator"
        ),

      typingIndicatorText:
        document.getElementById(
          "typingIndicatorText"
        ),

      replyPreview:
        document.getElementById(
          "replyPreview"
        ),

      replyPreviewName:
        document.getElementById(
          "replyPreviewName"
        ),

      replyPreviewText:
        document.getElementById(
          "replyPreviewText"
        ),

      cancelReplyButton:
        document.getElementById(
          "cancelReplyButton"
        ),

      attachmentPreview:
        document.getElementById(
          "attachmentPreview"
        ),

      attachmentPreviewContent:
        document.getElementById(
          "attachmentPreviewContent"
        ),

      removeAttachmentButton:
        document.getElementById(
          "removeAttachmentButton"
        ),

      emojiButton:
        document.getElementById(
          "emojiButton"
        ),

      attachmentButton:
        document.getElementById(
          "attachmentButton"
        ),

      attachmentMenu:
        document.getElementById("attachmentMenu"),

      fileInput:
        document.getElementById(
          "fileInput"
        ),

      imageInput:
        document.getElementById("imageInput"),

      folderInput:
        document.getElementById("folderInput"),

      messageInput:
        document.getElementById(
          "messageInput"
        ),

      messageCharacterCount:
        document.getElementById(
          "messageCharacterCount"
        ),

      voiceRecordButton:
        document.getElementById(
          "voiceRecordButton"
        ),

      sendMessageButton:
        document.getElementById(
          "sendMessageButton"
        ),

      voiceRecorderPanel:
        document.getElementById(
          "voiceRecorderPanel"
        ),

      voiceRecordingDuration:
        document.getElementById(
          "voiceRecordingDuration"
        ),

      cancelVoiceRecordingButton:
        document.getElementById(
          "cancelVoiceRecordingButton"
        ),

      sendVoiceRecordingButton:
        document.getElementById(
          "sendVoiceRecordingButton"
        ),

      detailsPanel:
        document.getElementById(
          "detailsPanel"
        ),

      closeDetailsPanel:
        document.getElementById(
          "closeDetailsPanel"
        ),

      detailsAvatar:
        document.getElementById(
          "detailsAvatar"
        ),

      detailsName:
        document.getElementById(
          "detailsName"
        ),

      detailsUsername:
        document.getElementById(
          "detailsUsername"
        ),

      detailsStatus:
        document.getElementById(
          "detailsStatus"
        ),

      detailsAbout:
        document.getElementById(
          "detailsAbout"
        ),

      detailsVoiceCallButton:
        document.getElementById(
          "detailsVoiceCallButton"
        ),

      detailsVideoCallButton:
        document.getElementById(
          "detailsVideoCallButton"
        ),

      detailsSearchButton:
        document.getElementById(
          "detailsSearchButton"
        ),

      messageContextMenu:
        document.getElementById(
          "messageContextMenu"
        ),

      toastContainer:
        document.getElementById(
          "toastContainer"
        ),

      socketStatusDot:
        document.getElementById(
          "socketStatusDot"
        ),

      socketStatusText:
        document.getElementById(
          "socketStatusText"
        ),

      appVersion:
        document.getElementById(
          "appVersion"
        ),
    };
  }

  function validateRequiredElements(
    elements
  ) {
    const requiredKeys = [
      "appLoader",
      "messengerApp",
      "conversationList",
      "chatEmptyState",
      "activeChatPanel",
      "messageInput",
      "sendMessageButton",
      "toastContainer",
    ];

    return requiredKeys.every(
      function (key) {
        return Boolean(elements[key]);
      }
    );
  }

  function bindGlobalEvents(
    elements,
    state
  ) {
    if (elements.themeToggle) {
      elements.themeToggle.addEventListener(
        "click",
        function () {
          toggleTheme(elements);
        }
      );
    }

    elements.navigationButtons.forEach(
      function (button) {
        button.addEventListener(
          "click",
          function () {
            setActiveNavigation(
              elements,
              button.dataset.section
            );
          }
        );
      }
    );

    if (
      elements.profileMenuButton
    ) {
      elements.profileMenuButton.addEventListener(
        "click",
        function (event) {
          event.stopPropagation();

          toggleProfileMenu(
            elements,
            state
          );
        }
      );
    }

    if (elements.profileMenu) {
      elements.profileMenu.addEventListener(
        "click",
        function (event) {
          event.stopPropagation();
        }
      );
    }

    if (elements.logoutButton) {
      elements.logoutButton.addEventListener(
        "click",
        async function () {
          await logoutUser(
            elements,
            state
          );
        }
      );
    }

    if (
      elements.viewProfileButton
    ) {
      elements.viewProfileButton.addEventListener(
        "click",
        function () {
          state.profileMenuOpen = false;
          hideElement(
            elements.profileMenu
          );

          openProfileEditor(elements, state);
        }
      );
    }

    if (
      elements.profileSettingsButton
    ) {
      elements.profileSettingsButton.addEventListener(
        "click",
        function () {
          state.profileMenuOpen = false;
          hideElement(
            elements.profileMenu
          );

          openProfileEditor(elements, state);
        }
      );
    }

    if (
      elements.openSettingsButton
    ) {
      elements.openSettingsButton.addEventListener(
        "click",
        function () {
          openProfileEditor(elements, state);
        }
      );
    }

    [elements.closeProfileModal, elements.cancelProfileButton].filter(Boolean).forEach((button) => {
      button.addEventListener("click", () => hideElement(elements.profileModal));
    });
    elements.profileModal?.addEventListener("click", (event) => {
      if (event.target === elements.profileModal) hideElement(elements.profileModal);
    });
    elements.profileAvatarInput?.addEventListener("change", () => {
      const file = elements.profileAvatarInput.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        elements.profileAvatarInput.value = "";
        return showToast(elements, "Profile photo maximum 5 MB ho sakti hai.", "error");
      }
      elements.profileAvatarPreview.src = URL.createObjectURL(file);
    });
    elements.profileForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      saveProfile(elements, state);
    });

    if (elements.newChatButton) {
      elements.newChatButton.addEventListener(
        "click",
        function () {
          openNewChatModal(
            elements,
            state
          );
        }
      );
    }

    if (
      elements.closeNewChatModal
    ) {
      elements.closeNewChatModal.addEventListener(
        "click",
        function () {
          closeNewChatModal(
            elements,
            state
          );
        }
      );
    }

    if (elements.newChatModal) {
      elements.newChatModal.addEventListener(
        "click",
        function (event) {
          if (
            event.target ===
            elements.newChatModal
          ) {
            closeNewChatModal(
              elements,
              state
            );
          }
        }
      );
    }

    if (
      elements.newChatSearchInput
    ) {
      elements.newChatSearchInput.addEventListener(
        "input",
        function () {
          handleNewChatSearch(
            elements,
            state
          );
        }
      );
    }

    if (
      elements.conversationSearchInput
    ) {
      elements.conversationSearchInput.addEventListener(
        "input",
        function () {
          state.searchText =
            elements.conversationSearchInput
              .value
              .trim()
              .toLowerCase();

          toggleElement(
            elements.clearConversationSearch,
            Boolean(state.searchText)
          );

          requestConversationRender(
            elements,
            state
          );
        }
      );
    }

    if (
      elements.clearConversationSearch
    ) {
      elements.clearConversationSearch.addEventListener(
        "click",
        function () {
          elements.conversationSearchInput.value =
            "";

          state.searchText = "";

          hideElement(
            elements.clearConversationSearch
          );

          requestConversationRender(
            elements,
            state
          );

          elements.conversationSearchInput.focus();
        }
      );
    }

    elements.conversationFilters.forEach(
      function (button) {
        button.addEventListener(
          "click",
          function () {
            state.currentFilter =
              button.dataset.filter ||
              "all";

            elements.conversationFilters.forEach(
              function (item) {
                item.classList.toggle(
                  "active",
                  item === button
                );
              }
            );

            requestConversationRender(
              elements,
              state
            );
          }
        );
      }
    );

    if (
      elements.sidebarMenuButton
    ) {
      elements.sidebarMenuButton.addEventListener(
        "click",
        function () {
          showToast(
            elements,
            "Chat menu options next phase mein add hongi.",
            "warning"
          );
        }
      );
    }

    if (
      elements.mobileBackButton
    ) {
      elements.mobileBackButton.addEventListener(
        "click",
        function () {
          closeMobileChat();
        }
      );
    }

    if (
      elements.chatUserProfileButton
    ) {
      elements.chatUserProfileButton.addEventListener(
        "click",
        function () {
          toggleDetailsPanel(
            elements,
            state,
            true
          );
        }
      );
    }

    if (
      elements.closeDetailsPanel
    ) {
      elements.closeDetailsPanel.addEventListener(
        "click",
        function () {
          toggleDetailsPanel(
            elements,
            state,
            false
          );
        }
      );
    }

    if (
      elements.voiceCallButton
    ) {
      elements.voiceCallButton.addEventListener(
        "click",
        function () {
          window.IDEAZ_CALLS?.startCall("voice");
        }
      );
    }

    if (
      elements.videoCallButton
    ) {
      elements.videoCallButton.addEventListener(
        "click",
        function () {
          window.IDEAZ_CALLS?.startCall("video");
        }
      );
    }

    if (
      elements.detailsVoiceCallButton
    ) {
      elements.detailsVoiceCallButton.addEventListener(
        "click",
        function () {
          window.IDEAZ_CALLS?.startCall("voice");
        }
      );
    }

    if (
      elements.detailsVideoCallButton
    ) {
      elements.detailsVideoCallButton.addEventListener(
        "click",
        function () {
          window.IDEAZ_CALLS?.startCall("video");
        }
      );
    }

    if (
      elements.chatSearchButton
    ) {
      elements.chatSearchButton.addEventListener(
        "click",
        function () {
          toggleMessageSearch(
            elements,
            state,
            true
          );
        }
      );
    }

    if (
      elements.detailsSearchButton
    ) {
      elements.detailsSearchButton.addEventListener(
        "click",
        function () {
          toggleMessageSearch(
            elements,
            state,
            true
          );
        }
      );
    }

    if (
      elements.closeMessageSearch
    ) {
      elements.closeMessageSearch.addEventListener(
        "click",
        function () {
          toggleMessageSearch(
            elements,
            state,
            false
          );
        }
      );
    }

    if (
      elements.messageSearchInput
    ) {
      elements.messageSearchInput.addEventListener(
        "input",
        function () {
          handleMessageSearch(
            elements,
            state
          );
        }
      );
    }

    if (
      elements.previousSearchResult
    ) {
      elements.previousSearchResult.addEventListener(
        "click",
        function () {
          showToast(
            elements,
            "Previous search navigation next message module mein active hogi.",
            "warning"
          );
        }
      );
    }

    if (
      elements.nextSearchResult
    ) {
      elements.nextSearchResult.addEventListener(
        "click",
        function () {
          showToast(
            elements,
            "Next search navigation next message module mein active hogi.",
            "warning"
          );
        }
      );
    }

    if (elements.chatMenuButton) {
      elements.chatMenuButton.addEventListener(
        "click",
        function () {
          showToast(
            elements,
            "Chat menu next phase mein add hoga.",
            "warning"
          );
        }
      );
    }

    if (elements.messageInput) {
      elements.messageInput.addEventListener(
        "input",
        function () {
          handleMessageInput(
            elements,
            state
          );
        }
      );

      elements.messageInput.addEventListener(
        "keydown",
        function (event) {
          if (
            event.key === "Enter" &&
            !event.shiftKey
          ) {
            event.preventDefault();

            submitMessage(
              elements,
              state
            );
          }
        }
      );
    }

    if (
      elements.sendMessageButton
    ) {
      elements.sendMessageButton.addEventListener(
        "click",
        function () {
          submitMessage(
            elements,
            state
          );
        }
      );
    }

    if (
      elements.attachmentButton
    ) {
      elements.attachmentButton.addEventListener(
        "click",
        function () {
          elements.attachmentMenu?.classList.toggle("hidden");
        }
      );
    }

    elements.attachmentMenu?.querySelectorAll("[data-attachment-source]").forEach((button) => {
      button.addEventListener("click", function () {
        const source = button.dataset.attachmentSource;
        const input = source === "image" ? elements.imageInput : source === "folder" ? elements.folderInput : elements.fileInput;
        elements.attachmentMenu.classList.add("hidden");
        input?.click();
      });
    });

    [elements.fileInput, elements.imageInput, elements.folderInput].filter(Boolean).forEach((input) => {
      input.addEventListener(
        "change",
        function () {
          handleAttachmentSelection(
            elements,
            state,
            input
          );
        }
      );
    });

    if (
      elements.removeAttachmentButton
    ) {
      elements.removeAttachmentButton.addEventListener(
        "click",
        function () {
          clearAttachment(
            elements,
            state
          );
        }
      );
    }

    if (elements.emojiButton) {
      elements.emojiButton.addEventListener(
        "click",
        function () {
          toggleEmojiPicker(
            elements,
            "😊"
          );
        }
      );
    }

    if (
      elements.voiceRecordButton
    ) {
      elements.voiceRecordButton.addEventListener(
        "click",
        function () {
          window.IDEAZ_UPLOADS?.startVoiceRecording();
        }
      );
    }

    if (
      elements.cancelVoiceRecordingButton
    ) {
      elements.cancelVoiceRecordingButton.addEventListener(
        "click",
        function () {
          window.IDEAZ_UPLOADS?.cancelVoiceRecording();
        }
      );
    }

    if (
      elements.sendVoiceRecordingButton
    ) {
      elements.sendVoiceRecordingButton.addEventListener(
        "click",
        function () {
          window.IDEAZ_UPLOADS?.sendVoiceRecording();
        }
      );
    }

    if (
      elements.cancelReplyButton
    ) {
      elements.cancelReplyButton.addEventListener(
        "click",
        function () {
          clearReply(
            elements,
            state
          );
        }
      );
    }

    if (
      elements.scrollToBottomButton
    ) {
      elements.scrollToBottomButton.addEventListener(
        "click",
        function () {
          scrollMessagesToBottom(
            elements
          );
        }
      );
    }

    if (
      elements.loadOlderMessagesButton
    ) {
      elements.loadOlderMessagesButton.addEventListener(
        "click",
        function () {
          showToast(
            elements,
            "Older messages API next phase mein connect hogi.",
            "warning"
          );
        }
      );
    }

    document.addEventListener(
      "click",
      function () {
        if (state.profileMenuOpen) {
          state.profileMenuOpen = false;
          hideElement(
            elements.profileMenu
          );
        }

        hideElement(
          elements.messageContextMenu
        );
      }
    );

    document.addEventListener(
      "keydown",
      function (event) {
        if (event.key === "Escape") {
          if (
            state.newChatModalOpen
          ) {
            closeNewChatModal(
              elements,
              state
            );
          }

          if (
            state.detailsPanelOpen
          ) {
            toggleDetailsPanel(
              elements,
              state,
              false
            );
          }

          if (
            state.messageSearchOpen
          ) {
            toggleMessageSearch(
              elements,
              state,
              false
            );
          }

          hideElement(
            elements.profileMenu
          );

          hideElement(
            elements.messageContextMenu
          );
        }
      }
    );

    window.addEventListener(
      "resize",
      function () {
        positionProfileMenu(
          elements
        );
      }
    );
  }

  function initializeOptionalModules(
    elements,
    state
  ) {
    if (
      window.IDEAZ_UI &&
      typeof window.IDEAZ_UI.initialize ===
        "function"
    ) {
      window.IDEAZ_UI.initialize({
        elements,
        state,
      });
    }

    if (
      window.IDEAZ_CONTACTS &&
      typeof window.IDEAZ_CONTACTS.initialize ===
        "function"
    ) {
      window.IDEAZ_CONTACTS.initialize({
        elements,
        state,
      });
    } else {
      renderEmptyConversationState(
        elements,
        "New Chat button se user search karein."
      );
    }

    if (
      window.IDEAZ_CONVERSATION &&
      typeof window.IDEAZ_CONVERSATION.initialize ===
        "function"
    ) {
      window.IDEAZ_CONVERSATION.initialize({
        elements,
        state,
      });
    }

    if (
      window.IDEAZ_SOCKET &&
      typeof window.IDEAZ_SOCKET.initialize ===
        "function"
    ) {
      window.IDEAZ_SOCKET.initialize({
        currentUser:
          state.currentUser,

        onConnected:
          function () {
            state.socketConnected = true;

            setSocketStatus(
              elements,
              "online",
              "Connected"
            );
          },

        onDisconnected:
          function () {
            state.socketConnected = false;

            setSocketStatus(
              elements,
              "offline",
              "Disconnected"
            );
          },
      });
    } else {
      setSocketStatus(
        elements,
        "connecting",
        "Socket module pending"
      );
    }

    if (
      window.IDEAZ_CALLS &&
      typeof window.IDEAZ_CALLS.initialize === "function"
    ) {
      window.IDEAZ_CALLS.initialize({
        elements,
        state,
      });
    }

    if (
      window.IDEAZ_CHAT_SOCKET &&
      typeof window.IDEAZ_CHAT_SOCKET.initialize === "function"
    ) {
      window.IDEAZ_CHAT_SOCKET.initialize({
        elements,
        state,
      });
    }

    if (
      window.IDEAZ_UPLOADS &&
      typeof window.IDEAZ_UPLOADS.initialize === "function"
    ) {
      window.IDEAZ_UPLOADS.initialize({
        elements,
        state,
      });
    }
  }

  function renderCurrentUser(
    elements,
    user
  ) {
    const avatarUrl =
      user.avatar ||
      "/assets/default-avatar.svg";

    if (
      elements.navigationAvatar
    ) {
      elements.navigationAvatar.src =
        avatarUrl;

      elements.navigationAvatar.onerror =
        function hideMissingAvatar() {
          this.style.visibility = "hidden";
        };

      elements.navigationAvatar.alt =
        user.fullName ||
        user.username ||
        "User";
    }

    if (
      elements.navigationOnlineBadge
    ) {
      elements.navigationOnlineBadge.classList.remove(
        "hidden"
      );
    }

    if (elements.appVersion) {
      elements.appVersion.textContent =
        `v${
          window.IDEAZ_CONFIG.APP_VERSION ||
          "1.0.0"
        }`;
    }
  }

  function openProfileEditor(elements, state) {
    const user = state.currentUser;
    if (!user || !elements.profileModal) return;
    elements.profileUsernameInput.value = user.username || "";
    elements.profileFullNameInput.value = user.fullName || "";
    elements.profileAboutInput.value = user.about || "";
    elements.profileAvatarPreview.src = user.avatar || "/assets/default-avatar.svg";
    elements.profileAvatarInput.value = "";
    showElement(elements.profileModal);
  }

  async function saveProfile(elements, state) {
    const button = elements.saveProfileButton;
    button.disabled = true;
    button.textContent = "Saving...";
    try {
      let avatar = state.currentUser.avatar || null;
      const photo = elements.profileAvatarInput.files?.[0];
      if (photo) {
        const uploaded = await window.IDEAZ_API.upload(photo);
        avatar = uploaded.data.file;
      }
      const response = await window.IDEAZ_API.updateProfile({
        fullName: elements.profileFullNameInput.value.trim(),
        about: elements.profileAboutInput.value.trim(),
        avatar,
      });
      state.currentUser = response.data.user;
      renderCurrentUser(elements, state.currentUser);
      hideElement(elements.profileModal);
      showToast(elements, "Profile save ho gayi.", "success");
    } catch (error) {
      showToast(elements, error.message || "Profile save nahi ho saki.", "error");
    } finally {
      button.disabled = false;
      button.textContent = "Save Profile";
    }
  }

  function showMessenger(elements) {
    hideElement(elements.appLoader);
    showElement(elements.messengerApp);
  }

  function showStartupError(
    elements,
    message
  ) {
    if (!elements.appLoader) {
      return;
    }

    const paragraph =
      elements.appLoader.querySelector("p");

    if (paragraph) {
      paragraph.textContent = message;
      paragraph.style.color =
        "var(--danger)";
    }
  }

  function applySavedTheme(elements) {
    window.IDEAZ_STORAGE.applySavedTheme();

    updateThemeButton(elements);
  }

  function toggleTheme(elements) {
    const currentTheme =
      window.IDEAZ_STORAGE.getTheme();

    const nextTheme =
      currentTheme === "dark"
        ? "light"
        : "dark";

    window.IDEAZ_STORAGE.setTheme(
      nextTheme
    );

    updateThemeButton(elements);
  }

  function updateThemeButton(
    elements
  ) {
    if (!elements.themeToggleIcon) {
      return;
    }

    const currentTheme =
      window.IDEAZ_STORAGE.getTheme();

    elements.themeToggleIcon.textContent =
      currentTheme === "dark"
        ? "☀"
        : "☾";
  }

  function setActiveNavigation(
    elements,
    section
  ) {
    elements.navigationButtons.forEach(
      function (button) {
        button.classList.toggle(
          "active",
          button.dataset.section ===
            section
        );
      }
    );

    if (section !== "chats") {
      showToast(
        elements,
        `${capitalize(section)} module next phase mein active hoga.`,
        "warning"
      );
    }
  }

  function toggleProfileMenu(
    elements,
    state
  ) {
    state.profileMenuOpen =
      !state.profileMenuOpen;

    toggleElement(
      elements.profileMenu,
      state.profileMenuOpen
    );

    if (state.profileMenuOpen) {
      positionProfileMenu(elements);
    }
  }

  function positionProfileMenu(
    elements
  ) {
    if (
      !elements.profileMenu ||
      !elements.profileMenuButton ||
      elements.profileMenu.classList.contains(
        "hidden"
      )
    ) {
      return;
    }

    const buttonRect =
      elements.profileMenuButton.getBoundingClientRect();

    const menuWidth =
      elements.profileMenu.offsetWidth ||
      180;

    const top =
      Math.max(
        12,
        buttonRect.top -
          elements.profileMenu.offsetHeight -
          8
      );

    const left =
      Math.max(
        12,
        buttonRect.right -
          menuWidth
      );

    elements.profileMenu.style.top =
      `${top}px`;

    elements.profileMenu.style.left =
      `${left}px`;
  }

  async function logoutUser(
    elements,
    state
  ) {
    if (
      elements.logoutButton
    ) {
      elements.logoutButton.disabled =
        true;

      elements.logoutButton.textContent =
        "Logging out...";
    }

    try {
      if (
        window.IDEAZ_SOCKET &&
        typeof window.IDEAZ_SOCKET.disconnect ===
          "function"
      ) {
        window.IDEAZ_SOCKET.disconnect();
      }

      await window.IDEAZ_API.logout();
    } catch (error) {
      console.warn(
        "Server logout error:",
        error
      );
    } finally {
      await window.IDEAZ_STORAGE.clearSession();

      state.currentUser = null;

      redirectToLogin();
    }
  }

  function redirectToLogin() {
    window.location.href =
      window.IDEAZ_CONFIG
        ? window.IDEAZ_CONFIG.LOGIN_PAGE
        : "/login.html";
  }

  function openNewChatModal(
    elements,
    state
  ) {
    state.newChatModalOpen = true;

    showElement(elements.newChatModal);

    if (
      elements.newChatSearchInput
    ) {
      elements.newChatSearchInput.value =
        "";

      window.setTimeout(
        function () {
          elements.newChatSearchInput.focus();
        },
        50
      );
    }

    if (
      elements.newChatUserList
    ) {
      elements.newChatUserList.innerHTML =
        "";
    }

    showElement(
      elements.newChatEmptyState
    );

    if (
      elements.newChatEmptyState
    ) {
      elements.newChatEmptyState.textContent =
        "Username ya naam search karein.";
    }
  }

  function closeNewChatModal(
    elements,
    state
  ) {
    state.newChatModalOpen = false;

    hideElement(elements.newChatModal);
  }

  function handleNewChatSearch(
    elements,
    state
  ) {
    const query =
      elements.newChatSearchInput
        .value
        .trim();

    if (query.length < 2) {
      if (
        elements.newChatUserList
      ) {
        elements.newChatUserList.innerHTML =
          "";
      }

      showElement(
        elements.newChatEmptyState
      );

      elements.newChatEmptyState.textContent =
        "Kam az kam 2 characters enter karein.";

      return;
    }

    if (
      window.IDEAZ_CONTACTS &&
      typeof window.IDEAZ_CONTACTS.searchUsers ===
        "function"
    ) {
      window.IDEAZ_CONTACTS.searchUsers(
        query
      );

      return;
    }

    showElement(
      elements.newChatEmptyState
    );

    elements.newChatEmptyState.textContent =
      "User search API next file mein connect hogi.";
  }

  function requestConversationRender(
    elements,
    state
  ) {
    if (
      window.IDEAZ_CONTACTS &&
      typeof window.IDEAZ_CONTACTS.renderConversations ===
        "function"
    ) {
      window.IDEAZ_CONTACTS.renderConversations();
      return;
    }

    renderEmptyConversationState(
      elements,
      state.searchText
        ? "Koi matching chat nahi mili."
        : "Abhi koi chat nahi hai."
    );
  }

  function renderEmptyConversationState(
    elements,
    message
  ) {
    if (
      elements.conversationList
    ) {
      elements.conversationList.innerHTML =
        "";
    }

    if (
      elements.conversationListStateText
    ) {
      elements.conversationListStateText.textContent =
        message;
    }

    showElement(
      elements.conversationListState
    );
  }

  function toggleDetailsPanel(
    elements,
    state,
    shouldOpen
  ) {
    state.detailsPanelOpen =
      Boolean(shouldOpen);

    toggleElement(
      elements.detailsPanel,
      state.detailsPanelOpen
    );

    elements.messengerApp.classList.toggle(
      "details-open",
      state.detailsPanelOpen
    );

    if (
      state.detailsPanelOpen &&
      state.selectedUser
    ) {
      renderDetailsPanel(
        elements,
        state.selectedUser
      );
    }
  }

  function renderDetailsPanel(
    elements,
    user
  ) {
    const avatarUrl =
      user.avatar ||
      "/assets/default-avatar.svg";

    if (elements.detailsAvatar) {
      elements.detailsAvatar.src =
        avatarUrl;

      elements.detailsAvatar.onerror =
        function hideMissingAvatar() {
          this.style.visibility = "hidden";
        };
    }

    if (elements.detailsName) {
      elements.detailsName.textContent =
        user.fullName ||
        user.username ||
        "Unknown User";
    }

    if (
      elements.detailsUsername
    ) {
      elements.detailsUsername.textContent =
        `@${user.username || "user"}`;
    }

    if (elements.detailsAbout) {
      elements.detailsAbout.textContent =
        user.about ||
        "Hey! I am using IDEAZ Messenger";
    }

    if (elements.detailsStatus) {
      elements.detailsStatus.textContent =
        user.online
          ? "Online"
          : formatLastSeen(
              user.lastSeen
            );
    }
  }

  function toggleMessageSearch(
    elements,
    state,
    shouldOpen
  ) {
    state.messageSearchOpen =
      Boolean(shouldOpen);

    toggleElement(
      elements.messageSearchBar,
      state.messageSearchOpen
    );

    if (
      state.messageSearchOpen &&
      elements.messageSearchInput
    ) {
      window.setTimeout(
        function () {
          elements.messageSearchInput.focus();
        },
        50
      );
    } else if (
      elements.messageSearchInput
    ) {
      elements.messageSearchInput.value =
        "";

      if (
        elements.messageSearchCount
      ) {
        elements.messageSearchCount.textContent =
          "0 results";
      }
    }
  }

  function handleMessageSearch(
    elements,
    state
  ) {
    const query =
      elements.messageSearchInput
        .value
        .trim()
        .toLowerCase();

    if (!query) {
      elements.messageSearchCount.textContent =
        "0 results";

      return;
    }

    const count =
      state.messages.filter(
        function (message) {
          return String(
            message.text || ""
          )
            .toLowerCase()
            .includes(query);
        }
      ).length;

    elements.messageSearchCount.textContent =
      `${count} result${
        count === 1 ? "" : "s"
      }`;
  }

  function handleMessageInput(
    elements,
    state
  ) {
    autoResizeTextarea(
      elements.messageInput
    );

    const length =
      elements.messageInput.value.length;

    const hasContent =
      Boolean(
        elements.messageInput.value.trim()
      ) ||
      Boolean(
        state.selectedAttachment
      );

    elements.sendMessageButton.disabled =
      !hasContent ||
      (!state.selectedConversation &&
        !state.selectedUser);

    if (
      elements.messageCharacterCount
    ) {
      elements.messageCharacterCount.textContent =
        `${length} / 5000`;

      toggleElement(
        elements.messageCharacterCount,
        length >= 4500
      );
    }

    if (
      window.IDEAZ_SOCKET &&
      typeof window.IDEAZ_SOCKET.handleTypingInput ===
        "function"
    ) {
      window.IDEAZ_SOCKET.handleTypingInput(
        state.selectedConversation,
        elements.messageInput.value
      );
    }
  }

  async function submitMessage(
    elements,
    state
  ) {
    const text =
      elements.messageInput.value.trim();

    if (
      !state.selectedConversation &&
      !state.selectedUser
    ) {
      showToast(
        elements,
        "Pehle koi chat select karein.",
        "warning"
      );

      return;
    }

    if (
      !text &&
      !state.selectedAttachment
    ) {
      return;
    }

    elements.sendMessageButton.disabled =
      true;

    try {
      if (
        window.IDEAZ_CONVERSATION &&
        typeof window.IDEAZ_CONVERSATION.sendMessage ===
          "function"
      ) {
        const attachments = state.selectedAttachments?.length
          ? state.selectedAttachments
          : state.selectedAttachment ? [state.selectedAttachment] : [];
        if (attachments.length) {
          for (let index = 0; index < attachments.length; index += 1) {
            await window.IDEAZ_CONVERSATION.sendMessage({
              text: index === 0 ? text : "",
              attachment: attachments[index],
              replyTo: index === 0 ? state.replyingToMessage : null,
            });
          }
        } else {
          await window.IDEAZ_CONVERSATION.sendMessage({ text, attachment: null, replyTo: state.replyingToMessage });
        }
      } else {
        showToast(
          elements,
          "Message backend next file mein connect hoga.",
          "warning"
        );
      }

      elements.messageInput.value = "";
      autoResizeTextarea(
        elements.messageInput
      );

      clearAttachment(
        elements,
        state
      );

      clearReply(
        elements,
        state
      );
    } catch (error) {
      console.error(
        "Send message error:",
        error
      );

      showToast(
        elements,
        error.message ||
          "Message send nahi ho saka.",
        "error"
      );
    } finally {
      handleMessageInput(
        elements,
        state
      );
    }
  }

  function handleAttachmentSelection(
    elements,
    state,
    input = elements.fileInput
  ) {
    const files = Array.from(input?.files || []);
    const file = files[0];

    if (!file) {
      return;
    }

    const maxFileSize = 100 * 1024 * 1024;
    const maxBatchSize = 1024 * 1024 * 1024;

    if (files.some((item) => item.size > maxFileSize)) {
      showToast(
        elements,
        "Har file 100 MB se zyada nahi ho sakti.",
        "error"
      );

      input.value = "";
      return;
    }

    if (files.reduce((total, item) => total + item.size, 0) > maxBatchSize) {
      input.value = "";
      return showToast(elements, "Selected folder/files ka total 1 GB se zyada nahi ho sakta.", "error");
    }

    if (files.length > 100) {
      input.value = "";
      return showToast(elements, "Ek dafa maximum 100 folder files bhej sakte hain.", "error");
    }

    state.selectedAttachment = file;
    state.selectedAttachments = files;

    renderAttachmentPreview(
      elements,
      file,
      files
    );

    showElement(
      elements.attachmentPreview
    );

    handleMessageInput(
      elements,
      state
    );
  }

  function renderAttachmentPreview(
    elements,
    file,
    files = [file]
  ) {
    if (
      !elements.attachmentPreviewContent
    ) {
      return;
    }

    elements.attachmentPreviewContent.innerHTML =
      "";

    const wrapper =
      document.createElement("div");

    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.gap = "10px";

    const icon =
      document.createElement("div");

    icon.textContent =
      file.type.startsWith("image/")
        ? "🖼"
        : file.type.startsWith("video/")
          ? "🎥"
          : file.type.startsWith("audio/")
            ? "🎵"
            : "📄";

    icon.style.fontSize = "24px";

    const info =
      document.createElement("div");

    const name =
      document.createElement("strong");

    name.textContent = file.name;

    const size =
      document.createElement("small");

    size.textContent =
      formatFileSize(file.size);

    size.style.display = "block";
    size.style.marginTop = "3px";
    size.style.color =
      "var(--text-secondary)";

    info.appendChild(name);
    info.appendChild(size);

    if (files.length > 1) {
      const count = document.createElement("small");
      count.textContent = `${files.length} files selected`;
      count.style.display = "block";
      count.style.color = "var(--primary)";
      info.appendChild(count);
    }

    wrapper.appendChild(icon);
    wrapper.appendChild(info);

    elements.attachmentPreviewContent.appendChild(
      wrapper
    );
  }

  function clearAttachment(
    elements,
    state
  ) {
    state.selectedAttachment = null;
    state.selectedAttachments = [];

    [elements.fileInput, elements.imageInput, elements.folderInput].filter(Boolean).forEach((input) => { input.value = ""; });

    if (
      elements.attachmentPreviewContent
    ) {
      elements.attachmentPreviewContent.innerHTML =
        "";
    }

    hideElement(
      elements.attachmentPreview
    );

    handleMessageInput(
      elements,
      state
    );
  }

  function clearReply(
    elements,
    state
  ) {
    state.replyingToMessage = null;

    hideElement(
      elements.replyPreview
    );

    if (
      elements.replyPreviewName
    ) {
      elements.replyPreviewName.textContent =
        "";
    }

    if (
      elements.replyPreviewText
    ) {
      elements.replyPreviewText.textContent =
        "";
    }
  }

  function insertEmoji(
    elements,
    emoji
  ) {
    const input =
      elements.messageInput;

    const start =
      input.selectionStart;

    const end =
      input.selectionEnd;

    const before =
      input.value.slice(0, start);

    const after =
      input.value.slice(end);

    input.value =
      `${before}${emoji}${after}`;

    input.focus();

    const nextPosition =
      start + emoji.length;

    input.setSelectionRange(
      nextPosition,
      nextPosition
    );

    input.dispatchEvent(
      new Event("input")
    );
  }

  function toggleEmojiPicker(elements) {
    let picker = document.getElementById("emojiPicker");
    if (!picker) {
      const emojis = [
        "😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😍","🥰","😘","😋","😎","🤩","🥳",
        "😢","😭","😤","😡","🤬","😱","😴","🤔","🤗","🤫","🤭","🫡","🫠","🥺","😬","🙄","😏","😜","🤪","🤓",
        "👍","👎","👌","✌️","🤞","🤟","🤘","👏","🙌","🫶","🙏","💪","👋","🤝","💅","👀","🧠","👑","💍","💄",
        "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❤️‍🔥","💕","💞","💓","💗","💖","💘","💝","💯","✨",
        "🔥","⭐","🌟","⚡","☀️","🌙","☁️","🌈","🎉","🎊","🎂","🎁","🎈","🏆","⚽","🏏","🎮","🎵","🎶","📸",
        "🍕","🍔","🍟","🌮","🍗","🍎","🍓","🍉","🍫","🍰","☕","🥤","🚗","✈️","🏠","📱","💻","⌚","✅","❌"
      ];
      picker = document.createElement("div");
      picker.id = "emojiPicker";
      picker.className = "emoji-picker hidden";
      picker.setAttribute("role", "dialog");
      picker.setAttribute("aria-label", "Emoji picker");
      picker.innerHTML = `<div class="emoji-picker-header"><strong>Emojis</strong><button type="button" aria-label="Close emoji picker">×</button></div><div class="emoji-grid">${emojis.map((emoji) => `<button type="button" class="emoji-option" data-emoji="${emoji}" aria-label="${emoji}">${emoji}</button>`).join("")}</div>`;
      const categoryRanges = [
        { id: "faces", icon: "😀", label: "Faces", start: 0, end: 40 },
        { id: "hands", icon: "👍", label: "Hands", start: 40, end: 60 },
        { id: "hearts", icon: "❤️", label: "Hearts", start: 60, end: 80 },
        { id: "fun", icon: "🎉", label: "Fun", start: 80, end: 100 },
        { id: "things", icon: "🍕", label: "Food & things", start: 100, end: 120 }
      ];
      const categoryBar = document.createElement("div");
      categoryBar.className = "emoji-categories";
      categoryBar.setAttribute("role", "tablist");
      categoryBar.innerHTML = categoryRanges.map((category, index) => `<button type="button" class="emoji-category${index === 0 ? " active" : ""}" data-category="${category.id}" role="tab" aria-label="${category.label}">${category.icon}</button>`).join("");
      picker.querySelector(".emoji-picker-header").after(categoryBar);
      const emojiOptions = Array.from(picker.querySelectorAll(".emoji-option"));
      const showCategory = (id) => {
        const category = categoryRanges.find((item) => item.id === id) || categoryRanges[0];
        emojiOptions.forEach((option, index) => option.classList.toggle("hidden", index < category.start || index >= category.end));
        categoryBar.querySelectorAll(".emoji-category").forEach((tab) => tab.classList.toggle("active", tab.dataset.category === category.id));
      };
      showCategory("faces");
      elements.messageInput.closest(".message-composer").appendChild(picker);
      picker.addEventListener("click", function (event) {
        const categoryButton = event.target.closest(".emoji-category");
        if (categoryButton) {
          showCategory(categoryButton.dataset.category);
          return;
        }
        const option = event.target.closest(".emoji-option");
        if (option) {
          insertEmoji(elements, option.dataset.emoji);
          return;
        }
        if (event.target.closest('[aria-label="Close emoji picker"]')) picker.classList.add("hidden");
      });
    }
    picker.classList.toggle("hidden");
  }

  function showCallPlaceholder(
    elements,
    callType
  ) {
    showToast(
      elements,
      `${callType} feature WebRTC phase mein add hoga.`,
      "warning"
    );
  }

  function setSocketStatus(
    elements,
    status,
    text
  ) {
    if (
      elements.socketStatusDot
    ) {
      elements.socketStatusDot.className =
        `connection-status-dot ${status}`;
    }

    if (
      elements.socketStatusText
    ) {
      elements.socketStatusText.textContent =
        text;
    }
  }

  function openConversation(
    elements,
    state,
    conversation,
    user
  ) {
    state.selectedConversation =
      conversation;

    state.selectedUser = user;

    hideElement(
      elements.chatEmptyState
    );

    showElement(
      elements.activeChatPanel
    );

    renderActiveChatHeader(
      elements,
      user
    );

    if (window.innerWidth <= 760) {
      const sidebar =
        document.querySelector(
          ".conversation-sidebar"
        );

      const workspace =
        document.querySelector(
          ".chat-workspace"
        );

      sidebar?.classList.add(
        "mobile-hidden"
      );

      workspace?.classList.remove(
        "mobile-hidden"
      );

      workspace?.classList.add(
        "mobile-chat-open"
      );
    }
  }

  function renderActiveChatHeader(
    elements,
    user
  ) {
    const avatarUrl =
      user.avatar ||
      "/assets/default-avatar.svg";

    elements.activeChatAvatar.src =
      avatarUrl;

    elements.activeChatAvatar.onerror =
      function hideMissingAvatar() {
        this.style.visibility = "hidden";
      };

    elements.activeChatAvatar.alt =
      user.fullName ||
      user.username ||
      "Contact";

    elements.activeChatName.textContent =
      user.fullName ||
      user.username ||
      "Contact";

    elements.activeChatStatus.textContent =
      user.online
        ? "Online"
        : formatLastSeen(
            user.lastSeen
          );

    toggleElement(
      elements.activeChatOnlineBadge,
      Boolean(user.online)
    );
  }

  function closeMobileChat() {
    const sidebar =
      document.querySelector(
        ".conversation-sidebar"
      );

    const workspace =
      document.querySelector(
        ".chat-workspace"
      );

    sidebar?.classList.remove(
      "mobile-hidden"
    );

    workspace?.classList.remove(
      "mobile-chat-open"
    );

    workspace?.classList.add(
      "mobile-hidden"
    );
  }

  function scrollMessagesToBottom(
    elements
  ) {
    if (
      elements.messagesViewport
    ) {
      elements.messagesViewport.scrollTop =
        elements.messagesViewport.scrollHeight;
    }

    hideElement(
      elements.scrollToBottomButton
    );

    if (
      elements.newMessageCounter
    ) {
      elements.newMessageCounter.textContent =
        "0";

      hideElement(
        elements.newMessageCounter
      );
    }
  }

  function showToast(
    elements,
    message,
    type = "success"
  ) {
    if (
      !elements.toastContainer
    ) {
      return;
    }

    const toast =
      document.createElement("div");

    toast.className =
      `toast ${type}`;

    toast.textContent = message;

    elements.toastContainer.appendChild(
      toast
    );

    window.setTimeout(
      function () {
        toast.remove();
      },
      3500
    );
  }

  function showElement(element) {
    if (element) {
      element.classList.remove(
        "hidden"
      );
    }
  }

  function hideElement(element) {
    if (element) {
      element.classList.add(
        "hidden"
      );
    }
  }

  function toggleElement(
    element,
    shouldShow
  ) {
    if (!element) {
      return;
    }

    element.classList.toggle(
      "hidden",
      !shouldShow
    );
  }

  function autoResizeTextarea(
    textarea
  ) {
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";

    textarea.style.height =
      `${Math.min(
        textarea.scrollHeight,
        130
      )}px`;
  }

  function capitalize(value) {
    if (!value) {
      return "";
    }

    return (
      value.charAt(0).toUpperCase() +
      value.slice(1)
    );
  }

  function formatFileSize(bytes) {
    if (!Number.isFinite(bytes)) {
      return "0 B";
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    const kilobytes =
      bytes / 1024;

    if (kilobytes < 1024) {
      return `${kilobytes.toFixed(1)} KB`;
    }

    const megabytes =
      kilobytes / 1024;

    return `${megabytes.toFixed(1)} MB`;
  }

  function formatLastSeen(value) {
    if (!value) {
      return "Offline";
    }

    const date = new Date(value);

    if (
      Number.isNaN(date.getTime())
    ) {
      return "Offline";
    }

    return `Last seen ${date.toLocaleString()}`;
  }

  window.IDEAZ_CHAT = {
    openConversation,
    renderActiveChatHeader,
    renderDetailsPanel,
    scrollMessagesToBottom,
    showToast,
    setSocketStatus,
    clearReply,
    clearAttachment,
  };
})();
