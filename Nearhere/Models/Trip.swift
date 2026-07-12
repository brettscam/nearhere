import Foundation
import CoreLocation

/// A planned or in-progress trip imported from a maps route.
struct Trip: Identifiable, Hashable {
    let id: UUID
    var origin: Waypoint
    var destination: Waypoint
    /// Sampled points along the route polyline used to pre-scan for POIs.
    var samplePoints: [CLLocationCoordinate2D]
    /// Total route distance in meters.
    var distanceMeters: CLLocationDistance
    /// Estimated drive time in seconds (from MKDirections).
    var expectedTravelTime: TimeInterval
    /// POIs discovered/narrated along this trip.
    var pois: [POI]
    var startedAt: Date?
    var endedAt: Date?

    init(
        id: UUID = UUID(),
        origin: Waypoint,
        destination: Waypoint,
        samplePoints: [CLLocationCoordinate2D] = [],
        distanceMeters: CLLocationDistance = 0,
        expectedTravelTime: TimeInterval = 0,
        pois: [POI] = [],
        startedAt: Date? = nil,
        endedAt: Date? = nil
    ) {
        self.id = id
        self.origin = origin
        self.destination = destination
        self.samplePoints = samplePoints
        self.distanceMeters = distanceMeters
        self.expectedTravelTime = expectedTravelTime
        self.pois = pois
        self.startedAt = startedAt
        self.endedAt = endedAt
    }

    var distanceMiles: Double { distanceMeters / 1609.344 }

    var duration: TimeInterval? {
        guard let startedAt, let endedAt else { return nil }
        return endedAt.timeIntervalSince(startedAt)
    }

    static func == (lhs: Trip, rhs: Trip) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

/// A named endpoint of a trip.
struct Waypoint: Hashable {
    var name: String
    var coordinate: CLLocationCoordinate2D

    static func == (lhs: Waypoint, rhs: Waypoint) -> Bool {
        lhs.name == rhs.name &&
        lhs.coordinate.latitude == rhs.coordinate.latitude &&
        lhs.coordinate.longitude == rhs.coordinate.longitude
    }
    func hash(into hasher: inout Hasher) {
        hasher.combine(name)
        hasher.combine(coordinate.latitude)
        hasher.combine(coordinate.longitude)
    }
}
