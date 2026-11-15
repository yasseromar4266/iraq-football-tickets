# تذاكر الكرة العراقية — 3D ticket booking (Three.js + Vite)

Developed by Yasser Omar. The owner reads Arabic only: explain everything to him in Arabic.

## Commands

```bash
npm install
npm run dev      # Vite dev server
npm run build    # production build in dist/
npm test         # logic tests (seating model, booking store, fixtures) — no browser needed
```

`index.cdn.html` is the same page with Three.js loaded from a CDN through an import map (no build step).
Keep `index.html` and `index.cdn.html` in sync when the markup changes.

## What the app is

A demo ticketing site for Iraqi football: entrance screen → menu (matches / stadiums / my tickets) →
3D stadium → block → seat view → basket → demo checkout → tickets. No real payments.
Bookings are shared through Supabase (project `iraq-football-tickets`, ref `gxpnwcggplbsjcfsldkh`, Frankfurt):
a seat booked by anyone shows as sold for everyone, live. The buyer's own orders are also kept in LocalStorage
for "My tickets". If `SUPABASE.url` in config.js is empty the app falls back to the old device-only demo.

## Supabase (database)

- `booked_seats (fixture_id, seat)` — primary key on both, so a seat can only be booked once. Readable by anyone
  (no personal data), in the `supabase_realtime` publication for live updates. No insert/update/delete policies.
- `orders` — buyer name/email/mobile, `user_id`, `tickets` (block/row/seat per ticket). RLS: a signed-in fan can
  select only rows with their own `user_id`; nobody can write directly.
- `book_seats(..., p_tickets jsonb)` — SECURITY DEFINER, callable by `authenticated` only (anon gets
  "permission denied" → the app shows the sign-in form). Validates input (1–4 seats, method, lengths), max 4 seats
  per fan per match, books all seats or none, returns `{ok, ref, time}` | `{ok:false, taken:[…]}` | `{ok:false, limit:n}`.
  The advisor warning about signed-in users executing it is expected.
- Fan accounts: Supabase Auth, email + password. "Confirm email" is ON (mailer_autoconfirm false), so a new fan
  must click the link in the email before signing in; the app says so. Supabase's built-in email sender is only for
  testing (very few emails per hour): set a custom SMTP sender, or turn off "Confirm email", before real use.
- "Confirm email" is now OFF: new email/password accounts work at once.
- Google sign-in: Google Cloud project `iraq-football-tickets` (id helpful-scion-514816-b9), OAuth client "Web client 1",
  redirect URI `https://gxpnwcggplbsjcfsldkh.supabase.co/auth/v1/callback`. The Google app is still in TESTING:
  only listed test users (now just the owner's Gmail, max 100) can sign in with Google. To open it to everyone,
  host the site publicly, add a privacy-policy page, fill homepage + privacy URLs on the Branding page, then
  "Publish app". Supabase Site URL = https://yasseromar4266.github.io/iraq-football-tickets/; redirect allow-list =
  http://localhost:*/**, http://127.0.0.1:*/**, https://yasseromar4266.github.io/iraq-football-tickets/**.
  Google Branding has the home page, privacy URL (privacy.html) and authorized domain yasseromar4266.github.io. `SUPABASE.google` in config.js shows/hides the button.
- `src/booking/account.js` — current fan; after sign-in replaces local orders with the server's (`syncOrders`),
  after sign-out clears them (`clearOrders`); the stadium then `store.reload()`s.
- Client: `src/booking/remote.js` loads supabase-js from jsDelivr on first use (no npm package).
  `Store` takes an optional 4th argument `remote`; tests pass `null` (offline) or a fake server.

## Where things are

- `src/config.js` — ALL data: `VENUES` (14 stadiums described by numbers), `CLUBS`, `LOGO_FILES`,
  `HOME_VENUE`, `MATCHES` (fixture snapshot of 14 Nov 2026), `CATEGORIES` (prices), `FEES`.
- `src/stadium/layout.js` — pure seating geometry (no Three.js), unit-tested. `setVenue()` / `buildLayout(venue)`.
- `src/stadium/build.js` — tiers, roof, truss, façade, lights, surroundings, generated from the venue numbers.
- `src/stadium/seats.js` — seats, crowd, flags (InstancedMesh) + seat/block picking.
- `src/stadium/pitch.js`, `match.js`, `textures.js`, `geo.js` — pitch, live match, canvas textures, helpers.
- `src/camera/controls.js` — orbit / look modes and fly-to transitions (mouse + touch).
- `src/booking/store.js` — basket, fees, orders, LocalStorage, `readAllOrders()`, live taken seats (`connect`, `markTaken`), async `checkout`.
- `src/booking/remote.js` — Supabase calls: `fetchTaken`, `watch`, `bookSeats`.
- `src/ui/ui.js`, `src/ui/i18n.js` — all DOM UI, Arabic (default) and English strings.
- `src/audio/music.js` — calm background tune generated with Web Audio.
- `public/logos/` — club logo files supplied by the owner; listed in `LOGO_FILES`.
- `tests/logic.test.mjs` — run with `npm test`.

## Conventions

- Arabic first, RTL. Every user-facing string goes through `i18n.js` (both `ar` and `en`).
- A new stadium is one entry in `VENUES`; a new match is one line in `MATCHES`. Do not hard-code either elsewhere.
- Only matches whose home ground exists in `VENUES` are shown (`HOME_VENUE` decides).
- Heavy things are lazy: no stadium is built until the user picks one; nothing renders while the menu is open.
- Phones get a lighter setup (no shadows, lower pixel ratio, no backdrop blur). Keep it that way.
- Palette: pitch green, chalk white, flag red, ink (see `:root` in `src/style.css`). No purple, no gradients on buttons.

## Hosting

Live site: https://yasseromar4266.github.io/iraq-football-tickets/ (GitHub Pages, branch `gh-pages`, root).
`gh-pages` holds a static copy: `index.cdn.html` saved as `index.html`, `src/`, `logos/` (from public/logos),
`privacy.html`, `.nojekyll`. After changing the source, rebuild that copy and push it to `gh-pages`.

## Known gaps (be honest about these)

- The demo "already sold" seats (from `seatHash`) exist only in the browser; the database does not know them.
- Booking needs an account and is capped at 4 seats per fan per match, but anyone can make many accounts.
  Free Supabase projects pause after a week without activity.
- No "forgot password" screen yet.
- "Reset demo bookings" only clears this device's list; the seats stay booked in the database.

- The 3D rendering was never checked visually by the author of this code beyond the owner confirming that
  Al-Madina stadium rendered on his phone. The other 13 stadiums are untested in 3D.
- Only Al-Madina is modelled from photos. Other stadiums: capacity and bowl type are close to reality,
  seat colours / façades / roofs are estimates.
- Venue assumptions: Al-Talaba at Al-Shaab, Al-Kahrabaa at Al-Zawraa Stadium, Ghaz Al-Shamal at Kirkuk,
  Iraq × Iran at Basra International.
- The fixture list is a static snapshot; the page cannot fetch live data.
- Club logos need the clubs' / federation's permission before public use.
