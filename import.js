function initImportUI() {
  const input=document.getElementById("fileInput");
  if(!input) return;
  input.addEventListener("change",async e=>{
    const file=e.target.files?.[0]; if(!file)return;
    try { const book=await importFile(file); saveBook(book); alert(`Импортировано: ${book.title}`); location.href=`editor.html?id=${encodeURIComponent(book.id)}`; }
    catch(err){ console.error(err); alert(`Не удалось импортировать файл.\n${err.message||err}`); }
    finally { input.value=""; }
  });
}

document.addEventListener("DOMContentLoaded",initImportUI);
