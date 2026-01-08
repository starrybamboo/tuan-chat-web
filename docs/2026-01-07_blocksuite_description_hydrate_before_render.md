# 2026-01-07 Blocksuite 描述编辑器：hydrate → render 顺序修复

## 背景/问题
- 现象：后端 `/blocksuite/doc` 的 GET/PUT 均成功，Yjs 中 blocks/paragraph 已存在，但页面正文不渲染（placeholder 仍在、rich-text 仅零宽字符）。
- 推断：编辑器视图在 doc 的远端快照恢复之前就完成了初始化/绑定，后续 restore/merge 更新未能触发正确的“根文档/视图树”刷新。

## 目标
- 对齐 AFFiNE 典型时序：先把 doc 恢复到远端快照（必要时合并离线 pending），再创建 store/editor 并挂载到 DOM。

## 代码变更
- 调整 [app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx](../app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx)
  - 修复此前一次重构中产生的语法/作用域污染（错误代码被插入到函数体内部）。
  - 统一初始化流程为：
    1) 迁移 legacy 本地 docId（仅在 `space:<spaceId>:description` 场景）
    2) 拉取远端 snapshot（如有）并 restore 到 workspace
    3) 合并本地离线队列（IndexedDB）并 best-effort 写回远端
    4) 创建 store/editor，再挂载
  - 移除“多次 switchEditor/requestUpdate”的强行刷新逻辑，避免依赖 workaround。

## 验证
- `pnpm -s react-router typegen`
- `pnpm -s tsc -p tsconfig.typecheck.json`

## 后续建议
- 若仍出现“Yjs 有数据但正文空”的情况：建议在运行时打印 paragraph model 的 `props.text`（类型/内容）与 store.root 的 page/note 结构，进一步确认是数据结构还是视图绑定问题。