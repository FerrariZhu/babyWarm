import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isValidBabyBirthDate, isValidBabyId, isValidBabyName } from "../web/src/lib/babies/validation.ts";

const now = new Date("2026-10-28T01:00:00Z");

test("baby birthdays reject invalid, overflow and future dates before SQL", () => {
  for (const value of [null, 20260101, "", "not-a-date", "2026-02-29", "2026-13-01", "2026-10-29", "2026-1-01", "2024-01-01T00:00:00Z", "0000-01-01"]) {
    assert.equal(isValidBabyBirthDate(value, now), false, String(value));
  }
  for (const value of ["2024-02-29", "2026-10-28", "2025-01-01"]) assert.equal(isValidBabyBirthDate(value, now), true);
});

test("birthday today follows the app's Shanghai calendar, not UTC midnight", () => {
  assert.equal(isValidBabyBirthDate("2026-10-29", new Date("2026-10-28T17:00:00Z")), true);
});

test("baby names must be nonblank bounded text", () => {
  assert.equal(isValidBabyName(" 小暖 "), true);
  for (const value of [null, {}, 123, "  ", "暖".repeat(81)]) assert.equal(isValidBabyName(value), false);
});

test("baby ids are validated UUIDs before database lookup", () => {
  assert.equal(isValidBabyId("2ecb4d16-ff12-42b3-a674-fac08d63367c"), true);
  assert.equal(isValidBabyId("not-a-uuid"), false);
});

test("both create and update routes enforce name and birthday validation", () => {
  for (const path of ["../web/src/app/api/babies/route.ts", "../web/src/app/api/babies/[id]/route.ts"]) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(source, /if \(!isValidBabyName\(body\.name\)\)/);
    assert.match(source, /if \(!isValidBabyBirthDate\(/);
  }
});
