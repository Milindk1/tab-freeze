// background.js — Tab Lock Service Worker

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
    await Promise.all([
      chrome.action.setBadgeText({ text: "ON" }),
      chrome.action.setBadgeBackgroundColor({ color: "#E53E3E" }),
      chrome.action.setTitle({ title: "Tab Lock: ACTIVE — click to unlock" }),
      chrome.action.setIcon({
        path: {
          "16": "icons/locked-16.png",
          "32": "icons/locked-32.png",
          "48": "icons/locked-48.png",
          "128": "icons/locked-128.png"
        }
      })
    ]);
  } else {
    await Promise.all([
      chrome.action.setBadgeText({ text: "" }),
      chrome.action.setTitle({ title: "Tab Lock — click to lock this tab" }),
      chrome.action.setIcon({
        path: {
          "16": "icons/unlocked-16.png",
          "32": "icons/unlocked-32.png",
          "48": "icons/unlocked-48.png",
          "128": "icons/unlocked-128.png"
        }
      })
    ]);
  }
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function snapBackToLockedTab(lockedTabId, lockedWindowId) {
  try {
    await chrome.windows.update(lockedWindowId, { focused: true });
  } catch (_) {
    // Window may already be focused or gone — continue anyway
  }

  // Chrome rejects tabs.update mid-transition ("Tabs cannot be edited right now").
  // Retry up to 5 times with a short delay before giving up.
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await chrome.tabs.update(lockedTabId, { active: true });
      return;
    } catch (err) {
      if (attempt < 5 && err.message.includes("cannot be edited")) {
        await delay(50);
        continue;
      }
      // Tab genuinely gone — unlock cleanly
      await performUnlock();
      return;
    }
  }
}

async function performUnlock() {
  await setLockState({ locked: false, lockedTabId: null, lockedWindowId: null });
  await syncBadgeToState(false);
}

// ─── Event Listeners ──────────────────────────────────────────────────────────

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const state = await getLockState();
  if (!state.locked) return;
  if (activeInfo.tabId === state.lockedTabId) return;
  await snapBackToLockedTab(state.lockedTabId, state.lockedWindowId);
});

chrome.tabs.onCreated.addListener(async (tab) => {
  const state = await getLockState();
  if (!state.locked) return;
  try {
    await chrome.tabs.remove(tab.id);
  } catch (_) {}
  await snapBackToLockedTab(state.lockedTabId, state.lockedWindowId);
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const state = await getLockState();
  if (!state.locked) return;
  if (tabId !== state.lockedTabId) return;
  await performUnlock();
});

// ─── Message Handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((err) => sendResponse({ error: err.message }));
  return true;
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
