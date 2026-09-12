import assert from "node:assert/strict";
import test from "node:test";

import {
  isConfiguredAdminEmail,
  parseAdminEmails,
  safeAdminNextPath,
} from "../admin/src/lib/self-hosted/admin-auth-policy.mjs";

test("admin email policy normalizes case and whitespace", () => {
  const allowed = parseAdminEmails(" Owner@Warmrobot.dev, ops@warmrobot.dev ");

  assert.equal(isConfiguredAdminEmail("OWNER@warmrobot.dev", allowed), true);
  assert.equal(isConfiguredAdminEmail(" ops@warmrobot.dev ", allowed), true);
});

test("admin email policy rejects missing or unlisted addresses", () => {
  const allowed = parseAdminEmails("owner@warmrobot.dev");

  assert.equal(isConfiguredAdminEmail(null, allowed), false);
  assert.equal(isConfiguredAdminEmail("visitor@warmrobot.dev", allowed), false);
  assert.equal(isConfiguredAdminEmail("owner@warmrobot.dev", new Set()), false);
});

test("admin login only redirects to local admin paths", () => {
  assert.equal(safeAdminNextPath("/admin/users"), "/admin/users");
  assert.equal(safeAdminNextPath("//attacker.example"), "/admin");
  assert.equal(safeAdminNextPath("https://attacker.example"), "/admin");
  assert.equal(safeAdminNextPath(null), "/admin");
});
