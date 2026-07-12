import Foundation
import CoreLocation

/// Resolves geographic context and nearby features for a coordinate.
///
/// - **Context** comes from Apple's `CLGeocoder` reverse geocoder (cheap, cached).
/// - **Features** come from the Overpass (OpenStreetMap) API, tile-cached on a
///   ~5km geohash grid so nearby requests reuse one network call.
///
/// Offline behavior: if the network throws, `features(around:)` returns the
/// cached tile (or an empty array) so the app degrades gracefully instead of
/// surfacing an error.
final class GeoLookupService: GeoLookupProviding {

    private let session: URLSession
    private let geocoder = CLGeocoder()
    private let rateLimiter: RateLimiter
    private let decoder = JSONDecoder()

    /// Tile cache: geohash (precision 5, ~5km) → features. Guarded by `cacheQueue`.
    private var tileCache: [String: [GeoFeature]] = [:]
    /// Reverse-geocode cache keyed by rounded coordinate.
    private var contextCache: [String: GeoContext] = [:]
    private let cacheQueue = DispatchQueue(label: "com.nearhere.geolookup.cache")

    init(session: URLSession = .shared) {
        self.session = session
        self.rateLimiter = RateLimiter(
            maxRequestsPerSecond: Constants.Geo.overpassMaxRequestsPerSecond
        )
    }

    // MARK: - GeoLookupProviding

    /// Nearby historic / natural / tourism nodes within `radiusMeters`.
    ///
    /// Checks the geohash tile cache first; on a miss, queries Overpass (rate
    /// limited, with 429 backoff), maps and ranks the results, and caches them.
    /// On any network error the cached tile (or `[]`) is returned.
    func features(
        around coordinate: CLLocationCoordinate2D,
        radiusMeters: CLLocationDistance
    ) async throws -> [GeoFeature] {

        let tile = Geohash.encode(
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
            precision: Constants.Geo.tileGeohashPrecision
        )

        if let cached = cacheQueue.sync(execute: { tileCache[tile] }) {
            return rank(cached, near: coordinate)
        }

        do {
            let raw = try await fetchOverpass(coordinate: coordinate, radiusMeters: radiusMeters)
            cacheQueue.sync { tileCache[tile] = raw }
            return rank(raw, near: coordinate)
        } catch {
            // Offline / server error → serve whatever we have for this tile.
            let cached = cacheQueue.sync { tileCache[tile] } ?? []
            return rank(cached, near: coordinate)
        }
    }

    /// Reverse-geocoded administrative context, cached by rounded coordinate.
    func context(for coordinate: CLLocationCoordinate2D) async throws -> GeoContext {
        let key = Self.contextKey(for: coordinate)
        if let cached = cacheQueue.sync(execute: { contextCache[key] }) {
            return cached
        }

        let location = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
        let placemarks = try await reverseGeocode(location)

        let context: GeoContext
        if let placemark = placemarks.first {
            context = GeoContext(
                region: placemark.administrativeArea,
                county: placemark.subAdministrativeArea,
                locality: placemark.locality,
                country: placemark.country
            )
        } else {
            context = GeoContext(region: nil, county: nil, locality: nil, country: nil)
        }

        cacheQueue.sync { contextCache[key] = context }
        return context
    }

    // MARK: - Overpass

    private func fetchOverpass(
        coordinate: CLLocationCoordinate2D,
        radiusMeters: CLLocationDistance
    ) async throws -> [GeoFeature] {

        guard let url = URL(string: Constants.Geo.overpassEndpoint) else { return [] }

        let r = Int(radiusMeters.rounded())
        let lat = coordinate.latitude
        let lon = coordinate.longitude
        let query = """
        [out:json];(node["historic"](around:\(r),\(lat),\(lon));node["natural"](around:\(r),\(lat),\(lon));node["tourism"](around:\(r),\(lat),\(lon)););out body;
        """

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        let encodedQuery = query.addingPercentEncoding(
            withAllowedCharacters: .alphanumerics) ?? query
        request.httpBody = "data=\(encodedQuery)".data(using: .utf8)

        let data = try await performWithBackoff(request)

        let response = try decoder.decode(OverpassResponse.self, from: data)
        return response.elements.compactMap { $0.toFeature() }
    }

    /// Executes the request under the rate limiter, retrying up to 3 times with
    /// exponential backoff on HTTP 429 (Too Many Requests).
    private func performWithBackoff(_ request: URLRequest) async throws -> Data {
        var attempt = 0
        let maxAttempts = 3

        while true {
            await rateLimiter.waitForSlot()
            let (data, response) = try await session.data(for: request)

            guard let http = response as? HTTPURLResponse else { return data }

            if http.statusCode == 429, attempt < maxAttempts {
                attempt += 1
                // 0.5s, 1s, 2s ...
                let delay = UInt64(0.5 * pow(2.0, Double(attempt - 1)) * 1_000_000_000)
                try await Task.sleep(nanoseconds: delay)
                continue
            }

            guard (200..<300).contains(http.statusCode) else {
                throw URLError(.badServerResponse)
            }
            return data
        }
    }

    // MARK: - Ranking

    /// Sorts features by significance (desc), tie-broken by distance to the query
    /// coordinate (asc).
    private func rank(_ features: [GeoFeature], near coordinate: CLLocationCoordinate2D) -> [GeoFeature] {
        let origin = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
        return features.sorted { lhs, rhs in
            if lhs.significanceScore != rhs.significanceScore {
                return lhs.significanceScore > rhs.significanceScore
            }
            let dl = origin.distance(from: CLLocation(
                latitude: lhs.coordinate.latitude, longitude: lhs.coordinate.longitude))
            let dr = origin.distance(from: CLLocation(
                latitude: rhs.coordinate.latitude, longitude: rhs.coordinate.longitude))
            return dl < dr
        }
    }

    // MARK: - CLGeocoder async wrapper

    /// Bridges the completion-based `reverseGeocodeLocation` into async/await.
    private func reverseGeocode(_ location: CLLocation) async throws -> [CLPlacemark] {
        try await withCheckedThrowingContinuation { continuation in
            geocoder.reverseGeocodeLocation(location) { placemarks, error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume(returning: placemarks ?? [])
                }
            }
        }
    }

    // MARK: - Helpers

    private static func contextKey(for coordinate: CLLocationCoordinate2D) -> String {
        // Round to ~1km; reverse geocoding is coarse-grained anyway.
        let lat = String(format: "%.2f", coordinate.latitude)
        let lon = String(format: "%.2f", coordinate.longitude)
        return "\(lat)_\(lon)"
    }
}

// MARK: - Overpass wire types

private struct OverpassResponse: Decodable {
    let elements: [Element]

    struct Element: Decodable {
        let type: String
        let id: Int
        let lat: Double?
        let lon: Double?
        let tags: [String: String]?

        /// Maps an OSM node into a `GeoFeature`, choosing `featureType` from which
        /// of the historic/tourism/natural tag families is present.
        func toFeature() -> GeoFeature? {
            guard let lat, let lon else { return nil }
            let tags = tags ?? [:]

            let featureType: GeoFeature.FeatureType
            if tags["historic"] != nil {
                featureType = .historic
            } else if tags["tourism"] != nil {
                featureType = .tourism
            } else if tags["natural"] != nil {
                featureType = .natural
            } else if tags["place"] != nil {
                featureType = .place
            } else {
                featureType = .other
            }

            return GeoFeature(
                id: "\(type)/\(id)",
                name: tags["name"],
                featureType: featureType,
                coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lon),
                tags: tags
            )
        }
    }
}

// MARK: - Rate limiter

/// Serializes access so at most `maxRequestsPerSecond` requests start per second.
/// An actor guarantees the last-request timestamp is updated atomically across
/// concurrent callers.
private actor RateLimiter {
    private let minimumInterval: TimeInterval
    private var lastRequestTime: Date?

    init(maxRequestsPerSecond: Double) {
        self.minimumInterval = maxRequestsPerSecond > 0 ? 1.0 / maxRequestsPerSecond : 0
    }

    /// Suspends until enough time has elapsed since the previous granted slot.
    func waitForSlot() async {
        guard minimumInterval > 0 else { lastRequestTime = Date(); return }

        if let last = lastRequestTime {
            let elapsed = Date().timeIntervalSince(last)
            let wait = minimumInterval - elapsed
            if wait > 0 {
                try? await Task.sleep(nanoseconds: UInt64(wait * 1_000_000_000))
            }
        }
        lastRequestTime = Date()
    }
}

// MARK: - Geohash

/// Minimal standard base32 geohash encoder, used for ~5km feature tiling.
private enum Geohash {
    private static let base32 = Array("0123456789bcdefghjkmnpqrstuvwxyz")

    /// Encodes a coordinate to a geohash string of `precision` characters.
    static func encode(latitude: Double, longitude: Double, precision: Int) -> String {
        var latRange = (-90.0, 90.0)
        var lonRange = (-180.0, 180.0)
        var hash = ""
        var bit = 0
        var ch = 0
        var even = true // start with longitude

        while hash.count < precision {
            if even {
                let mid = (lonRange.0 + lonRange.1) / 2
                if longitude >= mid {
                    ch |= (1 << (4 - bit))
                    lonRange.0 = mid
                } else {
                    lonRange.1 = mid
                }
            } else {
                let mid = (latRange.0 + latRange.1) / 2
                if latitude >= mid {
                    ch |= (1 << (4 - bit))
                    latRange.0 = mid
                } else {
                    latRange.1 = mid
                }
            }

            even.toggle()
            if bit < 4 {
                bit += 1
            } else {
                hash.append(base32[ch])
                bit = 0
                ch = 0
            }
        }
        return hash
    }
}
