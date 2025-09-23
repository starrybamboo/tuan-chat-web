# WebSocket API文档

**自动生成时间**: 2025-09-22 23:04:43

## 连接信息

- **WebSocket端口**: 8090
- **连接地址**: `ws://localhost:8090`
- **认证方式**: 通过URL参数传递token
- **连接示例**: `ws://localhost:8090?token=用户ID`

## 消息格式

### 请求消息格式
```json
{
  "type": 1,
  "data": "具体数据内容"
}
```

### 响应消息格式
```json
{
  "type": 1,
  "data": {
    // 具体响应数据
  }
}
```

## 客户端发送消息类型

### 登录 (type: 1)
```json
{
  "type": 1,
  "data": ""
}
```
**说明**: 连接建立后自动处理，无需手动发送

### 心跳包 (type: 2)
```json
{
  "type": 2,
  "data": ""
}
```
**说明**: 保持连接活跃，建议每30秒发送一次

### 消息 (type: 3)
```json
{
  "type": 3,
  "data": {
  "roomId": 456,
  "messageType": 0,
  "roleId": 1,
  "avatarId": 1,
  "content": "消息内容",
  "replayMessageId": 1,
  "extra": null
}
}
```
**说明**: 发送聊天消息到指定房间

**字段说明**:
- roomId: 房间ID
- msgType: 消息类型
- content: 消息内容

### 聊天状态控制 (type: 4)
```json
{
  "type": 4,
  "data": {
  "roomId": 456,
  "userId": 123,
  "status": "正在输入",
  "windowId": "示例文本"
}
}
```
**说明**: 控制用户在房间中的聊天状态

**字段说明**:
- roomId: 房间ID
- userId: 用户ID
- status: 聊天状态（字符串，最长15个字符）

**常见状态示例**:
- "空闲"
- "正在输入"
- "等待扮演"
- "暂离"

### 私聊消息 (type: 5)
```json
{
  "type": 5,
  "data": {
  "messageId": 1,
  "userId": 123,
  "syncId": 0,
  "senderId": 1,
  "receiverId": 1,
  "content": "消息内容",
  "messageType": 0,
  "replyMessageId": 1,
  "status": 1,
  "extra": {
    "diceResult": {
      "result": "示例文本"
    },
    "fileMessage": {
      "size": 1,
      "url": "示例文本",
      "fileName": "示例文本"
    },
    "imageMessage": {
      "background": true,
      "width": 0,
      "height": 0
    },
    "forwardMessage": {
      "messageList": []
    },
    "soundMessage": {
      "second": 0
    }
  },
  "createTime": "2023-12-01T10:00:00",
  "updateTime": "2023-12-01T10:00:00"
}
}
```
**说明**: 发送私聊消息给指定用户

**字段说明**:
- receiverId: 接收者ID（必填）
- content: 消息内容（必填，最大1024字符）
- messageType: 消息类型（必填，1:文本 2:图片 3:文件）
- replyMessageId: 回复的消息ID（可选）
- extra: 扩展信息（必填）

**使用场景**:
- 用户之间的私聊对话
- 回复特定消息
- 发送富媒体消息（图片、文件等）

### 志愿者注册 (type: 10000)
```json
{
  "type": 10000,
  "data": {
  "volunteerName": "示例文本",
  "capabilities": [],
  "maxConcurrentTasks": 0
}
}
```
**说明**: 志愿者节点注册到分布式计算系统

**字段说明**:
- volunteerName: 志愿者名称（必填）
- capabilities: 支持的任务类型列表（必填，如["FIBONACCI", "PRIME_CHECK"]）
- maxConcurrentTasks: 最大并发任务数（必填）

**使用场景**:
- 计算节点启动时注册到系统
- 声明自己的计算能力和资源

### 志愿者心跳 (type: 10001)
```json
{
  "type": 10001,
  "data": {
  "status": "ACTIVE",
  "currentTasks": 2,
  "systemInfo": {
    "cpuUsage": 45.5,
    "memoryUsage": 1024.0,
    "availableSlots": 3
  }
}
}
```
**说明**: 志愿者节点发送心跳信息

**字段说明**:
- status: 当前状态（ACTIVE/BUSY/IDLE）
- currentTasks: 当前正在执行的任务数
- systemInfo: 系统信息对象
  - cpuUsage: CPU使用率
  - memoryUsage: 内存使用量（MB）
  - availableSlots: 可用任务槽位数

**使用场景**:
- 定期报告节点状态
- 系统负载监控

### 请求任务 (type: 10002)
```json
{
  "type": 10002,
  "data": {
  "capabilities": ["FIBONACCI", "PRIME_CHECK"],
  "maxTasks": 3,
  "priority": 1
}
}
```
**说明**: 志愿者节点请求分配任务

**字段说明**:
- capabilities: 支持的任务类型列表
- maxTasks: 最多可接受的任务数量
- priority: 优先级（可选，默认为1）

**使用场景**:
- 节点空闲时主动请求任务
- 系统根据能力匹配合适的任务

### 提交任务结果 (type: 10003)
```json
{
  "type": 10003,
  "data": {
  "taskId": 1,
  "resultData": "示例文本",
  "executionDuration": 1,
  "status": "正在输入",
  "errorMessage": "示例文本"
}
}
```
**说明**: 提交任务计算结果

**字段说明**:
- taskId: 任务ID（必填）
- resultData: 计算结果（JSON格式）
- executionDuration: 执行时长（毫秒，必填）
- status: 结果状态（SUCCESS/FAILED，必填）
- errorMessage: 错误信息（失败时填写）

**使用场景**:
- 任务计算完成后提交结果
- 任务执行失败时上报错误

### 任务分配 (type: 10004)
```json
{
  "type": 10004,
  "data": {
  "taskId": 1,
  "taskType": "示例文本",
  "inputData": "示例文本",
  "taskName": "示例文本",
  "estimatedDuration": 1
}
}
```
**说明**: 服务器分配任务给志愿者

**字段说明**:
- taskId: 任务ID
- taskType: 任务类型
- inputData: 输入数据
- taskName: 任务名称
- estimatedDuration: 预估执行时间（可选）

**使用场景**:
- 系统向计算节点分发任务
- 节点接收任务并开始计算

### 任务取消 (type: 10005)
```json
{
  "type": 10005,
  "data": {
  "taskId": 123,
  "reason": "VOLUNTEER_DISCONNECT"
}
}
```
**说明**: 取消指定的任务

**字段说明**:
- taskId: 要取消的任务ID（必填）
- reason: 取消原因（如VOLUNTEER_DISCONNECT、TIMEOUT等）

**使用场景**:
- 节点异常断开时取消未完成的任务
- 任务超时或优先级变更时主动取消
- 系统维护时批量取消任务

## 服务端推送消息类型

### 私聊新消息 (type: 1)
```json
{
  "type": 1,
  "data": {
  "messageId": 1,
  "userId": 123,
  "syncId": 0,
  "senderId": 1,
  "receiverId": 1,
  "content": "消息内容",
  "messageType": 0,
  "replyMessageId": 1,
  "status": 1,
  "extra": null,
  "createTime": "2023-12-01T10:00:00"
}
}
```
**说明**: 接收到私聊消息时推送

### 群聊新消息 (type: 4)
```json
{
  "type": 4,
  "data": {
  "message": {
    "messageId": 1,
    "syncId": 1,
    "roomId": 456,
    "userId": 123,
    "roleId": 1,
    "content": "消息内容",
    "avatarId": 1,
    "animation": 0,
    "specialEffects": 0,
    "replyMessageId": 1,
    "status": 1,
    "messageType": 0,
    "position": null,
    "extra": {
      "diceResult": {},
      "fileMessage": {},
      "imageMessage": {},
      "forwardMessage": {},
      "soundMessage": {}
    },
    "createTime": "2023-12-01T10:00:00",
    "updateTime": "2023-12-01T10:00:00"
  },
  "messageMark": []
}
}
```
**说明**: 接收到群聊消息时推送

### 成员变动 (type: 11)
```json
{
  "type": 11,
  "data": {
  "roomId": 456,
  "userIds": [456, 789],
  "changeType": 1,
  "activeStatus": 1,
  "lastOptTime": "2023-12-01T10:00:00"
}
}
```
**说明**: 群组成员变动时推送

**变动类型说明**:
- 1: 加入群组
- 2: 移除群组
- 3: 权限更新

### 角色变动 (type: 12)
```json
{
  "type": 12,
  "data": {
  "roleIds": [1, 2, 3],
  "roomId": 456,
  "changeType": 1
}
}
```
**说明**: 角色变动时推送

**变动类型说明**:
- 1: 加入群组
- 2: 移除群组

### 房间解散 (type: 14)
```json
{
  "type": 14,
  "data": {
  "roomId": 456
}
}
```
**说明**: 房间解散时推送给所有成员

### 房间extra变动 (type: 15)
```json
{
  "type": 15,
  "data": {
  "roomId": 456,
  "type": 1,
  "key": "变更内容的key"
}
}
```
**说明**: 房间扩展信息变动时推送

**变更类型说明**:
- 1: 更新/新增
- 2: 删除

### 房间禁言状态变动 (type: 16)
```json
{
  "type": 16,
  "data": {
  "roomId": 456,
  "status": 1
}
}
```
**说明**: 房间禁言状态变动时推送

**禁言状态说明**:
- 0: 未禁言
- 1: 全员禁言(裁判除外)

### 成员的发言状态 (type: 17)
```json
{
  "type": 17,
  "data": {
  "roomId": 456,
  "userId": 123,
  "status": "正在输入",
  "windowId": "示例文本"
}
}
```
**说明**: 成员聊天状态变动时推送给房间内其他成员

### 模组角色变动 (type: 18)
```json
{
  "type": 18,
  "data": {}
}
```
**说明**: 模组角色变动时推送

**变动类型说明**:
- 1: 加入群组
- 2: 移除群组

### 使前端的token失效，意味着前端需要重新登录 (type: 100)
```json
{
  "type": 100,
  "data": null
}
```
**说明**: 收到此消息后需要重新登录获取新的token

## 连接建立流程

1. 客户端发起WebSocket连接到 `ws://localhost:8090?token=用户ID`
2. 服务端验证token并建立连接
3. 连接成功后可以发送心跳包保持连接

### 断线重连
- 建议实现断线重连机制
- 重连时需要重新传递token
- 重连成功后需要重新发送必要的状态信息

### 错误处理
- 连接失败: 检查token是否有效
- 消息发送失败: 检查消息格式是否正确
- 接收到未知类型消息: 忽略或记录日志

## 示例代码

### JavaScript客户端示例
```javascript
const ws = new WebSocket('ws://localhost:8090?token=123');

ws.onopen = function() {
    console.log('WebSocket连接已建立');
    
    // 发送心跳包
    setInterval(() => {
        ws.send(JSON.stringify({
            type: 2,
            data: ""
        }));
    }, 30000);
};

ws.onmessage = function(event) {
    const message = JSON.parse(event.data);
    console.log('收到消息:', message);
    
    switch(message.type) {
        case 1:
            // 处理私聊消息
            break;
        case 4:
            // 处理群聊消息
            break;
        // ... 其他消息类型
    }
};
```

## 注意事项

1. **认证**: 连接时必须提供有效的token
2. **心跳**: 建议每30秒发送一次心跳包保持连接
3. **重连**: 实现断线重连机制，提高用户体验
4. **消息格式**: 严格按照文档格式发送消息
5. **错误处理**: 做好各种异常情况的处理
6. **性能**: 避免频繁发送大量消息

