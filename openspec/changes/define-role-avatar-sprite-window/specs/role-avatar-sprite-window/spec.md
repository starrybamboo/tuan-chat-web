## ADDED Requirements

### Requirement: 窗口入口与外壳
Web 角色详情页 SHALL 使用当前角色头像区域作为角色头像/立绘管理窗口的入口。该窗口 SHALL 提供左侧头像与立绘组导航区，并提供右侧头像设置、立绘校正、头像校正、回收站工作区。

#### Scenario: 从角色头像区域打开窗口
- **WHEN** 用户在角色详情页点击当前头像区域
- **THEN** 系统 SHALL 打开角色头像/立绘管理窗口
- **THEN** 窗口 SHALL 加载当前角色的头像列表、立绘组列表和当前头像上下文

#### Scenario: 桌面端窗口布局
- **WHEN** 窗口显示在桌面端视口
- **THEN** 左侧导航区 SHALL 保持可见，用于头像与立绘组导航
- **THEN** 右侧工作区 SHALL 显示当前 tab 内容，且不得替换左侧导航区

#### Scenario: 移动端窗口布局
- **WHEN** 窗口显示在移动端视口
- **THEN** 系统 SHALL 提供头像/工具抽屉或等价导航入口
- **THEN** 桌面端可用的所有流程 SHALL 在移动端仍可触达

### Requirement: RoleAvatar 媒体身份
系统 SHALL 将媒体 fileId 作为角色头像图片资产的 canonical 身份。运行时展示地址 SHALL 从媒体 fileId 派生，且 SHALL 不作为头像的 canonical 状态长期保存。

#### Scenario: 头像记录保存媒体 fileId
- **WHEN** 头像拥有上传或裁剪后的图片资产
- **THEN** 头像记录 SHALL 通过 `originFileId`、`spriteFileId`、`avatarFileId` 标识这些资产
- **THEN** 展示辅助函数 SHALL 基于这些 fileId 派生预览地址

#### Scenario: 旧 URL 字段不是运行时 fallback
- **WHEN** 某个流程所需的媒体 fileId 缺失
- **THEN** 该流程 SHALL 报告缺失 fileId 或缺失裁剪结果
- **THEN** 该流程 SHALL 不得静默 fallback 到旧的持久化 URL 字段

#### Scenario: 运行时预览使用派生地址
- **WHEN** 窗口渲染头像缩略图、立绘预览或聊天头像预览
- **THEN** 窗口 SHALL 从对应 fileId 解析媒体展示源
- **THEN** 派生地址 SHALL 只作为渲染细节，而不是持久化角色状态

### Requirement: 图片流水线顺序
系统 SHALL 将角色头像图片创建建模为严格流水线：上传原图，然后立绘校正，然后头像校正。头像校正 SHALL 使用已经生成的立绘作为裁剪源。

#### Scenario: 上传创建原图源
- **WHEN** 用户为角色头像上传图片
- **THEN** 系统 SHALL 创建或更新带有 `originFileId` 的头像记录
- **THEN** 在立绘校正和头像校正完成前，系统 SHALL 不得把该头像视为完整校正状态

#### Scenario: 立绘校正生成立绘源
- **WHEN** 用户应用立绘校正
- **THEN** 系统 SHALL 从 `originFileId` 标识的原图裁剪
- **THEN** 系统 SHALL 写入 `spriteFileId` 和 `spriteCropContext`

#### Scenario: 头像校正使用立绘源
- **WHEN** 用户应用头像校正
- **THEN** 系统 SHALL 从 `spriteFileId` 标识的立绘图片裁剪
- **THEN** 系统 SHALL 写入 `avatarFileId` 和 `avatarCropContext`

#### Scenario: 缺少立绘源时进入头像校正
- **WHEN** 用户对缺少 `spriteFileId` 的头像进入头像校正
- **THEN** 系统 SHALL 阻止裁剪操作
- **THEN** 系统 SHALL 提示用户先完成立绘校正

#### Scenario: 立绘校正强制进入头像校正
- **WHEN** 单个头像、已选头像或已选立绘组的立绘校正成功
- **THEN** 窗口 SHALL 对同一有效选择集进入头像校正
- **THEN** 窗口 SHALL 保留足够的选择状态，以便头像校正应用到同一组头像

### Requirement: 左侧头像列表
左侧导航区 SHALL 展示头像缩略图、名称、当前选择、上传入口、可选多选控制和 category 分组。category 分组 SHALL 独立于立绘组归属。

#### Scenario: 选择普通头像
- **WHEN** 用户在非多选模式点击普通头像卡片
- **THEN** 该头像 SHALL 成为当前活跃头像
- **THEN** 右侧工作区 SHALL 为该头像显示单头像设置或当前 tab 内容

#### Scenario: 多选头像
- **WHEN** 用户进入多选模式并选择多个头像卡片
- **THEN** 右侧工作区 SHALL 显示所选头像的批量设置
- **THEN** 裁剪 tab SHALL 只接收所选头像作为批量目标

#### Scenario: category 独立折叠
- **WHEN** 用户折叠某个 category 分组
- **THEN** 该 category 下的头像 SHALL 在当前列表视图中隐藏
- **THEN** 这些头像的立绘组归属 SHALL 不发生变化

#### Scenario: 从 category 上传
- **WHEN** 用户通过某个 category 分组上传图片
- **THEN** 新创建头像 SHALL 继承该 category
- **THEN** 新创建头像 SHALL 继续进入正常上传校正流水线

### Requirement: 立绘组作为文件夹和批量对象
系统 SHALL 将每个立绘组呈现为左侧导航区中的文件夹式卡片。点击立绘组卡片 SHALL 选中该组作为可编辑批量对象，但 SHALL 不得自动进入组内视图。

#### Scenario: 从外层列表选择立绘组
- **WHEN** 用户在外层列表点击立绘组卡片
- **THEN** 该立绘组 SHALL 成为当前活跃选择
- **THEN** 外层头像列表 SHALL 保持可见
- **THEN** 右侧工作区 SHALL 显示该组头像的立绘组设置

#### Scenario: 显式进入组内管理
- **WHEN** 立绘组已被选中，且用户点击“进入组内管理”
- **THEN** 左侧导航区 SHALL 切换到该组的头像列表
- **THEN** 左侧标题 SHALL 包含角色名和组名
- **THEN** 左侧导航区 SHALL 提供离开组内视图的返回控制

#### Scenario: 从组内视图返回
- **WHEN** 用户触发组内视图返回控制
- **THEN** 窗口 SHALL 回到外层列表
- **THEN** 用户需要再次点击立绘组卡片，才能重新把该组作为外层活跃对象

#### Scenario: 立绘组卡片采用头像式展示
- **WHEN** 左侧导航区显示立绘组卡片
- **THEN** 该卡片 SHALL 使用与普通头像卡片一致的视觉尺寸
- **THEN** 该卡片在存在组封面头像时 SHALL 显示封面图
- **THEN** 该卡片 SHALL 在图片下方显示组名和头像数量

### Requirement: 立绘组归属
系统 SHALL 允许每个头像最多属于一个立绘组。立绘组归属 SHALL 独立于 category。将头像移入组 SHALL 设置 `variantId`；将头像移出组 SHALL 清空 `variantId`。

#### Scenario: 头像只属于一个组
- **WHEN** 用户将头像绑定到立绘组
- **THEN** 该头像 SHALL 只有一个 `variantId`
- **THEN** 任何已有立绘组归属 SHALL 只通过显式重分配流程替换

#### Scenario: 将头像移出组
- **WHEN** 用户选择将头像移出立绘组
- **THEN** 系统 SHALL 清空这些头像的 `variantId`
- **THEN** 这些头像的 category SHALL 保持不变

#### Scenario: 组内视图保留 category 分类
- **WHEN** 用户进入某个立绘组视图
- **THEN** 该组头像 SHALL 仍按 category 分组
- **THEN** category 变更 SHALL 不改变立绘组归属

### Requirement: 立绘组合成配置
立绘组 SHALL 拥有 `compositionConfig`，并将其作为组内 sprite crop、avatar slot、WebGAL `spriteTransform`、输出画布和兼容源图尺寸的单一真相。

#### Scenario: 从已校正头像创建立绘组
- **WHEN** 用户从已校正头像创建立绘组
- **THEN** 系统 SHALL 创建包含 `baseAvatarId`、组名和 `compositionConfig` 的 `RoleAvatarVariant`
- **THEN** 所选头像 SHALL 绑定到该新立绘组

#### Scenario: 组配置记录立绘裁剪和头像槽位
- **WHEN** 立绘组完成立绘校正和头像校正
- **THEN** 该组 `compositionConfig` SHALL 包含原图坐标空间中的立绘裁剪配置
- **THEN** 该组 `compositionConfig` SHALL 包含立绘坐标空间中的头像槽位配置

#### Scenario: 组配置记录 WebGAL transform
- **WHEN** 用户对立绘组应用带 transform 设置的立绘校正
- **THEN** 该组 `compositionConfig` SHALL 保存生成的 WebGAL `spriteTransform`
- **THEN** 组内成员 SHALL 使用该 transform 进行 WebGAL 预览和导出

#### Scenario: 源图尺寸必须匹配组配置
- **WHEN** 用户将头像绑定到已有立绘组，且该头像原图尺寸与组兼容源图尺寸不一致
- **THEN** 系统 SHALL 拒绝对该头像应用组配置
- **THEN** 系统 SHALL 对该头像或该批次显示尺寸不一致错误

### Requirement: 立绘组编辑的批量行为
系统 SHALL 将选中的立绘组视为立绘校正、头像校正和组设置的隐式批量选择。立绘组编辑 SHALL 同时更新头像输出和组 `compositionConfig`。

#### Scenario: 选中组后进行立绘校正
- **WHEN** 用户在选中立绘组时进入立绘校正
- **THEN** 裁剪器 SHALL 以该组内所有兼容头像为目标
- **THEN** 应用裁剪 SHALL 更新组立绘裁剪配置和 WebGAL transform
- **THEN** 窗口 SHALL 对同一立绘组继续进入头像校正

#### Scenario: 选中组后进行头像校正
- **WHEN** 用户在选中立绘组时进入头像校正
- **THEN** 裁剪器 SHALL 以该组内所有兼容头像为目标
- **THEN** 应用裁剪 SHALL 更新组头像槽位

#### Scenario: 组设置显示数量
- **WHEN** 右侧工作区显示立绘组设置
- **THEN** 右侧工作区 SHALL 显示该组头像数量
- **THEN** 当用户尚未处于组内视图时，右侧工作区 SHALL 提供显式“进入组内管理”操作

### Requirement: 单头像设置
普通头像被选中时，头像设置 tab SHALL 支持单头像名称编辑、category 编辑、立绘组绑定、WebGAL 预览和聊天头像预览。

#### Scenario: 编辑头像名称
- **WHEN** 用户编辑单个头像的显示名称
- **THEN** 系统 SHALL 将名称保存到头像标题
- **THEN** 缩略图标签 SHALL 反映已保存名称

#### Scenario: 编辑头像 category
- **WHEN** 用户编辑单个头像的 category
- **THEN** 系统 SHALL 保存该 category
- **THEN** 头像列表 SHALL 将该头像重新归入更新后的 category

#### Scenario: 绑定单头像到已有组
- **WHEN** 用户将单个头像绑定到已有立绘组
- **THEN** 系统 SHALL 应用该组 `compositionConfig` 重建立绘和头像输出
- **THEN** 该头像旧裁剪上下文和旧 WebGAL transform SHALL 被组派生值替换

#### Scenario: 单头像预览
- **WHEN** 普通头像被选中
- **THEN** 右侧工作区 SHALL 使用该头像的立绘图片和 transform 显示 WebGAL 立绘预览
- **THEN** 右侧工作区 SHALL 使用该头像图片显示聊天气泡预览

### Requirement: 上传目标选择
单个上传和批量上传 SHALL 使用同一套目标选择模型：未分组、已有立绘组、新建立绘组。所选目标 SHALL 决定上传后的校正流程。

#### Scenario: 上传为未分组
- **WHEN** 用户以未分组目标上传图片
- **THEN** 系统 SHALL 创建带 `originFileId` 的头像记录
- **THEN** 系统 SHALL 为创建的头像启动立绘校正

#### Scenario: 上传到配置完整的已有组
- **WHEN** 用户以已有立绘组为目标上传图片，且该组拥有完整 `compositionConfig`
- **THEN** 系统 SHALL 将组配置应用到这些头像
- **THEN** 系统 SHALL 将成功头像绑定到目标组

#### Scenario: 上传到配置不完整的已有组
- **WHEN** 用户以已有立绘组为目标上传图片，且该组缺少完整 `compositionConfig`
- **THEN** 系统 SHALL 启动立绘校正
- **THEN** 系统 SHALL 继续进入头像校正以补齐组配置

#### Scenario: 上传为新立绘组
- **WHEN** 用户以新建立绘组为目标上传图片
- **THEN** 系统 SHALL 请求或使用预期组名
- **THEN** 系统 SHALL 在完成立绘校正和头像校正后完成组创建

#### Scenario: 批量上传部分成功
- **WHEN** 批量上传创建了部分头像且部分文件失败
- **THEN** 系统 SHALL 保留成功创建的头像记录
- **THEN** 系统 SHALL 显示成功数和失败数
- **THEN** 只有成功头像 SHALL 继续进入校正流程

### Requirement: 应用已有立绘组
将所选头像绑定到已有立绘组 SHALL 使用目标组 `compositionConfig` 从头像原图重建这些头像。系统 SHALL 不得只修改 `variantId`。

#### Scenario: 对所选头像应用组配置
- **WHEN** 用户将所选头像绑定到已有立绘组
- **THEN** 系统 SHALL 使用组立绘裁剪配置，把每个头像的原图裁剪为立绘
- **THEN** 系统 SHALL 使用组头像槽位，把每个生成立绘继续裁剪为头像
- **THEN** 成功头像 SHALL 更新 `variantId`、`spriteCropContext`、`avatarCropContext`、`spriteTransform`、`spriteFileId` 和 `avatarFileId`

#### Scenario: 缺少原图时拒绝应用已有组
- **WHEN** 所选头像缺少 `originFileId` 或缺少可读取原图
- **THEN** 该头像 SHALL 无法应用组配置
- **THEN** 系统 SHALL 报告该头像缺少可用原图

#### Scenario: 应用已有组部分失败
- **WHEN** 组配置应用对部分所选头像成功且对部分头像失败
- **THEN** 成功头像 SHALL 保持更新并绑定到目标组
- **THEN** 失败头像 SHALL 保持原状态
- **THEN** UI SHALL 显示成功数和失败数

### Requirement: 拖拽分配到立绘组
左侧导航区 SHALL 支持将一个或多个头像拖拽到立绘组卡片，并通过与显式绑定一致的组配置应用流程完成分配。

#### Scenario: 拖拽单个头像到组
- **WHEN** 用户将普通头像卡片拖拽到立绘组卡片
- **THEN** 系统 SHALL 对该头像应用目标组 `compositionConfig`
- **THEN** 应用成功时系统 SHALL 将该头像绑定到目标组

#### Scenario: 拖拽多选头像到组
- **WHEN** 用户从多选集合中拖拽一个头像到立绘组卡片
- **THEN** 系统 SHALL 将完整多选集作为拖拽批次
- **THEN** 系统 SHALL 对每个已选头像应用目标组流程

#### Scenario: 拖拽目标反馈
- **WHEN** 被拖拽头像悬停在立绘组卡片上
- **THEN** 该卡片 SHALL 显示明确的可放置状态
- **THEN** 鼠标离开或完成放置后，该视觉状态 SHALL 被清除

### Requirement: 裁剪器模式行为
裁剪器 SHALL 支持立绘模式和头像模式，并在两种模式下提供共享的单体/批量导航、进度反馈、锁定处理和裁剪应用控制。

#### Scenario: 立绘模式源图
- **WHEN** 裁剪器处于立绘模式
- **THEN** 裁剪器 SHALL 从原图加载裁剪源
- **THEN** 裁剪器 SHALL 将结果保存为立绘图片

#### Scenario: 头像模式源图
- **WHEN** 裁剪器处于头像模式
- **THEN** 裁剪器 SHALL 从立绘图片加载裁剪源
- **THEN** 裁剪器 SHALL 将结果保存为头像图片

#### Scenario: 批量裁剪进度
- **WHEN** 批量裁剪正在运行
- **THEN** 系统 SHALL 在加载、裁剪和上传阶段展示进度
- **THEN** 操作运行期间系统 SHALL 阻止重复提交裁剪

#### Scenario: 非组编辑时锁定已入组头像
- **WHEN** 头像已经属于立绘组，且用户不是以该立绘组为活跃批量对象进行编辑
- **THEN** 系统 SHALL 阻止该头像的手动立绘裁剪或头像裁剪
- **THEN** UI SHALL 说明裁剪被立绘组归属锁定

#### Scenario: 头像裁剪器不提供组应用选择器
- **WHEN** 裁剪器处于头像模式
- **THEN** 裁剪器 SHALL 不显示独立的“应用立绘组”选择器
- **THEN** 立绘组分配 SHALL 保持在头像设置或批量设置流程中

### Requirement: 批量设置
多选头像、选中立绘组和组内视图 SHALL 显示批量设置面板。该面板 SHALL 提供立绘校正、头像校正、绑定或移出立绘组，以及适用时的删除操作。

#### Scenario: 多选头像显示批量设置
- **WHEN** 用户选择多个头像
- **THEN** 右侧工作区 SHALL 显示批量设置
- **THEN** 右侧工作区 SHALL 显示已选头像数量

#### Scenario: 选中组显示组设置
- **WHEN** 用户在组内视图外选中立绘组
- **THEN** 右侧工作区 SHALL 显示立绘组设置
- **THEN** 右侧工作区 SHALL 隐藏“绑定到已有立绘组”，因为当前选中对象已经是组

#### Scenario: 批量绑定到已有组
- **WHEN** 用户选择未分组头像并在批量设置中选择目标立绘组
- **THEN** 系统 SHALL 应用已有组配置流程
- **THEN** 绑定动作启用前 SHALL 要求存在目标组

#### Scenario: 批量删除所选头像
- **WHEN** 用户请求删除所选普通头像
- **THEN** 系统 SHALL 要求确认
- **THEN** 系统 SHALL 阻止删除该角色的全部头像

### Requirement: 回收站与恢复
窗口 SHALL 提供用于已删除头像的回收站 tab。只要回收站记录仍可用，已删除头像 SHALL 可恢复。

#### Scenario: 软删除头像
- **WHEN** 用户在窗口中删除头像
- **THEN** 该头像 SHALL 进入角色头像回收站状态
- **THEN** 该头像 SHALL 不再显示于普通头像列表

#### Scenario: 恢复头像
- **WHEN** 用户从回收站恢复头像
- **THEN** 该头像 SHALL 返回角色活跃头像列表
- **THEN** 回收站列表 SHALL 刷新

#### Scenario: 清空回收站
- **WHEN** 用户清空角色头像回收站
- **THEN** 系统 SHALL 移除该角色所有可恢复的已删除头像条目
- **THEN** 清空过程中系统 SHALL 禁用重复清空请求

### Requirement: WebGAL 预览与导出合同
窗口 SHALL 维护 WebGAL 预览和后续导出所需数据：立绘图片、头像图片、`spriteTransform` 和立绘组 `compositionConfig`。

#### Scenario: 单头像 WebGAL 预览
- **WHEN** 单个头像被选中
- **THEN** 预览 SHALL 使用该头像立绘图片和有效 `spriteTransform` 渲染立绘
- **THEN** 预览 SHALL 使用该头像图片渲染聊天预览

#### Scenario: 组 transform 传播
- **WHEN** 立绘组的 `compositionConfig` 中存在 `spriteTransform`
- **THEN** 组内成员 SHALL 使用该 transform 进行 WebGAL 预览和导出
- **THEN** 新头像绑定到该组时 SHALL 复制或派生同一 transform

#### Scenario: 导出使用 fileId 和上下文
- **WHEN** WebGAL 导出或预览需要角色图片资产
- **THEN** 系统 SHALL 使用 `spriteFileId`、`avatarFileId`、`spriteTransform` 和组 `compositionConfig`
- **THEN** 系统 SHALL 不得依赖已废弃的长期 URL 字段作为 canonical 数据

### Requirement: 用户反馈与失败处理
窗口中的长耗时或破坏性操作 SHALL 传达进度、成功、部分成功、失败和可恢复状态。批量操作部分失败时，系统 SHALL 保留已经成功的工作。

#### Scenario: 操作进行中
- **WHEN** 上传、裁剪、绑定、恢复、删除或清空回收站操作正在进行
- **THEN** 触发控件 SHALL 阻止重复提交
- **THEN** UI SHALL 显示忙碌或进度状态

#### Scenario: 批量操作部分失败
- **WHEN** 批量操作对部分条目成功且对部分条目失败
- **THEN** 成功条目 SHALL 保持已提交
- **THEN** 失败条目 SHALL 保持未变更或可恢复
- **THEN** UI SHALL 显示成功数和失败数

#### Scenario: 必需裁剪上下文缺失
- **WHEN** 某个操作需要 `spriteCropContext`、`avatarCropContext` 或组 `compositionConfig`，但该上下文缺失
- **THEN** 系统 SHALL 将用户引导到所需校正步骤，或显示具体阻断错误

#### Scenario: 关闭或取消临时流程
- **WHEN** 用户关闭窗口或取消临时创建/导入流程
- **THEN** 待处理的客户端流程状态 SHALL 被清理
- **THEN** 已经提交的头像记录 SHALL 仍可通过正常角色头像管理流程恢复或继续处理
