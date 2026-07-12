import SwiftUI

/// User preferences: which categories to hear, alert density, and playback options.
/// Writes through `AppState.updatePreferences` so changes persist immediately.
struct SettingsView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                categoriesSection
                densitySection
                playbackSection
            }
            .scrollContentBackground(.hidden)
            .background(DesignTokens.Palette.background.ignoresSafeArea())
            .tint(DesignTokens.Palette.accent)
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(DesignTokens.Palette.accent)
                        .fontWeight(.semibold)
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    // MARK: - Categories

    private var categoriesSection: some View {
        Section {
            ForEach(POICategory.allCases) { category in
                Toggle(isOn: binding(for: category)) {
                    Label {
                        Text(category.displayName)
                            .font(DesignTokens.Typography.body(17))
                            .foregroundStyle(DesignTokens.Palette.textPrimary)
                    } icon: {
                        Image(systemName: category.symbolName)
                            .foregroundStyle(DesignTokens.Palette.accent)
                    }
                }
            }
        } header: {
            Text("Topics")
                .foregroundStyle(DesignTokens.Palette.textSecondary)
        } footer: {
            Text("Choose what you'd like to hear about along the way.")
                .foregroundStyle(DesignTokens.Palette.textTertiary)
        }
        .listRowBackground(DesignTokens.Palette.surface)
    }

    // MARK: - Density

    private var densitySection: some View {
        Section {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                HStack {
                    Text("Alert Density")
                        .font(DesignTokens.Typography.body(17))
                        .foregroundStyle(DesignTokens.Palette.textPrimary)
                    Spacer()
                    Text(densityLabel)
                        .font(DesignTokens.Typography.caption(13))
                        .foregroundStyle(DesignTokens.Palette.textSecondary)
                }
                Slider(value: densityBinding, in: 0...1) {
                    Text("Alert Density")
                } minimumValueLabel: {
                    Image(systemName: "tortoise.fill")
                        .foregroundStyle(DesignTokens.Palette.textTertiary)
                } maximumValueLabel: {
                    Image(systemName: "hare.fill")
                        .foregroundStyle(DesignTokens.Palette.textTertiary)
                }
            }
        } header: {
            Text("Frequency")
                .foregroundStyle(DesignTokens.Palette.textSecondary)
        }
        .listRowBackground(DesignTokens.Palette.surface)
    }

    // MARK: - Playback

    private var playbackSection: some View {
        Section {
            toggleRow("Concise by default", systemImage: "text.alignleft", isOn: conciseBinding)
            toggleRow("Duck other audio", systemImage: "speaker.wave.1.fill", isOn: duckBinding)
            toggleRow("Play chime before stories", systemImage: "bell.fill", isOn: chimeBinding)
        } header: {
            Text("Playback")
                .foregroundStyle(DesignTokens.Palette.textSecondary)
        }
        .listRowBackground(DesignTokens.Palette.surface)
    }

    private func toggleRow(_ title: String, systemImage: String, isOn: Binding<Bool>) -> some View {
        Toggle(isOn: isOn) {
            Label {
                Text(title)
                    .font(DesignTokens.Typography.body(17))
                    .foregroundStyle(DesignTokens.Palette.textPrimary)
            } icon: {
                Image(systemName: systemImage)
                    .foregroundStyle(DesignTokens.Palette.accent)
            }
        }
    }

    // MARK: - Bindings

    private func binding(for category: POICategory) -> Binding<Bool> {
        Binding(
            get: { appState.preferences.allows(category) },
            set: { isOn in
                appState.updatePreferences { prefs in
                    // An empty set historically meant "all"; materialize it before editing.
                    if prefs.enabledCategories.isEmpty {
                        prefs.enabledCategories = Set(POICategory.allCases)
                    }
                    if isOn {
                        prefs.enabledCategories.insert(category)
                    } else {
                        prefs.enabledCategories.remove(category)
                    }
                }
            }
        )
    }

    private var densityBinding: Binding<Double> {
        Binding(
            get: { appState.preferences.alertDensity },
            set: { value in appState.updatePreferences { $0.alertDensity = value } }
        )
    }

    private var conciseBinding: Binding<Bool> {
        Binding(
            get: { appState.preferences.conciseByDefault },
            set: { value in appState.updatePreferences { $0.conciseByDefault = value } }
        )
    }

    private var duckBinding: Binding<Bool> {
        Binding(
            get: { appState.preferences.duckOtherAudio },
            set: { value in appState.updatePreferences { $0.duckOtherAudio = value } }
        )
    }

    private var chimeBinding: Binding<Bool> {
        Binding(
            get: { appState.preferences.playChime },
            set: { value in appState.updatePreferences { $0.playChime = value } }
        )
    }

    private var densityLabel: String {
        switch appState.preferences.alertDensity {
        case ..<0.34: return "Sparse"
        case ..<0.67: return "Balanced"
        default:      return "Chatty"
        }
    }
}

// MARK: - Preview

#Preview("Settings") {
    SettingsView()
        .environmentObject(AppState())
        .preferredColorScheme(.dark)
}
