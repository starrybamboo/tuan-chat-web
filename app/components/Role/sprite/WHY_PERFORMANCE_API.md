# 为什么使用 Performance API

## 🎯 核心优势

### 1. **与浏览器 DevTools 深度集成**

使用 `performance.mark()` 和 `performance.measure()` 后，可以在浏览器的 Performance 面板中直接查看：

```typescript
const monitor = new PerformanceMonitor("批量裁剪");
monitor.start();  // 创建标记: "批量裁剪:start"

await monitor.measure("加载", async () => {
  // 创建标记: "批量裁剪:加载:start" 和 "批量裁剪:加载:end"
  // 创建测量: "批量裁剪:加载"
  return await loadImages();
});

await monitor.measure("裁剪", async () => {
  // 创建标记: "批量裁剪:裁剪:start" 和 "批量裁剪:裁剪:end"
  return await cropImages();
});

monitor.printReport();
```

**在 DevTools 中的体验**：

1. 打开 Chrome DevTools > Performance 面板
2. 点击录制按钮（●）
3. 执行批量裁剪操作
4. 停止录制
5. 在时间轴上可以看到：
   - 📍 标记（Marks）：`批量裁剪:start`、`批量裁剪:加载:start` 等
   - 📏 测量（Measures）：显示每个阶段的精确时长
   - 🔍 可缩放、可导出、可分享

![Performance Timeline](https://developers.google.com/web/tools/chrome-devtools/evaluate-performance/imgs/main.png)

---

## 📊 对比：自定义 vs Performance API

### ❌ 之前的方案（`performance.now()`）

```typescript
private startTime: number = 0;
private phases: Map<string, number[]> = new Map();

start() {
  this.startTime = performance.now();  // 只是记录时间
}

async measure(name, fn) {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  this.phases.get(name).push(duration);  // 手动存储
  return result;
}
```

**缺点**：
- ❌ 数据只存在内存中，刷新页面就丢失
- ❌ 无法在 DevTools 中查看
- ❌ 需要手动管理数据结构
- ❌ 无法与其他性能数据（如网络请求）关联
- ❌ 无法导出给性能分析工具

### ✅ 现在的方案（Performance API）

```typescript
async measure(name, fn) {
  const startMark = `${this.taskName}:${name}:start`;
  const endMark = `${this.taskName}:${name}:end`;
  
  performance.mark(startMark);        // 浏览器标记
  const result = await fn();
  performance.mark(endMark);
  performance.measure(measureName, startMark, endMark);  // 浏览器测量
  
  return result;
}

getReport() {
  // 从浏览器 Performance Timeline 读取数据
  const measures = performance.getEntriesByType("measure");
  // ...
}
```

**优点**：
- ✅ 数据存储在浏览器的 Performance Timeline 中
- ✅ DevTools 原生支持可视化
- ✅ 可以导出为 .json 文件分享
- ✅ 自动与页面加载、网络请求关联
- ✅ 支持 User Timing Level 3 标准
- ✅ 可被第三方性能分析工具读取（如 Lighthouse）

---

## 🔬 实际应用示例

### 在控制台查看

```javascript
// 执行批量裁剪后
performance.getEntriesByType('mark')
  .filter(m => m.name.startsWith('批量裁剪'))
// 输出:
// [
//   { name: "批量裁剪:start", startTime: 1234.5 },
//   { name: "批量裁剪:加载:start", startTime: 1235.2 },
//   { name: "批量裁剪:加载:end", startTime: 2456.8 },
//   { name: "批量裁剪:裁剪:start", startTime: 2457.1 },
//   ...
// ]

performance.getEntriesByType('measure')
  .filter(m => m.name.startsWith('批量裁剪'))
// 输出:
// [
//   { name: "批量裁剪:加载", duration: 1221.6, startTime: 1235.2 },
//   { name: "批量裁剪:裁剪", duration: 2345.7, startTime: 2457.1 },
//   { name: "批量裁剪:上传", duration: 3456.8, startTime: 4802.8 },
// ]
```

### 在 DevTools Performance 面板查看

1. **录制性能数据**：
   ```
   F12 > Performance > 录制 > 执行批量裁剪 > 停止
   ```

2. **查看标记**：
   在时间轴的 "User Timing" 区域可以看到所有标记

3. **分析瓶颈**：
   - 每个阶段的占用时间一目了然
   - 可以看到与主线程活动的关系
   - 可以看到与 Worker 活动的关系

---

## 🚀 性能优势

### 1. 零拷贝

Performance API 数据直接存储在浏览器内核中，不需要 JavaScript 对象存储：

```typescript
// ❌ 旧方案：需要 JS 对象存储
private phases: Map<string, number[]> = new Map();  // 占用 JS 堆内存

// ✅ 新方案：浏览器内核存储
performance.mark("阶段:start");  // 存储在 Performance Timeline（C++ 实现）
```

### 2. 高精度时间戳

Performance API 使用 `DOMHighResTimeStamp`，精度可达微秒级：

```typescript
// performance.now() 返回值精度
// Chrome: 0.005ms (5微秒)
// Firefox: 0.001ms (1微秒)
```

### 3. 自动垃圾回收

浏览器会自动管理 Performance Timeline 的大小，避免内存泄漏：

```typescript
// 如果标记太多，浏览器会自动清理旧标记
// 或者手动清理
monitor.clear();  // 清除所有相关标记
```

---

## 📋 Web 标准支持

Performance API 是 W3C 标准，所有现代浏览器都支持：

| API | Chrome | Firefox | Safari | Edge |
|-----|--------|---------|--------|------|
| `performance.mark()` | ✅ 28+ | ✅ 38+ | ✅ 11+ | ✅ 12+ |
| `performance.measure()` | ✅ 28+ | ✅ 38+ | ✅ 11+ | ✅ 12+ |
| `performance.getEntriesByType()` | ✅ 28+ | ✅ 35+ | ✅ 11+ | ✅ 12+ |

兼容性：**99.5%** 的浏览器（[Can I Use](https://caniuse.com/user-timing)）

---

## 🛠️ 实用技巧

### 1. 导出性能数据

```typescript
// 在控制台执行
const perfData = performance.getEntriesByType('measure')
  .filter(m => m.name.startsWith('批量裁剪'));

// 下载为 JSON
const blob = new Blob([JSON.stringify(perfData, null, 2)]);
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'performance-data.json';
a.click();
```

### 2. 与 Lighthouse 集成

Performance API 的标记会被 Lighthouse 收集：

```bash
lighthouse https://your-app.com --view
```

在报告中可以看到 "User Timing" 部分显示你的自定义标记。

### 3. 与 Web Vitals 关联

可以将自定义标记与 Core Web Vitals 关联分析：

```typescript
// 查看批量裁剪是否影响了 LCP
const lcpEntry = performance.getEntriesByType('largest-contentful-paint')[0];
const cropStart = performance.getEntriesByName('批量裁剪:start')[0];

if (cropStart.startTime < lcpEntry.startTime) {
  console.log('批量裁剪在 LCP 之前完成');
}
```

---

## 🎓 总结

使用 Performance API 的核心价值：

1. **标准化** - Web 标准，所有浏览器支持
2. **可视化** - DevTools 原生支持
3. **集成性** - 与页面性能数据无缝集成
4. **专业化** - 被性能分析工具广泛支持
5. **零成本** - 浏览器内核实现，无 JS 开销

**记住**：`performance.now()` 只是获取时间，而 `performance.mark()` + `performance.measure()` 是完整的性能监控方案。

---

## 📚 参考资料

- [MDN - User Timing API](https://developer.mozilla.org/en-US/docs/Web/API/User_Timing_API)
- [W3C - User Timing Level 3](https://w3c.github.io/user-timing/)
- [Google - Custom metrics](https://web.dev/custom-metrics/)
- [Chrome DevTools - Performance features](https://developer.chrome.com/docs/devtools/performance/)
