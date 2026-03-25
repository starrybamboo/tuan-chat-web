# Blocksuite Root Architecture

## 路径

`app/components/chat/infra/blocksuite/`

## 目标

根目录只放跨多个子域复用的基础件，不放强业务语义模块。

这里的文件应该满足至少一个条件：
- 会被多个子目录复用
- 不适合继续细分到某个单独子域
- 属于“横切能力”，例如错误、调试、性能、header

## 当前文件

- `base64.ts`：二进制与 base64 转换
- `blocksuiteDocError.ts`：错误分类与非重试错误判断
- `debugFlags.ts`：调试开关
- `docExcerpt.ts`：从 store 提取摘要
- `docHeader.ts`：header 读写与订阅
- `mentionProfilePopover.tsx`：mention 用户卡片 UI
- `perf.ts`：打开链路打点

## 不负责的事

- 不承担 iframe 协议
- 不承担 workspace 生命周期
- 不承担 description / space 业务映射
- 不承担 spec 注册和样式资源

## 维护约束

- 新文件只有在明确是“共享基础件”时才允许继续放在根目录
- 如果文件名已经带明显业务语义，优先放进对应子目录
