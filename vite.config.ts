import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/*.test.ts'],
    reporters: 'verbose',

    coverage: {
      enabled: true,
      include: ['src/**'],
    },

    onConsoleLog(log) {
      if (log.includes('Feishu report sent')) {
        return false;
      }
    },
  },
});
