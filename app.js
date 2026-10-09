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
      card.innerHTML=`<div><div class="book-cover"><div class="book-cover-title">${escapeHtml(book.title)}</div></div><div class="book-meta">${escapeHtml(book.author||"Без автора")} · ${chapters} глав</div></div><div class="book-card-bottom"><a class="book-open" href="editor.html?id=${encodeURIComponent(book.id)}">Открыть →</a><button class="delete-book" data-id="${book.id}">Удалить</button></div>`;
      grid.appendChild(card);
    });
  }

  const openCreate=()=>location.href="create.html";
  document.getElementById("newBookButton").addEventListener("click",openCreate);
  document.getElementById("heroCreateButton").addEventListener("click",openCreate);
  document.getElementById("emptyCreateButton").addEventListener("click",openCreate);
  document.getElementById("importButton").addEventListener("click",()=>document.getElementById("fileInput").click());
  grid.addEventListener("click",event=>{
    const button=event.target.closest(".delete-book"); if(!button)return;
    if(!confirm("Удалить эту книгу? Это действие нельзя отменить."))return;
    deleteBook(button.dataset.id); render();
  });
  render();
});
