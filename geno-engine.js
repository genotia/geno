/* ===========================================================================
   Genoti — Geno AI engine (shared).
   Single source of truth for the Geno chat: intent parsing, deal rendering,
   malls, brand deals, bookings, negotiation and the auth gate.
   Loaded by Geno.html and poc1.html — edit here, both pick it up.
   Requires (in order): supabase-js, auth.js, analytics.js, bookings.js,
   brand-deals.js. Expects the Geno chat DOM (#chat, #userInput, .gc-panel…).
   =========================================================================== */
/* ============================================================
   Geno AI — conversational deal surface (vanilla, single file).
   All deal access is isolated behind fetchDeals() so swapping the
   stub for a live API is a one-function change.
   ============================================================ */

/* ---------- Header menu (chrome) ---------- */
function toggleMenu() { document.getElementById('menu-dropdown').classList.toggle('open'); }
document.addEventListener('click', e => { if (!e.target.closest('.menu-dropdown-wrap')) document.getElementById('menu-dropdown').classList.remove('open'); });

/* ============================================================ DATA LAYER (stub) ============================================================ */
const NOW = Date.now();
const AREAS = ['Electronic City','Indiranagar','HSR Layout','JP Nagar','Jayanagar','BTM Layout','Whitefield','Marathahalli'];

const TYPE_META = {
  'off-peak':    { label: 'Off-Peak',    dot: 'var(--green)',  tag: ['var(--green-lt)','var(--dark-green)'] },
  'last-minute': { label: 'Last Minute', dot: 'var(--coral)',  tag: ['var(--coral-bg)','var(--coral)'] },
  'community':   { label: 'Community',   dot: 'var(--blue)',   tag: ['var(--blue-bg)','var(--blue)'] },
  'flash':       { label: 'Flash Sale',  dot: 'var(--purple)', tag: ['var(--purple-bg)','var(--purple)'] },
  'new-launch':  { label: 'New Launch',  dot: 'var(--amber)',  tag: ['var(--amber-bg)','var(--amber)'] },
};

// Every deal is real inventory. Trust marker required on each.
// ref may be null → the card shows the real price alone (no fabricated strike-through).
/* Malls near the user. A mall holds both brand stores and local outlets,
   so a mall view pulls from both the local deal set and the brand feed. */
const MALLS = [
  { id:'forum',   name:'Forum Mall',         area:'Electronic City',  km:1.4 },
  { id:'garuda',  name:'Garuda Mall',        area:'Magrath Road', km:4.1 },
  { id:'mantri',  name:'Mantri Square',      area:'Malleswaram',  km:8.7 },
  { id:'phoenix', name:'Phoenix Marketcity', area:'Whitefield',   km:11.2 },
];

const _DB = [
  { id:'d01', merchant:'Green Leaf Spa',  cat:'Salon',      area:'Electronic City', km:1.2, offer:'35% off all services',        real:650,  ref:1000, type:'off-peak',    window:'Today 11am-3pm', expMin:null, bogo:false, buffet:false, createdMin:12, trust:{kind:'merchant'},                          tip:'HDFC Regalia -> 5x points, save ₹65 more' },
  { id:'d02', merchant:'Cafe Monsoon', mall:'forum',    cat:'Restaurant', area:'Electronic City', km:0.8, offer:'Buy 1 Get 1 lunch combos',     real:299,  ref:599,  type:'community',   window:'Today 12-4pm',   expMin:95,   bogo:true,  buffet:false, createdMin:22, trust:{kind:'community', votes:14},               tip:'Axis Ace -> 5% cashback on dining' },
  { id:'d03', merchant:'Spice Route',     cat:'Restaurant', area:'Electronic City', km:1.4, offer:'Lunch buffet for two',        real:599,  ref:999,  type:'off-peak',    window:'Today 12-4pm',   expMin:null, bogo:false, buffet:true,  createdMin:40, trust:{kind:'checked', cmp:'40% below area avg'}, tip:null },
  { id:'d04', merchant:'FitZone Gym',     cat:'Fitness',    area:'Electronic City', km:2.1, offer:'₹99 trial session',           real:99,   ref:500,  type:'community',   window:'Tomorrow 6-10am',expMin:null, bogo:false, buffet:false, createdMin:30, trust:{kind:'community', votes:12},               tip:null },
  { id:'d05', merchant:'Brew & Bite',     cat:'Cafe',       area:'Electronic City', km:0.5, offer:'₹149 all-day breakfast',      real:149,  ref:349,  type:'flash',       window:'Today all day',  expMin:40,   bogo:false, buffet:false, createdMin:8,  trust:{kind:'merchant'},                          tip:'Amazon Pay ICICI -> 2% back' },
  { id:'d06', merchant:'Aura Wellness',   cat:'Wellness',   area:'Electronic City', km:1.8, offer:'60-min massage ₹799',         real:799,  ref:1500, type:'new-launch',  window:'Today 2-6pm',    expMin:null, bogo:false, buffet:false, createdMin:55, trust:{kind:'merchant'},                          tip:null },
  { id:'d07', merchant:'Glam Studio', mall:'forum',     cat:'Salon',      area:'Electronic City', km:0.8, offer:'Full hair spa + cut',         real:499,  ref:1250, type:'community',   window:'Today',          expMin:null, bogo:false, buffet:false, createdMin:10, trust:{kind:'community', votes:247},              tip:null },
  { id:'d08', merchant:'Third Wave', mall:'garuda',      cat:'Cafe',       area:'Electronic City', km:1.1, offer:'15% off cold brews',          real:213,  ref:250,  type:'community',   window:'Today',          expMin:null, bogo:false, buffet:false, createdMin:58, trust:{kind:'community', votes:3},                tip:null },
  { id:'d09', merchant:'Cult.fit',        cat:'Fitness',    area:'Electronic City', km:1.5, offer:'Free trial week',             real:0,    ref:499,  type:'new-launch',  window:'This week',      expMin:null, bogo:false, buffet:false, createdMin:65, trust:{kind:'merchant'},                          tip:null },
  { id:'d10', merchant:'Kairali Spa',     cat:'Wellness',   area:'Electronic City', km:2.0, offer:'30% off Ayurveda massage',    real:1400, ref:2000, type:'off-peak',    window:'Weekdays',       expMin:null, bogo:false, buffet:false, createdMin:50, trust:{kind:'checked', cmp:'28% below area avg'}, tip:null },
  { id:'d11', merchant:'Meghana Foods',   cat:'Restaurant', area:'Electronic City', km:1.0, offer:'Buy 1 Get 1 chicken biryani', real:300,  ref:600,  type:'flash',       window:'Today till 10pm',expMin:70,   bogo:true,  buffet:false, createdMin:35, trust:{kind:'community', votes:9},                tip:null },
  { id:'d12', merchant:'Truffles', mall:'forum',        cat:'Restaurant', area:'Electronic City', km:1.8, offer:'Weekend buffet',              real:449,  ref:799,  type:'last-minute', window:'Sat-Sun',        expMin:null, bogo:false, buffet:true,  createdMin:45, trust:{kind:'merchant'},                          tip:null },
  { id:'d13', merchant:'Empire',          cat:'Restaurant', area:'Electronic City', km:1.9, offer:'Veg thali buffet',            real:225,  ref:null, type:'off-peak',    window:'Lunch',          expMin:null, bogo:false, buffet:true,  createdMin:70, trust:{kind:'checked', cmp:'in line with area avg'}, tip:null },
  { id:'d14', merchant:'Nails & Co', mall:'phoenix',      cat:'Salon',      area:'Electronic City', km:1.6, offer:'Nail art + pedicure',         real:649,  ref:999,  type:'community',   window:'Today',          expMin:null, bogo:false, buffet:false, createdMin:18, trust:{kind:'community', votes:21},               tip:null },
];

// Extra live inventory so a broad query spans multiple 25-per-page pages.
// Same shape + a trust marker on every one; roughly a third carry no ref (real price alone).
(function seedInventory(){
  const cats = ['Salon','Restaurant','Cafe','Fitness','Wellness'];
  const types = ['off-peak','last-minute','community','flash','new-launch'];
  const trusts = [{kind:'merchant'}, {kind:'community', votes:8}, {kind:'checked', cmp:'22% below area avg'}];
  for (let i = 0; i < 24; i++){
    const cat = cats[i % 5], type = types[i % 5];
    const real = 200 + ((i * 53) % 1400);
    const hasRef = (i % 3 !== 0);
    const ref = hasRef ? Math.round(real / (1 - (0.15 + (i % 4) * 0.05))) : null;
    _DB.push({
      id: 'g' + (i + 1), merchant: cat + ' House ' + (i + 1), cat: cat, area: 'Electronic City',
      km: +(0.5 + (i % 16) * 0.1).toFixed(1),
      offer: hasRef ? (Math.round((1 - real / ref) * 100) + '% off') : 'Special price',
      real: real, ref: ref, type: type, window: 'Today', expMin: (i % 4 === 0) ? (25 + i) : null,
      bogo: false, buffet: false, createdMin: (i * 11) % 180, trust: trusts[i % 3], tip: null
    });
  }
})();

/* SINGLE data-access seam. Swap the body for a fetch() to go live. */
function fetchDeals(f) {
  f = f || {};
  return _DB.filter(d => {
    if (f.mall && d.mall !== f.mall) return false;
    if (f.area && !f.mall && d.area !== f.area) return false;
    if (f.category && d.cat.toLowerCase() !== f.category.toLowerCase()) return false;
    if (f.type && d.type !== f.type) return false;
    if (f.bogo && !d.bogo) return false;
    if (f.buffet && !d.buffet) return false;
    if (f.maxKm != null && d.km > f.maxKm) return false;
    if (f.budget != null && d.real > f.budget) return false;
    if (f.freshMin != null && d.createdMin > f.freshMin) return false;
    return true;
  });
}

/* ============================================================ INSTRUMENTATION ============================================================ */
window.GENO_EVENTS = [];
function logEvent(type, payload) {
  const evt = Object.assign({ type: type, at: new Date().toISOString() }, payload || {});
  window.GENO_EVENTS.push(evt);
  if (window.console && console.debug) console.debug('[geno]', type, payload || '');
  // Same events, now durable, so the admin panel can count them.
  if (window.GenotiTrack) window.GenotiTrack.event(type, payload || {});
}

/* ============================================================ SESSION MEMORY ============================================================ */
const session = { area: null, filters: {}, lastResults: [], lastQueryText: '' };
window.GENO_SESSION = session;   // debug/inspection handle (see also window.GENO_EVENTS)

/* ============================================================ CHAT PRIMITIVES ============================================================ */
const chat = document.getElementById('chat');
let isBusy = false;
let interacted = false;   // suppress the auto-scroll on the very first (initial) render

function esc(s){ return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
// The panel is elastic, so we scroll the page (not an inner box) to keep the newest content in view.
function scrollChat(){ if (!interacted) return; setTimeout(() => { const k = chat.lastElementChild; if (k) k.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 40); }

/* One result set at a time. Starting a new turn hides everything before it, so
   the fresh deals sit at the top of the panel instead of below the last search.
   Nothing is lost: "Show earlier" brings the history back. */
let hiddenTurns = 0;
function startNewTurn(){
  const prev = [...chat.children].filter(n => n.id !== 'gc-earlier' && !n.classList.contains('gc-past'));
  if (!prev.length) return;
  prev.forEach(n => n.classList.add('gc-past'));
  hiddenTurns++;
  let bar = document.getElementById('gc-earlier');
  if (!bar){
    bar = document.createElement('button');
    bar.id = 'gc-earlier';
    bar.className = 'gc-earlier';
    bar.onclick = showEarlier;
    chat.prepend(bar);
  }
  bar.textContent = `Show earlier (${hiddenTurns})`;
  bar.style.display = 'block';
  const panel = document.querySelector('.gc-panel');
  if (panel) setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
}
function showEarlier(){
  chat.querySelectorAll('.gc-past').forEach(n => n.classList.remove('gc-past'));
  hiddenTurns = 0;
  const b = document.getElementById('gc-earlier');
  if (b) b.style.display = 'none';
}

function addUser(text){
  interacted = true;
  startNewTurn();
  const d = document.createElement('div'); d.className = 'msg msg-user';
  d.innerHTML = `<div class="bubble">${esc(text)}</div>`;
  chat.appendChild(d); scrollChat();
}
function addBot(html, extra){
  const d = document.createElement('div'); d.className = 'msg msg-bot';
  d.innerHTML = `<div class="msg-av">G</div><div class="bubble">${html}</div>`;
  chat.appendChild(d);
  if (extra){ const e = document.createElement('div'); e.className = 'msg-cards'; e.innerHTML = extra; chat.appendChild(e); }
  scrollChat();
}
function addCards(html){ const e = document.createElement('div'); e.className = 'msg'; e.style.marginLeft = '36px'; e.innerHTML = html; chat.appendChild(e); scrollChat(); }
function showTyping(){ isBusy = true; const d = document.createElement('div'); d.className='typing'; d.id='typing'; d.innerHTML=`<div class="msg-av">G</div><div class="dots"><span></span><span></span><span></span></div>`; chat.appendChild(d); scrollChat(); }
function hideTyping(){ isBusy = false; const t = document.getElementById('typing'); if (t) t.remove(); }

/* ============================================================ RENDERERS ============================================================ */
function trustMarkup(t){
  if (t.kind === 'merchant')
    return `<div class="dc-trust merchant"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Merchant guaranteed</div>`;
  if (t.kind === 'community')
    return `<div class="dc-trust community"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> Community verified · ${t.votes} votes</div>`;
  return `<div class="dc-trust checked"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 2v20M2 12h20"/></svg> Price-checked · ${esc(t.cmp)}</div>`;
}

function dealCard(d){
  const tm = TYPE_META[d.type];
  const priceLine = `<span class="dc-real">${d.real === 0 ? 'Free' : '₹'+d.real.toLocaleString('en-IN')}</span>` +
    (d.ref != null ? ` <span class="dc-ref">₹${d.ref.toLocaleString('en-IN')}</span>` : '');
  const countdown = d.expMin != null
    ? ` · <span class="dc-countdown" data-exp="${NOW + d.expMin*60000}">ends in ${d.expMin}m</span>` : '';
  return `<div class="deal-card" data-id="${d.id}">
    <div class="dc-top">
      <div><div class="dc-name">${esc(d.merchant)}</div><div class="dc-meta">${esc(d.cat)} · ${d.km} km</div></div>
      <span class="dc-tag" style="background:${tm.tag[0]};color:${tm.tag[1]}">${tm.label}</span>
    </div>
    <div class="dc-offer">${esc(d.offer)}</div>
    <div class="dc-price">${priceLine}</div>
    <div class="dc-window">🕒 ${esc(d.window)}${countdown}</div>
    ${trustMarkup(d.trust)}
    ${d.tip ? `<div class="dc-tip">💳 ${esc(d.tip)}</div>` : ''}
    <div class="dc-actions">
      <button class="dc-book" onclick="bookDeal('${d.id}')">Book · Pay at store</button>
      <button class="dc-icon" onclick="voteDeal(this,'${d.id}')" title="Mark hot">🔥</button>
      <button class="dc-icon" onclick="shareDeal('${d.id}')" title="Share">↗</button>
    </div>
  </div>`;
}
function dealGrid(list){ return `<div class="deal-grid">${list.map(dealCard).join('')}</div>`; }

/* ============================================================ ENTRY STATES ============================================================ */
function setArea(area){
  session.area = area;
  session.filters.area = area;
  document.getElementById('gc-loc-name').textContent = area ? area + ', Bengaluru' : 'Set your area';
}

function initEntry(){
  // Deep link: ?deal=<id> means intent already expressed → open on that deal.
  const dealId = new URLSearchParams(location.search).get('deal');
  if (dealId && _DB.some(d => d.id === dealId)) { setArea('Electronic City'); return openDeepLink(dealId); }

  const ret = loadReturning();

  // Default to Electronic City on load; users can still Change Location.
  grantedFlow(ret);
}

// Stub: a real build reverse-geocodes the coords. We resolve to a detected area.
function grantedFlow(ret){
  setArea('Electronic City');
  logEvent('entry', { mode: 'location-granted', area: session.area });
  if (ret) return renderReturning(ret);
  renderDigest();
}

function askLocation(reason, ret){
  logEvent('entry', { mode: 'location-denied' });
  addBot(`${timeGreeting()}! ${esc(reason)} Pick your area and I'll pull live deals around it.`);
  renderAreaPickerCard();
}

function openAreaPicker(){ addUser('Change location'); renderAreaPickerCard(); }
function renderAreaPickerCard(){
  const chips = AREAS.map(a => `<button class="chip" onclick="pickArea('${a}')">${a}</button>`).join('');
  addCards(`<div class="area-card">
    <div class="area-title">📍 Choose your area</div>
    <div class="area-sub">Bengaluru neighbourhoods with live deals right now.</div>
    <div class="chips">${chips}</div>
  </div>`);
}
function pickArea(area){
  addUser(area);
  setArea(area);
  logEvent('area-picked', { area });
  showTyping();
  setTimeout(() => { hideTyping(); renderDigest(); }, 450);
}

/* ---------- Returning user (localStorage stub) ---------- */
function loadReturning(){ try { const raw = localStorage.getItem('geno_last'); return raw ? JSON.parse(raw) : null; } catch { return null; } }
function saveReturning(obj){ try { localStorage.setItem('geno_last', JSON.stringify(obj)); } catch {} }
function renderReturning(ret){
  logEvent('entry', { mode: 'returning-user' });
  const live = _DB.find(d => d.merchant === ret.merchant);
  let msg = `Welcome back${ret.name ? ', <strong>'+esc(ret.name)+'</strong>' : ''}!`;
  if (ret.savedYear) msg += ` You've saved <strong>₹${Number(ret.savedYear).toLocaleString('en-IN')}</strong> this year.`;
  addBot(msg);
  if (live){ addBot(`Your spot <strong>${esc(live.merchant)}</strong> has a live deal today:`, dealGrid([live])); session.lastResults = [live]; startCountdowns(); }
  else renderDigest();
}

/* ============================================================ OPENING DIGEST ============================================================ */
function timeGreeting(){ const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
function discount(d){ return d.ref ? Math.round((1 - d.real/d.ref) * 100) : 0; }

function renderDigest(){
  const area = session.area || 'your area';
  const all = fetchDeals({ area: session.area });
  const freshCount = fetchDeals({ area: session.area, freshMin: 60 }).length;

  if (all.length < 3){
    addBot(`${timeGreeting()}! It's quiet in <strong>${esc(area)}</strong> right now, only ${all.length} live deal${all.length===1?'':'s'}. I can ask nearby merchants to open one up for you.`);
    addCards(`<div class="empty-card"><div class="empty-actions">
      <button class="empty-btn primary" onclick="handleQuick('Negotiate a better price')"><span class="eb-ic">🤝</span> Ask a merchant to make me a deal</button>
      <button class="empty-btn" onclick="startNotify('deals near ' + ${JSON.stringify(area)})"><span class="eb-ic">🔔</span> Notify me when deals go live here</button>
    </div></div>`);
    return;
  }

  const order = ['off-peak','last-minute','community','flash','new-launch'];
  let lines = '';
  order.forEach(type => {
    const items = all.filter(d => d.type === type);
    if (!items.length) return;
    const best = items.slice().sort((a,b) => discount(b) - discount(a))[0];
    const tm = TYPE_META[type];
    lines += `<button class="dg-card" onclick="handleQuick('${tm.label} deals')" style="--dg-bg:${tm.tag[0]};--dg-fg:${tm.tag[1]}">
      <div class="dg-top">
        <span class="dg-n">${items.length}</span>
        <span class="dg-type">${esc(tm.label.toLowerCase())}</span>
      </div>
      <div class="dg-best">
        <div class="dg-merchant">${esc(best.merchant)}</div>
        <div class="dg-offer">${esc(best.offer)}</div>
      </div>
      <div class="dg-foot">best · ${best.km} km</div>
    </button>`;
  });

  addBot(`${timeGreeting()}! Here's what's live near <strong>${esc(area)}</strong>.`);
  addCards(`<div class="digest">
    <div class="digest-head"><b>${freshCount}</b> deal${freshCount===1?'':'s'} went live in the last hour</div>
    <div class="digest-sub">${all.length} live in total · tap a type to see it</div>
    <div class="dg-grid">${lines}</div>
  </div>
  <div class="chips-label">Browse by category</div>
  <div class="chips">
    <button class="chip" onclick="handleQuick('salon deals')">💇 Salons</button>
    <button class="chip" onclick="handleQuick('restaurant deals')">🍽️ Restaurants</button>
    <button class="chip" onclick="handleQuick('cafe deals')">☕ Cafes</button>
    <button class="chip" onclick="handleQuick('fitness deals')">💪 Fitness</button>
    <button class="chip" onclick="handleQuick('wellness deals')">🧘 Wellness</button>
  </div>`);
}

/* ============================================================ NEARBY MALLS ============================================================ */
function mallDealCount(id){
  const local = fetchDeals({ mall: id }).length;
  const brand = window.BrandDeals ? BrandDeals.getDeals({ mall: id }).length : 0;
  return { local: local, brand: brand, total: local + brand };
}

function showMalls(){
  const list = MALLS.slice().sort((a, b) => a.km - b.km).filter(m => mallDealCount(m.id).total > 0);
  if (!list.length){
    addBot(`No malls near ${esc(session.area || 'you')} have live deals right now. I can watch for them.`);
    return;
  }
  addBot(`${list.length} mall${list.length === 1 ? '' : 's'} near you with deals live right now. Tap one to see every store inside.`);
  const MALL_ICON = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9z"/><path d="M3 9l2.5-6h13L21 9"/><path d="M9 21v-6h6v6"/></svg>';
  const cards = list.map(m => {
    const c = mallDealCount(m.id);
    const bits = [];
    if (c.local) bits.push(`${c.local} local`);
    if (c.brand) bits.push(`${c.brand} brand`);
    return `<button class="ml-card" onclick="openMall('${m.id}')">
      <div class="ml-top">
        <span class="ml-ico">${MALL_ICON}</span>
        <span class="ml-id">
          <span class="ml-name">${esc(m.name)}</span>
          <div class="ml-area">${esc(m.area)}</div>
        </span>
      </div>
      <div class="ml-stats">
        <div class="ml-statrow">
          <span><span class="ml-n">${c.total}</span> <span class="ml-lbl">deal${c.total === 1 ? '' : 's'} live</span></span>
          <span class="ml-km">${m.km} km</span>
        </div>
        <div class="ml-split">${bits.join(' · ')}</div>
      </div>
    </button>`;
  }).join('');
  addCards(`<div class="digest"><div class="digest-head">Malls near you</div><div class="digest-sub">Sorted by distance</div><div class="ml-grid">${cards}</div></div>`);
}

function openMall(id){
  const m = MALLS.find(x => x.id === id); if (!m) return;
  addUser(`Deals inside ${m.name}`);
  logEvent('mall-open', { mall: id });
  showTyping();
  setTimeout(() => {
    hideTyping();
    const local = rank(fetchDeals({ mall: id }));
    const brandCards = window.BrandDeals ? BrandDeals.cardsHTML({ mall: id, states: ['confirmed','spotted'] }) : '';
    const brandCount = window.BrandDeals ? BrandDeals.getDeals({ mall: id }).length : 0;
    if (!local.length && !brandCount){
      addBot(`Nothing live inside <strong>${esc(m.name)}</strong> right now.`);
      return;
    }
    session.lastResults = local;
    addBot(`Inside <strong>${esc(m.name)}</strong>, ${esc(m.km + ' km away')}. ${local.length + brandCount} deal${(local.length + brandCount) === 1 ? '' : 's'} live across the stores.`);
    if (brandCount) addCards(`<div class="chips-label">Brand stores</div><div class="brd-grid">${brandCards}</div>`);
    if (local.length) addCards(`<div class="chips-label">Other stores inside</div>${dealGrid(local)}`);
    startCountdowns();
  }, 560);
}

/* ============================================================ INTENT PARSING ============================================================ */
const CATS = { salon:'Salon', spa:'Wellness', wellness:'Wellness', massage:'Wellness', restaurant:'Restaurant', dining:'Restaurant', lunch:'Restaurant', dinner:'Restaurant', food:'Restaurant', cafe:'Cafe', coffee:'Cafe', breakfast:'Cafe', fitness:'Fitness', gym:'Fitness', workout:'Fitness' };

function parseIntent(text){
  const t = ' ' + text.toLowerCase() + ' ';
  const slots = {};
  for (const k in CATS){ if (t.includes(k)) { slots.category = CATS[k]; break; } }
  if (t.includes('buffet')) slots.buffet = true;
  if (/\b(bogo|buy 1 get 1|buy one get one|two for one|2 for 1|b1g1)\b/.test(t)) slots.bogo = true;
  if (t.includes('off-peak') || t.includes('off peak')) slots.type = 'off-peak';
  else if (t.includes('last minute') || t.includes('last-minute')) slots.type = 'last-minute';
  else if (t.includes('community')) slots.type = 'community';
  else if (t.includes('flash')) slots.type = 'flash';
  else if (t.includes('launch')) slots.type = 'new-launch';
  const m = t.match(/(?:under|below|less than|upto|up to|within)\s*₹?\s*(\d{2,5})/) || t.match(/₹\s*(\d{2,5})/);
  if (m) slots.budget = parseInt(m[1]);
  if (t.includes('near') || t.includes('nearby') || t.includes('close') || t.includes('around me')) slots.maxKm = 2;
  const km = t.match(/(\d(?:\.\d)?)\s*km/); if (km) slots.maxKm = parseFloat(km[1]);
  if (t.includes('tomorrow')) slots.timeWindow = 'tomorrow';
  else if (t.includes('weekend') || t.includes('saturday') || t.includes('sunday')) slots.timeWindow = 'weekend';
  const p = t.match(/(?:for|party of|table for)\s*(\d)/); if (p) slots.party = parseInt(p[1]);
  return slots;
}

/* ============================================================ REFINEMENTS (pronouns, ordinals, stacked constraints) ============================================================ */
const ORDINALS = { first:0, '1st':0, second:1, '2nd':1, third:2, '3rd':2, fourth:3, '4th':3, fifth:4, '5th':4, last:-1 };
function resolveOrdinal(text){
  const t = text.toLowerCase();
  if (!session.lastResults.length) return null;
  /* Browse intents are not item references. "Last minute deals" is a category,
     not "book the last one", and must never resolve to a booking. */
  if (/\b(last minute|off.?peak|flash sale|launch offer|new launch|brand deals?|community deals?|malls?|deals near|nearby)\b/.test(t)) return null;
  if (!/\b(book|the|that|number|#|first|second|third|fourth|fifth|last|1st|2nd|3rd|4th|5th)\b/.test(t)) return null;
  /* "last" only means the final result when it reads as a reference. */
  if (/\blast\b/.test(t) && !/\blast\s+(one|deal|result)\b/.test(t) && !/\bbook\b/.test(t)) return null;
  for (const w in ORDINALS){
    if (new RegExp('\\b'+w.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\$&')+'\\b').test(t)){
      let i = ORDINALS[w]; if (i === -1) i = session.lastResults.length - 1;
      if (i < session.lastResults.length) return session.lastResults[i];
    }
  }
  const num = t.match(/\bnumber\s*(\d)\b/) || t.match(/#(\d)/);
  if (num){ const i = parseInt(num[1]) - 1; if (i >= 0 && i < session.lastResults.length) return session.lastResults[i]; }
  return null;
}

function applyRefinement(text){
  const t = text.toLowerCase();
  let changed = false, note = '';
  if (/\b(cheaper|less|lower price|too expensive)\b/.test(t)){
    const base = session.filters.budget != null ? session.filters.budget
      : (session.lastResults.length ? Math.max.apply(null, session.lastResults.map(d=>d.real)) : 500);
    session.filters.budget = Math.max(50, Math.floor(base * 0.7));
    note = 'under ₹'+session.filters.budget; changed = true;
  }
  if (/\b(closer|nearer|walking distance)\b/.test(t)){ session.filters.maxKm = 1; note = 'within 1 km'; changed = true; }
  if (/\btomorrow\b/.test(t)){ session.filters.timeWindow = 'tomorrow'; note = 'tomorrow'; changed = true; }
  if (/\bnot that area\b|\bdifferent area\b|\banother area\b|\bwider\b/.test(t)){ delete session.filters.maxKm; note = 'wider area'; changed = true; }
  if (!changed) return false;
  logEvent('refine', { text: text, note: note, filters: Object.assign({}, session.filters) });
  addUser(text);
  runQuery('Same search, ' + note, Object.assign({}, session.filters, { area: session.area }), { refine: true });
  return true;
}

/* ============================================================ RESPONSE PIPELINE ============================================================ */
function rank(list){ return list.slice().sort((a,b) => (a.km - b.km) || (discount(b) - discount(a))); }

function send(text, opts){
  opts = opts || {};
  if (isBusy || !text.trim()) return;

  // Checked first: this is a request to see bookings, never to make one.
  if (/\b(my bookings?|my booked|booked deals?|my deals|show bookings?|view bookings?)\b/i.test(text)){
    addUser(text);
    logEvent('query', { text: text, intent: 'my-bookings', source: opts.source || 'typed' });
    return window.GenotiAuth.require(
      { icon: 'book', title: 'Log in to see your bookings', msg: 'Your bookings are tied to your account, so log in to pull them up.' },
      () => { showTyping(); setTimeout(() => { hideTyping(); showMyBookings(); }, 420); }
    );
  }

  const ord = resolveOrdinal(text);
  if (ord){ addUser(text); logEvent('ordinal', { text: text, id: ord.id }); return bookDeal(ord.id); }

  if (session.lastResults.length && applyRefinement(text)) return;

  // Nearby malls → list malls, then browse every store inside one
  if (/\bmalls?\b/i.test(text)){
    addUser(text);
    logEvent('query', { text: text, intent: 'malls', source: opts.source || 'typed' });
    showTyping();
    setTimeout(() => { hideTyping(); showMalls(); }, 480);
    return;
  }

  // Brand deals category → show brand deals as cards
  if (/\bbrand deals?\b/i.test(text)){
    addUser(text);
    logEvent('query', { text: text, intent: 'brand-deals', source: opts.source || 'typed' });
    showTyping();
    setTimeout(() => {
      hideTyping();
      const list = window.BrandDeals ? BrandDeals.getDeals() : [];
      if (!list.length){
        addBot(`No brand deals live near ${esc(session.area || 'you')} right now. I can watch for them and tell you the moment one lands.`);
        return;
      }
      const confirmed = list.filter(d => d.state === 'confirmed').length;
      addBot(`${list.length} brand deal${list.length === 1 ? '' : 's'} near <strong>${esc(session.area || 'you')}</strong>. ${confirmed} confirmed by the store and bookable, the rest are reported but not confirmed yet.`);
      addCards(`<div class="brd-grid">${BrandDeals.cardsHTML({ states: ['confirmed','spotted'] })}</div>`);
    }, 520);
    return;
  }

  // AI Negotiate intent → hand off to the negotiation flow
  if (/\bnegotiat|better price|two.?for.?one|bargain\b/i.test(text)){
    addUser(text);
    logEvent('query', { text: text, intent: 'negotiate', source: opts.source || 'typed' });
    return negotiateEntry(null, null, text);
  }

  addUser(text);
  const slots = parseIntent(text);
  logEvent('query', { text: text, slots: slots, source: opts.source || 'typed' });

  const merged = Object.assign({}, session.filters, slots, { area: session.area });
  session.filters = Object.assign({}, session.filters, slots);

  const ack = ackLine(slots);
  showTyping();
  setTimeout(() => { hideTyping(); if (ack) addBot(ack); runQuery(text, merged, opts); }, 520 + Math.random()*330);
}

function ackLine(slots){
  const bits = [];
  if (slots.bogo) bits.push('buy-1-get-1');
  if (slots.buffet) bits.push('buffet');
  if (slots.category) bits.push(slots.category.toLowerCase());
  if (slots.budget) bits.push('under ₹'+slots.budget);
  if (slots.maxKm) bits.push('within '+slots.maxKm+'km');
  if (slots.type) bits.push(TYPE_META[slots.type].label.toLowerCase());
  if (!bits.length) return '';
  return `Looking for <strong>${bits.join(' · ')}</strong>…`;
}

const PAGE_SIZE = 25;   // "Show all" paginates in pages of 25

function runQuery(text, filters, opts){
  opts = opts || {};
  const results = rank(fetchDeals(filters));
  if (!results.length){ session.lastResults = []; return emptyState(text, filters); }

  const shown = results.slice(0, 5);
  session.lastResults = shown;
  logEvent('results', { count: results.length, shown: shown.map(d=>d.id) });

  let head = `Found <strong>${results.length}</strong> match${results.length>1?'es':''}${session.area?` near ${esc(session.area)}`:''}.`;
  if (results.length > shown.length) head += ` Showing the top ${shown.length}.`;
  addBot(head);
  addCards(dealGrid(shown));
  if (results.length > shown.length){
    window._geno_all = results;
    addCards(`<button class="chip" onclick="showAllPaged()">Show all ${results.length} deals →</button>`);
  }
  startCountdowns();
}

// "Show all" opens a single paginated block (25 per page). Changing page re-renders that
// same block in place, so it grows/shrinks and the elastic panel expands/contracts with it.
function showAllPaged(){
  const all = window._geno_all;
  if (!all || !all.length) return;
  session.lastResults = all;    // ordinals ("book the second one") now resolve against the full set
  logEvent('paginate', { open: true, total: all.length, pageSize: PAGE_SIZE });
  const holder = document.createElement('div'); holder.className = 'msg'; holder.style.marginLeft = '36px';
  chat.appendChild(holder);
  window._geno_pagerEl = holder;
  window._geno_page = 0;
  interacted = true;
  renderPager();
  scrollChat();
}

function renderPager(){
  const el = window._geno_pagerEl, all = window._geno_all || [];
  if (!el) return;
  const total = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const page = Math.min(Math.max(0, window._geno_page || 0), total - 1);
  window._geno_page = page;
  const slice = all.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const bar = total > 1
    ? `<div class="pager-bar">
        <button class="pager-btn" ${page === 0 ? 'disabled' : ''} onclick="goPage(-1)">← Prev</button>
        <span class="pager-info">Page ${page + 1} of ${total} · showing ${slice.length} of ${all.length}</span>
        <button class="pager-btn" ${page === total - 1 ? 'disabled' : ''} onclick="goPage(1)">Next →</button>
      </div>`
    : `<div class="pager-info" style="text-align:center;padding-top:8px">All ${all.length} deals</div>`;
  el.innerHTML = dealGrid(slice) + bar;
  startCountdowns();
}

function goPage(delta){
  const all = window._geno_all || [];
  const total = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const next = Math.min(Math.max(0, (window._geno_page || 0) + delta), total - 1);
  if (next === window._geno_page) return;
  window._geno_page = next;
  logEvent('paginate', { page: next + 1 });
  renderPager();
  if (window._geno_pagerEl) window._geno_pagerEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ============================================================ NOTHING TO SHOW: negotiate → widen → notify ============================================================ */
function emptyState(text, filters){
  logEvent('zero-result', { text: text, filters: filters });   // highest-value stream: unmet demand

  const negFilter = Object.assign({}, filters); delete negFilter.bogo; delete negFilter.type;
  const candidates = fetchDeals(negFilter);
  const wantBogo = !!filters.bogo;

  const widerFilter = Object.assign({}, filters); const hadKm = widerFilter.maxKm; delete widerFilter.maxKm;
  const widened = rank(fetchDeals(widerFilter)).filter(d => !hadKm || d.km > hadKm);

  const subject = describeQuery(filters);
  let body = `Nothing live right now for <strong>${esc(subject)}</strong>.`;
  let actions = '';

  if (candidates.length){
    const near = candidates.filter(d => !filters.maxKm || d.km <= filters.maxKm);
    const pool = near.length ? near : candidates;
    const n = pool.length;
    const noun = filters.buffet ? 'buffet'+(n>1?'s':'') : (filters.category ? filters.category.toLowerCase()+(n>1?'s':'') : 'spot'+(n>1?'s':''));
    const ask = wantBogo ? 'do a two-for-one' : 'make you a better price';
    body += ` But there ${n>1?'are':'is'} <strong>${n} ${noun}</strong> ${filters.maxKm?`within ${filters.maxKm}km`:'nearby'}.`;
    actions += `<button class="empty-btn primary" onclick="startNegotiate('${pool[0].id}', ${JSON.stringify(ask)})"><span class="eb-ic">🤝</span> Ask ${n>1?'them':esc(pool[0].merchant)} to ${ask}</button>`;
  }
  if (widened.length){
    const w = widened[0];
    window._geno_widen = { filters: widerFilter };
    actions += `<button class="empty-btn" onclick="widenNow()"><span class="eb-ic">📍</span> Nothing within ${hadKm||2}km, but there's one at ${w.km}km (${esc(w.merchant)})</button>`;
  }
  actions += `<button class="empty-btn" onclick="startNotify(${JSON.stringify(subject)})"><span class="eb-ic">🔔</span> Watch for it and message me when one appears</button>`;

  addBot(body);
  addCards(`<div class="empty-card"><div class="empty-actions">${actions}</div></div>`);
}
function describeQuery(f){
  const bits = [];
  if (f.bogo) bits.push('buy-1-get-1');
  if (f.buffet) bits.push('buffet');
  if (f.category) bits.push(f.category.toLowerCase());
  if (f.budget) bits.push('under ₹'+f.budget);
  if (f.maxKm) bits.push('within '+f.maxKm+'km');
  return bits.join(' ') || 'that';
}
function widenNow(){
  const w = window._geno_widen; if (!w) return;
  addUser('Show the wider ones');
  delete session.filters.maxKm;
  runQuery('Wider search', Object.assign({}, w.filters, { area: session.area }), { refine: true });
}

/* ============================================================ AI NEGOTIATE
   Flow adapted from demo/negotiate.html: pick a target, watch a live
   DealBot <-> merchant transcript. Language stays provisional; a firm
   price + expiry only appears AFTER the merchant agrees. ============================================================ */

// Entry from empty-state ("Ask them to ...") — keep the old signature working.
function startNegotiate(id, ask){ negotiateEntry(id, ask); }

function negotiateEntry(dealId, ask, rawText){
  let deal = dealId ? _DB.find(d => d.id === dealId) : null;
  if (!deal){                                  // no specific deal → pick the best nearby one
    const near = rank(fetchDeals({ area: session.area, maxKm: 2 }));
    deal = near[0] || _DB[0];
  }
  logEvent('negotiate', { stage: 'entry', id: deal.id, ask: ask || null });
  showTyping();
  setTimeout(() => {
    hideTyping();
    const price = deal.real ? `₹${deal.real.toLocaleString('en-IN')}` : 'their listed rate';
    addBot(`I can negotiate at <strong>${esc(deal.merchant)}</strong> (${esc(deal.offer)}, currently ${price}). How hard should I push? I'll keep it provisional until they agree.`);
    addCards(`<div class="neg-target">
      <button class="chip" onclick="chooseTarget('${deal.id}',0.9,'Push gently — aim ~10% off')">Gentle · ~10% off</button>
      <button class="chip" onclick="chooseTarget('${deal.id}',0.8,'Push for a good deal — aim ~20% off')">Balanced · ~20% off</button>
      <button class="chip" onclick="chooseTarget('${deal.id}',0.7,'Push hard — aim ~30% off')">Aggressive · ~30% off</button>
    </div>`);
  }, 500);
}

function chooseTarget(id, mult, label){
  const deal = _DB.find(x => x.id === id); if (!deal) return;
  addUser(label);
  runNegotiation(deal, mult);
}

function runNegotiation(deal, mult){
  const base = deal.real || 1000;
  const target = Math.max(1, Math.round(base * mult));
  const saved = base - target;
  const mer = deal.merchant, svc = deal.offer;
  logEvent('negotiate', { stage: 'offered', id: deal.id, target: target, mult: mult });

  const panel = document.createElement('div'); panel.className = 'msg'; panel.style.marginLeft = '36px';
  panel.innerHTML = `<div class="neg-panel">
    <div class="neg-head"><span class="neg-live"><span class="dot"></span> Live</span> AI Negotiate <span class="neg-head-name">${esc(mer)}</span></div>
    <div class="neg-log"></div>
  </div>`;
  chat.appendChild(panel);
  const logEl = panel.querySelector('.neg-log'), headEl = panel.querySelector('.neg-head');
  interacted = true; isBusy = true; scrollChat();

  // provisional throughout; merchant only agrees at the second-to-last beat
  const script = [
    { d: 400,   from: 'sys', text: `Geno reached ${mer} on WhatsApp` },
    { d: 1500,  from: 'bot', text: `Hi! Geno here 👋 A verified customer wants "${svc}" and is ready to book right now. Any chance of a better rate?` },
    { d: 3200,  from: 'mer', text: `Hello! Our current price is ₹${base.toLocaleString('en-IN')}.` },
    { d: 4700,  from: 'bot', text: `Thanks! They're flexible on timing and will confirm immediately. Could you do ₹${target.toLocaleString('en-IN')}?` },
    { d: 6400,  from: 'mer', text: `Let me check with the manager for a moment…` },
    { d: 8600,  from: 'mer', text: `Okay — we can do ₹${target.toLocaleString('en-IN')} if the slot is confirmed within 2 hours. 🙏` },
    { d: 9900,  from: 'bot', text: `Perfect, locking it in for the customer now. Thank you!` },
    { d: 11000, from: 'sys', text: `Deal agreed · ₹${saved.toLocaleString('en-IN')} off` },
  ];
  const stages = { 0: 'merchant-contacted', 2: 'merchant-responded', 5: 'price-agreed' };

  script.forEach((m, idx) => {
    const typeAt = m.d - 850;
    if (m.from !== 'sys' && idx > 0 && typeAt > 0){
      setTimeout(() => {
        const t = document.createElement('div'); t.className = 'neg-row ' + m.from; t.dataset.typ = idx;
        t.innerHTML = `<div class="neg-av ${m.from}">${m.from === 'bot' ? '🤖' : '🏪'}</div><div class="neg-typing"><span></span><span></span><span></span></div>`;
        logEl.appendChild(t); scrollChat();
      }, typeAt);
    }
    setTimeout(() => {
      const typ = logEl.querySelector('[data-typ="' + idx + '"]'); if (typ) typ.remove();
      const el = document.createElement('div');
      if (m.from === 'sys'){ el.className = 'neg-sys'; el.textContent = m.text; }
      else {
        el.className = 'neg-row ' + m.from;
        const lbl = m.from === 'bot' ? 'Geno' : mer;
        el.innerHTML = `<div class="neg-av ${m.from}">${m.from === 'bot' ? '🤖' : '🏪'}</div><div><div class="neg-lbl">${esc(lbl)}</div><div class="neg-bubble">${esc(m.text)}</div></div>`;
      }
      logEl.appendChild(el); scrollChat();
      if (stages[idx]) logEvent('negotiate', { stage: stages[idx], id: deal.id });

      if (idx === script.length - 1){
        headEl.classList.add('done');
        headEl.querySelector('.neg-live').innerHTML = '<span class="dot"></span> Agreed';
        const pct = Math.round((saved / base) * 100);
        const res = document.createElement('div'); res.className = 'msg'; res.style.marginLeft = '36px';
        res.innerHTML = `<div class="neg-result">
          <div class="neg-result-title">🤝 Confirmed by ${esc(mer)} — firm price</div>
          <div class="neg-prices"><span class="neg-new">₹${target.toLocaleString('en-IN')}</span><span class="neg-was">₹${base.toLocaleString('en-IN')}</span><span class="neg-pct">${pct}% off</span></div>
          <div class="neg-expiry" data-exp="${Date.now() + 2*3600*1000}">Held for 2:00:00 · pay at store · no prepayment</div>
          <button class="neg-accept" onclick="bookNegotiated('${deal.id}', ${target})">Accept &amp; book · Pay ₹${target.toLocaleString('en-IN')} at store</button>
        </div>`;
        chat.appendChild(res); scrollChat();
        startNegCountdown();
        isBusy = false;
      }
    }, m.d);
  });
}

let _negTimer = null;
function startNegCountdown(){
  if (_negTimer) return;
  _negTimer = setInterval(() => {
    const els = document.querySelectorAll('.neg-expiry[data-exp]');
    if (!els.length){ clearInterval(_negTimer); _negTimer = null; return; }
    els.forEach(el => {
      let left = Math.max(0, Math.floor((+el.dataset.exp - Date.now())/1000));
      const h = Math.floor(left/3600), m = Math.floor((left%3600)/60), s = left%60;
      el.textContent = `Held for ${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} · pay at store · no prepayment`;
    });
  }, 1000);
}

/* ============================================================ NOTIFY ============================================================ */
function startNotify(subject){
  addUser(`Notify me about ${subject}`);
  logEvent('notify', { subject: subject, area: session.area });
  showTyping();
  setTimeout(() => { hideTyping(); addBot(`Done. I'll watch for <strong>${esc(subject)}</strong> near ${esc(session.area||'you')} and message you the moment one goes live. Want to keep browsing meanwhile?`); }, 600);
}

/* ============================================================ BOOK (no payment; pay at store) ============================================================ */
function bookDeal(id){
  const d = _DB.find(x => x.id === id); if (!d) return;
  logEvent('book', { id: id, price: d.real });
  recordBooking({ dealId: id, merchant: d.merchant, offer: d.offer, window: d.window, price: d.real, kind: 'booked' });
  saveReturning({ name: 'Balaji', merchant: d.merchant, savedYear: 18400 });
  showTyping();
  setTimeout(() => {
    hideTyping();
    addBot('Booked! Here\'s your confirmation:',
      `<div class="confirm-card"><div class="confirm-icon">✅</div><div class="confirm-title">Booked</div>
       <div style="font-size:13px;font-weight:700;margin-top:5px">${esc(d.merchant)}</div>
       <div class="confirm-sub">${esc(d.offer)} · ${esc(d.window)}</div>
       <div class="confirm-pay">Pay ${d.real===0?'nothing':'₹'+d.real.toLocaleString('en-IN')} at store</div></div>`);
    addBot('Anything else? Try "cheaper", "what about tomorrow", or a new search.');
  }, 700);
}
function bookNegotiated(id, price){
  const d = _DB.find(x => x.id === id); if (!d) return;
  const code = 'GN' + Math.random().toString(36).substring(2, 8).toUpperCase();
  logEvent('negotiate', { stage: 'booked', id: id, price: price, code: code });
  recordBooking({ dealId: id, merchant: d.merchant, offer: d.offer, window: d.window, price: price, code: code, kind: 'negotiated' });
  saveReturning({ name: 'Balaji', merchant: d.merchant, savedYear: 18400 });
  showTyping();
  setTimeout(() => { hideTyping(); addBot('Booked at the negotiated price 🎉',
    `<div class="confirm-card"><div class="confirm-icon">✅</div><div class="confirm-title">Booked</div>
     <div style="font-size:13px;font-weight:700;margin-top:5px">${esc(d.merchant)}</div>
     <div class="confirm-sub">${esc(d.offer)} · negotiated</div>
     <div class="confirm-code">${code}</div>
     <div class="confirm-pay">Show code · Pay ₹${price.toLocaleString('en-IN')} at store</div></div>`); }, 700);
}

function voteDeal(btn, id){ btn.classList.toggle('voted'); btn.textContent = btn.classList.contains('voted') ? '🔥✓' : '🔥'; logEvent('vote', { id: id, on: btn.classList.contains('voted') }); }
function shareDeal(id){
  const url = location.origin + location.pathname + '?deal=' + id;
  logEvent('share', { id: id });
  if (navigator.share) navigator.share({ title: 'Genoti deal', url: url });
  else { if (navigator.clipboard) navigator.clipboard.writeText(url); alert('Deal link copied.'); }
}

/* ============================================================ DEEP LINK ============================================================ */
function openDeepLink(id){
  const d = _DB.find(x => x.id === id);
  logEvent('entry', { mode: 'deep-link', id: id });
  addBot('Here\'s the deal you opened:', dealGrid([d]));
  session.lastResults = [d];
  startCountdowns();
  addBot('Want similar ones nearby? Tap a category or just ask.');
}

/* ============================================================ LIVE COUNTDOWNS ============================================================ */
let _cdTimer = null;
function startCountdowns(){
  if (_cdTimer) return;
  _cdTimer = setInterval(() => {
    const els = document.querySelectorAll('.dc-countdown[data-exp]');
    if (!els.length) { clearInterval(_cdTimer); _cdTimer = null; return; }
    els.forEach(el => {
      const left = Math.round((+el.dataset.exp - Date.now())/60000);
      el.textContent = left > 0 ? `ends in ${left}m` : 'ending now';
    });
  }, 30000);
}

/* ============================================================ INPUT WIRING ============================================================ */
/* ============================================================ MY BOOKINGS ============================================================ */
function recordBooking(rec){
  if (!window.GenotiBookings) return;
  window.GenotiBookings.add(rec).catch(() => {});
}

function bkCard(b){
  const when  = new Date(b.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const label = b.kind === 'negotiated' ? 'Negotiated' : 'Booked';
  const pay   = b.price === 0 ? 'Pay nothing at store' : 'Pay ₹' + Number(b.price).toLocaleString('en-IN') + ' at store';
  return `<div class="bk-card">
    <div class="bk-top">
      <div class="bk-merchant">${esc(b.merchant)}</div>
      <span class="bk-kind">${label}</span>
    </div>
    ${b.offer  ? `<div class="bk-offer">${esc(b.offer)}</div>` : ''}
    ${b.window ? `<div class="bk-meta">${esc(b.window)}</div>` : ''}
    <div class="bk-meta">Booked ${esc(when)}</div>
    ${b.code ? `<div class="bk-code">${esc(b.code)}</div>` : ''}
    <div class="bk-pay">${pay}</div>
    <button class="bk-cancel" onclick="cancelBooking('${esc(b.id)}')">Cancel booking</button>
  </div>`;
}

async function showMyBookings(){
  if (!window.GenotiBookings){ addBot('Bookings are not available right now.'); return; }
  const list = await window.GenotiBookings.list();

  if (!list.length){
    addBot(`You have no bookings yet. Everything you book stays here, so you can pull up the details at the counter.`,
      `<div class="chips"><button class="chip" onclick="handleQuick('Deals near me')">📍 Find deals near me</button>
       <button class="chip" onclick="handleQuick('Off-peak deals')">⏰ Off-peak deals</button></div>`);
    return;
  }

  const noun = list.length === 1 ? 'booking' : 'bookings';
  addBot(`You have <strong>${list.length}</strong> ${noun}. Show the code at the counter — nothing is prepaid.`,
    `<div class="bk-grid">${list.map(bkCard).join('')}</div>`);
}

async function cancelBooking(id){
  if (!window.GenotiBookings) return;
  await window.GenotiBookings.cancel(id);
  startNewTurn();          // collapse the now-stale list instead of stacking on it
  addBot('Cancelled. Here is what is left:');
  showMyBookings();
}

function handleQuick(text){ send(text, { source: 'chip' }); }
function sendFromInput(){ const i = document.getElementById('userInput'); const v = i.value.trim(); if (!v) return; i.value=''; send(v, { source: 'typed' }); }

/* ---------- Floating "Ask Geno" reminder: this is an AI chatbot; jump to the composer ---------- */
function focusComposer(){
  const el = document.getElementById('userInput');
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => el.focus({ preventScroll: true }), 350);
}
(function watchComposer(){
  const fab = document.getElementById('genoFab');
  const bar = document.querySelector('.input-bar');
  if (!fab || !bar || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(function(entries){
    fab.classList.toggle('show', !entries[0].isIntersecting);
  }, { threshold: 0.35 }).observe(bar);
})();

/* ---------- boot ---------- */
initEntry();

/* Deep link from another page's menu: Geno.html?view=bookings */
if (new URLSearchParams(location.search).get('view') === 'bookings') {
  setTimeout(() => handleQuick('My bookings'), 300);
}

/* ---------- Auth gate ----------
   Browsing and searching deals stays open to everyone. Everything that
   commits the user to something goes through the login modal first, and
   resumes automatically once they are in. */
if (window.GenotiAuth) {
  const G = window.GenotiAuth;
  bookDeal        = G.gate(bookDeal,        { icon: 'book', title: 'Log in to book',       msg: 'Log in so we can hold this deal for you and send your confirmation.' });
  bookNegotiated  = G.gate(bookNegotiated,  { icon: 'book', title: 'Log in to book',       msg: 'Log in so we can hold your negotiated price and send your confirmation.' });
  startNegotiate  = G.gate(startNegotiate,  { icon: 'negotiate', title: 'Log in to negotiate',  msg: 'Negotiating sends a real request to the business, so we need to know who is asking.' });
  startNotify     = G.gate(startNotify,     { icon: 'alert', title: 'Log in to get alerts', msg: 'Log in so we know where to message you when a matching deal goes live.' });
  voteDeal        = G.gate(voteDeal,        { icon: 'vote', title: 'Log in to vote',       msg: 'Votes decide what other people see, so each one has to come from an account.' });

  // Reflect the session in the header.
  G.onChange(user => {
    document.querySelectorAll('a[href="login.html"]').forEach(a => {
      if (!user) { a.style.display = ''; return; }
      if (a.classList.contains('btn-login')) { a.textContent = 'Log out'; a.href = '#'; a.onclick = e => { e.preventDefault(); G.signOut(); location.reload(); }; }
      else { a.style.display = 'none'; }
    });
  });
}

/* ---------- PWA ---------- */
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('service-worker.js').catch(()=>{}));
