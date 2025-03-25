// eslint.config.mjs
import antfu from "@antfu/eslint-config";

const eslint_config_default = antfu(
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
      // 添加这行忽略 public 目录下的所有文件
    ],
  },
  {
    rules: {
      "eslint-comments/no-unlimited-disable": "off",
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
);
export {
  eslint_config_default as default,
};
// # sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiZXNsaW50LmNvbmZpZy5tanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9faW5qZWN0ZWRfZmlsZW5hbWVfXyA9IFwiL21udC9kL0FfcHJvZ3JhbW1pbmcvdHVhbi1jaGF0LXdlYi9lc2xpbnQuY29uZmlnLm1qc1wiO2NvbnN0IF9faW5qZWN0ZWRfZGlybmFtZV9fID0gXCIvbW50L2QvQV9wcm9ncmFtbWluZy90dWFuLWNoYXQtd2ViXCI7Y29uc3QgX19pbmplY3RlZF9pbXBvcnRfbWV0YV91cmxfXyA9IFwiZmlsZTovLy9tbnQvZC9BX3Byb2dyYW1taW5nL3R1YW4tY2hhdC13ZWIvZXNsaW50LmNvbmZpZy5tanNcIjtpbXBvcnQgYW50ZnUgZnJvbSBcIkBhbnRmdS9lc2xpbnQtY29uZmlnXCI7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBhbnRmdShcclxuICB7XHJcbiAgICB0eXBlOiBcImFwcFwiLFxyXG4gICAgcmVhY3Q6IHRydWUsXHJcbiAgICB0eXBlc2NyaXB0OiB0cnVlLFxyXG4gICAgZm9ybWF0dGVyczogdHJ1ZSxcclxuICAgIHN0eWxpc3RpYzoge1xyXG4gICAgICBpbmRlbnQ6IDIsXHJcbiAgICAgIHNlbWk6IHRydWUsXHJcbiAgICAgIHF1b3RlczogXCJkb3VibGVcIixcclxuICAgIH0sXHJcbiAgICBpZ25vcmVzOiBbXHJcbiAgICAgIFwicHVibGljLyoqXCIsIC8vIFx1NkRGQlx1NTJBMFx1OEZEOVx1ODg0Q1x1NUZGRFx1NzU2NSBwdWJsaWMgXHU3NkVFXHU1RjU1XHU0RTBCXHU3Njg0XHU2MjQwXHU2NzA5XHU2NTg3XHU0RUY2XHJcbiAgICBdLFxyXG4gIH0sXHJcbiAge1xyXG4gICAgcnVsZXM6IHtcclxuICAgICAgXCJlc2xpbnQtY29tbWVudHMvbm8tdW5saW1pdGVkLWRpc2FibGVcIjogXCJvZmZcIixcclxuICAgICAgXCJ0cy9uby1yZWRlY2xhcmVcIjogXCJvZmZcIixcclxuICAgICAgXCJ0cy9jb25zaXN0ZW50LXR5cGUtZGVmaW5pdGlvbnNcIjogW1wiZXJyb3JcIiwgXCJ0eXBlXCJdLFxyXG4gICAgICBcIm5vLWNvbnNvbGVcIjogW1wid2FyblwiXSxcclxuICAgICAgXCJhbnRmdS9uby10b3AtbGV2ZWwtYXdhaXRcIjogW1wib2ZmXCJdLFxyXG4gICAgICBcIm5vZGUvcHJlZmVyLWdsb2JhbC9wcm9jZXNzXCI6IFtcIm9mZlwiXSxcclxuICAgICAgXCJub2RlL25vLXByb2Nlc3MtZW52XCI6IFtcImVycm9yXCJdLFxyXG4gICAgICBcInBlcmZlY3Rpb25pc3Qvc29ydC1pbXBvcnRzXCI6IFtcclxuICAgICAgICBcImVycm9yXCIsXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgdHNjb25maWdSb290RGlyOiBcIi5cIixcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG4gICAgICBcInVuaWNvcm4vZmlsZW5hbWUtY2FzZVwiOiBbXHJcbiAgICAgICAgXCJlcnJvclwiLFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGNhc2VzOiB7XHJcbiAgICAgICAgICAgIGNhbWVsQ2FzZTogdHJ1ZSxcclxuICAgICAgICAgICAgcGFzY2FsQ2FzZTogdHJ1ZSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBpZ25vcmU6IFtcIlJFQURNRS5tZFwiXSxcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG4gICAgfSxcclxuICB9LFxyXG4pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTBQLE9BQU8sV0FBVztBQUU1USxJQUFPLHdCQUFRO0FBQUEsRUFDYjtBQUFBLElBQ0UsTUFBTTtBQUFBLElBQ04sT0FBTztBQUFBLElBQ1AsWUFBWTtBQUFBLElBQ1osWUFBWTtBQUFBLElBQ1osV0FBVztBQUFBLE1BQ1QsUUFBUTtBQUFBLE1BQ1IsTUFBTTtBQUFBLE1BQ04sUUFBUTtBQUFBLElBQ1Y7QUFBQSxJQUNBLFNBQVM7QUFBQSxNQUNQO0FBQUE7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0E7QUFBQSxJQUNFLE9BQU87QUFBQSxNQUNMLHdDQUF3QztBQUFBLE1BQ3hDLG1CQUFtQjtBQUFBLE1BQ25CLGtDQUFrQyxDQUFDLFNBQVMsTUFBTTtBQUFBLE1BQ2xELGNBQWMsQ0FBQyxNQUFNO0FBQUEsTUFDckIsNEJBQTRCLENBQUMsS0FBSztBQUFBLE1BQ2xDLDhCQUE4QixDQUFDLEtBQUs7QUFBQSxNQUNwQyx1QkFBdUIsQ0FBQyxPQUFPO0FBQUEsTUFDL0IsOEJBQThCO0FBQUEsUUFDNUI7QUFBQSxRQUNBO0FBQUEsVUFDRSxpQkFBaUI7QUFBQSxRQUNuQjtBQUFBLE1BQ0Y7QUFBQSxNQUNBLHlCQUF5QjtBQUFBLFFBQ3ZCO0FBQUEsUUFDQTtBQUFBLFVBQ0UsT0FBTztBQUFBLFlBQ0wsV0FBVztBQUFBLFlBQ1gsWUFBWTtBQUFBLFVBQ2Q7QUFBQSxVQUNBLFFBQVEsQ0FBQyxXQUFXO0FBQUEsUUFDdEI7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRjsiLAogICJuYW1lcyI6IFtdCn0K
