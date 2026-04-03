---
name: agent-runtime-foundations
description: 用于设计或评审 Agent Runtime、工具系统、上下文工程、memory、控制流、事件流、eval、tracing 与安全边界。不要用于单纯接模型 SDK、普通聊天 UI、或只写一个简单 tool loop 的轻量需求。
---

# Agent Runtime Foundations

当任务涉及“构建能稳定操作平台的 Agent 系统”时使用本 Skill。

不要用于：
- 只是在现有页面加一个简单 AI 按钮
- 只讨论模型选型或 SDK 接线
- 只需要 10 行 loop 的轻量实验

优先目标：
- 先明确系统边界，再讨论框架
- 先建设 harness，再追求 autonomy
- 先做工具、状态、观测、安全，再扩 memory、多 agent、长期任务

## 核心判断

Agent 的稳定性主要由 loop 外的工程系统决定，而不是 loop 本身：
- loop 通常长期稳定，能力主要通过工具、prompt 结构、外部状态注入扩展
- 模型更强不必然带来同等量级提升，harness 与验证体系通常更关键
- 工具误用优先排查定义与描述，不要先怀疑模型能力
- eval 出问题时先修 eval，不要直接调 agent

## 设计顺序

按这个顺序推进，避免过早抽象：

1. 明确任务边界与可验证目标
2. 设计 ACI 工具，而不是 API wrapper
3. 设计最小状态快照与上下文分层
4. 建立 trace、event、audit
5. 加权限、确认、workspace 隔离、prompt injection 防护
6. 再补 memory consolidation、长任务恢复、workflow、multi-agent

## 交付时的默认检查项

在给出方案、评审设计、或实现 runtime 时，默认检查：
- 这是 workflow 还是 agent，控制权在哪一侧
- 工具是否面向任务目标，是否可恢复
- context 是否分层，是否存在 context rot 风险
- deterministic logic 是否被错误塞进 prompt
- 是否有事件流、trace、eval、audit
- 高风险动作是否有 least privilege 与显式确认
- 长任务状态是否外部化，而不是只放在上下文里

## 常用模式

优先从以下控制模式里选，不要默认 full agent：
- Prompt Chaining：线性分步骤任务
- Routing：按任务类型分流
- Parallelization：分段并行或投票
- Orchestrator-Workers：主模型拆分、子模型执行
- Evaluator-Optimizer：生成-评审-迭代

## 工具设计原则

每个工具至少应具备：
- 清晰的使用边界：何时使用、何时不要使用
- 面向目标的粒度：一次完成一个业务动作，而不是暴露多个底层 API 步骤
- 结构化输入与输出
- 结构化错误与修复建议
- 少量真实调用例子

如果某件事可由 shell、静态文档、或 skill 解决，不要强行新建工具。

## 上下文工程原则

默认按以下层次组织：
- Permanent：身份、约束、项目公约、硬禁令
- On-Demand：skills 与领域知识，命中时再加载
- Runtime Injection：时间、用户、频道、当前任务状态
- Memory：跨会话经验，不直接常驻
- System：可编码逻辑交给 hooks、规则、校验器

任何 deterministic logic，优先移出 prompt。

## Memory 原则

至少区分四层：
- Working memory：当前任务最小上下文
- Procedural memory：skills / 操作流程
- Episodic memory：会话日志与历史执行
- Semantic memory：稳定事实与长期偏好

memory consolidation 必须可回滚；压缩时优先保留架构决策、修改点、验证状态、未完成事项。

## 观测与评估原则

必须尽早建设：
- Trace：完整 prompt、messages、tool calls、结果、耗时、token
- Event stream：tool_start、tool_end、turn_end 等一次发布、多方消费
- Eval：区分 pass@k 与 pass^k；同时检查 transcript 与 outcome

没有可回放 trace，就不要声称系统“稳定”。

## 安全原则

功能前置条件：
- 白名单与身份校验
- workspace/path 隔离
- 参数校验
- 审计日志
- 敏感动作确认
- 外部内容显式标记为不可信
- provider fallback

不要让模型自己决定敏感操作是否安全。

## 参考材料

需要更完整的中文展开说明时，读取：
- [references/agent-foundations-zh.md](references/agent-foundations-zh.md)

当任务聚焦某一部分时，优先只抽取相关章节，而不是整篇通读。
