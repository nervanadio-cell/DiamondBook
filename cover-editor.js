document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  const book = getBook(params.get("id")) || getCurrentBook();
  const actions = document.querySelector(".editor-actions");
  if (!book || !actions || document.getElementById("coverOpen")) return;

  const css = document.createElement("style");
  css.textContent = `
  .cover-overlay{position:fixed;inset:0;z-index:9999;background:#050609dd;display:flex;align-items:center;justify-content:center;padding:16px}
  .cover-overlay[hidden]{display:none}.cover-dialog{width:min(1050px,100%);max-height:95vh;overflow:auto;background:#151820;color:#f1f0eb;border:1px solid #ffffff20;border-radius:18px;padding:18px}
  .cover-grid{display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:16px}.cover-stage{background:#090b0f;min-height:300px;display:flex;align-items:center;justify-content:center;border-radius:12px;overflow:hidden}
  #coverCanvas{max-width:100%;max-height:58vh;touch-action:none;cursor:crosshair} .cover-controls{display:flex;flex-direction:column;gap:8px}
  .cover-dialog button{border:1px solid #ffffff20;border-radius:9px;background:#252a35;color:#fff;padding:10px;cursor:pointer}.cover-dialog .cover-main{background:#d7b486;color:#17120c;font-weight:700}
  .cover-ratios{display:grid;grid-template-columns:repeat(2,1fr);gap:5px}.cover-ratios button.active{border-color:#d7b486;color:#e6c79c}
  .cover-preview{aspect-ratio:2/3;background:#0b0d12;border:1px solid #ffffff20;border-radius:7px;overflow:hidden;display:flex;align-items:center;justify-content:center;color:#888;font-size:12px}.cover-preview img{width:100%;height:100%;object-fit:cover}
  @media(max-width:650px){.cover-grid{grid-template-columns:1fr}.cover-controls{display:grid;grid-template-columns:1fr 1fr}.cover-ratios,.cover-preview{grid-column:1/-1}}
  `;
  document.head.appendChild(css);

  const open = document.createElement("button");
  open.id = "coverOpen"; open.className = "ghost-button"; open.textContent = "Обложка";
  actions.insertBefore(open, actions.firstChild);

  const overlay = document.createElement("div");
  overlay.className = "cover-overlay"; overlay.hidden = true;
  overlay.innerHTML = `<section class="cover-dialog" role="dialog" aria-modal="true">
    <header style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><h2 style="margin:0;font:26px Georgia,serif">Редактор обложки</h2><p style="color:#999;font-size:13px">Выбери фото и выдели нужную область.</p></div><button id="coverClose">✕</button></header>
    <div class="cover-grid" style="margin-top:14px"><div><div class="cover-stage"><canvas id="coverCanvas" hidden></canvas><p id="coverHint">Загрузи фото JPG, PNG, WebP или BMP. GIF и видео не поддерживаются.</p></div><p style="color:#999;font-size:12px">Перетаскивай выделение мышью или пальцем. Выделение можно создать заново в любом месте.</p></div>
    <aside class="cover-controls"><input id="coverInput" type="file" accept="image/jpeg,image/png,image/webp,image/bmp,.jpg,.jpeg,.png,.webp,.bmp" hidden><button id="coverChoose" class="cover-main">Выбрать фото…</button>
    <div class="cover-ratios"><button data-ratio="0.6666667" class="active">2:3</button><button data-ratio="0.75">3:4</button><button data-ratio="1">1:1</button><button data-ratio="free">Свободно</button></div>
    <div id="coverPreview" class="cover-preview">Предпросмотр</div><button id="coverDownload">Скачать JPG</button><button id="coverRemove">Убрать обложку</button></aside></div>
    <footer style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button id="coverCancel">Отмена</button><button id="coverSave" class="cover-main">Сохранить</button></footer></section>`;
  document.body.appendChild(overlay);

  const canvas = overlay.querySelector("#coverCanvas"), ctx = canvas.getContext("2d");
  const hint = overlay.querySelector("#coverHint"), input = overlay.querySelector("#coverInput"), preview = overlay.querySelector("#coverPreview");
  let image = null, crop = null, ratio = 2/3, scale = 1, start = null;

  function cropData() {
    if (!image || !crop || crop.w < 3 || crop.h < 3) throw new Error("Сначала выбери фото и выдели область.");
    const out = document.createElement("canvas");
    const sx=crop.x/scale, sy=crop.y/scale, sw=crop.w/scale, sh=crop.h/scale;
    const factor=Math.min(1,1200/sw,1800/sh);
    out.width=Math.max(1,Math.round(sw*factor)); out.height=Math.max(1,Math.round(sh*factor));
    out.getContext("2d").drawImage(image,sx,sy,sw,sh,0,0,out.width,out.height);
    return out.toDataURL("image/jpeg",.92);
  }
  function draw() {
    if (!image) return;
    ctx.clearRect(0,0,canvas.width,canvas.height); ctx.drawImage(image,0,0,canvas.width,canvas.height);
    if(crop){ctx.fillStyle="#0009";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,crop.x/scale,crop.y/scale,crop.w/scale,crop.h/scale,crop.x,crop.y,crop.w,crop.h);ctx.strokeStyle="#f0c891";ctx.lineWidth=2;ctx.strokeRect(crop.x,crop.y,crop.w,crop.h);}
    try { preview.innerHTML='<img alt="Предпросмотр обложки" src="'+cropData()+'">'; } catch { preview.textContent="Предпросмотр"; }
  }
  function fitCrop() {
    if(!image)return;
    let w=canvas.width*.82,h=canvas.height*.82;
    if(ratio){if(w/h>ratio)w=h*ratio;else h=w/ratio;}
    crop={x:(canvas.width-w)/2,y:(canvas.height-h)/2,w,h};draw();
  }
  function loadData(url) {
    const next = new Image();
    next.onload=()=>{image=next;scale=Math.min(1,760/next.naturalWidth,520/next.naturalHeight);canvas.width=Math.round(next.naturalWidth*scale);canvas.height=Math.round(next.naturalHeight*scale);canvas.hidden=false;hint.hidden=true;fitCrop();};
    next.onerror=()=>alert("Не удалось открыть изображение.");
    next.src=url;
  }
  function close(){overlay.hidden=true;start=null;}
  function show(){overlay.hidden=false;if(book.coverDataUrl)loadData(book.coverDataUrl);else{image=null;crop=null;canvas.hidden=true;hint.hidden=false;preview.textContent="Предпросмотр";}}
  open.addEventListener("click",show);
  overlay.querySelector("#coverClose").addEventListener("click",close);
  overlay.querySelector("#coverCancel").addEventListener("click",close);
  overlay.addEventListener("click",e=>{if(e.target===overlay)close();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!overlay.hidden)close();});
  overlay.querySelector("#coverChoose").addEventListener("click",()=>input.click());
  input.addEventListener("change",()=>{
    const file=input.files&&input.files[0]; if(!file)return;
    if(!/^image\/(jpeg|png|webp|bmp)$/i.test(file.type)){alert("Подойдут JPG, PNG, WebP или BMP. GIF и видео не поддерживаются.");input.value="";return;}
    const reader=new FileReader();reader.onload=()=>loadData(String(reader.result));reader.onerror=()=>alert("Не удалось прочитать файл.");reader.readAsDataURL(file);input.value="";
  });
  overlay.querySelectorAll("[data-ratio]").forEach(b=>b.addEventListener("click",()=>{overlay.querySelectorAll("[data-ratio]").forEach(x=>x.classList.remove("active"));b.classList.add("active");ratio=b.dataset.ratio==="free"?null:Number(b.dataset.ratio);fitCrop();}));
  function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height};}
  canvas.addEventListener("pointerdown",e=>{if(!image)return;const p=point(e);start=p;crop={x:p.x,y:p.y,w:1,h:1};canvas.setPointerCapture(e.pointerId);draw();});
  canvas.addEventListener("pointermove",e=>{if(!start)return;const p=point(e);let w=Math.abs(p.x-start.x),h=Math.abs(p.y-start.y);if(ratio){if(w/h>ratio)w=h*ratio;else h=w/ratio;}crop={x:p.x<start.x?start.x-w:start.x,y:p.y<start.y?start.y-h:start.y,w:Math.max(1,w),h:Math.max(1,h)};crop.x=Math.max(0,Math.min(crop.x,canvas.width-crop.w));crop.y=Math.max(0,Math.min(crop.y,canvas.height-crop.h));draw();});
  canvas.addEventListener("pointerup",()=>{start=null;});canvas.addEventListener("pointercancel",()=>{start=null;});
  overlay.querySelector("#coverSave").addEventListener("click",()=>{try{book.coverDataUrl=cropData();saveBook(book);const status=document.getElementById("saveStatus");if(status)status.textContent="Обложка сохранена";close();}catch(e){alert(e.message||"Не удалось сохранить обложку.");}});
  overlay.querySelector("#coverDownload").addEventListener("click",()=>{try{const a=document.createElement("a");a.href=cropData();a.download=(book.title||"book").replace(/[\\/:*?"<>|]+/g,"_")+"_cover.jpg";a.click();}catch(e){alert(e.message);}});
  overlay.querySelector("#coverRemove").addEventListener("click",()=>{if(!confirm("Убрать обложку книги?"))return;delete book.coverDataUrl;saveBook(book);image=null;crop=null;canvas.hidden=true;hint.hidden=false;preview.textContent="Предпросмотр";});
});