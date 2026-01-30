# 任务清单: KP 可选择所有角色发言

目录: `helloagents/plan/202601302255_kp-role-select/`

---

## 1. 角色选择逻辑
- [✅] 1.1 在 `app/components/chat/input/expressionChooser.tsx` 放开 KP 的角色过滤逻辑，KP 使用房间全量角色列表；对应 why.md#需求-kp-可切换到任意角色发言-场景-kp-打开发言角色选择

## 2. 文档更新
- [✅] 2.1 更新 `helloagents/wiki/modules/chat.md`，记录 KP 角色选择范围调整
- [✅] 2.2 更新 `helloagents/CHANGELOG.md` 记录本次变更

## 3. 安全检查
- [✅] 3.1 进行权限与输入安全检查（无新增接口）

## 4. 测试
- [-] 4.1 手动验证角色选择面板的 KP/非 KP 行为
  > 备注: 未执行手动验证
