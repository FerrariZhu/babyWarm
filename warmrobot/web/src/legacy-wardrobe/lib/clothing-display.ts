import { babyAgeInMonths, type ClothingCategory } from "@warmrobot/core";
import {
  BOTTOMS_CATEGORIES,
  OUTERWEAR_CATEGORIES,
  TOPS_CATEGORIES,
} from "@/lib/clothing-categories";

export type WardrobeFilter = "all" | "tops" | "bottoms" | "outerwear";

export type Breathability = "low" | "medium" | "high";

export interface ClothingDisplayMeta {
  category: ClothingCategory;
  thickness?: string | null;
  breathability?: Breathability | null;
  seasonTags?: string[] | null;
}

export const WARDROBE_FILTERS: { id: WardrobeFilter; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "tops", label: "Tops" },
  { id: "bottoms", label: "Bottoms" },
  { id: "outerwear", label: "Outerwear" },
];

export function matchesWardrobeFilter(
  category: ClothingCategory,
  filter: WardrobeFilter
): boolean {
  if (filter === "all") return true;
  if (filter === "tops") return TOPS_CATEGORIES.includes(category);
  if (filter === "bottoms") return BOTTOMS_CATEGORIES.includes(category);
  return OUTERWEAR_CATEGORIES.includes(category);
}

export function seasonBadgeLabel(tags?: string[] | null): string | null {
  if (!tags?.length) return null;
  const normalized = tags.map((t) => t.toLowerCase());
  if (normalized.some((t) => t.includes("summer") || t.includes("夏"))) return "夏季";
  if (normalized.some((t) => t.includes("winter") || t.includes("冬"))) return "冬季";
  if (normalized.some((t) => t.includes("spring") || t.includes("春"))) return "春季";
  if (normalized.some((t) => t.includes("autumn") || t.includes("fall") || t.includes("秋")))
    return "秋季";
  if (normalized.length >= 3) return "全年";
  return "全年";
}

export function seasonBadgeClass(label: string | null): string {
  if (label === "冬季") return "bg-secondary-fixed text-on-secondary-fixed";
  if (label === "夏季") return "bg-tertiary-fixed text-on-tertiary-fixed";
  return "bg-tertiary-fixed text-on-tertiary-fixed";
}

export function resolveBreathability(meta: ClothingDisplayMeta): Breathability {
  if (meta.breathability) return meta.breathability;
  if (meta.thickness === "thin") return "high";
  if (meta.thickness === "thick") return "low";
  return "medium";
}

export function breathabilityLabel(level: Breathability): string {
  if (level === "high") return "高";
  if (level === "low") return "低";
  return "中";
}

export function breathabilityBadgeLabel(level: Breathability): string {
  if (level === "high") return "透气";
  if (level === "low") return "保暖";
  return "适中";
}

const MOBILITY_CATEGORIES: ClothingCategory[] = [
  "outer_shell",
  "outer_down",
  "outer_cotton",
  "outer_uv",
  "sweater",
  "fleece_top",
  "pants_long",
  "pants_short",
  "pants_mid",
];

export function outfitSecondaryBadge(
  layerOrder: number,
  meta: ClothingDisplayMeta,
  activityLevel?: string
): { icon: string; label: string; tone: "tertiary" | "secondary" } {
  const isOuter = layerOrder >= 3 || OUTERWEAR_CATEGORIES.includes(meta.category);
  const isMobility =
    isOuter || (activityLevel === "high" && MOBILITY_CATEGORIES.includes(meta.category));

  if (isMobility && isOuter) {
    return { icon: "toys_and_games", label: "活动度", tone: "tertiary" };
  }

  const breath = resolveBreathability(meta);
  return {
    icon: breath === "high" ? "air" : "device_thermostat",
    label: breathabilityLabel(breath),
    tone: "tertiary",
  };
}

export function formatBabyAge(birthDate: string): string {
  const birth = new Date(birthDate);
  const now = new Date();
  const months = babyAgeInMonths(birthDate, now);
  if (months < 1) {
    const days = Math.max(
      1,
      Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24))
    );
    return `${days}天大`;
  }
  if (months < 24) return `${months}个月大`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return `${years}岁`;
  return `${years}岁${rem}个月`;
}

export function warmthSensitivityLabel(offset: number): string {
  if (offset >= 5) return "耐寒度：偏高";
  if (offset <= -5) return "耐寒度：偏低";
  return "耐寒度：正常";
}

export function warmthIndexLabel(score: number): string {
  return `保暖指数: ${Math.round(score)}`;
}

export function togEquivalent(score: number): string {
  return (score / 10).toFixed(1);
}
