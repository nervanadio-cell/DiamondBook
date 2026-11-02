/* Cinematic interactive library: atmospheric light, grounded featured books. */
document.addEventListener("DOMContentLoaded",()=>{
  const hero=document.querySelector(".cinema-hero");
  if(hero&&window.matchMedia("(pointer:fine) and (prefers-reduced-motion:no-preference)").matches){
    let pending=false;
    hero.addEventListener("pointermove",e=>{
      if(pending)return;pending=true;
      requestAnimationFrame(()=>{
        const rect=hero.getBoundingClientRect();
        const x=(e.clientX-rect.left)/rect.width-.5;
        const y=(e.clientY-rect.top)/rect.height-.5;
        hero.style.setProperty("--scene-x",(x*8).toFixed(2)+"px");
        hero.style.setProperty("--scene-y",(y*5).toFixed(2)+"px");
        pending=false;
      });
    },{passive:true});
    hero.addEventListener("pointerleave",()=>{hero.style.setProperty("--scene-x","0px");hero.style.setProperty("--scene-y","0px");});
  }
  const target=document.getElementById("featuredBooks");
  if(!target)return;
  function coverGood(x){return typeof x==="string"&&/^data:image\/(?:png|jpe?g|webp);base64,/.test(x);}
  function renderFeatured(books,publicBooks){
    target.replaceChildren();
    const shown=(books||[]).slice(0,4);
    if(!shown.length){
      const empty=document.createElement("div");
      empty.className="cinema-featured-empty";
      empty.textContent="Пока здесь тихо — истории авторов появятся после первой публикации.";
      target.append(empty);return;
    }
    const head=document.getElementById("featuredHeading");
    if(head)head.textContent=publicBooks?"Рекомендуем почитать":"Продолжить свою историю";
    const used=new Set();
    for(const book of shown){
      if(used.has(book.id))continue;
      used.add(book.id);
      const href=publicBooks?"reader.html?public="+encodeURIComponent(book.id):"editor.html?id="+encodeURIComponent(book.id);
      const card=document.createElement("a");card.className="cinema-featured-card";card.href=href;
      const cover=document.createElement("div");cover.className="cinema-featured-cover";
      const picture=book.cover||book.coverDataUrl;
      if(coverGood(picture)){
        cover.style.backgroundImage='linear-gradient(180deg,#0002,#0009),url("'+picture+'")';
        cover.classList.add("has-image");
      }
      const name=document.createElement("strong");name.textContent=book.title||"Книга без названия";
      const label=document.createElement("small");label.textContent=publicBooks?
        (book.display_name||book.author||"Автор сообщества"):(book.author||"Моя рукопись");
      if(!coverGood(picture)){const coverTitle=document.createElement("strong");coverTitle.textContent=book.title||"Книга";cover.append(coverTitle);}
      card.append(cover,name,label);target.append(card);
    }
  }
  const local=()=>{
    try{return typeof getBooks==="function"?getBooks():[];}catch{return[];}
  };
  let controller;
  if(typeof AbortController!=="undefined")controller=new AbortController();
  fetch("/api/books?sort=new",{signal:controller?.signal,credentials:"same-origin"})
    .then(r=>{if(!r.ok)throw Error("catalog");return r.json();})
    .then(result=>{
      const books=result.books||[];
      renderFeatured(books.length?books:local(),!!books.length);
    })
    .catch(()=>renderFeatured(local(),false));
  window.addEventListener("beforeunload",()=>controller?.abort(),{once:true});
});
