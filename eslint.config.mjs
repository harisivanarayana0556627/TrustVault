import { defineConfig } from "eslint/config";
import nextPlugin from "@next/eslint-plugin-next";
import tsParser from "@typescript-eslint/parser";

export default defineConfig([
  {
    files: ["**/*.{js,jsx,ts,tsx,mjs}"],
    plugins: {
      "@next/next": nextPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
    },
  },
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
]);
