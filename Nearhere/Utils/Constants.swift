import Foundation
import CoreLocation

/// App-wide tuning constants. Grouped so the proximity/throttle behavior is
/// documented in one place and easy to tweak.
enum Constants {

    enum Distance {
        static let metersPerMile: CLLocationDistance = 1609.344

        // Adaptive detection radii (see ProximityEngine).
        static let highwayRadiusMiles: Double = 5.0   // speed > 55 mph
        static let ruralRadiusMiles: Double = 2.0     // 25–55 mph
        static let urbanRadiusMiles: Double = 0.5     // < 25 mph

        /// Cooldown before the same POI can alert again.
        static let poiCooldownMiles: Double = 10.0
    }

    enum Speed {
        static let highwayThresholdMph: Double = 55
        static let urbanThresholdMph: Double = 25
        /// Below this we consider the user effectively stopped.
        static let stoppedThresholdMph: Double = 3
        /// How long stopped before we pause alerts.
        static let stoppedPauseInterval: TimeInterval = 120 // 2 min
    }

    enum Throttle {
        /// Max one alert per this interval on the highway.
        static let highwayInterval: TimeInterval = 180 // 3 min
        /// Max one alert per this interval in urban driving.
        static let urbanInterval: TimeInterval = 90    // 90 s
    }

    enum Geo {
        /// Overpass API endpoint.
        static let overpassEndpoint = "https://overpass-api.de/api/interpreter"
        /// Max Overpass requests/second (client-side rate limit).
        static let overpassMaxRequestsPerSecond: Double = 2
        /// Geohash precision for tile caching (~5km grid).
        static let tileGeohashPrecision = 5
        /// Coordinate rounding for narration cache keys (~100m).
        static let narrationCachePrecision = 3 // decimal places
    }

    enum API {
        static let anthropicBaseURL = "https://api.anthropic.com/v1/messages"
        static let anthropicVersion = "2023-06-01"
        static let narrationModel = "claude-sonnet-5"
        static let maxTokens = 1024
    }

    enum Trip {
        /// Route sampling intervals (miles) by route length.
        static let sampleIntervalShortMiles: Double = 2   // < 50 mi
        static let sampleIntervalMediumMiles: Double = 5  // 50–200 mi
        static let sampleIntervalLongMiles: Double = 10   // > 200 mi
        static let shortRouteThresholdMiles: Double = 50
        static let longRouteThresholdMiles: Double = 200
        /// Cap on pre-generated narrations.
        static let maxPregeneratedNarrations = 50
        /// Divisor: N = route_miles / this.
        static let narrationsPerMileDivisor: Double = 5
    }
}
