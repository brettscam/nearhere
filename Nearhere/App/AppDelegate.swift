import UIKit

/// Minimal app delegate. SwiftUI drives the lifecycle; this exists so we have a
/// hook for background launch (e.g. significant-location-change relaunch) and
/// audio session bootstrapping later on.
final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        // If iOS relaunched us in the background for a location event, the
        // LocationManager (created in the App scene) will resume monitoring.
        return true
    }
}
