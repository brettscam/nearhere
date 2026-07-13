import type { Trip, Story } from "./types";

/** Stories for the flagship Bishop → Tahoe trip. routeT is south→north (0..1). */
const bishopTahoeStories: Story[] = [
  { id: "s1", title: "Mono Lake Tufa Towers", category: "geology", duration: "2:40", milesAhead: 1.2, status: "playing", routeT: 0.16,
    narration: { title: "Mono Lake Tufa Towers", category: "geology", era: "prehistoric",
      narration: "These calcium-carbonate spires grew underwater over centuries, revealed only when the lake was drained for a thirsty city three hundred miles south.",
      followUpHook: "Want to hear how Los Angeles nearly drained this lake dry?" } },
  { id: "s2", title: "Paiute Wintering Grounds", category: "indigenous", duration: "3:05", milesAhead: 0.8, status: "queued", routeT: 0.28 },
  { id: "s3", title: "Panum Crater", category: "geology", duration: "2:18", milesAhead: 2.1, status: "queued", routeT: 0.36 },
  { id: "s4", title: "June Lake Loop", category: "ecology", duration: "2:44", milesAhead: 4.5, status: "queued", routeT: 0.5 },
  { id: "s5", title: "Obsidian Dome", category: "geology", duration: "1:58", milesAhead: 0, status: "heard", routeT: 0.62 },
  { id: "s6", title: "Mammoth Mining Camp", category: "history", duration: "2:30", milesAhead: 0, status: "heard", routeT: 0.74 },
  { id: "s7", title: "Bristlecone Pine Forest", category: "ecology", duration: "2:12", milesAhead: 0, status: "heard", routeT: 0.88 },
];

export const SEED_TRIPS: Trip[] = [
  {
    id: "bishop-tahoe",
    origin: "Bishop",
    destination: "Lake Tahoe",
    dateLabel: "SAT JUL 19",
    distanceMiles: 212,
    storyCount: 28,
    driveTime: "4h 20m",
    status: "upcoming",
    offline: true,
    stories: bishopTahoeStories,
  },
  {
    id: "home-joshua",
    origin: "Home",
    destination: "Joshua Tree",
    dateLabel: "JUL 26",
    distanceMiles: 168,
    storyCount: 22,
    driveTime: "3h 05m",
    status: "upcoming",
    offline: false,
    stories: [],
  },
  {
    id: "bishop-tahoe-past",
    origin: "Bishop",
    destination: "Tahoe",
    dateLabel: "JUN 28",
    distanceMiles: 212,
    storyCount: 26,
    heardCount: 14,
    driveTime: "4h 20m",
    status: "past",
    offline: true,
    stories: bishopTahoeStories.map((s) => ({ ...s, status: "heard" as const })),
  },
  {
    id: "sf-mendocino",
    origin: "SF",
    destination: "Mendocino",
    dateLabel: "JUN 12",
    distanceMiles: 158,
    storyCount: 18,
    heardCount: 9,
    driveTime: "3h 30m",
    status: "past",
    offline: false,
    stories: [],
  },
];

/** The trip used for the active-drive demo (Live Queue, Route Map, now-playing). */
export const ACTIVE_TRIP_ID = "bishop-tahoe";

export function findTrip(id: string): Trip | undefined {
  return SEED_TRIPS.find((t) => t.id === id);
}
