import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    exclude: ['node_modules', 'e2e/**', '.claude/worktrees/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: 'coverage',
      // Measure coverage only for pure, unit-testable modules.
      // lib/api/rate-limit.ts and lib/ai/* require external deps (Supabase, Groq)
      // and are excluded from thresholds — covered by integration tests.
      include: [
        'lib/api/brute-force.ts',
        'lib/api/stream.ts',
        'lib/file-validation.ts',
        'lib/services/spaced-repetition.service.ts',
        'lib/utils.ts',
        'lib/ai/prompts/*.ts',
      ],
      // lib/api/rate-limit.ts excluded: checkRateLimit/logUsage require Supabase
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
