"use client";

const KEY = "adplanner_default_ad_account_id";

export function getDefaultAdAccountId() {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
}

export function setDefaultAdAccountId(accountId: string) {
  if (typeof window === "undefined") return;
  try {
    if (!accountId) {
      window.localStorage.removeItem(KEY);
      return;
    }
    window.localStorage.setItem(KEY, accountId);
  } catch {
    // ignore
  }
}

export function pickAccountWithDefault<T extends { id: string }>(accounts: T[], fallback = "") {
  const saved = getDefaultAdAccountId();
  if (saved && accounts.some((item) => item.id === saved)) return saved;
  return fallback || accounts[0]?.id || "";
}

export function applyDefaultAdAccount<T extends { id: string }>(accounts: T[], nextAccountId?: string | null) {
  const selected = nextAccountId || pickAccountWithDefault(accounts);
  if (selected) {
    setDefaultAdAccountId(selected);
  }
  return selected;
}
