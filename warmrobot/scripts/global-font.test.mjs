import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const cssPath = new URL("../web/src/app/globals.css", import.meta.url);
const layoutPath = new URL("../web/src/app/layout.tsx", import.meta.url);
const packageCssPath = new URL(
  "../node_modules/@free-fonts/lxgw-975-yuan/lxgw-975-yuan.css",
  import.meta.url,
);

test("the consumer app uses self-hosted 975 Yuan globally", async () => {
  const css = await readFile(cssPath, "utf8");
  const layout = await readFile(layoutPath, "utf8");
  const packageCss = await readFile(packageCssPath, "utf8");

  for (const weight of [400, 500, 700]) {
    assert.match(
      packageCss,
      new RegExp(
        `@font-face\\s*\\{[^}]*font-family:\\s*['"]LXGW 975 Yuan SC['"][^}]*font-weight:\\s*${weight}[^}]*font-display:\\s*swap`,
        "s",
      ),
    );
  }

  assert.match(layout, /import\s+["']@free-fonts\/lxgw-975-yuan["']/);
  assert.match(css, /--font-display:\s*"LXGW 975 Yuan SC"/);
  assert.match(css, /--font-body:\s*"LXGW 975 Yuan SC"/);
  assert.match(packageCss, /unicode-range:/);
});
