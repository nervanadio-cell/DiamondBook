document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  const book = getBook(params.get("id")) || getCurrentBook();

  if (!book) {
    location.href = "create.html";
    return;
  }

  setCurrentBook(book.id);

  const tree = document.getElementById("tree");
  const editor = document.getElementById("editor");
  const chapterTitle = document.getElementById("chapterTitle");
  const saveStatus = document.getElementById("saveStatus");
  const sidebar = document.getElementById("sidebar");
  const outlineToggle = document.getElementById("outlineToggle");
  const sidebarBackdrop = document.getElementById("sidebarBackdrop");
  function setSidebarOpen(open) {
    sidebar.classList.toggle("open", open);
    if (sidebarBackdrop) sidebarBackdrop.hidden = !open;
    if (outlineToggle) {
      outlineToggle.setAttribute("aria-expanded", String(open));
      outlineToggle.setAttribute("aria-label", open ? "Закрыть содержание" : "Открыть содержание");
    }
  }
  outlineToggle?.addEventListener("click", () => setSidebarOpen(!sidebar.classList.contains("open")));
  sidebarBackdrop?.addEventListener("click", () => setSidebarOpen(false));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && sidebar.classList.contains("open")) setSidebarOpen(false);
  });

  const exportModal = document.getElementById("exportModal");
  const formatList = document.getElementById("formatList");
  const formatSearch = document.getElementById("formatSearch");
  const editorFileInput = document.getElementById("editorFileInput");
  const formatTabs = [...document.querySelectorAll(".format-tab")];
  const bookNameButton = document.getElementById("bookNameButton");
  const lineSpacingSelect = document.getElementById("lineSpacingSelect");
  const fontFamilySelect = document.getElementById("editorFontFamily");
  const saveChapterTitleButton = document.getElementById("saveChapterTitle");
  const cancelChapterTitleButton = document.getElementById("cancelChapterTitle");

  let currentNodeId = flattenChapters(book).find(item => item.chapter.id === params.get("chapter"))?.chapter.id || flattenChapters(book)[0]?.chapter.id || null;
  let saveTimer = null;
  let saveErrorShown = false;
  let multiSelectMode = false;
  const selectedNodeIds = new Set();
  let activeContextMenu = null;

  const selectionBar = document.createElement("div");
  selectionBar.className = "tree-selection-bar";
  selectionBar.hidden = true;
  selectionBar.innerHTML = `
    <span class="tree-selection-count" id="treeSelectionCount">0 выбрано</span>
    <button type="button" data-selection-action="rename">Переименовать</button>
    <button type="button" data-selection-action="delete">Удалить</button>
    <button type="button" data-selection-action="cancel" aria-label="Отменить выбор">×</button>
  `;
  sidebar.insertBefore(selectionBar, tree);

  document.getElementById("sidebarBookTitle").textContent = book.title;
  document.getElementById("bookNameButton").textContent = book.title;

  if (lineSpacingSelect) {
    lineSpacingSelect.value = String(book.editorLineHeight || 1.8);
    editor.style.lineHeight = lineSpacingSelect.value;
    lineSpacingSelect.addEventListener("change", () => {
      book.editorLineHeight = Number(lineSpacingSelect.value) || 1.8;
      editor.style.lineHeight = String(book.editorLineHeight);
      markSaving();
    });
  }

  const textureSelect=document.getElementById("pageTextureSelect");
  const allowedTextures=["smooth","rough","damp","aged"];
  document.body.dataset.pageTexture=allowedTextures.includes(book.pageTexture)?book.pageTexture:"smooth";
  if(textureSelect) {
    textureSelect.value=document.body.dataset.pageTexture;
    textureSelect.addEventListener("change",()=>{
      book.pageTexture=allowedTextures.includes(textureSelect.value)?textureSelect.value:"smooth";
      document.body.dataset.pageTexture=book.pageTexture;
      markSaving();
    });
  }
  document.addEventListener("bookcoverchange",event=>{
    if(event.detail?.bookId!==book.id)return;
    const saved=getBook(book.id);
    if(saved){book.coverDesign=saved.coverDesign;book.coverDataUrl=saved.coverDataUrl;}
  });

  document.addEventListener("diamond-book-style-change", event => {
    if (event.detail?.bookId !== book.id) return;
    const style=event.detail.style;
    if(!style || typeof style !== "object")return;
    book.bookStyle={...style};
    book.editorFontFamily=style.font;
    book.editorLineHeight=style.line;
    book.editorFontSize=style.size;
    editor.style.fontFamily={
      georgia:"Georgia, serif",garamond:"Garamond, Georgia, serif",
      palatino:"Palatino, Georgia, serif",cambria:"Cambria, Georgia, serif",
      bookman:"'Bookman Old Style', Georgia, serif",times:"'Times New Roman', serif",
      trebuchet:"'Trebuchet MS', Arial, sans-serif",verdana:"Verdana, sans-serif",
      arial:"Arial, sans-serif",tahoma:"Tahoma, sans-serif",
      courier:"'Courier New', monospace",handwriting:"'Segoe Print', cursive"
    }[style.font] || "Georgia, serif";
    editor.style.lineHeight=String(style.line);
    if(fontFamilySelect)fontFamilySelect.value=style.font;
    if(lineSpacingSelect && Array.from(lineSpacingSelect.options).some(option=>Number(option.value)===Number(style.line)))lineSpacingSelect.value=String(style.line);
    markSaving();
  });

  const bookFonts={
    georgia:"Georgia, serif",garamond:"Garamond, Georgia, serif",
    palatino:"Palatino, Georgia, serif",cambria:"Cambria, Georgia, serif",
    bookman:"'Bookman Old Style', Georgia, serif",times:"'Times New Roman', serif",
    trebuchet:"'Trebuchet MS', Arial, sans-serif",verdana:"Verdana, sans-serif",
    arial:"Arial, sans-serif",tahoma:"Tahoma, sans-serif",
    courier:"'Courier New', monospace",handwriting:"'Segoe Print', cursive"
  };
  if(fontFamilySelect) {
    const family=Object.hasOwn(bookFonts,book.editorFontFamily)?book.editorFontFamily:"georgia";
    fontFamilySelect.value=family;
    editor.style.fontFamily=bookFonts[family];
    fontFamilySelect.addEventListener("change",()=>{
      const selected=fontFamilySelect.value;
      if(!Object.hasOwn(bookFonts,selected))return;
      book.editorFontFamily=selected;
      editor.style.fontFamily=bookFonts[selected];
      markSaving();
    });
  }
  window.addEventListener("diamond-editor-fontsize",event=>{
    book.editorFontSize=Number(event.detail?.size) || 19;
    markSaving();
  });

  function persistNow() {
    try {
      saveBook(book);
      saveStatus.textContent = "Сохранено";
      saveErrorShown = false;
    } catch (error) {
      saveStatus.textContent = "Ошибка сохранения";
      if (!saveErrorShown) {
        saveErrorShown = true;
        alert(error.message || "Не удалось сохранить книгу.");
      }
    }
  }

  function markSaving() {
    saveStatus.textContent = "Сохраняется…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persistNow, 350);
  }

  function showWriterDialog({ title, description = "", value = "", confirmText = "Сохранить", danger = false, onConfirm }) {
    const overlay = document.createElement("div");
    overlay.className = "writer-dialog-backdrop";
    overlay.innerHTML = `
      <section class="writer-dialog" role="dialog" aria-modal="true">
        <h2 class="writer-dialog-title"></h2>
        <p class="writer-dialog-description"></p>
        ${value !== null ? '<input class="writer-dialog-input" type="text" maxlength="200" autocomplete="off">' : ""}
        <div class="writer-dialog-actions">
          <button type="button" class="writer-dialog-cancel">Отмена</button>
          <button type="button" class="writer-dialog-confirm"></button>
        </div>
      </section>`;
    overlay.querySelector(".writer-dialog-title").textContent = title;
    overlay.querySelector(".writer-dialog-description").textContent = description;
    const input = overlay.querySelector(".writer-dialog-input");
    if (input) input.value = value;
    const confirmButton = overlay.querySelector(".writer-dialog-confirm");
    confirmButton.textContent = confirmText;
    if (danger) confirmButton.classList.add("danger");
    document.body.appendChild(overlay);

    let finished = false;
    const close = () => {
      if (finished) return;
      finished = true;
      document.removeEventListener("keydown", keyHandler);
      overlay.remove();
    };
    const accept = () => {
      if (finished) return;
      const result = input ? input.value.trim() : true;
      if (input && !result) {
        input.setCustomValidity("Название не может быть пустым.");
        input.reportValidity();
        return;
      }
      close();
      onConfirm?.(result);
    };
    const keyHandler = event => {
      if (event.key === "Escape" && overlay.isConnected) close();
      if (event.key === "Enter" && overlay.isConnected) {
        event.preventDefault();
        accept();
      }
    };
    overlay.querySelector(".writer-dialog-cancel").addEventListener("click", close);
    confirmButton.addEventListener("click", accept);
    overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
    document.addEventListener("keydown", keyHandler);
    if (input) {
      input.addEventListener("input", () => input.setCustomValidity(""));
      requestAnimationFrame(() => { input.focus(); input.select(); });
    } else confirmButton.focus();
  }

  function beginInlineNodeRename(node, row, line, typeLabel) {
    if (row.querySelector(".tree-inline-rename")) return;
    line.hidden = true;
    const input = document.createElement("input");
    input.type = "text";
    input.className = "tree-inline-rename";
    input.maxLength = 200;
    input.value = node.title;
    input.setAttribute("aria-label", `Новое название ${typeLabel}`);
    row.insertBefore(input, line.nextSibling);

    const actions = document.createElement("div");
    actions.className = "tree-inline-actions";
    const save = document.createElement("button");
    save.type = "button";
    save.className = "tree-inline-confirm";
    save.title = "Сохранить название";
    save.setAttribute("aria-label", "Сохранить название");
    save.textContent = "✓";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "tree-inline-cancel";
    cancel.title = "Отменить переименование";
    cancel.setAttribute("aria-label", "Отменить переименование");
    cancel.textContent = "×";
    actions.append(save, cancel);
    row.insertBefore(actions, input.nextSibling);

    let done = false;
    const finish = shouldSave => {
      if (done) return;
      if (shouldSave) {
        const clean = input.value.trim();
        if (!clean) {
          input.setCustomValidity("Название не может быть пустым.");
          input.reportValidity();
          input.focus();
          return;
        }
        node.title = clean;
        if (node.id === currentNodeId) {
          chapterTitle.value = clean;
          syncChapterTitleButtons();
        }
        markSaving();
      }
      done = true;
      renderTree();
    };
    save.addEventListener("pointerdown", event => event.preventDefault());
    cancel.addEventListener("pointerdown", event => event.preventDefault());
    save.addEventListener("click", () => finish(true));
    cancel.addEventListener("click", () => finish(false));
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") { event.preventDefault(); finish(true); }
      if (event.key === "Escape") { event.preventDefault(); finish(false); }
    });
    input.addEventListener("input", () => input.setCustomValidity(""));
    requestAnimationFrame(() => { input.focus(); input.select(); });
  }

  function beginInlineBookRename() {
    if (document.getElementById("bookTitleInlineInput")) return;
    const input = document.createElement("input");
    input.id = "bookTitleInlineInput";
    input.className = "book-title-inline-input";
    input.type = "text";
    input.maxLength = 120;
    input.value = book.title;
    input.setAttribute("aria-label", "Название книги");
    bookNameButton.hidden = true;
    bookNameButton.insertAdjacentElement("afterend", input);

    const actions = document.createElement("div");
    actions.className = "book-title-inline-actions";
    const save = document.createElement("button");
    save.type = "button";
    save.title = "Сохранить название книги";
    save.setAttribute("aria-label", "Сохранить название книги");
    save.textContent = "✓";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.title = "Отменить переименование книги";
    cancel.setAttribute("aria-label", "Отменить переименование книги");
    cancel.textContent = "×";
    actions.append(save, cancel);
    input.insertAdjacentElement("afterend", actions);

    let done = false;
    const finish = shouldSave => {
      if (done) return;
      if (shouldSave) {
        const clean = input.value.trim();
        if (!clean) {
          input.setCustomValidity("Название не может быть пустым.");
          input.reportValidity();
          input.focus();
          return;
        }
        book.title = clean;
        bookNameButton.textContent = clean;
        document.getElementById("sidebarBookTitle").textContent = clean;
        persistNow();
      }
      done = true;
      input.remove();
      actions.remove();
      bookNameButton.hidden = false;
    };
    save.addEventListener("pointerdown", event => event.preventDefault());
    cancel.addEventListener("pointerdown", event => event.preventDefault());
    save.addEventListener("click", () => finish(true));
    cancel.addEventListener("click", () => finish(false));
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") { event.preventDefault(); finish(true); }
      if (event.key === "Escape") { event.preventDefault(); finish(false); }
    });
    input.addEventListener("input", () => input.setCustomValidity(""));
    requestAnimationFrame(() => { input.focus(); input.select(); });
  }

  bookNameButton.addEventListener("click", beginInlineBookRename);

  function renderTree() {
    tree.innerHTML = "";

    const renderNodes = (nodes, parent, depth = 0) => {
      (nodes || []).forEach(node => {
        const wrapper = document.createElement("div");
        wrapper.className = "tree-node";

        const row = document.createElement("div");
        row.className = "tree-row";
        row.dataset.nodeId = node.id;
        row.dataset.nodeType = node.type;

        const line = document.createElement("button");
        line.type = "button";
        line.className = `tree-line ${node.id === currentNodeId ? "active" : ""}`;
        line.style.paddingLeft = `${8 + depth * 12}px`;

        const hasChildren = Array.isArray(node.children) && node.children.length > 0;
        const typeLabel = node.type === "volume" ? "том" : node.type === "part" ? "часть" : "главу";

        line.innerHTML = `
          <span class="tree-toggle">${hasChildren ? "▾" : "·"}</span>
          <span class="tree-label">${escapeHtml(node.title)}</span>
        `;

        if (multiSelectMode) {
          const check = document.createElement("input");
          check.type = "checkbox";
          check.className = "tree-select-checkbox";
          check.checked = selectedNodeIds.has(node.id);
          check.setAttribute("aria-label", `Выбрать ${node.title}`);
          check.addEventListener("click", event => event.stopPropagation());
          check.addEventListener("change", () => {
            if (check.checked) selectedNodeIds.add(node.id);
            else selectedNodeIds.delete(node.id);
            updateSelectionBar();
          });
          row.appendChild(check);
        }

        line.addEventListener("click", () => {
          if (multiSelectMode) {
            if (selectedNodeIds.has(node.id)) selectedNodeIds.delete(node.id);
            else selectedNodeIds.add(node.id);
            const check = row.querySelector(".tree-select-checkbox");
            if (check) check.checked = selectedNodeIds.has(node.id);
            updateSelectionBar();
            return;
          }
          if (node.type === "chapter") selectChapter(node.id);
        });
        wrapper.addEventListener("contextmenu", event => {
          if (event.target.closest(".tree-context-menu")) return;
          showNodeContextMenu(node, event);
        });

        const nodeActions = document.createElement("div");
        nodeActions.className = "tree-node-actions";

        const renameButton = document.createElement("button");
        renameButton.type = "button";
        renameButton.className = "tree-action tree-rename";
        renameButton.title = `Переименовать ${typeLabel}`;
        renameButton.setAttribute("aria-label", `Переименовать ${typeLabel} ${node.title}`);
        renameButton.textContent = "✎";
        renameButton.addEventListener("click", event => {
          event.stopPropagation();
          beginInlineNodeRename(node, row, line, typeLabel);
        });

        const moreButton = document.createElement("button");
        moreButton.type = "button";
        moreButton.className = "tree-action tree-more";
        moreButton.title = "Действия с разделом";
        moreButton.setAttribute("aria-label", `Действия: ${node.title}`);
        moreButton.textContent = "⋮";
        moreButton.addEventListener("click", event => {
          event.stopPropagation();
          const rect = moreButton.getBoundingClientRect();
          showNodeContextMenu(node, {
            preventDefault() {},
            stopPropagation() {},
            clientX: Math.min(window.innerWidth - 20, rect.left + 12),
            clientY: rect.bottom
          });
        });
        nodeActions.appendChild(moreButton);
        nodeActions.appendChild(renameButton);

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "tree-action tree-delete";
        deleteButton.title = `Удалить ${typeLabel}`;
        deleteButton.setAttribute("aria-label", `Удалить ${typeLabel} ${node.title}`);
        deleteButton.textContent = "×";
        deleteButton.addEventListener("click", event => {
          event.stopPropagation();
          deleteNodeIds(new Set([node.id]));
        });
        nodeActions.appendChild(deleteButton);

        if (node.type === "volume" || node.type === "part") {
          const addButton = document.createElement("button");
          addButton.type = "button";
          addButton.className = "tree-action tree-add-child";
          addButton.title = node.type === "volume" ? "Добавить часть" : "Добавить главу";
          addButton.setAttribute("aria-label", addButton.title);
          addButton.textContent = "+";
          addButton.addEventListener("click", event => {
            event.stopPropagation();
            addChildNode(node,node.type==="volume"?"part":"chapter");
          });
          nodeActions.appendChild(addButton);
        }

        row.appendChild(line);
        row.appendChild(nodeActions);
        wrapper.appendChild(row);

        if (hasChildren) {
          const children = document.createElement("div");
          children.className = "tree-children";
          renderNodes(node.children, children, depth + 1);
          wrapper.appendChild(children);
        }

        parent.appendChild(wrapper);
      });
    };

    renderNodes(book.structure, tree);
    if(!book.structure.length) {
      const hint=document.createElement("div");
      hint.className="tree-empty-state";
      hint.textContent="Содержание пустое. Нажми + и выбери, что добавить.";
      tree.appendChild(hint);
    }
  }

  function updateSelectionBar() {
    selectionBar.hidden = !multiSelectMode;
    const count = selectionBar.querySelector("#treeSelectionCount");
    if (count) count.textContent = `${selectedNodeIds.size} выбрано`;
    selectionBar.querySelector('[data-selection-action="rename"]').disabled = selectedNodeIds.size === 0;
    selectionBar.querySelector('[data-selection-action="delete"]').disabled = selectedNodeIds.size === 0;
  }

  function allNodes(nodes = book.structure, result = []) {
    (nodes || []).forEach(node => {
      result.push(node);
      if (Array.isArray(node.children)) allNodes(node.children, result);
    });
    return result;
  }

  function countDescendants(node) {
    return (node.children || []).reduce((total, child) => total + 1 + countDescendants(child), 0);
  }

  function removeNodeById(nodes, nodeId) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (nodes[i].id === nodeId) {
        nodes.splice(i, 1);
        return true;
      }
      if (Array.isArray(nodes[i].children) && removeNodeById(nodes[i].children, nodeId)) return true;
    }
    return false;
  }

  function renameSelectedNodes(ids) {
    const nodes = allNodes().filter(node => ids.has(node.id));
    if (!nodes.length) return;
    if (nodes.length === 1) {
      const node = nodes[0];
      const row = tree.querySelector(`.tree-row[data-node-id="${CSS.escape(node.id)}"]`);
      const line = row?.querySelector(".tree-line");
      if (row && line) beginInlineNodeRename(node, row, line, node.type);
      return;
    }
    showWriterDialog({
      title: "Переименовать выбранные элементы",
      description: "Введи общее название. К нему автоматически добавятся номера.",
      value: "Сцена",
      confirmText: "Переименовать",
      onConfirm: prefix => {
        nodes.forEach((node, index) => {
          node.title = `${prefix} ${index + 1}`;
          if (node.id === currentNodeId) chapterTitle.value = node.title;
        });
        renderTree();
        markSaving();
      }
    });
  }

  function deleteNodeIds(ids) {
    const nodes = allNodes().filter(node => ids.has(node.id));
    if (!nodes.length) return;
    const totalChildren = nodes.reduce((sum, node) => sum + countDescendants(node), 0);
    const headline = nodes.length === 1
      ? `«${nodes[0].title}»${totalChildren ? ` и всё содержимое (${totalChildren} вложенных элементов)` : ""}`
      : `${nodes.length} выбранных элементов`;

    showWriterDialog({
      title: "Удалить элементы?",
      description: `Точно удалить ${headline}? Все вложенные главы и текст будут удалены. Это действие нельзя отменить.`,
      value: null,
      confirmText: "Удалить",
      danger: true,
      onConfirm: () => {
        ids.forEach(id => removeNodeById(book.structure, id));
        selectedNodeIds.clear();
        multiSelectMode = false;
        closeNodeContextMenu();

        if (!flattenChapters(book).length && !book.structure.length) {
          // Empty structure is allowed; the user explicitly chooses the next section.
        }
        if (!findNode(book, currentNodeId) || findNode(book, currentNodeId)?.type !== "chapter") {
          currentNodeId = flattenChapters(book)[0]?.chapter.id || null;
        }

        updateSelectionBar();
        if (currentNodeId) selectChapter(currentNodeId);
        else showNoChapter();
        persistNow();
      }
    });
  }

  function nextNodeName(type,nodes=[]) {
    const label=type==="volume"?"Том":type==="part"?"Часть":"Глава";
    const existing=(nodes||[]).filter(n=>n.type===type);
    const used=new Set(existing.map(n=>String(n.title||"").match(new RegExp("^"+label+"\\s+(\\d+)"))?.[1]).filter(Boolean).map(Number));
    let number=1;
    while(used.has(number))number++;
    return `${label} ${number}`;
  }

  function createSection(kind,parent=null) {
    if(!["volume","part","chapter"].includes(kind))return;
    if(parent?.type==="chapter" || (parent?.type==="part" && kind!=="chapter") ||
      (parent?.type==="volume" && kind==="volume"))return;
    const siblings=parent?(parent.children ||= []):book.structure;
    let node;
    if(kind==="volume") node=makeVolume(nextNodeName("volume",siblings),0,0);
    else if(kind==="part") node=makePart(nextNodeName("part",siblings),0);
    else node=makeChapter(nextNodeName("chapter",siblings));
    siblings.push(node);
    renderTree();
    if(node.type==="chapter")selectChapter(node.id);
    else {
      const row=tree.querySelector(`.tree-row[data-node-id="${CSS.escape(node.id)}"]`);
      row?.classList.add("tree-new-node");
      row?.scrollIntoView({block:"nearest",behavior:"smooth"});
      showTreeTip(`Создана ${kind==="volume"?"новая книга-том":"часть"} без скрытых глав. Нажми + для заполнения.`);
    }
    markSaving();
  }

  function showTreeTip(message) {
    let tip=document.getElementById("treeHint");
    if(!tip){
      tip=document.createElement("div");
      tip.id="treeHint";
      tip.className="tree-inline-hint";
      tree.parentElement.insertBefore(tip,tree);
    }
    tip.textContent=message;
    tip.hidden=false;
    clearTimeout(showTreeTip.timer);
    showTreeTip.timer=setTimeout(()=>{tip.hidden=true;},5000);
  }

  function addChildNode(node,kind=null) {
    const type=kind || (node.type==="volume"?"part":"chapter");
    createSection(type,node);
  }

  function closeNodeContextMenu() {
    if (activeContextMenu) activeContextMenu.remove();
    activeContextMenu = null;
  }

  function showNodeContextMenu(node, event) {
    event.preventDefault();
    event.stopPropagation();
    closeNodeContextMenu();
    const menu = document.createElement("div");
    menu.className = "tree-context-menu";
    menu.innerHTML = `
      <button type="button" data-action="rename">✎ <span>Переименовать</span></button>
      <button type="button" data-action="multi">☷ <span>${multiSelectMode ? "Выключить мультивыбор" : "Выбрать несколько"}</span></button>
      <button type="button" data-action="add-part" ${node.type !== "volume" ? "hidden" : ""}>＋ <span>Добавить часть в том</span></button>
      <button type="button" data-action="add-chapter" ${node.type === "chapter" ? "hidden" : ""}>＋ <span>Добавить главу сюда</span></button>
      <button type="button" data-action="delete" class="danger">⌫ <span>Удалить</span></button>
    `;
    document.body.appendChild(menu);
    activeContextMenu = menu;
    const left = Math.max(8, Math.min(event.clientX, window.innerWidth - menu.offsetWidth - 8));
    const top = Math.max(8, Math.min(event.clientY, window.innerHeight - menu.offsetHeight - 8));
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;

    menu.querySelector('[data-action="rename"]').addEventListener("click", () => {
      closeNodeContextMenu();
      renameSelectedNodes(new Set([node.id]));
    });
    menu.querySelector('[data-action="multi"]').addEventListener("click", () => {
      closeNodeContextMenu();
      if (multiSelectMode) {
        multiSelectMode = false;
        selectedNodeIds.clear();
      } else {
        multiSelectMode = true;
        selectedNodeIds.clear();
        selectedNodeIds.add(node.id);
      }
      renderTree();
      updateSelectionBar();
    });
    for(const kind of ["part","chapter"]){
      menu.querySelector(`[data-action="add-${kind}"]`).addEventListener("click", () => {
        closeNodeContextMenu();
        addChildNode(node,kind);
      });
    }
    menu.querySelector('[data-action="delete"]').addEventListener("click", () => {
      closeNodeContextMenu();
      deleteNodeIds(new Set([node.id]));
    });
  }

  selectionBar.querySelector('[data-selection-action="rename"]').addEventListener("click", () => renameSelectedNodes(selectedNodeIds));
  selectionBar.querySelector('[data-selection-action="delete"]').addEventListener("click", () => deleteNodeIds(selectedNodeIds));
  selectionBar.querySelector('[data-selection-action="cancel"]').addEventListener("click", () => {
    selectedNodeIds.clear();
    multiSelectMode = false;
    renderTree();
    updateSelectionBar();
  });
  document.addEventListener("click", event => {
    if (activeContextMenu && !activeContextMenu.contains(event.target)) closeNodeContextMenu();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeNodeContextMenu();
    if (event.key === "Delete" && multiSelectMode && selectedNodeIds.size && !event.target.matches("input,textarea,[contenteditable=true]")) {
      event.preventDefault();
      deleteNodeIds(selectedNodeIds);
    }
  });

  function selectChapter(nodeId) {
    const node = findNode(book, nodeId);
    if (!node || node.type !== "chapter") return;

    const previousId = currentNodeId;
    const allChapters = flattenChapters(book);
    const previousIndex = allChapters.findIndex(item => item.chapter.id === previousId);
    const nextIndex = allChapters.findIndex(item => item.chapter.id === nodeId);
    const sheet = document.querySelector(".chapter-editor");
    if (sheet && previousId && previousId !== nodeId) {
      sheet.classList.remove("page-turn-forward", "page-turn-back");
      void sheet.offsetWidth;
      sheet.classList.add(nextIndex >= previousIndex ? "page-turn-forward" : "page-turn-back");
      window.setTimeout(() => sheet.classList.remove("page-turn-forward", "page-turn-back"), 460);
    }

    currentNodeId = nodeId;
    chapterTitle.disabled=false;
    editor.setAttribute("contenteditable","true");
    document.getElementById("insertImageButton")?.removeAttribute("disabled");
    chapterTitle.value = node.title;
    syncChapterTitleButtons();
    editor.innerHTML = node.content || "<p></p>";
    renderTree();
    if (!window.matchMedia("(pointer: coarse)").matches) editor.focus({ preventScroll: true });
    setSidebarOpen(false);
  }

  function syncChapterTitleButtons() {
    const node = findNode(book, currentNodeId);
    const dirty = !!node && chapterTitle.value.trim() !== node.title;
    if (saveChapterTitleButton) saveChapterTitleButton.disabled = !dirty || !chapterTitle.value.trim();
    if (cancelChapterTitleButton) cancelChapterTitleButton.disabled = !dirty;
    chapterTitle.classList.toggle("title-dirty", dirty);
  }

  function commitChapterTitle() {
    const node = findNode(book, currentNodeId);
    if (!node) return;
    const clean = chapterTitle.value.trim();
    if (!clean) {
      chapterTitle.setCustomValidity("Название не может быть пустым.");
      chapterTitle.reportValidity();
      chapterTitle.focus();
      return;
    }
    chapterTitle.setCustomValidity("");
    node.title = clean;
    chapterTitle.value = clean;
    renderTree();
    markSaving();
    syncChapterTitleButtons();
  }

  chapterTitle.addEventListener("input", () => {
    chapterTitle.setCustomValidity("");
    syncChapterTitleButtons();
  });
  chapterTitle.addEventListener("keydown", event => {
    if (event.key === "Enter") { event.preventDefault(); commitChapterTitle(); }
    if (event.key === "Escape") {
      const node = findNode(book, currentNodeId);
      if (node) chapterTitle.value = node.title;
      syncChapterTitleButtons();
    }
  });
  saveChapterTitleButton?.addEventListener("click", commitChapterTitle);
  cancelChapterTitleButton?.addEventListener("click", () => {
    const node = findNode(book, currentNodeId);
    if (node) chapterTitle.value = node.title;
    chapterTitle.setCustomValidity("");
    syncChapterTitleButtons();
  });

  editor.addEventListener("input", () => {
    const node = findNode(book, currentNodeId);
    if (!node) return;

    node.content = editor.innerHTML || "<p></p>";
    markSaving();
  });

  document.querySelectorAll(".tool-button[data-command]").forEach(button => {
    button.addEventListener("click", () => {
      editor.focus();
      document.execCommand(
        button.dataset.command,
        false,
        button.dataset.value || null
      );

      const node = findNode(book, currentNodeId);
      if (node) node.content = editor.innerHTML || "<p></p>";
      markSaving();
    });
  });

  document.getElementById("insertDivider").addEventListener("click", () => {
    editor.focus();
    document.execCommand("insertHorizontalRule");
    const node = findNode(book, currentNodeId);
    if (node) node.content = editor.innerHTML || "<p></p>";
    markSaving();
  });

  document.getElementById("readerButton").addEventListener("click", () => {
    clearTimeout(saveTimer);
    persistNow();
    location.href = `reader.html?id=${encodeURIComponent(book.id)}&chapter=${encodeURIComponent(currentNodeId || "")}`;
  });

  document.getElementById("exportButton").addEventListener("click", () => {
    exportModal.classList.remove("hidden");
    setFormatMode("export");
  });

  document.getElementById("closeExport").addEventListener("click", () => {
    exportModal.classList.add("hidden");
  });

  exportModal.addEventListener("click", event => {
    if (event.target === exportModal) exportModal.classList.add("hidden");
  });

  const rootAddButton = document.getElementById("addRootButton");
  const rootMenu = document.createElement("div");
  rootMenu.className = "root-create-menu";
  rootMenu.hidden = true;
  rootMenu.innerHTML = `
    <button type="button" data-kind="chapter">＋ Глава</button>
    <button type="button" data-kind="part">＋ Часть</button>
    <button type="button" data-kind="volume">＋ Том</button>
  `;
  rootAddButton.parentElement.appendChild(rootMenu);
  rootAddButton.setAttribute("aria-expanded","false");
  rootAddButton.setAttribute("aria-label","Создать раздел");
  rootAddButton.addEventListener("click", event => {
    event.stopPropagation();
    rootMenu.hidden = !rootMenu.hidden;
    rootAddButton.setAttribute("aria-expanded",String(!rootMenu.hidden));
  });
  rootMenu.addEventListener("click", event => {
    const kind = event.target.closest("[data-kind]")?.dataset.kind;
    if (!kind) return;
    // Each root choice inserts exactly one item of the chosen type.
    rootMenu.hidden=true;
    rootAddButton.setAttribute("aria-expanded","false");
    createSection(kind);
  });
  document.addEventListener("click", event => {
    if (!rootMenu.hidden && !rootMenu.contains(event.target) && event.target!==rootAddButton) {
      rootMenu.hidden=true;
      rootAddButton.setAttribute("aria-expanded","false");
    }
  });

  document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      clearTimeout(saveTimer);
      persistNow();
    }

    if (event.key === "Escape") {
      exportModal.classList.add("hidden");
      setSidebarOpen(false);
      rootMenu.hidden = true;
    }
  });

  function setFormatMode(mode) {
    formatTabs.forEach(tab => {
      tab.classList.toggle("active", tab.dataset.mode === mode);
    });
    renderFormats(mode);
  }

  function renderFormats(mode) {
    const query = String(formatSearch.value || "").toLowerCase().trim();
    const groups = {};

    BOOK_FORMATS
      .filter(format =>
        format[mode] &&
        `${format.name} ${format.ext} ${format.group}`.toLowerCase().includes(query)
      )
      .forEach(format => {
        (groups[format.group] ||= []).push(format);
      });

    formatList.innerHTML = "";

    Object.entries(groups).forEach(([group, formats]) => {
      const heading = document.createElement("div");
      heading.className = "format-group-title";
      heading.textContent = group;
      formatList.appendChild(heading);

      formats.forEach(format => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "format-option";
        button.innerHTML = `
          <span>
            <strong>${escapeHtml(format.name)}</strong>
            <small>.${escapeHtml(format.ext)}</small>
          </span>
          <span>${mode === "export" ? "Скачать" : "Открыть"}</span>
        `;

        button.addEventListener("click", async () => {
          try {
            if (mode === "export") {
              clearTimeout(saveTimer);
              persistNow();
              await exportBookFormat(getBook(book.id) || book, format.id);
              return;
            }

            editorFileInput.dataset.format = format.id;
            editorFileInput.value = "";
            editorFileInput.click();
          } catch (error) {
            console.error(error);
            alert(`Ошибка ${mode === "export" ? "экспорта" : "импорта"}:\n${error.message || error}`);
          }
        });

        formatList.appendChild(button);
      });
    });

    if (!formatList.children.length) {
      formatList.innerHTML = '<div class="format-empty">Ничего не найдено.</div>';
    }
  }

  formatTabs.forEach(tab => {
    tab.addEventListener("click", () => setFormatMode(tab.dataset.mode));
  });

  formatSearch.addEventListener("input", () => {
    const activeMode = formatTabs.find(tab => tab.classList.contains("active"))?.dataset.mode || "export";
    renderFormats(activeMode);
  });

  editorFileInput.addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedBook = await importFile(file);
      saveBook(importedBook);
      location.href = `editor.html?id=${encodeURIComponent(importedBook.id)}`;
    } catch (error) {
      console.error(error);
      alert(`Не удалось импортировать файл.\n${error.message || error}`);
    } finally {
      editorFileInput.value = "";
    }
  });

  function showNoChapter() {
    currentNodeId=null;
    chapterTitle.value="";
    chapterTitle.placeholder="Добавь или выбери главу слева";
    chapterTitle.disabled=true;
    editor.innerHTML='<p class="empty-editor-hint">Здесь пока нет главы. Нажми + в содержании и выбери «Глава», либо создай её внутри тома или части.</p>';
    editor.setAttribute("contenteditable","false");
    document.getElementById("insertImageButton")?.setAttribute("disabled","true");
    renderTree();
  }
  // Keep editor writable only when an actual chapter is selected.
  renderTree();
  if(currentNodeId) {
    selectChapter(currentNodeId);
  }else{
    showNoChapter();
  }
});
