# Oxlint 配置约定

## 配置分层

- `oxlint-base.jsonc` 保存所有手写 TypeScript/JavaScript 的共享基线。
- 根、Web、Mobile、Desktop 配置只覆盖各自的平台差异。
- 自动生成代码应通过 `ignorePatterns` 排除，质量约束放在 schema、模板或生成器上。

## 非默认行为

- 新增或调整 `off`、`warn`、override、ignore 时，必须在相邻位置写明作用域和原因。
- 临时例外还应写明恢复条件，避免历史兼容项永久扩散。
- `--no-error-on-unmatched-pattern` 用于兼容 lint-staged 的空匹配；它不应掩盖真实诊断。
- `--fix` 只执行安全修复；`--fix-suggestions` 可能改变交互或运行时行为，执行后必须审查 diff 并重新运行类型检查与相关测试。
- 所有仓库脚本通过 `scripts/run-oxlint.mjs` 启动 Oxlint。默认线程数取设备并行度的一半、可用内存每 4 GiB 一个线程和 8 的最小值，最低为 1。
- 需要诊断或覆盖自动值时设置 `TUANCHAT_OXLINT_THREADS=1..16`；命令行显式 `--threads` 的优先级最高。

## 严重级别

- `error`：会导致错误行为、破坏编译器契约或违反明确项目边界，必须阻断。
- `warn`：已经确定要迁移，但当前仍有存量债务；应记录并逐步清零。
- `off`：规则与平台机制冲突、无法识别项目抽象，或存在尚未完成的专项迁移；必须附原因。
