// All demo data lives here: stadium proportions, ticket categories, fees and fixtures.
// Change prices / fixtures in this file only.

// ---------------------------------------------------------------------------------------
// VENUES. Every stadium is described by a few numbers; the 3D model is generated from them.
// Bowl = rounded rectangle: core half-sizes (cx, cz) + corner radius r0, all in metres (estimated).
// ---------------------------------------------------------------------------------------
const tiers = (rowsLower, rowsUpper, o = {}) => {
  const lo = { id: 'lower', rows: rowsLower, d0: 0.8, y0: o.y0 || 1.6, dd: 0.8, dy: o.dyL || 0.4 };
  if (!rowsUpper) return [lo];
  return [lo, { id: 'upper', rows: rowsUpper, d0: lo.d0 + rowsLower * 0.8 + 2.2, y0: lo.y0 + rowsLower * lo.dy + 3.4, dd: 0.8, dy: o.dyU || 0.56 }];
};
const TRACK = { cx: 46, cz: 6, r0: 45, track: true };      // oval bowl around an athletics track
const club = (ar, en, short, kit, shorts = kit) => ({ name: { ar, en }, short, kit, shorts });
// Clubs of the 2026–27 Iraq Stars League + national teams. Kit colours are approximate (demo).
export const CLUBS = {
  zawraa: club('الزوراء', 'Al-Zawraa', 'ZAW', '#f2f2f2'), jawiya: club('القوة الجوية', 'Al-Quwa Al-Jawiya', 'QWJ', '#1d5bd1', '#12357a'),
  shorta: club('الشرطة', 'Al-Shorta', 'SHR', '#1e8f4d', '#125e33'), talaba: club('الطلبة', 'Al-Talaba', 'TLB', '#7fc4ee', '#f2f2f2'),
  minaa: club('الميناء', 'Al-Minaa', 'MIN', '#2a7fd6', '#f2f2f2'), karbala: club('كربلاء', 'Karbala', 'KRB', '#d9822b', '#1c1c1c'),
  erbil: club('أربيل', 'Erbil', 'ERB', '#f1c40f', '#1c1c1c'), duhok: club('دهوك', 'Duhok', 'DHK', '#2456b3', '#f2f2f2'),
  naftMaysan: club('نفط ميسان', 'Naft Maysan', 'NMS', '#c0392b', '#f2f2f2'), kahrabaa: club('الكهرباء', 'Al-Kahrabaa', 'KHR', '#e74c3c', '#1c1c1c'),
  naft: club('النفط', 'Al-Naft', 'NFT', '#2a8f5a', '#f2f2f2'), karkh: club('الكرخ', 'Al-Karkh', 'KRK', '#f4d03f', '#1c1c1c'),
  zakho: club('زاخو', 'Zakho', 'ZAK', '#c0392b', '#f2f2f2'), newroz: club('نوروز', 'Newroz', 'NWR', '#e67e22', '#1c1c1c'),
  ghaz: club('غاز الشمال', 'Ghaz Al-Shamal', 'GHZ', '#34495e', '#f2f2f2'), karma: club('الكرمة', 'Al-Karma', 'KRM', '#8e44ad', '#f2f2f2'),
  gharraf: club('الغراف', 'Al-Gharraf', 'GRF', '#16a085', '#f2f2f2'), jolan: club('الجولان', 'Al-Jolan', 'JLN', '#d35400', '#f2f2f2'),
  mosul: club('الموصل', 'Al-Mosul', 'MSL', '#27ae60', '#f2f2f2'), diyala: club('ديالى', 'Diyala', 'DYL', '#f39c12', '#1c1c1c'),
  iraq: club('العراق', 'Iraq', 'IRQ', '#f4f4f4', '#f4f4f4'), iran: club('إيران', 'Iran', 'IRN', '#c8102e', '#c8102e'),
  tajikistan: club('طاجيكستان', 'Tajikistan', 'TJK', '#c8102e', '#f2f2f2'), australia: club('أستراليا', 'Australia', 'AUS', '#f7c600', '#0b5d3b'),
  singapore: club('سنغافورة', 'Singapore', 'SGP', '#d8102a', '#d8102a'),
};

export const VENUES = [
  {
    id: 'madina', seats: 30636, name: { ar: 'ملعب المدينة الدولي', en: 'Al-Madina International Stadium' }, sub: { ar: 'الحبيبية · بغداد', en: 'Al-Habibiya · Baghdad' },
    cx: 48, cz: 29, r0: 12, tiers: tiers(24, 13), boxes: true,
    tones: ['#6e2470', '#93348c', '#ece6ea'], pattern: 'patch', lettering: { tier: 'upper', seg: 'east', word: ['>', 'I', 'R', 'A', 'Q', '<'] },
    roof: { type: 'full', dIn: 5, colors: ['#17121f', '#3b1d52', '#221830', '#4a2466'], solarEnds: true },
    facade: { style: 'mesh', colors: ['#15131c', '#d8d8e2', '#8a5ab0'], glow: 0x6f4aa0 }, wall: 0xd9c8c2, band: 0x6d2a7a,
  },
  {
    id: 'basra', seats: 65496, name: { ar: 'ملعب البصرة الدولي (جذع النخلة)', en: 'Basra International Stadium' }, sub: { ar: 'المدينة الرياضية · البصرة', en: 'Basra Sports City' },
    cx: 50, cz: 31, r0: 14, tiers: tiers(32, 32, { dyL: 0.38, dyU: 0.58 }),
    tones: ['#e9e9ea', '#2d7fc1', '#e0a030', '#3c9a5f', '#c8453a'], pattern: 'mosaic',
    roof: { type: 'full', dIn: 8, colors: ['#e6e2d6', '#d6d0bf', '#eeeae0', '#cfc8b4'] },
    facade: { style: 'palm', colors: ['#3a3226', '#d9c9a0', '#f1e6c6'], glow: 0xc9a25a }, wall: 0xcfcfcf, band: 0x2d7fc1,
  },
  {
    id: 'shaab', seats: 35600, name: { ar: 'ملعب الشعب الدولي', en: 'Al-Shaab International Stadium' }, sub: { ar: 'بغداد', en: 'Baghdad' },
    ...TRACK, tiers: tiers(35, 0, { y0: 2.4, dyL: 0.42 }),
    tones: ['#2f8f4e', '#e9e9ea', '#c8453a'], pattern: 'patch',
    roof: { type: 'west', colors: ['#d9d9d9', '#c4c4c4', '#e4e4e4', '#bdbdbd'] },
    facade: { style: 'concrete', colors: ['#6f6f6c', '#a9a8a2', '#d2d0c8'], glow: 0x554433 }, wall: 0xbdbdbd, band: 0x2f8f4e,
  },
  {
    id: 'karbala', seats: 30384, name: { ar: 'ملعب كربلاء الدولي', en: 'Karbala International Stadium' }, sub: { ar: 'كربلاء', en: 'Karbala' },
    cx: 48, cz: 29, r0: 13, tiers: tiers(23, 13),
    tones: ['#2f6fb8', '#e9c62f', '#ececec'], pattern: 'mosaic',
    roof: { type: 'full', dIn: 6, colors: ['#f0efe9', '#e2e0d6', '#f6f5f0', '#d9d6ca'] },
    facade: { style: 'arches', colors: ['#f3efe4', '#c9a24a', '#8a6a22'], glow: 0xd9b25a }, wall: 0xe6e1d4, band: 0xc9a24a,
  },
  {
    id: 'najaf', seats: 30540, name: { ar: 'ملعب النجف الدولي', en: 'Al-Najaf International Stadium' }, sub: { ar: 'النجف', en: 'Najaf' },
    cx: 48, cz: 29, r0: 11, tiers: tiers(24, 13),
    tones: ['#2f9d58', '#1f6f3d', '#ececec'], pattern: 'patch',
    roof: { type: 'full', dIn: 6, colors: ['#f2f2f2', '#dedede', '#f8f8f8', '#d4d4d4'] },
    facade: { style: 'arches', colors: ['#ece8dc', '#2f8a55', '#1b5a36'], glow: 0x4fae78 }, wall: 0xdddddd, band: 0x2f9d58,
  },
  {
    id: 'minaa', seats: 29788, name: { ar: 'ملعب الميناء الأولمبي', en: 'Al-Minaa Olympic Stadium' }, sub: { ar: 'البصرة', en: 'Basra' },
    cx: 48, cz: 29, r0: 14, tiers: tiers(22, 13),
    tones: ['#2a7fd6', '#1b4f93', '#f0f0f0'], pattern: 'patch',
    roof: { type: 'full', dIn: 6, colors: ['#f4f6f9', '#dfe6ee', '#ffffff', '#cfd9e4'] },
    facade: { style: 'sails', colors: ['#0f2a4a', '#f2f5f9', '#3f8fdc'], glow: 0x3f8fdc }, wall: 0xdde3ea, band: 0x2a7fd6,
  },
  {
    id: 'erbil', seats: 26472, name: { ar: 'ملعب فرانسو حريري', en: 'Franso Hariri Stadium' }, sub: { ar: 'أربيل', en: 'Erbil' },
    ...TRACK, tiers: tiers(27, 0, { y0: 2.4, dyL: 0.42 }),
    tones: ['#f1c40f', '#ececec', '#2f9d58'], pattern: 'patch',
    roof: { type: 'sides', colors: ['#e8e8e8', '#d2d2d2', '#f2f2f2', '#c8c8c8'] },
    facade: { style: 'panels', colors: ['#d8d4c8', '#f1c40f', '#8f8a7a'], glow: 0xa8872a }, wall: 0xcfcfcf, band: 0xf1c40f,
  },
  {
    id: 'maysan', seats: 25376, name: { ar: 'ملعب ميسان الأولمبي', en: 'Maysan Olympic Stadium' }, sub: { ar: 'العمارة · ميسان', en: 'Amarah · Maysan' },
    ...TRACK, tiers: tiers(26, 0, { y0: 2.4, dyL: 0.42 }),
    tones: ['#2f9d58', '#ececec', '#c0392b'], pattern: 'patch',
    roof: { type: 'west', colors: ['#e2e2e2', '#cdcdcd', '#eeeeee', '#c2c2c2'] },
    facade: { style: 'panels', colors: ['#d9d6cc', '#2f9d58', '#8c887c'], glow: 0x4c7a55 }, wall: 0xcfcfcf, band: 0x2f9d58,
  },
  {
    id: 'zawraa', seats: 15372, name: { ar: 'ملعب الزوراء', en: 'Al-Zawraa Stadium' }, sub: { ar: 'بغداد', en: 'Baghdad' },
    cx: 48, cz: 29, r0: 10, tiers: tiers(21, 0),
    tones: ['#f0f0f0', '#cfd3d8', '#2f6fb8'], pattern: 'patch',
    roof: { type: 'full', dIn: 3, colors: ['#f5f5f5', '#e3e3e3', '#ffffff', '#d8d8d8'] },
    facade: { style: 'panels', colors: ['#e9e9e9', '#ffffff', '#9aa3ad'], glow: 0x9fb4c8 }, wall: 0xe3e3e3, band: 0x2f6fb8,
  },
  {
    id: 'kirkuk', seats: 25376, name: { ar: 'ملعب كركوك الأولمبي', en: 'Kirkuk Olympic Stadium' }, sub: { ar: 'كركوك', en: 'Kirkuk' },
    ...TRACK, tiers: tiers(26, 0, { y0: 2.4, dyL: 0.42 }),
    tones: ['#2f6fb8', '#ececec', '#e0a030'], pattern: 'patch',
    roof: { type: 'west', colors: ['#dddddd', '#c9c9c9', '#eaeaea', '#bfbfbf'] },
    facade: { style: 'concrete', colors: ['#6f6f6c', '#a9a8a2', '#d2d0c8'], glow: 0x554433 }, wall: 0xcfcfcf, band: 0x2f6fb8,
  },
  {
    id: 'duhok', seats: 20016, name: { ar: 'ملعب دهوك', en: 'Duhok Stadium' }, sub: { ar: 'دهوك', en: 'Duhok' },
    ...TRACK, tiers: tiers(21, 0, { y0: 2.4, dyL: 0.42 }),
    tones: ['#2456b3', '#f1c40f', '#ececec'], pattern: 'patch',
    roof: { type: 'west', colors: ['#e2e2e2', '#cdcdcd', '#eeeeee', '#c2c2c2'] },
    facade: { style: 'panels', colors: ['#d8d4c8', '#2456b3', '#8f8a7a'], glow: 0x4a6aa8 }, wall: 0xcfcfcf, band: 0x2456b3,
  },
  {
    id: 'zakho', seats: 20504, name: { ar: 'ملعب زاخو الدولي', en: 'Zakho International Stadium' }, sub: { ar: 'زاخو · دهوك', en: 'Zakho' },
    cx: 48, cz: 29, r0: 10, tiers: tiers(27, 0),
    tones: ['#c0392b', '#ececec', '#8f2a20'], pattern: 'patch',
    roof: { type: 'sides', dIn: 4, colors: ['#eeeeee', '#dcdcdc', '#f6f6f6', '#d0d0d0'] },
    facade: { style: 'panels', colors: ['#dcd8cc', '#c0392b', '#8f8a7a'], glow: 0xa8503f }, wall: 0xd6d6d6, band: 0xc0392b,
  },
  {
    id: 'newroz', seats: 14548, name: { ar: 'ملعب نوروز الدولي', en: 'Newroz International Stadium' }, sub: { ar: 'السليمانية', en: 'Sulaymaniyah' },
    cx: 48, cz: 29, r0: 10, tiers: tiers(20, 0),
    tones: ['#e67e22', '#ececec', '#2f9d58'], pattern: 'patch',
    roof: { type: 'full', dIn: 3, colors: ['#f2f2f2', '#e0e0e0', '#fafafa', '#d6d6d6'] },
    facade: { style: 'sails', colors: ['#2a2a2e', '#f2f2f2', '#e67e22'], glow: 0xd98a3a }, wall: 0xdedede, band: 0xe67e22,
  },
  {
    id: 'shorta', seats: 9640, name: { ar: 'ملعب نادي الشرطة', en: 'Al-Shorta Stadium' }, sub: { ar: 'بغداد', en: 'Baghdad' },
    cx: 48, cz: 29, r0: 9, tiers: tiers(14, 0),
    tones: ['#1e8f4d', '#ececec', '#125e33'], pattern: 'patch',
    roof: { type: 'full', dIn: 3, colors: ['#f1f1f1', '#dfdfdf', '#f9f9f9', '#d5d5d5'] },
    facade: { style: 'panels', colors: ['#e6e6e6', '#1e8f4d', '#9aa3ad'], glow: 0x4c9a6a }, wall: 0xdddddd, band: 0x1e8f4d,
  },
];

// Fill in derived values (roof / façade position from the tier geometry) unless a venue sets them itself.
VENUES.forEach((v) => {
  v.seatPitch = v.seatPitch || 0.55; v.aisle = v.aisle || 0.6;
  const last = v.tiers[v.tiers.length - 1];
  v.back = last.d0 + last.rows * last.dd; v.top = last.y0 + last.rows * last.dy;
  const r = v.roof; r.dOut = r.dOut ?? v.back + 4.4; r.yOut = r.yOut ?? v.top + 5.1; r.yIn = r.yIn ?? r.yOut + 3.5;
  r.dIn = r.dIn ?? Math.max(5, v.back - 22);
  const f = v.facade; f.d = f.d ?? v.back + 5.9; f.y0 = 2; f.y1 = f.y1 ?? (r.type === 'none' ? v.top + 2 : r.yOut - 0.4);
});

// ---------------------------------------------------------------------------------------
// UPCOMING MATCHES — snapshot taken on 14 Nov 2026 (kick-off times are Baghdad time; null = not announced yet).
// The page cannot download live data, so update this list when the schedule changes.
// ---------------------------------------------------------------------------------------
// Which modelled stadium each club plays its home games in. Clubs missing here are listed without 3D booking.
// (jawiya, zawraa, karkh grounds are from match reports; talaba / kahrabaa / ghaz are assumptions.)
export const HOME_VENUE = { jawiya: 'madina', zawraa: 'zawraa', kahrabaa: 'zawraa', talaba: 'shaab', minaa: 'minaa', karbala: 'karbala', erbil: 'erbil',
  naftMaysan: 'maysan', duhok: 'duhok', zakho: 'zakho', newroz: 'newroz', ghaz: 'kirkuk', shorta: 'shorta' };
const GROUND = { karkh: { ar: 'ملعب الكابتن شرار حيدر · بغداد', en: 'Sharar Haidar Stadium · Baghdad' } };
// OFFICIAL LOGOS: put the image files you are licensed to use in public/logos/ and list them here, e.g.
//   zawraa: 'logos/zawraa.png', jawiya: 'logos/jawiya.png'
// A club without an entry keeps its generic coloured badge.
export const LOGO_FILES = {
  naft: 'logos/naft.png',
  jawiya: 'logos/jawiya.png',
  mosul: 'logos/mosul.png',
  gharraf: 'logos/gharraf.png',
  erbil: 'logos/erbil.png',
  newroz: 'logos/newroz.png',
  diyala: 'logos/diyala.png',
  zakho: 'logos/zakho.png',
  naftMaysan: 'logos/naftMaysan.png',
  kahrabaa: 'logos/kahrabaa.png',
  shorta: 'logos/shorta.png',
  karma: 'logos/karma.png',
  zawraa: 'logos/zawraa.png',
  talaba: 'logos/talaba.png',
  duhok: 'logos/duhok.png',
  minaa: 'logos/minaa.png',
  karkh: 'logos/karkh.png',
  jolan: 'logos/jolan.png',
  ghaz: 'logos/ghaz.png',
  karbala: 'logos/karbala.png',
  iraq: 'logos/iraq.png',
};
Object.entries(LOGO_FILES).forEach(([k, file]) => { if (CLUBS[k]) CLUBS[k].logo = file; });
const LEAGUE = (r) => ({ ar: `دوري نجوم العراق · الجولة ${r}`, en: `Iraq Stars League · Round ${r}` });
let seq = 0;
const m = (round, day, time, home, away, extra = {}) => ({
  id: `${day}-${home}-${away}`, seed: 5000 + 37 * ++seq, group: `r${round}`, round, tbd: !time, date: `${day}T${time || '18:00'}:00+03:00`,
  home: CLUBS[home], away: CLUBS[away], venue: HOME_VENUE[home] || null, ground: GROUND[home] || null, competition: LEAGUE(round), priceFactor: 1, ...extra,
});
const nt = (day, time, home, away, venue, ground, competition, priceFactor = 1.5) => ({
  id: `${day}-${home}-${away}`, seed: 9000 + 41 * ++seq, group: 'nt', tbd: !time, date: `${day}T${time || '19:00'}:00+03:00`,
  home: CLUBS[home], away: CLUBS[away], venue, ground, competition, priceFactor,
});
const ALL_MATCHES = [
  // Iraq national team — only matches played inside Iraq
  nt('2026-11-17', null, 'iraq', 'iran', 'basra', null, { ar: 'البطولة الرباعية الدولية · البصرة', en: 'Four-nation tournament · Basra' }),
  // Iraq Stars League, rounds 14–18
  m(14, '2026-11-19', '16:00', 'duhok', 'erbil'),
  m(14, '2026-11-19', '16:45', 'kahrabaa', 'diyala'),
  m(14, '2026-11-19', '18:30', 'gharraf', 'jawiya'),
  m(14, '2026-11-19', '19:00', 'ghaz', 'karkh'),
  m(14, '2026-11-20', '16:00', 'zakho', 'shorta'),
  m(14, '2026-11-20', '17:00', 'minaa', 'karbala'),
  m(14, '2026-11-20', '18:30', 'zawraa', 'talaba'),
  m(14, '2026-11-20', '19:15', 'jolan', 'naft'),
  m(14, '2026-11-21', '16:00', 'newroz', 'karma'),
  m(14, '2026-11-21', '18:30', 'naftMaysan', 'mosul'),
  m(15, '2026-11-27', '16:00', 'talaba', 'minaa'),
  m(15, '2026-11-27', '16:30', 'zakho', 'karbala'),
  m(15, '2026-11-27', '18:30', 'ghaz', 'karma'),
  m(15, '2026-11-27', '19:00', 'gharraf', 'mosul'),
  m(15, '2026-11-28', '16:00', 'duhok', 'diyala'),
  m(15, '2026-11-28', '16:45', 'newroz', 'kahrabaa'),
  m(15, '2026-11-28', '18:30', 'naft', 'jawiya'),
  m(15, '2026-11-29', '17:00', 'karkh', 'zawraa'),
  m(15, '2026-11-29', '18:30', 'jolan', 'erbil'),
  m(15, '2026-11-29', '19:30', 'naftMaysan', 'shorta'),
  m(16, '2026-12-03', '16:00', 'jawiya', 'zakho'),
  m(16, '2026-12-03', '17:30', 'mosul', 'minaa'),
  m(16, '2026-12-04', '16:00', 'erbil', 'zawraa'),
  m(16, '2026-12-04', '16:45', 'talaba', 'gharraf'),
  m(16, '2026-12-04', '18:30', 'shorta', 'duhok'),
  m(16, '2026-12-04', '19:00', 'karma', 'jolan'),
  m(16, '2026-12-05', '16:00', 'diyala', 'karkh'),
  m(16, '2026-12-05', '16:45', 'kahrabaa', 'naftMaysan'),
  m(16, '2026-12-05', '18:30', 'karbala', 'ghaz'),
  m(16, '2026-12-05', '19:00', 'naft', 'newroz'),
  m(17, '2026-12-11', null, 'gharraf', 'zakho'),
  m(17, '2026-12-11', null, 'jolan', 'karbala'),
  m(17, '2026-12-11', null, 'karma', 'talaba'),
  m(17, '2026-12-11', null, 'erbil', 'naft'),
  m(17, '2026-12-11', null, 'diyala', 'shorta'),
  m(17, '2026-12-11', null, 'duhok', 'naftMaysan'),
  m(17, '2026-12-11', null, 'karkh', 'minaa'),
  m(17, '2026-12-11', null, 'mosul', 'ghaz'),
  m(17, '2026-12-11', null, 'jawiya', 'kahrabaa'),
  m(17, '2026-12-11', null, 'zawraa', 'newroz'),
  m(18, '2026-12-25', null, 'ghaz', 'naft'),
  m(18, '2026-12-25', null, 'kahrabaa', 'mosul'),
  m(18, '2026-12-25', null, 'karbala', 'diyala'),
  m(18, '2026-12-25', null, 'minaa', 'jolan'),
  m(18, '2026-12-25', null, 'naftMaysan', 'gharraf'),
  m(18, '2026-12-25', null, 'newroz', 'karkh'),
  m(18, '2026-12-25', null, 'shorta', 'jawiya'),
  m(18, '2026-12-25', null, 'talaba', 'erbil'),
  m(18, '2026-12-25', null, 'zakho', 'duhok'),
  m(18, '2026-12-25', null, 'zawraa', 'karma'),
];
// Only matches played in a stadium that exists on the site are shown.
export const MATCHES = ALL_MATCHES.filter((x) => x.venue);
VENUES.forEach((v) => {
  v.fixtures = MATCHES.filter((x) => x.venue === v.id);
  if (!v.fixtures.length) {   // no upcoming match here → one clearly-labelled demo fixture so the stadium can still be explored
    v.fixtures = [{ id: `demo-${v.id}`, seed: 777, demo: true, tbd: true, date: '2026-12-31T19:00:00+03:00', home: CLUBS.iraq, away: CLUBS.zawraa, priceFactor: 1, venue: v.id,
      competition: { ar: 'مباراة تجريبية · لا توجد مباراة قادمة', en: 'Demo match · no upcoming fixture' } }];
  }
});
export const FIXTURES = VENUES.flatMap((v) => v.fixtures);

export const CATEGORIES = {
  vip:  { color: '#f0c14b', price: 75000, sold: 0.45, name: { ar: 'VIP · المنصة الرئيسية', en: 'VIP · Main Stand' } },
  cat1: { color: '#4fb6ff', price: 35000, sold: 0.58, name: { ar: 'الدرجة الأولى', en: 'Category 1' } },
  cat2: { color: '#58d68d', price: 20000, sold: 0.64, name: { ar: 'الدرجة الثانية', en: 'Category 2' } },
  cat3: { color: '#ff7f5a', price: 10000, sold: 0.72, name: { ar: 'الدرجة الثالثة', en: 'Category 3' } },
};

export const FEES = { rate: 0.05, perTicket: 1000 };   // service fee: 5% + 1,000 IQD per ticket
export const MAX_BASKET = 4;          // max seats per person per match (the database enforces the same limit)
export const CURRENCY = { ar: 'د.ع', en: 'IQD' };

export const PAYMENT_METHODS = [
  { id: 'zaincash', name: { ar: 'زين كاش', en: 'ZainCash' } },
  { id: 'qicard', name: { ar: 'كي كارد', en: 'Qi Card' } },
  { id: 'card', name: { ar: 'بطاقة مصرفية', en: 'Bank card' } },
];

// SHARED BOOKINGS (Supabase). The publishable key is meant to be in the browser: the database only lets
// visitors see which seats are taken and book through book_seats(); buyers' details can't be read back.
// Leave url empty to run the old offline demo (bookings stay on this device only).
export const SUPABASE = {
  url: 'https://gxpnwcggplbsjcfsldkh.supabase.co',
  key: 'sb_publishable_UoXQTJZmbLIITPIJZotgZg_acqLnFPp',
  lib: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm',
  google: true,                       // show "Continue with Google" (needs the Google provider switched on in Supabase)
};
