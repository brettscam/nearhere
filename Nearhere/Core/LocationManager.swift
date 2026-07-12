import Foundation
import CoreLocation
import Combine

/// Owns the single `CLLocationManager` for the app and republishes the values the
/// rest of the pipeline cares about (location, speed in mph, heading, auth status).
///
/// Two modes:
/// - **Ambient monitoring** (`startMonitoring`) uses significant-location-change
///   updates so we stay alive in the background without draining the battery.
/// - **Trip mode** (`setTripMode(true)`) switches to continuous GPS + heading for
///   turn-by-turn proximity while a route is active.
final class LocationManager: NSObject, ObservableObject, CLLocationManagerDelegate {

    /// Most recent fix.
    @Published var currentLocation: CLLocation?
    /// Speed in miles per hour, clamped to `>= 0` (CoreLocation reports `-1` when unknown).
    @Published var currentSpeed: Double = 0
    /// Heading in degrees clockwise from true north.
    @Published var currentHeading: CLLocationDirection = 0
    /// Current authorization status, mirrored for SwiftUI.
    @Published var authorizationStatus: CLAuthorizationStatus

    private let manager = CLLocationManager()

    /// True while continuous GPS (trip mode) is active, false for significant-change monitoring.
    private var isTripMode = false

    /// m/s → mph conversion factor.
    private static let mphPerMetersPerSecond = 2.23694

    override init() {
        self.authorizationStatus = manager.authorizationStatus
        super.init()

        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyNearestTenMeters
        manager.activityType = .automotiveNavigation
        // We manage pausing ourselves via speed-based logic in ProximityEngine.
        manager.pausesLocationUpdatesAutomatically = false
        manager.headingFilter = 5 // degrees

        applyBackgroundUpdatesPolicy()
    }

    // MARK: - Authorization

    /// Requests when-in-use first; escalates to always so background significant-change
    /// monitoring can keep surfacing places on a road trip.
    func requestAuthorization() {
        switch manager.authorizationStatus {
        case .notDetermined:
            manager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse:
            manager.requestAlwaysAuthorization()
        default:
            break
        }
    }

    // MARK: - Monitoring lifecycle

    /// Begin battery-efficient background monitoring via significant location changes.
    func startMonitoring() {
        isTripMode = false
        manager.stopUpdatingLocation()
        manager.stopUpdatingHeading()
        manager.startMonitoringSignificantLocationChanges()
    }

    /// Stop all location updates.
    func stopMonitoring() {
        isTripMode = false
        manager.stopMonitoringSignificantLocationChanges()
        manager.stopUpdatingLocation()
        manager.stopUpdatingHeading()
    }

    /// Toggle continuous GPS. Trip mode gives us high-frequency location + heading;
    /// leaving it reverts to significant-change monitoring.
    func setTripMode(_ active: Bool) {
        isTripMode = active
        if active {
            manager.stopMonitoringSignificantLocationChanges()
            manager.startUpdatingLocation()
            if CLLocationManager.headingAvailable() {
                manager.startUpdatingHeading()
            }
        } else {
            manager.stopUpdatingLocation()
            manager.stopUpdatingHeading()
            manager.startMonitoringSignificantLocationChanges()
        }
    }

    // MARK: - Background policy

    /// `allowsBackgroundLocationUpdates` may only be enabled with Always authorization,
    /// otherwise CoreLocation throws. Keep it in sync with the current grant.
    private func applyBackgroundUpdatesPolicy() {
        let granted = manager.authorizationStatus == .authorizedAlways
        manager.allowsBackgroundLocationUpdates = granted
        manager.showsBackgroundLocationIndicator = granted
    }

    // MARK: - CLLocationManagerDelegate

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        currentLocation = location

        // CLLocation.speed is m/s, or negative when the value is invalid.
        let metersPerSecond = location.speed
        currentSpeed = metersPerSecond >= 0
            ? metersPerSecond * Self.mphPerMetersPerSecond
            : 0
    }

    func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) {
        // Prefer true heading when available (>= 0); fall back to magnetic.
        let heading = newHeading.trueHeading >= 0 ? newHeading.trueHeading : newHeading.magneticHeading
        guard heading >= 0 else { return }
        currentHeading = heading
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        authorizationStatus = manager.authorizationStatus
        applyBackgroundUpdatesPolicy()

        switch manager.authorizationStatus {
        case .authorizedWhenInUse:
            // Escalate toward Always so background monitoring works on a trip.
            manager.requestAlwaysAuthorization()
        case .authorizedAlways:
            // Resume whichever mode is appropriate now that we're authorized.
            if isTripMode {
                setTripMode(true)
            }
        default:
            break
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // Transient errors (e.g. no fix yet) are expected; surface nothing to the UI.
    }
}
