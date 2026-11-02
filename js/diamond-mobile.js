/* DiamondBook mobile choreography, 2026.
   Progressive enhancement: original links, forms, storage and handlers remain authoritative. */
(function(){
"use strict";
document.addEventListener("DOMContentLoaded",function(){
  const body=document.body;
  const mobile=window.matchMedia("(max-width:820px)");
  const reduce=window.matchMedia("(prefers-reduced-motion:reduce)");
  const one=(selector,root=document)=>root.querySelector(selector);
  const all=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
  const node=(tag,cls,text)=>{
    const element=document.createElement(tag);
    if(cls)element.className=cls;
    if(text!==undefined)element.textContent=text;
    return element;
  };
  const focusFirst=(root)=>{const f=one("button:not([disabled]),a[href],input:not([disabled]),select:not([disabled])",root);if(f)f.focus({preventScroll:true});};
  const panelSets=[];
  function panel(settings){
    const {klass,panelEl,shade,button,focusBack}=settings;
    let open=false;
    function sync(on){
      open=!!on&&mobile.matches;
      body.classList.toggle(klass,open);
      if(shade)shade.hidden=!open;
      if(button)button.setAttribute("aria-expanded",String(open));
      if(panelEl){panelEl.setAttribute("aria-hidden",String(!open));panelEl.inert=!open;}
      if(open)focusFirst(panelEl);
      else if(focusBack&&panelEl?.contains(document.activeElement)&&button)button.focus({preventScroll:true});
    }
    panelSets.push({sync,isOpen:()=>open});
    button?.addEventListener("click",()=>sync(!open));
    shade?.addEventListener("click",()=>sync(false));
    return{open:()=>sync(true),close:()=>sync(false),isOpen:()=>open};
  }

  /* A single quiet topbar on phones, full original navigation on desktop. */
  const siteHeader=one("header.topbar");
  if(siteHeader){
    const toggle=node("button","db-mobile-toggle","☰");
    toggle.type="button";
    toggle.setAttribute("aria-label","Открыть меню");
    toggle.setAttribute("aria-controls","dbMobileDrawer");
    toggle.setAttribute("aria-expanded","false");
    siteHeader.append(toggle);
    const shade=node("button","db-mobile-backdrop");
    shade.type="button";shade.hidden=true;shade.setAttribute("aria-label","Закрыть меню");
    const drawer=node("aside","db-mobile-drawer");
    drawer.id="dbMobileDrawer";drawer.setAttribute("aria-label","Навигация DiamondBook");
    drawer.innerHTML=
      '<div class="db-mobile-drawer-head"><strong>◇ DiamondBook</strong><button class="db-mobile-close" type="button" aria-label="Закрыть меню">×</button></div>'+
      '<p class="db-mobile-drawer-kicker">КНИЖНАЯ МАСТЕРСКАЯ</p>'+
      '<nav class="db-mobile-drawer-nav" aria-label="Разделы сайта">'+
        '<a href="index.html"><span>⌂</span> Главная</a>'+
        '<a href="catalog.html"><span>▤</span> Библиотека</a>'+
        '<a href="index.html#myBooks"><span>♧</span> Мои книги</a>'+
        '<a href="index.html#community"><span>✦</span> Сообщество</a>'+
        '<a href="profile.html"><span>♙</span> Мой профиль</a>'+
      '</nav>'+
      '<p class="db-mobile-drawer-kicker">ДЕЙСТВИЯ</p>'+
      '<div class="db-mobile-drawer-extra">'+
        '<button type="button" data-db-mobile-action="account">♙ &nbsp; Войти / Регистрация</button>'+
        '<a href="create.html" class="db-mobile-create">✒ &nbsp; Создать книгу</a>'+
        '<button type="button" data-db-mobile-action="import" hidden>⇪ &nbsp; Импортировать книгу</button>'+
      '</div>'+
      '<p class="db-mobile-drawer-bottom">Напиши свою историю ✦</p>';
    body.append(shade,drawer);
    const ctl=panel({klass:"db-mobile-open",panelEl:drawer,shade,button:toggle,focusBack:true});
    one(".db-mobile-close",drawer).addEventListener("click",ctl.close);
    all(".db-mobile-drawer-nav a,.db-mobile-drawer-extra a",drawer).forEach(a=>{
      if(new URL(a.href,location.href).pathname===location.pathname &&
         (new URL(a.href,location.href).hash===location.hash || (!location.hash&&!new URL(a.href,location.href).hash)))
        a.classList.add("is-current");
      a.addEventListener("click",ctl.close);
    });
    const account=one("#accountButton"),importBtn=one("#importButton");
    const accountDrawer=one('[data-db-mobile-action="account"]',drawer);
    const importDrawer=one('[data-db-mobile-action="import"]',drawer);
    if(importBtn)importDrawer.hidden=false;
    accountDrawer.addEventListener("click",()=>{
      ctl.close();
      if(account){account.click();}else location.href="auth.html";
    });
    importDrawer.addEventListener("click",()=>{ctl.close();importBtn?.click();});
    const updateAccount=()=>{
      const label=one("#accountButtonLabel")?.textContent?.trim();
      accountDrawer.textContent="♙  "+(label||"Войти / Регистрация");
    };
    updateAccount();
    const accountLabel=one("#accountButtonLabel");
    if(accountLabel)new MutationObserver(updateAccount).observe(accountLabel,{childList:true,subtree:true,characterData:true});
  }

  /* Catalog controls live in a pull-out wooden drawer on small screens. */
  const catSidebar=one(".catalog-screen .catalog-sidebar");
  const catRow=one(".catalog-screen .catalog-toolrow");
  if(catSidebar&&catRow){
    const toggle=node("button","db-filter-trigger","☷");
    toggle.type="button";toggle.setAttribute("aria-label","Открыть фильтры");toggle.title="Фильтры";
    toggle.setAttribute("aria-expanded","false");toggle.setAttribute("aria-controls","dbCatalogFilters");
    catRow.append(toggle);catSidebar.id="dbCatalogFilters";
    const title=node("div","db-catalog-filter-head");
    title.innerHTML='<strong>Фильтры библиотеки</strong><button type="button" aria-label="Закрыть фильтры">×</button>';
    catSidebar.prepend(title);
    const shade=node("button","db-catalog-backdrop");
    shade.type="button";shade.hidden=true;shade.setAttribute("aria-label","Закрыть фильтры");
    body.append(shade);
    const mobileChoices=node("div","db-catalog-mobile-filters");
    catSidebar.append(mobileChoices);
    const moved=all(".catalog-filter",catRow).map(field=>{
      const marker=document.createComment("Original DiamondBook catalog filter position");
      field.parentNode.insertBefore(marker,field);
      return{field,marker};
    });
    const ctl=panel({klass:"db-catalog-filters-open",panelEl:catSidebar,shade,button:toggle,focusBack:true});
    one(".db-catalog-filter-head button",catSidebar)?.addEventListener("click",ctl.close);
    all(".catalog-genre-list button",catSidebar).forEach(b=>b.addEventListener("click",()=>{
      if(mobile.matches)ctl.close();
    }));
    const sync=()=>{
      moved.forEach(({field,marker})=>{
        if(mobile.matches)mobileChoices.append(field);
        else marker.parentNode?.insertBefore(field,marker);
      });
      if(!mobile.matches)ctl.close();
    };
    sync();mobile.addEventListener("change",sync);
  }

  /* Editor's complex tools are still present and functional, now behind one tap. */
  const editorActions=one(".editor-page .editor-actions");
  if(editorActions){
    const toggle=node("button","db-editor-tools-button","✒  Инструменты");
    toggle.type="button";toggle.setAttribute("aria-label","Открыть инструменты редактора");
    toggle.setAttribute("aria-expanded","false");toggle.setAttribute("aria-controls","dbEditorQuickSheet");
    editorActions.append(toggle);
    const shade=node("button","db-editor-sheet-shade");shade.type="button";shade.hidden=true;shade.setAttribute("aria-label","Закрыть инструменты");
    const sheet=node("section","db-editor-sheet");
    sheet.id="dbEditorQuickSheet";sheet.setAttribute("aria-label","Инструменты редактора");
    sheet.innerHTML='<div class="db-editor-sheet-head"><strong>Инструменты</strong><button type="button" aria-label="Закрыть панель">×</button></div><div class="db-editor-sheet-grid"></div>';
    const actions=[
      ["Текст","Aa  Текст"],["Дизайн","◇  Оформление"],["Просмотр","◫  Предпросмотр"],
      ["Сохранение","✓  Сохранить"],["Файлы","⇄  Файлы"],["Читать","▤  Читать"]
    ];
    const grid=one(".db-editor-sheet-grid",sheet);
    const ctl=panel({klass:"db-editor-tools-open",panelEl:sheet,shade,button:toggle,focusBack:true});
    for(const [title,label] of actions){
      const b=node("button","",label);
      b.type="button";
      b.addEventListener("click",()=>{
        ctl.close();
        all(".editor-actions .db-action",editorActions).find(x=>x.title===title)?.click();
      });
      grid.append(b);
    }
    const home=node("a","","⌂  Книжная полка");home.href="index.html";grid.append(home);
    body.append(shade,sheet);
    one(".db-editor-sheet-head button",sheet).addEventListener("click",ctl.close);
  }

  /* The reader keeps paging visible, and tucks auxiliary actions into a sheet. */
  const controls=one(".reader-page .reader-controls");
  if(controls){
    const more=node("button","db-reader-more-button","⋯");
    more.type="button";more.setAttribute("aria-label","Дополнительные настройки чтения");
    more.setAttribute("aria-expanded","false");more.setAttribute("aria-controls","dbReaderMoreSheet");
    controls.append(more);
    const shade=node("button","db-reader-sheet-shade");shade.type="button";shade.hidden=true;shade.setAttribute("aria-label","Закрыть дополнительные настройки");
    const sheet=node("section","db-reader-sheet");
    sheet.id="dbReaderMoreSheet";sheet.setAttribute("aria-label","Настройки чтения");
    sheet.innerHTML='<div class="db-reader-sheet-head"><strong>Настройки чтения</strong><button type="button" aria-label="Закрыть">×</button></div><div class="db-reader-sheet-actions"></div>';
    const ctl=panel({klass:"db-reader-more-open",panelEl:sheet,shade,button:more,focusBack:true});
    [
      ["Содержание","menuButton"],["Тема и бумага","themeButton"],
      ["Предыдущая часть","prevPartButton"],["Следующая часть","nextPartButton"]
    ].forEach(([label,id])=>{
      const b=node("button","",label);b.type="button";
      b.addEventListener("click",()=>{ctl.close();document.getElementById(id)?.click();});
      one(".db-reader-sheet-actions",sheet).append(b);
    });
    body.append(shade,sheet);
    one(".db-reader-sheet-head button",sheet).addEventListener("click",ctl.close);
  }

  /* Preview cover only when requested on narrow book-creation screens. */
  const createHeading=one(".create-screen .create-heading");
  const preview=one(".create-screen .create-preview-column");
  if(createHeading&&preview){
    const toggle=node("button","db-preview-toggle","▣  Показать обложку");
    toggle.type="button";toggle.setAttribute("aria-controls","dbCoverPreview");
    toggle.setAttribute("aria-expanded","false");preview.id="dbCoverPreview";
    createHeading.append(toggle);
    toggle.addEventListener("click",()=>{
      const open=body.classList.toggle("db-preview-active");
      toggle.setAttribute("aria-expanded",String(open));
      toggle.textContent=open?"▣  Скрыть обложку":"▣  Показать обложку";
      if(open)preview.scrollIntoView({behavior:reduce.matches?"auto":"smooth",block:"nearest"});
    });
  }

  /* Existing profile edit form becomes a dismissible right-side sheet on phones. */
  const profileSettings=one(".profile-screen #profileSettings");
  if(profileSettings){
    const shade=node("button","db-profile-shade");
    shade.type="button";shade.hidden=true;shade.setAttribute("aria-label","Закрыть редактирование профиля");
    body.append(shade);
    const sync=()=>{
      const open=mobile.matches&&!profileSettings.hidden;
      body.classList.toggle("db-profile-panel-open",open);
      shade.hidden=!open;
      if(open){profileSettings.setAttribute("role","dialog");profileSettings.setAttribute("aria-modal","true");}
      else{profileSettings.removeAttribute("aria-modal");profileSettings.removeAttribute("role");}
    };
    shade.addEventListener("click",()=>one("#profileCloseSettings")?.click());
    new MutationObserver(sync).observe(profileSettings,{attributes:true,attributeFilter:["hidden"]});
    mobile.addEventListener("change",sync);sync();
  }

  document.addEventListener("keydown",event=>{
    if(event.key!=="Escape")return;
    for(let i=panelSets.length-1;i>=0;i--){
      if(panelSets[i].isOpen()){event.preventDefault();panelSets[i].sync(false);return;}
    }
    if(body.classList.contains("db-profile-panel-open"))one("#profileCloseSettings")?.click();
  });
  mobile.addEventListener("change",()=>{if(!mobile.matches)panelSets.forEach(x=>x.sync(false));});

  /* Only animate content that can really be observed, and honor reduced-motion. */
  if("IntersectionObserver" in window&&!reduce.matches){
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(e=>{
        if(!e.isIntersecting)return;
        e.target.classList.add("db-visible");
        observer.unobserve(e.target);
      });
    },{threshold:.07,rootMargin:"0px 0px 55px 0px"});
    const addReveals=(root=document)=>{
      all(".cinema-hero-copy,.cinema-section-head,.cinema-featured-card,.catalog-intro,.catalog-publish-panel,.create-main,.profile-view",root)
        .forEach(el=>{if(el.dataset.dbReveal)return;el.dataset.dbReveal="1";observer.observe(el);});
    };
    addReveals();
    const featured=one("#featuredBooks");
    if(featured)new MutationObserver(()=>addReveals(featured)).observe(featured,{childList:true});
  }
});
})();