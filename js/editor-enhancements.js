document.addEventListener("DOMContentLoaded", () => {
  const editor = document.getElementById("editor");
  const toolbar = document.querySelector(".editor-toolbar");
  if (!editor || !toolbar) return;

  const wordCount = document.getElementById("writerWordCount");
  const charCount = document.getElementById("writerCharCount");
  const fontSelect = document.getElementById("editorFontSize");
  const helpButton = document.getElementById("shortcutGuideButton");
  const helpOverlay = document.getElementById("shortcutGuideOverlay");
  const helpClose = document.getElementById("shortcutGuideClose");
  const bookId = new URLSearchParams(location.search).get("id") || getCurrentBook()?.id || "";
  const fontKey = "diamondBook.fontSize." + bookId;
  let rememberedRange = null;
  let statsFrame = 0;

  function writeStats() {
    statsFrame = 0;
    const text = String(editor.innerText || "").replace(/\u00a0/g, " ").trim();
    const matches = text.match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu);
    if (wordCount) wordCount.textContent = (matches ? matches.length : 0) + " слов";
    if (charCount) charCount.textContent = text.length + " знаков";
  }

  function queueStats() {
    if (!statsFrame) statsFrame = requestAnimationFrame(writeStats);
  }

  function selectionIsInside() {
    const selection = window.getSelection();
    return !!(selection && selection.rangeCount && editor.contains(selection.anchorNode) && editor.contains(selection.focusNode));
  }

  function rememberSelection() {
    const selection = window.getSelection();
    if (selectionIsInside()) rememberedRange = selection.getRangeAt(0).cloneRange();
  }

  function restoreSelection() {
    editor.focus({ preventScroll: true });
    if (!rememberedRange || !editor.contains(rememberedRange.startContainer) || !editor.contains(rememberedRange.endContainer)) return;
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(rememberedRange);
  }

  function syncStates() {
    if (!selectionIsInside()) return;
    toolbar.querySelectorAll("button[data-command]").forEach(button => {
      const cmd = button.dataset.command;
      let active = false;
      try { active = document.queryCommandState(cmd); } catch {}
      button.classList.toggle("is-active", active);
      if (!["undo", "redo", "removeFormat"].includes(cmd)) button.setAttribute("aria-pressed", String(active));
    });
  }

  function executeCommand(command, value = null) {
    restoreSelection();
    document.execCommand(command, false, value);
    rememberSelection();
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    syncStates();
    queueStats();
  }

  toolbar.addEventListener("pointerdown", event => {
    if (event.target.closest("button[data-command], #insertDivider")) event.preventDefault();
  }, true);

  toolbar.addEventListener("click", event => {
    const button = event.target.closest("button[data-command], #insertDivider");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const command = button.id === "insertDivider" ? "insertHorizontalRule" : button.dataset.command;
    executeCommand(command, button.dataset.value || null);
  }, true);

  document.addEventListener("selectionchange", () => {
    rememberSelection();
    syncStates();
  });
  editor.addEventListener("keyup", syncStates);
  editor.addEventListener("mouseup", syncStates);
  editor.addEventListener("input", queueStats);
  new MutationObserver(queueStats).observe(editor, { childList: true, subtree: true, characterData: true });
  queueStats();

  if (fontSelect) {
    const size = Number(localStorage.getItem(fontKey)) || 19;
    fontSelect.value = ["15", "17", "19", "21", "23"].includes(String(size)) ? String(size) : "19";
    editor.style.fontSize = fontSelect.value + "px";
    fontSelect.addEventListener("change", () => {
      editor.style.fontSize = fontSelect.value + "px";
      try { localStorage.setItem(fontKey, fontSelect.value); } catch {}
    });
  }

  function showGuide() {
    if (!helpOverlay) return;
    helpOverlay.hidden = false;
    helpClose?.focus();
  }
  function hideGuide() {
    if (helpOverlay) helpOverlay.hidden = true;
    helpButton?.focus({ preventScroll: true });
  }
  helpButton?.addEventListener("click", showGuide);
  helpClose?.addEventListener("click", hideGuide);
  helpOverlay?.addEventListener("click", event => {
    if (event.target === helpOverlay) hideGuide();
  });

  document.addEventListener("keydown", event => {
    const isInput = !!event.target.closest?.("input,textarea,select");
    const editing = event.target === editor || editor.contains(event.target);
    const modifier = event.ctrlKey || event.metaKey;
    const code = event.code;
    if (event.key === "F1") {
      event.preventDefault();
      helpOverlay?.hidden ? showGuide() : hideGuide();
      return;
    }
    if (event.key === "Escape" && helpOverlay && !helpOverlay.hidden) {
      event.preventDefault();
      hideGuide();
      return;
    }
    if (helpOverlay && !helpOverlay.hidden) return;

    if (modifier && !event.shiftKey && !event.altKey && event.key === "Enter" && !isInput) {
      event.preventDefault();
      document.getElementById("readerButton")?.click();
      return;
    }

    if (modifier && event.altKey && !event.shiftKey && code === "KeyN" && !isInput) {
      event.preventDefault();
      const addRoot = document.getElementById("addRootButton");
      if (addRoot) {
        if (document.querySelector(".root-create-menu")?.hidden) addRoot.click();
        document.querySelector('.root-create-menu [data-kind="chapter"]')?.click();
      }
      return;
    }

    if (!modifier && event.altKey && ["ArrowDown", "ArrowUp"].includes(event.key) && !isInput) {
      const chapters = [...document.querySelectorAll('.tree-row[data-node-type="chapter"] .tree-line')];
      const current = chapters.findIndex(node => node.classList.contains("active"));
      const next = current + (event.key === "ArrowDown" ? 1 : -1);
      if (next >= 0 && next < chapters.length) {
        event.preventDefault();
        chapters[next].click();
      }
      return;
    }

    if (!modifier || !editing || isInput) return;
    if (!event.shiftKey && !event.altKey && ["KeyB", "KeyI", "KeyU"].includes(code)) {
      event.preventDefault();
      executeCommand({ KeyB: "bold", KeyI: "italic", KeyU: "underline" }[code]);
      return;
    }
    if (event.altKey && !event.shiftKey && ["Digit2", "Digit0", "KeyH"].includes(code)) {
      event.preventDefault();
      if (code === "KeyH") executeCommand("insertHorizontalRule");
      else executeCommand("formatBlock", code === "Digit2" ? "h2" : "p");
      return;
    }
    if (!event.altKey && event.shiftKey && ["Digit7", "Digit8"].includes(code)) {
      event.preventDefault();
      executeCommand(code === "Digit7" ? "insertUnorderedList" : "insertOrderedList");
    }
  }, true);
});