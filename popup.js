// popup.js — Tab Lock popup UI

const LOCKED_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
     fill="none" stroke="#E53E3E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  <circle cx="12" cy="16" r="1" fill="#E53E3E"></circle>
</svg>`;

const UNLOCKED_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
     fill="none" stroke="#48BB78" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
  <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
  <circle cx="12" cy="16" r="1" fill="#48BB78"></circle>
</svg>`;

// ─── DOM ──────────────────────────────────────────────────────────────────────

const iconWrapper = document.getElementById("icon-wrapper");
const statusText  = document.getElementById("status-text");
const tabInfo     = document.getElementById("tab-info");
const toggleBtn   = document.getElementById("toggle-btn");
const footerNote  = document.getElementById("footer-note");

// ─── State ────────────────────────────────────────────────────────────────────

let currentState    = null;
let currentTabId    = null;
let currentWindowId = null;

// ─── Render ───────────────────────────────────────────────────────────────────

function renderUI(state) {
  currentState = state;

  if (state.locked) {
    iconWrapper.innerHTML = LOCKED_SVG;
    iconWrapper.classList.add("locked");
    iconWrapper.classList.remove("unlocked");
    statusText.textContent = "Tab is locked";
    statusText.className = "status-text locked";
    tabInfo.textContent = `Locked to tab #${state.lockedTabId}`;
    toggleBtn.textContent = "Unlock Tab";
    toggleBtn.className = "btn btn-unlock";
    toggleBtn.disabled = false;
    footerNote.textContent = "Switching to another tab will snap you right back.";
  } else {
    iconWrapper.innerHTML = UNLOCKED_SVG;
    iconWrapper.classList.add("unlocked");
    iconWrapper.classList.remove("locked");
    statusText.textContent = "No tab locked";
    statusText.className = "status-text unlocked";
    tabInfo.textContent = "";
    toggleBtn.textContent = "Lock This Tab";
    toggleBtn.className = "btn btn-lock";
    toggleBtn.disabled = false;
    footerNote.textContent = "Lock focus to the current tab while you work.";
  }
}

function setLoading(loading) {
  toggleBtn.disabled = loading;
  if (loading) toggleBtn.textContent = "Working...";
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabId    = activeTab.id;
  currentWindowId = activeTab.windowId;

  const state = await chrome.runtime.sendMessage({ action: "getState" });
  renderUI(state);
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

toggleBtn.addEventListener("click", async () => {
  setLoading(true);
  try {
    if (currentState?.locked) {
      await chrome.runtime.sendMessage({ action: "unlock" });
      renderUI({ locked: false, lockedTabId: null, lockedWindowId: null });
    } else {
      await chrome.runtime.sendMessage({
        action: "lock",
        tabId: currentTabId,
        windowId: currentWindowId
      });
      renderUI({ locked: true, lockedTabId: currentTabId, lockedWindowId: currentWindowId });
    }
  } catch (err) {
    console.error("Tab Lock popup error:", err);
    statusText.textContent = "Error: " + err.message;
    statusText.className = "status-text";
  } finally {
    setLoading(false);
  }
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

init().catch((err) => {
  console.error("Tab Lock: popup init failed", err);
  statusText.textContent = "Failed to load.";
  statusText.className = "status-text";
  toggleBtn.disabled = true;
});
