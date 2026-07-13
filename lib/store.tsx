"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { GeoContext, POI, Preferences, Story, Trip } from "./types";
import { SEED_TRIPS, ACTIVE_TRIP_ID, findTrip } from "./seed";
import { nearbyFeatures, reverseGeocode, detectionRadiusMeters } from "./geo";
import { categoryForFeature } from "./categories";

const DEFAULT_PREFS: Preferences = {
  enabledCategories: ["geology", "history", "indigenous", "ecology"],
  density: 0.55,
  frequency: "medium",
  quietHours: true,
  soloMode: false,
  voice: "Warm narrator",
};

export type HomeStatus = "welcome" | "locating" | "listening" | "error";

interface AppValue {
  // preferences
  prefs: Preferences;
  toggleCategory: (c: Story["category"]) => void;
  setDensity: (n: number) => void;
  setFrequency: (f: Preferences["frequency"]) => void;
  toggleQuietHours: () => void;
  toggleSolo: () => void;

  // trips
  trips: Trip[];
  activeTrip: Trip | null;
  startTrip: (id: string) => void;
  endTrip: () => void;

  // queue derived from the active trip
  queue: Story[];

  // playback
  nowPlaying: Story | null;
  progress: number; // 0..1
  isPlaying: boolean;
  playStory: (s: Story) => void;
  togglePlay: () => void;
  skip: () => void;

  // bookmarks
  bookmarks: string[];
  toggleBookmark: (id: string) => void;
  isBookmarked: (id: string) => boolean;

  // live home flow
  homeStatus: HomeStatus;
  geoContext: GeoContext | null;
  nearbyPoi: POI | null;
  demoMode: boolean;
  startListening: () => void;
}

const Ctx = createContext<AppValue | null>(null);

export function useApp(): AppValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used within <AppProvider>");
  return v;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [trips] = useState<Trip[]>(SEED_TRIPS);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [nowPlaying, setNowPlaying] = useState<Story | null>(null);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  const [homeStatus, setHomeStatus] = useState<HomeStatus>("welcome");
  const [geoContext, setGeoContext] = useState<GeoContext | null>(null);
  const [nearbyPoi, setNearbyPoi] = useState<POI | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- preferences ---
  const toggleCategory = useCallback((c: Story["category"]) => {
    setPrefs((p) => {
      const has = p.enabledCategories.includes(c);
      return { ...p, enabledCategories: has ? p.enabledCategories.filter((x) => x !== c) : [...p.enabledCategories, c] };
    });
  }, []);
  const setDensity = useCallback((n: number) => setPrefs((p) => ({ ...p, density: n })), []);
  const setFrequency = useCallback((f: Preferences["frequency"]) => setPrefs((p) => ({ ...p, frequency: f })), []);
  const toggleQuietHours = useCallback(() => setPrefs((p) => ({ ...p, quietHours: !p.quietHours })), []);
  const toggleSolo = useCallback(() => setPrefs((p) => ({ ...p, soloMode: !p.soloMode })), []);

  // --- trips ---
  const activeTrip = useMemo(() => (activeTripId ? findTrip(activeTripId) ?? null : null), [activeTripId]);
  const startTrip = useCallback((id: string) => setActiveTripId(id), []);
  const endTrip = useCallback(() => setActiveTripId(null), []);
  const queue = useMemo(() => activeTrip?.stories ?? findTrip(ACTIVE_TRIP_ID)?.stories ?? [], [activeTrip]);

  // --- playback (Web Speech, centralized so it survives navigation) ---
  const stopAudio = useCallback(() => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const playStory = useCallback(
    async (s: Story) => {
      stopAudio();
      setNowPlaying(s);
      setIsPlaying(true);
      setProgress(0);

      let text = s.narration?.narration;
      if (!text) {
        try {
          const res = await fetch("/api/narrate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: s.lat ?? 38.0, lon: s.lon ?? -119.0, region: s.title, features: [s.title], type: "deep_dive" }),
          });
          text = (await res.json())?.narration?.narration;
        } catch {
          /* offline: fall through */
        }
      }
      text = text ?? `${s.title}. A story about this place plays here in the full experience.`;

      const finish = () => {
        setIsPlaying(false);
        setProgress(1);
      };
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(text);
        const total = Math.max(text.length, 1);
        u.onboundary = (e) => setProgress(Math.min(e.charIndex / total, 1));
        u.onend = finish;
        window.speechSynthesis.speak(u);
      } else {
        // No TTS: sweep progress over ~a few seconds.
        let p = 0;
        progressTimer.current = setInterval(() => {
          p += 0.04;
          setProgress(Math.min(p, 1));
          if (p >= 1) {
            if (progressTimer.current) clearInterval(progressTimer.current);
            finish();
          }
        }, 250);
      }
    },
    [stopAudio],
  );

  const togglePlay = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setIsPlaying((v) => !v);
      return;
    }
    const ss = window.speechSynthesis;
    if (isPlaying) {
      ss.pause();
      setIsPlaying(false);
    } else {
      ss.resume();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const skip = useCallback(() => {
    const q = queue;
    const idx = nowPlaying ? q.findIndex((s) => s.id === nowPlaying.id) : -1;
    const next = q.slice(idx + 1).find((s) => s.status !== "heard") ?? q[idx + 1];
    if (next) playStory(next);
    else {
      stopAudio();
      setIsPlaying(false);
    }
  }, [queue, nowPlaying, playStory, stopAudio]);

  // --- bookmarks ---
  const toggleBookmark = useCallback((id: string) => {
    setBookmarks((b) => (b.includes(id) ? b.filter((x) => x !== id) : [...b, id]));
  }, []);
  const isBookmarked = useCallback((id: string) => bookmarks.includes(id), [bookmarks]);

  // --- live home flow ---
  const startListening = useCallback(() => {
    setHomeStatus("locating");
    const scan = async (lat: number, lon: number) => {
      const context = await reverseGeocode(lat, lon);
      setGeoContext(context);
      try {
        const feats = await nearbyFeatures(lat, lon, detectionRadiusMeters(0));
        const top = feats.find((f) => f.name) ?? feats[0];
        if (top) {
          setNearbyPoi({
            id: top.id,
            name: top.name ?? "A nearby place",
            lat: top.lat,
            lon: top.lon,
            distance: top.distance ?? 0,
            category: categoryForFeature(top),
            feature: top,
          });
        }
        setHomeStatus("listening");
      } catch {
        setHomeStatus("error");
      }
    };
    if (typeof navigator !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => scan(pos.coords.latitude, pos.coords.longitude),
        () => {
          setDemoMode(true);
          scan(38.0169, -119.0269);
        },
        { enableHighAccuracy: true, timeout: 12000 },
      );
    } else {
      setDemoMode(true);
      scan(38.0169, -119.0269);
    }
  }, []);

  const value: AppValue = {
    prefs, toggleCategory, setDensity, setFrequency, toggleQuietHours, toggleSolo,
    trips, activeTrip, startTrip, endTrip, queue,
    nowPlaying, progress, isPlaying, playStory, togglePlay, skip,
    bookmarks, toggleBookmark, isBookmarked,
    homeStatus, geoContext, nearbyPoi, demoMode, startListening,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
