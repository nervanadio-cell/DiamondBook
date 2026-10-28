// Cloudflare Pages Functions — DiamondBook accounts, profiles, public books.
const CATEGORIES=["fantasy","romance","scifi","detective","horror","adventure","poetry","nonfiction","other"];
const ROLES=["writer","reader","editor","illustrator","assistant"];
const COOKIE="diamondbook_session";
const enc=new TextEncoder(),now=()=>Math.floor(Date.now()/1000);
const hex=a=>Array.from(new Uint8Array(a)).map(x=>x.toString(16).padStart(2,"0")).join("");
const random=(n=24)=>hex(crypto.getRandomValues(new Uint8Array(n)));
const sha=async s=>hex(await crypto.subtle.digest("SHA-256",enc.encode(s)));
async function passHash(password,salt){const key=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);return hex(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:enc.encode(salt),iterations:180000},key,256));}
const ok=(o,status=200,headers={})=>Response.json(o,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff",...headers}});
const fail=(message,status=400)=>ok({error:message},status);
const own=u=>({id:u.id,handle:u.handle,email:u.email,displayName:u.display_name,role:u.role,bio:u.bio,avatar:u.avatar,banner:u.banner});
const profile=u=>({handle:u.handle,displayName:u.display_name,role:u.role,bio:u.bio,avatar:u.avatar,banner:u.banner,createdAt:u.created_at});
async function body(req,max=450000){if(Number(req.headers.get("content-length")||0)>max)return null;const raw=await req.text();if(raw.length>max)return null;try{const x=JSON.parse(raw);return x&&typeof x==="object"&&!Array.isArray(x)?x:null;}catch{return null;}}
const validImage=(v,max)=>!v||typeof v==="string"&&v.length<=max&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(v);
const image=v=>v||"";
const cookieValue=token=>COOKIE+"="+token+"; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000";
const clearCookie=COOKIE+"=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
function tokenFrom(req){const item=(req.headers.get("cookie")||"").split(";").map(s=>s.trim()).find(s=>s.startsWith(COOKIE+"="));return item?item.slice(COOKIE.length+1):null;}
async function userFrom(db,req){const token=tokenFrom(req);if(!token||!/^[0-9a-f]{64}$/.test(token))return null;return db.prepare("SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? LIMIT 1").bind(await sha(token),now()).first();}
async function session(db,id){const token=random(32);await db.prepare("INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)").bind(await sha(token),id,now()+2592000,now()).run();return token;}
async function limit(db,req,kind,max){const key=await sha(kind+":"+(req.headers.get("cf-connecting-ip")||"anon"));const t=now(),w=t-3600;const row=await db.prepare("SELECT attempts,window_start FROM auth_limits WHERE key=?").bind(key).first();if(row&&row.window_start>=w&&row.attempts>=max)return true;await db.prepare("INSERT INTO auth_limits(key,attempts,window_start) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN window_start<? THEN 1 ELSE attempts+1 END,window_start=CASE WHEN window_start<? THEN ? ELSE window_start END").bind(key,t,w,w,t).run();return false;}
async function handle({request:req,env}){
 const db=env.DB;if(!db)return fail("База пользователей пока не подключена.",503);
 const url=new URL(req.url),path=url.pathname.replace(/^\/api\/?/,"").replace(/\/+$/,""),method=req.method;
 if(method!=="GET"&&method!=="HEAD"){const origin=req.headers.get("origin");if(origin&&origin!==url.origin)return fail("Недопустимый источник запроса.",403);if(method!=="DELETE"&&!(req.headers.get("content-type")||"").includes("application/json"))return fail("Ожидается JSON.",415);}
 if(method==="GET"&&path==="health")return ok({ok:true,storage:"D1"});
 if(method==="POST"&&path==="register"){
  if(await limit(db,req,"register",8))return fail("Слишком много регистраций. Повтори через час.",429);
  const b=await body(req,4000);if(!b)return fail("Проверь данные.");
  const email=String(b.email||"").trim().toLowerCase(),handle=String(b.handle||"").trim().toLowerCase(),displayName=String(b.displayName||"").trim(),pass=String(b.password||"");
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>160)return fail("Некорректная почта.");
  if(!/^[a-z0-9_]{3,24}$/.test(handle))return fail("Логин: 3–24 символа, a–z, 0–9 или _.");
  if(displayName.length<2||displayName.length>48)return fail("Имя: от 2 до 48 символов.");
  if(pass.length<10||pass.length>128)return fail("Пароль: 10–128 символов.");
  const existing=await db.prepare("SELECT id FROM users WHERE email=? OR handle=?").bind(email,handle).first();
  if(existing)return fail("Почта или логин уже заняты.",409);
  const salt=random(16),hash=await passHash(pass,salt),id=crypto.randomUUID(),role=ROLES.includes(b.role)?b.role:"writer";
  try{await db.prepare("INSERT INTO users(id,email,handle,password_hash,password_salt,display_name,role) VALUES(?,?,?,?,?,?,?)").bind(id,email,handle,hash,salt,displayName,role).run();}catch{return fail("Почта или логин уже заняты.",409);}
  const token=await session(db,id),u=await db.prepare("SELECT * FROM users WHERE id=?").bind(id).first();
  return ok({user:own(u)},201,{"Set-Cookie":cookieValue(token)});
 }
 if(method==="POST"&&path==="login"){
  if(await limit(db,req,"login",35))return fail("Слишком много попыток входа.",429);
  const b=await body(req,3000);if(!b)return fail("Некорректный запрос.");
  const identifier=String(b.identifier||"").trim().toLowerCase(),pass=String(b.password||"");
  if(identifier.length>160||pass.length>128)return fail("Неверная почта или пароль.",401);
  const u=await db.prepare("SELECT * FROM users WHERE email=? OR handle=?").bind(identifier,identifier).first();
  if(!u||await passHash(pass,u.password_salt)!==u.password_hash)return fail("Неверная почта или пароль.",401);
  const token=await session(db,u.id);
  return ok({user:own(u)},200,{"Set-Cookie":cookieValue(token)});
 }
 if(method==="POST"&&path==="logout"){const token=tokenFrom(req);if(token&&/^[0-9a-f]{64}$/.test(token))await db.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await sha(token)).run();return ok({ok:true},200,{"Set-Cookie":clearCookie});}
 const me=await userFrom(db,req);
 if(method==="GET"&&path==="me")return ok({user:me?own(me):null});
 if(method==="PATCH"&&path==="me"){
  if(!me)return fail("Сначала войди в аккаунт.",401);
  const b=await body(req,410000);if(!b)return fail("Профиль слишком большой.");
  const displayName=String(b.displayName||"").trim(),bio=String(b.bio||"").trim(),role=ROLES.includes(b.role)?b.role:"writer";
  if(displayName.length<2||displayName.length>48||bio.length>500)return fail("Проверь имя и описание.");
  if(!validImage(b.avatar,100000)||!validImage(b.banner,270000))return fail("Уменьши аватар или баннер.");
  await db.prepare("UPDATE users SET display_name=?,role=?,bio=?,avatar=?,banner=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(displayName,role,bio,image(b.avatar),image(b.banner),me.id).run();
  return ok({user:own(await db.prepare("SELECT * FROM users WHERE id=?").bind(me.id).first())});
 }
 if(method==="GET"&&path.startsWith("profile/")){
  const handle=decodeURIComponent(path.slice(8)).toLowerCase();if(!/^[a-z0-9_]{3,24}$/.test(handle))return fail("Профиль не найден.",404);
  const u=await db.prepare("SELECT id,handle,display_name,role,bio,avatar,banner,created_at FROM users WHERE handle=?").bind(handle).first();
  if(!u)return fail("Профиль не найден.",404);
  const books=await db.prepare("SELECT id,title,author,description,category,cover,published_at FROM public_books WHERE owner_id=? ORDER BY published_at DESC LIMIT 50").bind(u.id).all();
  return ok({profile:profile(u),books:books.results||[]});
 }
 if(method==="GET"&&path==="books"){
  const q=String(url.searchParams.get("q")||"").trim().slice(0,80),cat=String(url.searchParams.get("category")||""),sort=url.searchParams.get("sort")==="title"?"title":"new";
  let sql="SELECT b.id,b.title,b.author,b.description,b.category,b.cover,b.published_at,b.updated_at,u.handle,u.display_name,u.avatar FROM public_books b JOIN users u ON b.owner_id=u.id WHERE 1=1";const args=[];
  if(q){sql+=" AND (b.title LIKE ? OR b.author LIKE ? OR u.display_name LIKE ? OR u.handle LIKE ?)";for(let i=0;i<4;i++)args.push("%"+q+"%");}
  if(CATEGORIES.includes(cat)){sql+=" AND b.category=?";args.push(cat);}
  sql+=sort==="title"?" ORDER BY b.title COLLATE NOCASE ASC":" ORDER BY b.published_at DESC";sql+=" LIMIT 60";
  const r=await db.prepare(sql).bind(...args).all();return ok({books:r.results||[]});
 }
 if(method==="GET"&&/^books\/[a-f0-9-]{36}$/.test(path)){
  const b=await db.prepare("SELECT b.id,b.title,b.author,b.description,b.category,b.cover,b.content_json,b.published_at,u.handle,u.display_name FROM public_books b JOIN users u ON b.owner_id=u.id WHERE b.id=?").bind(path.slice(6)).first();
  if(!b)return fail("Книга не найдена.",404);
  const {content_json,...meta}=b;let content;try{content=JSON.parse(content_json);}catch{return fail("Ошибка чтения книги.",500);}
  return ok({book:{...content,id:b.id,title:b.title,author:b.author,coverDataUrl:b.cover},meta});
 }
 if(method==="POST"&&path==="books"){
  if(!me)return fail("Войди, чтобы опубликовать книгу.",401);
  const b=await body(req,490000);if(!b)return fail("Книга слишком большая. Сожми иллюстрации.");
  const title=String(b.title||"").trim(),author=String(b.author||me.display_name).trim(),description=String(b.description||"").trim(),category=String(b.category||"other");
  if(!title||title.length>120||author.length>100||description.length>600||!CATEGORIES.includes(category))return fail("Проверь название, описание и категорию.");
  if(!validImage(b.cover,125000))return fail("Обложка слишком большая.");
  if(!Array.isArray(b.structure)||b.structure.length>45)return fail("Неверная структура книги.");
  const content=JSON.stringify({title,author,structure:b.structure,coverDesign:b.coverDesign||null,pageTexture:b.pageTexture||"smooth",editorFontFamily:b.editorFontFamily||"georgia"});
  if(content.length>300000)return fail("Книга превышает лимит публикации 300 КБ.");
  const n=await db.prepare("SELECT COUNT(*) AS n FROM public_books WHERE owner_id=?").bind(me.id).first();if(n.n>=40)return fail("Лимит: 40 опубликованных книг.",429);
  const id=crypto.randomUUID();
  await db.prepare("INSERT INTO public_books(id,owner_id,title,author,description,category,cover,content_json) VALUES(?,?,?,?,?,?,?,?)").bind(id,me.id,title,author,description,category,image(b.cover),content).run();
  return ok({id},201);
 }
 if(method==="DELETE"&&/^books\/[a-f0-9-]{36}$/.test(path)){
  if(!me)return fail("Войди в аккаунт.",401);
  const r=await db.prepare("DELETE FROM public_books WHERE id=? AND owner_id=?").bind(path.slice(6),me.id).run();
  return r.meta?.changes?ok({ok:true}):fail("Книга не найдена или чужая.",404);
 }
 return fail("Маршрут не найден.",404);
}
export async function onRequest(context){try{return await handle(context);}catch(error){console.error("DiamondBook API",error);return fail("Временная ошибка сервера.",500);}}
