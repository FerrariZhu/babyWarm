import assert from "node:assert/strict";
import test from "node:test";

import { createBabyProfile } from "../web/src/lib/babies/create-baby.ts";

test("creating a baby deactivates the previous active profile before inserting the new one", async () => {
  const statements = [];
  const createdBaby = {
    id: "baby-2",
    name: "小暖",
    birth_date: "2024-09-14",
    gender: "female",
    avatar_url: null,
    height_cm: 88,
    weight_kg: 12.5,
    current_size_label: "90",
    wears_diaper: false,
  };
  const client = {
    async query(statement, values) {
      statements.push({ statement, values });
      if (/RETURNING id, name, birth_date/.test(statement)) {
        return { rows: [createdBaby] };
      }
      return { rows: [] };
    },
  };

  const result = await createBabyProfile(client, {
    userId: "user-1",
    name: "小暖",
    birthDate: "2024-09-14",
    gender: "female",
    heightCm: 88,
    weightKg: 12.5,
    avatarUrl: null,
    wearsDiaper: false,
    suggestedSize: "90",
    warmthPreference: "neutral",
  });

  assert.deepEqual(result, createdBaby);
  assert.equal(statements.length, 3);
  assert.match(statements[0].statement, /UPDATE public\.babies[\s\S]*SET is_active = false/i);
  assert.deepEqual(statements[0].values, ["user-1"]);
  assert.match(statements[1].statement, /INSERT INTO public\.babies/i);
  assert.match(statements[2].statement, /INSERT INTO public\.baby_warmth_preferences/i);
  assert.deepEqual(statements[2].values, ["baby-2", "neutral"]);
});
