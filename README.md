# Book Creator v2.1 — проверенная сборка

Локальный веб-редактор книг для GitHub Pages.

## Что добавлено

В версии 2 основной упор сделан на импорт и экспорт. В интерфейсе редактора кнопка **«Экспорт / импорт»** открывает каталог форматов с поиском.

Поддерживаются 36 форматов/вариантов:

- JSON проекта
- TXT
- Gutenberg TXT
- HTML
- XHTML
- MHTML
- Markdown
- `.markdown`
- GitHub Flavored Markdown
- CommonMark
- AsciiDoc
- `.asciidoc`
- Org Mode
- reStructuredText
- Djot
- BBCode
- Textile
- MediaWiki
- Fountain
- RTF
- FictionBook 2 (FB2)
- EPUB 3
- PDF
- DOCX
- ODT
- Book XML
- TEI XML
- JSON-LD
- YAML
- YML
- CSV
- TSV
- OPML
- SRT
- WebVTT
- HTML Book

### Настоящие бинарные форматы

- **EPUB** — собирается как полноценный ZIP-пакет EPUB 3 с `content.opf`, `nav.xhtml`, главами и `mimetype`.
- **PDF** — формируется из книжной HTML-разметки через `html2pdf`, поэтому русский текст сохраняется нормально.
- **DOCX** — создаётся настоящий Word-документ через `docx`.
- **ODT** — создаётся настоящий OpenDocument Text ZIP-пакет.

### Импорт

- EPUB разбирается по `container.xml`, OPF, manifest и spine.
- DOCX читается через Mammoth.
- PDF разбирается по страницам через PDF.js.
- ODT читается из `content.xml`.
- FB2 разбирается по `section`, названию и автору.
- JSON/JSON-LD/XML/CSV и текстовые форматы превращаются в структуру книги.

## Важно

GitHub Pages сам по себе не требует сервера. Проект хранит книги в `localStorage` браузера.

Для PDF/DOCX/EPUB/ODT используются библиотеки из CDN, поэтому при первом открытии страницы нужен интернет. После подключения к проекту эти библиотеки можно позже положить прямо в папку `vendor/`, чтобы сделать проект полностью автономным.

## Запуск

Просто загрузить папку на GitHub Pages и открыть `index.html`.

Для локальной разработки лучше использовать любой простой static server, например VS Code Live Server.


## Проверка сборки

Перед упаковкой проверены:
- синтаксис всех JavaScript-файлов через Node.js;
- все локальные `src`/`href` и JavaScript-ссылки из HTML;
- экспорт 32 текстовых/разметочных форматов;
- XML-валидность FB2, Book XML, TEI, OPML и XHTML;
- корректные временные диапазоны SRT/VTT;
- структура проекта и загрузка скриптов.

Исправлены обнаруженные ошибки предыдущей версии: отсутствующие функции TXT/HTML-экспорта, неверная ссылка на browser-сборку `docx`, повреждённый тег подключения PDF.js, несовместимый URL PDF.js worker, обработка HTML/RTF/MHTML/YAML/OPML/TEI при импорте и пустая структура импортированной книги.

## Зависимости

EPUB/ODT используют JSZip, PDF импорт — PDF.js, PDF экспорт — html2pdf, DOCX импорт — Mammoth, DOCX экспорт — docx. Эти библиотеки подключаются с CDN и поэтому требуют интернет-соединения при загрузке функций, которые ими пользуются.
