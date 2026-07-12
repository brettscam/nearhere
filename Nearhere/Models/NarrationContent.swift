import Foundation

/// The output of `NarrationService` — parsed directly from the Claude API JSON
/// response. Codable so it can be cached to disk / Core Data.
struct NarrationContent: Codable, Hashable, Identifiable {
    var id: UUID
    let title: String
    let category: POICategory
    let era: POIEra
    /// The spoken text handed to `TTSService`.
    let narration: String
    /// Optional conversational hook to invite a "tell me more".
    let followUpHook: String?
    /// Length of the narration, so callers can distinguish alert vs deep dive.
    let type: NarrationType
    /// When this narration was generated (for cache staleness policies).
    let generatedAt: Date

    init(
        id: UUID = UUID(),
        title: String,
        category: POICategory,
        era: POIEra,
        narration: String,
        followUpHook: String? = nil,
        type: NarrationType = .alert,
        generatedAt: Date = Date()
    ) {
        self.id = id
        self.title = title
        self.category = category
        self.era = era
        self.narration = narration
        self.followUpHook = followUpHook
        self.type = type
        self.generatedAt = generatedAt
    }
}

/// Two narration depths, matching the Claude system-prompt contract.
enum NarrationType: String, Codable, Hashable {
    /// 2–3 sentences, ~20–40s spoken.
    case alert
    /// 4–8 sentences, ~2–3 min spoken.
    case deepDive = "deep_dive"
}

extension NarrationContent {
    /// Shape returned by the Claude API. Kept separate from the domain model so
    /// the wire format can drift without touching call sites.
    struct APIResponse: Codable {
        let title: String
        let category: String
        let era: String
        let narration: String
        let followUpHook: String?

        enum CodingKeys: String, CodingKey {
            case title, category, era, narration
            case followUpHook = "followUpHook"
        }

        /// Maps the raw response into a domain `NarrationContent`, tolerating
        /// unexpected category/era strings by falling back to sane defaults.
        func toContent(type: NarrationType) -> NarrationContent {
            NarrationContent(
                title: title,
                category: POICategory(rawValue: category) ?? .history,
                era: POIEra(rawValue: era) ?? .modern,
                narration: narration,
                followUpHook: followUpHook,
                type: type
            )
        }
    }
}
