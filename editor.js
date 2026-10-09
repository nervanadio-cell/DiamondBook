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

        const line = document.createElement("button");
        line.type = "button";
        line.className = `tree-line ${node.id === currentNodeId ? "active" : ""}`;
        line.style.paddingLeft = `${8 + depth * 12}px`;

        const hasChildren = Array.isArray(node.children) && node.children.length > 0;

        line.innerHTML = `
          <span class="tree-toggle">${hasChildren ? "▾" : "·"}</span>
          <span class="tree-label">${escapeHtml(node.title)}</span>
        `;

        line.addEventListener("click", () => {
          if (node.type === "chapter") selectChapter(node.id);
        });

        wrapper.appendChild(line);

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

  function selectChapter(nodeId) {
    const node = findNode(book, nodeId);
    if (!node || node.type !== "chapter") return;

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
