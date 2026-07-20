/* ═══════════════════════════════════════════════════════════
   Brand deals near you
   Shared module. Add <script src="brand-deals.js"></script> to a page,
   then add a mount div and call BrandDeals.mount(...).

   An attraction layer: last minute, off-peak, flash and seasonal offers
   from branded retail (Nike, Reebok and similar). Not a Merchant OS line.

   Lifecycle: a deal is "spotted" (seen in store, unverified, never
   bookable) until the store confirms it, which makes it "confirmed" and
   bookable. That distinction is what protects the real-prices promise.

   Self-injects styles built only from existing page tokens.
   No framework, no build step, no backend.
═══════════════════════════════════════════════════════════ */
(function () {

  /* ── SETTINGS (flip these) ────────────────────────────────
     SPOTTED_SHOW_TERMS  true  = show the reported offer text, flagged unverified.
                         false = hide the terms, headline reads "Deal reported nearby".
     SPOTTED_CLAIMABLE   true  = show "Own this store? Confirm this deal".
     BRAND_DEALS_ORDER   'above' = render above Off-Peak and Last Minute in DealBox.
                         'below' = render after them.
  ───────────────────────────────────────────────────────── */
  const SPOTTED_SHOW_TERMS = true;
  const SPOTTED_CLAIMABLE  = true;
  const BRAND_DEALS_ORDER  = 'above';

  /* ── MOCK DATA ────────────────────────────────────────────
     Every read goes through getDeals(), so swapping to a live feed later
     is a one-function change.
  ───────────────────────────────────────────────────────── */
  let DEALS = [
    { id:'br1', brand:'Nike',    outlet:'Nike, Forum Mall',            mall:'forum',   offer:'40% off running shoes',        kind:'flash',       state:'confirmed', source:'merchant', endsAt:Date.now() + 2*3600*1000,  claimable:false, up:14, down:1 },
    { id:'br2', brand:'Reebok',  outlet:'Reebok, Forum Mall',          mall:'forum',   offer:'Buy 1 get 1 on training tees', kind:'last-minute', state:'confirmed', source:'merchant', endsAt:Date.now() + 5*3600*1000,  claimable:false, up:9,  down:0 },
    { id:'br3', brand:'Puma',    outlet:'Puma, Garuda Mall',           mall:'garuda',  offer:'Weekday off-peak 25% off',     kind:'off-peak',    state:'confirmed', source:'merchant', endsAt:null,                      claimable:false, up:6,  down:2 },
    { id:'br4', brand:'Adidas',  outlet:'Adidas, Forum Mall',          mall:'forum',   offer:'Flat 30% off originals',       kind:'seasonal',    state:'spotted',   source:'scan',     endsAt:Date.now() + 26*3600*1000, claimable:true,  up:5,  down:1 },
    { id:'br5', brand:'Levi\'s', outlet:'Levi\'s, Garuda Mall',        mall:'garuda',  offer:'Buy 2 get 1 free on denim',    kind:'seasonal',    state:'spotted',   source:'scan',     endsAt:null,                      claimable:true,  up:3,  down:0 },
    { id:'br6', brand:'H&M',     outlet:'H&M, Phoenix Marketcity',     mall:'phoenix', offer:'Season sale, 50% off tagged',  kind:'seasonal',    state:'confirmed', source:'merchant', endsAt:Date.now() + 30*3600*1000, claimable:false, up:11, down:2 },
    { id:'br7', brand:'Zara',    outlet:'Zara, Phoenix Marketcity',    mall:'phoenix', offer:'Extra 20% off sale items',     kind:'flash',       state:'spotted',   source:'scan',     endsAt:Date.now() + 6*3600*1000,  claimable:true,  up:7,  down:1 },
    { id:'br8', brand:'Decathlon', outlet:'Decathlon, Mantri Square',  mall:'mantri',  offer:'Off-peak 15% off weekdays',    kind:'off-peak',    state:'confirmed', source:'merchant', endsAt:null,                      claimable:false, up:4,  down:0 },
  ];

  const KIND = {
    'flash':       'Flash sale',
    'last-minute': 'Last minute',
    'off-peak':    'Off-peak',
    'seasonal':    'Seasonal',
  };

  /* Single data access seam. */
  function getDeals(filter) {
    const f = filter || {};
    return DEALS.filter(d =>
      (!f.state || d.state === f.state) &&
      (!f.mall  || d.mall  === f.mall));
  }

  /* ── STYLES ───────────────────────────────────────────────
     Page tokens win. Literal fallbacks only where a page does not define
     the token (dealbox.html lacks the green-md/lt, amber and coral set).
  ───────────────────────────────────────────────────────── */
  const css = `
  .brd-section{margin:0 0 26px}
  .brd-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:12px}
  .brd-title{font-size:15px;font-weight:700;color:var(--text)}
  .brd-sub{font-size:12px;color:var(--muted);margin-top:2px}
  .brd-seeall{font-size:13px;font-weight:600;color:var(--green);background:none;border:none;cursor:pointer;font-family:inherit;padding:0;white-space:nowrap}
  .brd-seeall:hover{text-decoration:underline}
  .brd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
  .brd-grid.brd-compact{grid-template-columns:1fr;gap:10px}

  .brd-card{background:var(--white);border:1.5px solid var(--border);border-radius:14px;padding:13px 14px;display:flex;flex-direction:column;gap:7px}
  .brd-card.brd-confirmed{border-color:var(--green-md, #A7F3D0)}
  .brd-card.brd-spotted{border-color:var(--amber-border, #FDE68A)}

  .brd-toprow{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
  .brd-badge{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:20px}
  .brd-badge.brd-b-confirmed{background:var(--green-lt, #ECFDF5);color:var(--dark-green)}
  .brd-badge.brd-b-spotted{background:var(--amber-bg, #FFFBEB);color:var(--amber, #B45309)}
  .brd-badge svg{flex-shrink:0}
  .brd-kind{font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:20px;background:var(--bg);color:var(--muted);border:1px solid var(--border)}

  .brd-brand{font-size:15px;font-weight:800;color:var(--text);line-height:1.2}
  .brd-offer{font-size:13px;color:var(--text);line-height:1.45}
  .brd-offer.brd-vague{color:var(--muted);font-style:italic}
  .brd-outlet{font-size:11.5px;color:var(--muted)}
  .brd-ends{font-size:11.5px;font-weight:700;color:var(--coral, #C2410C)}

  .brd-actions{display:flex;gap:7px;margin-top:3px;flex-wrap:wrap}
  .brd-btn{flex:1;min-width:94px;padding:9px 12px;border-radius:10px;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit;text-align:center;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;transition:opacity .15s,background .15s}
  .brd-btn-primary{background:var(--green);color:var(--white);border:none}
  .brd-btn-primary:hover{opacity:.9}
  .brd-btn-secondary{background:var(--white);color:var(--text);border:1.5px solid var(--border)}
  .brd-btn-secondary:hover{background:var(--bg);border-color:var(--text)}

  .brd-votes{display:flex;align-items:center;gap:6px;margin-top:7px;padding-top:8px;border-top:1px solid var(--border)}
  .brd-vote{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:var(--muted);background:var(--bg);border:1.5px solid var(--border);border-radius:20px;padding:4px 10px;cursor:pointer;font-family:inherit;transition:all .15s;user-select:none}
  .brd-vote svg{flex-shrink:0}
  .brd-vote.up:hover,.brd-vote.up.brd-on{color:#16a34a;border-color:#16a34a;background:#f0fdf4}
  .brd-vote.down:hover,.brd-vote.down.brd-on{color:#dc2626;border-color:#dc2626;background:#fef2f2}
  .brd-vote.brd-on{font-weight:700}
  .brd-score{font-size:10px;color:var(--muted);margin-left:auto}

  .brd-claim{background:none;border:none;padding:2px 0 0;font-family:inherit;font-size:11.5px;font-weight:600;color:var(--muted);cursor:pointer;text-align:left}
  .brd-claim u{color:var(--green);text-decoration:none;border-bottom:1px solid var(--green-md, #A7F3D0)}
  .brd-claim:hover u{border-bottom-color:var(--green)}

  .brd-modal{position:fixed;inset:0;z-index:1200;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.45)}
  .brd-modal.brd-open{display:flex}
  .brd-modal-card{background:var(--white);border-radius:16px;width:100%;max-width:400px;padding:20px;max-height:88vh;overflow-y:auto}
  .brd-modal-title{font-size:16px;font-weight:800;color:var(--text)}
  .brd-modal-note{font-size:12px;color:var(--muted);margin-top:4px;line-height:1.5}
  .brd-field{margin-top:13px}
  .brd-label{display:block;font-size:11.5px;font-weight:700;color:var(--text);margin-bottom:5px}
  .brd-input{width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13.5px;font-family:inherit;color:var(--text);background:var(--bg);outline:none}
  .brd-input:focus{border-color:var(--green);background:var(--white)}
  .brd-modal-actions{display:flex;gap:8px;margin-top:16px}
  `;

  const ICON_CHECK = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  const ICON_UP    = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><polyline points="5 12 12 5 19 12"/></svg>';
  const ICON_DOWN  = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><polyline points="19 12 12 19 5 12"/></svg>';
  const ICON_EYE   = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  function endsInLabel(ts) {
    if (!ts) return '';
    const mins = Math.round((ts - Date.now()) / 60000);
    if (mins <= 0) return '';
    if (mins < 60) return 'ends in ' + mins + 'm';
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return 'ends in ' + hrs + 'h';
    return 'ends in ' + Math.round(hrs / 24) + 'd';
  }

  function mapsHref(outlet) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(outlet);
  }

  function kindChip(d) {
    const label = KIND[d.kind];
    return label ? `<span class="brd-kind">${esc(label)}</span>` : '';
  }

  /* ── CARDS ───────────────────────────────────────────────
     One base card. The states differ only by accent colour, badge and the
     claim link. No booking action: we cannot complete a booking with the
     store yet, so we never offer one.
  ───────────────────────────────────────────────────────── */
  function actionsBlock(d) {
    return `
        <div class="brd-actions">
          <button class="brd-btn brd-btn-secondary" onclick="BrandDeals.viewInStore('${d.id}')">View in store</button>
          <a class="brd-btn brd-btn-secondary" href="${mapsHref(d.outlet)}" target="_blank" rel="noopener">Directions</a>
        </div>
        <div class="brd-votes">
          <button class="brd-vote up" onclick="BrandDeals.vote(event,'${d.id}','up')" aria-label="Upvote this deal">${ICON_UP}<span class="brd-up">${d.up || 0}</span></button>
          <button class="brd-vote down" onclick="BrandDeals.vote(event,'${d.id}','down')" aria-label="Downvote this deal">${ICON_DOWN}<span class="brd-down">${d.down || 0}</span></button>
          <span class="brd-score">${(d.up || 0) - (d.down || 0)} net</span>
        </div>`;
  }

  function confirmedCard(d) {
    const ends = endsInLabel(d.endsAt);
    return `
      <div class="brd-card brd-confirmed">
        <div class="brd-toprow">
          <span class="brd-badge brd-b-confirmed">${ICON_CHECK} Store confirmed</span>
          ${kindChip(d)}
        </div>
        <div class="brd-brand">${esc(d.brand)}</div>
        <div class="brd-offer">${esc(d.offer)}</div>
        <div class="brd-outlet">${esc(d.outlet)}</div>
        ${ends ? `<div class="brd-ends">${esc(ends)}</div>` : ''}
        ${actionsBlock(d)}
      </div>`;
  }

  /* Spotted deals are never shown as endorsed. */
  function spottedCard(d) {
    const headline = SPOTTED_SHOW_TERMS
      ? `<div class="brd-offer">${esc(d.offer)}</div>`
      : `<div class="brd-offer brd-vague">Deal reported nearby</div>`;
    const claim = (SPOTTED_CLAIMABLE && d.claimable)
      ? `<button class="brd-claim" onclick="BrandDeals.openClaim('${d.id}')">Own this store? <u>Confirm this deal</u></button>`
      : '';
    return `
      <div class="brd-card brd-spotted">
        <div class="brd-toprow">
          <span class="brd-badge brd-b-spotted">${ICON_EYE} Spotted, not confirmed</span>
          ${kindChip(d)}
        </div>
        <div class="brd-brand">${esc(d.brand)}</div>
        ${headline}
        <div class="brd-outlet">${esc(d.outlet)}</div>
        ${actionsBlock(d)}
        ${claim}
      </div>`;
  }

  function cardFor(d) { return d.state === 'confirmed' ? confirmedCard(d) : spottedCard(d); }

  /* ── MOUNTS ───────────────────────────────────────────────
     opts: { states, title, sub, compact, limit, seeAll }
     When there is nothing to show, the section is absent entirely.
  ───────────────────────────────────────────────────────── */
  const mounts = [];

  function render(mount) {
    const el = document.getElementById(mount.id);
    if (!el) return;
    const o = mount.opts;
    let list = DEALS.filter(d => o.states.indexOf(d.state) !== -1);

    // Confirmed first, so an unverified price never leads.
    list.sort((a, b) => (a.state === b.state ? 0 : a.state === 'confirmed' ? -1 : 1));

    if (!list.length) { el.innerHTML = ''; return; }

    const limit = mount.expanded ? list.length : (o.limit || list.length);
    const shown = list.slice(0, limit);
    const seeAll = (o.seeAll && list.length > shown.length)
      ? `<button class="brd-seeall" onclick="BrandDeals.expand('${mount.id}')">See all ${list.length}</button>`
      : '';

    el.innerHTML = `
      <section class="brd-section">
        <div class="brd-head">
          <div>
            <div class="brd-title">${esc(o.title || 'Brand deals near you')}</div>
            ${o.sub ? `<div class="brd-sub">${esc(o.sub)}</div>` : ''}
          </div>
          ${seeAll}
        </div>
        <div class="brd-grid${o.compact ? ' brd-compact' : ''}">${shown.map(cardFor).join('')}</div>
      </section>`;
  }

  function renderAll() { mounts.forEach(render); }

  /* Cards only, no section wrapper. For surfaces that show brand deals as a
     category, so the cards drop straight into an existing card grid. */
  function cardsHTML(opts) {
    const o = opts || {};
    const states = o.states || ['confirmed'];
    return DEALS
      .filter(d => states.indexOf(d.state) !== -1 && (!o.mall || d.mall === o.mall))
      .sort((a, b) => (a.state === b.state ? 0 : a.state === 'confirmed' ? -1 : 1))
      .map(cardFor).join('');
  }

  /* ── CLAIM AND UPGRADE ────────────────────────────────────
     Prefilled with what was reported. On submit the deal becomes store
     confirmed, so it turns bookable and appears in DealBox.
  ───────────────────────────────────────────────────────── */
  function openClaim(id) {
    const d = DEALS.find(x => x.id === id);
    if (!d) return;
    const endsLocal = d.endsAt
      ? new Date(d.endsAt - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      : '';
    const m = document.getElementById('brd-modal');
    m.innerHTML = `
      <div class="brd-modal-card" role="dialog" aria-label="Confirm this deal">
        <div class="brd-modal-title">Confirm this deal</div>
        <div class="brd-modal-note">This offer was reported at your store. Correct anything that is wrong, then confirm to make it bookable on Genoti.</div>
        <div class="brd-field">
          <label class="brd-label" for="brd-outlet">Store</label>
          <input class="brd-input" id="brd-outlet" value="${esc(d.outlet)}">
        </div>
        <div class="brd-field">
          <label class="brd-label" for="brd-offer">Offer</label>
          <input class="brd-input" id="brd-offer" value="${esc(d.offer)}">
        </div>
        <div class="brd-field">
          <label class="brd-label" for="brd-ends">Ends at</label>
          <input class="brd-input" id="brd-ends" type="datetime-local" value="${endsLocal}">
        </div>
        <div class="brd-modal-actions">
          <button class="brd-btn brd-btn-secondary" onclick="BrandDeals.closeClaim()">Cancel</button>
          <button class="brd-btn brd-btn-primary" onclick="BrandDeals.submitClaim('${d.id}')">Confirm deal</button>
        </div>
      </div>`;
    m.classList.add('brd-open');
  }

  function closeClaim() {
    const m = document.getElementById('brd-modal');
    if (m) { m.classList.remove('brd-open'); m.innerHTML = ''; }
  }

  function submitClaim(id) {
    const d = DEALS.find(x => x.id === id);
    if (!d) return;
    const outlet = document.getElementById('brd-outlet').value.trim();
    const offer  = document.getElementById('brd-offer').value.trim();
    const ends   = document.getElementById('brd-ends').value;
    if (outlet) d.outlet = outlet;
    if (offer)  d.offer  = offer;
    d.endsAt    = ends ? new Date(ends).getTime() : null;
    d.source    = 'merchant';
    d.state     = 'confirmed';
    d.claimable = false;
    closeClaim();
    renderAll();
  }

  /* One vote per deal per visitor. Updates in place, so it works no matter
     which surface injected the card. */
  const myVote = {};
  function vote(ev, id, dir) {
    if (ev) { ev.preventDefault(); ev.stopPropagation(); }
    const d = DEALS.find(x => x.id === id); if (!d) return;
    d.up = d.up || 0; d.down = d.down || 0;
    const prev = myVote[id] || null;
    if (prev === dir) { d[dir] -= 1; myVote[id] = null; }        // tapping again removes the vote
    else {
      if (prev) d[prev] -= 1;
      d[dir] += 1; myVote[id] = dir;
    }
    const card = ev && ev.target ? ev.target.closest('.brd-card') : null;
    if (!card) { renderAll(); return; }
    card.querySelector('.brd-up').textContent   = d.up;
    card.querySelector('.brd-down').textContent = d.down;
    card.querySelector('.brd-score').textContent = (d.up - d.down) + ' net';
    const up = card.querySelector('.brd-vote.up'), dn = card.querySelector('.brd-vote.down');
    up.classList.toggle('brd-on', myVote[id] === 'up');
    dn.classList.toggle('brd-on', myVote[id] === 'down');
  }

  function viewInStore(id) {
    const d = DEALS.find(x => x.id === id);
    if (d) window.open(mapsHref(d.outlet), '_blank', 'noopener');
  }

  function expand(mountId) {
    const m = mounts.find(x => x.id === mountId);
    if (m) { m.expanded = true; render(m); }
  }

  /* ── BOOT ─────────────────────────────────────────────────── */
  function boot() {
    if (!document.getElementById('brd-styles')) {
      const s = document.createElement('style');
      s.id = 'brd-styles';
      s.textContent = css;
      document.head.appendChild(s);
    }
    if (!document.getElementById('brd-modal')) {
      const m = document.createElement('div');
      m.id = 'brd-modal';
      m.className = 'brd-modal';
      m.addEventListener('click', e => { if (e.target === m) closeClaim(); });
      document.body.appendChild(m);
    }
    renderAll();
  }

  /* Voting and claiming need an account. Viewing the card, opening the map
     and reading the terms stay open to everyone. */
  const gated = (fn, opts) => function () {
    if (!window.GenotiAuth) return fn.apply(this, arguments);
    const self = this, args = arguments;
    return window.GenotiAuth.require(opts, () => fn.apply(self, args));
  };

  window.BrandDeals = {
    SPOTTED_SHOW_TERMS, SPOTTED_CLAIMABLE, BRAND_DEALS_ORDER,
    mount(id, opts) {
      mounts.push({ id, opts: opts || { states: ['confirmed'] }, expanded: false });
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
      else boot();
    },
    getDeals, renderAll, cardsHTML,
    closeClaim, submitClaim, viewInStore, expand,
    openClaim: gated(openClaim, { icon: 'store', title: 'Log in to confirm this deal', msg: 'Confirming a deal publishes it to other shoppers, so it has to come from an account.' }),
    vote:      gated(vote,      { icon: 'vote', title: 'Log in to vote',              msg: 'Votes decide what other people see, so each one has to come from an account.' }),
    _all: () => DEALS,
  };

  /* Self-boot so the styles and claim modal exist even when a surface uses
     cardsHTML() as a category and never calls mount(). boot() is idempotent. */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
