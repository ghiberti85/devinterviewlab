import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    exclude: ['node_modules', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: 'coverage',
      // Measure coverage only for pure, unit-testable modules.
      // lib/api/rate-limit.ts and lib/ai/* require external deps (Supabase, Groq)
      // and are excluded from thresholds — covered by integration tests.
      include: [
        'lib/api/brute-force.ts',
        'lib/api/rate-limit.ts',
        'lib/file-validation.ts',
        'lib/services/spaced-repetition.service.ts',
      ],
      thresholds: {
        lines: 65,
        functions: 60,
        branches: 65,
        statements: 65,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
