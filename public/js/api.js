(function () {
  async function request(path, options = {}) {
    const token = await window.IDEAZ_STORAGE.getToken();
    const headers = {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    let response;
    try {
      response = await fetch(`/api${path}`, { ...options, headers });
    } catch (_networkError) {
      await new Promise((resolve) => setTimeout(resolve, 900));
      try {
        response = await fetch(`/api${path}`, { ...options, headers });
      } catch (_retryError) {
        throw new Error("Server se connection nahi ho saka. Internet check karke dobara try karein.");
      }
    }
    let body = {};
    try { body = await response.json(); } catch {}

    if (response.status === 401 && token) {
      await window.IDEAZ_STORAGE.clearSession();
      if (!location.pathname.startsWith("/login")) {
        location.href = "/login?session=expired";
      }
      throw new Error("Session expire ho gayi. Dobara login karein.");
    }

    if (!response.ok) throw new Error(body.message || "Request complete nahi ho saki.");
    return body;
  }

  window.IDEAZ_API = {
    request,
    register: (data) => request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
    login: (data) => request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
    pinLogin: (data) => request("/auth/pin-login", { method: "POST", body: JSON.stringify(data) }),
    profile: () => request("/auth/profile"),
    logout: () => request("/auth/logout", { method: "POST" }),
    users: () => request("/users"),
    searchUsers: (query) => request(`/users/search?q=${encodeURIComponent(query)}`),
    updateProfile: (data) => request("/users/me", { method: "PATCH", body: JSON.stringify(data) }),
    conversations: () => request("/messages/conversations"),
    messages: (id) => request(`/messages/user/${id}`),
    sendMessage: (data) => request("/messages", { method: "POST", body: JSON.stringify(data) }),
    markSeen: (id) => request(`/messages/user/${id}/seen`, { method: "PATCH" }),
    statuses: () => request("/statuses"),
    postStatus: (data) => request("/statuses", { method: "POST", body: JSON.stringify(data) }),
    viewStatus: (id) => request(`/statuses/${id}/view`, { method: "PATCH" }),
    deleteStatus: (id) => request(`/statuses/${id}`, { method: "DELETE" }),
    groups: () => request("/groups"),
    createGroup: (data) => request("/groups", { method: "POST", body: JSON.stringify(data) }),
    groupMessages: (id) => request(`/groups/${id}/messages`),
    sendGroupMessage: (id, data) => request(`/groups/${id}/messages`, { method: "POST", body: JSON.stringify(data) }),
    updateGroup: (id, data) => request(`/groups/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    deleteGroup: (id) => request(`/groups/${id}`, { method: "DELETE" }),
    upload: (file) => {
      const form = new FormData();
      form.append("file", file);
      return request("/uploads", { method: "POST", body: form });
    },
  };
})();
