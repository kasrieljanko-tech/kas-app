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
  const db={
    collection:c=>{if(!cache[c])cache[c]={};return {doc:id=>docRef(c,id||rid()),
      onSnapshot:(cb,err)=>{const f=()=>cb({docs:Object.entries(cache[c]).map(([id,d])=>({id,data:()=>d}))});subs.push(f);if(hadCache)f();ready.catch(e=>err&&err(e))}}},
    doc:path=>{const [c,id]=path.split("/");if(!cache[c])cache[c]={};return docRef(c,id)}
  };
  const assets={
    upload:async(blob)=>{const r=await call({action:"upload",data:await b64(blob),type:blob.type||"image/jpeg"});return {id:"d/"+r.id}},
    delete:async(id)=>{if(String(id).startsWith("d/"))await call({action:"unupload",id:String(id).slice(2)})}
  };
  const mcp={callTool:async(server,tool,args)=>{try{return await call({action:"cal",args})}catch(e){e.code=e.code==="pin"?"needs_reauth":"tool_error";throw e}}};
  window.claude={use:async name=>{await gate;return name==="db"?db:name==="assets"?assets:name==="mcp"?mcp:null}};
  // PIN gate
  let openGate;const gate=new Promise(r=>openGate=r);
  function askPin(msg){
    const d=document.createElement("div");d.id="pin-gate";
    d.innerHTML=`<div style="position:fixed;inset:0;z-index:99;background:var(--bg,#000);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;font-family:-apple-system,system-ui,sans-serif">
      <div style="font-size:2rem;font-weight:800">The Kas Upgrade</div><div style="color:#8e8e93">${msg||"Enter your PIN"}</div>
      <input id="pin-in" type="password" inputmode="numeric" autocomplete="current-password" style="font-size:1.6rem;text-align:center;letter-spacing:.4em;width:200px;padding:12px;border-radius:14px;border:0;background:rgba(127,127,127,.18);color:inherit">
      <button id="pin-go" style="font-size:1.05rem;font-weight:600;padding:12px 40px;border-radius:999px;border:0;background:#0a84ff;color:#fff">Open</button></div>`;
    document.body.appendChild(d);const i=d.querySelector("#pin-in");i.focus();
    const go=async()=>{PIN=i.value.trim();try{await call({action:"ping"});put("ku.pin",PIN);d.remove();openGate();load().catch(e=>rejectReady(e))}catch(e){i.value="";d.querySelector("div div:nth-child(2)").textContent=e.code==="pin"?"Wrong PIN, try again":"Can't connect. Check your internet."}};
    d.querySelector("#pin-go").onclick=go;i.onkeydown=e=>{if(e.key==="Enter")go()};
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
    const d=document.createElement("div");d.id="fid-lock";d.style.cssText=css;
    d.innerHTML=`<img src="icon-180.png" alt="" style="width:76px;height:76px;border-radius:18px"><div style="font-size:1.6rem;font-weight:800">The Kas Upgrade</div>
      <button id="fid-go" style="${btn};display:flex;align-items:center;gap:10px;margin-top:10px">Unlock with Face ID</button><div id="fid-msg" style="color:#8e8e93;min-height:1.2em"></div>
      <button id="fid-pin" style="background:none;border:0;color:#8e8e93;font-size:.9rem;margin-top:24px">Use PIN instead</button>`;
    document.body.appendChild(d);
    const run=()=>verify().then(()=>d.remove()).catch(()=>{d.querySelector("#fid-msg").textContent="Tap to try again"});
    d.querySelector("#fid-go").onclick=run;
    d.querySelector("#fid-pin").onclick=()=>{const i=document.createElement("input");i.type="password";i.inputMode="numeric";i.placeholder="PIN";
      i.style.cssText="font-size:1.4rem;text-align:center;letter-spacing:.3em;width:180px;padding:10px;border-radius:12px;border:0;background:#222;color:#fff";
      d.querySelector("#fid-pin").replaceWith(i);i.focus();i.oninput=()=>{if(i.value===g("ku.pin"))d.remove()}};
    if(auto)setTimeout(run,250);
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
