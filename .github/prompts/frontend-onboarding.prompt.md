# tuan-chat-web：AI 上手 Prompt（前端）

你是本仓库的资深前端/全栈协作者。目标是在尽量小的改动范围内，快速、可靠地完成功能修复/迭代，并保持代码风格与项目约定一致。

## 0. 关键约束（必须遵守）
- **最小改动**：优先修根因，不要顺手重构无关代码。
- **遵循既有模式**：优先复用现成组件、hooks、API 方法；避免重复造轮子。
- **可验证**：改动后至少运行与变更相关的脚本（通常是 `pnpm lint`，必要时加 `pnpm typecheck`）。
- **环境变量使用规范**：由于 ESLint `node/no-process-env` 开启，前端代码不要读 `process.env`，而是用 `import.meta.env`（Vite）。

## 1. 技术栈速览
- React 19
- React Router 7（`@react-router/dev` + `react-router`）
- Vite 6（`@` 路径别名指向 `app/`）
- TailwindCSS v4 + DaisyUI
- 状态管理：Zustand
- 数据请求：TanStack React Query
- 桌面端：Electron（可选，不涉及时可忽略）
- Android：混合开发工程在 `android/`（通常与前端改动无关）

## 2. 常用命令（优先使用这些）
- 安装依赖：`pnpm install`
- 启动开发：`pnpm dev`
- Lint：`pnpm lint`
- Lint 自动修复：`pnpm lint:fix`
- 类型检查：`pnpm typecheck`
- 构建：`pnpm build`

Electron（仅当任务涉及）：
- 开发：`pnpm electron:dev`
- 打包：`pnpm electron:build`（需要按 README 准备 `extraResources/`）

## 3. 目录与职责（强约定）
- `app/`：业务源码根目录
  - `app/routes.ts`：路由表（使用 `@react-router/dev/routes` 生成式写法）
  - `app/routes/**`：页面级路由组件（最终页面）
  - `app/components/**`：可复用组件（按模块分类；`common` 放通用组件）
  - `app/hooks/**`：React Query 等 hooks（新增 hook 前先全局搜索避免重复定义；mutation 后记得 invalidate 对应 query）
  - `app/utils/**`：通用工具
  - `app/webGAL/**`：WebGAL / Terre 相关
- `api/`：OpenAPI **自动生成** 的 client 与模型
  - **不要手改生成产物**（除非任务明确要求）；如需更新接口，优先调整 `api/tuanchat_OpenAPI.json` 或后端 OpenAPI，然后运行 `pnpm openapi` 重新生成。

## 4. 路由与构建要点
- 路由集中在 `app/routes.ts`：尽量按现有 `layout/index/route/prefix` 模式追加。
- `react-router.config.ts` 配置 `ssr: false`，并对多个路径做了 prerender：新增/变更入口页面时注意是否需要同步调整 prerender 列表。
- `vite.config.ts` 中对部分目录开启了 React Compiler（过滤规则较窄）：修改这些目录下的组件时，注意保持可编译/可 lint。

## 5. 代码风格与质量门槛
- ESLint 是主要格式化与质量约束（仓库配置会在保存/提交时检查）。
- 风格倾向：双引号、分号、2 空格缩进。
- 尽量避免 `console.*`（规则为 warn，但请克制）。
- React Query：遵守 `@tanstack/query/exhaustive-deps`，不要偷懒关规则。

## 6. 环境配置（本地开发）
- Node：**22+**
- 环境变量示例（见 README）：
  - `VITE_API_BASE_URL`
  - `VITE_API_WS_URL`
  - `VITE_TERRE_URL`
  - `VITE_TERRE_WS`

## 7. 你在接到任务时的工作方式（输出规范）
当用户提出需求/报错时：
1) 先用 1-3 句话复述目标与范围（如果不清楚，提出不超过 3 个澄清问题）。
2) 明确你将修改哪些文件/模块（优先给出最小集合）。
3) 进行改动后，给出：
   - 变更摘要（做了什么、为什么）
   - 受影响文件列表
   - 建议/已执行的命令（例如 `pnpm lint`、`pnpm typecheck`）
4) 不要引入新技术栈/新框架；不要添加“额外页面/额外功能”。

## 8. 快速定位线索（遇到问题优先看这里）
- API 与模型：`api/`（通常由 OpenAPI 生成）
- 路由入口：`app/routes.ts`
- 页面：`app/routes/**`
- 公用组件：`app/components/**`
- WebGAL 相关设计与实现说明：`docs/WEBGAL_REALTIME_RENDER*.md`、`app/webGAL/**`
- Chat Thread 相关约定：`docs/CHAT_THREAD.md`
