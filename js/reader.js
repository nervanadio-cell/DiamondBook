document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  const book = getBook(params.get("id")) || getCurrentBook();
  if (!book) { location.href = "index.html"; return; }

  let chapters = flattenChapters(book);
  if (!chapters.length) {
    book.structure = [makeChapter("Глава 1")];
    saveBook(book);
    chapters = flattenChapters(book);
  }

  const page = document.querySelector(".reader-page");
  const stage = document.getElementById("readerStage");
  const spread = document.getElementById("readerSpread");
  const sheetLeft = document.getElementById("readerSheetLeft");
  const sheetRight = document.getElementById("readerSheetRight");
  const title = document.getElementById("readerTitle");
  const kicker = document.getElementById("readerKicker");
  const kickerRight = document.getElementById("readerKickerRight");
  const runningLeft = document.getElementById("readerRunningLeft");
  const runningRight = document.getElementById("readerRunningRight");
  const contentLeft = document.getElementById("readerContentLeft");
  const contentRight = document.getElementById("readerContentRight");
  const bookTitle = document.getElementById("readerBookTitle");
  const chapterTitleLabel = document.getElementById("readerChapterTitle");
  const progress = document.getElementById("readerProgress");
  const tree = document.getElementById("readerTree");
  const sidebar = document.getElementById("readerSidebar");
  const themePanel = document.getElementById("themePanel");
  const toast = document.getElementById("readerToast");

  let chapterIndex = Math.max(0, chapters.findIndex(item => item.chapter.id === params.get("chapter")));
  let pageIndex = 0;
  let pages = [""];
  let toastTimer = null;
  let resizeTimer = null;
  let turnTimer = null;
  let renderedPage = -1;

  bookTitle.textContent = book.title;
  document.getElementById("readerContentsTitle").textContent = book.title;
  document.getElementById("backToEditor").href =
    `editor.html?id=${encodeURIComponent(book.id)}&chapter=${encodeURIComponent(chapters[chapterIndex]?.chapter.id || "")}`;

  function partIdentity(item) {
    const ancestors = item.parents || [];
    const part = [...ancestors].reverse().find(node => node.type === "part");
    if (part) return { id: part.id, title: part.title, type: "part" };
    const volume = [...ancestors].reverse().find(node => node.type === "volume");
    if (volume) return { id: volume.id, title: volume.title, type: "volume" };
    return { id: "root", title: "Книга", type: "root" };
  }

  function buildPartGroups() {
    const groups = [];
    for (const item of chapters) {
      const part = partIdentity(item);
      let group = groups[groups.length - 1];
      if (!group || group.id !== part.id) {
        group = { ...part, chapters: [] };
        groups.push(group);
      }
      group.chapters.push(item);
    }
    return groups;
  }

  function getPartIndex() {
    const current = chapters[chapterIndex];
    if (!current) return -1;
    const id = partIdentity(current).id;
    return buildPartGroups().findIndex(group => group.id === id);
  }

  function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2400);
  }

  function isNarrow() {
    return window.matchMedia("(max-width: 760px)").matches;
  }

  function pagesPerSpread() {
    return isNarrow() ? 1 : 2;
  }

  function sanitizeHtml(html) {
    const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
    doc.querySelectorAll("script,iframe,object,embed,form,video,audio").forEach(node => node.remove());
    doc.querySelectorAll("*").forEach(node => {
      [...node.attributes].forEach(attr => {
        const name = attr.name.toLowerCase();
        const value = attr.value.trim();
        if (name.startsWith("on")) node.removeAttribute(attr.name);
        if ((name === "href" || name === "src") && /^javascript:/i.test(value)) node.removeAttribute(attr.name);
      });
    });
    return doc.body;
  }

  function buildPages(html) {
    const source = sanitizeHtml(html);
    const blocks = [...source.childNodes].filter(node =>
      node.nodeType === Node.ELEMENT_NODE || (node.nodeType === Node.TEXT_NODE && node.textContent.trim())
    ).map(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const p = document.createElement("p");
        p.textContent = node.textContent.trim();
        return p;
      }
      return node;
    });

    const width = Math.max(220, contentLeft.clientWidth || 390);
    const height = Math.max(180, contentLeft.clientHeight || 420);
    const probe = document.createElement("div");
    probe.className = "reader-page-content reader-measure";
    probe.style.width = width + "px";
    probe.style.height = height + "px";
    document.body.appendChild(probe);

    const output = [];
    let current = [];
    function finish() {
      if (current.length) output.push(current.join(""));
      current = [];
      probe.innerHTML = "";
    }
    function fits(node) {
      probe.appendChild(node);
      const result = probe.scrollHeight <= probe.clientHeight + 2;
      probe.removeChild(node);
      return result;
    }
    function keep(node) {
      probe.appendChild(node);
      current.push(node.outerHTML || escapeText(node.textContent));
    }
    function escapeText(text) {
      return String(text || "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    }
    function splitOversized(node) {
      const text = String(node.textContent || "").trim();
      const words = text.split(/\s+/).filter(Boolean);
      if (!words.length) { keep(node.cloneNode(true)); return; }
      let segment = "";
      for (const word of words) {
        const candidate = segment ? segment + " " + word : word;
        const probeNode = node.cloneNode(false);
        probeNode.textContent = candidate;
        if (fits(probeNode) || !segment) {
          if (!fits(probeNode) && !segment) {
            probe.appendChild(probeNode);
            current.push(probeNode.outerHTML);
            finish();
            segment = "";
          } else {
            segment = candidate;
          }
        } else {
          const part = node.cloneNode(false);
          part.textContent = segment;
          keep(part);
          finish();
          segment = word;
        }
      }
      if (segment) {
        const last = node.cloneNode(false);
        last.textContent = segment;
        if (!fits(last) && current.length) finish();
        keep(last);
      }
    }

    for (const sourceNode of blocks) {
      const node = sourceNode.cloneNode(true);
      if (fits(node)) {
        keep(node);
        continue;
      }
      if (current.length) finish();
      if (fits(node)) {
        keep(node);
        continue;
      }
      splitOversized(sourceNode.cloneNode(true));
    }
    finish();
    probe.remove();
    return output.length ? output : ["<p></p>"];
  }

  function animateTurn(direction) {
    clearTimeout(turnTimer);
    spread.classList.remove("turn-next", "turn-prev");
    void spread.offsetWidth;
    spread.classList.add(direction === "prev" ? "turn-prev" : "turn-next");
    turnTimer = setTimeout(() => spread.classList.remove("turn-next", "turn-prev"), 480);
  }

  function renderSpread(direction = null) {
    const item = chapters[chapterIndex];
    if (!item) return;
    if (direction) animateTurn(direction);

    const total = pages.length;
    const rightIndex = pageIndex + 1;
    const atStart = pageIndex === 0;
    const part = partIdentity(item);
    title.textContent = item.chapter.title;
    kicker.textContent = (item.parents || []).filter(node => node.type !== "chapter").map(node => node.title).join(" · ");
    chapterTitleLabel.textContent = item.chapter.title;
    runningLeft.textContent = item.chapter.title;
    runningRight.textContent = item.chapter.title;

    if (atStart) {
      title.hidden = false;
      runningLeft.hidden = true;
      kicker.hidden = false;
    } else {
      title.hidden = true;
      runningLeft.hidden = false;
      kicker.hidden = true;
    }
    kickerRight.textContent = part.title;
    contentLeft.innerHTML = pages[pageIndex] || "";
    contentRight.innerHTML = pages[rightIndex] || "";
    sheetRight.hidden = isNarrow() || rightIndex >= total;
    document.getElementById("readerLeftNumber").textContent = String(pageIndex + 1);
    document.getElementById("readerRightNumber").textContent = rightIndex < total ? String(rightIndex + 1) : "";
    progress.textContent = isNarrow()
      ? `Стр. ${pageIndex + 1}/${total}`
      : `Стр. ${pageIndex + 1}–${Math.min(pageIndex + 2,total)}/${total}`;
    document.getElementById("prevButton").disabled = pageIndex === 0 && !hasPreviousChapterInPart();
    document.getElementById("nextButton").disabled = pageIndex + pagesPerSpread() >= total && !hasNextChapterInPart();
    document.getElementById("prevPartButton").disabled = getPartIndex() <= 0;
    document.getElementById("nextPartButton").disabled = getPartIndex() < 0 || getPartIndex() >= buildPartGroups().length - 1;
    document.getElementById("backToEditor").href =
      `editor.html?id=${encodeURIComponent(book.id)}&chapter=${encodeURIComponent(item.chapter.id)}`;
    renderTree();
    renderedPage = pageIndex;
  }

  function paginateCurrentChapter() {
    const current = chapters[chapterIndex];
    pages = buildPages(current?.chapter.content || "<p></p>");
    pageIndex = Math.max(0, Math.min(pageIndex, Math.max(0, pages.length - 1)));
    if (!isNarrow()) pageIndex -= pageIndex % 2;
    renderSpread();
  }

  function goToChapter(index, direction = "next", lastPage = false) {
    if (index < 0 || index >= chapters.length) return false;
    chapterIndex = index;
    pageIndex = 0;
    const current = chapters[chapterIndex];
    pages = buildPages(current?.chapter.content || "<p></p>");
    if (lastPage) {
      pageIndex = Math.max(0, pages.length - pagesPerSpread());
      if (!isNarrow()) pageIndex -= pageIndex % 2;
    }
    renderSpread(direction);
    return true;
  }

  function hasNextChapterInPart() {
    if (chapterIndex >= chapters.length - 1) return false;
    return partIdentity(chapters[chapterIndex]).id === partIdentity(chapters[chapterIndex + 1]).id;
  }
  function hasPreviousChapterInPart() {
    if (chapterIndex <= 0) return false;
    return partIdentity(chapters[chapterIndex]).id === partIdentity(chapters[chapterIndex - 1]).id;
  }

  function flip(direction) {
    const step = pagesPerSpread();
    if (direction === "next") {
      if (pageIndex + step < pages.length) {
        pageIndex += step;
        renderSpread("next");
      } else if (hasNextChapterInPart()) {
        goToChapter(chapterIndex + 1, "next");
      } else {
        showToast("Конец части. W — следующая часть; S — предыдущая.");
      }
      return;
    }

    if (pageIndex > 0) {
      pageIndex = Math.max(0, pageIndex - step);
      renderSpread("prev");
    } else if (hasPreviousChapterInPart()) {
      goToChapter(chapterIndex - 1, "prev", true);
    } else {
      showToast("Начало части. Нажми S, чтобы вернуться к предыдущей части.");
    }
  }

  function navigatePart(direction) {
    const groups = buildPartGroups();
    const currentPartIndex = getPartIndex();
    const targetIndex = currentPartIndex + (direction === "next" ? 1 : -1);
    if (targetIndex < 0 || targetIndex >= groups.length) {
      showToast(direction === "next" ? "Это последняя часть книги." : "Это первая часть книги.");
      return;
    }
    const target = groups[targetIndex];
    const targetChapter = direction === "next" ? target.chapters[0] : target.chapters[target.chapters.length - 1];
    const globalIndex = chapters.findIndex(item => item.chapter.id === targetChapter.chapter.id);
    goToChapter(globalIndex, direction, direction === "prev");
    showToast(`${direction === "next" ? "Следующая" : "Предыдущая"} часть: ${target.title}`);
  }

  function renderTree() {
    tree.innerHTML = "";
    const current = chapters[chapterIndex]?.chapter.id;
    const renderNodes = (nodes, parent, depth = 0) => {
      (nodes || []).forEach(node => {
        const wrapper = document.createElement("div");
        wrapper.className = "tree-node";
        const line = document.createElement("button");
        line.type = "button";
        line.className = `tree-line ${node.id === current ? "active" : ""}`;
        line.style.paddingLeft = `${8 + depth * 12}px`;
        line.innerHTML = `<span class="tree-toggle">${node.children?.length ? "▾" : "·"}</span><span class="tree-label">${escapeHtml(node.title)}</span>`;
        line.addEventListener("click", () => {
          if (node.type !== "chapter") return;
          const index = chapters.findIndex(item => item.chapter.id === node.id);
          if (index >= 0) goToChapter(index, index >= chapterIndex ? "next" : "prev");
          sidebar.classList.remove("open");
        });
        wrapper.appendChild(line);
        if (node.children?.length) {
          const nested = document.createElement("div");
          nested.className = "tree-children";
          renderNodes(node.children, nested, depth + 1);
          wrapper.appendChild(nested);
        }
        parent.appendChild(wrapper);
      });
    };
    renderNodes(book.structure, tree);
  }

  document.getElementById("prevButton").addEventListener("click", () => flip("prev"));
  document.getElementById("nextButton").addEventListener("click", () => flip("next"));
  document.getElementById("prevPartButton").addEventListener("click", () => navigatePart("prev"));
  document.getElementById("nextPartButton").addEventListener("click", () => navigatePart("next"));
  document.getElementById("menuButton").addEventListener("click", () => sidebar.classList.add("open"));
  document.getElementById("closeSidebar").addEventListener("click", () => sidebar.classList.remove("open"));
  document.getElementById("themeButton").addEventListener("click", () => themePanel.classList.toggle("hidden"));
  themePanel.addEventListener("click", event => {
    const theme = event.target.dataset.theme;
    if (!theme) return;
    page.classList.remove("theme-paper", "theme-night", "theme-warm");
    if (theme !== "paper") page.classList.add(`theme-${theme}`);
    localStorage.setItem("bookCreator.readerTheme", theme);
    themePanel.classList.add("hidden");
  });

  const savedTheme = localStorage.getItem("bookCreator.readerTheme") || "paper";
  if (savedTheme !== "paper") page.classList.add(`theme-${savedTheme}`);

  document.addEventListener("keydown", event => {
    if (event.target?.matches?.("input,textarea,[contenteditable='true']")) return;
    const key = event.key.toLowerCase();
    if (key === "d" || key === "arrowright" || key === " ") { event.preventDefault(); flip("next"); }
    if (key === "a" || key === "arrowleft" || key === "backspace") { event.preventDefault(); flip("prev"); }
    if (key === "w") { event.preventDefault(); navigatePart("next"); }
    if (key === "s") { event.preventDefault(); navigatePart("prev"); }
    if (key === "escape") { sidebar.classList.remove("open"); themePanel.classList.add("hidden"); }
  });

  document.querySelectorAll(".reader-close-link").forEach(link => {
    link.addEventListener("click", event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      page.classList.add("reader-closing");
      setTimeout(() => { location.href = link.href; }, 300);
    });
  });

  function resizePagination() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => paginateCurrentChapter(), 160);
  }
  window.addEventListener("resize", resizePagination);
  window.addEventListener("beforeprint", () => { spread.classList.remove("turn-next","turn-prev"); });

  paginateCurrentChapter();
});
