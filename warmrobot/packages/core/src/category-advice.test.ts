/**
 * Tests for variant-driven category advice selection.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCategoryAdvice,
  collectSlotSwapCandidates,
  joinConsumerLabel,
  pickClosestVariant,
  splitConsumerLabel,
  type VariantSlimRow,
} from "./category-advice";
import { BRIEF_ADVICE_SCHEMA_VERSION, isBriefAdviceCurrent } from "./daily-brief-types";
import { checklistDisplayChips } from "./checklist-display";
import { describeSwapCurrentRow, describeSwapOptionRow } from "./swap-display";
import { DIAPER_WARMTH_VALUE, effectiveChecklistWarmth, zoneTargetWarmth } from "./checklist-warmth";
import { generateGarmentVariants } from "./garment-variant-generator";
import type { WeatherSnapshot } from "./types";

function slimFromGenerator(): VariantSlimRow[] {
  return generateGarmentVariants()
    .filter((r) => r.is_active)
    .map((r) => ({
      category_code: r.category_code,
      warmth_value: r.warmth_value,
      consumer_label: r.consumer_label,
      sort_order: r.sort_order,
      is_active: r.is_active,
      material: r.material,
      thickness: r.thickness,
      fit_type: r.fit_type,
      sock_height: r.sock_height,
      bodysuit_style: r.bodysuit_style,
      pant_length: r.pant_length,
      fill_type: r.fill_type,
      hat_kind: r.hat_kind,
    }));
}

function adviceItemText(items: { category?: string; label: string; subtitle?: string }[]): string {
  return items
    .map((i) => `${i.category ?? ""} ${i.label} ${i.subtitle ?? ""}`)
    .join(" | ");
}

const mildWeather: WeatherSnapshot = {
  temp: 22,
  feelsLike: 22,
  humidity: 55,
  windSpeed: 2,
  pressure: 1013,
  uvIndex: 3,
  text: "多云",
  precipProbability: 10,
};

describe("splitConsumerLabel", () => {
  it("splits title and joins feature tokens with ·", () => {
    assert.deepEqual(splitConsumerLabel("T恤 · 厚棉保暖 宽松"), {
      title: "T恤",
      subtitle: "厚棉保暖·宽松",
    });
  });

  it("returns title only when no middle-dot separator", () => {
    assert.deepEqual(splitConsumerLabel("凉鞋"), { title: "凉鞋" });
  });

  it("round-trips with joinConsumerLabel", () => {
    const { title, subtitle } = splitConsumerLabel("T恤 · 厚棉保暖 宽松");
    assert.equal(joinConsumerLabel(title, subtitle), "T恤 · 厚棉保暖 宽松");
    assert.equal(joinConsumerLabel("凉鞋"), "凉鞋");
  });
});

describe("pickClosestVariant", () => {
  const rows: VariantSlimRow[] = [
    {
      category_code: "tshirt_short",
      warmth_value: 3,
      consumer_label: "T恤",
      sort_order: 0,
      is_active: true,
      material: "cotton",
      thickness: "thin",
      fit_type: "regular",
    },
    {
      category_code: "tshirt_short",
      warmth_value: 15,
      consumer_label: "T恤",
      sort_order: 1,
      is_active: true,
      material: "cotton",
      thickness: "medium",
      fit_type: "regular",
    },
    {
      category_code: "thermal_top",
      warmth_value: 70,
      consumer_label: "秋衣",
      sort_order: 2,
      is_active: true,
      material: "cotton",
      thickness: "medium",
      fit_type: "regular",
    },
  ];

  it("picks closest warmth_value in pool", () => {
    const picked = pickClosestVariant(rows, ["tshirt_short", "thermal_top"], 20);
    assert.equal(picked?.consumer_label, "T恤");
  });

  it("can cross categories within a slot pool", () => {
    const picked = pickClosestVariant(rows, ["tshirt_short", "thermal_top"], 65);
    assert.equal(picked?.category_code, "thermal_top");
  });

  it("does not pick long-sleeve when requiredWarmth is still in the short-sleeve range", () => {
    const mixed: VariantSlimRow[] = [
      {
        category_code: "tshirt_short",
        warmth_value: 15,
        consumer_label: "T恤",
        sort_order: 0,
        is_active: true,
        material: "cotton",
        thickness: "medium",
        fit_type: "regular",
      },
      {
        category_code: "tshirt_long",
        warmth_value: 26,
        consumer_label: "长袖T恤",
        sort_order: 1,
        is_active: true,
        material: "cotton",
        thickness: "thin",
        fit_type: "regular",
      },
    ];
    const picked = pickClosestVariant(mixed, ["tshirt_short", "tshirt_long"], 24);
    assert.equal(picked?.category_code, "tshirt_short");
  });

  it("prefers cotton when the type has it, even if another fabric is closer", () => {
    const mixed: VariantSlimRow[] = [
      {
        category_code: "tshirt_short",
        warmth_value: 19,
        consumer_label: "T恤",
        sort_order: 0,
        is_active: true,
        material: "polyester",
        thickness: "thin",
        fit_type: "regular",
      },
      {
        category_code: "tshirt_short",
        warmth_value: 22,
        consumer_label: "T恤",
        sort_order: 1,
        is_active: true,
        material: "cotton",
        thickness: "thin",
        fit_type: "regular",
      },
    ];
    const picked = pickClosestVariant(mixed, ["tshirt_short"], 20);
    assert.equal(picked?.material, "cotton");
  });

  it("falls back when the type has no cotton", () => {
    const mixed: VariantSlimRow[] = [
      {
        category_code: "outer_down",
        warmth_value: 88,
        consumer_label: "羽绒服",
        sort_order: 0,
        is_active: true,
        material: "down",
        thickness: "regular_fill",
        fit_type: "regular",
      },
      {
        category_code: "outer_down",
        warmth_value: 80,
        consumer_label: "羽绒服",
        sort_order: 1,
        is_active: true,
        material: "down",
        thickness: "lightweight",
        fit_type: "regular",
      },
    ];
    const picked = pickClosestVariant(mixed, ["outer_down"], 82);
    assert.equal(picked?.material, "down");
    assert.equal(picked?.thickness, "lightweight");
  });
});

describe("buildCategoryAdvice with variants", () => {
  const variants = slimFromGenerator();

  it("loads active variants from generator", () => {
    assert.ok(variants.length >= 300);
  });

  it("derives subtitle from variant axes when variants given", () => {
    const advice = buildCategoryAdvice({
      weather: mildWeather,
      baby: {
        birthDate: "2024-01-01",
        activityLevel: "low",
        warmthOffset: 0,
      },
      variants,
    });

    assert.equal(advice.schemaVersion, BRIEF_ADVICE_SCHEMA_VERSION);
    const categories = advice.indoorItems.filter((i) => i.kind === "category");
    assert.ok(categories.length >= 1);
    const withSubtitle = categories.find((i) => i.subtitle);
    assert.ok(
      withSubtitle,
      `expected subtitle from axes, got: ${categories
        .map((c) => `${c.label}|${c.subtitle ?? ""}`)
        .join(", ")}`
    );
    assert.ok(
      !withSubtitle!.label.includes("·"),
      `title should be short name, got ${withSubtitle!.label}`
    );
    assert.ok(withSubtitle!.subtitle!.includes("·") || withSubtitle!.subtitle!.length > 0);
  });

  it("copies 款式 / 袜筒 axes onto checklist items", () => {
    const infantAdvice = buildCategoryAdvice({
      weather: {
        ...mildWeather,
        temp: 28,
        feelsLike: 30,
        uvIndex: 6,
        text: "晴",
      },
      baby: {
        birthDate: "2026-03-01",
        activityLevel: "low",
        warmthOffset: 0,
      },
      variants,
    });
    const bodysuit = infantAdvice.indoorItems.find((i) =>
      i.category?.startsWith("bodysuit_")
    );
    assert.ok(bodysuit, "infant should get a bodysuit");
    assert.ok(bodysuit.bodysuitStyle, "bodysuit should carry 款式");
    const bodysuitLine = checklistDisplayChips(bodysuit)
      .map((c) => `${c.label} ${c.value}`)
      .join(" · ");
    assert.ok(bodysuitLine.includes("款式"), `expected 款式 chip, got ${bodysuitLine}`);
    assert.ok(!bodysuitLine.includes("版型"), `bodysuit should not show 版型, got ${bodysuitLine}`);

    const socks = [...infantAdvice.indoorItems, ...infantAdvice.outdoorAdditions].find(
      (i) => i.category === "socks"
    );
    if (socks) {
      assert.ok(socks.sockHeight, "socks should carry 袜筒");
      const sockLine = checklistDisplayChips(socks)
        .map((c) => `${c.label} ${c.value}`)
        .join(" · ");
      assert.ok(sockLine.includes("袜筒"), `expected 袜筒 chip, got ${sockLine}`);
    }
  });

  it("sets warmthValue on category checklist items from variant warmth_value", () => {
    const advice = buildCategoryAdvice({
      weather: mildWeather,
      baby: {
        birthDate: "2024-01-01",
        activityLevel: "low",
        warmthOffset: 0,
      },
      variants,
    });
    const categories = advice.indoorItems.filter((i) => i.kind === "category");
    assert.ok(categories.every((i) => typeof i.warmthValue === "number"));
    const withAlt = categories.find((i) => i.alternatives?.length);
    if (withAlt?.alternatives?.[0]?.item) {
      assert.equal(typeof withAlt.alternatives[0].item.warmthValue, "number");
    }
  });

  it("assigns diaper warmth and keeps indoor zone index near requiredWarmth", () => {
    const advice = buildCategoryAdvice({
      weather: {
        temp: 31,
        feelsLike: 34,
        humidity: 70,
        windSpeed: 2,
        pressure: 1013,
        text: "晴",
        precipProbability: 0,
        uvIndex: 8,
      },
      baby: {
        birthDate: "2024-06-01",
        activityLevel: "low",
        warmthOffset: 0,
      },
      variants,
    });
    const diaper = advice.indoorItems.find((i) => i.id === "diaper");
    assert.ok(diaper);
    assert.equal(diaper!.warmthValue, DIAPER_WARMTH_VALUE);
    assert.equal(diaper!.outfitSlot, "diaper");

    const indoor = effectiveChecklistWarmth(advice.indoorItems);
    assert.equal(indoor, zoneTargetWarmth(advice.requiredWarmth, "indoor"));

    const outdoor = effectiveChecklistWarmth(advice.outdoorAdditions);
    if (outdoor != null) {
      assert.equal(outdoor, zoneTargetWarmth(advice.requiredWarmth, "outdoor"));
    }
  });

  it("attaches same-slot alternatives with a one-line swap reason", () => {
    const advice = buildCategoryAdvice({
      weather: mildWeather,
      baby: {
        birthDate: "2024-01-01",
        activityLevel: "high",
        warmthOffset: 0,
        heightCm: 80,
        weightKg: 12,
      },
      variants,
    });
    const swappable = advice.indoorItems.find(
      (i) => i.kind === "category" && (i.alternatives?.length ?? 0) > 0
    );
    assert.ok(swappable, "expected at least one indoor slot with 换一换 alternatives");
    assert.ok((swappable!.alternatives?.length ?? 0) <= 8);
    assert.ok(swappable!.alternatives!.every((alt) => alt.reason.length > 0));
    assert.ok(swappable!.outfitSlot);
  });

  it("shorts slot alternatives include other bottom types, not more shorts", () => {
    const warm: WeatherSnapshot = {
      ...mildWeather,
      temp: 26,
      feelsLike: 27,
      humidity: 55,
      windSpeed: 2,
      uvIndex: 5,
      precipProbability: 5,
      text: "晴",
    };
    const advice = buildCategoryAdvice({
      weather: warm,
      baby: {
        birthDate: "2024-06-01",
        activityLevel: "medium",
        warmthOffset: 0,
      },
      variants,
    });
    const shorts = advice.indoorItems.find((i) => i.category === "pants_short");
    assert.ok(shorts, `expected pants_short on warm day, R=${advice.requiredWarmth}`);
    assert.equal(shorts!.material, "cotton", "checklist type should show cotton when available");
    const altCats = (shorts!.alternatives ?? []).map((a) => a.item.category);
    assert.ok(
      altCats.some((c) => c === "pants_mid" || c === "pants_long"),
      `expected 中裤/长裤 in swap list, got ${altCats.join(",")} (R=${advice.requiredWarmth})`
    );
    assert.ok(
      !altCats.includes("pants_short"),
      `swap list should not offer other 短裤 variants, got ${altCats.join(",")}`
    );
    for (const alt of shorts!.alternatives ?? []) {
      if (alt.item.category === "pants_mid" || alt.item.category === "pants_long") {
        assert.equal(
          alt.item.material,
          "cotton",
          `${alt.item.category} swap row should prefer cotton`
        );
      }
    }
  });

  it("warm-day shorts alternatives include both mid and long pants", () => {
    const warm: WeatherSnapshot = {
      ...mildWeather,
      temp: 24,
      feelsLike: 24,
      humidity: 55,
      windSpeed: 2,
      uvIndex: 4,
      precipProbability: 5,
      text: "晴",
    };
    const advice = buildCategoryAdvice({
      weather: warm,
      baby: {
        birthDate: "2024-06-01",
        activityLevel: "medium",
        warmthOffset: 0,
      },
      variants,
    });
    const shorts = advice.indoorItems.find((i) => i.category === "pants_short");
    assert.ok(shorts, `expected pants_short, R=${advice.requiredWarmth}`);
    const altCats = new Set((shorts!.alternatives ?? []).map((a) => a.item.category));
    assert.ok(altCats.has("pants_mid"), `expected 中裤, got ${[...altCats].join(",")}`);
    assert.ok(altCats.has("pants_long"), `expected 长裤, got ${[...altCats].join(",")}`);
    for (const alt of shorts!.alternatives ?? []) {
      assert.equal(
        alt.item.warmthValue,
        shorts!.warmthValue,
        "alternatives should show the same slot allocation index as the card"
      );
    }
  });

  it("socks slot alternatives group by sock height", () => {
    const warm: WeatherSnapshot = {
      ...mildWeather,
      temp: 26,
      feelsLike: 27,
      humidity: 55,
      windSpeed: 2,
      uvIndex: 5,
      precipProbability: 5,
      text: "晴",
    };
    const advice = buildCategoryAdvice({
      weather: warm,
      baby: {
        birthDate: "2024-06-01",
        activityLevel: "medium",
        warmthOffset: 0,
      },
      variants,
    });
    const socks = advice.indoorItems.find((i) => i.category === "socks");
    assert.ok(socks, `expected socks on warm day, R=${advice.requiredWarmth}`);
    assert.equal(socks!.sockHeight, "mid_calf", "default pick should be 中筒袜");
    const alts = socks!.alternatives ?? [];
    assert.ok(alts.length > 0, "expected sock height swap alternatives");
    assert.ok(alts.length <= 8);

    const primary = alts.filter((a) => a.groupTier === "primary_axis");
    assert.ok(
      primary.some((a) => a.item.sockHeight === "no_show" || a.item.sockHeight === "ankle"),
      `expected other sock heights, got ${primary.map((a) => a.item.sockHeight).join(",")}`
    );
    for (const alt of alts) {
      assert.equal(alt.item.label, "袜子", "card label stays 袜子");
    }

    const groups = socks!.alternativeGroups ?? [];
    assert.ok(groups.some((g) => g.title === "其他筒高"));
  });

  it("prefers mid_calf cotton socks when warmth is tied", () => {
    const rows: VariantSlimRow[] = [
      {
        category_code: "socks",
        warmth_value: 35,
        consumer_label: "袜子",
        sort_order: 0,
        is_active: true,
        material: "cotton",
        sock_height: "no_show",
      },
      {
        category_code: "socks",
        warmth_value: 35,
        consumer_label: "袜子",
        sort_order: 1,
        is_active: true,
        material: "cotton",
        sock_height: "mid_calf",
      },
      {
        category_code: "socks",
        warmth_value: 35,
        consumer_label: "袜子",
        sort_order: 2,
        is_active: true,
        material: "polyester",
        sock_height: "ankle",
      },
    ];
    const picked = pickClosestVariant(rows, ["socks"], 35, {
      preferSockHeight: "mid_calf",
    });
    assert.equal(picked?.sock_height, "mid_calf");
    assert.equal(picked?.material, "cotton");
  });

  it("swap picker copy never repeats 面料/袜筒 chip prefixes", () => {
    const advice = buildCategoryAdvice({
      weather: {
        ...mildWeather,
        temp: 24,
        feelsLike: 24,
        humidity: 55,
        windSpeed: 2,
        uvIndex: 5,
        precipProbability: 5,
        text: "晴",
      },
      baby: {
        birthDate: "2024-06-01",
        activityLevel: "medium",
        warmthOffset: 0,
      },
      variants,
    });
    const items = [...advice.indoorItems, ...advice.outdoorAdditions];
    const swappable = items.filter((i) => (i.alternatives?.length ?? 0) > 0);
    assert.ok(swappable.length > 0, "expected at least one swappable slot");
    for (const item of swappable) {
      const current = describeSwapCurrentRow(item);
      assert.ok(!current.detail?.includes("面料 "), `${item.label} current leaked 面料 prefix`);
      assert.ok(!current.detail?.includes("袜筒"), `${item.label} current leaked 袜筒`);
      for (const alt of item.alternatives ?? []) {
        const row = describeSwapOptionRow(alt, item);
        assert.ok(!row.detail?.includes("面料 "), `${row.title} leaked 面料 prefix`);
        assert.ok(!row.detail?.includes("袜筒"), `${row.title} leaked 袜筒`);
        assert.ok(!row.detail?.includes("同一层"), `${row.title} used generic warmth copy`);
        assert.ok(!row.title.includes("面料 "), `${row.title} used chip syntax as title`);
        assert.notEqual(row.title, "纯棉", "fabric must not be the picker title");
      }
    }
  });

  it("infant base_top swap offers other nearby categories, not 三角款 as the title", () => {
    const advice = buildCategoryAdvice({
      weather: {
        ...mildWeather,
        temp: 18,
        feelsLike: 16,
        humidity: 50,
        windSpeed: 3,
        uvIndex: 3,
        text: "多云",
      },
      baby: {
        birthDate: "2026-05-01",
        activityLevel: "low",
        warmthOffset: 0,
      },
      variants,
    });
    const top = advice.indoorItems.find((i) =>
      i.category?.startsWith("bodysuit_")
    );
    assert.ok(top, "expected an infant bodysuit");
    const current = describeSwapCurrentRow(top!);
    assert.notEqual(current.title, "三角款");
    assert.ok(
      current.title.includes("包屁衣"),
      `current title should stay a garment name, got ${current.title}`
    );
    if (top!.bodysuitStyle === "triangle") {
      assert.ok(current.detail?.includes("三角款"));
    }

    const altCats = new Set((top!.alternatives ?? []).map((a) => a.item.category));
    assert.ok(
      [...altCats].some((c) => c && c !== top!.category),
      `expected a different category than ${top!.category}, got ${[...altCats].join(",")}`
    );
    assert.ok(
      altCats.has("bodysuit_short") ||
        altCats.has("bodysuit_long") ||
        altCats.has("tshirt_short") ||
        altCats.has("tshirt_long") ||
        altCats.has("thermal_top"),
      `expected other base_top types, got ${[...altCats].join(",")}`
    );
    assert.ok(
      !(top!.alternativeGroups ?? []).some((g) => g.title === "其他可选"),
      "cross-category list should not hide under 其他可选"
    );
  });

  it("hat and 防晒衣 have no swap list", () => {
    const advice = buildCategoryAdvice({
      weather: {
        ...mildWeather,
        temp: 28,
        feelsLike: 29,
        uvIndex: 7,
        text: "晴",
      },
      baby: {
        birthDate: "2024-06-01",
        activityLevel: "medium",
        warmthOffset: 0,
      },
      variants,
    });
    const hat = [...advice.indoorItems, ...advice.outdoorAdditions].find(
      (i) => i.category === "hat"
    );
    assert.ok(hat, "expected a hat on a high-UV day");
    assert.equal(hat.alternatives?.length ?? 0, 0, "遮阳帽 has no slot replacement");

    const uv = [...advice.indoorItems, ...advice.outdoorAdditions].find(
      (i) => i.category === "outer_uv"
    );
    if (uv) {
      assert.equal(uv.alternatives?.length ?? 0, 0, "防晒衣 has no slot replacement");
    }
  });

  it("collectSlotSwapCandidates uses variant warmth, not slot pick target", () => {
    const bottomPool = ["pants_short", "pants_mid", "pants_long"] as const;
    const anchor = {
      category_code: "pants_short",
      warmth_value: 25,
    };
    const candidates = collectSlotSwapCandidates(
      variants,
      bottomPool,
      anchor,
      22
    );
    const categories = new Set(candidates.map((v) => v.category_code));
    assert.ok(categories.has("pants_mid"), "expected mid pants near shorts warmth 25");
    assert.ok(categories.has("pants_long"), "expected long pants near shorts warmth 25");
  });

  it("hot weather prefers lighter base_top variants", () => {
    const hot: WeatherSnapshot = {
      ...mildWeather,
      temp: 32,
      feelsLike: 34,
      uvIndex: 8,
      precipProbability: 5,
    };
    const advice = buildCategoryAdvice({
      weather: hot,
      baby: {
        birthDate: "2025-06-01",
        activityLevel: "low",
        warmthOffset: 0,
      },
      variants,
    });

    const tops = advice.indoorItems.filter(
      (i) =>
        i.category === "bodysuit_short" ||
        i.category === "bodysuit_long" ||
        i.category === "tshirt_short" ||
        i.category === "tshirt_long"
    );
    assert.ok(tops.length >= 1);
    assert.ok(
      tops.some((t) => t.category === "bodysuit_short" || t.category === "tshirt_short"),
      `expected short-sleeve for hot weather, got ${tops.map((t) => t.category).join(",")}`
    );
  });

  it("summer weather does not recommend long sleeves or fleece hats", () => {
    const summerCases: Array<{
      name: string;
      weather: WeatherSnapshot;
      birthDate: string;
    }> = [
      {
        name: "hot August + toddler",
        weather: {
          ...mildWeather,
          temp: 31,
          feelsLike: 34,
          humidity: 72,
          windSpeed: 3.2,
          uvIndex: 8,
          precipProbability: 5,
          text: "晴",
        },
        birthDate: "2025-06-01",
      },
      {
        name: "hot humid + newborn",
        weather: {
          ...mildWeather,
          temp: 32,
          feelsLike: 34,
          humidity: 88,
          windSpeed: 6.5,
          uvIndex: 9,
          precipProbability: 40,
          text: "多云",
        },
        birthDate: "2026-07-01",
      },
      {
        name: "warm summer morning + infant",
        weather: {
          ...mildWeather,
          temp: 26,
          feelsLike: 28,
          humidity: 80,
          windSpeed: 2,
          uvIndex: 7,
          precipProbability: 10,
          text: "晴",
        },
        birthDate: "2026-03-01",
      },
    ];

    for (const { name, weather, birthDate } of summerCases) {
      const advice = buildCategoryAdvice({
        weather,
        baby: { birthDate, activityLevel: "low", warmthOffset: 0 },
        variants,
      });
      const checklist = [...advice.indoorItems, ...advice.outdoorAdditions];
      const text = adviceItemText(checklist);
      const longSleeves = checklist.filter(
        (i) => i.category === "bodysuit_long" || i.category === "tshirt_long"
      );
      const hats = checklist.filter((i) => i.category === "hat");

      assert.equal(
        longSleeves.length,
        0,
        `${name}: summer should not pick long sleeves (warmth ${advice.requiredWarmth}): ${text}`
      );
      assert.ok(
        checklist.some(
          (i) => i.category === "bodysuit_short" || i.category === "tshirt_short"
        ),
        `${name}: expected a short-sleeve top, got ${text}`
      );
      assert.ok(
        hats.every((h) => !(h.subtitle ?? "").includes("抓绒") && !h.label.includes("抓绒")),
        `${name}: summer hat should not be fleece (warmth ${advice.requiredWarmth}): ${text}`
      );
      assert.ok(
        hats.some((h) => h.label === "遮阳帽"),
        `${name}: high-UV summer should recommend 遮阳帽, got ${text}`
      );
    }
  });

  it("high UV outdoor hat is 遮阳帽 with Sun Hat English", () => {
    const advice = buildCategoryAdvice({
      weather: {
        ...mildWeather,
        temp: 31,
        feelsLike: 34,
        uvIndex: 8,
        text: "晴",
      },
      baby: {
        birthDate: "2025-06-01",
        activityLevel: "low",
        warmthOffset: 0,
      },
      variants,
    });
    const hat = [...advice.indoorItems, ...advice.outdoorAdditions].find(
      (i) => i.category === "hat"
    );
    assert.ok(hat, `expected a hat on high-UV day: ${adviceItemText(advice.outdoorAdditions)}`);
    assert.equal(hat.label, "遮阳帽");
    assert.equal(hat.labelEn, "Sun Hat");
    assert.deepEqual(
      checklistDisplayChips(hat),
      [],
      "sun hat is functional — no 面料/版型 chips"
    );
  });

  it("still shows 遮阳帽 when DB labels are generic 帽子", () => {
    const legacyHats: VariantSlimRow[] = [
      {
        category_code: "hat",
        warmth_value: 19,
        consumer_label: "帽子",
        sort_order: 1,
        is_active: true,
        material: "polyester",
        thickness: "thin",
      },
      {
        category_code: "hat",
        warmth_value: 41,
        consumer_label: "帽子",
        sort_order: 2,
        is_active: true,
        material: "fleece",
        thickness: "medium",
      },
    ];
    const advice = buildCategoryAdvice({
      weather: {
        ...mildWeather,
        temp: 31,
        feelsLike: 34,
        uvIndex: 8,
        text: "晴",
      },
      baby: {
        birthDate: "2025-06-01",
        activityLevel: "low",
        warmthOffset: 0,
      },
      variants: legacyHats,
    });
    const hat = advice.outdoorAdditions.find((i) => i.category === "hat");
    assert.ok(hat);
    assert.equal(hat.label, "遮阳帽");
    assert.equal(hat.labelEn, "Sun Hat");
  });

  it("cold weather picks warmer outer from outer pool", () => {
    const cold: WeatherSnapshot = {
      ...mildWeather,
      temp: -2,
      feelsLike: -5,
      windSpeed: 4,
      uvIndex: 1,
      text: "晴",
    };
    const advice = buildCategoryAdvice({
      weather: cold,
      baby: {
        birthDate: "2024-01-01",
        activityLevel: "low",
        warmthOffset: 0,
      },
      variants,
    });

    const outers = advice.outdoorAdditions.filter((i) =>
      i.category?.startsWith("outer_")
    );
    assert.ok(outers.length >= 1);
    assert.ok(
      outers.some((o) => o.category === "outer_down" || o.category === "outer_cotton"),
      `expected warm outer, got ${outers.map((o) => o.category).join(",")}`
    );
    assert.ok(outers.some((o) => Boolean(o.subtitle)));
  });

  it("falls back to legacy bands when variants empty", () => {
    const advice = buildCategoryAdvice({
      weather: mildWeather,
      baby: {
        birthDate: "2024-01-01",
        activityLevel: "low",
        warmthOffset: 0,
      },
      variants: [],
    });
    const cats = advice.indoorItems.filter((i) => i.kind === "category");
    assert.ok(cats.length >= 1);
    assert.ok(cats.every((c) => c.label.length > 0));
  });
});

describe("isBriefAdviceCurrent schemaVersion", () => {
  it("rejects advice without current schemaVersion", () => {
    assert.equal(
      isBriefAdviceCurrent({
        babyAgeMonths: 12,
        current: {
          indoorItems: [],
          outdoorAdditions: [],
          extras: [],
          tags: [],
          requiredWarmth: 40,
        },
      }),
      false
    );
  });

  it("accepts advice with current schemaVersion", () => {
    assert.equal(
      isBriefAdviceCurrent({
        babyAgeMonths: 12,
        schemaVersion: BRIEF_ADVICE_SCHEMA_VERSION,
        current: {
          indoorItems: [],
          outdoorAdditions: [],
          extras: [],
          tags: [],
          requiredWarmth: 40,
          schemaVersion: BRIEF_ADVICE_SCHEMA_VERSION,
        },
      }),
      true
    );
  });
});
