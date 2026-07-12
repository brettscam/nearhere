import SwiftUI
import CoreLocation

/// The app's home / ambient-listening screen. Calm dark canvas with a pulsing
/// proximity ring, region label, a start/stop control, and the floating POI
/// alert card when the proximity engine surfaces something nearby.
struct HomeView: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var locationManager: LocationManager
    @EnvironmentObject private var proximityEngine: ProximityEngine

    @State private var showSettings = false
    @State private var showTrip = false

    var body: some View {
        ZStack {
            background

            VStack(spacing: DesignTokens.Spacing.xl) {
                topBar
                Spacer()
                proximityMark
                statusBlock
                Spacer()
                monitorControl
            }
            .padding(DesignTokens.Spacing.lg)

            // Floating alert card.
            if let alert = proximityEngine.activeAlert {
                VStack {
                    Spacer()
                    POICardView(
                        poi: alert,
                        progress: 0.0,
                        userLocation: locationManager.currentLocation,
                        heading: locationManager.currentHeading,
                        onTellMeMore: {},
                        onDismiss: { dismissAlert() }
                    )
                    .padding(.bottom, DesignTokens.Spacing.md)
                }
                .transition(.move(edge: .bottom).combined(with: .opacity))
                .zIndex(1)
            }
        }
        .animation(.spring(response: 0.45, dampingFraction: 0.85), value: proximityEngine.activeAlert)
        .sheet(isPresented: $showSettings) { SettingsView() }
        .sheet(isPresented: $showTrip) { TripModeView() }
    }

    // MARK: - Background

    private var background: some View {
        ZStack {
            DesignTokens.Palette.background.ignoresSafeArea()

            // Subtle warm radial glow behind the ring.
            RadialGradient(
                colors: [DesignTokens.Palette.accent.opacity(0.12), .clear],
                center: .center,
                startRadius: 20,
                endRadius: 380
            )
            .ignoresSafeArea()

            // Faint topographic contour lines.
            TopographicOverlay()
                .stroke(DesignTokens.Palette.hairline, lineWidth: 1)
                .ignoresSafeArea()
                .accessibilityHidden(true)
        }
    }

    // MARK: - Top bar

    private var topBar: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            VStack(alignment: .leading, spacing: 2) {
                Text("You're near")
                    .font(DesignTokens.Typography.eyebrow)
                    .tracking(2.4)
                    .textCase(.uppercase)
                    .foregroundStyle(DesignTokens.Palette.textTertiary)
                Text(appState.currentRegionName ?? "Locating…")
                    .font(DesignTokens.Typography.titleStyle)
                    .foregroundStyle(DesignTokens.Palette.textPrimary)
            }

            Spacer()

            circleButton(system: "map.fill", label: "Trip Mode") { showTrip = true }
            circleButton(system: "gearshape.fill", label: "Settings") { showSettings = true }
        }
    }

    private func circleButton(system: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: system)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(DesignTokens.Palette.textPrimary)
                .frame(width: DesignTokens.Size.minTapTarget, height: DesignTokens.Size.minTapTarget)
                .background(Circle().fill(DesignTokens.Palette.surface))
                .overlay(Circle().strokeBorder(DesignTokens.Palette.hairline, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }

    // MARK: - Proximity mark (the breathing rings)

    private var proximityMark: some View {
        ProximityMark(state: markState, size: 220)
            .frame(height: 300)
            .opacity(appState.isMonitoring ? 1 : 0.4)
            .animation(.easeInOut(duration: 0.6), value: appState.isMonitoring)
    }

    /// Which motion state the mark shows: narrating while a story plays,
    /// otherwise the calm listening breath.
    private var markState: ProximityMark.State {
        proximityEngine.activeAlert != nil ? .narrating : .listening
    }

    // MARK: - Status

    private var statusBlock: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Text(statusText)
                .font(DesignTokens.Typography.heading(19))
                .multilineTextAlignment(.center)
                .foregroundStyle(DesignTokens.Palette.textPrimary)

            if appState.isMonitoring {
                Text(String(format: "%.0f mph", locationManager.currentSpeed))
                    .font(DesignTokens.Typography.caption(13))
                    .foregroundStyle(DesignTokens.Palette.textTertiary)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.md)
    }

    private var statusText: String {
        if appState.tripMode {
            let count = appState.activeTrip?.pois.count ?? 0
            return "Trip Mode: \(count) stories found ahead"
        }
        return appState.isMonitoring
            ? "Listening for nearby stories…"
            : "Tap start to begin listening"
    }

    // MARK: - Monitor control

    private var monitorControl: some View {
        Button(action: toggleMonitoring) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: appState.isMonitoring ? "stop.fill" : "play.fill")
                Text(appState.isMonitoring ? "Stop Listening" : "Start Listening")
            }
            .font(DesignTokens.Typography.heading(18))
            .foregroundStyle(appState.isMonitoring ? DesignTokens.Palette.textPrimary : DesignTokens.Palette.background)
            .frame(maxWidth: .infinity)
            .frame(height: DesignTokens.Size.primaryButtonHeight)
            .background(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.button, style: .continuous)
                    .fill(appState.isMonitoring ? DesignTokens.Palette.surface : DesignTokens.Palette.accent)
            )
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.button, style: .continuous)
                    .strokeBorder(DesignTokens.Palette.hairline, lineWidth: appState.isMonitoring ? 1 : 0)
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Actions

    private func toggleMonitoring() {
        if appState.isMonitoring {
            locationManager.stopMonitoring()
            appState.isMonitoring = false
        } else {
            locationManager.requestAuthorization()
            locationManager.startMonitoring()
            appState.isMonitoring = true
        }
    }

    private func dismissAlert() {
        proximityEngine.activeAlert = nil
        appState.activePOI = nil
    }
}

// MARK: - Topographic overlay

/// A cheap set of nested wavy contour lines used as a subtle background texture.
private struct TopographicOverlay: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let lineCount = 6
        let spacing = rect.height / CGFloat(lineCount + 1)

        for i in 1...lineCount {
            let baseY = spacing * CGFloat(i)
            let amplitude = 14.0 + Double(i) * 3
            path.move(to: CGPoint(x: rect.minX, y: baseY))
            var x = rect.minX
            let step: CGFloat = 12
            while x <= rect.maxX {
                let phase = Double(x) / 90.0 + Double(i)
                let y = baseY + CGFloat(sin(phase) * amplitude)
                path.addLine(to: CGPoint(x: x, y: y))
                x += step
            }
        }
        return path
    }
}

// MARK: - Preview

#Preview("Home") {
    HomeView()
        .environmentObject(AppState())
        .environmentObject(LocationManager())
        .environmentObject(ProximityEngine())
        .preferredColorScheme(.dark)
}
