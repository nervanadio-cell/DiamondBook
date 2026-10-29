/* DiamondBook — book design studio (local-first; no account or network required). */
(function () {
  "use strict";
  var fonts = {
    georgia: "Georgia, serif", garamond: "Garamond, Georgia, serif",
    palatino: "Palatino, Georgia, serif", cambria: "Cambria, Georgia, serif",
    bookman: "'Bookman Old Style', Georgia, serif", times: "'Times New Roman', serif",
    trebuchet: "'Trebuchet MS', Arial, sans-serif", verdana: "Verdana, sans-serif",
    arial: "Arial, sans-serif", tahoma: "Tahoma, sans-serif",
    courier: "'Courier New', monospace", handwriting: "'Segoe Print', cursive"
  };
  var papers = ["cream", "ivory", "white", "slate"];
  var presets = {
    classic: {font:"georgia",size:18,line:1.8,width:780,spacing:1,indent:1.2,align:"justify",paper:"cream"},
    airy: {font:"palatino",size:19,line:2,width:840,spacing:1.35,indent:0,align:"left",paper:"white"},
    noir: {font:"cambria",size:18,line:1.7,width:760,spacing:0.85,indent:1,align:"justify",paper:"slate"},
    compact: {font:"garamond",size:17,line:1.55,width:720,spacing:0.75,indent:1.2,align:"justify",paper:"ivory"}
  };
  function limit(value, lo, hi, fallback) {
    var n=Number(value);
    return Number.isFinite(n) ? Math.min(hi,Math.max(lo,n)) : fallback;
  }
  function normalize(obj,book) {
    var o=obj && typeof obj==="object" ? obj : {};
    var f=fonts[o.font] ? o.font : (fonts[book && book.editorFontFamily] ? book.editorFontFamily : "georgia");
    return {
      font:f,
      size:limit(o.size,15,24,Number(book && book.editorFontSize)||18),
      line:limit(o.line,1.4,2.2,Number(book && book.editorLineHeight)||1.8),
      width:limit(o.width,620,920,780),
      spacing:limit(o.spacing,.6,1.8,1),
      indent:limit(o.indent,0,2,0),
      align:o.align==="justify"?"justify":"left",
      paper:papers.includes(o.paper)?o.paper:"cream"
    };
  }
  function escapeHtml(s) {
    return String(s||"").replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});
  }
  function safePreview(source) {
    var allow=new Set(["P","DIV","BR","STRONG","B","EM","I","U","S","DEL","BLOCKQUOTE","H1","H2","H3","UL","OL","LI","HR","SPAN","FIGURE","FIGCAPTION","IMG"]);
    function clean(node) {
      if(node.nodeType===3)return document.createTextNode(node.nodeValue);
      if(node.nodeType!==1)return document.createTextNode("");
      if(["SCRIPT","STYLE","IFRAME","OBJECT","SVG","FORM","INPUT","VIDEO","AUDIO"].includes(node.tagName))return document.createTextNode("");
      if(!allow.has(node.tagName)){
        var fragment=document.createDocumentFragment();
        Array.from(node.childNodes).forEach(function(child){fragment.appendChild(clean(child));});
        return fragment;
      }
      var element=document.createElement(node.tagName.toLowerCase());
      if(node.tagName==="IMG") {
        var src=node.getAttribute("src")||"";
        if(!/^(data:image\/(?:jpeg|png|webp);base64,|https?:\/\/|blob:)/i.test(src))return document.createTextNode("");
        element.src=src;
        element.alt=node.getAttribute("alt")||"Иллюстрация";
        element.loading="lazy";
      }
      if(node.tagName==="FIGURE"){
        element.className="book-figure";
        var align=node.dataset.align;
        if(["left","center","right"].includes(align))element.dataset.align=align;
        var w=Number(node.dataset.size);
        if([50,75,100].includes(w))element.style.width=w+"%";
      }
      var alignment=node.style && node.style.textAlign;
      if(["left","center","right","justify"].includes(alignment))element.style.textAlign=alignment;
      Array.from(node.childNodes).forEach(function(child){element.appendChild(clean(child));});
      return element;
    }
    var result=document.createDocumentFragment();
    Array.from(source.childNodes).forEach(function(child){result.appendChild(clean(child));});
    return result;
  }

  document.addEventListener("DOMContentLoaded", function(){
    var edit=document.getElementById("editor");
    var actions=document.querySelector(".editor-actions");
    var toolbar=document.querySelector(".editor-toolbar");
    if(!edit||!actions||!toolbar)return;
    var id=new URLSearchParams(location.search).get("id") || (getCurrentBook()||{}).id;
    var book=getBook(id)||getCurrentBook();
    if(!book)return;
    id=book.id;
    var style=normalize(book.bookStyle,book);
    var panel=document.createElement("div");
    panel.className="studio-overlay";
    panel.hidden=true;
    panel.innerHTML=
      '<section class="studio-dialog" role="dialog" aria-modal="true" aria-labelledby="studioHeading">'+
      '<header class="studio-header"><div><span class="studio-eyebrow">DIAMONDBOOK · СТУДИЯ</span><h2 id="studioHeading">Дизайн и предпросмотр</h2><p>Настройки сохраняются в этой книге и используются при чтении.</p></div><button type="button" class="studio-close" aria-label="Закрыть редактор оформления">×</button></header>'+
      '<div class="studio-shell"><div class="studio-settings">'+
      '<div class="studio-subheading">Быстрый стиль</div>'+
      '<div class="studio-presets"><button type="button" data-preset="classic">Классика</button><button type="button" data-preset="airy">Воздух</button><button type="button" data-preset="noir">Нуар</button><button type="button" data-preset="compact">Компакт</button></div>'+
      '<div class="studio-subheading">Страницы книги</div>'+
      '<label>Шрифт<select data-studio="font"><option value="georgia">Georgia</option><option value="garamond">Garamond</option><option value="palatino">Palatino</option><option value="cambria">Cambria</option><option value="bookman">Bookman</option><option value="times">Times</option><option value="trebuchet">Trebuchet</option><option value="verdana">Verdana</option><option value="arial">Arial</option><option value="tahoma">Tahoma</option><option value="courier">Courier</option><option value="handwriting">Рукописный</option></select></label>'+
      '<label>Бумага<select data-studio="paper"><option value="cream">Сливочная</option><option value="ivory">Слоновая кость</option><option value="white">Белая</option><option value="slate">Тёмная</option></select></label>'+
      '<label>Размер текста <output data-output="size"></output><input data-studio="size" type="range" min="15" max="24" step="1"></label>'+
      '<label>Межстрочный интервал <output data-output="line"></output><input data-studio="line" type="range" min="1.4" max="2.2" step=".05"></label>'+
      '<label>Ширина страницы <output data-output="width"></output><input data-studio="width" type="range" min="620" max="920" step="20"></label>'+
      '<label>Отступ между абзацами <output data-output="spacing"></output><input data-studio="spacing" type="range" min=".6" max="1.8" step=".05"></label>'+
      '<label>Красная строка <output data-output="indent"></output><input data-studio="indent" type="range" min="0" max="2" step=".2"></label>'+
      '<label>Выравнивание<select data-studio="align"><option value="left">По левому краю</option><option value="justify">По ширине</option></select></label>'+
      '<div class="studio-setting-foot"><button type="button" class="studio-reset">Сбросить оформление</button><span class="studio-auto">Автосохранение</span></div>'+
      '</div><div class="studio-preview-side">'+
      '<div class="studio-preview-head"><div><span class="studio-subheading">Как увидит читатель</span><strong id="studioChapter"></strong></div><button type="button" class="studio-open-reader">Открыть книгу ↗</button></div>'+
      '<div class="studio-pages-viewport" id="studioViewport"><div class="studio-preview-flow" id="studioFlow"></div></div>'+
      '<div class="studio-preview-foot"><button type="button" id="studioPrev" aria-label="Предыдущий разворот">←</button><span id="studioPageNumber">Страница 1</span><button type="button" id="studioNext" aria-label="Следующий разворот">→</button></div>'+
      '<p class="studio-hint">Предпросмотр показывает текст выбранной главы. Для полного режима чтения нажми «Открыть книгу».</p>'+
      '</div></div><footer class="studio-footer"><span>Все изменения применяются сразу</span><button type="button" class="studio-done">Готово ✓</button></footer></section>';
    document.body.appendChild(panel);

    var flow=panel.querySelector("#studioFlow");
    var viewport=panel.querySelector("#studioViewport");
    var number=panel.querySelector("#studioPageNumber");
    var current=0,total=1,step=344,visible=2,debounce=0,returnFocus=null;
    var chapterTitle=document.getElementById("chapterTitle");
    var page=document.querySelector(".chapter-editor");
    function setVariables(el){
      if(!el)return;
      el.style.setProperty("--studio-font",fonts[style.font]);
      el.style.setProperty("--studio-size",style.size+"px");
      el.style.setProperty("--studio-line",String(style.line));
      el.style.setProperty("--studio-width",style.width+"px");
      el.style.setProperty("--studio-spacing",style.spacing+"em");
      el.style.setProperty("--studio-indent",style.indent+"em");
      el.style.setProperty("--studio-align",style.align);
      el.dataset.studioPaper=style.paper;
    }
    function applyLive(){
      setVariables(document.body);
      setVariables(page);
      edit.style.fontFamily=fonts[style.font];
      edit.style.lineHeight=String(style.line);
      edit.style.fontSize=style.size+"px";
      var fontSelect=document.getElementById("editorFontFamily");
      var lineSelect=document.getElementById("lineSpacingSelect");
      if(fontSelect)fontSelect.value=style.font;
      if(lineSelect){
        var match=Array.from(lineSelect.options).some(function(o){return Number(o.value)===style.line;});
        if(match)lineSelect.value=String(style.line);
      }
    }
    function writeStyle(){
      applyLive();
      document.dispatchEvent(new CustomEvent("diamond-book-style-change",{detail:{bookId:book.id,style:Object.assign({},style)}}));
    }
    function syncControls(){
      panel.querySelectorAll("[data-studio]").forEach(function(input){input.value=style[input.dataset.studio];});
      ["size","line","width","spacing","indent"].forEach(function(k){
        var output=panel.querySelector('[data-output="'+k+'"]');
        if(output)output.textContent=k==="size"?style[k]+" px":k==="width"?style[k]+" px":k==="indent"||k==="spacing"?style[k].toFixed(1)+" em":style[k].toFixed(2);
      });
    }
    function applyFlowStyle(){
      flow.style.fontFamily=fonts[style.font];
      flow.style.fontSize=Math.max(12,Math.round(style.size*.88))+"px";
      flow.style.lineHeight=String(style.line);
      flow.style.setProperty("--studio-spacing",style.spacing+"em");
      flow.style.setProperty("--studio-indent",style.indent+"em");
      flow.style.setProperty("--studio-align",style.align);
      viewport.dataset.studioPaper=style.paper;
    }
    function pageMetrics() {
      var styles=getComputedStyle(flow);
      var w=parseFloat(styles.columnWidth)||320;
      var gap=parseFloat(styles.columnGap)||24;
      step=w+gap;
      visible=viewport.clientWidth>=w*2+gap-4?2:1;
      total=Math.max(1,Math.ceil((flow.scrollWidth+gap-2)/step));
    }
    function updatePagination(){
      pageMetrics();
      current=Math.max(0,Math.min(current,Math.max(0,total-visible)));
      flow.style.transform="translate3d("+(-current*step)+"px,0,0)";
      number.textContent="Стр. "+(current+1)+(visible===2 && current+1<total?"–"+Math.min(total,current+2):"")+" из "+total;
      panel.querySelector("#studioPrev").disabled=current===0;
      panel.querySelector("#studioNext").disabled=current+visible>=total;
    }
    function renderPreview(reset){
      if(panel.hidden)return;
      if(reset)current=0;
      panel.querySelector("#studioChapter").textContent=chapterTitle && chapterTitle.value.trim() || "Новая глава";
      flow.replaceChildren();
      flow.appendChild(safePreview(edit));
      if(!flow.childNodes.length || !flow.textContent.trim()){
        var p=document.createElement("p");p.textContent="Здесь появится текст твоей главы — начни писать, и он будет виден в этом окне.";flow.appendChild(p);
      }
      applyFlowStyle();
      requestAnimationFrame(updatePagination);
    }
    function queuePreview(reset) {
      if(panel.hidden)return;
      clearTimeout(debounce);
      debounce=setTimeout(function(){renderPreview(reset);},130);
    }
    function openStudio(){
      returnFocus=document.activeElement;
      panel.hidden=false;
      syncControls();
      applyLive();
      current=0;
      renderPreview(true);
      panel.querySelector(".studio-close").focus();
    }
    function closeStudio(){
      panel.hidden=true;
      clearTimeout(debounce);
      if(returnFocus && returnFocus.isConnected && typeof returnFocus.focus==="function")returnFocus.focus({preventScroll:true});
    }

    var designButton=document.createElement("button");
    designButton.type="button";designButton.id="bookDesignOpen";designButton.className="ghost-button studio-top-button";
    designButton.textContent="Дизайн книги";designButton.title="Оформление страниц и предпросмотр";
    var previewButton=document.createElement("button");
    previewButton.type="button";previewButton.id="bookPreviewOpen";previewButton.className="ghost-button studio-top-button";
    previewButton.textContent="Предпросмотр";previewButton.title="Предпросмотр главы";
    actions.insertBefore(previewButton,actions.firstChild);
    actions.insertBefore(designButton,previewButton);
    designButton.addEventListener("click",openStudio);
    previewButton.addEventListener("click",openStudio);

    panel.querySelector(".studio-close").onclick=closeStudio;
    panel.querySelector(".studio-done").onclick=closeStudio;
    panel.addEventListener("click",function(e){if(e.target===panel)closeStudio();});
    document.addEventListener("keydown",function(e){
      if(e.key==="Escape" && !panel.hidden){e.preventDefault();closeStudio();}
    });
    panel.querySelectorAll("[data-studio]").forEach(function(input){
      input.addEventListener("input",function(){
        var k=input.dataset.studio;
        style[k]=["size","line","width","spacing","indent"].includes(k)?Number(input.value):input.value;
        style=normalize(style,book);
        syncControls();writeStyle();
        queuePreview(false);
      });
    });
    panel.querySelectorAll("[data-preset]").forEach(function(b){
      b.addEventListener("click",function(){
        style=normalize(presets[b.dataset.preset],book);
        syncControls();writeStyle();queuePreview(false);
      });
    });
    panel.querySelector(".studio-reset").onclick=function(){
      style=normalize({}, {editorFontFamily:"georgia",editorFontSize:18,editorLineHeight:1.8});
      syncControls();writeStyle();queuePreview(false);
    };
    panel.querySelector("#studioPrev").onclick=function(){current=Math.max(0,current-visible);updatePagination();};
    panel.querySelector("#studioNext").onclick=function(){current=Math.min(Math.max(0,total-visible),current+visible);updatePagination();};
    panel.querySelector(".studio-open-reader").onclick=function(){document.getElementById("readerButton")?.click();};
    edit.addEventListener("input",function(){queuePreview(false);});
    if(chapterTitle)chapterTitle.addEventListener("input",function(){queuePreview(false);});
    document.getElementById("tree")?.addEventListener("click",function(){queuePreview(true);});
    window.addEventListener("resize",function(){if(!panel.hidden)requestAnimationFrame(updatePagination);});

    // Extra paragraph tools preserve the editor selection on pointerdown.
    var group=document.createElement("div");group.className="toolbar-group studio-extra-tools";
    [['formatBlock','blockquote','❝','Цитата'],['indent',null,'→','Увеличить отступ'],['outdent',null,'←','Уменьшить отступ']].forEach(function(spec){
      var button=document.createElement("button");button.type="button";button.className="tool-button";
      button.textContent=spec[2];button.title=spec[3];button.setAttribute("aria-label",spec[3]);
      button.addEventListener("pointerdown",function(e){e.preventDefault();});
      button.addEventListener("click",function(){
        if(edit.getAttribute("contenteditable")==="false")return;
        edit.focus({preventScroll:true});
        document.execCommand(spec[0],false,spec[1]);
        edit.dispatchEvent(new Event("input",{bubbles:true}));
      });
      group.appendChild(button);
    });
    var spacer=toolbar.querySelector(".toolbar-spacer");
    toolbar.insertBefore(group,spacer||null);

    // Cover-layout's existing modal uses its own saved model. Presets update its native fields.
    function enhanceCoverDialog(root){
      if(!root||root.querySelector(".studio-cover-presets"))return;
      var controls=root.querySelector(".cover-design-controls");
      var kind=controls?.querySelector(".cover-design-kind");
      if(!kind)return;
      var bar=document.createElement("div");bar.className="studio-cover-presets";
      bar.innerHTML='<span>Готовые композиции</span><div><button type="button" data-cover-preset="classic">Классика</button><button type="button" data-cover-preset="focus">Акцент</button><button type="button" data-cover-preset="minimal">Минимализм</button></div>';
      kind.before(bar);
      var options={
        classic:{title:{x:50,y:34,size:23,font:"classic"},author:{x:50,y:85,size:11,font:"modern"}},
        focus:{title:{x:50,y:48,size:33,font:"modern"},author:{x:50,y:90,size:12,font:"sans"}},
        minimal:{title:{x:50,y:31,size:20,font:"elegant"},author:{x:50,y:71,size:11,font:"elegant"}}
      };
      bar.querySelectorAll("[data-cover-preset]").forEach(function(button){
        button.onclick=function(){
          var preset=options[button.dataset.coverPreset];
          ["title","author"].forEach(function(k){
            root.querySelector('[data-kind="'+k+'"]').click();
            Object.keys(preset[k]).forEach(function(field){
              var input=root.querySelector('[data-field="'+field+'"]');
              if(input){input.value=preset[k][field];input.dispatchEvent(new Event("input",{bubbles:true}));}
            });
          });
          root.querySelector('[data-kind="title"]').click();
        };
      });
    }
    var originalFont=document.getElementById("editorFontFamily");
    var originalLine=document.getElementById("lineSpacingSelect");
    originalFont?.addEventListener("change",function(){
      if(fonts[originalFont.value] && style.font!==originalFont.value){
        style.font=originalFont.value;writeStyle();queuePreview(false);
      }
    });
    originalLine?.addEventListener("change",function(){
      const n=Number(originalLine.value);
      if(Number.isFinite(n) && n!==style.line){style.line=n;writeStyle();queuePreview(false);}
    });
    window.addEventListener("diamond-editor-fontsize",function(event){
      const n=Number(event.detail?.size);
      if(Number.isFinite(n)&&n>=15&&n<=24&&style.size!==n){style.size=n;writeStyle();queuePreview(false);}
    });
    panel.addEventListener("keydown",function(event){
      if(event.key!=="Tab")return;
      const focusables=Array.from(panel.querySelectorAll('button:not([disabled]),select,input')).filter(function(el){return el.getClientRects().length>0;});
      if(!focusables.length)return;
      const first=focusables[0],last=focusables[focusables.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    });
    var observer=new MutationObserver(function(records){
      records.forEach(function(record){
        record.addedNodes.forEach(function(node){
          if(node.nodeType!==1)return;
          if(node.matches?.(".cover-design-overlay"))enhanceCoverDialog(node);
          node.querySelectorAll?.(".cover-design-overlay").forEach(enhanceCoverDialog);
        });
      });
    });
    observer.observe(document.body,{childList:true});
    applyLive();
  });
})();
