// The signed-in fan. Keeps "My tickets" in step with the server: after sign-in the fan's orders are loaded
// from the database (so they show on any device); after sign-out they are removed from this device.
import { remoteEnabled, supabaseAuth } from './remote.js';
import { syncOrders, clearOrders, getStorage } from './store.js';

export class Account {
  constructor(api = remoteEnabled() ? supabaseAuth : null, storage = getStorage()) {
    this.api = api; this.storage = storage; this.user = null; this.ready = !api; this.listeners = [];
  }
  get enabled() { return !!this.api; }
  on(fn) { this.listeners.push(fn); }
  emit() { this.listeners.forEach((f) => f()); }
  start() {
    if (!this.api) return Promise.resolve();
    return this.api.onUser(async (user) => {
      const before = this.user && this.user.id, now = user && user.id, first = !this.ready;
      this.user = user; this.ready = true;
      if (!first && before === now) return;                   // token refresh etc.: nothing changed
      if (now) await this.sync(); else if (before) clearOrders(this.storage);
      this.emit();
    }).catch(() => { this.ready = true; this.emit(); });
  }
  /** Load this fan's orders from the server into "My tickets". */
  async sync() { if (!this.api || !this.user) return; try { syncOrders(await this.api.myOrders(), this.storage); } catch { /* keep what this device has */ } }
  async signIn(email, password) { return this.api.signIn(email.trim(), password); }
  async signUp(email, password) { return this.api.signUp(email.trim(), password); }
  async signInGoogle() { return this.api.signInGoogle(); }
  async signOut() { await this.api.signOut(); }
}
