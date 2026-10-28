# DiamondBook

Локальная библиотека, редактор и читалка книг для GitHub Pages.

## Обновлено

- Фактура дубовой коры: неровные продольные трещины, рельеф и естественные тени.
- Полки: волокна древесины, сучки, толщина доски и тень под ней. Текстура сохраняет пропорции.
- Размеры книг выровнены: одинаковое соотношение сторон 2:3, нижний край на одной линии.
- В библиотеке на полке помещается до 4 книг на ПК, 3 на планшете, 2 на телефоне.
- Дубовое оформление теперь едино для библиотеки, создания книги, редактора и читалки.
- Существующие книги и локальное сохранение остаются без изменений.

## Структура

```text
DiamondBook/
├── index.html
├── create.html
├── editor.html
├── reader.html
├── assets/
│   ├── oak-bark.svg
│   └── oak-board.svg
├── css/
│   ├── main.css
│   ├── create.css
│   ├── editor.css
│   ├── reader.css
│   ├── refinement.css
│   ├── cover-layout.css
│   ├── page-materials.css
│   ├── image-editor.css
│   ├── shelf-rework.css
│   ├── editor-ux-fixes.css
│   └── wood-realism.css
├── js/
│   ├── storage.js
│   ├── app.js
│   ├── create.js
│   ├── editor.js
│   ├── editor-enhancements.js
│   ├── reader.js
│   ├── cover-editor.js
│   ├── cover-layout.js
│   ├── image-editor.js
│   ├── formats.js
│   ├── export.js
│   └── import.js
└── README.md
```

Книги хранятся в браузере. Резервная копия — экспорт JSON.

Сайт: https://diamondbook-nervanadio.pages.dev
