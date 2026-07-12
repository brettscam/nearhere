import SwiftUI
import CoreLocation

/// The floating alert card shown when a nearby POI is surfaced. Slides up from
/// the bottom, shows category / name / distance, an audio progress bar, and a
/// large "Tell Me More" CTA. Swipe down to dismiss.
///
/// Placeholder/scaffold styling using `DesignTokens`; refine once comps land.
struct POICardView: View {

    let poi: POI

    /// Narration playback progress, 0...1. Drives the audio bar.
    var progress: Double = 0

    /// Optional user location; when present, distance/direction are computed live.
    var userLocation: CLLocation? = nil

    /// Travel heading (deg clockwise from north) used for the direction phrase.
    var heading: CLLocationDirection = 0

    var onTellMeMore: () -> Void = {}
    var onDismiss: () -> Void = {}

    /// Internal expansion state; expands the card once "Tell Me More" is tapped.
    @State private var isExpanded: Bool = false

    /// Live drag offset for the swipe-to-dismiss gesture.
    @State private var dragOffset: CGFloat = 0

    @ScaledMetric(relativeTo: .largeTitle) private var iconSize: CGFloat = 22

    /// Distance the card must be dragged down before it dismisses.
    private let dismissThreshold: CGFloat = 90

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            grabber
            categoryRow
            nameAndDistance
            progressBar

            if isExpanded, let hook = poi.narration?.followUpHook, !hook.isEmpty {
                Text(hook)
                    .font(DesignTokens.Typography.body(15))
                    .foregroundStyle(DesignTokens.Palette.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }

            tellMeMoreButton
        }
        .padding(DesignTokens.Spacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle(fill: DesignTokens.Palette.surfaceRaised)
        .padding(.horizontal, DesignTokens.Spacing.md)
        .offset(y: max(dragOffset, 0))
        .gesture(dismissDrag)
        .animation(.spring(response: 0.4, dampingFraction: 0.85), value: isExpanded)
        .accessibilityElement(children: .contain)
        .accessibilityAddTraits(.isModal)
    }

    // MARK: - Subviews

    private var grabber: some View {
        Capsule()
            .fill(DesignTokens.Palette.textTertiary.opacity(0.6))
            .frame(width: 40, height: 5)
            .frame(maxWidth: .infinity)
            .accessibilityHidden(true)
    }

    private var categoryRow: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: poi.category.symbolName)
                .font(.system(size: iconSize, weight: .semibold))
                .foregroundStyle(DesignTokens.Palette.accent)
                .accessibilityHidden(true)

            Text(poi.category.displayName.uppercased())
                .font(DesignTokens.Typography.caption(13))
                .tracking(1.2)
                .foregroundStyle(DesignTokens.Palette.accent)

            Spacer(minLength: 0)

            Text(poi.era.displayName)
                .font(DesignTokens.Typography.caption(12))
                .foregroundStyle(DesignTokens.Palette.textTertiary)
        }
    }

    private var nameAndDistance: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            Text(poi.name)
                .font(DesignTokens.Typography.title(26))
                .foregroundStyle(DesignTokens.Palette.textPrimary)
                .fixedSize(horizontal: false, vertical: true)

            Text(distanceDirectionText)
                .font(DesignTokens.Typography.body(16))
                .foregroundStyle(DesignTokens.Palette.textSecondary)
        }
    }

    private var progressBar: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(DesignTokens.Palette.hairline)
                Capsule()
                    .fill(DesignTokens.Palette.accent)
                    .frame(width: geo.size.width * clampedProgress)
            }
        }
        .frame(height: 6)
        .animation(.linear(duration: 0.2), value: clampedProgress)
        .accessibilityLabel("Narration progress")
        .accessibilityValue("\(Int(clampedProgress * 100)) percent")
    }

    private var tellMeMoreButton: some View {
        Button {
            withAnimation(.spring(response: 0.4, dampingFraction: 0.85)) {
                isExpanded = true
            }
            onTellMeMore()
        } label: {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: isExpanded ? "waveform" : "text.bubble.fill")
                    .symbolEffect(.variableColor, isActive: isExpanded)
                Text(isExpanded ? "Playing…" : "Tell Me More")
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
        .disabled(isExpanded)
        .opacity(isExpanded ? 0.85 : 1)
        .accessibilityHint(isExpanded ? "Narration playing" : "Plays a longer story about this place")
    }

    // MARK: - Gestures

    private var dismissDrag: some Gesture {
        DragGesture(minimumDistance: 10)
            .onChanged { value in
                dragOffset = value.translation.height
            }
            .onEnded { value in
                if value.translation.height > dismissThreshold {
                    onDismiss()
                }
                withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
                    dragOffset = 0
                }
            }
    }

    // MARK: - Derived values

    private var clampedProgress: Double { min(max(progress, 0), 1) }

    private var distanceDirectionText: String {
        if let location = userLocation {
            let dist = poi.distance(from: location).milesString
            let dir = poi.direction(from: location, heading: heading)
            return "\(dist) · \(dir)"
        }
        // Placeholder when we don't yet have a fix.
        return "1.2 mi ahead"
    }
}

// MARK: - Preview

#Preview("POI Card") {
    let poi = POI(
        name: "Devil's Tower",
        coordinate: CLLocationCoordinate2D(latitude: 44.5902, longitude: -104.7146),
        category: .geology,
        era: .prehistoric,
        narration: NarrationContent(
            title: "Devil's Tower",
            category: .geology,
            era: .prehistoric,
            narration: "Rising 867 feet above the plains, this igneous monolith formed underground some 50 million years ago.",
            followUpHook: "Want to hear how the Lakota people tell its origin?",
            type: .alert
        )
    )

    return ZStack {
        DesignTokens.Palette.background.ignoresSafeArea()
        VStack {
            Spacer()
            POICardView(
                poi: poi,
                progress: 0.4,
                onTellMeMore: {},
                onDismiss: {}
            )
        }
    }
    .preferredColorScheme(.dark)
}
