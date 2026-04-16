const STORAGE_KEY = "targetScrapUrl";
const BLOCKED_DOMAINS_KEY = "blockedDomainPatterns";

const scrapUrlInput = document.getElementById("scrapUrl");
const blockedDomainsInput = document.getElementById("blockedDomains");
const saveButton = document.getElementById("save");
const statusNode = document.getElementById("status");

function normalizeZennScrapUrl(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (parsed.origin !== "https://zenn.dev") return "";
    if (!/^\/[^/]+\/scraps\/[^/]+\/?$/.test(parsed.pathname)) return "";
    return parsed.toString();
  } catch (error) {
    return "";
  }
}

function normalizeDomainPattern(raw) {
  let value = (raw || "").trim().toLowerCase();
  if (!value) return "";

  if (value.includes("://")) {
    try {
      value = new URL(value).hostname.toLowerCase();
    } catch (error) {
      return "";
    }
  }

  value = value.split("/")[0].trim();
  value = value.replace(/^\.+/, "");
  if (!value) return "";

  if (!/^[a-z0-9.*-]+$/.test(value)) return "";
  return value;
}

function parseBlockedDomainPatterns(text) {
  const lines = text
    .split("\n")
    .map((line) => normalizeDomainPattern(line))
    .filter(Boolean);

  return Array.from(new Set(lines));
}

async function restore() {
  const data = await chrome.storage.sync.get([STORAGE_KEY, BLOCKED_DOMAINS_KEY]);
  scrapUrlInput.value = data[STORAGE_KEY] || "";
  blockedDomainsInput.value = Array.isArray(data[BLOCKED_DOMAINS_KEY])
    ? data[BLOCKED_DOMAINS_KEY].join("\n")
    : "";
}

async function save() {
  const normalized = normalizeZennScrapUrl(scrapUrlInput.value.trim());
  if (!normalized) {
    statusNode.textContent = "有効な Zenn Scrap URL を入力してください。";
    return;
  }
  const blockedPatterns = parseBlockedDomainPatterns(blockedDomainsInput.value || "");
  await chrome.storage.sync.set({
    [STORAGE_KEY]: normalized,
    [BLOCKED_DOMAINS_KEY]: blockedPatterns
  });
  scrapUrlInput.value = normalized;
  blockedDomainsInput.value = blockedPatterns.join("\n");
  statusNode.textContent = "保存しました。";
}

saveButton.addEventListener("click", save);
restore();
