# AGENTS.md

## 任务完成要求

- 在任务被视为完成之前，pnpm test、pnpm lint 和 pnpm typecheck 必须全部通过。

## 项目概览

- tuanchat 是一个以消息为基座、支持角色扮演创作的聊天室平台，面向 galgame 和跑团 replay 场景。

## 工作原则

- 长期可维护性优先于局部省事。
- 新增功能前先看能否抽出可复用的共享逻辑。
- 避免在多个文件重复实现同一逻辑。
- 不要为了赶进度在局部补丁式绕过问题，优先修正根因。
- 尽量失败即停，不要写不必要的 fallback。
- 业务层不要吞错；让异常尽早冒泡，必要时只在边界层处理。
- 优先直接调用 owning module 或 service，不要无意义地加一层抽象。

## 编码约定

- 需要对外暴露的类型、接口、函数、类要补充注释；关键分支逻辑也要有功能性注释。
- 写代码时优先复用现有 common 组件/ util 函数；如果公共逻辑明显可复用，先抽到 common/util 再使用。
- 不要创建本地重复类型，也不要为了绕 TypeScript 问题去 cast 成临时替身类型。
- 尽量不要手写显式返回类型，除非 TypeScript 推断不稳或公共契约需要。
- 单元测试要严格镜像源码目录结构，每个测试文件只测试对应源文件的行为。
- 测试要能证明问题真实存在；不要只写“会通过但证明不了什么”的测试。

## React 与状态管理

- 避免 React 最大更新深度和 useSyncExternalStore 循环；在 useEffect 写回状态前先做相等性判断。
- 对对象和数组比较时，优先按 id、长度或关键字段判断，避免每次 render 都触发 setState。
- 避免 Zustand 选择器返回新对象；需要组合字段时用 shallow，或拆成多个 selector。
- store 的 set 和更新函数在没有变化时应返回旧 state 或 prev，避免订阅者反复触发更新。
- useSearchParamsState 的 defaultValue 必须是稳定引用；默认值会变化时传 shortenUrl=false，避免 URL 和默认值来回写。

## UI 与前端约束

- 前端页面不要产生对功能进行叙述的文字。
- input 样式不要使用 daisy UI，优先使用 transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary。
- 默认圆角使用 rounded-md。
- 需要 Icon 时使用 phosophorIcon。
- 使用 tailwind css v4 的样式类。

## 代码与平台注意事项

- 严禁在源码中用 Unicode 转义形式书写常见可见符号，必须直接写可读字符。
- 文本文件统一使用 UTF-8 保存。
- 通过脚本或命令写文件时显式指定编码，避免默认 ANSI 或 GBK 造成乱码。
- 发现乱码先检查文件编码与终端解码设置，必要时重存为 UTF-8。
- Java 源码不要带 UTF-8 BOM；如果遇到 javac 的非法字符错误，先清 BOM。

## 仓库特定约束

- 每完成一轮答复（实现、修改、修复）后，立即进行 git commit。
- 如果修改了 WebGAL 引擎（含 WebGAL/packages/webgal 或 WebGAL/packages/parser），需自动执行同步脚本：D:\\A_webgal\\WebGAL\\sync-terre-engine.ps1。
- Terre 连接地址在所有环境统一固定为：VITE_TERRE_URL=http://localhost:3001、VITE_TERRE_WS=ws://localhost:3001/api/webgalsync；除非用户明确要求，否则禁止修改这两个变量，包括 .env.development、.env.production、.env.test 与 CI/CD 注入值。
- 如果用户提到“团剧共创”与 WebGAL / Terre 联动、完整设置开关、角色发言聚焦、空间级 WebGAL 设置，先读 docs/reference/webgal-tuanchat-index.md。
- helloagent 不要落文档知识库。
- 不要调用方案设计。
- 搜索前必须先明确搜索范围；默认限制在当前主仓库相关目录内，避免全局命中无关文档、.worktrees 或其他代理工作区。