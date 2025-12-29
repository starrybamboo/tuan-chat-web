# 项目技术约定

---

## 技术栈

- **运行环境:** Node.js ≥ 22
- **包管理:** pnpm（仓库包含 `pnpm-lock.yaml`）
- **前端:** React 19 + React Router 7（RSC/Vite）
- **语言:** TypeScript
- **样式:** Tailwind CSS + daisyUI
- **桌面端:** Electron + electron-builder
- **安卓端:** `android/`（混合开发）

---

## 目录结构约定（高层）

- `app/`：前端应用主体（路由、页面、组件、工具）
- `api/`：OpenAPI 生成的客户端代码 + 请求/WS 相关封装
- `electron/`：Electron 壳与打包配置
- `android/`：Android 工程

---

## 开发约定

- **代码规范:** 以 `eslint.config.mjs` 为准；提交前由 `husky` + `lint-staged` 触发检查
- **命名约定:** 以现有代码为准（TS/React 常用驼峰；文件夹按模块语义命名）
- **依赖安装:** `pnpm install`

---

## 环境变量

在项目根目录创建 `.env` 或 `.env.development`（示例键名如下，值以实际环境为准）：

- `VITE_API_BASE_URL`
- `VITE_API_WS_URL`
- `VITE_TERRE_URL`
- `VITE_TERRE_WS`

---

## API 客户端生成

OpenAPI 源文件：`api/tuanchat_OpenAPI.json`

生成命令（见 `package.json`）：

- `pnpm openapi`

生成输出目录（约定）：`api/core`、`api/models`、`api/services`

---

## 测试与流程

- **类型检查:** `pnpm typecheck`
- **Lint:** `pnpm lint`（必要时 `pnpm lint:fix`）
- **开发启动:** `pnpm dev`
- **Electron 开发:** `pnpm electron:dev`
- **Electron 打包:** `pnpm electron:build`

