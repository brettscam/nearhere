import SwiftUI
import CoreLocation

/// The floating alert card shown when a nearby POI is surfaced. Slides up from
/// the bottom, shows category / name / distance, an ember audio bar, and a large
/// "Tell me more" CTA. Swipe down to dismiss.
///
/// Styled to Design System v1.0: mono eyebrow in the category tint, a glanceable
/// Hanken headline, Space Mono metadata, ember progress, amber CTA.
struct POICardView: View {

    let poi: POI

    /// Narration playback progress, 0...1. Drives the audio bar.
    var progress: Double = 0

    /// Optional user location; when present, distance/direction are computed live.
    var userLocation: CLLocation? = nil

    /// Travel heading (deg clockwise from north) used for the direction phrase.
    var heading: CLLocationDirection = 0

    /// Whether this story is bookmarked (renders the gold "claimed" flag).
    var isBookmarked: Bool = false

    var onTellMeMore: () -> Void = {}
    var onDismiss: () -> Void = {}
    var onBookmark: () -> Void = {}

    /// Internal expansion state; expands the card once "Tell me more" is tapped.
    @State private var isExpanded: Bool = false

    /// Live drag offset for the swipe-to-dismiss gesture.
    @State private var dragOffset: CGFloat = 0

    @ScaledMetric(relativeTo: .title) private var iconChip: CGFloat = 34

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
                    .font(DesignTokens.Typography.serifBody(18))
                    .italic()
                    .foregroundStyle(DesignTokens.Palette.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }

            tellMeMoreButton
        }
        .padding(DesignTokens.Spacing.cardPadding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .overlay(alignment: .topTrailing) { bookmarkButton }
        .cardStyle(fill: DesignTokens.Palette.surface)
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
            .fill(DesignTokens.Palette.textTertiary.opacity(0.5))
            .frame(width: 40, height: 5)
            .frame(maxWidth: .infinity)
            .accessibilityHidden(true)
    }

    private var categoryRow: some View {
        HStack(spacing: DesignTokens.Spacing.rowGap) {
            // Washed icon chip in the category tint.
            RoundedRectangle(cornerRadius: 11, style: .continuous)
                .fill(poi.category.washColor)
                .frame(width: iconChip, height: iconChip)
                .overlay(
                    Image(systemName: poi.category.symbolName)
                        .font(.system(size: iconChip * 0.55, weight: .regular))
                        .foregroundStyle(poi.category.tintColor)
                )
                .accessibilityHidden(true)

            Text(poi.category.displayName)
                .font(DesignTokens.Typography.eyebrow)
                .tracking(2.0)
                .textCase(.uppercase)
                .foregroundStyle(poi.category.tintColor)

            Spacer(minLength: 0)

            Text(poi.era.displayName)
                .font(DesignTokens.Typography.monoMeta(12))
                .foregroundStyle(DesignTokens.Palette.textTertiary)
        }
    }

    private var nameAndDistance: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(poi.name)
                .font(DesignTokens.Typography.cardHeadline)
                .foregroundStyle(DesignTokens.Palette.textPrimary)
                .fixedSize(horizontal: false, vertical: true)

            Text(distanceDirectionText)
                .font(DesignTokens.Typography.monoMeta(14))
                .tracking(0.4)
                .foregroundStyle(DesignTokens.Palette.textSecondary)
        }
    }

    private var progressBar: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(DesignTokens.Palette.hairline)
                Capsule()
                    .fill(DesignTokens.Palette.active) // ember — live audio
                    .frame(width: geo.size.width * clampedProgress)
            }
        }
        .frame(height: 5)
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
                Text(isExpanded ? "Playing…" : "Tell me more")
            }
            .font(.custom(DesignTokens.Typography.sans, size: 17, relativeTo: .headline).weight(.bold))
            .foregroundStyle(DesignTokens.Palette.onAccent)
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

    private var bookmarkButton: some View {
        Button(action: onBookmark) {
            Image(systemName: isBookmarked ? "bookmark.fill" : "bookmark")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(isBookmarked ? DesignTokens.Palette.highlight : DesignTokens.Palette.textTertiary)
                .frame(width: DesignTokens.Size.minTapTarget, height: DesignTokens.Size.minTapTarget)
        }
        .buttonStyle(.plain)
        .padding(.trailing, DesignTokens.Spacing.sm)
        .padding(.top, DesignTokens.Spacing.sm)
        .accessibilityLabel(isBookmarked ? "Remove bookmark" : "Bookmark this story")
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
            return "\(dist) · \(dir)".uppercased()
        }
        return "1.2 MI AHEAD"
    }
}

// MARK: - Preview

#Preview("POI Card") {
    let poi = POI(
        name: "Mono Lake Tufa",
        coordinate: CLLocationCoordinate2D(latitude: 38.0169, longitude: -119.0269),
        category: .geology,
        era: .prehistoric,
        narration: NarrationContent(
            title: "Mono Lake Tufa",
            category: .geology,
            era: .prehistoric,
            narration: "These calcium-carbonate spires grew underwater over centuries.",
            followUpHook: "Want to hear how a thirsty city three hundred miles south drained the lake?",
            type: .alert
        )
    )

    return ZStack {
        DesignTokens.Palette.background.ignoresSafeArea()
        VStack {
            Spacer()
            POICardView(poi: poi, progress: 0.42, isBookmarked: true)
        }
    }
    .preferredColorScheme(.dark)
}
