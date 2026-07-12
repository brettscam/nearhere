import Foundation
import CoreLocation

/// Generates place narrations via the Claude Messages API.
///
/// ## Graceful degradation
/// The pipeline is designed to fail quietly when the network is unavailable so
/// the driver is never interrupted by an error:
///
///   1. **Cache first** — every request checks `NarrationCaching` for a matching
///      narration (same coordinate tile + same `NarrationType`) and returns it
///      immediately if present. Repeat visits and pre-generated trip content are
///      served with zero network use.
///   2. **No key / no service → skip silently** — if there is no API key, or a
///      `URLError` indicates the device is offline, this throws
///      `NarrationError.offline`. Callers are expected to treat `.offline` as a
///      no-op (skip this narration) rather than surfacing an error to the user.
///   3. **Online** — otherwise the Claude API is called, the JSON payload parsed
///      into a `NarrationContent`, stored in the cache, and returned.
final class NarrationService: NarrationGenerating {

    private let cache: NarrationCaching
    private let session: URLSession

    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    /// - Parameters:
    ///   - cache: narration cache (default `CacheService()`).
    ///   - session: URL session (default `.shared`); injectable for tests.
    init(cache: NarrationCaching = CacheService(), session: URLSession = .shared) {
        self.cache = cache
        self.session = session
    }

    // MARK: - NarrationGenerating

    func narration(
        for coordinate: CLLocationCoordinate2D,
        speedMph: Double,
        context: GeoContext,
        features: [GeoFeature],
        type: NarrationType
    ) async throws -> NarrationContent {

        // 1. Cache hit (must match requested depth).
        let key = cache.cacheKey(for: coordinate)
        if let cached = cache.cachedNarration(forKey: key), cached.type == type {
            return cached
        }

        // 2. No key → treat as offline so the caller can skip silently.
        guard ApiConfig.hasAnthropicKey else {
            throw NarrationError.offline
        }

        // 3. Call the Claude Messages API.
        let systemPrompt = Self.buildSystemPrompt(
            coordinate: coordinate,
            speedMph: speedMph,
            context: context,
            features: features,
            type: type
        )

        let content = try await requestNarration(systemPrompt: systemPrompt, type: type)
        cache.store(content, forKey: key)
        return content
    }

    // MARK: - Networking

    private func requestNarration(
        systemPrompt: String,
        type: NarrationType
    ) async throws -> NarrationContent {

        guard let url = URL(string: Constants.API.anthropicBaseURL) else {
            throw NarrationError.decoding
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(ApiConfig.anthropicAPIKey, forHTTPHeaderField: "x-api-key")
        request.setValue(Constants.API.anthropicVersion, forHTTPHeaderField: "anthropic-version")
        request.setValue("application/json", forHTTPHeaderField: "content-type")

        let body = MessagesRequest(
            model: Constants.API.narrationModel,
            maxTokens: Constants.API.maxTokens,
            system: systemPrompt,
            messages: [.init(role: "user", content: "Generate the narration now.")]
        )
        request.httpBody = try encoder.encode(body)

        let data: Data
        do {
            let (responseData, _) = try await session.data(for: request)
            data = responseData
        } catch is CancellationError {
            throw CancellationError()
        } catch is URLError {
            // No network / timeout / cannot-connect → offline path.
            throw NarrationError.offline
        }

        // Parse the Anthropic envelope, extract the assistant's text block.
        guard let envelope = try? decoder.decode(AnthropicResponse.self, from: data),
              let text = envelope.content.first(where: { $0.type == "text" })?.text
                ?? envelope.content.first?.text,
              !text.isEmpty
        else {
            throw NarrationError.emptyResponse
        }

        // The text block holds a JSON object (sometimes fenced in ```json).
        let json = Self.stripCodeFences(from: text)
        guard let jsonData = json.data(using: .utf8),
              let apiResponse = try? decoder.decode(
                NarrationContent.APIResponse.self, from: jsonData)
        else {
            throw NarrationError.decoding
        }

        return apiResponse.toContent(type: type)
    }

    // MARK: - Prompt construction

    /// Builds the system prompt from the fixed narration contract. `lat`, `lon`,
    /// nearest features, region, speed, and the requested depth are interpolated.
    static func buildSystemPrompt(
        coordinate: CLLocationCoordinate2D,
        speedMph: Double,
        context: GeoContext,
        features: [GeoFeature],
        type: NarrationType
    ) -> String {
        let lat = String(format: "%.5f", coordinate.latitude)
        let lon = String(format: "%.5f", coordinate.longitude)
        let featuresSummary = featuresString(from: features)
        let region = context.summary.isEmpty ? "Unknown" : context.summary
        let speed = String(format: "%.0f", speedMph)
        let narrationType = type.rawValue // "alert" or "deep_dive"

        return """
        You are a knowledgeable, curious tour guide narrating for travelers driving through this area. Your tone is conversational, warm, and engaging — like a well-traveled friend, not a textbook.

        Location: \(lat), \(lon)
        Nearest known features: \(featuresSummary)
        Region: \(region)
        User speed: \(speed) mph (they are driving, keep it concise)

        Generate a \(narrationType) about this location:
        - "alert": 2-3 sentences, 20-40 seconds spoken. What is this place, why does it matter, one vivid detail.
        - "deep_dive": 4-8 sentences, 2-3 minutes spoken. Expanded history, context, notable people, geological or cultural significance. End with a natural conversational hook.

        Respond with JSON:
        {"title":"short POI name","category":"geology|history|indigenous|ecology|architecture|folklore|industry|military|culture|astronomy","era":"prehistoric|preColonial|colonial|1800s|1900s|modern","narration":"the spoken text","followUpHook":"optional question to prompt user curiosity"}
        """
    }

    /// Top ~5 features by significance, formatted as "Name (featureType)" joined
    /// by "; ". Unnamed features are labelled generically.
    static func featuresString(from features: [GeoFeature]) -> String {
        let top = features
            .sorted { $0.significanceScore > $1.significanceScore }
            .prefix(5)
            .map { "\($0.name ?? "Unnamed \($0.featureType.rawValue)") (\($0.featureType.rawValue))" }
        return top.isEmpty ? "None nearby" : top.joined(separator: "; ")
    }

    /// Removes leading/trailing markdown code fences (``` or ```json) so the raw
    /// JSON object can be decoded.
    static func stripCodeFences(from text: String) -> String {
        var trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.hasPrefix("```") else { return trimmed }

        // Drop the opening fence line (``` or ```json).
        if let firstNewline = trimmed.firstIndex(of: "\n") {
            trimmed = String(trimmed[trimmed.index(after: firstNewline)...])
        } else {
            trimmed = String(trimmed.dropFirst(3))
        }
        // Drop a trailing fence.
        if trimmed.hasSuffix("```") {
            trimmed = String(trimmed.dropLast(3))
        }
        return trimmed.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

// MARK: - Errors

/// Errors surfaced by `NarrationService`. `.offline` is the graceful-degradation
/// signal — callers should skip narration rather than alert the user.
enum NarrationError: Error {
    case offline
    case emptyResponse
    case decoding
}

// MARK: - Wire types

private extension NarrationService {

    /// Request body for `POST /v1/messages`.
    struct MessagesRequest: Encodable {
        let model: String
        let maxTokens: Int
        let system: String
        let messages: [Message]

        enum CodingKeys: String, CodingKey {
            case model
            case maxTokens = "max_tokens"
            case system
            case messages
        }

        struct Message: Encodable {
            let role: String
            let content: String
        }
    }

    /// Minimal decode of the Messages API response. The first `text` content
    /// block holds the JSON string we asked the model to produce.
    struct AnthropicResponse: Decodable {
        let content: [ContentBlock]

        struct ContentBlock: Decodable {
            let type: String
            let text: String?
        }
    }
}
