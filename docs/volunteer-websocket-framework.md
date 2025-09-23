# 志愿计算WebSocket框架使用指南

## 概述

基于WebSocket API文档，我们为志愿计算功能创建了完整的前端框架，包括：

1. **WebSocket消息模型** (`api/wsModels.ts`)
2. **志愿者WebSocket Hook** (`api/useVolunteerWebSocket.tsx`)
3. **志愿者客户端组件** (`app/components/volunteer/VolunteerClient.tsx`)
4. **集成到志愿计算页面** (`app/routes/volunteer.tsx`)

## 文件结构

```
api/
├── wsModels.ts                    # WebSocket消息类型定义
├── useVolunteerWebSocket.tsx      # 志愿者WebSocket Hook
└── websocket-api.md              # WebSocket API文档

app/
├── routes/volunteer.tsx           # 志愿计算主页面
└── components/volunteer/
    ├── VolunteerClient.tsx        # 志愿者客户端组件
    ├── StatisticsPanel.tsx        # 统计面板
    ├── TaskControls.tsx          # 任务控制
    └── TaskList.tsx              # 任务列表
```

## 核心功能

### 1. WebSocket消息类型 (wsModels.ts)

新增了分布式计算相关的消息类型：

- `VolunteerRegisterRequest` (type: 10000) - 志愿者注册
- `VolunteerHeartbeatRequest` (type: 10001) - 志愿者心跳
- `TaskRequestMessage` (type: 10002) - 请求任务
- `TaskResultSubmission` (type: 10003) - 提交任务结果
- `TaskAssignmentEvent` (type: 10004) - 任务分配
- `TaskCancellationRequest` (type: 10005) - 任务取消

### 2. 志愿者WebSocket Hook (useVolunteerWebSocket.tsx)

提供完整的WebSocket管理功能：

```typescript
const volunteerWs = useVolunteerWebSocket();

// 连接管理
volunteerWs.connect();
volunteerWs.disconnect();
volunteerWs.isConnected();

// 志愿者管理
volunteerWs.registerVolunteer(request);
volunteerWs.sendHeartbeat(heartbeat);

// 任务管理
volunteerWs.requestTasks(request);
volunteerWs.submitTaskResult(result);
volunteerWs.cancelTask(cancellation);

// 状态监控
volunteerWs.assignedTasks;        // 分配的任务列表
volunteerWs.isRegistered;         // 注册状态
volunteerWs.volunteerStatus;      // 志愿者状态
```

### 3. 志愿者客户端组件 (VolunteerClient.tsx)

完整的志愿者客户端界面：

- **连接状态显示**: 实时WebSocket连接状态
- **志愿者注册**: 名称、能力、并发任务数配置
- **系统监控**: CPU使用率、内存使用量、可用槽位
- **任务管理**: 自动接收、处理、提交任务结果
- **状态面板**: 显示当前任务执行状态

## 使用方法

### 1. 访问志愿计算页面

访问 `/volunteer` 路由，可以看到四个选项卡：
- 待分配任务
- 已完成任务
- 失败任务
- **志愿者客户端** (新增)

### 2. 启动志愿者客户端

1. 点击"志愿者客户端"选项卡
2. 填写志愿者名称
3. 选择计算能力类型 (FIBONACCI, PRIME_CHECK等)
4. 设置最大并发任务数
5. 点击"连接"建立WebSocket连接
6. 点击"注册志愿者"完成注册

### 3. 任务处理流程

注册成功后，志愿者客户端会：

1. **自动心跳**: 每30秒向服务器发送状态信息
2. **请求任务**: 可手动或自动请求分配任务
3. **处理任务**: 模拟任务计算过程
4. **提交结果**: 自动提交计算结果给服务器

### 4. 支持的任务类型

- **FIBONACCI**: 斐波那契数列计算
- **PRIME_CHECK**: 质数检查
- **MATRIX_MULTIPLY**: 矩阵乘法
- **HASH_CALCULATION**: 哈希计算
- **DATA_PROCESSING**: 数据处理

## 技术特性

### WebSocket连接
- 自动重连机制
- 心跳保持连接
- 错误处理和状态管理

### 任务调度
- 基于能力的任务匹配
- 并发控制和负载均衡
- 任务状态跟踪

### 用户体验
- 实时状态显示
- 响应式设计
- 加载和错误状态处理

## 扩展说明

该框架设计为可扩展的，可以轻松添加：

1. **新的任务类型**: 在`availableCapabilities`和`simulateTaskExecution`中添加
2. **更多消息类型**: 在`wsModels.ts`中定义新的消息接口
3. **高级功能**: 如任务优先级、资源监控、性能统计等

## 注意事项

1. **WebSocket端口**: 默认8090，需要确保后端服务运行
2. **Token认证**: 需要有效的用户token进行连接
3. **浏览器兼容**: 现代浏览器支持WebSocket
4. **性能监控**: 建议监控任务执行性能和系统资源使用

## 下一步

- 连接真实的后端WebSocket服务
- 实现真实的任务计算逻辑
- 添加更多监控和统计功能
- 优化用户界面和交互体验