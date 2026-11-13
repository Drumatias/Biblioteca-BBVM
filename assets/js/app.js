/* Catálogo Oficial B.B.V.M. — lógica de la aplicación
   Requiere data/catalogo-inicial.js (define window.SEED) cargado antes. */

/* ---------- Campos ---------- */
const FIELDS=[
 {key:'title',label:'Título',aliases:['titulo','título']},
 {key:'author',label:'Autor',aliases:['autor','autora']},
 {key:'dewey',label:'Dewey',aliases:['dewey','cdd','clasificacion','clasificación']},
 {key:'category',label:'Categoría',aliases:['categoria','categoría','materia','tema']},
 {key:'location',label:'Ubicación',aliases:['ubicacion','ubicación','signatura topografica']},
 {key:'status',label:'Estado',aliases:['estado','disponibilidad']},
 {key:'id',label:'Código interno',aliases:['identificacion','identificación','codigo','código','id','codigo id interno','codigo interno','id interno']},
 {key:'year',label:'Año',aliases:['año','ano','anio']},
 {key:'edition',label:'Edición',aliases:['edicion','edición']},
 {key:'publisher',label:'Editorial',aliases:['editorial']},
];
const WEIGHT={title:6,author:4,dewey:3,id:3,category:2,location:1,status:1,year:1,edition:1,publisher:1};
const PAGE=20, SUGGEST=6, IDLE_MS=3*60*1000;
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Utilidades ---------- */
const $=s=>document.querySelector(s);
const norm=s=>[...String(s??'')].map(c=>{const b=c.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();return b.length===c.length?b:c}).join('');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reEsc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const clean=v=>v==null?'':String(v).replace(/\s+/g,' ').trim();
const capFirst=s=>s?s.charAt(0).toUpperCase()+s.slice(1):s;
const fmt=n=>n.toLocaleString('es-CL');
const PARTS=new Set(['de','del','la','las','los','y','e','van','von','da','di','le']);
const nameCase=s=>s.split(' ').map((w,i)=>(/^[a-záéíóúñü]/.test(w)&&(i===0||!PARTS.has(w)))?capFirst(w):w).join(' ');
/* Textos escritos TODO EN MAYÚSCULAS se muestran en formato legible:
   "HISTORIA DEL LIBRO EN CHILE" → "Historia del Libro en Chile". Solo cambia la vista, no los datos. */
const MINUS=new Set(['de','del','la','las','el','los','y','e','o','u','en','a','al','con','por','para','sin','un','una','unos','unas','que','se','su','sus','lo','le','les','mi','tu','entre','sobre','tras','desde','hasta','como','van','von']);
const ROMANO=/^(?=[ivxlcdm]+$)m{0,3}(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/;
const NO_ROMANO=new Set(['di','vi','mi','dc','cc','li','ci','id','mil','dil','lid']);
function smartCase(s){
  if(!s||/[a-záéíóúñü]/.test(s)||!/[A-ZÁÉÍÓÚÑÜ]/.test(s))return s;
  let first=true;
  return s.toLowerCase().replace(/\p{L}+/gu,w=>{
    const isFirst=first;first=false;
    if(w.length>1&&ROMANO.test(w)&&!NO_ROMANO.has(w)&&!MINUS.has(w))return w.toUpperCase();
    if(!isFirst&&MINUS.has(w))return w;
    return w.charAt(0).toUpperCase()+w.slice(1);
  });
}
function prettyLoc(s){
  if(!s)return'';
  const p=s.split(/\s*,\s*/).map(x=>x.replace(/^(caja|sala)\b/i,m=>capFirst(m.toLowerCase())).replace(/^(Caja|Sala)\s+n[º°o]\s*/i,(m,a)=>a+' Nº'));
  const i=p.findIndex(x=>/^sala/i.test(x));
  if(i>0)p.unshift(p.splice(i,1)[0]);
  return p.join(' › ');
}
/* Excel borra los ceros iniciales del Dewey (92 → 092) */
const padDewey=d=>/^\d{1,2}(\.\d+)?$/.test(d)?d.replace(/^(\d{1,2})(?=\.|$)/,m=>m.padStart(3,'0')):d;
function statusKind(s){
  const n=norm(s);
  if(!n)return'none';
  if(/^disponible/.test(n))return'ok';
  if(/prest|reserv|proces/.test(n))return'warn';
  if(/no disp|extravi|perdid|baja|danad|repar/.test(n))return'bad';
  return'none';
}
const ICON={
 ok:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/></svg>',
 warn:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
 bad:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>',
 none:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-dasharray="3 3" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>'
};
const PIN='<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
const BOOK='<svg class="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h10"/></svg>';
const MAG='<svg class="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L20 20"/></svg>';

/* ---------- Deslizamiento del fondo ----------
   Dirección al azar en cada carga; velocidad constante y lenta. El mosaico se repite
   en 2×2 bloques idénticos, así el desplazamiento nunca muestra un borde. */
(function(){
  const plane=document.querySelector('.plane'), base=plane.querySelector('.block');
  const blocks=[base];
  for(let i=1;i<4;i++){const c=base.cloneNode(true);plane.appendChild(c);blocks.push(c)}
  const SPEED=8;                                   // píxeles por segundo
  const angle=Math.random()*Math.PI*2;              // nueva dirección en cada recarga
  const vx=Math.cos(angle)*SPEED, vy=Math.sin(angle)*SPEED;
  let bw,bh,ox,oy;
  function layout(){
    bw=Math.round(Math.max(innerWidth*1.35,900)); bh=Math.round(Math.max(innerHeight*1.35,640));
    blocks.forEach((b,i)=>{b.style.width=bw+'px';b.style.height=bh+'px';b.style.left=(i%2?-bw:0)+'px';b.style.top=(i>1?-bh:0)+'px'});
    if(ox==null){ox=Math.random()*bw;oy=Math.random()*bh}
    ox%=bw;oy%=bh;draw();
  }
  function draw(){plane.style.transform=`translate3d(${ox.toFixed(2)}px,${oy.toFixed(2)}px,0)`}
  layout(); addEventListener('resize',layout);
  if(reduceMotion)return;
  let last=performance.now();
  (function tick(now){
    const dt=Math.min(.1,(now-last)/1000); last=now;
    ox=((ox+vx*dt)%bw+bw)%bw; oy=((oy+vy*dt)%bh+bh)%bh; draw();
    requestAnimationFrame(tick);
  })(last);
})();

/* ---------- Ingesta (misma ruta para los datos de ejemplo y las planillas subidas) ---------- */
function ingest(headers,rows,fileName){
  const hdr=headers.map(h=>clean(h));
  const map={}, extras=[], used=new Set();
  hdr.forEach((h,i)=>{
    const n=norm(h).replace(/\s+/g,' ');
    /* Coincidencia exacta del encabezado, o que empiece por un alias ("Codigo ID Interno" → código) */
    const f=FIELDS.find(f=>!used.has(f.key)&&f.aliases.map(norm).includes(n))||FIELDS.find(f=>!used.has(f.key)&&f.aliases.map(norm).some(a=>n.startsWith(a+' ')));
    if(f){map[f.key]=i;used.add(f.key)} else if(h){extras.push({label:h,idx:i})}
  });
  const rep={fileName,total:rows.length,blank:0,noTitle:0,dupIds:0,grouped:0,noStatus:0,noDewey:0,recognized:FIELDS.filter(f=>f.key in map).map(f=>f.label),extras:extras.map(e=>e.label),emptyCols:[],errors:[]};
  if(!('title' in map)){rep.errors.push('No encontramos la columna «Título». Revisa que la primera fila tenga los nombres de las columnas.');return{records:[],report:rep}}
  const seen=new Set(), groups=new Map(), records=[];
  rows.forEach(r=>{
    const cells=hdr.map((_,i)=>clean(r[i]));
    if(cells.every(c=>!c)){rep.blank++;return}
    const rec={extra:[]};
    FIELDS.forEach(f=>{rec[f.key]=f.key in map?cells[map[f.key]]:''});
    extras.forEach(e=>{if(cells[e.idx])rec.extra.push([e.label,cells[e.idx]])});
    if(!rec.title){rep.noTitle++;return}
    if(rec.id){if(seen.has(rec.id))rep.dupIds++;seen.add(rec.id)}
    /* Filas idénticas = ejemplares del mismo libro: se muestran una vez */
    const key=FIELDS.map(f=>norm(rec[f.key])).join('|')+'|'+norm(rec.extra.map(x=>x.join(':')).join('|'));
    if(groups.has(key)){groups.get(key).copies++;rep.grouped++;return}
    rec.copies=1;groups.set(key,rec);
    if(!rec.status)rep.noStatus++;
    if(!rec.dewey)rep.noDewey++;
    rec.dewey=padDewey(rec.dewey);
    rec.titleD=capFirst(smartCase(rec.title));
    rec.authorD=nameCase(smartCase(rec.author));
    rec.locD=prettyLoc(smartCase(rec.location));
    rec.categoryD=smartCase(rec.category);
    rec.statusD=capFirst(smartCase(rec.status));
    rec.publisherD=smartCase(rec.publisher);
    rec.n={};FIELDS.forEach(f=>rec.n[f.key]=norm(f.key==='location'?rec.location+' '+rec.locD:rec[f.key]));
    rec.n.all=Object.values(rec.n).join(' | ')+' '+norm(rec.extra.map(x=>x[1]).join(' '));
    records.push(rec);
  });
  rep.emptyCols=FIELDS.filter(f=>f.key in map&&records.length&&records.every(r=>!r[f.key])).map(f=>f.label);
  rep.kept=records.length;
  /* Si el código se repite en casi todas las filas, es un código de colección (BBVM, PPVM…), no un identificador único */
  if(seen.size<records.length*0.5)rep.dupIds=0;
  return{records,report:rep,raw:{headers,rows}};
}
/* La base publicada desde Administración se guarda en este equipo (navegador).
   Si no hay una guardada, se usa la base inicial del sitio: data/catalogo-inicial.js */
const STORE_KEY='bbvm-catalogo-v2';
function loadStored(){try{const s=JSON.parse(localStorage.getItem(STORE_KEY)||'null');if(s&&s.headers&&s.rows)return s}catch(e){}return null}
function saveStored(o){try{localStorage.setItem(STORE_KEY,JSON.stringify(o));return true}catch(e){return false}}
function clearStored(){try{localStorage.removeItem(STORE_KEY)}catch(e){}}
function loadSource(src,local){const d=ingest(src.headers,src.rows,src.file);d.loadedAt=new Date(src.loadedAt);d.local=local;return d}
let DB=(()=>{const s=loadStored();if(s){const d=loadSource(s,true);if(d.records.length)return d}return loadSource(SEED,false)})();

/* ---------- Motor de búsqueda: todos los campos, sin tildes, por inicio de palabra ---------- */
function search(qstr){
  const terms=norm(qstr).split(/\s+/).filter(Boolean);
  if(!terms.length)return[];
  const res=[];
  for(const r of DB.records){
    let score=0,ok=true;
    for(const t of terms){
      const re=new RegExp('(^|[^a-z0-9])'+reEsc(t));
      if(!re.test(r.n.all)){ok=false;break}
      for(const f of FIELDS){if(re.test(r.n[f.key]))score+=WEIGHT[f.key]+(r.n[f.key].startsWith(t)?2:0)}
    }
    if(ok)res.push([r,score]);
  }
  res.sort((a,b)=>b[1]-a[1]||a[0].titleD.localeCompare(b[0].titleD,'es',{numeric:true,sensitivity:'base'}));
  return res.map(x=>x[0]);
}
function hl(text,qstr){
  const raw=String(text), terms=norm(qstr).split(/\s+/).filter(Boolean);
  if(!terms.length)return esc(raw);
  const n=norm(raw), spans=[];
  terms.forEach(t=>{const re=new RegExp('(^|[^a-z0-9])('+reEsc(t)+')','g');let m;while((m=re.exec(n))){const s=m.index+m[1].length;spans.push([s,s+t.length])}});
  if(!spans.length)return esc(raw);
  spans.sort((a,b)=>a[0]-b[0]);
  const merged=[];spans.forEach(s=>{const l=merged[merged.length-1];if(l&&s[0]<=l[1])l[1]=Math.max(l[1],s[1]);else merged.push(s)});
  let out='',p=0;merged.forEach(([a,b])=>{out+=esc(raw.slice(p,a))+'<mark>'+esc(raw.slice(a,b))+'</mark>';p=b});
  return out+esc(raw.slice(p));
}

/* ---------- Modos de pantalla: portada → consulta, con animación de los logos ---------- */
let mode='splash';
function setMode(m,animate){
  const els=[...document.querySelectorAll('.logo')];
  const first=animate?els.map(e=>e.getBoundingClientRect()):null;
  document.body.className=m;
  mode=m;
  $('#home').tabIndex=m==='splash'?-1:0;
  $('#foot-link').hidden=m!=='admin';
  if(!animate||reduceMotion)return;
  els.forEach((e,i)=>{
    const f=first[i], l=e.getBoundingClientRect();
    e.animate([
      {transform:`translate(${f.left-l.left}px,${f.top-l.top}px) scale(${f.width/l.width})`},
      {transform:'none'}
    ],{duration:750,easing:'cubic-bezier(.22,.8,.24,1)'});
  });
}
function start(firstChar){
  if(mode!=='splash')return;
  window.scrollTo(0,0);
  setMode('search',true);
  if(!reduceMotion){
    [$('#view-search'),$('.foot')].forEach(el=>el.animate([{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'none'}],{duration:450,delay:380,easing:'ease-out',fill:'backwards'}));
  }
  const q=$('#q'); q.focus({preventScroll:true});
  if(firstChar){q.value=firstChar;onType()}
  armIdle();
}
function goHome(){
  resetSearch();
  setHash('');
  window.scrollTo(0,0);
  setMode('splash',true);
  $('#invite').focus({preventScroll:true});
}

/* Portada: clic en cualquier parte o cualquier tecla para comenzar */
document.addEventListener('click',e=>{if(mode==='splash'){e.preventDefault();start()}});
document.addEventListener('keydown',e=>{
  if(mode==='splash'){
    if(e.key==='Tab'||e.metaKey||e.ctrlKey||e.altKey)return;
    e.preventDefault();
    start(e.key.length===1&&e.key!==' '?e.key:'');
  }else if(mode==='search'&&e.key==='/'&&document.activeElement!==$('#q')){e.preventDefault();$('#q').focus()}
});
$('#home').addEventListener('click',e=>{e.stopPropagation();if(mode==='splash')start();else goHome()});

/* Si nadie usa la pantalla por 3 minutos, vuelve a la portada (pensado para un equipo de consulta en sala) */
let idleT;
function armIdle(){clearTimeout(idleT);if(mode==='search')idleT=setTimeout(goHome,IDLE_MS)}
['pointerdown','keydown','input','scroll'].forEach(ev=>addEventListener(ev,()=>{if(mode==='search')armIdle()},{passive:true}));

/* ---------- Barra: sugerencias al tipear, resultados al presionar Buscar ---------- */
const q=$('#q'), list=$('#suggest'), bar=$('#bar');
let sugg=[], sTotal=0, active=-1, R=null;

function openSuggest(on){list.hidden=!on;bar.classList.toggle('open',on);q.setAttribute('aria-expanded',on);if(!on){active=-1;q.removeAttribute('aria-activedescendant')}}
/* Acceso a administración: escribir el código :admin: en la barra */
const ADMIN_CODE=':admin:';
function checkAdminCode(){
  if(q.value.trim().toLowerCase()!==ADMIN_CODE)return false;
  resetSearch();q.blur();openAdmin();return true;
}
function onType(){
  const v=q.value;
  $('#clear').hidden=!v;
  if(checkAdminCode())return;
  if(!v.trim()||v.trim().startsWith(':')){openSuggest(false);sugg=[];return}
  const res=search(v); sugg=res.slice(0,SUGGEST); sTotal=res.length; active=-1;
  renderSuggest(v);
}
function renderSuggest(v){
  if(!sTotal){
    list.innerHTML=`<li class="s-none" role="option" aria-disabled="true">No hay libros que coincidan con «${esc(v.trim())}»</li>`;
  }else{
    list.innerHTML=sugg.map((r,i)=>`<li id="s-${i}" role="option" aria-selected="false" data-i="${i}">
      ${BOOK}<div class="s-main"><div class="s-title">${hl(r.titleD,v)}</div><div class="s-sub">${r.authorD?hl(r.authorD,v):'Autor no registrado'}</div></div>
      <span class="s-loc">${esc(r.locD)}</span></li>`).join('')+
      `<li id="s-all" class="s-all" role="option" aria-selected="false" data-i="all">${MAG}<span>${sTotal===1?'Ver el resultado':`Ver los ${fmt(sTotal)} resultados`}</span></li>`;
  }
  openSuggest(true);
  $('#live').textContent=sTotal?`${fmt(sTotal)} ${sTotal===1?'libro coincide':'libros coinciden'}`:'Sin coincidencias';
}
function moveActive(d){
  const items=[...list.querySelectorAll('[data-i]')];if(!items.length)return;
  active=(active+d+items.length)%items.length;
  items.forEach((li,i)=>li.setAttribute('aria-selected',i===active));
  q.setAttribute('aria-activedescendant',items[active].id);
  items[active].scrollIntoView({block:'nearest'});
}
function pick(i){
  if(i==='all'||i==null){showResults(q.value);return}
  const r=sugg[+i]; q.value=r.titleD; showResults(r.titleD);
}
q.addEventListener('input',onType);
q.addEventListener('focus',()=>{if(q.value.trim()&&(!R||R.q!==q.value))onType()});
q.addEventListener('keydown',e=>{
  if(e.key==='ArrowDown'){e.preventDefault();if(list.hidden)onType();else moveActive(1)}
  else if(e.key==='ArrowUp'){e.preventDefault();moveActive(-1)}
  else if(e.key==='Escape'){openSuggest(false)}
  else if(e.key==='Enter'){e.preventDefault();if(active>=0&&!list.hidden)pick(list.querySelectorAll('[data-i]')[active].dataset.i);else showResults(q.value)}
});
list.addEventListener('mousedown',e=>e.preventDefault());
list.addEventListener('click',e=>{const li=e.target.closest('[data-i]');if(li)pick(li.dataset.i)});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.bar-outer'))openSuggest(false)});
/* Enter y el botón se manejan directo: algunas vistas previas bloquean el envío de formularios */
bar.addEventListener('submit',e=>e.preventDefault());
$('#go').onclick=()=>showResults(q.value);
$('#clear').onclick=()=>{resetSearch();q.focus()};

function resetSearch(){q.value='';$('#clear').hidden=true;openSuggest(false);R=null;renderResults()}
function showResults(v){
  if(checkAdminCode())return;
  v=v.trim();
  openSuggest(false);
  if(!v){q.focus();return}
  R={q:v,list:search(v),shown:PAGE};
  renderResults();
  if(matchMedia('(pointer:coarse)').matches)q.blur();
  const h=$('#rcount');if(h&&!matchMedia('(pointer:coarse)').matches){/* mantiene el foco en la barra para seguir escribiendo */}
  window.scrollTo({top:0,behavior:reduceMotion?'auto':'smooth'});
}
function hitHTML(r,v){
  const k=statusKind(r.status);
  const dew=r.dewey?`<span class="dewey"><span class="sr">Dewey </span>${hl(r.dewey,v)}</span>`:`<span class="dewey none">Sin Dewey</span>`;
  const author=r.authorD?`<button class="linkish" type="button" data-q="${esc(r.authorD)}" title="Ver más libros de este autor">${hl(r.authorD,v)}</button>`:`<span class="no">Autor no registrado</span>`;
  const meta=[];
  if(r.locD)meta.push(`<span class="where">${PIN}<span><span class="sr">Ubicación: </span>${hl(r.locD,v)}</span></span>`);
  if(r.category&&norm(r.category)!==norm(r.location))meta.push(`<button class="linkish" type="button" data-q="${esc(r.categoryD)}" title="Ver más libros de esta categoría">${hl(r.categoryD,v)}</button>`);
  if(r.publisher)meta.push(`<span>${hl(r.publisherD,v)}</span>`);
  if(r.year)meta.push(`<span>${hl(r.year,v)}</span>`);
  if(r.edition)meta.push(`<span>Edición ${hl(r.edition,v)}</span>`);
  if(r.copies>1)meta.push(`<span>${r.copies} ejemplares</span>`);
  r.extra.forEach(([l,x])=>meta.push(`<span>${esc(l)}: ${esc(x)}</span>`));
  if(r.id)meta.push(`<span class="code"><span class="sr">Código </span>${hl(r.id,v)}</span>`);
  return `<li class="hit">
    <div class="hit-head">
      <h2 class="t">${hl(r.titleD,v)}${dew}</h2>
      <span class="status ${k}">${ICON[k]}${esc(r.statusD||'Sin estado')}</span>
    </div>
    <p class="by">${author}</p>
    <div class="meta">${meta.join('')}</div>
  </li>`;
}
function renderResults(){
  const el=$('#results'), hint=$('#hint');
  hint.textContent=`Busca entre ${fmt(DB.records.length)} libros por título, autor, tema, código Dewey o ubicación.`;
  if(!R){el.innerHTML='';hint.hidden=false;return}
  hint.hidden=true;
  const n=R.list.length;
  if(!n){
    el.innerHTML=`<div class="empty"><h2>No encontramos libros con «${esc(R.q)}»</h2><p>Prueba con menos palabras o revisa la ortografía. Las tildes y mayúsculas no importan.</p></div>`;
    $('#live').textContent='Sin resultados';
    return;
  }
  const shown=R.list.slice(0,R.shown);
  el.innerHTML=`<p class="rcount" id="rcount" tabindex="-1"><strong>${fmt(n)}</strong> ${n===1?'libro encontrado':'libros encontrados'} para «${esc(R.q)}»</p>
    <ol class="hits">${shown.map(r=>hitHTML(r,R.q)).join('')}</ol>
    ${n>R.shown?`<button class="more" id="more" type="button">Mostrar más resultados (${fmt(n-R.shown)} restantes)</button>`:''}`;
  $('#live').textContent=`${fmt(n)} ${n===1?'libro encontrado':'libros encontrados'}`;
}
$('#results').addEventListener('click',e=>{
  if(e.target.closest('#more')){R.shown+=PAGE;renderResults();return}
  const b=e.target.closest('[data-q]');if(!b)return;
  q.value=b.dataset.q;$('#clear').hidden=false;showResults(b.dataset.q);
});

/* ---------- Administración ---------- */
let PENDING=null, WB=null, PENDING_NAME='';
function curInfo(){
  const d=DB.loadedAt;
  $('#cur-info').innerHTML=`<b>${esc(DB.report.fileName)}</b><br><span class="muted">${fmt(DB.records.length)} libros, cargada el ${d.toLocaleDateString('es-CL')} a las ${d.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})}</span><br>
    <span class="muted">${DB.local?'Guardada solo en este equipo.':'Base inicial incluida en el sitio.'}</span>`;
  $('#restore').hidden=!DB.local;
}
/* Descarga la base vigente como data/catalogo-inicial.js, para subirla al repositorio
   y que todos los equipos la vean */
function downloadSeed(){
  const o={file:DB.report.fileName,loadedAt:DB.loadedAt.toISOString(),headers:DB.raw.headers,rows:DB.raw.rows};
  const js='/* Base inicial del Catálogo Oficial B.B.V.M. Generada desde Administración. */\nwindow.SEED='+JSON.stringify(o)+';\n';
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([js],{type:'text/javascript'}));a.download='catalogo-inicial.js';
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
}
function toast(m){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>t.hidden=true,4000)}
function readSheet(name){
  const all=XLSX.utils.sheet_to_json(WB.Sheets[name],{header:1,defval:'',raw:true,blankrows:false});
  const hi=all.findIndex(r=>r.some(c=>clean(c)));
  PENDING=hi<0?{records:[],report:{fileName:PENDING_NAME,total:0,errors:['La hoja está vacía.']}}:ingest(all[hi],all.slice(hi+1),PENDING_NAME);
  showReview();
}
function handleFile(f){
  if(!f)return;
  if(typeof XLSX==='undefined'){toast('No se pudo cargar el lector de Excel. Revisa la conexión a internet.');return}
  PENDING_NAME=f.name;
  const rd=new FileReader();
  rd.onload=ev=>{
    try{
      WB=XLSX.read(ev.target.result,{type:'array'});
      $('#sheet').innerHTML=WB.SheetNames.map(n=>`<option>${esc(n)}</option>`).join('');
      $('#sheetpick').hidden=WB.SheetNames.length<2;
      /* Si existe una hoja llamada «Catálogo», se usa esa; si no, la primera */
      const pref=WB.SheetNames.find(n=>norm(n).replace(/\s+/g,'')==='catalogo')||WB.SheetNames[0];
      $('#sheet').value=pref;
      readSheet(pref);
    }catch(err){
      PENDING={records:[],report:{fileName:f.name,total:0,errors:['No pudimos leer este archivo. Comprueba que sea una planilla Excel o CSV válida.']}};showReview();
    }
  };
  rd.readAsArrayBuffer(f);
}
function showReview(){
  const r=PENDING.report, ok=!r.errors.length&&PENDING.records.length>0;
  $('#review').hidden=false;
  $('#stats').innerHTML=[['Libros a publicar',PENDING.records.length],['Filas leídas',r.total],['Filas vacías omitidas',r.blank],['Sin estado',r.noStatus]].map(([l,v])=>`<div class="stat"><b>${fmt(v||0)}</b><span>${l}</span></div>`).join('');
  const notes=[];
  r.errors.forEach(m=>notes.push(['e',m]));
  if(r.noTitle)notes.push(['w',`${fmt(r.noTitle)} filas no tienen título y no se publicarán.`]);
  if(r.dupIds)notes.push(['w',`${fmt(r.dupIds)} códigos de identificación están repetidos. Se publican igual, pero conviene corregirlos.`]);
  if(r.grouped)notes.push(['i',`${fmt(r.grouped)} filas repetidas se agruparon como ejemplares del mismo libro.`]);
  if(r.noStatus)notes.push(['i',`${fmt(r.noStatus)} libros no tienen estado y aparecerán como «Sin estado».`]);
  if(r.noDewey)notes.push(['i',`${fmt(r.noDewey)} libros no tienen código Dewey.`]);
  if(r.emptyCols&&r.emptyCols.length)notes.push(['i',`Las columnas ${r.emptyCols.map(c=>'«'+c+'»').join(', ')} están vacías y no se mostrarán.`]);
  if(ok&&!notes.some(x=>x[0]!=='i'))notes.unshift(['i','La planilla está lista para publicar.']);
  $('#notes').innerHTML=notes.map(([c,m])=>`<li class="${c}">${m}</li>`).join('');
  $('#cols').innerHTML=(r.recognized||[]).map(l=>`<li>${esc(l)}</li>`).join('')+(r.extras||[]).map(l=>`<li class="extra">${esc(l)} (adicional)</li>`).join('');
  const sample=PENDING.records.slice(0,5), cols=FIELDS.filter(f=>sample.some(x=>x[f.key]));
  $('#preview').innerHTML=sample.length?`<thead><tr>${cols.map(c=>`<th>${c.label}</th>`).join('')}</tr></thead><tbody>${sample.map(x=>`<tr>${cols.map(c=>`<td>${esc(x[c.key])}</td>`).join('')}</tr>`).join('')}</tbody>`:'';
  $('#publish').disabled=!ok;
  $('#review').scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'start'});
}
function resetUpload(){PENDING=null;WB=null;$('#review').hidden=true;$('#sheetpick').hidden=true;$('#file').value=''}
$('#file').onchange=e=>handleFile(e.target.files[0]);
$('#sheet').onchange=e=>readSheet(e.target.value);
const drop=$('#drop');
['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('over')}));
['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('over')}));
drop.addEventListener('drop',e=>handleFile(e.dataTransfer.files[0]));
$('#cancel').onclick=resetUpload;
$('#publish').onclick=()=>{
  const now=new Date();
  const saved=saveStored({file:PENDING.report.fileName,loadedAt:now.toISOString(),headers:PENDING.raw.headers,rows:PENDING.raw.rows});
  DB=PENDING;DB.loadedAt=now;DB.local=saved;
  curInfo();resetUpload();resetSearch();
  backToCatalog();
  toast(saved?`Catálogo publicado con ${fmt(DB.records.length)} libros y guardado en este equipo.`:`Catálogo publicado con ${fmt(DB.records.length)} libros, pero no se pudo guardar: se perderá al recargar.`);
};
$('#restore').onclick=()=>{
  clearStored();DB=loadSource(SEED,false);curInfo();resetSearch();
  toast(`Se volvió a la base inicial (${fmt(DB.records.length)} libros).`);
};
$('#dl-seed').onclick=downloadSeed;
$('#tpl').onclick=()=>{
  if(typeof XLSX==='undefined'){toast('No se pudo cargar el lector de Excel. Revisa la conexión a internet.');return}
  const ws=XLSX.utils.aoa_to_sheet([['Codigo ID Interno','Titulo','Autor','Dewey','Categoria','Ubicacion','Estado','Editorial','Año'],['BBVM','TÍTULO DEL LIBRO','NOMBRE DEL AUTOR','863','NOVELA','LITERATURA 800','DISPONIBLE','EDITORIAL',2024]]);
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Libros');XLSX.writeFile(wb,'Plantilla_catalogo_BBVM.xlsx');
};

/* ---------- Navegación entre consulta y administración ----------
   Se maneja con JavaScript y no con enlaces "#", porque dentro de una vista previa
   embebida un enlace "#" saca a la página de su marco y la deja en blanco. */
function setHash(h){try{history.replaceState(null,'',h||(location.pathname+location.search))}catch(e){}}
function openAdmin(){
  setHash('#/admin');setMode('admin',false);
  document.title='Administración | Catálogo Oficial B.B.V.M.';window.scrollTo(0,0);
  $('#back').focus({preventScroll:true});
}
function backToCatalog(){
  setHash('');setMode('search',false);
  document.title='Catálogo Oficial B.B.V.M.';window.scrollTo(0,0);
  armIdle();$('#q').focus({preventScroll:true});
}
$('#back').onclick=backToCatalog;
$('#foot-link').onclick=backToCatalog;
/* Abrir el archivo con #/admin al final de la dirección también lleva a administración */
function route(){
  const admin=location.hash.startsWith('#/admin');
  if(admin){setMode('admin',false);document.title='Administración | Catálogo Oficial B.B.V.M.';window.scrollTo(0,0)}
  else{document.title='Catálogo Oficial B.B.V.M.';if(mode==='admin'){setMode('search',false);armIdle()}}
}
addEventListener('hashchange',route);
/* La barra fija toma fondo solo cuando hay resultados pasando por debajo */
addEventListener('scroll',()=>{const w=$('.searchwrap');w.classList.toggle('stuck',mode==='search'&&w.getBoundingClientRect().top<=0&&scrollY>40)},{passive:true});
curInfo();renderResults();
if(location.hash.startsWith('#/admin'))route();
