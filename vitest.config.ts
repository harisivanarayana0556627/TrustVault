import { defineConfig, loadEnv } from 'vitest/config';

// Vitest does not automatically load Next.js .env.local files. Load test-specific
// files explicitly so integration tests don't silently skip when configured.
export default defineConfig(() => {
  const env = loadEnv('test', process.cwd(), '');
  for (const [key, value] of Object.entries(env)) {
    if (!process.env[key]) process.env[key] = value;
  }
  return {
    test: {
      environment: 'node',
      include: ['tests/**/*.test.ts'],
    },
  };
});
