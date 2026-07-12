import Foundation

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

    /// SF Symbol name mapped to the category, used by `POICardView`.
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
