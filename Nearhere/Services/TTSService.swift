import Foundation
import AVFoundation
import AudioToolbox

/// Speaks narration text through `AVSpeechSynthesizer` and manages the shared
/// audio session so the app ducks (and restores) other audio — music, podcasts,
/// nav prompts — cleanly around each narration.
///
/// Published state (`isPlaying`, `progress`, `currentNarration`) lets SwiftUI
/// views drive a "now speaking" UI and a progress indicator.
@MainActor
final class TTSService: NSObject, ObservableObject, SpeechSynthesizing, AVSpeechSynthesizerDelegate {

    // MARK: - Published state

    @Published private(set) var isPlaying: Bool = false
    /// 0…1 spoken progress, driven by `willSpeakRangeOfSpeechString`.
    @Published private(set) var progress: Double = 0
    /// The narration currently being (or last) spoken.
    @Published private(set) var currentNarration: NarrationContent?

    // MARK: - Config

    /// When true, a short chime plays before each narration to cue the listener.
    var playChime: Bool = true

    // MARK: - Private

    private let synthesizer = AVSpeechSynthesizer()
    /// System sound id used for the pre-narration chime (Tock ~= 1013).
    private let chimeSoundID: SystemSoundID = 1013

    override init() {
        super.init()
        synthesizer.delegate = self
        registerInterruptionObserver()
    }

    // MARK: - SpeechSynthesizing

    /// Configures the audio session, optionally plays a chime, then speaks the
    /// narration with the best available en-US voice.
    func speak(_ content: NarrationContent) {
        // Restart cleanly if something is already playing.
        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }

        currentNarration = content
        progress = 0

        configureAudioSession()

        if playChime {
            AudioServicesPlaySystemSound(chimeSoundID)
        }

        let utterance = AVSpeechUtterance(string: content.narration)
        utterance.voice = Self.preferredVoice()
        // Slightly relaxed defaults suited to in-car listening.
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate
        utterance.pitchMultiplier = 1.0
        utterance.postUtteranceDelay = 0.1

        isPlaying = true
        synthesizer.speak(utterance)
    }

    /// Stops immediately and restores other audio.
    func stop() {
        synthesizer.stopSpeaking(at: .immediate)
        isPlaying = false
        deactivateAudioSession()
    }

    // MARK: - Audio session

    private func configureAudioSession() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(
                .playback,
                mode: .spokenAudio,
                options: [.duckOthers, .interruptSpokenAudioAndMixWithOthers]
            )
            try session.setActive(true)
        } catch {
            // Non-fatal: speech can still proceed on the default session.
        }
    }

    private func deactivateAudioSession() {
        let session = AVAudioSession.sharedInstance()
        // Notify others so music/podcasts resume where they left off.
        try? session.setActive(false, options: .notifyOthersOnDeactivation)
    }

    /// Picks an enhanced/premium en-US voice when the device has one installed,
    /// falling back to the system default en-US voice.
    private static func preferredVoice() -> AVSpeechSynthesisVoice? {
        let enUS = AVSpeechSynthesisVoice.speechVoices()
            .filter { $0.language == "en-US" }

        // Prefer premium, then enhanced quality.
        if let premium = enUS.first(where: { $0.quality == .premium }) {
            return premium
        }
        if let enhanced = enUS.first(where: { $0.quality == .enhanced }) {
            return enhanced
        }
        return AVSpeechSynthesisVoice(language: "en-US")
    }

    // MARK: - Interruptions

    private func registerInterruptionObserver() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleInterruption(_:)),
            name: AVAudioSession.interruptionNotification,
            object: nil
        )
    }

    /// Pauses on an interruption begin (e.g. a phone call) and cleans up state.
    @objc private func handleInterruption(_ notification: Notification) {
        guard
            let info = notification.userInfo,
            let raw = info[AVAudioSessionInterruptionTypeKey] as? UInt,
            let type = AVAudioSession.InterruptionType(rawValue: raw)
        else { return }

        // Hop to the main actor: the notification may arrive on another thread.
        Task { @MainActor in
            switch type {
            case .began:
                self.synthesizer.stopSpeaking(at: .immediate)
                self.isPlaying = false
            case .ended:
                // We deliberately do not auto-resume; a fresh narration will
                // reactivate the session when appropriate.
                self.deactivateAudioSession()
            @unknown default:
                break
            }
        }
    }

    // MARK: - AVSpeechSynthesizerDelegate

    nonisolated func speechSynthesizer(
        _ synthesizer: AVSpeechSynthesizer,
        willSpeakRangeOfSpeechString characterRange: NSRange,
        utterance: AVSpeechUtterance
    ) {
        let total = max(utterance.speechString.count, 1)
        let spoken = characterRange.location + characterRange.length
        let value = min(max(Double(spoken) / Double(total), 0), 1)
        Task { @MainActor in self.progress = value }
    }

    nonisolated func speechSynthesizer(
        _ synthesizer: AVSpeechSynthesizer,
        didFinish utterance: AVSpeechUtterance
    ) {
        Task { @MainActor in
            self.isPlaying = false
            self.progress = 1
            self.deactivateAudioSession()
        }
    }

    nonisolated func speechSynthesizer(
        _ synthesizer: AVSpeechSynthesizer,
        didCancel utterance: AVSpeechUtterance
    ) {
        Task { @MainActor in
            self.isPlaying = false
            self.deactivateAudioSession()
        }
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }
}
