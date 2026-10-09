const BOOKS_KEY = "bookCreator.books.v1";
const CURRENT_BOOK_KEY = "bookCreator.currentBook.v1";

function getBooks() {
  try {
    const value = JSON.parse(localStorage.getItem(BOOKS_KEY));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveBooks(books) {
  try {
    localStorage.setItem(BOOKS_KEY, JSON.stringify(books));
  } catch (error) {
    console.error(error);
    throw new Error("Не удалось сохранить книгу. Возможно, в браузере закончилось место.");
  }
}

function getBook(bookId) {
  if (!bookId) return null;
  return getBooks().find(book => book.id === bookId) || null;
}

function saveBook(book) {
  if (!book || typeof book !== "object") {
    throw new Error("Нельзя сохранить пустую книгу.");
  }

  const books = getBooks();
  const index = books.findIndex(item => item.id === book.id);
  book.updatedAt = new Date().toISOString();

  if (index >= 0) books[index] = book;
  else books.unshift(book);

  saveBooks(books);

  try {
    localStorage.setItem(CURRENT_BOOK_KEY, book.id);
  } catch (error) {
    console.warn("Не удалось записать текущую книгу.", error);
  }

  return book;
}

function deleteBook(bookId) {
  saveBooks(getBooks().filter(book => book.id !== bookId));
  if (getCurrentBook()?.id === bookId) {
    try {
      localStorage.removeItem(CURRENT_BOOK_KEY);
    } catch {
      // ignore
    }
  }
}

function setCurrentBook(bookId) {
  try {
    localStorage.setItem(CURRENT_BOOK_KEY, bookId);
  } catch {
    // ignore
  }
}

function getCurrentBook() {
  try {
    const id = localStorage.getItem(CURRENT_BOOK_KEY);
    return id ? getBook(id) : null;
  } catch {
    return null;
  }
}

function createId(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function makeChapter(title = "Глава 1") {
  return {
    id: createId("chapter"),
    type: "chapter",
    title: String(title || "Глава 1"),
    content: "<p></p>",
    children: []
  };
}

function makePart(title = "Часть 1", chapterCount = 1) {
  const safeCount = Math.max(0, Math.floor(Number(chapterCount) || 0));
  const children = Array.from(
    { length: safeCount },
    (_, index) => makeChapter(`Глава ${index + 1}`)
  );
  return {
    id: createId("part"),
    type: "part",
    title: String(title || "Часть 1"),
    content: "",
    children
  };
}

function makeVolume(title = "Том 1", partCount = 1, chapterCount = 1) {
  const safeParts = Math.max(0, Math.floor(Number(partCount) || 0));
  const children = Array.from(
    { length: safeParts },
    (_, index) => makePart(`Часть ${index + 1}`, chapterCount)
  );
  return {
    id: createId("volume"),
    type: "volume",
    title: String(title || "Том 1"),
    content: "",
    children
  };
}

function flattenChapters(book) {
  const result = [];
  const walk = (nodes, parents = []) => {
    if (!Array.isArray(nodes)) return;
    nodes.forEach(node => {
      if (!node || typeof node !== "object") return;
      const nextParents = [...parents, node];
      if (node.type === "chapter") result.push({ chapter: node, parents });
      if (Array.isArray(node.children) && node.children.length) {
        walk(node.children, nextParents);
      }
    });
  };

  walk(book?.structure || []);
  return result;
}

function findNode(book, nodeId, nodes = book?.structure || []) {
  if (!Array.isArray(nodes)) return null;

  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    if (node.id === nodeId) return node;

    if (Array.isArray(node.children) && node.children.length) {
      const found = findNode(book, nodeId, node.children);
      if (found) return found;
    }
  }

  return null;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}
