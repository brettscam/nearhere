/** Best-available Web Speech voice selection.
 *  Browser TTS quality varies wildly; the default is usually the worst option.
 *  We rank toward Google / neural / natural / enhanced en-US voices. */

let cached: SpeechSynthesisVoice | null = null;

function hasTTS(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Kick off async voice loading and reset the cache when the list changes. */
export function primeVoices(): void {
  if (!hasTTS()) return;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    cached = null;
  });
}

/** Resolve once voices are available (they load async in most browsers). */
export function ensureVoices(timeoutMs = 1500): Promise<void> {
  return new Promise((resolve) => {
    if (!hasTTS() || window.speechSynthesis.getVoices().length) return resolve();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    window.speechSynthesis.addEventListener("voiceschanged", finish, { once: true });
    window.speechSynthesis.getVoices();
    window.setTimeout(finish, timeoutMs);
  });
}

function score(v: SpeechSynthesisVoice): number {
  const n = v.name.toLowerCase();
  let s = 0;
  if (/en[-_]us/i.test(v.lang)) s += 2;
  if (n.includes("google")) s += 6;
  if (n.includes("natural") || n.includes("neural")) s += 6;
  if (n.includes("premium") || n.includes("enhanced")) s += 4;
  if (/(aria|jenny|guy|libby|sonia|ryan|michelle|ana)/.test(n)) s += 4; // MS Edge neural
  if (/(samantha|ava|allison|zoe|serena|evan|nathan)/.test(n)) s += 3; // Apple enhanced
  if (v.localService === false) s += 1; // remote voices are usually higher quality
  if (n.includes("default") || n.includes("compact")) s -= 4;
  if (/(zira|david|mark|fred|albert)/.test(n)) s -= 2; // older/robotic
  return s;
}

/** English voices only, ranked best-first (for a settings picker). */
export function rankedEnglishVoices(): SpeechSynthesisVoice[] {
  if (!hasTTS()) return [];
  const voices = window.speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
  return voices.sort((a, b) => score(b) - score(a));
}

/** The single best voice, honoring an explicit preferred name if it still exists. */
export function pickVoice(preferName?: string): SpeechSynthesisVoice | null {
  if (!hasTTS()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  if (preferName) {
    const exact = voices.find((v) => v.name === preferName);
    if (exact) return exact;
  }
  if (cached) return cached;
  const en = voices.filter((v) => /^en/i.test(v.lang));
  const pool = en.length ? en : voices;
  pool.sort((a, b) => score(b) - score(a));
  cached = pool[0] ?? null;
  return cached;
}
