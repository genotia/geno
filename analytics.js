/* ===========================================================================
   Genoti analytics.

   Records page views and product events so the admin panel has something
   real to count. Fire-and-forget: a failed write must never break a page,
   so every path swallows its errors.

     GenotiTrack.event('search', { category: 'Salon' })
     GenotiTrack.pageView()          // fired automatically on load

   Load after supabase-js. auth.js is optional — if present we reuse its
   client and stamp the logged-in user onto each event.
   =========================================================================== */
(function () {
  if (window.GenotiTrack) return;

  var SUPABASE_URL = 'https://ijsxmgkzwvamwctbkgjo.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_fQfaGCU4jLbdUSCPM-pVjQ_oqK3UxkJ';

  var client = null;
  function sb() {
    if (client) return client;
    if (window.GenotiAuth && window.GenotiAuth.sb) { client = window.GenotiAuth.sb; return client; }
    if (window.supabase && window.supabase.createClient) {
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      return client;
    }
    return null;
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  /* Stable per browser, so repeat visits count as one person. */
  function visitorId() {
    try {
      var v = localStorage.getItem('genoti_vid');
      if (!v) { v = uuid(); localStorage.setItem('genoti_vid', v); }
      return v;
    } catch (e) { return null; }
  }

  /* Resets per tab session, which is what "currently viewing" leans on. */
  function sessionId() {
    try {
      var v = sessionStorage.getItem('genoti_sid');
      if (!v) { v = uuid(); sessionStorage.setItem('genoti_sid', v); }
      return v;
    } catch (e) { return null; }
  }

  function userId() {
    var u = window.GenotiAuth && window.GenotiAuth.user();
    return u ? u.id : null;
  }

  function page() { return location.pathname.split('/').pop() || 'index.html'; }

  var queue = [];
  var flushing = false;

  async function flush() {
    if (flushing || !queue.length) return;
    var c = sb();
    if (!c) return;
    flushing = true;
    var batch = queue.splice(0, queue.length);
    try {
      var res = await c.from('events').insert(batch);
      if (res && res.error) console.debug('[GenotiTrack]', res.error.message);
    } catch (e) {
      console.debug('[GenotiTrack]', e && e.message);
    }
    flushing = false;
    if (queue.length) flush();
  }

  function event(name, props) {
    if (!name) return;
    props = props || {};
    queue.push({
      name: String(name).slice(0, 60),
      visitor_id: visitorId(),
      session_id: sessionId(),
      user_id: userId(),
      path: page(),
      category: props.category ? String(props.category).slice(0, 80) : null,
      deal_id: props.dealId || props.deal_id || props.id || null,
      merchant: props.merchant ? String(props.merchant).slice(0, 120) : null,
      meta: props.meta || props,
    });
    // Batch anything fired in the same tick, then send.
    setTimeout(flush, 40);
  }

  function pageView() { event('page_view', { title: document.title }); }

  window.GenotiTrack = { event: event, pageView: pageView, visitorId: visitorId, flush: flush };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pageView);
  else pageView();
})();
