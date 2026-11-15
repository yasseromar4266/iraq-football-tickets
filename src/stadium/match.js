// A light-weight live match: 22 players, a referee and a moving ball.
import * as THREE from 'three';

const FORMATION = [[-48, 0], [-34, -22], [-36, -8], [-36, 8], [-34, 22], [-18, -24], [-20, -8], [-20, 8], [-18, 24], [-5, -9], [-5, 9]];

function makePlayer(kit, shorts, skin) {
  const g = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ color: kit, roughness: 0.7 }), sh = new THREE.MeshStandardMaterial({ color: shorts, roughness: 0.7 }), sk = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.8 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 3, 8), shirt); torso.position.y = 1.18; torso.scale.set(1.15, 1, 0.75);
  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.26, 0.26), sh); hips.position.y = 0.84;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 8), sk); head.position.y = 1.66;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 6, 0, 6.3, 0, 1.5), new THREE.MeshStandardMaterial({ color: 0x141210 })); hair.position.y = 1.68;
  const legs = [-0.1, 0.1].map((x) => { const pivot = new THREE.Group(); pivot.position.set(x, 0.78, 0); const l = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.62, 2, 6), sk); l.position.y = -0.38; pivot.add(l); g.add(pivot); return pivot; });
  const arms = [-0.29, 0.29].map((x) => { const pivot = new THREE.Group(); pivot.position.set(x, 1.4, 0); const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.46, 2, 6), sk); a.position.y = -0.27; pivot.add(a); g.add(pivot); return pivot; });
  g.add(torso, hips, head, hair);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.userData = { legs, arms, shirt, sh };
  return g;
}

export class Match {
  constructor(scene, fixture) {
    this.group = new THREE.Group(); scene.add(this.group); this.players = [];
    const skins = [0xc08a64, 0xa87550, 0xd2a07c, 0x8f6243];
    for (let team = 0; team < 2; team++) for (let i = 0; i < 11; i++) {
      const mesh = makePlayer(0xffffff, 0xffffff, skins[(i + team) % 4]);
      const sgn = team === 0 ? 1 : -1; const hx = FORMATION[i][0] * sgn, hz = FORMATION[i][1] * sgn;
      mesh.position.set(hx, 0, hz); this.group.add(mesh);
      this.players.push({ mesh, team, i, hx, hz, x: hx, z: hz, vx: 0, vz: 0, phase: Math.random() * 6 });
    }
    this.ref = makePlayer(0x111111, 0x111111, 0xb07a55); this.ref.userData.shirt.color.set(0xe6e23a); this.group.add(this.ref); this.refPos = { x: 4, z: 6 };
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 }));
    this.ball.castShadow = true; this.group.add(this.ball);
    this.b = { x: 0, z: 0, y: 0.2, from: null, to: null, t: 0, dur: 1, owner: this.players[9], hold: 1.2, shot: false };
    this.score = [0, 0]; this.clock = 17 * 60 + 23; this.setFixture(fixture);
  }
  setFixture(fx) {
    this.players.forEach((p) => { const t = p.team === 0 ? fx.home : fx.away; p.mesh.userData.shirt.color.set(p.i === 0 ? (p.team === 0 ? 0xf2c230 : 0x2fd07a) : t.kit); p.mesh.userData.sh.color.set(p.i === 0 ? 0x18181c : t.shorts); });
    this.score = [0, 0]; this.clock = 17 * 60 + 23;
  }
  clockText() { const m = Math.floor(this.clock / 60), s = Math.floor(this.clock % 60); return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; }

  update(dt, time) {
    dt = Math.min(dt, 0.05); this.clock += dt; if (this.clock > 90 * 60) this.clock = 0;
    const b = this.b;
    // --- ball
    if (b.owner) {
      const o = b.owner, dirx = o.team === 0 ? 1 : -1;
      b.x = o.x + dirx * 0.55; b.z = o.z; b.y = 0.2; b.hold -= dt;
      if (b.hold <= 0) {
        const goalX = dirx * 52.5;
        if (Math.abs(goalX - o.x) < 24 && Math.random() < 0.55) { this.kick(goalX + dirx * 1.2, (Math.random() - 0.5) * 9, 0.9, true); }
        else {
          const mates = this.players.filter((p) => p.team === o.team && p !== o && p.i !== 0);
          mates.sort((a, c) => (c.x - a.x) * dirx + (Math.random() - 0.5) * 30);
          const tgt = mates[Math.floor(Math.random() * 4)] || mates[0];
          const dist = Math.hypot(tgt.x - o.x, tgt.z - o.z);
          this.kick(tgt.x + dirx * 2, tgt.z, Math.max(0.5, dist / 19), false, tgt);
        }
      }
    } else {
      b.t += dt / b.dur; const k = Math.min(1, b.t);
      b.x = b.from.x + (b.to.x - b.from.x) * k; b.z = b.from.z + (b.to.z - b.from.z) * k;
      b.y = 0.2 + Math.sin(k * Math.PI) * b.lift;
      if (k >= 1) {
        if (b.shot) {
          const scoringTeam = b.to.x > 0 ? 0 : 1;
          if (Math.abs(b.to.z) < 3.4 && Math.random() < 0.3) { this.score[scoringTeam]++; this.onScore && this.onScore(); this.give(this.players[scoringTeam === 0 ? 20 : 9], 2.2, true); }
          else this.give(this.players[scoringTeam === 0 ? 11 : 0], 1.6);
        } else {
          let best = null, bd = 1e9;
          this.players.forEach((p) => { const d = Math.hypot(p.x - b.x, p.z - b.z) + (p === b.target ? -2.5 : 0); if (d < bd) { bd = d; best = p; } });
          this.give(best, 0.7 + Math.random() * 1.6);
        }
      }
    }
    // --- players
    const chasers = [null, null]; const cd = [1e9, 1e9];
    this.players.forEach((p) => { const d = Math.hypot(p.x - b.x, p.z - b.z); if (p.i !== 0 && d < cd[p.team]) { cd[p.team] = d; chasers[p.team] = p; } });
    this.players.forEach((p) => {
      const sgn = p.team === 0 ? 1 : -1; let tx, tz;
      if (p === b.owner) { tx = p.x + sgn * 3; tz = p.z + Math.sin(time * 0.7 + p.phase) * 1.5; }
      else if (p === chasers[p.team] && !b.owner) { tx = b.to ? b.to.x : b.x; tz = b.to ? b.to.z : b.z; }
      else if (p === chasers[p.team] && b.owner && b.owner.team !== p.team) { tx = b.x; tz = b.z; }
      else if (p.i === 0) { tx = p.hx; tz = Math.max(-3, Math.min(3, b.z * 0.25)); }
      else { tx = p.hx + b.x * 0.45 + Math.sin(time * 0.3 + p.phase) * 2; tz = p.hz * 0.85 + b.z * 0.22 + Math.cos(time * 0.27 + p.phase) * 2; }
      tx = Math.max(-51, Math.min(51, tx)); tz = Math.max(-33, Math.min(33, tz));
      this.steer(p, tx, tz, p === b.owner ? 3.2 : (p === chasers[p.team] ? 6.6 : 4.2), dt, p.mesh, time);
    });
    const r = this.refPos, rp = { x: r.x, z: r.z, vx: this.rvx || 0, vz: this.rvz || 0, phase: 1 };
    this.steer(rp, b.x * 0.8 + 6, b.z * 0.6 + 7, 4, dt, this.ref, time); r.x = rp.x; r.z = rp.z; this.rvx = rp.vx; this.rvz = rp.vz;
    this.ball.position.set(b.x, b.y, b.z); this.ball.rotation.x += dt * 9;
  }
  steer(p, tx, tz, maxSpeed, dt, mesh, time) {
    const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
    const sp = d < 0.4 ? 0 : Math.min(maxSpeed, d * 1.6);
    const ax = d > 0 ? (dx / d) * sp : 0, az = d > 0 ? (dz / d) * sp : 0;
    p.vx += (ax - p.vx) * Math.min(1, dt * 4); p.vz += (az - p.vz) * Math.min(1, dt * 4);
    p.x += p.vx * dt; p.z += p.vz * dt; mesh.position.set(p.x, 0, p.z);
    const v = Math.hypot(p.vx, p.vz);
    if (v > 0.3) { const target = Math.atan2(p.vx, p.vz); let diff = target - mesh.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); mesh.rotation.y += diff * Math.min(1, dt * 8); }
    const sw = Math.sin(time * (5 + v * 1.4) + p.phase) * Math.min(0.9, v * 0.16);
    const u = mesh.userData; u.legs[0].rotation.x = sw; u.legs[1].rotation.x = -sw; u.arms[0].rotation.x = -sw * 0.8; u.arms[1].rotation.x = sw * 0.8;
  }
  kick(x, z, dur, shot, target) {
    const b = this.b; b.from = { x: b.x, z: b.z }; b.to = { x, z }; b.t = 0; b.dur = dur; b.shot = shot; b.target = target || null;
    b.lift = shot ? 1.2 : Math.min(3.2, dur * 1.6); b.owner = null;
  }
  give(p, hold, reset) {
    const b = this.b; b.owner = p; b.hold = hold; b.to = null;
    if (reset) this.players.forEach((q) => { q.x = q.hx; q.z = q.hz; q.vx = q.vz = 0; });
  }
}
