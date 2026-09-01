/**
 * Place search, hour-key matching, and hourly snapshot selection.
 * Run: npm run test -w packages/core
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatPlaceSubtitle,
  hourKeyFromIso,
  searchPlaces,
  snapshotFromHourly,
  type HourlyWeatherSeries,
} from "./weather";

function hourly(partial?: Partial<HourlyWeatherSeries>): HourlyWeatherSeries {
  return {
    time: ["2026-08-27T13:00", "2026-08-27T14:00", "2026-08-27T15:00"],
    temperature_2m: [28, 31, 30],
    apparent_temperature: [30, 34, 32],
    relative_humidity_2m: [70, 72, 74],
    wind_speed_10m: [2, 3.2, 4],
    surface_pressure: [1012, 1011, 1010],
    weather_code: [0, 61, 2],
    precipitation_probability: [10, 60, 20],
    uv_index: [5, 8, 6],
    ...partial,
  };
}

describe("hourKeyFromIso", () => {
  it("strips minutes from local ISO", () => {
    assert.equal(hourKeyFromIso("2026-08-27T14:00"), "2026-08-27T14");
    assert.equal(hourKeyFromIso("2026-08-27T14"), "2026-08-27T14");
  });

  it("rejects junk", () => {
    assert.equal(hourKeyFromIso("tomorrow"), null);
    assert.equal(hourKeyFromIso(""), null);
  });
});

describe("snapshotFromHourly", () => {
  it("picks the matching hour and maps rain/UV", () => {
    const snap = snapshotFromHourly(hourly(), "2026-08-27T14");
    assert.ok(snap);
    assert.equal(snap.temp, 31);
    assert.equal(snap.feelsLike, 34);
    assert.equal(snap.text, "小雨");
    assert.equal(snap.precipProbability, 60);
    assert.equal(snap.uvIndex, 8);
    assert.equal(snap.observedAt, "2026-08-27T14:00");
  });

  it("returns null when the hour is missing", () => {
    assert.equal(snapshotFromHourly(hourly(), "2026-08-28T09"), null);
  });
});

describe("formatPlaceSubtitle", () => {
  it("joins admin2 / admin1 / country and skips the place name", () => {
    assert.equal(
      formatPlaceSubtitle({
        name: "南翔",
        admin2: "嘉定区",
        admin1: "上海市",
        country: "中国",
      }),
      "嘉定区 · 上海市 · 中国"
    );
  });
});

describe("searchPlaces", () => {
  it("returns [] for blank query without fetching", async () => {
    const hits = await searchPlaces("  ", {}, async () => {
      throw new Error("should not fetch");
    });
    assert.deepEqual(hits, []);
  });

  it("maps Open-Meteo hits into list rows", async () => {
    const hits = await searchPlaces("南翔", { count: 8 }, async (input) => {
      const url = String(input);
      assert.match(url, /name=%E5%8D%97%E7%BF%94/);
      assert.match(url, /count=8/);
      return new Response(
        JSON.stringify({
          results: [
            {
              name: "南翔",
              latitude: 31.3,
              longitude: 121.3,
              admin1: "上海市",
              admin2: "嘉定区",
              country: "中国",
            },
          ],
        }),
        { status: 200 }
      );
    });

    assert.equal(hits.length, 1);
    assert.equal(hits[0].name, "南翔");
    assert.equal(hits[0].subtitle, "嘉定区 · 上海市 · 中国");
    assert.equal(hits[0].latitude, 31.3);
  });
});
