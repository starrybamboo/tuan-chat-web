# 任务清单: 聊天导入头像映射兜底（已被后续方案覆盖）

Ŀ¼: helloagents/history/2026-01/202601242032_chat_import_fill_avatar_map/

---

## 1. 导入头像选择兜底
- [√] 1.1 导入前预解析消息角色集合，缺失时从角色头像列表选择“默认/首个”（最初方案为写入 `curAvatarIdMap`，后续已调整为运行时解析，见 202601242230）
- [√] 1.2 骰娘导入同样适用上述兜底逻辑（后续已由运行时解析覆盖）

## 2. 消息头像兜底策略
- [√] 2.1 消息渲染传入 roleId，以便在 avatarId<=0 时回退到角色首个头像
- [√] 2.2 当 avatarId<=0 且无法获取角色头像时，不再回退到 /favicon.ico

## 3. 文档更新
- [√] 3.1 更新 helloagents/wiki/modules/chat.md
- [√] 3.2 更新 helloagents/CHANGELOG.md

## 4. 测试
- [√] 4.1 执行 npm run typecheck
