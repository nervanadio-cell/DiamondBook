/* Book Creator — универсальный импорт/экспорт форматов */

const BOOK_FORMATS = [
  { id:"json", ext:"json", name:"Book Creator JSON", group:"Проект", import:true, export:true },
  { id:"txt", ext:"txt", name:"Plain Text", group:"Текст", import:true, export:true },
  { id:"gutenberg", ext:"txt", name:"Gutenberg TXT", group:"Текст", import:true, export:true },
  { id:"html", ext:"html", name:"HTML", group:"Веб", import:true, export:true },
  { id:"xhtml", ext:"xhtml", name:"XHTML", group:"Веб", import:true, export:true },
  { id:"mhtml", ext:"mhtml", name:"MHTML", group:"Веб", import:true, export:true },
  { id:"md", ext:"md", name:"Markdown", group:"Разметка", import:true, export:true },
  { id:"markdown", ext:"markdown", name:"Markdown .markdown", group:"Разметка", import:true, export:true },
  { id:"gfm", ext:"md", name:"GitHub Flavored Markdown", group:"Разметка", import:true, export:true },
  { id:"commonmark", ext:"md", name:"CommonMark", group:"Разметка", import:true, export:true },
  { id:"adoc", ext:"adoc", name:"AsciiDoc", group:"Разметка", import:true, export:true },
  { id:"asciidoc", ext:"asciidoc", name:"AsciiDoc .asciidoc", group:"Разметка", import:true, export:true },
  { id:"org", ext:"org", name:"Org Mode", group:"Разметка", import:true, export:true },
  { id:"rst", ext:"rst", name:"reStructuredText", group:"Разметка", import:true, export:true },
  { id:"djot", ext:"djot", name:"Djot", group:"Разметка", import:true, export:true },
  { id:"bbcode", ext:"bbcode", name:"BBCode", group:"Разметка", import:true, export:true },
  { id:"textile", ext:"textile", name:"Textile", group:"Разметка", import:true, export:true },
  { id:"mediawiki", ext:"wiki", name:"MediaWiki", group:"Разметка", import:true, export:true },
  { id:"fountain", ext:"fountain", name:"Fountain", group:"Сценарии", import:true, export:true },
  { id:"rtf", ext:"rtf", name:"Rich Text Format", group:"Документы", import:true, export:true },
  { id:"fb2", ext:"fb2", name:"FictionBook 2", group:"Книги", import:true, export:true },
  { id:"epub", ext:"epub", name:"EPUB 3", group:"Книги", import:true, export:true },
  { id:"pdf", ext:"pdf", name:"PDF", group:"Документы", import:true, export:true },
  { id:"docx", ext:"docx", name:"Microsoft Word DOCX", group:"Документы", import:true, export:true },
  { id:"odt", ext:"odt", name:"OpenDocument Text", group:"Документы", import:true, export:true },
  { id:"xml", ext:"xml", name:"Book XML", group:"Данные", import:true, export:true },
  { id:"tei", ext:"xml", name:"TEI XML", group:"Данные", import:true, export:true },
  { id:"jsonld", ext:"jsonld", name:"JSON-LD", group:"Данные", import:true, export:true },
  { id:"yaml", ext:"yaml", name:"YAML", group:"Данные", import:true, export:true },
  { id:"yml", ext:"yml", name:"YAML .yml", group:"Данные", import:true, export:true },
  { id:"csv", ext:"csv", name:"CSV", group:"Данные", import:true, export:true },
  { id:"tsv", ext:"tsv", name:"TSV", group:"Данные", import:true, export:true },
  { id:"opml", ext:"opml", name:"OPML", group:"Структура", import:true, export:true },
  { id:"srt", ext:"srt", name:"SubRip SRT", group:"Субтитры", import:true, export:true },
  { id:"vtt", ext:"vtt", name:"WebVTT", group:"Субтитры", import:true, export:true },
  { id:"htmlbook", ext:"html", name:"HTML Book", group:"Веб", import:true, export:true }
];

function formatById(id) {
  return BOOK_FORMATS.find(format => format.id === id) || null;
}

function formatByExtension(ext) {
  const value = String(ext || "").toLowerCase().replace(/^\./, "");
  const aliases = {
    htm:"html",
    md:"md",
    markdown:"markdown",
    yml:"yml",
    asciidoc:"asciidoc",
    adoc:"adoc",
    wiki:"mediawiki"
  };
  const normalized = aliases[value] || value;
  return BOOK_FORMATS.find(format => format.ext === normalized || format.id === normalized) || null;
}

function sanitizeFilename(name) {
  return String(name || "book")
    .replace(/[\\/:*?"<>|]/g, "_")
    .trim() || "book";
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function textBlob(text, mime = "text/plain;charset=utf-8") {
  return new Blob(["\uFEFF", String(text)], { type: mime });
}

function stripHtml(html) {
  const source = String(html || "");
  if (typeof document === "undefined") {
    return source
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>|<\/div>|<\/li>|<\/h[1-6]>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">");
  }

  const div = document.createElement("div");
  div.innerHTML = source;
  return (div.innerText || div.textContent || "").replace(/\u00a0/g, " ").trim();
}

function sanitizeImportedHtml(html) {
  if (typeof DOMParser === "undefined") return String(html || "");

  const parser = new DOMParser();
  const doc = parser.parseFromString(String(html || ""), "text/html");

  doc.querySelectorAll("script,style,iframe,object,embed,form,base,meta,link").forEach(node => node.remove());

  doc.querySelectorAll("*").forEach(node => {
    [...node.attributes].forEach(attribute => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();

      if (name.startsWith("on") || name === "srcdoc") {
        node.removeAttribute(attribute.name);
      }

      if ((name === "href" || name === "src") && /^javascript:/i.test(value)) {
        node.removeAttribute(attribute.name);
      }
    });
  });

  return doc.body ? doc.body.innerHTML : "";
}

function toXhtmlFragment(html) {
  return String(html || "")
    .replace(/<br(\s*)>/gi, "<br$1/>")
    .replace(/<hr(\s*)>/gi, "<hr$1/>")
    .replace(/<img(\s[^>]*?)>/gi, "<img$1/>");
}

function xmlEscape(value = "") {
  return String(value).replace(/[<>&'"]/g, char => ({
    "<":"&lt;",
    ">":"&gt;",
    "&":"&amp;",
    "'":"&apos;",
    '"':"&quot;"
  }[char]));
}

function plain(book) {
  return bookToPlainText(book);
}

function bookToPlainText(book) {
  const out = [String(book.title || "Без названия")];

  if (book.author) out.push(`Автор: ${book.author}`);
  out.push("");

  chaptersWithPath(book).forEach((item, index) => {
    if (item.path) out.push(item.path);
    out.push(item.chapter.title);
    out.push(stripHtml(item.chapter.content));
    if (index < chaptersWithPath(book).length - 1) out.push("");
  });

  return out.join("\n").replace(/\n{4,}/g, "\n\n\n").trim() + "\n";
}

function chaptersWithPath(book) {
  return flattenChapters(book).map(item => ({
    ...item,
    path: item.parents.map(parent => parent.title).join(" / ")
  }));
}

function chapterHtml(chapter) {
  return sanitizeImportedHtml(chapter?.content || "<p></p>");
}

function bookToHtml(book) {
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(book.title || "Книга")}</title>
<style>
body{max-width:820px;margin:50px auto;padding:0 24px;font:19px/1.8 Georgia,serif;color:#222}
h1{font-size:42px;margin-bottom:8px}
h2{font-size:30px;margin-top:60px}
small{color:#666}
.chapter{break-after:page;margin-bottom:90px}
</style>
</head>
<body>
<h1>${escapeHtml(book.title || "Книга")}</h1>
${book.author ? `<p><small>${escapeHtml(book.author)}</small></p>` : ""}
${chaptersWithPath(book).map(item => `
<section class="chapter">
<h2>${escapeHtml(item.chapter.title)}</h2>
${chapterHtml(item.chapter)}
</section>`).join("")}
</body>
</html>`;
}

function bookToMarkdown(book) {
  const out = [`# ${book.title || "Без названия"}`];
  if (book.author) out.push(`**Автор:** ${book.author}`);
  out.push("");

  const walk = (nodes, depth = 2) => {
    (nodes || []).forEach(node => {
      if (node.type !== "chapter") {
        out.push(`${"#".repeat(Math.min(depth, 6))} ${node.title}`, "");
      }
      if (node.type === "chapter") {
        out.push(`## ${node.title}`, "", stripHtml(node.content), "");
      }
      if (Array.isArray(node.children) && node.children.length) {
        walk(node.children, node.type === "chapter" ? depth : depth + 1);
      }
    });
  };

  walk(book.structure || []);
  return out.join("\n");
}

function bookToAsciiDoc(book) {
  const out = [`= ${book.title || "Без названия"}`];
  if (book.author) out.push(book.author);
  out.push("");

  const walk = (nodes, level = 2) => {
    (nodes || []).forEach(node => {
      if (node.type !== "chapter") out.push(`${"=".repeat(Math.min(level, 6))} ${node.title}`, "");
      if (node.type === "chapter") out.push(`== ${node.title}`, "", stripHtml(node.content), "");
      if (Array.isArray(node.children) && node.children.length) walk(node.children, level + 1);
    });
  };

  walk(book.structure || []);
  return out.join("\n");
}

function bookToOrg(book) {
  const out = [`#+TITLE: ${book.title || "Без названия"}`];
  if (book.author) out.push(`#+AUTHOR: ${book.author}`);
  out.push("");

  const walk = (nodes, level = 1) => {
    (nodes || []).forEach(node => {
      out.push(`${"*".repeat(level)} ${node.title}`);
      if (node.type === "chapter") out.push("", stripHtml(node.content), "");
      if (Array.isArray(node.children) && node.children.length) walk(node.children, level + 1);
    });
  };

  walk(book.structure || []);
  return out.join("\n");
}

function bookToRst(book) {
  const out = [
    book.title || "Без названия",
    "=".repeat(Math.max(3, String(book.title || "Книга").length)),
    ""
  ];

  const walk = (nodes, level = 0) => {
    (nodes || []).forEach(node => {
      const marker = level % 2 === 0 ? "-" : "~";
      out.push(node.title, marker.repeat(Math.max(3, String(node.title || "").length)), "");
      if (node.type === "chapter") out.push(stripHtml(node.content), "");
      if (Array.isArray(node.children) && node.children.length) walk(node.children, level + 1);
    });
  };

  walk(book.structure || []);
  return out.join("\n");
}

function bookToBBCode(book) {
  const out = [`[b][size=200]${book.title || "Без названия"}[/size][/b]`];
  if (book.author) out.push(`[i]${book.author}[/i]`);
  out.push("");

  chaptersWithPath(book).forEach(item => {
    out.push(`[b]${item.chapter.title}[/b]`, stripHtml(item.chapter.content), "");
  });

  return out.join("\n");
}

function bookToTextile(book) {
  const out = [`h1. ${book.title || "Без названия"}`];
  if (book.author) out.push(`_${book.author}_`);
  out.push("");

  chaptersWithPath(book).forEach(item => {
    out.push(`h2. ${item.chapter.title}`, stripHtml(item.chapter.content), "");
  });

  return out.join("\n");
}

function bookToWiki(book) {
  const out = [`= ${book.title || "Без названия"} =`];
  if (book.author) out.push(`''${book.author}''`);
  out.push("");

  chaptersWithPath(book).forEach(item => {
    out.push(`== ${item.chapter.title} ==`, stripHtml(item.chapter.content), "");
  });

  return out.join("\n");
}

function bookToFountain(book) {
  const out = [(book.title || "Без названия").toUpperCase()];
  if (book.author) out.push(book.author);
  out.push("");

  chaptersWithPath(book).forEach(item => {
    out.push(`INT. ${item.chapter.title.toUpperCase()} - DAY`, "", stripHtml(item.chapter.content), "");
  });

  return out.join("\n");
}

function bookToCSV(book, sep = ",") {
  const rows = [["path", "chapter", "text"]];
  chaptersWithPath(book).forEach(item => {
    rows.push([item.path, item.chapter.title, stripHtml(item.chapter.content)]);
  });

  return rows
    .map(row => row.map(value => `"${String(value ?? "").replace(/"/g, '""')}"`).join(sep))
    .join("\n");
}

function parseCSV(text, sep = ",") {
  const rows = [];
  const source = String(text || "").replace(/^\uFEFF/, "");
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];

    if (char === '"') {
      if (quoted && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === sep && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }

    if (char === "\n" && !quoted) {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    if (char !== "\r") cell += char;
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function bookFromCSV(text, sep = ",") {
  const rows = parseCSV(text, sep);
  const data = rows.slice(1);
  const chapters = data
    .filter(row => row.some(Boolean))
    .map((row, index) => ({
      id: createId("chapter"),
      type: "chapter",
      title: row[1] || `Глава ${index + 1}`,
      content: `<p>${escapeHtml(row[2] || "")}</p>`,
      children: []
    }));

  return {
    title: "Импортированная таблица",
    author: "",
    structure: [{
      id: createId("part"),
      type: "part",
      title: "Часть 1",
      content: "",
      children: chapters.length ? chapters : [makeChapter("Глава 1")]
    }]
  };
}

function yamlQuote(value) {
  return JSON.stringify(String(value ?? ""));
}

function bookToYAML(book) {
  const rows = chaptersWithPath(book).map(item => ({
    path: item.path,
    title: item.chapter.title,
    text: stripHtml(item.chapter.content)
  }));

  return [
    `title: ${yamlQuote(book.title || "")}`,
    `author: ${yamlQuote(book.author || "")}`,
    "chapters:",
    ...rows.map(row =>
      `  - path: ${yamlQuote(row.path)}\n    title: ${yamlQuote(row.title)}\n    text: ${yamlQuote(row.text)}`
    )
  ].join("\n");
}

function parseYamlQuoted(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    return JSON.parse(raw);
  } catch {
    return raw.replace(/^['"]|['"]$/g, "");
  }
}

function bookFromYAML(text) {
  const source = String(text || "").replace(/^\uFEFF/, "");
  const title = parseYamlQuoted(source.match(/^title:\s*(.*)$/m)?.[1] || "Импортированная YAML-книга");
  const author = parseYamlQuoted(source.match(/^author:\s*(.*)$/m)?.[1] || "");

  const blocks = [...source.matchAll(
    /^\s*-\s+path:\s*(.*)\n\s+title:\s*(.*)\n\s+text:\s*(.*)$/gm
  )];

  const chapters = blocks.map((match, index) => ({
    id: createId("chapter"),
    type: "chapter",
    title: parseYamlQuoted(match[2]) || `Глава ${index + 1}`,
    content: `<p>${escapeHtml(parseYamlQuoted(match[3]))}</p>`,
    children: []
  }));

  return {
    title,
    author,
    structure: [{
      id: createId("part"),
      type: "part",
      title: "Часть 1",
      content: "",
      children: chapters.length ? chapters : [makeChapter("Глава 1")]
    }]
  };
}

function bookToXML(book) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<book>
<title>${xmlEscape(book.title || "")}</title>
<author>${xmlEscape(book.author || "")}</author>
<chapters>
${chaptersWithPath(book).map(item => `
<chapter>
<title>${xmlEscape(item.chapter.title)}</title>
<path>${xmlEscape(item.path)}</path>
<html>${xmlEscape(item.chapter.content || "")}</html>
</chapter>`).join("")}
</chapters>
</book>`;
}

function bookToTEI(book) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
<teiHeader><fileDesc><titleStmt>
<title>${xmlEscape(book.title || "")}</title>
${book.author ? `<author>${xmlEscape(book.author)}</author>` : ""}
</titleStmt></fileDesc></teiHeader>
<text><body>
${chaptersWithPath(book).map(item => `
<div type="chapter">
<head>${xmlEscape(item.chapter.title)}</head>
<p>${xmlEscape(stripHtml(item.chapter.content))}</p>
</div>`).join("")}
</body></text>
</TEI>`;
}

function bookToJSONLD(book) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Book",
    name: book.title || "",
    ...(book.author ? {
      author: { "@type": "Person", name: book.author }
    } : {}),
    chapter: chaptersWithPath(book).map(item => ({
      "@type": "Chapter",
      name: item.chapter.title,
      text: stripHtml(item.chapter.content)
    }))
  }, null, 2);
}

function bookToOPML(book) {
  const render = nodes => (nodes || []).map(node => `
<outline text="${xmlEscape(node.title)}" type="${xmlEscape(node.type || "chapter")}">
${node.children?.length ? render(node.children) : ""}
</outline>`).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
<head><title>${xmlEscape(book.title || "")}</title></head>
<body>${render(book.structure)}</body>
</opml>`;
}

function formatSrtTime(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},000`;
}

function formatVttTime(totalSeconds) {
  return formatSrtTime(totalSeconds).replace(",", ".");
}

function bookToSRT(book) {
  let cursor = 0;

  return chaptersWithPath(book).map((item, index) => {
    const start = cursor;
    const end = cursor + 30;
    cursor = end;

    return [
      index + 1,
      `${formatSrtTime(start)} --> ${formatSrtTime(end)}`,
      item.chapter.title,
      stripHtml(item.chapter.content),
      ""
    ].join("\n");
  }).join("\n");
}

function bookToVTT(book) {
  let cursor = 0;

  const cues = chaptersWithPath(book).map((item, index) => {
    const start = cursor;
    const end = cursor + 30;
    cursor = end;

    return [
      String(index + 1),
      `${formatVttTime(start)} --> ${formatVttTime(end)}`,
      item.chapter.title,
      stripHtml(item.chapter.content),
      ""
    ].join("\n");
  });

  return `WEBVTT\n\n${cues.join("\n")}`;
}

function bookToMHTML(book) {
  const boundary = "BOOKCREATOR_" + Date.now().toString(36);
  return [
    `From: <bookcreator@local>`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/related; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    `Content-Type: text/html; charset="utf-8"`,
    `Content-Transfer-Encoding: 8bit`,
    "",
    bookToHtml(book),
    "",
    `--${boundary}--`
  ].join("\r\n");
}

function bookToHTMLBook(book) {
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>${escapeHtml(book.title || "Книга")}</title>
<style>
body{max-width:820px;margin:50px auto;padding:0 24px;font:19px/1.8 Georgia,serif}
h1{font-size:42px}article{break-after:page;margin-bottom:90px}
</style>
</head>
<body>
<h1>${escapeHtml(book.title || "Книга")}</h1>
${book.author ? `<p>${escapeHtml(book.author)}</p>` : ""}
${chaptersWithPath(book).map(item => `
<article><h2>${escapeHtml(item.chapter.title)}</h2>${chapterHtml(item.chapter)}</article>`).join("")}
</body>
</html>`;
}

function bookToXHTMLBook(book) {
  const html = bookToHTMLBook(book)
    .replace(
      /^<!doctype html>/i,
      '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>'
    )
    .replace(/<html lang="ru">/i, '<html xmlns="http://www.w3.org/1999/xhtml" lang="ru">')
    .replace(/<meta charset="utf-8">/gi, '<meta charset="utf-8" />')
    .replace(/<meta charset="UTF-8">/gi, '<meta charset="UTF-8" />');

  return html.replace(/(<(?:br|hr|img)(?:\s[^>]*)?)\s*>/gi, "$1 />");
}

function parseMarkdownLike(text) {
  return parseSimpleText(text);
}

function parseSubtitle(text, format) {
  let source = String(text || "").replace(/^\uFEFF/, "").replace(/\r/g, "").trim();

  if (format === "vtt") {
    source = source.replace(/^WEBVTT[^\n]*\n+/i, "");
  }

  const blocks = source.split(/\n{2,}/);
  const chapters = [];

  blocks.forEach((block, index) => {
    const lines = block.split("\n").map(line => line.trim()).filter(Boolean);
    const timeIndex = lines.findIndex(line => /(?:\d{2}:)?\d{2}:\d{2}[,.]\d{3}\s+-->\s+(?:\d{2}:)?\d{2}:\d{2}[,.]\d{3}/.test(line));

    if (timeIndex < 0) return;

    const title = lines.slice(0, timeIndex)
      .filter(line => !/^\d+$/.test(line))[0] || `Глава ${index + 1}`;

    const body = lines.slice(timeIndex + 1).join(" ");
    chapters.push({
      id: createId("chapter"),
      type: "chapter",
      title,
      content: `<p>${escapeHtml(body)}</p>`,
      children: []
    });
  });

  if (!chapters.length) return parseSimpleText(text, format);

  return {
    title: "Импортированные субтитры",
    author: "",
    structure: [{
      id: createId("part"),
      type: "part",
      title: "Часть 1",
      content: "",
      children: chapters
    }]
  };
}

function parseSimpleText(text, format = "txt") {
  let cleaned = String(text || "")
    .replace(/^\uFEFF/, "")
    .replace(/\r/g, "");

  if (format === "gutenberg") {
    cleaned = cleaned
      .replace(/^\*\*\* START OF THE BOOK \*\*\*\s*/i, "")
      .replace(/\s*\*\*\* END OF THE BOOK \*\*\*$/i, "");
  }

  const lines = cleaned.split("\n");
  const title = (lines.find(line => line.trim()) || "Импортированная книга")
    .replace(/^#+\s*/, "")
    .trim();

  const chapters = [];
  let current = null;

  const push = () => {
    if (!current) return;
    const body = current.lines
      .filter(Boolean)
      .join("\n")
      .split(/\n+/)
      .map(line => `<p>${escapeHtml(line)}</p>`)
      .join("");

    chapters.push({
      id: createId("chapter"),
      type: "chapter",
      title: current.title || `Глава ${chapters.length + 1}`,
      content: body || "<p></p>",
      children: []
    });

    current = null;
  };

  lines.forEach(line => {
    const t = line.trim();

    const md = t.match(/^#{1,6}\s+(.+)/);
    const org = t.match(/^\*{1,6}\s+(.+)/);
    const ad = t.match(/^={2,6}\s+(.+)/);
    const wiki = t.match(/^={2,6}\s+(.+?)\s+={2,6}$/);
    const textile = t.match(/^h[1-6]\.\s+(.+)/i);
    const fountain = format === "fountain" && /^[A-Z][A-Z0-9 .'-]{4,}$/.test(t);

    const heading = md?.[1] || org?.[1] || ad?.[1] || wiki?.[1] || textile?.[1] || (fountain ? t : "");
    const normalizedLineTitle = t.replace(/^#{1,6}\s+/, "").trim();
    const isTitle =
      t === title ||
      normalizedLineTitle === title ||
      /^\*{3} (START|END) OF THE BOOK \*{3}$/i.test(t);

    if (heading && !isTitle) {
      push();
      current = { title: heading, lines: [] };
      return;
    }

    if (t && !isTitle) {
      if (!current) current = { title: "Глава 1", lines: [] };
      current.lines.push(t.replace(/^[-*]\s+/, ""));
    }
  });

  push();

  if (!chapters.length) {
    const paragraphs = cleaned.trim()
      .split(/\n\s*\n/)
      .map(paragraph => `<p>${escapeHtml(paragraph.replace(/\n/g, " "))}</p>`)
      .filter(Boolean)
      .join("");

    chapters.push({
      id: createId("chapter"),
      type: "chapter",
      title: "Глава 1",
      content: paragraphs || "<p></p>",
      children: []
    });
  }

  return {
    title,
    author: "",
    structure: [{
      id: createId("part"),
      type: "part",
      title: "Часть 1",
      content: "",
      children: chapters
    }]
  };
}

function importHtmlDocument(text, fallbackTitle = "Импортированный HTML") {
  if (typeof DOMParser === "undefined") {
    return parseSimpleText(text, "txt");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(String(text || ""), "text/html");
  const body = doc.body;

  if (!body) return parseSimpleText(text, "txt");

  const title = (
    body.querySelector("h1")?.textContent ||
    doc.querySelector("title")?.textContent ||
    fallbackTitle
  ).trim();

  const author = (
    doc.querySelector('meta[name="author"]')?.getAttribute("content") ||
    ""
  ).trim();

  const sourceNodes = [...body.querySelectorAll("h1,h2,h3,h4")];
  const chapters = [];

  if (sourceNodes.length) {
    sourceNodes.forEach((heading, index) => {
      const parts = [];
      let node = heading.nextElementSibling;

      while (node && !/^(H1|H2|H3|H4)$/i.test(node.tagName)) {
        parts.push(node.outerHTML);
        node = node.nextElementSibling;
      }

      let headingText = heading.textContent.trim() || `Глава ${index + 1}`;
      if (index === 0 && /^h1$/i.test(heading.tagName) && headingText === title) {
        return;
      }

      chapters.push({
        id: createId("chapter"),
        type: "chapter",
        title: headingText,
        content: sanitizeImportedHtml(parts.join("")) || "<p></p>",
        children: []
      });
    });
  }

  if (!chapters.length) {
    chapters.push({
      id: createId("chapter"),
      type: "chapter",
      title: title || "Глава 1",
      content: sanitizeImportedHtml(body.innerHTML) || "<p></p>",
      children: []
    });
  }

  return {
    title: title || fallbackTitle,
    author,
    structure: [{
      id: createId("part"),
      type: "part",
      title: "Часть 1",
      content: "",
      children: chapters
    }]
  };
}

function importMhtml(text) {
  const source = String(text || "");
  const htmlMatch = source.match(/(?:<!doctype\s+html[^>]*>|<html\b)[\s\S]*?<\/html>/i);
  const html = htmlMatch?.[0] || source;
  return importHtmlDocument(html, "Импортированный MHTML");
}

function stripRtf(text) {
  let source = String(text || "").replace(/\r\n?/g, "\n");

  source = source.replace(/\\'[0-9a-fA-F]{2}/g, match =>
    String.fromCharCode(parseInt(match.slice(2), 16))
  );

  source = source.replace(/\\u(-?\d+)\??/g, (_, value) => {
    const code = Number(value);
    return String.fromCharCode(code < 0 ? code + 65536 : code);
  });

  source = source
    .replace(/\\par[d]?/g, "\n")
    .replace(/\\line/g, "\n")
    .replace(/\\tab/g, "\t")
    .replace(/\\'[0-9a-fA-F]{2}/g, "")
    .replace(/\\[a-zA-Z]+-?\d* ?/g, "")
    .replace(/[{}]/g, "");

  return source.replace(/\n{3,}/g, "\n\n").trim();
}

function importRtf(text) {
  const content = stripRtf(text);
  return parseSimpleText(content, "txt");
}

function bookFromFB2(text) {
  if (typeof DOMParser === "undefined") return parseSimpleText(text, "txt");

  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("FB2 содержит повреждённый XML.");

  const title = doc.getElementsByTagName("book-title")[0]?.textContent?.trim() || "Импортированный FB2";
  const authorNode = doc.getElementsByTagName("author")[0];

  const author = authorNode
    ? ["first-name", "middle-name", "last-name"]
        .map(name => authorNode.getElementsByTagName(name)[0]?.textContent?.trim() || "")
        .filter(Boolean)
        .join(" ")
    : "";

  const sections = [...doc.getElementsByTagName("section")];
  const chapters = sections
    .filter(section => section.parentNode?.localName === "body" || section.parentNode?.localName === "section")
    .map((section, index) => {
      const heading = section.getElementsByTagName("title")[0]?.textContent?.trim() || `Глава ${index + 1}`;
      const paragraphs = [...section.children]
        .filter(node => node.localName === "p")
        .map(node => `<p>${escapeHtml(node.textContent || "")}</p>`)
        .join("");

      return {
        id: createId("chapter"),
        type: "chapter",
        title: heading,
        content: paragraphs || "<p></p>",
        children: []
      };
    });

  return {
    title,
    author,
    structure: [{
      id: createId("part"),
      type: "part",
      title: "Часть 1",
      content: "",
      children: chapters.length ? chapters : [makeChapter("Глава 1")]
    }]
  };
}

function bookFromTEI(text) {
  if (typeof DOMParser === "undefined") return parseSimpleText(text, "txt");

  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("TEI содержит повреждённый XML.");

  const title = [...doc.getElementsByTagNameNS("*", "title")][0]?.textContent?.trim() || "Импортированный TEI";
  const author = [...doc.getElementsByTagNameNS("*", "author")][0]?.textContent?.trim() || "";

  const divs = [...doc.getElementsByTagNameNS("*", "div")]
    .filter(node => node.getAttribute("type") === "chapter" || node.querySelector("head"));

  const chapters = divs.map((div, index) => {
    const heading = div.getElementsByTagNameNS("*", "head")[0]?.textContent?.trim() || `Глава ${index + 1}`;
    const paragraphs = [...div.getElementsByTagNameNS("*", "p")]
      .map(p => `<p>${escapeHtml(p.textContent || "")}</p>`)
      .join("");

    return {
      id: createId("chapter"),
      type: "chapter",
      title: heading,
      content: paragraphs || "<p></p>",
      children: []
    };
  });

  return {
    title,
    author,
    structure: [{
      id: createId("part"),
      type: "part",
      title: "Часть 1",
      content: "",
      children: chapters.length ? chapters : [makeChapter("Глава 1")]
    }]
  };
}

function bookFromXML(text) {
  if (typeof DOMParser === "undefined") return parseSimpleText(text, "txt");

  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("XML содержит синтаксическую ошибку.");

  if (doc.documentElement?.localName?.toLowerCase() === "tei") {
    return bookFromTEI(text);
  }

  if (doc.documentElement?.localName?.toLowerCase() === "fictionbook") {
    return bookFromFB2(text);
  }

  const title =
    [...doc.getElementsByTagName("*")].find(node => node.localName === "title" && node.parentNode === doc.documentElement)?.textContent?.trim() ||
    doc.querySelector("title")?.textContent?.trim() ||
    "Импортированная книга";

  const author =
    [...doc.getElementsByTagName("*")].find(node => node.localName === "author" && node.parentNode === doc.documentElement)?.textContent?.trim() ||
    "";

  const nodes = [...doc.getElementsByTagName("chapter")];
  const chapters = nodes.map((node, index) => {
    const heading = node.querySelector("title")?.textContent?.trim() || `Глава ${index + 1}`;
    const html = node.querySelector("html")?.textContent || "";
    const fallback = [...node.children]
      .filter(child => child.localName !== "title")
      .map(child => child.textContent || "")
      .join("\n");

    return {
      id: createId("chapter"),
      type: "chapter",
      title: heading,
      content: html ? sanitizeImportedHtml(html) : `<p>${escapeHtml(fallback)}</p>`,
      children: []
    };
  });

  return {
    title,
    author,
    structure: [{
      id: createId("part"),
      type: "part",
      title: "Часть 1",
      content: "",
      children: chapters.length ? chapters : [makeChapter("Глава 1")]
    }]
  };
}

function bookFromJSONLD(text) {
  const data = typeof text === "string" ? JSON.parse(text) : text;

  const authorValue = data?.author;
  const author = Array.isArray(authorValue)
    ? authorValue.map(item => typeof item === "object" ? item?.name : item).filter(Boolean).join(", ")
    : typeof authorValue === "object"
      ? authorValue?.name || ""
      : authorValue || "";

  const sourceChapters = Array.isArray(data?.chapter)
    ? data.chapter
    : data?.chapter
      ? [data.chapter]
      : [];

  const chapters = sourceChapters.map((chapter, index) => ({
    id: createId("chapter"),
    type: "chapter",
    title: chapter?.name || `Глава ${index + 1}`,
    content: `<p>${escapeHtml(chapter?.text || chapter?.description || "")}</p>`,
    children: []
  }));

  return {
    title: data?.name || data?.headline || "Импортированный JSON-LD",
    author,
    structure: [{
      id: createId("part"),
      type: "part",
      title: "Часть 1",
      content: "",
      children: chapters.length ? chapters : [makeChapter("Глава 1")]
    }]
  };
}

function bookFromOPML(text) {
  if (typeof DOMParser === "undefined") return parseSimpleText(text, "txt");

  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("OPML содержит повреждённый XML.");

  const title = doc.querySelector("head > title")?.textContent?.trim() || "Импортированный OPML";

  const parseOutline = node => {
    const children = [...node.children]
      .filter(child => child.localName === "outline")
      .map(parseOutline);

    const type = node.getAttribute("type") || (children.length ? "part" : "chapter");

    return {
      id: createId(type),
      type: ["volume", "part", "chapter"].includes(type) ? type : "chapter",
      title: node.getAttribute("text") || node.getAttribute("title") || "Без названия",
      content: "",
      children
    };
  };

  const roots = [...doc.querySelectorAll("body > outline")].map(parseOutline);

  return {
    title,
    author: "",
    structure: roots.length ? roots : [makeChapter("Глава 1")]
  };
}

async function zipReadText(zip, name) {
  const file = zip.file(name);
  return file ? file.async("string") : null;
}

function resolveZipPath(base, href) {
  const cleanHref = String(href || "").split("#")[0].split("?")[0];
  const parts = `${base || ""}${cleanHref}`.split("/");
  const stack = [];

  parts.forEach(part => {
    if (!part || part === ".") return;
    if (part === "..") stack.pop();
    else stack.push(part);
  });

  return decodeURIComponent(stack.join("/"));
}

async function importEpub(buffer) {
  if (typeof JSZip === "undefined") throw new Error("JSZip не загружен.");

  const zip = await JSZip.loadAsync(buffer);
  const container = await zipReadText(zip, "META-INF/container.xml");
  if (!container) throw new Error("В EPUB нет META-INF/container.xml.");

  const containerDoc = new DOMParser().parseFromString(container, "application/xml");
  if (containerDoc.querySelector("parsererror")) throw new Error("Повреждён container.xml.");

  const rootfile = [...containerDoc.getElementsByTagName("*")]
    .find(node => node.localName === "rootfile")
    ?.getAttribute("full-path");

  const rootPath = rootfile || "OEBPS/content.opf";
  const opf = await zipReadText(zip, rootPath);
  if (!opf) throw new Error("В EPUB не найден OPF.");

  const opfDoc = new DOMParser().parseFromString(opf, "application/xml");
  if (opfDoc.querySelector("parsererror")) throw new Error("Повреждён OPF.");

  const title =
    [...opfDoc.getElementsByTagNameNS("http://purl.org/dc/elements/1.1/", "title")][0]
      ?.textContent?.trim() || "Импортированная книга";

  const author =
    [...opfDoc.getElementsByTagNameNS("http://purl.org/dc/elements/1.1/", "creator")][0]
      ?.textContent?.trim() || "";

  const base = rootPath.includes("/") ? rootPath.slice(0, rootPath.lastIndexOf("/") + 1) : "";

  const manifestItems = [...opfDoc.getElementsByTagName("*")]
    .filter(node => node.localName === "item");

  const spineRefs = [...opfDoc.getElementsByTagName("*")]
    .filter(node => node.localName === "itemref")
    .map(node => node.getAttribute("idref"))
    .filter(Boolean);

  const byId = Object.fromEntries(
    manifestItems.map(item => [item.getAttribute("id"), item])
  );

  const chapters = [];

  for (const idref of spineRefs) {
    const item = byId[idref];
    if (!item) continue;

    const media = item.getAttribute("media-type") || "";
    if (!media.includes("xhtml") && !media.includes("html")) continue;

    const path = resolveZipPath(base, item.getAttribute("href"));
    const source = await zipReadText(zip, path);
    if (!source) continue;

    const doc = new DOMParser().parseFromString(source, "text/html");
    const body = doc.body;

    if (!body) continue;

    const headingNode = body.querySelector("h1,h2,h3,h4");
    const heading = headingNode?.textContent?.trim() || `Глава ${chapters.length + 1}`;

    if (headingNode) headingNode.remove();

    chapters.push({
      id: createId("chapter"),
      type: "chapter",
      title: heading,
      content: sanitizeImportedHtml(body.innerHTML) || "<p></p>",
      children: []
    });
  }

  return {
    title,
    author,
    structure: [{
      id: createId("part"),
      type: "part",
      title: "Часть 1",
      content: "",
      children: chapters.length ? chapters : [makeChapter("Глава 1")]
    }]
  };
}

function makeEpubFiles(book) {
  const entries = chaptersWithPath(book);
  const manifest = entries.map((_, index) =>
    `<item id="ch${index}" href="chapter${index}.xhtml" media-type="application/xhtml+xml"/>`
  ).join("");

  const spine = entries.map((_, index) =>
    `<itemref idref="ch${index}"/>`
  ).join("");

  const chapters = entries.map(item =>
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" lang="ru">
<head><title>${xmlEscape(item.chapter.title)}</title></head>
<body>
<h1>${xmlEscape(item.chapter.title)}</h1>
${toXhtmlFragment(chapterHtml(item.chapter))}
</body>
</html>`
  );

  return { entries, manifest, spine, chapters };
}

async function exportEpub(book) {
  if (typeof JSZip === "undefined") throw new Error("JSZip не загружен.");

  const zip = new JSZip();

  // EPUB standard: mimetype must be the first file and must be uncompressed.
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  zip.folder("META-INF").file(
    "container.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`
  );

  const epub = makeEpubFiles(book);
  const folder = zip.folder("OEBPS");

  folder.file(
    "content.opf",
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid"
 xmlns:dc="http://purl.org/dc/elements/1.1/"
 xmlns:dcterms="http://purl.org/dc/terms/">
<metadata>
<dc:identifier id="bookid">${xmlEscape(book.id || createId("book"))}</dc:identifier>
<dc:title>${xmlEscape(book.title || "Без названия")}</dc:title>
<dc:language>ru</dc:language>
${book.author ? `<dc:creator>${xmlEscape(book.author)}</dc:creator>` : ""}
<meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}</meta>
</metadata>
<manifest>
<item id="nav" properties="nav" href="nav.xhtml" media-type="application/xhtml+xml"/>
${epub.manifest}
</manifest>
<spine>${epub.spine}</spine>
</package>`
  );

  folder.file(
    "nav.xhtml",
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Содержание</title></head>
<body>
<nav epub:type="toc"><h1>Содержание</h1><ol>
${epub.entries.map((item, index) =>
  `<li><a href="chapter${index}.xhtml">${xmlEscape(item.chapter.title)}</a></li>`
).join("")}
</ol></nav>
</body>
</html>`
  );

  epub.chapters.forEach((html, index) => {
    folder.file(`chapter${index}.xhtml`, html);
  });

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/epub+zip",
    compression: "DEFLATE"
  });

  downloadBlob(blob, `${sanitizeFilename(book.title)}.epub`);
}

function makeBookFromImported(rawBook, fallbackTitle = "Импортированная книга") {
  if (!rawBook || typeof rawBook !== "object" || Array.isArray(rawBook)) {
    throw new Error("Файл не содержит корректную структуру книги.");
  }

  const source = rawBook;
  const book = {
    id: createId("book"),
    title: String(source.title || fallbackTitle),
    author: String(source.author || ""),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    structure: Array.isArray(source.structure) ? source.structure : []
  };

  const normalizeNodes = nodes => (nodes || []).map(node => ({
    id: String(node?.id || createId(node?.type || "node")),
    type: ["volume", "part", "chapter"].includes(node?.type) ? node.type : "chapter",
    title: String(node?.title || "Без названия"),
    content: node?.type === "chapter" ? sanitizeImportedHtml(node?.content || "<p></p>") : "",
    children: normalizeNodes(Array.isArray(node?.children) ? node.children : [])
  }));

  book.structure = normalizeNodes(book.structure);

  if (!flattenChapters(book).length) {
    book.structure = [makeChapter("Глава 1")];
  }

  return book;
}

async function importDocx(buffer) {
  if (typeof mammoth === "undefined") throw new Error("Mammoth не загружен.");

  const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
  return importHtmlDocument(result.value, "Импортированный DOCX");
}

async function importOdt(buffer) {
  if (typeof JSZip === "undefined") throw new Error("JSZip не загружен.");

  const zip = await JSZip.loadAsync(buffer);
  const xml = await zipReadText(zip, "content.xml");
  if (!xml) throw new Error("В ODT нет content.xml.");

  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("Повреждён content.xml.");

  const ns = "urn:oasis:names:tc:opendocument:xmlns:text:1.0";
  const textRoot = doc.getElementsByTagNameNS(ns, "text")[0];

  if (!textRoot) {
    return {
      title: "Импортированный ODT",
      author: "",
      structure: [{
        id: createId("part"),
        type: "part",
        title: "Часть 1",
        content: "",
        children: [makeChapter("Глава 1")]
      }]
    };
  }

  const directChildren = [...textRoot.children];
  const title =
    directChildren.find(node => node.localName === "h")?.textContent?.trim() ||
    "Импортированный ODT";

  const headings = directChildren.filter(node => node.localName === "h");
  const hasDocumentTitle = headings.length > 1 &&
    headings[0].textContent?.trim() === title;

  const chapterHeadings = hasDocumentTitle ? headings.slice(1) : headings;
  const chapters = [];

  if (chapterHeadings.length) {
    chapterHeadings.forEach((heading, index) => {
      const headingIndex = directChildren.indexOf(heading);
      const nextHeading = chapterHeadings[index + 1];
      const nextIndex = nextHeading
        ? directChildren.indexOf(nextHeading)
        : directChildren.length;

      const paragraphs = directChildren
        .slice(headingIndex + 1, nextIndex)
        .filter(node => node.localName === "p")
        .map(node => `<p>${escapeHtml(node.textContent || "")}</p>`)
        .join("");

      chapters.push({
        id: createId("chapter"),
        type: "chapter",
        title: heading.textContent?.trim() || `Глава ${index + 1}`,
        content: paragraphs || "<p></p>",
        children: []
      });
    });
  } else {
    const paragraphs = directChildren
      .filter(node => node.localName === "p")
      .map(node => `<p>${escapeHtml(node.textContent || "")}</p>`)
      .join("");

    chapters.push({
      id: createId("chapter"),
      type: "chapter",
      title,
      content: paragraphs || "<p></p>",
      children: []
    });
  }

  return {
    title,
    author: "",
    structure: [{
      id: createId("part"),
      type: "part",
      title: "Часть 1",
      content: "",
      children: chapters
    }]
  };
}

async function importPdf(buffer) {
  if (!window.pdfjsLib) throw new Error("PDF.js не загружен.");

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const chapters = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map(item => item.str || "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    chapters.push({
      id: createId("chapter"),
      type: "chapter",
      title: `Страница ${pageNumber}`,
      content: `<p>${escapeHtml(text)}</p>`,
      children: []
    });
  }

  return {
    title: "Импортированный PDF",
    author: "",
    structure: [{
      id: createId("part"),
      type: "part",
      title: "Часть 1",
      content: "",
      children: chapters.length ? chapters : [makeChapter("Глава 1")]
    }]
  };
}

async function importFile(file) {
  if (!file || typeof file.name !== "string") {
    throw new Error("Файл не выбран.");
  }

  const ext = file.name.includes(".")
    ? file.name.split(".").pop().toLowerCase()
    : "";

  if (!formatByExtension(ext)) {
    throw new Error(`Формат .${ext || "без расширения"} не поддерживается.`);
  }

  if (ext === "json") {
    return makeBookFromImported(JSON.parse(await file.text()), "Импортированный JSON");
  }

  if (ext === "jsonld") {
    return makeBookFromImported(await bookFromJSONLD(await file.text()), "Импортированный JSON-LD");
  }

  if (ext === "epub") {
    return makeBookFromImported(await importEpub(await file.arrayBuffer()), "Импортированный EPUB");
  }

  if (ext === "docx") {
    return makeBookFromImported(await importDocx(await file.arrayBuffer()), "Импортированный DOCX");
  }

  if (ext === "odt") {
    return makeBookFromImported(await importOdt(await file.arrayBuffer()), "Импортированный ODT");
  }

  if (ext === "pdf") {
    return makeBookFromImported(await importPdf(await file.arrayBuffer()), "Импортированный PDF");
  }

  const text = await file.text();

  if (ext === "txt" && /\*\*\*\s*START OF THE BOOK\s*\*\*\*/i.test(text)) {
    return makeBookFromImported(parseSimpleText(text, "gutenberg"), "Импортированный Gutenberg TXT");
  }

  if (ext === "html" || ext === "htm" || ext === "xhtml") {
    return makeBookFromImported(importHtmlDocument(text, "Импортированный HTML"));
  }

  if (ext === "mhtml") {
    return makeBookFromImported(importMhtml(text));
  }

  if (ext === "rtf") {
    return makeBookFromImported(importRtf(text));
  }

  if (ext === "fb2") {
    return makeBookFromImported(bookFromFB2(text));
  }

  if (ext === "xml") {
    return makeBookFromImported(bookFromXML(text));
  }

  if (ext === "csv") {
    return makeBookFromImported(bookFromCSV(text));
  }

  if (ext === "tsv") {
    return makeBookFromImported(bookFromCSV(text, "\t"));
  }

  if (ext === "yaml" || ext === "yml") {
    return makeBookFromImported(bookFromYAML(text));
  }

  if (ext === "opml") {
    return makeBookFromImported(bookFromOPML(text));
  }

  if (ext === "srt" || ext === "vtt") {
    return makeBookFromImported(parseSubtitle(text, ext));
  }

  if (ext === "gutenberg") {
    return makeBookFromImported(parseSimpleText(text, "gutenberg"));
  }

  return makeBookFromImported(parseMarkdownLike(text), "Импортированный текст");
}

function rtfEscapeText(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/[^\x00-\x7F]/g, char => {
      const code = char.charCodeAt(0);
      const signed = code > 32767 ? code - 65536 : code;
      return `\\u${signed}?`;
    });
}

function makeExportBlob(book, format) {
  switch (format) {
    case "json":
      return [
        new Blob([JSON.stringify(book, null, 2)], { type:"application/json" }),
        "json"
      ];

    case "txt":
      return [textBlob(bookToPlainText(book)), "txt"];

    case "gutenberg":
      return [
        textBlob(`*** START OF THE BOOK ***\n\n${bookToPlainText(book)}\n*** END OF THE BOOK ***`),
        "txt"
      ];

    case "html":
      return [new Blob([bookToHtml(book)], { type:"text/html;charset=utf-8" }), "html"];

    case "htmlbook":
      return [new Blob([bookToHTMLBook(book)], { type:"text/html;charset=utf-8" }), "html"];

    case "xhtml":
      return [new Blob([bookToXHTMLBook(book)], { type:"application/xhtml+xml;charset=utf-8" }), "xhtml"];

    case "mhtml":
      return [textBlob(bookToMHTML(book), "multipart/related;charset=utf-8"), "mhtml"];

    case "md":
    case "markdown":
    case "gfm":
    case "commonmark":
      return [textBlob(bookToMarkdown(book)), formatById(format).ext];

    case "adoc":
    case "asciidoc":
      return [textBlob(bookToAsciiDoc(book)), formatById(format).ext];

    case "org":
      return [textBlob(bookToOrg(book)), "org"];

    case "rst":
      return [textBlob(bookToRst(book)), "rst"];

    case "djot":
      return [textBlob(bookToMarkdown(book)), "djot"];

    case "bbcode":
      return [textBlob(bookToBBCode(book)), "bbcode"];

    case "textile":
      return [textBlob(bookToTextile(book)), "textile"];

    case "mediawiki":
      return [textBlob(bookToWiki(book)), "wiki"];

    case "fountain":
      return [textBlob(bookToFountain(book)), "fountain"];

    case "rtf":
      return [
        textBlob(
          `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Georgia;}}\\f0\\fs24 ${rtfEscapeText(bookToPlainText(book).replace(/\n/g, "\\par "))}}`,
          "application/rtf"
        ),
        "rtf"
      ];

    case "fb2":
      return [
        textBlob(
          `<?xml version="1.0" encoding="UTF-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0">
<description><title-info>
<book-title>${xmlEscape(book.title || "")}</book-title>
${book.author ? `<author><first-name>${xmlEscape(book.author)}</first-name></author>` : ""}
</title-info></description>
<body>
${chaptersWithPath(book).map(item => `
<section>
<title><p>${xmlEscape(item.chapter.title)}</p></title>
${toXhtmlFragment(chapterHtml(item.chapter))}
</section>`).join("")}
</body>
</FictionBook>`,
          "application/xml;charset=utf-8"
        ),
        "fb2"
      ];

    case "xml":
      return [textBlob(bookToXML(book), "application/xml;charset=utf-8"), "xml"];

    case "tei":
      return [textBlob(bookToTEI(book), "application/xml;charset=utf-8"), "xml"];

    case "jsonld":
      return [new Blob([bookToJSONLD(book)], { type:"application/ld+json" }), "jsonld"];

    case "yaml":
    case "yml":
      return [textBlob(bookToYAML(book)), formatById(format).ext];

    case "csv":
      return [textBlob(bookToCSV(book)), "csv"];

    case "tsv":
      return [textBlob(bookToCSV(book, "\t")), "tsv"];

    case "opml":
      return [textBlob(bookToOPML(book), "application/xml;charset=utf-8"), "opml"];

    case "srt":
      return [textBlob(bookToSRT(book)), "srt"];

    case "vtt":
      return [textBlob(bookToVTT(book)), "vtt"];

    default:
      throw new Error(`Формат ${format} не поддерживается для экспорта.`);
  }
}

async function exportBookFormat(book, format) {
  if (!book) throw new Error("Книга не найдена.");

  if (["epub", "pdf", "docx", "odt"].includes(format)) {
    return exportBinaryBook(book, format);
  }

  const [blob, ext] = makeExportBlob(book, format);
  downloadBlob(blob, `${sanitizeFilename(book.title)}.${ext}`);
}

async function exportBinaryBook(book, format) {
  if (format === "epub") {
    return exportEpub(book);
  }

  if (format === "pdf") {
    if (typeof html2pdf !== "function") {
      throw new Error("PDF-модуль не загружен. Проверь интернет-соединение и обнови страницу.");
    }

    const holder = document.createElement("div");
    holder.style.cssText = [
      "position:fixed",
      "left:-100000px",
      "top:0",
      "width:794px",
      "background:white",
      "color:#222",
      "padding:56px",
      "font:18px/1.7 Georgia,serif",
      "box-sizing:border-box"
    ].join(";");

    const fullHtml = bookToHTMLBook(book);
    const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    holder.innerHTML = bodyMatch?.[1] || fullHtml;
    document.body.appendChild(holder);

    try {
      await html2pdf()
        .set({
          margin:0,
          filename:`${sanitizeFilename(book.title)}.pdf`,
          image:{ type:"jpeg", quality:0.96 },
          html2canvas:{ scale:1.6, useCORS:true, backgroundColor:"#ffffff" },
          jsPDF:{ unit:"pt", format:"a4", orientation:"portrait" },
          pagebreak:{ mode:["css","legacy"] }
        })
        .from(holder)
        .save();
    } finally {
      holder.remove();
    }

    return;
  }

  if (format === "docx") {
    if (!window.docx) {
      throw new Error("DOCX-модуль не загружен. Проверь интернет-соединение и обнови страницу.");
    }

    const children = [
      new docx.Paragraph({
        text: book.title || "Без названия",
        heading: docx.HeadingLevel.TITLE
      })
    ];

    if (book.author) {
      children.push(new docx.Paragraph(book.author));
    }

    chaptersWithPath(book).forEach(item => {
      children.push(
        new docx.Paragraph({
          text: item.chapter.title,
          heading: docx.HeadingLevel.HEADING_1
        })
      );

      stripHtml(item.chapter.content)
        .split(/\n+/)
        .map(text => text.trim())
        .filter(Boolean)
        .forEach(paragraph => children.push(new docx.Paragraph(paragraph)));
    });

    const documentFile = new docx.Document({
      sections: [{ children }]
    });

    const blob = await docx.Packer.toBlob(documentFile);
    downloadBlob(blob, `${sanitizeFilename(book.title)}.docx`);
    return;
  }

  if (format === "odt") {
    if (typeof JSZip === "undefined") {
      throw new Error("JSZip не загружен.");
    }

    const zip = new JSZip();

    zip.file("mimetype", "application/vnd.oasis.opendocument.text", {
      compression: "STORE"
    });

    zip.folder("META-INF").file(
      "manifest.xml",
      `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest
 xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"
 xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 manifest:version="1.2">
<manifest:file-entry manifest:media-type="application/vnd.oasis.opendocument.text" manifest:full-path="/"/>
<manifest:file-entry manifest:media-type="text/xml" manifest:full-path="content.xml"/>
<manifest:file-entry manifest:media-type="text/xml" manifest:full-path="styles.xml"/>
</manifest:manifest>`
    );

    zip.file(
      "styles.xml",
      `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles
 xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 office:version="1.2">
<office:styles/>
</office:document-styles>`
    );

    const body = chaptersWithPath(book)
      .map(item => `
<text:h text:outline-level="1">${xmlEscape(item.chapter.title)}</text:h>
${stripHtml(item.chapter.content)
  .split(/\n+/)
  .filter(Boolean)
  .map(paragraph => `<text:p>${xmlEscape(paragraph)}</text:p>`)
  .join("")}`)
      .join("");

    zip.file(
      "content.xml",
      `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
 xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 office:version="1.2">
<office:body><office:text>
<text:h text:outline-level="1">${xmlEscape(book.title || "Без названия")}</text:h>
${book.author ? `<text:p>${xmlEscape(book.author)}</text:p>` : ""}
${body}
</office:text></office:body>
</office:document-content>`
    );

    const blob = await zip.generateAsync({ type:"blob" });
    downloadBlob(blob, `${sanitizeFilename(book.title)}.odt`);
  }
}
