/* Inline image editing: crop, grayscale/noir, contrast and caption. Works offline. */
(function() {
  const formats=["image/jpeg","image/png","image/webp","image/bmp"];
  let overlay=null;
  function open({src=null,onSave,onDelete=null,initialCaption="",initialAlign="center",initialSize="75"}) {
    overlay?.remove();
    overlay=document.createElement("div");
    overlay.className="book-image-overlay";
    overlay.innerHTML=[
      '<section class="book-image-dialog" role="dialog" aria-modal="true" aria-labelledby="imageDialogTitle">',
      '<header><div><small>DIAMONDBOOK · ИЛЛЮСТРАЦИЯ</small><h2 id="imageDialogTitle">Редактор изображения</h2>',
      '<p>Фото откроется целиком. Для обрезки двигай рамку. Сразу доступен нуар.</p></div><button type="button" data-close aria-label="Закрыть">×</button></header>',
      '<div class="book-image-layout"><div class="book-image-stage">',
      '<div class="book-image-canvas-wrap"><canvas class="book-image-canvas" hidden></canvas><p class="book-image-empty">Выбери изображение JPG, PNG или WebP.</p></div>',
      '<p class="book-image-help">Рамка не сбрасывается от касания. Для обрезки потяни угол.</p></div>',
      '<div class="book-image-controls">',
      '<input class="book-image-input" type="file" accept="image/png,image/jpeg,image/webp,image/bmp,.jpg,.jpeg,.png,.bmp,.webp" hidden>',
      '<button type="button" class="book-image-pick">▧ Выбрать фото</button>',
      '<button type="button" class="book-image-reset">↺ Показать целиком</button>',
      '<label>Пропорции<select data-setting="ratio"><option value="free">Свободно</option><option value="1.5">3:2</option>',
      '<option value="1.333333">4:3</option><option value="1">Квадрат</option><option value="1.7777778">16:9</option></select></label>',
      '<label>Обработка<select data-setting="filter"><option value="original">Оригинал</option><option value="noir">Нуар — контрастный Ч/Б</option>',
      '<option value="mono">Чёрно-белое</option><option value="sepia">Старинное сепия</option></select></label>',
      '<label>Контраст <output class="book-image-contrast-label">100%</output><input data-setting="contrast" type="range" min="65" max="180" step="5" value="100"></label>',
      '<label>Яркость <output class="book-image-brightness-label">100%</output><input data-setting="brightness" type="range" min="60" max="150" step="5" value="100"></label>',
      '<label>Размер в книге<select data-setting="size"><option value="50">Небольшая</option>',
      '<option value="75" selected>Средняя</option><option value="100">На всю страницу</option></select></label>',
      '<label>Подпись (необязательно)<input data-setting="caption" maxlength="160" type="text" placeholder="Например, Иллюстрация к главе 2"></label>',
      '<label>Расположение<select data-setting="align"><option value="center">По центру</option><option value="left">По левому краю</option>',
      '<option value="right">По правому краю</option></select></label>',
      '<p class="book-image-storage-hint">Готовое изображение сжимается для локальной библиотеки.</p>',
      '</div></div><footer><button type="button" data-close>Отмена</button>',
      '<button type="button" class="book-image-delete" hidden>⌫ Удалить из главы</button>',
      '<button type="button" class="book-image-insert">✓ Вставить в главу</button></footer></section>'
    ].join("");
    document.body.appendChild(overlay);
    const deleteButton=overlay.querySelector(".book-image-delete");
    if(onDelete) {
      deleteButton.hidden=false;
      deleteButton.addEventListener("click",()=>{
        if(!confirm("Удалить иллюстрацию из главы?"))return;
        onDelete();
        close();
      });
    }
    const canvas=overlay.querySelector(".book-image-canvas");
    const context=canvas.getContext("2d",{willReadFrequently:false});
    const fileInput=overlay.querySelector(".book-image-input");
    const pick=overlay.querySelector(".book-image-pick");
    const empty=overlay.querySelector(".book-image-empty");
    const ratioInput=overlay.querySelector('[data-setting="ratio"]');
    const filterInput=overlay.querySelector('[data-setting="filter"]');
    const contrastInput=overlay.querySelector('[data-setting="contrast"]');
    const brightnessInput=overlay.querySelector('[data-setting="brightness"]');
    const captionInput=overlay.querySelector('[data-setting="caption"]');
    const alignInput=overlay.querySelector('[data-setting="align"]');
    const sizeInput=overlay.querySelector('[data-setting="size"]');
    captionInput.value=initialCaption;
    alignInput.value=["left","center","right"].includes(initialAlign)?initialAlign:"center";
    sizeInput.value=["50","75","100"].includes(String(initialSize))?String(initialSize):"75";
    let image=null,crop=null,scale=1,drag=null,objectUrl=null;
    function close() {
      document.removeEventListener("keydown",onKey);
      if(objectUrl)URL.revokeObjectURL(objectUrl);
      overlay.remove();
      overlay=null;
    }
    function onKey(event){if(event.key==="Escape"){event.preventDefault();close();}}
    document.addEventListener("keydown",onKey);
    overlay.querySelectorAll("[data-close]").forEach(el=>el.addEventListener("click",close));
    overlay.addEventListener("click",event=>{if(event.target===overlay)close();});
    pick.addEventListener("click",()=>fileInput.click());
    overlay.querySelector(".book-image-reset").addEventListener("click",resetCrop);
    function filterCSS(){
      const filters={
        original:"",
        mono:"grayscale(1)",
        noir:"grayscale(1) contrast(1.55) brightness(.86)",
        sepia:"sepia(.82) saturate(.75)"
      };
      return (filters[filterInput.value]||"")+" contrast("+contrastInput.value+"%) brightness("+brightnessInput.value+"%)";
    }
    function ratioValue(){return ratioInput.value==="free"?null:Number(ratioInput.value);}
    function resetCrop(){
      if(!image)return;
      const ratio=ratioValue();let w=canvas.width,h=canvas.height;
      if(ratio){if(w/h>ratio)w=h*ratio;else h=w/ratio;}
      crop={x:(canvas.width-w)/2,y:(canvas.height-h)/2,w,h};
      draw();
    }
    function draw(){
      if(!image)return;
      const w=canvas.width,h=canvas.height;
      context.save();
      context.clearRect(0,0,w,h);
      context.filter=filterCSS();
      context.drawImage(image,0,0,w,h);
      context.filter="none";
      if(crop){
        context.fillStyle="rgba(0,0,0,.62)";
        context.fillRect(0,0,w,h);
        context.save();
        context.beginPath();context.rect(crop.x,crop.y,crop.w,crop.h);context.clip();
        context.filter=filterCSS();
        context.drawImage(image,0,0,w,h);
        context.restore();
        context.strokeStyle="#f1ce96";context.lineWidth=2;
        context.strokeRect(crop.x,crop.y,crop.w,crop.h);
        context.fillStyle="#ffdc9e";
        for(const [x,y] of [[crop.x,crop.y],[crop.x+crop.w,crop.y],[crop.x,crop.y+crop.h],[crop.x+crop.w,crop.y+crop.h]])
          context.fillRect(x-5,y-5,10,10);
      }
      context.restore();
    }
    function loadURL(url) {
      const img=new Image();
      img.onload=()=>{
        image=img;scale=Math.min(1,720/img.naturalWidth,500/img.naturalHeight);
        canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
        canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
        canvas.hidden=false;empty.hidden=true;
        resetCrop();
      };
      img.onerror=()=>window.alert("Не удалось открыть изображение.");
      img.src=url;
    }
    fileInput.addEventListener("change",()=>{
      const file=fileInput.files?.[0];fileInput.value="";
      if(!file)return;
      if(file.size>22*1024*1024){alert("Выбери изображение размером до 22 МБ.");return;}
      if(!formats.includes(file.type)){alert("Поддерживаются JPG, PNG, WebP и BMP.");return;}
      if(objectUrl)URL.revokeObjectURL(objectUrl);
      objectUrl=URL.createObjectURL(file);loadURL(objectUrl);
    });
    if(src&&/^data:image\/(?:jpeg|png|webp);base64,/.test(src))loadURL(src);
    else fileInput.click();
    for(const input of [filterInput,contrastInput,brightnessInput])input.addEventListener("input",()=>{
      overlay.querySelector(".book-image-contrast-label").textContent=contrastInput.value+"%";
      overlay.querySelector(".book-image-brightness-label").textContent=brightnessInput.value+"%";
      draw();
    });
    ratioInput.addEventListener("change",()=>{
      if(!crop){resetCrop();return;}
      const ratio=ratioValue();if(!ratio){draw();return;}
      const cx=crop.x+crop.w/2,cy=crop.y+crop.h/2;
      let w=Math.min(crop.w,canvas.width),h=w/ratio;
      if(h>crop.h){h=crop.h;w=h*ratio;}
      if(h>canvas.height){h=canvas.height;w=h*ratio;}
      w=Math.max(1,Math.min(w,canvas.width));h=Math.max(1,Math.min(h,canvas.height));
      crop={x:Math.max(0,Math.min(canvas.width-w,cx-w/2)),
        y:Math.max(0,Math.min(canvas.height-h,cy-h/2)),w,h};
      draw();
    });
    function point(event){
      const r=canvas.getBoundingClientRect();
      return{x:(event.clientX-r.left)*canvas.width/r.width,
        y:(event.clientY-r.top)*canvas.height/r.height};
    }
    const clamp=(a,lo,hi)=>Math.min(hi,Math.max(lo,a));
    canvas.addEventListener("pointerdown",event=>{
      if(!image)return;
      event.preventDefault();const p=point(event),handle=Math.max(12,canvas.width/35);
      const corners=crop?[["nw",crop.x,crop.y],["ne",crop.x+crop.w,crop.y],
        ["sw",crop.x,crop.y+crop.h],["se",crop.x+crop.w,crop.y+crop.h]]:[];
      const corner=corners.find(([,x,y])=>Math.abs(x-p.x)<handle&&Math.abs(y-p.y)<handle);
      const inside=crop&&p.x>=crop.x&&p.x<=crop.x+crop.w&&p.y>=crop.y&&p.y<=crop.y+crop.h;
      if(corner)drag={mode:"resize",which:corner[0],start:p,old:{...crop}};
      else if(inside)drag={mode:"move",start:p,old:{...crop}};
      else drag={mode:"pending",start:p,old:crop?{...crop}:null};
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointermove",event=>{
      if(!drag||!image)return;
      const p=point(event),w=canvas.width,h=canvas.height;
      if(drag.mode==="pending"){
        if(Math.hypot(p.x-drag.start.x,p.y-drag.start.y)<10)return;
        drag.mode="new";
      }
      if(drag.mode==="move"){
        crop.x=clamp(drag.old.x+p.x-drag.start.x,0,w-crop.w);
        crop.y=clamp(drag.old.y+p.y-drag.start.y,0,h-crop.h);
      }else{
        let x1,y1,x2,y2;
        if(drag.mode==="new"){
          x1=drag.start.x;y1=drag.start.y;x2=p.x;y2=p.y;
        }else{
          const old=drag.old; x1=old.x; y1=old.y;x2=old.x+old.w;y2=old.y+old.h;
          if(drag.which.includes("w"))x1=p.x;
          if(drag.which.includes("e"))x2=p.x;
          if(drag.which.includes("n"))y1=p.y;
          if(drag.which.includes("s"))y2=p.y;
        }
        let left=clamp(Math.min(x1,x2),0,w-1),top=clamp(Math.min(y1,y2),0,h-1);
        let cw=clamp(Math.abs(x2-x1),1,w-left),ch=clamp(Math.abs(y2-y1),1,h-top);
        const ratio=ratioValue();
        if(ratio){
          if(cw/ch>ratio)cw=ch*ratio;else ch=cw/ratio;
          cw=Math.min(cw,w-left);ch=Math.min(ch,h-top);
        }
        crop={x:left,y:top,w:cw,h:ch};
      }
      draw();
    });
    canvas.addEventListener("pointerup",()=>drag=null);
    canvas.addEventListener("pointercancel",()=>drag=null);
    overlay.querySelector(".book-image-insert").addEventListener("click",()=>{
      if(!image||!crop||crop.w<10||crop.h<10){alert("Сначала выбери фото и область.");return;}
      try{
        const sw=crop.w/scale,sh=crop.h/scale;
        const factor=Math.min(1,1000/sw,800/sh);
        const out=document.createElement("canvas");
        out.width=Math.max(1,Math.round(sw*factor));
        out.height=Math.max(1,Math.round(sh*factor));
        const ctx=out.getContext("2d");
        ctx.filter=filterCSS();
        ctx.drawImage(image,crop.x/scale,crop.y/scale,sw,sh,0,0,out.width,out.height);
        const dataUrl=out.toDataURL("image/jpeg",.78);
        onSave?.({src:dataUrl,caption:captionInput.value.trim(),align:alignInput.value,size:Number(sizeInput.value) || 75});
        close();
      }catch(error){alert(error.message||"Не удалось обработать фото.");}
    });
  }
  window.DiamondImageEditor={open};
})();