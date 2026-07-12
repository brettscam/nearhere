import XCTest
import CoreLocation
@testable import Nearhere

/// Unit coverage for the deterministic parts of the proximity engine:
/// adaptive radius, throttle intervals, time-based throttling, and per-place cooldown.
final class ProximityEngineTests: XCTestCase {

    private let metersPerMile = Constants.Distance.metersPerMile

    // MARK: - Detection radius

    func testDetectionRadiusHighway() {
        // 70 mph → 5 mile highway radius.
        XCTAssertEqual(ProximityEngine.detectionRadiusMeters(forSpeedMph: 70),
                       5 * metersPerMile, accuracy: 0.5)
    }

    func testDetectionRadiusRural() {
        // 40 mph → 2 mile rural radius.
        XCTAssertEqual(ProximityEngine.detectionRadiusMeters(forSpeedMph: 40),
                       2 * metersPerMile, accuracy: 0.5)
    }

    func testDetectionRadiusUrban() {
        // 10 mph → 0.5 mile urban radius.
        XCTAssertEqual(ProximityEngine.detectionRadiusMeters(forSpeedMph: 10),
                       0.5 * metersPerMile, accuracy: 0.5)
    }

    func testDetectionRadiusBoundaries() {
        // 55 is NOT > 55, so it falls into the rural band (2 mi).
        XCTAssertEqual(ProximityEngine.detectionRadiusMeters(forSpeedMph: 55),
                       2 * metersPerMile, accuracy: 0.5)
        // 25 is the bottom of the rural band (2 mi).
        XCTAssertEqual(ProximityEngine.detectionRadiusMeters(forSpeedMph: 25),
                       2 * metersPerMile, accuracy: 0.5)
        // Just under 25 drops to urban (0.5 mi).
        XCTAssertEqual(ProximityEngine.detectionRadiusMeters(forSpeedMph: 24.9),
                       0.5 * metersPerMile, accuracy: 0.5)
    }

    // MARK: - Throttle interval

    func testThrottleIntervalHighwayVsUrban() {
        XCTAssertEqual(ProximityEngine.throttleInterval(forSpeedMph: 70),
                       Constants.Throttle.highwayInterval, accuracy: 0.001)
        // 55 is not > 55, so urban interval applies.
        XCTAssertEqual(ProximityEngine.throttleInterval(forSpeedMph: 55),
                       Constants.Throttle.urbanInterval, accuracy: 0.001)
        XCTAssertEqual(ProximityEngine.throttleInterval(forSpeedMph: 20),
                       Constants.Throttle.urbanInterval, accuracy: 0.001)
    }

    // MARK: - Time-based throttling

    @MainActor
    func testThrottlingSuppressesWithinWindow() {
        let engine = ProximityEngine()
        let t0 = Date(timeIntervalSince1970: 1_000_000)
        let speed = 20.0 // urban → 90s window

        // First alert is allowed, then recorded.
        XCTAssertTrue(engine.shouldAlert(now: t0, speedMph: speed))
        engine.recordAlert(for: CLLocationCoordinate2D(latitude: 0, longitude: 0), now: t0)

        // A second alert 30s later is suppressed (inside the 90s window).
        let within = t0.addingTimeInterval(30)
        XCTAssertFalse(engine.shouldAlert(now: within, speedMph: speed))

        // Exactly at the window boundary it's allowed again.
        let after = t0.addingTimeInterval(Constants.Throttle.urbanInterval)
        XCTAssertTrue(engine.shouldAlert(now: after, speedMph: speed))
    }

    // MARK: - Cooldown dedupe

    @MainActor
    func testCooldownSuppressesNearbyButNotDistant() {
        let engine = ProximityEngine()
        let t0 = Date(timeIntervalSince1970: 2_000_000)

        let base = CLLocationCoordinate2D(latitude: 37.0, longitude: -122.0)
        engine.recordAlert(for: base, now: t0)

        // A place essentially on top of the alerted coordinate is suppressed.
        let near = CLLocationCoordinate2D(latitude: 37.0005, longitude: -122.0005)
        XCTAssertTrue(engine.isSuppressedByCooldown(near, now: t0))

        // ~16 miles away (well past the 10 mi cooldown) is allowed.
        let far = CLLocationCoordinate2D(latitude: 37.0, longitude: -122.3)
        XCTAssertFalse(engine.isSuppressedByCooldown(far, now: t0))
    }

    // MARK: - Stopped pause

    @MainActor
    func testStoppedForIntervalThrottles() {
        let engine = ProximityEngine()
        let t0 = Date(timeIntervalSince1970: 3_000_000)

        // First tick below the stopped threshold arms the timer but doesn't pause yet.
        engine.updateStoppedState(now: t0, speedMph: 0)
        XCTAssertFalse(engine.isThrottled)

        // After the pause interval elapses while still stopped, alerts pause.
        let later = t0.addingTimeInterval(Constants.Speed.stoppedPauseInterval)
        engine.updateStoppedState(now: later, speedMph: 0)
        XCTAssertTrue(engine.isThrottled)

        // Moving again clears the pause.
        engine.updateStoppedState(now: later.addingTimeInterval(1), speedMph: 30)
        XCTAssertFalse(engine.isThrottled)
    }
}
