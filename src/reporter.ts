import { relative } from 'node:path';
import type { Reporter, TestCase, TestModule, Vitest } from 'vitest/node';

import { sendMessage, type CardElement } from './feishu.js';
import { resolveOptions, type FeishuReporterOptions } from './options.js';

export interface FeishuReporterConstructorOptions
  extends Partial<FeishuReporterOptions> {}

/**
 * Vitest reporter that sends test failure summaries to Feishu (Lark).
 *
 * @example
 * ```ts
 * // vitest.config.ts
 * import { defineConfig } from 'vitest/config';
 *
 * export default defineConfig({
 *   test: {
 *     reporters: [
 *       'default',
 *       ['vitest-feishu-reporter', { token: 'xxx', secret: 'xxx' }],
 *     ],
 *   },
 * });
 * ```
 */
export default class FeishuReporter implements Reporter {
  ctx!: Vitest;
  options: Required<FeishuReporterOptions>;

  constructor(options?: FeishuReporterConstructorOptions) {
    this.options = resolveOptions(options);
  }

  onInit(ctx: Vitest) {
    this.ctx = ctx;
  }

  async onTestRunEnd(testModules: ReadonlyArray<TestModule>) {
    if (!this.options.token) {
      if (!this.options.silent) {
        this.ctx.logger.error('vitest-feishu-reporter: token is required');
      }
      return;
    }

    const failedTests = this.collectFailedTests(testModules);

    if (failedTests.length === 0) {
      return;
    }

    const totalTests = this.countTotalTests(testModules);
    const elements = this.buildCardElements(totalTests, failedTests);

    try {
      await sendMessage(this.options.token, this.options.secret, elements);

      if (!this.options.silent) {
        this.ctx.logger.log('Feishu report sent successfully 🎉');
      }
    } catch (error) {
      if (!this.options.silent) {
        this.ctx.logger.error(
          `vitest-feishu-reporter: failed to send message - ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private collectFailedTests(
    testModules: ReadonlyArray<TestModule>,
  ): Array<{ filePath: string; test: TestCase }> {
    const failedTests: Array<{ filePath: string; test: TestCase }> = [];

    for (const testModule of testModules) {
      for (const test of testModule.children.allTests()) {
        if (test.state() === 'failed') {
          failedTests.push({
            filePath: relative(process.cwd(), testModule.moduleId),
            test,
          });
        }
      }
    }

    return failedTests;
  }

  private countTotalTests(testModules: ReadonlyArray<TestModule>): number {
    let count = 0;

    for (const testModule of testModules) {
      count += testModule.children.allTests().length;
    }

    return count;
  }

  private buildCardElements(
    totalTests: number,
    failedTests: Array<{ filePath: string; test: TestCase }>,
  ): CardElement[] {
    const elements: CardElement[] = [
      {
        tag: 'div',
        text: {
          content: `共执行了 ${totalTests} 个测试，其中 **${failedTests.length}** 个失败`,
          tag: 'lark_md',
        },
      },
      { tag: 'hr' },
    ];

    for (const { filePath, test } of failedTests) {
      const testName = this.generateTestName(test);
      const errorMessage = this.formatErrorMessage(test);

      elements.push({
        tag: 'div',
        text: {
          content: `**${filePath}**\n${testName}\n${errorMessage}`,
          tag: 'lark_md',
        },
      });
    }

    return elements;
  }

  private generateTestName(test: TestCase): string {
    const names: string[] = [test.name];
    let parent = test.parent;

    while (parent && parent.type === 'suite' && parent.name) {
      names.unshift(parent.name);
      parent = parent.parent;
    }

    return names.join(' > ');
  }

  private formatErrorMessage(test: TestCase): string {
    const errors = test.errors();

    if (errors.length === 0) {
      return '';
    }

    return errors
      .map((error) => {
        const message =
          error?.message ??
          (typeof error === 'string' ? error : 'Unknown error');
        // Strip ANSI codes and truncate long messages
        const cleanMessage = message
          .replace(/\u001b\[\d+m/g, '')
          .split('\n')[0]
          .slice(0, 200);

        return `> ${cleanMessage}`;
      })
      .join('\n');
  }
}
