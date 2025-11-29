# CharacterAvatar 组件深入分析

## 1. 组件职责

这是一个 **头像管理组件**，负责：
- 显示当前选中的头像
- 提供头像/立绘切换预览
- 管理头像列表（选择、删除、上传）
- 头像裁剪功能

---

## 2. Props 接口设计

```tsx
interface CharacterAvatarProps {
  // 数据输入
  role: Role;                        // 角色基本信息
  roleAvatars: RoleAvatar[];         // 头像列表（来自服务端）
  selectedAvatarId: number;          // 当前选中的头像 ID
  selectedAvatarUrl: string;         // 选中头像的 URL
  selectedSpriteUrl: string | null;  // 选中立绘的 URL
  
  // 回调函数（状态提升模式）
  onchange: (avatarUrl: string, avatarId: number) => void;  // 确认更改头像
  onAvatarSelect: (avatarId: number) => void;               // 选择头像（预览）
  onAvatarDelete: (avatarId: number) => void;               // 删除头像
  onAvatarUpload: (data: any) => void;                      // 上传头像
}
```

> **设计特点**：组件不持有核心数据状态，通过 props 接收数据，通过回调通知父组件变更 —— 典型的 **受控组件** 模式。

---

## 3. 状态管理分析

| 状态 | 类型 | 用途 |
|------|------|------|
| `showSprite` | UI 状态 | 切换显示头像/立绘模式 |
| `changeAvatarConfirmOpen` | URL 状态 | 头像选择弹窗（同步到 URL） |
| `isDeleteModalOpen` | URL 状态 | 删除确认弹窗 |
| `isCropModalOpen` | URL 状态 | 裁剪弹窗 |
| `avatarToDeleteIndex` | 临时状态 | 待删除头像的索引 |

### 3.1 URL 状态管理 (亮点)

```tsx
const [changeAvatarConfirmOpen, setChangeAvatarConfirmOpen] = 
  useSearchParamsState<boolean>(`changeAvatarPop`, false);
```

使用自定义 Hook `useSearchParamsState` 将弹窗状态同步到 URL：
- **好处**：支持浏览器后退关闭弹窗、刷新保持状态、可分享链接
- **命名**：使用唯一后缀避免冲突

---

## 4. 数据派生逻辑

```tsx
// 从 props 派生显示数据，优先使用列表中的数据
const selectedAvatar = roleAvatars?.find(a => a.avatarId === selectedAvatarId) || null;
const displayAvatarUrl = selectedAvatar?.avatarUrl || selectedAvatarUrl || "/favicon.ico";
const displaySpriteUrl = selectedAvatar?.spriteUrl || selectedSpriteUrl || "";
```

**优先级链**：
```
列表中匹配的头像 URL > props 传入的 URL > 默认图片
```

---

## 5. 核心交互流程

### 5.1 头像选择流程

```
用户点击头像列表中的头像
        │
        ▼
handleAvatarClick(avatarUrl, index)
        │
        ▼
onAvatarSelect(avatarId)  ←── 通知父组件更新选中状态
        │
        ▼
父组件更新 selectedAvatarId
        │
        ▼
组件重新渲染，派生新的 displayAvatarUrl
```

### 5.2 确认更改流程

```
用户点击"确认更改头像"
        │
        ▼
onchange(displayAvatarUrl, avatarId)  ←── 通知父组件
        │
        ▼
父组件调用 updateRole mutation
        │
        ▼
更新角色的 avatar 和 avatarId
```

### 5.3 删除头像流程

```tsx
handleDeleteAvatar(index) 
    → setAvatarToDeleteIndex(index)
    → setIsDeleteModalOpen(true)
        │
        ▼
confirmDeleteAvatar()
    │
    ├── 如果删除的是当前选中/使用的头像
    │       → 找替代头像
    │       → onchange() / onAvatarSelect()
    │
    ├── onAvatarDelete(avatarId)  ←── 乐观更新父组件缓存
    │
    └── deleteAvatar(avatarId)    ←── 调用后端 API
```

---

## 6. 响应式设计

```tsx
// 初始化：根据屏幕宽度决定默认显示模式
const [showSprite, setShowSprite] = useState(() => {
  return window.matchMedia("(min-width: 768px)").matches;
});

// 监听屏幕变化
useEffect(() => {
  const mediaQuery = window.matchMedia("(min-width: 768px)");
  const handleResize = (e: MediaQueryListEvent) => {
    setShowSprite(e.matches);
  };
  mediaQuery.addEventListener("change", handleResize);
  return () => mediaQuery.removeEventListener("change", handleResize);
}, []);
```

- **PC 端**：默认显示立绘（更大展示空间）
- **移动端**：默认显示头像（节省空间）

---

## 7. 组件层级结构

```
CharacterAvatar
├── 主头像显示区 (点击打开弹窗)
│
├── PopWindow (头像选择弹窗)
│   ├── AvatarPreview (大图预览 - 头像/立绘切换)
│   ├── 头像列表网格
│   │   ├── 已有头像 (可选择/删除)
│   │   └── CharacterCopper (上传新头像入口)
│   ├── AvatarPreview (聊天预览)
│   └── 操作按钮 (裁剪/确认)
│
├── PopWindow (删除确认弹窗)
│
└── PopWindow (裁剪弹窗)
    └── SpriteCropper
```

---

## 8. 设计亮点总结

| 模式 | 实现 | 好处 |
|------|------|------|
| **受控组件** | 核心状态由父组件管理 | 单一数据源，便于同步 |
| **URL 状态** | 弹窗状态同步到 searchParams | 支持后退、刷新、分享 |
| **响应式初始化** | `useState` 懒初始化 + `useEffect` 监听 | 适配不同设备 |
| **数据派生** | 从 ID 查找 URL，设置 fallback | 容错性强 |
| **删除保护** | 自动选择替代头像 | 防止空状态 |
| **组合组件** | `CharacterCopper`, `SpriteCropper`, `AvatarPreview` | 职责分离，复用性高 |

---

## 9. 与父组件的协作

```
CharacterDetail (父组件)
    │
    ├── selectedAvatarId (状态)
    ├── roleAvatars (React Query)
    │
    └── CharacterAvatar (子组件)
            │
            ├── onAvatarSelect → 更新 selectedAvatarId
            ├── onchange → 调用 updateRole mutation
            └── onAvatarDelete → 乐观更新 Query Cache
```

---

## 10. 子组件依赖

| 组件 | 职责 |
|------|------|
| `PopWindow` | 通用弹窗容器，支持全屏模式 |
| `AvatarPreview` | 头像/立绘预览，支持聊天气泡模式 |
| `CharacterCopper` | 头像上传与裁剪（上传入口） |
| `SpriteCropper` | 立绘/头像裁剪工具 |

---

## 11. API 调用

```tsx
// 上传头像
const { mutate } = useUploadAvatarMutation();

// 删除头像
const { mutate: deleteAvatar } = useMutation({
  mutationKey: ["deleteRoleAvatar"],
  mutationFn: async (avatarId: number) => {
    const res = await tuanchat.avatarController.deleteRoleAvatar(avatarId);
    if (res.success) {
      // 删除成功后使缓存失效，触发重新获取
      queryClient.invalidateQueries({
        queryKey: ["getRoleAvatars", role.id],
        exact: true,
      });
    }
  },
});
```
