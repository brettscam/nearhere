import SwiftUI

@main
struct NearhereApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    // Core observable objects, owned for the app's lifetime.
    @StateObject private var appState = AppState()
    @StateObject private var locationManager = LocationManager()
    @StateObject private var proximityEngine = ProximityEngine()

    var body: some Scene {
        WindowGroup {
            HomeView()
                .environmentObject(appState)
                .environmentObject(locationManager)
                .environmentObject(proximityEngine)
                .preferredColorScheme(.dark) // dark is the primary experience
                .task {
                    // Wire the pipeline once the view tree is up.
                    proximityEngine.bind(to: locationManager, appState: appState)
                }
        }
    }
}
