# Bundled fonts

Nearhere ships three brand faces (Design System v1.0 — "three voices, no more"):

| Role | Family | File | Registered name |
|------|--------|------|-----------------|
| Stories / narration | Newsreader (variable) | `Newsreader.ttf` | `Newsreader16pt-Regular` |
| Interface | Hanken Grotesk (variable) | `HankenGrotesk.ttf` | `HankenGrotesk-Regular` |
| Numbers / coordinates | Space Mono | `SpaceMono-Regular.ttf`, `SpaceMono-Bold.ttf` | `SpaceMono-Regular` / `SpaceMono-Bold` |

All three are licensed under the **SIL Open Font License 1.1** and are safe to
embed and redistribute. Sourced from [google/fonts](https://github.com/google/fonts).

They are registered in `Resources/Info.plist` under `UIAppFonts` and referenced
from `DesignTokens.Typography`. If a face ever fails to load, `Font.custom(...)`
falls back to the system font, so the UI degrades gracefully rather than crashing.

> To refresh: re-download the `.ttf`s from google/fonts (`ofl/newsreader`,
> `ofl/hankengrotesk`, `ofl/spacemono`) and keep the filenames above so the
> `UIAppFonts` entries still resolve.
