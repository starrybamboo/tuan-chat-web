# 聊天记录导出功能 - 集成到房间Tab

## 功能概述
将聊天记录导出功能从空间设置移动到房间内的独立抽屉(drawer)中,使用户可以在聊天时方便地导出记录。

## 修改内容

### 1. 创建导出抽屉组件
**文件**: `app/components/chat/sideDrawer/exportChatDrawer.tsx` (新建)

- 显示当前消息数量
- 提供导出选项配置:
  - 包含时间戳 (默认开启)
  - 包含用户ID (默认开启)
  - 日期格式选择:
    - 完整(日期+时间)
    - 简短(仅时间)
- 导出为TXT文件
- 使用RoomContext获取聊天历史
- 使用角色映射确保正确显示角色名称

### 2. 更新ChatToolbar组件
**文件**: `app/components/chat/chatToolbar.tsx`

- 添加 `SharpDownload` 图标导入
- 更新 `sideDrawerState` 类型,添加 `"export"` 选项
- 在右侧按钮组中添加"导出记录"按钮
- 按钮位于线索按钮之前

### 3. 更新RoomWindow组件
**文件**: `app/components/chat/roomWindow.tsx`

- 导入 `ExportChatDrawer` 组件
- 添加 `exportDrawerWidth` 状态管理(默认350px)
- 更新 `sideDrawerState` 类型,支持 `"export"` 状态
- 在侧边栏区域添加导出抽屉:
  - 使用 `OpenAbleDrawer` 包装
  - 支持宽度调整
  - 位置在线索抽屉之后

### 4. 清理SpaceDetailPanel
**文件**: `app/components/chat/sideDrawer/spaceDetailPanel.tsx`

- 移除 `ExportChatButton` 导入
- 移除渲染tab中的导出按钮
- 恢复原有的简洁布局

## 技术细节

### 状态管理
- 使用 `useLocalStorage` 保存抽屉宽度偏好
- 使用 `useSearchParamsState` 管理抽屉打开状态
- 导出选项使用本地 `useState` 管理

### 数据流
1. `RoomContext` 提供聊天历史消息
2. `useGetRolesQueries` 获取角色信息
3. 构建 `roleMap` 用于角色ID到名称的映射
4. 调用 `exportChatMessages` 工具函数生成并下载文件

### UI特性
- 抽屉支持拖动调整宽度
- 消息计数实时显示
- 导出按钮在无消息时禁用
- 导出中显示loading状态
- 使用 `react-hot-toast` 显示成功/错误提示

## 用户体验改进

### 之前的问题
- 导出按钮在空间详情面板中,需要额外步骤打开
- 按钮显示为灰色(可能因为不在正确的上下文中)
- 与渲染功能混在一起,不够独立

### 改进后
✅ 导出功能在聊天界面底部工具栏,一键访问
✅ 独立的抽屉界面,不干扰其他功能
✅ 可调整宽度,适应不同屏幕
✅ 实时显示消息数量,方便确认
✅ 完整的选项配置界面

## 使用方式

1. 在房间聊天界面,点击底部工具栏的下载图标
2. 右侧打开导出记录抽屉
3. 配置导出选项:
   - 勾选/取消勾选时间戳和用户ID
   - 选择日期格式
4. 点击"导出为 TXT 文件"按钮
5. 文件自动下载,文件名格式: `房间{roomId}_YYYYMMDD_HHmm.txt`

## 相关文件

### 新增
- `app/components/chat/sideDrawer/exportChatDrawer.tsx`

### 修改
- `app/components/chat/chatToolbar.tsx`
- `app/components/chat/roomWindow.tsx`
- `app/components/chat/sideDrawer/spaceDetailPanel.tsx`

### 依赖
- `app/utils/exportChatMessages.ts` (已存在)
- `app/components/chat/roomContext.tsx` (已存在)
- `api/queryHooks.tsx` (已存在)

## 图标使用
使用 `SharpDownload` 图标表示导出功能,与DaisyUI风格一致。
