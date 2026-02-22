# Tab Lock — Chrome Extension

**Stay focused. Lock yourself to one tab.**

Tab Lock is a free Chrome extension that locks your browser to a single tab. The moment you try to switch to another tab — whether by clicking, pressing Ctrl+Tab, or opening a new one — Chrome snaps you right back. No willpower required.

---

## What It Does

- **Lock any tab** with one click
- **Snap back automatically** if you try to switch away
- **Blocks new tabs** from opening while locked
- **Auto-unlocks** if you close the locked tab
- Works across multiple windows

---

## Screenshots

| Unlocked | Locked |
|---|---|
| Green padlock, ready to lock | Red padlock + red "ON" badge, fully active |

---

## Installation (from GitHub)

> You do not need to know how to code. Just follow these steps exactly.

### Step 1 — Download the extension

1. Go to the GitHub repository page for this extension
2. Click the green **Code** button (near the top right)
3. Click **Download ZIP**

4. Find the downloaded ZIP file on your computer (usually in your **Downloads** folder)
5. **Double-click** the ZIP file to unzip it — this creates a folder called something like `tab-freeze-main`

---

### Step 2 — Load the extension in Chrome

1. Open **Google Chrome**
2. In the address bar at the top, type:
   ```
   chrome://extensions
   ```
   and press **Enter**

3. In the top-right corner of that page, turn on **Developer mode**

   ![Developer mode toggle](https://i.imgur.com/placeholder-devmode.png)

4. A row of buttons will appear. Click **Load unpacked**

5. A file browser will open. Navigate to the folder you unzipped in Step 1 (e.g. `tab-freeze-main` inside your Downloads folder). **Select the folder itself** (not any file inside it) and click **Open** / **Select Folder**

6. Tab Lock will appear in your list of extensions with a green checkmark ✓

---

### Step 3 — Pin it to your toolbar (recommended)

By default Chrome may hide extension icons. To always see Tab Lock:

1. Click the **puzzle piece icon** (🧩) in the top-right of Chrome
2. Find **Tab Lock** in the list
3. Click the **pin icon** next to it

The padlock icon will now always be visible in your toolbar.

---

## How to Use

### Locking a tab

1. Go to the tab you want to focus on
2. Click the **padlock icon** in your Chrome toolbar
3. Click the blue **"Lock This Tab"** button

The icon turns red and shows an **ON** badge. You are now locked in.

> Try clicking another tab — Chrome will snap you back immediately.

### Unlocking

1. Click the **padlock icon** in your toolbar
2. Click the red **"Unlock Tab"** button

The icon turns green again. You can now switch tabs freely.

### What happens if the locked tab is closed?

The lock releases automatically. No action needed.

---

## Frequently Asked Questions

**Will this stop me from using the address bar or closing Chrome?**
No. Tab Lock only prevents switching to other browser tabs. You can still type in the address bar, use bookmarks, and close the browser normally.

**Does it work if I open Chrome in a new window?**
Yes. If you try to switch focus to a tab in a different window, Tab Lock will bring you back to the locked tab in its original window.

**Can I still scroll or interact with the locked tab?**
Yes — Tab Lock does not interfere with anything you do on the locked tab. It only prevents you from leaving it.

**Does Tab Lock send any data anywhere?**
No. The extension has no network access and does not collect or transmit any data. All it does is watch which tab is active and redirect focus when needed. You can verify this by looking at the source code — it's tiny.

**What permissions does it use and why?**

| Permission | Why it's needed |
|---|---|
| `tabs` | To know which tab is active and switch back to the locked one |
| `storage` | To remember which tab is locked even if Chrome idles |
| `activeTab` | To read which tab you're on when you click the extension icon |

**The extension isn't visible in my toolbar — where is it?**
Click the 🧩 puzzle piece icon next to the address bar and pin Tab Lock (see Step 3 above).

**I see a brief flash of another tab before snapping back — is that normal?**
Yes. Chrome does not allow extensions to completely block tab switching at the OS level, so there is a very brief moment before snap-back occurs. This is the same behavior all focus-lock browser extensions use.

---

## Uninstalling

1. Go to `chrome://extensions`
2. Find **Tab Lock**
3. Click **Remove** and confirm

---

## Technical Details

For developers who want to know how it works:

- **Manifest V3** Chrome extension
- **Service worker** (`background.js`) listens to `chrome.tabs.onActivated`, `chrome.tabs.onCreated`, and `chrome.tabs.onRemoved`
- Lock state is stored in `chrome.storage.session` so it survives service worker restarts but clears when the browser closes
- `chrome.tabs.update()` and `chrome.windows.update()` are used to snap focus back
- No external dependencies — icons are pre-built and included in the repo

---

## License

MIT — free to use, modify, and distribute.
