# Agent Runtime Foundations 中文参考稿

这份参考稿把原文压缩成适合工程设计与评审的中文版，不追求逐句直译，重点保留架构判断、实施顺序与常见误区。

## 1. Agent Loop 的本质

Agent loop 的核心非常稳定，本质上只是：

1. 接收用户输入与当前上下文
2. 调模型做决策
3. 如果模型选择工具，则执行工具并把结果回填
4. 否则输出最终回答

真正会变化的，通常不是 loop 本身，而是 loop 外部的工程系统：
- 工具集合与执行器
- system prompt 结构
- 外部状态存储
- trace / eval / security / memory

不要把 loop 改造成巨型状态机。模型负责推理，外部系统负责状态与边界。

## 2. Workflow 与 Agent 的区别

关键区别在于控制权属于谁：
- Workflow：路径预先写死，LLM 只填充局部决策
- Agent：下一步由 LLM 动态决定

不是所有任务都值得做成 full agent。很多真实系统更适合：
- prompt chaining
- routing
- parallelization
- orchestrator-workers
- evaluator-optimizer

先选控制模式，再谈 autonomy。

## 3. Harness 为什么比模型更重要

Harness 指围绕 Agent 搭建的测试、验证、约束与 fallback 基础设施，至少包含：
- acceptance baselines
- execution boundaries
- feedback signals
- fallback mechanisms

对高可验证任务，例如 coding、结构化操作、平台动作，harness 往往比更贵的模型更影响最终成功率。

核心判断：
- Agent 看不见的知识，等于不存在
- 约束最好编码进 linter、type system、CI、hooks，而不是只写在文档里
- 从复现、修改、验证到提交的整条链路，应该尽可能自动化
- throughput 高时，机器可执行约束比人工 review 更稳定

工程目标是把任务尽量推向“目标清晰且结果可自动验证”的区域。

## 4. 为什么上下文工程决定稳定性

长上下文最常见的问题不是“装不下”，而是“信号密度错误”。典型失败模式是 context rot：无关内容逐渐压过关键约束，导致决策质量下降。

建议分层：
- Permanent Layer：身份、项目公约、硬性禁令。短、硬、可执行。
- On-Demand Layer：skills 与领域知识，命中才加载。
- Runtime Injection：当前时间、用户、频道、任务状态。
- Memory Layer：跨会话经验，不默认常驻。
- System Layer：能被代码表达的规则不要塞进上下文。

核心原则：
- deterministic logic 不要放进 prompt
- prompt 中只保留模型真正需要读的内容
- 稳定前缀越稳定，prompt caching 越有效

## 5. 压缩与动态上下文发现

常见压缩策略：
- Sliding Window：实现简单，但会丢早期决策背景
- LLM Summary：适合长任务，保留决策与未完成事项
- Tool Result Replacement：高频工具场景下替换原始工具输出

压缩时最容易丢的是：
- 架构决策
- 约束背后的原因
- 失败路径与回滚信息

因此应显式规定保留优先级，例如：

1. 架构决策
2. 修改文件与关键改动
3. 验证状态
4. 未解决 TODO 与回滚说明
5. 工具原始输出

文件系统非常适合作为上下文接口。不要把大 JSON 直接塞回对话；优先落文件，再按需读。

## 6. Skills 的正确设计方式

Skill 的核心思想是：
- system prompt 常驻的是 skill 索引
- 真正内容按需加载

有效的 skill 描述必须是“路由条件”，不是“功能宣传册”。

至少要讲清楚：
- 什么时候用
- 什么时候不要用
- 输出是什么
- 最好给反例

常见错误：
- 描述太长，常驻 token 成本高
- 描述太宽泛，导致乱路由
- 一个 skill 企图覆盖 review / deploy / debug / incident response 全部场景
- 有副作用的 skill 没有显式约束调用条件

如果能用 CLI + skill 描述解决，就不要盲目上 MCP。MCP 更适合真正需要状态化交互的工具。

## 7. 工具设计决定 Agent 能力上限

大多数工具问题不是“不够多”，而是：
- 选错工具
- 描述不清
- 返回值无助于下一步判断
- 错误不可恢复

好工具应遵循 ACI 原则：
- 粒度对齐 Agent 目标，不对齐底层 API
- 返回值只给下一步需要的信息
- 错误要结构化，附带修复建议
- 描述清楚何时用、何时不要用
- 最好附 1 到 5 个真实调用例子

工具演化常见三阶段：
- API Wrappers：几乎不可用，粒度过细
- ACI：按业务动作封装
- Advanced Tool Use：加入 tool search、programmatic tool calling、tool examples

调试 Agent 时，优先检查工具定义，而不是先怀疑模型能力。

## 8. 为什么框架内部消息要和 LLM 消息隔离

运行时会产生很多内部事件：
- compact 发生了
- 某个通知被发送了
- 某次工具调用被跳过了

这些信息应保存在应用层历史中，但不应该原样发给 LLM。否则只会浪费 token，还增加噪音。

做法是区分：
- AgentMessage：应用层完整消息，允许自定义字段
- LLM Message：只保留 user / assistant / tool_result 等最小标准类型

## 9. Memory 不是附属功能，而是基础设施

Agent 默认没有跨会话连续性，所以 memory 必须单独设计。

建议至少区分四层：
- Working Memory：当前任务最小信息
- Procedural Memory：skills / 操作流程
- Episodic Memory：JSONL 会话日志，记录发生过什么
- Semantic Memory：MEMORY.md，记录长期稳定事实

关键不是“存不存”，而是：
- 什么时候写入
- 写入什么
- 如何检索
- 如何压缩
- 失败时如何回滚

很多场景下，Markdown + 关键词搜索已经足够，不要一上来就上向量库。只有到几千条以上并且确实需要语义相似检索时，再考虑向量化。

## 10. Memory consolidation 必须可逆

压缩时，不应该直接删除上下文，而应该：
- 记录压缩指针
- 失败时保留原始消息
- 必要时回退到 archive

关键不是 summary 文笔多好，而是整个流程可恢复。

## 11. Autonomy 要逐步扩张

Autonomy 不是“少点几次确认”这么简单，而是让 Agent 能在更长时间尺度上持续推进任务。

在提升 autonomy 前，先补齐三类基础设施：
- 跨会话恢复
- 会话内显式进度跟踪
- 后台 I/O 集成

长任务的稳定做法：
- 把进度写到文件或数据库
- 用结构化状态跟踪当前步骤
- 不要把任务进度只放在上下文里

最小约束：
- 任一时刻只有一个 task 是 in_progress
- 每完成一步都要先更新状态，再进入下一步

## 12. 长任务与后台 I/O

长任务最常见失败不是单步报错，而是会话结束时任务没收好尾。

更稳的方式是把慢 I/O 和长步骤外部化：
- 长 shell / 网络请求放后台线程
- 结果通过通知队列反馈给下一轮
- 主 loop 不需要理解并发细节，只需要在每轮开始前检查新结果

## 13. Multi-Agent 的前提是协议与隔离

不要把 multi-agent 理解成“多开几个模型并行跑”。

正确顺序是：
1. 定义通信协议
2. 建立任务图
3. 建立文件或工作区隔离
4. 再讨论协作与并行

子 agent 的价值：
- 把搜索、试错、调试过程隔离出去
- 主 agent 只接收摘要，不被细节污染上下文

推荐约束：
- JSONL inbox 协议
- worktree 级文件隔离
- 深度限制，避免无限递归 spawn
- 子 agent 使用最小 prompt，不继承完整 memory 与 skills

多 agent 最危险的问题是 hallucination amplification。需要交叉验证、外部反馈、单元测试或人工抽检来打断错误共识链。

## 14. Eval 是 Agent 工程的核心

没有 eval，任何 prompt 或模型切换都只是凭感觉。

Agent eval 比单轮模型评测更复杂，因为你必须同时覆盖：
- transcript：执行过程
- outcome：环境最终状态

只看 transcript，会漏掉“说做到了但其实没做成”；
只看 outcome，会看不见过程里的偏航。

常见概念：
- task：测什么
- trial：跑多少次
- grader：怎么打分
- agent harness：被测系统
- eval harness：跑测试、聚合分数的系统

## 15. Eval 指标与 grader 选择

两个常见指标用途不同：
- Pass@k：探索能力边界，问“理论上能不能做到”
- Pass^k：做回归保障，问“是不是每次都稳定做到”

不要混用。

grader 选择顺序：
- Code grader：最优先，最可靠
- Model grader：用于语义质量
- Human grader：校准自动评估与处理模糊边界

如果两个领域专家对同一案例都无法一致判断，说明验收标准本身有问题。

## 16. 从零开始搭 eval

不需要一开始就有大系统。先从 20 到 50 个真实失败案例开始。

必须注意：
- 环境要隔离，不能共用脏缓存或数据库状态
- 要同时覆盖正例与反例
- 不要只看总分，要看完整 transcript
- 当测试集接近饱和时，要持续补更难的题

当分数下降时，先检查 eval 系统与基础设施，而不是立刻调 Agent。

## 17. Tracing 必须尽早建

没有 trace，就无法可靠复现 failure case。

每次执行至少记录：
- 完整 prompt，包括 system prompt
- 完整 messages
- 每个 tool call、参数与返回值
- reasoning（如果模型有）
- 最终输出
- token 与 latency

理想情况下，trace 还应支持更高级检索，例如查找“模型混淆 A 工具和 B 工具”的案例。

## 18. 两层观测体系

推荐双层观测：
- Layer 1：人工抽样，找模式、做校准
- Layer 2：LLM 自动打分，扩大覆盖

只靠 Layer 2 会漂移，只靠 Layer 1 不可扩展。两层结合才稳。

线上采样建议：
- 负反馈 100% 进队列
- 高 token / 高成本会话优先
- 固定时间窗口随机抽样
- prompt 或模型变更后的前 48 小时做高强度回归

## 19. 为什么事件流是更好的底座

Agent loop 只需要在关键点发事件：
- tool_start
- tool_end
- turn_end

然后下游各自订阅：
- logs
- UI
- eval
- review queue

这样新增消费者时，无需改核心 loop。

## 20. OpenClaw 的启发

OpenClaw 展示了这些原则如何落地：
- 用 MessageBus 把 channel 与 agent 解耦
- system prompt 分层加载，而不是一个大文件
- session state 属于 AgentLoop，不属于 channel
- memory consolidation 内建到运行时
- 同 session 串行，不同 session 可并发
- cron / heartbeat 可主动触发任务

对工程实现的启发是：
- 先做单 channel，跑通一条完整闭环
- 先做安全，再做功能
- 尽早做 memory consolidation
- 先补 skills，再盲目加工具
- 从第一个真实失败开始建设 eval

## 21. 应该优先吸收的工程结论

如果把整篇文章压成工程结论，最重要的是这些：

1. loop 很简单，复杂的是边界系统
2. harness 往往比更贵模型更重要
3. 上下文必须分层，deterministic logic 外移
4. tools 要面向任务目标，且可恢复
5. memory 是基础设施，不是附属品
6. 长任务靠外部状态，不靠上下文记忆
7. multi-agent 先协议和隔离，后协作
8. eval 先于 tuning，trace 先于线上放量
9. event stream 是 runtime 更合适的底座
10. security boundary 必须早于 feature velocity

## 22. 用这份材料评审设计时可直接问的问题

看到一个 Agent 方案时，可以直接用这些问题做初筛：

- 这是 workflow 还是 agent，控制权在哪？
- 任务是否可验证？验收标准是否可执行？
- deterministic rules 是否还被塞在 prompt 里？
- tools 是否按业务动作设计，而不是 API wrapper？
- tool errors 是否结构化、可恢复？
- snapshot / context 是否分层？
- memory 是否区分 working / procedural / episodic / semantic？
- trace 是否能完整回放？
- eval 是否同时检查 transcript 与 outcome？
- 高风险动作是否需要确认？
- 外部不可信内容是否显式隔离？
- 多 agent 是否先定义协议、任务图、隔离边界？

如果这些问题答不上来，通常说明系统还没到“可稳定放权”的阶段。
