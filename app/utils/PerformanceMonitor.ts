/**
 * 通用性能监控工具 - 基于 Performance API
 * 使用标准的 performance.mark() 和 performance.measure()
 * 可在浏览器 DevTools Performance 面板中查看
 */

export type PhaseMetrics = {
  name: string;
  duration: number;
  count: number;
  average: number;
};

export type PerformanceReport = {
  totalTime: number;
  phases: PhaseMetrics[];
  throughput?: number; // 处理速度（项/秒）
  timestamp: number;
};

/**
 * 性能监控器 - 使用 Performance API
 *
 * @example
 * const monitor = new PerformanceMonitor("批量裁剪");
 * monitor.start();
 *
 * // 装饰器模式（推荐）
 * await monitor.measure("加载", async () => {
 *   return await loadImages();
 * });
 *
 * monitor.printReport(totalCount);
 *
 * // 在浏览器 DevTools > Performance 面板可以看到标记：
 * // - "批量裁剪:start"
 * // - "批量裁剪:加载:start"
 * // - "批量裁剪:加载:end"
 * // - "批量裁剪:end"
 */
export class PerformanceMonitor {
  private taskName: string;
  private enabled: boolean;
  private phaseCounters: Map<string, number> = new Map();

  constructor(taskName: string = "task", enabled: boolean = true) {
    this.taskName = taskName;
    this.enabled = enabled;
  }

  /**
   * 开始总体计时
   */
  start() {
    if (!this.enabled)
      return;
    performance.mark(`${this.taskName}:start`);
    this.phaseCounters.clear();
  }

  /**
   * 测量一个异步函数的执行时间（装饰器模式）
   * 使用 Performance API 标记
   */
  async measure<T>(
    phaseName: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    if (!this.enabled)
      return fn();

    const startMark = `${this.taskName}:${phaseName}:start`;
    const endMark = `${this.taskName}:${phaseName}:end`;
    const measureName = `${this.taskName}:${phaseName}`;

    performance.mark(startMark);
    try {
      const result = await fn();
      performance.mark(endMark);
      performance.measure(measureName, startMark, endMark);
      this.incrementPhaseCounter(phaseName);
      return result;
    }
    catch (error) {
      performance.mark(endMark);
      performance.measure(measureName, startMark, endMark);
      this.incrementPhaseCounter(phaseName);
      throw error;
    }
  }

  /**
   * 测量批量异步操作
   */
  async measureBatch<T>(
    phaseName: string,
    promises: Promise<T>[],
  ): Promise<T[]> {
    return this.measure(phaseName, () => Promise.all(promises));
  }

  /**
   * 记录阶段执行次数
   */
  private incrementPhaseCounter(name: string) {
    this.phaseCounters.set(name, (this.phaseCounters.get(name) || 0) + 1);
  }

  /**
   * 获取性能报告（从 Performance API 提取数据）
   */
  getReport(totalCount?: number): PerformanceReport {
    const measures = performance.getEntriesByType("measure") as PerformanceMeasure[];
    const taskMeasures = measures.filter(m => m.name.startsWith(`${this.taskName}:`));

    // 按阶段分组
    const phaseMap = new Map<string, number[]>();
    taskMeasures.forEach((measure) => {
      const phaseName = measure.name.replace(`${this.taskName}:`, "");
      if (!phaseMap.has(phaseName)) {
        phaseMap.set(phaseName, []);
      }
      phaseMap.get(phaseName)!.push(measure.duration);
    });

    const phases: PhaseMetrics[] = [];
    phaseMap.forEach((durations, name) => {
      const count = durations.length;
      const duration = durations.reduce((sum, d) => sum + d, 0);
      phases.push({
        name,
        duration,
        count,
        average: count > 0 ? duration / count : 0,
      });
    });

    // 计算总时间
    const startEntry = performance.getEntriesByName(`${this.taskName}:start`, "mark")[0];
    const endEntry = performance.getEntriesByName(`${this.taskName}:end`, "mark")[0];
    const totalTime = endEntry && startEntry
      ? endEntry.startTime - startEntry.startTime
      : phases.reduce((sum, p) => sum + p.duration, 0);

    return {
      totalTime,
      phases,
      throughput: totalCount && totalTime > 0 ? (totalCount / totalTime) * 1000 : undefined,
      timestamp: Date.now(),
    };
  }

  /**
   * 打印简洁报告
   */
  printReport(totalCount?: number) {
    if (!this.enabled)
      return;

    // 标记结束
    performance.mark(`${this.taskName}:end`);

    const report = this.getReport(totalCount);
    console.warn("\n📊 性能报告");
    console.warn(`⏱️  总时间: ${(report.totalTime / 1000).toFixed(2)}s`);

    report.phases.forEach((phase) => {
      const percent = ((phase.duration / report.totalTime) * 100).toFixed(1);
      console.warn(`  • ${phase.name}: ${(phase.duration / 1000).toFixed(2)}s (${percent}%)`);
    });

    if (report.throughput) {
      console.warn(`🚀 处理速度: ${report.throughput.toFixed(2)} 项/秒`);
    }

    console.warn("\n💡 提示: 打开 DevTools > Performance，刷新页面并录制，可以看到详细的性能标记\n");
  }

  /**
   * 导出为 JSON
   */
  exportJSON(): string {
    return JSON.stringify(this.getReport(), null, 2);
  }

  /**
   * 清除性能标记（可选，用于避免内存泄漏）
   */
  clear() {
    if (!this.enabled)
      return;

    // 清除所有相关的标记和测量
    const entries = performance.getEntriesByType("mark");
    entries.forEach((entry) => {
      if (entry.name.startsWith(`${this.taskName}:`)) {
        performance.clearMarks(entry.name);
      }
    });

    const measures = performance.getEntriesByType("measure");
    measures.forEach((measure) => {
      if (measure.name.startsWith(`${this.taskName}:`)) {
        performance.clearMeasures(measure.name);
      }
    });

    this.phaseCounters.clear();
  }
}
