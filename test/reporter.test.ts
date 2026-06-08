import { beforeEach, expect, test, vi } from "vitest";
import { type Vitest } from "vitest/node";

import FeishuReporter from "../src/reporter.js";

vi.mock("../src/feishu.js", () => ({
  sendMessage: vi.fn(),
}));

import { sendMessage, type CardElement } from "../src/feishu.js";
import type { TestModule } from "vitest/node";

beforeEach(() => {
  vi.clearAllMocks();
});

function getLastCallElements(): CardElement[] {
  const call = vi.mocked(sendMessage).mock.calls.at(-1);
  if (!call) {
    throw new Error("No calls to sendMessage");
  }

  return call[2] as unknown as CardElement[];
}

function createMockVitest(config: Partial<Vitest["config"]> = {}): Vitest {
  return {
    config: {
      root: "/test",
      ...config,
    },
    logger: {
      log: vi.fn(),
      error: vi.fn(),
    },
  } as unknown as Vitest;
}

function createMockTestCase(
  name: string,
  state: "passed" | "failed" | "skipped",
  errors: unknown[] = [],
  parent?: unknown,
) {
  return {
    name,
    result: () => ({
      state,
      errors,
    }),
    parent,
    type: "test",
  };
}

function createMockSuite(name: string, parent?: unknown) {
  return {
    name,
    type: "suite",
    parent,
  };
}

function createMockTestModule(
  moduleId: string,
  tests: ReturnType<typeof createMockTestCase>[],
) {
  return {
    moduleId,
    children: {
      allTests: () => tests,
    },
  } as unknown as TestModule;
}

test("logs error when token is missing", async () => {
  const reporter = new FeishuReporter();
  const context = createMockVitest();
  reporter.onInit(context);

  await reporter.onTestRunEnd([]);

  expect(context.logger.error).toHaveBeenCalledWith(
    "vitest-feishu-reporter: token is required",
  );
});

test("does not log error when token is missing in silent mode", async () => {
  const reporter = new FeishuReporter({ silent: true });
  const context = createMockVitest();
  reporter.onInit(context);

  await reporter.onTestRunEnd([]);

  expect(context.logger.error).not.toHaveBeenCalled();
});

test("does nothing when all tests pass", async () => {
  const reporter = new FeishuReporter({ token: "test-token" });
  const context = createMockVitest();
  reporter.onInit(context);

  const testModules = [
    createMockTestModule("/test/foo.test.ts", [
      createMockTestCase("should pass", "passed"),
    ]),
  ];

  await reporter.onTestRunEnd(testModules);

  expect(context.logger.log).not.toHaveBeenCalled();
  expect(context.logger.error).not.toHaveBeenCalled();
  expect(sendMessage).not.toHaveBeenCalled();
});

test("does nothing when there are no tests", async () => {
  const reporter = new FeishuReporter({ token: "test-token" });
  const context = createMockVitest();
  reporter.onInit(context);

  await reporter.onTestRunEnd([]);

  expect(context.logger.log).not.toHaveBeenCalled();
  expect(context.logger.error).not.toHaveBeenCalled();
  expect(sendMessage).not.toHaveBeenCalled();
});

test("sends message and logs success when there are failed tests", async () => {
  vi.mocked(sendMessage).mockResolvedValue();

  const reporter = new FeishuReporter({ token: "test-token" });
  const context = createMockVitest();
  reporter.onInit(context);

  const testModules = [
    createMockTestModule("/test/foo.test.ts", [
      createMockTestCase("should fail", "failed", [
        new Error("assertion failed"),
      ]),
      createMockTestCase("should pass", "passed"),
    ]),
  ];

  await reporter.onTestRunEnd(testModules);

  expect(sendMessage).toHaveBeenCalledOnce();
  expect(context.logger.log).toHaveBeenCalledWith(
    "Feishu report sent successfully 🎉",
  );
});

test("sends message without logging in silent mode", async () => {
  vi.mocked(sendMessage).mockResolvedValue();

  const reporter = new FeishuReporter({ token: "test-token", silent: true });
  const context = createMockVitest();
  reporter.onInit(context);

  const testModules = [
    createMockTestModule("/test/foo.test.ts", [
      createMockTestCase("should fail", "failed", [new Error("fail")]),
    ]),
  ];

  await reporter.onTestRunEnd(testModules);

  expect(sendMessage).toHaveBeenCalledOnce();
  expect(context.logger.log).not.toHaveBeenCalled();
});

test("logs error when sendMessage fails", async () => {
  vi.mocked(sendMessage).mockRejectedValue(new Error("network error"));

  const reporter = new FeishuReporter({ token: "test-token" });
  const context = createMockVitest();
  reporter.onInit(context);

  const testModules = [
    createMockTestModule("/test/foo.test.ts", [
      createMockTestCase("should fail", "failed", [new Error("fail")]),
    ]),
  ];

  await reporter.onTestRunEnd(testModules);

  expect(context.logger.error).toHaveBeenCalledWith(
    "vitest-feishu-reporter: failed to send message - network error",
  );
});

test("does not log error when sendMessage fails in silent mode", async () => {
  vi.mocked(sendMessage).mockRejectedValue(new Error("network error"));

  const reporter = new FeishuReporter({
    token: "test-token",
    silent: true,
  });
  const context = createMockVitest();
  reporter.onInit(context);

  const testModules = [
    createMockTestModule("/test/foo.test.ts", [
      createMockTestCase("should fail", "failed", [new Error("fail")]),
    ]),
  ];

  await reporter.onTestRunEnd(testModules);

  expect(context.logger.error).not.toHaveBeenCalled();
});

test("counts total tests across multiple modules", async () => {
  vi.mocked(sendMessage).mockResolvedValue();

  const reporter = new FeishuReporter({ token: "test-token" });
  const context = createMockVitest();
  reporter.onInit(context);

  const testModules = [
    createMockTestModule("/test/a.test.ts", [
      createMockTestCase("fail 1", "failed", [new Error("e1")]),
      createMockTestCase("pass 1", "passed"),
    ]),
    createMockTestModule("/test/b.test.ts", [
      createMockTestCase("pass 2", "passed"),
      createMockTestCase("pass 3", "passed"),
    ]),
  ];

  await reporter.onTestRunEnd(testModules);

  expect(sendMessage).toHaveBeenCalledOnce();
  const elements = getLastCallElements();
  expect(elements[0].text?.content).toContain("4");
  expect(elements[0].text?.content).toContain("1");
});

test("generates nested test names", async () => {
  vi.mocked(sendMessage).mockResolvedValue();

  const reporter = new FeishuReporter({ token: "test-token" });
  const context = createMockVitest();
  reporter.onInit(context);

  const suite2 = createMockSuite("inner suite");
  const suite1 = createMockSuite("outer suite");
  (suite2 as Record<string, unknown>).parent = suite1;

  const testModules = [
    createMockTestModule("/test/nested.test.ts", [
      createMockTestCase("deep test", "failed", [new Error("e")], suite2),
    ]),
  ];

  await reporter.onTestRunEnd(testModules);

  const elements = getLastCallElements();
  expect(elements[2].text?.content).toContain(
    "outer suite > inner suite > deep test",
  );
});

test("formats error messages with ANSI codes stripped", async () => {
  vi.mocked(sendMessage).mockResolvedValue();

  const reporter = new FeishuReporter({ token: "test-token" });
  const context = createMockVitest();
  reporter.onInit(context);

  const ansiError = new Error("\u001B[31mred error\u001B[0m");

  const testModules = [
    createMockTestModule("/test/ansi.test.ts", [
      createMockTestCase("ansi test", "failed", [ansiError]),
    ]),
  ];

  await reporter.onTestRunEnd(testModules);

  const elements = getLastCallElements();
  expect(elements[2].text?.content).toContain("red error");
  expect(elements[2].text?.content).not.toContain("\u001B[31m");
});

test("formats error messages truncated at newline", async () => {
  vi.mocked(sendMessage).mockResolvedValue();

  const reporter = new FeishuReporter({ token: "test-token" });
  const context = createMockVitest();
  reporter.onInit(context);

  const multiLineError = new Error("first line\nsecond line\nthird line");

  const testModules = [
    createMockTestModule("/test/multiline.test.ts", [
      createMockTestCase("multiline test", "failed", [multiLineError]),
    ]),
  ];

  await reporter.onTestRunEnd(testModules);

  const elements = getLastCallElements();
  expect(elements[2].text?.content).toContain("first line");
  expect(elements[2].text?.content).not.toContain("second line");
});

test("formats error messages truncated at 200 chars", async () => {
  vi.mocked(sendMessage).mockResolvedValue();

  const reporter = new FeishuReporter({ token: "test-token" });
  const context = createMockVitest();
  reporter.onInit(context);

  const longMessage = "a".repeat(300);
  const longError = new Error(longMessage);

  const testModules = [
    createMockTestModule("/test/long.test.ts", [
      createMockTestCase("long test", "failed", [longError]),
    ]),
  ];

  await reporter.onTestRunEnd(testModules);

  const elements = getLastCallElements();
  const content = elements[2].text?.content ?? "";
  const errorLine =
    content.split("\n").find((line) => line.startsWith("> ")) ?? "";
  expect(errorLine.length).toBeLessThanOrEqual(203); // '> ' + 200 chars = 202, but let's be safe
});

test("formats string errors", async () => {
  vi.mocked(sendMessage).mockResolvedValue();

  const reporter = new FeishuReporter({ token: "test-token" });
  const context = createMockVitest();
  reporter.onInit(context);

  const testModules = [
    createMockTestModule("/test/string-error.test.ts", [
      createMockTestCase("string error test", "failed", [
        "string error message",
      ]),
    ]),
  ];

  await reporter.onTestRunEnd(testModules);

  const elements = getLastCallElements();
  expect(elements[2].text?.content).toContain("string error message");
});

test("formats unknown error types", async () => {
  vi.mocked(sendMessage).mockResolvedValue();

  const reporter = new FeishuReporter({ token: "test-token" });
  const context = createMockVitest();
  reporter.onInit(context);

  const testModules = [
    createMockTestModule("/test/unknown.test.ts", [
      createMockTestCase("unknown error test", "failed", [
        { notMessage: "something" },
      ]),
    ]),
  ];

  await reporter.onTestRunEnd(testModules);

  const elements = getLastCallElements();
  expect(elements[2].text?.content).toContain("Unknown error");
});

test("handles tests with no errors", async () => {
  vi.mocked(sendMessage).mockResolvedValue();

  const reporter = new FeishuReporter({ token: "test-token" });
  const context = createMockVitest();
  reporter.onInit(context);

  const testModules = [
    createMockTestModule("/test/no-error.test.ts", [
      createMockTestCase("no error test", "failed", []),
    ]),
  ];

  await reporter.onTestRunEnd(testModules);

  const elements = getLastCallElements();
  expect(elements[2].text?.content).not.toContain(">");
});

test("handles non-Error object with message property", async () => {
  vi.mocked(sendMessage).mockResolvedValue();

  const reporter = new FeishuReporter({ token: "test-token" });
  const context = createMockVitest();
  reporter.onInit(context);

  const testModules = [
    createMockTestModule("/test/obj.test.ts", [
      createMockTestCase("obj error test", "failed", [
        { message: "custom object error" },
      ]),
    ]),
  ];

  await reporter.onTestRunEnd(testModules);

  const elements = getLastCallElements();
  expect(elements[2].text?.content).toContain("custom object error");
});

test("handles sendMessage rejection with non-Error value", async () => {
  vi.mocked(sendMessage).mockRejectedValue("string rejection");

  const reporter = new FeishuReporter({ token: "test-token" });
  const context = createMockVitest();
  reporter.onInit(context);

  const testModules = [
    createMockTestModule("/test/reject.test.ts", [
      createMockTestCase("fail", "failed", [new Error("e")]),
    ]),
  ];

  await reporter.onTestRunEnd(testModules);

  expect(context.logger.error).toHaveBeenCalledWith(
    "vitest-feishu-reporter: failed to send message - string rejection",
  );
});

test("formatErrorMessage returns empty string when test result is not failed", async () => {
  const reporter = new FeishuReporter({ token: "test-token" });

  const result = (reporter as unknown as { formatErrorMessage: (test: unknown) => string }).formatErrorMessage({
    result: () => ({ state: "passed" }),
  });

  expect(result).toBe("");
});

test("handles incomplete ANSI escape sequences in error messages", async () => {
  vi.mocked(sendMessage).mockResolvedValue(undefined);

  const reporter = new FeishuReporter({ token: "test-token" });
  const context = createMockVitest();
  reporter.onInit(context);

  const incompleteAnsiError = new Error("\u001B[abc no ansi end");

  const testModules = [
    createMockTestModule("/test/incomplete-ansi.test.ts", [
      createMockTestCase("incomplete ansi test", "failed", [
        incompleteAnsiError,
      ]),
    ]),
  ];

  await reporter.onTestRunEnd(testModules);

  expect(sendMessage).toHaveBeenCalledOnce();
});
