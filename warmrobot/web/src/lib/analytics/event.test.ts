import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's test runner executes this TypeScript source directly.
import { parseAnalyticsEvent } from "./event.ts";

test("accepts a safe page-view event", () => {
  assert.deepEqual(
    parseAnalyticsEvent({
      eventType: "page_view",
      pagePath: "/profile",
      visitorId: "f26a5a0d-7079-454e-a807-e7623535e336",
    }),
    {
      eventType: "page_view",
      pagePath: "/profile",
      moduleName: null,
      actionName: null,
      visitorId: "f26a5a0d-7079-454e-a807-e7623535e336",
    }
  );
});

test("requires module and action names for module events", () => {
  assert.equal(
    parseAnalyticsEvent({
      eventType: "module_click",
      pagePath: "/",
      moduleName: "daily_advice",
      visitorId: "f26a5a0d-7079-454e-a807-e7623535e336",
    }),
    null
  );
});

test("rejects unsafe paths and identifiers", () => {
  assert.equal(
    parseAnalyticsEvent({
      eventType: "page_view",
      pagePath: "/?city=Shanghai",
      visitorId: "not-a-uuid",
    }),
    null
  );
});
