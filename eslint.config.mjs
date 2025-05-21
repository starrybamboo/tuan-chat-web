import antfu from "@antfu/eslint-config";
import pluginQuery from "@tanstack/eslint-plugin-query";

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
    ],
    plugins: {
      "@tanstack/query": pluginQuery,
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
