/* DiamondBook: collapsible authoring workspace, preserving existing editor handlers. */
(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", function () {
    const body=document.body, actions=document.querySelector(".editor-actions");
    const toolbar=document.querySelector(".editor-toolbar");
    const sidebar=document.getElementById("sidebar");
    const outline=document.getElementById("outlineToggle");
    const status=document.getElementById("saveStatus");
    if(!body.classList.contains("editor-page") || !actions || !toolbar || !sidebar)return;
    const book=getBook(new URLSearchParams(location.search).get("id"))||getCurrentBook();
    if(!book)return;
    const native={read:document.getElementById("readerButton"),
      export:document.getElementById("exportButton"),
      design:document.getElementById("bookDesignOpen"),
      preview:document.getElementById("bookPreviewOpen")};
    const original=Array.from(actions.children);
    const library=original.find(el=>el.matches('a[href="index.html"]'));
    const parking=document.createElement("div");
    parking.className="db-native-parking";
    parking.hidden=true;
    body.append(parking);
    original.forEach(el=>{if(el!==library)parking.append(el);});
    actions.replaceChildren();

    const shade=document.createElement("button");
    shade.type="button";
    shade.className="db-drawer-shade";
    shade.hidden=true;
    shade.setAttribute("aria-label","Закрыть панель");
    const drawer=document.createElement("aside");
    drawer.className="db-drawer";
    drawer.id="dbWorkspacePanel";
    drawer.setAttribute("aria-label","Инструменты редактора");
    drawer.setAttribute("aria-hidden","true");
    drawer.inert=true;
    drawer.innerHTML=[
      '<header class="db-drawer-head"><div><small>DIAMONDBOOK / РЕДАКТОР</small><h2 id="dbDrawerTitle">Редактирование</h2></div><button type="button" id="dbDrawerClose" aria-label="Свернуть панель">×</button></header>',
      '<nav class="db-drawer-nav" aria-label="Разделы панели"><button type="button" data-db-tab="format">Текст</button><button type="button" data-db-tab="save">Сохранение</button><button type="button" data-db-tab="files">Файлы</button></nav>',
      '<div class="db-drawer-scroll"><section id="dbDrawerFormat" class="db-drawer-section" hidden><p class="db-drawer-note">Выдели текст и нажми нужный инструмент. Изменения сохраняются автоматически.</p><div id="dbToolbarHost"></div></section>',
      '<section id="dbDrawerSave" class="db-drawer-section" hidden><p class="db-drawer-note">Твои черновики хранятся в браузере. Для сохранности скачай резервную копию.</p>',
      '<div class="db-save-card"><small>Текущая книга</small><strong id="dbSaveBookTitle"></strong><span id="dbSaveIndicator" role="status"></span></div>',
      '<button type="button" id="dbSaveNow" class="db-drawer-primary">✓ Сохранить сейчас</button>',
      '<button type="button" id="dbBackupBook" class="db-drawer-secondary">⇩ Скачать резервную копию JSON</button>',
      '<button type="button" id="dbSaveOpenFiles" class="db-drawer-secondary">⇄ Импорт и экспорт</button>',
      '<p class="db-drawer-note">Ctrl+S — быстрое сохранение. Книга не публикуется автоматически.</p></section></div>'
    ].join("");
    body.append(shade,drawer);
    const format=drawer.querySelector("#dbDrawerFormat");
    const save=drawer.querySelector("#dbDrawerSave");
    drawer.querySelector("#dbToolbarHost").append(toolbar);

    // Preserve existing toolbar buttons, selects and event listeners, grouped into clear sections.
    const groups=Array.from(toolbar.querySelectorAll(":scope > .toolbar-group"));
    const selectors=["editorFontFamily","lineSpacingSelect","pageTextureSelect","editorFontSize"];
    const labels=selectors.map(id=>document.getElementById(id)?.closest("label")).filter(Boolean);
    const help=document.getElementById("shortcutGuideButton");
    const organized=[
      ["Начертание",groups[0]?[groups[0]]:[]],
      ["Заголовки и списки",groups[1]?[groups[1]]:[]],
      ["Выравнивание",groups[2]?[groups[2]]:[]],
      ["Вставка, отмена",groups[3]?[groups[3]]:[]],
      ["Дополнительно",groups[4]?[groups[4]]:[]],
      ["Шрифт и страница",labels.concat(help?[help]:[])]
    ];
    toolbar.replaceChildren();
    organized.forEach(([name,items])=>{
      if(!items.length)return;
      const group=document.createElement("section");
      group.className="db-tool-group";
      const heading=document.createElement("h3");
      heading.textContent=name;
      const controls=document.createElement("div");
      controls.className="db-tool-controls";
      items.forEach(node=>controls.append(node));
      group.append(heading,controls);
      toolbar.append(group);
    });

    let active=null,restore=null;
    const isMobile=()=>window.matchMedia("(max-width:850px)").matches;
    function syncPanel(){
      const opened=!!active;
      drawer.classList.toggle("is-open",opened);
      body.classList.toggle("db-panel-open",opened);
      drawer.inert=!opened;
      drawer.setAttribute("aria-hidden",String(!opened));
      const narrow=opened&&isMobile();
      shade.hidden=!narrow;
      shade.classList.toggle("is-active",narrow);
      format.hidden=active!=="format";
      save.hidden=active!=="save";
      drawer.querySelector("#dbDrawerTitle").textContent=active==="save"?"Сохранение книги":"Редактирование текста";
      drawer.querySelectorAll("[data-db-tab]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.dbTab===active)));
      actions.querySelectorAll("[data-db-open]").forEach(b=>b.setAttribute("aria-expanded",String(b.dataset.dbOpen===active)));
      if(active==="save")syncSaveStatus();
    }
    function close(){
      const wasOpen=!!active;
      active=null;
      syncPanel();
      if(wasOpen && drawer.contains(document.activeElement) && restore?.isConnected)restore.focus({preventScroll:true});
    }
    function open(tab,from){
      if(tab==="files"){close();native.export?.click();return;}
      if(active===tab){close();return;}
      active=tab;
      restore=from||document.activeElement;
      syncPanel();
      if(isMobile())drawer.querySelector("#dbDrawerClose").focus({preventScroll:true});
    }
    function topButton(symbol,label,click,pane){
      const b=document.createElement("button");
      b.type="button";
      b.className="db-action";
      b.title=label;
      b.setAttribute("aria-label",label);
      if(pane){b.dataset.dbOpen=pane;b.setAttribute("aria-controls","dbWorkspacePanel");b.setAttribute("aria-expanded","false");}
      const icon=document.createElement("span");
      icon.className="db-action-icon";
      icon.setAttribute("aria-hidden","true");
      icon.textContent=symbol;
      const text=document.createElement("span");
      text.className="db-action-label";
      text.textContent=label;
      b.append(icon,text);
      b.addEventListener("click",()=>click(b));
      return b;
    }
    const textButton=topButton("Aa","Текст",b=>open("format",b),"format");
    const designButton=topButton("◇","Дизайн",()=>{close();native.design?.click();});
    const previewButton=topButton("◫","Просмотр",()=>{close();native.preview?.click();});
    const saveButton=topButton("✓","Сохранение",b=>open("save",b),"save");
    const filesButton=topButton("⇄","Файлы",b=>open("files",b));
    const readButton=topButton("▤","Читать",()=>{close();native.read?.click();});
    actions.append(textButton,designButton,previewButton,saveButton,filesButton,readButton);
    if(library){
      library.className="db-action db-library-action";
      library.title="Книжная полка";
      library.setAttribute("aria-label","Книжная полка");
      library.textContent="⌂";
      actions.append(library);
    }
    drawer.querySelector("#dbDrawerClose").addEventListener("click",close);
    shade.addEventListener("click",close);
    drawer.querySelectorAll("[data-db-tab]").forEach(b=>b.addEventListener("click",()=>open(b.dataset.dbTab,actions.querySelector('[data-db-open="'+b.dataset.dbTab+'"]')||filesButton)));
    document.addEventListener("keydown",e=>{
      if(e.key==="Escape" && active){e.preventDefault();close();}
      if((e.ctrlKey||e.metaKey)&&e.altKey&&e.code==="KeyT"){e.preventDefault();open("format",textButton);}
    });

    function syncSaveStatus(){
      drawer.querySelector("#dbSaveIndicator").textContent=status?.textContent?.trim()||"Сохранено";
      drawer.querySelector("#dbSaveBookTitle").textContent=document.getElementById("bookNameButton")?.textContent?.trim()||book.title||"Без названия";
    }
    if(status)new MutationObserver(syncSaveStatus).observe(status,{childList:true,subtree:true,characterData:true});
    syncSaveStatus();
    function forceSave(){
      document.dispatchEvent(new Event("diamond-book-save-request"));
      syncSaveStatus();
    }
    drawer.querySelector("#dbSaveNow").addEventListener("click",forceSave);
    drawer.querySelector("#dbBackupBook").addEventListener("click",async()=>{
      try{
        forceSave();
        const current=getBook(book.id);
        if(!current)throw new Error("Не удалось найти сохранённую книгу.");
        await exportBookFormat(current,"json");
      }catch(error){alert(error?.message||"Не удалось скачать резервную копию.");}
    });
    drawer.querySelector("#dbSaveOpenFiles").addEventListener("click",()=>open("files",filesButton));

    // On desktop the outline is collapsible; on phone the original drawer remains.
    const outlineKey="diamondBook.workspace.outline."+book.id;
    function refreshOutline(){
      if(isMobile()){body.classList.remove("db-outline-collapsed");return;}
      let preference="closed";
      try{preference=localStorage.getItem(outlineKey)||"closed";}catch{}
      const collapsed=preference!=="open";
      body.classList.toggle("db-outline-collapsed",collapsed);
      outline?.setAttribute("aria-expanded",String(!collapsed));
      outline?.setAttribute("aria-label",collapsed?"Показать содержание":"Скрыть содержание");
      if(sidebar.classList.contains("open"))sidebar.classList.remove("open");
      const backdrop=document.getElementById("sidebarBackdrop");
      if(backdrop)backdrop.hidden=true;
    }
    outline?.addEventListener("click",e=>{
      if(isMobile())return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const collapsed=body.classList.toggle("db-outline-collapsed");
      outline.setAttribute("aria-expanded",String(!collapsed));
      outline.setAttribute("aria-label",collapsed?"Показать содержание":"Скрыть содержание");
      try{localStorage.setItem(outlineKey,collapsed?"closed":"open");}catch{}
    },true);
    refreshOutline();
    window.addEventListener("resize",()=>{refreshOutline();if(active)syncPanel();});

    const exportModal=document.getElementById("exportModal");
    if(exportModal){
      const heading=exportModal.querySelector("h2");
      if(heading)heading.textContent="Файлы книги";
      document.addEventListener("keydown",e=>{
        if(e.key==="Escape" && !exportModal.classList.contains("hidden"))exportModal.classList.add("hidden");
      });
    }
  });
})();
