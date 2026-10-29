/* Individual title placement is serialized in book.coverDesign. */
(function() {
  const FONTS = {
    classic:"Georgia, serif",
    elegant:"'Palatino Linotype', Palatino, Georgia, serif",
    modern:"'Trebuchet MS', Arial, sans-serif",
    sans:"Arial, Helvetica, sans-serif",
    mono:"'Courier New', Courier, monospace",
    garamond:"Garamond, 'Times New Roman', serif",
    baskerville:"Baskerville, Georgia, serif",
    cambria:"Cambria, Georgia, serif",
    bookman:"'Bookman Old Style', Georgia, serif",
    times:"'Times New Roman', Times, serif",
    verdana:"Verdana, sans-serif",
    tahoma:"Tahoma, sans-serif",
    century:"'Century Gothic', 'Trebuchet MS', sans-serif",
    impact:"Impact, 'Arial Narrow', sans-serif",
    handwriting:"'Segoe Print', 'Comic Sans MS', cursive"
  };
  const DEFAULT = { title:{x:50,y:34,size:23,opacity:1,font:"classic",color:"#fff4d8"},author:{x:50,y:85,size:11,opacity:.93,font:"modern",color:"#fff4d8"} };
  const clamp = (value,min,max,fallback) => {const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;};
  function normalize(data) {
    const result={};
    for(const key of ["title","author"]) {
      const part=data && typeof data[key]==="object" && data[key] ? data[key]:{};
      const def=DEFAULT[key];
      result[key]={x:clamp(part.x,10,90,def.x),y:clamp(part.y,9,91,def.y),size:clamp(part.size,9,40,def.size),
        opacity:clamp(part.opacity,.2,1,def.opacity),font:Object.hasOwn(FONTS,part.font)?part.font:def.font,
        color:/^#[0-9a-fA-F]{6}$/.test(part.color||"")?part.color:def.color};
    }
    return result;
  }
  function apply(face,data) {
    if(!face)return;
    const d=normalize(data);
    face.classList.add("diamond-cover-face");
    for(const kind of ["title","author"]) {
      const el=face.querySelector(kind==="title"?".book-cover-title, #previewTitle, .cover-design-title":".book-cover-author, #previewAuthor, .cover-design-author");
      if(!el)continue;
      const p=d[kind];
      // cqw ensures exact proportional typography in the cover editor, bookshelf
      // and new-book preview rather than copying a fixed 23px onto a 150px cover.
      Object.assign(el.style,{
        position:"absolute",left:p.x+"%",top:p.y+"%",transform:"translate(-50%, -50%)",
        maxWidth:"86%",width:"max-content",overflowWrap:"anywhere",whiteSpace:"normal",
        textAlign:"center",fontSize:(p.size/2.65).toFixed(3)+"cqw",
        lineHeight:"1.17",opacity:String(p.opacity),fontFamily:FONTS[p.font],color:p.color,zIndex:"4"
      });
    }
    const title=face.querySelector(".book-cover-title, #previewTitle, .cover-design-title");
    const author=face.querySelector(".book-cover-author, #previewAuthor, .cover-design-author");
    if(!title||!author)return;
    // Keep the title and author readable even if the two anchors were placed
    // close together. Apply the same rule to every cover representation.
    const separate=()=>{
      if(!face.isConnected || !title.isConnected)return;
      author.style.top=d.author.y+"%";
      title.style.top=d.title.y+"%";
      const a=author.getBoundingClientRect(),t=title.getBoundingClientRect(),f=face.getBoundingClientRect();
      if(!f.height || !a.height || !t.height || t.bottom+4<a.top || a.bottom+4<t.top)return;
      const gap=Math.max(5,f.width*.025);
      if(d.author.y>=d.title.y){
        const y=100*(t.bottom+gap+a.height/2-f.top)/f.height;
        author.style.top=Math.min(93,y)+"%";
      }else{
        const y=100*(a.bottom+gap+t.height/2-f.top)/f.height;
        title.style.top=Math.min(91,y)+"%";
      }
    };
    separate();
    // Fonts can settle after the current layout or a resize.
    requestAnimationFrame(separate);
  }
  function openPanel(opts) {
    document.querySelector(".cover-design-overlay")?.remove();
    let value=normalize(opts.design),selected="title",drag=null;
    const overlay=document.createElement("div");
    overlay.className="cover-design-overlay";
    overlay.innerHTML=[
      '<section class="cover-design-dialog" role="dialog" aria-modal="true" aria-labelledby="coverDesignHeading">',
      '<header><div><small>ОФОРМЛЕНИЕ КНИГИ</small><h2 id="coverDesignHeading">Надписи на обложке</h2>',
      '<p>15 шрифтов, прозрачность и свободное расположение. Если надписи близко, они автоматически раздвинутся.</p></div>',
      '<button type="button" class="cover-design-close" aria-label="Закрыть">×</button></header>',
      '<div class="cover-design-layout"><div class="cover-design-stage"><div class="cover-design-face">',
      '<span class="cover-design-title" tabindex="0" role="button" aria-label="Переместить название"></span>',
      '<span class="cover-design-author" tabindex="0" role="button" aria-label="Переместить автора"></span>',
      '</div><p>Перетащи надпись мышью или пальцем. Стрелки тоже работают.</p></div>',
      '<form class="cover-design-controls" onsubmit="return false">',
      '<div class="cover-design-kind"><button type="button" data-kind="title">Название</button><button type="button" data-kind="author">Автор</button></div>',
      '<label>Шрифт<select data-field="font"><option value="classic">Книжный — Georgia</option><option value="elegant">Palatino</option>',
      '<option value="garamond">Garamond</option><option value="baskerville">Baskerville</option><option value="cambria">Cambria</option>',
      '<option value="bookman">Bookman</option><option value="times">Times</option><option value="modern">Trebuchet</option>',
      '<option value="sans">Arial</option><option value="verdana">Verdana</option><option value="tahoma">Tahoma</option>',
      '<option value="century">Century Gothic</option><option value="impact">Impact</option><option value="handwriting">Рукописный</option>',
      '<option value="mono">Печатная машинка</option></select></label>',
      '<label>Цвет надписи<input data-field="color" type="color" aria-label="Цвет надписи" value="#fff4d8"></label>',
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
      for(const name of ["font","color","size","opacity","x","y"]) {
        overlay.querySelector('[data-field="'+name+'"]').value=s[name];
      }
      overlay.querySelector('[data-output="size"]').textContent=s.size+" (масштаб)";
      overlay.querySelector('[data-output="opacity"]').textContent=Math.round(s.opacity*100)+"%";
      overlay.querySelector('[data-output="x"]').textContent=Math.round(s.x)+"%";
      overlay.querySelector('[data-output="y"]').textContent=Math.round(s.y)+"%";
      overlay.querySelectorAll("[data-kind]").forEach(el=>el.classList.toggle("active",el.dataset.kind===selected));
      paint();
    }
    overlay.querySelectorAll("[data-kind]").forEach(btn=>btn.addEventListener("click",()=>{selected=btn.dataset.kind;sync();}));
    overlay.querySelectorAll("[data-field]").forEach(input=>input.addEventListener("input",()=>{
      const name=input.dataset.field;
      value[selected][name]=(name==="font" || name==="color")?input.value:Number(input.value);
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