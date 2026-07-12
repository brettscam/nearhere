import Foundation
import CoreLocation
import Combine

/// The heart of the "surface a place at the right moment" logic.
///
/// Responsibilities:
/// - Pick an **adaptive detection radius** based on speed (fast → look further ahead).
/// - **Throttle** alerts so we don't chatter (one per interval, longer on the highway).
/// - Apply a **per-place cooldown** so the same spot doesn't repeat for a while.
/// - **Pause** entirely when the vehicle has been stopped for a bit.
///
/// The radius / throttle / cooldown decisions live in `nonisolated static` helpers so
/// they can be unit-tested without hopping onto the main actor.
@MainActor
final class ProximityEngine: ObservableObject {

    /// POIs currently within the detection radius, ranked, best-effort.
    @Published var nearbyPOIs: [POI] = []
    /// The POI we're actively alerting on right now, if any.
    @Published var activeAlert: POI?
    /// True while alerts are paused (e.g. the user has been stopped a while).
    @Published var isThrottled: Bool = false

    /// Geographic backend. `nil` in early builds / tests — the radius + throttle +
    /// cooldown machinery still runs, it just produces no POIs.
    private let geoLookup: GeoLookupProviding?

    /// Injectable clock so tests can control time. Production uses the real wall clock.
    var now: () -> Date = { Date() }

    // MARK: Throttle / cooldown state

    /// When we last fired an alert (drives the throttle interval).
    private var lastAlertDate: Date?
    /// Recently-alerted coordinates keyed by a coarse coordinate bucket, used for
    /// distance-based dedupe (a place within `poiCooldownMiles` is suppressed).
    private var recentlyAlerted: [String: (date: Date, coordinate: CLLocationCoordinate2D)] = [:]
    /// When the vehicle first dropped below the "stopped" speed, if it currently is.
    private var stoppedSince: Date?

    private var cancellables = Set<AnyCancellable>()

    init(geoLookup: GeoLookupProviding? = nil) {
        self.geoLookup = geoLookup
    }

    // MARK: - Pure, testable decision helpers

    /// Adaptive detection radius (meters) for a given speed. Faster travel looks
    /// further ahead so there's time to narrate before the place is passed.
    ///
    /// - `> 55 mph` → highway radius (5 mi)
    /// - `25…55 mph` → rural radius (2 mi)
    /// - `< 25 mph` → urban radius (0.5 mi)
    nonisolated static func detectionRadiusMeters(forSpeedMph speed: Double) -> CLLocationDistance {
        let miles: Double
        if speed > Constants.Speed.highwayThresholdMph {
            miles = Constants.Distance.highwayRadiusMiles
        } else if speed >= Constants.Speed.urbanThresholdMph {
            miles = Constants.Distance.ruralRadiusMiles
        } else {
            miles = Constants.Distance.urbanRadiusMiles
        }
        return miles * Constants.Distance.metersPerMile
    }

    /// Minimum spacing between alerts for a given speed: longer on the highway
    /// (fewer, bigger landmarks) than in town.
    nonisolated static func throttleInterval(forSpeedMph speed: Double) -> TimeInterval {
        speed > Constants.Speed.highwayThresholdMph
            ? Constants.Throttle.highwayInterval
            : Constants.Throttle.urbanInterval
    }

    /// A coarse, stable key for a coordinate (~100 m grid) used to bucket the
    /// recently-alerted set for cooldown dedupe.
    nonisolated static func poiKey(for coordinate: CLLocationCoordinate2D) -> String {
        let precision = Double(Constants.Geo.narrationCachePrecision) // decimal places
        let factor = pow(10.0, precision)
        let lat = (coordinate.latitude * factor).rounded() / factor
        let lon = (coordinate.longitude * factor).rounded() / factor
        return "\(lat),\(lon)"
    }

    // MARK: - Throttle / cooldown (instance)

    /// True when enough time has elapsed since the last alert and we're not paused.
    /// `now` is passed explicitly so tests can drive the clock deterministically.
    func shouldAlert(now: Date, speedMph: Double) -> Bool {
        guard !isThrottled else { return false }
        guard let last = lastAlertDate else { return true }
        return now.timeIntervalSince(last) >= Self.throttleInterval(forSpeedMph: speedMph)
    }

    /// True when `coordinate` is within `poiCooldownMiles` of any recently-alerted place.
    func isSuppressedByCooldown(_ coordinate: CLLocationCoordinate2D, now: Date) -> Bool {
        let candidate = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
        let cooldownMeters = Constants.Distance.poiCooldownMiles * Constants.Distance.metersPerMile
        for entry in recentlyAlerted.values {
            let previous = CLLocation(latitude: entry.coordinate.latitude,
                                      longitude: entry.coordinate.longitude)
            if candidate.distance(from: previous) <= cooldownMeters {
                return true
            }
        }
        return false
    }

    /// Record that we alerted on `coordinate` at `now`: resets the throttle timer and
    /// adds the place to the cooldown set.
    func recordAlert(for coordinate: CLLocationCoordinate2D, now: Date) {
        lastAlertDate = now
        recentlyAlerted[Self.poiKey(for: coordinate)] = (now, coordinate)
    }

    /// Update the "stopped" pause state. Once the vehicle has been below the stopped
    /// threshold continuously for `stoppedPauseInterval`, alerts are throttled off.
    func updateStoppedState(now: Date, speedMph: Double) {
        if speedMph < Constants.Speed.stoppedThresholdMph {
            let since = stoppedSince ?? now
            stoppedSince = since
            if now.timeIntervalSince(since) >= Constants.Speed.stoppedPauseInterval {
                isThrottled = true
            }
        } else {
            stoppedSince = nil
            isThrottled = false
        }
    }

    // MARK: - Wiring

    /// Observe the `LocationManager` streams and evaluate proximity as they change.
    /// Called once from `NearhereApp.task`.
    func bind(to locationManager: LocationManager, appState: AppState) {
        Publishers.CombineLatest3(
            locationManager.$currentLocation,
            locationManager.$currentSpeed,
            locationManager.$currentHeading
        )
        // Coalesce bursts of GPS updates; latest wins.
        .throttle(for: .seconds(1), scheduler: RunLoop.main, latest: true)
        .sink { [weak self, weak appState] location, speedMph, heading in
            guard let self, let appState, let location else { return }
            let preferences = appState.preferences
            Task { @MainActor in
                await self.evaluate(location: location,
                                    speedMph: speedMph,
                                    heading: heading,
                                    preferences: preferences)
                // Mirror the chosen alert onto shared app state for the UI.
                if let alert = self.activeAlert {
                    appState.activePOI = alert
                }
            }
        }
        .store(in: &cancellables)
    }

    // MARK: - Evaluation

    /// Core evaluation pass: refresh `nearbyPOIs` and, when appropriate, set `activeAlert`.
    func evaluate(location: CLLocation,
                  speedMph: Double,
                  heading: CLLocationDirection,
                  preferences: UserPreferences) async {
        let clockNow = now()
        updateStoppedState(now: clockNow, speedMph: speedMph)

        let radius = Self.detectionRadiusMeters(forSpeedMph: speedMph)

        // No backend yet → exercise the radius/throttle machinery but surface nothing.
        guard let geoLookup else {
            nearbyPOIs = []
            return
        }

        let features: [GeoFeature]
        do {
            features = try await geoLookup.features(around: location.coordinate, radiusMeters: radius)
        } catch {
            return
        }

        // Rank by significance, map to POIs, and keep only allowed categories.
        let candidates = features
            .sorted { $0.significanceScore > $1.significanceScore }
            .map { Self.makePOI(from: $0) }
            .filter { preferences.allows($0.category) }

        nearbyPOIs = candidates

        // Nothing to say if we're throttled or nothing qualifies.
        guard shouldAlert(now: clockNow, speedMph: speedMph) else { return }

        // First candidate that isn't on cooldown becomes the active alert.
        guard let next = candidates.first(where: {
            !isSuppressedByCooldown($0.coordinate, now: clockNow)
        }) else { return }

        recordAlert(for: next.coordinate, now: clockNow)
        activeAlert = next
    }

    // MARK: - Feature → POI mapping (best-effort)

    /// Minimal mapping from a raw geo feature to a user-facing POI. Category is a
    /// reasonable default per feature type; narration is filled in downstream.
    nonisolated static func makePOI(from feature: GeoFeature) -> POI {
        let category: POICategory
        switch feature.featureType {
        case .historic: category = .history
        case .natural:  category = .ecology
        case .tourism:  category = .culture
        case .place:    category = .history
        case .other:    category = .culture
        }
        return POI(
            name: feature.name ?? feature.featureType.rawValue.capitalized,
            coordinate: feature.coordinate,
            category: category,
            era: .modern
        )
    }
}
