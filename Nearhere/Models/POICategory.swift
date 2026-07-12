import Foundation
import SwiftUI

/// The subject/domain of a point of interest. Drives iconography and filtering.
enum POICategory: String, Codable, CaseIterable, Identifiable, Hashable {
    case geology
    case history
    case indigenous
    case ecology
    case architecture
    case folklore
    case industry
    case military
    case culture
    case astronomy

    var id: String { rawValue }

    /// Human-readable label for UI.
    var displayName: String {
        switch self {
        case .geology:      return "Geology"
        case .history:      return "History"
        case .indigenous:   return "Indigenous"
        case .ecology:      return "Ecology"
        case .architecture: return "Architecture"
        case .folklore:     return "Folklore"
        case .industry:     return "Industry"
        case .military:     return "Military"
        case .culture:      return "Culture"
        case .astronomy:    return "Astronomy"
        }
    }

    /// Semantic base color per topic (Design System §02). Used at full strength
    /// on light surfaces; `tintColor` lifts it for legibility on dark.
    var baseColor: Color {
        switch self {
        case .geology:      return Color(hex: 0xA6552F)
        case .history:      return Color(hex: 0x8A6D3B)
        case .indigenous:   return Color(hex: 0xC1922F)
        case .ecology:      return Color(hex: 0x5C7A3F)
        case .architecture: return Color(hex: 0x4E6172)
        case .folklore:     return Color(hex: 0x7A5468)
        case .industry:     return Color(hex: 0x5E6B6E)
        case .military:     return Color(hex: 0x6E6B3E)
        case .culture:      return Color(hex: 0xA05046)
        case .astronomy:    return Color(hex: 0x3B4A73)
        }
    }

    /// Adaptive tint: base on light, a lifted variant on dark so eyebrows and
    /// icons stay legible on basalt surfaces.
    var tintColor: Color {
        Color(light: baseColor, dark: baseColor.lightened(by: 0.30))
    }

    /// A soft wash of the category color for icon backgrounds.
    var washColor: Color { tintColor.opacity(0.16) }

    /// SF Symbol name mapped to the category, used by `POICardView`.
    /// (Placeholder for the custom contour-line icon set in the design system.)
    var symbolName: String {
        switch self {
        case .geology:      return "mountain.2.fill"
        case .history:      return "book.closed.fill"
        case .indigenous:   return "leaf.fill"
        case .ecology:      return "tree.fill"
        case .architecture: return "building.columns.fill"
        case .folklore:     return "sparkles"
        case .industry:     return "gearshape.fill"
        case .military:     return "shield.fill"
        case .culture:      return "theatermasks.fill"
        case .astronomy:    return "moon.stars.fill"
        }
    }
}

/// A rough temporal bucket for a point of interest.
enum POIEra: String, Codable, CaseIterable, Identifiable, Hashable {
    case prehistoric
    case preColonial
    case colonial
    case eighteenHundreds = "1800s"
    case nineteenHundreds = "1900s"
    case modern

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .prehistoric:      return "Prehistoric"
        case .preColonial:      return "Pre-Colonial"
        case .colonial:         return "Colonial"
        case .eighteenHundreds: return "1800s"
        case .nineteenHundreds: return "1900s"
        case .modern:           return "Modern"
        }
    }
}
