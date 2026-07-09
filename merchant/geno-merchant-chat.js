/* ═══════════════════════════════════════════════════════════
   Geno Smart Assistant — Merchant AI Widget
   Drop <script src="geno-merchant-chat.js"></script> into any
   merchant page. Self-injects styles + DOM, no dependencies.

   Same shell as the consumer widget (FAB → welcome bubble →
   overlay with quick actions) adapted for business use: quick
   actions open detail screens with briefing/negotiation/deal
   cards instead of deal search results.
═══════════════════════════════════════════════════════════ */
(function () {
  /* ── 0. ICONS ─────────────────────────────────────────── */
  const ICON = {
    sparkles: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/>',
    x:        '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    chevron:  '<polyline points="15 18 9 12 15 6"/>',
    send:     '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    loader:   '<line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>',
    check:    '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    chart:    '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    coin:     '<circle cx="12" cy="12" r="9"/><path d="M14.8 9a2 2 0 0 0-1.8-1h-2a2 2 0 1 0 0 4h2a2 2 0 1 1 0 4h-2a2 2 0 0 1-1.8-1"/><line x1="12" y1="6" x2="12" y2="18"/>',
    users:    '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    bolt:     '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  };
  function svg(name, size, filled) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[name]}</svg>`;
  }

  /* ── 1. STYLES ────────────────────────────────────────── */
  const css = `
  #gsb-fab,#gsb-fab *,#gsb-overlay,#gsb-overlay *,.gsb-bubble,.gsb-bubble *{box-sizing:border-box}
  #gsb-fab{position:fixed;bottom:28px;right:28px;z-index:9000;width:58px;height:58px;border-radius:50%;background:linear-gradient(135deg,#085041 0%,#0d7a5e 100%);display:flex;align-items:center;justify-content:center;cursor:pointer;border:none;box-shadow:0 6px 28px rgba(8,80,65,.5),0 2px 8px rgba(0,0,0,.15);transition:transform .2s}
  #gsb-fab:hover{transform:scale(1.06)}
  #gsb-fab:active{transform:scale(.94)}
  #gsb-fab.gsb-hidden{display:none}
  #gsb-fab svg{color:#7EDDB8}
  .gsb-fab-pulse{position:absolute;inset:-6px;border-radius:50%;border:2px solid #1D9E75;animation:gsbPulse 2s ease-out 3;pointer-events:none}
  @keyframes gsbPulse{0%{transform:scale(1);opacity:.7}100%{transform:scale(1.3);opacity:0}}

  .gsb-bubble{position:fixed;bottom:98px;right:24px;z-index:9001;background:#fff;border:1px solid #E8E6E0;border-radius:16px 16px 4px 16px;padding:13px 15px;width:236px;box-shadow:0 20px 50px rgba(0,0,0,.16);animation:gsbBubbleIn .3s ease-out}
  @keyframes gsbBubbleIn{from{opacity:0;transform:translateY(8px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
  .gsb-bubble-close{position:absolute;top:8px;right:9px;color:#888780;cursor:pointer;display:flex}
  .gsb-bubble-head{display:flex;align-items:center;gap:8px;margin-bottom:6px}
  .gsb-bubble-av{width:26px;height:26px;border-radius:50%;background:#085041;display:flex;align-items:center;justify-content:center;color:#7EDDB8;flex-shrink:0}
  .gsb-bubble-name{font-size:13px;font-weight:700;color:#1A1A18}
  .gsb-bubble-text{font-size:12px;color:#5F5E5A;line-height:1.6}
  .gsb-bubble-text b{color:#1A1A18}

  #gsb-overlay{position:fixed;inset:0;z-index:9002;display:none}
  #gsb-overlay.gsb-open{display:block}
  .gsb-scrim{position:absolute;inset:0;background:rgba(15,20,18,.4);animation:gsbFade .2s ease-out}
  @keyframes gsbFade{from{opacity:0}to{opacity:1}}
  .gsb-panel{position:absolute;bottom:0;left:0;right:0;margin:0 auto;max-width:420px;max-height:84vh;background:#FAFAF8;border-radius:20px 20px 0 0;box-shadow:0 -8px 40px rgba(0,0,0,.2);display:flex;flex-direction:column;animation:gsbSlideUp .3s cubic-bezier(.32,.72,0,1);overflow:hidden}
  @keyframes gsbSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
  @media(min-width:480px){.gsb-panel{bottom:24px;right:24px;left:auto;border-radius:20px;width:400px;max-height:660px}}

  .gsb-head{padding:14px 16px 10px;text-align:center;position:relative;flex-shrink:0;border-bottom:1px solid #E8E6E0;background:#111827}
  .gsb-head-close{position:absolute;top:12px;right:12px;width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.1);border:none;color:rgba(255,255,255,.7);cursor:pointer;display:flex;align-items:center;justify-content:center}
  .gsb-head-back{position:absolute;top:12px;left:12px;width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.1);border:none;color:rgba(255,255,255,.7);cursor:pointer;display:flex;align-items:center;justify-content:center}
  .gsb-head-av{width:42px;height:42px;border-radius:50%;background:#1D9E75;display:flex;align-items:center;justify-content:center;color:#fff;margin:0 auto 6px}
  .gsb-head-title{font-size:15px;font-weight:700;color:#fff}
  .gsb-head-sub{font-size:11.5px;color:#9FE1CB;margin-top:1px}

  .gsb-ask-wrap{padding:10px 14px;flex-shrink:0;background:#fff;border-bottom:1px solid #E8E6E0}
  .gsb-ask-bar{display:flex;align-items:center;gap:8px;background:#F4F3F0;border:1.5px solid #E8E6E0;border-radius:100px;padding:9px 14px;transition:border-color .2s,background .2s}
  .gsb-ask-bar.gsb-focused{border-color:#1D9E75;background:#fff;box-shadow:0 0 0 3px rgba(29,158,117,.1)}
  .gsb-ask-input{flex:1;border:none;background:none;outline:none;font-size:14px;font-family:inherit;color:#1A1A18;min-width:0}
  .gsb-ask-input::placeholder{color:#888780}
  .gsb-ask-send{color:#085041;cursor:pointer;flex-shrink:0;display:flex}

  .gsb-body{flex:1;overflow-y:auto;padding:12px 14px 16px;background:#FAFAF8}
  .gsb-body::-webkit-scrollbar{width:4px}.gsb-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:4px}

  .gsb-qa-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:6px}
  .gsb-qa{display:flex;align-items:center;gap:9px;padding:10px 11px;border-radius:12px;border:1px solid #E8E6E0;background:#fff;cursor:pointer;transition:background .15s,border-color .15s}
  .gsb-qa:hover{background:#F4F3F0;border-color:#D8D6CE}
  .gsb-qa:active{transform:scale(.98)}
  .gsb-qa-icon{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .gsb-qa-icon.br{background:#E1F5EE;color:#085041}
  .gsb-qa-icon.ng{background:#FAEEDA;color:#BA7517}
  .gsb-qa-icon.su{background:#E6F1FB;color:#378ADD}
  .gsb-qa-icon.fl{background:#FCEBEB;color:#A32D2D}
  .gsb-qa-label{font-size:12.5px;font-weight:600;color:#1A1A18;line-height:1.25}

  .gsb-card{background:#fff;border-radius:13px;border:1px solid #E8E6E0;padding:12px 13px;margin-bottom:9px;box-shadow:0 1px 3px rgba(0,0,0,.05);font-size:12px;color:#5F5E5A;line-height:1.9}
  .gsb-card.gsb-success{border-left:3px solid #1D9E75;background:#F0FDF4}
  .gsb-card.gsb-warn{border-left:3px solid #BA7517;background:#FAEEDA}
  .gsb-card.gsb-info{border-left:3px solid #378ADD;background:#E6F1FB}
  .gsb-card.gsb-live{border-color:#1D9E75;background:#F0FDF4}
  .gsb-card-head{font-size:12.5px;font-weight:700;color:#085041;margin-bottom:6px;display:flex;align-items:center;gap:6px}
  .gsb-card-head.gsb-loading svg{animation:gsbSpin 1s linear infinite}
  @keyframes gsbSpin{to{transform:rotate(360deg)}}
  .gsb-row{display:flex;justify-content:space-between;gap:10px;padding:3px 0;border-bottom:1px solid rgba(0,0,0,.06)}
  .gsb-row:last-child{border-bottom:none}
  .gsb-row span:first-child{color:#888780;flex-shrink:0}
  .gsb-row span:last-child{font-weight:600;color:#1A1A18;text-align:right}
  .gsb-note{margin-top:7px;padding:7px 9px;background:#FAEEDA;border-radius:8px;color:#854F0B;font-size:11px;line-height:1.6}
  .gsb-perf-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:2px}
  .gsb-perf-tile{background:#fff;border:1px solid #E8E6E0;border-radius:9px;padding:9px 10px;text-align:center}
  .gsb-perf-tile.hi{background:#F0FDF4;border-color:#1D9E75}
  .gsb-perf-val{font-size:18px;font-weight:700;color:#085041;letter-spacing:-.02em}
  .gsb-perf-lbl{font-size:9.5px;color:#888780;margin-top:2px;font-weight:500}

  .gsb-btns{display:flex;gap:7px;margin-top:9px;flex-wrap:wrap}
  .gsb-btn{flex:1;min-width:90px;padding:8px 10px;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;border:none;transition:opacity .15s;text-align:center}
  .gsb-btn.p{background:#085041;color:#fff}
  .gsb-btn.o{background:transparent;color:#085041;border:1.5px solid #085041}
  .gsb-btn.r{background:transparent;color:#A32D2D;border:1.5px solid #A32D2D}
  .gsb-btn:hover{opacity:.85}

  .gsb-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}
  .gsb-chip{padding:7px 13px;border:1.5px solid #E8E6E0;border-radius:100px;font-size:11.5px;color:#374151;cursor:pointer;background:#fff;font-family:inherit;transition:all .15s;white-space:nowrap}
  .gsb-chip:hover{background:#F0FDF4;border-color:#1D9E75;color:#085041}

  @media(max-width:480px){
    #gsb-fab{right:16px;bottom:calc(84px + env(safe-area-inset-bottom))}
    .gsb-bubble{right:16px;bottom:calc(150px + env(safe-area-inset-bottom))}
  }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ── 2. DOM ───────────────────────────────────────────── */
  const tpl = `
  <button id="gsb-fab" aria-label="Ask Geno for Business">${svg('sparkles', 24, true)}</button>
  <div class="gsb-bubble" id="gsb-bubble" style="display:none">
    <div class="gsb-bubble-close" id="gsb-bubble-close">${svg('x', 14)}</div>
    <div class="gsb-bubble-head">
      <div class="gsb-bubble-av">${svg('sparkles', 13, true)}</div>
      <div class="gsb-bubble-name">Geno for Business</div>
    </div>
    <div class="gsb-bubble-text">Hey! I've got your briefing, negotiations, and subscriber insights ready. <b>Tap me anytime.</b></div>
  </div>
  <div id="gsb-overlay">
    <div class="gsb-scrim" id="gsb-scrim"></div>
    <div class="gsb-panel">
      <div class="gsb-head">
        <button class="gsb-head-back" id="gsb-head-back" style="display:none">${svg('chevron', 16)}</button>
        <button class="gsb-head-close" id="gsb-head-close">${svg('x', 15)}</button>
        <div class="gsb-head-av">${svg('sparkles', 20, true)}</div>
        <div class="gsb-head-title" id="gsb-head-title">Ask Geno for Business</div>
        <div class="gsb-head-sub" id="gsb-head-sub">AI business intelligence · always on</div>
      </div>
      <div class="gsb-ask-wrap">
        <div class="gsb-ask-bar" id="gsb-ask-bar">
          <input class="gsb-ask-input" id="gsb-input" placeholder="Ask about bookings, deals, subscribers…">
          <span class="gsb-ask-send" id="gsb-send">${svg('send', 16)}</span>
        </div>
      </div>
      <div class="gsb-body" id="gsb-body"></div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', tpl);

  /* ── 3. PAGE CONTEXT ─────────────────────────────────── */
  const path = location.pathname.toLowerCase();
  const PAGE = path.includes('dashboard')      ? 'dashboard'
             : path.includes('ai-agents')      ? 'agents'
             : path.includes('features')       ? 'features'
             : path.includes('pricing')        ? 'pricing'
             : path.includes('business-types') ? 'types'
             : path.includes('migrate')        ? 'migrate'
             : 'overview';

  const CTX = {
    dashboard: { sub:'Your business intelligence · live' },
    agents:    { sub:'AI workforce ready · 22+ agents' },
    features:  { sub:'Feature intelligence · live' },
    pricing:   { sub:'Plans & pricing · live' },
    types:     { sub:'Business matching · live' },
    migrate:   { sub:'Switching made easy · live' },
    overview:  { sub:'Your business AI · always on' },
  };
  const ctx = CTX[PAGE];

  /* ── 4. STATE ─────────────────────────────────────────── */
  const body  = document.getElementById('gsb-body');
  const input = document.getElementById('gsb-input');
  const askBar = document.getElementById('gsb-ask-bar');
  const backBtn = document.getElementById('gsb-head-back');
  const title = document.getElementById('gsb-head-title');
  const sub   = document.getElementById('gsb-head-sub');

  /* ── 5. FAB + BUBBLE ──────────────────────────────────── */
  const fab = document.getElementById('gsb-fab');
  const bubble = document.getElementById('gsb-bubble');

  if (!localStorage.getItem('genoBizFabPulsed')) {
    const ring = document.createElement('div');
    ring.className = 'gsb-fab-pulse';
    fab.appendChild(ring);
    localStorage.setItem('genoBizFabPulsed', '1');
    setTimeout(() => ring.remove(), 6200);
  }
  if (!localStorage.getItem('genoBizWelcomeSeen')) {
    localStorage.setItem('genoBizWelcomeSeen', '1');
    setTimeout(() => {
      bubble.style.display = 'block';
      const t = setTimeout(() => bubble.style.display = 'none', 8000);
      bubble.dataset.timer = t;
    }, 1200);
  }
  document.getElementById('gsb-bubble-close').onclick = (e) => { e.stopPropagation(); dismissBubble(); };
  function dismissBubble() {
    clearTimeout(Number(bubble.dataset.timer));
    bubble.style.display = 'none';
  }

  /* ── 6. OPEN / CLOSE ──────────────────────────────────── */
  const overlay = document.getElementById('gsb-overlay');
  fab.addEventListener('click', openPanel);
  document.getElementById('gsb-scrim').addEventListener('click', closePanel);
  document.getElementById('gsb-head-close').addEventListener('click', closePanel);
  backBtn.addEventListener('click', showHome);

  function openPanel() {
    dismissBubble();
    fab.classList.add('gsb-hidden');
    overlay.classList.add('gsb-open');
    showHome();
  }
  function closePanel() {
    overlay.classList.remove('gsb-open');
    fab.classList.remove('gsb-hidden');
  }

  /* ── 7. HOME SCREEN ───────────────────────────────────── */
  function showHome() {
    backBtn.style.display = 'none';
    title.textContent = 'Ask Geno for Business';
    sub.textContent = ctx.sub;
    body.innerHTML = `
      <div class="gsb-qa-grid">
        <div class="gsb-qa" id="gsb-qa-br"><div class="gsb-qa-icon br">${svg('chart',15)}</div><div class="gsb-qa-label">Today's briefing</div></div>
        <div class="gsb-qa" id="gsb-qa-ng"><div class="gsb-qa-icon ng">${svg('coin',15)}</div><div class="gsb-qa-label">View negotiations</div></div>
        <div class="gsb-qa" id="gsb-qa-su"><div class="gsb-qa-icon su">${svg('users',15)}</div><div class="gsb-qa-label">Subscriber insights</div></div>
        <div class="gsb-qa" id="gsb-qa-fl"><div class="gsb-qa-icon fl">${svg('bolt',15,true)}</div><div class="gsb-qa-label">Create a flash sale</div></div>
      </div>`;
    document.getElementById('gsb-qa-br').onclick = () => runFlow(flowBriefing, 'Today\'s briefing');
    document.getElementById('gsb-qa-ng').onclick = () => runFlow(flowNegotiation, 'Pending negotiation');
    document.getElementById('gsb-qa-su').onclick = () => runFlow(flowSubscriberInsights, 'Subscriber insights');
    document.getElementById('gsb-qa-fl').onclick = () => runFlow(flowCreateDeal, 'Create a flash sale');
  }

  function runFlow(fn, label) {
    backBtn.style.display = 'flex';
    title.textContent = label;
    sub.textContent = ctx.sub;
    body.innerHTML = `<div class="gsb-card"><div class="gsb-card-head gsb-loading">${svg('loader',15)} Working on it…</div></div>`;
    setTimeout(() => { body.innerHTML = ''; fn(); }, 800);
  }

  /* ── 8. RENDER HELPERS ────────────────────────────────── */
  function card(html, type='') {
    const el = document.createElement('div');
    el.className = 'gsb-card' + (type ? ' gsb-' + type : '');
    el.innerHTML = html;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    return el;
  }
  function chips(list) {
    const row = document.createElement('div');
    row.className = 'gsb-chips';
    row.innerHTML = list.map(([label, fn], i) => `<button class="gsb-chip" data-i="${i}">${label}</button>`).join('');
    row.querySelectorAll('button').forEach((btn,i) => btn.onclick = () => { row.remove(); runFlow(list[i][1], list[i][0]); });
    body.appendChild(row);
    body.scrollTop = body.scrollHeight;
  }

  /* ── 9. FLOWS ─────────────────────────────────────────── */
  function flowBriefing() {
    card(`<div class="gsb-card-head">📊 Yesterday's performance</div>
      <div class="gsb-row"><span>Bookings</span><span>12 (5 from off-peak deals)</span></div>
      <div class="gsb-row"><span>Revenue</span><span>₹18,400 <span style="color:#1D9E75">+22% vs last week</span></span></div>
      <div class="gsb-row"><span>New reviews</span><span>3 (avg 4.7★)</span></div>
      <div class="gsb-row"><span>Subscribers</span><span>847 <span style="color:#1D9E75">+18 this week</span></span></div>
      <div class="gsb-row"><span>Negotiate requests</span><span>6 received → 4 accepted</span></div>`, 'success');
    chips([['View pending negotiation', flowNegotiation], ['Subscriber demand insights', flowSubscriberInsights], ['My week so far', flowWeekly]]);
  }

  function flowNegotiation() {
    const el = card(`<div class="gsb-card-head">💬 Priya M. — Deep tissue massage</div>
      <div class="gsb-row"><span>Your listed price</span><span>₹699</span></div>
      <div class="gsb-row"><span>Her offer</span><span style="color:#085041">₹580</span></div>
      <div class="gsb-row"><span>Customer profile</span><span>3 past bookings · 5★ reviewer</span></div>
      <div class="gsb-note">💡 Geno's suggestion: accept at ₹620 — she's a loyal repeat customer worth keeping.</div>
      <div class="gsb-btns">
        <button class="gsb-btn p" id="gsb-neg-accept">Accept ₹580</button>
        <button class="gsb-btn o" id="gsb-neg-counter">Counter ₹620</button>
        <button class="gsb-btn r" id="gsb-neg-decline">Decline</button>
      </div>`);
    el.querySelector('#gsb-neg-accept').onclick = () => { el.remove(); card('Accepted ✓ Booking confirmed for Priya M. at ₹580. WhatsApp confirmation sent. 🎉', 'success'); chips([['Create a flash sale', flowCreateDeal],['Subscriber insights', flowSubscriberInsights]]); };
    el.querySelector('#gsb-neg-counter').onclick = () => { el.remove(); card('Done ✓ Counter-offer of ₹620 sent to Priya. Typical response time is under 30 minutes.', 'success'); chips([['Create a flash sale', flowCreateDeal],['Today\'s briefing', flowBriefing]]); };
    el.querySelector('#gsb-neg-decline').onclick = () => { el.remove(); card('Negotiation declined and Priya notified. Want me to suggest an alternative deal to avoid losing her business?'); chips([['Yes, suggest an alternative', flowCreateDeal],['Leave it for now', flowBriefing]]); };
  }

  function flowSubscriberInsights() {
    card(`<div class="gsb-card-head">🔔 Top price alert services</div>
      <div class="gsb-row"><span>Hair spa + cut</span><span>142 alerts · ~₹550</span></div>
      <div class="gsb-row"><span>Keratin treatment</span><span>89 alerts · ~₹1,800</span></div>
      <div class="gsb-row"><span>Hair colour</span><span>76 alerts · ~₹900</span></div>
      <div class="gsb-row"><span>Facial + cleanup</span><span>63 alerts · ~₹450</span></div>`, 'info');
    card(`<div class="gsb-card-head">📅 Peak subscriber demand</div>
      <div class="gsb-row"><span>Saturday 10am–1pm</span><span>340 looking</span></div>
      <div class="gsb-row"><span>Sunday 11am–2pm</span><span>280 looking</span></div>
      <div class="gsb-row"><span>Weekday 3pm–6pm</span><span>190 looking</span></div>`);
    card('You have empty weekday 3–6pm slots right now — 190 subscribers want deals in that window. Want me to create one?');
    chips([['Create weekday 3–6pm deal', flowCreateDeal], ['Today\'s briefing', flowBriefing]]);
  }

  function flowCreateDeal() {
    const el = card(`<div class="gsb-card-head">🎯 Recommended flash sale</div>
      <div class="gsb-row"><span>Service</span><span>Hair spa + cut</span></div>
      <div class="gsb-row"><span>Why this</span><span>142 subscriber alerts</span></div>
      <div class="gsb-row"><span>Price</span><span style="color:#085041">₹499 <span style="font-size:9px">was ₹1,250</span></span></div>
      <div class="gsb-row"><span>Time slots</span><span>Today 2pm–6pm (5 slots)</span></div>
      <div class="gsb-row"><span>Expected</span><span style="color:#1D9E75">3–5 bookings within 2 hrs</span></div>
      <div class="gsb-btns">
        <button class="gsb-btn p" id="gsb-deal-publish">Publish this deal</button>
      </div>`);
    el.querySelector('#gsb-deal-publish').onclick = () => { el.remove(); publishDeal(); };
  }

  function publishDeal() {
    card(`<div class="gsb-card-head">✅ Flash sale live!</div>
      <div class="gsb-row"><span>Service</span><span>Hair spa + cut · ₹499</span></div>
      <div class="gsb-row"><span>Time</span><span>Today 2pm–6pm · 5 slots</span></div>
      <div class="gsb-row"><span>Subscribers notified</span><span style="color:#1D9E75">847 via WhatsApp ✓</span></div>`, 'live');
    setTimeout(() => {
      card(`<div class="gsb-card-head">📈 Flash sale performance — 2 hrs in</div>
        <div class="gsb-row"><span>Subscribers who saw it</span><span>412 of 847 (49%)</span></div>
        <div class="gsb-row"><span>Bookings</span><span style="color:#1D9E75">3 of 5 slots (60% filled)</span></div>
        <div class="gsb-row"><span>Revenue so far</span><span style="color:#1D9E75">₹1,497</span></div>`, 'success');
      chips([['Push reminder to non-bookers', flowPushReminder], ['End of day summary', flowEndOfDay]]);
    }, 1600);
  }

  function flowPushReminder() {
    card('Reminder sent to 206 subscribers who viewed but didn\'t book. Expect 1–2 more bookings in the next hour. 👍', 'success');
    chips([['End of day summary', flowEndOfDay], ['Today\'s briefing', flowBriefing]]);
  }

  function flowEndOfDay() {
    card(`<div class="gsb-perf-grid">
      <div class="gsb-perf-tile hi"><div class="gsb-perf-val">5/5</div><div class="gsb-perf-lbl">Slots filled</div></div>
      <div class="gsb-perf-tile hi"><div class="gsb-perf-val">₹2,495</div><div class="gsb-perf-lbl">Flash sale revenue</div></div>
      <div class="gsb-perf-tile"><div class="gsb-perf-val">₹21,940</div><div class="gsb-perf-lbl">Total today</div></div>
      <div class="gsb-perf-tile"><div class="gsb-perf-val">+31%</div><div class="gsb-perf-lbl">vs last week</div></div>
    </div>`);
    card('Great day! The flash sale filled all slots. Want me to pre-build tomorrow\'s deal based on subscriber demand?');
    chips([['Create tomorrow\'s deal', flowCreateDeal], ['View weekly trend', flowWeekly]]);
  }

  function flowWeekly() {
    card(`<div class="gsb-card-head">📅 Week performance (Mon–Tue)</div>
      <div class="gsb-row"><span>Total bookings</span><span>24</span></div>
      <div class="gsb-row"><span>Revenue</span><span style="color:#1D9E75">₹38,600 (+18%)</span></div>
      <div class="gsb-row"><span>Off-peak deals booked</span><span>11 of 24 (46%)</span></div>
      <div class="gsb-row"><span>New subscribers</span><span>+18</span></div>
      <div class="gsb-row"><span>Negotiations</span><span>9 received · 7 accepted</span></div>`, 'success');
    chips([['Create a flash sale', flowCreateDeal], ['Subscriber insights', flowSubscriberInsights]]);
  }

  function flowAIAgents() {
    card(`<div class="gsb-card-head">🤖 Top AI agents for your business</div>
      <div class="gsb-row"><span>AI Receptionist</span><span>Never miss a booking</span></div>
      <div class="gsb-row"><span>AI Dynamic Pricing</span><span>+15–30% revenue</span></div>
      <div class="gsb-row"><span>AI Review Agent</span><span>Auto Google replies</span></div>
      <div class="gsb-row"><span>AI Campaign Manager</span><span>Coming soon</span></div>`);
    chips([['Show revenue impact estimate', flowAIAgents], ['Today\'s briefing', flowBriefing]]);
  }

  function flowPricingAdvice() {
    const el = card('What type of business do you run and roughly how many bookings per month?');
    chips([['Salon / spa · under 100/mo', flowPlanRecommendation], ['Clinic · 100–300/mo', flowPlanRecommendation], ['Gym / fitness · 300+/mo', flowPlanRecommendation]]);
  }

  function flowPlanRecommendation() {
    card(`<div class="gsb-card-head">📋 Business plan — ₹599/month</div>
      <div class="gsb-row"><span>Booking management</span><span>Unlimited</span></div>
      <div class="gsb-row"><span>AI agents included</span><span>5 core agents</span></div>
      <div class="gsb-row"><span>Deal & negotiation engine</span><span>Included</span></div>
      <div class="gsb-row"><span>Typical ROI</span><span style="color:#1D9E75">₹15,000–₹25,000/mo</span></div>`, 'success');
    card('At ₹599/month, you\'d need just one extra booking per week to break even.');
    chips([['Tell me about AI Pro', flowAIAgents], ['Today\'s briefing', flowBriefing]]);
  }

  function flowBusinessType() {
    card(`<div class="gsb-card-head">💅 Built for Salons & Spas</div>
      <div class="gsb-row"><span>Off-peak deal engine</span><span>Fill empty slots</span></div>
      <div class="gsb-row"><span>Stylist scheduling</span><span>AI optimised</span></div>
      <div class="gsb-row"><span>Membership & packages</span><span>Included</span></div>
      <div class="gsb-row"><span>WhatsApp campaigns</span><span>Included</span></div>`, 'info');
    chips([['See pricing for salons', flowPricingAdvice], ['How does deal engine work?', flowCreateDeal]]);
  }

  const FLOWS = {
    "today's briefing": flowBriefing, briefing: flowBriefing,
    'view negotiations': flowNegotiation, 'view pending negotiation': flowNegotiation, negotiation: flowNegotiation,
    'subscriber insights': flowSubscriberInsights, 'subscriber demand insights': flowSubscriberInsights,
    'create a flash sale': flowCreateDeal, deal: flowCreateDeal,
    'my week so far': flowWeekly, weekly: flowWeekly,
    'which agents should i activate': flowAIAgents, agents: flowAIAgents,
    'which plan is right for me': flowPricingAdvice, pricing: flowPricingAdvice, plan: flowPricingAdvice,
    'i run a salon': flowBusinessType, salon: flowBusinessType,
  };

  /* ── 10. FREE-TEXT INPUT ──────────────────────────────── */
  input.addEventListener('focus', () => askBar.classList.add('gsb-focused'));
  input.addEventListener('blur',  () => askBar.classList.remove('gsb-focused'));
  input.addEventListener('keydown', e => { if (e.key === 'Enter') sendAsk(); });
  document.getElementById('gsb-send').addEventListener('click', sendAsk);

  function sendAsk() {
    const txt = input.value.trim();
    if (!txt) return;
    input.value = '';
    const key = txt.toLowerCase();
    const match = Object.keys(FLOWS).find(k => key.includes(k) || k.includes(key));
    if (match) { runFlow(FLOWS[match], txt); return; }
    backBtn.style.display = 'flex';
    title.textContent = txt;
    sub.textContent = ctx.sub;
    body.innerHTML = `<div class="gsb-card"><div class="gsb-card-head gsb-loading">${svg('loader',15)} Looking into it…</div></div>`;
    setTimeout(() => {
      body.innerHTML = '';
      card('Based on your business profile and recent data, here\'s what I recommend:');
      chips([["Today's briefing", flowBriefing], ['Create a flash sale', flowCreateDeal], ['Subscriber insights', flowSubscriberInsights]]);
    }, 800);
  }
})();
