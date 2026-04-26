import path from "node:path";
import { fileURLToPath } from "node:url";
import antfu from "@antfu/eslint-config";
import pluginQuery from "@tanstack/eslint-plugin-query";
import reactHooks from "eslint-plugin-react-hooks";
import tailwindcss from "eslint-plugin-tailwindcss";

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));
const TAILWIND_CONFIG_PATH = path.join(ROOT_DIR, "tailwind.config.js");
const reactHooksRecommendedLatestRules = reactHooks.configs.flat["recommended-latest"].rules;

export default antfu(
  {
    type: "app",
    react: true,
    typescript: true,
    formatters: true,
    stylistic: {
      indent: 2,
      semi: true,
      quotes: "double",
    },
    ignores: [
      "public/**",
      "api/**",
      "packages/tuanchat-openapi-client/**",
      ".github/**",
      "**/*.md",
      "eslint-report.json",
      "android/**",
      "build/**",
      "dist/**",
      "release/**",
      "coverage/**",
      "node_modules/.cache/**",
    ],
    plugins: {
      "@tanstack/query": pluginQuery,
      "react-hooks": reactHooks,
      tailwindcss,
    },
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    settings: {
      tailwindcss: {
        config: TAILWIND_CONFIG_PATH,
      },
    },
  },
  {
    files: ["**/*.js", "**/*.ts"],
    rules: {
      "@tanstack/query/exhaustive-deps": "error",
      "ts/no-redeclare": "off",
      "ts/consistent-type-definitions": ["error", "type"],
      "no-console": ["warn"],
      "antfu/no-top-level-await": ["off"],
      "node/no-process-env": ["error"],
      "perfectionist/sort-imports": [
        "error",
        {
          tsconfigRootDir: ".",
        },
      ],
      "unicorn/filename-case": [
        "error",
        {
          cases: {
            camelCase: true,
            kebabCase: true,
            pascalCase: true,
          },
          ignore: ["README.md"],
        },
      ],
    },
  },
  {
    // preset 对 tsx 的默认 no-console 更严格，这里统一为 warn，并允许 warn/error
    files: ["**/*.{jsx,tsx}"],
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "tailwindcss/enforces-shorthand": "warn",
    },
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      "ts/no-use-before-define": "off",
      "node/prefer-global/buffer": "off",
      "node/prefer-global/process": "off",

      ...reactHooksRecommendedLatestRules,

      // Expose React Compiler migration issues without blocking the whole legacy codebase yet.
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks-extra/no-unnecessary-use-prefix": "off",
      "react-refresh/only-export-components": "off",
      "react/no-array-index-key": "off",
      "react/no-unstable-default-props": "off",

      // Too noisy in this codebase; keep React hooks deps warnings instead.
      "react-hooks-extra/no-direct-set-state-in-use-effect": "off",

      // Destructured props often confuse param-name checking; keep JSDoc optional.
      "jsdoc/check-param-names": "off",
      "jsdoc/require-returns-description": "off",
    },
  },
  {
    // WebGAL Preview 需要 allow-scripts 和 allow-same-origin 才能正常运行
    files: ["**/webGALPreview.tsx"],
    rules: {
      "react-dom/no-unsafe-iframe-sandbox": "off",
    },
  },
  {
    // Markdown 里的外链媒体嵌入通常需要脚本权限
    files: ["**/markDownViewer.tsx"],
    rules: {
      "react-dom/no-unsafe-iframe-sandbox": "off",
    },
  },
  {
    files: ["api/**/*.js", "api/**/*.ts", "services/**/*.ts"],
    rules: {
      "eslint-comments/no-unlimited-disable": "off",
    },
  },
  {
    files: ["*.config.ts"],
    rules: {
      "unicorn/filename-case": ["off"],
    },
  },
  {
    files: ["apps/mobile/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "node/no-process-env": "off",
      "ts/no-require-imports": "off",
    },
  },
  {
    files: ["apps/mobile/scripts/**/*.js"],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["electron/**/*.js"],
    rules: {
      "no-control-regex": "off",
    },
  },
);
