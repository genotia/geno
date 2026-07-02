/* ═══════════════════════════════════════════════════════════
   Ask Geno AI for Businesses — Merchant Chat Widget
   Drop <script src="geno-merchant-chat.js"></script> in any
   merchant page. Self-injects styles + DOM, no dependencies.
═══════════════════════════════════════════════════════════ */
(function () {
  /* ── 1. STYLES ────────────────────────────────────────── */
  const css = `
  #gmbiz-fab{position:fixed;bottom:28px;right:28px;z-index:9000;display:flex;align-items:center;gap:14px;background:linear-gradient(135deg,#085041 0%,#0d7a5e 100%);color:#fff;border:none;border-radius:100px;padding:15px 26px 15px 14px;cursor:pointer;font-family:inherit;font-weight:800;font-size:15px;letter-spacing:-.01em;box-shadow:0 8px 32px rgba(8,80,65,.55),0 2px 10px rgba(0,0,0,.2);transition:transform .2s,box-shadow .2s}
  #gmbiz-fab:hover{transform:translateY(-3px);box-shadow:0 14px 40px rgba(8,80,65,.6),0 4px 14px rgba(0,0,0,.22)}
  #gmbiz-fab.gmbiz-hidden{display:none}
  .gmfab-av{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.18);border:2px solid rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;position:relative}
  .gmfab-av-g{font-size:20px;font-weight:800;color:#fff;line-height:1}
  .gmfab-pulse{position:absolute;top:0;right:0;width:13px;height:13px;border-radius:50%;background:#4ADE80;border:2.5px solid #085041;animation:gmbpulse 2s infinite}
  @keyframes gmbpulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.5);opacity:.6}}

  #gmbiz-chat{position:fixed;bottom:28px;right:28px;z-index:9000;width:370px;border-radius:20px;background:#fff;box-shadow:0 24px 64px rgba(0,0,0,.2),0 4px 16px rgba(0,0,0,.1);display:flex;flex-direction:column;overflow:hidden;height:560px;transform:translateY(24px) scale(.96);opacity:0;pointer-events:none;transition:transform .28s cubic-bezier(.34,1.56,.64,1),opacity .22s ease}
  #gmbiz-chat.gmbiz-open{transform:translateY(0) scale(1);opacity:1;pointer-events:all}

  .gmc-head{background:linear-gradient(135deg,#111827 0%,#1a2920 100%);padding:14px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,.06)}
  .gmc-av{width:38px;height:38px;border-radius:50%;background:#1D9E75;border:2px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .gmc-av-g{font-size:17px;font-weight:800;color:#fff;line-height:1}
  .gmc-info{flex:1;min-width:0}
  .gmc-name{font-size:13px;font-weight:700;color:#fff}
  .gmc-biz{font-size:11px;color:#9FE1CB;margin-top:1px}
  .gmc-status{font-size:10px;color:rgba(255,255,255,.4);display:flex;align-items:center;gap:4px;margin-top:2px}
  .gmc-status::before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;background:#4ADE80;flex-shrink:0}
  .gmc-close{background:rgba(255,255,255,.1);border:none;color:rgba(255,255,255,.6);width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:background .15s;flex-shrink:0}
  .gmc-close:hover{background:rgba(255,255,255,.2);color:#fff}

  .gmc-body{flex:1;overflow-y:auto;padding:14px 12px;display:flex;flex-direction:column;gap:8px;background:#F4F3F0;scroll-behavior:smooth}
  .gmc-body::-webkit-scrollbar{width:4px}.gmc-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:4px}

  .gmm{max-width:90%;padding:9px 13px;border-radius:14px;font-size:12.5px;line-height:1.6;animation:gmmIn .22s ease}
  @keyframes gmmIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
  .gmm-bot{background:#fff;color:#1A1A18;align-self:flex-start;border:1px solid rgba(0,0,0,.09);border-bottom-left-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,.06);padding:10px 13px}
  .gmm-user{background:#085041;color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
  .gmm-typing{background:#fff;border:1px solid rgba(0,0,0,.09);align-self:flex-start;padding:13px 16px;border-bottom-left-radius:4px}
  .gmm-typing span{display:inline-block;width:7px;height:7px;border-radius:50%;background:#9FE1CB;animation:gmbdot 1.2s infinite;margin:0 2px}
  .gmm-typing span:nth-child(2){animation-delay:.2s}.gmm-typing span:nth-child(3){animation-delay:.4s}
  @keyframes gmbdot{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}

  .gmc-stat-card{background:#fff;border:1px solid rgba(0,0,0,.09);border-radius:10px;padding:10px 12px;margin-top:5px;font-size:10.5px;line-height:2;color:#374151}
  .gmc-stat-card.success{border-left:3px solid #1D9E75;background:#F0FDF4}
  .gmc-stat-card.warn{border-left:3px solid #F59E0B;background:#FFFBEB}
  .gmc-stat-card.info{border-left:3px solid #3B82F6;background:#EFF6FF}
  .gmc-stat-hed{font-size:11px;font-weight:700;color:#085041;margin-bottom:5px;display:flex;align-items:center;gap:5px}

  .gmc-deal-card{background:#fff;border:1px solid rgba(0,0,0,.09);border-radius:10px;padding:10px 12px;margin-top:5px}
  .gmc-deal-card.live{border-color:#1D9E75;background:#F0FDF4}
  .gmc-deal-name{font-size:12px;font-weight:600;color:#111827;margin-bottom:2px}
  .gmc-deal-meta{font-size:10px;color:#6B7280;line-height:1.7}
  .gmc-deal-price{display:flex;align-items:baseline;gap:6px;margin:5px 0}
  .gmc-deal-now{font-size:17px;font-weight:700;color:#085041}
  .gmc-deal-was{font-size:11px;color:#9CA3AF;text-decoration:line-through}
  .gmc-deal-disc{font-size:9px;font-weight:600;background:#DCFCE7;color:#166534;padding:2px 7px;border-radius:4px}
  .gmc-deal-btns{display:flex;gap:6px;margin-top:8px}
  .gmc-deal-btn{flex:1;padding:7px 8px;border-radius:8px;font-size:10px;font-weight:600;cursor:pointer;border:none;font-family:inherit;transition:opacity .15s}
  .gmc-deal-btn.p{background:#085041;color:#fff}.gmc-deal-btn.o{background:transparent;color:#085041;border:1.5px solid #085041}.gmc-deal-btn.r{background:transparent;color:#DC2626;border:1.5px solid #DC2626}
  .gmc-deal-btn:hover{opacity:.82}

  .gmc-neg-row{font-size:10.5px;padding:4px 0;display:flex;justify-content:space-between;border-bottom:1px solid rgba(0,0,0,.06);line-height:1.7}
  .gmc-neg-row:last-child{border-bottom:none}
  .gmc-neg-row span:first-child{color:#6B7280}
  .gmc-neg-row span:last-child{font-weight:600;color:#111827}

  .gmc-demand-row{font-size:10.5px;padding:5px 0;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(0,0,0,.06)}
  .gmc-demand-row:last-child{border-bottom:none}
  .gmc-demand-svc{color:#374151;font-weight:500;flex:1}
  .gmc-demand-cnt{font-size:10px;background:#FEF3C7;color:#92400E;padding:2px 7px;border-radius:20px;font-weight:600;margin:0 6px;white-space:nowrap}
  .gmc-demand-price{color:#6B7280;font-size:10px;white-space:nowrap}

  .gmc-perf-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:5px}
  .gmc-perf-tile{background:#fff;border:1px solid rgba(0,0,0,.09);border-radius:8px;padding:8px 10px;text-align:center}
  .gmc-perf-tile.highlight{background:#F0FDF4;border-color:#1D9E75}
  .gmc-perf-val{font-size:18px;font-weight:700;color:#085041;line-height:1.1;letter-spacing:-.03em}
  .gmc-perf-lbl{font-size:9px;color:#6B7280;margin-top:2px;font-weight:500}

  .gmc-qr{display:flex;gap:6px;flex-wrap:wrap;margin-top:2px;align-self:flex-start;max-width:100%}
  .gmc-q{padding:6px 13px;border:1.5px solid rgba(0,0,0,.12);border-radius:100px;font-size:11px;color:#374151;cursor:pointer;background:#fff;font-family:inherit;transition:all .15s;white-space:nowrap}
  .gmc-q:hover{background:#F0FDF4;border-color:#1D9E75;color:#085041}

  .gmc-foot{padding:10px 12px;border-top:1px solid rgba(0,0,0,.08);background:#fff;display:flex;gap:8px;align-items:center;flex-shrink:0}
  .gmc-input{flex:1;border:1.5px solid #E5E7EB;border-radius:20px;padding:8px 14px;font-size:12px;font-family:inherit;outline:none;background:#F9FAFB;color:#111827;transition:border-color .15s}
  .gmc-input:focus{border-color:#1D9E75;background:#fff}
  .gmc-send{width:34px;height:34px;border-radius:50%;background:#085041;border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .15s}
  .gmc-send:hover{opacity:.85}

  @media(max-width:480px){
    #gmbiz-chat{width:calc(100vw - 16px);right:8px;bottom:8px;height:80vh;border-radius:16px}
    #gmbiz-fab{right:16px;bottom:16px}
  }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ── 2. DOM ───────────────────────────────────────────── */
  const tpl = `
  <button id="gmbiz-fab" onclick="gmbizOpen()">
    <div class="gmfab-av">
      <div class="gmfab-av-g">G</div>
      <div class="gmfab-pulse"></div>
    </div>
    Ask Geno AI for Businesses
  </button>
  <div id="gmbiz-chat">
    <div class="gmc-head">
      <div class="gmc-av">
        <div class="gmc-av-g">G</div>
      </div>
      <div class="gmc-info">
        <div class="gmc-name">Ask Geno AI for Businesses</div>
        <div class="gmc-biz" id="gmc-biz-name">Your merchant assistant</div>
        <div class="gmc-status" id="gmc-status">AI business intelligence · always on</div>
      </div>
      <button class="gmc-close" onclick="gmbizClose()">✕</button>
    </div>
    <div class="gmc-body" id="gmc-body"></div>
    <div class="gmc-foot">
      <input class="gmc-input" id="gmc-input" placeholder="Ask about bookings, deals, subscribers…" />
      <button class="gmc-send" onclick="gmbizSend()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
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
             : 'overview';

  const CTX = {
    dashboard: { status:'Your business intelligence · live', opener:'Good morning! ☀️ Ready for your business briefing? I\'ve pulled your latest stats and there\'s a pending negotiation waiting for you.', chips:['Today\'s briefing','View pending negotiation','Subscriber demand insights','Create a flash sale'] },
    agents:    { status:'AI workforce ready · 22+ agents',   opener:'Hey! 👋 Want to know which AI agents will have the biggest impact on your revenue? I can match them to your business type.', chips:['Which agents should I activate?','How does AI Receptionist work?','AI deal engine demo','Show revenue impact'] },
    features:  { status:'Feature intelligence · live',       opener:'Hi! 👋 Looking for a specific feature or want to see what\'s most useful for businesses like yours?', chips:['What\'s new this month?','Best features for salons','How does booking work?','AI vs manual — what\'s different?'] },
    pricing:   { status:'Plans & pricing · live',            opener:'Hi! 👋 Choosing a plan? Tell me your business type and size — I\'ll recommend the best fit and show you the ROI.', chips:['Which plan is right for me?','What\'s included in Starter?','Compare Business vs AI Pro','Calculate my ROI'] },
    types:     { status:'Business matching · live',           opener:'Hey! 👋 Tell me your business type and I\'ll show you exactly which features and AI agents are built for you.', chips:['I run a salon','I run a clinic','I run a gym / fitness studio','I run a restaurant'] },
    overview:  { status:'Your business AI · always on',      opener:'Hey! 👋 I\'m Geno, your AI assistant for business. I can help with bookings, deals, subscriber insights, and your daily performance. What would you like to do?', chips:['Today\'s briefing','Create a flash sale','View negotiations','Subscriber insights'] },
  };
  const ctx = CTX[PAGE];

  /* ── 4. STATE ────────────────────────────────────────── */
  const body  = document.getElementById('gmc-body');
  const input = document.getElementById('gmc-input');
  let started = false;

  /* ── 5. OPEN / CLOSE ─────────────────────────────────── */
  window.gmbizOpen = function () {
    document.getElementById('gmbiz-fab').classList.add('gmbiz-hidden');
    document.getElementById('gmbiz-chat').classList.add('gmbiz-open');
    document.getElementById('gmc-status').textContent = ctx.status;
    input.focus();
    if (!started) { started = true; setTimeout(startFlow, 350); }
  };
  window.gmbizClose = function () {
    document.getElementById('gmbiz-chat').classList.remove('gmbiz-open');
    document.getElementById('gmbiz-fab').classList.remove('gmbiz-hidden');
  };
  window.gmbizSend = function () {
    const txt = input.value.trim(); if (!txt) return;
    input.value = '';
    addUser(txt); flowDefault(txt);
  };
  input.addEventListener('keydown', e => { if (e.key === 'Enter') window.gmbizSend(); });

  /* ── 6. CHIP HANDLER ─────────────────────────────────── */
  window.gmbizChip = function (text) {
    addUser(text);
    const fn = FLOWS[text]; fn ? fn() : flowDefault(text);
  };

  /* ── 7. FLOWS ────────────────────────────────────────── */
  function startFlow() {
    typing().then(() => { addBot(ctx.opener); chips(ctx.chips); });
  }

  function flowBriefing() {
    typing().then(() => {
      addBot('Here\'s your Tuesday business briefing:');
      statCard(`<div class="gmc-stat-hed">📊 Yesterday\'s performance</div>
        <div class="gmc-neg-row"><span>Bookings</span><span>12 (5 from off-peak deals)</span></div>
        <div class="gmc-neg-row"><span>Revenue</span><span>₹18,400 <span style="color:#1D9E75;font-size:9px">+22% vs last Tue</span></span></div>
        <div class="gmc-neg-row"><span>New reviews</span><span>3 (avg 4.7★)</span></div>
        <div class="gmc-neg-row"><span>Subscribers</span><span>847 <span style="color:#1D9E75;font-size:9px">+18 this week</span></span></div>
        <div class="gmc-neg-row"><span>Negotiate requests</span><span>6 received → 4 accepted · 1 declined · 1 pending</span></div>`, 'success');
      chips(['View pending negotiation','What should I promote today?','Subscriber demand insights','My week so far']);
    });
  }

  function flowNegotiation() {
    typing().then(() => {
      addBot('You have 1 pending negotiation:');
      const n = el('div','gmm gmm-bot');
      n.innerHTML = `<div class="gmc-deal-card">
        <div class="gmc-deal-name">Priya M. — Deep tissue massage</div>
        <div class="gmc-neg-row"><span>Your listed price</span><span>₹699</span></div>
        <div class="gmc-neg-row"><span>Her offer</span><span style="color:#085041;font-weight:700">₹580</span></div>
        <div class="gmc-neg-row"><span>Customer profile</span><span>3 past bookings · always showed · 5★ reviewer</span></div>
        <div class="gmc-deal-meta" style="margin-top:7px;padding:6px 8px;background:#FFFBEB;border-radius:6px;color:#92400E;font-size:10px">
          💡 Geno's suggestion: accept at ₹620 — she's a loyal repeat customer worth keeping
        </div>
        <div class="gmc-deal-btns" style="margin-top:8px">
          <button class="gmc-deal-btn p" onclick="gmbizChip('Accept ₹580')">Accept ₹580</button>
          <button class="gmc-deal-btn o" onclick="gmbizChip('Counter ₹620')">Counter ₹620</button>
          <button class="gmc-deal-btn r" onclick="gmbizChip('Decline negotiation')">Decline</button>
        </div>
      </div>`;
      body.appendChild(n); scroll();
    });
  }

  function flowCounterOffer() {
    typing().then(() => {
      addBot('Done ✓ Counter-offer of ₹620 sent to Priya. I\'ll notify you the moment she responds. Her typical response time is under 30 minutes.');
      chips(['View other negotiations','Create a flash sale','Subscriber insights','Today\'s briefing']);
    });
  }

  function flowAcceptOffer() {
    typing().then(() => {
      addBot('Accepted ✓ Booking confirmed for Priya M. at ₹580. WhatsApp confirmation sent to both you and Priya. 🎉');
      chips(['View other negotiations','Create a flash sale','Subscriber insights']);
    });
  }

  function flowDecline() {
    typing().then(() => {
      addBot('Negotiation declined. Priya has been notified. Would you like me to suggest an alternative deal she might be interested in, to avoid losing her business?');
      chips(['Yes, suggest an alternative','Leave it for now']);
    });
  }

  function flowSubscriberInsights() {
    typing().then(() => {
      addBot('Here\'s what your 847 subscribers are looking for right now:');
      const s = el('div','gmm gmm-bot');
      s.innerHTML = `<div class="gmc-stat-card info">
        <div class="gmc-stat-hed">🔔 Top price alert services</div>
        <div class="gmc-demand-row"><span class="gmc-demand-svc">Hair spa + cut</span><span class="gmc-demand-cnt">142 alerts</span><span class="gmc-demand-price">avg target ₹550</span></div>
        <div class="gmc-demand-row"><span class="gmc-demand-svc">Keratin treatment</span><span class="gmc-demand-cnt">89 alerts</span><span class="gmc-demand-price">avg target ₹1,800</span></div>
        <div class="gmc-demand-row"><span class="gmc-demand-svc">Hair colour</span><span class="gmc-demand-cnt">76 alerts</span><span class="gmc-demand-price">avg target ₹900</span></div>
        <div class="gmc-demand-row"><span class="gmc-demand-svc">Facial + cleanup</span><span class="gmc-demand-cnt">63 alerts</span><span class="gmc-demand-price">avg target ₹450</span></div>
      </div>`;
      body.appendChild(s); scroll();
      setTimeout(() => {
        const t = el('div','gmm gmm-bot');
        t.innerHTML = `<div class="gmc-stat-card">
          <div class="gmc-stat-hed">📅 Peak subscriber demand times</div>
          <div class="gmc-demand-row"><span class="gmc-demand-svc">Saturday 10am–1pm</span><span class="gmc-demand-cnt">340 looking</span><span class="gmc-demand-price"></span></div>
          <div class="gmc-demand-row"><span class="gmc-demand-svc">Sunday 11am–2pm</span><span class="gmc-demand-cnt">280 looking</span><span class="gmc-demand-price"></span></div>
          <div class="gmc-demand-row"><span class="gmc-demand-svc">Weekday 3pm–6pm</span><span class="gmc-demand-cnt">190 looking</span><span class="gmc-demand-price"></span></div>
        </div>`;
        body.appendChild(t); scroll();
        addBot('You have empty weekday 3–6pm slots right now — 190 subscribers are looking for deals in that window. Want me to create a deal for them?');
        chips(['Create weekday 3–6pm deal','Show last week\'s trend','Which reviews need a reply?']);
      }, 600);
    });
  }

  function flowCreateDeal() {
    typing().then(() => {
      addBot('Based on your subscriber demand and empty slots, here\'s what I recommend:');
      const d = el('div','gmm gmm-bot');
      d.innerHTML = `<div class="gmc-deal-card">
        <div class="gmc-stat-hed" style="margin-bottom:8px">🎯 Recommended flash sale</div>
        <div class="gmc-neg-row"><span>Service</span><span style="font-weight:600">Hair spa + cut</span></div>
        <div class="gmc-neg-row"><span>Why this</span><span>142 subscriber alerts — highest demand</span></div>
        <div class="gmc-neg-row"><span>Price</span><span style="color:#085041;font-weight:700">₹499</span> <span style="font-size:9px;color:#6B7280">was ₹1,250 · 60% off</span></div>
        <div class="gmc-neg-row"><span>Why this price</span><span>Avg target is ₹550 — ₹499 guarantees high uptake</span></div>
        <div class="gmc-neg-row"><span>Time slots</span><span>Today 2pm–6pm (5 slots)</span></div>
        <div class="gmc-neg-row"><span>Why today</span><span>3 stylists available, 2–6pm slots empty</span></div>
        <div class="gmc-neg-row"><span>Expected</span><span style="color:#1D9E75;font-weight:600">3–5 bookings within 2 hrs</span></div>
      </div>`;
      body.appendChild(d); scroll();
      addBot('Want me to publish this and push to your 847 subscribers?');
      chips(['Publish this deal','Change price to ₹549','Add more slots','Different service']);
    });
  }

  function flowModifyDeal() {
    typing().then(() => {
      addBot('Updated ✓');
      const d = el('div','gmm gmm-bot');
      d.innerHTML = `<div class="gmc-deal-card">
        <div class="gmc-neg-row"><span>Service</span><span>Hair spa + cut</span></div>
        <div class="gmc-deal-price"><span class="gmc-deal-now">₹549</span><span class="gmc-deal-was">₹1,250</span><span class="gmc-deal-disc">56% off</span></div>
        <div class="gmc-neg-row"><span>Time</span><span>Today 2pm–6pm · 8 slots</span></div>
        <div class="gmc-neg-row"><span>Push to</span><span>847 subscribers</span></div>
        <div class="gmc-deal-btns" style="margin-top:8px">
          <button class="gmc-deal-btn p" onclick="gmbizChip('Publish now')">Confirm & publish</button>
          <button class="gmc-deal-btn o" onclick="gmbizChip('Schedule for 1pm')">Schedule for 1pm</button>
        </div>
      </div>`;
      body.appendChild(d); scroll();
    });
  }

  function flowPublishDeal() {
    typing().then(() => {
      const d = el('div','gmm gmm-bot');
      d.innerHTML = `<div class="gmc-deal-card live">
        <div class="gmc-stat-hed">✅ Flash sale live!</div>
        <div class="gmc-neg-row"><span>Service</span><span>Hair spa + cut · ₹549 (56% off)</span></div>
        <div class="gmc-neg-row"><span>Time</span><span>Today 2pm–6pm · 8 slots</span></div>
        <div class="gmc-neg-row"><span>Subscribers notified</span><span style="color:#1D9E75;font-weight:600">847 via WhatsApp ✓</span></div>
        <div class="gmc-deal-meta" style="margin-top:5px;color:#6B7280">I'll send you a performance update at 4pm.</div>
      </div>`;
      body.appendChild(d); scroll();
      setTimeout(() => {
        addBot('⏰ 4pm update — your flash sale is performing great!');
        setTimeout(() => {
          statCard(`<div class="gmc-stat-hed">📈 Flash sale performance — 2 hrs in</div>
            <div class="gmc-neg-row"><span>Subscribers who saw it</span><span>412 of 847 (49%)</span></div>
            <div class="gmc-neg-row"><span>Bookings</span><span style="color:#1D9E75;font-weight:600">6 of 8 slots (75% filled)</span></div>
            <div class="gmc-neg-row"><span>Revenue so far</span><span style="color:#1D9E75;font-weight:600">₹3,294</span></div>
            <div class="gmc-neg-row"><span>Via Negotiate</span><span>2 (accepted ₹520 and ₹530)</span></div>
            <div class="gmc-deal-meta" style="margin-top:6px;color:#085041;font-weight:600">2 slots remaining. Push a reminder to subscribers who viewed but didn't book?</div>`, 'success');
          chips(['Push reminder to non-bookers','Close remaining slots','Create tomorrow\'s deal','Compare to last flash sale']);
        }, 500);
      }, 1800);
    });
  }

  function flowPushReminder() {
    typing().then(() => {
      addBot('Reminder sent to 206 subscribers who viewed but didn\'t book. Based on their engagement patterns, expect 1–2 more bookings in the next hour. 👍');
      chips(['End of day summary','Create tomorrow\'s deal','View all bookings']);
    });
  }

  function flowEndOfDay() {
    typing().then(() => {
      addBot('Here\'s your end-of-day summary:');
      const perf = el('div','gmm gmm-bot');
      perf.innerHTML = `<div class="gmc-perf-grid">
        <div class="gmc-perf-tile highlight"><div class="gmc-perf-val">8/8</div><div class="gmc-perf-lbl">Slots filled</div></div>
        <div class="gmc-perf-tile highlight"><div class="gmc-perf-val">₹4,392</div><div class="gmc-perf-lbl">Flash sale revenue</div></div>
        <div class="gmc-perf-tile"><div class="gmc-perf-val">₹21,940</div><div class="gmc-perf-lbl">Total today</div></div>
        <div class="gmc-perf-tile"><div class="gmc-perf-val">+31%</div><div class="gmc-perf-lbl">vs last Tuesday</div></div>
      </div>`;
      body.appendChild(perf); scroll();
      addBot('Great day! The flash sale filled all 8 slots. Want me to pre-build tomorrow\'s deal based on Wednesday subscriber demand?');
      chips(['Create tomorrow\'s deal','View weekly trend','That\'s all for today']);
    });
  }

  function flowWeekly() {
    typing().then(() => {
      addBot('Here\'s your week so far (Mon–Tue):');
      statCard(`<div class="gmc-stat-hed">📅 Week performance (Mon–Tue)</div>
        <div class="gmc-neg-row"><span>Total bookings</span><span>24</span></div>
        <div class="gmc-neg-row"><span>Revenue</span><span style="color:#1D9E75;font-weight:600">₹38,600 <span style="font-size:9px">(+18% vs last week)</span></span></div>
        <div class="gmc-neg-row"><span>Off-peak deals booked</span><span>11 of 24 (46%)</span></div>
        <div class="gmc-neg-row"><span>New subscribers</span><span>+18</span></div>
        <div class="gmc-neg-row"><span>Negotiations</span><span>9 received · 7 accepted · 2 declined</span></div>
        <div class="gmc-neg-row"><span>Reviews</span><span>6 new · avg 4.8★</span></div>`, 'success');
      chips(['What should I focus on today?','Create a flash sale','View subscriber insights']);
    });
  }

  function flowAIAgents() {
    typing().then(() => {
      addBot('Based on businesses like yours, these 3 AI agents deliver the fastest ROI:');
      const a = el('div','gmm gmm-bot');
      a.innerHTML = `<div class="gmc-stat-card">
        <div class="gmc-stat-hed">🤖 Top AI agents for your business</div>
        <div class="gmc-demand-row"><span class="gmc-demand-svc">AI Receptionist</span><span class="gmc-demand-cnt">Live now</span><span class="gmc-demand-price">Never miss a booking</span></div>
        <div class="gmc-demand-row"><span class="gmc-demand-svc">AI Dynamic Pricing</span><span class="gmc-demand-cnt">Live now</span><span class="gmc-demand-price">+15–30% revenue</span></div>
        <div class="gmc-demand-row"><span class="gmc-demand-svc">AI Review Agent</span><span class="gmc-demand-cnt">Live now</span><span class="gmc-demand-price">Auto Google replies</span></div>
        <div class="gmc-demand-row"><span class="gmc-demand-svc">AI Campaign Manager</span><span class="gmc-demand-cnt">Coming soon</span><span class="gmc-demand-price">WhatsApp + social</span></div>
      </div>`;
      body.appendChild(a); scroll();
      chips(['How does AI Receptionist work?','Show revenue impact estimate','Activate an agent','See all 22 agents']);
    });
  }

  function flowPricingAdvice() {
    typing().then(() => {
      addBot('What type of business do you run and how many bookings per month roughly?');
      chips(['Salon / spa · under 100/month','Clinic · 100–300/month','Gym / fitness · over 300/month','Restaurant']);
    });
  }

  function flowPlanRecommendation() {
    typing().then(() => {
      addBot('Based on that, I\'d recommend the **Business plan at ₹599/month** — here\'s why:');
      statCard(`<div class="gmc-stat-hed">📋 Business plan — ₹599/month</div>
        <div class="gmc-neg-row"><span>Booking management</span><span>✓ Unlimited</span></div>
        <div class="gmc-neg-row"><span>AI agents included</span><span>✓ 5 core agents</span></div>
        <div class="gmc-neg-row"><span>Subscriber push notifications</span><span>✓ Included</span></div>
        <div class="gmc-neg-row"><span>Deal & negotiation engine</span><span>✓ Included</span></div>
        <div class="gmc-neg-row"><span>Typical ROI</span><span style="color:#1D9E75;font-weight:700">₹15,000–₹25,000/month extra revenue</span></div>`, 'success');
      addBot('At ₹599/month, you\'d need just one extra booking per week to break even. Most salons our size see 40–80 extra bookings per month from deals alone.');
      chips(['Start with Business plan','Tell me about AI Pro','What\'s in Starter?','Talk to a human']);
    });
  }

  function flowSalon() {
    typing().then(() => {
      addBot('Great — salons and spas are our biggest category! Here\'s what Genoti is built for your type of business:');
      statCard(`<div class="gmc-stat-hed">💅 Built for Salons & Spas</div>
        <div class="gmc-demand-row"><span class="gmc-demand-svc">Off-peak deal engine</span><span class="gmc-demand-cnt">Fill empty slots</span><span class="gmc-demand-price">Proven</span></div>
        <div class="gmc-demand-row"><span class="gmc-demand-svc">Stylist scheduling</span><span class="gmc-demand-cnt">AI optimised</span><span class="gmc-demand-price">Included</span></div>
        <div class="gmc-demand-row"><span class="gmc-demand-svc">Membership & packages</span><span class="gmc-demand-cnt">Recurring revenue</span><span class="gmc-demand-price">Included</span></div>
        <div class="gmc-demand-row"><span class="gmc-demand-svc">WhatsApp campaigns</span><span class="gmc-demand-cnt">Re-engagement</span><span class="gmc-demand-price">Included</span></div>
        <div class="gmc-demand-row"><span class="gmc-demand-svc">Google review automation</span><span class="gmc-demand-cnt">Build reputation</span><span class="gmc-demand-price">Included</span></div>`, 'info');
      chips(['See pricing for salons','How does deal engine work?','Talk to a salon specialist']);
    });
  }

  function flowDefault(text) {
    typing().then(() => {
      addBot(`Let me look into "${text}" for you…`);
      setTimeout(() => {
        addBot('Based on your business profile and recent data, here\'s what I recommend:');
        chips(['Today\'s briefing','Create a flash sale','Subscriber insights','View negotiations']);
      }, 700);
    });
  }

  const FLOWS = {
    'Today\'s briefing':                 flowBriefing,
    'View pending negotiation':          flowNegotiation,
    'Subscriber demand insights':        flowSubscriberInsights,
    'Subscriber insights':               flowSubscriberInsights,
    'Create a flash sale':               flowCreateDeal,
    'Create weekday 3–6pm deal':         flowCreateDeal,
    'My week so far':                    flowWeekly,
    'What should I promote today?':      flowCreateDeal,
    'Counter ₹620':                      flowCounterOffer,
    'Accept ₹580':                       flowAcceptOffer,
    'Decline negotiation':               flowDecline,
    'Publish this deal':                 flowPublishDeal,
    'Change price to ₹549':              flowModifyDeal,
    'Add more slots':                    flowModifyDeal,
    'Publish now':                       flowPublishDeal,
    'Schedule for 1pm':                  flowPublishDeal,
    'Push reminder to non-bookers':      flowPushReminder,
    'End of day summary':                flowEndOfDay,
    'Create tomorrow\'s deal':           flowCreateDeal,
    'Which agents should I activate?':   flowAIAgents,
    'Show revenue impact':               flowAIAgents,
    'AI deal engine demo':               flowCreateDeal,
    'Which plan is right for me?':       flowPricingAdvice,
    'Calculate my ROI':                  flowPricingAdvice,
    'Salon / spa · under 100/month':     flowPlanRecommendation,
    'Clinic · 100–300/month':           flowPlanRecommendation,
    'Gym / fitness · over 300/month':   flowPlanRecommendation,
    'I run a salon':                     flowSalon,
    'I run a clinic':                    flowSalon,
    'I run a gym / fitness studio':      flowSalon,
    'I run a restaurant':                flowSalon,
    'View negotiations':                 flowNegotiation,
  };

  /* ── 8. DOM HELPERS ─────────────────────────────────── */
  function el(tag, cls) {
    const e = document.createElement(tag); if (cls) e.className = cls; return e;
  }
  function addUser(text) {
    const m = el('div','gmm gmm-user'); m.textContent = text; body.appendChild(m); scroll();
  }
  function addBot(text) {
    const m = el('div','gmm gmm-bot'); m.innerHTML = text; body.appendChild(m); scroll(); return m;
  }
  function statCard(html, type='') {
    const m = el('div','gmm gmm-bot');
    m.innerHTML = `<div class="gmc-stat-card${type?' '+type:''}">${html}</div>`;
    body.appendChild(m); scroll();
  }
  function chips(list) {
    const row = el('div','gmc-qr');
    row.innerHTML = list.map(c =>
      `<button class="gmc-q" onclick="gmbizChip('${c.replace(/'/g,"\\'")}')">${c}</button>`
    ).join('');
    body.appendChild(row); scroll();
  }
  function typing() {
    return new Promise(resolve => {
      const t = el('div','gmm gmm-typing');
      t.innerHTML = '<span></span><span></span><span></span>';
      body.appendChild(t); scroll();
      setTimeout(() => { t.remove(); resolve(); }, 850);
    });
  }
  function scroll() { body.scrollTop = body.scrollHeight; }
})();
