import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Unit tests run against workspace sources so they never require a prior build.
 * Integration tests that need Mongo/Redis live under apps/backend/test and are
 * excluded here.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@bfdp/shared': fileURLToPath(
        new URL('../../packages/shared/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    exclude: ['node_modules', 'dist'],
    reporters: 'default',
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['src/modules/processing/**/*.ts'],
    },
  },
});
