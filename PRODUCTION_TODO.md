# Nearhere — Production Punch-List

Status of the web app (`nearhere-six.vercel.app`) and what's left to make it
production-usable on a real road trip. Grouped by area, most blocking first.
"Fixed" = shipped in the current deploy. Everything else is open work for the
dev team.

Live URL: https://nearhere-six.vercel.app · Repo root is the Next.js app;
`Nearhere/` is the (separate) native iOS scaffold.

---

## 1. Audio / Voice  🔴 highest priority

- **[FIXED] iOS playback was blocked.** `speechSynthesis.speak()` ran *after*
  an `await fetch()`, so it was outside the tap's user-gesture and iOS silently
  refused it. Now we unlock the engine synchronously on tap and speak
  sentence-by-sentence (iOS also truncates long utterances). Verify on your phone.
- **"Google TTS" is not available in iOS Safari.** The Web Speech API uses the
  *device's* voices: Google/neural on Android+Chrome, **Apple voices on iOS**.
  There is no free client-side Google voice on iPhone. Options:
  - **A (no key, free):** keep Web Speech; on iOS you get Apple's enhanced
    voices (Settings → Voice picks the best). Quality is decent, not "Google".
  - **B (best, needs a key/budget):** add a server TTS route (Google Cloud TTS
    WaveNet, ElevenLabs, or OpenAI TTS) that returns an MP3 the app plays with
    a normal `<audio>` element — uniform, high quality on every device,
    background-audio friendly. **Recommended for production.** ~1 day.
  - **C (open-source, self-host):** Piper/Coqui TTS on a small server. Free but
    ops overhead.
- **Background audio / screen-lock:** Web Speech stops when Safari is
  backgrounded or the phone locks — a dealbreaker for driving. Only the
  `<audio>`-element path (Option B/C, with the Media Session API) plays with the
  screen off. This is the real reason to move to server TTS.
- **Pre-generate + cache narration audio** per POI so playback is instant and
  works offline (currently each play calls Claude live, ~2–5 s latency).

## 2. Geocoding & Routing  🔴

- **[FIXED] Ambiguous place names routed across the continent** ("Salmon River →
  Hamilton" = 3,161 mi). Now: North-America-restricted geocoding, biased toward
  the traveler's GPS location and the origin, so local matches win.
- **[OPEN] Real autocomplete.** Right now you type a full string and it geocodes
  on submit. Add a proper city/POI **autocomplete dropdown** (debounced calls to
  `/api/geocode`, which already returns 5 ranked candidates) so the user picks
  the exact place — this removes almost all ambiguity. ~0.5 day.
- **[OPEN] Disambiguation UI.** When a name is ambiguous, show the candidates
  ("Salmon River, ID" vs "Salmon River, NY") instead of silently picking one.
- **[OPEN] "Use my current location" chip** in the From field (one tap → your
  GPS coords), and reverse-geocode it to a readable name.
- **Routing engine:** currently the free **OSRM demo server** (no key, but rate-
  limited and not guaranteed uptime). For production, self-host OSRM or use a
  paid router (Mapbox/Google Directions) for reliability + turn geometry.

## 3. POI coverage / data  🟠

- **[IMPROVED] Along-route search** now also pulls historic ways, rivers,
  springs, and interpretive/trail markers (helps Lewis & Clark / Nez Perce /
  Salmon River corridors) — but OSM coverage of trail markers is spotty.
- **[OPEN] Curated / richer datasets.** OpenStreetMap alone misses a lot of
  historical context. Layer in: **Wikipedia geosearch** (huge win — every
  notable place has an article), **US NRHP** (National Register of Historic
  Places), **National Park Service** APIs, and **Native Land Digital** for
  Indigenous territory. This is what makes it feel encyclopedic instead of "a
  list of buttes." ~2–4 days and the biggest quality lever.
- **[OPEN] Let Claude fill gaps.** When OSM/Wikipedia are thin, ask the model
  "what's historically significant within N miles of these coordinates?" and
  narrate that. Guard against hallucination (cite sources / lat-lon check).
- **De-dupe & variety:** rural routes over-return geologic "buttes." Balance
  categories so a route has history/Indigenous/ecology mixed in, not 30 peaks.

## 4. Live driving experience  🟠

- **[OPEN] Auto-alerts as you move.** Home is currently a manual "what's near me
  now" tap. The core product is hands-free: watch `geolocation.watchPosition`,
  and when you come within range of a queued/nearby story, auto-play it (with
  the speed-based radius + throttle logic already designed in the iOS
  `ProximityEngine`). ~1–2 days on web.
- **[OPEN] Trip playback follows the car.** In an active trip, advance the queue
  based on real position, mark stories "heard" as you pass them, and surface the
  next one automatically.
- **Keep-awake / background:** combine with server-audio (§1) + a wake lock so it
  runs with the screen off.

## 5. Backend / accounts (Supabase)  🟢 when ready for test users

- Saved trips, bookmarks, and preferences are currently **in-memory only** (lost
  on refresh). Add **Supabase** for: auth, saved/last trips, bookmarks,
  offline-download state, and a **shared narration cache** (generate a place's
  story once, serve to everyone → speed + cost).
- Move the **Anthropic key** fully server-side (already is, via `/api/narrate`)
  and add rate-limiting/abuse protection before public launch.

## 6. Offline / PWA  🟢

- Make it an installable **PWA** (manifest + service worker) so it opens like an
  app and caches the shell.
- **Offline trips:** the "Download for offline" UI is a mock — actually pre-fetch
  + cache each trip's narration audio and route so it works with no signal
  (essential in remote areas like the Salmon River corridor).

## 7. Polish / smaller items  🟢

- Trip Setup: show a **map preview** of the computed route; loading state on
  "Building your trip…" already exists but add a progress hint.
- Trip Summary and Trips Library still use **seed/mock data** — wire them to real
  saved trips (needs §5).
- "Surfaced photo" on the POI card is a **gradient placeholder** — wire to a real
  image source (Wikimedia Commons / Mapillary) or leave stylized by choice.
- Light-mode pass and Dynamic Type QA on device.
- Analytics + error logging (so we can see failures like the 504 you hit).

## 8. Native iOS (separate track)

- The SwiftUI app in `Nearhere/` is a scaffold; it needs Xcode on a Mac to build,
  sign, and ship (TestFlight). The web app is the fast iteration surface; port
  learnings back to native when ready. Same design system + architecture.

---

### Suggested next 3 moves (highest impact first)
1. **Server TTS (Option B)** → real voice on every device + background/screen-off
   playback. Unblocks actual driving use.
2. **Wikipedia geosearch + autocomplete** → dramatically better stories and no
   more wrong-route geocoding.
3. **Auto-play as you drive** (`watchPosition` + proximity) → the actual product.
