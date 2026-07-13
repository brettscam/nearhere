export type POICategory =
  | "geology"
  | "history"
  | "indigenous"
  | "ecology"
  | "architecture"
  | "folklore"
  | "industry"
  | "military"
  | "culture"
  | "astronomy";

export type POIEra =
  | "prehistoric"
  | "preColonial"
  | "colonial"
  | "1800s"
  | "1900s"
  | "modern";

export interface GeoFeature {
  id: string;
  name?: string;
  featureType: "natural" | "historic" | "tourism" | "place" | "other";
  lat: number;
  lon: number;
  tags: Record<string, string>;
  distance?: number;
}

export interface GeoContext {
  region?: string;
  county?: string;
  locality?: string;
  country?: string;
  summary: string;
}

export interface Narration {
  title: string;
  category: POICategory;
  era: POIEra;
  narration: string;
  followUpHook?: string;
}

export interface POI {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distance: number; // meters (live) or a display distance
  category: POICategory;
  feature?: GeoFeature;
  narration?: Narration;
}

/** Playback status of a story within a trip queue. */
export type StoryStatus = "playing" | "queued" | "heard";

export interface Story {
  id: string;
  title: string;
  category: POICategory;
  /** duration label, e.g. "2:40" */
  duration: string;
  /** distance ahead in miles (queue ordering) */
  milesAhead: number;
  status: StoryStatus;
  /** normalized position along the route 0..1 (for the map) */
  routeT: number;
  narration?: Narration;
  lat?: number;
  lon?: number;
}

export type TripStatus = "upcoming" | "past" | "active";

export interface Trip {
  id: string;
  origin: string;
  destination: string;
  /** e.g. "SAT JUL 19" or "JUN 28" */
  dateLabel: string;
  distanceMiles: number;
  /** total stories discovered for the trip */
  storyCount: number;
  /** stories actually heard (for past trips) */
  heardCount?: number;
  driveTime?: string; // "4h 20m"
  status: TripStatus;
  offline: boolean;
  stories: Story[];
}

export interface Preferences {
  enabledCategories: POICategory[];
  /** 0..1 alert density */
  density: number;
  frequency: "low" | "medium" | "high";
  quietHours: boolean;
  soloMode: boolean;
  voice: string;
}
