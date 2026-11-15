// App entry: scene setup, the three camera experiences, and wiring between 3D, booking store and UI.
import * as THREE from 'three';
import { VENUES } from './config.js';
import { buildLayout } from './stadium/layout.js';
import { buildStadium, buildLighting, buildSurroundings, disposeGroup } from './stadium/build.js';
import { buildPitch } from './stadium/pitch.js';
import { Seats } from './stadium/seats.js';
import { Match } from './stadium/match.js';
import { CameraRig } from './camera/controls.js';
import { Store } from './booking/store.js';
import { Account } from './booking/account.js';
import { UI } from './ui/ui.js';
import { STR } from './ui/i18n.js';
import { Music } from './audio/music.js';


class App {
  constructor() {
    let lang = 'ar', sound = 'on';
    try { lang = localStorage.getItem('almadina.lang') || 'ar'; sound = localStorage.getItem('almadina.sound') || 'on'; } catch { /* storage blocked */ }
    this.lang = lang; this.hoverBlock = null; this.venue = null; this.homeOpen = true; this.view = 'stadium';
    this.music = new Music(); this.soundPref = sound;

    const canvas = document.getElementById('scene');
    this.mobile = matchMedia('(max-width: 760px)').matches || matchMedia('(pointer: coarse)').matches;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !this.mobile, powerPreference: 'high-performance' });
    this.pr = Math.min(devicePixelRatio || 1, this.mobile ? 1.25 : 2); this.renderer.setPixelRatio(this.pr); this.slow = 0;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = !this.mobile; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(46, 1, 0.3, 3600);
    this.rig = new CameraRig(this.camera, canvas);
    this.rig.onClick = (x, y) => this.click(x, y); this.rig.onHover = (x, y) => this.hover(x, y);
    this.raycaster = new THREE.Raycaster(); this.ndc = new THREE.Vector2(); this.fwd = new THREE.Vector3();

    buildLighting(this.scene); buildSurroundings(this.scene);       // the stadium itself is built only when the user picks one

    this.account = new Account();
    this.ui = new UI(this);
    this.account.on(() => { if (this.store) this.store.reload(); this.ui.renderHome(); this.ui.renderAll(); });
    this.account.start();
    addEventListener('resize', () => this.resize()); this.resize();
    addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (this.ui.drawerMode) this.ui.closeDrawer(); else if (!this.venue) return; else if (this.view === 'seat') this.backToBlock(); else if (this.view === 'block') this.goStadium(); } });
    canvas.addEventListener('pointerleave', () => { this.ui.hideTip(); if (this.venue) this.setHoverBlock(null); });
    // music may only start after a tap; start it on the first one unless the user muted it before
    document.addEventListener('click', () => { if (this.soundPref !== 'off' && !this.music.on) { this.music.start(); this.ui.renderSound(); } }, { once: true });

    this.clock = new THREE.Clock(); this.frame = 0; this.lastBoard = '';
    this.renderer.setAnimationLoop(() => this.tick());
    this.loader = document.getElementById('loader'); document.getElementById('loaderText').textContent = this.t('loading'); this.loader.classList.add('hide');
  }
  t(k) { return (STR[this.lang] && STR[this.lang][k]) || STR.en[k] || k; }
  setLang(l) { this.lang = l; try { localStorage.setItem('almadina.lang', l); } catch { /* ignore */ } this.lastBoard = ''; document.getElementById('loaderText').textContent = this.t('loading'); this.ui.renderHome(); this.ui.renderSound(); this.ui.renderAll(); }
  toggleSound() { const on = this.music.toggle(); this.soundPref = on ? 'on' : 'off'; try { localStorage.setItem('almadina.sound', this.soundPref); } catch { /* ignore */ } this.ui.renderSound(); }
  /** Show the "building…" overlay, let the browser paint it, then run a heavy job. */
  busy(job) { this.loader.classList.remove('hide'); requestAnimationFrame(() => setTimeout(() => { try { job(); } finally { this.loader.classList.add('hide'); } }, 30)); }
  /** Build (or rebuild) everything that depends on the chosen stadium. */
  loadVenue(id) {
    const v = VENUES.find((x) => x.id === id) || VENUES[0]; this.venue = v;
    try { localStorage.setItem('almadina.venue', v.id); } catch { /* ignore */ }
    if (this.stadium) { disposeGroup(this.scene, this.stadium.group); disposeGroup(this.scene, this.pitch.group); disposeGroup(this.scene, this.seats.group); }
    this.layout = buildLayout(v);
    let fxId = null; try { fxId = localStorage.getItem('almadina.fixture'); } catch { /* ignore */ }
    if (this.pendingFixture) { fxId = this.pendingFixture; this.pendingFixture = null; }
    this.fixture = v.fixtures.find((f) => f.id === fxId) || v.fixtures[0];
    if (this.store) this.store.close();
    this.store = new Store(this.layout, this.fixture);
    this.store.on(() => {
      if (!this.seats) return;                                         // first answer can arrive before the seats exist
      if (this.store.crowdDirty) { this.store.crowdDirty = false; this.seats.rebuildCrowd(); }
      this.seats.refresh(); if (this.ui) this.ui.renderAll();
      const lost = this.store.takeLost(); if (lost && this.ui) this.ui.toast(this.t('seatLost'));
    });
    this.stadium = buildStadium(this.scene); this.pitch = buildPitch(this.scene, v); this.seats = new Seats(this.scene, this.layout, this.store);
    if (this.match) this.match.setFixture(this.fixture); else this.match = new Match(this.scene, this.fixture);
    this.view = 'stadium'; this.activeBlock = null; this.selectedSeat = null; this.activeSeat = null; this.hoverBlock = null; this.lastBoard = '';
    this.scale = (v.cx + v.r0 + v.facade.d) / 98.5;                 // camera distances relative to Al-Madina's size
    const r = this.rig; r.fly = null; r.mode = 'orbit'; r.autoRotate = true; r.o.target.set(0, 6, 0); r.o.radius = 205 * this.scale; r.o.phi = 0.98; r.lim = this.homeLim();
    this.camera.fov = 46; this.camera.updateProjectionMatrix();
    if (this.ui) { this.ui.setLayout(); this.ui.hideTip(); this.ui.renderAll(); }
  }
  /** Called from the match list: open that match in its stadium. */
  openFixture(venueId, fixtureId) {
    try { localStorage.setItem('almadina.fixture', fixtureId); } catch { /* ignore */ }
    if (!this.venue || venueId !== this.venue.id) { this.pendingFixture = fixtureId; this.busy(() => { this.loadVenue(venueId); this.ui.hideHome(); }); return; }
    if (this.view !== 'stadium') this.goStadium(); if (this.fixture.id !== fixtureId) this.setFixture(fixtureId);
    this.ui.hideHome();
  }
  /** Called from the stadium list / selector: enter the chosen stadium. */
  openVenue(id) {
    if (!this.venue || id !== this.venue.id) { this.busy(() => { this.loadVenue(id); this.ui.hideHome(); }); return; }
    if (this.view !== 'stadium') this.goStadium();
    this.ui.hideHome();
  }
  homeLim() { return { rMin: 70 * this.scale, rMax: 290 * this.scale, phiMin: 0.2, phiMax: 1.42, thetaCenter: null, thetaRange: 0 }; }
  setFixture(id) {
    const fx = this.venue.fixtures.find((f) => f.id === id); if (!fx) return;
    this.fixture = fx; try { localStorage.setItem('almadina.fixture', id); } catch { /* ignore */ }
    this.store.setFixture(fx); this.match.setFixture(fx); this.seats.rebuildCrowd(); this.lastBoard = '';
    this.selectedSeat = null; if (this.view === 'seat') this.backToBlock(); this.seats.refresh(); this.ui.renderAll();
  }
  afterReset() { this.seats.rebuildCrowd(); this.seats.refresh(); this.ui.renderAll(); }

  resize() {
    const w = innerWidth, h = innerHeight; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  ray(x, y) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1); this.raycaster.setFromCamera(this.ndc, this.camera); return this.raycaster;
  }
  setHoverBlock(b) { if (this.hoverBlock !== b) { this.hoverBlock = b; this.seats.hoverBlock(this.view === 'stadium' ? b : null); } }

  hover(x, y) {
    if (this.rig.fly || !this.venue) return;
    if (this.view === 'stadium') {
      const b = this.seats.pickBlock(this.ray(x, y), this.camera.position); this.setHoverBlock(b);
      if (b) this.ui.showTip(x, y, this.ui.blockTip(b)); else this.ui.hideTip();
      this.renderer.domElement.style.cursor = b ? 'pointer' : 'grab';
    } else if (this.view === 'block') {
      const i = this.seats.pickSeat(this.ray(x, y).ray, this.activeBlock);
      if (i >= 0) { this.ui.showTip(x, y, this.ui.seatTip(i)); if (i !== this.selectedSeat) this.seats.showMarker(i, 0xffffff); }
      else { this.ui.hideTip(); this.seats.showMarker(this.selectedSeat, 0xffd24a); }
      this.renderer.domElement.style.cursor = i >= 0 ? 'pointer' : 'grab';
    }
  }
  click(x, y) {
    if (!this.venue) return;
    if (this.view === 'stadium') { const b = this.seats.pickBlock(this.ray(x, y), this.camera.position); if (b) this.enterBlock(b); }
    else if (this.view === 'block') {
      const i = this.seats.pickSeat(this.ray(x, y).ray, this.activeBlock);
      if (i < 0) return;
      const st = this.store.state(i);
      if (st === 'sold') { this.ui.toast(this.t('soldSeat')); return; }
      this.selectedSeat = i; this.seats.showMarker(i, 0xffd24a); this.ui.renderPanel();
    }
  }

  // ---- the three camera experiences ----------------------------------
  goStadium() {
    this.view = 'stadium'; this.activeBlock = null; this.selectedSeat = null; this.activeSeat = null;
    this.seats.setActiveBlock(null); this.seats.showMarker(null); this.ui.hideTip(); this.rig.autoRotate = true;
    this.rig.flyTo({ mode: 'orbit', target: new THREE.Vector3(0, 6, 0), theta: this.rig.o.theta, phi: 0.98, radius: 205 * this.scale, lim: this.homeLim() }, 1.7, 46);
    this.ui.renderCrumbs(); this.ui.renderPanel();
  }
  blockDest(b) {
    const theta = Math.atan2(-b.nx, -b.nz), upper = b.tier === 'upper';
    return { mode: 'orbit', target: new THREE.Vector3(b.center.x, b.center.y, b.center.z), theta, phi: upper ? 1.25 : 1.1, radius: upper ? 32 : 28,
      lim: { rMin: 9, rMax: 58, phiMin: 0.5, phiMax: 1.45, thetaCenter: theta, thetaRange: 1.05 } };
  }
  enterBlock(b) {
    this.view = 'block'; this.activeBlock = b; this.selectedSeat = null; this.activeSeat = null; this.setHoverBlock(null); this.seats.hoverBlock(null);
    this.seats.setActiveBlock(b); this.seats.showMarker(null); this.ui.hideTip(); this.rig.autoRotate = false;
    this.rig.flyTo(this.blockDest(b), 1.8, 46); this.ui.renderCrumbs(); this.ui.renderPanel();
  }
  backToBlock() { if (!this.activeBlock) return this.goStadium(); const keep = this.activeSeat; this.enterBlock(this.activeBlock); if (keep != null) { this.selectedSeat = keep; this.seats.showMarker(keep, 0xffd24a); this.ui.renderPanel(); } }
  enterSeat(i, quick) {
    if (i == null) return; const L = this.layout;
    this.view = 'seat'; this.activeSeat = i; this.selectedSeat = i; this.activeBlock = L.blocks[L.block[i]];
    if (this.seats.activeBlock !== this.activeBlock) this.seats.setActiveBlock(this.activeBlock);
    this.seats.showMarker(null); this.ui.hideTip(); this.rig.autoRotate = false;
    const eye = new THREE.Vector3(L.x[i], L.y[i] + 1.2, L.z[i]);          // seated eye level
    const dist = Math.hypot(eye.x, eye.z);
    this.rig.flyTo({ mode: 'look', eye, yaw: Math.atan2(-eye.x, -eye.z), pitch: Math.atan2(eye.y - 1, dist) * 0.9 }, quick ? 0.8 : 1.9, 62);
    this.ui.renderCrumbs(); this.ui.renderPanel();
  }
  free(i) { const s = this.store.state(i); return s === 'available' || s === 'basket' || s === 'mine'; }
  stepSeat(dir) {
    const L = this.layout, i = this.activeSeat, b = this.activeBlock, r = L.row[i]; const a = b.rowStart[r], z = a + b.rowCount[r];
    for (let j = i + dir; j >= a && j < z; j += dir) if (this.free(j)) return this.enterSeat(j, true);
    this.ui.toast('—');
  }
  stepRow(dir) {
    const L = this.layout, i = this.activeSeat, b = this.activeBlock; const frac = b.rowCount[L.row[i]] > 1 ? L.num[i] / (b.rowCount[L.row[i]] - 1) : 0;
    for (let r = L.row[i] + dir; r >= 0 && r < b.rowCount.length; r += dir) {
      const n = b.rowCount[r]; if (!n) continue; const c = Math.round(frac * (n - 1));
      for (let k = 0; k < n; k++) for (const j of [c + k, c - k]) if (j >= 0 && j < n && this.free(b.rowStart[r] + j)) return this.enterSeat(b.rowStart[r] + j, true);
    }
    this.ui.toast('—');
  }
  toggleSeat(i) {
    if (i == null) return; const res = this.store.toggle(i);
    this.ui.toast(res === 'added' ? this.t('added') : res === 'removed' ? this.t('removed') : res === 'full' ? this.t('basketFull') : this.t('soldSeat'));
  }

  tick() {
    const dt = Math.min(0.1, this.clock.getDelta()), time = this.clock.elapsedTime; this.frame++;
    if (!this.venue || this.homeOpen) return;                        // nothing to draw behind the menu → keeps the menu smooth
    this.rig.update(dt); this.match.update(dt, time); this.pitch.update(time);
    if (this.frame % 2 === 0) this.seats.updateFlags(time);
    const board = `${this.match.score.join('-')}|${this.match.clockText()}|${this.lang}|${this.fixture.id}`;
    if (board !== this.lastBoard) { this.lastBoard = board; this.stadium.board.draw(this.fixture, this.match.score, this.match.clockText(), this.lang); }
    if (this.frame % 4 === 0) { this.camera.getWorldDirection(this.fwd); this.ui.drawMini(this.camera, this.fwd); }
    this.renderer.render(this.scene, this.camera);
    // adaptive quality: if frames stay slow, render at a lower resolution
    this.slow = dt > 0.04 ? this.slow + 1 : Math.max(0, this.slow - 1);
    if (this.slow > 45 && this.pr > 0.75) { this.pr = Math.max(0.75, this.pr - 0.25); this.renderer.setPixelRatio(this.pr); this.resize(); this.slow = 0; }
  }
}

window.__app = new App();
