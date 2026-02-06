# 任务清单: WebGAL 端口可配置并使用 IndexedDB 存储

Ŀ¼: `helloagents/plan/202601111240_webgal_settings_terre_port_indexeddb/`

---

## 1. 设置存储（IndexedDB）
- [√] 1.1 新增实时渲染设置 IndexedDB 存储封装（TTS API 地址、Terre 端口）

## 2. 状态与 UI
- [√] 2.1 更新 `app/components/chat/stores/realtimeRenderStore.ts`：改用 IndexedDB 持久化，并新增 Terre 端口字段与 hydrate
- [√] 2.2 更新 `app/components/chat/shared/webgal/webGALPreview.tsx`：设置弹窗支持 Terre 端口配置且未启动时可打开

## 3. WebGAL 运行时配置
- [√] 3.1 新增 WebGAL Terre 运行时配置模块，并使 API/WS/预览 URL 使用当前配置
- [√] 3.2 更新 `app/components/chat/core/realtimeRenderOrchestrator.tsx`：`pollPort` 使用当前 Terre 端口

## 4. 安全检查
- [√] 4.1 执行安全检查（按G9：敏感信息处理、权限控制、EHRB风险规避）

## 5. 测试
- [√] 5.1 运行 `pnpm typecheck`
