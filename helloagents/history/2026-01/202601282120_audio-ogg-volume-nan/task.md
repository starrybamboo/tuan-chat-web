# 任务清单: 音频上传输出 .ogg + BGM 音量 NaN 兜底

目录: `helloagents/history/2026-01/202601282120_audio-ogg-volume-nan/`

---

## 1. 音频上传（OSS）
- [√] 1.1 将音频上传统一输出扩展名改为 `.ogg`（Opus 编码，Ogg 容器），避免后端/对象存储对 `.opus` 的白名单重写
- [√] 1.2 补充 `[tc-audio-upload]` 关键日志：输出 `uploadUrl`、`downloadUrl` 并提示扩展名不符合预期

## 2. BGM 悬浮球
- [√] 2.1 修复音量值可能为非有限数导致 UI 渲染 `NaN`（React 控制台警告）

## 3. 文档更新
- [√] 3.1 更新 `helloagents/wiki/modules/OSS.md`：记录当前音频压缩/转码参数与输出格式

## 4. 验证
- [√] 4.1 本地执行 `pnpm -s typecheck`（允许存在仓库既有错误，但需确保本次改动未新增类型错误）

