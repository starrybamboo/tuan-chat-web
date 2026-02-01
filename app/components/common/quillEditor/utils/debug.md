# Quill Editor 调试指南

本编辑器的调试日志由 `utils/logger.ts` 统一控制，支持在运行时开启/关闭，无需重新构建或重启应用。日志使用 `console.warn` 输出（为兼容 ESLint 规则），所以在浏览器控制台请确保未过滤掉 Warning 级别。

## 快速开启/关闭调试

可从以下任意渠道开启，任一渠道命中即会启用对应域的日志：

### 1) 通过 URL 查询参数（一次性、便于临时排查）

- 开启全部日志：
	- 在当前地址后追加 `?QUILL_DEBUG=1`
	- 例：`http://localhost:5173/editor?QUILL_DEBUG=1`
- 只开启指定域日志（可多选）：
	- 例：`?QUILL_DEBUG_CORE=1&QUILL_DEBUG_TOOLBAR=1`

提示（React Router 场景）：可以在导航时拼接查询参数，或手动在地址栏追加参数并回车重载一次页面，使参数在初始化阶段被读取。

### 2) 通过 localStorage（跨刷新持久，推荐本地长期排查）

在浏览器控制台（DevTools）执行：

```js
// 开启全部日志（持久化）
localStorage.setItem("QUILL_DEBUG", "1");
location.reload();

// 只开启某个域
localStorage.setItem("QUILL_DEBUG_TOOLBAR", "1");
// 也可以：CORE / MENTION / SLASH / PASTE / MARKDOWN / BACKSPACE / DOM / LOADER / BLOTS
location.reload();

// 关闭（清除）
localStorage.removeItem("QUILL_DEBUG");
localStorage.removeItem("QUILL_DEBUG_TOOLBAR");
location.reload();
```

### 3) 通过 window 变量（当前会话临时，刷新后失效）

```js
// 开启全部日志（仅当前页面会话）
window.QUILL_DEBUG = true;

// 只开启某域
window.QUILL_DEBUG_TOOLBAR = true;
// 可用域同上：CORE / MENTION / SLASH / PASTE / MARKDOWN / BACKSPACE / DOM / LOADER / BLOTS

// 关闭（当前会话）
delete window.QUILL_DEBUG;
delete window.QUILL_DEBUG_TOOLBAR;
```

### 4) 环境变量（可选）

如果项目有构建注入机制，也可通过环境变量影响默认开关，但在纯浏览器运行时通常以 URL/localStorage/window 为主。如需在构建期全局启用，请在打包环境中设置对应的开关常量（如 `QUILL_DEBUG=1`）。

## 日志域（Domain Keys）

可针对不同子系统单独开关，便于降噪定位。当前支持（含已抽离模块常用域）：

- `CORE`：编辑器核心初始化与生命周期
- `TOOLBAR`：工具栏定位与行为
- `MENTION`：@ 提及相关逻辑
- `SLASH`：斜杠命令
- `PASTE`：粘贴处理
- `MARKDOWN`：Markdown 转换
- `BACKSPACE`：删除键特殊处理
- `DOM`：DOM 计算/光标定位等
- `LOADER`：Quill 预加载、懒加载
- `BLOTS`：自定义 Blot 注册

说明：
- 开启全部日志：`QUILL_DEBUG=1`
- 只开单域：`QUILL_DEBUG_<DOMAIN>=1`（例如 `QUILL_DEBUG_TOOLBAR=1`）

## 如何验证是否生效

打开浏览器控制台，确保 Warning 级别可见。你将看到类似以下前缀的日志：

```
[quill:LOADER] Quill 预加载完成
[quill:CORE] 初始化耗时: 42.13ms
[quill:TOOLBAR] 重新计算定位，rect=...
```

若看不到日志：
- 检查是否正确设置了 URL/localStorage/window 开关，并在需要时刷新页面让初始化读取到开关。
- 检查控制台过滤器是否隐藏了 `warn`。
- 确保只开启了需要的域，避免被大量日志淹没。

## 常用配方（Recipes）

- 本页一次性全开：地址栏追加 `?QUILL_DEBUG=1` 后回车。
- 长期持久化全开：DevTools 执行 `localStorage.setItem("QUILL_DEBUG", "1"); location.reload();`。
- 只开工具栏域：`localStorage.setItem("QUILL_DEBUG_TOOLBAR", "1"); location.reload();`。
- 当前会话临时开启粘贴域：`window.QUILL_DEBUG_PASTE = true;`。
- 一键清理所有开关：
	```js
	Object.keys(localStorage)
		.filter((k) => k.startsWith("QUILL_DEBUG"))
		.forEach((k) => localStorage.removeItem(k));
	delete window.QUILL_DEBUG;
	// 如有其它域临时开关一并删除，例如：
	delete window.QUILL_DEBUG_TOOLBAR;
	// 然后刷新
	location.reload();
	```

## 注意事项

- React Router（单页应用）中，URL 查询参数的读取发生在页面初始化阶段；因此建议追加参数后进行一次刷新，以确保开关被读取。
- 服务器端/SSR 环境已做安全判断，浏览器端的 URL/localStorage/window 开关优先。
- 开关命中策略为“或”逻辑：任一渠道为真即开启对应域。

## 相关文件

- 统一日志工具：`app/components/common/quillEditor/utils/logger.ts`
- Quill 预加载模块（域：`LOADER`）：`app/components/common/quillEditor/modules/quillLoader.ts`
- 自定义 Blot 注册（域：`BLOTS`）：`app/components/common/quillEditor/modules/quillBlots.ts`

如需新增域，只需在调用 `createLogger` ʱΪ `domainKey` 传入新的域名，并按上述方式开启即可。

