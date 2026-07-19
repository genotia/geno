/* ═══════════════════════════════════════════════════════════
   Geno Smart Search: Consumer AI Widget
   Drop <script src="geno-chat.js"></script> into any page.
   Self-injects styles + DOM, no external dependencies.

   Pattern: FAB → welcome bubble (first visit) → search overlay
   (quick actions + recent searches) → results → negotiate flow.
═══════════════════════════════════════════════════════════ */
(function () {
  /* ── 0. ICONS (inline SVG, no icon-font dependency) ─────── */
  const ICON = {
    sparkles:  '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/>',
    chat:      '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    search:    '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    mic:       '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>',
    x:         '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    bolt:      '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    mapPin:    '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    coin:      '<circle cx="12" cy="12" r="9"/><path d="M14.8 9a2 2 0 0 0-1.8-1h-2a2 2 0 1 0 0 4h2a2 2 0 1 1 0 4h-2a2 2 0 0 1-1.8-1"/><line x1="12" y1="6" x2="12" y2="18"/>',
    bell:      '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    clock:     '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    check:     '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    loader:    '<line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>',
    chevron:   '<polyline points="15 18 9 12 15 6"/>',
    bulb:      '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7 3.5 3.5 0 0 1 1.5 2.8h5a3.5 3.5 0 0 1 1.5-2.8A7 7 0 0 0 12 2z"/>',
  };
  function svg(name, size, filled) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[name]}</svg>`;
  }

  /* ── 1. STYLES ────────────────────────────────────────── */
  const css = `
  #gs-fab,#gs-fab *,#gs-overlay,#gs-overlay *,.gs-bubble,.gs-bubble *{box-sizing:border-box}
  #gs-fab{position:fixed;bottom:28px;right:28px;z-index:9000;width:58px;height:58px;border-radius:50%;background:linear-gradient(135deg,#085041 0%,#0d7a5e 100%);display:flex;align-items:center;justify-content:center;cursor:pointer;border:none;box-shadow:0 6px 28px rgba(8,80,65,.5),0 2px 8px rgba(0,0,0,.15);transition:transform .2s,box-shadow .2s}
  #gs-fab:hover{transform:scale(1.06)}
  #gs-fab:active{transform:scale(.94)}
  #gs-fab.gs-hidden{display:none}
  #gs-fab svg{color:#7EDDB8}
  .gs-fab-pulse{position:absolute;inset:-6px;border-radius:50%;border:2px solid #1D9E75;animation:gsPulse 2s ease-out 3;pointer-events:none}
  @keyframes gsPulse{0%{transform:scale(1);opacity:.7}100%{transform:scale(1.3);opacity:0}}

  .gs-bubble{position:fixed;bottom:98px;right:24px;z-index:9001;background:#fff;border:1px solid #E8E6E0;border-radius:16px 16px 4px 16px;padding:13px 15px;width:230px;box-shadow:0 20px 50px rgba(0,0,0,.16);animation:gsBubbleIn .3s ease-out}
  @keyframes gsBubbleIn{from{opacity:0;transform:translateY(8px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
  .gs-bubble-close{position:absolute;top:8px;right:9px;color:#888780;cursor:pointer;display:flex}
  .gs-bubble-head{display:flex;align-items:center;gap:8px;margin-bottom:6px}
  .gs-bubble-av{width:26px;height:26px;border-radius:50%;background:#085041;display:flex;align-items:center;justify-content:center;color:#7EDDB8;flex-shrink:0}
  .gs-bubble-name{font-size:13px;font-weight:700;color:#1A1A18}
  .gs-bubble-text{font-size:12px;color:#5F5E5A;line-height:1.6}
  .gs-bubble-text b{color:#1A1A18}

  #gs-overlay{position:fixed;inset:0;z-index:9002;display:none;}
  #gs-overlay.gs-open{display:block}
  .gs-scrim{position:absolute;inset:0;background:rgba(15,20,18,.4);animation:gsFade .2s ease-out}
  @keyframes gsFade{from{opacity:0}to{opacity:1}}
  .gs-panel{position:absolute;bottom:0;left:0;right:0;margin:0 auto;max-width:420px;max-height:82vh;background:#FAFAF8;border-radius:20px 20px 0 0;box-shadow:0 -8px 40px rgba(0,0,0,.2);display:flex;flex-direction:column;animation:gsSlideUp .3s cubic-bezier(.32,.72,0,1);overflow:hidden}
  @keyframes gsSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
  @media(min-width:480px){.gs-panel{bottom:24px;right:24px;left:auto;border-radius:20px;width:390px;max-height:640px}}

  .gs-head{padding:14px 16px 10px;text-align:center;position:relative;flex-shrink:0;border-bottom:1px solid #E8E6E0;background:#fff}
  .gs-head-close{position:absolute;top:12px;right:12px;width:28px;height:28px;border-radius:50%;background:#F4F3F0;border:none;color:#5F5E5A;cursor:pointer;display:flex;align-items:center;justify-content:center}
  .gs-head-back{position:absolute;top:12px;left:12px;width:28px;height:28px;border-radius:50%;background:#F4F3F0;border:none;color:#5F5E5A;cursor:pointer;display:flex;align-items:center;justify-content:center}
  .gs-head-av{width:42px;height:42px;border-radius:50%;background:#085041;display:flex;align-items:center;justify-content:center;color:#7EDDB8;margin:0 auto 6px}
  .gs-head-title{font-size:15px;font-weight:700;color:#1A1A18}
  .gs-head-sub{font-size:11.5px;color:#888780;margin-top:1px}

  .gs-search-wrap{padding:10px 14px;flex-shrink:0;background:#fff;border-bottom:1px solid #E8E6E0}
  .gs-search-bar{display:flex;align-items:center;gap:8px;background:#F4F3F0;border:1.5px solid #E8E6E0;border-radius:100px;padding:9px 14px;transition:border-color .2s,background .2s}
  .gs-search-bar.gs-focused{border-color:#1D9E75;background:#fff;box-shadow:0 0 0 3px rgba(29,158,117,.1)}
  .gs-search-bar.gs-recording{border-color:#E24B4A;box-shadow:0 0 0 3px rgba(226,75,74,.1)}
  .gs-search-icon{color:#1D9E75;flex-shrink:0;display:flex}
  .gs-search-input{flex:1;border:none;background:none;outline:none;font-size:14px;font-family:inherit;color:#1A1A18;min-width:0}
  .gs-search-input::placeholder{color:#888780}
  .gs-search-mic{color:#888780;cursor:pointer;flex-shrink:0;display:flex;transition:color .2s}
  .gs-search-mic:hover{color:#085041}
  .gs-search-mic.gs-rec{color:#E24B4A}
  .gs-search-clear{color:#888780;cursor:pointer;flex-shrink:0;display:flex}

  .gs-body{flex:1;overflow-y:auto;padding:12px 14px 16px;background:#FAFAF8}
  .gs-body::-webkit-scrollbar{width:4px}.gs-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:4px}

  .gs-qa-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}
  .gs-qa{display:flex;align-items:center;gap:9px;padding:10px 11px;border-radius:12px;border:1px solid #E8E6E0;background:#fff;cursor:pointer;transition:background .15s,border-color .15s}
  .gs-qa:hover{background:#F4F3F0;border-color:#D8D6CE}
  .gs-qa:active{transform:scale(.98)}
  .gs-qa-icon{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .gs-qa-icon.lm{background:#FCEBEB;color:#A32D2D}
  .gs-qa-icon.nm{background:#E1F5EE;color:#085041}
  .gs-qa-icon.ng{background:#FAEEDA;color:#BA7517}
  .gs-qa-icon.al{background:#E6F1FB;color:#378ADD}
  .gs-qa-label{font-size:12.5px;font-weight:600;color:#1A1A18;line-height:1.25}

  .gs-recent-label{font-size:11.5px;color:#888780;margin:2px 0 6px;font-weight:600}
  .gs-recent-item{display:flex;align-items:center;gap:9px;padding:9px 10px;border-radius:9px;cursor:pointer;font-size:13px;color:#5F5E5A;transition:background .15s}
  .gs-recent-item:hover{background:#F4F3F0}
  .gs-recent-item svg{color:#888780;flex-shrink:0}
  .gs-empty{font-size:12px;color:#888780;padding:6px 2px}

  .gs-results-header{display:flex;align-items:center;gap:6px;font-size:12px;color:#888780;margin:0 0 10px}
  .gs-results-header svg{color:#1D9E75}

  .gs-result{background:#fff;border-radius:14px;border:1px solid #E8E6E0;padding:12px 13px;margin-bottom:9px;box-shadow:0 1px 3px rgba(0,0,0,.05)}
  .gs-result-badge{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:700;color:#085041;background:#E1F5EE;padding:3px 8px;border-radius:6px;margin-bottom:6px}
  .gs-result-badge svg{width:11px;height:11px}
  .gs-result-name{font-size:14.5px;font-weight:700;color:#1A1A18}
  .gs-result-loc{font-size:11.5px;color:#888780;margin-top:1px}
  .gs-result-pricing{display:flex;align-items:center;gap:8px;margin:8px 0}
  .gs-result-old{font-size:13px;color:#888780;text-decoration:line-through}
  .gs-result-new{font-size:19px;font-weight:700;color:#1D9E75}
  .gs-result-disc{font-size:11px;font-weight:700;color:#A32D2D;background:#FCEBEB;padding:2px 7px;border-radius:6px}
  .gs-result-meta{display:flex;gap:10px;font-size:11.5px;color:#888780;flex-wrap:wrap}
  .gs-result-btns{display:flex;gap:7px;margin-top:10px}
  .gs-btn{flex:1;padding:9px 10px;border-radius:9px;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit;border:none;transition:opacity .15s;text-align:center}
  .gs-btn.gs-primary{background:#085041;color:#fff}
  .gs-btn.gs-outline{background:transparent;color:#085041;border:1.5px solid #085041}
  .gs-btn:hover{opacity:.85}

  .gs-ai-card{background:#fff;border-radius:14px;border:1px solid #E8E6E0;border-left:3px solid #1D9E75;padding:12px 13px;margin-bottom:9px;box-shadow:0 1px 3px rgba(0,0,0,.05)}
  .gs-ai-card.gs-success{border-left-color:#1D9E75;background:#F0FDF4}
  .gs-ai-card.gs-tip{border-left-color:#D8D6CE}
  .gs-ai-head{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;color:#085041;margin-bottom:6px}
  .gs-ai-head svg{width:15px;height:15px}
  .gs-ai-head.gs-loading svg{animation:gsSpin 1s linear infinite}
  @keyframes gsSpin{to{transform:rotate(360deg)}}
  .gs-ai-body{font-size:12.5px;color:#5F5E5A;line-height:1.6}
  .gs-ai-body b{color:#1A1A18}
  .gs-ai-savings{display:flex;justify-content:space-around;margin-top:9px;padding-top:9px;border-top:1px solid #E8E6E0}
  .gs-ai-sv-item{text-align:center}
  .gs-ai-sv-label{font-size:10px;color:#888780}
  .gs-ai-sv-val{font-size:16px;font-weight:700;color:#1D9E75}
  .gs-ai-btns{display:flex;gap:7px;margin-top:10px}

  .gs-confirm{background:#F0FDF4;border:1px solid #1D9E75;border-radius:12px;padding:12px 13px;font-size:12px;line-height:1.9;color:#085041;margin-top:8px}
  .gs-confirm strong{display:block;font-size:13.5px;margin-bottom:4px}

  @media(max-width:480px){
    #gs-fab{right:16px;bottom:calc(84px + env(safe-area-inset-bottom))}
    .gs-bubble{right:16px;bottom:calc(150px + env(safe-area-inset-bottom))}
  }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ── 2. DOM ───────────────────────────────────────────── */
  const tpl = `
  <button id="gs-fab" aria-label="Ask Geno">${svg('chat', 24)}</button>
  <div class="gs-bubble" id="gs-bubble" style="display:none">
    <div class="gs-bubble-close" id="gs-bubble-close">${svg('x', 14)}</div>
    <div class="gs-bubble-head">
      <div class="gs-bubble-av">${svg('chat', 13)}</div>
      <div class="gs-bubble-name">Geno</div>
    </div>
    <div class="gs-bubble-text">Hey! I can find deals, negotiate prices, and set alerts for you. <b>Tap me or just ask.</b></div>
  </div>
  <div id="gs-overlay">
    <div class="gs-scrim" id="gs-scrim"></div>
    <div class="gs-panel">
      <div class="gs-head">
        <button class="gs-head-back" id="gs-head-back" style="display:none">${svg('chevron', 16)}</button>
        <button class="gs-head-close" id="gs-head-close">${svg('x', 15)}</button>
        <div class="gs-head-av">${svg('chat', 20)}</div>
        <div class="gs-head-title" id="gs-head-title">What can I find for you?</div>
        <div class="gs-head-sub" id="gs-head-sub">Type, speak, or tap a shortcut</div>
      </div>
      <div class="gs-search-wrap" id="gs-search-wrap">
        <div class="gs-search-bar" id="gs-search-bar">
          <span class="gs-search-icon">${svg('search', 17)}</span>
          <input class="gs-search-input" id="gs-input" placeholder="Search deals, services, places…">
          <span class="gs-search-mic" id="gs-mic">${svg('mic', 17)}</span>
          <span class="gs-search-clear" id="gs-clear" style="display:none">${svg('x', 15)}</span>
        </div>
      </div>
      <div class="gs-body" id="gs-body"></div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', tpl);

  /* ── 3. PAGE CONTEXT ─────────────────────────────────── */
  const path = location.pathname.toLowerCase();
  const PAGE = path.includes('community') ? 'community'
             : path.includes('notify')    ? 'negotiate'
             : path.includes('negotiate') ? 'negotiate'
             : path.includes('booking')   ? 'booking'
             : 'deals';
  const CTX = {
    deals:     { sub:'Find off-peak deals near you' },
    community: { sub:'See what the community found today' },
    negotiate: { sub:'I can negotiate a better price for you' },
    booking:   { sub:'Book, rebook, or manage a visit' },
  };
  const ctx = CTX[PAGE];

  /* ── 4. DEAL DATA ─────────────────────────────────────── */
  const DEALS = [
    { name:'Haircut + blow dry', merchant:'Bloom Salon', loc:'Koramangala · 800m away', now:480, was:800, disc:'40% off', time:'Today 3:00 PM', rating:'4.6★', extra:'328 reviews', tags:['salon','haircut','hair','beauty','bloom'], best:true },
    { name:'Hair + wash',        merchant:'StyleHub',    loc:'HSR Layout · 1.4km',       now:420, was:600, disc:'30% off', time:'Tomorrow 11am', rating:'4.3★', tags:['salon','haircut','hair','beauty'] },
    { name:'Haircut',            merchant:'CutAbove',    loc:'Indiranagar · 2.1km',      now:350, was:500, disc:'30% off', time:'Today 4:30 PM', rating:'4.1★', tags:['salon','haircut','hair','beauty'] },
    { name:'Deep tissue massage',      merchant:'Serenity Spa',   loc:'HSR Layout · 1.2 km',    now:699, was:1499, disc:'53% off', time:'Sat 2pm–5pm · 2 slots left', rating:'4.7★', tags:['spa','massage','wellness'] },
    { name:'Couples aromatherapy',     merchant:'Zen Studio',     loc:'Koramangala · 0.4 km',   now:799, was:1800, disc:'56% off', time:'Sat 1pm–4pm · 4 slots left', rating:'4.8★', tags:['spa','massage','wellness'] },
    { name:'Head & shoulder therapy',  merchant:'The Wellness Room', loc:'0.6 km',              now:449, was:899,  disc:'50% off', time:'Sat 11am–2pm · 6 slots left', rating:'4.5★', tags:['spa','massage','wellness'], best:true },
    { name:'Lunch thali combo',   merchant:'Sattvik Kitchen', loc:'Koramangala · 0.3 km', now:299, was:599, disc:'50% off', time:'Weekdays 12pm–3pm', rating:'4.4★', tags:['restaurant','food','lunch','dining'], best:true },
    { name:'Pizza + drink combo', merchant:'The Pizza Lab',   loc:'Indiranagar · 1.8 km', now:399, was:799, disc:'50% off', time:'Daily 3pm–6pm', rating:'4.2★', tags:['restaurant','food','pizza','dining'] },
    { name:'Monthly pass',    merchant:'FitStop',    loc:'Koramangala · 0.5 km', now:999,  was:1499, disc:'Best value', time:'Highest rated nearby', rating:'4.6★', tags:['gym','fitness'], best:true },
    { name:'Monthly pass',    merchant:"Gold's Gym", loc:'1.1 km',                now:1499, was:1499, disc:'Pool + sauna', time:'Includes pool access', rating:'4.3★', tags:['gym','fitness'] },
    { name:'HIIT class',      merchant:'CoreFit Studio', loc:'2.1km',             now:250,  was:500,  disc:'50% off', time:'5:30 PM · 3 spots left', rating:'4.5★', tags:['gym','fitness','hiit'] },
    { name:'Work-from-café pass', merchant:'Third Wave Coffee', loc:'Koramangala · 0.5 km', now:199, was:499, disc:'60% off', time:'Weekdays 10am–2pm', rating:'4.4★', tags:['cafe','coffee','wfc','work'], best:true },
  ];

  const QUICK_QUERIES = {
    lastminute: () => DEALS.filter(d => /left|Today|5:30/.test(d.time)).slice(0,3),
    nearme:     () => [...DEALS].sort((a,b)=>(a.loc.match(/[\d.]+km|m/)?.[0]||'').length - (b.loc.match(/[\d.]+km|m/)?.[0]||'').length).slice(0,3),
  };

  function searchDeals(query) {
    const q = query.toLowerCase();
    let matches = DEALS.filter(d =>
      d.name.toLowerCase().includes(q) || d.merchant.toLowerCase().includes(q) ||
      d.tags.some(t => q.includes(t) || t.includes(q))
    );
    if (!matches.length) matches = DEALS.filter(d => d.best);
    return matches.slice(0, 3);
  }

  /* ── 5. STATE ─────────────────────────────────────────── */
  const body   = document.getElementById('gs-body');
  const input  = document.getElementById('gs-input');
  const bar    = document.getElementById('gs-search-bar');
  const mic    = document.getElementById('gs-mic');
  const clearBtn = document.getElementById('gs-clear');
  const backBtn  = document.getElementById('gs-head-back');
  const title    = document.getElementById('gs-head-title');
  const sub      = document.getElementById('gs-head-sub');
  const searchWrap = document.getElementById('gs-search-wrap');
  let screen = 'home';
  let currentTarget = null;

  const RECENT_KEY = 'genoRecentSearches';
  function getRecent() { try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch(e) { return []; } }
  function saveRecent(q) {
    let r = getRecent().filter(x => x.toLowerCase() !== q.toLowerCase());
    r.unshift(q);
    localStorage.setItem(RECENT_KEY, JSON.stringify(r.slice(0,5)));
  }

  /* ── 6. FAB + BUBBLE (first-visit behavior) ──────────── */
  const fab = document.getElementById('gs-fab');
  const bubble = document.getElementById('gs-bubble');

  if (!localStorage.getItem('genoFabPulsed')) {
    const ring = document.createElement('div');
    ring.className = 'gs-fab-pulse';
    fab.appendChild(ring);
    localStorage.setItem('genoFabPulsed', '1');
    setTimeout(() => ring.remove(), 6200);
  }

  if (!localStorage.getItem('genoWelcomeSeen')) {
    localStorage.setItem('genoWelcomeSeen', '1');
    setTimeout(() => {
      bubble.style.display = 'block';
      const t = setTimeout(() => bubble.style.display = 'none', 8000);
      bubble.dataset.timer = t;
    }, 1200);
  }
  document.getElementById('gs-bubble-close').onclick = (e) => { e.stopPropagation(); dismissBubble(); };
  function dismissBubble() {
    clearTimeout(Number(bubble.dataset.timer));
    bubble.style.display = 'none';
  }

  /* ── 7. OPEN / CLOSE ──────────────────────────────────── */
  const overlay = document.getElementById('gs-overlay');
  // Tapping the assistant (FAB or welcome bubble) opens the full Geno AI page,
  // where the conversational chatbot lives.
  function goToGeno() { window.location.href = 'Geno.html'; }
  fab.addEventListener('click', goToGeno);
  bubble.addEventListener('click', goToGeno);
  document.getElementById('gs-scrim').addEventListener('click', closePanel);
  document.getElementById('gs-head-close').addEventListener('click', closePanel);
  backBtn.addEventListener('click', showHome);

  function openPanel() {
    dismissBubble();
    fab.classList.add('gs-hidden');
    overlay.classList.add('gs-open');
    showHome();
    setTimeout(() => input.focus(), 150);
  }
  function closePanel() {
    overlay.classList.remove('gs-open');
    fab.classList.remove('gs-hidden');
  }

  /* ── 8. SCREENS ───────────────────────────────────────── */
  function showHome() {
    screen = 'home';
    backBtn.style.display = 'none';
    searchWrap.style.display = 'block';
    title.textContent = 'What can I find for you?';
    sub.textContent = ctx.sub;
    input.value = '';
    clearBtn.style.display = 'none';
    renderHome();
  }

  function renderHome() {
    const recent = getRecent();
    body.innerHTML = `
      <div class="gs-qa-grid">
        <div class="gs-qa" id="gs-qa-lm"><div class="gs-qa-icon lm">${svg('bolt',15,true)}</div><div class="gs-qa-label">Last minute deals</div></div>
        <div class="gs-qa" id="gs-qa-nm"><div class="gs-qa-icon nm">${svg('mapPin',15)}</div><div class="gs-qa-label">Deals near me</div></div>
        <div class="gs-qa" id="gs-qa-ng"><div class="gs-qa-icon ng">${svg('coin',15)}</div><div class="gs-qa-label">Negotiate a price</div></div>
        <div class="gs-qa" id="gs-qa-al"><div class="gs-qa-icon al">${svg('bell',15)}</div><div class="gs-qa-label">Set a deal alert</div></div>
      </div>
      <div class="gs-recent-label">Recent searches</div>
      <div id="gs-recent-list">
        ${recent.length ? recent.map(q => `<div class="gs-recent-item" data-q="${escapeAttr(q)}">${svg('clock',15)} ${escapeHtml(q)}</div>`).join('')
                        : '<div class="gs-empty">Your recent searches will appear here</div>'}
      </div>`;
    document.getElementById('gs-qa-lm').onclick = () => showResults(null, 'Last minute deals', QUICK_QUERIES.lastminute());
    document.getElementById('gs-qa-nm').onclick = () => showResults(null, 'Deals near me', QUICK_QUERIES.nearme());
    document.getElementById('gs-qa-ng').onclick = () => showNegotiate(DEALS[0]);
    document.getElementById('gs-qa-al').onclick = () => showAlertSet();
    body.querySelectorAll('.gs-recent-item').forEach(elm => {
      elm.onclick = () => runSearch(elm.dataset.q);
    });
  }

  function runSearch(q) {
    if (!q.trim()) return;
    saveRecent(q);
    input.value = q;
    showResults(q, null, searchDeals(q));
  }

  function showResults(query, label, results) {
    screen = 'results';
    backBtn.style.display = 'flex';
    searchWrap.style.display = 'block';
    title.textContent = label || 'Search results';
    sub.textContent = query ? `Results for "${query}"` : 'Geno picked these for you';
    clearBtn.style.display = query ? 'flex' : 'none';

    const top = results[0];
    body.innerHTML = `
      <div class="gs-results-header">${svg('sparkles',14,true)} Geno found ${results.length} match${results.length===1?'':'es'} near you</div>
      ${results.map((r,i) => resultCardHtml(r, i===0)).join('')}
      ${top ? `<div class="gs-ai-card">
        <div class="gs-ai-head">${svg('sparkles',15,true)} Want a better price?</div>
        <div class="gs-ai-body">I can negotiate with <b>${top.merchant}</b> for an extra <b>5–15% off</b> the ₹${top.now} ${top.name.toLowerCase()}. They've accepted lower prices before.</div>
        <div class="gs-ai-btns">
          <button class="gs-btn gs-primary" id="gs-neg-top">Negotiate for me</button>
          <button class="gs-btn gs-outline" id="gs-neg-no">No thanks</button>
        </div>
      </div>` : ''}
    `;
    wireResultButtons(results);
    if (top) {
      document.getElementById('gs-neg-top').onclick = () => showNegotiate(top);
      document.getElementById('gs-neg-no').onclick = (e) => e.target.closest('.gs-ai-card').remove();
    }
  }

  function resultCardHtml(r, isBest) {
    return `<div class="gs-result">
      ${isBest ? `<div class="gs-result-badge">${svg('sparkles',11,true)} Best match</div>` : ''}
      <div class="gs-result-name">${r.merchant}: ${r.name}</div>
      <div class="gs-result-loc">${r.loc}</div>
      <div class="gs-result-pricing"><span class="gs-result-old">₹${r.was}</span><span class="gs-result-new">₹${r.now}</span><span class="gs-result-disc">${r.disc}</span></div>
      <div class="gs-result-meta"><span>${r.time}</span>${r.rating?`<span>${r.rating}</span>`:''}${r.extra?`<span>${r.extra}</span>`:''}</div>
      <div class="gs-result-btns">
        <button class="gs-btn gs-primary gs-book-btn" data-name="${escapeAttr(r.merchant)}" data-svc="${escapeAttr(r.name)}" data-price="${r.now}" data-time="${escapeAttr(r.time)}">Book now at ₹${r.now}</button>
        <button class="gs-btn gs-outline gs-neg-btn" data-idx="${DEALS.indexOf(r)}">Negotiate</button>
      </div>
    </div>`;
  }

  function wireResultButtons(results) {
    body.querySelectorAll('.gs-book-btn').forEach(btn => {
      btn.onclick = () => showBooked({ merchant: btn.dataset.name, name: btn.dataset.svc, now: btn.dataset.price, time: btn.dataset.time });
    });
    body.querySelectorAll('.gs-neg-btn').forEach(btn => {
      btn.onclick = () => showNegotiate(DEALS[Number(btn.dataset.idx)] || results[0]);
    });
  }

  function showBooked(item) {
    const c = document.createElement('div');
    c.className = 'gs-confirm';
    c.innerHTML = `<strong>${svg('check',14,true)} Booking confirmed!</strong>
      📍 ${item.merchant}<br>
      📅 ${item.time}<br>
      💰 ₹${item.now}, pay at counter<br>
      WhatsApp confirmation sent.`;
    body.appendChild(c);
    body.scrollTop = body.scrollHeight;
  }

  function showAlertSet() {
    screen = 'results';
    backBtn.style.display = 'flex';
    searchWrap.style.display = 'none';
    title.textContent = 'Deal alert';
    sub.textContent = 'I\'ll watch for you 24/7';
    body.innerHTML = `<div class="gs-ai-card gs-success">
      <div class="gs-ai-head">${svg('bell',15,true)} Alert set!</div>
      <div class="gs-ai-body">I'll notify you on <b>WhatsApp</b> the moment a great deal drops near you. You can manage alerts anytime from your profile.</div>
    </div>`;
  }

  function showNegotiate(item) {
    screen = 'negotiate';
    backBtn.style.display = 'flex';
    searchWrap.style.display = 'none';
    title.textContent = 'Negotiating for you';
    sub.textContent = item.merchant;

    const target = Math.round(item.now * 0.9 / 10) * 10;
    const counter = Math.round(item.now * 0.94 / 10) * 10;
    const finalPrice = target;
    const extraSavings = counter - finalPrice;
    const totalSavings = item.was - finalPrice;
    currentTarget = { item, finalPrice, extraSavings, totalSavings };

    body.innerHTML = `<div class="gs-ai-card">
      <div class="gs-ai-head gs-loading">${svg('loader',15)} Negotiating with ${item.merchant}</div>
      <div class="gs-ai-body">Checking their availability and pricing history. They had open slots this week and accepted a similar discount recently. Working on a better rate…</div>
    </div>`;

    setTimeout(() => {
      body.innerHTML = `<div class="gs-ai-card gs-success">
        <div class="gs-ai-head" style="color:#1D9E75">${svg('check',15,true)} Deal secured</div>
        <div class="gs-ai-body">${item.merchant} accepted <b>₹${finalPrice}</b> for ${item.name.toLowerCase()} (${Math.round((item.was-finalPrice)/item.was*100)}% off original ₹${item.was}). Valid <b>${item.time}</b>.</div>
        <div class="gs-ai-savings">
          <div class="gs-ai-sv-item"><div class="gs-ai-sv-label">Extra savings vs deal</div><div class="gs-ai-sv-val">₹${extraSavings}</div></div>
          <div class="gs-ai-sv-item"><div class="gs-ai-sv-label">Total savings vs original</div><div class="gs-ai-sv-val">₹${totalSavings}</div></div>
        </div>
        <div class="gs-ai-btns">
          <button class="gs-btn gs-primary" id="gs-neg-book">Book at ₹${finalPrice}</button>
          <button class="gs-btn gs-outline" id="gs-neg-lower">Try for lower</button>
        </div>
      </div>
      <div class="gs-ai-card gs-tip">
        <div class="gs-ai-head" style="color:#5F5E5A">${svg('bell',14)} Tip</div>
        <div class="gs-ai-body">Set up a <b>deal alert</b> for ${item.tags[0]} deals under ₹${finalPrice} near you. I'll notify you on WhatsApp the moment one drops.</div>
        <div class="gs-ai-btns"><button class="gs-btn gs-primary" id="gs-neg-alert">${svg('bell',13)} Set alert</button></div>
      </div>
      <div class="gs-ai-card gs-tip">
        <div class="gs-ai-head" style="color:#5F5E5A">${svg('bulb',14)} How Geno negotiates</div>
        <div class="gs-ai-body">Geno checks the merchant's current occupancy, historical pricing, and cancellation patterns. Merchants accept AI-negotiated prices because filling an empty slot at a lower margin beats leaving it empty. <b>You never pay more than the listed deal price.</b></div>
      </div>`;
      document.getElementById('gs-neg-book').onclick = () => showBooked({ merchant:item.merchant, name:item.name, now:finalPrice, time:item.time });
      document.getElementById('gs-neg-lower').onclick = (e) => {
        const btn = e.target; btn.disabled = true; btn.textContent = 'Asking…';
        setTimeout(() => {
          const note = document.createElement('div');
          note.className = 'gs-empty';
          note.style.marginTop = '2px';
          note.textContent = `${item.merchant} holds firm at ₹${finalPrice}. That's already their best rate today.`;
          btn.closest('.gs-ai-card').appendChild(note);
          btn.remove();
        }, 900);
      };
      document.getElementById('gs-neg-alert').onclick = (e) => {
        e.target.textContent = '🔔 Alert set!'; e.target.disabled = true;
      };
    }, 1500);
  }

  /* ── 9. SEARCH BAR EVENTS ─────────────────────────────── */
  input.addEventListener('focus', () => bar.classList.add('gs-focused'));
  input.addEventListener('blur',  () => bar.classList.remove('gs-focused'));
  input.addEventListener('input', () => { clearBtn.style.display = input.value ? 'flex' : 'none'; });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') runSearch(input.value); });
  clearBtn.addEventListener('click', () => { input.value=''; clearBtn.style.display='none'; showHome(); });

  const VOICE_SAMPLES = ['salon deals under 500 near me','spa massage this weekend','gym trial pass today','best restaurant offers nearby'];
  mic.addEventListener('click', () => {
    if (bar.classList.contains('gs-recording')) return;
    bar.classList.add('gs-recording'); mic.classList.add('gs-rec');
    input.placeholder = 'Listening…';
    setTimeout(() => {
      bar.classList.remove('gs-recording'); mic.classList.remove('gs-rec');
      input.placeholder = 'Search deals, services, places…';
      const sample = VOICE_SAMPLES[Math.floor(Math.random()*VOICE_SAMPLES.length)];
      input.value = sample;
      runSearch(sample);
    }, 1600);
  });

  /* ── 10. HELPERS ──────────────────────────────────────── */
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function escapeAttr(s) { return escapeHtml(s).replace(/"/g,'&quot;'); }
})();
