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
  const exportModal = document.getElementById("exportModal");
  const formatList = document.getElementById("formatList");
  const formatSearch = document.getElementById("formatSearch");
  const editorFileInput = document.getElementById("editorFileInput");
  const formatTabs = [...document.querySelectorAll(".format-tab")];

  let currentNodeId = flattenChapters(book)[0]?.chapter.id || null;
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

  function renderTree() {
    tree.innerHTML = "";

    const renderNodes = (nodes, parent, depth = 0) => {
      (nodes || []).forEach(node => {
        const wrapper = document.createElement("div");
        wrapper.className = "tree-node";

        const row = document.createElement("div");
        row.className = "tree-row";

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
        line.addEventListener("contextmenu", event => showNodeContextMenu(node, event));

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
          const nextTitle = prompt(`Новое название для ${typeLabel} (например, «Том 1 — Сага»):`, node.title);
          if (nextTitle === null) return;
          const cleanTitle = nextTitle.trim();
          if (!cleanTitle) {
            alert("Название не может быть пустым.");
            return;
          }
          node.title = cleanTitle;
          if (node.id === currentNodeId) chapterTitle.value = cleanTitle;
          renderTree();
          markSaving();
        });
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
            node.children ||= [];
            if (node.type === "volume") {
              const part = makePart(`Часть ${node.children.length + 1}`, 1);
              node.children.push(part);
              const firstChapter = flattenChapters({ structure: [part] })[0]?.chapter;
              if (firstChapter) selectChapter(firstChapter.id);
            } else {
              const chapter = makeChapter(`Глава ${flattenChapters(book).length + 1}`);
              node.children.push(chapter);
              selectChapter(chapter.id);
            }
            renderTree();
            markSaving();
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
      const type = node.type === "volume" ? "тома" : node.type === "part" ? "части" : "главы";
      const next = prompt(`Новое название ${type}:`, node.title);
      if (next === null) return;
      if (!next.trim()) { alert("Название не может быть пустым."); return; }
      node.title = next.trim();
      if (node.id === currentNodeId) chapterTitle.value = node.title;
    } else {
      const prefix = prompt("Общее название. К каждому элементу добавится номер:", "Сцена");
      if (prefix === null) return;
      if (!prefix.trim()) { alert("Название не может быть пустым."); return; }
      nodes.forEach((node, index) => {
        node.title = `${prefix.trim()} ${index + 1}`;
        if (node.id === currentNodeId) chapterTitle.value = node.title;
      });
    }
    renderTree();
    markSaving();
  }

  function deleteNodeIds(ids) {
    const nodes = allNodes().filter(node => ids.has(node.id));
    if (!nodes.length) return;
    const totalChildren = nodes.reduce((sum, node) => sum + countDescendants(node), 0);
    const headline = nodes.length === 1
      ? `«${nodes[0].title}»${totalChildren ? ` и всё содержимое (${totalChildren} вложенных элементов)` : ""}`
      : `${nodes.length} выбранных элементов`;
    if (!confirm(`Точно удалить ${headline}? Это действие нельзя отменить.`)) return;

    ids.forEach(id => removeNodeById(book.structure, id));
    selectedNodeIds.clear();
    multiSelectMode = false;
    activeContextMenu?.remove();
    activeContextMenu = null;

    if (!flattenChapters(book).length) {
      book.structure.push(makeChapter("Глава 1"));
    }
    if (!findNode(book, currentNodeId) || findNode(book, currentNodeId)?.type !== "chapter") {
      currentNodeId = flattenChapters(book)[0]?.chapter.id || null;
    }

    updateSelectionBar();
    if (currentNodeId) selectChapter(currentNodeId);
    else renderTree();
    persistNow();
  }

  function addChildNode(node) {
    node.children ||= [];
    if (node.type === "volume") {
      const part = makePart(`Часть ${node.children.length + 1}`, 1);
      node.children.push(part);
      const firstChapter = flattenChapters({ structure: [part] })[0]?.chapter;
      if (firstChapter) currentNodeId = firstChapter.id;
    } else if (node.type === "part") {
      const chapter = makeChapter(`Глава ${flattenChapters(book).length + 1}`);
      node.children.push(chapter);
      currentNodeId = chapter.id;
    }
    renderTree();
    if (currentNodeId) selectChapter(currentNodeId);
    markSaving();
  }

  function closeNodeContextMenu() {
    if (activeContextMenu) activeContextMenu.remove();
    activeContextMenu = null;
  }

  function showNodeContextMenu(node, event) {
    event.preventDefault();
    closeNodeContextMenu();
    const menu = document.createElement("div");
    menu.className = "tree-context-menu";
    menu.innerHTML = `
      <button type="button" data-action="rename">✎ <span>Переименовать</span></button>
      <button type="button" data-action="multi">☷ <span>${multiSelectMode ? "Выключить мультивыбор" : "Выбрать несколько"}</span></button>
      <button type="button" data-action="add" ${node.type === "chapter" ? "hidden" : ""}>＋ <span>Добавить вложенное</span></button>
      <button type="button" data-action="delete" class="danger">⌫ <span>Удалить</span></button>
    `;
    document.body.appendChild(menu);
    activeContextMenu = menu;
    const nodeRect = event.currentTarget.getBoundingClientRect();
    const left = Math.max(8, Math.min(nodeRect.right + 5, window.innerWidth - menu.offsetWidth - 8));
    const top = Math.max(8, Math.min(nodeRect.top, window.innerHeight - menu.offsetHeight - 8));
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
    menu.querySelector('[data-action="add"]').addEventListener("click", () => {
      closeNodeContextMenu();
      addChildNode(node);
    });
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
    chapterTitle.value = node.title;
    editor.innerHTML = node.content || "<p></p>";
    renderTree();
    editor.focus();
    sidebar.classList.remove("open");
  }

  chapterTitle.addEventListener("input", () => {
    const node = findNode(book, currentNodeId);
    if (!node) return;

    node.title = chapterTitle.value.trim() || "Без названия";
    renderTree();
    markSaving();
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

  document.getElementById("addRootButton").addEventListener("click", () => {
    const chapter = makeChapter(`Глава ${flattenChapters(book).length + 1}`);
    book.structure.push(chapter);
    currentNodeId = chapter.id;
    selectChapter(chapter.id);
    markSaving();
  });

  document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      clearTimeout(saveTimer);
      persistNow();
    }

    if (event.key === "Escape") {
      exportModal.classList.add("hidden");
      sidebar.classList.remove("open");
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

  renderTree();

  if (currentNodeId) {
    selectChapter(currentNodeId);
  } else {
    const chapter = makeChapter("Глава 1");
    book.structure.push(chapter);
    currentNodeId = chapter.id;
    selectChapter(chapter.id);
    persistNow();
  }
});
