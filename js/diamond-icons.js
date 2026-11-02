/* DiamondBook hand-drawn golden vectors: animations 0.85–1.0s. */
(function(){
"use strict";
document.addEventListener("DOMContentLoaded",function(){
  var reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  var touch=window.matchMedia("(pointer: coarse)");
  var uid=0;
  // Each icon is a genuine scalable illustration, not a raster screenshot.
  var icons={
    diamond:'<path class="db-cut" d="M9 18 18 7h28l9 11-23 30L9 18Z"/><path d="M9 18h46M18 7l8 11 6 30 6-30 8-11M26 18l6-11 6 11"/><path class="db-glimmer" d="m50 2 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" fill="currentColor" stroke="none"/>',
    book:'<path class="db-page-left" d="M6 16q13-8 26 2v29Q18 39 6 44V16Z" fill="currentColor" fill-opacity=".09"/><path class="db-page-right" d="M58 16q-13-8-26 2v29q14-8 26-3V16Z" fill="currentColor" fill-opacity=".09"/><path d="M32 18v29M12 22q7-2 13 1M12 28q7-2 13 1M39 23q5-3 13-1M39 29q6-3 13-1" stroke-width="1.2"/><path d="m28 11 4-6 4 6-4 4-4-4Z" fill="currentColor" fill-opacity=".35"/>',
    library:'<path d="M8 49h48v5H8z" fill="currentColor" fill-opacity=".16"/><path class="db-book-one" d="M12 18h10v29H12zM15 22v21M18 23v18"/><path class="db-book-two" d="M24 12h11v35H24zM27 16v27M31 16v27"/><path class="db-book-three" d="m39 17 9-3 9 31-10 3-8-31ZM44 22l7 22"/><path d="M9 10h49" stroke-width="1.2"/>',
    quill:'<path class="db-quill-feather" d="M13 49C24 20 40 10 57 7c-1 15-9 29-34 37L13 49Z" fill="currentColor" fill-opacity=".11"/><path class="db-quill-feather" d="M13 49C24 20 40 10 57 7c-1 15-9 29-34 37m-10 5 35-32M25 34l15-3M34 23l8 1"/><path class="db-ink" d="M8 53q9-4 20-1" stroke-width="2.1"/>',
    home:'<path d="m7 29 25-20 25 20M14 27v27h36V27M26 54V36h12v18"/><path d="M18 22v-9h8v3M20 29h7M37 29h7" stroke-width="1.2"/><path class="db-glimmer" d="m50 6 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" fill="currentColor" stroke="none"/>',
    profile:'<circle class="db-portrait-head" cx="32" cy="24" r="10"/><path class="db-portrait-shoulders" d="M13 54c0-12 7-19 19-19s19 7 19 19"/><circle class="db-portrait-ring" cx="32" cy="32" r="29" stroke-dasharray="2 3" stroke-width="1.1"/>',
    menu:'<path class="db-menu-line db-menu-a" d="M12 19h40"/><path class="db-menu-line db-menu-b" d="M12 32h40"/><path class="db-menu-line db-menu-c" d="M12 45h40"/><path d="m6 19 2-2m-2 15 2-2m-2 15 2-2" stroke-width="1.2"/>',
    filter:'<path d="M7 13h50L38 34v16l-12 6V34L7 13Z"/><path class="db-filter-line" d="M17 21h30M23 28h18"/><path d="m43 8 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" fill="currentColor" fill-opacity=".35"/>',
    save:'<path d="M11 8h34l8 8v40H11V8ZM19 8v17h26V8M19 56V36h27v20"/><path class="db-check" d="m24 45 5 5 12-12"/><path d="M29 13h8v9h-8z" fill="currentColor" fill-opacity=".2"/>',
    edit:'<path class="db-pencil" d="m14 45 3-11L44 7l12 12-27 27-11 3-4-4Zm24-32 12 12M17 37l8 8"/><path d="M8 56h48M14 21H8v35" stroke-width="1.3"/>',
    eye:'<path d="M5 32s10-16 27-16 27 16 27 16-10 16-27 16S5 32 5 32Z"/><circle class="db-eye-center" cx="32" cy="32" r="9"/><circle cx="35" cy="28" r="2" fill="currentColor" stroke="none"/>',
    file:'<path d="M15 5h24l12 12v40H15V5ZM39 5v14h12"/><path d="M23 30h20M23 37h20M23 44h13"/><path class="db-file-arrow" d="m8 28 4-4-4-4M56 43l-4 4 4 4"/>',
    reader:'<path class="db-page-left" d="M7 14q13-8 25 3v31Q18 40 7 44V14Z" fill="currentColor" fill-opacity=".10"/><path class="db-page-right" d="M57 14q-13-8-25 3v31q14-8 25-4V14Z" fill="currentColor" fill-opacity=".10"/><path d="M32 17v31M14 22q5-2 11 1M40 22q5-3 11-1M14 28q5-2 11 1M40 28q5-3 11-1"/><path d="M7 52q12-3 25 2 13-5 25-2" stroke-width="1.25"/>',
    gear:'<path class="db-cog" d="m28 6h8l2 7 5 2 6-4 6 6-4 6 2 5 7 2v8l-7 2-2 5 4 6-6 6-6-4-5 2-2 7h-8l-2-7-5-2-6 4-6-6 4-6-2-5-7-2v-8l7-2 2-5-4-6 6-6 6 4 5-2 2-7Z"/><circle cx="32" cy="34" r="11"/>',
    bookmark:'<path class="db-ribbon" d="M18 7h28v49L32 46 18 56V7Z" fill="currentColor" fill-opacity=".11"/><path d="m27 19 5-8 5 8-5 6-5-6Z" fill="currentColor" fill-opacity=".2"/>',
    prev:'<path class="db-arrow-shaft" d="M53 32H12m0 0 18-18M12 32l18 18"/><path d="M50 22v20" stroke-width="1.3"/>',
    next:'<path class="db-arrow-shaft" d="M11 32h41m0 0L34 14m18 18L34 50"/><path d="M14 22v20" stroke-width="1.3"/>',
    star:'<path class="db-star-core" d="m32 7 7 16 18 2-13 12 4 19-16-9-16 9 4-19L7 25l18-2L32 7Z" fill="currentColor" fill-opacity=".14"/><path d="m32 18 4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1 4-9Z" stroke-width="1.1"/>',
    scroll:'<path class="db-scroll-paper" d="M13 11h37v40H17c-8 0-11-9-6-13 2-2 6-2 9 0V15c-5-7-13-2-12 4 1 4 5 5 9 2M50 11c8 0 9 9 4 13-3 2-6 0-7-3" fill="currentColor" fill-opacity=".07"/><path d="M25 23h17M25 30h18M25 37h13" stroke-width="1.2"/>'
  };
  function icon(kind,large){
    var type=icons[kind]?kind:"diamond";
    var id="db-gold-"+(++uid);
    var out=document.createElement("span");
    out.className="db-icon db-icon-"+type+(large?" db-icon-large":"");
    out.setAttribute("aria-hidden","true");
    out.innerHTML='<svg class="db-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">'+
      '<defs><linearGradient id="'+id+'" x1="0" y1="0" x2="1" y2="1">'+
      '<stop offset="0%" stop-color="#fff0c3"/><stop offset="30%" stop-color="#edc48d"/>'+
      '<stop offset="65%" stop-color="#a97142"/><stop offset="100%" stop-color="#f3d49b"/></linearGradient></defs>'+
      '<g fill="none" stroke="url(#'+id+')" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round">'+icons[type]+'</g></svg>';
    return out;
  }
  function replace(el,kind,large){
    if(!el||el.dataset.dbIconReady)return;
    el.dataset.dbIconReady="true";
    el.replaceChildren(icon(kind,large));
    el.classList.add("db-icon-host");
  }
  function prefix(el,kind,removeOriginal){
    if(!el||el.dataset.dbIconReady)return;
    el.dataset.dbIconReady="true";
    if(removeOriginal&&el.firstChild&&el.firstChild.nodeType===3)
      el.firstChild.textContent=el.firstChild.textContent.replace(/^\s*[+＋✎✒◇▤▣❖✦⇄✓⌂]\s*/,"");
    el.prepend(icon(kind,false));
    el.classList.add("db-icon-label");
  }
  function action(el,kind){
    if(!el)return;
    el.classList.add("db-ornate-button");
    prefix(el,kind,false);
  }
  document.querySelectorAll(".brand-gem").forEach(function(el){replace(el,"diamond");});
  var heroes=document.querySelectorAll(".hero-tile");
  ["book","library","quill"].forEach(function(kind,index){
    var tile=heroes[index];if(!tile)return;
    replace(tile.querySelector(".hero-tile-icon"),kind,true);
    tile.classList.add("db-illuminated-tile","db-ornate-button");
  });
  document.querySelectorAll(".db-mobile-toggle").forEach(function(el){replace(el,"menu");});
  document.querySelectorAll(".db-filter-trigger").forEach(function(el){replace(el,"filter");});
  var mobileNav=["home","library","book","star","profile"];
  document.querySelectorAll(".db-mobile-drawer-nav a span").forEach(function(el,index){replace(el,mobileNav[index]||"diamond");});
  document.querySelectorAll(".preset-icon").forEach(function(el,index){replace(el,["book","scroll","quill"][index]||"book");});
  document.querySelectorAll(".account-entry-avatar").forEach(function(el){replace(el,"profile");});
  document.querySelectorAll(".empty-icon").forEach(function(el){replace(el,"star",true);});
  action(document.getElementById("newBookButton"),"quill");
  action(document.getElementById("emptyCreateButton"),"quill");
  action(document.getElementById("publishOwnBook"),"book");
  action(document.querySelector(".catalog-publish-panel button"),"book");
  action(document.querySelector(".create-submit"),"quill");
  action(document.querySelector(".auth-submit"),"diamond");
  action(document.querySelector(".profile-save"),"save");
  prefix(document.getElementById("profileEditButton"),"edit",true);
  document.querySelectorAll(".db-preview-toggle").forEach(function(el){prefix(el,"eye",false);});
  var panelKinds={"Текст":"quill","Дизайн":"diamond","Просмотр":"eye",
    "Сохранение":"save","Файлы":"file","Читать":"reader","Книжная полка":"home"};
  document.querySelectorAll(".editor-actions .db-action").forEach(function(el){
    var kind=panelKinds[el.title]||"star";
    var slot=el.querySelector(".db-action-icon");
    if(slot)replace(slot,kind,false);else prefix(el,kind,false);
  });
  document.querySelectorAll(".db-editor-tools-button").forEach(function(el){
    if(el.firstChild&&el.firstChild.nodeType===3)el.firstChild.textContent="Инструменты";
    prefix(el,"quill",false);
  });
  document.querySelectorAll(".db-editor-sheet-grid button").forEach(function(el,i){
    prefix(el,["quill","diamond","eye","save","file","reader"][i]||"star",false);
  });
  document.querySelectorAll(".db-editor-sheet-grid a").forEach(function(el){prefix(el,"home",false);});
  var readerMap={menuButton:"menu",prevButton:"prev",nextButton:"next",
    prevPartButton:"prev",nextPartButton:"next",themeButton:"gear"};
  Object.keys(readerMap).forEach(function(id){
    var el=document.getElementById(id);if(!el)return;
    if(!el.getAttribute("aria-label"))el.setAttribute("aria-label",el.title||id);
    replace(el,readerMap[id],false);
    el.classList.add("db-reader-icon-button");
  });
  document.querySelectorAll(".db-reader-more-button").forEach(function(el){replace(el,"gear");});
  document.querySelectorAll(".db-reader-sheet-actions button").forEach(function(el,i){
    prefix(el,["menu","gear","prev","next"][i]||"book",false);
  });
  function play(el){
    if(reduced.matches)return;
    el.classList.remove("db-icon-playing");
    void el.offsetWidth;
    el.classList.add("db-icon-playing");
  }
  document.addEventListener("pointerdown",function(event){
    var el=event.target.closest&&event.target.closest(".hero-tile,.db-ornate-button,.db-icon-host,.db-icon-label,.db-reader-icon-button");
    if(el&&!el.disabled)play(el);
  },{passive:true});
  document.addEventListener("keydown",function(event){
    if(event.key!=="Enter"&&event.key!==" ")return;
    var el=event.target.closest&&event.target.closest(".hero-tile,.db-ornate-button,.db-icon-host,.db-icon-label,.db-reader-icon-button");
    if(el)play(el);
  });
  document.addEventListener("animationend",function(event){
    if(String(event.animationName).indexOf("db")!==0)return;
    var el=event.target.closest&&event.target.closest(".db-icon-playing");
    if(el)el.classList.remove("db-icon-playing");
  });
  // On touch devices, allow the reference-style hero illustration to unfold in 850ms.
  heroes.forEach(function(tile){
    tile.addEventListener("click",function(event){
      if(!touch.matches||reduced.matches||event.defaultPrevented||event.button!==0||
        event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||tile.target==="_blank"||tile.hasAttribute("download"))return;
      var url=new URL(tile.href,location.href);
      if(url.origin!==location.origin)return;
      if(tile.dataset.dbNavigating)return;
      event.preventDefault();
      tile.dataset.dbNavigating="true";
      play(tile);tile.classList.add("db-icon-departing");
      window.setTimeout(function(){location.href=url.href;},850);
    });
  });
  var toggle=document.querySelector(".db-mobile-toggle");
  if(toggle){
    var sync=function(){toggle.classList.toggle("db-menu-expanded",toggle.getAttribute("aria-expanded")==="true");};
    new MutationObserver(sync).observe(toggle,{attributes:true,attributeFilter:["aria-expanded"]});
    sync();
  }
});
})();
