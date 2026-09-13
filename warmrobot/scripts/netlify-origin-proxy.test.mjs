import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const netlifyConfigUrl = new URL("../../netlify.toml", import.meta.url);
const nginxConfigUrl = new URL("../deploy/nginx/warmrobot.conf", import.meta.url);
const bootstrapConfigUrl = new URL(
  "../deploy/nginx/warmrobot-http-bootstrap.conf",
  import.meta.url,
);
const renewalHookUrl = new URL(
  "../deploy/nginx/reload-after-renewal.sh",
  import.meta.url,
);

test("Netlify proxies every application request to the encrypted production origin", async () => {
  const config = await readFile(netlifyConfigUrl, "utf8");

  assert.match(config, /\[\[redirects\]\][\s\S]*from\s*=\s*"\/\*"/);
  assert.match(config, /to\s*=\s*"https:\/\/124\.223\.189\.198\/:splat"/);
  assert.match(config, /status\s*=\s*200/);
  assert.match(config, /force\s*=\s*true/);
  assert.doesNotMatch(config, /DATABASE_URL|WEB_DATABASE_URL/);
});

test("the production origin serves a trusted IP certificate and preserves proxy metadata", async () => {
  const config = await readFile(nginxConfigUrl, "utf8");

  assert.match(config, /listen 443 ssl default_server/);
  assert.match(config, /\/etc\/letsencrypt\/live\/124\.223\.189\.198\/fullchain\.pem/);
  assert.match(config, /\/etc\/letsencrypt\/live\/124\.223\.189\.198\/privkey\.pem/);
  assert.match(config, /proxy_pass http:\/\/127\.0\.0\.1:3000/);
  assert.match(config, /X-Forwarded-Proto \$scheme/);
  assert.match(config, /X-Forwarded-For \$proxy_add_x_forwarded_for/);
});

test("certificate bootstrap and renewal keep the origin available", async () => {
  const [bootstrapConfig, renewalHook] = await Promise.all([
    readFile(bootstrapConfigUrl, "utf8"),
    readFile(renewalHookUrl, "utf8"),
  ]);

  assert.match(bootstrapConfig, /location \/\.well-known\/acme-challenge\//);
  assert.match(bootstrapConfig, /root \/var\/www\/letsencrypt/);
  assert.match(bootstrapConfig, /proxy_pass http:\/\/127\.0\.0\.1:3000/);
  assert.match(renewalHook, /nginx -t/);
  assert.match(renewalHook, /systemctl reload nginx/);
});
