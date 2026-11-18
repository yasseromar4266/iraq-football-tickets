import * as THREE from 'three';
// Procedural canvas textures – no image files, nothing downloaded.
import { canvas, texFrom } from './geo.js';

function rnd(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

/** Pitch + run-off (+ athletics track for oval venues). Covers the whole floor of the bowl. */
export function pitchTexture(v) {
  const Wm = 2 * (v.cx + v.r0) + 2, Hm = 2 * (v.cz + v.r0) + 2, S = Math.min(16, Math.floor(2048 / Wm));
  const W = Wm * S, Hh = Hm * S; const [c, g] = canvas(W, Hh);
  const X = (x) => (x + Wm / 2) * S, Z = (z) => (z + Hm / 2) * S;
  g.fillStyle = '#1f4d22'; g.fillRect(0, 0, W, Hh);                // run-off, darker
  if (v.track) {
    const oval = (R) => { g.beginPath(); g.arc(X(42.2), Z(0), R * S, -Math.PI / 2, Math.PI / 2); g.arc(X(-42.2), Z(0), R * S, Math.PI / 2, Math.PI * 1.5); g.closePath(); };
    g.fillStyle = '#a8482f'; oval(46.4); g.fill(); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = Math.max(1, 0.06 * S);
    for (let k = 0; k <= 8; k++) { oval(36.5 + k * 1.22); g.stroke(); }
    g.fillStyle = '#245a26'; oval(36.4); g.fill();
  }
  for (let i = 0; i < 18; i++) {                                    // mowing stripes
    g.fillStyle = i % 2 ? '#2f7d2c' : '#3a9434'; g.fillRect(X(-52.5 + (i * 105) / 18), Z(-34), (105 / 18) * S + 1, 68 * S);
  }
  const r = rnd(7); g.globalAlpha = 0.05;                          // grass grain
  for (let i = 0; i < 26000; i++) { g.fillStyle = r() > 0.5 ? '#000' : '#cfe8a0'; g.fillRect(X(-52.5) + r() * 105 * S, Z(-34) + r() * 68 * S, 2, 2 + r() * 4); }
  g.globalAlpha = 1; g.strokeStyle = '#f4f7f2'; g.lineWidth = 0.14 * S; g.fillStyle = '#f4f7f2';
  g.strokeRect(X(-52.5), Z(-34), 105 * S, 68 * S);
  g.beginPath(); g.moveTo(X(0), Z(-34)); g.lineTo(X(0), Z(34)); g.stroke();
  g.beginPath(); g.arc(X(0), Z(0), 9.15 * S, 0, 7); g.stroke();
  g.beginPath(); g.arc(X(0), Z(0), 0.22 * S, 0, 7); g.fill();
  for (const sgn of [-1, 1]) {
    const gx = sgn * 52.5;
    g.strokeRect(Math.min(X(gx), X(gx - sgn * 16.5)), Z(-20.16), 16.5 * S, 40.32 * S);
    g.strokeRect(Math.min(X(gx), X(gx - sgn * 5.5)), Z(-9.16), 5.5 * S, 18.32 * S);
    g.beginPath(); g.arc(X(gx - sgn * 11), Z(0), 0.2 * S, 0, 7); g.fill();
    const a = Math.acos(5.5 / 9.15);
    g.beginPath(); g.arc(X(gx - sgn * 11), Z(0), 9.15 * S, sgn > 0 ? Math.PI - a : -a, sgn > 0 ? Math.PI + a : a); g.stroke();
    for (const zs of [-1, 1]) {                                     // corner arcs
      const a0 = sgn > 0 ? (zs > 0 ? Math.PI : Math.PI / 2) : (zs > 0 ? -Math.PI / 2 : 0);
      g.beginPath(); g.arc(X(gx), Z(zs * 34), S, a0, a0 + Math.PI / 2); g.stroke();
    }
  }
  g.setLineDash([S * 0.6, S * 0.5]); g.lineWidth = 0.1 * S;       // technical areas, west touchline
  for (const sx of [-12, 12]) g.strokeRect(X(sx - 8), Z(35), 16 * S, 2.6 * S);
  g.setLineDash([]);
  return { tex: texFrom(c), width: Wm, depth: Hm };
}

/** Façade cladding. style: mesh | palm | arches | sails | panels | concrete. colors = [dark, light, accent]. */
export function facadeTexture(style = 'mesh', colors = ['#15131c', '#d8d8e2', '#8a5ab0']) {
  const [c, g] = canvas(1024, 512); const r = rnd(42); const [dark, light, accent] = colors;
  g.fillStyle = dark; g.fillRect(0, 0, 1024, 512);
  if (style === 'mesh') {                                          // Al-Madina: triangle lattice + crescents
    const tw = 64, th = 64;
    for (let row = 0; row < 8; row++) for (let col = -1; col < 33; col++) {
      const x = col * (tw / 2), y = row * th, up = (col + row) % 2 === 0;
      const v = 150 + Math.floor(r() * 85); const violet = r() > 0.82;
      g.fillStyle = violet ? `rgb(${v * 0.55},${v * 0.35},${v * 0.75})` : `rgb(${v},${v},${v + 8})`;
      g.beginPath();
      if (up) { g.moveTo(x, y + th); g.lineTo(x + tw / 2, y); g.lineTo(x + tw, y + th); }
      else { g.moveTo(x, y); g.lineTo(x + tw, y); g.lineTo(x + tw / 2, y + th); }
      g.closePath(); g.fill(); g.strokeStyle = '#0e0d13'; g.lineWidth = 3; g.stroke();
    }
    g.globalAlpha = 0.5; g.fillStyle = '#0b0a10';
    for (let y = 3; y < 512; y += 6) for (let x = (y / 6) % 2 ? 3 : 6; x < 1024; x += 6) g.fillRect(x, y, 2, 2);
    g.globalAlpha = 1;
    for (let i = 0; i < 4; i++) {
      const x = 128 + i * 256, y = 256, R = 150;
      g.beginPath(); g.arc(x, y, R, 0, 7); g.arc(x + 62, y - 30, R * 0.84, 0, 7, true); g.closePath(); g.fillStyle = 'rgba(245,245,252,0.92)'; g.fill('evenodd');
    }
  } else if (style === 'palm') {                                   // Basra: undulating ribs like palm-trunk bark
    for (let i = 0; i < 32; i++) {
      const x0 = i * 32; g.beginPath(); g.moveTo(x0, 0);
      for (let y = 0; y <= 512; y += 16) g.lineTo(x0 + 13 + Math.sin(y * 0.035 + i * 0.9) * 9, y);
      for (let y = 512; y >= 0; y -= 16) g.lineTo(x0 + 1 + Math.sin(y * 0.035 + i * 0.9) * 9, y);
      g.closePath(); g.fillStyle = i % 2 ? light : accent; g.fill();
    }
    g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 60; y < 512; y += 90) g.fillRect(0, y, 1024, 5);
  } else if (style === 'arches') {                                 // Karbala / Najaf: pointed arches + geometric band
    g.fillStyle = light; g.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 8; i++) {
      const x = i * 128 + 64; g.beginPath(); g.moveTo(x - 44, 512); g.lineTo(x - 44, 250); g.quadraticCurveTo(x - 44, 150, x, 96); g.quadraticCurveTo(x + 44, 150, x + 44, 250); g.lineTo(x + 44, 512); g.closePath();
      g.fillStyle = dark; g.fill(); g.strokeStyle = accent; g.lineWidth = 9; g.stroke();
      g.fillStyle = 'rgba(255,205,130,.55)'; g.fillRect(x - 30, 300, 60, 212);
    }
    g.fillStyle = accent; g.fillRect(0, 20, 1024, 44);
    g.fillStyle = light; for (let x = 0; x < 1024; x += 32) { g.beginPath(); g.moveTo(x + 16, 24); g.lineTo(x + 30, 42); g.lineTo(x + 16, 60); g.lineTo(x + 2, 42); g.closePath(); g.fill(); }
  } else if (style === 'sails') {                                  // Al-Minaa: sail-like sweeping panels
    for (let i = -2; i < 10; i++) {
      const x = i * 128; g.beginPath(); g.moveTo(x, 512); g.quadraticCurveTo(x + 40, 200, x + 150, 0); g.lineTo(x + 235, 0); g.quadraticCurveTo(x + 120, 220, x + 108, 512); g.closePath();
      g.fillStyle = i % 2 ? light : accent; g.fill();
    }
  } else if (style === 'panels') {                                 // vertical fins / panels
    for (let i = 0; i < 32; i++) { const v = r(); g.fillStyle = v > 0.82 ? accent : light; g.globalAlpha = 0.75 + v * 0.25; g.fillRect(i * 32 + 3, 0, 26, 512); }
    g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 120; y < 512; y += 130) g.fillRect(0, y, 1024, 6);
  } else {                                                         // concrete frame with open bays
    g.fillStyle = light; g.fillRect(0, 0, 1024, 512);
    for (let row = 0; row < 3; row++) for (let i = 0; i < 16; i++) { g.fillStyle = dark; g.fillRect(i * 64 + 8, 30 + row * 160, 48, 120); g.fillStyle = 'rgba(255,200,120,.16)'; g.fillRect(i * 64 + 8, 100 + row * 160, 48, 50); }
    g.fillStyle = accent; for (let row = 0; row <= 3; row++) g.fillRect(0, row * 160 + 6, 1024, 16);
  }
  return texFrom(c, true);
}

/** Roof cladding strips in the venue's colours. */
export function roofTexture(cols = ['#17121f', '#3b1d52', '#221830', '#4a2466']) {
  const [c, g] = canvas(256, 256);
  for (let i = 0; i < 16; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect(i * 16, 0, 16, 256); }
  g.fillStyle = 'rgba(128,128,128,0.12)'; for (let y = 0; y < 256; y += 32) g.fillRect(0, y, 256, 2);
  return texFrom(c, true);
}
/** Solar panels on the metal-sheet roof ends. */
export function solarTexture() {
  const [c, g] = canvas(256, 256); g.fillStyle = '#9aa2ad'; g.fillRect(0, 0, 256, 256);
  for (let y = 8; y < 256; y += 62) for (let x = 8; x < 256; x += 62) {
    g.fillStyle = '#0d1f45'; g.fillRect(x, y, 54, 54); g.strokeStyle = '#2a4f95'; g.lineWidth = 1;
    for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x + k * 13.5, y); g.lineTo(x + k * 13.5, y + 54); g.moveTo(x, y + k * 13.5); g.lineTo(x + 54, y + k * 13.5); g.stroke(); }
  }
  return texFrom(c, true);
}

export function flagTexture() {
  const [c, g] = canvas(300, 200);
  g.fillStyle = '#ce1126'; g.fillRect(0, 0, 300, 67); g.fillStyle = '#ffffff'; g.fillRect(0, 67, 300, 66); g.fillStyle = '#000'; g.fillRect(0, 133, 300, 67);
  g.fillStyle = '#007a3d'; g.font = 'bold 46px "Segoe UI", Tahoma, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.direction = 'rtl'; g.fillText('الله أكبر', 150, 101);
  return texFrom(c);
}

const ADS = [
  ['بغداد · BAGHDAD', '#0b2a5c', '#ffffff'], ['دجلة للاتصالات  DIJLA TELECOM', '#e8eef7', '#0b2a5c'],
  ['شاي الزقورة  ZIGGURAT TEA', '#8c1c13', '#fff3d6'], ['مطعم المسكوف  MASGOUF HOUSE', '#11311f', '#f6d77a'],
  ['الدوري العراقي الممتاز', '#101014', '#ffffff'], ['طيران سومر  SUMER AIR', '#f3f6fb', '#c8102e'],
  ['تمور البصرة  BASRA DATES', '#3d2408', '#ffd89a'], ['أسود الرافدين', '#0d5c2e', '#ffffff'],
];
/** One long strip of locally-inspired (invented) sponsors for the LED boards. */
export function adTexture() {
  const pw = 512, [c, g] = canvas(pw * ADS.length, 64);
  ADS.forEach(([txt, bg, fg], i) => {
    g.fillStyle = bg; g.fillRect(i * pw, 0, pw, 64); g.fillStyle = fg; g.font = 'bold 34px "Segoe UI", Tahoma, Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, i * pw + pw / 2, 34, pw - 30);
  });
  const t = texFrom(c, true); return t;
}

export function netTexture() {
  const [c, g] = canvas(128, 128); g.clearRect(0, 0, 128, 128); g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1.5;
  for (let i = 0; i <= 128; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); }
  return texFrom(c, true);
}
export function glowTexture() {
  const [c, g] = canvas(64, 64); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(235,242,255,0.55)'); gr.addColorStop(1, 'rgba(200,220,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return texFrom(c);
}
export function windowsTexture() {
  const [c, g] = canvas(64, 64); const r = rnd(5); g.fillStyle = '#b9a98c'; g.fillRect(0, 0, 64, 64);
  for (let y = 6; y < 64; y += 16) for (let x = 5; x < 64; x += 15) { g.fillStyle = r() > 0.55 ? '#ffd58a' : '#3b3a3f'; g.fillRect(x, y, 8, 9); }
  return texFrom(c, true);
}

/** Scoreboard canvas, redrawn by the match simulation. */
export function makeScoreboard() {
  const [c, g] = canvas(640, 224); const tex = texFrom(c);
  const draw = (fx, score, clock, lang) => {
    g.fillStyle = '#06070c'; g.fillRect(0, 0, 640, 224);
    g.fillStyle = '#6d2a86'; g.fillRect(0, 0, 640, 40); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 22px "Segoe UI", Tahoma, Arial'; g.fillText(fx.competition[lang], 320, 21, 600);
    g.font = 'bold 40px "Segoe UI", Tahoma, Arial';
    g.fillStyle = fx.home.kit; g.fillRect(24, 70, 14, 84); g.fillStyle = fx.away.kit; g.fillRect(602, 70, 14, 84);
    g.fillStyle = '#fff'; g.fillText(fx.home.name[lang], 150, 112, 210); g.fillText(fx.away.name[lang], 490, 112, 210);
    g.font = 'bold 78px "Segoe UI", Arial'; g.fillStyle = '#ffd24a'; g.fillText(`${score[0]} - ${score[1]}`, 320, 112);
    g.font = 'bold 30px "Segoe UI", Arial'; g.fillStyle = '#9fe8b0'; g.fillText(clock, 320, 188);
    tex.needsUpdate = true;
  };
  return { tex, draw };
}

/** Weathered concrete: fine grain, a few darker stains and form-work lines. Tiles. */
export function concreteTexture() {
  const [c, g] = canvas(256, 256); const r = rnd(11);
  g.fillStyle = '#b9b7b0'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) { const v = 150 + Math.floor(r() * 70); g.fillStyle = `rgba(${v},${v},${v - 4},${0.25 + r() * 0.3})`; g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1 + r() * 2); }
  for (let i = 0; i < 14; i++) { const x = r() * 256, y = r() * 256, rad = 10 + r() * 40; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(90,88,82,0.18)'); gr.addColorStop(1, 'rgba(90,88,82,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  g.fillStyle = 'rgba(70,70,66,0.25)'; g.fillRect(0, 0, 256, 2); g.fillRect(0, 0, 2, 256);
  const t = texFrom(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
