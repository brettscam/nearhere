import Foundation
import CoreLocation

/// A lightweight geographic feature returned by `GeoLookupService` (e.g. from
/// Overpass / OpenStreetMap). This is raw context fed to the narration model —
/// not yet a user-facing POI.
struct GeoFeature: Identifiable, Hashable {
    let id: String            // stable OSM id ("node/12345") or synthesized
    let name: String?
    let featureType: FeatureType
    let coordinate: CLLocationCoordinate2D
    let tags: [String: String]

    enum FeatureType: String, Hashable {
        case natural
        case historic
        case tourism
        case place
        case other
    }

    /// Significance heuristic used for ranking (named > unnamed, historic > generic).
    var significanceScore: Double {
        var score = 0.0
        if name != nil { score += 2.0 }
        switch featureType {
        case .historic: score += 1.5
        case .tourism:  score += 1.0
        case .natural:  score += 0.75
        case .place:    score += 0.5
        case .other:    score += 0.0
        }
        // Wikipedia / heritage tags are strong signals of significance.
        if tags["wikipedia"] != nil || tags["wikidata"] != nil { score += 1.0 }
        if tags["heritage"] != nil { score += 0.75 }
        return score
    }

    static func == (lhs: GeoFeature, rhs: GeoFeature) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

/// Reverse-geocoded administrative context for a coordinate.
struct GeoContext: Codable, Hashable {
    var region: String?      // state / province
    var county: String?
    var locality: String?    // city / town
    var country: String?

    /// A compact human string like "Boulder County, Colorado".
    var summary: String {
        [locality, county, region].compactMap { $0 }.joined(separator: ", ")
    }
}
