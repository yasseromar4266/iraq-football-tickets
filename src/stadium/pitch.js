// Pitch, goals, dugouts, LED boards.
import * as THREE from 'three';
import { pitchTexture, adTexture, netTexture } from './textures.js';

export function buildPitch(scene, venue) {
  const group = new THREE.Group(); scene.add(group);
  const pt = pitchTexture(venue);
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(pt.width, pt.depth).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: pt.tex, roughness: 0.95, metalness: 0 }));
  grass.position.y = 0.02; grass.receiveShadow = true; group.add(grass);

  // Goals
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const netMat = new THREE.MeshBasicMaterial({ map: netTexture(), transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  for (const sgn of [-1, 1]) {
    const g = new THREE.Group(); g.position.x = sgn * 52.5; group.add(g);
    for (const z of [-3.66, 3.66]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.44, 10), white); p.position.set(0, 1.22, z); p.castShadow = true; g.add(p); }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 7.44, 10).rotateX(Math.PI / 2), white); bar.position.y = 2.44; g.add(bar);
    const mk = (w, h, rep) => { const m = netMat.clone(); m.map = netMat.map.clone(); m.map.repeat.set(...rep); m.map.needsUpdate = true; return new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); };
    const back = mk(7.32, 2.44, [12, 4]); back.rotation.y = Math.PI / 2; back.position.set(sgn * 2, 1.22, 0); g.add(back);
    const top = mk(2, 7.32, [3, 12]); top.rotation.x = -Math.PI / 2; top.position.set(sgn * 1, 2.44, 0); g.add(top);
    for (const z of [-3.66, 3.66]) { const s = mk(2, 2.44, [3, 4]); s.position.set(sgn * 1, 1.22, z); g.add(s); }
  }

  // Dugouts – translucent barrel shelters on the west touchline (as in the photos)
  const shell = new THREE.MeshStandardMaterial({ color: 0xe9eef2, transparent: true, opacity: 0.6, roughness: 0.25, side: THREE.DoubleSide });
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x5b2a66, roughness: 0.7 });
  for (const x of [-12, 12]) {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 12, 20, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), shell);
    d.position.set(x, 0.05, 38.4); group.add(d);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(11, 0.45, 0.6), benchMat); bench.position.set(x, 0.45, 38.9); group.add(bench);
  }
  const fourth = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.5, 0.5), new THREE.MeshStandardMaterial({ color: 0xc8102e }));
  fourth.position.set(0, 0.75, 37.6); group.add(fourth);

  // LED advertising boards: east touchline and behind both goals
  const adTex = adTexture(); const boards = [];
  const mkBoard = (len, x, z, rotY) => {
    const t = adTex.clone(); t.needsUpdate = true; t.repeat.set(len / 80, 1);
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.95, 0.25), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
    m.position.set(x, 0.5, z); m.rotation.y = rotY; group.add(m); boards.push(t);
  };
  mkBoard(100, 0, -37.6, 0); mkBoard(58, -57.4, 0, Math.PI / 2); mkBoard(58, 57.4, 0, -Math.PI / 2);

  return { group, update(time) { boards.forEach((t, i) => { t.offset.x = time * 0.012 + i * 0.3; }); } };
}
