import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for backend test suites.
 * Unit and integration tests run directly against TypeScript sources.
 */
export default defineConfig({
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
