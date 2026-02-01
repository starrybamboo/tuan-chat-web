# tuan-chat-web

> 本文件包含项目级别的核心信息。详细的模块文档见 `modules/` 目录。

---

## 1. 项目概述

### 目标与背景
本仓库为“团剧共创”前端项目：基于 React 构建响应式 Web 应用，并通过 Electron 构建 PC 客户端、通过 `android/` 工程构建安卓端（混合开发）。项目包含与后端的 HTTP/WS 通信，以及与 WebGAL/terre 相关的 replay 能力。

### 范围
- **范围内:** 前端 UI/路由、调用后端 API/WS、Electron/Android 壳构建、WebGAL/terre 集成
- **范围外:** 后端服务实现（仅通过 OpenAPI/接口约定集成）

### 干系人
- **负责人:** （待补充）

---

## 2. 模块索引

| 模块名称 | 职责 | ״̬ | 文档 |
|---------|------|------|------|
| app | 前端 UI、路由、组件与业务页面 | ?开发中 | [modules/app.md](modules/app.md) |
| api | OpenAPI 客户端、请求封装、WS 工具与 hooks | ?开发中 | [modules/api.md](modules/api.md) |
| chat | 空间/房间聊天业务、消息流、sidebarTree、房间资料与文档入口 | ?开发中 | [modules/chat.md](modules/chat.md) |
| blocksuite | Blocksuite/AFFiNE 编辑器集成（iframe、样式、标题、提及/引用） | ?开发中 | [modules/blocksuite.md](modules/blocksuite.md) |
| webgal | WebGAL/terre 集成（实时渲染、设置、空间变量） | ?开发中 | [modules/webgal.md](modules/webgal.md) |
| ai-image | AI 生图（NovelAI）页面与请求模式（同源代理/直连/Electron） | ?开发中 | [modules/ai-image.md](modules/ai-image.md) |
| electron | 桌面端壳、打包配置与资源集成 | ?开发中 | [modules/electron.md](modules/electron.md) |
| android | 安卓端工程（混合开发） | ?开发中 | [modules/android.md](modules/android.md) |
| tooling | 脚本、CI/CD、Lint/类型检查约定 | ?开发中 | [modules/tooling.md](modules/tooling.md) |

---

## 3. 快速链接

- [技术约定](../project.md)
- [架构设计](arch.md)
- [API 手册](api.md)
- [数据模型](data.md)
- [Blocksuite 依赖文档](vendors/blocksuite/index.md)
- [本地开发工作流](workflows/local-dev.md)
- [变更历史](../history/index.md)
