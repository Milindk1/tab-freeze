// background.js — Tab Lock Service Worker
// All listeners are registered at the top level so they re-register
// on every service worker wake-up. State is always read from
// chrome.storage.session (never from module-level variables).

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getLockState() {
  return chrome.storage.session.get({
    locked: false,
    lockedTabId: null,
    lockedWindowId: null
  });
}

async function setLockState(partial) {
  return chrome.storage.session.set(partial);
}

async function syncBadgeToState(locked) {
  if (locked) {
    await chrome.action.setBadgeText({ text: "ON" });
    await chrome.action.setBadgeBackgroundColor({ color: "#E53E3E" });
    await chrome.action.setTitle({ title: "Tab Lock: ACTIVE — click to unlock" });
    await chrome.action.setIcon({
      path: {
        "16": "icons/locked-16.png",
        "32": "icons/locked-32.png",
        "48": "icons/locked-48.png",
        "128": "icons/locked-128.png"
      }
    });
  } else {
    await chrome.action.setBadgeText({ text: "" });
    await chrome.action.setTitle({ title: "Tab Lock — click to lock this tab" });
    await chrome.action.setIcon({
      path: {
        "16": "icons/unlocked-16.png",
        "32": "icons/unlocked-32.png",
        "48": "icons/unlocked-48.png",
        "128": "icons/unlocked-128.png"
      }
    });
  }
}

async function snapBackToLockedTab(lockedTabId, lockedWindowId) {
  try {
    await chrome.windows.update(lockedWindowId, { focused: true });
    await chrome.tabs.update(lockedTabId, { active: true });
  } catch (err) {
    // Locked tab or window no longer exists — unlock cleanly
    console.warn("Tab Lock: snap-back failed, unlocking.", err);
    await performUnlock();
  }
}

async function performUnlock() {
  await setLockState({ locked: false, lockedTabId: null, lockedWindowId: null });
  await syncBadgeToState(false);
}

// ─── Event Listeners ──────────────────────────────────────────────────────────

// Primary snap-back: fires whenever the active tab in any window changes.
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const state = await getLockState();
  if (!state.locked) return;
  if (activeInfo.tabId === state.lockedTabId) return;

  await snapBackToLockedTab(state.lockedTabId, state.lockedWindowId);
});

// New tab opened while locked: close it and snap back.
chrome.tabs.onCreated.addListener(async (tab) => {
  const state = await getLockState();
  if (!state.locked) return;

  try {
    await chrome.tabs.remove(tab.id);
  } catch (err) {
    console.warn("Tab Lock: could not close new tab.", err);
  }

  await snapBackToLockedTab(state.lockedTabId, state.lockedWindowId);
});

// Locked tab was closed: auto-unlock.
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const state = await getLockState();
  if (!state.locked) return;
  if (tabId !== state.lockedTabId) return;

  console.log("Tab Lock: locked tab closed — unlocking.");
  await performUnlock();
});

// ─── Message Handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((err) => {
      console.error("Tab Lock: message error", err);
      sendResponse({ error: err.message });
    });
  return true; // Keep channel open for async response
});

async function handleMessage(message) {
  switch (message.action) {
    case "getState":
      return getLockState();

    case "lock": {
      const { tabId, windowId } = message;
      await setLockState({ locked: true, lockedTabId: tabId, lockedWindowId: windowId });
      await syncBadgeToState(true);
      return { success: true };
    }

    case "unlock":
      await performUnlock();
      return { success: true };

    default:
      return { error: "Unknown action: " + message.action };
  }
}
