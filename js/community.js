document.addEventListener("DOMContentLoaded",()=>{
const $=id=>document.getElementById(id),grid=$("communityBooks"),notice=$("communityNotice"),modal=$("communityModal"),body=$("communityDialogBody"),heading=$("communityDialogTitle");
if(!grid||!modal)return;
const roles={writer:"Писатель",reader:"Читатель",editor:"Редактор",illustrator:"Иллюстратор",assistant:"Помощник автора"};
const cats={fantasy:"Фэнтези",romance:"Романтика",scifi:"Фантастика",detective:"Детектив",horror:"Ужасы",adventure:"Приключения",poetry:"Поэзия",nonfiction:"Документальная",other:"Другое"};
const esc=s=>escapeHtml(String(s??""));
let me=null,lastBooks=[],seq=0,debounce=null;
async function api(path,opts={}){
 const res=await fetch("/api/"+path,{credentials:"same-origin",...opts,headers:{"Accept":"application/json",...(opts.body?{"Content-Type":"application/json"}:{}),...opts.headers}});
 let data;try{data=await res.json();}catch{throw Error("Сервер библиотеки пока недоступен.");}
 if(!res.ok)throw Error(data.error||"Ошибка сервера: "+res.status);
 return data;
}
function open(name,markup){heading.textContent=name;body.innerHTML=markup;modal.hidden=false;document.body.style.overflow="hidden";body.querySelector("input:not([type=hidden])")?.focus();}
function close(){modal.hidden=true;body.replaceChildren();document.body.style.overflow="";}
$("communityDialogClose").onclick=close;modal.addEventListener("click",e=>{if(e.target===modal)close();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!modal.hidden)close();});
function status(msg,good=false){const p=body.querySelector(".community-dialog-status");if(p){p.textContent=msg;p.style.color=good?"#b9d6a3":"#e8ad91";}}
function roleOpts(selected){return Object.entries(roles).map(([key,value])=>'<option value="'+key+'"'+(selected===key?" selected":"")+'>'+value+"</option>").join("");}
function setAccount(){
 $("accountButtonLabel").textContent=me?me.displayName:"Войти / Регистрация";
 const holder=$("accountButton").querySelector(".account-entry-avatar");holder.replaceChildren();
 if(me?.avatar){const img=document.createElement("img");img.src=me.avatar;img.alt="";holder.append(img);}
 else holder.textContent=me?.displayName?.charAt(0)?.toUpperCase()||"✦";
}
function auth(register=false){
 const markup=['<form id="communityAuthForm" class="community-form">',
 register?'<label>Имя на сайте<input name="displayName" maxlength="48" minlength="2" required placeholder="Творческое имя"></label><label>Никнейм<input name="handle" maxlength="24" minlength="3" required pattern="[a-zA-Z0-9_]+" placeholder="writer_2026" autocapitalize="none"></label><label class="full-row">Электронная почта<input type="email" name="email" maxlength="160" required autocomplete="email"></label><label>Роль<select name="role">'+roleOpts("writer")+'</select></label>':'<label class="full-row">Почта или никнейм<input name="identifier" autocomplete="username" required placeholder="Почта или никнейм"></label>',
 '<label class="full-row">Пароль<input type="password" name="password" required minlength="'+(register?10:1)+'" maxlength="128" autocomplete="'+(register?"new-password":"current-password")+'" placeholder="'+(register?"От 10 символов":"Твой пароль")+'"></label>',
 register?'<p class="full-row community-publish-warning">Подтверждение почты и восстановление пароля ещё не подключены. Используй уникальный пароль.</p>':"",
 '<button class="community-action full-row" type="submit">'+(register?"Зарегистрироваться":"Войти")+'</button></form>',
 '<p class="community-form-switch">'+(register?"Уже есть аккаунт?":"Нет аккаунта?")+' <button type="button" class="community-inline-link" id="switchAuth">'+(register?"Войти":"Зарегистрироваться")+'</button></p>',
 '<p class="community-dialog-status" role="status"></p>'].join("");
 open(register?"Регистрация":"Вход в DiamondBook",markup);
 $("switchAuth").onclick=()=>auth(!register);
 $("communityAuthForm").addEventListener("submit",async e=>{
  e.preventDefault();const form=e.currentTarget,btn=form.querySelector("[type=submit]");btn.disabled=true;
  try{const data=await api(register?"register":"login",{method:"POST",body:JSON.stringify(Object.fromEntries(new FormData(form)))});
   me=data.user;setAccount();close();loadBooks();if(register)editProfile();
  }catch(ex){status(ex.message);}finally{btn.disabled=false;}
 });
}
$("accountButton").onclick=()=>me?showProfile(me.handle):auth();
async function logout(){try{await api("logout",{method:"POST",body:"{}"});}catch{}me=null;setAccount();close();}
function profileMarkup(p,own,books){
 const avatar=p.avatar?'<img src="'+p.avatar+'" alt="Аватар">':esc(p.displayName?.charAt(0)||"✦");
 const banner=p.banner?'<img src="'+p.banner+'" alt="Баннер">':"";
 const works=books?.length?books.map(b=>'<div class="community-profile-work"><a href="reader.html?public='+encodeURIComponent(b.id)+'">'+esc(b.title)+'</a><span>'+esc(cats[b.category]||"Книга")+'</span>'+(own?'<button type="button" data-remove-book="'+esc(b.id)+'">Удалить</button>':"")+'</div>').join(""):'<p class="community-publish-warning">Книги пока не опубликованы.</p>';
 return '<div class="community-profile-cover">'+banner+'</div>'+
 '<div class="community-profile-head"><div class="community-profile-avatar">'+avatar+'</div><div><h3>'+esc(p.displayName)+'</h3><p>@'+esc(p.handle)+' · <span class="community-profile-role">'+esc(roles[p.role]||"Автор")+'</span></p></div></div>'+
 '<p class="community-profile-bio">'+esc(p.bio||"Автор пока не добавил описание.")+'</p>'+
 (own?'<button type="button" class="community-ghost" id="editCommunityProfile">✎ Изменить профиль</button> <button type="button" class="community-ghost" id="logoutCommunity">Выйти</button>':"")+
 '<div class="community-profile-works"><h4>Опубликованные книги</h4>'+works+'</div><p class="community-dialog-status"></p>';
}
async function showProfile(handle){
 try{
  const data=await api("profile/"+encodeURIComponent(handle)),own=me?.handle===data.profile.handle;
  open("Профиль автора",profileMarkup(data.profile,own,data.books));
  $("editCommunityProfile")?.addEventListener("click",editProfile);
  $("logoutCommunity")?.addEventListener("click",logout);
  body.querySelectorAll("[data-remove-book]").forEach(btn=>btn.onclick=async()=>{
   if(!confirm("Убрать книгу из общей библиотеки? Локальный оригинал останется."))return;
   try{await api("books/"+encodeURIComponent(btn.dataset.removeBook),{method:"DELETE"});await loadBooks();showProfile(handle);}
   catch(ex){status(ex.message);}
  });
 }catch(ex){open("Профиль недоступен","<p>"+esc(ex.message)+"</p>");}
}
async function shrink(file,w,h,q,max){
 if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>8e6)throw Error("Используй JPG, PNG или WebP до 8 МБ.");
 const object=URL.createObjectURL(file);
 try{
  const img=new Image();await new Promise((yes,no)=>{img.onload=yes;img.onerror=no;img.src=object;});
  let factor=Math.min(1,w/img.naturalWidth,h/img.naturalHeight);
  const canvas=document.createElement("canvas");
  for(let i=0;i<6;i++){
   canvas.width=Math.max(1,Math.round(img.naturalWidth*factor));canvas.height=Math.max(1,Math.round(img.naturalHeight*factor));
   const ctx=canvas.getContext("2d");ctx.fillStyle="#382b20";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
   const out=canvas.toDataURL("image/jpeg",Math.max(.38,q-i*.1));
   if(out.length<=max)return out;
   factor*=.72;
  }
  throw Error("Не получилось сжать фото.");
 }finally{URL.revokeObjectURL(object);}
}
function editProfile(){
 if(!me)return auth();
 let avatar=me.avatar||"",banner=me.banner||"";
 const html=['<form id="communityEditProfile" class="community-profile-form">',
 '<label>Имя на сайте<input name="displayName" required minlength="2" maxlength="48" value="'+esc(me.displayName)+'"></label>',
 '<label>Роль<select name="role">'+roleOpts(me.role)+'</select></label>',
 '<label class="full-row">О себе<textarea name="bio" rows="4" maxlength="500" placeholder="Расскажи читателям о себе…">'+esc(me.bio||"")+'</textarea></label>',
 '<label>Аватар<input type="file" name="avatarFile" accept="image/png,image/jpeg,image/webp"></label>',
 '<label>Широкий баннер<input type="file" name="bannerFile" accept="image/png,image/jpeg,image/webp"></label>',
 '<p class="full-row image-note">Аватар и баннер будут видны всем. Изображения сжимаются автоматически.</p>',
 '<button class="community-action full-row" type="submit">Сохранить</button></form><p class="community-dialog-status"></p>'].join("");
 open("Оформление профиля",html);
 $("communityEditProfile").addEventListener("submit",async e=>{
  e.preventDefault();const form=e.currentTarget,btn=form.querySelector("[type=submit]");btn.disabled=true;
  try{
   if(form.elements.avatarFile.files[0])avatar=await shrink(form.elements.avatarFile.files[0],260,260,.82,100000);
   if(form.elements.bannerFile.files[0])banner=await shrink(form.elements.bannerFile.files[0],1120,350,.75,270000);
   const data=await api("me",{method:"PATCH",body:JSON.stringify({displayName:form.elements.displayName.value,role:form.elements.role.value,bio:form.elements.bio.value,avatar,banner})});
   me=data.user;setAccount();showProfile(me.handle);
  }catch(ex){status(ex.message);}finally{btn.disabled=false;}
 });
}
function render(books){
 grid.replaceChildren();
 const per=window.innerWidth<=720?2:window.innerWidth<=1120?3:4;
 for(let i=0;i<books.length;i+=per){
  const shelf=document.createElement("section"),tops=document.createElement("div"),details=document.createElement("div"),board=document.createElement("div");
  shelf.className="bookshelf-row";tops.className="bookshelf-books";details.className="shelf-details";board.className="shelf-board";
  for(const b of books.slice(i,i+per)){
   const card=document.createElement("article"),cover=document.createElement("a"),name=document.createElement("span"),author=document.createElement("span");
   card.className="book-card";cover.className="book-cover community-cover texture-"+(i%8);
   cover.href="reader.html?public="+encodeURIComponent(b.id);cover.setAttribute("aria-label","Читать "+b.title);
   if(/^data:image\/(?:png|jpeg|webp);base64,/.test(b.cover||"")){
    cover.style.backgroundImage='linear-gradient(180deg,transparent,rgba(0,0,0,.55)),url("'+b.cover+'")';
    cover.style.backgroundSize="cover";cover.style.backgroundPosition="center";
   }
   name.className="book-cover-title";name.textContent=b.title;author.className="book-cover-author";author.textContent=b.author||b.display_name;
   cover.append(name,author);window.DiamondCoverDesign?.apply(cover,null);card.append(cover);tops.append(card);
   const detail=document.createElement("div"),writer=document.createElement("button"),caption=document.createElement("p"),read=document.createElement("a");
   detail.className="shelf-book-details";writer.className="community-author";writer.textContent="✎ "+(b.display_name||b.handle);writer.onclick=()=>showProfile(b.handle);
   caption.className="community-caption";caption.textContent=(cats[b.category]||"Книга")+" · "+b.title;
   read.className="community-read";read.href=cover.href;read.textContent="Читать книгу";
   detail.append(writer,caption,read);details.append(detail);
  }
  board.setAttribute("aria-hidden","true");shelf.append(tops,board,details);grid.append(shelf);
 }
}
async function loadBooks(){
 const id=++seq;
 const query=new URLSearchParams({sort:$("communitySort").value});
 const term=$("communitySearch").value.trim();if(term)query.set("q",term);
 const cat=$("communityCategory").value;if(cat)query.set("category",cat);
 notice.hidden=false;notice.textContent="Загружаем книги сообщества…";notice.classList.remove("error");
 try{
  const data=await api("books?"+query.toString());if(id!==seq)return;
  lastBooks=data.books||[];render(lastBooks);$("communityCount").textContent=lastBooks.length+" книг";
  notice.hidden=!!lastBooks.length;
  if(!lastBooks.length)notice.textContent="Здесь пока нет книг. Стань первым автором!";
 }catch(ex){if(id!==seq)return;grid.replaceChildren();notice.hidden=false;notice.classList.add("error");notice.textContent=ex.message;}
}
$("communitySearch").addEventListener("input",()=>{clearTimeout(debounce);debounce=setTimeout(loadBooks,300);});
$("communitySort").addEventListener("change",loadBooks);
$("communityCategory").addEventListener("change",()=>{
 const cat=$("communityCategory").value;
 $("communityCategories").querySelectorAll("[data-category]").forEach(b=>b.classList.toggle("active",b.dataset.category===cat));
 loadBooks();
});
$("communityCategories").addEventListener("click",e=>{
 const btn=e.target.closest("[data-category]");if(!btn)return;
 $("communityCategory").value=btn.dataset.category;$("communityCategory").dispatchEvent(new Event("change"));
});
async function publicPayload(book,category,description){
 const copy=JSON.parse(JSON.stringify(book));
 async function walk(nodes){
  for(const node of nodes||[]){
   if(node.type==="chapter"&&typeof node.content==="string"&&node.content.includes("data:image/")){
    const doc=new DOMParser().parseFromString(node.content,"text/html");
    for(const image of doc.querySelectorAll("img[src^='data:image/']")){
     try{const file=await(await fetch(image.src)).blob();image.src=await shrink(file,540,490,.56,45000);}catch{image.remove();}
    }
    node.content=doc.body.innerHTML;
   }
   await walk(node.children);
  }
 }
 await walk(copy.structure);
 let cover="";
 if(copy.coverDataUrl){cover=await shrink(await(await fetch(copy.coverDataUrl)).blob(),300,460,.67,125000);}
 return {title:copy.title,author:copy.author,category,description,cover,structure:copy.structure,coverDesign:copy.coverDesign||null,pageTexture:copy.pageTexture||"smooth",editorFontFamily:copy.editorFontFamily||"georgia"};
}
function publish(selectedId=null){
 if(!me)return auth();
 const books=getBooks().filter(b=>flattenChapters(b).length);
 if(!books.length){open("Опубликовать книгу",'<p class="community-publish-lead">Сначала создай книгу и добавь хотя бы одну главу.</p><a class="community-action" href="create.html">Создать книгу</a>');return;}
 const html=['<p class="community-publish-lead">Только выбранная книга станет видна всем читателям. Локальный оригинал останется твоим.</p>',
 '<form id="communityPublishForm" class="community-publish-form">',
 '<label class="full-row">Выбери свою книгу<select name="bookId" required>'+books.map(b=>'<option value="'+esc(b.id)+'"'+(b.id===selectedId?' selected':'')+'>'+esc(b.title)+'</option>').join("")+'</select></label>',
 '<label class="full-row">Категория<select name="category">'+Object.entries(cats).map(([id,label])=>'<option value="'+id+'">'+label+'</option>').join("")+'</select></label>',
 '<label class="full-row">Описание<textarea name="description" maxlength="600" placeholder="О чём твоя история?"></textarea></label>',
 '<label class="full-row"><span><input type="checkbox" name="consent" required style="width:auto;min-height:0"> Я согласен опубликовать текст и иллюстрации.</span></label>',
 '<p class="full-row community-publish-warning">Лимит одной публикации — 300 КБ. Иллюстрации автоматически сжимаются.</p>',
 '<button type="submit" class="community-action full-row">Опубликовать</button></form><p class="community-dialog-status"></p>'].join("");
 open("Публикация книги",html);
 $("communityPublishForm").addEventListener("submit",async e=>{
  e.preventDefault();const form=e.currentTarget,btn=form.querySelector("[type=submit]");btn.disabled=true;status("Подготавливаю иллюстрации…",true);
  try{
   const book=getBook(form.elements.bookId.value);if(!book)throw Error("Книга не найдена.");
   const content=await publicPayload(book,form.elements.category.value,form.elements.description.value);
   const result=await api("books",{method:"POST",body:JSON.stringify(content)});
   close();await loadBooks();location.href="reader.html?public="+encodeURIComponent(result.id);
  }catch(ex){status(ex.message);}finally{btn.disabled=false;}
 });
}
$("publishOwnBook").onclick=()=>publish();
window.DiamondCommunity={publish,showProfile,refresh:loadBooks};
let timer;window.addEventListener("resize",()=>{clearTimeout(timer);timer=setTimeout(()=>render(lastBooks),180);});
setAccount();api("me").then(r=>{me=r.user;setAccount();}).catch(()=>{});
loadBooks();
});
