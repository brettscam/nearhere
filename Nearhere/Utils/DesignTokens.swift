import SwiftUI

/// Nearhere Design System v1.0 — "contour lines and campfire light."
///
/// Warm, earthy, dark-first. No pure black or white; every neutral carries
/// green-earth. One amber signal, one ember reserved for live audio. Three type
/// families and no more. Border-first surfaces; shadows only when something lifts.
///
/// Colors are adaptive: dark is the primary surface (most driving happens after
/// dark), light inverts only the neutrals — brand and category hues hold.
enum DesignTokens {

    // MARK: - Raw brand & signal (hue holds across light/dark)

    enum Brand {
        static let trailheadAmber = Color(hex: 0xCE7B2C) // nh-primary
        static let prospectGold   = Color(hex: 0xD9A62C) // nh-highlight (discovery/claimed)
        static let spruce         = Color(hex: 0x2E4A3C) // nh-secondary (ambient/listening)
        static let ember          = Color(hex: 0xDB6A40) // nh-active (live audio only)
        static let basalt         = Color(hex: 0x1B1C18)
        static let sand           = Color(hex: 0xF4EEE1)
    }

    // MARK: - Semantic palette (adaptive)

    enum Palette {
        /// App background.
        static let background = Color(light: 0xF4EEE1, dark: 0x1B1C18)
        /// Card / primary surface.
        static let surface = Color(light: 0xFBF7EC, dark: 0x24261F)
        /// A surface that lifts one step further (sheets, popovers).
        static let surfaceRaised = Color(light: 0xFFFDF6, dark: 0x30322A)

        static let textPrimary   = Color(light: 0x23241E, dark: 0xF2EDE1)
        static let textSecondary = Color(light: 0x5A5748, dark: 0xB4AE9E)
        static let textTertiary  = Color(light: 0x8B8676, dark: 0x7C7A6E)

        /// Hairline borders — the primary way surfaces separate (border-first).
        static let hairline = Color(light: Color(hex: 0x23241E).opacity(0.10),
                                    dark: Color(hex: 0xF2EDE1).opacity(0.08))

        /// The single leading signal. Amber holds its hue; text-on-dark uses a
        /// slightly lifted amber for legibility.
        static let accent = Brand.trailheadAmber
        static let accentText = Color(light: 0xA6552F, dark: 0xD08A5E)
        /// Ink color to place *on top* of an amber fill.
        static let onAccent = Color(hex: 0x231A0E)

        static let secondaryAccent = Brand.spruce
        static let highlight = Brand.prospectGold
        static let active = Brand.ember
    }

    // MARK: - System states

    enum State {
        static let success = Color(hex: 0x4E7A47)
        static let warning = Color(hex: 0xCE9A34)
        static let danger  = Color(hex: 0xB24A34)
        static let info    = Color(hex: 0x3E7A72)
    }

    // MARK: - Typography — three voices, no more.
    //
    // Newsreader (serif) carries stories/narration. Hanken Grotesk is the
    // interface. Space Mono tags every number, like a coordinate. All sizes are
    // iOS points and scale with Dynamic Type. Driver rule: nothing critical < 17pt.

    enum Typography {
        // Registered font names (see Resources/Fonts + Info.plist UIAppFonts).
        // If a face fails to load, Font.custom falls back to the system font.
        static let serif = "Newsreader16pt-Regular"
        static let sans  = "HankenGrotesk-Regular"
        static let mono  = "SpaceMono-Regular"
        static let monoBold = "SpaceMono-Bold"

        // MARK: Named styles (the scale from the design system)

        /// Story / narration display — Newsreader 34 / 500.
        static var storyDisplay: Font {
            .custom(serif, size: 34, relativeTo: .largeTitle).weight(.medium)
        }
        /// Glanceable card headline — Hanken 30 / 700.
        static var cardHeadline: Font {
            .custom(sans, size: 30, relativeTo: .title).weight(.bold)
        }
        /// Title — Hanken 22 / 600.
        static var titleStyle: Font {
            .custom(sans, size: 22, relativeTo: .title2).weight(.semibold)
        }
        /// Body — Hanken 17 / 400.
        static var bodyStyle: Font {
            .custom(sans, size: 17, relativeTo: .body)
        }
        /// Callout — Hanken 16 / 500.
        static var callout: Font {
            .custom(sans, size: 16, relativeTo: .callout).weight(.medium)
        }
        /// Subhead — Hanken 15 / 500.
        static var subhead: Font {
            .custom(sans, size: 15, relativeTo: .subheadline).weight(.medium)
        }
        /// Footnote — Hanken 13 / 500.
        static var footnote: Font {
            .custom(sans, size: 13, relativeTo: .footnote).weight(.medium)
        }
        /// Serif story body (for the "deep dive" narration text).
        static func serifBody(_ size: CGFloat = 19) -> Font {
            .custom(serif, size: size, relativeTo: .body)
        }
        /// Monospace metadata — coordinates, distances, eyebrows.
        static func monoMeta(_ size: CGFloat = 14) -> Font {
            .custom(mono, size: size, relativeTo: .footnote)
        }
        /// All-caps eyebrow / category tag — Space Mono 12, wide tracking (apply
        /// `.tracking(2.4)` and `.textCase(.uppercase)` at the call site).
        static var eyebrow: Font {
            .custom(mono, size: 12, relativeTo: .caption)
        }

        // MARK: Backward-compatible helpers (used by earlier views)

        static func title(_ size: CGFloat = 26) -> Font {
            .custom(sans, size: size, relativeTo: .title).weight(.bold)
        }
        static func heading(_ size: CGFloat = 20) -> Font {
            .custom(sans, size: size, relativeTo: .title3).weight(.semibold)
        }
        static func body(_ size: CGFloat = 17) -> Font {
            .custom(sans, size: size, relativeTo: .body)
        }
        static func caption(_ size: CGFloat = 13) -> Font {
            .custom(mono, size: size, relativeTo: .caption)
        }
    }

    // MARK: - Spacing (4pt grid)

    enum Spacing {
        static let xs: CGFloat = 4    // hairline gaps
        static let sm: CGFloat = 8    // icon ↔ label
        static let rowGap: CGFloat = 12 // in-card rows
        static let md: CGFloat = 16   // default gutter
        static let cardPadding: CGFloat = 20
        static let lg: CGFloat = 24   // screen margin
        static let xl: CGFloat = 32   // section gap
        static let xxl: CGFloat = 48  // major breaks
    }

    // MARK: - Corner radius (generous, border-first)

    enum Radius {
        static let chip: CGFloat = 6
        static let input: CGFloat = 10
        static let button: CGFloat = 14
        static let card: CGFloat = 20
        static let sheet: CGFloat = 28
        static let pill: CGFloat = 999
    }

    // MARK: - Sizing

    enum Size {
        /// Minimum tap target (HIG). Primary CTAs prefer 60pt+.
        static let minTapTarget: CGFloat = 44
        static let primaryButtonHeight: CGFloat = 56
    }

    // MARK: - Shadow (warm-ink tinted, never grey-black; only when a surface lifts)

    enum Shadow {
        static let card = (color: Color(hex: 0x1C1A0E).opacity(0.28),
                           radius: CGFloat(24), y: CGFloat(10))
        static let sheet = (color: Color(hex: 0x1C1A0E).opacity(0.40),
                            radius: CGFloat(40), y: CGFloat(16))
    }
}

// MARK: - Color helpers

extension Color {
    /// Build a color from a 0xRRGGBB literal.
    init(hex: UInt32, opacity: Double = 1) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: opacity
        )
    }

    /// Adaptive color from light/dark hex literals.
    init(light: UInt32, dark: UInt32) {
        self.init(light: Color(hex: light), dark: Color(hex: dark))
    }

    /// Adaptive color from two SwiftUI colors, resolved per trait collection.
    init(light: Color, dark: Color) {
        #if canImport(UIKit)
        self.init(uiColor: UIColor { traits in
            let chosen = traits.userInterfaceStyle == .dark ? dark : light
            return UIColor(chosen)
        })
        #else
        self = dark
        #endif
    }

    /// Returns the color blended `amount` (0…1) toward warm sand — used to lift
    /// mid-tone category colors for legibility on dark surfaces.
    func lightened(by amount: Double) -> Color {
        #if canImport(UIKit)
        let base = UIColor(self)
        let target = UIColor(DesignTokens.Brand.sand)
        var r1: CGFloat = 0, g1: CGFloat = 0, b1: CGFloat = 0, a1: CGFloat = 0
        var r2: CGFloat = 0, g2: CGFloat = 0, b2: CGFloat = 0, a2: CGFloat = 0
        base.getRed(&r1, green: &g1, blue: &b1, alpha: &a1)
        target.getRed(&r2, green: &g2, blue: &b2, alpha: &a2)
        let t = CGFloat(min(max(amount, 0), 1))
        return Color(.sRGB,
                     red: Double(r1 + (r2 - r1) * t),
                     green: Double(g1 + (g2 - g1) * t),
                     blue: Double(b1 + (b2 - b1) * t),
                     opacity: Double(a1))
        #else
        return self
        #endif
    }
}
