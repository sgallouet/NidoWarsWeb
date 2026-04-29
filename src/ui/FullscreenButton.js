export function setupFullscreenButton({ button, target }) {
  if (!button || !document.fullscreenEnabled || typeof target?.requestFullscreen !== "function") {
    if (button) {
      button.hidden = true;
    }
    return;
  }

  const updateState = () => {
    const isFullscreen = document.fullscreenElement === target;

    button.classList.toggle("is-fullscreen", isFullscreen);
    button.setAttribute("aria-label", isFullscreen ? "Exit fullscreen" : "Enter fullscreen");
  };

  button.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await target.requestFullscreen({ navigationUI: "hide" });
      }
    } catch {
      button.classList.add("fullscreen-button-error");
      window.setTimeout(() => button.classList.remove("fullscreen-button-error"), 500);
    }
  });

  document.addEventListener("fullscreenchange", updateState);
  updateState();
}
