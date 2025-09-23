import type { DistributedTaskSchedulerService } from "../../../api/services/DistributedTaskSchedulerService";
import { useState } from "react";

interface TaskControlsProps {
  schedulerService: DistributedTaskSchedulerService;
  onRefresh: () => void;
}

export default function TaskControls({ schedulerService, onRefresh }: TaskControlsProps) {
  const [isTriggering, setIsTriggering] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleTriggerScheduling = async () => {
    setIsTriggering(true);
    try {
      await schedulerService.triggerScheduling();
      // 触发调度后刷新数据
      setTimeout(() => {
        onRefresh();
      }, 1000);
    }
    catch (error) {
      console.error("触发调度失败:", error);
    }
    finally {
      setIsTriggering(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      onRefresh();
    }
    finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  };

  return (
    <div className="bg-base-200 rounded-lg p-6 mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold mb-2">任务控制</h2>
          <p className="text-base-content/70">
            管理分布式任务调度和监控系统状态
          </p>
        </div>

        <div className="flex gap-3">
          {/* 刷新按钮 */}
          <button
            type="button"
            className="btn btn-outline btn-primary"
            disabled={isRefreshing}
            onClick={handleRefresh}
          >
            {isRefreshing
              ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    刷新中
                  </>
                )
              : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 stroke-current">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0V9a8 8 0 1115.356 2M15 15v5h-.582M4.356 13A8.001 8.001 0 0019.418 15m0 0V15a8 8 0 01-15.356-2" />
                    </svg>
                    刷新数据
                  </>
                )}
          </button>

          {/* 手动触发调度按钮 */}
          <button
            type="button"
            className="btn btn-primary"
            disabled={isTriggering}
            onClick={handleTriggerScheduling}
          >
            {isTriggering
              ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    调度中
                  </>
                )
              : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 stroke-current">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m6-10c0 2.21-1.79 4-4 4s-4-1.79-4-4 1.79-4 4-4 4 1.79 4 4zM3 20l1.5-6L9 17l-1.5 3L3 20z" />
                    </svg>
                    触发调度
                  </>
                )}
          </button>
        </div>
      </div>

      {/* 操作说明 */}
      <div className="mt-4 p-4 bg-base-100 rounded-lg">
        <h3 className="font-medium mb-2">操作说明:</h3>
        <ul className="text-sm text-base-content/70 space-y-1">
          <li>
            •
            <strong>刷新数据</strong>
            : 手动刷新当前页面的任务和统计数据
          </li>
          <li>
            •
            <strong>触发调度</strong>
            : 立即触发任务调度器重新分配待处理任务
          </li>
          <li>• 系统会自动定期刷新数据，无需频繁手动操作</li>
        </ul>
      </div>
    </div>
  );
}
