"use client";

const AD_ACCOUNT_KEY = "adplanner_default_ad_account_id";
const PAGE_KEY = "adplanner_default_page_id";

function getSavedValue(key: string) {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function setSavedValue(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    if (!value) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function pickWithDefault<T extends { id: string }>(items: T[], saved: string, fallback = "") {
  if (saved && items.some((item) => item.id === saved)) return saved;
  if (fallback && items.some((item) => item.id === fallback)) return fallback;
  return items[0]?.id || "";
}

export function getDefaultAdAccountId() {
  return getSavedValue(AD_ACCOUNT_KEY);
}

export function setDefaultAdAccountId(accountId: string) {
  setSavedValue(AD_ACCOUNT_KEY, accountId);
}

export function getDefaultPageId() {
  return getSavedValue(PAGE_KEY);
}

export function setDefaultPageId(pageId: string) {
  setSavedValue(PAGE_KEY, pageId);
}

export function pickAccountWithDefault<T extends { id: string }>(accounts: T[], fallback = "") {
  return pickWithDefault(accounts, getDefaultAdAccountId(), fallback);
}

export function applyDefaultAdAccount<T extends { id: string }>(accounts: T[], nextAccountId?: string | null) {
  const selected = nextAccountId || pickAccountWithDefault(accounts);
  if (selected) {
    setDefaultAdAccountId(selected);
  }
  return selected;
}

export function pickPageWithDefault<T extends { id: string }>(pages: T[], fallback = "") {
  return pickWithDefault(pages, getDefaultPageId(), fallback);
}

export function applyDefaultPage<T extends { id: string }>(pages: T[], nextPageId?: string | null) {
  const selected = nextPageId || pickPageWithDefault(pages);
  if (selected) {
    setDefaultPageId(selected);
  }
  return selected;
}
