# DiamondBook

Браузерный редактор и библиотека книг для GitHub Pages.

## Обновления

- Обновлён интерфейс библиотеки, создания книги и редактора в дубово-бумажном стиле.
- Поиск книг по названию/автору и сортировка по дате или названию.
- Быстрые шаблоны книги: роман, сага и заметки; живой предпросмотр обложки и структуры.
- Улучшенная панель текста: списки, выравнивание, форматирование, отмена/повтор, размер шрифта и интервалы.
- Подсчёт слов и символов; справка по клавишам `F1`.
- Сочетания для ПК: `Ctrl+B/I/U`, `Ctrl+Alt+2/0/H/N`, `Ctrl+Shift+7/8`, `Ctrl+S`, `Ctrl+Enter`, `Alt+↑/↓`.
- Содержание и действия с главами доступны на телефоне через ☰ и ⋮.

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
│   └── refinement.css
├── js/
│   ├── storage.js
│   ├── app.js
│   ├── create.js
│   ├── editor.js
│   ├── editor-enhancements.js
│   ├── reader.js
│   ├── cover-editor.js
│   ├── formats.js
│   ├── export.js
│   └── import.js
└── README.md
```

Книги хранятся локально в браузере. Для резервной копии используй экспорт JSON.
