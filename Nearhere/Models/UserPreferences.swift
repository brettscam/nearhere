import Foundation

/// User-tunable settings, persisted to `UserDefaults` via `@AppStorage`-friendly keys.
/// Kept Codable so the whole blob can be round-tripped if we later sync it.
struct UserPreferences: Codable, Equatable {
    /// Categories the user wants to hear about. Empty == all.
    var enabledCategories: Set<POICategory>
    /// 0.0 (sparse) … 1.0 (chatty). Scales throttle windows in `ProximityEngine`.
    var alertDensity: Double
    /// Prefer shorter alerts over deep dives by default.
    var conciseByDefault: Bool
    /// Duck other audio (music/podcasts) during narration.
    var duckOtherAudio: Bool
    /// Play a chime before each narration.
    var playChime: Bool
    /// Preferred TTS voice identifier (AVSpeechSynthesisVoice). Nil == system default.
    var preferredVoiceIdentifier: String?

    static let `default` = UserPreferences(
        enabledCategories: Set(POICategory.allCases),
        alertDensity: 0.5,
        conciseByDefault: true,
        duckOtherAudio: true,
        playChime: true,
        preferredVoiceIdentifier: nil
    )

    /// True when the given category should produce alerts.
    func allows(_ category: POICategory) -> Bool {
        enabledCategories.isEmpty || enabledCategories.contains(category)
    }
}

extension UserPreferences {
    private static let storageKey = "nearhere.userPreferences"

    static func load(from defaults: UserDefaults = .standard) -> UserPreferences {
        guard let data = defaults.data(forKey: storageKey),
              let decoded = try? JSONDecoder().decode(UserPreferences.self, from: data)
        else { return .default }
        return decoded
    }

    func save(to defaults: UserDefaults = .standard) {
        guard let data = try? JSONEncoder().encode(self) else { return }
        defaults.set(data, forKey: Self.storageKey)
    }
}
