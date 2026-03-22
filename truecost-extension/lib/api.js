import { getToken, getScope } from "./auth.js";

const BASE_URL = "https://truecost-production.up.railway.app";

export async function fetchBudgetSummary() {
  const token = await getToken();
  const scope = await getScope();
  if (!token) throw new Error("Not logged in");

  const response = await fetch(`${BASE_URL}/api/budget/summary?scope=${scope}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error("Failed to fetch budget");
  return response.json();
}

export async function fetchNudge(price) {
  const token = await getToken();
  const scope = await getScope();
  if (!token) throw new Error("Not logged in");

  const response = await fetch(`${BASE_URL}/api/nudge/check`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ price, scope }),
  });

  if (!response.ok) throw new Error("Failed to fetch nudge");
  return response.json();
}