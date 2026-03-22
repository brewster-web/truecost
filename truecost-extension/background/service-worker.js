const BASE_URL = "http://localhost:8000";
const TOKEN_KEY = "truecost_token";

// ── Fetch budget and update badge ──────────────────────────────
async function updateBadge() {
  const result = await chrome.storage.local.get(TOKEN_KEY);
  const token = result[TOKEN_KEY];

  if (!token) {
    chrome.action.setBadgeText({ text: "" });
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/budget/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      chrome.action.setBadgeText({ text: "" });
      return;
    }

    const data = await response.json();
    const pct = data.percentage_used;

    // Set badge color based on percentage
    const color = pct >= 100 ? "#c9372c"   // Red — over budget
                : pct >= 90  ? "#e07b39"   // Orange — 90-100%
                : pct >= 70  ? "#d4a017"   // Yellow — 70-90%
                : "#2d8a4e";               // Green — under 70%

    chrome.action.setBadgeBackgroundColor({ color });
    chrome.action.setBadgeText({ text: "  " }); // Space shows the color dot

  } catch (err) {
    console.log("TrueCost badge update failed:", err);
    chrome.action.setBadgeText({ text: "" });
  }
}

// ── Set up alarm for periodic updates ─────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  console.log("TrueCost service worker installed");
  chrome.alarms.create("budget-refresh", { periodInMinutes: 30 });
  updateBadge(); // Run immediately on install
});

// ── Run on alarm ───────────────────────────────────────────────
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "budget-refresh") {
    updateBadge();
  }
});

// ── Run when token is saved (after login) ─────────────────────
chrome.storage.onChanged.addListener((changes) => {
  if (changes[TOKEN_KEY]) {
    updateBadge();
  }
});