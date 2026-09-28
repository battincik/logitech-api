import assert from "node:assert/strict";
import { Script } from "node:vm";
import test from "node:test";
import { createDashboardHtml } from "./dashboard";

test("generated dashboard inline scripts contain valid JavaScript", () => {
  const html = createDashboardHtml();
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];

  assert.ok(scripts.length > 0, "dashboard should include an inline script");
  for (const [, source] of scripts) new Script(source);
});
