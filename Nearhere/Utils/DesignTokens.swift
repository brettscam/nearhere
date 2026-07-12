import SwiftUI

/// Design tokens for Nearhere — a placeholder system to be replaced/refined once
/// the Claude design comps land. Earthy, warm, dark-first. Centralizing here
/// means the visual refresh touches one file, not every view.
enum DesignTokens {

    // MARK: - Color
    enum Palette {
        /// Deep, warm near-black background.
        static let background = Color(red: 0.09, green: 0.08, blue: 0.07)
        /// Slightly lifted surface for cards.
        static let surface = Color(red: 0.15, green: 0.13, blue: 0.11)
        static let surfaceRaised = Color(red: 0.19, green: 0.16, blue: 0.14)

        /// Warm amber/terracotta primary accent.
        static let accent = Color(red: 0.90, green: 0.55, blue: 0.28)
        /// Muted sage secondary.
        static let secondaryAccent = Color(red: 0.55, green: 0.62, blue: 0.48)

        static let textPrimary = Color(red: 0.96, green: 0.94, blue: 0.90)
        static let textSecondary = Color(red: 0.72, green: 0.68, blue: 0.62)
        static let textTertiary = Color(red: 0.50, green: 0.47, blue: 0.43)

        static let hairline = Color.white.opacity(0.08)
    }

    // MARK: - Typography
    enum Typography {
        static func title(_ size: CGFloat = 26) -> Font { .system(size: size, weight: .bold, design: .rounded) }
        static func heading(_ size: CGFloat = 20) -> Font { .system(size: size, weight: .semibold, design: .rounded) }
        static func body(_ size: CGFloat = 17) -> Font { .system(size: size, weight: .regular, design: .rounded) }
        static func caption(_ size: CGFloat = 13) -> Font { .system(size: size, weight: .medium, design: .rounded) }
    }

    // MARK: - Spacing
    enum Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 16
        static let lg: CGFloat = 24
        static let xl: CGFloat = 32
    }

    // MARK: - Radius
    enum Radius {
        static let card: CGFloat = 24
        static let button: CGFloat = 28
        static let chip: CGFloat = 14
    }

    // MARK: - Sizing
    enum Size {
        /// Minimum tap target (HIG). Primary CTAs prefer 60pt+.
        static let minTapTarget: CGFloat = 44
        static let primaryButtonHeight: CGFloat = 60
    }

    // MARK: - Shadow
    enum Shadow {
        static let card = (color: Color.black.opacity(0.4), radius: CGFloat(20), y: CGFloat(8))
    }
}
