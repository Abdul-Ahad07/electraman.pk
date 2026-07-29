// ============================================
// ELECTRA MAN — Toast Notifications
// Replaces native alert() with a non-blocking glassmorphic toast.
// Usage: import { showToast } from "./toast.js";
//        showToast("Saved!", "success");
//        showToast("Something went wrong", "error");
//        showToast("Heads up...", "info");
// ============================================

let container = null;

function ensureContainer() {
  if (container) return container;
  container = document.createElement("div");
  container.id = "em-toast-container";
  document.body.appendChild(container);
  return container;
}

export function showToast(message, type = "info", duration = 4200) {
  const box = ensureContainer();

  const toast = document.createElement("div");
  toast.className = `em-toast em-toast-${type}`;

  const icon = type === "success" ? "✓" : type === "error" ? "✕" : "!";
  toast.innerHTML = `
    <span class="em-toast-icon">${icon}</span>
    <span class="em-toast-msg"></span>
    <button class="em-toast-close" aria-label="Close">×</button>
  `;
  // set message via textContent to avoid accidental HTML injection from dynamic text
  toast.querySelector(".em-toast-msg").textContent = message;

  box.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("em-toast-show"));

  const remove = () => {
    toast.classList.remove("em-toast-show");
    toast.classList.add("em-toast-hide");
    setTimeout(() => toast.remove(), 320);
  };

  const timer = setTimeout(remove, duration);
  toast.querySelector(".em-toast-close").onclick = () => {
    clearTimeout(timer);
    remove();
  };

  return toast;
}
