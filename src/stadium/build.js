// Stadium structure: tiers, walls, VIP boxes, roof + steel truss, tree columns, façade,
// floodlights, screens, lighting and the surroundings. Generated per venue.
import * as THREE from 'three';
import { allSegFrames, pt, SEGS, frame, V } from './layout.js';
import { QuadGeo, sweep, BeamBatch } from './geo.js';
import { facadeTexture, roofTexture, solarTexture, glowTexture, windowsTexture, makeScoreboard } from './textures.js';

const P = (f, d, y) => { const [x, z] = pt(f, d); return [x, y, z]; };

/** Builds the current venue (layout.V). Everything is generated from the venue's numbers in config.js. */
export function buildStadium(scene) {
  const S = V, group = new THREE.Group(); scene.add(group);
  const coarse = allSegFrames(1e9, 10);
  const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.02, side: THREE.DoubleSide, ...o });
  const addSweep = (profile, material, segFilter) => {
    const g = new QuadGeo();
    coarse.forEach((fr, si) => { if (segFilter && !segFilter(si)) return; for (let i = 0; i < profile.length - 1; i++) sweep(g, fr, profile[i][0], profile[i][1], profile[i + 1][0], profile[i + 1][1]); });
    const m = new THREE.Mesh(g.build(), material); group.add(m); return m;
  };

  // ---- Bowl concrete ------------------------------------------------------
  const concrete = mat(0x8d8f96), dark = mat(0x2a2b31), wall = mat(S.wall), band = mat(S.band, { roughness: 0.6 });
  const lo = S.tiers[0], wallTop = lo.y0 - 0.35;
  addSweep([[0.4, 0], [0.4, wallTop]], wall);                      // pitch-side wall
  addSweep([[0.38, wallTop], [0.38, wallTop + 0.3]], band);        // coloured band on top of it
  S.tiers.forEach((t, i) => {
    const back = t.d0 + t.rows * t.dd, top = t.y0 + t.rows * t.dy;
    addSweep([[t.d0 - (i ? 0.6 : 0.4), t.y0 - (i ? 0.6 : 0.3)], [back + 0.2, top - 0.25]], concrete);   // rake
    const next = S.tiers[i + 1];
    if (next) {
      addSweep([[back + 0.2, top - 0.2], [S.back + 0.4, top - 0.2]], dark);                // concourse floor
      addSweep([[back + 0.2, top - 0.2], [back + 0.2, top + 0.9]], wall);                  // rear parapet
      addSweep([[next.d0 - 0.6, next.y0 - 1.5], [next.d0 - 0.6, next.y0 + 0.35]], wall);   // fascia of the tier above
      addSweep([[next.d0 - 0.6, next.y0 - 1.5], [S.back + 0.4, next.y0 - 1.5]], dark);     // soffit over concourse
    }
  });
  addSweep([[S.back + 0.4, 0], [S.back + 0.4, S.top + 1.1]], dark);                        // rear wall

  // VIP / media glass boxes cut into the front of the upper tier (Al-Madina west stand)
  const up = S.tiers[1];
  if (S.boxes && up) {
    const bf = [frame(SEGS[0], 2 / 6), frame(SEGS[0], 4 / 6)];
    const glass = new THREE.MeshStandardMaterial({ color: 0x9fd0e6, emissive: 0x34566a, emissiveIntensity: 0.7, roughness: 0.1, metalness: 0.4, side: THREE.DoubleSide });
    const bg = new QuadGeo(); sweep(bg, bf, up.d0 - 0.7, up.y0 + 0.3, up.d0 - 0.7, up.y0 + 3.6); group.add(new THREE.Mesh(bg.build(), glass));
    const br = new QuadGeo(); sweep(br, bf, up.d0 - 0.7, up.y0 + 3.6, up.d0 + 5.2, up.y0 + 3.6); sweep(br, bf, up.d0 - 0.75, up.y0 - 0.2, up.d0 - 0.75, up.y0 + 0.3);
    group.add(new THREE.Mesh(br.build(), mat(0x3a3c44)));
  }

  // ---- Roof ----------------------------------------------------------------
  const R = S.roof;
  const roofed = (si) => R.type === 'full' || (R.type === 'sides' && (si === 0 || si === 4)) || (R.type === 'west' && si === 0);
  const roofY = (d) => R.yOut + ((R.yIn - R.yOut) * (R.dOut - d)) / (R.dOut - R.dIn);
  const depthAt = (d) => 1.0 + (1.6 * (d - R.dIn)) / (R.dOut - R.dIn);
  const lampPos = [];
  if (R.type !== 'none') {
    const skin = (segFilter, tex, uS, vS) => {
      const g = new QuadGeo(); let any = false;
      coarse.forEach((fr, si) => { if (segFilter(si)) { sweep(g, fr, R.dIn, R.yIn, R.dOut, R.yOut, uS, vS); any = true; } });
      if (any) group.add(new THREE.Mesh(g.build(), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.25, side: THREE.DoubleSide })));
    };
    const ends = (si) => !!R.solarEnds && (si === 2 || si === 6);          // metal sheet + solar plant
    skin((si) => roofed(si) && !ends(si), roofTexture(R.colors), 0.05, 6);
    skin((si) => roofed(si) && ends(si), solarTexture(), 0.12, 10);

    // Steel truss under the roof + tree-shaped columns behind the top tier
    const steel = new THREE.MeshStandardMaterial({ color: 0xd9dbe0, roughness: 0.55, metalness: 0.5 });
    const truss = new BeamBatch(), cols = new BeamBatch();
    const ringD = [R.dIn + 0.6, R.dIn + (R.dOut - R.dIn) * 0.27, R.dIn + (R.dOut - R.dIn) * 0.52, R.dIn + (R.dOut - R.dIn) * 0.77, R.dOut - 0.8];
    const cd = Math.min(S.back + 2.0, R.dOut - 1.2);
    allSegFrames(6.4, 5).forEach((arr, si) => {
      if (!roofed(si)) return;
      const nextRoofed = roofed((si + 1) % 8);
      arr.forEach((f, i) => {
        const g = arr[i + 1]; if (!g && nextRoofed) return;               // seam frame is drawn by the next segment
        const top = (d) => P(f, d, roofY(d) - 0.15), bot = (d) => P(f, d, roofY(d) - depthAt(d));
        truss.add(top(R.dIn + 0.4), top(R.dOut - 0.4), 0.22); truss.add(bot(R.dIn + 0.4), bot(R.dOut - 0.4), 0.22);
        const n = 9, span = R.dOut - R.dIn - 0.8;
        for (let k = 0; k < n; k++) { const d0 = R.dIn + 0.4 + (span * k) / n, d1 = R.dIn + 0.4 + (span * (k + 1)) / n; truss.add(k % 2 ? top(d0) : bot(d0), k % 2 ? bot(d1) : top(d1), 0.12); }
        if (g) ringD.forEach((d) => { truss.add(top(d), P(g, d, roofY(d) - 0.15), 0.14); truss.add(bot(d), P(g, d, roofY(d) - depthAt(d)), 0.14); truss.add(top(d), P(g, d, roofY(d) - depthAt(d)), 0.09); });
        const hb = bot(cd), head = P(f, cd, hb[1] - 2.6); cols.add(P(f, cd, 0), head, 0.9);
        const tx = -f.nz, tz = f.nx;
        truss.add(head, bot(Math.max(R.dIn + 1, cd - 5.5)), 0.3); truss.add(head, bot(R.dOut - 0.6), 0.3);
        truss.add(head, [hb[0] + tx * 2.6, hb[1], hb[2] + tz * 2.6], 0.24); truss.add(head, [hb[0] - tx * 2.6, hb[1], hb[2] - tz * 2.6], 0.24);
      });
    });
    group.add(truss.build(steel)); group.add(cols.build(new THREE.MeshStandardMaterial({ color: 0xbfc1c6, roughness: 0.8 })));
    // floodlights along the inner roof edge
    allSegFrames(2.4, 6).forEach((arr, si) => { if (roofed(si)) arr.slice(1).forEach((f) => lampPos.push(P(f, R.dIn + 0.9, R.yIn - 0.75))); });
  }
  // Floodlight masts at the corners when the roof does not go all the way round
  if (R.type !== 'full') {
    const masts = new BeamBatch(), white = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    [1, 3, 5, 7].forEach((si) => {
      const f = frame(SEGS[si], 0.5), h = S.top + 30, base = P(f, S.back + 9, 0), topP = P(f, S.back + 9, h);
      masts.add(base, topP, 1.3);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(9, 5.5, 0.8), white); panel.position.set(topP[0], h, topP[2]); panel.rotation.y = Math.atan2(-f.nx, -f.nz); panel.rotation.x = 0.25; group.add(panel);
      for (let k = -1; k <= 1; k++) lampPos.push([topP[0] - f.nz * k * 3, h, topP[2] + f.nx * k * 3]);
    });
    group.add(masts.build(new THREE.MeshStandardMaterial({ color: 0x9a9da3, roughness: 0.6, metalness: 0.5 })));
  }
  if (lampPos.length) {
    const lamps = new THREE.InstancedMesh(new THREE.BoxGeometry(1.1, 0.35, 0.5), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), lampPos.length);
    const m4 = new THREE.Matrix4(); lampPos.forEach((p, i) => { m4.makeTranslation(p[0], p[1], p[2]); lamps.setMatrixAt(i, m4); });
    lamps.frustumCulled = false; group.add(lamps);
    const glowGeo = new THREE.BufferGeometry(); glowGeo.setAttribute('position', new THREE.Float32BufferAttribute(lampPos.flat(), 3));
    const glow = new THREE.Points(glowGeo, new THREE.PointsMaterial({ map: glowTexture(), size: 5.5, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
    glow.frustumCulled = false; group.add(glow);
  }

  // ---- Façade on a plinth ---------------------------------------------------
  const F = S.facade; const fTex = facadeTexture(F.style, F.colors);
  const fg = new QuadGeo(); coarse.forEach((fr) => sweep(fg, fr, F.d, F.y0, F.d - 1.2, F.y1, 1 / 42, 1));
  const facade = new THREE.Mesh(fg.build(), new THREE.MeshStandardMaterial({ map: fTex, emissiveMap: fTex, emissive: F.glow, emissiveIntensity: 0.22, roughness: 0.4, metalness: F.style === 'mesh' ? 0.65 : 0.2, side: THREE.DoubleSide }));
  group.add(facade);
  addSweep([[F.d + 0.3, 0], [F.d + 0.3, F.y0]], mat(0x77787d));
  if (R.type !== 'none') addSweep([[F.d - 1.2, F.y1], [R.dOut, R.yOut]], mat(0xcfd1d6, { metalness: 0.5, roughness: 0.4 }), roofed);   // eave
  const warm = new THREE.MeshBasicMaterial({ color: 0xffc98a, toneMapped: false });
  [0, 2, 4, 6].forEach((si) => {                                   // entrances with warm light, one per side
    const f = frame(SEGS[si], 0.5); const [x, z] = pt(f, F.d + 0.35); const w = Math.min(si === 0 ? 26 : 16, Math.max(8, SEGS[si].len * 0.8));
    const gate = new THREE.Mesh(new THREE.BoxGeometry(w, 5.2, 0.5), warm); gate.position.set(x, 2.6, z); gate.rotation.y = Math.atan2(f.nx, f.nz); group.add(gate);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(w + 4, 0.5, 6), mat(S.band)); canopy.position.set(x + f.nx * 3, 5.6, z + f.nz * 3); canopy.rotation.y = gate.rotation.y; group.add(canopy);
  });

  // ---- Two big screens behind the goals -------------------------------------
  const board = makeScoreboard();
  [2, 6].forEach((si) => {
    const f = frame(SEGS[si], 0.5), d = S.back - 4; const [x, z] = pt(f, d);
    const y = roofed(si) ? roofY(d) - depthAt(d) - 2.6 : S.top + 3.4;
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(13.2, 4.6), new THREE.MeshBasicMaterial({ map: board.tex, toneMapped: false }));
    scr.position.set(x, y, z); scr.rotation.y = Math.atan2(-f.nx, -f.nz); group.add(scr);
    const back = new THREE.Mesh(new THREE.BoxGeometry(13.8, 5.1, 0.4), mat(0x15161b)); back.position.set(x + f.nx * 0.25, y, z + f.nz * 0.25); back.rotation.y = scr.rotation.y; group.add(back);
    if (!roofed(si)) { const post = new THREE.Mesh(new THREE.BoxGeometry(1, 6, 1), mat(0x55585e)); post.position.set(x + f.nx * 0.8, y - 4.5, z + f.nz * 0.8); group.add(post); }
  });

  return { group, board, facade };
}

/** Free GPU memory of a group that is being replaced (venue switch). */
export function disposeGroup(scene, group) {
  if (!group) return; scene.remove(group);
  group.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    ms.forEach((m) => { ['map', 'emissiveMap'].forEach((k) => { if (m[k]) m[k].dispose(); }); m.dispose(); });
  });
}

export function buildLighting(scene) {
  scene.background = new THREE.Color(0x070a14);
  scene.fog = new THREE.FogExp2(0x0a0d18, 0.0011);
  scene.add(new THREE.HemisphereLight(0xaab8e6, 0x2b2a22, 1.6));
  const mk = (x, z, i, shadow) => {
    const l = new THREE.DirectionalLight(0xf3f6ff, i); l.position.set(x, 62, z); l.target.position.set(0, 0, 0);
    scene.add(l, l.target);
    if (shadow) {
      l.castShadow = true; l.shadow.mapSize.set(2048, 2048);
      const c = l.shadow.camera; c.left = -62; c.right = 62; c.top = 44; c.bottom = -44; c.near = 10; c.far = 160; l.shadow.bias = -0.0006;
    }
    return l;
  };
  mk(55, 48, 2.0, true); mk(-55, 48, 1.5); mk(55, -48, 1.5); mk(-55, -48, 1.5);
  // stars
  const n = 500, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, e = 0.12 + Math.random() * 1.3; p[i * 3] = Math.cos(a) * Math.cos(e) * 1800; p[i * 3 + 1] = Math.sin(e) * 1800; p[i * 3 + 2] = Math.sin(a) * Math.cos(e) * 1800; }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(p, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xcfd8ff, size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.7 })));
}

/** Generic Iraqi city surroundings: plaza, main road, parking, date palms, low-rise blocks, training pitch. */
export function buildSurroundings(scene) {
  const g = new THREE.Group(); scene.add(g);
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, ...o });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400).rotateX(-Math.PI / 2), std(0x2a261f)); ground.position.y = -0.05; g.add(ground);
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(330, 250).rotateX(-Math.PI / 2), std(0x55524c)); plaza.position.y = -0.02; g.add(plaza);
  // Port Said Street on the west side, with a median
  const road = new THREE.Mesh(new THREE.PlaneGeometry(1600, 26).rotateX(-Math.PI / 2), std(0x1b1c20)); road.position.set(0, 0, 185); g.add(road);
  const median = new THREE.Mesh(new THREE.BoxGeometry(1600, 0.3, 2), std(0x6a6a66)); median.position.set(0, 0.1, 185); g.add(median);
  // training pitch + parking
  const tp = new THREE.Mesh(new THREE.PlaneGeometry(100, 64).rotateX(-Math.PI / 2), std(0x2c6b2a)); tp.position.set(-250, 0, -10); g.add(tp);
  const park = new THREE.Mesh(new THREE.PlaneGeometry(120, 70).rotateX(-Math.PI / 2), std(0x232429)); park.position.set(245, 0, 20); g.add(park);
  const rnd = (() => { let s = 99; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  // parked cars
  const cars = new THREE.InstancedMesh(new THREE.BoxGeometry(4.3, 1.4, 1.8), new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.4 }), 260);
  let ci = 0;
  for (let r = 0; r < 10; r++) for (let c = 0; c < 26; c++) {
    if (rnd() < 0.18) { m.makeScale(0, 0, 0); cars.setMatrixAt(ci, m); } else { m.makeTranslation(190 + c * 4.4, 0.7, -12 + r * 6.6); cars.setMatrixAt(ci, m); }
    cars.setColorAt(ci, col.set([0xdedede, 0x1c1c1f, 0x8a8d93, 0x6e1318, 0x23355c, 0xcbb994][Math.floor(rnd() * 6)])); ci++;
  }
  cars.frustumCulled = false; g.add(cars);
  // low-rise sand-coloured blocks
  const bCount = 420; const bl = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ map: windowsTexture(), roughness: 0.9, emissive: 0x3a2a12, emissiveIntensity: 0.35 }), bCount);
  for (let i = 0; i < bCount; i++) {
    let x, z; do { x = (rnd() - 0.5) * 1700; z = (rnd() - 0.5) * 1700; } while ((Math.abs(x) < 330 && Math.abs(z) < 165) || Math.abs(z - 185) < 22);
    const h = 5 + rnd() * 11; v.set(x, h / 2, z); sc.set(14 + rnd() * 22, h, 12 + rnd() * 20); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0);
    m.compose(v, q, sc); bl.setMatrixAt(i, m); bl.setColorAt(i, col.set([0xcdb892, 0xb9a47e, 0xd8c9a8, 0xa8967a][Math.floor(rnd() * 4)]));
  }
  bl.frustumCulled = false; g.add(bl);
  // date palms along the road and plaza
  const pos = []; for (let x = -420; x <= 420; x += 16) { pos.push([x, 169], [x, 185]); }
  for (let i = 0; i < 40; i++) { const a = (i / 40) * 6.283; pos.push([Math.cos(a) * 158, Math.sin(a) * 120]); }
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.4, 9, 6), std(0x5a4632), pos.length);
  const crowns = new THREE.InstancedMesh(new THREE.ConeGeometry(3.6, 2.6, 7).rotateX(Math.PI), std(0x2f5a2a), pos.length);
  pos.forEach(([x, z], i) => { m.makeTranslation(x, 4.5, z); trunks.setMatrixAt(i, m); m.makeTranslation(x, 9.6, z); crowns.setMatrixAt(i, m); });
  trunks.frustumCulled = crowns.frustumCulled = false; g.add(trunks, crowns);
  // street lights (points only – cheap)
  const sp = []; for (let x = -700; x <= 700; x += 30) sp.push(x, 9, 173, x, 9, 197);
  const sgeo = new THREE.BufferGeometry(); sgeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  g.add(new THREE.Points(sgeo, new THREE.PointsMaterial({ map: glowTexture(), color: 0xffc070, size: 9, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
  return g;
}
