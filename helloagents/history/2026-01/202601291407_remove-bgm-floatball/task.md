# 任务清单: 移除房间级 BGM 悬浮球

目录: `helloagents/plan/202601291407_remove-bgm-floatball/`

---

## 1. 代码变更
- [√] 1.1 删除 `app/components/chat/room/bgmFloatingBall.tsx`（移除房间级 BGM 悬浮球组件）

## 2. 文档更新
- [√] 2.1 更新 `docs/BGM_SYNC_FEATURE_2026-01-09.md`：移除对房间级 BGM 悬浮球的引用，并说明改为全局音频悬浮球聚合
- [√] 2.2 更新 `helloagents/CHANGELOG.md`：记录移除房间级 BGM 悬浮球

## 3. 验证
- [X] 3.1 运行 `pnpm typecheck`：当前仓库存在既有类型错误（与本次改动无关）
