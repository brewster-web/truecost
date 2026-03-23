const BASE_URL = "https://truecost-production.up.railway.app";
const TOKEN_KEY = "truecost_token";

async function updateBadge() {
  const result = await chrome.storage.local.get(TOKEN_KEY);
  const token = result[TOKEN_KEY];

  if (!token) {
    chrome.action.setBadgeText({ text: "" });
    return;
  }

  try {
    const scope = (await chrome.storage.local.get("truecost_scope"))["truecost_scope"] || "personal";

    const response = await fetch(`${BASE_URL}/api/budget/summary?scope=${scope}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      chrome.action.setBadgeText({ text: "" });
      return;
    }

    const data = await response.json();
    const pct = data.percentage_used;

    if (pct >= 100) {
      // Over budget — show red ! badge
      chrome.action.setBadgeBackgroundColor({ color: "#c9372c" });
      chrome.action.setBadgeText({ text: "!" });
    } else {
      // Under budget — no badge
      chrome.action.setBadgeText({ text: "" });
    }

  } catch (err) {
    chrome.action.setBadgeText({ text: "" });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("TrueCost service worker installed");
  chrome.alarms.create("budget-refresh", { periodInMinutes: 30 });
  updateBadge();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "budget-refresh") {
    updateBadge();
  }
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes[TOKEN_KEY] || changes["truecost_scope"]) {
    updateBadge();
  }
});