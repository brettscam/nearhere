import SwiftUI
import CoreLocation

// MARK: - Distance formatting

extension CLLocationDistance {
    /// Formats a meters value as a short miles string, e.g. `"1.2 mi"`.
    /// Uses one decimal under 10 mi, whole numbers above.
    var milesString: String {
        let miles = self / Constants.Distance.metersPerMile
        if miles < 0.1 {
            return "< 0.1 mi"
        } else if miles < 10 {
            return String(format: "%.1f mi", miles)
        } else {
            return String(format: "%.0f mi", miles)
        }
    }
}

extension Double {
    /// Treats the receiver as a miles value and formats it, e.g. `"12 mi"`.
    var asMilesString: String {
        if self < 0.1 {
            return "< 0.1 mi"
        } else if self < 10 {
            return String(format: "%.1f mi", self)
        } else {
            return String(format: "%.0f mi", self)
        }
    }
}

extension TimeInterval {
    /// Formats a seconds value as a coarse drive-time string, e.g. `"2h 15m"` or `"45 min"`.
    var driveTimeString: String {
        let totalMinutes = Int((self / 60).rounded())
        guard totalMinutes > 0 else { return "0 min" }
        let hours = totalMinutes / 60
        let minutes = totalMinutes % 60
        if hours > 0 {
            return minutes > 0 ? "\(hours)h \(minutes)m" : "\(hours)h"
        }
        return "\(minutes) min"
    }
}

// MARK: - Card styling

/// Applies the standard raised-surface card treatment: surface fill, card radius,
/// and the design-system card shadow. Used across the app's floating panels.
struct CardStyle: ViewModifier {
    var fill: Color = DesignTokens.Palette.surface

    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.card, style: .continuous)
                    .fill(fill)
            )
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.card, style: .continuous)
                    .strokeBorder(DesignTokens.Palette.hairline, lineWidth: 1)
            )
            .shadow(
                color: DesignTokens.Shadow.card.color,
                radius: DesignTokens.Shadow.card.radius,
                x: 0,
                y: DesignTokens.Shadow.card.y
            )
    }
}

extension View {
    /// Applies the standard card surface, radius, hairline border, and shadow.
    func cardStyle(fill: Color = DesignTokens.Palette.surface) -> some View {
        modifier(CardStyle(fill: fill))
    }
}

// MARK: - Color from hex

extension Color {
    /// Creates a `Color` from a hex string such as `"#RRGGBB"`, `"RRGGBB"`,
    /// or `"#AARRGGBB"`. Falls back to clear on malformed input.
    init(hex: String) {
        let sanitized = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var value: UInt64 = 0
        Scanner(string: sanitized).scanHexInt64(&value)

        let a, r, g, b: UInt64
        switch sanitized.count {
        case 6: // RRGGBB
            (a, r, g, b) = (255, value >> 16 & 0xFF, value >> 8 & 0xFF, value & 0xFF)
        case 8: // AARRGGBB
            (a, r, g, b) = (value >> 24 & 0xFF, value >> 16 & 0xFF, value >> 8 & 0xFF, value & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
