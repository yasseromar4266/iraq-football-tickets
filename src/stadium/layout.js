// Pure geometry + seating model (no Three.js) so it can be unit-tested in Node.
import { VENUES } from '../config.js';

const H = Math.PI / 2;
let cx, cz, r0;
/** Current venue + its eight bowl segments. West = main stand (dugouts, VIP), then clockwise corners/sides. */
export let V = null;
export let SEGS = [];
export function setVenue(v) {
  V = v; ({ cx, cz, r0 } = v);
  SEGS = [
    { kind: 'side', name: 'west', ax: cx, az: cz, bx: -cx, bz: cz, nx: 0, nz: 1 },
    { kind: 'corner', name: 'nw', cx: -cx, cz: cz, a0: H, a1: 2 * H },
    { kind: 'side', name: 'north', ax: -cx, az: cz, bx: -cx, bz: -cz, nx: -1, nz: 0 },
    { kind: 'corner', name: 'ne', cx: -cx, cz: -cz, a0: 2 * H, a1: 3 * H },
    { kind: 'side', name: 'east', ax: -cx, az: -cz, bx: cx, bz: -cz, nx: 0, nz: -1 },
    { kind: 'corner', name: 'se', cx: cx, cz: -cz, a0: 3 * H, a1: 4 * H },
    { kind: 'side', name: 'south', ax: cx, az: -cz, bx: cx, bz: cz, nx: 1, nz: 0 },
    { kind: 'corner', name: 'sw', cx: cx, cz: cz, a0: 0, a1: H },
  ];
  SEGS.forEach((s) => { if (s.kind === 'side') s.len = Math.hypot(s.bx - s.ax, s.bz - s.az); });
}
setVenue(VENUES[0]);

export const STAND_NAMES = {
  west: { ar: 'المدرج الغربي', en: 'West Stand' }, east: { ar: 'المدرج الشرقي', en: 'East Stand' },
  north: { ar: 'المدرج الشمالي', en: 'North Stand' }, south: { ar: 'المدرج الجنوبي', en: 'South Stand' },
  nw: { ar: 'الزاوية الشمالية الغربية', en: 'North-West Corner' }, ne: { ar: 'الزاوية الشمالية الشرقية', en: 'North-East Corner' },
  se: { ar: 'الزاوية الجنوبية الشرقية', en: 'South-East Corner' }, sw: { ar: 'الزاوية الجنوبية الغربية', en: 'South-West Corner' },
};

/** Frame on a segment at fraction t: origin o and outward normal n. */
export function frame(seg, t) {
  if (seg.kind === 'side') {
    return { ox: seg.ax + (seg.bx - seg.ax) * t, oz: seg.az + (seg.bz - seg.az) * t, nx: seg.nx, nz: seg.nz };
  }
  const a = seg.a0 + (seg.a1 - seg.a0) * t;
  return { ox: seg.cx, oz: seg.cz, nx: Math.cos(a), nz: Math.sin(a) };
}
/** World XZ of a frame at offset d outward from the first-row line. */
export function pt(f, d) { return [f.ox + f.nx * (r0 + d), f.oz + f.nz * (r0 + d)]; }
export function segLen(seg, d) { return seg.kind === 'side' ? seg.len : (r0 + d) * H; }

/** Frames for every segment (array of arrays), each with cumulative arc length `s` (at d = 20). */
export function allSegFrames(sideStep = 1e9, cornerSteps = 8) {
  let s = 0; const out = [];
  SEGS.forEach((seg, si) => {
    const L = segLen(seg, 20);
    const n = seg.kind === 'side' ? Math.max(1, Math.round(seg.len / sideStep)) : cornerSteps;
    const arr = [];
    for (let i = 0; i <= n; i++) { const f = frame(seg, i / n); f.s = s + L * (i / n); f.seg = si; arr.push(f); }
    out.push(arr); s += L;
  });
  out.total = s;
  return out;
}

// 5x7 glyphs for the seat lettering on the east upper tier.
const GLYPH = {
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  '>': ['10000', '01000', '00100', '00010', '00100', '01000', '10000'],
  '<': ['00001', '00010', '00100', '01000', '00100', '00010', '00001'],
};

function hash2(a, b) {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

const isMid = (k, nb) => k === Math.floor((nb - 1) / 2) || k === Math.ceil((nb - 1) / 2);
function categoryOf(tier, seg, k, nb) {
  const long = seg.name === 'west' || seg.name === 'east';
  if (tier.id === 'lower') {
    if (seg.name === 'west' && isMid(k, nb)) return 'vip';
    if (long) return 'cat1';
    if (seg.kind === 'corner') return 'cat2';
    return 'cat3';
  }
  return long ? 'cat2' : 'cat3';
}

/** Build the whole seating model for the current venue (or the one passed in). */
export function buildLayout(venue) {
  if (venue) setVenue(venue);
  const S = V, nTones = V.tones.length, LT = V.lettering;
  const blocks = [];
  const X = [], Y = [], Z = [], YAW = [], BLK = [], ROW = [], NUM = [], TONE = [];
  S.tiers.forEach((tier, ti) => {
    let id = (ti + 1) * 100;
    SEGS.forEach((seg, si) => {
      const nb = seg.kind === 'corner' ? Math.max(1, Math.round(segLen(seg, tier.d0 + (tier.rows * tier.dd) / 2) / 45)) : Math.max(1, Math.round(seg.len / 16));
      for (let k = 0; k < nb; k++) {
        id++;
        const b = {
          index: blocks.length, id: String(id), tier: tier.id, tierIndex: ti, seg: si, segName: seg.name, kind: seg.kind,
          t0: k / nb, t1: (k + 1) / nb, cat: categoryOf(tier, seg, k, nb),
          seatStart: X.length, seatCount: 0, rowStart: [], rowCount: [],
        };
        const vipCut = !!S.boxes && tier.id === 'upper' && seg.name === 'west' && isMid(k, nb);
        b.hasBoxes = vipCut;
        for (let r = 0; r < tier.rows; r++) {
          const d = tier.d0 + r * tier.dd, y = tier.y0 + r * tier.dy;
          b.rowStart.push(X.length);
          if (vipCut && r < 6) { b.rowCount.push(0); continue; }
          const full = segLen(seg, d), L = full / nb;
          const n = Math.floor((L - 2 * S.aisle) / S.seatPitch) + 1;
          const start = (L - (n - 1) * S.seatPitch) / 2;
          for (let j = 0; j < n; j++) {
            const t = (k * L + start + j * S.seatPitch) / full;
            const f = frame(seg, t); const [x, z] = pt(f, d);
            X.push(x); Y.push(y); Z.push(z); YAW.push(Math.atan2(-f.nx, -f.nz));
            BLK.push(b.index); ROW.push(r); NUM.push(j);
            // Seat colour tone = index into the venue's seat colours (last one is the light/accent colour).
            let tone;
            if (LT && tier.id === LT.tier && seg.name === LT.seg && nb === LT.word.length && n >= 20) {
              const g = GLYPH[LT.word[k]];
              const px = Math.floor((j - (n - 20) / 2) / 4), py = Math.floor(((tier.rows - 1 - r) * 7) / tier.rows);
              tone = px >= 0 && px < 5 && j >= (n - 20) / 2 && g[py][px] === '1' ? nTones - 1 : (hash2(j, r) > 0.5 ? 0 : 1);
            } else if (S.pattern === 'mosaic') {
              tone = Math.floor(hash2(j + si * 31 + k * 7, r + ti * 13) * nTones);
            } else {
              const v = noise2((x + z * 0.6) * 0.085 + ti * 9, r * 0.33 + (x - z) * 0.03);
              tone = v > 0.6 ? nTones - 1 : (hash2(j + si * 31, r + ti * 7) > 0.45 ? 0 : Math.min(1, nTones - 2));
            }
            TONE.push(tone);
          }
          b.rowCount.push(n);
        }
        b.seatCount = X.length - b.seatStart;
        const fm = frame(seg, (b.t0 + b.t1) / 2);
        const dm = tier.d0 + (tier.rows * tier.dd) / 2; const [mx, mz] = pt(fm, dm);
        b.center = { x: mx, y: tier.y0 + (tier.rows * tier.dy) / 2, z: mz };
        b.nx = fm.nx; b.nz = fm.nz;
        b.dFront = tier.d0 - 0.4; b.dBack = tier.d0 + tier.rows * tier.dd - 0.2;
        b.yFront = tier.y0 - 0.2; b.yBack = tier.y0 + tier.rows * tier.dy;
        blocks.push(b);
      }
    });
  });
  return {
    blocks, count: X.length,
    x: Float32Array.from(X), y: Float32Array.from(Y), z: Float32Array.from(Z), yaw: Float32Array.from(YAW),
    block: Uint16Array.from(BLK), row: Uint8Array.from(ROW), num: Uint16Array.from(NUM), tone: Uint8Array.from(TONE),
  };
}

/** Frames spanning one block (for outline / pick slab). */
export function blockFrames(b, steps) {
  const seg = SEGS[b.seg]; const n = steps || (b.kind === 'corner' ? 8 : 1); const arr = [];
  for (let i = 0; i <= n; i++) arr.push(frame(seg, b.t0 + ((b.t1 - b.t0) * i) / n));
  return arr;
}
/** Top-down outline polygon of a block as [[x,z],...]. */
export function blockOutline(b) {
  const fr = blockFrames(b);
  return [...fr.map((f) => pt(f, b.dFront)), ...fr.slice().reverse().map((f) => pt(f, b.dBack))];
}

/** Viewing score 4.0 – 9.9 from distance, elevation and how far the seat is toward a goal end. */
export function viewScore(L, i) {
  const x = L.x[i], y = L.y[i], z = L.z[i];
  const dist = Math.hypot(x, z), el = (Math.atan2(y, dist) * 180) / Math.PI;
  const s = 9.9 - 0.06 * Math.max(0, dist - 40) - 2.6 * (Math.abs(x) / 72) ** 2 - 0.05 * Math.abs(el - 20);
  return Math.round(Math.min(9.9, Math.max(4, s)) * 10) / 10;
}
