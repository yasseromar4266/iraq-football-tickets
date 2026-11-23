// DOM interface: top bar, breadcrumbs, legend, minimap + compass, context panel, booking drawer, tickets.
import { SUPABASE, CATEGORIES, CURRENCY, VENUES, MATCHES, FIXTURES, matchOver, PAYMENT_METHODS, FEES, MAX_BASKET } from '../config.js';
import { STAND_NAMES, blockOutline, viewScore } from '../stadium/layout.js';
import { seatHash, readAllOrders } from '../booking/store.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ICON = {
  basket: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9h14l-1.4 9.2a2 2 0 0 1-2 1.8H8.4a2 2 0 0 1-2-1.8L5 9z"/><path d="M9 9l3-5 3 5"/></svg>',
  soundOn: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
  soundOff: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
  close: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};

/** Original club badge (shield in the club's colours with its initial) — not the club's official crest. */
function badge(club, lang, size = 26) {
  if (club.logo) { const s2 = size + 6; return `<img class="badge" src="./${esc(club.logo)}" alt="" width="${s2}" height="${s2}" style="object-fit:contain">`; }
  const hex = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const [r, g, b] = hex(club.kit), dark = 0.299 * r + 0.587 * g + 0.114 * b < 150, ink = dark ? '#ffffff' : '#14161f';
  const label = lang === 'ar' ? club.name.ar.replace(/^ال/, '').trim()[0] : club.short;
  return `<svg class="badge" viewBox="0 0 40 46" width="${size}" height="${Math.round(size * 1.15)}" aria-hidden="true">
    <path d="M20 2 37 7v15c0 11-7 18-17 22C10 40 3 33 3 22V7z" fill="${club.kit}" stroke="${dark ? 'rgba(255,255,255,.75)' : 'rgba(20,22,31,.8)'}" stroke-width="2.2"/>
    <path d="M5.2 10.5 20 6.2l14.8 4.3v3.4L20 9.6 5.2 13.9z" fill="${club.shorts === club.kit ? ink : club.shorts}" opacity=".85"/>
    <text x="20" y="${lang === 'ar' ? 32 : 30}" text-anchor="middle" font-size="${lang === 'ar' ? 19 : 11}" font-weight="800" fill="${ink}" font-family="Segoe UI, Tahoma, Arial, sans-serif">${label}</text></svg>`;
}

// Google's "G" mark, used as-is on sign-in buttons per Google's branding guidelines
const GOOGLE_G = '<svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.8-5.8l-7.4-5.7c-2.1 1.4-4.8 2.2-8.4 2.2-6.2 0-11.5-4.1-13.4-9.7l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>';
const AUTH_ERRORS = {
  invalid_credentials: 'errLogin', user_already_exists: 'errExists', email_exists: 'errExists', email_not_confirmed: 'errNotConfirmed',
  weak_password: 'passHint', over_email_send_rate_limit: 'errTooMany', over_request_rate_limit: 'errTooMany', email_address_invalid: 'errEmail',
  validation_failed: 'errEmail', network: 'netError',
};

export class UI {
  constructor(app) {
    this.app = app; this.drawerMode = null; this.lastOrder = null; this.form = { name: '', email: '', mobile: '', method: 'zaincash' }; this.resetArmed = false;
    this.auth = { mode: 'in', email: '', pass: '', busy: false, msg: null, err: null };
    this.mini = $('mini'); this.mctx = this.mini.getContext('2d'); if (app.venue) this.setLayout();
    $('basketBtn').addEventListener('click', () => this.openDrawer('basket'));
    $('venuesBtn').addEventListener('click', () => this.showHome());
    ['soundBtn', 'soundBtn2'].forEach((id) => $(id).addEventListener('click', (e) => { e.stopPropagation(); app.toggleSound(); }));
    $('venueList').addEventListener('click', (e) => { const c = e.target.closest('[data-venue]'); if (c) app.openVenue(c.dataset.venue); });
    $('matchList').addEventListener('click', (e) => { const c = e.target.closest('[data-match]'); if (c) { const mt = MATCHES.find((x) => x.id === c.dataset.match); if (mt && mt.venue) app.openFixture(mt.venue, mt.id); } });
    $('homeTabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) { this.homeTab = b.dataset.tab; this.renderHome(); } });
    this.homeTab = 'matches';
    $('ticketList').addEventListener('click', (e) => { if (e.target.closest('[data-goto=matches]')) { this.homeTab = 'matches'; this.renderHome(); } });
    $('drawer').addEventListener('click', (e) => this.authClick(e));
    ['langBtn', 'langBtn2', 'langBtn3'].forEach((id) => $(id).addEventListener('click', () => app.setLang(app.lang === 'ar' ? 'en' : 'ar')));
    $('enterBtn').addEventListener('click', () => $('intro').classList.add('hide'));
    $('panel').addEventListener('change', (e) => { if (e.target.name === 'venue') app.openVenue(e.target.value); else if (e.target.name === 'fixture') app.setFixture(e.target.value); });
    $('backdrop').addEventListener('click', () => this.closeDrawer());
    $('legendToggle').addEventListener('click', () => $('legend').classList.toggle('open'));
    this.mini.addEventListener('click', (e) => this.miniClick(e));
    $('panel').addEventListener('click', (e) => this.panelClick(e));
    $('drawer').addEventListener('click', (e) => this.drawerClick(e));
    $('drawer').addEventListener('submit', (e) => { e.preventDefault(); if (e.target.classList.contains('authf')) this.submitAuth(); else this.submitCheckout(); });
    $('drawer').addEventListener('input', (e) => { if (!this.authInput(e) && e.target.name && e.target.name in this.form) this.form[e.target.name] = e.target.value; });
    $('ticketList').addEventListener('submit', (e) => { e.preventDefault(); this.submitAuth(); });
    $('ticketList').addEventListener('input', (e) => this.authInput(e));
    $('ticketList').addEventListener('click', (e) => this.authClick(e));
    $('crumbs').addEventListener('click', (e) => { const a = e.target.closest('[data-go]'); if (!a) return; if (a.dataset.go === 'stadium') app.goStadium(); else if (a.dataset.go === 'block') app.backToBlock(); });
    this.renderHome(); this.renderSound(); this.renderAll();
  }
  renderSound() { const on = this.app.music.on; ['soundBtn', 'soundBtn2'].forEach((id) => { const b = $(id); b.innerHTML = on ? ICON.soundOn : ICON.soundOff; b.classList.toggle('on', on); b.title = this.t('sound'); }); }
  /** Called whenever the venue changes: cache block outlines and the minimap scale. */
  setLayout() {
    const a = this.app, v = a.venue; this.outlines = a.layout.blocks.map((b) => blockOutline(b));
    this.ex = v.cx + v.r0 + v.back + 3; this.ez = v.cz + v.r0 + v.back + 3;
    this.ms = Math.min(this.mini.width / (2 * this.ex), this.mini.height / (2 * this.ez));
  }
  t(k) { return this.app.t(k); }
  money(n) { return `${new Intl.NumberFormat('en-US').format(n)} ${CURRENCY[this.app.lang]}`; }
  blockName(b) { return `${STAND_NAMES[b.segName][this.app.lang]} · ${this.t('block')} ${b.id}`; }
  seatLabel(i) { const L = this.app.layout; return `${this.t('block')} ${L.blocks[L.block[i]].id} · ${this.t('row')} ${L.row[i] + 1} · ${this.t('seatNo')} ${L.num[i] + 1}`; }

  renderAll() { if (!this.app.venue) return; this.renderTop(); this.renderCrumbs(); this.renderLegend(); this.renderPanel(); if (this.drawerMode) this.renderDrawer(); }

  when(fx, long) {
    const lang = this.app.lang, d = new Date(fx.date);
    const o = { weekday: long ? 'long' : 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Baghdad' }; if (!fx.tbd) { o.hour = '2-digit'; o.minute = '2-digit'; }
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-IQ-u-nu-latn' : 'en-GB', o).format(d);
  }
  /** Kick-off time split into the big number and the small am/pm word. */
  clock(fx) {
    if (fx.tbd) return { hm: '', period: this.t('tbdShort') };
    const parts = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Baghdad' }).formatToParts(new Date(fx.date));
    const get = (k) => (parts.find((x) => x.type === k) || {}).value || '';
    return { hm: `${get('hour')}:${get('minute')}`, period: this.t(/p/i.test(get('dayPeriod')) ? 'pm' : 'am') };
  }
  dayLabel(fx) {
    return new Intl.DateTimeFormat(this.app.lang === 'ar' ? 'ar-IQ-u-nu-latn' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Baghdad' }).format(new Date(fx.date));
  }
  fixtureRow(mt) {
    const lang = this.app.lang, v = VENUES.find((x) => x.id === mt.venue), c = this.clock(mt);
    return `<button class="fx mrow" data-match="${mt.id}">
      <span class="fx-side">${badge(mt.home, lang, 40)}<b>${esc(mt.home.name[lang])}</b></span>
      <span class="fx-mid">${c.hm ? `<b class="fx-time">${c.hm}</b>` : ''}<small>${c.period}</small></span>
      <span class="fx-side">${badge(mt.away, lang, 40)}<b>${esc(mt.away.name[lang])}</b></span>
      <span class="fx-foot"><span class="fx-place">${esc(v.name[lang])}</span><span class="fx-round">${mt.group === 'nt' ? this.t('nt') : `${this.t('round')} ${mt.round}`}</span><span class="fx-cta">${this.t('book')}</span></span></button>`;
  }
  /** Entrance screen + menu (matches by day, stadiums). Nothing is entered until the user picks one. */
  renderHome() {
    const a = this.app, lang = a.lang, tab = this.homeTab || 'matches';
    document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    const other = lang === 'ar' ? 'English' : 'العربية'; ['langBtn2', 'langBtn3'].forEach((id) => { $(id).textContent = other; });
    // entrance
    $('introKicker').textContent = this.t('introKicker'); $('introTitle').textContent = this.t('introTitle'); $('introSub').textContent = this.t('introSub'); $('enterBtn').textContent = this.t('enterSite');
    const now = Date.now(), next = MATCHES.filter((mt) => !matchOver(mt)).sort((x, y) => new Date(x.date) - new Date(y.date)).find((x) => new Date(x.date).getTime() > now - 3 * 3600e3) || MATCHES[0];
    const days = Math.round((new Date(next.date.slice(0, 10)) - new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Baghdad' }))) / 864e5);
    const soon = days <= 0 ? this.t('today') : days === 1 ? this.t('tomorrow') : this.t('inDays').replace('{n}', days);
    const nc = this.clock(next);
    $('introNext').innerHTML = `<small>${this.t('nextMatch')}، ${soon}</small><div class="nx">${badge(next.home, lang, 34)}<b>${esc(next.home.name[lang])}</b><i>${nc.hm || '×'}</i><b>${esc(next.away.name[lang])}</b>${badge(next.away, lang, 34)}</div><small>${this.dayLabel(next)}</small>`;
    // menu
    $('homeTitle').textContent = this.t('homeTitle'); $('homeSub').textContent = this.t('homeSub'); $('venuesBtn').textContent = this.t('menu'); $('homeNote').textContent = this.t('homeNote');
    const orders = readAllOrders(), nTickets = orders.reduce((n, o) => n + o.order.seats.length, 0);
    $('homeTabs').innerHTML = [['matches', this.t('matches')], ['venues', this.t('venues')], ['tickets', this.t('myTickets') + (nTickets ? ` (${nTickets})` : '')]].map(([k, label]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${label}</button>`).join('');
    $('matchList').style.display = tab === 'matches' ? '' : 'none'; $('venueList').style.display = tab === 'venues' ? '' : 'none'; $('ticketList').style.display = tab === 'tickets' ? '' : 'none';
    this.renderTickets(orders);
    const days2 = []; MATCHES.filter((mt) => !matchOver(mt)).sort((x, y) => new Date(x.date) - new Date(y.date)).forEach((mt) => { const k = mt.date.slice(0, 10); let g = days2.find((x) => x.key === k); if (!g) { g = { key: k, items: [] }; days2.push(g); } g.items.push(mt); });
    $('matchList').innerHTML = days2.map((g) => `<section><h2>${this.dayLabel(g.items[0])}</h2>${g.items.map((mt) => this.fixtureRow(mt)).join('')}</section>`).join('');
    $('venueList').innerHTML = VENUES.map((v) => { const f = v.fixtures[0]; return `<button class="vcard" data-venue="${v.id}">
      <span class="vtones">${v.tones.slice(0, 3).map((c) => `<i style="background:${c}"></i>`).join('')}</span>
      <span class="vmain"><b>${esc(v.name[lang])}</b><small>${esc(v.sub[lang])}</small>
      <span class="vfacts"><span>${v.seats.toLocaleString('en-US')} ${this.t('seats')}</span><span>${this.t(v.track ? 'withTrack' : 'football')}</span></span>
      <em>${f.demo ? esc(f.competition[lang]) : `${esc(f.home.name[lang])} × ${esc(f.away.name[lang])}`}</em></span><span class="vgo">${this.t('enter')}</span></button>`; }).join('');
  }
  /** "My tickets" tab: every booking the visitor made, for all matches and stadiums. */
  renderTickets(orders) {
    const lang = this.app.lang, box = $('ticketList'), acc = this.app.account;
    let top = '';
    if (acc.enabled && acc.ready && acc.user) top = `<div class="acct"><span>${this.t('signedInAs')} <b dir="ltr">${esc(acc.user.email)}</b></span><button class="btn link" data-auth="out">${this.t('signOut')}</button></div>`;
    else if (acc.enabled && acc.ready) { box.innerHTML = `<div class="acct-box"><p>${this.t('signInTickets')}</p>${this.authHtml()}</div>`; return; }
    if (!orders.length) { box.innerHTML = top + `<div class="tk-empty"><p>${this.t('noTickets')}</p><button class="tk-btn" data-goto="matches">${this.t('browseMatches')}</button></div>`; return; }
    box.innerHTML = top + orders.map(({ fixtureId, order: o }) => {
      const fx = FIXTURES.find((f) => f.id === fixtureId); if (!fx) return '';
      const v = VENUES.find((x) => x.id === fx.venue), c = this.clock(fx);
      const list = o.tickets || o.seats.map((i) => ({ seat: i }));
      return `<section class="tk-order"><header><div><b>${esc(fx.home.name[lang])} × ${esc(fx.away.name[lang])}</b><small>${fx.demo ? esc(fx.competition[lang]) : `${this.dayLabel(fx)}${c.hm ? '، ' + c.hm + ' ' + c.period : ''}`}</small><small>${esc(v ? v.name[lang] : '')}</small></div>
        <div class="tk-ref"><small>${this.t('ref')}</small><b>${esc(o.ref)}</b><small>${list.length} ${this.t('ticketsCount')}، ${this.money(o.total)}</small></div></header>
        ${list.map((tk, k) => `<article class="tk">${badge(fx.home, lang, 30)}<div class="tk-seat">${tk.block ? `<span><small>${this.t('block')}</small><b>${esc(tk.block)}</b></span><span><small>${this.t('row')}</small><b>${tk.row}</b></span><span><small>${this.t('seatNo')}</small><b>${tk.num}</b></span>` : `<span><small>${this.t('seatNo')}</small><b>#${tk.seat}</b></span>`}</div>
          <div class="tk-who"><b>${esc(o.name)}</b><code>${esc(o.ref)}-${k + 1}</code></div><canvas class="qr" width="116" height="116" data-qr="${esc(o.ref)}-${tk.seat}"></canvas></article>`).join('')}</section>`; }).join('');
    box.querySelectorAll('canvas.qr').forEach((cv) => drawQR(cv, cv.dataset.qr));
  }
  showHome(tab) { if (tab) this.homeTab = tab; this.closeDrawer(); this.hideTip(); this.renderHome(); $('home').classList.remove('hide'); this.app.homeOpen = true; }
  hideHome() { $('home').classList.add('hide'); this.app.homeOpen = false; }
  renderTop() {
    const a = this.app, lang = a.lang, fx = a.fixture;
    document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    $('stName').textContent = a.venue.name[lang]; $('stSub').textContent = a.venue.sub[lang];
    $('fxHome').textContent = fx.home.name[lang]; $('fxAway').textContent = fx.away.name[lang];
    $('fxHomeDot').innerHTML = badge(fx.home, lang, 24); $('fxAwayDot').innerHTML = badge(fx.away, lang, 24);
    $('fxMeta').textContent = `${fx.competition[lang]}${fx.demo ? '' : ' · ' + this.when(fx)}`;
    $('langBtn').textContent = lang === 'ar' ? 'EN' : 'ع'; $('basketIcon').innerHTML = ICON.basket;
    $('basketCount').textContent = a.store.basket.length; $('basketBtn').classList.toggle('has', a.store.basket.length > 0);
    $('basketLabel').textContent = this.t('basket'); $('miniTitle').textContent = this.t('map'); $('compassN').textContent = this.t('north');
  }
  renderCrumbs() {
    const a = this.app; const parts = [`<a data-go="stadium" class="${a.view === 'stadium' ? 'cur' : ''}">${this.t('stadium')}</a>`];
    if (a.activeBlock) parts.push(`<a data-go="block" class="${a.view === 'block' ? 'cur' : ''}">${this.t('block')} ${a.activeBlock.id}</a>`);
    if (a.view === 'seat' && a.activeSeat != null) { const L = a.layout; parts.push(`<a class="cur">${this.t('row')} ${L.row[a.activeSeat] + 1} · ${this.t('seatNo')} ${L.num[a.activeSeat] + 1}</a>`); }
    $('crumbs').innerHTML = parts.join('<i>›</i>');
  }
  renderLegend() {
    const a = this.app, lang = a.lang;
    const cats = Object.entries(CATEGORIES).map(([k, c]) => `<li><span class="sw" style="background:${c.color}"></span><span>${esc(c.name[lang])}</span><b>${this.money(a.store.blockPrice({ cat: k }))}</b></li>`).join('');
    $('legendBody').innerHTML = `<h4>${this.t('legend')}</h4><ul>${cats}</ul><h4>${this.t('states')}</h4><ul class="states">
      <li><span class="sw av"></span>${this.t('available')}</li><li><span class="sw so"></span>${this.t('sold')}</li>
      <li><span class="sw ba"></span>${this.t('inBasket')}</li><li><span class="sw mi"></span>${this.t('mine')}</li></ul>`;
    $('legendToggle').textContent = this.t('legend');
  }

  /** "Your view": a picture taken from the selected seat before the fan flies there. */
  viewCard(i) {
    const src = this.app.seatSnapshot(i);
    return src ? `<button class="view-card" data-act="view" aria-label="${this.t('viewFromSeat')}"><img src="${src}" alt=""><span>${this.t('yourView')}</span></button>` : '';
  }
  seatInfo(i) {
    const a = this.app, L = a.layout, b = L.blocks[L.block[i]], st = a.store.state(i);
    return `<div class="grid4"><div><small>${this.t('row')}</small><b>${L.row[i] + 1}</b></div><div><small>${this.t('seatNo')}</small><b>${L.num[i] + 1}</b></div>
      <div><small>${this.t('price')}</small><b>${this.money(a.store.price(i))}</b></div><div><small>${this.t('score')}</small><b class="score">${viewScore(L, i).toFixed(1)}<em>/10</em></b></div></div>
      <p class="sub"><span class="sw" style="background:${CATEGORIES[b.cat].color}"></span>${esc(CATEGORIES[b.cat].name[a.lang])} · ${this.t(st === 'basket' ? 'inBasket' : st)}</p>`;
  }
  seatButton(i) {
    const st = this.app.store.state(i);
    if (st === 'mine') return `<button class="btn ghost" disabled>${this.t('bookedSeat')}</button>`;
    if (st === 'sold') return `<button class="btn ghost" disabled>${this.t('soldSeat')}</button>`;
    return `<button class="btn ${st === 'basket' ? 'ghost' : 'primary'}" data-act="toggle">${this.t(st === 'basket' ? 'remove' : 'add')}</button>`;
  }
  renderPanel() {
    const a = this.app, lang = a.lang, p = $('panel'); let h = '';
    if (a.view === 'stadium') {
      let free = 0; a.layout.blocks.forEach((b) => { free += a.store.availableIn(b); });
      const vOpts = VENUES.map((v) => `<option value="${v.id}" ${v === a.venue ? 'selected' : ''}>${esc(v.name[lang])}</option>`).join('');
      const fOpts = a.venue.fixtures.map((f) => `<option value="${f.id}" ${f === a.fixture ? 'selected' : ''}>${esc(f.home.name[lang])} × ${esc(f.away.name[lang])}${f.demo ? '' : ' · ' + this.when(f)}</option>`).join('');
      h = `<label class="pick"><small>${this.t('stadium')}</small><select name="venue">${vOpts}</select></label>
        <label class="pick"><small>${this.t('fixture')}</small><select name="fixture">${fOpts}</select></label>
        <div class="grid4 two"><div><small>${this.t('seats')}</small><b>${a.layout.count.toLocaleString('en-US')}</b></div><div><small>${this.t('availableSeats')}</small><b>${free.toLocaleString('en-US')}</b></div></div>
        <div class="seg light"><small>${this.t('lighting')}</small><button data-act="light-golden" class="${a.atmo.mode === 'golden' ? 'on' : ''}">☀ ${this.t('afternoon')}</button><button data-act="light-night" class="${a.atmo.mode === 'night' ? 'on' : ''}">☾ ${this.t('nightMatch')}</button></div>
        <p class="hint">${this.t('hintStadium')}</p>`;
    } else if (a.view === 'block') {
      const b = a.activeBlock;
      h = `<h3>${esc(this.blockName(b))}</h3><p class="sub"><span class="sw" style="background:${CATEGORIES[b.cat].color}"></span>${esc(CATEGORIES[b.cat].name[lang])} · ${this.t('tier')} ${this.t(b.tier)}</p>`;
      if (a.selectedSeat != null) h += this.viewCard(a.selectedSeat) + this.seatInfo(a.selectedSeat) + `<div class="row"><button class="btn" data-act="view">${this.t('viewFromSeat')}</button>${this.seatButton(a.selectedSeat)}</div>`;
      else h += `<div class="grid4 two"><div><small>${this.t('price')}</small><b>${this.money(a.store.blockPrice(b))}</b></div><div><small>${this.t('availableSeats')}</small><b>${a.store.availableIn(b)} / ${b.seatCount}</b></div></div><p class="hint">${this.t('hintBlock')}</p>`;
      h += `<button class="btn link" data-act="stadium">‹ ${this.t('back')}</button>`;
    } else {
      const i = a.activeSeat;
      h = `<h3>${esc(this.seatLabel(i))}</h3>${this.seatInfo(i)}
        <div class="nav"><button class="btn sm" data-act="seat-1">‹ ${this.t('prevSeat')}</button><button class="btn sm" data-act="seat+1">${this.t('nextSeat')} ›</button>
        <button class="btn sm" data-act="row-1">↓ ${this.t('rowDown')}</button><button class="btn sm" data-act="row+1">↑ ${this.t('rowUp')}</button></div>
        <div class="row">${this.seatButton(i)}<button class="btn" data-act="block">‹ ${this.t('back')}</button></div><p class="hint">${this.t('hintSeat')}</p>`;
    }
    p.innerHTML = h;
  }
  panelClick(e) {
    const btn = e.target.closest('[data-act]'); if (!btn) return; const a = this.app, act = btn.dataset.act;
    if (act === 'light-golden' || act === 'light-night') { a.atmo.setMode(act.slice(6)); this.renderPanel(); return; }
    if (act === 'stadium') a.goStadium(); else if (act === 'block') a.backToBlock(); else if (act === 'view') a.enterSeat(a.selectedSeat);
    else if (act === 'toggle') a.toggleSeat(a.view === 'seat' ? a.activeSeat : a.selectedSeat);
    else if (act.startsWith('seat')) a.stepSeat(act.endsWith('+1') ? 1 : -1); else if (act.startsWith('row')) a.stepRow(act.endsWith('+1') ? 1 : -1);
  }

  showTip(x, y, html) { const t = $('tooltip'); t.innerHTML = html; t.style.display = 'block'; const w = t.offsetWidth, hh = t.offsetHeight; t.style.left = Math.max(8, Math.min(innerWidth - w - 8, x + 16)) + 'px'; t.style.top = Math.max(8, Math.min(innerHeight - hh - 8, y + 16)) + 'px'; }
  hideTip() { $('tooltip').style.display = 'none'; }
  blockTip(b) { const a = this.app; return `<b>${esc(this.blockName(b))}</b><span><i class="sw" style="background:${CATEGORIES[b.cat].color}"></i>${esc(CATEGORIES[b.cat].name[a.lang])}</span><span>${this.t('price')}: <b>${this.money(a.store.blockPrice(b))}</b></span><span>${this.t('availableSeats')}: <b>${a.store.availableIn(b)}</b></span>`; }
  seatTip(i) { const a = this.app, L = a.layout, st = a.store.state(i); return `<b>${this.t('row')} ${L.row[i] + 1} · ${this.t('seatNo')} ${L.num[i] + 1}</b><span>${this.t('price')}: <b>${this.money(a.store.price(i))}</b></span><span>${this.t('score')}: <b>${viewScore(L, i).toFixed(1)}/10</b></span><span>${this.t(st === 'basket' ? 'inBasket' : st)}</span>`; }
  toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(this.tt); this.tt = setTimeout(() => t.classList.remove('show'), 2200); }

  // ---- minimap ----------------------------------------------------------
  drawMini(camera, fwd) {
    const g = this.mctx, W = this.mini.width, H = this.mini.height, s = this.ms, a = this.app;
    const X = (x) => W / 2 + x * s, Z = (z) => H / 2 + z * s;
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#2f7d2c'; g.fillRect(X(-52.5), Z(-34), 105 * s, 68 * s); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.5; g.strokeRect(X(-52.5), Z(-34), 105 * s, 68 * s);
    g.beginPath(); g.moveTo(X(0), Z(-34)); g.lineTo(X(0), Z(34)); g.stroke(); g.beginPath(); g.arc(X(0), Z(0), 9.15 * s, 0, 7); g.stroke();
    a.layout.blocks.forEach((b, k) => {
      const o = this.outlines[k]; g.beginPath(); o.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z)))); g.closePath();
      const act = a.activeBlock === b, hov = a.hoverBlock === b;
      g.globalAlpha = act ? 1 : hov ? 0.9 : a.activeBlock ? 0.28 : 0.62; g.fillStyle = CATEGORIES[b.cat].color; g.fill(); g.globalAlpha = 1;
      g.strokeStyle = act || hov ? '#fff' : 'rgba(8,10,18,.9)'; g.lineWidth = act || hov ? 3 : 1.5; g.stroke();
    });
    // camera position + direction
    const cx = Math.max(-this.ex, Math.min(this.ex, camera.position.x)), cz = Math.max(-this.ez, Math.min(this.ez, camera.position.z)); const ang = Math.atan2(fwd.z, fwd.x);
    g.save(); g.translate(X(cx), Z(cz)); g.rotate(ang);
    g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 46, -0.45, 0.45); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(11, 0); g.lineTo(-7, -7); g.lineTo(-3, 0); g.lineTo(-7, 7); g.closePath(); g.fill(); g.restore();
    $('needle').style.transform = `rotate(${(Math.atan2(fwd.z, -fwd.x) * 180) / Math.PI}deg)`;
  }
  miniClick(e) {
    const r = this.mini.getBoundingClientRect(), s = (this.ms * r.width) / this.mini.width; const x = (e.clientX - r.left - r.width / 2) / s, z = (e.clientY - r.top - r.height / 2) / s;
    const hit = this.app.layout.blocks.find((b, k) => inPoly(this.outlines[k], x, z)); if (hit) this.app.enterBlock(hit);
  }

  // ---- drawer ----------------------------------------------------------
  openDrawer(mode) { this.drawerMode = mode; this.resetArmed = false; $('drawer').classList.add('open'); $('backdrop').classList.add('open'); this.renderDrawer(); }
  closeDrawer() { this.drawerMode = null; $('drawer').classList.remove('open'); $('backdrop').classList.remove('open'); }
  renderDrawer(errors = {}) {
    const a = this.app, st = a.store, lang = a.lang, d = $('drawer'); const t = st.totals(); let h = '';
    const head = (title) => `<header><h3>${title} <span class="tag">${this.t('demo')}</span></h3><button class="icon" data-d="close" aria-label="${this.t('close')}">${ICON.close}</button></header>`;
    const lines = () => st.basket.map((i) => `<li><div><b>${esc(this.seatLabel(i))}</b><small>${esc(CATEGORIES[a.layout.blocks[a.layout.block[i]].cat].name[lang])}</small></div><span>${this.money(st.price(i))}</span><button class="icon" data-d="rm" data-seat="${i}" aria-label="${this.t('remove')}">${ICON.close}</button></li>`).join('');
    const totals = () => `<dl><dt>${this.t('subtotal')} (${t.count})</dt><dd>${this.money(t.subtotal)}</dd><dt>${this.t('fees')} <small>${FEES.rate * 100}% + ${this.money(FEES.perTicket)}</small></dt><dd>${this.money(t.fees)}</dd><dt class="tot">${this.t('total')}</dt><dd class="tot">${this.money(t.total)}</dd></dl>`;
    if (this.drawerMode === 'basket') {
      h = head(this.t('basket')) + (t.count ? `<ul class="lines">${lines()}</ul>${totals()}<p class="note">${t.count} / ${MAX_BASKET}</p><button class="btn primary wide" data-d="checkout">${this.t('checkout')}</button>` : `<p class="empty">${this.t('basketEmpty')}</p>`);
      h += `<div class="foot">${st.orders.length ? `<button class="btn link" data-d="bookings">${this.t('myBookings')} (${st.orders.length})</button>` : ''}<button class="btn link danger" data-d="reset">${this.resetArmed ? this.t('resetAsk') : this.t('reset')}</button></div>`;
    } else if (this.drawerMode === 'checkout' && a.account.enabled && !a.account.user) {
      h = head(this.t('checkout')) + `<p class="note">${this.t('signInToBook')}</p>` + this.authHtml() + `<button class="btn link" type="button" data-d="basket">‹ ${this.t('back')}</button>`;
    } else if (this.drawerMode === 'checkout') {
      const f = this.form; if (!f.email && a.account.user) f.email = a.account.user.email || ''; const fld = (n, type, ph) => `<label>${this.t(n)}<input name="${n}" type="${type}" value="${esc(f[n])}" placeholder="${ph}" autocomplete="off" ${errors[n] ? 'class="bad"' : ''}>${errors[n] ? `<em>${errors[n]}</em>` : ''}</label>`;
      h = head(this.t('checkout')) + `<form novalidate><ul class="lines compact">${lines()}</ul>${totals()}
        ${fld('name', 'text', '')}${fld('email', 'email', 'name@example.com')}${fld('mobile', 'tel', '07XX XXX XXXX')}
        <fieldset><legend>${this.t('payment')}</legend>${PAYMENT_METHODS.map((m) => `<label class="pay"><input type="radio" name="method" value="${m.id}" ${f.method === m.id ? 'checked' : ''}><span>${esc(m.name[lang])}</span></label>`).join('')}</fieldset>
        <p class="note">${this.t('demoNote')}</p>${st.online === 'live' ? `<p class="note live">● ${this.t('liveOn')}</p>` : st.online === 'error' ? `<p class="note warn">${this.t('liveError')}</p>` : ''}
        <button class="btn primary wide" type="submit" ${this.submitting ? 'disabled' : ''}>${this.submitting ? this.t('booking') : `${this.t('confirm')} · ${this.money(t.total)}`}</button>
        <button class="btn link" type="button" data-d="basket">‹ ${this.t('back')}</button></form>`;
    } else if (this.drawerMode === 'done' || this.drawerMode === 'bookings') {
      const orders = this.drawerMode === 'done' ? [this.lastOrder] : [...st.orders].reverse();
      h = head(this.drawerMode === 'done' ? this.t('confirmed') : this.t('myBookings'));
      orders.forEach((o) => {
        h += `<div class="order"><div class="ref"><small>${this.t('ref')}</small><b>${esc(o.ref)}</b><span>${this.money(o.total)}</span></div>
          ${o.seats.map((i, k) => `<article class="ticket"><div><small>${esc(a.fixture.competition[lang])}</small><h4>${badge(a.fixture.home, lang, 20)} ${esc(a.fixture.home.name[lang])} × ${esc(a.fixture.away.name[lang])} ${badge(a.fixture.away, lang, 20)}</h4>
          <p>${esc(this.seatLabel(i))}</p><p class="who">${esc(o.name)} · ${this.money(st.price(i))}</p><code>${esc(o.ref)}-${k + 1}</code></div><canvas class="qr" width="116" height="116" data-qr="${esc(o.ref)}-${i}"></canvas></article>`).join('')}</div>`;
      });
      h += `<button class="btn primary wide" data-d="alltickets">${this.t('myTickets')}</button><button class="btn wide" data-d="close">${this.t('continue')}</button>`;
    }
    d.innerHTML = h; d.querySelectorAll('canvas.qr').forEach((c) => drawQR(c, c.dataset.qr));
  }
  drawerClick(e) {
    const b = e.target.closest('[data-d]'); if (!b) return; const act = b.dataset.d, a = this.app;
    if (act === 'close') this.closeDrawer(); else if (act === 'alltickets') this.showHome('tickets'); else if (act === 'rm') a.store.remove(+b.dataset.seat);
    else if (act === 'checkout' || act === 'basket' || act === 'bookings') { this.drawerMode = act; this.renderDrawer(); }
    else if (act === 'reset') { if (this.resetArmed) { this.resetArmed = false; a.store.reset(); a.afterReset(); } else { this.resetArmed = true; this.renderDrawer(); } }
  }
  // ---- fan sign-in / sign-up --------------------------------------------------------------
  authHtml() {
    const s = this.auth, up = s.mode === 'up';
    return `<form class="authf" novalidate>
      <div class="seg"><button type="button" data-auth="in" class="${up ? '' : 'on'}">${this.t('signIn')}</button><button type="button" data-auth="up" class="${up ? 'on' : ''}">${this.t('signUp')}</button></div>
      <label>${this.t('email')}<input name="authEmail" type="email" dir="ltr" value="${esc(s.email)}" placeholder="name@example.com" autocomplete="email"></label>
      <label>${this.t('password')}<input name="authPass" type="password" dir="ltr" value="${esc(s.pass)}" autocomplete="${up ? 'new-password' : 'current-password'}">${up ? `<em class="hint">${this.t('passHint')}</em>` : ''}</label>
      ${s.err ? `<p class="note warn">${this.t(s.err)}</p>` : ''}${s.msg ? `<p class="note live">${this.t(s.msg)}</p>` : ''}
      <button class="btn primary wide" type="submit" ${s.busy ? 'disabled' : ''}>${s.busy ? this.t('wait') : this.t(up ? 'signUp' : 'signIn')}</button>
      ${SUPABASE.google ? `<div class="or"><span>${this.t('or')}</span></div><button class="btn wide google" type="button" data-auth="google" ${s.busy ? 'disabled' : ''}>${GOOGLE_G}<span>${this.t('withGoogle')}</span></button>` : ''}</form>`;
  }
  authInput(e) {
    const n = e.target.name; if (n !== 'authEmail' && n !== 'authPass') return false;
    this.auth[n === 'authEmail' ? 'email' : 'pass'] = e.target.value; return true;
  }
  authClick(e) {
    const b = e.target.closest('[data-auth]'); if (!b) return;
    const m = b.dataset.auth;
    if (m === 'google') {
      this.auth.busy = true; this.auth.err = null; this.rerenderAuth();
      this.app.account.signInGoogle().catch(() => ({ error: 'network' })).then((r) => { if (r.error) { this.auth.busy = false; this.auth.err = AUTH_ERRORS[r.error] || 'authFailed'; this.rerenderAuth(); } });
      return;
    }
    if (m === 'out') { this.app.account.signOut().then(() => this.toast(this.t('signedOut'))); return; }
    this.auth.mode = m; this.auth.err = null; this.auth.msg = null; this.rerenderAuth();
  }
  rerenderAuth() { if (this.drawerMode) this.renderDrawer(); if (!$('home').classList.contains('hide')) this.renderHome(); }
  submitAuth() {
    const s = this.auth, acc = this.app.account; if (s.busy) return;
    s.err = null; s.msg = null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.email.trim())) { s.err = 'errEmail'; return this.rerenderAuth(); }
    if (s.pass.length < 6) { s.err = 'passHint'; return this.rerenderAuth(); }
    s.busy = true; this.rerenderAuth();
    (s.mode === 'up' ? acc.signUp(s.email, s.pass) : acc.signIn(s.email, s.pass))
      .catch(() => ({ error: 'network' }))
      .then((r) => {
        s.busy = false;
        if (r.error) s.err = AUTH_ERRORS[r.error] || 'authFailed';
        else if (r.confirm) { s.msg = 'checkEmail'; s.mode = 'in'; }
        else { s.pass = ''; this.toast(this.t('welcome')); }
        this.rerenderAuth();
      });
  }
  submitCheckout() {
    const f = this.form, d = $('drawer'); const m = d.querySelector('input[name=method]:checked'); if (m) f.method = m.value;
    const err = {};
    if (f.name.trim().length < 3) err.name = this.t('errName');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) err.email = this.t('errEmail');
    if (!/^(\+?964|0)7\d{9}$/.test(f.mobile.replace(/[\s-]/g, ''))) err.mobile = this.t('errMobile');
    if (Object.keys(err).length) { this.renderDrawer(err); return; }
    if (this.submitting) return;                                        // a second tap while the first booking is on its way
    this.submitting = true; this.renderDrawer();
    this.app.store.checkout({ name: f.name.trim(), email: f.email.trim(), mobile: f.mobile.trim(), method: f.method })
      .then((res) => {
        this.submitting = false;
        if (res && res.error === 'over') { this.toast(this.t('matchOver')); this.renderDrawer(); }
        else if (res && res.error === 'login') { this.renderDrawer(); }
        else if (res && res.error === 'limit') { this.toast(this.t('limitReached').replace('{n}', res.left)); this.drawerMode = 'basket'; this.renderDrawer(); }
        else if (res && res.error === 'taken') { this.toast(this.t('seatsTaken').replace('{n}', res.seats.length || 1)); this.drawerMode = 'basket'; this.renderDrawer(); }
        else if (res && res.error === 'network') { this.renderDrawer(); this.toast(this.t('netError')); }
        else if (res) { this.lastOrder = res; this.drawerMode = 'done'; this.renderDrawer(); }
        else this.renderDrawer();
      });
  }
}

function inPoly(poly, x, z) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** Decorative QR-style pattern (not a scannable code). */
function drawQR(c, text) {
  const g = c.getContext('2d'), n = 25, s = c.width / (n + 4); let seed = 7; for (const ch of text) seed = (Math.imul(seed, 31) + ch.charCodeAt(0)) | 0;
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#0b0d14';
  const finder = (x, y) => x < 7 && y < 7 ? [x, y] : x >= n - 7 && y < 7 ? [x - (n - 7), y] : x < 7 && y >= n - 7 ? [x, y - (n - 7)] : null;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const f = finder(x, y); let on;
    if (f) { const [fx, fy] = f; on = fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4); }
    else if ((x === 7 && y < 8) || (y === 7 && x < 8) || (x === n - 8 && y < 8) || (y === 7 && x >= n - 8) || (x === 7 && y >= n - 8) || (y === n - 8 && x < 8)) on = false;
    else on = seatHash(y * n + x, seed) > 0.5;
    if (on) g.fillRect((x + 2) * s, (y + 2) * s, s + 0.5, s + 0.5);
  }
}
