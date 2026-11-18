// Seats, spectators and flags – all InstancedMesh.
import * as THREE from 'three';
import { CATEGORIES } from '../config.js';
import { mergeBoxes, QuadGeo, sweep, BeamBatch } from './geo.js';
import { blockFrames, V } from './layout.js';
import { flagTexture } from './textures.js';

const SOLD_DIM = 0.45;
const STATE_COLOR = { basket: new THREE.Color(0xffc531), mine: new THREE.Color(0x27e0c0) };
const CLOTHES = [0xf1f1f1, 0xe8e8e8, 0x1d1d22, 0x2a2f3a, 0x24406e, 0x3a6ea5, 0x6b6f76, 0x8a1f24, 0x2f5b3a, 0xc9b28a, 0x4a3a2c, 0xdcdcdc, 0x15233f, 0xb0b4ba];
const SKIN = [0xc68d6a, 0xb57c58, 0xd8a47f, 0x9c6a48, 0x2a2018, 0x1b1b1d];   // last two = hair / caps seen from behind

/** Joins several geometries into one (position + normal only), so a figure is drawn as one instance. */
function mergeGeos(geos) {
  const parts = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  const n = parts.reduce((k, g) => k + g.attributes.position.count, 0), pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0; parts.forEach((g) => { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; });
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); return out;
}

export class Seats {
  constructor(scene, layout, store, shadows = false) {
    this.layout = layout; this.store = store; this.activeBlock = null;
    this.group = new THREE.Group(); scene.add(this.group); scene = this.group;      // everything below is added to this group
    this.tones = V.tones.map((c) => new THREE.Color(c)); this.awayX = V.cx;
    const L = layout, N = L.count;
    // a moulded stadium seat on computers (sloped pan, backrest leaning back, pedestal); two boxes on phones
    const geo = !shadows ? mergeBoxes([{ size: [0.46, 0.07, 0.42], pos: [0, 0.42, 0.02] }, { size: [0.46, 0.44, 0.07], pos: [0, 0.66, -0.2] }])
      : mergeGeos([
        new THREE.BoxGeometry(0.44, 0.05, 0.4).rotateX(-0.08).translate(0, 0.42, 0.03),                          // seat pan
        new THREE.BoxGeometry(0.46, 0.04, 0.12).translate(0, 0.44, 0.22),                                        // rounded front lip
        new THREE.BoxGeometry(0.44, 0.42, 0.05).rotateX(-0.2).translate(0, 0.67, -0.19),                         // backrest
        new THREE.BoxGeometry(0.4, 0.06, 0.06).rotateX(-0.2).translate(0, 0.88, -0.23),                          // top of backrest
        new THREE.BoxGeometry(0.07, 0.38, 0.07).translate(0, 0.2, -0.05),                                        // pedestal
      ]);
    // moulded plastic: a little shine so the low sun and the sky show on the seat backs
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42, metalness: 0 }), N);
    this.mesh.receiveShadow = shadows;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < N; i++) { q.setFromAxisAngle(up, L.yaw[i]); p.set(L.x[i], L.y[i], L.z[i]); m.compose(p, q, s); this.mesh.setMatrixAt(i, m); }
    this.mesh.frustumCulled = false; scene.add(this.mesh);

    // Crowd: torso+legs mesh and a head mesh, capacity = all seats, count = sold seats
    // phones keep the light box figures; computers get rounded torsos and smooth heads
    const light = !shadows || N > 40000;
    const body = light
      ? mergeBoxes([{ size: [0.42, 0.56, 0.24], pos: [0, 0.76, -0.04] }, { size: [0.38, 0.15, 0.42], pos: [0, 0.52, 0.16] }, { size: [0.36, 0.44, 0.14], pos: [0, 0.24, 0.34] }])
      : mergeGeos([
        new THREE.CylinderGeometry(0.17, 0.2, 0.5, 8).scale(1.15, 1, 0.68).translate(0, 0.78, -0.04),          // torso
        new THREE.SphereGeometry(0.2, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.12, 0.45, 0.66).translate(0, 1.02, -0.04), // shoulders
        new THREE.CylinderGeometry(0.06, 0.05, 0.12, 6).translate(0, 1.07, -0.04),                            // neck
        new THREE.BoxGeometry(0.36, 0.14, 0.42).translate(0, 0.52, 0.16),                                     // lap
        new THREE.BoxGeometry(0.34, 0.44, 0.14).translate(0, 0.24, 0.34),                                     // legs
      ]);
    this.bodies = new THREE.InstancedMesh(body, new THREE.MeshLambertMaterial({ color: 0xffffff }), N);
    const headGeo = light ? new THREE.IcosahedronGeometry(0.115, matchMedia('(pointer: coarse)').matches ? 0 : 1) : new THREE.SphereGeometry(0.11, 10, 7).scale(0.92, 1.08, 1);
    this.heads = new THREE.InstancedMesh(headGeo.translate(0, 1.21, -0.03), new THREE.MeshLambertMaterial({ color: 0xffffff }), N);
    this.bodies.frustumCulled = this.heads.frustumCulled = false; this.bodies.receiveShadow = this.heads.receiveShadow = shadows; scene.add(this.bodies, this.heads);

    // Flags
    this.flagCount = 170;
    this.flags = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.5, 1.0, 1, 1).translate(0.75, 0, 0), new THREE.MeshLambertMaterial({ map: flagTexture(), side: THREE.DoubleSide }), this.flagCount);
    this.flags.frustumCulled = false; scene.add(this.flags); this.flagData = [];

    // Block pick / highlight slabs
    this.slabs = [];
    L.blocks.forEach((b) => {
      const g = new QuadGeo(); sweep(g, blockFrames(b), b.dFront, b.yFront + 0.9, b.dBack, b.yBack + 0.9);
      const slab = new THREE.Mesh(g.build(), new THREE.MeshBasicMaterial({ color: CATEGORIES[b.cat].color, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      slab.userData.block = b; slab.renderOrder = 2; scene.add(slab); this.slabs.push(slab);
    });

    // Seat hover / selection marker
    this.marker = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.8, 0.56).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }));
    this.marker.visible = false; this.marker.renderOrder = 3; scene.add(this.marker);

    this.rebuildCrowd(); this.refresh();
  }

  /** Recolour every seat from its real tone + booking state. */
  refresh() {
    const L = this.layout, st = this.store, c = new THREE.Color(), ab = this.activeBlock;
    for (let i = 0; i < L.count; i++) {
      const state = st.state(i);
      if (state === 'basket' || state === 'mine') c.copy(STATE_COLOR[state]);
      else if (ab && L.block[i] === ab.index) {
        if (state === 'sold') c.copy(this.tones[L.tone[i]]).multiplyScalar(SOLD_DIM); else c.set(CATEGORIES[ab.cat].color);
      } else c.copy(this.tones[L.tone[i]]);
      this.mesh.setColorAt(i, c);
    }
    this.mesh.instanceColor.needsUpdate = true;
  }
  setActiveBlock(b) { this.activeBlock = b; this.refresh(); }
  hoverBlock(b) { this.slabs.forEach((s) => { s.material.opacity = b && s.userData.block === b ? 0.5 : 0; }); }
  setSlabsEnabled(on) { this.slabsEnabled = on; if (!on) this.hoverBlock(null); }
  showMarker(i, color = 0xffffff) {
    if (i == null || i < 0) { this.marker.visible = false; return; }
    const L = this.layout; this.marker.position.set(L.x[i], L.y[i], L.z[i]); this.marker.rotation.y = L.yaw[i];
    this.marker.material.color.set(color); this.marker.visible = true;
  }

  /** Put a spectator on every sold seat for the current fixture, plus flags. */
  rebuildCrowd() {
    const L = this.layout, st = this.store, seed = st.fixture.seed;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
    let n = 0; let h = seed >>> 0; const rnd = () => { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296; };
    const home = new THREE.Color(st.fixture.home.kit), away = new THREE.Color(st.fixture.away.kit);
    const sold = [];
    for (let i = 0; i < L.count; i++) {
      if (!st.sold[i]) continue;
      const k = 0.94 + rnd() * 0.12; q.setFromAxisAngle(up, L.yaw[i] + (rnd() - 0.5) * 0.3); p.set(L.x[i], L.y[i] + 0.02, L.z[i]); s.set(k, k, k); m.compose(p, q, s);
      this.bodies.setMatrixAt(n, m); this.heads.setMatrixAt(n, m);
      const r = rnd(); const awayEnd = L.x[i] > this.awayX;     // away fans gather at the south end
      if (r < 0.2) c.copy(awayEnd ? away : home); else c.set(CLOTHES[Math.floor(rnd() * CLOTHES.length)]);
      c.offsetHSL(0, 0, (rnd() - 0.5) * 0.06); this.bodies.setColorAt(n, c);
      c.set(SKIN[Math.floor(rnd() * SKIN.length)]); this.heads.setColorAt(n, c);
      sold.push(i); n++;
    }
    this.bodies.count = this.heads.count = n;
    this.bodies.instanceMatrix.needsUpdate = this.heads.instanceMatrix.needsUpdate = true;
    if (this.bodies.instanceColor) this.bodies.instanceColor.needsUpdate = true;
    if (this.heads.instanceColor) this.heads.instanceColor.needsUpdate = true;
    this.crowdCount = n;
    this.flagData = [];
    for (let f = 0; f < this.flagCount && sold.length; f++) {
      const i = sold[Math.floor(rnd() * sold.length)];
      this.flagData.push({ x: L.x[i], y: L.y[i] + 2.1 + rnd() * 0.5, z: L.z[i], yaw: L.yaw[i] + Math.PI / 2, ph: rnd() * 6.28, sp: 1.6 + rnd() * 1.6 });
    }
    this.updateFlags(0);
  }
  updateFlags(time) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1), e = new THREE.Euler();
    this.flagData.forEach((f, i) => {
      const w = Math.sin(time * f.sp + f.ph);
      e.set(0, f.yaw + w * 0.7, w * 0.22 + 0.1, 'YXZ'); q.setFromEuler(e); p.set(f.x, f.y + Math.abs(w) * 0.15, f.z); m.compose(p, q, s); this.flags.setMatrixAt(i, m);
    });
    this.flags.count = this.flagData.length; this.flags.instanceMatrix.needsUpdate = true;
  }

  /** Nearest seat of a block hit by a ray (cheap custom picking, no per-instance raycast). */
  pickSeat(ray, b) {
    const L = this.layout, o = ray.origin, d = ray.direction; let best = -1, bestT = Infinity;
    for (let i = b.seatStart; i < b.seatStart + b.seatCount; i++) {
      const vx = L.x[i] - o.x, vy = L.y[i] + 0.55 - o.y, vz = L.z[i] - o.z; const t = vx * d.x + vy * d.y + vz * d.z;
      if (t <= 0 || t >= bestT) continue;
      if (vx * vx + vy * vy + vz * vz - t * t < 0.1) { best = i; bestT = t; }
    }
    return best;
  }
  /** Front-facing block under a ray (ignores stands seen from behind through the façade). */
  pickBlock(raycaster, camPos) {
    const hits = raycaster.intersectObjects(this.slabs, false);
    for (const h of hits) { const b = h.object.userData.block; if ((camPos.x - b.center.x) * -b.nx + (camPos.z - b.center.z) * -b.nz > 0) return b; }
    return null;
  }
}
