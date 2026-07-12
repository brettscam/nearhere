import Foundation
import CoreLocation

/// Disk- and memory-backed cache for generated narrations.
///
/// Narrations are keyed by a coordinate rounded to ~100m (see `cacheKey(for:)`)
/// so a re-visit or a slightly different GPS fix reuses the same content instead
/// of hitting the Claude API again. This is a core part of the app's graceful
/// degradation story: with no cell service, `NarrationService` falls back to
/// whatever this cache holds.
///
/// - Note: This intentionally hides its storage behind `NarrationCaching`. The
///   JSON-file backing here can later be swapped for Core Data (or SQLite)
///   without touching any call site — the protocol keeps the boundary stable.
final class CacheService: NarrationCaching {

    /// In-memory hot cache for zero-latency repeat lookups.
    private let memory = NSCache<NSString, CacheBox>()

    /// Serial queue guarding all disk I/O so concurrent `store`/`cachedNarration`
    /// calls from different tasks stay thread-safe.
    private let queue = DispatchQueue(label: "com.nearhere.cacheservice")

    private let fileManager: FileManager
    private let cacheDirectory: URL

    private let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .iso8601
        return e
    }()

    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return d
    }()

    /// - Parameter fileManager: injectable for tests; defaults to `.default`.
    init(fileManager: FileManager = .default) {
        self.fileManager = fileManager
        let base = (try? fileManager.url(
            for: .applicationSupportDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true
        )) ?? fileManager.temporaryDirectory
        self.cacheDirectory = base.appendingPathComponent("NarrationCache", isDirectory: true)
        createDirectoryIfNeeded()
    }

    // MARK: - NarrationCaching

    /// Canonical cache key for a coordinate, rounded to
    /// `Constants.Geo.narrationCachePrecision` decimal places (~100m grid).
    func cacheKey(for coordinate: CLLocationCoordinate2D) -> String {
        let precision = Constants.Geo.narrationCachePrecision
        let lat = Self.round(coordinate.latitude, places: precision)
        let lon = Self.round(coordinate.longitude, places: precision)
        return "narr_\(lat)_\(lon)"
    }

    /// Returns a cached narration, checking the in-memory cache first and then
    /// falling back to disk (repopulating memory on a hit). `nil` if absent.
    func cachedNarration(forKey key: String) -> NarrationContent? {
        if let box = memory.object(forKey: key as NSString) {
            return box.content
        }
        return queue.sync {
            let url = fileURL(forKey: key)
            guard let data = try? Data(contentsOf: url),
                  let content = try? decoder.decode(NarrationContent.self, from: data)
            else { return nil }
            memory.setObject(CacheBox(content), forKey: key as NSString)
            return content
        }
    }

    /// Persists a narration to both memory and disk. Disk write failures are
    /// swallowed (the memory copy still serves this session).
    func store(_ narration: NarrationContent, forKey key: String) {
        memory.setObject(CacheBox(narration), forKey: key as NSString)
        queue.async { [weak self] in
            guard let self else { return }
            self.createDirectoryIfNeeded()
            guard let data = try? self.encoder.encode(narration) else { return }
            try? data.write(to: self.fileURL(forKey: key), options: .atomic)
        }
    }

    // MARK: - Maintenance

    /// Wipes both the in-memory and on-disk cache.
    func clear() {
        memory.removeAllObjects()
        queue.sync {
            try? fileManager.removeItem(at: cacheDirectory)
            createDirectoryIfNeeded()
        }
    }

    // MARK: - Helpers

    private func fileURL(forKey key: String) -> URL {
        // Keys are already filesystem-safe ("narr_<lat>_<lon>"), but sanitize
        // defensively in case a key ever contains path separators.
        let safe = key.replacingOccurrences(of: "/", with: "_")
        return cacheDirectory.appendingPathComponent("\(safe).json")
    }

    private func createDirectoryIfNeeded() {
        guard !fileManager.fileExists(atPath: cacheDirectory.path) else { return }
        try? fileManager.createDirectory(
            at: cacheDirectory,
            withIntermediateDirectories: true
        )
    }

    private static func round(_ value: Double, places: Int) -> String {
        let multiplier = pow(10.0, Double(places))
        let rounded = (value * multiplier).rounded() / multiplier
        // Fixed-precision string so keys are stable regardless of trailing zeros.
        return String(format: "%.\(places)f", rounded)
    }

    /// Reference wrapper so the value-type `NarrationContent` can live in `NSCache`.
    private final class CacheBox {
        let content: NarrationContent
        init(_ content: NarrationContent) { self.content = content }
    }
}
