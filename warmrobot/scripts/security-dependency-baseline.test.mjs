import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const json = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const lock = json("../package-lock.json");
const manifest = json("../package.json");
const versionAtLeast = (version, minimum) => {
  const a = version.split(".").map(Number);
  const b = minimum.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return true;
};

test("locked runtime dependencies include the October 2026 security fixes", () => {
  const minimums = { next: "15.5.28", sharp: "0.35.5", postcss: "8.5.23", nanoid: "3.3.18", "source-map-js": "1.2.2" };
  for (const [name, minimum] of Object.entries(minimums)) {
    const entries = Object.entries(lock.packages).filter(([path]) => path.endsWith(`/node_modules/${name}`) || path === `node_modules/${name}`);
    assert.ok(entries.length, `${name} is present in lockfile`);
    for (const [path, entry] of entries) assert.ok(versionAtLeast(entry.version, minimum), `${path} ${entry.version} must be >= ${minimum}`);
  }
});

test("both apps share the patched Next compiler and its PostCSS override", () => {
  assert.equal(manifest.overrides.next.postcss, "^8.5.23");
  for (const path of ["../web/package.json", "../admin/package.json"]) {
    const app = json(path);
    assert.equal(app.dependencies.next, manifest.devDependencies.next);
    assert.equal(app.devDependencies["eslint-config-next"], app.dependencies.next);
  }
});
