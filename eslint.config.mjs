import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-plugin-prettier/recommended";
import unicorn from "eslint-plugin-unicorn";

export default defineConfig([
  js.configs.recommended,
  tseslint.configs.recommended,
  unicorn.configs.recommended,
  prettier,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    rules: {
      "unicorn/prefer-node-protocol": "error",
      "unicorn/no-process-exit": "off",
    },
  },
  {
    ignores: ["dist", "node_modules"],
  },
]);
