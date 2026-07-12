# Nearhere

An iOS app that narrates the world as you drive — surfacing nearby history, geology,
Indigenous heritage, ecology, folklore, and more, using your location and an AI tour guide.

> **Status:** Scaffold. Core architecture, models, services, and placeholder views are in
> place. Final visual design (Claude design comps) will be layered onto the existing
> `DesignTokens` system without restructuring the views.

## Requirements

- Xcode 15+
- iOS 17.0+ deployment target
- Swift 5.9, SwiftUI lifecycle (no storyboards for the main app)
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) to generate the project

## Getting started

```bash
# 1. Install XcodeGen (once)
brew install xcodegen

# 2. Generate the Xcode project from project.yml
xcodegen generate

# 3. Add your Anthropic API key (never committed)
cp Nearhere/Config/Secrets.example.plist Nearhere/Config/Secrets.plist
#   edit Secrets.plist and paste your key, then in Xcode confirm Secrets.plist
#   is in the Nearhere target's "Copy Bundle Resources".

# 4. Open and run
open Nearhere.xcodeproj
```

> The `.xcodeproj` is **git-ignored** — it's a generated artifact. `project.yml` is the
> source of truth. Regenerate after adding/removing files.

## Architecture

```
Nearhere/
├── App/            App entry (SwiftUI), AppDelegate, AppState
├── Core/           LocationManager, ProximityEngine  (the real-time pipeline)
├── Models/         POI, NarrationContent, Trip, GeoFeature, UserPreferences
├── Views/          HomeView, POICardView, TripModeView, TripSummaryView, SettingsView
├── Services/       NarrationService (Claude API), GeoLookupService (Overpass/OSM),
│                   TTSService (AVSpeechSynthesizer), CacheService, TripModeService
├── Utils/          DesignTokens, Constants, Extensions
├── Config/         ApiConfig, Secrets (git-ignored)
└── Resources/      Info.plist, entitlements, Assets

NearhereShareExtension/   Share target for importing Google Maps routes
NearhereTests/            Unit tests (adaptive radius, throttling)
```

### The pipeline

1. **`LocationManager`** — significant-location-change monitoring for battery-efficient
   background operation; switches to continuous GPS in Trip Mode. Publishes location,
   speed (mph), heading.
2. **`ProximityEngine`** — computes an adaptive detection radius from speed
   (5 mi highway / 2 mi rural / 0.5 mi urban), queries `GeoLookupService`, and throttles
   alerts (1 per 3 min highway, 1 per 90 s urban) with a 10-mile per-POI cooldown.
3. **`GeoLookupService`** — reverse-geocodes (CLGeocoder) and pulls nearby features from
   the Overpass API (OpenStreetMap), tile-cached by geohash for offline use.
4. **`NarrationService`** — calls the Anthropic Claude API (`claude-sonnet-4-6`) to write
   warm, conversational narration; caches by ~100 m coordinate hash so the same spot is
   never regenerated. Degrades gracefully offline (cache → skip silently).
5. **`TTSService`** — speaks narration via `AVSpeechSynthesizer`, ducking music/podcasts
   and restoring them afterward.

### Permissions & background modes

Declared in `Resources/Info.plist`:
- Location: When-In-Use **and** Always (background proximity detection)
- Microphone + Speech (hands-free voice commands)
- Background modes: `location`, `audio`

## Infrastructure (GitHub · Vercel · Supabase)

- **GitHub** — source of record; development on feature branches.
- **Vercel** — planned home for a lightweight **narration proxy**. Shipping the Anthropic
  key inside the app is fine for local development but insecure for production; a Vercel
  serverless function should hold the key server-side and the app should call the proxy.
  `ApiConfig` centralizes key/endpoint resolution so this swap is a one-file change.
- **Supabase** — planned for user accounts, saved trips, and a shared narration cache
  (so popular locations are generated once, not per-device). Not yet wired; the local
  `CacheService`/`NarrationCaching` protocol keeps call sites stable for that migration.

## Testing

```bash
xcodegen generate
xcodebuild test -scheme Nearhere -destination 'platform=iOS Simulator,name=iPhone 15'
```

Unit tests cover the adaptive-radius calculation and alert-throttling logic in
`ProximityEngine`.

## Design system

Design System v1.0 ("contour lines and campfire light") is implemented in
`Utils/DesignTokens.swift`:

- **Palette** — warm basalt/sand neutrals (adaptive light & dark, dark is primary),
  Trailhead Amber as the single signal, Ember reserved for live audio, Prospect Gold
  for discovery/claimed. Ten semantic category colors live on `POICategory.tintColor`.
- **Typography** — three bundled OFL faces: Newsreader (stories), Hanken Grotesk
  (interface), Space Mono (numbers/coordinates). See `Resources/Fonts/README.md`.
- **Motion** — the breathing proximity rings are the app's loading vocabulary
  (no spinners). `Views/ProximityMark.swift` implements the three states:
  `listening`, `narrating`, `digging`.
- **App icon** — Direction A · Proximity Pulse (radar rings + amber core), rendered
  to `Assets.xcassets/AppIcon.appiconset`. The designer's full 1024 set can drop in
  over it.

## Roadmap notes

- Voice command intent handling (Speech framework) — permission strings are in place.
- Trip Mode route pre-scan + offline audio caching (`TripModeService`).
- Wire `TTSService` into the alert flow (feed live narration progress into `POICardView`
  and switch `ProximityMark` to `.narrating`).
- Custom contour-line category icon set (currently SF Symbols stand in).
- Move narration generation behind the Vercel proxy before any public release.
