# 任务清单: 空间首次进入默认打开首个房间

目录: `helloagents/plan/202601140543_open-first-room/`

---

## 1. Chat 路由与默认选房
- [√] 1.1 在 `app/components/chat/chatPage.tsx` 中修复 `setActiveRoomId(null)` 生成 `/null` 的导航问题
- [√] 1.2 在 `app/components/chat/chatPage.tsx` 中将空间模式默认选房逻辑改为：仅在 `orderedRooms` 就绪且 URL roomId 缺失/无效时回填到 `orderedRooms[0]`

## 2. 安全检查
- [√] 2.1 执行安全检查（按G9: 输入验证、敏感信息处理、权限控制、EHRB风险规避）

## 3. 测试
- [X] 3.1 执行 `pnpm typecheck` 与 `pnpm lint`（如依赖已安装），并进行本地路由手工验证
  > 备注: `pnpm typecheck` 通过；`pnpm lint` 当前在多个既有文件存在错误（与本次改动无直接关联），见 eslint 输出（如 `entityHeaderOverrideStore.ts` unused vars 等）
