console.log("TrueCost content script loaded");

// ── Price Detection ────────────────────────────────────────────
function getAmazonPrice() {
  const selectors = [
    ".priceToPay .a-price-whole",
    "#priceblock_ourprice",
    "#priceblock_dealprice",
    ".a-price .a-price-whole",
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) {
      const raw = el.textContent.replace(/[,.\s]/g, "").trim();
      const price = parseFloat(raw);
      if (!isNaN(price) && price > 0) return price;
    }
  }
  return null;
}

function isProductPage() {
  return window.location.pathname.includes("/dp/");
}

// ── Fetch budget impact from backend ──────────────────────────
async function getNudge(price) {
  const result = await chrome.storage.local.get(["truecost_token", "truecost_scope"]);
  const token  = result["truecost_token"];
  const scope  = result["truecost_scope"] || "personal";

  if (!token) return null;

  const response = await fetch("http://localhost:8000/api/nudge/check", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ price, scope }),
  });

  if (!response.ok) return null;
  return response.json();
}

// ── Build and show the overlay ─────────────────────────────────
function showNudge(nudge) {
  if (document.getElementById("truecost-nudge")) return;

  const canAfford  = nudge.can_afford;
  const color      = canAfford ? "#2d8a4e" : "#c9372c";
  const emoji      = canAfford ? "✅" : "⚠️";
  const scopeLabel = nudge.scope === "household" ? "Household" : "Personal";

  const banner = document.createElement("div");
  banner.id = "truecost-nudge";
  banner.innerHTML = `
    <style>
      @keyframes truecost-slide {
        0%   { opacity: 0; transform: translateY(16px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      #truecost-nudge-inner {
        animation: truecost-slide 0.3s ease forwards;
      }
    </style>
    <div id="truecost-nudge-inner" style="
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 300px;
      background: #fff;
      border-radius: 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      font-family: 'Inter', system-ui, sans-serif;
      z-index: 999999;
      overflow: hidden;
      border: 1px solid #e8e4dc;
    ">
      <!-- Header -->
      <div style="background: #1a1a1a; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
        <span style="color: #fff; font-weight: 700; font-size: 14px;">TrueCost</span>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: rgba(255,255,255,0.5); font-size: 11px;">${scopeLabel}</span>
          <button id="truecost-close" style="background: none; border: none; color: rgba(255,255,255,0.5); cursor: pointer; font-size: 18px; line-height: 1;">×</button>
        </div>
      </div>

      <!-- Body -->
      <div style="padding: 16px;">
        <p style="font-size: 13px; color: #666; margin: 0 0 8px;">This purchase costs</p>
        <p style="font-size: 24px; font-weight: 700; color: #111; margin: 0 0 12px;">₹${nudge.price.toLocaleString("en-IN")}</p>

        <div style="background: #f5f3ef; border-radius: 10px; padding: 12px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 12px; color: #666;">Budget used after purchase</span>
            <span style="font-size: 12px; font-weight: 700; color: ${color};">${nudge.new_percentage}%</span>
          </div>
          <div style="background: #e8e4dc; border-radius: 99px; height: 6px; overflow: hidden;">
            <div style="width: ${Math.min(nudge.new_percentage, 100)}%; height: 100%; background: ${color}; border-radius: 99px;"></div>
          </div>
        </div>

        <p style="font-size: 13px; color: ${color}; font-weight: 600; margin: 0 0 12px;">
          ${emoji} ${canAfford
            ? `₹${nudge.remaining.toLocaleString("en-IN")} remaining after this`
            : "You're over budget!"}
        </p>

        ${nudge.hours_equivalent
          ? `<p style="font-size: 12px; color: #666; margin: 0 0 12px;">⏱️ That's ${nudge.hours_equivalent} hrs of your work</p>`
          : ""}

        <!-- Need / Want / Indulge -->
        <p style="font-size: 11px; color: #999; margin: 0 0 8px;">How would you classify this?</p>
        <div style="display: flex; gap: 6px;">
          <button class="truecost-classify" data-type="Need" style="flex:1; padding: 6px; font-size: 11px; font-weight: 600; border-radius: 6px; border: 1px solid #2563eb; color: #2563eb; background: #fff; cursor: pointer;">Need</button>
          <button class="truecost-classify" data-type="Want" style="flex:1; padding: 6px; font-size: 11px; font-weight: 600; border-radius: 6px; border: 1px solid #7c3aed; color: #7c3aed; background: #fff; cursor: pointer;">Want</button>
          <button class="truecost-classify" data-type="Indulge" style="flex:1; padding: 6px; font-size: 11px; font-weight: 600; border-radius: 6px; border: 1px solid #d6336c; color: #d6336c; background: #fff; cursor: pointer;">Indulge</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(banner);

  document.getElementById("truecost-close").addEventListener("click", () => {
    banner.remove();
  });

  banner.querySelectorAll(".truecost-classify").forEach(btn => {
    btn.addEventListener("click", () => {
      showCoolingOff(banner, btn.dataset.type, nudge.price);
    });
  });
}

// ── Cooling off message ────────────────────────────────────────
function showCoolingOff(banner, type, price) {
  const isImpulse = type === "Want" || type === "Indulge";
  const bodyEl    = banner.querySelector("#truecost-nudge-inner > div:last-child");

  if (isImpulse) {
    bodyEl.innerHTML = `
      <p style="font-size: 20px; text-align: center; margin-bottom: 8px;">⏳</p>
      <p style="font-size: 14px; font-weight: 700; color: #111; text-align: center; margin-bottom: 6px;">Sleep on it!</p>
      <p style="font-size: 12px; color: #666; text-align: center; margin-bottom: 16px;">
        You marked this as <strong>${type}</strong>. Give it 24 hours before buying ₹${price.toLocaleString("en-IN")}.
      </p>
      <button id="truecost-dismiss" style="width:100%; padding:8px; background:#1a1a1a; color:#fff; border:none; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer;">Got it</button>
    `;
  } else {
    bodyEl.innerHTML = `
      <p style="font-size: 20px; text-align: center; margin-bottom: 8px;">✅</p>
      <p style="font-size: 14px; font-weight: 700; color: #111; text-align: center; margin-bottom: 6px;">Sounds like a Need!</p>
      <p style="font-size: 12px; color: #666; text-align: center; margin-bottom: 16px;">Good call. Needs are fine to buy.</p>
      <button id="truecost-dismiss" style="width:100%; padding:8px; background:#1a1a1a; color:#fff; border:none; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer;">Got it</button>
    `;
  }

  document.getElementById("truecost-dismiss").addEventListener("click", () => {
    banner.remove();
  });
}

// ── Init ───────────────────────────────────────────────────────
async function init() {
  if (!isProductPage()) return;

  const price = getAmazonPrice();
  if (!price) return;

  console.log("TrueCost detected price: ₹" + price);

  const nudge = await getNudge(price);
  if (!nudge) return;

  showNudge(nudge);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}