import Foundation
import CoreLocation

/// A point of interest surfaced to the user. Value type so it moves cleanly
/// across the location → proximity → UI pipeline.
struct POI: Identifiable, Hashable {
    let id: UUID
    let name: String
    let coordinate: CLLocationCoordinate2D
    let category: POICategory
    let era: POIEra

    /// Optional pre-generated narration, attached once `NarrationService` runs.
    var narration: NarrationContent?

    init(
        id: UUID = UUID(),
        name: String,
        coordinate: CLLocationCoordinate2D,
        category: POICategory,
        era: POIEra,
        narration: NarrationContent? = nil
    ) {
        self.id = id
        self.name = name
        self.coordinate = coordinate
        self.category = category
        self.era = era
        self.narration = narration
    }

    // MARK: - Geometry relative to the user

    /// Straight-line distance from a reference (user) location, in meters.
    func distance(from location: CLLocation) -> CLLocationDistance {
        let target = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
        return target.distance(from: location)
    }

    /// A coarse, glanceable direction relative to the user's travel heading,
    /// e.g. "ahead left", "behind right". Heading is degrees clockwise from true north.
    func direction(from location: CLLocation, heading: CLLocationDirection) -> String {
        let bearing = Self.bearing(from: location.coordinate, to: coordinate)
        // Relative angle: where the POI sits relative to where we're pointing.
        var relative = bearing - heading
        relative = (relative + 360).truncatingRemainder(dividingBy: 360)

        let forwardBack = (relative < 90 || relative > 270) ? "ahead" : "behind"
        let leftRight: String
        if relative > 5 && relative < 175 {
            leftRight = "right"
        } else if relative > 185 && relative < 355 {
            leftRight = "left"
        } else {
            leftRight = "" // dead ahead or dead behind
        }
        return leftRight.isEmpty ? forwardBack : "\(forwardBack) \(leftRight)"
    }

    /// Initial bearing (degrees clockwise from true north) from `start` to `end`.
    static func bearing(from start: CLLocationCoordinate2D, to end: CLLocationCoordinate2D) -> CLLocationDirection {
        let lat1 = start.latitude * .pi / 180
        let lat2 = end.latitude * .pi / 180
        let dLon = (end.longitude - start.longitude) * .pi / 180
        let y = sin(dLon) * cos(lat2)
        let x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLon)
        let radians = atan2(y, x)
        let degrees = radians * 180 / .pi
        return (degrees + 360).truncatingRemainder(dividingBy: 360)
    }

    // MARK: - Hashable / Equatable (CLLocationCoordinate2D is not Hashable by default)

    static func == (lhs: POI, rhs: POI) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}
