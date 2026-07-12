import Foundation
import CoreLocation

/// Service boundaries. Depending on these protocols (not concrete classes) keeps
/// the engines, views, and trip pipeline decoupled and testable with fakes.

/// Provides geographic context for a coordinate (reverse geocode + nearby features).
protocol GeoLookupProviding: AnyObject {
    /// Nearby OSM/Overpass features within `radius` meters of `coordinate`.
    func features(around coordinate: CLLocationCoordinate2D,
                  radiusMeters: CLLocationDistance) async throws -> [GeoFeature]

    /// Reverse-geocoded administrative context (region/county/locality).
    func context(for coordinate: CLLocationCoordinate2D) async throws -> GeoContext
}

/// Generates narration text for a place using an LLM.
protocol NarrationGenerating: AnyObject {
    func narration(
        for coordinate: CLLocationCoordinate2D,
        speedMph: Double,
        context: GeoContext,
        features: [GeoFeature],
        type: NarrationType
    ) async throws -> NarrationContent
}

/// Speaks narration text and manages the audio session.
@MainActor
protocol SpeechSynthesizing: AnyObject {
    var isPlaying: Bool { get }
    func speak(_ content: NarrationContent)
    func stop()
}

/// Persists generated narrations keyed by a coordinate hash.
protocol NarrationCaching: AnyObject {
    func cachedNarration(forKey key: String) -> NarrationContent?
    func store(_ narration: NarrationContent, forKey key: String)

    /// Canonical cache key for a coordinate (rounded to ~100m).
    func cacheKey(for coordinate: CLLocationCoordinate2D) -> String
}
