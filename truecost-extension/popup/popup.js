import { getToken, setToken, removeToken, getScope, setScope } from "../lib/auth.js";
import { fetchBudgetSummary } from "../lib/api.js";

// ── Screens ────────────────────────────────────────────────────
const screens = {
  loading:   document.getElementById("loading"),
  login:     document.getElementById("login"),
  dashboard: document.getElementById("dashboard"),
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.add("hidden"));
  screens[name].classList.remove("hidden");
}

function formatAmount(amount) {
  return "₹" + Math.abs(amount).toLocaleString("en-IN");
}

// ── Scope Toggle ───────────────────────────────────────────────
const scopePersonalBtn  = document.getElementById("scope-personal");
const scopeHouseholdBtn = document.getElementById("scope-household");

async function initScope() {
  const scope = await getScope();
  updateScopeButtons(scope);
}

function updateScopeButtons(scope) {
  if (scope === "personal") {
    scopePersonalBtn.classList.add("active");
    scopeHouseholdBtn.classList.remove("active");
  } else {
    scopeHouseholdBtn.classList.add("active");
    scopePersonalBtn.classList.remove("active");
  }
}

scopePersonalBtn.addEventListener("click", async () => {
  await setScope("personal");
  updateScopeButtons("personal");
  await loadDashboard();
});

scopeHouseholdBtn.addEventListener("click", async () => {
  await setScope("household");
  updateScopeButtons("household");
  await loadDashboard();
});

// ── Login ──────────────────────────────────────────────────────
const loginBtn   = document.getElementById("login-btn");
const logoutBtn  = document.getElementById("logout-btn");
const loginError = document.getElementById("login-error");

loginBtn.addEventListener("click", async () => {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) {
    loginError.textContent = "Please enter username and password";
    loginError.classList.remove("hidden");
    return;
  }

  loginBtn.textContent = "Signing in...";
  loginError.classList.add("hidden");

  try {
    const response = await fetch("https://api.amsterhamster.com/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client": "extension",       // tells backend to include token in JSON body
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || "Login failed");

    await setToken(data.data.token);
    await loadDashboard();
  } catch (err) {
    loginError.textContent = err.message;
    loginError.classList.remove("hidden");
    loginBtn.textContent = "Sign In";
  }
});

logoutBtn.addEventListener("click", async () => {
  await removeToken();
  showScreen("login");
});

document.getElementById("password").addEventListener("keydown", (e) => {
  if (e.key === "Enter") loginBtn.click();
});

document.getElementById("username").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("password").focus();
});

// ── Dashboard ──────────────────────────────────────────────────
async function loadDashboard() {
  showScreen("loading");
  await initScope();

  try {
    const data     = await fetchBudgetSummary();
    const pct      = data.percentage_used;
    const remaining = data.remaining;
    const isOverBudget = remaining < 0;

    const color = pct >= 100 ? "#c9372c"
                : pct >= 90  ? "#e07b39"
                : pct >= 70  ? "#d4a017"
                : "#2d8a4e";

    // Remaining amount
    document.getElementById("remaining-amount").textContent = isOverBudget
      ? `-${formatAmount(remaining)}`
      : formatAmount(remaining);
    document.getElementById("remaining-amount").style.color = isOverBudget
      ? "#c9372c"
      : "#ffffff";

    // Percentage
    document.getElementById("percentage-used").textContent = pct + "% used";
    document.getElementById("percentage-used").style.color = isOverBudget
      ? "#c9372c"
      : "rgba(255,255,255,0.5)";

    // Progress bar
    document.getElementById("progress-fill").style.width      = Math.min(pct, 100) + "%";
    document.getElementById("progress-fill").style.background = color;

    // Sub text
    document.getElementById("budget-sub").textContent = isOverBudget
      ? `⚠️ Over budget by ${formatAmount(remaining)}`
      : `${formatAmount(data.spent)} spent of ${formatAmount(data.budget)}`;
    document.getElementById("budget-sub").style.color = isOverBudget
      ? "#c9372c"
      : "#999";

    showScreen("dashboard");
  } catch (err) {
    await removeToken();
    showScreen("login");
  }
}

// ── Init ───────────────────────────────────────────────────────
async function init() {
  const token = await getToken();
  if (token) {
    await loadDashboard();
  } else {
    showScreen("login");
  }
}

init();