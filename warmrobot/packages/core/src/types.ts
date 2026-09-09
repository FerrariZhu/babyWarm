export type ActivityLevel = "low" | "medium" | "high";
export type Scenario = "indoor" | "outdoor" | "sleep";
export type TimeSlot = "morning" | "afternoon" | "evening" | "night";
export type Variant = "default" | "warmer" | "cooler";

export type ClothingCategory =
  | "bodysuit_short"
  | "bodysuit_long"
  | "tshirt_short"
  | "tshirt_long"
  | "thermal_top"
  | "sweater"
  | "fleece_top"
  | "vest"
  | "vest_down"
  | "outer_uv"
  | "outer_shell"
  | "outer_cotton"
  | "outer_down"
  | "long_johns"
  | "pants_short"
  | "pants_mid"
  | "pants_long"
  | "shoes_sandal"
  | "shoes_sneaker"
  | "shoes_leather"
  | "shoes_boot"
  | "hat"
  | "scarf"
  | "gloves"
  | "socks"
  | "other";

export interface WeatherSnapshot {
  temp: number;
  feelsLike: number;
  humidity: number;
  /** Wind speed at 10 m, in metres per second. */
  windSpeed: number;
  pressure: number;
  text: string;
  precipProbability?: number;
  uvIndex?: number;
  /** Observation time from weather provider (ISO-8601 local or offset). */
  observedAt?: string;
}

export interface BabyProfile {
  id: string;
  name: string;
  birthDate: string;
  activityLevel: ActivityLevel;
  currentSizeLabel?: string | null;
  warmthOffset?: number;
  heightCm?: number | null;
  weightKg?: number | null;
  /** null = unknown; false = daytime potty trained / no diaper. */
  wearsDiaper?: boolean | null;
}

export interface WardrobeItem {
  id: string;
  name: string;
  category: ClothingCategory;
  warmthScore: number;
  sizeLabel?: string | null;
  imageUrl?: string | null;
  isAvailable?: boolean;
}

export interface RecommendInput {
  weather: WeatherSnapshot;
  baby: BabyProfile;
  wardrobe: WardrobeItem[];
  scenario: Scenario;
  timeSlot?: TimeSlot;
  variant?: Variant;
}

export interface RecommendedPiece {
  item: WardrobeItem;
  layerOrder: number;
}

export interface RecommendResult {
  requiredWarmth: number;
  actualWarmth: number;
  pieces: RecommendedPiece[];
  reason: string;
  variant: Variant;
}
