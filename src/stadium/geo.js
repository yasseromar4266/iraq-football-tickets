// Small geometry helpers shared by the stadium builders.
import * as THREE from 'three';
import { pt } from './layout.js';

/** Collects quads into one flat-shaded BufferGeometry. */
export class QuadGeo {
  constructor() { this.p = []; this.uv = []; }
  quad(a, b, c, d, ua = [0, 0], ub = [1, 0], uc = [1, 1], ud = [0, 1]) {
    this.p.push(...a, ...b, ...c, ...a, ...c, ...d);
    this.uv.push(...ua, ...ub, ...uc, ...ua, ...uc, ...ud);
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeVertexNormals();
    return g;
  }
}

/** Sweep a straight profile segment (d0,y0)->(d1,y1) along a list of frames. */
export function sweep(geo, frames, d0, y0, d1, y1, uScale = 1, vScale = 1) {
  for (let i = 0; i < frames.length - 1; i++) {
    const f = frames[i], g = frames[i + 1];
    const [ax, az] = pt(f, d0), [bx, bz] = pt(g, d0), [cx, cz] = pt(g, d1), [dx, dz] = pt(f, d1);
    const u0 = (f.s || 0) * uScale, u1 = (g.s || 0) * uScale;
    geo.quad([ax, y0, az], [bx, y0, bz], [cx, y1, cz], [dx, y1, dz], [u0, 0], [u1, 0], [u1, vScale], [u0, vScale]);
  }
}

/** Merge several axis-aligned boxes into one geometry. parts: [{ size:[w,h,d], pos:[x,y,z] }] */
export function mergeBoxes(parts) {
  const p = [], n = [];
  for (const part of parts) {
    const g = new THREE.BoxGeometry(...part.size).translate(...part.pos).toNonIndexed();
    p.push(...g.attributes.position.array); n.push(...g.attributes.normal.array); g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
  return out;
}

/** Batches straight beams (steel members, columns, poles) into a single InstancedMesh. */
export class BeamBatch {
  constructor() { this.items = []; }
  add(a, b, w, h = w) { this.items.push([a, b, w, h]); }
  build(material) {
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, this.items.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), sc = new THREE.Vector3();
    const zAxis = new THREE.Vector3(0, 0, 1), dir = new THREE.Vector3();
    this.items.forEach(([a, b, w, h], i) => {
      dir.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const len = dir.length() || 0.001; dir.divideScalar(len);
      q.setFromUnitVectors(zAxis, dir); pos.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); sc.set(w, h, len);
      m.compose(pos, q, sc); mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true; mesh.frustumCulled = false;
    return mesh;
  }
}

export function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
export function texFrom(c, repeat) {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
