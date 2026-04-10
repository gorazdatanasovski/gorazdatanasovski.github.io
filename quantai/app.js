const BACKEND_URL = ""; // leave empty for frontend-only mode, or paste your future backend base URL
const PUBLICATION_GATE = true;

window.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const messages = document.getElementById("messages");
  const shareButton = document.getElementById("shareButton");
  const menuButton = document.getElementById("menuButton");
  const toast = document.getElementById("toast");
  const launchOverlay = document.getElementById("launchOverlay");
  const userTemplate = document.getElementById("userMessageTemplate");
  const assistantTemplate = document.getElementById("assistantMessageTemplate");
  const promptTop = document.getElementById("promptTop");
  const promptBottom = document.getElementById("promptBottom");
  const composerTop = document.getElementById("composerTop");
  const composerBottom = document.getElementById("composerBottom");
  const sendTop = document.getElementById("sendTop");
  const sendBottom = document.getElementById("sendBottom");
  const modeButtonTop = document.getElementById("modeButtonTop");
  const modeButtonBottom = document.getElementById("modeButtonBottom");
  const modeMenuTop = document.getElementById("modeMenuTop");
  const modeMenuBottom = document.getElementById("modeMenuBottom");
  const modeLabelTop = document.getElementById("modeLabelTop");
  const modeLabelBottom = document.getElementById("modeLabelBottom");

  let currentMode = "auto";
  let requestInFlight = false;
  const securities = ["SPX Index"];

  function showToast(text) {
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => { toast.classList.remove("show"); }, 1600);
  }

  function autosize(el) {
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  }

  function syncInputs(source, target) {
    if (!source || !target) return;
    target.value = source.value;
    autosize(target);
  }

  function syncBothInputs(text) {
    promptTop.value = text;
    promptBottom.value = text;
    autosize(promptTop);
    autosize(promptBottom);
  }

  function setMode(mode, label) {
    currentMode = mode;
    modeLabelTop.textContent = label;
    modeLabelBottom.textContent = label;
    closeMenus();
  }

  function closeMenus() {
    modeMenuTop.classList.add("hidden");
    modeMenuBottom.classList.add("hidden");
    modeButtonTop.classList.remove("is-open");
    modeButtonBottom.classList.remove("is-open");
  }

  function toggleMenu(which) {
    const isTop = which === "top";
    const button = isTop ? modeButtonTop : modeButtonBottom;
    const menu = isTop ? modeMenuTop : modeMenuBottom;
    const hidden = menu.classList.contains("hidden");
    closeMenus();
    if (hidden) {
      menu.classList.remove("hidden");
      button.classList.add("is-open");
    }
  }

  function activateChatLayout() {
    if (!body.classList.contains("chat-started")) {
      body.classList.add("chat-started");
    }
  }

  function showLaunchModal() {
    if (!launchOverlay) return;
    body.classList.add("modal-open");
    launchOverlay.classList.remove("hidden");
    launchOverlay.setAttribute("aria-hidden", "false");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function buildSourceCard(title, meta, text) {
    return `
      <div class="source">
        <div class="source-title">${escapeHtml(title)}</div>
        <div class="source-meta">${escapeHtml(meta)}</div>
        <div class="source-text">${escapeHtml(text)}</div>
      </div>
    `;
  }

  function createUserMessage(text) {
    const node = userTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".message-user-bubble").textContent = text;
    return node;
  }

  function createAssistantMessage(text) {
    const node = assistantTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".message-assistant-text").textContent = text;
    return node;
  }

  function renderDetails(node, result) {
    const details = node.querySelector(".details");
    const detailsBody = node.querySelector(".details-body");
    const fusion = result?.fusion_hits || [];
    const sources = result?.sources || [];
    let html = "";
    fusion.slice(0, 4).forEach((hit) => {
      const meta = hit.metadata || {};
      let metaLine = `${hit.source_type || hit.source_kind || "unknown"} | score=${Number(hit.score || 0).toFixed(4)}`;
      if (meta.security) metaLine += ` | ${meta.security}`;
      if (meta.note_type) metaLine += ` | ${meta.note_type}`;
      const text = String(hit.excerpt || hit.context_text || "").replace(/\s+/g, " ").slice(0, 420);
      html += buildSourceCard(hit.title || "Fusion hit", metaLine, text);
    });
    sources.slice(0, 6).forEach((hit) => {
      let metaLine = `score=${Number(hit.score || 0).toFixed(4)}`;
      if (hit.page_no !== undefined && hit.page_no !== null) metaLine += ` | p.${hit.page_no}`;
      if (hit.chunk_no !== undefined && hit.chunk_no !== null) metaLine += ` | c.${hit.chunk_no}`;
      const text = String(hit.text || "").replace(/\s+/g, " ").slice(0, 420);
      html += buildSourceCard(hit.file_name || "Source", metaLine, text);
    });
    if (!html) return;
    details.classList.remove("hidden");
    detailsBody.innerHTML = html;
  }

  async function backendQuery(query) {
    if (!BACKEND_URL) {
      return {
        response: "Frontend is live. Backend is not connected yet.",
        mode_used: "frontend_only",
        sources: [],
        fusion_hits: []
      };
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    try {
      const res = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, mode: currentMode, securities }),
        signal: controller.signal
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = payload.detail || payload.response || "Request failed.";
        throw new Error(detail);
      }
      return payload;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function submitQuery(query) {
    const userNode = createUserMessage(query);
    messages.appendChild(userNode);
    const assistantNode = createAssistantMessage("Thinking…");
    messages.appendChild(assistantNode);
    activateChatLayout();
    setSending(true);
    scrollToBottom();
    try {
      const payload = await backendQuery(query);
      assistantNode.querySelector(".message-assistant-text").textContent =
        payload.response || "No response produced.";
      renderDetails(assistantNode, payload);
    } catch (err) {
      const text =
        err && err.name === "AbortError"
          ? "Backend request timed out."
          : `Error: ${err && err.message ? err.message : String(err)}`;
      assistantNode.querySelector(".message-assistant-text").textContent = text;
    } finally {
      setSending(false);
      scrollToBottom();
    }
  }

  function setSending(state) {
    requestInFlight = state;
    sendTop.disabled = state;
    sendBottom.disabled = state;
  }

  function scrollToBottom() {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  async function handleSubmit(source) {
    if (requestInFlight) return;
    const query = source.value.trim();
    if (!query) return;
    if (PUBLICATION_GATE) {
      showLaunchModal();
      return;
    }
    syncBothInputs("");
    await submitQuery(query);
  }

  promptTop.addEventListener("input", () => { autosize(promptTop); syncInputs(promptTop, promptBottom); });
  promptBottom.addEventListener("input", () => { autosize(promptBottom); syncInputs(promptBottom, promptTop); });

  promptTop.addEventListener("keydown", async (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); await handleSubmit(promptTop); }
  });
  promptBottom.addEventListener("keydown", async (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); await handleSubmit(promptBottom); }
  });

  composerTop.addEventListener("submit", async (e) => { e.preventDefault(); await handleSubmit(promptTop); });
  composerBottom.addEventListener("submit", async (e) => { e.preventDefault(); await handleSubmit(promptBottom); });

  modeButtonTop.addEventListener("click", (e) => { e.preventDefault(); toggleMenu("top"); });
  modeButtonBottom.addEventListener("click", (e) => { e.preventDefault(); toggleMenu("bottom"); });

  [modeMenuTop, modeMenuBottom].forEach((menu) => {
    menu.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => { setMode(btn.dataset.mode, btn.textContent.trim()); });
    });
  });

  document.addEventListener("click", (e) => {
    if (
      !modeMenuTop.contains(e.target) &&
      !modeMenuBottom.contains(e.target) &&
      !modeButtonTop.contains(e.target) &&
      !modeButtonBottom.contains(e.target)
    ) { closeMenus(); }
  });

  shareButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("Link copied");
    } catch {
      showToast("Copy failed");
    }
  });

  menuButton.addEventListener("click", () => { showToast("Menu placeholder"); });

  autosize(promptTop);
  autosize(promptBottom);
});