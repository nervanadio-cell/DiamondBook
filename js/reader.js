document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  const book = getBook(params.get("id")) || getCurrentBook();

  if (!book) {
    location.href = "index.html";
    return;
  }

  let chapters = flattenChapters(book);

  if (!chapters.length) {
    const fallback = makeChapter("Глава 1");
    book.structure = [fallback];
    saveBook(book);
    chapters = flattenChapters(book);
  }

  let currentIndex = chapters.findIndex(
    item => item.chapter.id === params.get("chapter")
  );
  if (currentIndex < 0) currentIndex = 0;

  const page = document.querySelector(".reader-page");
  const title = document.getElementById("readerTitle");
  const content = document.getElementById("readerContent");
  const kicker = document.getElementById("readerKicker");
  const bookTitle = document.getElementById("readerBookTitle");
  const chapterTitle = document.getElementById("readerChapterTitle");
  const progress = document.getElementById("readerProgress");
  const tree = document.getElementById("readerTree");
  const sidebar = document.getElementById("readerSidebar");
  const themePanel = document.getElementById("themePanel");
  let lastRenderedIndex = null;

  bookTitle.textContent = book.title;
  document.getElementById("backToEditor").href =
    `editor.html?id=${encodeURIComponent(book.id)}`;

  function getKicker(item) {
    return (item.parents || [])
      .filter(node => node.type !== "chapter")
      .map(node => node.title)
      .join(" · ");
  }

  function render() {
    const item = chapters[currentIndex];
    if (!item) return;

    const paper = document.getElementById("readerPaper");
    if (paper && lastRenderedIndex !== null && lastRenderedIndex !== currentIndex) {
      paper.classList.remove("page-turn-next", "page-turn-prev");
      void paper.offsetWidth;
      paper.classList.add(currentIndex > lastRenderedIndex ? "page-turn-next" : "page-turn-prev");
      window.setTimeout(() => paper.classList.remove("page-turn-next", "page-turn-prev"), 460);
    }
    lastRenderedIndex = currentIndex;

    title.textContent = item.chapter.title;
    chapterTitle.textContent = item.chapter.title;
    kicker.textContent = getKicker(item);
    content.innerHTML = sanitizeReaderHtml(item.chapter.content || "<p></p>");
    progress.textContent = `${currentIndex + 1} / ${chapters.length}`;

    content.querySelectorAll("img").forEach(img => {
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      img.loading = "lazy";
    });

    renderTree();
    window.scrollTo({ top: 0, behavior: "smooth" });

    document.getElementById("prevButton").disabled = currentIndex === 0;
    document.getElementById("nextButton").disabled =
      currentIndex === chapters.length - 1;
  }

  function sanitizeReaderHtml(html) {
    if (typeof DOMParser === "undefined") return html;

    const doc = new DOMParser().parseFromString(String(html), "text/html");
    doc.querySelectorAll("script,iframe,object,embed,form").forEach(node => node.remove());

    doc.querySelectorAll("*").forEach(node => {
      [...node.attributes].forEach(attribute => {
        const name = attribute.name.toLowerCase();
        const value = attribute.value.trim();

        if (name.startsWith("on")) node.removeAttribute(attribute.name);
        if ((name === "href" || name === "src") && /^javascript:/i.test(value)) {
          node.removeAttribute(attribute.name);
        }
      });
    });

    return doc.body?.innerHTML || "<p></p>";
  }

  function renderTree() {
    tree.innerHTML = "";

    const renderNodes = (nodes, parent, depth = 0) => {
      (nodes || []).forEach(node => {
        const wrapper = document.createElement("div");
        const line = document.createElement("button");

        line.type = "button";
        line.className = `tree-line ${node.id === chapters[currentIndex]?.chapter.id ? "active" : ""}`;
        line.style.paddingLeft = `${8 + depth * 12}px`;
        line.innerHTML = `
          <span class="tree-toggle">${node.children?.length ? "▾" : "·"}</span>
          <span class="tree-label">${escapeHtml(node.title)}</span>
        `;

        line.addEventListener("click", () => {
          if (node.type !== "chapter") return;

          const index = chapters.findIndex(
            item => item.chapter.id === node.id
          );

          if (index >= 0) {
            currentIndex = index;
            render();
            sidebar.classList.remove("open");
          }
        });

        wrapper.appendChild(line);

        if (node.children?.length) {
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

  document.getElementById("prevButton").addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex--;
      render();
    }
  });

  document.getElementById("nextButton").addEventListener("click", () => {
    if (currentIndex < chapters.length - 1) {
      currentIndex++;
      render();
    }
  });

  document.getElementById("menuButton").addEventListener("click", () => {
    sidebar.classList.add("open");
  });

  document.getElementById("closeSidebar").addEventListener("click", () => {
    sidebar.classList.remove("open");
  });

  document.getElementById("themeButton").addEventListener("click", () => {
    themePanel.classList.toggle("hidden");
  });

  themePanel.addEventListener("click", event => {
    const theme = event.target.dataset.theme;
    if (!theme) return;

    page.classList.remove("theme-paper", "theme-night", "theme-warm");

    if (theme !== "paper") {
      page.classList.add(`theme-${theme}`);
    }

    localStorage.setItem("bookCreator.readerTheme", theme);
    themePanel.classList.add("hidden");
  });

  const savedTheme = localStorage.getItem("bookCreator.readerTheme") || "paper";

  if (savedTheme !== "paper") {
    page.classList.add(`theme-${savedTheme}`);
  }

  document.addEventListener("keydown", event => {
    if (event.target?.matches?.("input,textarea,[contenteditable='true']")) return;

    if (event.key === "ArrowRight") {
      document.getElementById("nextButton").click();
    }

    if (event.key === "ArrowLeft") {
      document.getElementById("prevButton").click();
    }

    if (event.key === "Escape") {
      sidebar.classList.remove("open");
      themePanel.classList.add("hidden");
    }
  });

  render();
});
