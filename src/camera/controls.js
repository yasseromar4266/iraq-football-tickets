// Camera rig: orbit mode (stadium / block views), look mode (seat view) and smooth fly-to transitions.
import * as THREE from 'three';

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class CameraRig {
  constructor(camera, dom) {
    this.camera = camera; this.dom = dom; this.mode = 'orbit';
    this.o = { target: new THREE.Vector3(0, 6, 0), theta: 0.75, phi: 0.98, radius: 205 };
    this.lim = { rMin: 70, rMax: 290, phiMin: 0.2, phiMax: 1.42, thetaCenter: null, thetaRange: 0 };
    this.l = { eye: new THREE.Vector3(), yaw: 0, pitch: 0 };
    this.vel = { theta: 0, phi: 0 }; this.fly = null; this.autoRotate = true; this.lastInput = -10; this.time = 0;
    this.pointers = new Map(); this.onClick = null; this.onHover = null; this.baseFov = camera.fov;
    this._look = new THREE.Vector3();
    dom.addEventListener('pointerdown', (e) => this.down(e));
    dom.addEventListener('pointermove', (e) => this.move(e));
    dom.addEventListener('pointerup', (e) => this.up(e));
    dom.addEventListener('pointercancel', (e) => this.pointers.delete(e.pointerId));
    dom.addEventListener('wheel', (e) => { e.preventDefault(); this.zoom(Math.exp(e.deltaY * 0.0012)); }, { passive: false });
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  down(e) {
    try { this.dom.setPointerCapture(e.pointerId); } catch { /* synthetic events */ }
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() });
    this.lastInput = this.time; this.vel.theta = this.vel.phi = 0; this.pinch = 0;
  }
  move(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) { if (e.pointerType === 'mouse' && this.onHover) this.onHover(e.clientX, e.clientY); return; }
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; this.lastInput = this.time;
    if (this.fly) return;
    if (this.pointers.size === 1) {
      if (this.mode === 'orbit') { this.o.theta -= dx * 0.0052; this.o.phi -= dy * 0.0052; this.vel.theta = -dx * 0.0052; this.vel.phi = -dy * 0.0052; }
      else { const k = 0.0042 * (this.camera.fov / 60); this.l.yaw += dx * k; this.l.pitch = Math.max(-1.3, Math.min(1.3, this.l.pitch - dy * k)); }
    } else if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.pinch) this.zoom(this.pinch / d); this.pinch = d;
    }
  }
  up(e) {
    const p = this.pointers.get(e.pointerId); this.pointers.delete(e.pointerId); this.pinch = 0;
    if (p && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) < 7 && performance.now() - p.t < 500 && this.onClick && !this.fly) this.onClick(e.clientX, e.clientY);
  }
  zoom(f) {
    this.lastInput = this.time; if (this.fly) return;
    if (this.mode === 'orbit') this.o.radius = Math.max(this.lim.rMin, Math.min(this.lim.rMax, this.o.radius * f));
    else { this.camera.fov = Math.max(22, Math.min(78, this.camera.fov * f)); this.camera.updateProjectionMatrix(); }
  }
  orbitPos(o, out) {
    const s = Math.sin(o.phi); return out.set(o.target.x + o.radius * s * Math.sin(o.theta), o.target.y + o.radius * Math.cos(o.phi), o.target.z + o.radius * s * Math.cos(o.theta));
  }
  lookDir(out) { const c = Math.cos(this.l.pitch); return out.set(Math.sin(this.l.yaw) * c, -Math.sin(this.l.pitch), Math.cos(this.l.yaw) * c); }
  currentLookPoint(out) {
    if (this.fly) return out.copy(this._look);
    if (this.mode === 'orbit') return out.copy(this.o.target);
    return this.lookDir(out).multiplyScalar(30).add(this.l.eye);
  }
  /** dest: { mode:'orbit', target, theta, phi, radius, lim } | { mode:'look', eye, yaw, pitch }  */
  flyTo(dest, duration = 1.6, fov = this.baseFov) {
    const startPos = this.camera.position.clone(), startLook = this.currentLookPoint(new THREE.Vector3());
    const endPos = new THREE.Vector3(), endLook = new THREE.Vector3();
    if (dest.mode === 'orbit') {
      // take the short way round
      const cur = Math.atan2(startPos.x - dest.target.x, startPos.z - dest.target.z); dest.theta = cur + wrap(dest.theta - cur);
      this.orbitPos(dest, endPos); endLook.copy(dest.target);
    } else { endPos.copy(dest.eye); const c = Math.cos(dest.pitch); endLook.set(Math.sin(dest.yaw) * c, -Math.sin(dest.pitch), Math.cos(dest.yaw) * c).multiplyScalar(30).add(dest.eye); }
    const lift = Math.min(18, startPos.distanceTo(endPos) * 0.12);
    this.fly = { t: 0, duration, startPos, startLook, endPos, endLook, dest, lift, fov0: this.camera.fov, fov1: fov };
    this._look.copy(startLook);
  }
  update(dt) {
    this.time += dt; const cam = this.camera;
    if (this.fly) {
      const f = this.fly; f.t = Math.min(1, f.t + dt / f.duration); const k = ease(f.t);
      cam.position.lerpVectors(f.startPos, f.endPos, k); cam.position.y += Math.sin(k * Math.PI) * f.lift;
      this._look.lerpVectors(f.startLook, f.endLook, k); cam.lookAt(this._look);
      cam.fov = f.fov0 + (f.fov1 - f.fov0) * k; cam.updateProjectionMatrix();
      if (f.t >= 1) {
        const d = f.dest; this.mode = d.mode;
        if (d.mode === 'orbit') { this.o.target.copy(d.target); this.o.theta = d.theta; this.o.phi = d.phi; this.o.radius = d.radius; if (d.lim) this.lim = d.lim; }
        else { this.l.eye.copy(d.eye); this.l.yaw = d.yaw; this.l.pitch = d.pitch; }
        this.fly = null; this.vel.theta = this.vel.phi = 0; this.lastInput = this.time; if (f.dest.done) f.dest.done();
      }
      return;
    }
    if (this.mode === 'orbit') {
      const o = this.o, L = this.lim;
      if (!this.pointers.size) {
        o.theta += this.vel.theta; o.phi += this.vel.phi; this.vel.theta *= 0.9; this.vel.phi *= 0.9;
        if (this.autoRotate && this.time - this.lastInput > 3.5) o.theta += dt * 0.045;
      }
      o.phi = Math.max(L.phiMin, Math.min(L.phiMax, o.phi));
      if (L.thetaCenter != null) o.theta = L.thetaCenter + Math.max(-L.thetaRange, Math.min(L.thetaRange, wrap(o.theta - L.thetaCenter)));
      this.orbitPos(o, cam.position); cam.lookAt(o.target);
    } else {
      cam.position.copy(this.l.eye); cam.lookAt(this.lookDir(this._look).multiplyScalar(30).add(this.l.eye));
    }
  }
}
