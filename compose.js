const STORAGE_KEY = "targetScrapUrl";

const scrapUrlInput = document.getElementById("scrapUrl");
const saveScrapUrlButton = document.getElementById("saveScrapUrl");
const saveStatus = document.getElementById("saveStatus");
const pageTitleNode = document.getElementById("pageTitle");
const pageUrlNode = document.getElementById("pageUrl");
const selectedTextInput = document.getElementById("selectedText");
const commentInput = document.getElementById("comment");
const payloadInput = document.getElementById("payload");
const copyPayloadButton = document.getElementById("copyPayload");
const openScrapButton = document.getElementById("openScrap");
const openOptionsButton = document.getElementById("openOptions");

const pageData = {
  title: "",
  url: "",
  selectedText: ""
};

function getNowText() {
  const now = new Date();
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(now);
}

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

function buildPayload() {
  const lines = [];
  lines.push(`### ${pageData.title || "(No title)"}`);
  lines.push(`- URL: ${pageData.url || "(No URL)"}`);
  lines.push(`- Captured: ${getNowText()}`);

  const selected = selectedTextInput.value.trim();
  if (selected) {
    lines.push("");
    lines.push("```text");
    lines.push(selected);
    lines.push("```");
  }

  const comment = commentInput.value.trim();
  if (comment) {
    lines.push("");
    lines.push(comment);
  }

  return lines.join("\n");
}

function refreshPayload() {
  payloadInput.value = buildPayload();
}

async function copyPayload() {
  await navigator.clipboard.writeText(payloadInput.value);
}

async function loadStoredScrapUrl() {
  const data = await chrome.storage.sync.get([STORAGE_KEY]);
  scrapUrlInput.value = data[STORAGE_KEY] || "";
}

async function saveScrapUrl() {
  const normalized = normalizeZennScrapUrl(scrapUrlInput.value.trim());
  if (!normalized) {
    saveStatus.textContent = "有効な Zenn Scrap URL を入力してください。";
    return;
  }
  await chrome.storage.sync.set({ [STORAGE_KEY]: normalized });
  scrapUrlInput.value = normalized;
  saveStatus.textContent = "保存しました。";
}

function loadPageDataFromQuery() {
  const params = new URLSearchParams(window.location.search);
  pageData.title = params.get("title") || "";
  pageData.url = params.get("url") || "";
  pageData.selectedText = params.get("selectedText") || "";

  pageTitleNode.textContent = pageData.title || "(No title)";
  pageUrlNode.textContent = pageData.url || "(No URL)";
  pageUrlNode.href = pageData.url || "#";
  selectedTextInput.value = pageData.selectedText;
}

async function openScrap() {
  const scrapUrl = normalizeZennScrapUrl(scrapUrlInput.value.trim());
  if (!scrapUrl) {
    saveStatus.textContent = "先に有効な Scrap URL を設定してください。";
    return;
  }

  await copyPayload();
  await chrome.tabs.create({ url: scrapUrl });
  saveStatus.textContent = "Scrap を開き、追記テキストをコピーしました。貼り付けて送信してください。";
}

function setupEvents() {
  selectedTextInput.addEventListener("input", refreshPayload);
  commentInput.addEventListener("input", refreshPayload);
  saveScrapUrlButton.addEventListener("click", saveScrapUrl);

  copyPayloadButton.addEventListener("click", async () => {
    await copyPayload();
    saveStatus.textContent = "追記テキストをコピーしました。";
  });

  openScrapButton.addEventListener("click", openScrap);
  openOptionsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());
}

async function init() {
  loadPageDataFromQuery();
  setupEvents();
  await loadStoredScrapUrl();
  refreshPayload();
}

init();
