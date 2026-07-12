import Foundation

/// Reads secrets without ever committing them.
///
/// Resolution order (first hit wins):
///   1. Environment variable (useful for CI / `xcodebuild` invocations)
///   2. `Secrets.plist` bundled in the app (git-ignored — see `Secrets.example.plist`)
///
/// Copy `Secrets.example.plist` to `Secrets.plist`, drop in your key, and add it
/// to the Nearhere target in Xcode. `Secrets.plist` is listed in `.gitignore`.
struct ApiConfig {

    enum Key: String {
        case anthropicAPIKey = "ANTHROPIC_API_KEY"
    }

    /// The Anthropic API key used by `NarrationService`. Empty string if unset —
    /// callers should treat an empty key as "offline / cache-only".
    static var anthropicAPIKey: String {
        value(for: .anthropicAPIKey) ?? ""
    }

    static var hasAnthropicKey: Bool { !anthropicAPIKey.isEmpty }

    // MARK: - Resolution

    private static func value(for key: Key) -> String? {
        if let env = ProcessInfo.processInfo.environment[key.rawValue],
           !env.isEmpty {
            return env
        }
        if let fromPlist = secrets[key.rawValue] as? String,
           !fromPlist.isEmpty {
            return fromPlist
        }
        return nil
    }

    private static let secrets: [String: Any] = {
        guard let url = Bundle.main.url(forResource: "Secrets", withExtension: "plist"),
              let data = try? Data(contentsOf: url),
              let plist = try? PropertyListSerialization.propertyList(
                from: data, options: [], format: nil) as? [String: Any]
        else { return [:] }
        return plist
    }()
}
