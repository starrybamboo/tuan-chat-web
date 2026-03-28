# 项目上下文

## 1. 基本信息

```yaml
名称: tuan-chat-web
描述: 团剧共创的 Web 客户端与 Electron 桌面壳，覆盖聊天、文档、素材包与创作空间协作
类型: Web 应用 + Electron 桌面应用
状态: 开发中
```

## 2. 技术上下文

```yaml
语言: TypeScript
框架: React 19, React Router 7
包管理器: pnpm
构建工具: Vite 6
```

### 主要依赖
| 依赖 | 版本 | 用途 |
|------|------|------|
| react | 19.0.0 | 前端视图层 |
| react-router | 7.9.4 | 路由与数据流 |
| @tanstack/react-query | 5.69.0 | 服务端状态与接口缓存 |
| zustand | 5.0.9 | 本地状态管理 |
| tailwindcss | 4.0.17 | 样式系统 |
| @phosphor-icons/react | 2.1.10 | 图标系统 |
| @blocksuite/affine | 0.22.4 | 文档编辑器与空间文档能力 |

## 3. 项目概述

### 核心功能
- 空间、房间、私聊与消息协作
- Space 文档、Blocksuite 编辑器与侧边栏树
- 发现页、素材包、资源与仓库相关工作流
- 空间资料、成员、角色、TRPG、WebGAL 等空间级面板

### 项目边界
```yaml
范围内:
  - 聊天空间与侧边栏树交互
  - 局内/局外素材包工作区
  - 聊天页内的空间详情路由与主内容区切换
范围外:
  - 后端接口定义与 OpenAPI 生成逻辑
  - Terre 地址配置变更
  - 未被当前任务触及的业务域重构
```

## 4. 开发约定

### 代码规范
```yaml
命名风格: TypeScript 使用 camelCase，React 组件使用 PascalCase
文件命名: 以功能命名的 camelCase.ts/tsx 为主
目录组织: app/components 按业务域拆分，chat 与 material 各自收口
```

### 错误处理
```yaml
错误呈现: toast 提示 + 控制台日志
接口状态: React Query 管理查询与 mutation 生命周期
```

### 测试要求
```yaml
测试框架: Vitest
强制校验: 修改完成后执行 pnpm typecheck
测试文件位置: 与模块相邻的 *.test.ts(x)
```

### Git规范
```yaml
提交频率: 每完成一轮实现/修改/修复后立即提交
提交语言: 中文 + English（项目指令要求双语提交）
分支策略: 当前仓库未在知识库中显式约定
```

## 5. 当前约束（源自历史决策）

| 约束 | 原因 | 决策来源 |
|------|------|---------|
| 使用 pnpm，不使用 npm | 项目级约定 | AGENTS.md |
| 修改完成后必须执行 pnpm typecheck | 项目级验收要求 | AGENTS.md |
| input 样式不要使用 daisyUI 输入类，使用 focus:ring/focus:border 方案 | 统一交互样式 | AGENTS.md |
| 默认圆角使用 rounded-md | 保持界面一致性 | AGENTS.md |
| 需要图标时使用 @phosphor-icons/react | 统一图标来源 | AGENTS.md |
| 使用 Tailwind CSS v4 风格类 | 保持样式栈一致 | AGENTS.md |
| 避免 Zustand selector 返回新对象与 useEffect 无条件写回状态 | 防止最大更新深度和循环订阅问题 | AGENTS.md |
| VITE_TERRE_URL 与 VITE_TERRE_WS 除非用户明确要求否则禁止修改 | 保持 Terre 环境一致 | AGENTS.md |

## 6. 已知技术债务（可选）

| 债务描述 | 优先级 | 来源 | 建议处理时机 |
|---------|--------|------|-------------|
| 素材包节点已接入侧边栏树，但当前尚未为素材包节点提供独立右键菜单或更细的侧边栏管理能力 | P2 | 2026-03-28 sidebar-material-package-tree | 若后续需要“固定/隐藏/批量整理素材包节点”时再扩展 |
