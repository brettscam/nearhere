import Foundation
import CoreLocation
import Combine

/// Global, observable app state. Injected into the SwiftUI environment and
/// updated by the location / proximity pipeline. Deliberately thin — it holds
/// current status, not business logic.
@MainActor
final class AppState: ObservableObject {

    /// Whether the proximity pipeline is actively monitoring location.
    @Published var isMonitoring: Bool = false

    /// Most recent speed in mph (derived from `LocationManager`).
    @Published var currentSpeed: Double = 0

    /// Most recent known location.
    @Published var currentLocation: CLLocation?

    /// The POI currently being alerted/narrated, if any.
    @Published var activePOI: POI?

    /// Whether the app is in Trip Mode (a route has been loaded and started).
    @Published var tripMode: Bool = false

    /// The active trip, when in Trip Mode.
    @Published var activeTrip: Trip?

    /// Reverse-geocoded region name shown at the top of Home.
    @Published var currentRegionName: String?

    /// User preferences (categories, density, voice, …).
    @Published var preferences: UserPreferences = .load()

    func updatePreferences(_ transform: (inout UserPreferences) -> Void) {
        transform(&preferences)
        preferences.save()
    }
}
