import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

export default defineConfig(() => {
  const env = loadEnv("test", process.cwd(), "");

  for (const [key, value] of Object.entries(env)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }

  return {
    test: {
      environment: "node",
      include: ["tests/**/*.test.ts"],
    },
  };
});
