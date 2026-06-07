import antfu from "@antfu/eslint-config";
import reactHooks from "eslint-plugin-react-hooks";

const reactHooksRecommendedLatestRules = reactHooks.configs.flat["recommended-latest"].rules;

export default antfu(
  {
    type: "app",
    react: true,
    typescript: true,
    formatters: false,
    stylistic: {
      indent: 2,
      semi: true,
      quotes: "double",
    },
    ignores: [
      ".expo/**",
      ".expo-export-web/**",
      ".tmp/**",
      "android/**",
      "ios/**",
      "node_modules/**",
      "scripts/**",
    ],
    plugins: {
      "react-hooks": reactHooks,
    },
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      "ts/no-redeclare": "off",
      "ts/consistent-type-definitions": ["error", "type"],
      "ts/no-use-before-define": "off",
      "ts/no-require-imports": "off",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "antfu/no-top-level-await": "off",
      "node/no-process-env": "off",
      "node/prefer-global/buffer": "off",
      "node/prefer-global/process": "off",
      "perfectionist/sort-imports": [
        "error",
        {
          tsconfig: {
            rootDir: ".",
            filename: "tsconfig.json",
          },
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
        },
      ],

      ...reactHooksRecommendedLatestRules,

      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks-extra/no-unnecessary-use-prefix": "off",
      "react-hooks-extra/no-direct-set-state-in-use-effect": "off",
      "react/exhaustive-deps": "off",
      "react/naming-convention-ref-name": "off",
      "react/no-unnecessary-use-prefix": "off",
      "react/set-state-in-effect": "off",
      "react/unsupported-syntax": "off",
      "react/use-state": "off",
      "react-refresh/only-export-components": "off",
      "react/no-array-index-key": "off",
      "react/no-unstable-default-props": "off",
      "react-dom/no-missing-button-type": "off",
      "react-dom/no-unsafe-iframe-sandbox": "off",
      "react-dom/no-missing-iframe-sandbox": "off",

      "style/max-statements-per-line": "off",
      "style/multiline-ternary": "off",
      "no-alert": "off",
    },
  },
);
