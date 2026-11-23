import assert from 'node:assert/strict';
import { buildLayout, viewScore, blockOutline } from '../src/stadium/layout.js';
import { Store, readAllOrders, syncOrders } from '../src/booking/store.js';
import { Account } from '../src/booking/account.js';
import { FIXTURES as ALL_FX, VENUES, MATCHES, WITH_VENUE, matchOver, MAX_BASKET, FEES } from '../src/config.js';
const FIXTURES = ALL_FX.filter((f) => !matchOver(f));   // bookable fixtures (finished matches are hidden and cannot be booked)

// every venue builds a sane seating model close to its real capacity
const REAL = { madina: 30000, basra: 65227, shaab: 35700, karbala: 30000, najaf: 30000, minaa: 30000, erbil: 26500, maysan: 25000, zawraa: 15443, kirkuk: 25000, duhok: 20000, zakho: 20000, newroz: 14500, shorta: 10089 };
for (const v of VENUES) {
  const l = buildLayout(v); let n = 0; l.blocks.forEach((b) => { n += b.seatCount; assert.ok(blockOutline(b).length >= 4); });
  assert.equal(n, l.count); assert.ok(Math.abs(l.count - REAL[v.id]) / REAL[v.id] < 0.05, v.id + ' capacity ' + l.count);
  assert.equal(new Set(l.blocks.map((b) => b.cat)).size, 4, v.id + ' has 4 categories'); assert.ok(l.tone.every((x) => x < v.tones.length));
  for (let i = 0; i < l.count; i += 7) assert.ok(Number.isFinite(l.x[i] + l.y[i] + l.z[i]));
  console.log(v.id.padEnd(8), 'seats', l.count, 'blocks', l.blocks.length);
}
assert.equal(new Set(ALL_FX.map((f) => f.id)).size, ALL_FX.length);
// fixtures: only matches whose stadium exists on the site; all upcoming at the snapshot date
assert.equal(WITH_VENUE.length, 35); assert.equal(WITH_VENUE.filter((x) => x.group === 'nt').length, 1);
assert.ok(MATCHES.every((x) => !matchOver(x)), 'only matches that have not finished are listed');
// finished-match rule: 2 h 15 min after kick-off, or end of the day when no time is announced
const KO = { date: '2026-12-03T16:00:00+03:00', tbd: false }, TBD = { date: '2026-12-25T18:00:00+03:00', tbd: true };
assert.equal(matchOver(KO, Date.parse('2026-12-03T18:14:00+03:00')), false); assert.equal(matchOver(KO, Date.parse('2026-12-03T18:16:00+03:00')), true);
assert.equal(matchOver(TBD, Date.parse('2026-12-25T23:58:00+03:00')), false); assert.equal(matchOver(TBD, Date.parse('2026-12-26T00:01:00+03:00')), true);
assert.equal(matchOver({ demo: true, date: '2020-01-01T00:00:00+03:00' }), false);
WITH_VENUE.forEach((x) => { assert.ok(new Date(x.date) > new Date('2026-11-14T00:00:00+03:00')); assert.ok(x.home && x.away && x.competition.ar); assert.ok(VENUES.some((v) => v.id === x.venue)); });
console.log('matches', MATCHES.length, 'with 3D booking', MATCHES.filter((x) => x.venue).length);
const L = buildLayout(VENUES[0]);
console.log('seats:', L.count, 'blocks:', L.blocks.length);
assert.ok(L.count > 28000 && L.count < 33000, 'capacity ~30k');
assert.equal(L.blocks.length, 48);
let sum = 0; for (const b of L.blocks) { sum += b.seatCount; assert.equal(b.rowCount.reduce((a, c) => a + c, 0), b.seatCount); assert.ok(blockOutline(b).length >= 4); }
assert.equal(sum, L.count);
for (let i = 0; i < L.count; i++) { assert.ok(Number.isFinite(L.x[i] + L.y[i] + L.z[i] + L.yaw[i])); const s = viewScore(L, i); assert.ok(s >= 4 && s <= 9.9); }
// no two seats closer than 0.5 m inside a row
for (const b of L.blocks) for (let r = 0; r < b.rowCount.length; r++) for (let j = 1; j < b.rowCount[r]; j++) {
  const i = b.rowStart[r] + j; assert.ok(Math.hypot(L.x[i] - L.x[i - 1], L.z[i] - L.z[i - 1]) > 0.5);
}
const cats = {}; L.blocks.forEach((b) => { cats[b.cat] = (cats[b.cat] || 0) + b.seatCount; }); console.log(cats);
assert.equal(Object.keys(cats).length, 4);
// lettering exists on east upper tier
const east = L.blocks.filter((b) => b.tier === 'upper' && b.segName === 'east'); let white = 0;
east.forEach((b) => { for (let i = b.seatStart; i < b.seatStart + b.seatCount; i++) if (L.tone[i] === 2) white++; }); assert.ok(white > 300);
for (let r = 12; r >= 0; r--) { let line = ''; east.forEach((b) => { for (let j = 0; j < b.rowCount[r]; j += 2) line += L.tone[b.rowStart[r] + j] === 2 ? '#' : '.'; line += ' '; }); console.log(line); }

const mem = (() => { const m = {}; return { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = v; }, removeItem: (k) => { delete m[k]; } }; })();
const st = new Store(L, FIXTURES[0], mem, null);   // offline mode
const soldN = st.sold.reduce((a, c) => a + c, 0); console.log('sold share', (soldN / L.count).toFixed(2));
const free = []; for (let i = 0; i < L.count && free.length < 8; i++) if (st.state(i) === 'available') free.push(i);
const soldSeat = st.sold.findIndex((v) => v === 1);
assert.equal(st.toggle(soldSeat), 'unavailable');
for (let k = 0; k < MAX_BASKET; k++) assert.equal(st.toggle(free[k]), 'added');
assert.equal(st.toggle(free[6]), 'full');
assert.equal(st.toggle(free[0]), 'removed'); assert.equal(st.basket.length, MAX_BASKET - 1);
const t = st.totals(); assert.equal(t.fees, Math.round(t.subtotal * FEES.rate) + FEES.perTicket * (MAX_BASKET - 1)); assert.equal(t.total, t.subtotal + t.fees);
const order = await st.checkout({ name: 'Test', email: 'a@b.iq', mobile: '07700000000', method: 'zaincash' });
assert.match(order.ref, /^MAD-[A-Z0-9]+-[A-Z0-9]{3}$/); assert.equal(st.basket.length, 0); assert.equal(st.state(free[1]), 'mine');
assert.equal(order.tickets.length, MAX_BASKET - 1);
// already booked seats count towards the limit: one seat left for this match
assert.equal(st.toggle(free[6]), 'added'); assert.equal(st.toggle(free[7]), 'full'); st.remove(free[6]); assert.ok(order.tickets.every((k) => k.block && k.row >= 1 && k.num >= 1 && k.price > 0));
const all = readAllOrders(mem); assert.equal(all.length, 1); assert.equal(all[0].fixtureId, FIXTURES[0].id); assert.equal(all[0].order.ref, order.ref);
const st2 = new Store(L, FIXTURES[0], mem, null); assert.equal(st2.state(free[1]), 'mine'); assert.equal(st2.orders.length, 1);   // persistence
st2.setFixture(FIXTURES[1]); assert.equal(st2.orders.length, 0);
st2.setFixture(FIXTURES[0]); st2.reset(); assert.equal(st2.orders.length, 0); assert.notEqual(st2.state(free[1]), 'mine');
assert.equal(readAllOrders(mem).length, 0);

// ---- shared bookings through a fake server that behaves like book_seats() in the database ----
function fakeServer() {
  const taken = {}, watchers = {}; let up = true;
  const set = (f) => (taken[f] = taken[f] || new Set());
  return {
    down() { up = false; }, up() { up = true; },
    someoneBooks(f, seats) { seats.forEach((s) => set(f).add(s)); (watchers[f] || []).forEach((cb) => seats.forEach(cb)); },
    remote: {
      async fetchTaken(f) { if (!up) throw new Error('offline'); return [...set(f)]; },
      async watch(f, cb) { (watchers[f] = watchers[f] || []).push(cb); return () => { watchers[f] = watchers[f].filter((x) => x !== cb); }; },
      async bookSeats({ fixtureId, seats }) {
        if (!up) throw new Error('offline');
        const clash = seats.filter((s) => set(fixtureId).has(s)); if (clash.length) return { ok: false, taken: clash };
        this.lastBooked = seats; seats.forEach((s) => set(fixtureId).add(s)); (watchers[fixtureId] || []).forEach((cb) => seats.forEach(cb));
        return { ok: true, ref: 'MAD-SRV001-ABC', time: '2026-11-15T12:00:00Z' };
      },
    },
  };
}
const tick = () => new Promise((r) => setTimeout(r, 0));
const memB = (() => { const m = {}; return { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = v; }, removeItem: (k) => { delete m[k]; } }; })();
const memC = (() => { const m = {}; return { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = v; }, removeItem: (k) => { delete m[k]; } }; })();
const srv = fakeServer(), FX = FIXTURES[0];
const fr = []; { const probe = new Store(L, FX, memB, null); for (let i = 0; i < L.count && fr.length < 12; i++) if (probe.state(i) === 'available') fr.push(i); }
srv.someoneBooks(FX.id, [fr[0]]);                                    // booked before the page opened
const A = new Store(L, FX, memB, srv.remote), B = new Store(L, FX, memC, srv.remote); await tick();
assert.equal(A.online, 'live'); assert.equal(A.state(fr[0]), 'sold', 'earlier booking shows as sold');
assert.equal(A.toggle(fr[0]), 'unavailable');
// A books two seats → B sees them sold at once (live update)
A.toggle(fr[1]); A.toggle(fr[2]); B.toggle(fr[2]); B.toggle(fr[3]);
let crowd = 0; B.on(() => { if (B.crowdDirty) { B.crowdDirty = false; crowd++; } });
const oa = await A.checkout({ name: 'Ali', email: 'a@b.iq', mobile: '07700000000', method: 'zaincash' });
assert.equal(oa.ref, 'MAD-SRV001-ABC'); assert.equal(A.state(fr[1]), 'mine'); assert.equal(A.state(fr[2]), 'mine');
assert.equal(B.state(fr[1]), 'sold'); assert.equal(B.state(fr[2]), 'sold'); assert.ok(crowd > 0, 'crowd redrawn');
assert.deepEqual(B.basket, [fr[3]], 'seat booked by A left B\'s basket'); assert.equal(B.takeLost(), 1); assert.equal(B.takeLost(), 0);
// two people press "confirm" for the same seat: the server lets only one through
const C = new Store(L, FX, memC, null); C.remote = srv.remote;      // C still thinks fr[4] is free (no live update)
B.toggle(fr[4]); C.fx.basket = [fr[4], fr[5]];
const ob = await B.checkout({ name: 'Bassim', email: 'b@b.iq', mobile: '07700000001', method: 'card' }); assert.ok(ob.ref);
const oc = await C.checkout({ name: 'Ceylan', email: 'c@b.iq', mobile: '07700000002', method: 'qicard' });
assert.equal(oc.error, 'taken'); assert.deepEqual(oc.seats, [fr[4]]); assert.deepEqual(C.basket, [fr[5]], 'only the lost seat leaves the basket');
assert.equal(C.state(fr[4]), 'sold'); assert.equal(C.orders.length, 0, 'nothing booked for C');
// server unreachable → nothing booked, basket kept
srv.down(); const before = [...C.basket];
const od = await C.checkout({ name: 'Ceylan', email: 'c@b.iq', mobile: '07700000002', method: 'qicard' });
assert.equal(od.error, 'network'); assert.deepEqual(C.basket, before); assert.equal(C.orders.length, 0);
const D = new Store(L, FX, memB, srv.remote); await tick(); assert.equal(D.online, 'error'); srv.up();
// my own bookings stay "mine" after reload, not "sold"
const A2 = new Store(L, FX, memB, srv.remote); await tick(); assert.equal(A2.state(fr[1]), 'mine'); assert.equal(A2.state(fr[4]), 'sold');
// switching match stops the old live updates
A2.setFixture(FIXTURES[1]); await tick(); srv.someoneBooks(FX.id, [fr[6]]); assert.equal(A2.fixture.id, FIXTURES[1].id);
A2.setFixture(FX); await tick(); assert.equal(A2.state(fr[6]), 'sold');
A.close(); B.close(); A2.close();
console.log('shared booking tests passed');

// ---- fan accounts ----
// server says "sign in first" / "limit reached"
const E = new Store(L, FX, memC, { fetchTaken: async () => [], watch: async () => () => {}, bookSeats: async () => ({ ok: false, login: true }) }); await tick();
E.fx.basket = [fr[7]];
assert.equal((await E.checkout({ name: 'Ali', email: 'a@b.iq', mobile: '07700000000', method: 'card' })).error, 'login'); assert.deepEqual(E.basket, [fr[7]], 'basket kept');
E.remote = { ...E.remote, bookSeats: async () => ({ ok: false, limit: 2 }) };
const lim = await E.checkout({ name: 'Ali', email: 'a@b.iq', mobile: '07700000000', method: 'card' }); assert.equal(lim.error, 'limit'); assert.equal(lim.left, 2); E.close();
// tickets travel with the booking so another device can show block / row / seat
let sent = null; const F = new Store(L, FX, memC, { fetchTaken: async () => [], watch: async () => () => {}, bookSeats: async (x) => { sent = x; return { ok: true, ref: 'MAD-X', time: 't' }; } }); await tick();
F.fx.basket = [fr[8]]; await F.checkout({ name: 'Ali', email: 'a@b.iq', mobile: '07700000000', method: 'card' });
assert.equal(sent.tickets.length, 1); assert.equal(sent.tickets[0].seat, fr[8]); assert.ok(sent.tickets[0].block && sent.tickets[0].row >= 1); F.close();
// sign in on a new device → orders come from the server; sign out → they leave this device
const memD = (() => { const m = {}; return { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = v; }, removeItem: (k) => { delete m[k]; } }; })();
let userCb = null; const serverOrders = [{ ref: 'MAD-AAA', fixture_id: FX.id, seats: [fr[9]], tickets: [{ seat: fr[9], block: 'A1', row: 3, num: 4, price: 10000 }], name: 'Ali', email: 'a@b.iq', mobile: '077', method: 'card', total: 12000, created_at: '2026-11-15T10:00:00Z' }];
const api = { onUser: async (cb) => { userCb = cb; cb(null); return () => {}; }, myOrders: async () => serverOrders, signIn: async () => ({ user: { id: 'u1' } }), signUp: async () => ({ confirm: true }), signOut: async () => userCb(null) };
const acc = new Account(api, memD); let changes = 0; acc.on(() => changes++); await acc.start(); await tick();
assert.equal(acc.ready, true); assert.equal(acc.user, null); assert.equal(readAllOrders(memD).length, 0);
await userCb({ id: 'u1', email: 'a@b.iq' }); assert.equal(readAllOrders(memD).length, 1); assert.equal(readAllOrders(memD)[0].order.ref, 'MAD-AAA');
const G = new Store(L, FX, memD, null); assert.equal(G.state(fr[9]), 'mine', 'synced seat is mine on the new device');
const n0 = changes; await userCb({ id: 'u1', email: 'a@b.iq' }); assert.equal(changes, n0, 'token refresh does not reload');
G.toggle(fr[10]); await api.signOut(); assert.equal(readAllOrders(memD).length, 0, 'signed out: no tickets on this device');
G.reload(); assert.notEqual(G.state(fr[9]), 'mine'); assert.deepEqual(G.basket, [fr[10]], 'basket survives sign-out');
console.log('account tests passed');
console.log('ALL LOGIC TESTS PASSED');
