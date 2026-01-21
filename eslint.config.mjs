import antfu from "@antfu/eslint-config";
import pluginQuery from "@tanstack/eslint-plugin-query";
import reactHooks from "eslint-plugin-react-hooks";

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
      ".github/**",
      "app/components/chat/infra/blocksuite/playground/**",
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
      "node/prefer-global/process": ["off"],
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
    },
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      // Core React Hooks rules
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

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
);
