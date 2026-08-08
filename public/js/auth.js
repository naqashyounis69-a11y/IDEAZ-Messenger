(function () {
  const form = document.querySelector("[data-auth-form]");
  if (!form) return;

  const passwordInput = form.querySelector('input[name="password"]');
  if (passwordInput) {
    passwordInput.minLength = 4;
    passwordInput.placeholder = "••••";
  }

  const message = document.getElementById("formMessage");
  const button = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";
    message.className = "message";
    button.disabled = true;

    try {
      const data = Object.fromEntries(new FormData(form));
      const action = form.dataset.authForm;
      const response = await window.IDEAZ_API[action](data);
      await window.IDEAZ_STORAGE.setToken(response.data.accessToken);
      await window.IDEAZ_STORAGE.setUser(response.data.user);
      message.textContent = response.message;
      message.classList.add("success");
      location.href = "/chat";
    } catch (error) {
      message.textContent = error.message;
      message.classList.add("error");
    } finally {
      button.disabled = false;
    }
  });

  document.getElementById("themeButton")?.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    window.IDEAZ_STORAGE.setTheme(next);
  });
})();
