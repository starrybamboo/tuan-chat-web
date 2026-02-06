# 任务清单: tc_header 图片上传修复 + 空间文档懒加载

Ŀ¼: `helloagents/plan/202601172234_tc_header_upload_and_doc_lazy/`

---

## 1. tc_header 上传修复
- [√] 1.1 在 `app/root.tsx` 的 `blocksuite-frame` 分支渲染 `modal-root`，确保裁剪弹窗可用，验证 why.md#需求-tc_header-图片可上传-场景-在-blocksuite-frame-中上传头像

## 2. 文档懒加载与去写回
- [√] 2.1 在 `app/components/chat/infra/blocksuite/runtime/spaceWorkspace.ts` 禁用初始化标题水合（避免全量 `doc.load()`），验证 why.md#需求-打开文档不全量加载空间文档-场景-打开空间文档
- [√] 2.2 在 `app/components/chat/infra/blocksuite/remoteDocSource.ts` pull 阶段去掉远端写回，仅合并本地队列用于当前会话呈现，验证 why.md#需求-打开文档不全量加载空间文档-场景-打开空间文档

## 3. 安全检查
- [√] 3.1 确认未引入明文密钥/生产环境写操作

## 4. 文档更新
- [√] 4.1 更新 `helloagents/wiki/modules/app.md`
- [√] 4.2 更新 `helloagents/CHANGELOG.md`
- [√] 4.3 更新 `helloagents/history/index.md`

## 5. 测试
- [√] 5.1 执行 `pnpm typecheck`
- [√] 5.2 执行 `pnpm lint`
