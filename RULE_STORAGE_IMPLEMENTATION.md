# 角色规则存储功能实现总结

## 实现的功能

### 1. 浏览器存储管理 (`roleRuleStorage.ts`)
创建了一个新的工具模块来管理角色与规则的映射关系:
- `getRoleRule(roleId)`: 获取角色对应的规则ID
- `setRoleRule(roleId, ruleId)`: 保存角色对应的规则ID
- `removeRoleRule(roleId)`: 删除角色的规则映射
- `clearRoleRules()`: 清空所有映射

数据存储在 `localStorage` 中,key为 `'role_rule_mapping'`

### 2. ExpansionModule 规则未创建状态
修改了 `ExpansionModule.tsx`:
- **注释掉自动创建规则的逻辑**: 不再在规则数据不存在时自动创建
- **添加规则未创建检测**: 使用 `isRuleNotCreated` 变量检测规则是否存在
- **添加手动创建功能**: 提供 `handleCreateRule` 函数供用户手动触发创建
- **UI显示**: 当规则未创建时显示友好的提示界面,引导用户点击按钮创建

### 3. 角色详情页 (`roleId.tsx`)
- **导入存储工具**: 引入 `getRoleRule` 和 `setRoleRule`
- **优先级读取**: 
  1. 优先从URL参数读取规则ID
  2. 如果URL没有,则从localStorage读取
  3. 默认使用规则ID=1
- **自动同步URL**: 如果URL中没有规则参数但localStorage有,则自动更新URL
- **保存规则变化**: 在 `handleRuleChange` 中,每次规则变化时保存到localStorage

### 4. 角色创建页 (`entry.tsx`)
- **导入存储工具**: 引入 `setRoleRule`
- **创建时保存**: 在 `handleCreationComplete` 中:
  - 如果提供了规则ID,保存该规则ID
  - 如果没有提供,默认保存规则ID=1
  - 这确保新创建的角色也有规则记忆

### 5. 侧边栏 (`Sidebar.tsx`)
- **导入存储工具**: 引入 `getRoleRule`
- **智能跳转**: 点击角色时,NavLink使用localStorage存储的规则ID构建URL
- **默认值处理**: 如果localStorage中没有该角色的规则,默认使用规则ID=1

## 用户体验改进

1. **规则记忆**: 用户为每个角色选择的规则会被记住,下次打开该角色时自动跳转到上次的规则
2. **明确创建**: 规则不会自动创建,用户需要明确点击按钮创建,避免意外创建
3. **友好提示**: 当规则未创建时,显示清晰的UI提示和创建按钮
4. **无缝切换**: 在侧边栏点击角色时,自动跳转到该角色上次查看的规则页面
5. **URL同步**: 规则选择会反映在URL中,支持浏览器前进/后退

## 数据流程

```
1. 创建角色时:
   创建角色 → setRoleRule(roleId, ruleId) → localStorage

2. 查看角色时:
   Sidebar点击 → getRoleRule(roleId) → 构建URL → 跳转到规则页面

3. 切换规则时:
   选择新规则 → handleRuleChange → setRoleRule(roleId, newRuleId) → 更新URL

4. 刷新页面时:
   roleId.tsx加载 → 检查URL参数 → 如果没有则从localStorage读取 → 更新URL
```

## 技术要点

1. **localStorage**: 使用浏览器本地存储持久化数据
2. **React Hooks**: 使用useEffect同步状态和URL
3. **条件渲染**: 根据规则是否存在显示不同UI
4. **URL状态管理**: 通过searchParams和navigate管理URL状态
5. **类型安全**: 所有函数都有明确的类型定义

## 文件修改列表

1. ✅ `app/utils/roleRuleStorage.ts` (新建)
2. ✅ `app/components/newCharacter/rules/ExpansionModule.tsx`
3. ✅ `app/routes/role/roleId.tsx`
4. ✅ `app/routes/role/entry.tsx`
5. ✅ `app/components/newCharacter/Sidebar.tsx`
