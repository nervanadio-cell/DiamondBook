document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("createForm");

  const toggles = [
    ["useVolumes", "volumeCount"],
    ["useParts", "partCount"],
    ["useChapters", "chapterCount"]
  ];

  toggles.forEach(([checkId, inputId]) => {
    const check = document.getElementById(checkId);
    const input = document.getElementById(inputId);

    const sync = () => {
      input.disabled = !check.checked;
    };

    check.addEventListener("change", sync);
    sync();
  });

  const getCount = (id, fallback) => {
    const value = Number.parseInt(document.getElementById(id).value, 10);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };

  form.addEventListener("submit", event => {
    event.preventDefault();

    const title = document.getElementById("bookTitle").value.trim();
    const author = document.getElementById("bookAuthor").value.trim();

    if (!title) return;

    const useVolumes = document.getElementById("useVolumes").checked;
    const useParts = document.getElementById("useParts").checked;
    const useChapters = document.getElementById("useChapters").checked;

    const volumeCount = Math.min(getCount("volumeCount", 1), 20);
    const partCount = Math.min(getCount("partCount", 1), 50);
    const chapterCount = useChapters
      ? Math.min(getCount("chapterCount", 1), 100)
      : 0;

    let structure = [];

    if (useVolumes) {
      structure = Array.from({ length: volumeCount }, (_, index) => {
        const volume = makeVolume(
          `Том ${index + 1}`,
          useParts ? partCount : 0,
          useChapters ? chapterCount : 0
        );

        if (!useParts && useChapters) {
          volume.children = Array.from(
            { length: chapterCount },
            (_, chapterIndex) => makeChapter(`Глава ${chapterIndex + 1}`)
          );
        }

        if (!useParts && !useChapters) {
          volume.children = [];
        }

        return volume;
      });
    } else if (useParts) {
      structure = Array.from(
        { length: partCount },
        (_, index) => makePart(`Часть ${index + 1}`, chapterCount)
      );
    } else if (useChapters) {
      structure = Array.from(
        { length: chapterCount },
        (_, index) => makeChapter(`Глава ${index + 1}`)
      );
    } else {
      structure = [makeChapter("Глава 1")];
    }

    const now = new Date().toISOString();

    const book = {
      id: createId("book"),
      title,
      author,
      createdAt: now,
      updatedAt: now,
      structure
    };

    try {
      saveBook(book);
      location.href = `editor.html?id=${encodeURIComponent(book.id)}`;
    } catch (error) {
      alert(error.message || "Не удалось создать книгу.");
    }
  });
});
