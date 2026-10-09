document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("booksGrid");
  const emptyState = document.getElementById("emptyState");
  const count = document.getElementById("bookCount");

  function render() {
    const books = getBooks();
    grid.innerHTML = "";
    count.textContent = `${books.length} ${books.length === 1 ? "книга" : books.length < 5 ? "книги" : "книг"}`;
    emptyState.classList.toggle("hidden", books.length > 0);

    if (!books.length) return;

    const perShelf = window.matchMedia("(max-width: 720px)").matches ? 2 : 5;
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
            <a class="book-cover book-open-cover" aria-label="Открыть ${escapeHtml(book.title)}" href="editor.html?id=${encodeURIComponent(book.id)}">
              <span class="book-cover-title">${escapeHtml(book.title)}</span>
              <span class="book-cover-author">${escapeHtml(book.author || "Без автора")}</span>
            </a>
            <div class="book-meta">${escapeHtml(book.author || "Без автора")}<br><span>${chapters} глав</span></div>
          </div>
          <div class="book-card-bottom">
            <a class="book-open" href="editor.html?id=${encodeURIComponent(book.id)}">Открыть</a>
            <button type="button" class="edit-cover" data-id="${escapeHtml(book.id)}">Обложка</button>
            <button type="button" class="delete-book" data-id="${escapeHtml(book.id)}" aria-label="Удалить книгу">×</button>
          </div>`;
        const cover = card.querySelector(".book-cover");
        if (book.coverDataUrl && /^data:image\/(?:jpeg|png|webp);base64,/.test(book.coverDataUrl)) {
          cover.style.backgroundImage = "linear-gradient(180deg, rgba(0,0,0,.03) 15%, rgba(0,0,0,.72)), url(" + book.coverDataUrl + ")";
          cover.style.backgroundSize = "cover";
          cover.style.backgroundPosition = "center";
          card.classList.add("has-custom-cover");
        }
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
  document.getElementById("heroCreateButton").addEventListener("click", openCreate);
  document.getElementById("emptyCreateButton").addEventListener("click", openCreate);
  document.getElementById("importButton").addEventListener("click", () => document.getElementById("fileInput").click());

  grid.addEventListener("click", event => {
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

  document.addEventListener("bookcoverchange", render);
  window.addEventListener("resize", () => {
    clearTimeout(window.__bookshelfResizeTimer);
    window.__bookshelfResizeTimer = setTimeout(render, 180);
  });
  render();
});