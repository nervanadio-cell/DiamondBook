(function () {
  let dialog = null;

  function makeDialog() {
    if (dialog) return dialog;
    const style = document.createElement("style");
    style.textContent = `
      .cover-overlay{position:fixed;inset:0;z-index:9999;background:rgba(5,6,9,.84);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:16px}
      .cover-overlay[hidden]{display:none!important}.cover-dialog{width:min(1040px,100%);max-height:94vh;overflow:auto;background:#f4efe4;color:#302b23;border:1px solid #c9bda8;border-radius:16px;box-shadow:0 30px 90px #0008;padding:18px}
      .cover-head,.cover-foot{display:flex;align-items:center;justify-content:space-between;gap:12px}.cover-head{border-bottom:1px solid #d8cebd;padding-bottom:12px}.cover-head h2{margin:0;font:28px Georgia,serif}.cover-head p{margin:5px 0 0;color:#746c60;font:13px system-ui}
      .cover-grid{display:grid;grid-template-columns:minmax(0,1fr) 230px;gap:16px;padding:16px 0}.cover-stage{background:#d6d0c4;min-height:300px;border-radius:10px;display:flex;align-items:center;justify-content:center;overflow:hidden}
      #coverCanvas{max-width:100%;max-height:58vh;touch-action:none;cursor:crosshair;display:block}#coverCanvas[hidden]{display:none}.cover-hint{padding:24px;text-align:center;line-height:1.6;color:#625b50}
      .cover-controls{display:flex;flex-direction:column;gap:8px}.cover-dialog button{font:inherit;border:1px solid #d0c4b1;border-radius:8px;background:#e8e0d2;color:#2e2922;padding:10px;cursor:pointer}.cover-dialog button:hover{filter:brightness(.97)}.cover-dialog .cover-primary{background:#8d6e4b;color:#fffaf2;border-color:#8d6e4b;font-weight:700}
      .cover-ratios{display:grid;grid-template-columns:repeat(2,1fr);gap:5px}.cover-ratios button{font-size:12px;padding:8px}.cover-ratios button.active{border-color:#8d6e4b;background:#dfcfb7}
      .cover-preview{aspect-ratio:2/3;background:#e8e0d2;border:1px solid #d0c4b1;border-radius:5px;overflow:hidden;display:flex;align-items:center;justify-content:center;color:#81786b;font-size:12px}.cover-preview img{width:100%;height:100%;object-fit:cover}
      .cover-foot{border-top:1px solid #d8cebd;padding-top:13px;justify-content:flex-end}.cover-note{font:12px/1.5 system-ui;color:#746c60;margin:8px 0 0}
      @media(max-width:700px){.cover-overlay{padding:6px}.cover-dialog{padding:12px;max-height:98vh}.cover-grid{grid-template-columns:1fr;padding:10px 0}.cover-stage{min-height:200px}.cover-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.cover-ratios,.cover-preview{grid-column:1/-1}.cover-head h2{font-size:22px}}
    `;
    document.head.appendChild(style);
    dialog = document.createElement("div");
    dialog.className = "cover-overlay";
    dialog.hidden = true;
    dialog.innerHTML = `
      <section class="cover-dialog" role="dialog" aria-modal="true" aria-labelledby="coverTitle">
        <header class="cover-head"><div><h2 id="coverTitle">Редактор обложки</h2><p>Загрузи фото и выдели нужный фрагмент.</p></div><button type="button" id="coverClose" aria-label="Закрыть">×</button></header>
        <div class="cover-grid"><div><div class="cover-stage"><canvas id="coverCanvas" hidden></canvas><p id="coverHint" class="cover-hint">JPG, PNG, WebP или BMP. GIF и видео не поддерживаются.</p></div><p class="cover-note">Потяни мышью или пальцем, чтобы выбрать кадр. Повторное выделение заменит предыдущий кадр.</p></div>
          <aside class="cover-controls"><input id="coverInput" type="file" accept="image/jpeg,image/png,image/webp,image/bmp,.jpg,.jpeg,.png,.webp,.bmp" hidden><button type="button" id="coverChoose" class="cover-primary">Выбрать фото…</button>
            <div class="cover-ratios"><button type="button" data-ratio="0.6666667" class="active">2:3</button><button type="button" data-ratio="0.75">3:4</button><button type="button" data-ratio="1">1:1</button><button type="button" data-ratio="free">Свободно</button></div>
            <div class="cover-preview" id="coverPreview">Предпросмотр</div><button type="button" id="coverDownload">Скачать JPG</button><button type="button" id="coverRemove">Убрать обложку</button></aside>
        </div>
        <footer class="cover-foot"><button type="button" id="coverCancel">Отмена</button><button type="button" id="coverSave" class="cover-primary">Сохранить обложку</button></footer>
      </section>`;
    document.body.appendChild(dialog);
    return dialog;
  }

  window.openBookCoverEditor = function (bookId, onSaved) {
    const book = typeof getBook === "function" ? getBook(bookId) : null;
    if (!book) { alert("Книга не найдена."); return; }
    const root = makeDialog();
    const canvas = root.querySelector("#coverCanvas");
    const ctx = canvas.getContext("2d");
    const hint = root.querySelector("#coverHint");
    const input = root.querySelector("#coverInput");
    const preview = root.querySelector("#coverPreview");
    let source = null, crop = null, scale = 1, ratio = 2/3, drag = null;

    function makeDataUrl() {
      if (!source || !crop || crop.w < 3 || crop.h < 3) throw new Error("Сначала выбери изображение и выдели область.");
      const sx=crop.x/scale, sy=crop.y/scale, sw=crop.w/scale, sh=crop.h/scale;
      const factor=Math.min(1,1200/sw,1800/sh);
      const out=document.createElement("canvas");
      out.width=Math.max(1,Math.round(sw*factor)); out.height=Math.max(1,Math.round(sh*factor));
      out.getContext("2d").drawImage(source,sx,sy,sw,sh,0,0,out.width,out.height);
      return out.toDataURL("image/jpeg",.92);
    }

    function draw() {
      if (!source) return;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(source,0,0,canvas.width,canvas.height);
      if (crop) {
        ctx.fillStyle="rgba(0,0,0,.58)"; ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(source,crop.x/scale,crop.y/scale,crop.w/scale,crop.h/scale,crop.x,crop.y,crop.w,crop.h);
        ctx.strokeStyle="#f0c891"; ctx.lineWidth=2; ctx.strokeRect(crop.x,crop.y,crop.w,crop.h);
        ctx.strokeStyle="#ffffff88"; ctx.lineWidth=1;
        for(let n=1;n<3;n++){ctx.beginPath();ctx.moveTo(crop.x+crop.w*n/3,crop.y);ctx.lineTo(crop.x+crop.w*n/3,crop.y+crop.h);ctx.stroke();ctx.beginPath();ctx.moveTo(crop.x,crop.y+crop.h*n/3);ctx.lineTo(crop.x+crop.w,crop.y+crop.h*n/3);ctx.stroke();}
      }
      try { preview.innerHTML='<img alt="Предпросмотр обложки" src="'+makeDataUrl()+'">'; } catch { preview.textContent="Предпросмотр"; }
    }

    function newCrop() {
      if (!source) return;
      let w=canvas.width*.86,h=canvas.height*.86;
      if(ratio){if(w/h>ratio)w=h*ratio;else h=w/ratio;}
      crop={x:(canvas.width-w)/2,y:(canvas.height-h)/2,w,h};
      draw();
    }

    function loadData(url) {
      const img=new Image();
      img.onload=()=>{source=img;scale=Math.min(1,780/img.naturalWidth,560/img.naturalHeight);canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));canvas.hidden=false;hint.hidden=true;newCrop();};
      img.onerror=()=>alert("Не удалось открыть изображение.");
      img.src=url;
    }

    function close(){root.hidden=true;drag=null;}
    root.hidden=false;
    if(book.coverDataUrl) loadData(book.coverDataUrl);
    else {source=null;crop=null;canvas.hidden=true;hint.hidden=false;preview.textContent="Предпросмотр";}

    root.querySelector("#coverClose").onclick=close;
    root.querySelector("#coverCancel").onclick=close;
    root.onclick=e=>{if(e.target===root)close();};
    root.querySelector("#coverChoose").onclick=()=>input.click();
    input.onchange=()=>{
      const file=input.files && input.files[0];
      if(!file)return;
      if(!/^image\/(jpeg|png|webp|bmp)$/i.test(file.type)){alert("Выбери фото JPG, PNG, WebP или BMP. GIF и видео не поддерживаются.");input.value="";return;}
      const reader=new FileReader();
      reader.onload=()=>loadData(String(reader.result||""));
      reader.onerror=()=>alert("Не удалось прочитать изображение.");
      reader.readAsDataURL(file);input.value="";
    };
    root.querySelectorAll("[data-ratio]").forEach(button=>button.onclick=()=>{
      root.querySelectorAll("[data-ratio]").forEach(b=>b.classList.remove("active"));
      button.classList.add("active");ratio=button.dataset.ratio==="free"?null:Number(button.dataset.ratio);newCrop();
    });
    function point(e){const rect=canvas.getBoundingClientRect();return{x:(e.clientX-rect.left)*canvas.width/rect.width,y:(e.clientY-rect.top)*canvas.height/rect.height};}
    canvas.onpointerdown=e=>{if(!source)return;e.preventDefault();const p=point(e);drag={x:p.x,y:p.y};crop={x:p.x,y:p.y,w:1,h:1};canvas.setPointerCapture(e.pointerId);draw();};
    canvas.onpointermove=e=>{
      if(!drag||!source)return;
      const p=point(e);
      let w=Math.abs(p.x-drag.x),h=Math.abs(p.y-drag.y);
      w=Math.min(w,canvas.width);h=Math.min(h,canvas.height);
      if(ratio){
        const maxW=Math.min(canvas.width,canvas.height*ratio);
        const maxH=Math.min(canvas.height,canvas.width/ratio);
        w=Math.min(w,maxW);h=Math.min(h,maxH);
        if(!h&&w)h=w/ratio;
        else if(!w&&h)w=h*ratio;
        else if(h>0&&w/h>ratio)h=w/ratio;
        else w=h*ratio;
      }
      w=Math.min(w,canvas.width);h=Math.min(h,canvas.height);
      crop={x:p.x<drag.x?drag.x-w:drag.x,y:p.y<drag.y?drag.y-h:drag.y,w:Math.max(1,w),h:Math.max(1,h)};
      crop.x=Math.max(0,Math.min(crop.x,canvas.width-crop.w));
      crop.y=Math.max(0,Math.min(crop.y,canvas.height-crop.h));
      draw();
    };
    canvas.onpointerup=()=>drag=null;canvas.onpointercancel=()=>drag=null;
    root.querySelector("#coverSave").onclick=()=>{
      try{book.coverDataUrl=makeDataUrl();saveBook(book);document.dispatchEvent(new CustomEvent("bookcoverchange",{detail:{bookId:book.id}}));if(typeof onSaved==="function")onSaved();close();}
      catch(error){alert(error.message||"Не удалось сохранить обложку. Возможно, в браузере закончилось место.");}
    };
    root.querySelector("#coverDownload").onclick=()=>{
      try{const a=document.createElement("a");a.href=makeDataUrl();a.download=(String(book.title||"book").replace(/[\\/:*?"<>|]+/g,"_")||"book")+"_cover.jpg";a.click();}
      catch(error){alert(error.message||"Не удалось создать файл.");}
    };
    root.querySelector("#coverRemove").onclick=()=>{
      if(!confirm("Убрать обложку книги?"))return;
      delete book.coverDataUrl;saveBook(book);source=null;crop=null;canvas.hidden=true;hint.hidden=false;preview.textContent="Предпросмотр";
      document.dispatchEvent(new CustomEvent("bookcoverchange",{detail:{bookId:book.id}}));if(typeof onSaved==="function")onSaved();
    };
  };

  document.addEventListener("DOMContentLoaded",()=>{
    const params=new URLSearchParams(location.search);
    const book=(typeof getBook==="function"&&getBook(params.get("id")))||(typeof getCurrentBook==="function"&&getCurrentBook());
    const actions=document.querySelector(".editor-actions");
    if(book&&actions&&!document.getElementById("coverOpen")) {
      const button=document.createElement("button");button.type="button";button.id="coverOpen";button.className="ghost-button";button.textContent="Обложка";
      button.addEventListener("click",()=>window.openBookCoverEditor(book.id,()=>{const status=document.getElementById("saveStatus");if(status)status.textContent="Обложка сохранена";}));
      actions.insertBefore(button,actions.firstChild);
    }
  });
})();