# 变更提案: Blocksuite iframe 强隔离

## 需求背景
当前 Blocksuite 嵌入页面在首次进入时可能触发同页其它 UI 的字体/颜色/布局等样式异常；离开页面后样式恢复，但再次进入时 Blocksuite 自身样式可能失效。该现象表明仍存在未被完全约束/回滚的全局 CSS 或 DOM 副作用，导致“同页污染”与“二次进入回滚过度”的双向问题。

在污染源不稳定且难以穷举时，继续在 Light DOM 做规则级拦截会面临维护成本和漏网风险。因此需要引入更强的隔离边界，保证同页其它 UI 不受影响，并让 Blocksuite 的生命周期与副作用只发生在隔离容器内。

## 变更内容
1. 新增专用 iframe 路由 `blocksuite-frame`，在独立文档中运行 Blocksuite（运行时注入、portal、副作用均局限在 iframe 内）。
2. 将 `BlocksuiteDescriptionEditor` 在顶层窗口的渲染改为 iframe 宿主，主页面不再导入/执行 Blocksuite 运行时逻辑。
3. 通过 `postMessage` 实现必要能力回传/控制：mode 同步、主题同步、以及 Blocksuite 内部“跳转到文档/设置页”的导航委托给父窗口。

## 影响范围
- **模块:**
  - `app`（路由新增、Blocksuite 渲染方式调整）
  - Blocksuite 集成（嵌入策略升级）
- **文件:**
  - `app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx`
  - `app/routes.ts`
  - `app/routes/blocksuiteFrame.tsx`
- **API:** 无
- **数据:** 无

## 核心场景

### 需求: 同页 UI 不被 Blocksuite 污染
**模块:** app / Blocksuite 集成

#### 场景: 打开任意包含 Blocksuite 的页面
- 预期结果: 同页其它 UI 的字体/颜色/间距/按钮样式不发生异常变化
- 预期结果: 离开 Blocksuite 页面后无需额外清理即可保持 UI 正常

### 需求: 重复进入 Blocksuite 页面样式稳定
**模块:** app / Blocksuite 集成

#### 场景: 进入 Blocksuite 页面 → 离开 → 再次进入
- 预期结果: Blocksuite 自身样式稳定生效（不出现“第二次进入样式失效”）

## 风险评估
- **风险:** iframe 引入额外渲染进程与资源加载，可能增加内存/CPU；跨窗口通信需要维护协议。
- **缓解:** 仅在 Blocksuite 相关入口使用 iframe；通信协议收敛为 mode/theme/navigate 三类最小集合，并做 source/origin 校验。

