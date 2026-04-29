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

  // ── Auth modal elements ─────────────────────────────────────────────────
  const authOverlay   = document.getElementById("authOverlay");
  const authBackdrop  = document.getElementById("authBackdrop");
  const authCloseBtn  = document.getElementById("authCloseBtn");
  const authSubmitBtn = document.getElementById("authSubmitBtn");
  const authNameInput = document.getElementById("auth-name");
  const authEmailInput = document.getElementById("auth-email");
  const authError     = document.getElementById("authError");
  const authFormInner = document.getElementById("authFormInner");
  const authConfirm   = document.getElementById("authConfirm");
  const accountLabel  = document.getElementById("accountLabel");

  // ── Sidebar navigation elements ─────────────────────────────────────────
  const newChatBtn    = document.getElementById("newChatBtn");
  const searchChatsBtn = document.getElementById("searchChatsBtn");
  const projectsBtn   = document.getElementById("projectsBtn");
  const copyLastBtn   = document.getElementById("copyLastBtn");
  const copyIconSvg   = document.getElementById("copyIconSvg");
  const accountBtn    = document.getElementById("accountBtn");

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
  // ══════════════════════════════════════════════════════════════════════════

  function showPricingModal() {
    if (!pricingOverlay) return;
    pricingOverlay.classList.remove("pricing-closing");
    pricingOverlay.classList.remove("hidden");
    pricingOverlay.setAttribute("aria-hidden", "false");
    body.classList.add("modal-open");
    if (pricingCloseBtn) {
      pricingCloseBtn.focus({ preventScroll: true });
    }
  }

  function closePricingModal() {
    if (!pricingOverlay) return;
    if (pricingOverlay.classList.contains("hidden")) return;
    pricingOverlay.classList.add("pricing-closing");
    setTimeout(() => {
      pricingOverlay.classList.add("hidden");
      pricingOverlay.classList.remove("pricing-closing");
      pricingOverlay.setAttribute("aria-hidden", "true");
      body.classList.remove("modal-open");
    }, 290);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  AUTH MODAL — show / close / submit
  //  Glassmorphic identity node. Mirrors waitlist popup geometry.
  // ══════════════════════════════════════════════════════════════════════════

  let authAutoCloseTimer = null;

  function showAuthModal() {
    if (!authOverlay) return;

    // Reset to intake state (handles re-open after prior confirmation)
    if (authFormInner) authFormInner.classList.remove("form-fading");
    if (authConfirm)   authConfirm.classList.remove("confirm-visible");
    if (authNameInput)  authNameInput.value = "";
    if (authEmailInput) authEmailInput.value = "";
    if (authError)      authError.classList.remove("visible");
    clearTimeout(authAutoCloseTimer);

    // Reveal
    authOverlay.classList.remove("hidden");
    authOverlay.classList.remove("auth-closing");
    authOverlay.setAttribute("aria-hidden", "false");
    body.classList.add("modal-open");

    // Trap focus to name input after animation settles
    setTimeout(() => {
      if (authNameInput) authNameInput.focus({ preventScroll: true });
    }, 300);
  }

  function closeAuthModal() {
    if (!authOverlay) return;
    if (authOverlay.classList.contains("hidden")) return;

    clearTimeout(authAutoCloseTimer);

    authOverlay.classList.add("auth-closing");
    setTimeout(() => {
      authOverlay.classList.add("hidden");
      authOverlay.classList.remove("auth-closing");
      authOverlay.setAttribute("aria-hidden", "true");
      body.classList.remove("modal-open");
    }, 290);
  }

  function handleAuthSubmit() {
    const nameVal  = authNameInput  ? (authNameInput.value  || "").trim() : "";
    const emailVal = authEmailInput ? (authEmailInput.value || "").trim() : "";

    // RFC-minimal email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailPattern.test(emailVal)) {
      if (authError) authError.classList.add("visible");
      if (authEmailInput) authEmailInput.focus();
      return;
    }

    if (authError) authError.classList.remove("visible");

    // Phase 1: fade form layer out
    if (authFormInner) authFormInner.classList.add("form-fading");

    // Phase 2: bloom confirmation layer
    setTimeout(() => {
      if (authConfirm) authConfirm.classList.add("confirm-visible");

      // Update sidebar Account label to the user's entered name (if provided)
      const displayName = nameVal || emailVal.split("@")[0];
      if (accountLabel && displayName) {
        accountLabel.textContent = displayName;
      }

      // Phase 3: auto-dismiss
      clearTimeout(authAutoCloseTimer);
      authAutoCloseTimer = setTimeout(() => {
        closeAuthModal();
      }, 3400);
    }, 310);
  }

  // ── Auth modal: close button ─────────────────────────────────────────────

  if (authCloseBtn) {
    authCloseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAuthModal();
    });
  }

  // ── Auth modal: backdrop click dismisses ────────────────────────────────

  if (authBackdrop) {
    authBackdrop.addEventListener("click", () => {
      closeAuthModal();
    });
  }

  // ── Auth modal: prevent clicks on card from closing ──────────────────────

  if (authOverlay) {
    const authCardEl = authOverlay.querySelector(".auth-card");
    if (authCardEl) {
      authCardEl.addEventListener("click", (e) => {
        e.stopPropagation();
      });
    }
  }

  // ── Auth modal: Enter key in inputs ─────────────────────────────────────

  if (authNameInput) {
    authNameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (authEmailInput) authEmailInput.focus();
      }
    });
    // Clear validation on input
    authNameInput.addEventListener("input", () => {
      if (authError) authError.classList.remove("visible");
    });
  }

  if (authEmailInput) {
    authEmailInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAuthSubmit();
      }
    });
    authEmailInput.addEventListener("input", () => {
      if (authError) authError.classList.remove("visible");
    });
  }

  // ── Auth modal: submit button ────────────────────────────────────────────

  if (authSubmitBtn) {
    authSubmitBtn.addEventListener("click", () => {
      handleAuthSubmit();
    });
  }

  // ── Account sidebar button → open auth modal ────────────────────────────

  if (accountBtn) {
    accountBtn.addEventListener("click", (e) => {
      e.preventDefault();
      showAuthModal();
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  NEW CHAT BUTTON — hard geometric reset via page reload
  // ══════════════════════════════════════════════════════════════════════════

  if (newChatBtn) {
    newChatBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.reload();
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SEARCH CHATS BUTTON — focus active composer + pulse animation
  // ══════════════════════════════════════════════════════════════════════════

  if (searchChatsBtn) {
    searchChatsBtn.addEventListener("click", () => {
      // Determine which composer is currently active
      const activePrompt = body.classList.contains("chat-started") ? promptBottom : promptTop;
      const activeComposer = body.classList.contains("chat-started") ? composerBottom : composerTop;

      if (activePrompt) {
        activePrompt.focus();
      }

      // Trigger pulse animation on the composer border
      if (activeComposer) {
        activeComposer.classList.remove("search-pulse");
        // Force reflow to restart animation
        void activeComposer.offsetWidth;
        activeComposer.classList.add("search-pulse");

        // Remove class after animation completes to allow re-triggering
        setTimeout(() => {
          activeComposer.classList.remove("search-pulse");
        }, 900);
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  PROJECTS BUTTON — smooth auto-scroll to absolute bottom of chat
  // ══════════════════════════════════════════════════════════════════════════

  if (projectsBtn) {
    projectsBtn.addEventListener("click", () => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth",
      });
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  COPY LAST (MORE) BUTTON — extract last assistant response → clipboard
  //  Visual feedback: icon blooms Ice Blue (#00ffff) for 1.5 seconds
  // ══════════════════════════════════════════════════════════════════════════

  if (copyLastBtn) {
    copyLastBtn.addEventListener("click", async () => {
      // Find the most recent assistant message text node
      const allAssistantTexts = messages
        ? messages.querySelectorAll(".message-assistant-text")
        : [];
      const lastResponse = allAssistantTexts.length > 0
        ? allAssistantTexts[allAssistantTexts.length - 1]
        : null;

      const textToCopy = lastResponse ? lastResponse.innerText.trim() : "";

      if (!textToCopy) {
        showToast("No response to copy.");
        return;
      }

      try {
        await navigator.clipboard.writeText(textToCopy);

        // Ice Blue visual feedback on the icon
        if (copyIconSvg) {
          copyIconSvg.classList.add("copy-active");
          setTimeout(() => {
            copyIconSvg.classList.remove("copy-active");
          }, 1500);
        }

        showToast("Response copied.");
      } catch {
        showToast("Copy failed.");
      }
    });
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

  // ── Handle submit — opens the pricing modal when gate is active ──────────

  async function handleSubmit(source) {
    if (requestInFlight) return;
    const query = source.value.trim();
    if (!query) return;

    if (PUBLICATION_GATE) {
      briefSendPulse();
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
      // Close auth modal first (highest z-index)
      if (authOverlay && !authOverlay.classList.contains("hidden")) {
        closeAuthModal();
        return;
      }

      // Close pricing modal if open
      if (pricingOverlay && !pricingOverlay.classList.contains("hidden")) {
        closePricingModal();
        return;
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

    // Cmd/Ctrl + K — search chats: focus + pulse
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      const activePrompt   = body.classList.contains("chat-started") ? promptBottom : promptTop;
      const activeComposer = body.classList.contains("chat-started") ? composerBottom : composerTop;
      if (activePrompt) activePrompt.focus();
      if (activeComposer) {
        activeComposer.classList.remove("search-pulse");
        void activeComposer.offsetWidth;
        activeComposer.classList.add("search-pulse");
        setTimeout(() => activeComposer.classList.remove("search-pulse"), 900);
      }
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

  // ── Share button — Web Share API with clipboard fallback ─────────────────

  if (shareButton) {
    shareButton.addEventListener("click", async () => {
      const shareData = {
        title: "QuantAI Analysis",
        url: window.location.href,
      };

      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch (err) {
          // User cancelled share or API failed — silent fallback
          if (err && err.name !== "AbortError") {
            try {
              await navigator.clipboard.writeText(window.location.href);
              showToast("Link copied");
            } catch {
              showToast("Share unavailable");
            }
          }
        }
      } else {
        // Fallback: copy URL to clipboard
        try {
          await navigator.clipboard.writeText(window.location.href);
          showToast("Link copied");
        } catch {
          showToast("Copy failed");
        }
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

// ══════════════════════════════════════════════════════════════════════════
//  PRICING CTA ROUTING
//  ─────────────────────────────────────────────────────────────────────────
//  · Free  card  → Waitlist Capture HUD (dynamically injected singleton)
//  · Pro   card  → Stripe payment link
//  · Ultra card  → Stripe payment link
//
//  Escape handler registered in capture phase (priority over existing
//  bubble-phase handlers). Pricing-modal closure mirrors the internal
//  logic of closePricingModal() exactly — no external call required.
// ══════════════════════════════════════════════════════════════════════════

(function initPricingCTARouting() {

  // ── Stripe Payment Links ───────────────────────────────────────────────
  const STRIPE_PRO   = "https://buy.stripe.com/test_4gMeV6cvm0h5cDT9vq7AI00";
  const STRIPE_ULTRA = "https://buy.stripe.com/test_4gMbIU3YQd3RbzP3727AI01";

  // ── Waitlist singleton refs ────────────────────────────────────────────
  let waitlistOverlay  = null;
  let autoCloseTimer   = null;

  // ════════════════════════════════════════════════════════════════════════
  //  BUILD — constructs the overlay DOM once and appends to <body>
  // ════════════════════════════════════════════════════════════════════════

  function buildWaitlistOverlay() {
    if (waitlistOverlay) return;

    const overlay = document.createElement("div");
    overlay.className    = "waitlist-overlay";
    overlay.id           = "waitlistOverlay";
    overlay.setAttribute("role",            "dialog");
    overlay.setAttribute("aria-modal",      "true");
    overlay.setAttribute("aria-labelledby", "waitlistTitle");
    overlay.setAttribute("aria-hidden",     "true");

    overlay.innerHTML = `
      <!-- Frosted backdrop — click to dismiss -->
      <div class="waitlist-backdrop" id="waitlistBackdrop"></div>

      <!-- Quartz card -->
      <div class="waitlist-card" id="waitlistCard">

        <!-- Close glyph -->
        <button class="waitlist-close-btn" id="waitlistCloseBtn" aria-label="Close waitlist">
          <svg viewBox="0 0 24 24" fill="none" width="13" height="13">
            <path d="M18 6L6 18M6 6l12 12"
              stroke="currentColor" stroke-width="1.7"
              stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <!-- ── Intake form layer ── -->
        <div class="waitlist-form-inner" id="waitlistFormInner">

          <div class="waitlist-eyebrow">Atanasovski Quant &middot; Early Access</div>

          <h2 class="waitlist-title" id="waitlistTitle">
            Reserve State&#8209;Space Access
          </h2>

          <p class="waitlist-sub">
            Quant&nbsp;1.0 deploys June&nbsp;30,&nbsp;2026. Secure your position
            in the initial allocation. No commitment. No noise. Pure signal.
          </p>

          <div class="waitlist-input-wrap">
            <input
              type="email"
              id="waitlistEmail"
              class="waitlist-email-input"
              placeholder="your@institution.com"
              autocomplete="email"
              spellcheck="false"
              aria-label="Email address"
              aria-describedby="waitlistError"
            />
            <div class="waitlist-error" id="waitlistError" role="alert" aria-live="assertive">
              Enter a valid email address.
            </div>
          </div>

          <button class="waitlist-cta-btn" id="waitlistSubmitBtn" type="button">
            <span>Reserve Access</span>
          </button>

        </div>
        <!-- /waitlist-form-inner -->

        <!-- ── Confirmation layer — morphs in after submit ── -->
        <div class="waitlist-confirm" id="waitlistConfirm" aria-live="polite">
          <div class="waitlist-confirm-glyph" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
              <path d="M5 12.5l5 5L19 7"
                stroke="currentColor" stroke-width="1.7"
                stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h3 class="waitlist-confirm-title">Position Secured</h3>
          <p class="waitlist-confirm-sub">
            First&#8209;access credentials will be issued at launch.<br>
            Maintain signal clarity.
          </p>
        </div>
        <!-- /waitlist-confirm -->

      </div>
      <!-- /waitlist-card -->
    `;

    document.body.appendChild(overlay);
    waitlistOverlay = overlay;

    // ── Internal event wiring ──────────────────────────────────────────

    const backdrop   = overlay.querySelector("#waitlistBackdrop");
    const card       = overlay.querySelector("#waitlistCard");
    const closeBtn   = overlay.querySelector("#waitlistCloseBtn");
    const emailInput = overlay.querySelector("#waitlistEmail");
    const errorEl    = overlay.querySelector("#waitlistError");
    const submitBtn  = overlay.querySelector("#waitlistSubmitBtn");
    const formInner  = overlay.querySelector("#waitlistFormInner");
    const confirmEl  = overlay.querySelector("#waitlistConfirm");

    // Backdrop dismisses; card absorbs clicks to prevent propagation
    backdrop.addEventListener("click", closeWaitlistModal);
    card.addEventListener("click", (e) => e.stopPropagation());

    // Close button
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeWaitlistModal();
    });

    // Clear validation state as user edits
    emailInput.addEventListener("input", () => {
      errorEl.classList.remove("visible");
    });

    // Enter key submits
    emailInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmitWaitlist(emailInput, errorEl, formInner, confirmEl);
      }
    });

    // CTA click submits
    submitBtn.addEventListener("click", () => {
      handleSubmitWaitlist(emailInput, errorEl, formInner, confirmEl);
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  //  SUBMIT HANDLER — validates, morphs card to confirmation state
  // ════════════════════════════════════════════════════════════════════════

  function handleSubmitWaitlist(emailInput, errorEl, formInner, confirmEl) {
    const val = (emailInput.value || "").trim();

    // RFC-minimal email check — no library dependency
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailPattern.test(val)) {
      errorEl.classList.add("visible");
      emailInput.focus();
      return;
    }

    errorEl.classList.remove("visible");

    // ── Phase 1: fade the form layer out ────────────────────────────────
    formInner.classList.add("form-fading");

    // ── Phase 2: bloom the confirmation layer (after form fades) ─────────
    setTimeout(() => {
      confirmEl.classList.add("confirm-visible");

      // ── Phase 3: auto-dismiss after the user has read the confirmation ──
      clearTimeout(autoCloseTimer);
      autoCloseTimer = setTimeout(() => {
        closeWaitlistModal();
      }, 3400);
    }, 310);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  OPEN — resets state, makes overlay visible, traps focus
  // ════════════════════════════════════════════════════════════════════════

  function openWaitlistModal() {
    buildWaitlistOverlay();

    // Reset to intake state (handles re-open after prior confirm)
    const formInner  = waitlistOverlay.querySelector("#waitlistFormInner");
    const confirmEl  = waitlistOverlay.querySelector("#waitlistConfirm");
    const emailInput = waitlistOverlay.querySelector("#waitlistEmail");
    const errorEl    = waitlistOverlay.querySelector("#waitlistError");

    formInner.classList.remove("form-fading");
    confirmEl.classList.remove("confirm-visible");
    emailInput.value = "";
    errorEl.classList.remove("visible");
    clearTimeout(autoCloseTimer);

    // Apply background blur via shared modal-open class
    document.body.classList.add("modal-open");

    // Reveal
    waitlistOverlay.setAttribute("aria-hidden", "false");
    waitlistOverlay.classList.remove("waitlist-closing");
    waitlistOverlay.classList.add("waitlist-visible");

    // Focus email after card entry animation settles (~half the easing curve)
    setTimeout(() => {
      const input = waitlistOverlay.querySelector("#waitlistEmail");
      if (input) input.focus({ preventScroll: true });
    }, 300);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  CLOSE — opacity exit, then fully hides and restores body state
  // ════════════════════════════════════════════════════════════════════════

  function closeWaitlistModal() {
    if (!waitlistOverlay) return;
    if (!waitlistOverlay.classList.contains("waitlist-visible")) return;

    clearTimeout(autoCloseTimer);

    waitlistOverlay.classList.remove("waitlist-visible");
    waitlistOverlay.classList.add("waitlist-closing");

    setTimeout(() => {
      waitlistOverlay.classList.remove("waitlist-closing");
      waitlistOverlay.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
    }, 400);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  PRICING OVERLAY CLOSE — mirrors closePricingModal() internal logic
  //  Called before opening the waitlist HUD so modals don't stack.
  // ════════════════════════════════════════════════════════════════════════

  function dismissPricingOverlay(callback) {
    const po = document.getElementById("pricingOverlay");
    if (!po || po.classList.contains("hidden")) {
      // Pricing already closed — proceed immediately
      if (callback) callback();
      return;
    }

    po.classList.add("pricing-closing");

    setTimeout(() => {
      po.classList.add("hidden");
      po.classList.remove("pricing-closing");
      po.setAttribute("aria-hidden", "true");
      // Note: do NOT remove modal-open here — the waitlist will re-apply it
      if (callback) callback();
    }, 290);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  ESCAPE KEY — capture phase so it fires before existing bubble handlers
  //  Priority: waitlist (z-index 400) > pricing modal (z-index 300)
  // ════════════════════════════════════════════════════════════════════════

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;

    if (
      waitlistOverlay &&
      waitlistOverlay.classList.contains("waitlist-visible")
    ) {
      // Stop here — don't let the pricing modal's keydown handler also fire
      e.stopImmediatePropagation();
      closeWaitlistModal();
    }
  }, /* capture */ true);

  // ════════════════════════════════════════════════════════════════════════
  //  ATTACH CTA BUTTONS — after DOM is ready
  // ════════════════════════════════════════════════════════════════════════

  function attachPricingButtons() {
    const pricingOverlayEl = document.getElementById("pricingOverlay");
    if (!pricingOverlayEl) return;

    // Card order in the HTML: [0] Free · [1] Pro · [2] Ultra
    const cards = pricingOverlayEl.querySelectorAll(".pricing-card");

    cards.forEach((card, idx) => {
      const btn = card.querySelector(".card-cta-btn");
      if (!btn) return;

      if (idx === 0) {
        // ── Free → Waitlist HUD ──────────────────────────────────────────
        btn.addEventListener("click", () => {
          dismissPricingOverlay(() => {
            // Brief gap so the pricing exit animation completes visually
            setTimeout(() => openWaitlistModal(), 80);
          });
        });

      } else if (idx === 1) {
        // ── Pro → Stripe ─────────────────────────────────────────────────
        btn.addEventListener("click", () => {
          window.location.href = STRIPE_PRO;
        });

      } else if (idx === 2) {
        // ── Ultra → Stripe ───────────────────────────────────────────────
        btn.addEventListener("click", () => {
          window.location.href = STRIPE_ULTRA;
        });
      }
    });
  }

  // ── Init ──────────────────────────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachPricingButtons);
  } else {
    // DOM already parsed — attach immediately
    attachPricingButtons();
  }

})();