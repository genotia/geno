/* ===========================================================================
   Genoti bookings store.

   A booking is a real commitment, so it is written to the shared public
   .bookings table — the same one the merchant dashboard reads — and matched
   back to the customer by email. A local mirror is kept as an offline cache
   and holds the two details that table has no column for (price and kind).

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
      dealId:   r.deal_id !== undefined ? r.deal_id : r.dealId,
      merchant: r.merchant || r.merchant_name || '',
      offer:    r.offer    || r.deal_title    || '',
      window:   r.window   !== undefined ? r.window : (r.time_slot || ''),
      price:    typeof r.price === 'number' ? r.price : Number(r.price || 0),
      code:     r.code || r.booking_ref || '',
      kind:     r.kind   || 'booked',
      status:   r.status || 'confirmed',
      at:       r.created_at || r.at || new Date().toISOString(),
    };
  }

  /* The bookings table predates this module and is shared with the merchant
     dashboard, so we write its columns rather than our own names. It has no
     user_id, so a customer is identified by the email on the booking.
     price/kind have no column there and stay in the local mirror only. */
  function toRow(r, user) {
    var isUuid = typeof r.dealId === 'string' && /^[0-9a-f-]{36}$/i.test(r.dealId);
    return {
      booking_ref:    r.code || r.id,
      deal_id:        isUuid ? r.dealId : null,
      deal_title:     r.offer || '',
      merchant_name:  r.merchant || '',
      time_slot:      r.window || '',
      customer_name:  (user && user.user_metadata && user.user_metadata.full_name) || '',
      customer_email: (user && user.email) || '',
      booking_date:   new Date().toISOString().slice(0, 10),
      status:         'pending',
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

    var user = auth() && auth().user();
    if (!user || !remoteOk || !sb()) return row;

    try {
      var res = await sb().from(TABLE).insert(toRow(row, user));
      if (res.error) markRemoteDown(res.error);
    } catch (e) { markRemoteDown(e); }
    return row;
  }

  function markRemoteDown(err) {
    var msg = (err && (err.message || err.code)) || '';
    // 42P01 = table missing: the migration has not been applied yet.
    if (/42P01|42703|does not exist|schema cache|relation/i.test(String(msg))) {
      remoteOk = false;
      console.warn('[GenotiBookings] bookings table/column mismatch — using the local mirror only: ' + msg);
    } else {
      console.warn('[GenotiBookings]', msg);
    }
  }

  /* ── Read ─────────────────────────────────────────────────────────────── */
  async function list() {
    var local = readLocal();
    var user = auth() && auth().user();
    if (!user || !remoteOk || !sb()) return local;

    try {
      var res = await sb().from(TABLE).select('*')
        .eq('customer_email', user.email)
        .order('created_at', { ascending: false });
      if (res.error) { markRemoteDown(res.error); return local; }

      var remote = (res.data || []).map(normalise);

      /* Merge on booking_ref: the mirror holds the price and code, which the
         shared table has nowhere to store, so the local copy wins on detail. */
      var byRef = {};
      local.forEach(function (r) { byRef[r.code || r.id] = r; });
      remote = remote.map(function (r) {
        var m = byRef[r.code || r.id];
        return m ? Object.assign({}, r, { price: m.price, kind: m.kind, id: m.id }) : r;
      });

      var seen = {};
      remote.forEach(function (r) { seen[r.code || r.id] = true; });
      var missing = local.filter(function (r) { return !seen[r.code || r.id]; });
      if (missing.length) {
        try { await sb().from(TABLE).insert(missing.map(function (r) { return toRow(r, user); })); }
        catch (e) {}
        remote = missing.concat(remote);
      }
      writeLocal(remote);
      return remote;
    } catch (e) { markRemoteDown(e); return local; }
  }

  async function cancel(id) {
    var row = readLocal().filter(function (r) { return r.id === id; })[0];
    writeLocal(readLocal().filter(function (r) { return r.id !== id; }));
    var user = auth() && auth().user();
    if (!user || !remoteOk || !sb() || !row) return;
    try {
      // The merchant needs to see the cancellation, so mark it rather than delete.
      var res = await sb().from(TABLE).update({ status: 'cancelled' })
        .eq('booking_ref', row.code || row.id)
        .eq('customer_email', user.email);
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
