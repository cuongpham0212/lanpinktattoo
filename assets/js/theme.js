// ================================
// Lan Pink Tattoo Theme Manager
// ================================

(function () {

  const STORAGE_KEY = "theme";

  function getPreferredTheme() {

    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved === "light" || saved === "dark") {
      return saved;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function applyTheme(theme) {

    document.documentElement.setAttribute(
      "data-theme",
      theme
    );

    localStorage.setItem(
      STORAGE_KEY,
      theme
    );

    updateButton(theme);

  }

  function updateButton(theme) {

    const btn = document.getElementById("theme-toggle");

    if (!btn) return;

    btn.setAttribute(
      "aria-label",
      theme === "dark"
        ? "Switch to light mode"
        : "Switch to dark mode"
    );

    btn.innerHTML =
      theme === "dark"
        ? "☀️"
        : "🌙";

  }

  window.toggleTheme = function () {

    const current =
      document.documentElement.getAttribute("data-theme") || "dark";

    applyTheme(
      current === "dark"
        ? "light"
        : "dark"
    );

  };

  document.addEventListener(
    "DOMContentLoaded",
    () => {

      applyTheme(
        getPreferredTheme()
      );

    }
  );

})();