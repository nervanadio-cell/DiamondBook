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
    const selection=window.getSelection();
    if(!selection)return;
    if(rememberedRange && editor.contains(rememberedRange.startContainer) && editor.contains(rememberedRange.endContainer)){
      selection.removeAllRanges();
      selection.addRange(rememberedRange);
      return;
    }
    // A chapter change invalidates a stored range. Fallback to the end of
    // the current chapter instead of inserting into a detached element.
    const range=document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
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

  function escapeAttribute(text) {
    return String(text || "").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  }
  function makeFigure({src,caption="",align="center",size=75}) {
    const figure=document.createElement("figure");
    figure.className="book-figure";
    figure.setAttribute("contenteditable","false");
    const safeAlign=["left","center","right"].includes(align)?align:"center";
    const safeSize=[50,75,100].includes(Number(size))?Number(size):75;
    figure.dataset.align=safeAlign;
    figure.dataset.size=String(safeSize);
    figure.style.width=safeSize+"%";
    figure.style.maxWidth="100%";
    figure.style.textAlign=safeAlign;
    figure.style.marginLeft=safeAlign==="right"?"auto":safeAlign==="left"?"0":"auto";
    figure.style.marginRight=safeAlign==="left"?"auto":safeAlign==="right"?"0":"auto";
    const img=document.createElement("img");
    img.src=src;
    img.alt=caption || "Иллюстрация";
    img.loading="eager";
    img.draggable=false;
    figure.appendChild(img);
    if(caption){
      const cap=document.createElement("figcaption");
      cap.textContent=caption;
      figure.appendChild(cap);
    }
    return figure;
  }
  function insertFigure(options) {
    restoreSelection();
    const figure=makeFigure(options);
    const selection=window.getSelection();
    // Insert as a standalone block immediately after the paragraph where the
    // caret sits; this avoids invalid <p><figure> nesting and split images.
    let block=selection?.anchorNode?.nodeType===Node.ELEMENT_NODE
      ? selection.anchorNode : selection?.anchorNode?.parentElement;
    while(block && block.parentElement!==editor)block=block.parentElement;
    const nextParagraph=document.createElement("p");
    nextParagraph.appendChild(document.createElement("br"));
    if(block && block.parentElement===editor && block!==figure) {
      block.after(figure,nextParagraph);
    }else editor.append(figure,nextParagraph);
    const range=document.createRange();
    range.selectNodeContents(nextParagraph);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
    rememberedRange=range.cloneRange();
    editor.dispatchEvent(new Event("input",{bubbles:true}));
    queueStats();
  }
  const insertImageButton=document.getElementById("insertImageButton");
  function openImageInsert(){
    rememberSelection();
    if(!window.DiamondImageEditor?.open){alert("Не удалось открыть редактор изображения.");return;}
    window.DiamondImageEditor.open({onSave:insertFigure});
  }
  insertImageButton?.addEventListener("click",openImageInsert);
  editor.addEventListener("click",event=>{
    const figure=event.target.closest?.("figure.book-figure");
    if(!figure||!editor.contains(figure))return;
    const currentImg=figure.querySelector("img");
    if(!currentImg||!window.DiamondImageEditor?.open)return;
    const caption=figure.querySelector("figcaption")?.textContent || "";
    // The editor re-crops the saved image; the inserted chapter image remains
    // unchanged until the user confirms.
    window.DiamondImageEditor.open({
      src:currentImg.src,
      initialCaption:caption,
      initialAlign:figure.dataset.align || figure.style.textAlign || "center",
      initialSize:figure.dataset.size || "75",
      onSave(options){
        const newFigure=makeFigure(options);
        figure.replaceWith(newFigure);
        editor.dispatchEvent(new Event("input",{bubbles:true}));
        queueStats();
      },
      onDelete(){
        figure.remove();
        editor.dispatchEvent(new Event("input",{bubbles:true}));
        queueStats();
      }
    });
  });

  toolbar.addEventListener("pointerdown", event => {
    if (event.pointerType !== "touch" && event.target.closest("button[data-command], #insertDivider")) event.preventDefault();
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
    const size = Number(getBook(bookId)?.editorFontSize) || Number(localStorage.getItem(fontKey)) || 19;
    fontSelect.value = ["15", "17", "19", "21", "23"].includes(String(size)) ? String(size) : "19";
    editor.style.fontSize = fontSelect.value + "px";
    fontSelect.addEventListener("change", () => {
      editor.style.fontSize = fontSelect.value + "px";
      try { localStorage.setItem(fontKey, fontSelect.value); } catch {}
      window.dispatchEvent(new CustomEvent("diamond-editor-fontsize",{detail:{size:Number(fontSelect.value)}}));
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

    // Editing shortcuts: Shift+1…5 for text; Alt+1…5 for paragraphs.
    // Alt+0 opens the reading spread even when the writing area has focus.
    if (!modifier && event.altKey && !event.shiftKey && code === "Digit0") {
      event.preventDefault();
      document.getElementById("readerButton")?.click();
      return;
    }
    if (editing && !modifier && !isInput && /^Digit[1-5]$/.test(code)) {
      const number=Number(code.slice(5));
      if (event.shiftKey && !event.altKey) {
        event.preventDefault();
        const textActions=["bold","italic","underline","strikeThrough","formatBlock"];
        executeCommand(textActions[number-1],number===5?"h2":null);
        return;
      }
      if (event.altKey && !event.shiftKey) {
        event.preventDefault();
        const paragraphActions=["formatBlock","insertUnorderedList","insertOrderedList","justifyCenter","justifyLeft"];
        executeCommand(paragraphActions[number-1],number===1?"p":null);
        return;
      }
    }

    if (modifier && !event.shiftKey && !event.altKey && event.key === "Enter" && !isInput) {
      event.preventDefault();
      document.getElementById("readerButton")?.click();
      return;
    }

    if(modifier && event.altKey && !event.shiftKey && code==="KeyM" && !isInput) {
      event.preventDefault();openImageInsert();return;
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