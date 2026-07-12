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
  /** meters from the user, filled in after a lookup */
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
  distance: number; // meters
  category: POICategory;
  feature: GeoFeature;
  narration?: Narration;
}
