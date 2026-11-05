/* iPhone-style passcode screen, shared by the PIN gate and the Face ID lock */
window.kuKeypad=function(o){
  const g=k=>{try{return localStorage.getItem(k)||""}catch(e){return ""}};
  const h=new Date().getHours(),hi=h<5?"Good night":h<12?"Good morning":h<18?"Good afternoon":"Good evening";
  if(!document.getElementById("ku-kp-css")){const st=document.createElement("style");st.id="ku-kp-css";st.textContent=`
  .kp{position:fixed;inset:0;z-index:${o.z||100};display:flex;flex-direction:column;align-items:center;justify-content:space-between;overflow:auto;padding:calc(env(safe-area-inset-top,0px) + 22px) 24px calc(env(safe-area-inset-bottom,0px) + 24px);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",system-ui,sans-serif;color:#fff;background:linear-gradient(180deg,rgba(5,7,11,.42),rgba(5,7,11,.88)),radial-gradient(circle at 50% 37%,#27324a 0,#121927 36%,#080b10 74%);-webkit-user-select:none;user-select:none}
  .kp-logo{display:flex;align-items:center;justify-content:center;gap:10px;width:100%}.kp-logo img{width:34px;height:34px;border-radius:11px}.kp-logo span{font-size:.75rem;font-weight:720;letter-spacing:.15em;text-transform:uppercase;color:#d9dbe1}.kp-logo b{color:#a978f1}
  .kp-top{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;min-height:230px}.kp-me{width:92px;height:92px;border-radius:31px;object-fit:cover;border:2px solid rgba(255,255,255,.16);box-shadow:0 14px 36px rgba(0,0,0,.28)}.kp-ic{width:86px;height:86px;border-radius:27px}.kp-welcome{font-size:.62rem;font-weight:760;letter-spacing:.15em;color:#a99ac3;text-transform:uppercase;margin-top:24px}.kp h2{margin:8px 0;font-size:1.85rem;letter-spacing:-.05em;font-weight:760}.kp .kp-s{color:#9ca3b1;font-size:.9rem;min-height:1.3em;text-align:center}
  .kp-dots{display:flex;gap:16px;margin:22px 0 0}.kp-dots i{width:10px;height:10px;border-radius:50%;border:1.6px solid #b9bfca}.kp-dots i.on{background:#aa7bf2;border-color:#aa7bf2}.kp-dots.shake{animation:kpsh .4s}@keyframes kpsh{20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
  .kp-pad{flex:none;display:grid;grid-template-columns:repeat(3,70px);gap:12px 27px;justify-content:center;align-items:center}.kp-k{width:70px;height:70px;border-radius:22px;border:1px solid #292f39;background:rgba(24,29,38,.86);color:#fff;font:450 1.7rem -apple-system,system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1;cursor:pointer;transition:.12s}.kp-k:active{transform:scale(.95);background:#2a2238}.kp-k small{font-size:.45rem;letter-spacing:.16em;font-weight:600;margin-top:5px;color:#9097a4}.kp-k.t{background:none;border:0;font-size:.82rem;color:#a8afba;font-weight:580}.kp-k[data-f]{background:#241b34;border-color:#4b356e;color:#caa9ff}.kp-footer{font-size:.65rem;color:#69717e;padding-top:12px}
  @media(max-height:720px){.kp{padding-top:calc(env(safe-area-inset-top,0px) + 10px);padding-bottom:calc(env(safe-area-inset-bottom,0px) + 10px)}.kp-top{min-height:160px}.kp-me{width:70px;height:70px;border-radius:23px}.kp-welcome{margin-top:12px}.kp-dots{margin-top:12px}.kp-pad{grid-template-columns:repeat(3,61px);gap:6px 24px}.kp-k{width:61px;height:61px;border-radius:19px}.kp-footer{display:none}}
  @media (prefers-reduced-motion:reduce){.kp-dots.shake{animation:none}}`;document.head.appendChild(st)}
  const d=document.createElement("div");d.id=o.id;d.className="kp";
  const me=g("ku.meimg");const L=["","ABC","DEF","GHI","JKL","MNO","PQRS","TUV","WXYZ"];
  d.innerHTML=`<div class="kp-logo"><img src="icon-180.png" alt=""><span>The Kas <b>Upgrade</b></span></div><div class="kp-top">${me?`<img class="kp-me" src="${me}" alt="" onerror="this.outerHTML='<img class=kp-ic src=icon-180.png alt>'">`:`<img class="kp-ic" src="icon-180.png" alt="">`}
    <span class="kp-welcome">Your private space</span><h2>${hi}, Kas.</h2><div class="kp-s" id="${o.id}-s">${o.sub||"Enter your code"}</div>
    <div class="kp-dots" id="${o.id}-d">${"<i></i>".repeat(o.len||4)}</div></div>
    <div class="kp-pad">${[1,2,3,4,5,6,7,8,9].map(n=>`<button class="kp-k" data-n="${n}">${n}<small>${L[n-1]||"&nbsp;"}</small></button>`).join("")}
      ${o.faceId?`<button class="kp-k t" data-f="1" aria-label="Face ID"><svg width="30" height="30" viewBox="0 0 64 64" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"><path d="M6 20V12a6 6 0 0 1 6-6h8M44 6h8a6 6 0 0 1 6 6v8M58 44v8a6 6 0 0 1-6 6h-8M20 58h-8a6 6 0 0 1-6-6v-8"/><path d="M22 24v4M42 24v4M32 26v10h-3M24 44c4 4 12 4 16 0"/></svg></button>`:`<span></span>`}
      <button class="kp-k" data-n="0">0<small>&nbsp;</small></button><button class="kp-k t" data-x="1">Delete</button></div><div class="kp-footer">Private · Just for you</div>`;
  document.body.appendChild(d);
  let code="",busy=false;const dots=d.querySelector(".kp-dots"),msg=d.querySelector(".kp-s");
  const paint=()=>dots.querySelectorAll("i").forEach((i,k)=>i.classList.toggle("on",k<code.length));
  const fail=t=>{dots.classList.remove("shake");void dots.offsetWidth;dots.classList.add("shake");try{navigator.vibrate&&navigator.vibrate(80)}catch(e){}code="";paint();msg.textContent=t||"Wrong code, try again"};
  const press=async n=>{if(busy||code.length>=(o.len||4))return;code+=n;paint();
    if(code.length===(o.len||4)){busy=true;msg.textContent="…";let r;try{r=await o.onCode(code)}catch(e){r=e&&e.message||false}busy=false;
      if(r===true){d.remove()}else fail(typeof r==="string"?r:null)}};
  d.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
    if(b.dataset.n!==undefined)press(b.dataset.n);else if(b.dataset.x){code=code.slice(0,-1);paint()}else if(b.dataset.f&&o.faceId)o.faceId(d,msg)});
  d.addEventListener("keydown",e=>{if(/^\d$/.test(e.key))press(e.key);else if(e.key==="Backspace"){code=code.slice(0,-1);paint()}});
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
  const css="position:fixed;inset:0;z-index:100;background:#000;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;font-family:-apple-system,system-ui,sans-serif";
  const btn="font-size:1.05rem;font-weight:600;padding:13px 34px;border-radius:999px;border:0;background:#0a84ff;color:#fff";
  const faceSvg='<svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"><path d="M6 20V12a6 6 0 0 1 6-6h8M44 6h8a6 6 0 0 1 6 6v8M58 44v8a6 6 0 0 1-6 6h-8M20 58h-8a6 6 0 0 1-6-6v-8"/><path d="M22 24v4M42 24v4M32 26v10h-3M24 44c4 4 12 4 16 0"/></svg>';
  function lock(auto){
    if(!ok||!g("ku.faceid")||!g("ku.pin")||document.getElementById("fid-lock"))return;
    const run=(d,msg)=>{msg.textContent="Look at your phone…";verify().then(()=>d.remove()).catch(()=>{msg.textContent="Tap Face ID to try again, or enter your code"})};
    const d=kuKeypad({id:"fid-lock",z:100,sub:"Tap Face ID or enter your code",len:(g("ku.pin")||"").length||4,onCode:async c=>c===g("ku.pin")?true:"Wrong code, try again",faceId:run});
  }
  function offer(){
    if(!ok||g("ku.faceid")||!g("ku.pin")||+(g("ku.faceid.later")||0)>Date.now())return;
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(av=>{if(!av||document.getElementById("fid-offer"))return;
      const d=document.createElement("div");d.id="fid-offer";
      d.style.cssText="position:fixed;left:12px;right:12px;bottom:calc(96px + env(safe-area-inset-bottom));z-index:98;background:rgba(40,40,44,.96);color:#fff;border-radius:20px;padding:16px;display:flex;align-items:center;gap:12px;font-family:-apple-system,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.4)";
      d.innerHTML=`<div style="flex:1"><b>Unlock with Face ID?</b><div style="color:#aeaeb2;font-size:.85rem">Lock the app so only you can open it.</div></div>
        <button id="fo-no" style="background:none;border:0;color:#aeaeb2;font-size:.95rem">Not now</button><button id="fo-yes" style="${btn};padding:10px 18px">Turn on</button>`;
      document.body.appendChild(d);
      d.querySelector("#fo-no").onclick=()=>{p("ku.faceid.later",String(Date.now()+7*864e5));d.remove()};
      d.querySelector("#fo-yes").onclick=()=>enroll().then(()=>{d.innerHTML='<b style="flex:1">Face ID is on ✓</b>';setTimeout(()=>d.remove(),1800)}).catch(()=>{d.remove()});
    }).catch(()=>{});
  }
  window.kasFaceId={on:()=>enroll(),off:()=>p("ku.faceid",""),isOn:()=>!!g("ku.faceid")};
  const boot=()=>{lock(true);let n=0;const t=setInterval(()=>{if(g("ku.pin")){clearInterval(t);setTimeout(offer,1500)}else if(++n>300)clearInterval(t)},1000)};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
  let hid=0;document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")hid=Date.now();else if(hid&&Date.now()-hid>60000)lock(true)});
})();
/* Remove host-injected badges/overlays (e.g. "Powered by Netlify") that can sit on top of the app */
(function(){
  const mine=el=>/^(pin-gate|fid-lock|fid-offer|sheet-root|toast|scr|mapov)$/.test(el.id||"")||el.classList.contains("wrap")||el.classList.contains("nav")||el.classList.contains("swipe-back")||el.tagName==="SCRIPT"||el.tagName==="STYLE";
  const txt=el=>[(el.tagName||""),(el.id||""),String(el.className||""),(el.getAttribute&&el.getAttribute("src"))||"",(el.innerText||""),(el.shadowRoot&&el.shadowRoot.textContent)||""].join(" ");
  const sweep=()=>{for(const el of [...document.body.children,...document.documentElement.children]){if(el===document.body||el===document.head||mine(el))continue;
    if(/netlify|nl-badge/i.test(txt(el)))el.remove()}};
  const start=()=>{sweep();new MutationObserver(sweep).observe(document.documentElement,{childList:true,subtree:false});new MutationObserver(sweep).observe(document.body,{childList:true})};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
