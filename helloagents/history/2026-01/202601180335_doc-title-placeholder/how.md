# 技术设计: 房间列表标题对齐 tc_header

## 技术方案

### 核心技术
- React + Zustand
- Blocksuite doc meta

### 实现要点
- 在 ChatRoomListPanel 建立 docMeta 全量映射
- 渲染 room 节点时优先使用 room doc 的 docHeaderOverride/doc meta 标题
- room.name 为空或为 Untitled 时替换显示标题
- 文档节点忽略 Untitled 占位标题

## 安全与性能
- 安全: 无新增风险
- 性能: 仅新增轻量 Map 查找，不引入额外请求

## 测试与部署
- 手动回归: 房间列表/文档列表标题显示
