// Booking state: sold seats (deterministic demo data), basket, confirmed orders, LocalStorage.
import { CATEGORIES, FEES, MAX_BASKET, matchOver } from '../config.js';
import { remoteEnabled, supabaseRemote } from './remote.js';

const KEY = 'almadina.tickets.v1';

export function seatHash(i, seed) {
  let h = (Math.imul(i + 1, 2654435761) ^ Math.imul(seed, 40503)) | 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519); h = Math.imul(h ^ (h >>> 13), 3266489917);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

let shared = null;
/** One storage for the whole app: LocalStorage when the browser allows it, otherwise memory for this visit. */
export function getStorage() {
  if (shared) return shared;
  try { const st = globalThis.localStorage; st.getItem(KEY); shared = st; } catch { shared = null; }
  return (shared = shared || memoryStorage());
}
/** Every confirmed order of every match, newest first: [{ fixtureId, order }]. */
export function readAllOrders(storage = getStorage()) {
  let data = null; try { data = JSON.parse(storage.getItem(KEY) || 'null'); } catch { data = null; }
  const out = []; Object.entries((data && data.fixtures) || {}).forEach(([fixtureId, f]) => (f.orders || []).forEach((order) => out.push({ fixtureId, order })));
  return out.sort((a, b) => (a.order.time < b.order.time ? 1 : -1));
}
function readData(storage) { let d = null; try { d = JSON.parse(storage.getItem(KEY) || 'null'); } catch { d = null; } return d && d.fixtures ? d : { fixtures: {} }; }
function writeData(storage, d) { try { storage.setItem(KEY, JSON.stringify(d)); } catch { /* storage full / blocked */ } }
/** After sign-in: the server's list of the fan's orders replaces the ones kept on this device (baskets stay). */
export function syncOrders(serverOrders, storage = getStorage()) {
  const d = readData(storage);
  Object.values(d.fixtures).forEach((f) => { f.orders = []; });
  serverOrders.forEach((o) => {
    const f = (d.fixtures[o.fixture_id] = d.fixtures[o.fixture_id] || { basket: [], orders: [] });
    f.orders.push({ ref: o.ref, seats: o.seats, tickets: o.tickets && o.tickets.length ? o.tickets : null, name: o.name, email: o.email, mobile: o.mobile,
      method: o.method, count: o.seats.length, total: o.total, time: o.created_at });
  });
  Object.values(d.fixtures).forEach((f) => { f.orders.sort((a, b) => (a.time < b.time ? -1 : 1)); });
  writeData(storage, d);
}
/** After sign-out: this device no longer shows anybody's tickets. */
export function clearOrders(storage = getStorage()) { const d = readData(storage); Object.values(d.fixtures).forEach((f) => { f.orders = []; }); writeData(storage, d); }
function memoryStorage() { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } }; }

export class Store {
  /** remote: shared-booking backend ({ fetchTaken, watch, bookSeats }); null = this device only. */
  constructor(layout, fixture, storage, remote = remoteEnabled() ? supabaseRemote : null) {
    this.layout = layout; this.listeners = []; this.remote = remote; this.gen = 0; this.stopWatch = null;
    this.online = remote ? 'loading' : 'off';               // 'off' | 'loading' | 'live' | 'error'
    this.crowdDirty = false; this.lost = 0;
    this.storage = storage || getStorage();
    this.data = { fixtures: {} };
    try { const raw = this.storage.getItem(KEY); if (raw) this.data = JSON.parse(raw); } catch { /* corrupt → start clean */ }
    if (!this.data.fixtures) this.data.fixtures = {};
    this.setFixture(fixture);
  }
  on(fn) { this.listeners.push(fn); }
  emit() { this.save(); this.listeners.forEach((f) => f()); }
  save() { try { this.storage.setItem(KEY, JSON.stringify(this.data)); } catch { /* storage full / blocked */ } }

  setFixture(fx) {
    this.fixture = fx;
    if (!this.data.fixtures[fx.id]) this.data.fixtures[fx.id] = { basket: [], orders: [] };
    this.fx = this.data.fixtures[fx.id];
    const L = this.layout; this.sold = new Uint8Array(L.count);
    for (let i = 0; i < L.count; i++) {
      const cat = CATEGORIES[L.blocks[L.block[i]].cat];
      this.sold[i] = seatHash(i, fx.seed) < cat.sold ? 1 : 0;
    }
    this.mine = new Set(); this.fx.orders.forEach((o) => o.seats.forEach((s) => this.mine.add(s)));
    this.mine.forEach((s) => { this.sold[s] = 0; });
    this.fx.basket = this.fx.basket.filter((s) => s < L.count && !this.sold[s] && !this.mine.has(s));
    this.connect(fx);
  }

  /** Load the seats other people booked for this match and keep listening for new ones. */
  connect(fx) {
    if (this.stopWatch) { this.stopWatch(); this.stopWatch = null; }
    if (!this.remote) return;
    const gen = ++this.gen; this.online = 'loading';
    const mark = (s) => { if (gen === this.gen && this.markTaken(s)) { this.crowdDirty = true; this.emit(); } };
    this.remote.watch(fx.id, mark)
      .then((stop) => { if (gen === this.gen) this.stopWatch = stop; else stop(); })
      .catch(() => { /* live updates are a bonus; the list below still loads */ });
    this.remote.fetchTaken(fx.id)
      .then((seats) => { if (gen !== this.gen) return; seats.forEach((s) => this.markTaken(s)); this.online = 'live'; this.crowdDirty = true; this.emit(); })
      .catch(() => { if (gen === this.gen) { this.online = 'error'; this.emit(); } });
  }
  /** Someone else booked seat s. Returns true when that changed anything. */
  markTaken(s) {
    if (!(s >= 0 && s < this.layout.count) || this.mine.has(s) || this.sold[s]) return false;
    this.sold[s] = 1;
    if (this.fx.basket.includes(s)) { this.fx.basket = this.fx.basket.filter((x) => x !== s); this.lost++; }
    return true;
  }
  /** How many seats were taken out of the basket because someone else booked them (and reset the count). */
  takeLost() { const n = this.lost; this.lost = 0; return n; }

  /** 'sold' | 'mine' | 'basket' | 'available' */
  state(i) {
    if (this.mine.has(i)) return 'mine';
    if (this.fx.basket.includes(i)) return 'basket';
    return this.sold[i] ? 'sold' : 'available';
  }
  price(i) {
    const cat = CATEGORIES[this.layout.blocks[this.layout.block[i]].cat];
    return Math.round((cat.price * (this.fixture.priceFactor || 1)) / 250) * 250;
  }
  blockPrice(b) { return Math.round((CATEGORIES[b.cat].price * (this.fixture.priceFactor || 1)) / 250) * 250; }
  availableIn(b) {
    let n = 0;
    for (let i = b.seatStart; i < b.seatStart + b.seatCount; i++) if (!this.sold[i] && !this.mine.has(i)) n++;
    return n;
  }
  get basket() { return this.fx.basket; }
  get orders() { return this.fx.orders; }

  /** Returns 'added' | 'removed' | 'full' | 'unavailable'. */
  toggle(i) {
    const st = this.state(i);
    if (st === 'basket') { this.fx.basket = this.fx.basket.filter((s) => s !== i); this.emit(); return 'removed'; }
    if (st !== 'available') return 'unavailable';
    if (this.fx.basket.length + this.mine.size >= MAX_BASKET) return 'full';   // counts seats already booked for this match
    this.fx.basket.push(i); this.emit(); return 'added';
  }
  remove(i) { this.fx.basket = this.fx.basket.filter((s) => s !== i); this.emit(); }
  totals() {
    const subtotal = this.fx.basket.reduce((a, i) => a + this.price(i), 0);
    const fees = this.fx.basket.length ? Math.round(subtotal * FEES.rate) + FEES.perTicket * this.fx.basket.length : 0;
    return { count: this.fx.basket.length, subtotal, fees, total: subtotal + fees };
  }
  /**
   * Book the basket. Resolves to the order, or to { error: 'taken', seats } when someone was faster,
   * or { error: 'network' } when the booking server could not be reached (nothing is booked then).
   */
  async checkout({ name, email, mobile, method }) {
    if (!this.fx.basket.length) return null;
    if (matchOver(this.fixture)) return { error: 'over' };           // the page was left open past the final whistle
    const t = this.totals(), fx = this.fixture, seats = [...this.fx.basket];
    let ref, time = new Date().toISOString();
    if (this.remote) {
      let res;
      const L0 = this.layout, tickets = seats.map((i) => ({ seat: i, block: L0.blocks[L0.block[i]].id, row: L0.row[i] + 1, num: L0.num[i] + 1, price: this.price(i) }));
      try { res = await this.remote.bookSeats({ fixtureId: fx.id, seats, name, email, mobile, method, total: t.total, tickets }); } catch { return { error: 'network' }; }
      if (fx !== this.fixture) return null;                      // the user switched match while waiting
      if (res && res.login) return { error: 'login' };
      if (res && res.limit != null) return { error: 'limit', left: Math.max(0, res.limit) };
      if (!res || !res.ok) {
        const taken = (res && res.taken) || [];
        taken.forEach((s) => this.markTaken(s)); this.lost = 0; this.crowdDirty = true; this.emit();
        return { error: 'taken', seats: taken };
      }
      ref = res.ref; time = res.time || time;
    } else {
      ref = 'MAD-' + Date.now().toString(36).toUpperCase().slice(-6) + '-' + Math.floor(Math.random() * 46656).toString(36).toUpperCase().padStart(3, '0');
    }
    const L = this.layout;
    const tickets = seats.map((i) => ({ seat: i, block: L.blocks[L.block[i]].id, row: L.row[i] + 1, num: L.num[i] + 1, price: this.price(i) }));   // readable without rebuilding the stadium
    const order = { ref, seats, tickets, name, email, mobile, method, ...t, time };
    this.fx.orders.push(order); order.seats.forEach((s) => { this.mine.add(s); this.sold[s] = 0; });
    this.fx.basket = this.fx.basket.filter((s) => !this.mine.has(s)); this.emit();
    return order;
  }
  reset() {
    this.data = { fixtures: {} }; try { this.storage.removeItem(KEY); } catch { /* ignore */ }
    this.setFixture(this.fixture); this.emit();
  }
  /** Re-read orders and baskets from storage (after sign-in / sign-out) and reload the taken seats. */
  reload() { this.data = readData(this.storage); this.setFixture(this.fixture); this.crowdDirty = true; this.emit(); }
  /** Stop listening for live updates (used when the stadium is closed). */
  close() { this.gen++; if (this.stopWatch) { this.stopWatch(); this.stopWatch = null; } }
}
