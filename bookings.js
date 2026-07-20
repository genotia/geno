/* ===========================================================================
   Genoti bookings store.

   A booking is a real commitment, so it is written to Supabase against the
   logged-in user and read back on any device. A local mirror is kept as an
   offline cache, and it is also what keeps the feature working before the
   bookings migration has been applied to the project.

   Requires auth.js (for the shared session).
     GenotiBookings.add({ dealId, merchant, offer, window, price, code, kind })
     GenotiBookings.list()      -> newest first
     GenotiBookings.cancel(id)
   =========================================================================== */
(function () {
  if (window.GenotiBookings) return;

  var TABLE = 'bookings';
  var remoteOk = true;   // flipped off if the table is not there yet

  function auth() { return window.GenotiAuth; }
  function sb() { return auth() && auth().sb; }
  function uid() {
    var u = auth() && auth().user();
    return u ? u.id : null;
  }

  /* ── Local mirror, namespaced per user so two people on one device
        never see each other's bookings. ─────────────────────────────────── */
  function key() { return 'genoti_bookings_' + (uid() || 'guest'); }

  function readLocal() {
    try { return JSON.parse(localStorage.getItem(key()) || '[]'); }
    catch (e) { return []; }
  }
  function writeLocal(list) {
    try { localStorage.setItem(key(), JSON.stringify(list)); } catch (e) {}
  }

  function normalise(r) {
    return {
      id:       r.id,
      dealId:   r.deal_id  !== undefined ? r.deal_id  : r.dealId,
      merchant: r.merchant || '',
      offer:    r.offer    || '',
      window:   r.window   !== undefined ? r.window   : r.slot,
      price:    typeof r.price === 'number' ? r.price : Number(r.price || 0),
      code:     r.code     || '',
      kind:     r.kind     || 'booked',
      status:   r.status   || 'confirmed',
      at:       r.created_at || r.at || new Date().toISOString(),
    };
  }

  /* ── Write ────────────────────────────────────────────────────────────── */
  async function add(rec) {
    var row = normalise(rec);
    if (!row.id) row.id = 'bk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

    // Mirror first so the UI is correct even if the network is slow or down.
    var list = readLocal();
    list.unshift(row);
    writeLocal(list);

    var u = uid();
    if (!u || !remoteOk || !sb()) return row;

    try {
      var res = await sb().from(TABLE).insert({
        id: row.id, user_id: u, deal_id: row.dealId, merchant: row.merchant,
        offer: row.offer, window: row.window, price: row.price,
        code: row.code, kind: row.kind, status: row.status,
      });
      if (res.error) markRemoteDown(res.error);
    } catch (e) { markRemoteDown(e); }
    return row;
  }

  function markRemoteDown(err) {
    var msg = (err && (err.message || err.code)) || '';
    // 42P01 = table missing: the migration has not been applied yet.
    if (/42P01|does not exist|schema cache|relation/i.test(String(msg))) {
      remoteOk = false;
      console.warn('[GenotiBookings] bookings table not found — using the local mirror only. ' +
                   'Apply supabase/migrations/*_bookings.sql to sync across devices.');
    } else {
      console.warn('[GenotiBookings]', msg);
    }
  }

  /* ── Read ─────────────────────────────────────────────────────────────── */
  async function list() {
    var local = readLocal();
    var u = uid();
    if (!u || !remoteOk || !sb()) return local;

    try {
      var res = await sb().from(TABLE).select('*')
        .eq('user_id', u).order('created_at', { ascending: false });
      if (res.error) { markRemoteDown(res.error); return local; }

      var remote = (res.data || []).map(normalise);

      // Push up anything that was booked while logged out or offline.
      var have = {};
      remote.forEach(function (r) { have[r.id] = true; });
      var missing = local.filter(function (r) { return !have[r.id]; });
      if (missing.length) {
        try {
          await sb().from(TABLE).insert(missing.map(function (r) {
            return { id: r.id, user_id: u, deal_id: r.dealId, merchant: r.merchant,
                     offer: r.offer, window: r.window, price: r.price,
                     code: r.code, kind: r.kind, status: r.status };
          }));
        } catch (e) {}
        remote = missing.concat(remote);
      }
      writeLocal(remote);
      return remote;
    } catch (e) { markRemoteDown(e); return local; }
  }

  async function cancel(id) {
    writeLocal(readLocal().filter(function (r) { return r.id !== id; }));
    var u = uid();
    if (!u || !remoteOk || !sb()) return;
    try {
      var res = await sb().from(TABLE).delete().eq('id', id).eq('user_id', u);
      if (res.error) markRemoteDown(res.error);
    } catch (e) { markRemoteDown(e); }
  }

  /* Bookings made before logging in belong to whoever just logged in. */
  if (window.GenotiAuth) {
    window.GenotiAuth.onChange(function (user) {
      if (!user) return;
      var guest = [];
      try { guest = JSON.parse(localStorage.getItem('genoti_bookings_guest') || '[]'); } catch (e) {}
      if (!guest.length) return;
      localStorage.removeItem('genoti_bookings_guest');
      var mine = readLocal();
      var have = {};
      mine.forEach(function (r) { have[r.id] = true; });
      writeLocal(guest.filter(function (r) { return !have[r.id]; }).concat(mine));
    });
  }

  window.GenotiBookings = { add: add, list: list, cancel: cancel, count: function () { return readLocal().length; } };
})();
