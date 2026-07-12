import type { POICategory, GeoFeature } from "./types";

interface CategoryMeta {
  label: string;
  /** base hex (design system §02) */
  base: string;
  /** lifted variant for legibility on dark surfaces */
  darkTint: string;
  /** inline SVG path(s) on a 24 grid, 1.75 stroke, round caps */
  icon: string;
}

export const CATEGORY: Record<POICategory, CategoryMeta> = {
  geology: { label: "Geology", base: "#A6552F", darkTint: "#C88159", icon: "M3 19l5-8 3 4 4-7 6 11z" },
  history: { label: "History", base: "#8A6D3B", darkTint: "#B8996A", icon: "M5 20h14M6 20V9m4 11V9m4 11V9m4 11V9 M4 9h16L12 4z" },
  indigenous: { label: "Indigenous", base: "#C1922F", darkTint: "#D8B25E", icon: "M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" },
  ecology: { label: "Ecology", base: "#5C7A3F", darkTint: "#89A470", icon: "M12 21V8 M12 8c0-3 2.5-5 6-5 0 3.5-2.5 5-6 5z M12 13c0-2.5-2-4.5-5-4.5C7 11 9 13 12 13z" },
  architecture: { label: "Architecture", base: "#4E6172", darkTint: "#8195A6", icon: "M4 21V10l8-6 8 6v11 M4 21h16 M10 21v-5h4v5" },
  folklore: { label: "Folklore", base: "#7A5468", darkTint: "#A98499", icon: "M12 3c1.5 2.5 1 4-.5 5.5C10 10 9 12 12 15c3-2 3.5-5 2.5-7 M7 15c1 3 3 5 5 5s4-2 5-5c-1.5 1-3.5 1.5-5 1.5S8.5 16 7 15z" },
  industry: { label: "Industry", base: "#5E6B6E", darkTint: "#909B9E", icon: "M4 21V11l6 4V11l6 4V8h4v13z M4 21h16" },
  military: { label: "Military", base: "#6E6B3E", darkTint: "#9E9B6E", icon: "M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" },
  culture: { label: "Culture", base: "#A05046", darkTint: "#C88479", icon: "M6 3v18l6-3 6 3V3z" },
  astronomy: { label: "Astronomy", base: "#3B4A73", darkTint: "#7180A6", icon: "M12 3l1.8 4.4L18 9l-4.2 1.6L12 15l-1.8-4.4L6 9l4.2-1.6z" },
};

/** Pick a plausible category from an OSM feature's tags. */
export function categoryForFeature(f: GeoFeature): POICategory {
  const t = f.tags;
  if (t.geological || t.natural === "peak" || t.natural === "volcano" || t.natural === "cliff") return "geology";
  if (t.natural) return "ecology";
  if (t.historic === "archaeological_site" || t.historic === "monument" || t.historic === "memorial") return "history";
  if (t.military || t.historic === "fort" || t.historic === "battlefield") return "military";
  if (t.historic === "ruins" || t.historic === "castle") return "architecture";
  if (t.tourism === "artwork" || t.tourism === "museum" || t.tourism === "gallery") return "culture";
  if (t.historic) return "history";
  if (t.tourism) return "culture";
  if (t.place) return "history";
  return "culture";
}
