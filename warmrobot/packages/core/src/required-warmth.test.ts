/**
 * Tests for required-warmth scoring, especially summer heat stacking.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calcRequiredWarmth } from "./required-warmth";
import type { WeatherSnapshot } from "./types";

const baseWeather: WeatherSnapshot = {
  temp: 22,
  feelsLike: 22,
  humidity: 55,
  windSpeed: 2,
  pressure: 1013,
  uvIndex: 3,
  text: "多云",
  precipProbability: 10,
};

const toddler = {
  birthDate: "2025-06-01",
  activityLevel: "low" as const,
  warmthOffset: 0,
};

const newborn = {
  birthDate: "2026-07-01",
  activityLevel: "low" as const,
  warmthOffset: 0,
};

describe("calcRequiredWarmth summer stacking", () => {
  it("does not add humidity/wind/rain warmth when it is already hot", () => {
    const hotHumidWindy: WeatherSnapshot = {
      ...baseWeather,
      temp: 32,
      feelsLike: 34,
      humidity: 90,
      windSpeed: 7,
      precipProbability: 60,
      text: "雷阵雨",
    };
    const score = calcRequiredWarmth({
      weather: hotHumidWindy,
      baby: newborn,
      scenario: "outdoor",
      timeSlot: "morning",
    });
    assert.ok(
      score < 25,
      `hot humid windy day must stay in the hot short-sleeve band, got ${score}`
    );
    assert.equal(score, 20);
  });

  it("still adds extra warmth for newborns when it is cold", () => {
    const cold: WeatherSnapshot = {
      ...baseWeather,
      temp: 4,
      feelsLike: 2,
      humidity: 50,
      windSpeed: 2,
    };
    const newbornScore = calcRequiredWarmth({
      weather: cold,
      baby: newborn,
      scenario: "outdoor",
      timeSlot: "morning",
    });
    const toddlerScore = calcRequiredWarmth({
      weather: cold,
      baby: toddler,
      scenario: "outdoor",
      timeSlot: "morning",
    });
    assert.ok(
      newbornScore > toddlerScore,
      `newborn should dress warmer in the cold (${newbornScore} vs ${toddlerScore})`
    );
  });

  it("still adds humidity and wind warmth when it is cold", () => {
    const coldDamp: WeatherSnapshot = {
      ...baseWeather,
      temp: 4,
      feelsLike: 2,
      humidity: 90,
      windSpeed: 6,
      precipProbability: 60,
      text: "雨",
    };
    const dryCalm: WeatherSnapshot = {
      ...coldDamp,
      humidity: 50,
      windSpeed: 2,
      precipProbability: 10,
    };
    const dampScore = calcRequiredWarmth({
      weather: coldDamp,
      baby: toddler,
      scenario: "outdoor",
      timeSlot: "morning",
    });
    const dryScore = calcRequiredWarmth({
      weather: dryCalm,
      baby: toddler,
      scenario: "outdoor",
      timeSlot: "morning",
    });
    assert.ok(
      dampScore > dryScore,
      `cold damp/windy should need more warmth (${dampScore} vs ${dryScore})`
    );
  });
});
