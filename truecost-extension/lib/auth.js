const TOKEN_KEY = "truecost_token";
const SCOPE_KEY = "truecost_scope";

export async function getToken() {
  const result = await chrome.storage.local.get(TOKEN_KEY);
  return result[TOKEN_KEY] || null;
}

export async function setToken(token) {
  await chrome.storage.local.set({ [TOKEN_KEY]: token });
}

export async function removeToken() {
  await chrome.storage.local.remove(TOKEN_KEY);
}

export async function getScope() {
  const result = await chrome.storage.local.get(SCOPE_KEY);
  return result[SCOPE_KEY] || "personal";
}

export async function setScope(scope) {
  await chrome.storage.local.set({ [SCOPE_KEY]: scope });
}