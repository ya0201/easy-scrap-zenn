const STORAGE_KEY = "targetScrapUrl";

const scrapUrlInput = document.getElementById("scrapUrl");
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

async function restore() {
  const data = await chrome.storage.sync.get([STORAGE_KEY]);
  scrapUrlInput.value = data[STORAGE_KEY] || "";
}

async function save() {
  const normalized = normalizeZennScrapUrl(scrapUrlInput.value.trim());
  if (!normalized) {
    statusNode.textContent = "有効な Zenn Scrap URL を入力してください。";
    return;
  }
  await chrome.storage.sync.set({ [STORAGE_KEY]: normalized });
  scrapUrlInput.value = normalized;
  statusNode.textContent = "保存しました。";
}

saveButton.addEventListener("click", save);
restore();
