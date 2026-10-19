document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("booksGrid");
  const emptyState = document.getElementById("emptyState");
  const count = document.getElementById("bookCount");
  const search = document.getElementById("librarySearch");
  const sort = document.getElementById("librarySort");
  const noResults = document.getElementById("libraryNoResults");

  function coverTexture(book) {
    const seed = String(book.id || book.title || "book");
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    return hash % 8;
  }

  function render() {
    const allBooks = getBooks();
    const query = (search?.value || "").trim().toLocaleLowerCase("ru");
    const books = allBooks.filter(book => [book.title, book.author].some(value => String(value || "").toLocaleLowerCase("ru").includes(query)));
    const mode = sort?.value || "recent";
    if (mode === "title") books.sort((a,b) => String(a.title || "").localeCompare(String(b.title || ""), "ru"));
    else if (mode === "oldest") books.sort((a,b) => (Date.parse(a.createdAt || 0) || 0) - (Date.parse(b.createdAt || 0) || 0));
    else books.sort((a,b) => (Date.parse(b.updatedAt || b.createdAt || 0) || 0) - (Date.parse(a.updatedAt || a.createdAt || 0) || 0));
    grid.innerHTML = "";
    count.textContent = `${allBooks.length} ${allBooks.length === 1 ? "книга" : allBooks.length < 5 ? "книги" : "книг"}`;
    emptyState.classList.toggle("hidden", allBooks.length > 0);
    if (noResults) noResults.hidden = !allBooks.length || !!books.length;
    if (!books.length) return;
    const perShelf = window.matchMedia("(max-width: 720px)").matches ? 2 : window.matchMedia("(max-width: 1000px)").matches ? 3 : 5;
    for (let start = 0; start < books.length; start += perShelf) {
      const shelf = document.createElement("section");
      shelf.className = "bookshelf-row";
      shelf.setAttribute("aria-label", `Полка ${Math.floor(start / perShelf) + 1}`);
      const booksWrap = document.createElement("div");
      booksWrap.className = "bookshelf-books";

      books.slice(start, start + perShelf).forEach((book, offset) => {
        const index = start + offset;
        const chapters = flattenChapters(book).length;
        const card = document.createElement("article");
        card.className = "book-card";
        card.style.animationDelay = `${offset * 65}ms`;
        card.innerHTML = `
          <div class="book-card-main">
            <a class="book-cover book-open-cover texture-${coverTexture(book)}" aria-label="Читать ${escapeHtml(book.title)}" href="reader.html?id=${encodeURIComponent(book.id)}">
              <span class="book-cover-title">${escapeHtml(book.title)}</span>
              <span class="book-cover-author">${escapeHtml(book.author || "Без автора")}</span>
            </a>
            <div class="book-meta">${escapeHtml(book.author || "Без автора")}<br><span>${chapters} глав</span></div>
          </div>
          <div class="book-card-bottom">
            <a class="book-open" href="editor.html?id=${encodeURIComponent(book.id)}">Открыть</a>
            <button type="button" class="edit-cover" data-id="${escapeHtml(book.id)}" title="Загрузить фото обложки">Фото</button>
            <button type="button" class="edit-cover-text" data-id="${escapeHtml(book.id)}" title="Расположение надписей на обложке">Текст</button>
            <button type="button" class="delete-book" data-id="${escapeHtml(book.id)}" aria-label="Удалить книгу">×</button>
          </div>`;
        const cover = card.querySelector(".book-cover");
        if (book.coverDataUrl && /^data:image\/(?:jpeg|png|webp);base64,/.test(book.coverDataUrl)) {
          cover.style.backgroundImage = "linear-gradient(180deg, rgba(0,0,0,.03) 15%, rgba(0,0,0,.72)), url(" + book.coverDataUrl + ")";
          cover.style.backgroundSize = "cover";
          cover.style.backgroundPosition = "center";
          cover.classList.add("cover-custom");
          card.classList.add("has-custom-cover");
        }
        window.DiamondCoverDesign?.apply(cover,book.coverDesign);
        booksWrap.appendChild(card);
      });

      const board = document.createElement("div");
      board.className = "shelf-board";
      board.setAttribute("aria-hidden", "true");
      shelf.append(booksWrap, board);
      grid.appendChild(shelf);
    }
  }

  const openCreate = () => location.href = "create.html";
  document.getElementById("newBookButton").addEventListener("click", openCreate);
  document.getElementById("heroCreateButton")?.addEventListener("click", openCreate);
  document.getElementById("emptyCreateButton").addEventListener("click", openCreate);
  document.getElementById("importButton").addEventListener("click", () => document.getElementById("fileInput").click());

  grid.addEventListener("click", event => {
    const openLink = event.target.closest(".book-open, .book-open-cover");
    if (openLink) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const card = openLink.closest(".book-card");
      if (card) card.classList.add("book-opening");
      window.setTimeout(() => { location.href = openLink.href; }, 390);
      return;
    }
    const designButton = event.target.closest(".edit-cover-text");
    if (designButton) {
      window.DiamondCoverDesign?.openBook(designButton.dataset.id,render);
      return;
    }
    const coverButton = event.target.closest(".edit-cover");
    if (coverButton) {
      if (typeof window.openBookCoverEditor === "function") window.openBookCoverEditor(coverButton.dataset.id, render);
      else alert("Редактор обложки не загрузился. Обнови страницу.");
      return;
    }
    const deleteButton = event.target.closest(".delete-book");
    if (!deleteButton) return;
    const book = getBook(deleteButton.dataset.id);
    if (!book) return;
    if (!confirm(`Точно удалить книгу «${book.title}»? Это удалит её локальную копию в этом браузере.`)) return;
    deleteBook(book.id);
    render();
  });

  search?.addEventListener("input",render);
  sort?.addEventListener("change",render);
  document.addEventListener("keydown",event => {
    const typing = event.target.closest?.("input,textarea,select,[contenteditable]");
    if (!typing && event.key === "/" && search) {
      event.preventDefault();search.focus();
    } else if (event.key === "Escape" && document.activeElement === search) {
      search.value = "";search.blur();render();
    }
  });
  document.addEventListener("bookcoverchange", render);
  window.addEventListener("resize", () => {
    clearTimeout(window.__bookshelfResizeTimer);
    window.__bookshelfResizeTimer = setTimeout(render, 180);
  });
  render();
});