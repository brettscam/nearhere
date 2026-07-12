import UIKit
import UniformTypeIdentifiers

/// Share Extension entry point for the "Add to Nearhere" action.
///
/// The extension is intentionally minimal and UIKit-based (the host app is
/// SwiftUI, but a share extension is simplest and most robust as a plain
/// `UIViewController`). It accepts a shared Google Maps URL — delivered either as
/// a `public.url` item or as plain text containing a maps link — writes the URL
/// string into the shared app group, shows a brief confirmation, and completes.
///
/// The host app later reads the stored URL via
/// `TripModeService.loadSharedTripURL()` (key `pendingTripURL` in the shared
/// `UserDefaults(suiteName: "group.com.nearhere.shared")`).
final class ShareViewController: UIViewController {

    /// Shared app group and key. Must match `TripModeService.appGroupID` /
    /// `TripModeService.pendingTripURLKey`.
    private let appGroupID = "group.com.nearhere.shared"
    private let pendingTripURLKey = "pendingTripURL"

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .clear
        extractSharedURL { [weak self] url in
            guard let self else { return }
            if let url {
                self.storePendingURL(url)
                self.showConfirmation()
            } else {
                // Nothing usable was shared — just finish quietly.
                self.finish(after: 0.2)
            }
        }
    }

    // MARK: - Extraction

    /// Pulls the first usable URL out of the extension's input items. Handles a
    /// `public.url` provider first, then falls back to plain text that contains a
    /// maps URL. Completion is always called on the main queue with the URL or nil.
    private func extractSharedURL(completion: @escaping (URL?) -> Void) {
        let providers = (extensionContext?.inputItems as? [NSExtensionItem])?
            .compactMap { $0.attachments }
            .flatMap { $0 } ?? []

        guard !providers.isEmpty else {
            completion(nil)
            return
        }

        let urlType = UTType.url.identifier   // "public.url"
        let textType = UTType.plainText.identifier // "public.plain-text"

        // Prefer an explicit URL provider.
        if let urlProvider = providers.first(where: { $0.hasItemConformingToTypeIdentifier(urlType) }) {
            urlProvider.loadItem(forTypeIdentifier: urlType, options: nil) { item, _ in
                let url = Self.url(from: item)
                DispatchQueue.main.async { completion(url) }
            }
            return
        }

        // Fall back to plain text that may contain a maps URL.
        if let textProvider = providers.first(where: { $0.hasItemConformingToTypeIdentifier(textType) }) {
            textProvider.loadItem(forTypeIdentifier: textType, options: nil) { item, _ in
                let url = Self.urlFromText(item)
                DispatchQueue.main.async { completion(url) }
            }
            return
        }

        completion(nil)
    }

    /// Coerces a loaded item (URL, NSURL, or string) into a URL.
    private static func url(from item: Any?) -> URL? {
        switch item {
        case let url as URL:
            return url
        case let data as Data:
            return URL(dataRepresentation: data, relativeTo: nil)
        case let string as String:
            return urlFromString(string)
        default:
            return nil
        }
    }

    /// Extracts the first URL substring from a shared plain-text item.
    private static func urlFromText(_ item: Any?) -> URL? {
        guard let text = item as? String else {
            return (item as? URL)
        }
        return urlFromString(text)
    }

    /// Finds the first http(s) URL within an arbitrary string.
    private static func urlFromString(_ string: String) -> URL? {
        let trimmed = string.trimmingCharacters(in: .whitespacesAndNewlines)
        if let direct = URL(string: trimmed), direct.scheme != nil {
            return direct
        }
        if let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue) {
            let range = NSRange(trimmed.startIndex..., in: trimmed)
            if let match = detector.firstMatch(in: trimmed, options: [], range: range) {
                return match.url
            }
        }
        return nil
    }

    // MARK: - Persistence

    /// Writes the shared URL string into the app group for the host app to read.
    private func storePendingURL(_ url: URL) {
        guard let defaults = UserDefaults(suiteName: appGroupID) else { return }
        defaults.set(url.absoluteString, forKey: pendingTripURLKey)
    }

    // MARK: - UI + completion

    /// Shows a tiny confirmation alert, then completes the extension request.
    private func showConfirmation() {
        let alert = UIAlertController(
            title: "Added to Nearhere",
            message: "Open Nearhere to prepare your trip.",
            preferredStyle: .alert
        )
        present(alert, animated: true)
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
            alert.dismiss(animated: true) {
                self?.completeRequest()
            }
        }
    }

    private func finish(after delay: TimeInterval) {
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            self?.completeRequest()
        }
    }

    private func completeRequest() {
        extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    }
}
