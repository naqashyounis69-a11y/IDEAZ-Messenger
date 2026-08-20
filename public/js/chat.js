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
      messageSearchResults: [],
      messageSearchIndex: -1,
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
      allowMessagesToggle: document.getElementById("allowMessagesToggle"),
      saveProfileButton: document.getElementById("saveProfileButton"),
      settingsModal: document.getElementById("settingsModal"),
      closeSettingsModal: document.getElementById("closeSettingsModal"),
      cancelSettingsButton: document.getElementById("cancelSettingsButton"),
      settingsForm: document.getElementById("settingsForm"),
      allowCallsToggle: document.getElementById("allowCallsToggle"),
      backgroundNotificationsButton: document.getElementById("backgroundNotificationsButton"),
      backgroundNotificationsState: document.getElementById("backgroundNotificationsState"),
      saveSettingsButton: document.getElementById("saveSettingsButton"),

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
      sidebarTitle: document.getElementById("sidebarTitle"),

      statusModal: document.getElementById("statusModal"),
      groupsModal: document.getElementById("groupsModal"),
      closeGroupsModal: document.getElementById("closeGroupsModal"),
      createGroupForm: document.getElementById("createGroupForm"),
      groupNameInput: document.getElementById("groupNameInput"),
      groupMemberChoices: document.getElementById("groupMemberChoices"),
      createGroupButton: document.getElementById("createGroupButton"),
      groupsList: document.getElementById("groupsList"),
      groupChatPanel: document.getElementById("groupChatPanel"),
      backToGroups: document.getElementById("backToGroups"),
      groupChatName: document.getElementById("groupChatName"),
      groupChatAvatar: document.getElementById("groupChatAvatar"),
      groupChatMembers: document.getElementById("groupChatMembers"),
      groupMessages: document.getElementById("groupMessages"),
      groupMessageForm: document.getElementById("groupMessageForm"),
      groupMessageInput: document.getElementById("groupMessageInput"),
      groupContextMenu: document.getElementById("groupContextMenu"),
      editGroupNameButton: document.getElementById("editGroupNameButton"),
      changeGroupPhotoButton: document.getElementById("changeGroupPhotoButton"),
      deleteGroupButton: document.getElementById("deleteGroupButton"),
      groupPhotoInput: document.getElementById("groupPhotoInput"),
      callsModulePanel: document.getElementById("callsModulePanel"),
      callContactSearch: document.getElementById("callContactSearch"),
      callContactsList: document.getElementById("callContactsList"),
      newCallButton: document.getElementById("newCallButton"),
      statusModulePanel: document.getElementById("statusModulePanel"),
      addStatusButton: document.getElementById("addStatusButton"),
      myStatusCard: document.getElementById("myStatusCard"),
      myStatusAvatar: document.getElementById("myStatusAvatar"),
      statusOverviewList: document.getElementById("statusOverviewList"),
      closeStatusModal: document.getElementById("closeStatusModal"),
      statusForm: document.getElementById("statusForm"),
      statusTextInput: document.getElementById("statusTextInput"),
      statusImageInput: document.getElementById("statusImageInput"),
      statusColorInput: document.getElementById("statusColorInput"),
      statusImageName: document.getElementById("statusImageName"),
      postStatusButton: document.getElementById("postStatusButton"),
      statusList: document.getElementById("statusList"),
      statusEmpty: document.getElementById("statusEmpty"),
      statusViewer: document.getElementById("statusViewer"),
      closeStatusViewer: document.getElementById("closeStatusViewer"),
      statusViewerAvatar: document.getElementById("statusViewerAvatar"),
      statusViewerName: document.getElementById("statusViewerName"),
      statusViewerTime: document.getElementById("statusViewerTime"),
      statusViewerImage: document.getElementById("statusViewerImage"),
      statusViewerText: document.getElementById("statusViewerText"),
      statusViewerViews: document.getElementById("statusViewerViews"),
      deleteStatusButton: document.getElementById("deleteStatusButton"),

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
      conversationFilterTabs: document.querySelector(".conversation-filter-tabs"),

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
      sidebarActionsMenu: document.getElementById("sidebarActionsMenu"),
      chatActionsMenu: document.getElementById("chatActionsMenu"),

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
      loadOlderMessagesWrapper: document.getElementById("loadOlderMessagesWrapper"),

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
      editContactNameButton: document.getElementById("editContactNameButton"),

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
      viewSharedMediaButton: document.getElementById("viewSharedMediaButton"),
      muteConversationButton: document.getElementById("muteConversationButton"),
      muteConversationState: document.getElementById("muteConversationState"),
      archiveConversationButton: document.getElementById("archiveConversationButton"),
      clearConversationButton: document.getElementById("clearConversationButton"),
      blockUserButton: document.getElementById("blockUserButton"),

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
            if (button.dataset.section === "status") openStatusModule(elements, state);
            if (button.dataset.section === "groups") openGroupsCenter(elements, state);
            if (button.dataset.section === "calls") openCallsModule(elements, state);
            if (button.dataset.section === "chats") { state.currentSection = "chats";elements.messengerApp.classList.remove("module-wide");hideElement(elements.callsModulePanel);hideElement(elements.statusModulePanel);elements.groupChatPanel.classList.add("hidden");showElement(elements.chatEmptyState);requestConversationRender(elements, state); }
          }
        );
      }
    );

    elements.closeStatusModal?.addEventListener("click", () => hideElement(elements.statusModal));
    elements.statusModal?.addEventListener("click", (event) => { if (event.target === elements.statusModal) hideElement(elements.statusModal); });
    elements.closeStatusViewer?.addEventListener("click", () => hideElement(elements.statusViewer));
    elements.statusViewer?.addEventListener("click", (event) => { if (event.target === elements.statusViewer) hideElement(elements.statusViewer); });
    elements.statusImageInput?.addEventListener("change", () => {
      const file = elements.statusImageInput.files?.[0];
      elements.statusImageName.textContent = file ? file.name : "";
    });
    elements.statusForm?.addEventListener("submit", (event) => { event.preventDefault(); postStatus(elements, state); });
    elements.closeGroupsModal?.addEventListener("click", () => hideElement(elements.groupsModal));
    elements.groupsModal?.addEventListener("click", event => { if(event.target===elements.groupsModal) hideElement(elements.groupsModal); });
    elements.backToGroups?.addEventListener("click", () => { elements.groupChatPanel.classList.add("hidden"); showElement(elements.chatEmptyState); });
    elements.createGroupForm?.addEventListener("submit", event => { event.preventDefault(); createGroup(elements,state); });
    elements.groupMessageForm?.addEventListener("submit", event => { event.preventDefault(); sendGroupMessage(elements,state); });
    elements.editGroupNameButton?.addEventListener("click", () => editGroupName(elements,state));
    elements.changeGroupPhotoButton?.addEventListener("click", () => elements.groupPhotoInput.click());
    elements.deleteGroupButton?.addEventListener("click", () => deleteGroup(elements,state));
    elements.groupPhotoInput?.addEventListener("change", () => changeGroupPhoto(elements,state));
    elements.callContactSearch?.addEventListener("input", () => renderCallContacts(elements,state));
    elements.newCallButton?.addEventListener("click", () => elements.callContactSearch.focus());
    elements.addStatusButton?.addEventListener("click", () => openStatusCenter(elements,state));
    elements.myStatusCard?.addEventListener("click", () => openStatusCenter(elements,state));
    document.addEventListener("click", event => { if(!event.target.closest("#groupContextMenu")) hideElement(elements.groupContextMenu); });

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

          openSettingsEditor(elements, state);
        }
      );
    }

    if (
      elements.openSettingsButton
    ) {
      elements.openSettingsButton.addEventListener(
        "click",
        function () {
          openSettingsEditor(elements, state);
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
    [elements.closeSettingsModal, elements.cancelSettingsButton].filter(Boolean).forEach((button) => {
      button.addEventListener("click", () => hideElement(elements.settingsModal));
    });
    elements.settingsModal?.addEventListener("click", (event) => {
      if (event.target === elements.settingsModal) hideElement(elements.settingsModal);
    });
    elements.settingsForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      saveSettings(elements, state);
    });

    if (elements.newChatButton) {
      elements.newChatButton.addEventListener(
        "click",
        function () {
          if (state.currentSection === "groups") openCreateGroupModal(elements, state);
          else openNewChatModal(elements, state);
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

          if (state.currentSection === "groups") renderGroups(elements, state);
          else requestConversationRender(elements, state);
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

          if (state.currentSection === "groups") renderGroups(elements, state);
          else requestConversationRender(elements, state);

          elements.conversationSearchInput.focus();
        }
      );
    }

    elements.conversationFilters.forEach(
      function (button) {
        button.addEventListener(
          "click",
          function () {
            if (button.dataset.filter === "groups") {
              setActiveNavigation(elements, "groups");
              openGroupsCenter(elements, state);
              return;
            }
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
        function (event) {
          event.stopPropagation();
          toggleActionMenu(elements.sidebarActionsMenu, elements.sidebarMenuButton);
        }
      );
    }

    elements.sidebarActionsMenu?.addEventListener("click", async function (event) {
      const action = event.target.closest("button")?.dataset.sidebarAction;
      if (!action) return;
      hideElement(elements.sidebarActionsMenu);
      if (action === "new-chat") openNewChatModal(elements, state);
      if (action === "new-group") { setActiveNavigation(elements, "groups"); openGroupsCenter(elements, state); }
      if (action === "settings") openSettingsEditor(elements, state);
      if (action === "refresh") {
        const response = await window.IDEAZ_API.conversations();
        state.conversations = response.data?.conversations || [];
        window.IDEAZ_CONTACTS?.renderConversations();
        showToast(elements, "Chats refresh ho gayi hain.", "success");
      }
    });

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

    elements.viewSharedMediaButton?.addEventListener("click", function () { showSharedMedia(elements, state); });
    elements.editContactNameButton?.addEventListener("click", function () {
      if (!state.selectedUser) return;
      const current = contactDisplayName(state.selectedUser);
      const name = window.prompt("Is contact ka naam aapke liye kya ho?", current);
      if (name === null) return;
      const clean = name.trim().slice(0, 60);
      const key = `ideaz-contact-name-${state.currentUser.id}-${state.selectedUser.id}`;
      if (clean) localStorage.setItem(key, clean); else localStorage.removeItem(key);
      renderActiveChatHeader(elements, state.selectedUser);
      renderDetailsPanel(elements, state.selectedUser);
      window.IDEAZ_CONTACTS?.renderConversations();
      showToast(elements, clean ? `Contact name “${clean}” save ho gaya.` : "Custom contact name remove ho gaya.", "success");
    });
    elements.muteConversationButton?.addEventListener("click", function () {
      const key = conversationSettingKey("muted", state), enabled = localStorage.getItem(key) !== "1";
      localStorage.setItem(key, enabled ? "1" : "0"); updateConversationOptionStates(elements, state);
      showToast(elements, enabled ? "Notifications mute ho gayi hain." : "Notifications unmute ho gayi hain.", "success");
    });
    elements.archiveConversationButton?.addEventListener("click", function () {
      if (!state.selectedUser) return;
      localStorage.setItem(conversationSettingKey("archived", state), "1");
      elements.conversationList.querySelector(`[data-user-id="${CSS.escape(state.selectedUser.id)}"]`)?.remove();
      toggleDetailsPanel(elements, state, false); closeMobileChat();
      showToast(elements, "Chat archive ho gayi. New message par wapas aa jayegi.", "success");
    });
    elements.clearConversationButton?.addEventListener("click", function () {
      if (!state.selectedUser || !window.confirm("Is device par conversation history clear karein?")) return;
      localStorage.setItem(conversationSettingKey("cleared", state), new Date().toISOString());
      state.messages = []; window.IDEAZ_CONTACTS?.renderMessages([]);
      showToast(elements, "Conversation clear ho gayi.", "success");
    });
    elements.blockUserButton?.addEventListener("click", function () {
      if (!state.selectedUser) return;
      const key = conversationSettingKey("blocked", state), blocked = localStorage.getItem(key) !== "1";
      if (blocked && !window.confirm(`${state.selectedUser.fullName || state.selectedUser.username} ko block karein?`)) return;
      localStorage.setItem(key, blocked ? "1" : "0"); updateConversationOptionStates(elements, state);
      showToast(elements, blocked ? "User block ho gaya." : "User unblock ho gaya.", "success");
    });

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
        function () { navigateMessageSearch(elements, state, -1); }
      );
    }

    if (
      elements.nextSearchResult
    ) {
      elements.nextSearchResult.addEventListener(
        "click",
        function () { navigateMessageSearch(elements, state, 1); }
      );
    }

    if (elements.chatMenuButton) {
      elements.chatMenuButton.addEventListener(
        "click",
        function (event) {
          event.stopPropagation();
          toggleActionMenu(elements.chatActionsMenu, elements.chatMenuButton);
        }
      );
    }

    elements.chatActionsMenu?.addEventListener("click", function (event) {
      const action = event.target.closest("button")?.dataset.chatAction;
      if (!action) return;
      hideElement(elements.chatActionsMenu);
      if (action === "contact") toggleDetailsPanel(elements, state, true);
      if (action === "search") toggleMessageSearch(elements, state, true);
      if (action === "mute") {
        const key = `ideaz-muted-${state.selectedUser?.id || "chat"}`;
        const muted = localStorage.getItem(key) !== "1";
        localStorage.setItem(key, muted ? "1" : "0");
        event.target.textContent = muted ? "Unmute notifications" : "Mute notifications";
        showToast(elements, muted ? "Notifications mute kar di gayi hain." : "Notifications unmute ho gayi hain.", "success");
      }
      if (action === "close") closeMobileChat();
    });

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
        async function () {
          try { await window.IDEAZ_CONTACTS?.loadOlderMessages(); }
          catch (error) { showToast(elements, error.message, "error"); }
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
        hideElement(elements.sidebarActionsMenu);
        hideElement(elements.chatActionsMenu);
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
    window.IDEAZ_NOTIFICATIONS?.initialize?.({ elements, state });
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

  function openSettingsEditor(elements, state) {
    if (!state.currentUser || !elements.settingsModal) return;
    elements.allowMessagesToggle.checked = state.currentUser.allowMessagesFromAnyone !== false;
    elements.allowCallsToggle.checked = state.currentUser.allowCallsFromAnyone !== false;
    showElement(elements.settingsModal);
  }

  async function saveSettings(elements, state) {
    const button = elements.saveSettingsButton;
    button.disabled = true;
    button.textContent = "Saving...";
    try {
      const user = state.currentUser;
      const response = await window.IDEAZ_API.updateProfile({
        fullName: user.fullName,
        about: user.about || "",
        avatar: user.avatar || null,
        allowMessagesFromAnyone: elements.allowMessagesToggle.checked,
        allowCallsFromAnyone: elements.allowCallsToggle.checked,
      });
      state.currentUser = response.data.user;
      hideElement(elements.settingsModal);
      showToast(elements, "Settings save ho gayi.", "success");
    } catch (error) {
      showToast(elements, error.message || "Settings save nahi ho saki.", "error");
    } finally {
      button.disabled = false;
      button.textContent = "Save Settings";
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
    if (["chats","groups","calls","status"].includes(section)) {
      elements.sidebarTitle.textContent = ({chats:"Chats",groups:"Groups",calls:"Calls",status:"Status"})[section];
      elements.conversationSearchInput.placeholder = section === "groups" ? "Search groups" : section === "chats" ? "Search chats or users" : `Open ${section} module`;
      elements.conversationFilterTabs.classList.toggle("hidden", section !== "chats");
    }
    elements.navigationButtons.forEach(
      function (button) {
        button.classList.toggle(
          "active",
          button.dataset.section ===
            section
        );
      }
    );

  }

  function hideWorkspaceModules(elements){hideElement(elements.chatEmptyState);hideElement(elements.activeChatPanel);hideElement(elements.groupChatPanel);hideElement(elements.callsModulePanel);hideElement(elements.statusModulePanel);hideElement(elements.detailsPanel);}
  async function openCallsModule(elements,state){state.currentSection="calls";elements.messengerApp.classList.add("module-wide");hideWorkspaceModules(elements);showElement(elements.callsModulePanel);elements.conversationList.innerHTML="";hideElement(elements.conversationListState);try{const response=await window.IDEAZ_API.users();state.callUsers=response.data.users||[];renderCallContacts(elements,state);}catch(error){elements.callContactsList.innerHTML=`<div class="modal-empty-state">${error.message}</div>`;}}
  function renderCallContacts(elements,state){const query=(elements.callContactSearch.value||"").trim().toLowerCase();elements.callContactsList.innerHTML="";(state.callUsers||[]).filter(user=>(user.fullName+" "+user.username).toLowerCase().includes(query)).forEach(user=>{const row=document.createElement("article");row.className="call-contact-card";const avatar=document.createElement("img");avatar.src=user.avatar||"/assets/default-avatar.svg";avatar.alt="";const info=document.createElement("div");const name=document.createElement("strong");name.textContent=user.fullName;const status=document.createElement("small");status.textContent=user.online?"Online":`@${user.username}`;info.append(name,status);const voice=document.createElement("button");voice.type="button";voice.title="Voice call";voice.textContent="📞";voice.onclick=()=>startModuleCall(elements,state,user,"voice");const video=document.createElement("button");video.type="button";video.title="Video call";video.textContent="🎥";video.onclick=()=>startModuleCall(elements,state,user,"video");row.append(avatar,info,video,voice);elements.callContactsList.appendChild(row);});}
  function startModuleCall(elements,state,user,type){state.selectedUser=user;window.IDEAZ_CALLS?.startCall(type);}
  async function openStatusModule(elements,state){state.currentSection="status";elements.messengerApp.classList.add("module-wide");hideWorkspaceModules(elements);showElement(elements.statusModulePanel);elements.conversationList.innerHTML="";hideElement(elements.conversationListState);elements.myStatusAvatar.src=state.currentUser.avatar||"/assets/default-avatar.svg";elements.statusOverviewList.innerHTML='<div class="modal-empty-state">Updates load ho rahi hain...</div>';try{const response=await window.IDEAZ_API.statuses();state.statuses=response.data.statuses||[];renderStatusOverview(elements,state);}catch(error){elements.statusOverviewList.innerHTML=`<div class="modal-empty-state">${error.message}</div>`;}}
  function renderStatusOverview(elements,state){elements.statusOverviewList.innerHTML="";const statuses=(state.statuses||[]).filter(s=>s.author.id!==state.currentUser.id);statuses.forEach(status=>{const button=document.createElement("button");button.type="button";button.className=`status-overview-card${status.viewed?" viewed":""}`;const avatar=document.createElement("img");avatar.src=status.author.avatar||"/assets/default-avatar.svg";avatar.alt="";const info=document.createElement("span");const name=document.createElement("strong");name.textContent=status.author.fullName;const time=document.createElement("small");time.textContent=new Date(status.createdAt).toLocaleString();info.append(name,time);button.append(avatar,info);button.onclick=()=>viewStatus(elements,state,status);elements.statusOverviewList.appendChild(button);});if(!statuses.length)elements.statusOverviewList.innerHTML='<div class="module-empty"><span>◉</span><strong>No recent updates</strong><small>Contacts ke status yahan nazar aayenge.</small></div>';}

  async function openGroupsCenter(elements,state){
    state.currentSection="groups";elements.messengerApp.classList.remove("module-wide");hideWorkspaceModules(elements); showElement(elements.chatEmptyState);
    try{
      const groupsResponse=await window.IDEAZ_API.groups(); state.groups=groupsResponse.data.groups||[];
      renderGroups(elements,state);
    }catch(error){showToast(elements,error.message||"Groups load nahi ho sake.","error");}
  }
  async function openCreateGroupModal(elements,state){
    showElement(elements.groupsModal);
    try{
      const usersResponse=await window.IDEAZ_API.users(); state.groupUsers=usersResponse.data.users||[];
      elements.groupMemberChoices.innerHTML="";
      state.groupUsers.forEach(user=>{const label=document.createElement("label"); const input=document.createElement("input"); input.type="checkbox";input.value=user.id; const span=document.createElement("span");span.textContent=user.fullName;label.append(input,span);elements.groupMemberChoices.appendChild(label);});
    }catch(error){showToast(elements,error.message||"Members load nahi ho sake.","error");}
  }
  function renderGroups(elements,state){elements.conversationListState.classList.add("hidden");elements.conversationList.innerHTML="";const query=state.searchText||"";(state.groups||[]).filter(group=>group.name.toLowerCase().includes(query)).forEach(group=>{const button=document.createElement("button");button.type="button";button.className="conversation-item group-list-item";const icon=document.createElement(group.avatar?"img":"span");icon.className="group-sidebar-avatar";if(group.avatar){icon.src=group.avatar;icon.alt="";}else icon.textContent="👥";const info=document.createElement("span");const name=document.createElement("strong");name.textContent=group.name;const meta=document.createElement("small");meta.textContent=group.messages?.[0]?.text||`${group.members.length} members`;info.append(name,meta);button.append(icon,info);button.onclick=()=>openGroupChat(elements,state,group);button.addEventListener("contextmenu",event=>{event.preventDefault();openGroupContextMenu(elements,state,group,event.clientX,event.clientY);});elements.conversationList.appendChild(button);});if(!elements.conversationList.children.length)renderEmptyConversationState(elements,query?"Koi matching group nahi mila.":"Abhi koi group nahi. + se banayein.");}
  async function createGroup(elements,state){const ids=[...elements.groupMemberChoices.querySelectorAll('input:checked')].map(x=>x.value);const button=elements.createGroupButton;button.disabled=true;try{await window.IDEAZ_API.createGroup({name:elements.groupNameInput.value.trim(),memberIds:ids});elements.createGroupForm.reset();hideElement(elements.groupsModal);showToast(elements,"Group create ho gaya.","success");await openGroupsCenter(elements,state);}catch(error){showToast(elements,error.message,"error");}finally{button.disabled=false;}}
  async function openGroupChat(elements,state,group){state.selectedGroup=group;hideWorkspaceModules(elements);elements.groupChatName.textContent=group.name;elements.groupChatAvatar.src=group.avatar||"/assets/default-avatar.svg";elements.groupChatMembers.textContent=`${group.members.length} members`;elements.groupChatPanel.classList.remove("hidden");const response=await window.IDEAZ_API.groupMessages(group.id);state.groupMessages=response.data.messages||[];renderGroupMessages(elements,state);}
  function renderGroupMessages(elements,state){elements.groupMessages.innerHTML="";(state.groupMessages||[]).forEach(message=>{const row=document.createElement("div");row.className=`group-message ${message.senderId===state.currentUser.id?"mine":""}`;const sender=document.createElement("strong");sender.textContent=message.sender?.fullName||"Member";const text=document.createElement("span");text.textContent=message.text||"Attachment";row.append(sender,text);elements.groupMessages.appendChild(row);});elements.groupMessages.scrollTop=elements.groupMessages.scrollHeight;}
  async function sendGroupMessage(elements,state){const text=elements.groupMessageInput.value.trim();if(!text||!state.selectedGroup)return;try{const response=await window.IDEAZ_API.sendGroupMessage(state.selectedGroup.id,{text});elements.groupMessageInput.value="";const message=response.data.message;if(!state.groupMessages.some(x=>x.id===message.id)){state.groupMessages.push(message);renderGroupMessages(elements,state);}}catch(error){showToast(elements,error.message,"error");}}
  function openGroupContextMenu(elements,state,group,x,y){const admin=group.members?.some(member=>member.userId===state.currentUser.id&&member.isAdmin);if(!admin)return showToast(elements,"Sirf group admin edit kar sakta hai.","warning");state.contextGroup=group;elements.groupContextMenu.style.left=`${Math.min(x,innerWidth-230)}px`;elements.groupContextMenu.style.top=`${Math.min(y,innerHeight-190)}px`;showElement(elements.groupContextMenu);}
  async function editGroupName(elements,state){const group=state.contextGroup;if(!group)return;hideElement(elements.groupContextMenu);const name=window.prompt("New group name:",group.name);if(name===null||name.trim()===group.name)return;try{await window.IDEAZ_API.updateGroup(group.id,{name:name.trim()});showToast(elements,"Group name update ho gaya.","success");await openGroupsCenter(elements,state);}catch(error){showToast(elements,error.message,"error");}}
  async function changeGroupPhoto(elements,state){const group=state.contextGroup,file=elements.groupPhotoInput.files?.[0];elements.groupPhotoInput.value="";hideElement(elements.groupContextMenu);if(!group||!file)return;if(file.size>5*1024*1024)return showToast(elements,"Group picture maximum 5 MB ho sakti hai.","error");try{const uploaded=await window.IDEAZ_API.upload(file);await window.IDEAZ_API.updateGroup(group.id,{avatar:uploaded.data.file});showToast(elements,"Group picture update ho gayi.","success");await openGroupsCenter(elements,state);}catch(error){showToast(elements,error.message,"error");}}
  async function deleteGroup(elements,state){const group=state.contextGroup;if(!group)return;hideElement(elements.groupContextMenu);if(!window.confirm(`Delete group “${group.name}”? Tamam group messages delete ho jayenge.`))return;try{await window.IDEAZ_API.deleteGroup(group.id);elements.groupChatPanel.classList.add("hidden");showElement(elements.chatEmptyState);showToast(elements,"Group delete ho gaya.","success");await openGroupsCenter(elements,state);}catch(error){showToast(elements,error.message,"error");}}

  async function openStatusCenter(elements, state) {
    showElement(elements.statusModal);
    elements.statusList.innerHTML = '<div class="modal-empty-state">Statuses load ho rahe hain...</div>';
    elements.statusEmpty.classList.add("hidden");
    try {
      const response = await window.IDEAZ_API.statuses();
      state.statuses = response.data.statuses || [];
      renderStatusList(elements, state);
    } catch (error) {
      elements.statusList.innerHTML = "";
      elements.statusEmpty.textContent = error.message || "Statuses load nahi ho sake.";
      elements.statusEmpty.classList.remove("hidden");
    }
  }

  function renderStatusList(elements, state) {
    elements.statusList.innerHTML = "";
    elements.statusEmpty.classList.toggle("hidden", Boolean(state.statuses?.length));
    (state.statuses || []).forEach((status) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `status-list-item${status.viewed ? " viewed" : ""}`;
      const avatar = document.createElement("img");
      avatar.src = status.author.avatar || "/assets/default-avatar.svg";
      avatar.alt = "";
      const info = document.createElement("span");
      const name = document.createElement("strong");
      name.textContent = status.author.id === state.currentUser.id ? "My Status" : status.author.fullName;
      const preview = document.createElement("small");
      preview.textContent = status.text || (status.media ? "Photo" : "Status");
      info.append(name, preview);
      const time = document.createElement("time");
      time.textContent = new Date(status.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      button.append(avatar, info, time);
      button.addEventListener("click", () => viewStatus(elements, state, status));
      elements.statusList.appendChild(button);
    });
  }

  async function postStatus(elements, state) {
    const text = elements.statusTextInput.value.trim();
    const image = elements.statusImageInput.files?.[0];
    if (!text && !image) return showToast(elements, "Text ya image add karein.", "warning");
    if (image && image.size > 10 * 1024 * 1024) return showToast(elements, "Status image maximum 10 MB ho sakti hai.", "error");
    const button = elements.postStatusButton;
    button.disabled = true;
    button.textContent = "Posting...";
    try {
      let media = null;
      let mediaType = null;
      if (image) {
        const uploaded = await window.IDEAZ_API.upload(image);
        media = uploaded.data.file;
        mediaType = image.type;
      }
      await window.IDEAZ_API.postStatus({ text, media, mediaType, color: elements.statusColorInput.value });
      elements.statusForm.reset();
      elements.statusColorInput.value = "#4f46e5";
      elements.statusImageName.textContent = "";
      showToast(elements, "Status 24 hours ke liye post ho gaya.", "success");
      await openStatusCenter(elements, state);
    } catch (error) {
      showToast(elements, error.message || "Status post nahi ho saka.", "error");
    } finally {
      button.disabled = false;
      button.textContent = "Post Status";
    }
  }

  async function viewStatus(elements, state, status) {
    elements.statusViewerAvatar.src = status.author.avatar || "/assets/default-avatar.svg";
    elements.statusViewerName.textContent = status.author.fullName;
    elements.statusViewerTime.textContent = new Date(status.createdAt).toLocaleString();
    elements.statusViewerText.textContent = status.text || "";
    elements.statusViewerText.parentElement.style.background = status.color || "#4f46e5";
    elements.statusViewerImage.classList.toggle("hidden", !status.media);
    if (status.media) elements.statusViewerImage.src = status.media;
    const own = status.author.id === state.currentUser.id;
    elements.statusViewerViews.textContent = own ? `${status._count?.views || 0} views` : "";
    elements.deleteStatusButton.classList.toggle("hidden", !own);
    elements.deleteStatusButton.onclick = own ? async () => {
      try {
        await window.IDEAZ_API.deleteStatus(status.id);
        hideElement(elements.statusViewer);
        await openStatusCenter(elements, state);
      } catch (error) { showToast(elements, error.message, "error"); }
    } : null;
    showElement(elements.statusViewer);
    if (!own && !status.viewed) {
      status.viewed = true;
      window.IDEAZ_API.viewStatus(status.id).catch(() => {});
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
      updateConversationOptionStates(elements, state);
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
        contactDisplayName(user);
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

  function conversationSettingKey(type, state) {
    return `ideaz-${type}-${state.currentUser?.id || "me"}-${state.selectedUser?.id || "chat"}`;
  }

  function updateConversationOptionStates(elements, state) {
    const muted = localStorage.getItem(conversationSettingKey("muted", state)) === "1";
    const blocked = localStorage.getItem(conversationSettingKey("blocked", state)) === "1";
    if (elements.muteConversationState) elements.muteConversationState.textContent = muted ? "On" : "Off";
    if (elements.blockUserButton) elements.blockUserButton.textContent = blocked ? "Unblock User" : "Block User";
    if (elements.messageInput) { elements.messageInput.disabled = blocked; elements.messageInput.placeholder = blocked ? "User blocked" : "Type a message"; }
    if (elements.sendMessageButton) elements.sendMessageButton.disabled = blocked;
  }

  function showSharedMedia(elements, state) {
    const media = state.messages.filter((message) => message.file);
    const overlay = document.createElement("div"); overlay.className = "modal-backdrop";
    const cards = media.length ? media.map((message) => {
      const url = escapeHtml(message.file), type = String(message.fileType || "");
      if (type.startsWith("image/")) return `<a href="${url}" target="_blank" rel="noopener"><img class="shared-media-thumb" src="${url}" alt="Shared image"></a>`;
      if (type.startsWith("video/")) return `<video class="shared-media-thumb" src="${url}" controls></video>`;
      return `<a class="chat-file" href="${url}" target="_blank" rel="noopener">Download file</a>`;
    }).join("") : '<div class="modal-empty-state">Abhi koi shared media nahi hai.</div>';
    overlay.innerHTML = `<section class="modal-card shared-media-modal"><header class="modal-header"><div><p class="modal-eyebrow">Conversation</p><h2>Shared Media</h2></div><button class="icon-button" type="button" aria-label="Close">×</button></header><div class="shared-media-grid">${cards}</div></section>`;
    overlay.addEventListener("click", (event) => { if (event.target === overlay || event.target.closest('[aria-label="Close"]')) overlay.remove(); });
    document.body.appendChild(overlay);
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
      clearMessageSearchHighlights(elements, state);

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

    clearMessageSearchHighlights(elements, state);
    state.messageSearchResults = [...elements.messagesList.querySelectorAll(".message-row")].filter(function (row) {
      return row.textContent.toLowerCase().includes(query);
    });
    state.messageSearchResults.forEach((row) => row.classList.add("search-match"));
    if (state.messageSearchResults.length) {
      state.messageSearchIndex = state.messageSearchResults.length - 1;
      focusMessageSearchResult(elements, state);
    } else {
      elements.messageSearchCount.textContent = "0 results";
    }
  }

  function clearMessageSearchHighlights(elements, state) {
    elements.messagesList?.querySelectorAll(".search-match, .search-current").forEach((row) => row.classList.remove("search-match", "search-current"));
    state.messageSearchResults = [];
    state.messageSearchIndex = -1;
  }

  function focusMessageSearchResult(elements, state) {
    state.messageSearchResults.forEach((row) => row.classList.remove("search-current"));
    const current = state.messageSearchResults[state.messageSearchIndex];
    if (!current) return;
    current.classList.add("search-current");
    current.scrollIntoView({ behavior: "smooth", block: "center" });
    elements.messageSearchCount.textContent = `${state.messageSearchIndex + 1} of ${state.messageSearchResults.length}`;
  }

  function navigateMessageSearch(elements, state, direction) {
    if (!state.messageSearchResults.length) return;
    state.messageSearchIndex = (state.messageSearchIndex + direction + state.messageSearchResults.length) % state.messageSearchResults.length;
    focusMessageSearchResult(elements, state);
  }

  function toggleActionMenu(menu, anchor) {
    if (!menu || !anchor) return;
    const opening = menu.classList.contains("hidden");
    hideElement(menu);
    if (!opening) return;
    const rect = anchor.getBoundingClientRect();
    menu.style.left = `${Math.max(8, Math.min(window.innerWidth - 210, rect.right - 190))}px`;
    menu.style.top = `${rect.bottom + 8}px`;
    showElement(menu);
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
    elements.messengerApp.classList.remove("module-wide");
    hideElement(elements.callsModulePanel);
    hideElement(elements.statusModulePanel);
    hideElement(elements.groupChatPanel);
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

    elements.activeChatName.textContent = contactDisplayName(user);

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

  function contactDisplayName(user) {
    const currentId = window.IDEAZ_CHAT_STATE?.currentUser?.id;
    const custom = currentId && user?.id ? localStorage.getItem(`ideaz-contact-name-${currentId}-${user.id}`) : "";
    return custom || user?.fullName || user?.username || "Contact";
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
