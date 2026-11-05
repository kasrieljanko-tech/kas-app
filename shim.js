/* Unlock screen (UI only). Shared by the PIN gate and the Face ID lock.
   Contract unchanged: o = {id, z, sub, len, onCode(code)->true|string, faceId(el,msgEl)} */
window.kuKeypad=function(o){
  const g=k=>{try{return localStorage.getItem(k)||""}catch(e){return ""}};
  if(!document.getElementById("ku-kp-css")){const st=document.createElement("style");st.id="ku-kp-css";st.textContent=`
  .kp{position:fixed;inset:0;z-index:${o.z||100};display:flex;flex-direction:column;align-items:center;overflow:auto;
    padding:calc(env(safe-area-inset-top,0px) + 18px) 28px calc(env(safe-area-inset-bottom,0px) + 18px);
    font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;color:#F7F7FA;-webkit-font-smoothing:antialiased;
    background:radial-gradient(90% 55% at 50% 0%,rgba(161,113,240,.16),transparent 70%),radial-gradient(80% 50% at 50% 100%,rgba(40,58,110,.28),transparent 70%),linear-gradient(180deg,#0B0F18 0%,#090C12 55%,#06080D 100%);
    -webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
  .kp *{box-sizing:border-box}
  .kp-brand{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:650;letter-spacing:.16em;text-transform:uppercase;color:#8D94A1}
  .kp-brand img{width:22px;height:22px;border-radius:7px}
  .kp-mid{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;width:100%;min-height:250px}
  .kp-me{width:88px;height:88px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 1px rgba(255,255,255,.08),0 18px 40px rgba(0,0,0,.45)}
  .kp-ic{width:80px;height:80px;border-radius:22px;box-shadow:0 18px 40px rgba(0,0,0,.45)}
  .kp h2{margin:22px 0 0;font-size:27px;font-weight:720;letter-spacing:-.03em}
  .kp-sub{margin-top:6px;font-size:15px;color:#8D94A1}
  .kp-msg{margin-top:14px;min-height:18px;font-size:13.5px;color:#BF91FF;text-align:center}
  .kp-dots{display:flex;gap:14px;margin-top:18px;height:10px}
  .kp-dots i{width:10px;height:10px;border-radius:50%;border:1.5px solid rgba(255,255,255,.35);transition:background .15s,border-color .15s}
  .kp-dots i.on{background:#BF91FF;border-color:#BF91FF}
  .kp-dots.shake{animation:kpShake .4s}
  @keyframes kpShake{20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
  .kp-bottom{width:100%;max-width:300px;display:flex;flex-direction:column;align-items:center;gap:12px}
  .kp-fid{width:100%;height:54px;border:0;border-radius:16px;background:#A171F0;color:#fff;font:620 16px -apple-system,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;gap:10px;cursor:pointer;transition:transform .15s}
  .kp-fid:active{transform:scale(.98)}
  .kp-fid svg{width:22px;height:22px;flex:none}
  .kp-alt{border:0;background:none;color:#C9CDD5;font:550 15px -apple-system,system-ui,sans-serif;padding:8px 14px;cursor:pointer}
  .kp-pad{display:grid;grid-template-columns:repeat(3,72px);gap:10px 14px;justify-content:center}
  .kp-k{width:72px;height:54px;border-radius:15px;border:0;background:rgba(255,255,255,.07);color:#F7F7FA;font:450 24px -apple-system,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .12s,transform .12s}
  .kp-k:active{background:rgba(161,113,240,.32);transform:scale(.95)}
  .kp-k.t{background:none;font-size:14px;font-weight:550;color:#8D94A1}
  .kp-k.t:active{background:rgba(255,255,255,.06)}
  .kp-k svg{width:24px;height:24px}
  .kp-foot{margin-top:18px;font-size:12px;color:#5F6672;letter-spacing:.02em}
  .kp[data-mode="fid"] .kp-pad,.kp[data-mode="fid"] .kp-dots{display:none}
  .kp[data-mode="pin"] .kp-fid,.kp[data-mode="pin"] .kp-alt.to-pin{display:none}
  .kp:not([data-has-fid]) .kp-alt{display:none}
  @media(max-height:700px){.kp-me{width:70px;height:70px}.kp-ic{width:64px;height:64px;border-radius:18px}.kp h2{font-size:23px;margin-top:14px}.kp-mid{min-height:190px}.kp-pad{gap:8px 12px}.kp-k{height:48px}.kp-foot{margin-top:10px}}
  @media (prefers-reduced-motion:reduce){.kp-dots.shake{animation:none}}`;document.head.appendChild(st)}
  const d=document.createElement("div");d.id=o.id;d.className="kp";
  const me=g("ku.meimg");const fidSvg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M9 9.5v1.5M15 9.5v1.5M12 9.5V13h-1M9.5 16a3.5 3.5 0 0 0 5 0"/></svg>';
  if(o.faceId){d.dataset.hasFid="1";d.dataset.mode="fid"}else d.dataset.mode="pin";
  d.innerHTML=`<div class="kp-brand"><img src="icon-180.png" alt="">Kas Upgrade</div>
    <div class="kp-mid">${me?`<img class="kp-me" src="${me}" alt="" onerror="this.outerHTML='<img class=kp-ic src=icon-180.png alt>'">`:`<img class="kp-ic" src="icon-180.png" alt="">`}
      <h2>Welcome back, Kas.</h2><div class="kp-sub">Your private space.</div>
      <div class="kp-dots" id="${o.id}-d">${"<i></i>".repeat(o.len||4)}</div><div class="kp-msg" id="${o.id}-s">${o.faceId?"":(o.sub||"Enter your code")}</div></div>
    <div class="kp-bottom">
      <button class="kp-fid" data-f="1">${fidSvg}Unlock with Face ID</button>
      <button class="kp-alt to-pin" data-mode="pin">Use PIN instead</button>
      <div class="kp-pad">${[1,2,3,4,5,6,7,8,9].map(n=>`<button class="kp-k" data-n="${n}">${n}</button>`).join("")}
        ${o.faceId?`<button class="kp-k t" data-f="1" aria-label="Face ID">${fidSvg}</button>`:`<span></span>`}<button class="kp-k" data-n="0">0</button><button class="kp-k t" data-x="1">Delete</button></div>
      <div class="kp-foot">Private · Just for you</div></div>`;
  document.body.appendChild(d);
  let code="",busy=false;const dots=d.querySelector(".kp-dots"),msg=d.querySelector(".kp-msg");
  const paint=()=>dots.querySelectorAll("i").forEach((i,k)=>i.classList.toggle("on",k<code.length));
  const fail=t=>{dots.classList.remove("shake");void dots.offsetWidth;dots.classList.add("shake");try{navigator.vibrate&&navigator.vibrate(80)}catch(e){}code="";paint();msg.textContent=t||"Wrong code, try again"};
  const press=async n=>{if(busy||code.length>=(o.len||4))return;code+=n;paint();
    if(code.length===(o.len||4)){busy=true;msg.textContent="";let r;try{r=await o.onCode(code)}catch(e){r=e&&e.message||false}busy=false;
      if(r===true){d.remove()}else fail(typeof r==="string"?r:null)}};
  d.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
    if(b.dataset.n!==undefined)press(b.dataset.n);else if(b.dataset.x){code=code.slice(0,-1);paint()}
    else if(b.dataset.mode){d.dataset.mode=b.dataset.mode;msg.textContent="Enter your code"}
    else if(b.dataset.f&&o.faceId)o.faceId(d,msg)});
  d.addEventListener("keydown",e=>{if(/^\d$/.test(e.key)){d.dataset.mode="pin";press(e.key)}else if(e.key==="Backspace"){code=code.slice(0,-1);paint()}});
  d.tabIndex=-1;try{d.focus()}catch(e){}
  return d;
};
/* Standalone runtime: replaces Claude's db/assets/calendar with a private Google Sheet via Apps Script */
(function(){
  const API=window.KU_API;
  const get=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
  const put=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
  let PIN=get("ku.pin");
  const cache={spots:{},people:{},discover:{},me:{}};
  try{const c=JSON.parse(get("ku.cache")||"null");if(c)for(const k in cache)cache[k]=c[k]||{}}catch(e){}
  const hadCache=Object.keys(cache.spots).length>0;
  const subs=[];
  const notify=()=>subs.forEach(f=>{try{f()}catch(e){console.error(e)}});
  const save=()=>put("ku.cache",JSON.stringify(cache));
  async function call(body){
    const r=await fetch(API,{method:"POST",body:JSON.stringify({...body,pin:PIN})});
    const j=await r.json();
    if(j.error){const e=new Error(j.message||j.error);e.code=j.error;throw e}
    return j;
  }
  const b64=blob=>new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(String(fr.result).split(",")[1]);fr.onerror=rej;fr.readAsDataURL(blob)});
  async function seedIfEmpty(data){
    if(Object.keys(data.spots||{}).length||Object.keys(data.people||{}).length)return data;
    const r=await fetch("seed.json",{cache:"no-store"});if(!r.ok)return data;
    const seed=await r.json();
    for(const c of ["people","me"])for(const id in (seed[c]||{})){const d=seed[c][id];
      if(d.photoId&&!String(d.photoId).startsWith("d/")){try{const im=await fetch("img/"+d.photoId+".jpg");if(im.ok){const fid=(await call({action:"upload",data:await b64(await im.blob()),type:"image/jpeg"})).id;d.photoId="d/"+fid}}catch(e){console.warn(e)}}}
    const items=[];for(const c in seed)for(const id in seed[c])items.push({col:c,id,data:seed[c][id]});
    for(let i=0;i<items.length;i+=60)await call({action:"bulk",items:items.slice(i,i+60)});
    return seed;
  }
  let resolveReady,rejectReady;const ready=new Promise((a,b)=>{resolveReady=a;rejectReady=b});
  async function load(){
    const j=await call({action:"load"});
    const data=await seedIfEmpty(j.data||{});
    for(const k in cache)cache[k]=data[k]||{};
    save();resolveReady();notify();
  }
  const rid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36);
  function docRef(c,id){
    return {id,
      set:async data=>{const prev=cache[c][id];cache[c][id]=JSON.parse(JSON.stringify(data));save();notify();
        try{await call({action:"set",col:c,id,data})}catch(e){if(prev)cache[c][id]=prev;else delete cache[c][id];save();notify();throw e}},
      delete:async()=>{const prev=cache[c][id];delete cache[c][id];save();notify();
        try{await call({action:"del",col:c,id})}catch(e){cache[c][id]=prev;save();notify();throw e}},
      onSnapshot:(cb,err)=>{const f=()=>{const d=cache[c][id];cb({exists:!!d,data:()=>d})};subs.push(f);if(hadCache)f();ready.catch(e=>err&&err(e))}};
  }
  const db={get:(c,id)=>(cache[c]||{})[id]||null,
    collection:c=>{if(!cache[c])cache[c]={};return {doc:id=>docRef(c,id||rid()),
      onSnapshot:(cb,err)=>{const f=()=>cb({docs:Object.entries(cache[c]).map(([id,d])=>({id,data:()=>d}))});subs.push(f);if(hadCache)f();ready.catch(e=>err&&err(e))}}},
    doc:path=>{const [c,id]=path.split("/");if(!cache[c])cache[c]={};return docRef(c,id)}
  };
  const assets={
    upload:async(blob)=>{const r=await call({action:"upload",data:await b64(blob),type:blob.type||"image/jpeg"});return {id:"d/"+r.id}},
    delete:async(id)=>{if(String(id).startsWith("d/"))await call({action:"unupload",id:String(id).slice(2)})}
  };
  const mcp={callTool:async(server,tool,args)=>{try{return await call({action:"cal",args})}catch(e){e.code=e.code==="pin"?"needs_reauth":"tool_error";throw e}}};
  const ai={status:async()=>{try{return !!(await call({action:"aistatus"})).hasKey}catch(e){return false}},setKey:k=>call({action:"setaikey",key:k}),read:imgs=>call({action:"readshots",images:imgs})};
  window.claude={use:async name=>{await gate;return name==="db"?db:name==="assets"?assets:name==="mcp"?mcp:name==="ai"?ai:null}};
  // PIN gate
  let openGate;const gate=new Promise(r=>openGate=r);
  function askPin(msg){
    const sub=msg||(location.hostname.indexOf("github.io")>=0&&!localStorage.getItem("ku.pin")?"Enter your code to get started":"Enter your code");
    kuKeypad({id:"pin-gate",z:99,sub,len:4,onCode:async c=>{PIN=c;try{await call({action:"ping"});put("ku.pin",PIN);openGate();load().catch(e=>rejectReady(e));return true}catch(e){PIN=null;return e.code==="pin"?"Wrong code, try again":"Can't connect. Check your internet."}}});
  }
  const start=()=>{if(PIN){openGate();load().catch(e=>{if(e.code==="pin"){put("ku.pin","");PIN=null;location.reload()}else{rejectReady(e)}})}else askPin()};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
  setInterval(()=>{if(PIN&&document.visibilityState==="visible")call({action:"load"}).then(j=>{for(const k in cache)cache[k]=j.data[k]||{};save();notify()}).catch(()=>{})},60000);
})();
/* Face ID lock (WebAuthn platform authenticator) */
(function(){
  const g=k=>{try{return localStorage.getItem(k)}catch(e){return null}},p=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
  const ok=!!(window.PublicKeyCredential&&navigator.credentials&&window.isSecureContext);
  const b2u=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  const u2b=s=>{s=s.replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";return Uint8Array.from(atob(s),c=>c.charCodeAt(0))};
  const rnd=n=>crypto.getRandomValues(new Uint8Array(n));
  async function enroll(){
    const c=await navigator.credentials.create({publicKey:{challenge:rnd(32),rp:{name:"The Kas Upgrade",id:location.hostname},
      user:{id:rnd(16),name:"kas",displayName:"Kas"},pubKeyCredParams:[{type:"public-key",alg:-7},{type:"public-key",alg:-257}],
      authenticatorSelection:{authenticatorAttachment:"platform",userVerification:"required",residentKey:"preferred"},timeout:60000}});
    p("ku.faceid",b2u(c.rawId));
  }
  async function verify(){
    await navigator.credentials.get({publicKey:{challenge:rnd(32),rpId:location.hostname,userVerification:"required",timeout:60000,
      allowCredentials:[{type:"public-key",id:u2b(g("ku.faceid")),transports:["internal"]}]}});
  }
  function lock(auto){
    if(!ok||!g("ku.faceid")||!g("ku.pin")||document.getElementById("fid-lock"))return;
    const run=(d,msg)=>{msg.textContent="Look at your phone…";verify().then(()=>d.remove()).catch(()=>{msg.textContent="Tap Face ID to try again, or enter your code"})};
    const d=kuKeypad({id:"fid-lock",z:100,sub:"Tap Face ID or enter your code",len:(g("ku.pin")||"").length||4,onCode:async c=>c===g("ku.pin")?true:"Wrong code, try again",faceId:run});
  }
  function offer(){
    if(!ok||g("ku.faceid")||!g("ku.pin")||+(g("ku.faceid.later")||0)>Date.now())return;
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(av=>{if(!av||document.getElementById("fid-offer"))return;
      const d=document.createElement("div");d.id="fid-offer";
      d.innerHTML=`<div class="tx"><b>Unlock with Face ID?</b><span>Lock the app so only you can open it.</span></div><button id="fo-no" class="no">Not now</button><button id="fo-yes" class="yes">Turn on</button>`;
      document.body.appendChild(d);
      d.querySelector("#fo-no").onclick=()=>{p("ku.faceid.later",String(Date.now()+7*864e5));d.remove()};
      d.querySelector("#fo-yes").onclick=()=>enroll().then(()=>{d.innerHTML='<div class="tx"><b>Face ID is on</b></div>';setTimeout(()=>d.remove(),1800)}).catch(()=>{d.remove()});
    }).catch(()=>{});
  }
  window.kasFaceId={on:()=>enroll(),off:()=>p("ku.faceid",""),isOn:()=>!!g("ku.faceid")};
  window.kasLock=()=>lock(true);
  const boot=()=>{lock(true);let n=0;const t=setInterval(()=>{if(g("ku.pin")){clearInterval(t);setTimeout(offer,1500)}else if(++n>300)clearInterval(t)},1000)};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
  let hid=0;document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")hid=Date.now();else if(hid&&Date.now()-hid>60000)lock(true)});
})();
/* Remove host-injected badges/overlays (e.g. "Powered by Netlify") that can sit on top of the app */
(function(){
  const mine=el=>/^(pin-gate|fid-lock|fid-offer|sheet-root|sheets|toast|scr|app|mapov)$/.test(el.id||"")||el.classList.contains("wrap")||el.classList.contains("nav")||el.classList.contains("tabbar")||el.classList.contains("edge-back")||el.classList.contains("swipe-back")||el.tagName==="SCRIPT"||el.tagName==="STYLE";
  const txt=el=>[(el.tagName||""),(el.id||""),String(el.className||""),(el.getAttribute&&el.getAttribute("src"))||"",(el.innerText||""),(el.shadowRoot&&el.shadowRoot.textContent)||""].join(" ");
  const sweep=()=>{for(const el of [...document.body.children,...document.documentElement.children]){if(el===document.body||el===document.head||mine(el))continue;
    if(/netlify|nl-badge/i.test(txt(el)))el.remove()}};
  const start=()=>{sweep();new MutationObserver(sweep).observe(document.documentElement,{childList:true,subtree:false});new MutationObserver(sweep).observe(document.body,{childList:true})};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
