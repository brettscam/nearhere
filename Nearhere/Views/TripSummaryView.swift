import SwiftUI
import CoreLocation

/// Post-trip recap: the stories heard along the way, headline stats, and a
/// shareable text summary. Each story offers a replay control.
struct TripSummaryView: View {
    let trip: Trip

    /// Replays the narration for a given POI.
    var onReplay: (POI) -> Void = { _ in }

    var body: some View {
        ScrollView {
            VStack(spacing: DesignTokens.Spacing.lg) {
                header
                statsRow
                storiesSection
                shareButton
            }
            .padding(DesignTokens.Spacing.md)
        }
        .background(DesignTokens.Palette.background.ignoresSafeArea())
        .preferredColorScheme(.dark)
    }

    // MARK: - Header

    private var header: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: 40))
                .foregroundStyle(DesignTokens.Palette.accent)

            Text("Trip Complete")
                .font(DesignTokens.Typography.title(28))
                .foregroundStyle(DesignTokens.Palette.textPrimary)

            Text("\(trip.origin.name)  →  \(trip.destination.name)")
                .font(DesignTokens.Typography.body(16))
                .multilineTextAlignment(.center)
                .foregroundStyle(DesignTokens.Palette.textSecondary)
        }
        .padding(.top, DesignTokens.Spacing.md)
    }

    // MARK: - Stats

    private var statsRow: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            statTile(value: "\(trip.pois.count)", caption: "Stories heard", icon: "book.fill")
            statTile(value: trip.distanceMiles.asMilesString, caption: "Distance", icon: "road.lanes")
            statTile(value: durationText, caption: "Duration", icon: "clock.fill")
        }
    }

    private func statTile(value: String, caption: String, icon: String) -> some View {
        VStack(spacing: DesignTokens.Spacing.xs) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundStyle(DesignTokens.Palette.accent)
            Text(value)
                .font(DesignTokens.Typography.heading(20))
                .foregroundStyle(DesignTokens.Palette.textPrimary)
            Text(caption)
                .font(DesignTokens.Typography.caption(11))
                .multilineTextAlignment(.center)
                .foregroundStyle(DesignTokens.Palette.textTertiary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, DesignTokens.Spacing.md)
        .cardStyle()
    }

    // MARK: - Stories

    private var storiesSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text("Stories Along the Way")
                .font(DesignTokens.Typography.heading(19))
                .foregroundStyle(DesignTokens.Palette.textPrimary)
                .padding(.horizontal, DesignTokens.Spacing.xs)

            if trip.pois.isEmpty {
                Text("No stories were narrated on this trip.")
                    .font(DesignTokens.Typography.body(15))
                    .foregroundStyle(DesignTokens.Palette.textTertiary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(DesignTokens.Spacing.lg)
                    .cardStyle()
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(trip.pois.enumerated()), id: \.element.id) { index, poi in
                        storyRow(poi)
                        if index < trip.pois.count - 1 {
                            Divider().overlay(DesignTokens.Palette.hairline)
                                .padding(.leading, DesignTokens.Spacing.lg + 24)
                        }
                    }
                }
                .cardStyle()
            }
        }
    }

    private func storyRow(_ poi: POI) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: poi.category.symbolName)
                .font(.system(size: 20))
                .foregroundStyle(DesignTokens.Palette.accent)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text(poi.name)
                    .font(DesignTokens.Typography.body(17))
                    .foregroundStyle(DesignTokens.Palette.textPrimary)
                Text(poi.category.displayName)
                    .font(DesignTokens.Typography.caption(12))
                    .foregroundStyle(DesignTokens.Palette.textTertiary)
            }

            Spacer(minLength: 0)

            Button {
                onReplay(poi)
            } label: {
                Image(systemName: "play.circle.fill")
                    .font(.system(size: 30))
                    .foregroundStyle(DesignTokens.Palette.accent)
                    .frame(width: DesignTokens.Size.minTapTarget, height: DesignTokens.Size.minTapTarget)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Replay \(poi.name)")
        }
        .padding(DesignTokens.Spacing.lg)
    }

    // MARK: - Share

    private var shareButton: some View {
        ShareLink(item: shareSummary) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "square.and.arrow.up")
                Text("Share Trip")
            }
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
        .padding(.top, DesignTokens.Spacing.sm)
    }

    // MARK: - Derived

    private var durationText: String {
        (trip.duration ?? trip.expectedTravelTime).driveTimeString
    }

    /// Builds a human-readable text summary for sharing.
    private var shareSummary: String {
        var lines: [String] = []
        lines.append("My Nearhere trip: \(trip.origin.name) → \(trip.destination.name)")
        lines.append("\(trip.distanceMiles.asMilesString) · \(durationText) · \(trip.pois.count) stories")
        if !trip.pois.isEmpty {
            lines.append("")
            lines.append("Stories along the way:")
            for poi in trip.pois {
                lines.append("• \(poi.name) (\(poi.category.displayName))")
            }
        }
        return lines.joined(separator: "\n")
    }
}

// MARK: - Preview

#Preview("Trip Summary") {
    let sf = CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194)
    let tahoe = CLLocationCoordinate2D(latitude: 39.0968, longitude: -120.0324)

    let pois = [
        POI(name: "Donner Pass", coordinate: CLLocationCoordinate2D(latitude: 39.32, longitude: -120.33), category: .history, era: .eighteenHundreds),
        POI(name: "Sierra Nevada Batholith", coordinate: CLLocationCoordinate2D(latitude: 39.1, longitude: -120.2), category: .geology, era: .prehistoric),
        POI(name: "Emigrant Trail", coordinate: CLLocationCoordinate2D(latitude: 39.2, longitude: -120.4), category: .culture, era: .eighteenHundreds)
    ]

    let trip = Trip(
        origin: Waypoint(name: "San Francisco, CA", coordinate: sf),
        destination: Waypoint(name: "Lake Tahoe, CA", coordinate: tahoe),
        distanceMeters: 189 * Constants.Distance.metersPerMile,
        expectedTravelTime: 3 * 3600 + 20 * 60,
        pois: pois
    )

    return TripSummaryView(trip: trip)
        .preferredColorScheme(.dark)
}
