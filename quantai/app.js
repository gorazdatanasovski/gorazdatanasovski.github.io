const BACKEND_URL = ""; // leave empty for frontend-only mode, or paste your future backend base URL
const PUBLICATION_GATE = true;

window.addEventListener("DOMContentLoaded", () => {
  const root = document.documentElement;
  const body = document.body;
  const messages = document.getElementById("messages");
  const shareButton = document.getElementById("shareButton");
  const menuButton = document.getElementById("menuButton");
  const toast = document.getElementById("toast");
  const launchOverlay = document.getElementById("launchOverlay");

  // ── Pricing modal elements ──────────────────────────────────────────────
  const pricingOverlay   = document.getElementById("pricingOverlay");
  const pricingBackdrop  = document.getElementById("pricingBackdrop");
  const pricingCloseBtn  = document.getElementById("pricingClose");

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

  const dropdowns = [
    {
      name: "top",
      button: modeButtonTop,
      menu: modeMenuTop,
      label: modeLabelTop,
    },
    {
      name: "bottom",
      button: modeButtonBottom,
      menu: modeMenuBottom,
      label: modeLabelBottom,
    },
  ];

  // ── Toast ───────────────────────────────────────────────────────────────

  function showToast(text) {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      toast.classList.remove("show");
    }, 1600);
  }

  // ── Textarea auto-sizing ─────────────────────────────────────────────────

  function autosize(el) {
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }

  function syncInputs(source, target) {
    if (!source || !target) return;
    target.value = source.value;
    autosize(target);
  }

  function syncBothInputs(text) {
    if (promptTop) {
      promptTop.value = text;
      autosize(promptTop);
    }
    if (promptBottom) {
      promptBottom.value = text;
      autosize(promptBottom);
    }
  }

  // ── Mode dropdown ────────────────────────────────────────────────────────

  function setMode(mode, label) {
    currentMode = mode;
    if (modeLabelTop) modeLabelTop.textContent = label;
    if (modeLabelBottom) modeLabelBottom.textContent = label;
    closeAllDropdowns();
  }

  function closeAllDropdowns() {
    dropdowns.forEach((dd) => {
      if (!dd.button || !dd.menu) return;
      dd.menu.classList.add("hidden");
      dd.button.classList.remove("is-open");
      dd.button.setAttribute("aria-expanded", "false");
    });
  }

  function isDropdownOpen(dropdown) {
    return dropdown && dropdown.menu && !dropdown.menu.classList.contains("hidden");
  }

  function openDropdown(dropdown) {
    if (!dropdown?.button || !dropdown?.menu) return;
    closeAllDropdowns();
    dropdown.menu.classList.remove("hidden");
    dropdown.button.classList.add("is-open");
    dropdown.button.setAttribute("aria-expanded", "true");
  }

  function toggleDropdown(dropdown) {
    if (!dropdown?.button || !dropdown?.menu) return;
    if (isDropdownOpen(dropdown)) {
      closeAllDropdowns();
      return;
    }
    openDropdown(dropdown);
  }

  // ── Layout helpers ───────────────────────────────────────────────────────

  function activateChatLayout() {
    if (!body.classList.contains("chat-started")) {
      body.classList.add("chat-started");
    }
  }

  // ── Original publication-gate modal (preserved) ──────────────────────────

  function showLaunchModal() {
    if (!launchOverlay) return;
    body.classList.add("modal-open");
    launchOverlay.classList.remove("hidden");
    launchOverlay.setAttribute("aria-hidden", "false");
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  PRICING MODAL — show / close
  //  Triggered by Enter on the composer when PUBLICATION_GATE is true.
  //  Closes via: Escape key, backdrop click, or the X button.
  // ══════════════════════════════════════════════════════════════════════════

  function showPricingModal() {
    if (!pricingOverlay) return;

    // Ensure we're starting from a clean state (no lingering close animation)
    pricingOverlay.classList.remove("pricing-closing");
    pricingOverlay.classList.remove("hidden");
    pricingOverlay.setAttribute("aria-hidden", "false");

    // Blur background using the shared modal-open class
    body.classList.add("modal-open");

    // Trap focus to the modal — move focus to close button for a11y
    if (pricingCloseBtn) {
      pricingCloseBtn.focus({ preventScroll: true });
    }
  }

  function closePricingModal() {
    if (!pricingOverlay) return;
    if (pricingOverlay.classList.contains("hidden")) return;

    // Add closing class — CSS animation fires for the exit keyframe
    pricingOverlay.classList.add("pricing-closing");

    // After exit animation completes (280ms), hide fully and remove blur
    setTimeout(() => {
      pricingOverlay.classList.add("hidden");
      pricingOverlay.classList.remove("pricing-closing");
      pricingOverlay.setAttribute("aria-hidden", "true");
      body.classList.remove("modal-open");
    }, 290);
  }

  // ── HTML escape ─────────────────────────────────────────────────────────

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ── Source card builder ──────────────────────────────────────────────────

  function buildSourceCard(title, meta, text) {
    return `
      <div class="source">
        <div class="source-title">${escapeHtml(title)}</div>
        <div class="source-meta">${escapeHtml(meta)}</div>
        <div class="source-text">${escapeHtml(text)}</div>
      </div>
    `;
  }

  // ── Message node factories ───────────────────────────────────────────────

  function createUserMessage(text) {
    if (!userTemplate) return null;
    const node = userTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".message-user-bubble").textContent = text;
    return node;
  }

  function createAssistantMessage() {
    if (!assistantTemplate) return null;
    return assistantTemplate.content.firstElementChild.cloneNode(true);
  }

  // ── Text streaming ───────────────────────────────────────────────────────

  async function streamText(el, text, speed = 7) {
    if (!el) return;
    el.textContent = "";
    const full = String(text || "");
    for (let i = 0; i < full.length; i += 1) {
      el.textContent += full[i];
      if (i % 3 === 0) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, speed));
      }
    }
  }

  // ── Source detail renderer ───────────────────────────────────────────────

  function renderDetails(node, result) {
    if (!node) return;

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

    if (!html || !details || !detailsBody) return;
    details.classList.remove("hidden");
    detailsBody.innerHTML = html;
  }

  // ── Backend query ────────────────────────────────────────────────────────

  async function backendQuery(query) {
    if (!BACKEND_URL) {
      return {
        response: "Frontend is live. Backend is not connected yet.",
        mode_used: "frontend_only",
        sources: [],
        fusion_hits: [],
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const res = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          mode: currentMode,
          securities,
        }),
        signal: controller.signal,
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

  // ── Query submission pipeline ────────────────────────────────────────────

  async function submitQuery(query) {
    const userNode = createUserMessage(query);
    if (userNode) messages.appendChild(userNode);

    const assistantNode = createAssistantMessage();
    if (!assistantNode) return;

    const assistantText = assistantNode.querySelector(".message-assistant-text");
    assistantText.textContent = "Thinking…";
    messages.appendChild(assistantNode);

    activateChatLayout();
    setSending(true);
    scrollToBottom();

    try {
      const payload = await backendQuery(query);
      await streamText(assistantText, payload.response || "No response produced.");
      renderDetails(assistantNode, payload);
    } catch (err) {
      const text =
        err && err.name === "AbortError"
          ? "Backend request timed out."
          : `Error: ${err && err.message ? err.message : String(err)}`;
      await streamText(assistantText, text);
    } finally {
      setSending(false);
      scrollToBottom();
    }
  }

  // ── Send button state ────────────────────────────────────────────────────

  function setSending(state) {
    requestInFlight = state;

    [sendTop, sendBottom].forEach((btn) => {
      if (!btn) return;
      btn.disabled = state;
      btn.classList.toggle("is-loading", state);
    });
  }

  function briefSendPulse() {
    [sendTop, sendBottom].forEach((btn) => {
      if (!btn) return;
      btn.classList.add("is-loading");
    });

    setTimeout(() => {
      [sendTop, sendBottom].forEach((btn) => {
        if (!btn) return;
        btn.classList.remove("is-loading");
      });
    }, 420);
  }

  // ── Scroll helper ────────────────────────────────────────────────────────

  function scrollToBottom() {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });
  }

  // ── Handle submit — now opens the pricing modal ──────────────────────────
  //
  //  The pricing modal is the primary gate while PUBLICATION_GATE is true.
  //  The original showLaunchModal() is preserved above for programmatic use.
  //

  async function handleSubmit(source) {
    if (requestInFlight) return;
    const query = source.value.trim();
    if (!query) return;

    if (PUBLICATION_GATE) {
      // Brief pulse on the send button for tactile feedback
      briefSendPulse();

      // Small delay so the pulse completes before the modal blooms
      setTimeout(() => {
        showPricingModal();
      }, 180);

      return;
    }

    syncBothInputs("");
    await submitQuery(query);
  }

  // ── Cursor light tracking ────────────────────────────────────────────────

  function updateCursorLight(x, y) {
    root.style.setProperty("--mx", `${x}px`);
    root.style.setProperty("--my", `${y}px`);
  }

  window.addEventListener("mousemove", (e) => {
    updateCursorLight(e.clientX, e.clientY);
  });

  // ── Prompt input listeners ───────────────────────────────────────────────

  if (promptTop) {
    promptTop.addEventListener("input", () => {
      autosize(promptTop);
      syncInputs(promptTop, promptBottom);
    });

    promptTop.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        await handleSubmit(promptTop);
      }
    });
  }

  if (promptBottom) {
    promptBottom.addEventListener("input", () => {
      autosize(promptBottom);
      syncInputs(promptBottom, promptTop);
    });

    promptBottom.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        await handleSubmit(promptBottom);
      }
    });
  }

  // ── Composer form submit listeners ───────────────────────────────────────

  if (composerTop) {
    composerTop.addEventListener("submit", async (e) => {
      e.preventDefault();
      await handleSubmit(promptTop);
    });
  }

  if (composerBottom) {
    composerBottom.addEventListener("submit", async (e) => {
      e.preventDefault();
      await handleSubmit(promptBottom);
    });
  }

  // ── Mode dropdown listeners ──────────────────────────────────────────────

  dropdowns.forEach((dropdown) => {
    if (!dropdown.button || !dropdown.menu) return;

    dropdown.button.setAttribute("aria-haspopup", "menu");
    dropdown.button.setAttribute("aria-expanded", "false");

    dropdown.button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleDropdown(dropdown);
    });

    dropdown.menu.querySelectorAll("button[data-mode]").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        setMode(item.dataset.mode, item.textContent.trim());
      });
    });
  });

  // ── Global click — closes dropdowns when clicking outside ───────────────

  document.addEventListener("click", (e) => {
    const clickedInsideAnyDropdown = dropdowns.some((dropdown) => {
      if (!dropdown.button || !dropdown.menu) return false;
      return dropdown.button.contains(e.target) || dropdown.menu.contains(e.target);
    });

    if (!clickedInsideAnyDropdown) {
      closeAllDropdowns();
    }
  });

  // ── Global keydown ───────────────────────────────────────────────────────

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      // Close pricing modal if open — takes priority
      if (pricingOverlay && !pricingOverlay.classList.contains("hidden")) {
        closePricingModal();
        return; // Don't propagate to dropdown close on same keystroke
      }

      // Otherwise close any open dropdowns
      closeAllDropdowns();
    }

    // "/" shortcut — focus the active composer
    if (
      e.key === "/" &&
      document.activeElement !== promptTop &&
      document.activeElement !== promptBottom
    ) {
      e.preventDefault();
      if (body.classList.contains("chat-started") && promptBottom) {
        promptBottom.focus();
      } else if (promptTop) {
        promptTop.focus();
      }
    }

    // Cmd/Ctrl + K — search chats toast
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      showToast("Search chats");
    }
  });

  // ── Pricing modal — close button ─────────────────────────────────────────

  if (pricingCloseBtn) {
    pricingCloseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closePricingModal();
    });
  }

  // ── Pricing modal — backdrop click dismisses ─────────────────────────────

  if (pricingBackdrop) {
    pricingBackdrop.addEventListener("click", () => {
      closePricingModal();
    });
  }

  // ── Pricing modal — prevent clicks inside the modal pane from closing ────

  if (pricingOverlay) {
    const pricingModalPane = pricingOverlay.querySelector(".pricing-modal");
    if (pricingModalPane) {
      pricingModalPane.addEventListener("click", (e) => {
        e.stopPropagation();
      });
    }
  }

  // ── Share button ─────────────────────────────────────────────────────────

  if (shareButton) {
    shareButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        showToast("Link copied");
      } catch {
        showToast("Copy failed");
      }
    });
  }

  // ── Menu button ──────────────────────────────────────────────────────────

  if (menuButton) {
    menuButton.addEventListener("click", () => {
      showToast("Menu placeholder");
    });
  }

  // ── Initial textarea sizing ───────────────────────────────────────────────

  autosize(promptTop);
  autosize(promptBottom);
});