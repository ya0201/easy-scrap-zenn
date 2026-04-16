const STORAGE_KEY = "targetScrapUrl";

async function getSelectionText(tabId) {
  if (!tabId) return "";
  try {
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const selection = window.getSelection();
        return selection ? selection.toString().trim() : "";
      }
    });
    return result?.[0]?.result || "";
  } catch (error) {
    return "";
  }
}

function normalizeZennScrapUrl(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (parsed.origin !== "https://zenn.dev") return "";
    if (!/^\/[^/]+\/scraps\/[^/]+\/?$/.test(parsed.pathname)) return "";
    parsed.hash = "";
    return parsed.toString();
  } catch (error) {
    return "";
  }
}

function buildPayload({ title, url, selectedText }) {
  const lines = [];
  lines.push(`### ${title || "(No title)"}`);
  lines.push(`- URL: ${url || "(No URL)"}`);
  lines.push(`- Captured: ${new Date().toLocaleString("ja-JP")}`);

  if (selectedText) {
    lines.push("");
    lines.push("### Selected Text");
    lines.push("```text");
    lines.push(selectedText);
    lines.push("```");
  }

  lines.push("");
  lines.push("");

  return lines.join("\n");
}

async function waitForTabComplete(tabId, timeoutMs = 15000) {
  const initial = await chrome.tabs.get(tabId);
  if (initial.status === "complete") return true;

  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      chrome.tabs.onUpdated.removeListener(onUpdated);
      resolve(false);
    }, timeoutMs);

    function onUpdated(updatedTabId, info) {
      if (updatedTabId !== tabId || info.status !== "complete" || settled) return;
      settled = true;
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      resolve(true);
    }

    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}

async function injectPayload(tabId, payload) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: async (text) => {
        function setTextareaValue(node, value) {
          const descriptor = Object.getOwnPropertyDescriptor(
            HTMLTextAreaElement.prototype,
            "value"
          );
          if (descriptor?.set) {
            descriptor.set.call(node, value);
          } else {
            node.value = value;
          }
          node.dispatchEvent(new InputEvent("input", { bubbles: true }));
          node.dispatchEvent(new Event("change", { bubbles: true }));
          node.focus();
          const end = node.value.length;
          node.setSelectionRange(end, end);
        }

        function setContentEditable(node, value) {
          node.focus();
          const selection = window.getSelection();
          if (selection) {
            const range = document.createRange();
            range.selectNodeContents(node);
            selection.removeAllRanges();
            selection.addRange(range);
          }

          const inserted = document.execCommand("insertText", false, value);
          if (inserted) {
            node.focus();
            return;
          }

          node.textContent = value;
          node.dispatchEvent(new InputEvent("input", { bubbles: true, data: value }));
          node.dispatchEvent(new Event("change", { bubbles: true }));
          node.focus();
          if (selection) {
            const endRange = document.createRange();
            endRange.selectNodeContents(node);
            endRange.collapse(false);
            selection.removeAllRanges();
            selection.addRange(endRange);
          }
        }

        function findEditor() {
          const zennEditor = document.querySelector(
            '.cm-content[contenteditable="true"][role="textbox"][aria-placeholder*="コメント"]'
          );
          if (zennEditor) return { type: "editable", node: zennEditor };

          const zennEditorFallback = document.querySelector(
            '.ScrapThread_threadEditorContainer__SdjL0 .cm-content[contenteditable="true"][role="textbox"]'
          );
          if (zennEditorFallback) return { type: "editable", node: zennEditorFallback };

          const textarea = document.querySelector("textarea");
          if (textarea) return { type: "textarea", node: textarea };

          const editable = document.querySelector('[contenteditable="true"]');
          if (editable) return { type: "editable", node: editable };

          return null;
        }

        const started = Date.now();
        while (Date.now() - started < 15000) {
          const editor = findEditor();
          if (editor) {
            if (editor.type === "textarea") {
              setTextareaValue(editor.node, text);
            } else {
              setContentEditable(editor.node, text);
            }
            return true;
          }
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        return false;
      },
      args: [payload]
    });
  } catch (error) {
    // Keep silent when Zenn editor cannot be targeted.
  }
}

async function handleDirectOpen() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !tab.id) return;

  const data = await chrome.storage.sync.get([STORAGE_KEY]);
  const scrapUrl = normalizeZennScrapUrl(data[STORAGE_KEY] || "");
  if (!scrapUrl) {
    await chrome.runtime.openOptionsPage();
    return;
  }

  const selectedText = await getSelectionText(tab.id);
  const payload = buildPayload({
    title: tab.title || "",
    url: tab.url || "",
    selectedText
  });

  const openedTab = await chrome.tabs.create({ url: scrapUrl });
  if (!openedTab?.id) return;
  await waitForTabComplete(openedTab.id);
  await injectPayload(openedTab.id, payload);
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "open_capture_screen") return;
  await handleDirectOpen();
});

chrome.action.onClicked.addListener(async () => {
  await handleDirectOpen();
});
