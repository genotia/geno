/* ═══════════════════════════════════════════════════════════
   Ask Geno — Consumer AI Chat Widget
   Drop <script src="geno-chat.js"></script> into any page.
   Self-injects styles + DOM, no external dependencies.
═══════════════════════════════════════════════════════════ */
(function () {
  /* ── 1. STYLES ────────────────────────────────────────── */
  const css = `
  #geno-fab{position:fixed;bottom:28px;right:28px;z-index:9000;display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,#085041 0%,#0d7a5e 100%);color:#fff;border:none;border-radius:100px;padding:14px 24px 14px 14px;cursor:pointer;font-family:inherit;font-size:15px;font-weight:800;letter-spacing:-.01em;box-shadow:0 6px 28px rgba(8,80,65,.5),0 2px 8px rgba(0,0,0,.15);transition:transform .2s,box-shadow .2s}
  #geno-fab:hover{transform:translateY(-3px);box-shadow:0 12px 36px rgba(8,80,65,.55),0 4px 12px rgba(0,0,0,.18)}
  #geno-fab.geno-hidden{display:none}
  .gfab-av{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.18);border:2px solid rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#fff;flex-shrink:0;position:relative}
  .gfab-pulse{position:absolute;top:0px;right:0px;width:12px;height:12px;border-radius:50%;background:#4ADE80;border:2.5px solid #085041;animation:gpulse 2s infinite}
  .gfab-logo{display:none;position:absolute;top:0;left:0;width:100%;height:100%;border-radius:50%}
  @keyframes gpulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.5);opacity:.6}}

  #geno-chat{position:fixed;bottom:24px;right:24px;z-index:9000;width:360px;border-radius:20px;background:#fff;box-shadow:0 24px 64px rgba(0,0,0,.18),0 4px 16px rgba(0,0,0,.08);display:flex;flex-direction:column;overflow:hidden;height:540px;transform:translateY(24px) scale(.96);opacity:0;pointer-events:none;transition:transform .28s cubic-bezier(.34,1.56,.64,1),opacity .22s ease}
  #geno-chat.geno-open{transform:translateY(0) scale(1);opacity:1;pointer-events:all}

  .gc-head{background:linear-gradient(135deg,#085041 0%,#0a6350 100%);padding:14px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0}
  .gc-av{width:38px;height:38px;border-radius:50%;background:#1D9E75;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:#fff;flex-shrink:0}
  .gc-info{flex:1;min-width:0}
  .gc-name{font-size:14px;font-weight:700;color:#fff}
  .gc-status{font-size:11px;color:#9FE1CB;display:flex;align-items:center;gap:5px;margin-top:1px}
  .gc-status::before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;background:#4ADE80;flex-shrink:0}
  .gc-close{background:rgba(255,255,255,.12);border:none;color:rgba(255,255,255,.75);width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:background .15s;flex-shrink:0}
  .gc-close:hover{background:rgba(255,255,255,.22);color:#fff}

  .gc-body{flex:1;overflow-y:auto;padding:14px 12px;display:flex;flex-direction:column;gap:8px;background:#F8F8F6;scroll-behavior:smooth}
  .gc-body::-webkit-scrollbar{width:4px}.gc-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:4px}

  .gm{max-width:88%;padding:9px 13px;border-radius:14px;font-size:12.5px;line-height:1.6;animation:gmIn .22s ease}
  @keyframes gmIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
  .gm-bot{background:#fff;color:#1A1A18;align-self:flex-start;border:1px solid rgba(0,0,0,.08);border-bottom-left-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,.05);padding:10px 13px}
  .gm-user{background:#085041;color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
  .gm-typing{background:#fff;border:1px solid rgba(0,0,0,.08);align-self:flex-start;padding:13px 16px;border-bottom-left-radius:4px}
  .gm-typing span{display:inline-block;width:7px;height:7px;border-radius:50%;background:#9FE1CB;animation:gdot 1.2s infinite;margin:0 2px}
  .gm-typing span:nth-child(2){animation-delay:.2s}.gm-typing span:nth-child(3){animation-delay:.4s}
  @keyframes gdot{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}

  .gc-card{background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:10px;padding:10px 12px;margin-top:4px}
  .gc-card.gc-best{border-color:#1D9E75;background:#ECFDF5}
  .gcc-name{font-size:12px;font-weight:600;color:#111827;margin-bottom:2px}
  .gcc-meta{font-size:10px;color:#6B7280;line-height:1.6}
  .gcc-prices{display:flex;align-items:baseline;gap:6px;margin:5px 0}
  .gcc-now{font-size:16px;font-weight:700;color:#085041}
  .gcc-was{font-size:11px;color:#9CA3AF;text-decoration:line-through}
  .gcc-disc{font-size:9px;font-weight:600;background:#FEE2E2;color:#B91C1C;padding:2px 6px;border-radius:4px}
  .gcc-btns{display:flex;gap:6px;margin-top:8px}
  .gcc-btn{flex:1;padding:7px 8px;border-radius:8px;font-size:10px;font-weight:600;cursor:pointer;border:none;font-family:inherit;transition:opacity .15s}
  .gcc-btn.p{background:#085041;color:#fff}.gcc-btn.o{background:transparent;color:#085041;border:1.5px solid #085041}
  .gcc-btn:hover{opacity:.82}

  .gcc-compare{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:5px}
  .gcc-cmp{background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:8px;padding:8px;text-align:center}
  .gcc-cmp.gcc-top{border-color:#1D9E75;background:#ECFDF5}
  .gcc-cmp-name{font-size:9px;font-weight:600;color:#374151;margin-bottom:3px}
  .gcc-cmp-price{font-size:13px;font-weight:700;color:#085041}
  .gcc-cmp-tag{font-size:8px;color:#1D9E75;font-weight:600;margin-top:2px}

  .gc-steps{background:#F0FDF4;border:1px solid #BBF7D0;border-radius:9px;padding:9px 11px;margin-top:4px;display:flex;flex-direction:column;gap:5px}
  .gc-step{font-size:11px;display:flex;align-items:center;gap:7px}
  .gc-step.s-done{color:#085041}.gc-step.s-active{color:#111827;font-weight:600}.gc-step.s-wait{color:#9CA3AF}

  .gc-qr{display:flex;gap:6px;flex-wrap:wrap;margin-top:2px;align-self:flex-start;max-width:100%}
  .gc-q{padding:6px 13px;border:1.5px solid rgba(0,0,0,.12);border-radius:100px;font-size:11px;color:#374151;cursor:pointer;background:#fff;font-family:inherit;transition:all .15s;white-space:nowrap}
  .gc-q:hover{background:#ECFDF5;border-color:#1D9E75;color:#085041}

  .gc-foot{padding:10px 12px;border-top:1px solid rgba(0,0,0,.08);background:#fff;display:flex;gap:8px;align-items:center;flex-shrink:0}
  .gc-input{flex:1;border:1.5px solid #E5E7EB;border-radius:20px;padding:8px 14px;font-size:12px;font-family:inherit;outline:none;background:#F9FAFB;color:#111827;transition:border-color .15s}
  .gc-input:focus{border-color:#1D9E75;background:#fff}
  .gc-send{width:34px;height:34px;border-radius:50%;background:#085041;border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .15s}
  .gc-send:hover{opacity:.85}

  .gc-confirmed{background:#ECFDF5;border:1px solid #1D9E75;border-radius:10px;padding:12px;margin-top:4px;font-size:11px;line-height:1.9;color:#085041}
  .gc-confirmed strong{display:block;font-size:13px;font-weight:700;margin-bottom:6px}
  .gc-negotiate-info{font-size:11px;line-height:2;border:1px solid rgba(0,0,0,.08);border-radius:9px;padding:9px 12px;background:#fff;margin-top:4px}
  .gc-negotiate-info div{display:flex;justify-content:space-between}
  .gc-ni-label{color:#6B7280}.gc-ni-val{font-weight:600;color:#085041}

  @media(max-width:768px){
    #geno-fab{width:60px;height:60px;border-radius:50%;padding:0;justify-content:center;right:16px;bottom:calc(84px + env(safe-area-inset-bottom));background:none;box-shadow:0 4px 20px rgba(8,80,65,.5),0 2px 8px rgba(0,0,0,.2)}
    .gfab-label{display:none}
    .gfab-av{width:58px;height:58px;font-size:0;background:none;border:none}
    .gfab-logo{display:block}
    .gfab-pulse{border-color:#fff}
    #geno-chat{width:calc(100vw - 16px);right:8px;bottom:calc(80px + env(safe-area-inset-bottom));height:76vh;border-radius:16px}
  }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ── 2. DOM ───────────────────────────────────────────── */
  const tpl = `
  <button id="geno-fab" onclick="genoOpen()">
    <div class="gfab-av">G<img src="genoti_logo.svg" class="gfab-logo" alt=""><div class="gfab-pulse"></div></div>
    <span class="gfab-label">Ask Geno AI</span>
  </button>
  <div id="geno-chat">
    <div class="gc-head">
      <div class="gc-av">G</div>
      <div class="gc-info">
        <div class="gc-name">Ask Geno AI</div>
        <div class="gc-status" id="gc-status">AI deals assistant · always on</div>
      </div>
      <button class="gc-close" onclick="genoClose()">✕</button>
    </div>
    <div class="gc-body" id="gc-body"></div>
    <div class="gc-foot">
      <input class="gc-input" id="gc-input" placeholder="Ask about deals, prices, bookings…" />
      <button class="gc-send" onclick="genoSend()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', tpl);

  /* ── 3. PAGE CONTEXT ─────────────────────────────────── */
  const path = location.pathname.toLowerCase();
  const PAGE = path.includes('community') ? 'community'
             : path.includes('notify')    ? 'negotiate'
             : path.includes('deals')     ? 'deals'
             : path.includes('booking')   ? 'booking'
             : 'deals';

  const CTX = {
    deals:     { status:'Finding deals near you…',       opener:'Hey! 👋 Looking for an off-peak deal? Tell me what you want and I\'ll find the best price near you.', chips:['Spa deals near me','Restaurants under ₹500','Gym passes','Café deals'] },
    community: { status:'Comparing community deals…',    opener:'Hey! 👋 Want to see what the community has found near you today? Or compare deals across merchants?', chips:['Latest community deals','Compare gym deals','Best restaurant offers','Deals in Koramangala'] },
    negotiate: { status:'Ready to negotiate for you…',   opener:'I can negotiate with any merchant on your behalf. Which deal are you eyeing? 🤝', chips:['Negotiate spa deal','Check my offer status','Best negotiated deals today'] },
    booking:   { status:'Ready to book for you…',        opener:'Need help booking? Tell me the merchant, service, and when — I\'ll handle the rest. 📅', chips:['My upcoming bookings','Rebook last visit','Book a new deal'] },
  };
  const ctx = CTX[PAGE];

  /* ── 4. STATE ────────────────────────────────────────── */
  const body  = document.getElementById('gc-body');
  const input = document.getElementById('gc-input');
  let started = false;

  /* ── 5. OPEN / CLOSE ─────────────────────────────────── */
  window.genoOpen = function () {
    document.getElementById('geno-fab').classList.add('geno-hidden');
    document.getElementById('geno-chat').classList.add('geno-open');
    document.getElementById('gc-status').textContent = ctx.status;
    input.focus();
    if (!started) { started = true; setTimeout(startFlow, 350); }
  };
  window.genoClose = function () {
    document.getElementById('geno-chat').classList.remove('geno-open');
    document.getElementById('geno-fab').classList.remove('geno-hidden');
  };
  window.genoSend = function () {
    const txt = input.value.trim(); if (!txt) return;
    input.value = '';
    addUser(txt); flowDefault(txt);
  };
  input.addEventListener('keydown', e => { if (e.key === 'Enter') window.genoSend(); });

  /* ── 6. CHIP HANDLER ─────────────────────────────────── */
  window.genoChip = function (text) {
    addUser(text);
    const fn = FLOWS[text]; fn ? fn() : flowDefault(text);
  };

  /* ── 7. FLOWS ────────────────────────────────────────── */
  function startFlow() {
    typing().then(() => { addBot(ctx.opener); chips(ctx.chips); });
  }

  function flowSpa() {
    typing().then(() => {
      addBot('Found 3 spa deals near Koramangala under ₹800 for Saturday 🎯');
      card({ name:'💆 Deep tissue massage',      meta:'Serenity Spa · HSR Layout · 1.2 km', now:'₹699',  was:'₹1,499', disc:'53% off', time:'Sat 2pm–5pm · 2 slots left' });
      card({ name:'💆 Couples aromatherapy',     meta:'Zen Studio · Koramangala · 0.4 km',  now:'₹799',  was:'₹1,800', disc:'56% off', time:'Sat 1pm–4pm · 4 slots left' });
      card({ name:'💆 Head & shoulder therapy',  meta:'The Wellness Room · 0.6 km',          now:'₹449',  was:'₹899',   disc:'50% off', time:'Sat 11am–2pm · 6 slots left', best:true });
      chips(['Show more results','Compare these three','Notify me if price drops']);
    });
  }

  function flowRestaurants() {
    typing().then(() => {
      addBot('Top restaurant deals under ₹500 near you 🍽️');
      card({ name:'🍛 Lunch thali combo',  meta:'Sattvik Kitchen · Koramangala · 0.3 km', now:'₹299', was:'₹599', disc:'50% off', time:'Weekdays 12pm–3pm', best:true });
      card({ name:'🍕 Pizza + drink combo', meta:'The Pizza Lab · Indiranagar · 1.8 km',    now:'₹399', was:'₹799', disc:'50% off', time:'Daily 3pm–6pm' });
      chips(['Book this','Negotiate lower','See more restaurants']);
    });
  }

  function flowGym() {
    typing().then(() => {
      addBot('Top 3 gym deals near Koramangala 💪');
      compare([
        { name:'FitStop',     price:'₹999/mo',   tag:'Best value ★', best:true },
        { name:"Gold's Gym",  price:'₹1,499/mo', tag:'Pool + sauna' },
        { name:'CultFit',     price:'₹1,199/mo', tag:'Group classes' },
      ]);
      addBot('FitStop is the best value — closest and highest rated. Want me to negotiate it lower?');
      chips(['Negotiate FitStop','More about Gold\'s','Price alert for all 3']);
    });
  }

  function flowCafe() {
    typing().then(() => {
      addBot('Café deals near you ☕');
      card({ name:'☕ Work-from-café pass', meta:'Third Wave Coffee · Koramangala · 0.5 km', now:'₹199', was:'₹499', disc:'60% off', time:'Weekdays 10am–2pm', best:true });
      chips(['Book this','Negotiate lower','More café deals']);
    });
  }

  function flowCommunityDeals() {
    typing().then(() => {
      addBot('🏘️ Latest deals submitted by your community today:');
      card({ name:'✂️ Haircut + wash', meta:'Style Studio · Submitted by Meera · 5 verifications', now:'₹299', was:'₹699', disc:'57% off', time:'Today · off-peak 11am–2pm', best:true });
      card({ name:'🍜 Noodle bowl',    meta:'Asia Kitchen · Submitted by Raj · 3 verifications',   now:'₹149', was:'₹349', disc:'57% off', time:'Weekdays 3pm–6pm' });
      chips(['Compare gym deals','Submit a deal I found','Price alert']);
    });
  }

  function flowNegotiate() {
    typing().then(() => {
      addBot('Here\'s what I know before I start negotiating:');
      const ni = el('div', 'gm gm-bot');
      ni.innerHTML = `<div class="gc-negotiate-info">
        <div><span class="gc-ni-label">Listed price</span><span class="gc-ni-val">₹699</span></div>
        <div><span class="gc-ni-label">Typical acceptance range</span><span class="gc-ni-val">₹580–₹650</span></div>
        <div><span class="gc-ni-label">Best ever accepted</span><span class="gc-ni-val">₹550</span></div>
        <div><span class="gc-ni-label">Merchant success rate</span><span class="gc-ni-val">78%</span></div>
      </div>`;
      body.appendChild(ni); scroll();
      setTimeout(() => {
        addBot('I\'ll aim for ₹620. Starting negotiation now…');
        setTimeout(() => {
          steps([
            { text:'Sent ₹620 offer to Serenity Spa', s:'s-done' },
            { text:'Merchant viewed your offer',       s:'s-done' },
            { text:'Merchant countered at ₹649',       s:'s-active' },
            { text:'Awaiting your decision…',          s:'s-wait' },
          ]);
          addBot('They countered at ₹649. Based on their pattern, they\'ll likely accept ₹620. What do you want to do?');
          chips(['Accept ₹649','Push for ₹620','My max is ₹600','Walk away']);
        }, 1200);
      }, 700);
    });
  }

  function flowNegotiateAccepted() {
    typing().then(() => {
      steps([
        { text:'Counter-offered ₹620',     s:'s-done' },
        { text:'Merchant reviewing…',      s:'s-done' },
        { text:'Merchant accepted! 🎉',    s:'s-active' },
      ]);
      addBot('Done! Serenity Spa accepted ₹620 🎉');
      card({ name:'✅ Deal locked — ₹620', meta:'Deep tissue massage · Serenity Spa · HSR Layout', now:'₹620', was:'₹1,499', disc:'You saved ₹879', time:'Valid Saturday · 2pm–5pm', best:true });
      chips(['Book Saturday 3pm','Share this deal','Find another deal']);
    });
  }

  function flowOfferStatus() {
    typing().then(() => {
      addBot('You have 1 active negotiation:');
      steps([
        { text:'Sent ₹600 offer to Zen Studio', s:'s-done' },
        { text:'Merchant viewed',                s:'s-done' },
        { text:'Waiting for response (< 2 hrs)', s:'s-active' },
      ]);
      chips(['Raise my offer','Cancel negotiation','Start a new one']);
    });
  }

  function flowBestNegotiated() {
    typing().then(() => {
      addBot('Today\'s best negotiated deals 🔥');
      card({ name:'💇 Full hair spa', meta:'Glam Studio · saved ₹880 · by Priya K.', now:'₹499', was:'₹1,379', disc:'64% off', time:'Today · off-peak', best:true });
      chips(['Negotiate a deal','See all today\'s deals']);
    });
  }

  function flowUpcomingBookings() {
    typing().then(() => {
      addBot('Your upcoming bookings 📅');
      const b = el('div','gm gm-bot');
      b.innerHTML = `<div class="gc-card gc-best">
        <div class="gcc-name">✂️ Full hair spa + cut</div>
        <div class="gcc-meta">Glam Studio · Koramangala<br>Saturday 25 Jan · 3:00 PM · Stylist: Priya</div>
        <div class="gcc-prices"><span class="gcc-now">₹499</span><span class="gcc-disc" style="background:#D1FAE5;color:#065F46">Confirmed ✓</span></div>
        <div class="gcc-btns"><button class="gcc-btn o" onclick="genoChip('Rebook last visit')">Reschedule</button></div>
      </div>`;
      body.appendChild(b); scroll();
      chips(['Book another','Rebook last visit']);
    });
  }

  function flowRebook() {
    typing().then(() => {
      addBot('Rebooking your last visit:');
      card({ name:'✂️ Full hair spa + cut', meta:'Glam Studio · Koramangala · Stylist: Priya', now:'₹499', was:'₹1,250', disc:'60% off', time:'Next available: Sunday 11am', best:true });
      chips(['Confirm Sunday 11am','Different time','Different stylist']);
    });
  }

  function flowBookNew() {
    typing().then(() => {
      addBot('Just tell me the merchant, service, and when — e.g. "Glam Studio hair spa Saturday 3pm" — and I\'ll book it for you.');
    });
  }

  function flowConfirmBook() {
    typing().then(() => {
      const b = el('div','gm gm-bot');
      b.innerHTML = `<div class="gc-confirmed">
        <strong>✅ Booking confirmed!</strong>
        📍 Glam Studio, Koramangala<br>
        📅 Saturday, 25 Jan · 3:00 PM<br>
        💰 ₹499 — pay at counter<br>
        💆 Stylist: Priya<br><br>
        <div class="gcc-btns">
          <button class="gcc-btn p">Add to calendar</button>
          <button class="gcc-btn o">Share with friend</button>
        </div>
      </div>`;
      body.appendChild(b); scroll();
      addBot('WhatsApp confirmation sent! Anything else?');
      chips(['Find another deal','See my bookings','Share with a friend']);
    });
  }

  function flowDefault(text) {
    typing().then(() => {
      addBot(`Let me find the best "${text}" deals near you…`);
      setTimeout(() => {
        card({ name:`🔍 ${text}`, meta:'Best match near Koramangala', now:'₹399', was:'₹799', disc:'50% off', time:'Today · off-peak slots available', best:true });
        chips(['Book this','Negotiate lower','See more options']);
      }, 700);
    });
  }

  const FLOWS = {
    'Spa deals near me':          flowSpa,
    'Restaurants under ₹500':     flowRestaurants,
    'Gym passes':                  flowGym,
    'Café deals':                  flowCafe,
    'Latest community deals':      flowCommunityDeals,
    'Compare gym deals':           flowGym,
    'Best restaurant offers':      flowRestaurants,
    'Deals in Koramangala':        flowSpa,
    'Negotiate spa deal':          flowNegotiate,
    'Negotiate FitStop':           flowNegotiate,
    'Negotiate lower':             flowNegotiate,
    'Check my offer status':       flowOfferStatus,
    'Best negotiated deals today': flowBestNegotiated,
    'My upcoming bookings':        flowUpcomingBookings,
    'Rebook last visit':           flowRebook,
    'Book a new deal':             flowBookNew,
    'Book this':                   flowConfirmBook,
    'Book Saturday 3pm':           flowConfirmBook,
    'Confirm Sunday 11am':         flowConfirmBook,
    'Push for ₹620':               flowNegotiateAccepted,
    'Show more results':           flowSpa,
    'Compare these three':         flowGym,
  };

  /* ── 8. DOM HELPERS ─────────────────────────────────── */
  function el(tag, cls) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  function addUser(text) {
    const m = el('div','gm gm-user');
    m.textContent = text;
    body.appendChild(m); scroll();
  }

  function addBot(text) {
    const m = el('div','gm gm-bot');
    m.innerHTML = text;
    body.appendChild(m); scroll();
    return m;
  }

  function card({ name, meta, now, was, disc, time, best }) {
    const m = el('div','gm gm-bot');
    m.innerHTML = `<div class="gc-card${best?' gc-best':''}">
      <div class="gcc-name">${name}</div>
      <div class="gcc-meta">${meta}</div>
      <div class="gcc-prices">
        <span class="gcc-now">${now}</span>
        <span class="gcc-was">${was}</span>
        <span class="gcc-disc">${disc}</span>
      </div>
      <div class="gcc-meta">${time}</div>
      <div class="gcc-btns">
        <button class="gcc-btn p" onclick="genoChip('Book this')">Book this</button>
        <button class="gcc-btn o" onclick="genoChip('Negotiate lower')">Negotiate lower</button>
      </div>
    </div>`;
    body.appendChild(m); scroll();
  }

  function compare(items) {
    const m = el('div','gm gm-bot');
    m.innerHTML = `<div class="gcc-compare">${items.map(i =>
      `<div class="gcc-cmp${i.best?' gcc-top':''}">
        <div class="gcc-cmp-name">${i.name}</div>
        <div class="gcc-cmp-price">${i.price}</div>
        <div class="gcc-cmp-tag">${i.tag}</div>
      </div>`).join('')}</div>`;
    body.appendChild(m); scroll();
  }

  function steps(list) {
    const m = el('div','gm gm-bot');
    m.innerHTML = `<div class="gc-steps">${list.map(s =>
      `<div class="gc-step ${s.s}">${s.s==='s-done'?'✅':s.s==='s-active'?'⏳':'○'} ${s.text}</div>`
    ).join('')}</div>`;
    body.appendChild(m); scroll();
  }

  function chips(list) {
    const row = el('div','gc-qr');
    row.innerHTML = list.map(c =>
      `<button class="gc-q" onclick="genoChip('${c.replace(/'/g,"\\'")}')">${c}</button>`
    ).join('');
    body.appendChild(row); scroll();
  }

  function typing() {
    return new Promise(resolve => {
      const t = el('div','gm gm-typing');
      t.innerHTML = '<span></span><span></span><span></span>';
      body.appendChild(t); scroll();
      setTimeout(() => { t.remove(); resolve(); }, 850);
    });
  }

  function scroll() { body.scrollTop = body.scrollHeight; }
})();
