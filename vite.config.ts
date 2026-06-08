import { defineConfig } from "vitest/config";

const reporters: Array<string | [string, { silent: boolean }]> = ["verbose"];

if (process.env["CI"] && process.env["VITEST_FEISHU_TOKEN"]) {
  reporters.push(["./dist/index.js", { silent: true }]);
}

export default defineConfig({
  test: {
    include: ["test/*.test.ts"],
    reporters: reporters as unknown as string[],

    coverage: {
      enabled: Boolean(process.env["CI"]),
      include: ["src/**"],
    },

    onConsoleLog(log) {
      if (log.includes("Feishu report sent successfully")) {
        return false;
      }
    },
  },
});
