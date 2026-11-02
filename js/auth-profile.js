/* DiamondBook dedicated cinematic account and profile pages — real D1 API. */
(()=>{
  "use strict";
  const $=id=>document.getElementById(id);
  const text=(id,value)=>{const node=$(id);if(node)node.textContent=String(value??"");};
  const roles={writer:"Писатель",reader:"Читатель",editor:"Редактор",illustrator:"Иллюстратор",assistant:"Помощник автора"};
  const validImage=value=>typeof value==="string"&&/^data:image\/(?:png|jpeg|webp);base64,/.test(value);
  async function api(path,method="GET",value){
    const response=await fetch("/api/"+path,{method,credentials:"same-origin",
      headers:{"Accept":"application/json",...(value!==undefined?{"Content-Type":"application/json"}:{})},
      ...(value!==undefined?{body:JSON.stringify(value)}:{})});
    let data;
    try{data=await response.json();}catch{throw Error("Сервер DiamondBook пока не отвечает.");}
    if(!response.ok)throw Error(data.error||"Ошибка "+response.status);
    return data;
  }
  async function toData(file,maxWidth,maxHeight,limit){
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>8e6)throw Error("Поддерживаются JPG, PNG и WebP до 8 МБ.");
    const url=URL.createObjectURL(file);
    try{
      const picture=new Image();
      await new Promise((resolve,reject)=>{
        picture.onload=resolve;picture.onerror=()=>reject(Error("Не удалось открыть изображение."));picture.src=url;
      });
      let factor=Math.min(1,maxWidth/picture.naturalWidth,maxHeight/picture.naturalHeight);
      const canvas=document.createElement("canvas");
      for(let i=0;i<6;i++){
        canvas.width=Math.max(1,Math.round(picture.naturalWidth*factor));
        canvas.height=Math.max(1,Math.round(picture.naturalHeight*factor));
        const ctx=canvas.getContext("2d");
        ctx.fillStyle="#4f3726";ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(picture,0,0,canvas.width,canvas.height);
        const result=canvas.toDataURL("image/jpeg",Math.max(.37,.8-i*.08));
        if(result.length<=limit)return result;
        factor*=.73;
      }
      throw Error("Фото не удалось уменьшить. Попробуй другое.");
    }finally{URL.revokeObjectURL(url);}
  }
  function initAuth(){
    const login=$("authLoginTab"),register=$("authRegisterTab"),form=$("authForm");
    if(!form)return;
    const params=new URLSearchParams(location.search);
    let isRegister=params.get("mode")==="register";
    function switchMode(value){
      isRegister=value;
      login.classList.toggle("active",!value);
      register.classList.toggle("active",value);
      login.setAttribute("aria-selected",String(!value));
      register.setAttribute("aria-selected",String(value));
      $("authNameWrap").hidden=!value;
      $("authHandleWrap").hidden=!value;
      $("authRoleWrap").hidden=!value;
      $("authDisplayName").required=value;
      $("authHandle").required=value;
      $("authIdentity").type=value?"email":"text";
      $("authIdentity").placeholder=value?"your@email.com":"Почта или никнейм";
      $("authIdentity").autocomplete=value?"email":"username";
      $("authIdentityLabel").textContent=value?"Электронная почта":"Почта или никнейм";
      $("authPassword").minLength=value?10:1;
      $("authPassword").autocomplete=value?"new-password":"current-password";
      $("authHint").hidden=!value;
      $("authSubmit").innerHTML=value?"Создать аккаунт <span>✒</span>":"Войти в библиотеку <span>→</span>";
      text("authTitle",value?"Начало новой истории":"С возвращением");
      document.querySelector(".auth-intro").textContent=value?"Присоединяйся к клубу авторов и читателей.":"Войди в свою книжную мастерскую.";
      text("authStatus","");
    }
    login.onclick=()=>switchMode(false);
    register.onclick=()=>switchMode(true);
    $("authShowPassword").onclick=()=>{
      const input=$("authPassword");
      input.type=input.type==="password"?"text":"password";
      $("authShowPassword").setAttribute("aria-label",input.type==="password"?"Показать пароль":"Скрыть пароль");
    };
    form.addEventListener("submit",async event=>{
      event.preventDefault();
      const button=$("authSubmit");button.disabled=true;text("authStatus","");
      try{
        const password=$("authPassword").value;
        const payload=isRegister?
          {email:$("authIdentity").value.trim(),handle:$("authHandle").value.trim(),
            displayName:$("authDisplayName").value.trim(),role:$("authRole").value,password}:
          {identifier:$("authIdentity").value.trim(),password};
        const data=await api(isRegister?"register":"login","POST",payload);
        text("authStatus","Успешно! Открываю твою библиотеку…");
        const next=new URLSearchParams(location.search).get("next");
        const safe=next&&/^\/?(?:index|catalog|create|editor|profile)\.html(?:[?#].*)?$/.test(next)
          ?next.replace(/^\//,""):"profile.html?user="+encodeURIComponent(data.user.handle);
        location.href=safe;
      }catch(error){text("authStatus",error.message);}
      finally{button.disabled=false;}
    });
    switchMode(isRegister);
  }
  function picture(container,url,alt){
    container.replaceChildren();
    if(validImage(url)){
      const img=document.createElement("img");img.alt=alt;img.src=url;container.append(img);
      return true;
    }
    return false;
  }
  function makeBook(book){
    const a=document.createElement("a");a.className="profile-book-item";a.href="reader.html?public="+encodeURIComponent(book.id);
    const cover=document.createElement("div");cover.className="profile-book-cover";
    if(validImage(book.cover)){
      cover.style.backgroundImage='linear-gradient(180deg,#0001,#0009),url("'+book.cover+'")';
      cover.style.backgroundSize="cover";cover.style.backgroundPosition="center";
    }
    const heading=document.createElement("strong");heading.textContent=book.title||"Без названия";
    const label=document.createElement("span");label.textContent=book.title||"Книга";
    cover.append(heading);a.append(cover,label);return a;
  }
  async function initProfile(){
    const view=$("profileView");if(!view)return;
    const handleParam=new URLSearchParams(location.search).get("user");
    let currentUser=null,profile=null,books=[],avatar="",banner="";
    const status=message=>{text("profileStatus",message);$("profileStatus").hidden=false;};
    try{
      const session=await api("me");
      currentUser=session.user;
      const handle=handleParam||currentUser?.handle;
      if(!handle){
        $("profileStatus").innerHTML='Для редактирования своего профиля сначала <a href="auth.html">войти или зарегистрироваться</a>.';
        return;
      }
      const result=await api("profile/"+encodeURIComponent(handle));
      profile=result.profile;books=result.books||[];
    }catch(error){
      status(error.message);
      return;
    }
    const mine=!!(currentUser&&currentUser.handle===profile.handle);
    view.classList.toggle("is-own",mine);
    view.hidden=false;$("profileStatus").hidden=true;
    text("profileName",profile.displayName);text("profileHandle","@"+profile.handle);
    text("profileRole",roles[profile.role]||"Участник");
    text("profileRoleCount",(roles[profile.role]||"Автор").split(" ")[0]);
    text("profileBio",profile.bio||"Автор пока не добавил описание.");
    text("profileBookCount",books.length);
    const joined=new Date(profile.createdAt||Date.now());
    text("profileJoined",isNaN(joined.getTime())?"—":joined.toLocaleDateString("ru-RU",{month:"long",year:"numeric"}));
    const bannerNode=$("profileBanner");
    const mark=bannerNode.querySelector(".profile-banner-mark");
    bannerNode.replaceChildren();if(validImage(profile.banner)){const img=document.createElement("img");img.alt="Баннер автора";img.src=profile.banner;bannerNode.append(img);}
    bannerNode.append(mark);
    if(!picture($("profileAvatar"),profile.avatar,"Аватар"))$("profileAvatar").textContent=profile.displayName.charAt(0).toUpperCase()||"✦";
    const works=$("profileBooks");works.replaceChildren();
    if(books.length)books.forEach(book=>works.append(makeBook(book)));
    else{const p=document.createElement("p");p.textContent="Пока нет опубликованных книг.";p.style.color="#bca68a";works.append(p);}
    $("profileEditButton").hidden=!mine;$("profileMyBooks").hidden=!mine;
    if(!mine)$("profileSettings").hidden=true;
    const themeKey="diamondbook.profile.theme."+profile.handle;
    const themes=["oak","amber","slate","ink"];
    let theme="oak";try{theme=localStorage.getItem(themeKey)||"oak";}catch{}
    function useTheme(value){
      if(!themes.includes(value))return;
      view.dataset.profileTheme=value;
      document.querySelectorAll("[data-profile-theme]").forEach(el=>el.classList.toggle("active",el.dataset.profileTheme===value));
      try{localStorage.setItem(themeKey,value);}catch{}
    }
    useTheme(theme);
    document.querySelectorAll("[data-profile-theme]").forEach(button=>button.addEventListener("click",()=>useTheme(button.dataset.profileTheme)));
    if(!mine)return;
    $("profileEditButton").onclick=()=>{
      $("profileSettings").hidden=!$("profileSettings").hidden;
      $("profileEditButton").setAttribute("aria-expanded",String(!$("profileSettings").hidden));
      if(!$("profileSettings").hidden)$("profileSettings").scrollIntoView({behavior:"smooth",block:"nearest"});
    };
    $("profileCloseSettings").onclick=()=>{$("profileSettings").hidden=true;$("profileEditButton").setAttribute("aria-expanded","false");};
    const form=$("profileSettingsForm");
    form.elements.displayName.value=currentUser.displayName;
    form.elements.bio.value=currentUser.bio||"";
    form.elements.role.value=currentUser.role||"writer";
    avatar=currentUser.avatar||"";banner=currentUser.banner||"";
    form.addEventListener("submit",async event=>{
      event.preventDefault();
      const button=form.querySelector("[type=submit]");button.disabled=true;text("profileEditStatus","Сохраняем...");
      try{
        if(form.elements.avatarFile.files[0])avatar=await toData(form.elements.avatarFile.files[0],260,260,100000);
        if(form.elements.bannerFile.files[0])banner=await toData(form.elements.bannerFile.files[0],1150,360,270000);
        const r=await api("me","PATCH",{
          displayName:form.elements.displayName.value.trim(),bio:form.elements.bio.value.trim(),
          role:form.elements.role.value,avatar,banner
        });
        currentUser=r.user;profile={...profile,...r.user};
        text("profileName",r.user.displayName);
        text("profileRole",roles[r.user.role]);
        text("profileBio",r.user.bio||"Автор пока не добавил описание.");
        text("profileRoleCount",roles[r.user.role]||"Автор");
        if(!picture($("profileAvatar"),r.user.avatar,"Аватар"))$("profileAvatar").textContent=r.user.displayName.charAt(0).toUpperCase();
        bannerNode.replaceChildren();
        if(validImage(r.user.banner)){const img=document.createElement("img");img.alt="Баннер автора";img.src=r.user.banner;bannerNode.append(img);}
        bannerNode.append(mark);
        text("profileEditStatus","Профиль сохранён.");
      }catch(error){text("profileEditStatus",error.message);}
      finally{button.disabled=false;}
    });
    // Let authors discover editing on this screen without hiding their work.
    $("profileSettings").hidden=false;
  }
  if(document.getElementById("authForm"))initAuth();
  if(document.getElementById("profileView"))initProfile();
})();
