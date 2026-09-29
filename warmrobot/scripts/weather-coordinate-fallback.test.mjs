import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../packages/core/src/weather.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function loadWeather(env) {
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, process: { env }, URL, Date, AbortSignal,
  });
  return exports;
}

test("反查地址失败时仍按设备坐标返回天气", async () => {
  const weather = loadWeather({ NOMINATIM_REVERSE_URL: "https://geo.example/reverse" });
  const called = [];
  const fetchImpl = async (input) => {
    const url = new URL(input);
    called.push(url.host);
    if (url.host === "geo.example") throw new Error("geocoder unavailable");
    assert.equal(url.searchParams.get("latitude"), "31.2");
    assert.equal(url.searchParams.get("longitude"), "121.5");
    return {
      ok: true,
      json: async () => ({ current: {
        temperature_2m: 22, apparent_temperature: 21,
        relative_humidity_2m: 64, wind_speed_10m: 2,
        surface_pressure: 1012, weather_code: 0,
      } }),
    };
  };
  const result = await weather.fetchWeather({ latitude: 31.2, longitude: 121.5 }, fetchImpl);
  assert.equal(result.temp, 22);
  assert.equal(result.location.name, "当前位置");
  assert.ok(called.includes("api.open-meteo.com"));
});

test("商业 API Key 仅发送至 Open-Meteo 客户端域名", async () => {
  const weather = loadWeather({ OPEN_METEO_API_KEY: "test-key" });
  const fetchImpl = async (input) => {
    const url = new URL(input);
    assert.equal(url.host, "customer-api.open-meteo.com");
    assert.equal(url.searchParams.get("apikey"), "test-key");
    return {
      ok: true,
      json: async () => ({ current: {
        temperature_2m: 18, apparent_temperature: 17,
        relative_humidity_2m: 70, wind_speed_10m: 3,
        surface_pressure: 1013, weather_code: 3,
      } }),
    };
  };
  const result = await weather.fetchWeather({ latitude: 30, longitude: 120 }, fetchImpl);
  assert.equal(result.text, "阴");
});

test("天气服务短暂连接失败后按原坐标重试", async () => {
  const weather = loadWeather({});
  const calls = [];
  const fetchImpl = async (input) => {
    calls.push(input);
    if (calls.length === 1) throw new Error("fetch failed");
    return {
      ok: true,
      status: 200,
      json: async () => ({ current: {
        temperature_2m: 20, apparent_temperature: 19,
        relative_humidity_2m: 60, wind_speed_10m: 2,
        surface_pressure: 1012, weather_code: 0,
      } }),
    };
  };
  const result = await weather.fetchWeatherByCoords(39.9, 116.4, fetchImpl);
  assert.equal(result.temp, 20);
  assert.equal(calls.length, 2);
  assert.equal(calls[0], calls[1]);
});
