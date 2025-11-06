# Performance API 使用指南

## 🎯 快速开始

### 1. 基本使用

```typescript
import { PerformanceMonitor } from './PerformanceMonitor';

// 创建监控器（参数是任务名称）
const monitor = new PerformanceMonitor("批量裁剪");

// 开始监控
monitor.start();

// 测量异步操作
const images = await monitor.measure("加载图片", async () => {
  return await loadImages();
});

const results = await monitor.measure("处理图片", async () => {
  return await processImages(images);
});

// 打印报告
monitor.printReport(images.length);

// 清理（可选）
monitor.clear();
```

### 2. 在浏览器中查看

**方法 1：控制台**

```javascript
// 查看所有标记
performance.getEntriesByType('mark')

// 查看所有测量
performance.getEntriesByType('measure')

// 查看特定任务的测量
performance.getEntriesByType('measure')
  .filter(m => m.name.startsWith('批量裁剪'))
```

**方法 2：DevTools Performance 面板**

1. 打开 DevTools（F12）
2. 切换到 **Performance** 标签
3. 点击 **录制** 按钮（圆圈）
4. 执行你的操作（例如批量裁剪）
5. 点击 **停止** 
6. 在时间轴上查找 **User Timing** 区域

你会看到：
- 🔵 蓝色标记：`批量裁剪:start`
- 🟢 绿色标记：`批量裁剪:加载图片:start`、`批量裁剪:加载图片:end`
- 📊 橙色条形：`批量裁剪:加载图片` 测量（显示耗时）

---

## 📊 实际示例输出

### 控制台输出

```
开始批量裁剪 20 张立绘
加载 1/20
加载 2/20
...

📊 性能报告
⏱️  总时间: 7.04s
  • 加载图片: 1.23s (17.5%)
  • 裁剪图片: 2.35s (33.4%)
  • 上传结果: 3.46s (49.1%)
🚀 处理速度: 2.84 项/秒

💡 提示: 打开 DevTools > Performance，刷新页面并录制，可以看到详细的性能标记
```

### DevTools Performance 面板

```
Timeline:
├─ Main Thread
│  ├─ Task (JS)
│  └─ ...
├─ Worker Thread
│  ├─ Task (Image Crop)
│  └─ ...
└─ User Timing ⬅️ 这里！
   ├─ 📍 批量裁剪:start (1234.5ms)
   ├─ 📏 批量裁剪:加载图片 (1221.6ms) ⬅️ 绿色条形
   ├─ 📏 批量裁剪:裁剪图片 (2345.7ms) ⬅️ 绿色条形
   └─ 📏 批量裁剪:上传结果 (3456.8ms) ⬅️ 绿色条形
```

---

## 🔍 性能分析技巧

### 1. 识别瓶颈

在 Performance 面板中：
- 最长的绿色条形 = 最耗时的阶段
- 与主线程活动对比，看是否阻塞 UI
- 与网络请求对比，看是否受网络影响

### 2. 对比优化前后

```typescript
// 优化前
const monitor1 = new PerformanceMonitor("优化前");
monitor1.start();
await oldImplementation();
monitor1.printReport();

// 优化后
const monitor2 = new PerformanceMonitor("优化后");
monitor2.start();
await newImplementation();
monitor2.printReport();

// 在 DevTools 中对比两次录制
```

### 3. 导出数据

```typescript
// 获取 JSON 数据
const report = monitor.getReport(totalCount);
console.log(monitor.exportJSON());

// 复制粘贴到 Excel 或其他工具进行分析
```

---

## 🎨 自定义任务名称

为不同的场景使用不同的任务名称：

```typescript
// 批量裁剪
const cropMonitor = new PerformanceMonitor("批量裁剪");

// 批量上传
const uploadMonitor = new PerformanceMonitor("批量上传");

// 数据同步
const syncMonitor = new PerformanceMonitor("数据同步");
```

在 DevTools 中会清晰地分组显示：
```
User Timing:
├─ 批量裁剪:加载图片
├─ 批量裁剪:裁剪图片
├─ 批量上传:压缩
└─ 数据同步:推送
```

---

## ⚙️ 高级用法

### 1. 条件启用

```typescript
// 仅在开发环境启用
const isDev = process.env.NODE_ENV === 'development';
const monitor = new PerformanceMonitor("任务", isDev);

// 或者基于用户设置
const enablePerfMonitoring = localStorage.getItem('debug') === 'true';
const monitor = new PerformanceMonitor("任务", enablePerfMonitoring);
```

### 2. 嵌套测量

```typescript
const monitor = new PerformanceMonitor("完整流程");
monitor.start();

await monitor.measure("第一阶段", async () => {
  // 可以创建另一个监控器来细分
  const subMonitor = new PerformanceMonitor("第一阶段详细");
  subMonitor.start();
  
  await subMonitor.measure("子任务1", async () => { /* ... */ });
  await subMonitor.measure("子任务2", async () => { /* ... */ });
  
  subMonitor.printReport();
});

monitor.printReport();
```

### 3. 错误处理

```typescript
try {
  await monitor.measure("可能失败的操作", async () => {
    return await riskyOperation();
  });
} catch (error) {
  console.error("操作失败，但性能数据已记录");
  // 仍然可以查看性能数据
  monitor.printReport();
}
```

---

## 🧹 内存管理

Performance Timeline 会自动管理，但如果需要手动清理：

```typescript
// 在组件卸载时清理
useEffect(() => {
  const monitor = new PerformanceMonitor("组件任务");
  
  return () => {
    monitor.clear();  // 清除所有标记和测量
  };
}, []);
```

---

## 📈 性能基准

使用 Performance API 建立性能基准：

```typescript
// 记录基准性能
const baseline = {
  taskName: "批量裁剪20张",
  totalTime: 7040,
  phases: [
    { name: "加载", duration: 1234 },
    { name: "裁剪", duration: 2345 },
    { name: "上传", duration: 3461 },
  ]
};

// 每次运行后对比
const report = monitor.getReport(20);
const regression = report.totalTime > baseline.totalTime * 1.1;

if (regression) {
  console.warn("⚠️ 性能退化：", {
    baseline: baseline.totalTime,
    current: report.totalTime,
    diff: report.totalTime - baseline.totalTime
  });
}
```

---

## 🎓 最佳实践

1. **使用有意义的任务名称** - 方便在 DevTools 中识别
2. **阶段名称简短清晰** - 如 "加载"、"裁剪"、"上传"
3. **在生产环境可选择性禁用** - 避免不必要的开销
4. **定期清理标记** - 避免内存积累
5. **与日志系统结合** - 性能数据 + 错误日志 = 完整诊断

---

## 🔗 相关文档

- [PERFORMANCE_REFACTOR.md](./PERFORMANCE_REFACTOR.md) - 重构说明
- [WHY_PERFORMANCE_API.md](./WHY_PERFORMANCE_API.md) - 为什么使用 Performance API
- [PerformanceMonitor.ts](./PerformanceMonitor.ts) - 源代码

---

**提示**：现在就试试在你的项目中执行批量裁剪，然后打开 DevTools > Performance 面板查看可视化结果！🚀
