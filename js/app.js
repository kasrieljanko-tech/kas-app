/* =========================================================
   Kas Upgrade 3 — frontend
   Data + auth runtime lives in shim.js (window.claude).
   This file is UI only, plus the business logic ported from v2.
   ========================================================= */
(function(){
"use strict";

/* ---------------- constants ---------------- */
const ME="Kas";
const PHONE=!!window.KU_API;
const TYPES=["Drinks","Dinner","Coffee","Activity","Active","Outdoors","Late night"];
const BOROS=["Brooklyn","Queens","Manhattan","Other"];
const VIBES=["Chill","Romantic","Lively","Impressive","Fun","Low-key"];
const BEST=["First date","Second date","Special night","Any"];
const PSTAT=["Talking","Date set","Dating","Done"];
const KINDS=["Serious","Religious","Sneaky link"];
const REGIONS=["New York","Brazil","Israel","Other"];
const PRATES=[["chat","Chat"],["looks","Looks"],["feel","How I feel"]];
const HEART='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/></svg>';
const RWORD=["Not rated","Meh","Okay","Good","Great","Wow"];
const AREAS=["Williamsburg / Greenpoint","Manhattan","Near home","Astoria / LIC","Anywhere in Brooklyn"];
const STYLES=["Cocktail bars","Music / dancing","Something active or different","Nice dinner"];
const BUDGETS=["Under $80","$80–150","$150–300","Depends on the girl"];
const AVOIDS=["Too loud to talk","Long waits / lines","Touristy spots"];
const DVIBES=["Low-key & intimate","Fun & lively","Impressive","Active"];
const KPREFS=["No preference","Show kosher first","Kosher only"];
const GRACE=3*36e5;

/* ---------------- state ---------------- */
const S={tab:"home",stack:[],spots:[],people:[],discover:[],profile:null,notes:null,movies:null,
  db:null,assets:null,mcp:null,ai:null,loading:true,
  dCat:"",dq:"",pq:"",pSearch:false,pcoll:"All",plq:"",plansSeg:"up",calM:"",calSel:"",notesTab:"openers",notesEdit:false,showDone:false,flow:null};
const PF0={region:"Anywhere",ageMin:18,ageMax:60,kinds:[],statuses:[]};
try{S.pf=Object.assign({},PF0,JSON.parse(localStorage.getItem("ku.pfilt")||"{}"))}catch(e){S.pf=Object.assign({},PF0)}

/* ---------------- tiny helpers ---------------- */
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad=n=>String(n).padStart(2,"0");
const first=n=>String(n||"").trim().split(/\s+/)[0];
const money=n=>"$"+Math.round(n).toLocaleString();
const strip=o=>{const {id,...r}=JSON.parse(JSON.stringify(o));return r};
const lget=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
const lset=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
function imgSrc(id){id=String(id||"");if(!id)return "";if(/^data:image\//.test(id))return id;return /^https?:\/\//.test(id)?id:id.startsWith("d/")?"https://drive.google.com/thumbnail?id="+id.slice(2)+"&sz=w1600":"img/"+id+".jpg"}
function hashHue(s){let h=0;for(const c of String(s||""))h=(h*31+c.charCodeAt(0))%360;return h}
function initials(n){return String(n||"?").replace(/^(the|bar)\s+/i,"").split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase()}
function grad(n){const h=hashHue(n);return `background:linear-gradient(150deg,hsl(${h} 26% 30%),hsl(${(h+40)%360} 30% 14%))`}
function parseLocal(s){if(!s)return null;const[d,t]=String(s).split("T");const[y,m,dd]=d.split("-").map(Number);const[h,mi]=(t||"00:00").split(":").map(Number);return new Date(y,m-1,dd,h,mi)}
function todayStr(){const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function dkey(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function fmtT(t){if(!/^\d\d:\d\d$/.test(t||""))return "";const [h,m]=t.split(":").map(Number);return ((h+11)%12+1)+":"+pad(m)+(h<12?" AM":" PM")}
function fmtTime(s){const d=parseLocal(s);return d?d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}):""}
function fmtDay(s){const d=parseLocal(s);return d?d.toLocaleDateString("en-US",{month:"short",day:"numeric"}):""}
function dayDiff(s){const d=parseLocal(s);if(!d)return 99;const t=new Date();t.setHours(0,0,0,0);const x=new Date(d);x.setHours(0,0,0,0);return Math.round((x-t)/864e5)}
function relDay(s){const n=dayDiff(s),d=parseLocal(s);if(!d)return "";return n===0?(d.getHours()>=17?"Tonight":"Today"):n===1?"Tomorrow":n>1&&n<7?d.toLocaleDateString("en-US",{weekday:"long"}):d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}
function fmtWhen(s){return relDay(s)+" · "+fmtTime(s)}
function upcoming(p){const now=Date.now();return (p.dates||[]).filter(d=>d.when&&parseLocal(d.when)>=now-GRACE).sort((a,b)=>parseLocal(a.when)-parseLocal(b.when))}
function pastDates(p){const now=Date.now();return (p.dates||[]).filter(d=>d.when&&parseLocal(d.when)<now-GRACE).sort((a,b)=>parseLocal(b.when)-parseLocal(a.when))}
function spotOf(d){return S.spots.find(x=>x.id===d.spotId)}
function placeName(d){const s=spotOf(d);return s?s.name:(d.spotName||"Somewhere")}
function mapUrl(s){return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(s.address?[s.name,s.address].filter(Boolean).join(", "):[s.name,s.area,s.borough,"NY"].filter(Boolean).join(" "))}
function resyUrl(s){return "https://resy.com/cities/new-york-ny/search?query="+encodeURIComponent(s.name)}
function otUrl(s){return "https://www.opentable.com/s?metroId=8&term="+encodeURIComponent(s.name)}
function igHandle(h){h=String(h||"").trim();if(!h)return "";const m=h.match(/instagram\.com\/([A-Za-z0-9._]+)/i);return (m?m[1]:h).replace(/^@/,"").replace(/[^A-Za-z0-9._]/g,"")}
function igUrl(h,name,area){const x=igHandle(h);return x?"https://www.instagram.com/"+x+"/":"https://www.google.com/search?q="+encodeURIComponent([name,area,"NYC instagram"].filter(Boolean).join(" "))}
function safeUrl(u){return /^https:\/\//i.test(u||"")?u:""}
function bookable(s){return ["Dinner","Drinks","Coffee","Late night",""].includes(s.type||"")}
function isShabbat(w){const d=parseLocal(w);if(!d)return false;const day=d.getDay(),h=d.getHours()+d.getMinutes()/60;return (day===5&&h>=16)||(day===6&&h<19.5)}
function allPast(){const out=[];S.people.forEach(p=>pastDates(p).forEach(d=>out.push({p,d})));return out.sort((a,b)=>parseLocal(b.d.when)-parseLocal(a.d.when))}
function allUpcoming(){const out=[];S.people.filter(vis).forEach(p=>upcoming(p).forEach(d=>out.push({p,d})));return out.sort((a,b)=>parseLocal(a.d.when)-parseLocal(b.d.when))}
function beenWith(spot){const names=new Set();allPast().forEach(({p,d})=>{if(d.spotId===spot.id)names.add(p.name)});if(spot.wentWith)String(spot.wentWith).split(/,\s*/).filter(Boolean).forEach(n=>names.add(n));return [...names]}
function pAge(p){if(p.birthday){const b=new Date(p.birthday+"T12:00"),n=new Date();let a=n.getFullYear()-b.getFullYear();if(n.getMonth()<b.getMonth()||(n.getMonth()===b.getMonth()&&n.getDate()<b.getDate()))a--;if(a>0&&a<100)return a}return p.age?+p.age:null}
function pScore(p){const r=p.ratings||{};const v=PRATES.map(([k])=>r[k]).filter(Boolean);return v.length?(v.reduce((a,b)=>a+b,0)/v.length):0}
function showSneaky(){return lget("showSneaky")==="1"}
function vis(p){return p.kind!=="Sneaky link"||showSneaky()}
const isRel=p=>p.kind==="Religious"||p.keepsKosher||p.shomerShabbat;
function pfPass(p){const F=S.pf;
  if(F.region!=="Anywhere"&&p.region!==F.region)return false;
  const a=pAge(p);if(a!=null&&(a<F.ageMin||(F.ageMax<60&&a>F.ageMax)))return false;
  if(F.kinds.length&&!F.kinds.some(k=>k==="Religious"?isRel(p):p.kind===k))return false;
  if(F.statuses.length&&!F.statuses.includes(p.status||"Talking"))return false;return true}
function pfCount(){const F=S.pf;return (F.region!=="Anywhere")+(F.ageMin>18||F.ageMax<60)+(F.kinds.length>0)+(F.statuses.length>0)}
const isRoof=s=>!!s.rooftop||/roof/i.test([s.name,s.vibe,s.notes,s.bestFor].join(" "));
const isMine=s=>!s.suggested||!!s.fav||!!s.fromDiscover;
function isSaved(d){return S.spots.some(s=>s.name&&d.name&&s.name.toLowerCase()===d.name.toLowerCase())}
function fitScore(d){const p=S.profile||{};let n=0;const a=(p.areas||[]).join(" ").toLowerCase();
  if(a.includes("williamsburg")&&/williamsburg|greenpoint/i.test(d.area||""))n++;if(a.includes("manhattan")&&d.borough==="Manhattan")n++;if(a.includes("astoria")&&/astoria|long island/i.test(d.area||""))n++;
  const st=(p.styles||[]).join(" ").toLowerCase();if(st.includes("cocktail")&&d.list==="cocktails")n++;if(st.includes("music")&&d.list==="music")n++;if(st.includes("active")&&d.list==="different")n++;if(st.includes("dinner")&&d.type==="Dinner")n++;
  return n}
function photoOf(x){if(!x)return "";const pid=(x.photos&&x.photos[0])||x.photoId;return pid?imgSrc(pid):(x.photoUrl||x.cover_image_url||"")}
function personPhotos(p){const a=(p.photos||[]).slice();if(p.photoId&&!a.includes(p.photoId))a.unshift(p.photoId);return a}
function digits(p){let d=String(p.contact||"").replace(/\D/g,"");if(d.length===10)d="1"+d;return d}
function nextBday(b){if(!b)return null;const[,m,d]=String(b).split("-").map(Number);if(!m||!d)return null;const t=new Date();t.setHours(0,0,0,0);let n=new Date(t.getFullYear(),m-1,d);if(n<t)n=new Date(t.getFullYear()+1,m-1,d);return n}
function giftFor(p){const L=(p.likes||"").toLowerCase()+" "+(p.notes||"").toLowerCase();
  if(/wine|champagne|cocktail|martini/.test(L))return {label:"A bottle of wine",why:"She likes wine",url:"https://minibardelivery.com",site:"Minibar"};
  if(/sweet|dessert|cookie|chocolate|cake/.test(L))return {label:"Levain cookies",why:"She has a sweet tooth",url:"https://levainbakery.com",site:"Levain"};
  return {label:"Roses",why:"A classic after a great date",url:"https://www.odealarose.com/ny",site:"Ode à la Rose"}}
function typeLabel(t){return t==="Drinks"?"Bar":t||""}
function savedEvents(){return (S.profile&&S.profile.savedEvents)||[]}

/* calendar files (iPhone calendar via Apps Script ?ics=) */
function icsEsc(s){return String(s||"").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\r?\n/g,"\\n")}
function icsUtc(x){return x.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"")}
function icsLink(text){const b=btoa(unescape(encodeURIComponent(text))).replace(/\+/g,"-").replace(/\//g,"_");return (window.KU_API||"")+"?ics="+encodeURIComponent(b)}
function icsDateUrl(p,d){const st=parseLocal(d.when),en=new Date(st.getTime()+(d.len||120)*6e4),sp=spotOf(d),fn=first(p.name);
  const loc=sp?(sp.address?sp.name+", "+sp.address:[sp.name,sp.area,"NY"].filter(Boolean).join(", ")):(d.address||d.spotName||"");
  let r=new Date(st);r.setHours(11,0,0,0);if(st-r<3*36e5)r=new Date(st.getTime()-3*36e5);
  const dg=digits(p);const now=icsUtc(new Date());
  const ev=(uid,s,e,sum,l,desc,alarms)=>["BEGIN:VEVENT","UID:"+uid+"@kasupgrade","DTSTAMP:"+now,"DTSTART:"+icsUtc(s),"DTEND:"+icsUtc(e),"SUMMARY:"+icsEsc(sum),l?"LOCATION:"+icsEsc(l):"","DESCRIPTION:"+icsEsc(desc),...alarms.map(a=>`BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:${icsEsc(sum)}\r\nTRIGGER:${a}\r\nEND:VALARM`),"END:VEVENT"].filter(Boolean).join("\r\n");
  const txt=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Kas Upgrade//EN","METHOD:PUBLISH",
    ev(d.id,st,en,"Date with "+p.name,loc,sp?mapUrl(sp):"",["-P1D","-PT2H"]),
    ev(d.id+"c",r,new Date(r.getTime()+15*6e4),"Text "+fn+" to confirm","","Confirm your date with "+p.name+"."+(dg?"\nText her: sms:+"+dg:""),["PT0M"]),
    (()=>{const f=new Date(st);f.setDate(f.getDate()+1);f.setHours(10,30,0,0);return ev(d.id+"f",f,new Date(f.getTime()+15*6e4),"How did it go with "+fn+"?","","Open Kas Upgrade for a 30-second check-in, then send "+fn+" a quick message."+(dg?"\nText her: sms:+"+dg:""),["PT0M"])})(),
    "END:VCALENDAR"].join("\r\n");return icsLink(txt)}
function icsBdayUrl(p){const n=nextBday(p.birthday);if(!n)return "";const f=x=>x.getFullYear()+pad(x.getMonth()+1)+pad(x.getDate());const e=new Date(n.getTime()+864e5);
  const txt=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Kas Upgrade//EN","BEGIN:VEVENT","UID:bday-"+(p.id||p.name)+"@kasupgrade","DTSTAMP:"+icsUtc(new Date()),"DTSTART;VALUE=DATE:"+f(n),"DTEND;VALUE=DATE:"+f(e),"RRULE:FREQ=YEARLY","SUMMARY:"+icsEsc(p.name+"'s birthday"),"BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:Birthday","TRIGGER:-PT15H","END:VALARM","END:VEVENT","END:VCALENDAR"].join("\r\n");return icsLink(txt)}
function confirmMsg(p,d){const w=parseLocal(d.when),sp=spotOf(d),fn=first(p.name);
  const day=w.toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"}),tm=fmtTime(d.when);
  const place=placeName(d),addr=sp&&sp.address?sp.address:(d.address||""),map=sp?mapUrl(sp):"";
  const link=sp?(sp.website||sp.bookingUrl||(sp.instagram?igUrl(sp.instagram):"")):"";
  const en=new Date(w.getTime()+(d.len||120)*6e4),z=x=>x.getFullYear()+pad(x.getMonth()+1)+pad(x.getDate())+"T"+pad(x.getHours())+pad(x.getMinutes())+"00";
  const gcal="https://calendar.google.com/calendar/render?action=TEMPLATE&text="+encodeURIComponent("Date with "+ME+" at "+place)+"&dates="+z(w)+"/"+z(en)+"&ctz=America/New_York&location="+encodeURIComponent([place,addr].filter(Boolean).join(", "));
  return `Hey ${fn}! Confirming ${day} at ${tm} at ${place}${addr?" ("+addr+")":""}.${link?"\nThe place: "+link:""}${map?"\nMap: "+map:""}\nAdd it to your calendar: ${gcal}\nCan't wait to see you`}

/* images */
async function shrink(file){try{const img=await createImageBitmap(file);const k=Math.min(1,1400/Math.max(img.width,img.height));const c=document.createElement("canvas");c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);c.getContext("2d").drawImage(img,0,0,c.width,c.height);const b=await new Promise(r=>c.toBlob(r,"image/jpeg",.85));return b||file}catch(e){return file}}
const blob64=b=>new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(String(fr.result).split(",")[1]);fr.onerror=rej;fr.readAsDataURL(b)});
async function cropBlob(b,box){try{const im=await createImageBitmap(b);let [y0,x0,y1,x1]=box.map(Number);const W=im.width,H=im.height;
  let x=Math.max(0,x0/1000*W),y=Math.max(0,y0/1000*H),w=Math.min(W,x1/1000*W)-x,h=Math.min(H,y1/1000*H)-y;if(w<80||h<80)return null;
  const c=document.createElement("canvas");c.width=Math.round(w);c.height=Math.round(h);c.getContext("2d").drawImage(im,x,y,w,h,0,0,c.width,c.height);
  return await new Promise(r=>c.toBlob(r,"image/jpeg",.88))}catch(e){return null}}
function uploadErr(e){const c=e&&e.code;return c==="too_large"?"That photo is too big. Try another.":c==="unsupported_type"?"Use a JPG or PNG photo.":c==="quota_exceeded"?"Storage is full.":"Couldn't save. Try again."}

/* ---------------- icons ---------------- */
const P={
  home:'<path d="M3.5 10.5 12 4l8.5 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-5v6H5A1.5 1.5 0 0 1 3.5 19z"/>',
  compass:'<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  people:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
  plans:'<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17M8 14h3M8 17h6"/>',
  me:'<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
  heart:'<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  userplus:'<circle cx="9.5" cy="8" r="3.5"/><path d="M3 20a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6"/>',
  bookmark:'<path d="M6.5 3.5h11v17L12 16.5l-5.5 4z"/>',
  pin:'<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  filter:'<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  chev:'<path d="m9 5.5 6.5 6.5L9 18.5"/>',
  back:'<path d="M15 5.5 8.5 12l6.5 6.5"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  cam:'<path d="M4 8.5h3l2-3h6l2 3h3V19H4z"/><circle cx="12" cy="13" r="3.5"/>',
  shot:'<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10 18h4"/><path d="M9 9.5l2 2 4-4"/>',
  msg:'<path d="M4.5 5.5h15v10.5h-9L6 20v-4H4.5z"/>',
  phone:'<path d="M5.5 4h3.5l2 5-2.5 1.5a11 11 0 0 0 5 5l1.5-2.5 5 2v3.5a2 2 0 0 1-2 2A16 16 0 0 1 3.5 6a2 2 0 0 1 2-2z"/>',
  ig:'<rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.6"/><circle cx="16.8" cy="7.2" r=".6"/>',
  spark:'<path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8z"/><path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  car:'<path d="M4 15.5V12l2-4.5h12l2 4.5v3.5"/><path d="M3 15.5h18v2.5H3z"/><circle cx="7.5" cy="18" r="1.6"/><circle cx="16.5" cy="18" r="1.6"/><path d="M4.5 12h15"/>',
  ticket:'<path d="M3.5 7.5h17V10a2 2 0 0 0 0 4v2.5h-17V14a2 2 0 0 0 0-4z"/><path d="M14 7.5v9" stroke-dasharray="1.5 2"/>',
  film:'<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M7.5 5v14M16.5 5v14M3.5 9.5h4M3.5 14.5h4M16.5 9.5h4M16.5 14.5h4"/>',
  food:'<path d="M7 3v8M5 3v4.5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 2.5-3 5.5S15 13 17 13v8"/>',
  moon:'<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
  target:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>',
  kosher:'<path d="M12 3l3.5 6h-7z M12 21l-3.5-6h7z"/><path d="M5 8h14l-7 12zM5 16h14L12 4z"/>',
  map:'<path d="M9 4 3.5 6.5v13L9 17l6 2.5 5.5-2.5v-13L15 6.5z"/><path d="M9 4v13M15 6.5v13"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  faceid:'<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M9 9.5v1.5M15 9.5v1.5M12 9.5V13h-1M9.5 16a3.5 3.5 0 0 0 5 0"/>',
  lock:'<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  shield:'<path d="M12 3.5 5 6v5.5c0 4.5 3 7.7 7 9 4-1.3 7-4.5 7-9V6z"/>',
  palette:'<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-1 1.4-2.2-.6-1.3.1-2.8 1.6-2.8H17a3.5 3.5 0 0 0 3.5-3.5c0-4.7-3.8-8.5-8.5-8.5z"/><circle cx="8" cy="11" r="1"/><circle cx="11" cy="7.5" r="1"/><circle cx="15.5" cy="8.5" r="1"/>',
  link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  ai:'<rect x="6" y="6" width="12" height="12" rx="3"/><path d="M9.5 3v3M14.5 3v3M9.5 18v3M14.5 18v3M3 9.5h3M3 14.5h3M18 9.5h3M18 14.5h3"/><path d="M10 10h4v4h-4z"/>',
  notes:'<path d="M6 3.5h9.5L19 7v13.5H6z"/><path d="M15 3.5V7h4M9 11h7M9 14.5h7M9 18h4"/>',
  sliders:'<path d="M5 20v-6M5 10V4M12 20v-8M12 8V4M19 20v-4M19 12V4M2.5 14h5M9.5 8h5M16.5 16h5"/>',
  dollar:'<path d="M12 3v18M16.5 7.5c-.8-1.3-2.5-2-4.5-2-2.5 0-4.2 1.3-4.2 3.1 0 4.3 9 2.5 9 6.8 0 1.9-1.9 3.1-4.6 3.1-2 0-3.8-.8-4.7-2.2"/>',
  edit:'<path d="M15.5 4.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',
  trash:'<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13.5h9l1-13.5"/>',
  send:'<path d="M20.5 3.5 10 14M20.5 3.5 14 20.5l-4-6.5-6.5-4z"/>',
  gift:'<rect x="3.5" y="8.5" width="17" height="4" rx="1"/><path d="M5 12.5v8h14v-8M12 8.5v12M12 8.5S10.5 4 8 4.5 7 8.5 12 8.5zM12 8.5s1.5-4.5 4-4 1 4-4 4z"/>',
  more:'<circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  copy:'<rect x="8.5" y="8.5" width="11" height="12" rx="2.5"/><path d="M15.5 8.5V5a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 5v10A1.5 1.5 0 0 0 6 16.5h2.5"/>',
  cal:'<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/><path d="M12 13v5M9.5 15.5h5"/>',
  drink:'<path d="M5 4h14l-7 8.5z"/><path d="M12 12.5V20M8 20h8"/>',
  laugh:'<circle cx="12" cy="12" r="8.5"/><path d="M8 14a4.5 4.5 0 0 0 8 0zM9 9.5h.01M15 9.5h.01"/>',
  dice:'<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r=".9"/><circle cx="15" cy="15" r=".9"/><circle cx="15" cy="9" r=".9"/><circle cx="9" cy="15" r=".9"/>',
  star:'<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
  wave:'<path d="M3 14c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 2-2"/>',
  tack:'<path d="M9 3.5h6l-1 5.5 3 3v2H7v-2l3-3z"/><path d="M12 14v6.5"/>',
  user:'<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>'
};
const ic=(n,cls)=>`<svg class="ic ${cls||""}" viewBox="0 0 24 24" aria-hidden="true">${P[n]||P.spark}</svg>`;

/* photo block: real photo, else a calm gradient with initials */
function ph(src,name,cls,extra,style){
  return `<span class="ph ${cls||""}" style="${src?"":grad(name)};${style||""}">${src?`<img src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`:`<span class="ini">${esc(initials(name))}</span>`}${extra||""}</span>`}
function av(p,size){const s=p.photoId?imgSrc(p.photoId):"";const st=`width:${size}px;height:${size}px;font-size:${Math.round(size*.38)}px;${grad(p.name)};position:relative`;
  return `<span class="av" style="${st}">${esc(initials(p.name))}${s?`<img src="${esc(s)}" alt="" style="position:absolute;inset:0" onerror="this.remove()">`:""}</span>`}

/* ---------------- toast ---------------- */
let tt;function toast(m){let t=$("toast");if(!t){t=document.createElement("div");t.id="toast";t.className="toast";t.setAttribute("role","status");document.body.appendChild(t)}
  t.textContent=m;t.hidden=false;t.style.animation="none";void t.offsetWidth;t.style.animation="";clearTimeout(tt);tt=setTimeout(()=>t.hidden=true,m.length>40?4000:2200)}

/* ---------------- data actions ---------------- */
function needDb(){if(!S.db){toast("Still connecting. Try again in a moment.");return false}return true}
async function patchPerson(id,patch){const cur=S.people.find(x=>x.id===id);if(!cur||!needDb())return false;
  try{await S.db.collection("people").doc(id).set({...strip(cur),...patch,updatedAt:Date.now()});return true}catch(e){toast("Couldn't save. Try again.");return false}}
async function patchSpot(id,patch){const cur=S.spots.find(x=>x.id===id);if(!cur||!needDb())return false;
  try{await S.db.collection("spots").doc(id).set({...strip(cur),...patch,updatedAt:Date.now()});return true}catch(e){toast("Couldn't save. Try again.");return false}}
async function patchProfile(patch){if(!needDb())return false;try{await S.db.doc("me/profile").set({...(S.profile||{}),...patch,updatedAt:Date.now()});return true}catch(e){toast("Couldn't save. Try again.");return false}}
async function toggleFav(id){const s=S.spots.find(x=>x.id===id);if(!s)return;const nf=!s.fav;if(await patchSpot(id,{fav:nf}))toast(nf?`${s.name} saved to favorites`:`Removed from favorites`)}
async function saveDiscover(id,quiet){const d=S.discover.find(x=>x.id===id);if(!d||!needDb())return null;
  const ex=S.spots.find(s=>s.name&&s.name.toLowerCase()===String(d.name||"").toLowerCase());if(ex)return ex.id;
  const data={name:d.name,area:d.area||"",borough:d.borough||"",type:d.type||"",price:d.price||"",vibe:d.vibe||"",bestFor:"",status:"Want to try",rating:0,wentWith:"",notes:d.why||"",
    instagram:d.instagram||"",bookingPlatform:d.bookingPlatform||"",bookingUrl:d.bookingUrl||"",website:d.website||"",address:d.address||"",lat:d.lat,lng:d.lng,photos:d.photos||[],photoId:d.photoId||"",photoUrl:d.photoUrl||"",kosher:!!d.kosher,suggested:false,fromDiscover:d.id,updatedAt:Date.now()};
  Object.keys(data).forEach(k=>data[k]===undefined&&delete data[k]);
  try{const ref=S.db.collection("spots").doc();await ref.set(data);if(!quiet)toast(`${d.name} saved to your places`);return ref.id}catch(e){toast("Couldn't save. Try again.");return null}}
async function toggleEventSave(id){const cur=savedEvents();const on=cur.includes(id);const next=on?cur.filter(x=>x!==id):[...cur,id];if(await patchProfile({savedEvents:next}))toast(on?"Removed from your plans":"Saved to your plans")}

/* ---------------- router ---------------- */
const TABS=[["home","Home","home"],["discover","Discover","compass"],["people","People","people"],["plans","Plans","plans"],["me","Me","me"]];
function shell(){
  document.body.insertAdjacentHTML("afterbegin",`<div id="app"><main id="tab" class="screen"></main></div>
    <nav class="tabbar" aria-label="Main">${TABS.map(([k,l,i])=>`<button data-a="tab" data-x="${k}" id="t-${k}">${ic(i)}<span>${l}</span></button>`).join("")}</nav>
    <div id="sheets"></div>`);
}
function tab(k){if(S.tab===k&&!S.stack.length){const t=$("tab");t.scrollTo({top:0,behavior:"smooth"});return}
  while(S.stack.length)popNow();S.tab=k;try{history.replaceState(null,"","#"+k)}catch(e){}renderTab(true)}
function push(v){S.stack.push(v);const el=document.createElement("main");el.className="screen push";el.dataset.i=S.stack.length-1;$("app").appendChild(el);renderPush(el,v);document.body.classList.add("has-push")}
const liveScreens=()=>[...$("app").querySelectorAll(".screen.push:not(.out)")];
function popNow(){S.stack.pop();const ls=liveScreens();const el=ls[ls.length-1];if(el)el.remove();if(!S.stack.length)document.body.classList.remove("has-push")}
function pop(){if(!S.stack.length)return;const ls=liveScreens();const el=ls[ls.length-1];S.stack.pop();if(!S.stack.length)document.body.classList.remove("has-push");
  if(el){el.classList.add("out");setTimeout(()=>el.remove(),260)}renderTab(false)}
function keepScroll(el,fn){const top=el.scrollTop;const rails={};el.querySelectorAll("[data-rail]").forEach(r=>rails[r.dataset.rail]=r.scrollLeft);fn();el.scrollTop=top;el.querySelectorAll("[data-rail]").forEach(r=>{if(rails[r.dataset.rail])r.scrollLeft=rails[r.dataset.rail]})}
function busy(el){const a=document.activeElement;return a&&el.contains(a)&&/INPUT|TEXTAREA|SELECT/.test(a.tagName)}
function themeLabel(){const t=window.kuTheme?kuTheme.get():"auto";return t==="auto"?"Automatic":t==="light"?"Light":"Dark"}
function renderTab(reset){const el=$("tab");if(reset){el.classList.remove("enter");void el.offsetWidth;el.classList.add("enter");clearTimeout(el._en);el._en=setTimeout(()=>el.classList.remove("enter"),900)}
  TABS.forEach(([k])=>{const b=$("t-"+k);if(b){if(k===S.tab)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")}});
  const html=()=>{el.innerHTML=SCREENS[S.tab]();after(el)};
  if(reset){html();el.scrollTop=0}else if(!busy(el))keepScroll(el,html);else el.dataset.dirty="1"}
function renderPush(el,v){el.innerHTML=PUSH[v.v](v);after(el)}
function refresh(){renderTab(false);const ls=liveScreens();ls.forEach((el,i)=>{const v=S.stack[i];if(!v)return;if(busy(el)){el.dataset.dirty="1";return}keepScroll(el,()=>renderPush(el,v))})}
function after(el){el.querySelectorAll("[data-wire]").forEach(n=>{const f=WIRE[n.dataset.wire];if(f)f(n)})}
document.addEventListener("focusout",e=>{setTimeout(()=>{document.querySelectorAll(".screen[data-dirty]").forEach(el=>{if(busy(el))return;delete el.dataset.dirty;refresh()})},50)});

/* ---------------- shared pieces ---------------- */
function navbar(title,right,clear){return `<div class="navbar${clear?" clear":""}"><div class="side"><button class="iconbtn${clear?" glass":""}" data-a="back" aria-label="Back">${ic("back")}</button></div><div class="ttl">${clear?"":esc(title||"")}</div><div class="side r">${right||""}</div></div>`}
function sechead(t,btn){return `<div class="sechead"><h2>${esc(t)}</h2>${btn||""}</div>`}
function loadingBlock(){return `<div class="wrap stack gap12" style="margin-top:20px"><div class="skel" style="height:200px"></div><div class="skel" style="height:90px"></div><div class="skel" style="height:90px"></div></div>`}

/* item = spot or discover entry, unified for cards */
function itemKind(x){return S.spots.includes(x)?"s":"d"}
function itemSub(x){if(x.list==="events"){return [x.date&&parseLocal(x.date+"T12:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}),x.venue||x.area].filter(Boolean).join(" · ")}
  return [x.area,typeLabel(x.type)||cap(x.list),x.price].filter(Boolean).join(" · ")}
function cap(s){s=String(s||"");return s==="cocktails"?"Bar":s==="different"?"Something different":s==="new"?"New":s==="music"?"Music":s==="active"?"Active":s==="dinner"?"Dinner":s==="rooftop"?"Rooftop":s?s[0].toUpperCase()+s.slice(1):""}
function savedState(x){if(x.list==="events")return savedEvents().includes(x.id);if(S.spots.includes(x))return !!x.fav||(isMine(x)&&!x.suggested&&x.status!=="Been"&&!!x.fromDiscover);return isSaved(x)}
function icard(x,cls){const k=itemKind(x);const ev=x.list==="events";const saved=savedState(x);
  const badge=ev&&x.date?`<span class="badge acc">${esc(relDayShort(x.date))}</span>`:(k==="s"&&x.status==="Been"?`<span class="badge good">Been</span>`:"");
  return `<div class="icard press ${cls||""}" role="button" tabindex="0" data-a="${k==="s"?"spot":"idea"}" data-x="${esc(x.id)}">
    ${ph(photoOf(x),x.name,"",`${badge}<button class="save${saved?" on":""}" data-a="save" data-k="${k}" data-x="${esc(x.id)}" aria-label="Save">${ic("bookmark","sm")}</button>`)}
    <div class="meta"><div class="tx"><b>${esc(x.name)}</b><span>${esc(itemSub(x))}</span></div></div></div>`}
function relDayShort(day){const n=dayDiff(day+"T12:00");const d=parseLocal(day+"T12:00");return n===0?"Tonight":n===1?"Tomorrow":n>1&&n<7?d.toLocaleDateString("en-US",{weekday:"long"}):d.toLocaleDateString("en-US",{month:"short",day:"numeric"})}
function rail(key,items,fn){return items.length?`<div class="rail" data-rail="${key}">${items.map(fn).join("")}</div>`:""}

/* discover categories */
const carRe=/\b(car|cars|racing|race|motor|motorsport|kart|karting|auto|ferrari|porsche|lamborghini|track day|f1|formula|nascar|drift|supercar)\b/i;
const DCATS=[
  ["cars","Cars","car",x=>carRe.test([x.name,x.why,x.kind,x.notes,x.type].join(" "))],
  ["events","Events","ticket",x=>x.list==="events"],
  ["movies","Movies","film",x=>x.list==="movies"||/cinema|movie|film|imax|alamo|metrograph|angelika/i.test(x.name+" "+(x.why||""))],
  ["ideas","Date Ideas","heart",x=>x.list!=="events"&&(["different","new","active"].includes(x.list)||["Activity","Outdoors"].includes(x.type)||/date idea|romantic/i.test((x.why||"")+(x.vibe||"")))],
  ["food","Food","food",x=>x.list!=="events"&&(x.type==="Dinner"||x.list==="dinner")],
  ["nightlife","Nightlife","moon",x=>x.list!=="events"&&(["Drinks","Late night"].includes(x.type)||["cocktails","music","rooftop"].includes(x.list))],
  ["activities","Activities","target",x=>x.list!=="events"&&(["Activity","Active","Outdoors"].includes(x.type)||["active","different"].includes(x.list))],
  ["kosher","Kosher","kosher",x=>!!x.kosher||x.list==="kosher"]
];
function pool(){const t=todayStr();
  const d=S.discover.filter(x=>x.list!=="movies"&&(x.list!=="events"||(x.date&&x.date>=t))&&(x.list==="events"||!isSaved(x)));
  const s=S.spots.filter(x=>!x.closed);return [...d,...s]}
const hasPh=x=>!!photoOf(x);
const byPhoto=(a,b)=>hasPh(b)-hasPh(a)||fitScore(b)-fitScore(a);
function eventsSorted(){const t=todayStr();return S.discover.filter(x=>x.list==="events"&&x.date&&x.date>=t).sort((a,b)=>(a.date+(a.time||"")).localeCompare(b.date+(b.time||"")))}

/* =========================================================
   SCREENS (tabs)
   ========================================================= */
const SCREENS={};

/* ---------- HOME ---------- */
SCREENS.home=function(){
  const h=new Date().getHours();const greet=h<5?"Good night":h<12?"Good morning":h<17?"Good afternoon":"Good evening";
  const P=S.profile||{};
  const ups=S.loading?[]:allUpcoming();
  const nx=ups[0];let head=`${greet}, Kas`;
  if(nx){const n=dayDiff(nx.d.when),nm=esc(first(nx.p.name));head=n<=0?`${relDay(nx.d.when)} with ${nm}`:n===1?`Tomorrow: ${nm}`:n<=7?`${n} days till ${nm}`:head}
  const dayl=new Date().toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"});
  const top=`<div class="home-bar"><div class="wordmark" aria-label="Kas Upgrade">kas<i></i></div>
    <button class="me-av press" data-a="tab" data-x="me" aria-label="Me">${P.photoId?`<img src="${esc(imgSrc(P.photoId))}" alt="" onerror="this.remove()">`:"K"}</button></div>
    <h1 class="home-h" title="${esc(dayl)}">${head}${nx&&dayDiff(nx.d.when)<=7?`<span class="pdot pulse" aria-hidden="true"></span>`:""}</h1>`;
  if(S.loading)return top+loadingBlock();
  /* featured */
  const soon=ups.find(({d})=>dayDiff(d.when)<=2);
  let feat;
  if(soon){const sp=spotOf(soon.d);
    const vimg=photoOf(sp)||"";
    feat=`<button class="feature press" data-a="date" data-x="${esc(soon.p.id)}:${esc(soon.d.id)}">${vimg?`<img src="${esc(vimg)}" alt="" onerror="this.remove()">`:`<span class="glow"></span>`}<span class="shade"></span>
      <span class="who">${av(soon.p,54)}<span style="min-width:0"><b>${esc(first(soon.p.name))}</b><span>${esc([fmtTime(soon.d.when),placeName(soon.d)].filter(Boolean).join(" · "))}</span></span></span><span class="go">${ic("arrow","sm")}</span></button>`}
  else{const tdy=todayStr();const ev=eventsSorted().find(e=>e.date===tdy&&hasPh(e));const fav=S.spots.filter(s=>!s.closed&&hasPh(s)&&(s.fav||s.rating>=4));const pick=ev||fav[new Date().getDate()%Math.max(1,fav.length)]||S.spots.find(hasPh);
    feat=`<button class="feature press" data-a="tab" data-x="discover">${pick?`<img src="${esc(photoOf(pick))}" alt="" onerror="this.remove()">`:`<span class="glow"></span>`}<span class="shade"></span>
      <span class="tag"><i></i>Tonight</span><span class="copy"><b>Make your next night a good one.</b><span>${pick?esc(pick.name)+(pick.area?" · "+esc(pick.area):""):"Find your kind of night"}</span></span><span class="go">${ic("arrow","sm")}</span></button>`}
  const quick=`<div class="qrow">
    <button class="press qp main" data-a="plan">${ic("heart","sm")}Plan a date</button>
    <button class="press qp" data-a="addperson">${ic("userplus","sm")}Add person</button>
    <button class="press qp" data-a="places">${ic("bookmark","sm")}Places</button></div>`;
  /* plans rail */
  const evs=eventsSorted().filter(e=>savedEvents().includes(e.id)).map(e=>({e,t:e.date+"T"+(/^\d\d:\d\d$/.test(e.time||"")?e.time:"20:00")}));
  const items=[...ups.filter(x=>!soon||x.d!==soon.d).map(x=>({...x,t:x.d.when})),...evs].sort((a,b)=>String(a.t).localeCompare(String(b.t))).slice(0,8);
  const plans=items.length?rail("hplans",items,it=>it.e?eventPlanCard(it.e):datePlanCard(it.p,it.d))
    :`<button class="empty-card press" data-a="plan"><span class="tx"><b>Nothing planned yet</b><span>Pick someone and a spot in a few taps.</span></span><span class="iconbtn acc">${ic("plus","sm")}</span></button>`;
  /* for you */
  const pl=pool();
  const fy=[["cars","Cars"],["events","Events"],["movies","Movies"],["nightlife","Nightlife"],["ideas","Date ideas"],["food","Food"]].map(([k,l])=>{const c=DCATS.find(x=>x[0]===k);let list=pl.filter(c[3]).sort(byPhoto);if(k==="events")list=eventsSorted();
    const img=k==="movies"?((S.movies&&S.movies.movies||[]).map(m=>m.cover_image_url).find(Boolean)||""):(list.map(photoOf).find(Boolean)||"");
    const n=k==="movies"?((S.movies&&S.movies.movies)||[]).length:list.length;
    return `<button class="catcard press" data-a="dcat" data-x="${k}">${img?`<img src="${esc(img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`:`<span class="fill" style="${grad(l)}"></span>`}<span class="shade"></span><span class="ci">${ic(c[2],"sm")}</span><span class="lbl"><b>${l}</b><span>${n?n+(k==="events"?" coming up":k==="movies"?" showing":" picks"):"Explore"}</span></span></button>`});
  return top+feat+quick+nudges()+sechead("Your Plans",`<button data-a="tab" data-x="plans">See all</button>`)+plans
    +sechead("For You This Week",`<button data-a="tab" data-x="discover">Discover</button>`)+`<div class="rail" data-rail="hfy">${fy.join("")}</div>`;
};
function confState(d){const hrs=(parseLocal(d.when)-Date.now())/36e5;
  if(d.confirmed)return `<span class="state ok"><i></i>Confirmed</span>`;
  if(hrs<48)return `<span class="state wait"><i></i>Confirm with her</span>`;
  return `<span class="state"><i></i>Planned</span>`}
function datePlanCard(p,d){const sp=spotOf(d);const img=p.photoId?imgSrc(p.photoId):photoOf(sp);
  return `<button class="plancard press" data-a="date" data-x="${esc(p.id)}:${esc(d.id)}">${ph(img,p.name)}<span class="tx"><span class="when">${esc(relDay(d.when))} · ${esc(fmtTime(d.when))}</span><b>${esc(first(p.name))}</b><span class="pl">${esc(placeName(d))}${sp&&sp.area?" · "+esc(sp.area):""}</span>${confState(d)}</span></button>`}
function eventPlanCard(e){return `<button class="plancard press" data-a="idea" data-x="${esc(e.id)}">${ph(photoOf(e),e.name)}<span class="tx"><span class="when">${esc(relDayShort(e.date))}${e.time?" · "+esc(e.time):""}</span><b>${esc(e.name)}</b><span class="pl">${esc(e.venue||e.area||"")}</span><span class="state"><i style="background:var(--warn)"></i>Event</span></span></button>`}
function nudges(){
  const out=[];
  /* morning-after check-in comes first, then the text to her */
  const db=allPast().find(({p,d})=>vis(p)&&!d.debriefed&&!d.rated&&-dayDiff(d.when)<=14);
  if(db)out.push(`<div class="nudge"><div class="row">${av(db.p,40)}<div class="tx"><b>How did it go with ${esc(first(db.p.name))}?</b><span>${esc(placeName(db.d))} · ${esc(-dayDiff(db.d.when)<=0?"tonight":-dayDiff(db.d.when)===1?"last night":fmtDay(db.d.when))} · 30 seconds</span></div></div><button class="cta sm" data-a="debrief" data-x="${esc(db.p.id)}:${esc(db.d.id)}">Check in</button></div>`);
  const fu=S.people.filter(vis).map(p=>({p,d:recentFollowUp(p)})).filter(x=>x.d&&x.d!==(db&&db.d)).sort((a,b)=>parseLocal(b.d.when)-parseLocal(a.d.when))[0];
  if(fu)out.push(`<div class="nudge"><div class="row">${av(fu.p,40)}<div class="tx"><b>Follow up with ${esc(first(fu.p.name))}</b><span>After ${esc(placeName(fu.d))} · ${esc(relDay(fu.d.when)==='Today'||relDay(fu.d.when)==='Tonight'?'tonight':fmtDay(fu.d.when))}</span></div></div><button class="cta sm" data-a="followup" data-x="${esc(fu.p.id)}:${esc(fu.d.id)}">${ic("msg","sm")} Write a follow-up</button></div>`);
  const t0=new Date();t0.setHours(0,0,0,0);
  const bd=S.people.filter(p=>p.birthday&&p.status!=="Done"&&vis(p)).map(p=>({p,n:nextBday(p.birthday)})).filter(x=>x.n&&(x.n-t0)/864e5<=14).sort((a,b)=>a.n-b.n)[0];
  if(bd){const days=Math.round((bd.n-t0)/864e5);out.push(`<button class="nudge press" data-a="person" data-x="${esc(bd.p.id)}"><span class="row">${av(bd.p,40)}<span class="tx"><b>${esc(first(bd.p.name))}'s birthday</b><span>${days===0?"Today":days===1?"Tomorrow":"In "+days+" days"} · ${esc(giftFor(bd.p).label)}?</span></span>${ic("gift")}</span></button>`)}
  return out.join("");
}

/* ---------- DISCOVER ---------- */
SCREENS.discover=function(){
  return `<div class="pagehead"><h1 class="large-title">Discover</h1><div class="tools"><button class="iconbtn" data-a="map" aria-label="Map">${ic("map","sm")}</button></div></div><p class="subtitle">Find your kind of night.</p>
    <label class="search">${ic("search","sm")}<input id="dq" type="search" placeholder="Places, events, artists" value="${esc(S.dq)}" autocomplete="off" enterkeyhint="search" data-wire="dq"></label>
    <div class="catgrid">${DCATS.map(([k,l,i])=>`<button class="press" aria-pressed="${S.dCat===k}" data-a="dcat" data-x="${k}"><span class="ci">${ic(i,"sm")}</span>${l}</button>`).join("")}</div>
    <div id="dres">${discoverBody()}</div>`;
};
function discoverBody(){
  if(S.loading)return loadingBlock();
  const q=S.dq.trim().toLowerCase();const pl=pool();
  if(q){const match=x=>[x.name,x.area,x.borough,x.type,x.vibe,x.notes,x.why,x.venue,x.kind,x.list,x.kosher?"kosher":""].join(" ").toLowerCase().includes(q);
    const res=pl.filter(match).sort(byPhoto);const follows=(S.profile&&S.profile.follow)||[];const fol=follows.some(x=>x.toLowerCase()===q);
    return `<div class="grouplbl" style="margin-top:20px"><span>${res.length} result${res.length===1?"":"s"}</span>${q.length>2?`<button data-a="follow">${fol?"Following ✓":"Follow “"+esc(S.dq.trim())+"”"}</button>`:""}</div>`
      +(res.length?`<div class="grid2">${res.slice(0,40).map(x=>icard(x)).join("")}</div>`:`<div class="empty"><b>Nothing yet</b>Ask Claude to find it and it'll show up here.</div>`)}
  if(S.dCat==="movies")return moviesBody();
  if(S.dCat){const c=DCATS.find(x=>x[0]===S.dCat);let list=S.dCat==="events"?eventsSorted():pl.filter(c[3]).sort(byPhoto);
    let pre="";if(S.dCat==="events"){const follows=(S.profile&&S.profile.follow)||[];if(follows.length){const mine=list.filter(e=>follows.some(f=>(e.name+" "+(e.why||"")).toLowerCase().includes(f.toLowerCase())));
      if(mine.length)pre=sechead("Your artists")+rail("dart",mine,x=>icard(x,"wide"))}}
    return pre+`<div class="grouplbl" style="margin-top:22px"><span>${esc(c[1])} · ${list.length}</span><button data-a="dcat" data-x="">Clear</button></div>`
      +(list.length?`<div class="grid2">${list.slice(0,60).map(x=>icard(x)).join("")}</div>`:`<div class="empty"><b>No ${esc(c[1].toLowerCase())} yet</b>Ask Claude to add some ideas here.</div>`)}
  const t=todayStr();const evs=eventsSorted();
  const sec=[];
  const tonight=evs.filter(e=>e.date===t);if(tonight.length)sec.push(sechead("Tonight")+rail("dton",tonight,x=>icard(x,"wide")));
  const drive=pl.filter(x=>x.list!=="events"&&(x.borough==="Other"||/hamptons|jersey|westchester|long island|upstate|hudson|catskill|connecticut|montauk|beacon/i.test((x.area||"")+" "+(x.why||"")))).sort(byPhoto);
  if(drive.length)sec.push(sechead("Worth the drive")+rail("ddrv",drive.slice(0,12),x=>icard(x,"tall")));
  const ideas=pl.filter(DCATS[3][3]).sort(byPhoto);if(ideas.length)sec.push(sechead("Good date ideas",`<button data-a="dcat" data-x="ideas">See all</button>`)+rail("didea",ideas.slice(0,12),x=>icard(x)));
  const cars=pl.filter(DCATS[0][3]).sort(byPhoto);if(cars.length)sec.push(sechead("Cars & motorsports",`<button data-a="dcat" data-x="cars">See all</button>`)+rail("dcar",cars.slice(0,12),x=>icard(x,"wide")));
  const later=evs.filter(e=>e.date!==t);if(later.length)sec.push(sechead("Upcoming events",`<button data-a="dcat" data-x="events">See all</button>`)+rail("dev",later.slice(0,12),x=>icard(x)));
  const night=pl.filter(DCATS[5][3]).filter(x=>!(S.spots.includes(x)&&x.status==="Been")).sort(byPhoto);if(night.length)sec.push(sechead("Nightlife",`<button data-a="dcat" data-x="nightlife">See all</button>`)+rail("dnite",night.slice(0,12),x=>icard(x,"tall")));
  const food=pl.filter(DCATS[4][3]).sort(byPhoto);if(food.length)sec.push(sechead("Dinner worth dressing up for",`<button data-a="dcat" data-x="food">See all</button>`)+rail("dfood",food.slice(0,12),x=>icard(x)));
  const saved=[...S.spots.filter(s=>!s.closed&&(s.fav||(s.fromDiscover&&s.status!=="Been"))),...evs.filter(e=>savedEvents().includes(e.id))].sort(byPhoto);
  if(saved.length)sec.push(sechead("Saved for later",`<button data-a="places">All places</button>`)+rail("dsav",saved.slice(0,14),x=>icard(x)));
  return sec.join("")||`<div class="empty"><b>Nothing to discover yet</b>Ask Claude to research ideas for you.</div>`;
}
function moviesBody(){const m=(S.movies&&S.movies.movies)||[];
  if(!m.length)return `<div class="empty"><b>No movies loaded</b>Ask Claude to refresh what's playing.</div>`;
  return `<div class="grouplbl" style="margin-top:22px"><span>Now playing · ${m.length}</span><button data-a="dcat" data-x="">Clear</button></div><div class="grid2">${m.map((x,i)=>`<a class="icard press" href="${esc(safeUrl(x.movie_url)||"https://www.youtube.com/results?search_query="+encodeURIComponent(x.title+" trailer"))}" target="_blank" rel="noopener">${ph(x.cover_image_url||"",x.title)}<div class="meta"><div class="tx"><b>${esc(x.title)}</b><span>${esc([x.advisory_rating,x.runtime_minutes?x.runtime_minutes+" min":"",(x.genres||[])[0]].filter(Boolean).join(" · "))}</span></div></div></a>`).join("")}</div>`}

/* ---------- PEOPLE ---------- */
SCREENS.people=function(){
  const n=pfCount();
  return `<div class="pagehead"><h1 class="large-title">People</h1>
    <div class="tools"><button class="iconbtn" data-a="psearch" aria-label="Search">${ic("search","sm")}</button><button class="iconbtn" data-a="pfilter" aria-label="Filter">${ic("filter","sm")}${n?`<i class="dot"></i>`:""}</button><button class="iconbtn acc" data-a="newperson" aria-label="Add person">${ic("plus","sm")}</button></div></div><p class="subtitle">Connections worth remembering.</p>
    ${S.pSearch||S.pq?`<label class="search">${ic("search","sm")}<input id="pq" type="search" placeholder="Name, number, where you met" value="${esc(S.pq)}" autocomplete="off" data-wire="pq"></label>`:""}
    <button class="shotcard press" data-a="shot"><span class="si">${ic("shot")}</span><span class="tx"><b>Add from Screenshot</b><span>Upload a Hinge, Instagram or contact screenshot.</span></span>${ic("chev","sm")}</button>
    <div id="pres">${peopleBody()}</div>`;
};
function personStatus(p){const u=upcoming(p)[0],last=pastDates(p)[0];
  if(u){const n=dayDiff(u.when);const day=n===0?"tonight":n===1?"tomorrow":n<7?parseLocal(u.when).toLocaleDateString("en-US",{weekday:"long"}):fmtDay(u.when);return `<em>Date ${esc(day)}</em> · ${esc(placeName(u))}`}
  if(p.status==="Done")return "Done"+(last?" · Last date "+esc(fmtDay(last.when)):"");
  if(last)return `${esc(p.status==="Dating"?"Dating":"Last date")} · ${esc(fmtDay(last.when))}`;
  return esc([p.status||"Talking",p.whereMet?"Met on "+p.whereMet:""].filter(Boolean).join(" · "))}
function prow(p){return `<button class="prow press${p.status==="Done"?" dim":""}" data-a="person" data-x="${esc(p.id)}">${ph(p.photoId?imgSrc(p.photoId):"",p.name)}<span class="tx"><b>${esc(p.name)}${p.pinned?`<span class="pin">${ic("tack","xs")}</span>`:""}</b><span class="st">${personStatus(p)}</span></span><span class="chev">${ic("chev","sm")}</span></button>`}
function peopleBody(){
  if(S.loading)return loadingBlock();
  const q=S.pq.trim().toLowerCase(),qd=q.replace(/\D/g,"");
  const list=S.people.filter(p=>(vis(p)||S.pf.kinds.includes("Sneaky link"))&&pfPass(p)&&(!q||[p.name,p.whereMet,p.likes,p.notes,p.kind,p.contact,p.instagram,p.city,p.job,p.school].join(" ").toLowerCase().includes(q)||(qd.length>=3&&String(p.contact||"").replace(/\D/g,"").includes(qd))));
  if(!S.people.length)return `<div class="empty"><b>No one here yet</b>Add someone, or import a screenshot of her profile.</div>`;
  if(!list.length)return `<div class="empty"><b>No one matches</b>Clear the search or filters.</div>`;
  const ord=p=>{const u=upcoming(p)[0];return u?parseLocal(u.when).getTime():9e15-(p.updatedAt||0)};
  const sorted=list.slice().sort((a,b)=>(!!b.pinned-!!a.pinned)||ord(a)-ord(b));
  const G=[["Coming up",p=>p.status!=="Done"&&upcoming(p).length>0],["Talking & dating",p=>p.status!=="Done"],["Past",p=>p.status==="Done"]];
  const used=new Set();
  const hidden=S.people.filter(p=>!vis(p)).length;
  return G.map(([t,fn])=>{const g=sorted.filter(p=>!used.has(p)&&fn(p));g.forEach(p=>used.add(p));if(!g.length)return "";
    const hide=t==="Past"&&!S.showDone;
    return `<div class="grouplbl"><span>${t} · ${g.length}</span>${t==="Past"?`<button data-a="toggledone">${hide?"Show":"Hide"}</button>`:""}</div>${hide?"":`<div class="plist">${g.map(prow).join("")}</div>`}`}).join("")
    +(hidden&&!showSneaky()?`<div class="empty" style="padding-top:24px;font-size:13px">${hidden} hidden · <button class="textbtn" style="font-size:13px" data-a="sneaky">Show</button></div>`:"");
}

/* ---------- PLANS ---------- */
function planItems(){const out=[];const t=todayStr();
  S.people.filter(vis).forEach(p=>(p.dates||[]).forEach(d=>{if(d.when)out.push({kind:"date",day:d.when.slice(0,10),t:d.when,p,d})}));
  S.discover.filter(e=>e.list==="events"&&e.date&&savedEvents().includes(e.id)).forEach(e=>out.push({kind:"event",day:e.date,t:e.date+"T"+(/^\d\d:\d\d$/.test(e.time||"")?e.time:"20:00"),e}));
  S.people.filter(p=>p.birthday&&p.status!=="Done"&&vis(p)).forEach(p=>{const n=nextBday(p.birthday);if(n){const k=dkey(n);out.push({kind:"bday",day:k,t:k+"T00:00",p})}});
  return out.sort((a,b)=>String(a.t).localeCompare(String(b.t)))}
function bigplan(it,past){const dt=parseLocal(it.t);const mon=dt.toLocaleDateString("en-US",{month:"short"}).toUpperCase(),dd=dt.getDate();
  if(it.kind==="date"){const sp=spotOf(it.d);return `<button class="bigplan press${past?" past":""}" data-a="date" data-x="${esc(it.p.id)}:${esc(it.d.id)}"><span class="dcol"><small>${mon}</small><b>${dd}</b></span><span class="tx"><span class="k">Date${past&&it.d.rating?" · "+"♥".repeat(it.d.rating):""}</span><b>${esc(it.p.name)}</b><span>${esc(placeName(it.d))} · ${esc(fmtTime(it.d.when))}</span>${past?"":confState(it.d)}</span>${ph(it.p.photoId?imgSrc(it.p.photoId):photoOf(sp),it.p.name)}</button>`}
  if(it.kind==="event"){const e=it.e;return `<button class="bigplan press${past?" past":""}" data-a="idea" data-x="${esc(e.id)}"><span class="dcol"><small>${mon}</small><b>${dd}</b></span><span class="tx"><span class="k">Event</span><b>${esc(e.name)}</b><span>${esc([e.venue||e.area,e.time].filter(Boolean).join(" · "))}</span></span>${ph(photoOf(e),e.name)}</button>`}
  return `<button class="bigplan press" data-a="person" data-x="${esc(it.p.id)}"><span class="dcol"><small>${mon}</small><b>${dd}</b></span><span class="tx"><span class="k">Birthday</span><b>${esc(first(it.p.name))}'s birthday</b><span>${esc(giftFor(it.p).label)}?</span></span>${ph(it.p.photoId?imgSrc(it.p.photoId):"",it.p.name)}</button>`}
SCREENS.plans=function(){
  const items=planItems();const t=todayStr();const fut=items.filter(i=>i.day>=t&&(i.kind!=="date"||parseLocal(i.t)>=Date.now()-GRACE));
  const nDates=fut.filter(i=>i.kind==="date").length,nEv=fut.filter(i=>i.kind==="event").length;
  const seg=[["up","Upcoming"],["past","Past"],["ideas","Ideas"],["cal","Calendar"]];
  let body="";
  if(S.loading)body=loadingBlock();
  else if(S.plansSeg==="up"){const list=fut.filter(i=>i.kind!=="bday"||dayDiff(i.t)<=45).slice(0,40);
    if(!list.length)body=`<div class="empty"><b>Nothing coming up</b><button class="cta sm" style="width:auto;padding:0 20px;margin-top:10px" data-a="plan">Plan a date</button></div>`;
    else{let h="",cur="";list.forEach(i=>{const mk=i.day.slice(0,7);if(mk!==cur){cur=mk;h+=`<div class="daylbl">${esc(parseLocal(i.day+"T12:00").toLocaleDateString("en-US",{month:"long",year:dayDiff(i.day+"T12:00")>300?"numeric":undefined}))}</div>`}h+=`<div class="wrap" style="margin-bottom:10px">${bigplan(i)}</div>`});body=`<div class="sechead" style="margin-bottom:0"><h2>Coming Up</h2></div>`+h}}
  else if(S.plansSeg==="past"){const list=allPast().filter(({p})=>vis(p)).slice(0,40);
    body=list.length?`<div style="margin-top:18px">`+list.map(({p,d})=>`<div class="wrap" style="margin-bottom:10px">${bigplan({kind:"date",t:d.when,p,d},true)}</div>`).join("")+`</div>`:`<div class="empty"><b>No past dates yet</b></div>`}
  else if(S.plansSeg==="ideas"){const free=S.people.filter(p=>vis(p)&&p.status!=="Done"&&!upcoming(p).length);
    const want=S.spots.filter(s=>!s.closed&&isMine(s)&&s.status!=="Been").sort(byPhoto);
    const ideas=pool().filter(x=>!S.spots.includes(x)&&x.list!=="events").sort(byPhoto);
    body=(free.length?sechead("Plan something with")+rail("pfree",free,p=>`<button class="whocard press" data-a="plan" data-x="${esc(p.id)}">${ph(p.photoId?imgSrc(p.photoId):"",p.name)}<b>${esc(first(p.name))}</b><span>${esc(pastDates(p)[0]?"Last "+fmtDay(pastDates(p)[0].when):p.status||"Talking")}</span></button>`):"")
      +(want.length?sechead("Places you want to try",`<button data-a="places" data-x="Want to Go">See all</button>`)+rail("pwant",want.slice(0,12),x=>icard(x)):"")
      +(ideas.length?sechead("Fresh ideas",`<button data-a="tab" data-x="discover">Discover</button>`)+rail("pidea",ideas.slice(0,12),x=>icard(x)):"")
      ||`<div class="empty"><b>No ideas yet</b></div>`}
  else body=calendarBody(items);
  return `<div class="pagehead"><div><h1 class="large-title">Plans</h1></div><div class="tools"><button class="iconbtn acc" data-a="plan" aria-label="Plan a date">${ic("plus","sm")}</button></div></div>
    <div class="stats"><div><b>${fut.filter(i=>i.kind!=="bday").length}</b><span>Upcoming</span></div><div><b>${nDates}</b><span>Dates</span></div><div><b>${nEv}</b><span>Events</span></div></div>
    <div class="seg">${seg.map(([k,l])=>`<button aria-pressed="${S.plansSeg===k}" data-a="pseg" data-x="${k}">${l}</button>`).join("")}</div>${body}`;
};
function calendarBody(items){
  const t=new Date();if(!S.calM)S.calM=t.getFullYear()+"-"+pad(t.getMonth()+1);if(!S.calSel)S.calSel=todayStr();
  const [Y,M]=S.calM.split("-").map(Number);const fd=new Date(Y,M-1,1),days=new Date(Y,M,0).getDate();
  const by={};items.forEach(i=>(by[i.day]=by[i.day]||[]).push(i));
  let cells=["S","M","T","W","T","F","S"].map(x=>`<span class="w">${x}</span>`).join("");
  for(let i=0;i<fd.getDay();i++)cells+="<span></span>";
  for(let d=1;d<=days;d++){const k=`${Y}-${pad(M)}-${pad(d)}`;const its=by[k]||[];const kinds=[...new Set(its.map(i=>i.kind))];
    cells+=`<button class="${k===S.calSel?"sel":""} ${k===todayStr()?"today":""}" data-a="calday" data-x="${k}">${d}<span class="ds">${kinds.map(x=>`<i class="${x==="event"?"ev":x==="bday"?"bd":""}"></i>`).join("")}</span></button>`}
  const sel=by[S.calSel]||[];const sd=parseLocal(S.calSel+"T12:00");
  return `<div class="calhead"><button class="iconbtn" data-a="calnav" data-x="-1" aria-label="Previous month">${ic("back","sm")}</button><h3>${fd.toLocaleDateString("en-US",{month:"long",year:"numeric"})}</h3><button class="iconbtn" data-a="calnav" data-x="1" aria-label="Next month">${ic("chev","sm")}</button></div>
    <div class="calgrid">${cells}</div>
    <div class="daylbl">${esc(sd.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"}))}</div>
    ${sel.length?sel.map(i=>`<div class="wrap" style="margin-bottom:10px">${bigplan(i,i.kind==="date"&&parseLocal(i.t)<Date.now()-GRACE)}</div>`).join(""):`<div class="wrap"><div class="empty-card"><span class="tx"><span>Nothing planned this day.</span></span></div></div>`}
    ${S.calSel>=todayStr()?`<div class="wrap" style="margin-top:6px"><button class="cta ghost sm" data-a="plan" data-x=":${S.calSel}">${ic("plus","sm")} Plan a date this day</button></div>`:""}`}

/* ---------- ME ---------- */
SCREENS.me=function(){
  const P=S.profile||{};
  const all=S.people.flatMap(p=>(p.dates||[]).map(d=>({p,d})));
  const upN=all.filter(x=>x.d.when&&parseLocal(x.d.when)>=Date.now()-GRACE).length;
  const now=new Date();const spentM=all.filter(({d})=>{const w=parseLocal(d.when);return d.spent&&w&&w.getMonth()===now.getMonth()&&w.getFullYear()===now.getFullYear()}).reduce((t,{d})=>t+d.spent,0);
  const mine=S.spots.filter(s=>!s.closed&&isMine(s));
  const gi=(a,x,icn,lab,val,acc,extra)=>`<button class="gi" data-a="${a}" ${x!=null?`data-x="${esc(x)}"`:""}><span class="gic${acc?" acc":""}">${ic(icn,"sm")}</span><span class="lab">${lab}</span>${val!=null?`<span class="val">${esc(val)}</span>`:""}${extra||`<span class="chev">${ic("chev","xs")}</span>`}</button>`;
  const fid=window.kasFaceId&&window.kasFaceId.isOn();
  return `<div class="mehead"><label class="big-av press" for="me-photo">${P.photoId?`<img src="${esc(imgSrc(P.photoId))}" alt="" onerror="this.remove()">`:"K"}<span class="edit">${ic("cam","xs")}</span></label><input type="file" id="me-photo" accept="image/*" hidden data-wire="mephoto">
      <h1>Kasriel</h1><p>${esc(P.home||"New York")}</p></div>
    <div class="stats"><div><b>${S.people.filter(vis).length}</b><span>People</span></div><div><b>${upN}</b><span>Plans</span></div><div><b>${mine.length}</b><span>Places</span></div></div>
    <div class="grouptitle">Your Collection</div>
    <div class="group">${gi("places",null,"bookmark","Saved Places",mine.length,true)}${gi("notes",null,"notes","Notes & Lines",null,true)}${gi("taste",null,"sliders","Discover Preferences",null,true)}</div>
    <div class="grouptitle">Personalization</div>
    <div class="group">${gi("taste","areas","pin","Areas",(P.areas||[]).length?(P.areas||[]).join(", "):"Not set")}${gi("taste","vibe","spark","Date vibe",P.vibe||(P.styles||[])[0]||"Not set")}${gi("taste","budget","dollar","Budget",P.budget||"Not set")}${gi("taste","kosher","kosher","Kosher preferences",P.kosherPref||"No preference")}${gi("looking",null,"heart","What I'm looking for",P.lookingFor?"Set":"Add")}</div>
    <div class="grouptitle">Insights</div>
    <div class="group"><div class="gi"><span class="gic">${ic("dollar","sm")}</span><span class="lab">Spent this month</span><span class="val">${money(spentM)}</span></div><div class="gi"><span class="gic">${ic("star","sm")}</span><span class="lab">Places you've been</span><span class="val">${S.spots.filter(s=>s.status==="Been").length}</span></div></div>
    <div class="grouptitle">App</div>
    <div class="group">${gi("privacy",null,"shield","Privacy & Security")}${gi("faceid",null,"faceid","Face ID",null,false,`<span class="toggle${fid?" on":""}"></span>`)}${gi("pin",null,"lock","PIN")}${gi("appearance",null,"palette","Appearance",themeLabel())}${gi("appicon",null,"spark","App icon",(()=>{const k=(()=>{try{return localStorage.getItem("ku.icon")||"white"}catch(e){return "white"}})();return k[0].toUpperCase()+k.slice(1)})())}${gi("integrations",null,"link","Integrations")}${gi("calconn",null,"cal","Calendar connection","iPhone")}${gi("aikey",null,"ai","AI settings")}</div>
    <p style="text-align:center;color:var(--mut2);font-size:12px;margin-top:26px">Kas Upgrade 3.0 · Private</p>`;
};

/* =========================================================
   PUSH SCREENS
   ========================================================= */
const PUSH={};

/* ---------- PERSON PROFILE ---------- */
PUSH.person=function(v){
  const p=S.people.find(x=>x.id===v.id);if(!p)return navbar("")+`<div class="empty"><b>Not found</b></div>`;
  const photos=personPhotos(p);const age=pAge(p);
  const sub=[p.city||p.region,p.whereMet].filter(Boolean).join(" · ");
  const hero=`<div class="phead"><div class="top">${ph(photos[0]?imgSrc(photos[0]):"",p.name,"pav")}<div style="min-width:0"><h1>${esc(first(p.name))}${age?", "+age:""}</h1>${sub?`<p>${esc(sub)}</p>`:""}<button class="status-pill" data-a="pstatus" data-x="${esc(p.id)}">${esc(p.status||"Talking")}${p.kind?" · "+esc(p.kind):""} ${ic("chev","xs")}</button></div></div>
    ${photos.length>1?`<div class="pstrip">${photos.slice(1).map(id=>ph(imgSrc(id),p.name)).join("")}</div>`:""}</div>`;
  const dg=digits(p),ig=igHandle(p.instagram);
  const acts=`<div class="pacts">
    ${dg?`<a class="press pa main" href="sms:+${dg}"><span>${ic("msg")}</span>Text</a><a class="press pa" href="tel:+${dg}"><span>${ic("phone")}</span>Call</a>`:`<button class="press pa" data-a="editperson" data-x="${esc(p.id)}"><span>${ic("phone")}</span>Add number</button>`}
    ${ig?`<a class="press pa" href="https://www.instagram.com/${esc(ig)}/" target="_blank" rel="noopener"><span>${ic("ig")}</span>Instagram</a>`:""}
    <button class="press pa" data-a="plan" data-x="${esc(p.id)}"><span>${ic("heart")}</span>Plan date</button></div>`;
  const up=upcoming(p)[0],past=pastDates(p);
  let next;
  if(up){const sp=spotOf(up);next=`<div class="card"><h3>Next</h3><button class="next press" style="width:100%;text-align:left" data-a="date" data-x="${esc(p.id)}:${esc(up.id)}">${ph(photoOf(sp),placeName(up))}<span class="tx"><b>${esc(placeName(up))}</b><span>${esc(fmtWhen(up.when))}${sp&&sp.area?" · "+esc(sp.area):""}</span>${confState(up)}</span>${ic("chev","sm")}</button>
    <div class="btnrow" style="margin-top:14px"><button class="cta sm" data-a="confirm" data-x="${esc(p.id)}:${esc(up.id)}">${ic("send","sm")} Send details</button>${PHONE?`<a class="cta sm ghost" href="${esc(icsDateUrl(p,up))}" target="_blank" rel="noopener">${ic("cal","sm")} Calendar</a>`:""}</div></div>`}
  else if(past[0]&&!past[0].debriefed&&!past[0].rated&&-dayDiff(past[0].when)<=14){const dd=past[0];next=`<div class="card"><h3>Next</h3><p class="note" style="margin-bottom:12px">How did ${esc(placeName(dd))} go?</p><button class="cta sm" data-a="debrief" data-x="${esc(p.id)}:${esc(dd.id)}">Check in</button></div>`}
  else if(recentFollowUp(p)){const fd=recentFollowUp(p);next=`<div class="card"><h3>Next</h3><p class="note" style="margin-bottom:12px">Follow up after ${esc(placeName(fd))}.</p><div class="btnrow"><button class="cta sm" data-a="followup" data-x="${esc(p.id)}:${esc(fd.id)}">${ic("msg","sm")} Send follow-up</button><button class="cta sm ghost" data-a="plan" data-x="${esc(p.id)}">Plan next</button></div></div>`}
  else next=`<div class="card"><h3>Next</h3>${p.nextStep?`<p class="note" style="margin-bottom:12px">${esc(p.nextStep)}</p>`:""}<button class="cta sm" data-a="plan" data-x="${esc(p.id)}">Plan a date with ${esc(first(p.name))}</button></div>`;
  const likes=String(p.likes||"").split(/[,;]+/).map(x=>x.trim()).filter(Boolean);
  const bd=p.birthday?parseLocal(p.birthday+"T12:00").toLocaleDateString("en-US",{month:"long",day:"numeric"}):"";
  const rows=[["Job",p.job],["School",p.school],["From",p.from],["Lives in",[p.city,p.region].filter(Boolean).join(", ")],["Met on",p.whereMet],["Birthday",bd],["Observance",[p.keepsKosher?"Keeps kosher":"",p.shomerShabbat?"Shomer Shabbat":""].filter(Boolean).join(" · ")]].filter(r=>r[1]);
  const about=`<div class="card"><h3 style="display:flex;justify-content:space-between">About Her<button class="textbtn" style="font-size:13px" data-a="editperson" data-x="${esc(p.id)}">Edit</button></h3>
    <div class="tags" style="margin-bottom:${rows.length?12:0}px">${likes.map(l=>`<span class="tag acc">${esc(l)}</span>`).join("")}<button class="tag add" data-a="addlike" data-x="${esc(p.id)}">${ic("plus","xs")} ${likes.length?"Add":"What she likes"}</button></div>
    ${rows.length?`<div class="kv">${rows.map(([k,v])=>`<div class="r"><span>${k}</span><b>${esc(v)}</b></div>`).join("")}</div>`:""}</div>`;
  const notes=`<div class="card press" role="button" data-a="pnotes" data-x="${esc(p.id)}"><h3>Notes</h3>${p.notes?`<p class="note">${esc(p.notes)}</p>`:`<p class="note ph-text">Things she told you, her dog's name…</p>`}${p.review?`<h3 style="margin-top:16px">Your take</h3><p class="note">${esc(p.review)}</p>`:""}</div>`;
  const dr=(d,isUp)=>{const w=parseLocal(d.when);return `<button class="it" data-a="date" data-x="${esc(p.id)}:${esc(d.id)}"><span class="dbox${isUp?" up":""}"><small>${esc(w.toLocaleDateString("en-US",{month:"short"}))}</small><b>${w.getDate()}</b></span><span class="tx"><b>${esc(placeName(d))}</b><span>${esc(fmtTime(d.when))}${d.rating?" · "+"♥".repeat(d.rating):""}${d.spent?" · "+money(d.spent):""}${d.debrief&&d.debrief.vibe&&d.debrief.vibe.length?" · "+esc(d.debrief.vibe.slice(0,2).join(", ")):""}</span></span>${ic("chev","xs")}</button>`};
  const ups=upcoming(p);const spent=(p.dates||[]).reduce((t,d)=>t+(d.spent||0),0);
  const dates=(!ups.length&&!past.length)?"":`<div class="card"><h3 style="display:flex;justify-content:space-between">Dates${past.length?" · "+past.length+" so far":""}${spent?`<span style="font-weight:500">${money(spent)} total</span>`:""}</h3><div class="tl">
    ${ups.length?`<div class="sublbl">Upcoming</div>`+ups.map(d=>dr(d,true)).join(""):""}
    ${past.length?`<div class="sublbl">Past</div>`+past.slice(0,8).map(d=>dr(d,false)).join(""):""}
    ${!ups.length&&!past.length?`<p class="note ph-text">No dates yet.</p>`:""}</div>
    <button class="textbtn" style="margin-top:10px" data-a="plan" data-x="${esc(p.id)}">+ Plan a date</button></div>`;
  const rt=p.ratings||{};
  const rvals=PRATES.map(([k])=>rt[k]||0).filter(Boolean);const ravg=rvals.length?(rvals.reduce((a,b)=>a+b,0)/rvals.length):0;
  const ratings=`<div class="card"><h3 style="display:flex;justify-content:space-between;align-items:baseline">Your rating${ravg?`<span class="ravg">${ravg.toFixed(1)}<small>/5</small></span>`:""}</h3><div class="rlist">${PRATES.map(([k,l])=>{const v=rt[k]||0;return `<div class="rrow"><div class="rl"><b>${l}</b><span class="${v?"on":""}">${RWORD[v]}</span></div><span class="hearts big">${[1,2,3,4,5].map(n=>`<button class="${n<=v?"on":""}" data-a="prate" data-x="${esc(p.id)}:${k}:${n}" aria-label="${l} ${n} of 5">${HEART}</button>`).join("")}</span></div>`}).join("")}</div></div>`;
  const places=[...new Map(past.map(d=>[d.spotId||d.spotName,d])).values()].filter(d=>d.spotId||d.spotName);
  const placesC=places.length?`<div class="card"><h3>Places together</h3><div class="tags">${places.map(d=>{const s=spotOf(d);return s?`<button class="tag" data-a="spot" data-x="${esc(s.id)}">${esc(s.name)}</button>`:`<span class="tag">${esc(d.spotName)}</span>`}).join("")}</div></div>`:"";
  const mem=`<div class="card"><h3 style="display:flex;justify-content:space-between">Memories<label class="textbtn" style="font-size:13px" for="pv-photo-${esc(p.id)}">Add photo</label></h3><input type="file" id="pv-photo-${esc(p.id)}" accept="image/*" hidden data-wire="pvphoto" data-x="${esc(p.id)}">
    ${photos.length?`<div class="memgrid">${photos.map(id=>`<button class="ph${id===p.photoId?" on":""}" data-a="pphoto" data-x="${esc(p.id)}|${esc(id)}"><img src="${esc(imgSrc(id))}" alt="" loading="lazy" onerror="this.remove()"></button>`).join("")}</div>`:`<p class="note ph-text">Add her photos to make this feel like her.</p>`}</div>`;
  const g=giftFor(p);
  const gift=`<a class="card press" style="display:flex;align-items:center;gap:14px" href="${esc(g.url)}" target="_blank" rel="noopener"><span class="gic" style="width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--acc-soft);color:var(--acc2)">${ic("gift","sm")}</span><span style="flex:1;display:flex;flex-direction:column;gap:2px"><b style="font-size:15px">Gift idea · ${esc(g.label)}</b><span style="font-size:13px;color:var(--mut)">${esc(g.why)} · ${esc(g.site)}</span></span>${ic("chev","sm")}</a>`;
  return navbar("",`<button class="iconbtn" data-a="pmore" data-x="${esc(p.id)}" aria-label="More">${ic("more","sm")}</button>`)+`<div class="pp">`+hero+acts
    +`<div class="stack">${next}${about}${notes}${dates}${ratings}${placesC}${mem}${gift}</div></div>`;
};

/* ---------- PLACES ---------- */
const COLLS=["All","Favorites","Want to Go","Been","Date Spots","Kosher"];
function isDateSpot(s){return beenWith(s).length>0||["First date","Second date","Special night"].includes(s.bestFor)||s.vibe==="Romantic"}
PUSH.places=function(v){
  if(v.coll)S.pcoll=v.coll,v.coll=null;
  return navbar("Places",`<button class="iconbtn" data-a="map" aria-label="Map">${ic("map","sm")}</button><button class="iconbtn acc" data-a="newspot" aria-label="Add place">${ic("plus","sm")}</button>`)
    +`<div class="pagehead" style="padding-top:0"><h1 class="large-title">Places</h1></div><p class="subtitle">The spots worth remembering.</p>
    <label class="search">${ic("search","sm")}<input id="plq" type="search" placeholder="Name, area, notes" value="${esc(S.plq)}" autocomplete="off" data-wire="plq"></label>
    <div class="coll chips">${COLLS.map(c=>`<button class="chip" aria-pressed="${S.pcoll===c}" data-a="pcoll" data-x="${c}">${c}</button>`).join("")}</div>
    <div id="plres" style="margin-top:18px">${placesBody()}</div>`;
};
function pcard(s){const been=s.status==="Been";const w=beenWith(s);
  const flag=s.fav?`<span class="flag fav">${ic("heart","xs")} Favorite</span>`:been?`<span class="flag been">${ic("check","xs")} Been</span>`:`<span class="flag want">Want to go</span>`;
  return `<div class="icard pcard press" role="button" data-a="spot" data-x="${esc(s.id)}">${ph(photoOf(s),s.name,"",`${flag}<button class="save${s.fav?" on":""}" data-a="save" data-k="s" data-x="${esc(s.id)}" aria-label="Favorite">${ic("heart","sm")}</button>`)}
    <div class="meta"><div class="tx"><b>${esc(s.name)}</b><span>${esc(s.area||s.borough||"")}</span><span>${esc([typeLabel(s.type),s.price].filter(Boolean).join(" · "))}${s.rating?" · "+"★".repeat(s.rating):""}</span>${w.length?`<span class="with">Been with ${esc(w.map(first).join(", "))}</span>`:""}</div></div></div>`}
function placesBody(){
  if(S.loading)return loadingBlock();
  const q=S.plq.trim().toLowerCase();const c=S.pcoll;
  const ok=s=>c==="All"||(c==="Favorites"&&s.fav)||(c==="Want to Go"&&s.status!=="Been")||(c==="Been"&&s.status==="Been")||(c==="Date Spots"&&isDateSpot(s))||(c==="Kosher"&&s.kosher);
  const rows=S.spots.filter(s=>!s.closed&&isMine(s)&&ok(s)&&(!q||[s.name,s.area,s.notes,s.vibe,s.type,s.address].join(" ").toLowerCase().includes(q)))
    .sort((a,b)=>(!!b.fav-!!a.fav)||hasPh(b)-hasPh(a)||(b.updatedAt||0)-(a.updatedAt||0));
  if(!rows.length)return `<div class="empty"><b>Nothing here yet</b>${c==="All"&&!q?"Save places from Discover or add your own.":"Try another collection."}</div>`;
  return `<div class="grid2">${rows.map(pcard).join("")}</div>`}

/* ---------- NOTES & LINES ---------- */
PUSH.notes=function(){
  const n=S.notes||{};const t=S.notesTab;
  const tabs=[["openers","Openers"],["games","Games"],["mindset","Mindset"],["gifts","Gifts"]];
  let body="";
  if(t==="openers"||t==="games"){const arr=n[t]||[];
    body=`<div class="grouplbl"><span>${S.notesEdit?"Tap remove to delete":"Tap a line to copy it"}</span><button data-a="notesedit">${S.notesEdit?"Done":"Edit"}</button></div>
      <div class="wrap lines">${arr.map((x,i)=>S.notesEdit?`<div class="line-it"><span class="tx">${esc(x)}</span><button class="textbtn bad" style="font-size:14px" data-a="rmline" data-x="${t}:${i}">Remove</button></div>`:`<button class="line-it press" data-a="copy" data-x="${esc(x)}"><span class="tx">${esc(x)}</span>${ic("copy","sm")}</button>`).join("")||`<div class="empty"><b>No lines yet</b></div>`}
      ${S.notesEdit?`<button class="cta ghost sm" data-a="addline" data-x="${t}">${ic("plus","sm")} Add a line</button>`:""}</div>`}
  else if(t==="mindset"){const arr=n.mindset||[];
    body=`<div class="card motiv" style="margin-top:18px;display:flex;flex-direction:column;gap:14px"><span class="big">${esc(n.mindsetTitle||"Mindset")}</span>${arr.map(l=>`<span class="note" style="font-size:17px;color:var(--fg)">${esc(l)}</span>`).join("")}</div>`}
  else{const gs=(n.gifts||[]).filter(g=>safeUrl(g.url));const links=(n.links||[]).filter(l=>safeUrl(l.url));const all=[...gs.map(g=>({label:g.label,sub:g.why||g.moment||"",url:g.url})),...links.map(l=>({label:l.label,sub:(()=>{try{return new URL(l.url).hostname.replace(/^www\./,"")}catch(e){return ""}})(),url:l.url}))];
    body=`<div class="wrap lines" style="margin-top:18px">${all.map(g=>`<a class="line-it press" href="${esc(g.url)}" target="_blank" rel="noopener"><span class="tx"><b style="font-weight:600">${esc(g.label)}</b><br><span style="color:var(--mut);font-size:13px">${esc(g.sub)}</span></span>${ic("chev","sm")}</a>`).join("")||`<div class="empty"><b>No gift ideas yet</b>Send Claude a link to save it here.</div>`}</div>`}
  return navbar("Notes & Lines")+`<div class="pagehead" style="padding-top:0"><h1 class="large-title">Notes & Lines</h1></div>
    <div class="seg">${tabs.map(([k,l])=>`<button aria-pressed="${t===k}" data-a="ntab" data-x="${k}">${l}</button>`).join("")}</div>${body}`;
};

/* ---------- PLAN A DATE (guided) ---------- */
const DKINDS=[["Dinner","food",s=>s.type==="Dinner"||s.list==="dinner"],["Drinks","drink",s=>["Drinks","Coffee","Late night"].includes(s.type)||["cocktails","music","rooftop"].includes(s.list)],
  ["Activity","target",s=>["Activity","Active","Outdoors"].includes(s.type)||["active","different"].includes(s.list)],["Cars","car",s=>carRe.test([s.name,s.why,s.notes,s.kind].join(" "))],
  ["Comedy","laugh",s=>/comedy|comedian|stand.?up|laugh|improv/i.test([s.name,s.why,s.notes,s.kind].join(" "))],["Movie","film",s=>/cinema|movie|film|imax|alamo|metrograph|angelika|theater|theatre/i.test([s.name,s.why,s.notes].join(" "))],
  ["Something different","dice",s=>["different","new"].includes(s.list)||["Activity","Outdoors"].includes(s.type)||/unique|different|immersive|hidden/i.test((s.why||"")+(s.notes||""))]];
function newFlow(who,day){const f={step:who?1:0,who:who||"",newName:"",day:day||"",time:"20:00",len:120,kind:"",pick:null,q:"",area:"Anywhere",kos:undefined,saved:null};if(day&&who)f.step=1;return f}
PUSH.plan=function(){
  const F=S.flow;const steps=["Who?","When?","What kind of date?","Where?","Your plan"];
  const pp=S.people.find(p=>p.id===F.who);const name=pp?pp.name:F.newName;
  let body="",canNext=false,nextLbl="Continue";
  if(F.step===0){const ppl=S.people.filter(p=>p.status!=="Done"&&(vis(p)||p.id===F.who)).sort((a,b)=>(!!b.pinned-!!a.pinned)||((b.updatedAt||0)-(a.updatedAt||0)));
    body=`<div class="stepq"><div class="kicker">Step 1 of 5</div><h2>Who?</h2></div><div style="margin-top:22px">${`<div class="rail" data-rail="who">`+ppl.map(p=>`<button class="whocard press" aria-pressed="${F.who===p.id}" data-a="fwho" data-x="${esc(p.id)}">${ph(p.photoId?imgSrc(p.photoId):"",p.name,"",`<span class="chk">${ic("check","xs")}</span>`)}<b>${esc(first(p.name))}</b><span>${esc(p.status||"Talking")}</span></button>`).join("")
      +`<button class="whocard press" aria-pressed="${F.who==="__new"}" data-a="fwho" data-x="__new"><span class="ph" style="display:grid;place-items:center;color:var(--acc2)">${ic("plus")}<span class="chk">${ic("check","xs")}</span></span><b>Someone new</b><span>Type a name</span></button></div>`}</div>
      ${F.who==="__new"?`<div class="wrap" style="margin-top:20px"><div class="fgroup"><div class="f"><label>Name</label><input id="fnew" value="${esc(F.newName)}" placeholder="Her name" autocomplete="off" data-wire="fnew"></div></div></div>`:""}`;
    canNext=!!((F.who&&F.who!=="__new")||F.newName.trim())}
  else if(F.step===1){const t0=new Date();t0.setHours(0,0,0,0);const plus=n=>{const d=new Date(t0);d.setDate(d.getDate()+n);return d};const nextDow=w=>plus(((w-t0.getDay()+7)%7)||7);
    const opts=[];[["Tonight",dkey(t0)],["Tomorrow",dkey(plus(1))],["Friday",dkey(t0.getDay()===5?t0:nextDow(5))],["Saturday",dkey(t0.getDay()===6?t0:nextDow(6))]].forEach(o=>{if(!opts.some(x=>x[1]===o[1]))opts.push(o)});
    const custom=F.day&&!opts.some(o=>o[1]===F.day);
    const times=["18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30","22:00","22:30"];
    const shab=pp&&pp.shomerShabbat&&F.day&&isShabbat(F.day+"T"+F.time);
    body=`<div class="stepq"><div class="kicker">Step 2 of 5</div><h2>When?</h2>${name?`<p>With ${esc(first(name))}</p>`:""}</div>
      <div class="optlist">${opts.map(([l,k])=>`<button class="opt press" aria-pressed="${F.day===k}" data-a="fday" data-x="${k}"><span class="oi">${ic("cal","sm")}</span><span class="grow">${l}<small>${esc(parseLocal(k+"T12:00").toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"}))}</small></span></button>`).join("")}
        <label class="opt press" aria-pressed="${!!custom}" style="position:relative"><span class="oi">${ic("plans","sm")}</span><span class="grow">Choose date<small>${custom?esc(parseLocal(F.day+"T12:00").toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})):"Any day"}</small></span><input type="date" min="${dkey(t0)}" value="${custom?F.day:""}" style="position:absolute;inset:0;opacity:0" data-wire="fdate"></label></div>
      <div class="flabel" style="padding:0 var(--pad);margin:24px 0 0">Time</div>
      <div class="timechips">${times.map(t=>`<button class="chip" aria-pressed="${F.time===t}" data-a="ftime" data-x="${t}">${fmtT(t)}</button>`).join("")}</div>
      <div class="flabel" style="padding:0 var(--pad);margin:20px 0 0">How long</div>
      <div class="seg" style="margin-top:10px">${[[90,"1.5 hours"],[120,"2 hours"],[180,"3 hours"]].map(([v,l])=>`<button aria-pressed="${F.len===v}" data-a="flen" data-x="${v}">${l}</button>`).join("")}</div>
      ${shab?`<div class="wrap" style="margin-top:16px"><div class="warn-note">${ic("clock","sm")}<span>${esc(first(name))} keeps Shabbat. Pick Saturday after Shabbat ends or another day.</span></div></div>`:""}`;
    canNext=!!F.day}
  else if(F.step===2){body=`<div class="stepq"><div class="kicker">Step 3 of 5</div><h2>What kind of date?</h2></div>
      <div class="optgrid">${DKINDS.map(([k,i])=>`<button class="opt press" aria-pressed="${F.kind===k}" data-a="fkind" data-x="${esc(k)}"><span class="oi">${ic(i,"sm")}</span>${esc(k)}</button>`).join("")}</div>`;
    canNext=!!F.kind}
  else if(F.step===3){if(F.kos===undefined)F.kos=!!(pp&&pp.keepsKosher)||((S.profile||{}).kosherPref==="Kosher only");
    body=`<div class="stepq"><div class="kicker">Step 4 of 5</div><h2>Where?</h2><p>${esc(F.kind)} ideas from your places and Discover.</p></div>
      <label class="search">${ic("search","sm")}<input id="fq" type="search" placeholder="Search any place" value="${esc(F.q)}" autocomplete="off" data-wire="fq"></label>
      <div class="chips" style="margin-top:12px">${["Anywhere","Manhattan","Brooklyn","Queens"].map(a=>`<button class="chip" aria-pressed="${F.area===a}" data-a="farea" data-x="${a}">${a}</button>`).join("")}<button class="chip" aria-pressed="${!!F.kos}" data-a="fkos">Kosher</button></div>
      <div id="fres" style="margin-top:18px">${whereBody()}</div>`;
    canNext=!!F.pick}
  else{const pk=flowPick();const w=F.day+"T"+F.time;
    body=`<div class="stepq"><div class="kicker">${F.saved?"Saved":"Step 5 of 5"}</div><h2>${F.saved?"You're set.":"Looks good?"}</h2></div>
      <div class="summary">${ph(photoOf(pk),pk?pk.name:"")}<div class="body">
        <div class="who">${pp?av(pp,44):`<span class="av" style="width:44px;height:44px;${grad(name)}">${esc(initials(name))}</span>`}<b>${esc(first(name))}</b></div>
        <div class="line">${ic("clock","sm")}${esc(parseLocal(w).toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"}))} · ${esc(fmtT(F.time))}</div>
        <div class="line">${ic("pin","sm")}${esc(pk?pk.name:"")}${pk&&pk.area?" · "+esc(pk.area):""}</div>
        <div class="line">${ic("spark","sm")}${esc(F.kind)} · ${F.len/60} hours</div>
        ${pk&&!S.spots.includes(pk)?`<span style="font-size:13px;color:var(--mut)">This place will be added to your Places.</span>`:""}
      </div></div>
      ${pp&&pp.shomerShabbat&&isShabbat(w)?`<div class="wrap" style="margin-top:14px"><div class="warn-note">${ic("clock","sm")}<span>This falls on Shabbat for her.</span></div></div>`:""}
      ${F.saved?`<div class="wrap stack gap8" style="margin-top:18px">${PHONE?`<a class="cta ghost" href="${esc(F.saved.ics)}" target="_blank" rel="noopener">${ic("cal","sm")} Add to Calendar</a>`:""}<button class="cta ghost" data-a="confirm" data-x="${esc(F.saved.pid)}:${esc(F.saved.did)}">${ic("send","sm")} Text Her</button></div>`:""}`;
    canNext=true;nextLbl=F.saved?"Done":"Save Plan"}
  return navbar("Plan a Date")+`<div class="steps">${[0,1,2,3,4].map(i=>`<i class="${i<=F.step?"on":""}"></i>`).join("")}</div>`+body+`<div style="height:90px"></div>
    <div class="flowbar"><div class="btnrow">${F.step>0&&!F.saved?`<button class="cta ghost" style="flex:0 0 96px" data-a="fback">Back</button>`:""}<button class="cta" ${canNext?"":"disabled"} data-a="fnext">${nextLbl}</button></div></div>`;
};
function flowPick(){const F=S.flow;if(!F.pick)return null;return F.pick.k==="s"?S.spots.find(x=>x.id===F.pick.id):F.pick.k==="d"?S.discover.find(x=>x.id===F.pick.id):{name:F.pick.name,area:""}}
function wherePool(){const F=S.flow;const pp=S.people.find(p=>p.id===F.who);const pname=pp?pp.name:F.newName;
  const kf=(DKINDS.find(k=>k[0]===F.kind)||[])[2];const q=F.q.trim().toLowerCase();
  const base=[...S.spots.filter(s=>!s.closed),...S.discover.filter(d=>d.list!=="events"&&d.list!=="movies"&&!isSaved(d))];
  const filt=x=>(F.area==="Anywhere"||x.borough===F.area)&&(!F.kos||x.kosher)&&(!q||[x.name,x.area,x.type,x.notes,x.why,x.vibe].join(" ").toLowerCase().includes(q));
  let list=base.filter(x=>filt(x)&&(q||!kf||kf(x)));let fallback=false;
  if(!list.length&&!q){list=base.filter(filt);fallback=true}
  const P=S.profile||{};const ar=(P.areas||[]).join(" ").toLowerCase();
  const scored=list.map(s=>{const isSpot=S.spots.includes(s);const w=isSpot?beenWith(s):[];const repeat=!!(pname&&w.includes(pname));let sc=0;
    if(repeat)sc-=10;else if(isSpot&&s.status==="Been"&&s.rating>=4)sc+=3+s.rating*.5;else if(isSpot&&s.status!=="Been")sc+=4;else if(!isSpot)sc+=2.5;
    if(s.fav)sc+=2;if(hasPh(s))sc+=1.5;
    if(pp&&pp.kind==="Serious"&&["Romantic","Impressive"].includes(s.vibe))sc+=1.5;
    if((ar.includes("williamsburg")&&/williamsburg|greenpoint/i.test(s.area||""))||(ar.includes("manhattan")&&s.borough==="Manhattan"))sc+=1.5;
    if(P.kosherPref==="Show kosher first"&&s.kosher)sc+=2;
    if(pp&&pp.likes&&(s.notes||s.why)&&pp.likes.toLowerCase().split(/[ ,]+/).some(x=>x.length>3&&String(s.notes||s.why).toLowerCase().includes(x)))sc+=2;
    return {s,sc,repeat,w}}).sort((a,b)=>b.sc-a.sc);
  return {scored,fallback}}
function whereBody(){const F=S.flow;const {scored,fallback}=wherePool();
  const card=({s,repeat,w})=>{const k=S.spots.includes(s)?"s":"d";const on=F.pick&&F.pick.k===k&&F.pick.id===s.id;const been=k==="s"&&s.status==="Been";
    return `<div class="icard press" role="button" data-a="fpick" data-x="${k}:${esc(s.id)}">${ph(photoOf(s),s.name,"",`${repeat?`<span class="badge" style="background:rgba(232,176,75,.9);color:#1a1205">Been with ${esc(first(w[0]))}</span>`:been?`<span class="badge good">Been</span>`:`<span class="badge">Not been</span>`}${on?`<span class="save on" style="background:var(--acc);color:#fff">${ic("check","sm")}</span>`:""}`,on?"box-shadow:0 0 0 2.5px var(--bg),0 0 0 4.5px var(--acc)":"")}
      <div class="meta"><div class="tx"><b>${esc(s.name)}</b><span>${esc(s.area||s.borough||"")}</span><span>${esc([s.vibe,s.price].filter(Boolean).join(" · ")||typeLabel(s.type))}</span></div></div></div>`};
  const typed=F.q.trim();
  return (fallback?`<div class="wrap" style="margin-bottom:14px"><div class="warn-note" style="color:var(--fg2);background:var(--s1)">${ic("spark","sm")}<span>Nothing tagged ${esc(F.kind.toLowerCase())} yet, so here's everything.</span></div></div>`:"")
    +(scored.length?`<div class="grid2 picklist">${scored.slice(0,F.lim||30).map(card).join("")}</div>${scored.length>(F.lim||30)?`<div class="wrap" style="margin-top:14px"><button class="cta ghost sm" data-a="fmore">Show more</button></div>`:""}`:`<div class="empty"><b>No matches</b>Try another area or search.</div>`)
    +(typed?`<div class="wrap" style="margin-top:14px"><button class="cta ghost sm" data-a="fcustom">Use “${esc(typed)}”</button></div>`:"")}
async function saveFlow(btn){const F=S.flow;if(!needDb())return;const pk=flowPick();if(!pk)return;
  btn.disabled=true;btn.textContent="Saving…";
  let spotId="",spotName=pk.name||"";
  if(F.pick.k==="s")spotId=pk.id;else if(F.pick.k==="d"){spotId=await saveDiscover(pk.id,true)||""}
  const d={id:"d"+Date.now().toString(36),when:F.day+"T"+F.time,len:F.len,spotId,spotName,notes:"",kind:F.kind,cal:false,rated:false};
  if(!spotId&&F.pick.k==="c")d.address=pk.name;
  let person=S.people.find(p=>p.id===F.who),body,ref;
  if(person){body=strip(person);ref=S.db.collection("people").doc(person.id)}
  else{body={name:F.newName.trim(),status:"Talking",whereMet:"",contact:"",likes:"",nextStep:"",notes:"",dates:[]};ref=S.db.collection("people").doc()}
  body.dates=[...(body.dates||[]),d];if(body.status==="Talking"||!body.status)body.status="Date set";body.updatedAt=Date.now();
  try{await ref.set(body)}catch(e){btn.disabled=false;btn.textContent="Save Plan";toast("Couldn't save. Try again.");return}
  F.saved={pid:ref.id,did:d.id,ics:icsDateUrl({...body,id:ref.id},d)};toast("Date saved");refresh()}

/* =========================================================
   SHEETS — one system for everything
   ========================================================= */
function sheet(o){
  const root=$("sheets");root.innerHTML="";
  const bg=document.createElement("div");bg.className="sheet-bg";
  bg.innerHTML=`<div class="sheet${o.full?" full":""}" role="dialog" aria-label="${esc(o.title||"")}"><div class="grab"></div>
    ${o.title!==false?`<div class="sh">${o.left||`<button class="x" data-sx aria-label="Close">${ic("x","xs")}</button>`}<div class="ttl">${esc(o.title||"")}</div>${o.right||`<span class="spacer"></span>`}</div>`:""}
    <div class="sb">${o.body||""}</div>${o.foot?`<div class="sf">${o.foot}</div>`:""}</div>`;
  root.appendChild(bg);
  const sh=bg.querySelector(".sheet");
  const close=()=>{if(bg.classList.contains("out"))return;bg.classList.add("out");setTimeout(()=>{bg.remove();o.onClose&&o.onClose()},230)};
  bg.addEventListener("click",e=>{if(e.target===bg||e.target.closest("[data-sx]"))close()});
  /* swipe down to dismiss */
  let y0=null,dy=0,grab=false;const sb=sh.querySelector(".sb");
  sh.addEventListener("touchstart",e=>{grab=!!e.target.closest(".grab,.sh");if(!grab&&(e.target.closest("input,textarea,select,.rail,.daypick,.found,.timechips,.chips,.dimg")||sb.scrollTop>0)){y0=null;return}y0=e.touches[0].clientY;dy=0},{passive:true});
  sh.addEventListener("touchmove",e=>{if(y0===null)return;dy=e.touches[0].clientY-y0;if(dy<=0){sh.style.transform="";return}if(!grab&&sb.scrollTop>0){y0=null;sh.style.transform="";return}sh.style.transition="none";sh.style.transform=`translateY(${dy}px)`;if(e.cancelable)e.preventDefault()},{passive:false});
  sh.addEventListener("touchend",()=>{if(y0===null)return;y0=null;sh.style.transition="transform .25s var(--ease)";if(dy>110){sh.style.transform="translateY(100%)";setTimeout(()=>{bg.remove();o.onClose&&o.onClose()},220)}else sh.style.transform="";dy=0},{passive:true});
  after(sh);
  const api={el:sh,bg,close,q:s=>sh.querySelector(s),qa:s=>sh.querySelectorAll(s),
    setBody:h=>{sb.innerHTML=h;after(sb)},setFoot:h=>{const f=sh.querySelector(".sf");if(f)f.innerHTML=h}};
  o.wire&&o.wire(api);
  return api}
function closeSheet(){const b=$("sheets").querySelector(".sheet-bg");if(b){b.classList.add("out");setTimeout(()=>b.remove(),230)}}
/* keyboard: lift sheets above the iOS keyboard */
if(window.visualViewport){const vv=window.visualViewport;const upd=()=>{const kb=Math.max(0,window.innerHeight-vv.height-vv.offsetTop);document.documentElement.style.setProperty("--kb",kb+"px");document.body.classList.toggle("kb-open",kb>80)};vv.addEventListener("resize",upd);vv.addEventListener("scroll",upd)}
const kbcss=document.createElement("style");kbcss.textContent=`.sheet-bg{padding-bottom:var(--kb,0px);transition:padding-bottom .2s}body.kb-open .sheet .sf{padding-bottom:12px}body.kb-open .flowbar{display:none}`;document.head.appendChild(kbcss);

/* field builders */
const F={
  text:(id,label,val,ph,extra)=>`<div class="f"><label for="${id}">${label}</label><input id="${id}" value="${esc(val??"")}" placeholder="${esc(ph||"")}" autocomplete="off" ${extra||""}></div>`,
  sel:(id,label,list,val,blank)=>`<div class="f"><label for="${id}">${label}</label><select id="${id}">${blank!==false?`<option value="">${blank||"None"}</option>`:""}${list.map(o=>`<option ${o===val?"selected":""}>${esc(o)}</option>`).join("")}</select></div>`,
  area:(id,label,val,ph,rows)=>`<div class="f col"><label for="${id}">${label}</label><textarea id="${id}" rows="${rows||3}" placeholder="${esc(ph||"")}">${esc(val??"")}</textarea></div>`,
  tog:(id,label,on)=>`<button type="button" class="f" data-tog="${id}" style="width:100%;text-align:left"><label style="width:auto;color:var(--fg)">${label}</label><span class="toggle tg${on?" on":""}" id="${id}"></span></button>`
};
function wireToggles(api){api.qa("[data-tog]").forEach(b=>b.onclick=()=>{const t=api.q("#"+b.dataset.tog);t.classList.toggle("on")})}
const val=(api,id)=>{const e=api.q("#"+id);return e?String(e.value||"").trim():""};
const on=(api,id)=>{const e=api.q("#"+id);return !!(e&&e.classList.contains("on"))};
function autoGrow(api){api.qa("textarea").forEach(a=>{const fit=()=>{a.style.height="auto";a.style.height=Math.max(84,a.scrollHeight)+"px"};fit();a.addEventListener("input",fit)})}

/* ---------- person: edit ---------- */
function editPerson(person){
  const p=person?JSON.parse(JSON.stringify(person)):{status:"Talking",dates:[]};
  let file=null,removePh=false;
  const body=`<div class="photo-edit"><span id="pe-ph">${ph(p.photoId?imgSrc(p.photoId):"",p.name||"?")}</span><div class="btns"><label class="pillbtn acc" for="pe-file">${ic("cam","xs")} ${p.photoId?"Change photo":"Add photo"}</label>${p.photoId?`<button type="button" class="pillbtn" id="pe-rm">Remove</button>`:""}</div><input type="file" id="pe-file" accept="image/*" hidden></div>
    <div class="fgroup">${F.text("pe-name","Name",p.name,"Her name")}${F.text("pe-age","Age",p.age,"","inputmode=numeric")}<div class="f"><label for="pe-bday">Birthday</label><input id="pe-bday" type="date" value="${esc(p.birthday||"")}"></div>${F.sel("pe-status","Status",PSTAT,p.status||"Talking",false)}${F.sel("pe-kind","Type",KINDS,p.kind,"Not set")}</div>
    <div class="flabel">Contact</div><div class="fgroup">${F.text("pe-phone","Phone",p.contact,"Optional","inputmode=tel")}${F.text("pe-ig","Instagram",p.instagram?"@"+igHandle(p.instagram):"","@handle","autocapitalize=off")}${F.text("pe-met","Met on",p.whereMet,"Hinge, a party…")}</div>
    <div class="flabel">About her</div><div class="fgroup">${F.text("pe-job","Job",p.job,"")}${F.text("pe-school","School",p.school,"")}${F.text("pe-from","From",p.from,"Brazil, Tel Aviv…")}${F.text("pe-city","City",p.city,"Upper West Side…")}${F.sel("pe-region","Lives in",REGIONS,p.region,"Not set")}${F.text("pe-addr","Address",p.address,"Street, apt")}${F.text("pe-likes","Likes",p.likes,"Sushi, live music…")}</div>
    <div class="fgroup">${F.tog("pe-kosher","Keeps kosher",p.keepsKosher)}${F.tog("pe-shabbat","Shomer Shabbat",p.shomerShabbat)}</div>
    <div class="flabel">Notes</div><div class="fgroup">${F.area("pe-next","Next step",p.nextStep,"Text her Thursday about Friday",1)}${F.area("pe-notes","Notes",p.notes,"Things she told you…")}${F.area("pe-review","Your take",p.review,"Green flags, red flags…")}</div>
    ${person&&p.birthday&&PHONE?`<a class="cta ghost sm" href="${esc(icsBdayUrl(person))}" target="_blank" rel="noopener">${ic("cal","sm")} Add birthday to Calendar</a>`:""}
    ${person?`<button type="button" class="textbtn bad" style="align-self:center;padding:10px" id="pe-del">Delete ${esc(first(person.name))}</button>`:""}`;
  sheet({title:person?"Edit Profile":"New Person",full:true,body,right:`<button class="done" id="pe-save">Save</button>`,wire:api=>{
    wireToggles(api);autoGrow(api);
    api.q("#pe-file").onchange=e=>{const f=e.target.files[0];if(!f)return;file=f;removePh=false;api.q("#pe-ph").innerHTML=ph(URL.createObjectURL(f),p.name)};
    const rm=api.q("#pe-rm");if(rm)rm.onclick=()=>{file=null;removePh=true;api.q("#pe-ph").innerHTML=ph("",p.name||"?");rm.remove()};
    const del=api.q("#pe-del");if(del)del.onclick=async()=>{if(del.dataset.sure!=="1"){del.dataset.sure="1";del.textContent="Tap again to delete";return}
      try{await S.db.collection("people").doc(person.id).delete();api.close();while(S.stack.length&&S.stack[S.stack.length-1].id===person.id)pop();toast("Deleted")}catch(e){toast("Couldn't delete. Try again.")}};
    api.q("#pe-save").onclick=async()=>{const name=val(api,"pe-name");if(!name){api.q("#pe-name").focus();return}if(!needDb())return;
      const b=api.q("#pe-save");b.disabled=true;b.textContent="…";
      Object.assign(p,{name,age:val(api,"pe-age")?+val(api,"pe-age"):"",birthday:val(api,"pe-bday"),status:val(api,"pe-status")||"Talking",kind:val(api,"pe-kind"),contact:val(api,"pe-phone"),instagram:igHandle(val(api,"pe-ig")),whereMet:val(api,"pe-met"),
        job:val(api,"pe-job"),school:val(api,"pe-school"),from:val(api,"pe-from"),city:val(api,"pe-city"),region:val(api,"pe-region"),address:val(api,"pe-addr"),likes:val(api,"pe-likes"),keepsKosher:on(api,"pe-kosher"),shomerShabbat:on(api,"pe-shabbat"),
        nextStep:val(api,"pe-next"),notes:val(api,"pe-notes"),review:val(api,"pe-review")});
      const old=person&&person.photoId||"";
      try{if(file){toast("Uploading photo…");const bl=await shrink(file);const up=await S.assets.upload(bl,{type:bl.type});p.photoId=up.id;p.photos=[up.id,...(p.photos||[]).filter(x=>x!==old)]}
        else if(removePh){p.photos=(p.photos||[]).filter(x=>x!==p.photoId);p.photoId=p.photos[0]||""}
        const ref=p.id?S.db.collection("people").doc(p.id):S.db.collection("people").doc();
        await ref.set({...strip(p),updatedAt:Date.now()});api.close();toast(person?"Saved":"Added");
        if(person&&person.status!=="Done"&&p.status==="Done")setTimeout(()=>motivation(p.name),300);
        if(!person)setTimeout(()=>openPerson(ref.id),250);
      }catch(e){b.disabled=false;b.textContent="Save";toast(uploadErr(e))}}}})}
function openPerson(id){push({v:"person",id})}

/* quick sheets on profile */
function statusSheet(id){const p=S.people.find(x=>x.id===id);if(!p)return;
  sheet({title:"Status",body:`<div class="fgroup">${PSTAT.map(s=>`<button class="f" data-st="${s}" style="width:100%;text-align:left"><label style="width:auto;color:var(--fg);flex:1">${s}</label>${(p.status||"Talking")===s?`<span style="color:var(--acc2)">${ic("check","sm")}</span>`:""}</button>`).join("")}</div>
    <div class="flabel">Type</div><div class="fgroup">${["",...KINDS].map(k=>`<button class="f" data-kd="${k}" style="width:100%;text-align:left"><label style="width:auto;color:var(--fg);flex:1">${k||"Not set"}</label>${(p.kind||"")===k?`<span style="color:var(--acc2)">${ic("check","sm")}</span>`:""}</button>`).join("")}</div>`,
    wire:api=>{api.qa("[data-st]").forEach(b=>b.onclick=async()=>{const was=p.status;api.close();if(await patchPerson(id,{status:b.dataset.st})){if(was!=="Done"&&b.dataset.st==="Done")setTimeout(()=>motivation(p.name),300)}});
      api.qa("[data-kd]").forEach(b=>b.onclick=async()=>{api.close();await patchPerson(id,{kind:b.dataset.kd})})}})}
function notesSheet(id){const p=S.people.find(x=>x.id===id);if(!p)return;
  sheet({title:"Notes",full:true,right:`<button class="done" id="pn-save">Save</button>`,body:`<div class="fgroup">${F.area("pn-next","Next step",p.nextStep,"Text her Thursday about Friday",1)}${F.area("pn-notes","Notes",p.notes,"Things she told you, her dog's name…",6)}${F.area("pn-review","Your take",p.review,"How it went, green flags, red flags…",4)}</div>`,
    wire:api=>{autoGrow(api);api.q("#pn-save").onclick=async()=>{if(await patchPerson(id,{nextStep:val(api,"pn-next"),notes:val(api,"pn-notes"),review:val(api,"pn-review")})){api.close();toast("Saved")}}}})}
function addLikeSheet(id){const p=S.people.find(x=>x.id===id);if(!p)return;const likes=String(p.likes||"").split(/[,;]+/).map(x=>x.trim()).filter(Boolean);
  const sug=["Sushi","Cocktails","Wine","Live music","Dancing","Rooftops","Coffee","Italian","Doesn't drink","Gym","Art","Travel"].filter(x=>!likes.some(l=>l.toLowerCase()===x.toLowerCase()));
  sheet({title:"What she likes",body:`<div class="tags">${likes.map((l,i)=>`<button class="tag acc" data-rm="${i}">${esc(l)} ${ic("x","xs")}</button>`).join("")||`<span class="note ph-text">Nothing yet.</span>`}</div>
    <div class="fgroup"><div class="f"><input id="lk-in" placeholder="Add something she likes" style="text-align:left" enterkeyhint="done" autocomplete="off"></div></div>
    <div class="tags">${sug.map(s=>`<button class="tag" data-sug="${esc(s)}">${ic("plus","xs")} ${esc(s)}</button>`).join("")}</div>`,
    wire:api=>{const save=async l=>{if(await patchPerson(id,{likes:l.join(", ")}))addLikeSheet(id)};
      api.qa("[data-rm]").forEach(b=>b.onclick=()=>save(likes.filter((_,i)=>i!==+b.dataset.rm)));
      api.qa("[data-sug]").forEach(b=>b.onclick=()=>save([...likes,b.dataset.sug]));
      const i=api.q("#lk-in");i.onkeydown=e=>{if(e.key==="Enter"&&i.value.trim()){e.preventDefault();save([...likes,i.value.trim()])}}}})}
function moreSheet(id){const p=S.people.find(x=>x.id===id);if(!p)return;
  sheet({title:first(p.name),body:`<div class="fgroup">
    <button class="f" data-m="edit" style="width:100%"><label style="width:auto;color:var(--fg);flex:1;text-align:left">Edit profile</label>${ic("edit","sm")}</button>
    <button class="f" data-m="pin" style="width:100%"><label style="width:auto;color:var(--fg);flex:1;text-align:left">${p.pinned?"Unpin":"Pin to top"}</label>${ic("tack","sm")}</button>
    <label class="f" for="mo-photo" style="width:100%"><span style="flex:1;color:var(--fg)">Add a photo</span>${ic("cam","sm")}</label>
    ${p.instagram?`<a class="f" href="https://ig.me/m/${esc(igHandle(p.instagram))}" target="_blank" rel="noopener"><span style="flex:1">Instagram DM</span>${ic("ig","sm")}</a>`:""}
    ${digits(p)?`<a class="f" href="https://wa.me/${digits(p)}" target="_blank" rel="noopener"><span style="flex:1">WhatsApp</span>${ic("msg","sm")}</a>`:""}
    </div><input type="file" id="mo-photo" accept="image/*" hidden>`,
    wire:api=>{api.q('[data-m="edit"]').onclick=()=>editPerson(p);
      api.q('[data-m="pin"]').onclick=async()=>{api.close();if(await patchPerson(id,{pinned:!p.pinned}))toast(p.pinned?"Unpinned":"Pinned")};
      api.q("#mo-photo").onchange=e=>{api.close();addPersonPhoto(id,e.target.files[0])}}})}
async function addPersonPhoto(id,f){if(!f||!S.assets)return;const p=S.people.find(x=>x.id===id);if(!p)return;toast("Uploading photo…");
  try{const b=await shrink(f);const up=await S.assets.upload(b,{type:b.type});const photos=[...personPhotos(p),up.id];if(await patchPerson(id,{photos,photoId:p.photoId||up.id}))toast("Photo added")}catch(e){toast(uploadErr(e))}}
function photoSheet(pid,photo){const p=S.people.find(x=>x.id===pid);if(!p)return;
  sheet({title:false,body:`<div class="ph" style="height:360px;border-radius:20px;margin-top:14px"><img src="${esc(imgSrc(photo))}" alt=""></div>
    <div class="btnrow">${p.photoId!==photo?`<button class="cta sm" id="ps-main">Make main photo</button>`:`<button class="cta sm ghost" disabled>Main photo</button>`}<button class="cta sm ghost" id="ps-rm" style="color:var(--bad)">Remove</button></div>`,
    wire:api=>{const m=api.q("#ps-main");if(m)m.onclick=async()=>{if(await patchPerson(pid,{photoId:photo})){api.close();toast("Main photo updated")}};
      api.q("#ps-rm").onclick=async()=>{const b=api.q("#ps-rm");if(b.dataset.sure!=="1"){b.dataset.sure="1";b.textContent="Tap again";return}
        const photos=personPhotos(p).filter(x=>x!==photo);if(await patchPerson(pid,{photos,photoId:p.photoId===photo?(photos[0]||""):p.photoId})){api.close();toast("Removed");if(S.assets)S.assets.delete(photo).catch(()=>{})}}}})}
function motivation(name){const n=S.notes||{};const lines=n.mindset&&n.mindset.length?n.mindset:["What belongs to me will simply find me."];const pick=lines[Math.floor(Math.random()*lines.length)];
  sheet({title:false,body:`<div class="stack gap16 motiv" style="padding:22px 4px 6px;background:none"><span class="kicker acc">${name?esc(first(name))+" wasn't it. Next.":"Next."}</span><span class="big">${esc(n.mindsetTitle||"I don't chase. I attract.")}</span><span class="q">${esc(pick)}</span></div>`,
    foot:`<button class="cta" id="mo-next">Who's next</button>`,wire:api=>{api.q("#mo-next").onclick=()=>{api.close();tab("people")}}})}

/* ---------- people filters ---------- */
function filterSheet(){const Fl=JSON.parse(JSON.stringify(S.pf));
  const draw=api=>{const n=S.people.filter(p=>p.status!=="Done"&&vis(p)).filter(p=>{const o=S.pf;S.pf=Fl;const r=pfPass(p);S.pf=o;return r}).length;
    api.setBody(`<div class="flabel">Location</div><div class="chips wrap-ok" style="padding:0">${["Anywhere",...REGIONS].map(r=>`<button class="chip" aria-pressed="${Fl.region===r}" data-fr="${r}">${r}</button>`).join("")}</div>
      <div class="flabel">Age</div>
      <div class="agebox"><div class="agev"><b id="fa-lo">${Fl.ageMin}</b><span>–</span><b id="fa-hi">${Fl.ageMax>=60?"60+":Fl.ageMax}</b></div>
        <div class="dual"><div class="dtrack"></div><div class="dfill" id="fa-fill"></div><input type="range" min="18" max="60" step="1" value="${Fl.ageMin}" id="fa1" aria-label="Minimum age"><input type="range" min="18" max="60" step="1" value="${Fl.ageMax}" id="fa2" aria-label="Maximum age"></div></div>
      <div class="fhint">People without an age always show.</div>
      <div class="flabel">Type</div><div class="chips wrap-ok" style="padding:0">${KINDS.map(k=>`<button class="chip" aria-pressed="${Fl.kinds.includes(k)}" data-fk="${k}">${k}</button>`).join("")}</div>
      <div class="flabel">Status</div><div class="chips wrap-ok" style="padding:0">${PSTAT.map(k=>`<button class="chip" aria-pressed="${Fl.statuses.includes(k)}" data-fs="${k}">${k}</button>`).join("")}</div>`);
    api.setFoot(`<button class="cta" id="fl-apply">Show ${n} ${n===1?"person":"people"}</button>`);
    const a1=api.q("#fa1"),a2=api.q("#fa2"),cnt=()=>S.people.filter(p=>p.status!=="Done"&&vis(p)).filter(p=>{const o=S.pf;S.pf=Fl;const r=pfPass(p);S.pf=o;return r}).length;
    const age=()=>{let lo=+a1.value,hi=+a2.value;if(lo>hi-1){if(document.activeElement===a1||a1.dataset.on){lo=hi-1;a1.value=lo}else{hi=lo+1;a2.value=hi}}
      Fl.ageMin=lo;Fl.ageMax=hi;api.q("#fa-lo").textContent=lo;api.q("#fa-hi").textContent=hi>=60?"60+":hi;
      const f=api.q("#fa-fill");f.style.left=`calc(12px + (100% - 24px) * ${(lo-18)/42})`;f.style.right=`calc(12px + (100% - 24px) * ${(60-hi)/42})`;
      a1.style.zIndex=lo>=58?5:3;const n=cnt(),b=api.q("#fl-apply");if(b)b.textContent=`Show ${n} ${n===1?"person":"people"}`};
    a1.addEventListener("pointerdown",()=>{a1.dataset.on=1});a2.addEventListener("pointerdown",()=>{delete a1.dataset.on});
    a1.oninput=age;a2.oninput=age;age();
    api.qa("[data-fr]").forEach(b=>b.onclick=()=>{Fl.region=b.dataset.fr;draw(api)});
    api.qa("[data-fk]").forEach(b=>b.onclick=()=>{const k=b.dataset.fk;Fl.kinds=Fl.kinds.includes(k)?Fl.kinds.filter(x=>x!==k):[...Fl.kinds,k];draw(api)});
    api.qa("[data-fs]").forEach(b=>b.onclick=()=>{const k=b.dataset.fs;Fl.statuses=Fl.statuses.includes(k)?Fl.statuses.filter(x=>x!==k):[...Fl.statuses,k];draw(api)});
    api.q("#fl-apply").onclick=()=>{S.pf=Fl;lset("ku.pfilt",JSON.stringify(Fl));api.close();renderTab(false)}};
  sheet({title:"Filters",left:`<button class="done" style="text-align:left;color:var(--mut);font-weight:500" id="fl-reset">Reset</button>`,foot:" ",wire:api=>{draw(api);api.q("#fl-reset").onclick=()=>{Object.assign(Fl,JSON.parse(JSON.stringify(PF0)));draw(api)}}})}

/* ---------- add person: choice + screenshot import ---------- */
function addChoice(){
  sheet({title:"Add Person",body:`<label class="choice acc press" for="shot-files"><span class="ci">${ic("shot")}</span><span class="tx"><b>Add from Screenshot</b><span>Hinge, Instagram or a contact card. You'll review everything before it's saved.</span></span></label>
    <input id="shot-files" type="file" accept="image/*" multiple hidden>
    <button class="choice press" id="ch-man"><span class="ci">${ic("edit")}</span><span class="tx"><b>Enter manually</b><span>Type her details yourself.</span></span></button>`,
    wire:api=>{api.q("#shot-files").onchange=e=>{const f=[...e.target.files];if(f.length)readShots(f)};api.q("#ch-man").onclick=()=>editPerson(null)}})}
function pickShots(){const i=document.createElement("input");i.type="file";i.accept="image/*";i.multiple=true;i.onchange=e=>{const f=[...e.target.files];if(f.length)readShots(f)};i.click()}
function aiKeySheet(after){
  sheet({title:"AI Settings",body:`<p class="lead">A free Google AI key lets the app read screenshots. It stays in your private Google script.</p>
    <div class="fgroup"><a class="f" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener"><span style="flex:1">1 · Open Google AI Studio</span>${ic("chev","xs")}</a><div class="f"><span style="flex:1;color:var(--fg2)">2 · Tap “Create API key” and copy it</span></div><div class="f"><span style="flex:1;color:var(--fg2)">3 · Paste it below</span></div></div>
    <div class="fgroup"><div class="f"><input id="ak" type="password" placeholder="API key" style="text-align:left" autocomplete="off" autocapitalize="off" spellcheck="false"></div></div><div class="fhint" id="ak-st"></div>`,
    foot:`<button class="cta" id="ak-save">Save key</button>`,
    wire:api=>{if(S.ai&&S.ai.status)S.ai.status().then(ok=>{const s=api.q("#ak-st");if(s)s.textContent=ok?"A key is already connected. Paste a new one to replace it.":"No key connected yet."});
      api.q("#ak-save").onclick=async()=>{const v=val(api,"ak");if(v.length<20){toast("That doesn't look like a key");return}const b=api.q("#ak-save");b.disabled=true;b.textContent="Saving…";
        try{await S.ai.setKey(v);toast("AI connected");if(after)after();else api.close()}catch(e){b.disabled=false;b.textContent="Save key";toast("Couldn't save. Try again")}}}})}
async function readShots(files){
  files=files.slice(0,6);const urls=files.map(f=>URL.createObjectURL(f));
  const api=sheet({title:"Reading Profile",body:`<div class="shots">${urls.map(u=>ph(u,"")).join("")}</div>
    <div class="progress"><div class="p on" id="sp1"><i></i>Reading screenshots</div><div class="p" id="sp2"><i></i>Finding her photos</div><div class="p" id="sp3"><i></i>Preparing review</div></div>
    <p class="lead">Nothing is saved until you review it.</p>`});
  const step=n=>{for(let i=1;i<=3;i++){const e=api.q("#sp"+i);if(e){e.classList.toggle("on",i===n);e.classList.toggle("done",i<n)}}};
  try{
    if(!S.ai)throw new Error("Screenshot reading isn't available yet.");
    const blobs=await Promise.all(files.map(f=>shrink(f)));
    const imgs=await Promise.all(blobs.map(async b=>({type:"image/jpeg",data:await blob64(b)})));
    let r;try{r=await S.ai.read(imgs)}catch(e){if(e.code==="nokey")return aiKeySheet(()=>readShots(files));throw e}
    step(2);const pr=r.profile||{};
    const crops=[];for(const p of (pr.photos||[]).slice(0,6)){const b=blobs[p.img];if(!b||!Array.isArray(p.box))continue;const c=await cropBlob(b,p.box);if(c)crops.push(c)}
    step(3);reviewProfile(pr,crops);
  }catch(e){const m=String(e.message||e);const badKey=/api.?key|permission|unauthori|403/i.test(m);
    api.setBody(`<div class="empty" style="padding:20px 0"><b>${badKey?"Your AI key stopped working":"Couldn't read it"}</b>${badKey?"Paste a new free key from Google AI Studio and it'll read the screenshot again.":esc(m.slice(0,200))}</div>`);
    api.el.insertAdjacentHTML("beforeend",`<div class="sf">${badKey?`<button class="cta" id="rs-key">Update AI key</button>`:`<button class="cta" id="rs-retry">Try again</button>`}<button class="cta ghost" id="rs-man">Type it in myself</button></div>`);
    const k=api.q("#rs-key");if(k)k.onclick=()=>aiKeySheet(()=>readShots(files));
    const r=api.q("#rs-retry");if(r)r.onclick=()=>readShots(files);api.q("#rs-man").onclick=()=>editPerson(null)}
}
function reviewProfile(pr,crops){
  const extra=[pr.height?"Height: "+pr.height:""].filter(Boolean).join(" · ");
  const prompts=(pr.prompts||[]).filter(x=>x&&x.a).map(x=>`${x.q?x.q+": ":""}${x.a}`).join("\n");
  const notes=[pr.summary,extra,prompts].filter(Boolean).join("\n");
  const age=pr.age&&+pr.age>17&&+pr.age<80?String(+pr.age):"";
  const keep=crops.map(()=>true);const urls=crops.map(c=>URL.createObjectURL(c));
  const body=`<p class="lead">AI can misread screenshots. Check everything — nothing has been saved yet.</p>
    ${crops.length?`<div class="flabel">Photos found · tap to skip</div><div class="found">${urls.map((u,i)=>`<button class="ph" data-ci="${i}"><img src="${u}" alt=""><span class="x">${ic("check","xs")}</span></button>`).join("")}</div>`:""}
    <div class="fgroup">${F.text("rv-name","Name",String(pr.name||"").trim(),"Required")}${F.text("rv-age","Age",age,"","inputmode=numeric")}${F.text("rv-ig","Instagram",String(pr.instagram||"").replace(/^@/,"")?"@"+String(pr.instagram).replace(/^@/,""):"","@handle","autocapitalize=off")}${F.text("rv-city","City",pr.city,"")}${F.text("rv-met","Where met",pr.whereMet,"Hinge, Instagram…")}</div>
    <div class="fgroup">${F.text("rv-job","Job",pr.job,"")}${F.text("rv-school","School",pr.school,"")}${F.text("rv-from","From",pr.from,"")}${F.text("rv-phone","Phone",pr.contact,"","inputmode=tel")}</div>
    <div class="fgroup">${F.area("rv-notes","Notes & prompts",notes,"",5)}</div><div class="fhint" id="rv-warn"></div>`;
  sheet({title:"Review Profile",full:true,body,foot:`<button class="cta" id="rv-save">Save Person</button>`,wire:api=>{autoGrow(api);
    api.qa("[data-ci]").forEach(b=>b.onclick=()=>{const i=+b.dataset.ci;keep[i]=!keep[i];b.classList.toggle("off",!keep[i])});
    api.q("#rv-save").onclick=async()=>{const name=val(api,"rv-name");if(!name){api.q("#rv-name").focus();toast("Add her name first");return}if(!needDb())return;
      const btn=api.q("#rv-save");
      if(S.people.some(p=>String(p.name).trim().toLowerCase()===name.toLowerCase())&&btn.dataset.sure!=="1"){btn.dataset.sure="1";btn.textContent="Save anyway";api.q("#rv-warn").textContent=`You already have someone named ${name}. Tap again to add another.`;return}
      btn.disabled=true;btn.textContent="Saving…";
      const body={name,status:"Talking",dates:[],updatedAt:Date.now()};const a=Number(val(api,"rv-age"));if(a>=18&&a<80)body.age=a;
      [["rv-city","city"],["rv-met","whereMet"],["rv-job","job"],["rv-school","school"],["rv-from","from"],["rv-phone","contact"],["rv-notes","notes"]].forEach(([i,k])=>{const v=val(api,i);if(v)body[k]=v});
      const ig=igHandle(val(api,"rv-ig"));if(ig)body.instagram=ig;
      try{if(S.assets){const ids=[];for(let i=0;i<crops.length;i++){if(!keep[i])continue;try{ids.push((await S.assets.upload(crops[i])).id)}catch(_){}}if(ids.length){body.photoId=ids[0];body.photos=ids}}
        const ref=S.db.collection("people").doc();await ref.set(body);api.close();toast("Person saved");setTimeout(()=>openPerson(ref.id),250)}
      catch(e){btn.disabled=false;btn.textContent="Save Person";toast("Couldn't save. Try again.")}}}})}

/* ---------- date detail ---------- */
function openDate(pid,did){
  const person=S.people.find(p=>p.id===pid);if(!person)return;const d0=(person.dates||[]).find(x=>x.id===did);if(!d0)return;
  const st={spotId:d0.spotId||"",spotName:d0.spotName||"",address:d0.address||"",wd:d0.when.slice(0,10),wt:d0.when.slice(11,16),wl:d0.len||120,picking:false,q:"",spent:d0.spent!=null?String(d0.spent):""};
  const past=parseLocal(d0.when)<Date.now()-GRACE;
  const draw=api=>{
    const sp=S.spots.find(x=>x.id===st.spotId);
    const t0=new Date();t0.setHours(0,0,0,0);const days=[];
    for(let i=0;i<21;i++){const d=new Date(t0);d.setDate(t0.getDate()+i);days.push(d)}
    if(!days.some(d=>dkey(d)===st.wd))days.unshift(parseLocal(st.wd+"T12:00"));
    const times=["17:00","17:30","18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30","22:00","22:30","23:00"];if(!times.includes(st.wt))times.push(st.wt);times.sort();
    const where=sp?(sp.address||[sp.area,sp.borough].filter(Boolean).join(" · ")):(st.address&&st.address!==st.spotName?st.address:"");
    const murl=sp?mapUrl(sp):st.address?"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(st.address):"";
    const list=S.spots.filter(x=>!x.closed&&(!st.q||[x.name,x.area,x.type,x.address].join(" ").toLowerCase().includes(st.q.toLowerCase()))).sort((a,b)=>(!!b.fav-!!a.fav)||String(a.name).localeCompare(String(b.name))).slice(0,40);
    api.setBody(`${st.picking?`<div class="fgroup"><div class="f"><input id="dd-q" placeholder="Search your places" value="${esc(st.q)}" style="text-align:left" autocomplete="off"></div></div>
        <div class="listpick">${list.map(x=>`<button data-sp="${esc(x.id)}">${ph(photoOf(x),x.name)}<span class="tx"><b>${esc(x.name)}</b><span>${esc([x.area,typeLabel(x.type)].filter(Boolean).join(" · "))}</span></span>${x.id===st.spotId?ic("check","sm"):""}</button>`).join("")||`<span class="fhint">No saved places match.</span>`}</div>
        <div class="fgroup"><div class="f"><input id="dd-addr" placeholder="Or type an address" style="text-align:left" autocomplete="street-address"></div></div><button class="cta sm ghost" id="dd-addr-ok">Use this address</button>`
      :`<div class="next">${ph(photoOf(sp),sp?sp.name:st.spotName||"?")}<span class="tx"><b>${esc(sp?sp.name:st.spotName||"Somewhere")}</b><span>${esc(where)}</span>${murl?`<a href="${esc(murl)}" target="_blank" rel="noopener" style="font-size:13px;color:var(--acc2);font-weight:560">Directions</a>`:""}</span><button class="pillbtn" id="dd-chg">Change</button></div>`}
      ${past?`<div class="flabel">How was it?</div><div class="hearts">${[1,2,3,4,5].map(n=>`<button class="${n<=(d0.rating||0)?"on":""}" data-rt="${n}">${HEART}</button>`).join("")}</div>
        <div class="btnrow"><button class="pillbtn${d0.outcome==="great"?" acc":""}" data-oc="great">See her again</button><button class="pillbtn${d0.outcome==="unsure"?" acc":""}" data-oc="unsure">Not sure</button><button class="pillbtn${d0.outcome==="done"?" acc":""}" data-oc="done">Not it</button></div>`:""}
      <div class="flabel">Day</div><div class="daypick">${days.map((d,i)=>{const k=dkey(d);return `<button aria-pressed="${st.wd===k}" data-sd="${k}"><small>${i===0&&k===dkey(t0)?"Today":d.toLocaleDateString("en-US",{weekday:"short"})}</small><b>${d.getDate()}</b><small>${d.toLocaleDateString("en-US",{month:"short"})}</small></button>`}).join("")}</div>
      <div class="flabel">Time</div><div class="daypick">${times.map(t=>`<button class="chip" style="width:auto;height:38px;padding:0 14px;flex-direction:row" aria-pressed="${st.wt===t}" data-stm="${t}">${fmtT(t)}</button>`).join("")}</div>
      <div class="seg" style="margin:0">${[[90,"1.5 h"],[120,"2 h"],[180,"3 h"]].map(([v,l])=>`<button aria-pressed="${st.wl===v}" data-sl="${v}">${l}</button>`).join("")}</div>
      <div class="flabel">What you spent</div><label class="spent">$<input id="dd-spent" inputmode="decimal" placeholder="0" value="${esc(st.spent)}" autocomplete="off"></label>
      ${past?`<button class="cta sm ${d0.debriefed?"ghost":""}" id="dd-db">${d0.debriefed?"Edit check-in":"How did it go?"}</button>`:""}
      ${past?`<button class="cta sm ghost" id="dd-fu">${ic("msg","sm")} ${d0.followedUp?"Send another follow-up":"Send follow-up"}</button>`:""}
      <div class="btnrow"><button class="cta sm ghost" id="dd-send">${ic("send","sm")} Send details</button>${PHONE?`<a class="cta sm ghost" href="${esc(icsDateUrl(person,{...d0,when:st.wd+"T"+st.wt,len:st.wl,spotId:st.spotId,spotName:st.spotName}))}" target="_blank" rel="noopener">${ic("cal","sm")} Calendar</a>`:""}</div>
      <button class="textbtn bad" id="dd-rm" style="align-self:center;padding:8px">Cancel this date</button>`);
    const R=api.el;
    const chg=api.q("#dd-chg");if(chg)chg.onclick=()=>{st.picking=true;draw(api);const i=api.q("#dd-q");if(i)i.focus()};
    const q=api.q("#dd-q");if(q)q.oninput=e=>{st.q=e.target.value;const lp=api.q(".listpick");const l2=S.spots.filter(x=>!x.closed&&(!st.q||[x.name,x.area,x.type,x.address].join(" ").toLowerCase().includes(st.q.toLowerCase()))).slice(0,40);
      lp.innerHTML=l2.map(x=>`<button data-sp="${esc(x.id)}">${ph(photoOf(x),x.name)}<span class="tx"><b>${esc(x.name)}</b><span>${esc([x.area,typeLabel(x.type)].filter(Boolean).join(" · "))}</span></span></button>`).join("");lp.querySelectorAll("[data-sp]").forEach(wsp)};
    const wsp=b=>b.onclick=()=>{st.spotId=b.dataset.sp;st.spotName=(S.spots.find(x=>x.id===st.spotId)||{}).name||"";st.address="";st.picking=false;st.q="";draw(api)};
    R.querySelectorAll("[data-sp]").forEach(wsp);
    const ao=api.q("#dd-addr-ok");if(ao)ao.onclick=()=>{const v=val(api,"dd-addr");if(!v)return;st.spotId="";st.spotName=v;st.address=v;st.picking=false;draw(api)};
    R.querySelectorAll("[data-sd]").forEach(b=>b.onclick=()=>{st.wd=b.dataset.sd;st.spent=val(api,"dd-spent");draw(api)});
    R.querySelectorAll("[data-stm]").forEach(b=>b.onclick=()=>{st.wt=b.dataset.stm;st.spent=val(api,"dd-spent");draw(api)});
    R.querySelectorAll("[data-sl]").forEach(b=>b.onclick=()=>{st.wl=+b.dataset.sl;st.spent=val(api,"dd-spent");draw(api)});
    R.querySelectorAll("[data-rt]").forEach(b=>b.onclick=()=>{api.close();rateDate(pid,did,+b.dataset.rt)});
    R.querySelectorAll("[data-oc]").forEach(b=>b.onclick=()=>{api.close();dateOutcome(pid,did,b.dataset.oc)});
    setTimeout(()=>R.querySelectorAll('.daypick [aria-pressed="true"]').forEach(b=>{const r=b.parentElement;r.scrollLeft=b.offsetLeft-r.clientWidth/2+b.clientWidth/2}),0);
    api.q("#dd-send").onclick=()=>openConfirm(pid,did);
    const fu=api.q("#dd-fu");if(fu)fu.onclick=()=>openFollowUp(pid,did);
    const dbb=api.q("#dd-db");if(dbb)dbb.onclick=()=>openDebrief(pid,did);
    api.q("#dd-rm").onclick=async()=>{const b=api.q("#dd-rm");if(b.dataset.sure!=="1"){b.dataset.sure="1";b.textContent="Tap again to cancel the date";return}
      const cur=S.people.find(p=>p.id===pid);if(await patchPerson(pid,{dates:(cur.dates||[]).filter(x=>x.id!==did)})){api.close();toast("Date canceled")}};
  };
  sheet({title:"Date with "+first(person.name),full:true,foot:`<button class="cta" id="dd-save">Save changes</button>`,wire:api=>{draw(api);
    api.q("#dd-save").onclick=async()=>{const cur=S.people.find(p=>p.id===pid);if(!cur)return;
      const nd={...d0,spotId:st.spotId,spotName:st.spotName,address:st.address,when:st.wd+"T"+st.wt,len:st.wl};
      const sv=parseFloat(String(val(api,"dd-spent")).replace(/[^0-9.]/g,""));if(isFinite(sv)&&sv>0)nd.spent=sv;else delete nd.spent;
      if(await patchPerson(pid,{dates:(cur.dates||[]).map(x=>x.id===did?nd:x)})){api.close();toast("Date updated")}}}})}
async function rateDate(pid,did,n){const person=S.people.find(p=>p.id===pid);if(!person)return;
  const dates=(person.dates||[]).map(x=>x.id===did?{...x,rated:true,...(n?{rating:n}:{})}:x);if(!await patchPerson(pid,{dates}))return;
  const d=dates.find(x=>x.id===did);const s=d&&spotOf(d);
  if(s&&n){const names=new Set(String(s.wentWith||"").split(/,\s*/).filter(Boolean));names.add(person.name);await patchSpot(s.id,{status:"Been",rating:n,wentWith:[...names].join(", ")})}
  toast(n?"Saved to your history":"Skipped")}
async function dateOutcome(pid,did,o){const person=S.people.find(p=>p.id===pid);if(!person)return;
  const dates=(person.dates||[]).map(x=>x.id===did?{...x,outcome:o}:x);const patch={dates};if(o==="great")patch.status="Dating";if(o==="done")patch.status="Done";
  if(!await patchPerson(pid,patch))return;
  if(o==="done")motivation(person.name);else if(o==="great"){toast(`Nice. Plan the next one with ${first(person.name)}`);startPlan(pid)}else toast("Got it")}
function openConfirm(pid,did){const p=S.people.find(x=>x.id===pid);if(!p)return;const d=(p.dates||[]).find(x=>x.id===did);if(!d)return;
  const msg=confirmMsg(p,d);const dg=digits(p),ig=igHandle(p.instagram);
  sheet({title:"Send "+first(p.name)+" the details",body:`<textarea class="msg" id="cf-msg" rows="6">${esc(msg)}</textarea>
    ${dg?"":`<p class="fhint" style="margin:0">Add her number to text her straight from here.</p>`}
    ${PHONE?`<a class="cta ghost sm" href="${esc(icsDateUrl(p,d))}" target="_blank" rel="noopener">${ic("cal","sm")} Add to my Calendar</a><p class="fhint" style="margin-top:-8px">Reminders the day before, 2 hours before, a “text her to confirm” alert that morning, and a follow-up reminder the next morning.</p>`:""}`,
    foot:`${dg?`<a class="cta" id="cf-sms" href="sms:+${dg}&body=${encodeURIComponent(msg)}">${ic("msg","sm")} Text her</a>`:""}<div class="btnrow">${dg?`<a class="cta ghost sm" id="cf-wa" href="https://wa.me/${dg}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">WhatsApp</a>`:""}<button class="cta ghost sm" id="cf-copy">${ig?"Copy for DM":"Copy"}</button>${ig?`<a class="cta ghost sm" href="https://ig.me/m/${esc(ig)}" target="_blank" rel="noopener">Open DM</a>`:""}</div>`,
    wire:api=>{const ta=api.q("#cf-msg");ta.oninput=()=>{const m=encodeURIComponent(ta.value);const s=api.q("#cf-sms"),w=api.q("#cf-wa");if(s)s.href=`sms:+${dg}&body=${m}`;if(w)w.href=`https://wa.me/${dg}?text=${m}`};
      const mark=()=>{const cur=S.people.find(x=>x.id===pid);if(!cur)return;const dd=(cur.dates||[]).find(x=>x.id===did);if(!dd||dd.confirmed)return;patchPerson(pid,{dates:(cur.dates||[]).map(x=>x.id===did?{...x,confirmed:true}:x)})};
      ["#cf-sms","#cf-wa"].forEach(s=>{const a=api.q(s);if(a)a.addEventListener("click",mark)});
      api.q("#cf-copy").onclick=async()=>{mark();try{await navigator.clipboard.writeText(ta.value);toast("Copied")}catch(e){ta.select();toast("Select and copy the text")}}}})}

/* ---------- morning-after check-in ---------- */
const VIBES_AFTER=["Great chemistry","Easy conversation","She's funny","Kissed","Awkward moments","She was late","Want to slow down"];
function openDebrief(pid,did){const p=S.people.find(x=>x.id===pid);if(!p)return;const d=(p.dates||[]).find(x=>x.id===did);if(!d)return;
  const prev=d.debrief||{};const st={rating:d.rating||0,outcome:d.outcome||"",vibe:[...(prev.vibe||[])]};const fn=first(p.name);
  const body=`<p class="lead">${esc(placeName(d))} · ${esc(fmtDay(d.when))}. Quick check-in — it saves to ${esc(fn)}'s profile.</p>
    <div class="flabel">How was it?</div><div class="hearts" id="db-h">${[1,2,3,4,5].map(n=>`<button data-n="${n}" aria-label="${n}">${HEART}</button>`).join("")}</div>
    <div class="flabel">See her again?</div><div class="seg" style="margin:0" id="db-o">${[["great","Yes"],["unsure","Not sure"],["done","No"]].map(([k,l])=>`<button data-o="${k}">${l}</button>`).join("")}</div>
    <div class="flabel">The vibe</div><div class="chips wrap-ok" style="padding:0" id="db-v">${VIBES_AFTER.map(v=>`<button class="chip" data-v="${esc(v)}">${esc(v)}</button>`).join("")}</div>
    <div class="fgroup">${F.area("db-talk","What did you talk about?",prev.talked||"","Her family, work, a trip she's planning…",3)}${F.area("db-rem","Remember for next time",prev.remember||"","Doesn't drink, loves sushi, has a dog named Milo…",2)}</div>
    <div class="flabel">What you spent</div><label class="spent">$<input id="db-spent" inputmode="decimal" placeholder="0" value="${d.spent!=null?esc(d.spent):""}" autocomplete="off"></label>`;
  sheet({title:"How did it go with "+fn+"?",full:true,body,foot:`<button class="cta" id="db-save">Save check-in</button>`,wire:api=>{autoGrow(api);
    const paint=()=>{api.qa("#db-h button").forEach(b=>b.classList.toggle("on",+b.dataset.n<=st.rating));api.qa("#db-o button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.o===st.outcome)));api.qa("#db-v button").forEach(b=>b.setAttribute("aria-pressed",String(st.vibe.includes(b.dataset.v))))};paint();
    api.qa("#db-h button").forEach(b=>b.onclick=()=>{st.rating=+b.dataset.n;paint()});
    api.qa("#db-o button").forEach(b=>b.onclick=()=>{st.outcome=st.outcome===b.dataset.o?"":b.dataset.o;paint()});
    api.qa("#db-v button").forEach(b=>b.onclick=()=>{const v=b.dataset.v;st.vibe=st.vibe.includes(v)?st.vibe.filter(x=>x!==v):[...st.vibe,v];paint()});
    api.q("#db-save").onclick=async()=>{const cur=S.people.find(x=>x.id===pid);if(!cur)return;const btn=api.q("#db-save");btn.disabled=true;btn.textContent="Saving…";
      const talked=val(api,"db-talk"),remember=val(api,"db-rem");const sv=parseFloat(String(val(api,"db-spent")).replace(/[^0-9.]/g,""));
      const nd={...d,debriefed:true,rated:true,debrief:{vibe:st.vibe,talked,remember,at:Date.now()}};
      if(st.rating)nd.rating=st.rating;if(st.outcome)nd.outcome=st.outcome;if(isFinite(sv)&&sv>0)nd.spent=sv;
      const patch={dates:(cur.dates||[]).map(x=>x.id===did?nd:x)};
      const line=[talked&&("Talked about: "+talked),remember&&("Remember: "+remember),st.vibe.length&&st.vibe.join(", ")].filter(Boolean).join("\n");
      if(line&&!prev.at)patch.notes=[cur.notes,`${fmtDay(d.when)} · ${placeName(d)}\n${line}`].filter(Boolean).join("\n\n");
      if(st.outcome==="great"&&cur.status!=="Dating")patch.status="Dating";if(st.outcome==="done")patch.status="Done";
      if(!await patchPerson(pid,patch)){btn.disabled=false;btn.textContent="Save check-in";return}
      const s2=spotOf(d);if(s2&&st.rating){const names=new Set(String(s2.wentWith||"").split(/,\s*/).filter(Boolean));names.add(cur.name);await patchSpot(s2.id,{status:"Been",rating:st.rating,wentWith:[...names].join(", ")})}
      if(st.outcome==="done"){api.close();setTimeout(()=>motivation(cur.name),300);return}
      api.setBody(`<div class="stack gap16" style="padding:16px 4px 4px;text-align:center"><b style="font-size:22px">${st.outcome==="great"?"Nice. Keep it going.":"Saved."}</b><span class="note">${st.outcome==="great"?"Send "+esc(fn)+" a quick message, then line up the next one.":"It's on "+esc(fn)+"'s profile."}</span></div>`);
      api.setFoot(`${!d.followedUp?`<button class="cta" id="db-fu">${ic("msg","sm")} Text ${esc(fn)}</button>`:""}${st.outcome!=="done"?`<button class="cta ghost" id="db-plan">Plan the next date</button>`:""}`);
      const f=api.q("#db-fu");if(f)f.onclick=()=>openFollowUp(pid,did);const pl=api.q("#db-plan");if(pl)pl.onclick=()=>{api.close();startPlan(pid)}}}})}

/* ---------- follow-up after a date ---------- */
const FSTYLES=[["sweet","Sweet"],["playful","Playful"],["next","Ask again"]];
function followMsg(p,d,style){const fn=first(p.name),place=placeName(d),n=-dayDiff(d.when);
  const when=n<=0?"tonight":n===1?"last night":"the other night";
  const dow=new Date().getDay();const day=dow>=5||dow===6?"next week":"this weekend";
  if(style==="playful")return `Still thinking about ${place}. You were way too easy to talk to, ${fn}. Round two soon?`;
  if(style==="next")return `Had such a good time with you ${when}, ${fn}. Free ${day}? I've got a spot in mind.`;
  return `Hey ${fn}, I had a really great time ${when} at ${place}. Hope you got home ok.`}
function recentFollowUp(p){const d=pastDates(p)[0];if(!d||d.followedUp||p.status==="Done"||d.outcome==="done")return null;return -dayDiff(d.when)<=3?d:null}
function openFollowUp(pid,did){const p=S.people.find(x=>x.id===pid);if(!p)return;const d=(p.dates||[]).find(x=>x.id===did);if(!d)return;
  let style="sweet";const dg=digits(p),ig=igHandle(p.instagram);
  sheet({title:"Follow up with "+first(p.name),body:`<div class="seg" style="margin:0">${FSTYLES.map(([k,l])=>`<button aria-pressed="${k===style}" data-fs="${k}">${l}</button>`).join("")}</div>
    <textarea class="msg" id="fu-msg" rows="5">${esc(followMsg(p,d,style))}</textarea>
    <p class="fhint" style="margin:0">After ${esc(placeName(d))} · ${esc(fmtDay(d.when))}. Edit it so it sounds like you.</p>
    ${dg?"":`<p class="fhint" style="margin:0">Add her number to text her straight from here.</p>`}`,
    foot:`${dg?`<a class="cta" id="fu-sms" href="sms:+${dg}&body=${encodeURIComponent(followMsg(p,d,style))}">${ic("msg","sm")} Text her</a>`:""}<div class="btnrow">${dg?`<a class="cta ghost sm" id="fu-wa" href="https://wa.me/${dg}?text=${encodeURIComponent(followMsg(p,d,style))}" target="_blank" rel="noopener">WhatsApp</a>`:""}<button class="cta ghost sm" id="fu-copy">${ig?"Copy for DM":"Copy"}</button>${ig?`<a class="cta ghost sm" href="https://ig.me/m/${esc(ig)}" target="_blank" rel="noopener">Open DM</a>`:""}</div>`,
    wire:api=>{const ta=api.q("#fu-msg");
      const links=()=>{const m=encodeURIComponent(ta.value);const a=api.q("#fu-sms"),w=api.q("#fu-wa");if(a)a.href=`sms:+${dg}&body=${m}`;if(w)w.href=`https://wa.me/${dg}?text=${m}`};
      ta.oninput=links;
      api.qa("[data-fs]").forEach(b=>b.onclick=()=>{style=b.dataset.fs;api.qa("[data-fs]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));ta.value=followMsg(p,d,style);links()});
      const mark=()=>{const cur=S.people.find(x=>x.id===pid);if(!cur)return;const dd=(cur.dates||[]).find(x=>x.id===did);if(!dd||dd.followedUp)return;patchPerson(pid,{dates:(cur.dates||[]).map(x=>x.id===did?{...x,followedUp:true}:x)})};
      ["#fu-sms","#fu-wa"].forEach(q=>{const a=api.q(q);if(a)a.addEventListener("click",()=>{mark();setTimeout(()=>api.close(),400)})});
      api.q("#fu-copy").onclick=async()=>{mark();try{await navigator.clipboard.writeText(ta.value);toast("Copied")}catch(e){ta.select();toast("Select and copy the text")}}}})}

/* ---------- place / idea detail + edit ---------- */
function linksFor(s){const out=[`<a class="pillbtn" href="${esc(mapUrl(s))}" target="_blank" rel="noopener">${ic("map","xs")} Maps</a>`,`<a class="pillbtn" href="${esc(igUrl(s.instagram,s.name,s.area))}" target="_blank" rel="noopener">${ic("ig","xs")} Instagram</a>`];
  if(safeUrl(s.website))out.push(`<a class="pillbtn" href="${esc(s.website)}" target="_blank" rel="noopener">${ic("link","xs")} Website</a>`);
  const u=safeUrl(s.bookingUrl);if(u)out.push(`<a class="pillbtn acc" href="${esc(u)}" target="_blank" rel="noopener">${s.type==="Activity"?"Get tickets":"Book"}</a>`);
  else if(s.bookingPlatform!=="walk-in only"&&bookable(s)&&s.list!=="events")out.push(`<a class="pillbtn" href="${esc(resyUrl(s))}" target="_blank" rel="noopener">Resy</a><a class="pillbtn" href="${esc(otUrl(s))}" target="_blank" rel="noopener">OpenTable</a>`);
  return `<div class="linkrow">${out.join("")}</div>`}
function gallery(x){const ids=(x.photos||[]).length?x.photos:(x.photoId?[x.photoId]:[]);const srcs=ids.map(imgSrc);if(!srcs.length&&x.photoUrl)srcs.push(x.photoUrl);
  if(!srcs.length)return `<div class="dimg ph" style="${grad(x.name)}"><span class="ini">${esc(initials(x.name))}</span></div>`;
  if(srcs.length===1)return `<div class="dimg ph"><img src="${esc(srcs[0])}" alt="" referrerpolicy="no-referrer" onerror="this.remove()"></div>`;
  return `<div class="dimg gal">${srcs.map(s=>`<span class="ph"><img src="${esc(s)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></span>`).join("")}</div>`}
function spotDetail(id){const s=S.spots.find(x=>x.id===id);if(!s)return;const w=beenWith(s);
  const meta=[s.area,s.borough!==s.area?s.borough:"",typeLabel(s.type),s.price].filter(Boolean).join(" · ");
  sheet({title:false,body:`<div style="margin-top:12px">${gallery(s)}</div>
    <div class="dtitle"><h2>${esc(s.name)}</h2><p>${esc(meta)}</p></div>
    <div class="tags">${s.fav?`<span class="tag acc">${ic("heart","xs")} Favorite</span>`:""}${s.status==="Been"?`<span class="tag" style="color:var(--good)">${ic("check","xs")} Been${s.rating?" · "+"★".repeat(s.rating):""}</span>`:`<span class="tag">Want to go</span>`}${s.vibe?`<span class="tag">${esc(s.vibe)}</span>`:""}${s.kosher?`<span class="tag">Kosher</span>`:""}${w.length?`<span class="tag acc">Been with ${esc(w.map(first).join(", "))}</span>`:""}</div>
    ${s.notes?`<p class="note">${esc(s.notes)}</p>`:""}${s.address?`<p class="note" style="color:var(--mut);font-size:14px">${esc(s.address)}</p>`:""}
    ${linksFor(s)}`,
    foot:`<button class="cta" id="sd-plan">${ic("heart","sm")} Plan a date here</button><div class="btnrow"><button class="cta sm ghost" id="sd-fav">${s.fav?"Unfavorite":"Favorite"}</button><button class="cta sm ghost" id="sd-edit">Edit</button></div>`,
    wire:api=>{api.q("#sd-plan").onclick=()=>{api.close();startPlan("",null,{k:"s",id:s.id,kind:s.type==="Dinner"?"Dinner":["Drinks","Coffee","Late night"].includes(s.type)?"Drinks":"Activity"})};
      api.q("#sd-fav").onclick=()=>{api.close();toggleFav(s.id)};api.q("#sd-edit").onclick=()=>editSpot(s)}})}
function ideaDetail(id){const d=S.discover.find(x=>x.id===id);if(!d)return;const ev=d.list==="events";const saved=ev?savedEvents().includes(d.id):isSaved(d);
  const tix=safeUrl(d.ticketUrl)||safeUrl(d.source);
  const meta=ev?[parseLocal(d.date+"T12:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"}),d.time,d.venue,d.price].filter(Boolean).join(" · "):[d.area,d.borough,typeLabel(d.type)||cap(d.list),d.price,d.vibe].filter(Boolean).join(" · ");
  sheet({title:false,body:`<div style="margin-top:12px">${gallery(d)}</div><div class="dtitle"><h2>${esc(d.name)}</h2><p>${esc(meta)}</p></div>
    ${d.why?`<p class="note">${esc(d.why)}</p>`:""}${ev?"":linksFor(d)}`,
    foot:ev?`${tix?`<a class="cta" href="${esc(tix)}" target="_blank" rel="noopener">${ic("ticket","sm")} Get tickets</a>`:""}<button class="cta ghost sm" id="id-save">${saved?"Saved to your plans ✓":"Save to my plans"}</button>`
      :`<button class="cta" id="id-plan">${ic("heart","sm")} Plan a date here</button><button class="cta ghost sm" id="id-save" ${saved?"disabled":""}>${saved?"In your places ✓":"Save to my places"}</button>`,
    wire:api=>{const sv=api.q("#id-save");if(sv)sv.onclick=async()=>{if(ev){await toggleEventSave(d.id);api.close()}else{await saveDiscover(d.id);api.close()}};
      const pl=api.q("#id-plan");if(pl)pl.onclick=()=>{api.close();startPlan("",null,{k:"d",id:d.id,kind:d.type==="Dinner"||d.list==="dinner"?"Dinner":["cocktails","music","rooftop"].includes(d.list)?"Drinks":"Something different"})}}})}
function editSpot(spot){const s=spot||{status:"Want to try",borough:"Brooklyn"};let rating=s.rating||0,file=null,removePh=false;
  const body=`<div class="photo-edit"><span id="se-ph">${ph(photoOf(s),s.name||"?")}</span><div class="btns"><label class="pillbtn acc" for="se-file">${ic("cam","xs")} ${s.photoId?"Change photo":"Add photo"}</label>${s.photoId?`<button type="button" class="pillbtn" id="se-rm">Remove</button>`:""}</div><input type="file" id="se-file" accept="image/*" hidden></div>
    <div class="fgroup">${F.text("se-name","Name",s.name,"e.g. Dutch Kills")}${F.text("se-area","Area",s.area,"Williamsburg")}${F.text("se-addr","Address",s.address,"Street")}${F.sel("se-boro","Borough",BOROS,s.borough)}</div>
    <div class="fgroup">${F.sel("se-type","Type",TYPES,s.type)}${F.sel("se-price","Price",["$","$$","$$$","$$$$"],s.price)}${F.sel("se-vibe","Vibe",VIBES,s.vibe)}${F.sel("se-best","Best for",BEST,s.bestFor)}${F.sel("se-status","Status",["Want to try","Been"],s.status||"Want to try",false)}</div>
    <div class="fgroup"><div class="f"><label>Rating</label><div class="stars" id="se-rate">${[1,2,3,4,5].map(n=>`<button type="button" data-n="${n}">★</button>`).join("")}</div></div>${F.tog("se-fav","Favorite",s.fav)}${F.tog("se-kosher","Kosher",s.kosher)}</div>
    <div class="fgroup">${F.text("se-ig","Instagram",s.instagram?"@"+igHandle(s.instagram):"","@handle","autocapitalize=off")}${F.area("se-notes","Notes",s.notes,"Go before 8, ask for the back room…")}</div>
    ${spot?`<button type="button" class="textbtn bad" style="align-self:center;padding:10px" id="se-del">Delete place</button>`:""}`;
  sheet({title:spot?"Edit Place":"New Place",full:true,body,right:`<button class="done" id="se-save">Save</button>`,wire:api=>{wireToggles(api);autoGrow(api);
    const paint=()=>api.qa("#se-rate button").forEach(b=>b.classList.toggle("on",+b.dataset.n<=rating));paint();
    api.qa("#se-rate button").forEach(b=>b.onclick=()=>{rating=+b.dataset.n===rating?0:+b.dataset.n;paint()});
    api.q("#se-file").onchange=e=>{const f=e.target.files[0];if(!f)return;file=f;removePh=false;api.q("#se-ph").innerHTML=ph(URL.createObjectURL(f),s.name)};
    const rm=api.q("#se-rm");if(rm)rm.onclick=()=>{file=null;removePh=true;api.q("#se-ph").innerHTML=ph("",s.name||"?");rm.remove()};
    const del=api.q("#se-del");if(del)del.onclick=async()=>{if(del.dataset.sure!=="1"){del.dataset.sure="1";del.textContent="Tap again to delete";return}
      try{await S.db.collection("spots").doc(spot.id).delete();if(spot.photoId&&S.assets)S.assets.delete(spot.photoId).catch(()=>{});api.close();toast("Deleted")}catch(e){toast("Couldn't delete. Try again.")}};
    api.q("#se-save").onclick=async()=>{const name=val(api,"se-name");if(!name){api.q("#se-name").focus();return}if(!needDb())return;const b=api.q("#se-save");b.disabled=true;b.textContent="…";
      const data={...(spot?strip(spot):{}),name,area:val(api,"se-area"),address:val(api,"se-addr"),borough:val(api,"se-boro"),type:val(api,"se-type"),price:val(api,"se-price"),vibe:val(api,"se-vibe"),bestFor:val(api,"se-best"),status:val(api,"se-status")||"Want to try",
        rating,fav:on(api,"se-fav"),kosher:on(api,"se-kosher"),instagram:igHandle(val(api,"se-ig")),notes:val(api,"se-notes"),wentWith:s.wentWith||"",suggested:!!(spot&&spot.suggested),updatedAt:Date.now()};
      const old=spot&&spot.photoId||"";data.photoId=removePh?"":old;if(removePh&&data.photos)data.photos=data.photos.filter(x=>x!==old);
      try{if(file){toast("Uploading photo…");const bl=await shrink(file);const up=await S.assets.upload(bl,{type:bl.type});data.photoId=up.id;data.photos=[up.id,...(data.photos||[]).filter(x=>x!==old)]}
        const ref=spot?S.db.collection("spots").doc(spot.id):S.db.collection("spots").doc();await ref.set(data);api.close();toast(spot?"Saved":"Added");if(old&&old!==data.photoId&&S.assets)S.assets.delete(old).catch(()=>{})}
      catch(e){b.disabled=false;b.textContent="Save";toast(uploadErr(e))}}}})}

/* ---------- me sheets ---------- */
function tasteSheet(focus){const p=S.profile||{};
  const box=(name,list,sel)=>`<div class="chips wrap-ok" style="padding:0">${list.map(o=>`<button class="chip" aria-pressed="${(sel||[]).includes(o)}" data-ck="${name}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
  const one=(name,list,cur)=>`<div class="chips wrap-ok" style="padding:0">${list.map(o=>`<button class="chip" aria-pressed="${cur===o}" data-one="${name}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
  sheet({title:"Personalization",full:true,right:`<button class="done" id="ts-save">Save</button>`,body:`<p class="lead">This tunes Discover and your date picks.</p>
    <div class="flabel" id="ts-areas">Areas you take dates</div>${box("areas",AREAS,p.areas)}
    <div class="fgroup">${F.text("ts-home","Home",p.home,"e.g. Williamsburg")}</div>
    <div class="flabel" id="ts-vibe">Date vibe</div>${one("vibe",DVIBES,p.vibe)}
    <div class="flabel">Your style</div>${box("styles",STYLES,p.styles)}
    <div class="flabel" id="ts-budget">Budget</div>${one("budget",BUDGETS,p.budget)}
    <div class="flabel" id="ts-kosher">Kosher</div>${one("kosherPref",KPREFS,p.kosherPref||"No preference")}
    <div class="flabel">Avoid</div>${box("avoid",AVOIDS,p.avoid)}`,
    wire:api=>{api.qa("[data-ck]").forEach(b=>b.onclick=()=>b.setAttribute("aria-pressed",b.getAttribute("aria-pressed")!=="true"));
      api.qa("[data-one]").forEach(b=>b.onclick=()=>{const was=b.getAttribute("aria-pressed")==="true";api.qa(`[data-one="${b.dataset.one}"]`).forEach(x=>x.setAttribute("aria-pressed","false"));b.setAttribute("aria-pressed",String(!was))});
      if(focus){const t=api.q("#ts-"+focus);if(t)setTimeout(()=>t.scrollIntoView({block:"start"}),300)}
      api.q("#ts-save").onclick=async()=>{const g=n=>[...api.qa(`[data-ck="${n}"][aria-pressed="true"]`)].map(b=>b.dataset.v);const o=n=>{const b=api.q(`[data-one="${n}"][aria-pressed="true"]`);return b?b.dataset.v:""};
        if(await patchProfile({areas:g("areas"),styles:g("styles"),avoid:g("avoid"),home:val(api,"ts-home"),vibe:o("vibe"),budget:o("budget"),kosherPref:o("kosherPref")||"No preference"})){api.close();toast("Saved")}}}})}
function lookingSheet(){const p=S.profile||{};sheet({title:"What I'm looking for",right:`<button class="done" id="lf-save">Save</button>`,body:`<div class="fgroup">${F.area("lf","In your own words",p.lookingFor,"Kind, ambitious, close to family…",6)}</div>`,
  wire:api=>{autoGrow(api);api.q("#lf-save").onclick=async()=>{if(await patchProfile({lookingFor:val(api,"lf")})){api.close();toast("Saved")}}}})}
function privacySheet(){const fid=window.kasFaceId&&window.kasFaceId.isOn();
  sheet({title:"Privacy & Security",body:`<div class="fgroup">${F.tog("pv-fid","Unlock with Face ID",fid)}${F.tog("pv-sneaky","Show sneaky links",showSneaky())}</div>
    <div class="fhint">Sneaky links stay hidden from Home, People and Plans unless this is on.</div>
    <div class="fgroup"><button class="f" id="pv-lock" style="width:100%"><span style="flex:1;text-align:left">Lock now</span>${ic("lock","sm")}</button><button class="f" id="pv-out" style="width:100%"><span style="flex:1;text-align:left;color:var(--bad)">Forget PIN on this device</span></button></div>
    <div class="fhint">Your PIN is checked by your private Google script. Forgetting it here means you'll enter it again next time.</div>`,
    wire:api=>{api.q('[data-tog="pv-fid"]').onclick=()=>toggleFaceId(api.q("#pv-fid"));
      api.q('[data-tog="pv-sneaky"]').onclick=()=>{const v=!showSneaky();lset("showSneaky",v?"1":"0");api.q("#pv-sneaky").classList.toggle("on",v);refresh()};
      api.q("#pv-lock").onclick=()=>{api.close();lockNow()};
      api.q("#pv-out").onclick=()=>{const b=api.q("#pv-out span");if(b.dataset.sure!=="1"){b.dataset.sure="1";b.textContent="Tap again to forget PIN";return}lset("ku.pin","");location.reload()}}})}
function lockNow(){if(window.kasFaceId&&window.kasFaceId.isOn()&&window.kasLock)window.kasLock();else toast("Turn on Face ID to lock the app")}
function toggleFaceId(t){const F=window.kasFaceId;if(!F){toast("Face ID isn't available here");return}
  if(F.isOn()){F.off();if(t)t.classList.remove("on");toast("Face ID off");refresh()}
  else F.on().then(()=>{if(t)t.classList.add("on");toast("Face ID on");refresh()}).catch(()=>toast("Face ID isn't available on this device"))}
function pinSheet(){sheet({title:"PIN",body:`<div class="fgroup"><div class="f"><span style="flex:1">Passcode</span><span style="color:var(--mut)">${"•".repeat((lget("ku.pin")||"").length||4)}</span></div></div>
  <p class="fhint" style="margin:0">Your PIN lives in your private Google script. To change it, ask Claude to update it there — the app will ask for the new one next time.</p>
  <button class="cta ghost sm" id="pin-lock">${ic("lock","sm")} Lock now</button>`,wire:api=>{api.q("#pin-lock").onclick=()=>{api.close();lockNow()}}})}
function infoSheet(title,html){sheet({title,body:html})}

/* ---------- map ---------- */
function loadLeaflet(){if(window.L)return Promise.resolve();return new Promise((res,rej)=>{const l=document.createElement("link");l.rel="stylesheet";l.href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";document.head.appendChild(l);
  const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";s.onload=()=>res();s.onerror=rej;document.head.appendChild(s)})}
const MCATS=[["all","All"],["saved","Saved"],["food","Food"],["bars","Bars"],["fun","Things to do"],["events","Events"]];
async function openMap(){S.mapCat=S.mapCat||"all";S.mapQ="";
  let ov=$("mapov");if(!ov){ov=document.createElement("div");ov.id="mapov";document.body.appendChild(ov)}
  ov.innerHTML=`<div id="mapc"></div><div class="mtop"><div class="row"><button class="iconbtn glass" data-a="closemap" aria-label="Close">${ic("x","sm")}</button><label class="search">${ic("search","sm")}<input id="mapq" type="search" placeholder="Search the map" autocomplete="off"></label></div><div class="chips" id="mchips"></div></div><div id="mapcard"></div>`;
  ov.hidden=false;
  try{await loadLeaflet()}catch(e){$("mapc").innerHTML=`<div class="empty" style="margin-top:160px"><b>Map unavailable</b>Check your connection.</div>`;return}
  if(S.mapObj){S.mapObj.remove();S.mapObj=null}
  const m=L.map("mapc",{zoomControl:false,attributionControl:true}).setView([40.718,-73.97],12);S.mapObj=m;
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",{maxZoom:19,attribution:"© OpenStreetMap © CARTO"}).addTo(m);
  setTimeout(()=>m.invalidateSize(),250);m.on("click",()=>{$("mapcard").innerHTML=""});
  $("mapq").oninput=e=>{S.mapQ=e.target.value.trim().toLowerCase();drawPins(false)};drawPins(true)}
function mapPass(x,mine,c,q){if(q&&!((x.name||"")+" "+(x.area||"")+" "+(x.venue||"")).toLowerCase().includes(q))return false;
  if(c==="all")return true;if(c==="saved")return mine;if(c==="events")return x.list==="events";if(c==="food")return x.type==="Dinner"||x.list==="dinner";if(c==="bars")return ["Drinks","Late night","Coffee"].includes(x.type)||["cocktails","music","rooftop"].includes(x.list);
  return ["Activity","Active","Outdoors"].includes(x.type)||["active","different","new"].includes(x.list)}
function drawPins(fit){const m=S.mapObj;if(!m)return;const c=S.mapCat,q=S.mapQ||"";const t=todayStr();
  $("mchips").innerHTML=MCATS.map(([k,l])=>`<button class="chip" aria-pressed="${c===k}" data-a="mcat" data-x="${k}">${l}</button>`).join("");
  if(S.mapLayer)S.mapLayer.remove();S.mapLayer=L.layerGroup().addTo(m);const pts=[],seen=new Set();
  const add=(x,isSpot)=>{const mine=isSpot&&isMine(x);if(!x.lat||!mapPass(x,mine,c,q))return;const ev=x.list==="events";
    const mk=L.marker([x.lat,x.lng],{icon:L.divIcon({className:"",html:`<div class="mpin${ev?" ev":""}">${ic(mine?"heart":ev?"ticket":"pin","xs")}</div>`,iconSize:[28,28],iconAnchor:[14,14]})}).addTo(S.mapLayer);pts.push([x.lat,x.lng]);
    mk.on("click",e=>{L.DomEvent.stopPropagation(e);$("mapcard").innerHTML=`<button class="mcard" style="width:100%;text-align:left" data-a="${isSpot?"spot":"idea"}" data-x="${esc(x.id)}">${ph(photoOf(x),x.name)}<span class="tx"><b>${esc(x.name)}</b><span>${esc(itemSub(x))}</span></span>${ic("chev","sm")}</button>`;m.panTo([x.lat,x.lng])})};
  S.spots.forEach(s=>{if(s.closed)return;seen.add((s.name||"").toLowerCase());add(s,true)});
  S.discover.forEach(x=>{if(x.list==="movies"||(x.list==="events"&&!(x.date&&x.date>=t))||seen.has((x.name||"").toLowerCase()))return;add(x,false)});
  if(fit!==false&&pts.length>1)m.fitBounds(pts,{padding:[60,60],maxZoom:14});else if(fit!==false&&pts.length===1)m.setView(pts[0],15)}
function closeMap(){const ov=$("mapov");if(ov)ov.hidden=true;if(S.mapObj){S.mapObj.remove();S.mapObj=null}}

/* =========================================================
   ACTIONS (one delegated handler)
   ========================================================= */
function startPlan(who,day,pick){S.flow=newFlow(who,day);if(pick){S.flow.pick={k:pick.k,id:pick.id};S.flow.kind=pick.kind||"";}
  if(S.stack.length&&S.stack[S.stack.length-1].v==="plan"){refresh();return}push({v:"plan"})}
function rerenderFlow(){const ls=liveScreens();const el=ls[ls.length-1];if(el&&S.stack[S.stack.length-1].v==="plan"){renderPush(el,{v:"plan"});el.scrollTop=0}}
const A={
  tab:(el)=>{closeMap();tab(el.dataset.x)},
  back:()=>pop(),
  plan:(el)=>{const [w,dy]=String(el.dataset.x||"").split(":");startPlan(w||"",dy||"")},
  addperson:()=>addChoice(),newperson:()=>addChoice(),shot:()=>pickShots(),
  places:(el)=>{if(S.stack.some(v=>v.v==="places"))return;push({v:"places",coll:el.dataset.x||"All"})},
  notes:()=>push({v:"notes"}),
  person:(el)=>openPerson(el.dataset.x),
  date:(el)=>{const [p,d]=el.dataset.x.split(":");openDate(p,d)},
  spot:(el)=>spotDetail(el.dataset.x),idea:(el)=>ideaDetail(el.dataset.x),
  save:(el,e)=>{e.stopPropagation();const k=el.dataset.k,id=el.dataset.x;if(k==="s"){toggleFav(id);return}const d=S.discover.find(x=>x.id===id);if(!d)return;if(d.list==="events")toggleEventSave(id);else if(!isSaved(d))saveDiscover(id);else toast("Already in your places")},
  dcat:(el)=>{const k=el.dataset.x;if(S.tab!=="discover"){S.dCat=k;S.dq="";tab("discover");return}S.dCat=S.dCat===k?"":k;S.dq="";renderTab(true)},
  follow:async()=>{const name=S.dq.trim();const p=S.profile||{};const f=[...(p.follow||[])];const i=f.findIndex(x=>x.toLowerCase()===name.toLowerCase());if(i>=0)f.splice(i,1);else f.push(name);if(await patchProfile({follow:f}))toast(i>=0?`Unfollowed ${name}`:`Following ${name}`)},
  map:()=>openMap(),closemap:()=>closeMap(),mcat:(el)=>{S.mapCat=el.dataset.x;$("mapcard").innerHTML="";drawPins(true)},
  psearch:()=>{S.pSearch=!S.pSearch;if(!S.pSearch)S.pq="";renderTab(false);if(S.pSearch)setTimeout(()=>{const q=$("pq");if(q)q.focus()},50)},
  pfilter:()=>filterSheet(),toggledone:()=>{S.showDone=!S.showDone;renderTab(false)},
  sneaky:()=>{lset("showSneaky","1");refresh()},
  pseg:(el)=>{S.plansSeg=el.dataset.x;renderTab(false)},
  calday:(el)=>{S.calSel=el.dataset.x;renderTab(false)},
  calnav:(el)=>{const [y,m]=S.calM.split("-").map(Number);const d=new Date(y,m-1+(+el.dataset.x),1);S.calM=d.getFullYear()+"-"+pad(d.getMonth()+1);renderTab(false)},
  rate:(el)=>{const [p,d,n]=el.dataset.x.split(":");rateDate(p,d,+n)},
  outcome:(el)=>{const [p,d,o]=el.dataset.x.split(":");dateOutcome(p,d,o)},
  confirm:(el)=>{const [p,d]=el.dataset.x.split(":");openConfirm(p,d)},
  followup:(el)=>{const [p,d]=el.dataset.x.split(":");openFollowUp(p,d)},
  debrief:(el)=>{const [p,d]=el.dataset.x.split(":");openDebrief(p,d)},
  editperson:(el)=>editPerson(S.people.find(p=>p.id===el.dataset.x)),
  pstatus:(el)=>statusSheet(el.dataset.x),pnotes:(el)=>notesSheet(el.dataset.x),addlike:(el)=>addLikeSheet(el.dataset.x),pmore:(el)=>moreSheet(el.dataset.x),
  pphoto:(el)=>{const [p,ph]=el.dataset.x.split("|");photoSheet(p,ph)},
  prate:async(el)=>{const [pid,k,n]=el.dataset.x.split(":");const p=S.people.find(x=>x.id===pid);if(!p)return;const r={...(p.ratings||{})};r[k]=r[k]===+n?0:+n;await patchPerson(pid,{ratings:r})},
  pcoll:(el)=>{S.pcoll=el.dataset.x;refresh()},newspot:()=>editSpot(null),
  ntab:(el)=>{S.notesTab=el.dataset.x;S.notesEdit=false;refresh()},notesedit:()=>{S.notesEdit=!S.notesEdit;refresh()},
  copy:(el)=>{const t=el.dataset.x;try{navigator.clipboard.writeText(t).then(()=>toast("Copied"),()=>toast("Press and hold to copy"))}catch(_){toast("Press and hold to copy")}},
  rmline:async(el)=>{const [k,i]=el.dataset.x.split(":");const n=S.notes||{};const arr=[...(n[k]||[])];arr.splice(+i,1);try{await S.db.doc("me/notes").set({...n,[k]:arr,updatedAt:Date.now()});toast("Removed")}catch(e){toast("Couldn't save. Try again.")}},
  addline:(el)=>{const k=el.dataset.x;sheet({title:k==="openers"?"New opener":"New game",right:`<button class="done" id="al-save">Add</button>`,body:`<div class="fgroup">${F.area("al","Line","","",4)}</div>`,wire:api=>{api.q("#al").focus();api.q("#al-save").onclick=async()=>{const v=val(api,"al");if(!v||!needDb())return;const n=S.notes||{};try{await S.db.doc("me/notes").set({...n,[k]:[...(n[k]||[]),v],updatedAt:Date.now()});api.close();toast("Added")}catch(e){toast("Couldn't save. Try again.")}}}})},
  taste:(el)=>tasteSheet(el.dataset.x),looking:()=>lookingSheet(),privacy:()=>privacySheet(),faceid:(el)=>toggleFaceId(el.querySelector(".toggle")),pin:()=>pinSheet(),
  appicon:()=>{const cur=()=>{try{return localStorage.getItem("ku.icon")||"white"}catch(e){return "white"}};
    const body=()=>`<div style="display:flex;gap:14px;justify-content:center">${["white","black","pink"].map(k=>`<button data-ik="${k}" style="display:flex;flex-direction:column;align-items:center;gap:8px;font-size:13px;font-weight:600"><img src="icon-${k}-180.png" alt="" style="width:76px;height:76px;border-radius:18px;box-shadow:0 0 0 ${cur()===k?"3px var(--acc)":"1px var(--line)"}">${k[0].toUpperCase()+k.slice(1)}</button>`).join("")}</div><p class="fhint" style="margin:0;text-align:center">iPhone sets the icon when you add the app to your home screen. After picking one, delete the app from your home screen and add it again from Safari (Share → Add to Home Screen).</p>`;
    sheet({title:"App icon",body:body(),wire:api=>{api.el.addEventListener("click",e=>{const b=e.target.closest("[data-ik]");if(!b)return;try{localStorage.setItem("ku.icon",b.dataset.ik)}catch(x){}const l=document.querySelector('link[rel="apple-touch-icon"]');if(l)l.href="icon-"+b.dataset.ik+"-180.png";api.setBody(body());refresh();toast("Icon set. Re-add the app to your home screen to see it.")})}})},
  appearance:()=>{const cur=()=>(window.kuTheme?kuTheme.get():"auto");const body=()=>`<div class="fgroup">${[["auto","Automatic","Follows your iPhone"],["light","Light",""],["dark","Dark",""]].map(([k,l,h])=>`<button class="f" data-th="${k}" style="width:100%;text-align:left"><span style="flex:1">${l}${h?`<small style="display:block;color:var(--mut);font-size:13px">${h}</small>`:""}</span>${cur()===k?`<span style="color:var(--acc2)">${ic("check","sm")}</span>`:""}</button>`).join("")}</div>`;
    sheet({title:"Appearance",body:body(),wire:api=>{api.el.addEventListener("click",e=>{const b=e.target.closest("[data-th]");if(!b)return;window.kuTheme&&kuTheme.set(b.dataset.th);api.setBody(body());refresh()})}})},
  integrations:()=>infoSheet("Integrations",`<div class="fgroup"><div class="f"><span style="flex:1">Google Sheet storage</span><span style="color:var(--good)">${S.db?"Connected":"…"}</span></div><div class="f"><span style="flex:1">iPhone Calendar</span><span style="color:var(--good)">Via calendar files</span></div><button class="f" data-a="aikey" style="width:100%"><span style="flex:1;text-align:left">Screenshot AI</span>${ic("chev","xs")}</button></div><p class="fhint" style="margin:0">Events, movies and new ideas are added by Claude into your sheet.</p>`),
  calconn:()=>infoSheet("Calendar connection",`<p class="note">Dates go to your iPhone calendar. Tap <b>Add to Calendar</b> on any date — it opens a calendar file with reminders the day before, 2 hours before, and a “text her to confirm” alert that morning.</p>`),
  aikey:()=>aiKeySheet(),
  fwho:(el)=>{const F=S.flow;F.who=F.who===el.dataset.x?"":el.dataset.x;F.kos=undefined;rerenderFlowKeep();if(F.who==="__new")setTimeout(()=>{const i=$("fnew");if(i)i.focus()},60)},
  fday:(el)=>{S.flow.day=el.dataset.x;rerenderFlowKeep()},ftime:(el)=>{S.flow.time=el.dataset.x;rerenderFlowKeep()},flen:(el)=>{S.flow.len=+el.dataset.x;rerenderFlowKeep()},
  fkind:(el)=>{S.flow.kind=el.dataset.x;S.flow.pick=S.flow.pick&&S.flow.pick.k!=="c"?S.flow.pick:null;rerenderFlowKeep()},
  farea:(el)=>{S.flow.area=el.dataset.x;S.flow.lim=30;updFres()},fkos:()=>{S.flow.kos=!S.flow.kos;S.flow.lim=30;rerenderFlowKeep()},fmore:()=>{S.flow.lim=(S.flow.lim||30)+30;updFres()},
  fpick:(el)=>{const [k,id]=el.dataset.x.split(":");const F=S.flow;F.pick=(F.pick&&F.pick.id===id)?null:{k,id};rerenderFlowKeep()},
  fcustom:()=>{const F=S.flow;F.pick={k:"c",id:"custom",name:F.q.trim()};F.step=4;rerenderFlow()},
  fback:()=>{const F=S.flow;if(F.step>0){F.step--;if(F.step===2&&F.pick&&F.pick.k==="c")F.pick=null;rerenderFlow()}},
  fnext:(el)=>{const F=S.flow;if(F.saved){while(S.stack.length)popNow();S.flow=null;tab("plans");return}if(F.step===4){saveFlow(el);return}if(F.step===2&&F.pick)F.step=4;else F.step++;rerenderFlow()}
};
function rerenderFlowKeep(){const ls=liveScreens();const el=ls[ls.length-1];if(el)keepScroll(el,()=>renderPush(el,{v:"plan"}))}
function updFres(){const r=$("fres");if(r)r.innerHTML=whereBody();const ls=liveScreens();const el=ls[ls.length-1];if(el){const btn=el.querySelector('[data-a="fnext"]');if(btn)btn.disabled=!S.flow.pick}}
document.addEventListener("click",e=>{const el=e.target.closest("[data-a]");if(!el)return;const f=A[el.dataset.a];if(!f)return;if(el.tagName==="A")return;e.preventDefault();f(el,e)});
document.addEventListener("keydown",e=>{if(e.key==="Enter"){const el=document.activeElement;if(el&&el.matches('.icard[role="button"],.card[role="button"]'))el.click()}});

/* live-input wiring (results update without replacing the input) */
const WIRE={
  dq:i=>{i.oninput=()=>{S.dq=i.value;if(S.dq)S.dCat="";const r=$("dres");if(r)r.innerHTML=discoverBody();document.querySelectorAll(".catgrid button").forEach(b=>b.setAttribute("aria-pressed",String(S.dCat===b.dataset.x)))}},
  pq:i=>{i.oninput=()=>{S.pq=i.value;const r=$("pres");if(r)r.innerHTML=peopleBody()};i.onblur=()=>{if(!S.pq){S.pSearch=false;setTimeout(()=>renderTab(false),0)}}},
  plq:i=>{i.oninput=()=>{S.plq=i.value;const r=$("plres");if(r)r.innerHTML=placesBody()}},
  fq:i=>{i.oninput=()=>{S.flow.q=i.value;S.flow.lim=30;updFres()}},
  fnew:i=>{i.oninput=()=>{S.flow.newName=i.value;const ls=liveScreens();const el=ls[ls.length-1];const b=el&&el.querySelector('[data-a="fnext"]');if(b)b.disabled=!i.value.trim()}},
  fdate:i=>{const set=()=>{if(i.value&&i.value!==S.flow.day){S.flow.day=i.value;rerenderFlowKeep()}};i.onchange=set;i.onblur=set},
  gal:g=>{const dots=g.parentNode.querySelectorAll(".dots i");if(!dots.length)return;g.addEventListener("scroll",()=>{const i=Math.round(g.scrollLeft/g.clientWidth);dots.forEach((d,k)=>d.classList.toggle("on",k===i))},{passive:true})},
  mephoto:i=>{i.onchange=async e=>{const f=e.target.files[0];if(!f||!S.assets)return;toast("Uploading photo…");try{const b=await shrink(f);const up=await S.assets.upload(b,{type:b.type});const old=(S.profile||{}).photoId;if(await patchProfile({photoId:up.id})){toast("Photo updated");if(old)S.assets.delete(old).catch(()=>{})}}catch(err){toast(uploadErr(err))}}},
  pvphoto:i=>{i.onchange=e=>addPersonPhoto(i.dataset.x,e.target.files[0])}
};

/* edge swipe = back; no pinch zoom */
(function(){let sx=0,sy=0,dx=0,live=false;const ind=document.createElement("div");ind.className="edge-back";ind.innerHTML=ic("back","sm");document.body.appendChild(ind);
  const reset=()=>{live=false;ind.style.opacity="";ind.style.transform="translate(0,-50%)"};
  addEventListener("touchstart",e=>{const t=e.touches[0];if(e.touches.length===1&&t.clientX<24&&(S.stack.length||$("sheets").children.length)){sx=t.clientX;sy=t.clientY;dx=0;live=true}},{passive:true});
  addEventListener("touchmove",e=>{if(!live)return;const t=e.touches[0];dx=t.clientX-sx;if(Math.abs(t.clientY-sy)>45&&Math.abs(t.clientY-sy)>dx){reset();return}const p=Math.max(0,Math.min(dx,120));ind.style.opacity=Math.min(1,p/80);ind.style.transform=`translate(${p*.6}px,-50%)`},{passive:true});
  addEventListener("touchend",()=>{const go=live&&dx>70;reset();if(go){if($("sheets").children.length)closeSheet();else pop()}},{passive:true});
  ["gesturestart","gesturechange"].forEach(n=>document.addEventListener(n,e=>e.preventDefault(),{passive:false}));
})();

/* =========================================================
   BOOT
   ========================================================= */
shell();
try{const h=location.hash.slice(1);if(TABS.some(t=>t[0]===h))S.tab=h}catch(e){}
renderTab(true);
(async()=>{
  const C=window.claude;if(!C||!C.use){S.loading=false;refresh();return}
  const db=await C.use("db");S.db=db;
  try{S.assets=await C.use("assets")}catch(e){}
  try{S.mcp=await C.use("mcp")}catch(e){}
  try{S.ai=await C.use("ai")}catch(e){}
  if(!db){S.loading=false;refresh();return}
  let got=0;const done=()=>{if(++got>=2&&S.loading){S.loading=false}};
  let raf=0;const schedule=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;refresh()})};
  db.collection("spots").onSnapshot(sn=>{S.spots=sn.docs.map(d=>({id:d.id,...d.data()}));done();schedule()},()=>{S.loading=false;schedule()});
  db.collection("people").onSnapshot(sn=>{S.people=sn.docs.map(d=>({id:d.id,...d.data()}));done();schedule()},()=>{done();schedule()});
  db.collection("discover").onSnapshot(sn=>{S.discover=sn.docs.map(d=>({id:d.id,...d.data()}));schedule()},()=>{});
  db.doc("me/notes").onSnapshot(sn=>{S.notes=sn.exists?sn.data():null;schedule()},()=>{});
  db.doc("me/movies").onSnapshot(sn=>{S.movies=sn.exists?sn.data():null;schedule()},()=>{});
  db.doc("me/profile").onSnapshot(sn=>{S.profile=sn.exists?sn.data():null;try{const ph=S.profile&&S.profile.photoId;lset("ku.meimg",ph?new URL(imgSrc(ph),location.href).href:"")}catch(e){}schedule()},()=>{});
})();
window.kasApp={S,refresh,tab,push,pop};
})();
