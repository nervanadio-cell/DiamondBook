/* Individual title placement is serialized in book.coverDesign. */
(function() {
  const FONTS = { classic:"Georgia, serif", elegant:"Palatino, Georgia, serif", modern:"Trebuchet MS, Arial, sans-serif", sans:"Arial, sans-serif", mono:"Courier New, monospace" };
  const DEFAULT = { title:{x:50,y:34,size:23,opacity:1,font:"classic"},author:{x:50,y:85,size:11,opacity:.93,font:"modern"} };
  const clamp = (value,min,max,fallback) => {const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;};
  function normalize(data) {
    const result={};
    for(const key of ["title","author"]) {
      const part=data && typeof data[key]==="object" && data[key] ? data[key]:{};
      const def=DEFAULT[key];
      result[key]={x:clamp(part.x,10,90,def.x),y:clamp(part.y,9,91,def.y),size:clamp(part.size,9,40,def.size),
        opacity:clamp(part.opacity,.2,1,def.opacity),font:Object.hasOwn(FONTS,part.font)?part.font:def.font};
    }
    return result;
  }
  function apply(face,data) {
    if(!face)return;
    const normalized=normalize(data);
    for(const kind of ["title","author"]) {
      const el=face.querySelector(kind==="title"?".book-cover-title, #previewTitle, .cover-design-title":".book-cover-author, #previewAuthor, .cover-design-author");
      if(!el)continue;
      const s=normalized[kind];
      Object.assign(el.style,{position:"absolute",left:s.x+"%",top:s.y+"%",transform:"translate(-50%, -50%)",
        maxWidth:"90%",width:"max-content",overflowWrap:"anywhere",textAlign:"center",fontSize:s.size+"px",
        lineHeight:"1.14",opacity:String(s.opacity),fontFamily:FONTS[s.font],zIndex:"4"});
    }
  }
  function openPanel(opts) {
    document.querySelector(".cover-design-overlay")?.remove();
    let value=normalize(opts.design),selected="title",drag=null;
    const overlay=document.createElement("div");
    overlay.className="cover-design-overlay";
    overlay.innerHTML=[
      '<section class="cover-design-dialog" role="dialog" aria-modal="true" aria-labelledby="coverDesignHeading">',
      '<header><div><small>ОФОРМЛЕНИЕ КНИГИ</small><h2 id="coverDesignHeading">Надписи на обложке</h2>',
      '<p>Меняй шрифт, прозрачность и расположение названия или автора.</p></div>',
      '<button type="button" class="cover-design-close" aria-label="Закрыть">×</button></header>',
      '<div class="cover-design-layout"><div class="cover-design-stage"><div class="cover-design-face">',
      '<span class="cover-design-title" tabindex="0" role="button" aria-label="Переместить название"></span>',
      '<span class="cover-design-author" tabindex="0" role="button" aria-label="Переместить автора"></span>',
      '</div><p>Перетащи надпись мышью или пальцем. Стрелки тоже работают.</p></div>',
      '<form class="cover-design-controls" onsubmit="return false">',
      '<div class="cover-design-kind"><button type="button" data-kind="title">Название</button><button type="button" data-kind="author">Автор</button></div>',
      '<label>Шрифт<select data-field="font"><option value="classic">Книжный</option><option value="elegant">Изящный</option>',
      '<option value="modern">Современный</option><option value="sans">Простой</option><option value="mono">Печатный</option></select></label>',
      '<label>Размер <output data-output="size"></output><input data-field="size" type="range" min="9" max="40" step="1"></label>',
      '<label>Прозрачность <output data-output="opacity"></output><input data-field="opacity" type="range" min=".2" max="1" step=".05"></label>',
      '<label>По горизонтали <output data-output="x"></output><input data-field="x" type="range" min="10" max="90" step="1"></label>',
      '<label>По вертикали <output data-output="y"></output><input data-field="y" type="range" min="9" max="91" step="1"></label>',
      '<button type="button" class="cover-design-reset">Сбросить выбранную надпись</button></form></div>',
      '<footer><button type="button" class="cover-design-cancel">Отмена</button>',
      '<button type="button" class="cover-design-save">✓ Сохранить оформление</button></footer></section>'
    ].join("");
    document.body.appendChild(overlay);
    const face=overlay.querySelector(".cover-design-face");
    face.querySelector(".cover-design-title").textContent=opts.title||"Название книги";
    face.querySelector(".cover-design-author").textContent=opts.author||"Без автора";
    if(opts.image && /^data:image\/(?:png|jpeg|webp);base64,/.test(opts.image)) {
      face.style.backgroundImage='linear-gradient(transparent,rgba(0,0,0,.35)),url("'+opts.image+'")';
      face.style.backgroundSize="cover";
      face.style.backgroundPosition="center";
    }
    function paint() {
      apply(face,value);
      face.querySelectorAll(".cover-design-title,.cover-design-author").forEach(el=>{
        el.classList.toggle("selected",el.classList.contains("cover-design-"+selected));
      });
    }
    function sync() {
      const s=value[selected];
      for(const name of ["font","size","opacity","x","y"]) {
        overlay.querySelector('[data-field="'+name+'"]').value=s[name];
      }
      overlay.querySelector('[data-output="size"]').textContent=s.size+" px";
      overlay.querySelector('[data-output="opacity"]').textContent=Math.round(s.opacity*100)+"%";
      overlay.querySelector('[data-output="x"]').textContent=Math.round(s.x)+"%";
      overlay.querySelector('[data-output="y"]').textContent=Math.round(s.y)+"%";
      overlay.querySelectorAll("[data-kind]").forEach(el=>el.classList.toggle("active",el.dataset.kind===selected));
      paint();
    }
    overlay.querySelectorAll("[data-kind]").forEach(btn=>btn.addEventListener("click",()=>{selected=btn.dataset.kind;sync();}));
    overlay.querySelectorAll("[data-field]").forEach(input=>input.addEventListener("input",()=>{
      const name=input.dataset.field;
      value[selected][name]=name==="font"?input.value:Number(input.value);
      sync();
    }));
    overlay.querySelector(".cover-design-reset").onclick=()=>{value[selected]={...DEFAULT[selected]};sync();};
    face.querySelectorAll(".cover-design-title,.cover-design-author").forEach(el=>{
      const kind=el.classList.contains("cover-design-title")?"title":"author";
      el.addEventListener("pointerdown",event=>{
        event.preventDefault();selected=kind;drag={id:event.pointerId,kind};
        el.setPointerCapture(event.pointerId);sync();
      });
      el.addEventListener("pointermove",event=>{
        if(!drag||drag.id!==event.pointerId||drag.kind!==kind)return;
        const rect=face.getBoundingClientRect();
        value[kind].x=clamp(100*(event.clientX-rect.left)/rect.width,10,90,50);
        value[kind].y=clamp(100*(event.clientY-rect.top)/rect.height,9,91,50);
        sync();
      });
      el.addEventListener("pointerup",()=>drag=null);
      el.addEventListener("pointercancel",()=>drag=null);
      el.addEventListener("keydown",event=>{
        if(!event.key.startsWith("Arrow"))return;
        event.preventDefault();selected=kind;
        value[kind].x=clamp(value[kind].x+(event.key==="ArrowRight"?1:event.key==="ArrowLeft"?-1:0),10,90,50);
        value[kind].y=clamp(value[kind].y+(event.key==="ArrowDown"?1:event.key==="ArrowUp"?-1:0),9,91,50);
        sync();
      });
    });
    function close() {document.removeEventListener("keydown",escape);overlay.remove();}
    function escape(event){if(event.key==="Escape")close();}
    overlay.querySelector(".cover-design-close").onclick=close;
    overlay.querySelector(".cover-design-cancel").onclick=close;
    overlay.addEventListener("click",event=>{if(event.target===overlay)close();});
    overlay.querySelector(".cover-design-save").onclick=()=>{
      try {opts.save(normalize(value));close();}
      catch(error){alert(error.message||"Не удалось сохранить стиль.");}
    };
    document.addEventListener("keydown",escape);
    sync();
  }
  let draft=normalize();
  window.DiamondCoverDesign={
    normalize,apply,
    openBook(id,onSaved) {
      const book=getBook(id);
      if(!book){alert("Книга не найдена.");return;}
      openPanel({title:book.title,author:book.author,image:book.coverDataUrl,design:book.coverDesign,save(design){
        book.coverDesign=design;saveBook(book);
        document.dispatchEvent(new CustomEvent("bookcoverchange",{detail:{bookId:id}}));
        onSaved?.();
      }});
    },
    openDraft(title,author) {
      openPanel({title,author,design:draft,save(design){draft=design;window.dispatchEvent(new Event("diamond-cover-draft-change"));}});
    },
    getDraft(){return normalize(draft);}
  };
})();