document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("booksGrid");
  const emptyState = document.getElementById("emptyState");
  const count = document.getElementById("bookCount");

  function render() {
    const books = getBooks();
    grid.innerHTML = "";
    count.textContent = `${books.length} ${books.length === 1 ? "книга" : "книг"}`;
    emptyState.classList.toggle("hidden", books.length > 0);
    books.forEach((book,index)=>{
      const chapters=flattenChapters(book).length;
      const card=document.createElement("article"); card.className="book-card"; card.style.animationDelay=`${index*50}ms`;
      card.innerHTML=`<div class="book-card-main"><div class="book-cover"><div class="book-cover-title">${escapeHtml(book.title)}</div></div><div class="book-meta">${escapeHtml(book.author||"Без автора")} · ${chapters} глав</div></div><div class="book-card-bottom"><a class="book-open" href="editor.html?id=${encodeURIComponent(book.id)}">Открыть</a><button type="button" class="edit-cover" data-id="${book.id}">Обложка</button><button type="button" class="delete-book" data-id="${book.id}">Удалить</button></div>`;
      const cover = card.querySelector(".book-cover");
      if (book.coverDataUrl && /^data:image\/(?:jpeg|png|webp);base64,/.test(book.coverDataUrl)) {
        cover.style.backgroundImage = "linear-gradient(180deg, transparent 15%, rgba(0,0,0,.8)), url(" + book.coverDataUrl + ")";
        cover.style.backgroundPosition = "center";
        cover.style.backgroundSize = "cover";
        const title = cover.querySelector(".book-cover-title");
        if (title) { title.style.color = "#fff"; title.style.textShadow = "0 2px 12px #000"; }
      }
      grid.appendChild(card);
    });
  }

  const openCreate=()=>location.href="create.html";
  document.getElementById("newBookButton").addEventListener("click",openCreate);
  document.getElementById("heroCreateButton").addEventListener("click",openCreate);
  document.getElementById("emptyCreateButton").addEventListener("click",openCreate);
  document.getElementById("importButton").addEventListener("click",()=>document.getElementById("fileInput").click());
  grid.addEventListener("click",event=>{
    const coverButton=event.target.closest(".edit-cover");
    if (coverButton) {
      if (typeof window.openBookCoverEditor === "function") window.openBookCoverEditor(coverButton.dataset.id, render);
      else alert("Редактор обложки ещё загружается. Обнови страницу.");
      return;
    }
    const button=event.target.closest(".delete-book"); if(!button)return;
    if(!confirm("Удалить эту книгу? Это действие нельзя отменить."))return;
    deleteBook(button.dataset.id); render();
  });
  document.addEventListener("bookcoverchange", render);
  render();
});
