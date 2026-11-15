// Shared bookings through Supabase: which seats are taken, live updates, booking several seats at once,
// and fan accounts (sign in with email + password; each fan reads back only their own orders).
// The Supabase library is loaded from a CDN only when it is first needed, so no npm package is required.
import { SUPABASE } from '../config.js';

let clientPromise = null;

/** True when a Supabase project is filled in config.js. */
export function remoteEnabled() { return !!(SUPABASE && SUPABASE.url && SUPABASE.key); }

function client() {
  if (!clientPromise) {
    clientPromise = import(/* @vite-ignore */ SUPABASE.lib)
      .then((m) => m.createClient(SUPABASE.url, SUPABASE.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }))
      .catch((e) => { clientPromise = null; throw e; });      // let a later call try again
  }
  return clientPromise;
}

/** Every taken seat of one match, as seat numbers. */
async function fetchTaken(fixtureId) {
  const sb = await client(), out = [], page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await sb.from('booked_seats').select('seat').eq('fixture_id', fixtureId).order('seat').range(from, from + page - 1);
    if (error) throw error;
    data.forEach((r) => out.push(r.seat));
    if (data.length < page) return out;
  }
}

/** Calls onSeat(seat) every time somebody books a seat of this match. Returns a function that stops listening. */
async function watch(fixtureId, onSeat) {
  const sb = await client();
  const ch = sb.channel('seats-' + fixtureId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'booked_seats', filter: `fixture_id=eq.${fixtureId}` }, (p) => onSeat(p.new.seat))
    .subscribe();
  return () => sb.removeChannel(ch);
}

/**
 * Books all the seats or none (the fan must be signed in).
 * Resolves to { ok: true, ref, time } | { ok: false, taken: [seat…] } | { ok: false, limit: n } | { ok: false, login: true }.
 */
async function bookSeats({ fixtureId, seats, name, email, mobile, method, total, tickets }) {
  const sb = await client();
  const { data, error } = await sb.rpc('book_seats', { p_fixture: fixtureId, p_seats: seats, p_name: name, p_email: email, p_mobile: mobile, p_method: method, p_total: total, p_tickets: tickets || [] });
  if (error) {
    if (/login required|permission denied/i.test(error.message || '')) return { ok: false, login: true };
    throw error;
  }
  return data;
}

export const supabaseRemote = { fetchTaken, watch, bookSeats };

// ---- fan accounts ----------------------------------------------------------------------
/** Calls cb(user | null) now and on every sign-in / sign-out. */
async function onUser(cb) {
  const sb = await client();
  // run outside Supabase's own callback (calling Supabase from inside it can stall)
  const { data } = sb.auth.onAuthStateChange((_ev, session) => setTimeout(() => cb(session ? session.user : null), 0));
  return () => data.subscription.unsubscribe();
}
/** Resolves to { user } | { confirm: true } (an email was sent to confirm) | { error: code }. */
async function signUp(email, password) {
  const sb = await client();
  const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.href.split('#')[0] } });
  if (error) return { error: error.code || 'failed' };
  if (data.user && Array.isArray(data.user.identities) && !data.user.identities.length) return { error: 'user_already_exists' };
  return data.session ? { user: data.user } : { confirm: true };
}
async function signIn(email, password) {
  const sb = await client();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  return error ? { error: error.code || 'failed' } : { user: data.user };
}
/** Leaves the page for Google's sign-in and comes back here signed in. */
async function signInGoogle() {
  const sb = await client();
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.href.split('#')[0].split('?')[0] } });
  return error ? { error: error.code || 'failed' } : { redirect: true };
}
async function signOut() { const sb = await client(); await sb.auth.signOut(); }
/** The signed-in fan's orders, newest first. */
async function myOrders() {
  const sb = await client();
  const { data, error } = await sb.from('orders').select('ref, fixture_id, seats, tickets, name, email, mobile, method, total, created_at').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export const supabaseAuth = { onUser, signUp, signIn, signInGoogle, signOut, myOrders };
