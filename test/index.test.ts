import { expect, test } from "vitest";

import FeishuReporter from "../src/index.js";

test("default export is FeishuReporter", () => {
  expect(FeishuReporter).toBeDefined();
  expect(typeof FeishuReporter).toBe("function");
});

test("FeishuReporter can be instantiated", () => {
  const reporter = new FeishuReporter();
  expect(reporter).toBeInstanceOf(FeishuReporter);
});
