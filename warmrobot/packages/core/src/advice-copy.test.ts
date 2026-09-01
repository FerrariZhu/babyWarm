/**
 * Table-driven tests for §2.2 grounded advice conclusion copy.
 * Run: npm run test -w packages/core
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ADVICE_COPY,
  formatAdviceConclusion,
  formatAdviceConclusionBlocks,
  formatAgePhrase,
  heatFromRequiredWarmth,
  rainFromWeather,
  umbrellaReasonFromRain,
  uvIntensityLabel,
  weatherFactorPhrases,
  weatherSummarySentence,
  type HeatSlot,
} from "./advice-copy";
import { buildBriefAdvice, buildCategoryAdvice } from "./category-advice";
import { generateGarmentVariants } from "./garment-variant-generator";
import type { AdviceItem } from "./daily-brief-types";
import type { WeatherSnapshot } from "./types";
import { DIAPER_OPTIONAL_AGE_MONTHS } from "./warmth-thresholds";

function weather(partial: Partial<WeatherSnapshot>): WeatherSnapshot {
  return {
    temp: 25,
    feelsLike: 25,
    humidity: 50,
    windSpeed: 3,
    pressure: 1013,
    text: "晴",
    ...partial,
  };
}

const indoorHot: AdviceItem[] = [
  { kind: "tip", id: "diaper", label: "尿布" },
  {
    kind: "category",
    id: "cat:tshirt_short",
    label: "T恤",
    category: "tshirt_short",
    outfitSlot: "base_top",
    material: "cotton",
  },
  {
    kind: "category",
    id: "cat:pants_short",
    label: "短裤",
    category: "pants_short",
    outfitSlot: "bottom",
    thickness: "thin",
  },
  {
    kind: "category",
    id: "cat:socks",
    label: "薄袜子",
    category: "socks",
    outfitSlot: "socks",
  },
];

const outdoorUv: AdviceItem[] = [
  {
    kind: "category",
    id: "cat:hat",
    label: "遮阳帽",
    category: "hat",
    outfitSlot: "hat",
  },
  {
    kind: "category",
    id: "cat:outer_uv",
    label: "防晒衣",
    category: "outer_uv",
    outfitSlot: "outer",
  },
];

const indoorWinter: AdviceItem[] = [
  { kind: "tip", id: "diaper", label: "尿布" },
  {
    kind: "category",
    id: "cat:thermal_top",
    label: "秋衣",
    category: "thermal_top",
    outfitSlot: "base_top",
  },
  {
    kind: "category",
    id: "cat:sweater",
    label: "毛衣",
    category: "sweater",
    outfitSlot: "mid_top",
  },
  {
    kind: "category",
    id: "cat:long_johns",
    label: "秋裤",
    category: "long_johns",
    outfitSlot: "base_bottom",
  },
  {
    kind: "category",
    id: "cat:pants_long",
    label: "长裤",
    category: "pants_long",
    outfitSlot: "bottom",
  },
];

const outdoorWinter: AdviceItem[] = [
  {
    kind: "category",
    id: "cat:outer_down",
    label: "羽绒服",
    category: "outer_down",
    outfitSlot: "outer",
  },
  {
    kind: "category",
    id: "cat:hat",
    label: "保暖帽",
    category: "hat",
    outfitSlot: "hat",
  },
];

describe("heatFromRequiredWarmth", () => {
  const cases: Array<[number, HeatSlot]> = [
    [10, "hot"],
    [25, "warm"],
    [40, "mild"],
    [55, "cool"],
    [70, "cold"],
    [85, "freezing"],
  ];
  for (const [warmth, expected] of cases) {
    it(`warmth ${warmth} → ${expected}`, () => {
      assert.equal(heatFromRequiredWarmth(warmth), expected);
    });
  }
});

describe("formatAgePhrase", () => {
  it("formats months / years", () => {
    assert.equal(formatAgePhrase(8), "8 个月");
    assert.equal(formatAgePhrase(12), "1 岁");
    assert.equal(formatAgePhrase(18), "1 岁 6 个月");
    assert.equal(formatAgePhrase(36), "3 岁");
  });
});

describe("uvIntensityLabel", () => {
  it("maps WHO-ish bands", () => {
    assert.equal(uvIntensityLabel(0), null);
    assert.equal(uvIntensityLabel(2), null);
    assert.equal(uvIntensityLabel(3), "紫外线中等强度");
    assert.equal(uvIntensityLabel(5), "紫外线中等强度");
    assert.equal(uvIntensityLabel(6), "紫外线较强");
    assert.equal(uvIntensityLabel(8), "紫外线很强");
  });
});

describe("weatherFactorPhrases (weather module helpers)", () => {
  it("humidity high + feels hot, max 2", () => {
    const phrases = weatherFactorPhrases(
      weather({ temp: 27, feelsLike: 33, humidity: 92, windSpeed: 7.2 })
    );
    assert.deepEqual(phrases, ["湿度大", "体感偏热"]);
  });
});

describe("weatherSummarySentence", () => {
  it("includes condition, temp, and up to 2 factors", () => {
    assert.equal(
      weatherSummarySentence(
        weather({ temp: 27, feelsLike: 33, humidity: 92, windSpeed: 7.2, text: "多云" })
      ),
      "今天多云，气温 27°C，湿度大、体感偏热。"
    );
    assert.equal(
      weatherSummarySentence(weather({ temp: 28, feelsLike: 28, text: "晴" })),
      "今天晴天，气温 28°C。"
    );
    assert.equal(
      weatherSummarySentence(weather({ temp: 14, feelsLike: 14, text: "阵雨" })),
      "今天阵雨，气温 14°C。"
    );
  });
});

describe("formatAdviceConclusion §2.2 grounded prompt", () => {
  it("doc fill sample: 3yo summer + moderate UV + likely rain", () => {
    const input = {
      weather: weather({
        temp: 28,
        feelsLike: 30,
        humidity: 60,
        windSpeed: 3,
        uvIndex: 4,
        precipProbability: 60,
        text: "多云",
      }),
      requiredWarmth: 18,
      ageMonths: 36,
      indoorItems: indoorHot.filter((i) => i.id !== "diaper"),
      outdoorAdditions: outdoorUv,
    };
    const text = formatAdviceConclusion(input);
    const blocks = formatAdviceConclusionBlocks(input);
    assert.equal(
      text,
      "今天多云，气温 28°C。小朋友已经 3 岁了，尿布可以不穿。上身穿一件轻薄纯棉T恤，下身搭条轻薄透气的短裤就可以啦。紫外线中等强度，出门可以佩戴遮阳帽、防晒衣做好防晒工作。预计有雨，可以携带雨具。"
    );
    assert.equal(blocks.length, 5);
    assert.equal(blocks[0]?.kind, "weather");
    assert.equal(blocks[2]?.kind, "wear");
    assert.equal(blocks[2]?.lines.length, 2);
    assert.ok(!text.includes("穿衣指数"));
    assert.ok(!text.includes("保暖指数"));
    assert.ok(!text.includes("建议值"));
  });

  it("skips diaper sentence when profile says no diaper", () => {
    const text = formatAdviceConclusion({
      weather: weather({
        temp: 28,
        feelsLike: 30,
        humidity: 60,
        windSpeed: 3,
        text: "多云",
      }),
      requiredWarmth: 18,
      ageMonths: 38,
      wearsDiaper: false,
      indoorItems: indoorHot.filter((i) => i.id !== "diaper"),
      outdoorAdditions: [],
    });
    assert.ok(!text.includes("尿布"));
  });

  it("young baby diaper + strong UV raining", () => {
    const text = formatAdviceConclusion({
      weather: weather({
        temp: 31,
        feelsLike: 34,
        humidity: 72,
        windSpeed: 3.2,
        uvIndex: 8,
        precipProbability: 60,
        text: "阵雨",
      }),
      requiredWarmth: 20,
      ageMonths: 10,
      indoorItems: [
        { kind: "tip", id: "diaper", label: "尿布" },
        {
          kind: "category",
          id: "cat:bodysuit_short",
          label: "包屁衣",
          category: "bodysuit_short",
          outfitSlot: "base_top",
          material: "cotton",
        },
        {
          kind: "category",
          id: "cat:socks",
          label: "薄袜子",
          category: "socks",
          outfitSlot: "socks",
        },
      ],
      outdoorAdditions: outdoorUv,
    });
    assert.ok(text.startsWith("今天阵雨，气温 31°C，体感偏热。"));
    assert.ok(text.includes("小朋友才 10 个月，建议穿尿布。"));
    assert.ok(text.includes("穿一件轻薄纯棉包屁衣"));
    assert.ok(!text.includes("上身穿一件"));
    assert.ok(text.includes("脚上穿一双薄袜子就可以啦"));
    assert.ok(!text.includes("袜子穿"));
    assert.ok(text.includes("紫外线很强，出门可以佩戴遮阳帽、防晒衣做好防晒工作。"));
    assert.ok(text.includes("外面在下雨，可以携带雨具。"));
    assert.ok(!text.includes("穿衣指数"));
  });

  it("hot bodysuit + generic 袜子 does not say 袜子穿袜子", () => {
    const input = {
      weather: weather({
        temp: 29,
        feelsLike: 29,
        humidity: 55,
        windSpeed: 7,
        text: "阴",
      }),
      requiredWarmth: 22,
      ageMonths: 4,
      indoorItems: [
        { kind: "tip" as const, id: "diaper", label: "尿布" },
        {
          kind: "category" as const,
          id: "cat:bodysuit_short",
          label: "包屁衣",
          category: "bodysuit_short" as const,
          outfitSlot: "base_top",
          material: "cotton" as const,
        },
        {
          kind: "category" as const,
          id: "cat:socks",
          label: "袜子",
          category: "socks" as const,
          outfitSlot: "socks",
        },
      ],
      outdoorAdditions: [] as AdviceItem[],
    };
    const text = formatAdviceConclusion(input);
    const blocks = formatAdviceConclusionBlocks(input);
    const wear = blocks.find((b) => b.kind === "wear");
    assert.ok(text.includes("小朋友才 4 个月，建议穿尿布。"));
    assert.equal(wear?.lines[0], "穿一件轻薄纯棉包屁衣");
    assert.equal(wear?.lines[1], "脚上穿一双袜子就可以啦。");
    assert.ok(!text.includes("袜子穿袜子"));
    assert.ok(!text.includes("袜子穿"));
    assert.ok(!text.includes("上身穿"));
  });

  it("winter onion layering + warm accessories", () => {
    const text = formatAdviceConclusion({
      weather: weather({
        temp: -2,
        feelsLike: -5,
        humidity: 40,
        windSpeed: 4,
        uvIndex: 1,
        precipProbability: 0,
        text: "晴",
      }),
      requiredWarmth: 80,
      ageMonths: 12,
      indoorItems: indoorWinter,
      outdoorAdditions: outdoorWinter,
    });
    assert.ok(text.startsWith("今天晴天，气温 -2°C，体感偏凉。"));
    assert.ok(text.includes("小朋友才 1 岁，建议穿尿布。"));
    assert.ok(text.includes("最里面穿贴身纯棉的秋衣"));
    assert.ok(text.includes("外面加一件毛衣"));
    assert.ok(text.includes("外套建议穿羽绒服"));
    assert.ok(text.includes("下身穿贴身纯棉秋裤加长裤就可以啦"));
    assert.ok(!text.includes("袜子穿"));
    assert.ok(text.includes("出门记得戴上保暖帽。"));
    assert.ok(!text.includes("内上"));
    assert.ok(!text.includes("中上"));
    assert.ok(!text.includes("按洋葱穿衣法"));
    assert.ok(!text.includes("紫外线"));
  });

  it("transition season names 内上/外上 without forcing onion header", () => {
    const text = formatAdviceConclusion({
      weather: weather({
        temp: 16,
        feelsLike: 14,
        humidity: 55,
        windSpeed: 3,
        uvIndex: 2,
        precipProbability: 10,
        text: "阴",
      }),
      requiredWarmth: 50,
      ageMonths: 24,
      indoorItems: [
        {
          kind: "category",
          id: "cat:tshirt_long",
          label: "长袖 T 恤",
          category: "tshirt_long",
          outfitSlot: "base_top",
          material: "cotton",
        },
        {
          kind: "category",
          id: "cat:pants_long",
          label: "长裤",
          category: "pants_long",
          outfitSlot: "bottom",
        },
      ],
      outdoorAdditions: [
        {
          kind: "category",
          id: "cat:outer_shell",
          label: "春秋外套",
          category: "outer_shell",
          outfitSlot: "outer",
        },
      ],
    });
    assert.ok(text.includes("最里面穿纯棉长袖T恤") || text.includes("最里面穿纯棉长袖 T 恤"));
    assert.ok(text.includes("外套建议穿春秋外套"));
    assert.ok(text.includes("裤子穿长裤就行"));
    assert.ok(!text.includes("内上"));
  });

  it("winter socks uses 脚上再穿一双, not 袜子穿厚袜子", () => {
    const text = formatAdviceConclusion({
      weather: weather({
        temp: -2,
        feelsLike: -5,
        humidity: 40,
        windSpeed: 4,
        text: "晴",
      }),
      requiredWarmth: 80,
      ageMonths: 12,
      indoorItems: [
        ...indoorWinter,
        {
          kind: "category",
          id: "cat:socks",
          label: "厚袜子",
          category: "socks",
          outfitSlot: "socks",
        },
      ],
      outdoorAdditions: outdoorWinter,
    });
    assert.ok(text.includes("脚上再穿一双厚袜子。"));
    assert.ok(!text.includes("袜子穿"));
  });

  it("winter without base_bottom does not say 下身裤子穿裤子", () => {
    const text = formatAdviceConclusion({
      weather: weather({ temp: -1, feelsLike: -4, text: "阴" }),
      requiredWarmth: 75,
      ageMonths: 18,
      indoorItems: [
        {
          kind: "category",
          id: "cat:thermal_top",
          label: "秋衣",
          category: "thermal_top",
          outfitSlot: "base_top",
        },
        {
          kind: "category",
          id: "cat:pants_long",
          label: "裤子",
          category: "pants_long",
          outfitSlot: "bottom",
        },
      ],
      outdoorAdditions: [
        {
          kind: "category",
          id: "cat:outer_down",
          label: "羽绒服",
          category: "outer_down",
          outfitSlot: "outer",
        },
      ],
    });
    assert.ok(text.includes("下身穿裤子就行。"));
    assert.ok(!text.includes("下身裤子穿"));
    assert.ok(!text.includes("裤子穿裤子"));
  });

  it("outer label 外套 does not become 外套建议穿外套", () => {
    const text = formatAdviceConclusion({
      weather: weather({ temp: 16, feelsLike: 14, text: "阴" }),
      requiredWarmth: 50,
      ageMonths: 24,
      indoorItems: [
        {
          kind: "category",
          id: "cat:tshirt_long",
          label: "长袖T恤",
          category: "tshirt_long",
          outfitSlot: "base_top",
          material: "cotton",
        },
        {
          kind: "category",
          id: "cat:pants_long",
          label: "长裤",
          category: "pants_long",
          outfitSlot: "bottom",
        },
      ],
      outdoorAdditions: [
        {
          kind: "category",
          id: "cat:outer_generic",
          label: "外套",
          outfitSlot: "outer",
        },
      ],
    });
    assert.ok(text.includes("外套建议穿春秋外套"));
    assert.ok(!text.includes("外套建议穿外套"));
  });
});

describe("rain / umbrella", () => {
  it("rainFromWeather", () => {
    assert.equal(rainFromWeather(weather({ text: "阵雨" })), "raining");
    assert.equal(
      rainFromWeather(weather({ text: "多云", precipProbability: 60 })),
      "likely"
    );
    assert.equal(
      rainFromWeather(weather({ text: "晴", precipProbability: 10 })),
      "none"
    );
  });

  it("umbrella reasons align with 雨具 copy", () => {
    assert.equal(umbrellaReasonFromRain("raining"), "外面在下雨，可以携带雨具。");
    assert.equal(umbrellaReasonFromRain("likely"), "预计有雨，可以携带雨具。");
  });
});

describe("buildCategoryAdvice diaper age gate", () => {
  it(`omits diaper tip at ${DIAPER_OPTIONAL_AGE_MONTHS}+ months`, () => {
    const noDiaper = buildCategoryAdvice({
      weather: weather({ temp: 28, feelsLike: 28, humidity: 50, windSpeed: 3 }),
      baby: {
        birthDate: "2022-01-01",
        activityLevel: "medium",
        warmthOffset: 0,
      },
    });
    assert.ok(!noDiaper.indoorItems.some((i) => i.id === "diaper"));
    assert.ok(noDiaper.reason?.includes("尿布可以不穿"));
  });

  it("keeps diaper tip for infants", () => {
    const advice = buildCategoryAdvice({
      weather: weather({ temp: 28, feelsLike: 28, humidity: 50, windSpeed: 3 }),
      baby: {
        birthDate: "2026-01-01",
        activityLevel: "medium",
        warmthOffset: 0,
      },
    });
    assert.ok(advice.indoorItems.some((i) => i.id === "diaper"));
    assert.ok(advice.reason?.includes("建议穿尿布"));
  });

  it("respects profile off diaper at any age", () => {
    const advice = buildCategoryAdvice({
      weather: weather({ temp: 28, feelsLike: 28, humidity: 50, windSpeed: 3 }),
      baby: {
        birthDate: "2022-01-01",
        activityLevel: "medium",
        warmthOffset: 0,
        wearsDiaper: false,
      },
    });
    assert.ok(!advice.indoorItems.some((i) => i.id === "diaper"));
    assert.ok(!advice.reason?.includes("尿布"));
  });
});

describe("buildBriefAdvice integration", () => {
  it("reason follows grounded prompt (no 穿衣指数 jargon)", () => {
    const brief = buildBriefAdvice({
      weather: weather({
        temp: 27,
        feelsLike: 33,
        humidity: 92,
        windSpeed: 7.2,
        uvIndex: 0,
        precipProbability: 3,
        text: "多云",
      }),
      baby: {
        birthDate: "2023-06-20",
        activityLevel: "medium",
        warmthOffset: 0,
      },
    });
    assert.ok(brief.current.reason);
    assert.ok(brief.current.reason!.startsWith("今天"));
    assert.ok(brief.current.reason!.includes("气温"));
    assert.ok(!brief.current.reason!.includes("穿衣指数"));
    assert.ok(!brief.current.reason!.includes("保暖指数"));
    assert.ok(!brief.current.reason!.includes("建议值"));
    assert.ok(
      brief.current.reason!.includes("上身穿一件") ||
        brief.current.reason!.includes("穿一件") ||
        brief.current.reason!.includes("最里面穿") ||
        brief.current.reason!.includes("外套建议穿")
    );
    assert.ok(!brief.current.reason!.includes("袜子穿"));
    assert.equal(ADVICE_COPY.blockTitleNow, "穿搭建议");
    assert.equal(ADVICE_COPY.checklistTitle, "穿搭清单");
  });

  it("reason only names garments that appear on the checklist", () => {
    const variants = generateGarmentVariants()
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
      }));
    const brief = buildBriefAdvice({
      weather: weather({
        temp: 31,
        feelsLike: 34,
        humidity: 72,
        windSpeed: 3.2,
        uvIndex: 8,
        precipProbability: 5,
        text: "晴",
      }),
      baby: {
        birthDate: "2024-06-01",
        activityLevel: "low",
        warmthOffset: 0,
      },
      variants,
    });
    const current = brief.current;
    const labels = [...current.indoorItems, ...current.outdoorAdditions]
      .filter((i) => i.kind === "category")
      .map((i) => i.label);
    assert.ok(current.reason);
    for (const label of labels) {
      // UV / wear sentences should reference checklist card labels when present
      if (label === "遮阳帽" || label === "防晒衣") {
        assert.ok(
          current.reason!.includes(label),
          `expected ${label} in reason: ${current.reason}`
        );
      }
    }
  });

  it("4-month infant at 29°C with variants does not say 袜子穿袜子", () => {
    const variants = generateGarmentVariants()
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
      }));
    const brief = buildBriefAdvice({
      weather: weather({
        temp: 29,
        feelsLike: 29,
        humidity: 55,
        windSpeed: 7,
        uvIndex: 0,
        precipProbability: 0,
        text: "阴",
      }),
      baby: {
        birthDate: "2026-05-01",
        activityLevel: "medium",
        warmthOffset: 0,
      },
      variants,
    });
    const reason = brief.current.reason ?? "";
    const hasBodysuit = [...brief.current.indoorItems].some(
      (i) => i.category === "bodysuit_short" || i.category === "bodysuit_long"
    );
    const hasSocks = [...brief.current.indoorItems].some((i) => i.category === "socks");
    assert.ok(!reason.includes("袜子穿袜子"), reason);
    assert.ok(!reason.includes("袜子穿"), reason);
    if (hasBodysuit) {
      assert.ok(reason.includes("穿一件"), reason);
      assert.ok(!reason.includes("上身穿一件"), reason);
    }
    if (hasSocks) {
      assert.ok(reason.includes("脚上穿一双"), reason);
    }
  });
});
