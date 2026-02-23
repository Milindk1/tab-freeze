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

const iconWrapper       = document.getElementById("icon-wrapper");
const statusText        = document.getElementById("status-text");
const tabInfo           = document.getElementById("tab-info");
const toggleBtn         = document.getElementById("toggle-btn");
const footerNote        = document.getElementById("footer-note");
const timerSelectGroup  = document.getElementById("timer-select-group");
const durationSelect    = document.getElementById("duration-select");
const customInputGroup  = document.getElementById("custom-input-group");
const customMinutes     = document.getElementById("custom-minutes");
const countdownGroup    = document.getElementById("countdown-group");
const countdownDisplay  = document.getElementById("countdown-display");

// ─── State ────────────────────────────────────────────────────────────────────

let currentState    = null;
let currentTabId    = null;
let currentWindowId = null;
let countdownTimer  = null;

// ─── Timer Formatting ─────────────────────────────────────────────────────────

function formatRemaining(ms) {
  if (ms <= 0) return "0:00";
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

function startCountdown(unlockAt) {
  if (countdownTimer) clearInterval(countdownTimer);

  function tick() {
    const remaining = unlockAt - Date.now();
    if (remaining <= 0) {
      clearInterval(countdownTimer);
      countdownDisplay.textContent = "0:00";
      // Timer expired — enable the unlock button
      toggleBtn.disabled = false;
      toggleBtn.textContent = "Unlock Tab";
      footerNote.textContent = "Timer done. You can now unlock.";
      countdownGroup.classList.add("done");
      return;
    }
    countdownDisplay.textContent = formatRemaining(remaining);
  }

  tick();
  countdownTimer = setInterval(tick, 500);
}

// ─── Render ───────────────────────────────────────────────────────────────────

function renderUI(state) {
  currentState = state;
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }

  if (state.locked) {
    iconWrapper.innerHTML = LOCKED_SVG;
    iconWrapper.className = "icon-wrapper locked";
    statusText.textContent = "Tab is locked";
    statusText.className = "status-text locked";
    tabInfo.textContent = `Locked to tab #${state.lockedTabId}`;
    toggleBtn.className = "btn btn-unlock";

    // Hide duration selector, show countdown if timer is active
    timerSelectGroup.style.display = "none";

    const timerActive = state.unlockAt && Date.now() < state.unlockAt;
    if (timerActive) {
      countdownGroup.style.display = "flex";
      countdownGroup.classList.remove("done");
      toggleBtn.disabled = true;
      toggleBtn.textContent = "Unlock Tab";
      footerNote.textContent = "Hang tight — timer is running.";
      startCountdown(state.unlockAt);
    } else {
      countdownGroup.style.display = "none";
      toggleBtn.disabled = false;
      toggleBtn.textContent = "Unlock Tab";
      footerNote.textContent = "Switching to another tab will snap you right back.";
    }
  } else {
    iconWrapper.innerHTML = UNLOCKED_SVG;
    iconWrapper.className = "icon-wrapper unlocked";
    statusText.textContent = "No tab locked";
    statusText.className = "status-text unlocked";
    tabInfo.textContent = "";
    toggleBtn.textContent = "Lock This Tab";
    toggleBtn.className = "btn btn-lock";
    toggleBtn.disabled = false;
    timerSelectGroup.style.display = "flex";
    countdownGroup.style.display = "none";
    footerNote.textContent = "Lock focus to the current tab while you work.";
  }
}

function setLoading(loading) {
  toggleBtn.disabled = loading;
  if (loading) toggleBtn.textContent = "Working...";
}

// ─── Duration helpers ─────────────────────────────────────────────────────────

function getSelectedMinutes() {
  const val = durationSelect.value;
  if (val === "0") return 0;
  if (val === "custom") {
    const mins = parseInt(customMinutes.value, 10);
    return isNaN(mins) || mins < 1 ? 0 : mins;
  }
  return parseInt(val, 10);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabId    = activeTab.id;
  currentWindowId = activeTab.windowId;

  const state = await chrome.runtime.sendMessage({ action: "getState" });
  renderUI(state);
}

// ─── Dropdown — show/hide custom input ────────────────────────────────────────

durationSelect.addEventListener("change", () => {
  customInputGroup.style.display = durationSelect.value === "custom" ? "flex" : "none";
});

// ─── Toggle ───────────────────────────────────────────────────────────────────

toggleBtn.addEventListener("click", async () => {
  setLoading(true);
  try {
    if (currentState?.locked) {
      const res = await chrome.runtime.sendMessage({ action: "unlock" });
      if (res.blocked) {
        // Shouldn't reach here normally (button is disabled while timer runs),
        // but guard just in case.
        toggleBtn.disabled = true;
        toggleBtn.textContent = "Unlock Tab";
        setLoading(false);
        return;
      }
      renderUI({ locked: false, lockedTabId: null, lockedWindowId: null, unlockAt: null });
    } else {
      const minutes  = getSelectedMinutes();
      const unlockAt = minutes > 0 ? Date.now() + minutes * 60 * 1000 : null;
      await chrome.runtime.sendMessage({
        action: "lock",
        tabId: currentTabId,
        windowId: currentWindowId,
        unlockAt
      });
      renderUI({ locked: true, lockedTabId: currentTabId, lockedWindowId: currentWindowId, unlockAt });
    }
  } catch (err) {
    console.error("Tab Lock popup error:", err);
    statusText.textContent = "Error: " + err.message;
    statusText.className = "status-text";
  } finally {
    // Only re-enable if we're not in a timer-locked state
    if (!currentState?.unlockAt || Date.now() >= currentState.unlockAt) {
      setLoading(false);
    }
  }
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

init().catch((err) => {
  console.error("Tab Lock: popup init failed", err);
  statusText.textContent = "Failed to load.";
  statusText.className = "status-text";
  toggleBtn.disabled = true;
});
