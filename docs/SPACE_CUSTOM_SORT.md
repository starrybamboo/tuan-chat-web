# Space 自定义排序（纯本地）

## 目标

- 支持用户在「空间列表」中自定义排序
- 不依赖后端；仅本地生效

## 存储方式

- 使用 `localStorage` 存储每个用户的 space 顺序
- Key：`spaceOrderByUser`
- Value：`Record<string, number[]>`
  - `key`：用户 id（字符串）
  - `value`：该用户的 spaceId 顺序数组

示例：

```json
{
  "10001": [3, 9, 2],
  "10002": [2, 3]
}
```

## 渲染排序规则

- 如果某个 spaceId 存在于顺序数组中：按数组索引从小到大排序
- 如果不在顺序数组中：保持服务端返回的相对顺序，排在已自定义排序项之后

## 交互入口

- 空间列表支持直接拖拽排序（类似 Discord）
- 松手后会把新顺序写入本地 `localStorage`（按用户隔离）
