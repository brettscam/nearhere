import SwiftUI

/// Trip Mode setup — plan a route and pre-scan it for stories before departing.
///
/// SCAFFOLD ONLY. All values below are local `@State` placeholders. Once
/// `TripModeService` exists it will be injected (e.g. `@EnvironmentObject` /
/// `@StateObject`) and these will bind to its published properties:
///   - `tripRoute: Trip?`               → route summary (origin/destination/distance/time)
///   - `preScanProgress: (done, total)` → the pre-scan progress bar
///   - `cachedNarrations: Int`          → how many stories are ready offline
///   - `estimatedPOICount: Int`         → the "stories found ahead" estimate
struct TripModeView: View {
    @Environment(\.dismiss) private var dismiss

    // MARK: Placeholder route (replace with TripModeService.tripRoute)
    @State private var originName = "San Francisco, CA"
    @State private var destinationName = "Lake Tahoe, CA"
    @State private var distanceMiles: Double = 189
    @State private var estimatedDriveTime: TimeInterval = 3 * 3600 + 20 * 60

    // MARK: Placeholder filters
    @State private var enabledCategories: Set<POICategory> = Set(POICategory.allCases)
    @State private var alertDensity: Double = 0.5

    // MARK: Placeholder pre-scan progress (replace with TripModeService.preScanProgress)
    @State private var scannedCount = 12
    @State private var totalToScan = 28

    /// Enough stories cached to reasonably start.
    private var isReadyToStart: Bool { scannedCount >= 10 }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: DesignTokens.Spacing.lg) {
                    routeSummary
                    prescanCard
                    filtersCard
                    densityCard
                }
                .padding(DesignTokens.Spacing.md)
            }
            .background(DesignTokens.Palette.background.ignoresSafeArea())
            .safeAreaInset(edge: .bottom) { startButton }
            .navigationTitle("Trip Mode")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                        .foregroundStyle(DesignTokens.Palette.textSecondary)
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    // MARK: - Route summary

    private var routeSummary: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            waypointRow(symbol: "location.circle.fill", label: "From", name: originName)
            Rectangle()
                .fill(DesignTokens.Palette.hairline)
                .frame(height: 1)
                .padding(.leading, 32)
            waypointRow(symbol: "flag.checkered.circle.fill", label: "To", name: destinationName)

            HStack(spacing: DesignTokens.Spacing.lg) {
                stat(icon: "road.lanes", value: distanceMiles.asMilesString, caption: "Distance")
                stat(icon: "clock.fill", value: estimatedDriveTime.driveTimeString, caption: "Drive time")
            }
            .padding(.top, DesignTokens.Spacing.xs)
        }
        .padding(DesignTokens.Spacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }

    private func waypointRow(symbol: String, label: String, name: String) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: symbol)
                .font(.system(size: 22))
                .foregroundStyle(DesignTokens.Palette.accent)
            VStack(alignment: .leading, spacing: 1) {
                Text(label.uppercased())
                    .font(DesignTokens.Typography.caption(11))
                    .tracking(1)
                    .foregroundStyle(DesignTokens.Palette.textTertiary)
                Text(name)
                    .font(DesignTokens.Typography.heading(18))
                    .foregroundStyle(DesignTokens.Palette.textPrimary)
            }
            Spacer(minLength: 0)
        }
    }

    private func stat(icon: String, value: String, caption: String) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: icon)
                .foregroundStyle(DesignTokens.Palette.secondaryAccent)
            VStack(alignment: .leading, spacing: 0) {
                Text(value)
                    .font(DesignTokens.Typography.heading(17))
                    .foregroundStyle(DesignTokens.Palette.textPrimary)
                Text(caption)
                    .font(DesignTokens.Typography.caption(11))
                    .foregroundStyle(DesignTokens.Palette.textTertiary)
            }
        }
    }

    // MARK: - Pre-scan

    private var prescanCard: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            HStack {
                Text("Preparing your stories…")
                    .font(DesignTokens.Typography.heading(17))
                    .foregroundStyle(DesignTokens.Palette.textPrimary)
                Spacer()
                Text("\(scannedCount)/\(totalToScan)")
                    .font(DesignTokens.Typography.caption(13))
                    .foregroundStyle(DesignTokens.Palette.textSecondary)
            }

            ProgressView(value: Double(scannedCount), total: Double(max(totalToScan, 1)))
                .tint(DesignTokens.Palette.accent)

            Text(isReadyToStart
                 ? "Enough stories are ready — you can start now."
                 : "Gathering a few more before you go.")
                .font(DesignTokens.Typography.caption(12))
                .foregroundStyle(DesignTokens.Palette.textTertiary)
        }
        .padding(DesignTokens.Spacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }

    // MARK: - Filters

    private var filtersCard: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text("Topics")
                .font(DesignTokens.Typography.heading(17))
                .foregroundStyle(DesignTokens.Palette.textPrimary)

            FlowChips(categories: POICategory.allCases, selected: $enabledCategories)
        }
        .padding(DesignTokens.Spacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }

    // MARK: - Density

    private var densityCard: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            HStack {
                Text("Alert Density")
                    .font(DesignTokens.Typography.heading(17))
                    .foregroundStyle(DesignTokens.Palette.textPrimary)
                Spacer()
                Text(String(format: "%.0f%%", alertDensity * 100))
                    .font(DesignTokens.Typography.caption(13))
                    .foregroundStyle(DesignTokens.Palette.textSecondary)
            }
            Slider(value: $alertDensity, in: 0...1)
                .tint(DesignTokens.Palette.accent)
        }
        .padding(DesignTokens.Spacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }

    // MARK: - Start button

    private var startButton: some View {
        Button {
            // TripModeService.startTrip() will be invoked here.
            dismiss()
        } label: {
            Text(isReadyToStart ? "Start Trip" : "Preparing… \(scannedCount)/\(totalToScan)")
                .font(DesignTokens.Typography.heading(18))
                .foregroundStyle(DesignTokens.Palette.background)
                .frame(maxWidth: .infinity)
                .frame(height: DesignTokens.Size.primaryButtonHeight)
                .background(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.button, style: .continuous)
                        .fill(DesignTokens.Palette.accent)
                )
        }
        .buttonStyle(.plain)
        .disabled(!isReadyToStart)
        .opacity(isReadyToStart ? 1 : 0.5)
        .padding(DesignTokens.Spacing.md)
        .background(.ultraThinMaterial)
    }
}

// MARK: - Category chips

/// Wrapping chip selector for category filters. Local UI component for the scaffold.
private struct FlowChips: View {
    let categories: [POICategory]
    @Binding var selected: Set<POICategory>

    private let columns = [GridItem(.adaptive(minimum: 110), spacing: DesignTokens.Spacing.sm)]

    var body: some View {
        LazyVGrid(columns: columns, alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            ForEach(categories) { category in
                let isOn = selected.contains(category)
                Button {
                    if isOn { selected.remove(category) } else { selected.insert(category) }
                } label: {
                    HStack(spacing: DesignTokens.Spacing.xs) {
                        Image(systemName: category.symbolName)
                            .font(.system(size: 13, weight: .semibold))
                        Text(category.displayName)
                            .font(DesignTokens.Typography.caption(13))
                    }
                    .foregroundStyle(isOn ? DesignTokens.Palette.background : DesignTokens.Palette.textSecondary)
                    .padding(.horizontal, DesignTokens.Spacing.md)
                    .frame(height: DesignTokens.Size.minTapTarget)
                    .frame(maxWidth: .infinity)
                    .background(
                        RoundedRectangle(cornerRadius: DesignTokens.Radius.chip, style: .continuous)
                            .fill(isOn ? DesignTokens.Palette.accent : DesignTokens.Palette.surfaceRaised)
                    )
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(isOn ? .isSelected : [])
            }
        }
    }
}

// MARK: - Preview

#Preview("Trip Mode") {
    TripModeView()
        .preferredColorScheme(.dark)
}
