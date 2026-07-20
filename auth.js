/* ===========================================================================
   Genoti shared authentication.

   Browsing deals is free. Anything that commits the user to something —
   booking, negotiating, voting, commenting, saving alerts, claiming a deal,
   opening a deal detail — goes through GenotiAuth.require(), which either
   runs the action straight away or opens the login modal and runs it after.
   The pending action survives the login, so nobody loses their click.

   Login is email + one-time code (the send-otp / verify-otp edge functions
   this site already uses). Once in, the user is offered a password so the
   next login is one step. The session is persisted and auto-refreshed, so it
   stays valid until the user explicitly logs out.

   Load after the supabase UMD bundle:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
     <script src="auth.js"></script>
   =========================================================================== */
(function () {
  if (window.GenotiAuth) return;

  var SUPABASE_URL = 'https://ijsxmgkzwvamwctbkgjo.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_fQfaGCU4jLbdUSCPM-pVjQ_oqK3UxkJ';
  var EDGE = SUPABASE_URL + '/functions/v1';

  if (!window.supabase || !window.supabase.createClient) {
    console.error('[GenotiAuth] supabase-js must be loaded before auth.js');
    return;
  }

  /* Default storage key on purpose: any other client on the page shares this
     session rather than fighting it. persistSession + autoRefreshToken are
     what keep the user logged in across visits until they sign out. */
  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
    },
  });

  var currentUser = null;
  var listeners = [];
  var pending = null;          // action to run once login succeeds
  var resolveReady;
  var ready = new Promise(function (r) { resolveReady = r; });
  var readyDone = false;

  /* Emails we know have a password, so returning users get the one-step
     screen instead of waiting on an email. Purely a UX hint, never a check. */
  function pwEmails() {
    try { return JSON.parse(localStorage.getItem('genoti_pw_emails') || '[]'); }
    catch (e) { return []; }
  }
  function rememberPw(email) {
    var list = pwEmails();
    if (list.indexOf(email) === -1) { list.push(email); }
    try { localStorage.setItem('genoti_pw_emails', JSON.stringify(list)); } catch (e) {}
  }
  function hasPw(email) { return pwEmails().indexOf(email) !== -1; }
  function lastEmail() { return localStorage.getItem('genoti_last_email') || ''; }

  function emit() { listeners.forEach(function (cb) { try { cb(currentUser); } catch (e) {} }); }

  sb.auth.getSession().then(function (r) {
    currentUser = (r.data && r.data.session && r.data.session.user) || null;
    readyDone = true; resolveReady(currentUser); emit();
  });
  sb.auth.onAuthStateChange(function (_e, session) {
    currentUser = (session && session.user) || null;
    if (!readyDone) { readyDone = true; resolveReady(currentUser); }
    emit();
  });

  async function callEdge(path, body) {
    var res = await fetch(EDGE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  /* ── Modal ────────────────────────────────────────────────────────────── */

  var CSS = `
  .ga-back { position: fixed; inset: 0; background: rgba(17,24,39,.55); backdrop-filter: blur(3px);
    display: none; align-items: center; justify-content: center; z-index: 100000; padding: 20px; }
  .ga-back.open { display: flex; }
  .ga-card { background: #fff; border-radius: 22px; width: 100%; max-width: 400px; padding: 28px 26px 24px;
    box-shadow: 0 24px 60px rgba(0,0,0,.28); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    position: relative; animation: gaIn .22s cubic-bezier(.16,1,.3,1); }
  @keyframes gaIn { from { opacity: 0; transform: translateY(14px) scale(.97); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) { .ga-card { animation: none; } }
  .ga-x { position: absolute; top: 14px; right: 14px; width: 30px; height: 30px; border: none; background: #F3F4F6;
    border-radius: 50%; color: #6B7280; font-size: 17px; line-height: 1; cursor: pointer; }
  .ga-x:hover { background: #E5E7EB; color: #111827; }
  .ga-ico { width: 52px; height: 52px; border-radius: 15px; background: #ECFDF5; color: #1D9E75;
    display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
  .ga-ico svg { width: 26px; height: 26px; }
  .ga-title { font-size: 19px; font-weight: 800; color: #111827; letter-spacing: -.4px; margin-bottom: 6px; }
  .ga-msg { font-size: 13.5px; color: #6B7280; line-height: 1.6; margin-bottom: 18px; }
  .ga-label { display: block; font-size: 12px; font-weight: 700; color: #374151; margin-bottom: 6px; }
  .ga-input { width: 100%; padding: 12px 14px; border: 1.5px solid #E5E7EB; border-radius: 12px; font-size: 15px;
    font-family: inherit; color: #111827; outline: none; background: #F9FAFB; box-sizing: border-box; transition: border-color .15s; }
  .ga-input:focus { border-color: #1D9E75; background: #fff; }
  .ga-input.err { border-color: #EF4444; }
  .ga-btn { width: 100%; padding: 13px; border: none; border-radius: 12px; background: #1D9E75; color: #fff;
    font-size: 14.5px; font-weight: 700; font-family: inherit; cursor: pointer; margin-top: 14px; transition: opacity .15s; }
  .ga-btn:hover { opacity: .9; }
  .ga-btn:disabled { opacity: .5; cursor: not-allowed; }
  .ga-link { display: block; width: 100%; background: none; border: none; color: #6B7280; font-size: 12.5px;
    font-weight: 600; font-family: inherit; cursor: pointer; margin-top: 12px; text-align: center; }
  .ga-link:hover { color: #1D9E75; }
  .ga-note { font-size: 11.5px; color: #9CA3AF; line-height: 1.55; margin-top: 14px; text-align: center; }
  .ga-banner { display: none; font-size: 12.5px; padding: 9px 12px; border-radius: 10px; margin-bottom: 12px; line-height: 1.5; }
  .ga-banner.show { display: block; }
  .ga-banner.error { background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; }
  .ga-banner.ok { background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; }
  .ga-otp { display: flex; gap: 7px; justify-content: space-between; }
  .ga-otp input { width: 100%; aspect-ratio: 1; text-align: center; font-size: 19px; font-weight: 700;
    border: 1.5px solid #E5E7EB; border-radius: 11px; background: #F9FAFB; color: #111827; outline: none;
    font-family: inherit; min-width: 0; }
  .ga-otp input:focus { border-color: #1D9E75; background: #fff; }
  .ga-otp input.filled { border-color: #1D9E75; background: #fff; }
  .ga-screen { display: none; }
  .ga-screen.on { display: block; }
  .ga-spin { display: inline-block; width: 13px; height: 13px; border: 2px solid rgba(255,255,255,.4);
    border-top-color: #fff; border-radius: 50%; animation: gaSpin .7s linear infinite; vertical-align: -2px; margin-right: 7px; }
  @keyframes gaSpin { to { transform: rotate(360deg); } }
  `;

  var HTML = `
  <div class="ga-card" role="dialog" aria-modal="true" aria-labelledby="ga-title">
    <button class="ga-x" type="button" data-ga="close" aria-label="Close">&times;</button>

    <div class="ga-screen on" id="ga-s-email">
      <div class="ga-ico" id="ga-icon"></div>
      <div class="ga-title" id="ga-title">Log in to continue</div>
      <div class="ga-msg" id="ga-msg">Browsing deals is free. Log in to book, negotiate and save deals.</div>
      <div class="ga-banner" id="ga-b-email"></div>
      <label class="ga-label" for="ga-email">Email</label>
      <input class="ga-input" type="email" id="ga-email" placeholder="you@example.com" autocomplete="email">
      <button class="ga-btn" type="button" data-ga="send">Continue with email</button>
      <button class="ga-link" type="button" data-ga="topw" id="ga-topw" style="display:none">I have a password — use that instead</button>
      <div class="ga-note">We email you a 6-digit code. No password needed the first time.</div>
    </div>

    <div class="ga-screen" id="ga-s-otp">
      <div class="ga-ico" data-icon="mail"></div>
      <div class="ga-title">Enter your code</div>
      <div class="ga-msg" id="ga-otp-sub">We sent a 6-digit code to your email.</div>
      <div class="ga-banner" id="ga-b-otp"></div>
      <div class="ga-otp">
        <input inputmode="numeric" maxlength="1" aria-label="Digit 1"><input inputmode="numeric" maxlength="1" aria-label="Digit 2"><input inputmode="numeric" maxlength="1" aria-label="Digit 3"><input inputmode="numeric" maxlength="1" aria-label="Digit 4"><input inputmode="numeric" maxlength="1" aria-label="Digit 5"><input inputmode="numeric" maxlength="1" aria-label="Digit 6">
      </div>
      <button class="ga-btn" type="button" data-ga="verify" disabled>Verify and continue</button>
      <button class="ga-link" type="button" data-ga="resend">Didn't get it? Resend code</button>
      <button class="ga-link" type="button" data-ga="back">Use a different email</button>
    </div>

    <div class="ga-screen" id="ga-s-pw">
      <div class="ga-ico" data-icon="key"></div>
      <div class="ga-title">Welcome back</div>
      <div class="ga-msg" id="ga-pw-sub">Enter your password to continue.</div>
      <div class="ga-banner" id="ga-b-pw"></div>
      <label class="ga-label" for="ga-pw">Password</label>
      <input class="ga-input" type="password" id="ga-pw" autocomplete="current-password">
      <button class="ga-btn" type="button" data-ga="pwlogin">Log in</button>
      <button class="ga-link" type="button" data-ga="tootp">Email me a code instead</button>
      <button class="ga-link" type="button" data-ga="back">Use a different email</button>
    </div>

    <div class="ga-screen" id="ga-s-setpw">
      <div class="ga-ico" data-icon="check"></div>
      <div class="ga-title">You're logged in</div>
      <div class="ga-msg">Set a password so next time you can log in without waiting for an email. You can skip this.</div>
      <div class="ga-banner" id="ga-b-setpw"></div>
      <label class="ga-label" for="ga-newpw">New password</label>
      <input class="ga-input" type="password" id="ga-newpw" placeholder="At least 8 characters" autocomplete="new-password">
      <button class="ga-btn" type="button" data-ga="savepw">Save password</button>
      <button class="ga-link" type="button" data-ga="skip">Skip for now</button>
    </div>
  </div>`;

  /* Named line icons so each gate looks like the site, not like emoji. */
  var svg = function (d) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
           'stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
  };
  var ICONS = {
    book:     svg('<rect x="3" y="4" width="18" height="17" rx="3"/><line x1="3" y1="9.5" x2="21" y2="9.5"/><line x1="8" y1="2.5" x2="8" y2="5.5"/><line x1="16" y1="2.5" x2="16" y2="5.5"/><polyline points="8.8 14.6 11 16.8 15.4 12.4"/>'),
    negotiate: svg('<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.5 9.5 0 0 1-2.8-.4L3 21l1.6-4.8A8.2 8.2 0 0 1 3.6 12 8.4 8.4 0 0 1 12 3.6a8.4 8.4 0 0 1 9 7.9z"/><line x1="8.5" y1="10.5" x2="15.5" y2="10.5"/><line x1="8.5" y1="14" x2="13" y2="14"/>'),
    alert:    svg('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>'),
    vote:     svg('<path d="M7 22V11"/><path d="M2.5 13.2A2 2 0 0 1 4.5 11H7l4.3-8a2.6 2.6 0 0 1 3.5 2.4V9h4.4a2 2 0 0 1 2 2.4l-1.6 8A2 2 0 0 1 17.6 21H7"/>'),
    comment:  svg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
    submit:   svg('<path d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6"/><path d="M18.4 2.6a2 2 0 0 1 2.8 2.8L12 14.6l-3.8.9.9-3.8z"/>'),
    store:    svg('<path d="M3 9.5 4.6 4.4A2 2 0 0 1 6.5 3h11a2 2 0 0 1 1.9 1.4L21 9.5"/><path d="M4 9.5h16V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M3 9.5a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/>'),
    detail:   svg('<circle cx="11" cy="11" r="7"/><line x1="20.5" y1="20.5" x2="16" y2="16"/>'),
    mail:     svg('<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><polyline points="3 6 12 13 21 6"/>'),
    key:      svg('<circle cx="7.5" cy="15.5" r="4"/><path d="M10.5 12.5 20 3"/><path d="M17 6l2.5 2.5"/>'),
    check:    svg('<circle cx="12" cy="12" r="9"/><polyline points="8.2 12.3 11 15.1 16 10"/>'),
    lock:     svg('<rect x="4" y="10.5" width="16" height="10.5" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>'),
  };

  var back, email = '', digits = [];

  function build() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    back = document.createElement('div');
    back.className = 'ga-back';
    back.id = 'ga-back';
    back.innerHTML = HTML;
    document.body.appendChild(back);

    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    back.addEventListener('click', function (e) {
      var t = e.target.closest('[data-ga]');
      if (!t) return;
      var a = t.getAttribute('data-ga');
      if (a === 'close') close();
      if (a === 'send') sendCode();
      if (a === 'verify') verify();
      if (a === 'resend') resend();
      if (a === 'back') { screen('email'); }
      if (a === 'topw') screen('pw');
      if (a === 'tootp') sendCode(true);
      if (a === 'pwlogin') pwLogin();
      if (a === 'savepw') savePw();
      if (a === 'skip') finish();
    });

    document.getElementById('ga-email').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') sendCode();
    });
    document.getElementById('ga-pw').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') pwLogin();
    });
    document.getElementById('ga-newpw').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') savePw();
    });

    back.querySelectorAll('[data-icon]').forEach(function (el) {
      el.innerHTML = ICONS[el.getAttribute('data-icon')] || '';
    });

    digits = [].slice.call(back.querySelectorAll('.ga-otp input'));
    digits.forEach(function (el, i) {
      el.oninput = function () {
        el.value = el.value.replace(/\D/g, '').slice(-1);
        el.classList.toggle('filled', !!el.value);
        if (el.value && i < 5) digits[i + 1].focus();
        vbtn().disabled = !digits.every(function (d) { return d.value; });
      };
      el.onkeydown = function (e) {
        if (e.key === 'Backspace' && !el.value && i > 0) {
          digits[i - 1].value = ''; digits[i - 1].classList.remove('filled'); digits[i - 1].focus();
        }
        if (e.key === 'Enter' && digits.every(function (d) { return d.value; })) verify();
      };
      el.onpaste = function (e) {
        var txt = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
        if (txt.length >= 6) {
          e.preventDefault();
          digits.forEach(function (d, j) { d.value = txt[j] || ''; d.classList.toggle('filled', !!d.value); });
          vbtn().disabled = false; digits[5].focus();
        }
      };
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && back.classList.contains('open')) close();
    });
  }

  function vbtn() { return back.querySelector('[data-ga="verify"]'); }

  function screen(name) {
    ['email', 'otp', 'pw', 'setpw'].forEach(function (s) {
      document.getElementById('ga-s-' + s).classList.toggle('on', s === name);
    });
    var f = { email: 'ga-email', pw: 'ga-pw', setpw: 'ga-newpw' }[name];
    if (f) setTimeout(function () { var el = document.getElementById(f); if (el) el.focus(); }, 60);
    if (name === 'otp') setTimeout(function () { digits[0] && digits[0].focus(); }, 60);
  }

  function banner(id, msg, type) {
    var b = document.getElementById(id);
    b.textContent = msg || '';
    b.className = 'ga-banner' + (msg ? ' show ' + (type || 'error') : '');
  }

  function busy(sel, on, label) {
    var b = back.querySelector('[data-ga="' + sel + '"]');
    if (!b) return;
    if (on) { b.dataset.lbl = b.textContent; b.innerHTML = '<span class="ga-spin"></span>' + label; b.disabled = true; }
    else { b.textContent = b.dataset.lbl || label; b.disabled = false; }
  }

  async function sendCode(fromPw) {
    var val = fromPw ? email : document.getElementById('ga-email').value.trim();
    var inp = document.getElementById('ga-email');
    if (!val || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      inp.classList.add('err');
      return banner('ga-b-email', 'Please enter a valid email address.');
    }
    inp.classList.remove('err');
    banner('ga-b-email', '');
    busy(fromPw ? 'tootp' : 'send', true, 'Sending…');
    var res = await callEdge('/send-otp', { email: val });
    busy(fromPw ? 'tootp' : 'send', false, 'Continue with email');
    if (res.error) return banner(fromPw ? 'ga-b-pw' : 'ga-b-email', res.error);
    email = val;
    try { localStorage.setItem('genoti_last_email', email); } catch (e) {}
    document.getElementById('ga-otp-sub').textContent = 'We sent a 6-digit code to ' + email;
    digits.forEach(function (d) { d.value = ''; d.classList.remove('filled'); });
    vbtn().disabled = true;
    banner('ga-b-otp', '');
    screen('otp');
  }

  async function resend() {
    banner('ga-b-otp', '');
    var res = await callEdge('/send-otp', { email: email });
    if (res.error) return banner('ga-b-otp', res.error);
    digits.forEach(function (d) { d.value = ''; d.classList.remove('filled'); });
    vbtn().disabled = true;
    banner('ga-b-otp', 'Code resent. Check your inbox.', 'ok');
  }

  async function verify() {
    var code = digits.map(function (d) { return d.value; }).join('');
    if (code.length < 6) return;
    busy('verify', true, 'Verifying…');
    var res = await callEdge('/verify-otp', { email: email, code: code });
    if (res.error) { busy('verify', false, 'Verify and continue'); return banner('ga-b-otp', res.error); }
    var r = await sb.auth.verifyOtp({ token_hash: res.token_hash, type: 'magiclink' });
    busy('verify', false, 'Verify and continue');
    if (r.error) return banner('ga-b-otp', r.error.message);
    currentUser = r.data.user; emit();
    /* Offer a password only if they don't already have one. */
    if (hasPw(email)) return finish();
    banner('ga-b-setpw', '');
    document.getElementById('ga-newpw').value = '';
    screen('setpw');
  }

  async function pwLogin() {
    var pw = document.getElementById('ga-pw').value;
    if (!pw) return banner('ga-b-pw', 'Please enter your password.');
    busy('pwlogin', true, 'Logging in…');
    var r = await sb.auth.signInWithPassword({ email: email, password: pw });
    busy('pwlogin', false, 'Log in');
    if (r.error) return banner('ga-b-pw', 'That password did not work. Try again, or use a code instead.');
    currentUser = r.data.user; emit();
    rememberPw(email);
    finish();
  }

  async function savePw() {
    var pw = document.getElementById('ga-newpw').value;
    if (!pw || pw.length < 8) return banner('ga-b-setpw', 'Password must be at least 8 characters.');
    busy('savepw', true, 'Saving…');
    var r = await sb.auth.updateUser({ password: pw, data: { has_password: true } });
    busy('savepw', false, 'Save password');
    if (r.error) return banner('ga-b-setpw', r.error.message);
    rememberPw(email);
    finish();
  }

  function finish() {
    close(true);
    var fn = pending; pending = null;
    if (fn) setTimeout(fn, 60);
  }

  function close(silent) {
    back.classList.remove('open');
    document.body.style.overflow = '';
    if (!silent) pending = null;
  }

  function open(opts) {
    opts = opts || {};
    var ic = document.getElementById('ga-icon');
    var art = ICONS[opts.icon || 'lock'];
    if (art) ic.innerHTML = art; else ic.textContent = opts.icon;
    document.getElementById('ga-title').textContent = opts.title || 'Log in to continue';
    document.getElementById('ga-msg').textContent = opts.msg ||
      'Browsing deals is free. Log in to book, negotiate and save deals.';
    banner('ga-b-email', ''); banner('ga-b-otp', ''); banner('ga-b-pw', ''); banner('ga-b-setpw', '');

    var remembered = lastEmail();
    document.getElementById('ga-email').value = remembered;
    document.getElementById('ga-pw').value = '';
    document.getElementById('ga-topw').style.display = remembered && hasPw(remembered) ? '' : 'none';

    if (remembered && hasPw(remembered)) {
      email = remembered;
      document.getElementById('ga-pw-sub').textContent = 'Enter the password for ' + remembered + '.';
      screen('pw');
    } else {
      screen('email');
    }

    back.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  /* ── Public API ───────────────────────────────────────────────────────── */

  /* Run fn if logged in, otherwise log the user in and then run it. */
  function require(opts, fn) {
    if (typeof opts === 'function') { fn = opts; opts = {}; }
    if (currentUser) { fn && fn(); return true; }
    pending = fn || null;
    open(opts);
    return false;
  }

  /* Wrap a function so every call is gated. Preserves arguments and `this`. */
  function gate(fn, opts) {
    return function () {
      var self = this, args = arguments;
      return require(opts, function () { return fn.apply(self, args); });
    };
  }

  /* Whole-page guard for account pages. Sends guests to login.html and
     returns them here afterwards. */
  function guardPage(opts) {
    ready.then(function (user) {
      if (user) return;
      var back = encodeURIComponent(location.pathname.split('/').pop() + location.search);
      location.replace('login.html?screen=customer&next=' + back);
    });
  }

  window.GenotiAuth = {
    sb: sb,
    ready: ready,
    user: function () { return currentUser; },
    isLoggedIn: function () { return !!currentUser; },
    require: require,
    gate: gate,
    open: open,
    close: close,
    guardPage: guardPage,
    onChange: function (cb) { listeners.push(cb); if (readyDone) cb(currentUser); },
    signOut: async function () {
      await sb.auth.signOut();
      currentUser = null; emit();
    },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
