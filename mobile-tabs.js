/* ═══════════════════════════════════════════════════════
   Genoti Mobile Bottom Tab Bar
   Add <script src="mobile-tabs.js"></script> to any
   consumer page. Auto-detects active tab from pathname.
═══════════════════════════════════════════════════════ */
(function () {
  /* only render on mobile */
  if (window.innerWidth > 768) {
    window.addEventListener('resize', function () {
      if (window.innerWidth <= 768 && !document.getElementById('mob-tab-bar')) init();
    });
  }
  init();

  function init() {
    injectCSS();
    injectHTML();
  }

  /* ── detect active tab ───────────────────────────── */
  const path = location.pathname.toLowerCase();
  const ACTIVE = path.includes('negotiate')  ? 'negotiate'
               : path.includes('booking')    ? 'booking'
               : path.includes('notify')     ? 'notify'
               : path.includes('community')  ? 'community'
               : 'deals'; /* index.html default */

  /* ── CSS ─────────────────────────────────────────── */
  function injectCSS() {
    if (document.getElementById('mob-tabs-css')) return;
    const s = document.createElement('style');
    s.id = 'mob-tabs-css';
    s.textContent = `
      #mob-tab-bar{
        display:none;
        position:fixed;bottom:0;left:0;right:0;z-index:200;
        background:#fff;border-top:1px solid #E5E7EB;
        padding:8px 0 max(8px,env(safe-area-inset-bottom));
        box-shadow:0 -4px 16px rgba(0,0,0,.07);
      }
      .mtb-inner{display:flex;justify-content:space-around;align-items:flex-end}
      .mtb-tab{
        display:flex;flex-direction:column;align-items:center;gap:3px;
        padding:4px 8px;border:none;background:none;cursor:pointer;
        text-decoration:none;flex:1;-webkit-tap-highlight-color:transparent;
      }
      .mtb-icon{font-size:22px;line-height:1;transition:transform .15s}
      .mtb-label{font-size:10px;font-weight:600;color:#6B7280;letter-spacing:.1px;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
      .mtb-tab.mtb-active .mtb-label{color:#1D9E75}
      .mtb-tab.mtb-active .mtb-icon{transform:scale(1.12)}
      .mtb-tab:active .mtb-icon{transform:scale(.92)}

      @media(max-width:768px){
        #mob-tab-bar{display:block}
        body{padding-bottom:calc(72px + env(safe-area-inset-bottom)) !important}
      }
    `;
    document.head.appendChild(s);
  }

  /* ── HTML ────────────────────────────────────────── */
  const TABS = [
    { id:'deals',     href:'../index.html',      icon:'⚡', label:'Deals'     },
    { id:'negotiate', href:'../negotiate.html',  icon:'🤝', label:'Negotiate' },
    { id:'booking',   href:'../booking.html',    icon:'📅', label:'BookNow'   },
    { id:'notify',    href:'../notify.html',     icon:'🔔', label:'NotifyMe'  },
    { id:'community', href:'../dealhub.html',  icon:'👥', label:'Community' },
  ];

  /* fix hrefs for root-level pages */
  const isRoot = !path.includes('/merchant');
  if (isRoot) {
    TABS.forEach(t => { t.href = t.href.replace('../', ''); });
  }

  function injectHTML() {
    if (document.getElementById('mob-tab-bar')) return;
    const bar = document.createElement('div');
    bar.id = 'mob-tab-bar';
    bar.innerHTML = `<div class="mtb-inner">${TABS.map(t => `
      <a href="${t.href}" class="mtb-tab${t.id === ACTIVE ? ' mtb-active' : ''}">
        <span class="mtb-icon">${t.icon}</span>
        <span class="mtb-label">${t.label}</span>
      </a>`).join('')}</div>`;
    document.body.appendChild(bar);
  }
})();
