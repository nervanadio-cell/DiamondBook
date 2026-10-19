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

  const presetButtons = [...document.querySelectorAll("[data-preset]")];
  const titleInput = document.getElementById("bookTitle");
  const authorInput = document.getElementById("bookAuthor");
  const previewTitle = document.getElementById("previewTitle");
  const previewAuthor = document.getElementById("previewAuthor");
  const previewStructure = document.getElementById("previewStructure");
  function updatePreview() {
    previewTitle.textContent = titleInput.value.trim() || "Название твоей книги";
    previewAuthor.textContent = authorInput.value.trim() || "Твоё имя";
    const volume = document.getElementById("useVolumes").checked ? Number(document.getElementById("volumeCount").value) || 1 : 0;
    const part = document.getElementById("useParts").checked ? Number(document.getElementById("partCount").value) || 1 : 0;
    const chapter = document.getElementById("useChapters").checked ? Number(document.getElementById("chapterCount").value) || 1 : 0;
    previewStructure.textContent = [
      volume ? volume + " том." : "",
      part ? part + " част." : "",
      chapter ? chapter + " глав." : ""
    ].filter(Boolean).join(" · ") || "1 глава";
  }

  const presets = {
    novel: {useVolumes:false,volumeCount:1,useParts:false,partCount:1,useChapters:true,chapterCount:5},
    saga: {useVolumes:true,volumeCount:2,useParts:true,partCount:2,useChapters:true,chapterCount:5},
    notes:{useVolumes:false,volumeCount:1,useParts:false,partCount:1,useChapters:true,chapterCount:1}
  };
  presetButtons.forEach(button => button.addEventListener("click", () => {
    const preset = presets[button.dataset.preset];
    if (!preset) return;
    Object.entries(preset).forEach(([key,value]) => {
      const element = document.getElementById(key);
      if (!element) return;
      if (element.type === "checkbox") element.checked = value;
      else element.value = String(value);
    });
    toggles.forEach(([checkId,inputId]) => {
      document.getElementById(inputId).disabled = !document.getElementById(checkId).checked;
    });
    presetButtons.forEach(item => {
      const active = item === button;
      item.classList.toggle("active",active);
      item.setAttribute("aria-pressed",String(active));
    });
    updatePreview();
  }));
  [titleInput,authorInput,...toggles.flatMap(([a,b]) => [document.getElementById(a),document.getElementById(b)])].forEach(field => {
    field?.addEventListener("input", updatePreview);
    field?.addEventListener("change", () => {
      updatePreview();
      if (field !== titleInput && field !== authorInput) presetButtons.forEach(button => {
        button.classList.remove("active");
        button.setAttribute("aria-pressed","false");
      });
    });
  });
  updatePreview();

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
