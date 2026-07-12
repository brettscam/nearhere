import Foundation
import CoreLocation
import MapKit

/// Drives the "Trip Mode" pipeline: import a Google Maps share link, resolve it
/// into an origin/destination pair, compute a driving route with MapKit, sample
/// the route polyline, and pre-scan those samples for narratable POIs so the
/// content is ready before the user starts driving.
///
/// This is a `@MainActor` `ObservableObject` so its published progress can drive
/// SwiftUI directly. All heavy work (`URLSession`, `MKDirections`, geo lookups,
/// narration generation) is `async` and awaited off the published state updates,
/// which are always applied on the main actor.
@MainActor
final class TripModeService: ObservableObject {

    // MARK: - Published state

    /// The most recently built/imported trip (route + pre-generated POIs).
    @Published var tripRoute: Trip?
    /// Pre-scan progress in `0...1`, updated incrementally as narrations generate.
    @Published var preScanProgress: Double = 0
    /// Narrations generated during the pre-scan, in emission order.
    @Published var cachedNarrations: [NarrationContent] = []
    /// Estimated number of POIs that will be narrated for the current trip.
    @Published var estimatedPOICount: Int = 0
    /// True while a pre-scan is running.
    @Published var isPreparing = false

    // MARK: - Dependencies

    private let geoLookup: GeoLookupProviding
    private let narration: NarrationGenerating
    private let session: URLSession

    /// - Parameters:
    ///   - geoLookup: nearby-feature + reverse-geocode provider.
    ///   - narration: narration generator (LLM-backed).
    ///   - session: URL session used to resolve short links; injectable for tests.
    init(
        geoLookup: GeoLookupProviding,
        narration: NarrationGenerating,
        session: URLSession = .shared
    ) {
        self.geoLookup = geoLookup
        self.narration = narration
        self.session = session
    }

    // MARK: - Errors

    /// Errors surfaced by the trip pipeline.
    enum TripError: Error {
        /// The shared URL could not be resolved into two coordinates.
        case unparseableURL
        /// MapKit returned no drivable route between the two coordinates.
        case noRoute
    }

    // MARK: - Import

    /// Parses a Google Maps share URL into a fully built `Trip`.
    ///
    /// Handles both short links (`maps.app.goo.gl` / `goo.gl`) — which are
    /// resolved by following their HTTP redirect to the canonical URL — and full
    /// `google.com/maps` URLs. Once two coordinates (origin + destination) are
    /// extracted, a driving route is computed with `buildRoute(...)`.
    ///
    /// - Throws: `TripError.unparseableURL` if two coordinates can't be found,
    ///   or `TripError.noRoute` if MapKit can't route between them.
    /// - Returns: a `Trip` with route geometry, sample points, and distance/time
    ///   populated (POIs are added later by `prescan(_:)`).
    func importGoogleMapsURL(_ url: URL) async throws -> Trip {
        // 1. Resolve short links to their canonical destination URL.
        let resolved = try await resolveRedirects(for: url)

        // 2. Extract origin/destination from the resolved URL.
        guard let endpoints = Self.parseEndpoints(from: resolved) else {
            throw TripError.unparseableURL
        }

        // 3. Compute the route.
        let trip = try await buildRoute(
            origin: endpoints.origin.coordinate,
            destination: endpoints.destination.coordinate,
            originName: endpoints.origin.name,
            destinationName: endpoints.destination.name
        )
        tripRoute = trip
        return trip
    }

    /// Follows redirects for a short link and returns the final URL. Non-short
    /// links are returned unchanged. Any network failure falls back to the
    /// original URL so parsing can still be attempted.
    private func resolveRedirects(for url: URL) async throws -> URL {
        guard Self.isShortLink(url) else { return url }

        // A GET whose response `.url` reflects the final, redirected location.
        // (URLSession follows redirects by default; we read the resolved URL off
        // the HTTPURLResponse.)
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(
            "Mozilla/5.0 (compatible; NearhereBot/1.0)",
            forHTTPHeaderField: "User-Agent"
        )
        do {
            let (_, response) = try await session.data(for: request)
            if let http = response as? HTTPURLResponse {
                // Prefer the response URL; fall back to a Location header if present.
                if let finalURL = http.url, !Self.isShortLink(finalURL) {
                    return finalURL
                }
                if let location = http.value(forHTTPHeaderField: "Location"),
                   let locURL = URL(string: location) {
                    return locURL
                }
            }
            return response.url ?? url
        } catch is CancellationError {
            throw CancellationError()
        } catch {
            // Offline / blocked redirect: fall back to the original URL.
            return url
        }
    }

    /// True for Google Maps short-link hosts that require redirect resolution.
    private static func isShortLink(_ url: URL) -> Bool {
        guard let host = url.host?.lowercased() else { return false }
        return host.contains("maps.app.goo.gl") || host.contains("goo.gl")
    }

    // MARK: - URL parsing

    /// A parsed origin/destination pair with optional human names.
    struct Endpoints {
        var origin: Waypoint
        var destination: Waypoint
    }

    /// Extracts an origin and destination `Waypoint` from a full google.com/maps
    /// URL. Supports several shapes Google emits:
    ///
    ///   * `/maps/dir/{origin}/{destination}` path segments (coords or place names
    ///     that themselves contain `@lat,lng` / `lat,lng`).
    ///   * `?saddr=lat,lng&daddr=lat,lng` query form.
    ///   * `?origin=...&destination=...` query form (newer share links).
    ///   * `@lat,lng` viewport and `!3dLAT!4dLNG` data-parameter fallbacks.
    ///
    /// Returns `nil` unless at least two coordinates are recovered.
    static func parseEndpoints(from url: URL) -> Endpoints? {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            return nil
        }
        let query = components.queryItems ?? []

        func queryValue(_ names: [String]) -> String? {
            for name in names {
                if let v = query.first(where: { $0.name.lowercased() == name })?.value,
                   !(v.isEmpty) {
                    return v
                }
            }
            return nil
        }

        // 1. saddr/daddr or origin/destination query forms.
        if let s = queryValue(["saddr", "origin"]),
           let d = queryValue(["daddr", "destination"]),
           let sc = coordinate(fromToken: s),
           let dc = coordinate(fromToken: d) {
            return Endpoints(
                origin: Waypoint(name: name(fromToken: s) ?? "Start", coordinate: sc),
                destination: Waypoint(name: name(fromToken: d) ?? "Destination", coordinate: dc)
            )
        }

        // 2. /maps/dir/{origin}/{destination} path form.
        let segments = url.pathComponents.filter { $0 != "/" }
        if let dirIndex = segments.firstIndex(of: "dir") {
            // Segments after "dir" are waypoints; the "data" segment (starts with
            // "data=" or "@") is not a waypoint.
            let waypointSegments = segments[(dirIndex + 1)...]
                .filter { !$0.hasPrefix("@") && !$0.hasPrefix("data=") && !$0.isEmpty }
            let coords: [(String, CLLocationCoordinate2D)] = waypointSegments.compactMap { seg in
                let decoded = seg.removingPercentEncoding ?? seg
                guard let c = coordinate(fromToken: decoded) else { return nil }
                return (decoded, c)
            }
            if coords.count >= 2, let first = coords.first, let last = coords.last {
                return Endpoints(
                    origin: Waypoint(name: name(fromToken: first.0) ?? "Start", coordinate: first.1),
                    destination: Waypoint(name: name(fromToken: last.0) ?? "Destination", coordinate: last.1)
                )
            }
        }

        // 3. Fallback: harvest all coordinates anywhere in the URL string
        //    (@lat,lng viewport, !3dLAT!4dLNG data params, bare lat,lng).
        let harvested = harvestCoordinates(from: url.absoluteString)
        if harvested.count >= 2, let first = harvested.first, let last = harvested.last {
            return Endpoints(
                origin: Waypoint(name: "Start", coordinate: first),
                destination: Waypoint(name: "Destination", coordinate: last)
            )
        }

        return nil
    }

    /// Parses a coordinate out of a single token, which may be:
    ///   * `"lat,lng"`
    ///   * a place-name token containing `"@lat,lng"`
    ///   * a token containing `!3dLAT!4dLNG` data parameters.
    static func coordinate(fromToken token: String) -> CLLocationCoordinate2D? {
        // "@lat,lng" viewport embedded in a place token.
        if let at = token.range(of: "@") {
            let after = String(token[at.upperBound...])
            if let c = parseLatLng(after) { return c }
        }
        // !3dLAT!4dLNG data parameter pair.
        if let c = parse3d4d(token) { return c }
        // Bare "lat,lng".
        return parseLatLng(token)
    }

    /// Extracts a leading `lat,lng` pair from the start of a string.
    private static func parseLatLng(_ s: String) -> CLLocationCoordinate2D? {
        // Take the first two comma-separated numeric components.
        let parts = s.split(separator: ",", maxSplits: 2, omittingEmptySubsequences: false)
        guard parts.count >= 2,
              let lat = Double(parts[0].trimmingCharacters(in: .whitespaces)),
              let lonPart = parts[1].split(whereSeparator: { !("0123456789.-eE".contains($0)) }).first,
              let lon = Double(lonPart)
        else { return nil }
        guard isValidCoordinate(lat: lat, lon: lon) else { return nil }
        return CLLocationCoordinate2D(latitude: lat, longitude: lon)
    }

    /// Extracts a `!3dLAT!4dLNG` coordinate pair, used inside Google's `data=`
    /// parameter for the destination pin.
    private static func parse3d4d(_ s: String) -> CLLocationCoordinate2D? {
        guard let latStr = capture(after: "!3d", in: s),
              let lonStr = capture(after: "!4d", in: s),
              let lat = Double(latStr), let lon = Double(lonStr),
              isValidCoordinate(lat: lat, lon: lon)
        else { return nil }
        return CLLocationCoordinate2D(latitude: lat, longitude: lon)
    }

    /// Reads a numeric run (`-?digits.digits`) immediately following `marker`.
    private static func capture(after marker: String, in s: String) -> String? {
        guard let range = s.range(of: marker) else { return nil }
        let tail = s[range.upperBound...]
        let allowed = Set("0123456789.-")
        let numeric = tail.prefix { allowed.contains($0) }
        return numeric.isEmpty ? nil : String(numeric)
    }

    /// Finds every plausible coordinate in a raw URL string, preserving order.
    /// Used as a last resort when structured parsing fails.
    private static func harvestCoordinates(from raw: String) -> [CLLocationCoordinate2D] {
        var results: [CLLocationCoordinate2D] = []

        // !3dLAT!4dLNG pairs.
        var searchStart = raw.startIndex
        while let r = raw.range(of: "!3d", range: searchStart..<raw.endIndex) {
            let slice = String(raw[r.lowerBound...])
            if let c = parse3d4d(slice) { results.append(c) }
            searchStart = r.upperBound
        }

        // @lat,lng viewport tokens.
        searchStart = raw.startIndex
        while let r = raw.range(of: "@", range: searchStart..<raw.endIndex) {
            let after = String(raw[r.upperBound...])
            if let c = parseLatLng(after) { results.append(c) }
            searchStart = r.upperBound
        }

        return results
    }

    /// Recovers a display name from a `/maps/dir/` or saddr/daddr token when the
    /// token is a "Place Name@lat,lng" or "Place Name" form. Returns nil for
    /// bare coordinate tokens so callers fall back to "Start"/"Destination".
    private static func name(fromToken token: String) -> String? {
        let raw = token.removingPercentEncoding ?? token
        // Strip a trailing "@lat,lng" chunk if present.
        let base = raw.split(separator: "@").first.map(String.init) ?? raw
        // If what remains is itself just a coordinate, there is no useful name.
        if parseLatLng(base) != nil { return nil }
        let cleaned = base
            .replacingOccurrences(of: "+", with: " ")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        return cleaned.isEmpty ? nil : cleaned
    }

    private static func isValidCoordinate(lat: Double, lon: Double) -> Bool {
        lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 && !(lat == 0 && lon == 0)
    }

    // MARK: - Routing

    /// Computes a driving route between two coordinates using `MKDirections` and
    /// returns a `Trip` populated with route geometry, sampled points, distance,
    /// and expected travel time. POIs are added later by `prescan(_:)`.
    ///
    /// - Throws: `TripError.noRoute` if MapKit returns no route.
    func buildRoute(
        origin: CLLocationCoordinate2D,
        destination: CLLocationCoordinate2D,
        originName: String,
        destinationName: String
    ) async throws -> Trip {
        let request = MKDirections.Request()
        request.source = MKMapItem(placemark: MKPlacemark(coordinate: origin))
        request.destination = MKMapItem(placemark: MKPlacemark(coordinate: destination))
        request.transportType = .automobile

        let directions = MKDirections(request: request)
        let response = try await directions.calculate()

        guard let route = response.routes.first else {
            throw TripError.noRoute
        }

        let coordinates = Self.coordinates(from: route.polyline)
        let routeMiles = route.distance / Constants.Distance.metersPerMile
        let samples = samplePoints(along: coordinates, routeMiles: routeMiles)

        return Trip(
            origin: Waypoint(name: originName, coordinate: origin),
            destination: Waypoint(name: destinationName, coordinate: destination),
            samplePoints: samples,
            distanceMeters: route.distance,
            expectedTravelTime: route.expectedTravelTime
        )
    }

    /// Extracts the ordered coordinate list from an `MKPolyline`.
    private static func coordinates(from polyline: MKPolyline) -> [CLLocationCoordinate2D] {
        let count = polyline.pointCount
        guard count > 0 else { return [] }
        var coords = [CLLocationCoordinate2D](
            repeating: CLLocationCoordinate2D(),
            count: count
        )
        polyline.getCoordinates(&coords, range: NSRange(location: 0, length: count))
        return coords
    }

    // MARK: - Sampling

    /// Walks a route polyline and emits one sample every `interval` miles, where
    /// the interval is chosen from `Constants.Trip` by total route length. The
    /// first and last coordinates are always included so the whole route is
    /// covered end to end.
    func samplePoints(
        along coordinates: [CLLocationCoordinate2D],
        routeMiles: Double
    ) -> [CLLocationCoordinate2D] {
        guard let first = coordinates.first else { return [] }
        guard coordinates.count > 1 else { return [first] }

        let intervalMiles = Self.sampleInterval(forRouteMiles: routeMiles)
        let intervalMeters = intervalMiles * Constants.Distance.metersPerMile

        var samples: [CLLocationCoordinate2D] = [first]
        var accumulated: CLLocationDistance = 0
        var previous = first

        for coordinate in coordinates.dropFirst() {
            let segment = distanceMeters(from: previous, to: coordinate)
            accumulated += segment
            if accumulated >= intervalMeters {
                samples.append(coordinate)
                accumulated = 0
            }
            previous = coordinate
        }

        // Always include the final coordinate (unless it was just emitted).
        if let last = coordinates.last, samples.last.map({ !Self.approxEqual($0, last) }) ?? true {
            samples.append(last)
        }
        return samples
    }

    /// Sampling interval (miles) selected by total route length.
    static func sampleInterval(forRouteMiles routeMiles: Double) -> Double {
        if routeMiles < Constants.Trip.shortRouteThresholdMiles {
            return Constants.Trip.sampleIntervalShortMiles
        } else if routeMiles <= Constants.Trip.longRouteThresholdMiles {
            return Constants.Trip.sampleIntervalMediumMiles
        } else {
            return Constants.Trip.sampleIntervalLongMiles
        }
    }

    // MARK: - Pre-scan

    /// Pre-scans a trip's sample points for narratable POIs and generates
    /// alert-length narrations for the most significant ones, so content is ready
    /// before departure.
    ///
    /// Pipeline:
    ///   1. Query `geoLookup.features(around:radiusMeters:)` at each sample point,
    ///      using a radius tied to the sampling interval.
    ///   2. Dedupe features across points by `GeoFeature.id` and by a coarse
    ///      rounded coordinate (so the same landmark seen from two samples counts
    ///      once).
    ///   3. Rank by `significanceScore` and take the top
    ///      `N = min(maxPregeneratedNarrations, routeMiles / narrationsPerMileDivisor)`.
    ///   4. For each of the top N: reverse-geocode context, generate an `.alert`
    ///      narration, and build a `POI` with the narration attached.
    ///
    /// Per-item failures (a failed lookup or narration) are skipped so one bad
    /// point never aborts the whole pre-scan. `preScanProgress`, `cachedNarrations`,
    /// and `estimatedPOICount` are published incrementally on the main actor.
    ///
    /// - Returns: the trip with `pois` populated.
    func prescan(_ trip: Trip) async -> Trip {
        isPreparing = true
        preScanProgress = 0
        cachedNarrations = []
        defer { isPreparing = false }

        let routeMiles = trip.distanceMiles
        let intervalMiles = Self.sampleInterval(forRouteMiles: routeMiles)
        let radiusMeters = intervalMiles * Constants.Distance.metersPerMile

        // 1 + 2. Gather and dedupe features across all sample points.
        var seenIds = Set<String>()
        var seenCells = Set<String>()
        var features: [GeoFeature] = []

        for point in trip.samplePoints {
            let found: [GeoFeature]
            do {
                found = try await geoLookup.features(around: point, radiusMeters: radiusMeters)
            } catch {
                continue // skip this point, keep going
            }
            for feature in found {
                let cell = Self.cellKey(for: feature.coordinate)
                if seenIds.contains(feature.id) || seenCells.contains(cell) { continue }
                seenIds.insert(feature.id)
                seenCells.insert(cell)
                features.append(feature)
            }
        }

        // 3. Rank and cap.
        let ranked = features.sorted { $0.significanceScore > $1.significanceScore }
        let budget = min(
            Constants.Trip.maxPregeneratedNarrations,
            max(1, Int(routeMiles / Constants.Trip.narrationsPerMileDivisor))
        )
        let selected = Array(ranked.prefix(budget))
        estimatedPOICount = selected.count

        guard !selected.isEmpty else {
            preScanProgress = 1
            var result = trip
            result.pois = []
            tripRoute = result
            return result
        }

        // 4. Generate narration + build POIs.
        var pois: [POI] = []
        let total = Double(selected.count)

        for (index, feature) in selected.enumerated() {
            let context: GeoContext
            do {
                context = try await geoLookup.context(for: feature.coordinate)
            } catch {
                context = GeoContext(region: nil, county: nil, locality: nil, country: nil)
            }

            do {
                let content = try await narration.narration(
                    for: feature.coordinate,
                    speedMph: 0, // stationary while pre-scanning
                    context: context,
                    features: [feature],
                    type: .alert
                )
                let poi = POI(
                    name: content.title.isEmpty ? (feature.name ?? "Point of interest") : content.title,
                    coordinate: feature.coordinate,
                    category: content.category,
                    era: content.era,
                    narration: content
                )
                pois.append(poi)
                cachedNarrations.append(content)
            } catch {
                // Skip narrations that fail (offline, decode error, etc.).
            }

            // Publish progress after each item regardless of success/skip.
            preScanProgress = Double(index + 1) / total
        }

        preScanProgress = 1
        var result = trip
        result.pois = pois
        tripRoute = result
        return result
    }

    // MARK: - Shared URL handoff (Share Extension)

    /// Reads the pending trip URL written by the Share Extension into the shared
    /// app group, then clears it so it isn't reprocessed. Returns `nil` if none
    /// is pending.
    func loadSharedTripURL() -> URL? {
        guard let defaults = UserDefaults(suiteName: Self.appGroupID) else { return nil }
        guard let string = defaults.string(forKey: Self.pendingTripURLKey),
              let url = URL(string: string) else {
            return nil
        }
        defaults.removeObject(forKey: Self.pendingTripURLKey)
        return url
    }

    /// App group used to pass the shared URL from the extension to the app.
    static let appGroupID = "group.com.nearhere.shared"
    /// UserDefaults key under which the extension writes the pending trip URL.
    static let pendingTripURLKey = "pendingTripURL"

    // MARK: - Geometry helpers

    /// Great-circle distance between two coordinates, in miles.
    func distanceMiles(from a: CLLocationCoordinate2D, to b: CLLocationCoordinate2D) -> Double {
        distanceMeters(from: a, to: b) / Constants.Distance.metersPerMile
    }

    /// Great-circle distance between two coordinates, in meters.
    private func distanceMeters(from a: CLLocationCoordinate2D, to b: CLLocationCoordinate2D) -> CLLocationDistance {
        let l1 = CLLocation(latitude: a.latitude, longitude: a.longitude)
        let l2 = CLLocation(latitude: b.latitude, longitude: b.longitude)
        return l1.distance(from: l2)
    }

    // MARK: - Private static geometry helpers

    /// Coarse cell key (~2 decimal places, ~1.1km) used to dedupe features that
    /// resolve to effectively the same landmark from different sample points.
    private static func cellKey(for coordinate: CLLocationCoordinate2D) -> String {
        let lat = (coordinate.latitude * 100).rounded() / 100
        let lon = (coordinate.longitude * 100).rounded() / 100
        return "\(lat),\(lon)"
    }

    private static func approxEqual(_ a: CLLocationCoordinate2D, _ b: CLLocationCoordinate2D) -> Bool {
        abs(a.latitude - b.latitude) < 1e-6 && abs(a.longitude - b.longitude) < 1e-6
    }
}
