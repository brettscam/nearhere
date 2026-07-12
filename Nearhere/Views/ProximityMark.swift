import SwiftUI

/// The living Nearhere mark — concentric proximity rings that *breathe* to tell
/// you what the app is doing. This is the app's loading vocabulary; it replaces
/// spinners everywhere. Motion is calm and never linear.
///
/// Three states, per Design System (Icon & Motion §B):
/// - `.listening`  — idle/scanning. Slow 3s breath. Amber + gold.
/// - `.narrating`  — audio playing. Ember rings emit outward, staggered ×3.
/// - `.digging`    — loading a deep dive. Rings draw inward while the outer ring turns.
struct ProximityMark: View {
    enum State {
        case listening
        case narrating
        case digging
    }

    var state: State = .listening
    var size: CGFloat = 150

    var body: some View {
        ZStack {
            switch state {
            case .listening: listening
            case .narrating: narrating
            case .digging:   digging
            }
        }
        .frame(width: size, height: size)
        .accessibilityHidden(true)
    }

    // MARK: - Listening (3s ease-in-out breathe, staggered)

    private var listening: some View {
        TimelineView(.animation) { context in
            let t = context.date.timeIntervalSinceReferenceDate
            ZStack {
                breatheRing(radiusFraction: 0.62, phase: t, delay: 0.9,
                            color: DesignTokens.Brand.prospectGold, lineWidth: 2)
                breatheRing(radiusFraction: 0.42, phase: t, delay: 0.45,
                            color: DesignTokens.Brand.trailheadAmber, lineWidth: 2.2)
                breatheRing(radiusFraction: 0.24, phase: t, delay: 0,
                            color: DesignTokens.Brand.trailheadAmber, lineWidth: 2.4)
                coreDot(fraction: 0.10, phase: t, soft: true)
            }
        }
    }

    private func breatheRing(radiusFraction: CGFloat, phase: Double, delay: Double,
                             color: Color, lineWidth: CGFloat) -> some View {
        // sin-driven scale .86…1.06, opacity .45….95 over a 3s period.
        let period = 3.0
        let s = sin((phase - delay) / period * 2 * .pi)
        let scale = 0.86 + (s + 1) / 2 * 0.20
        let opacity = 0.45 + (s + 1) / 2 * 0.50
        return Circle()
            .stroke(color, lineWidth: lineWidth)
            .frame(width: size * radiusFraction * 2, height: size * radiusFraction * 2)
            .scaleEffect(scale)
            .opacity(opacity)
    }

    // MARK: - Narrating (2.1s ease-out emit, staggered ×3)

    private var narrating: some View {
        TimelineView(.animation) { context in
            let t = context.date.timeIntervalSinceReferenceDate
            ZStack {
                emitRing(phase: t, delay: 0)
                emitRing(phase: t, delay: 0.7)
                emitRing(phase: t, delay: 1.4)
                coreDot(fraction: 0.12, phase: t, soft: false, color: DesignTokens.Brand.ember)
            }
        }
    }

    private func emitRing(phase: Double, delay: Double) -> some View {
        let period = 2.1
        var p = ((phase - delay).truncatingRemainder(dividingBy: period)) / period
        if p < 0 { p += 1 }
        // ease-out expansion .3→1.75, opacity spikes early then fades.
        let eased = 1 - pow(1 - p, 2)
        let scale = 0.3 + eased * 1.45
        let opacity = p < 0.14 ? (p / 0.14) * 0.95 : max(0, 0.95 * (1 - (p - 0.14) / 0.86))
        return Circle()
            .stroke(DesignTokens.Brand.ember, lineWidth: 2.4)
            .frame(width: size * 0.24 * 2, height: size * 0.24 * 2)
            .scaleEffect(scale)
            .opacity(opacity)
    }

    // MARK: - Digging deeper (inward draw + outer ring turn)

    private var digging: some View {
        TimelineView(.animation) { context in
            let t = context.date.timeIntervalSinceReferenceDate
            ZStack {
                // Outer dashed ring, spinning 3.4s linear.
                Circle()
                    .stroke(DesignTokens.Palette.textTertiary,
                            style: StrokeStyle(lineWidth: 2, lineCap: .round, dash: [10, 14]))
                    .frame(width: size * 0.66 * 2, height: size * 0.66 * 2)
                    .rotationEffect(.degrees((t / 3.4).truncatingRemainder(dividingBy: 1) * 360))
                inwardRing(phase: t, delay: 0, color: DesignTokens.Brand.prospectGold)
                inwardRing(phase: t, delay: 1.2, color: DesignTokens.Brand.trailheadAmber)
                coreDot(fraction: 0.11, phase: t, soft: true)
            }
        }
    }

    private func inwardRing(phase: Double, delay: Double, color: Color) -> some View {
        let period = 2.4
        var p = ((phase - delay).truncatingRemainder(dividingBy: period)) / period
        if p < 0 { p += 1 }
        // ease-in contraction 1.75→.28, opacity peaks ~22% then fades.
        let eased = pow(p, 2)
        let scale = 1.75 - eased * 1.47
        let opacity = p < 0.22 ? (p / 0.22) * 0.9 : max(0, 0.9 * (1 - (p - 0.22) / 0.78))
        return Circle()
            .stroke(color, lineWidth: 2.3)
            .frame(width: size * 0.57 * 2, height: size * 0.57 * 2)
            .scaleEffect(scale)
            .opacity(opacity)
    }

    // MARK: - Core dot

    private func coreDot(fraction: CGFloat, phase: Double, soft: Bool,
                         color: Color = DesignTokens.Brand.trailheadAmber) -> some View {
        let period = soft ? 3.0 : 0.9
        let s = sin(phase / period * 2 * .pi)
        let scale = soft ? (0.94 + (s + 1) / 2 * 0.18) : (1.0 + (s + 1) / 2 * 0.28)
        let opacity = soft ? (0.85 + (s + 1) / 2 * 0.15) : 1.0
        return Circle()
            .fill(color)
            .frame(width: size * fraction * 2, height: size * fraction * 2)
            .scaleEffect(scale)
            .opacity(opacity)
    }
}

// MARK: - Preview

#Preview("Proximity Mark") {
    HStack(spacing: 24) {
        ProximityMark(state: .listening)
        ProximityMark(state: .narrating)
        ProximityMark(state: .digging)
    }
    .padding(40)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(DesignTokens.Palette.background)
    .preferredColorScheme(.dark)
}
