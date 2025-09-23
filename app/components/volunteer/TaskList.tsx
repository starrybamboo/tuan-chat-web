import type { DistributedTaskService } from "../../../api/services/DistributedTaskService";

import { useState } from "react";
import { DistributedTask } from "../../../api/models/DistributedTask";

interface TaskListProps {
  tasks: DistributedTask[];
  isLoading: boolean;
  type: "pending" | "completed" | "failed";
  distributedTaskService: DistributedTaskService;
  onTaskUpdate: () => void;
}

export default function TaskList({
  tasks,
  isLoading,
  type,
  distributedTaskService,
  onTaskUpdate,
}: TaskListProps) {
  const [cancelling, setCancelling] = useState<Set<number>>(new Set());

  const handleCancelTask = async (taskId: number) => {
    setCancelling(prev => new Set(prev).add(taskId));
    try {
      await distributedTaskService.cancelTask(taskId);
      onTaskUpdate();
    }
    catch (error) {
      console.error("取消任务失败:", error);
    }
    finally {
      setCancelling((prev) => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString)
      return "未知";
    return new Date(timeString).toLocaleString("zh-CN");
  };

  const getTaskTypeDisplay = (taskType?: string) => {
    if (!taskType)
      return "未知类型";
    const typeMap: Record<string, string> = {
      IMAGE_PROCESSING: "图像处理",
      DATA_ANALYSIS: "数据分析",
      VIDEO_ENCODING: "视频编码",
      AI_TRAINING: "AI训练",
      SCIENTIFIC_COMPUTING: "科学计算",
    };
    return typeMap[taskType] || taskType;
  };

  const getStatusBadge = (status?: DistributedTask.status) => {
    switch (status) {
      case DistributedTask.status.PENDING:
        return <span className="badge badge-warning">待分配</span>;
      case DistributedTask.status.ASSIGNED:
        return <span className="badge badge-info">已分配</span>;
      case DistributedTask.status.RUNNING:
        return <span className="badge badge-info">运行中</span>;
      case DistributedTask.status.COMPLETED:
        return <span className="badge badge-success">已完成</span>;
      case DistributedTask.status.FAILED:
        return <span className="badge badge-error">失败</span>;
      case DistributedTask.status.CANCELLED:
        return <span className="badge badge-neutral">已取消</span>;
      default:
        return <span className="badge">{status || "未知"}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-lg font-medium text-base-content mb-2">
          {type === "pending" && "暂无待分配任务"}
          {type === "completed" && "暂无已完成任务"}
          {type === "failed" && "暂无失败任务"}
        </h3>
        <p className="text-base-content/60">
          {type === "pending" && "当前没有等待分配的任务"}
          {type === "completed" && "还没有完成的任务"}
          {type === "failed" && "很好，没有失败的任务"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map(task => (
        <div key={task.taskId || Math.random()} className="card bg-base-100 shadow-md">
          <div className="card-body p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="card-title text-lg">
                    {task.taskName || `任务 #${task.taskId || "未知"}`}
                  </h3>
                  {getStatusBadge(task.status)}
                </div>
                <div className="text-base-content/70 mb-2">
                  类型:
                  {" "}
                  {getTaskTypeDisplay(task.taskType)}
                </div>
                <div className="text-sm text-base-content/60">
                  创建时间:
                  {" "}
                  {formatTime(task.createTime)}
                </div>
                {task.assignTime && (
                  <div className="text-sm text-base-content/60">
                    分配时间:
                    {" "}
                    {formatTime(task.assignTime)}
                  </div>
                )}
                {task.completeTime && (
                  <div className="text-sm text-base-content/60">
                    完成时间:
                    {" "}
                    {formatTime(task.completeTime)}
                  </div>
                )}
                {task.assignedVolunteerId && (
                  <div className="text-sm text-base-content/60">
                    分配给志愿者:
                    {" "}
                    {task.assignedVolunteerId}
                  </div>
                )}
                {task.executionDuration && (
                  <div className="text-sm text-base-content/60">
                    执行时长:
                    {" "}
                    {task.executionDuration}
                    秒
                  </div>
                )}
              </div>

              {type === "pending" && task.taskId && (
                <div className="card-actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-error"
                    disabled={cancelling.has(task.taskId)}
                    onClick={() => handleCancelTask(task.taskId!)}
                  >
                    {cancelling.has(task.taskId)
                      ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        )
                      : (
                          "取消"
                        )}
                  </button>
                </div>
              )}
            </div>

            {/* 输入数据展示 */}
            {task.inputData && (
              <div className="bg-base-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium mb-2">输入数据:</h4>
                <pre className="text-sm text-base-content/80 whitespace-pre-wrap">
                  {task.inputData}
                </pre>
              </div>
            )}

            {/* 结果数据展示 */}
            {task.resultData && (
              <div className="bg-base-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium mb-2">结果数据:</h4>
                <pre className="text-sm text-base-content/80 whitespace-pre-wrap">
                  {task.resultData}
                </pre>
              </div>
            )}

            {/* 错误信息展示 */}
            {task.errorMessage && (
              <div className="alert alert-error">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">{task.errorMessage}</span>
              </div>
            )}

            {/* 状态指示器 */}
            {task.running && (
              <div className="flex items-center gap-2 mt-4">
                <span className="loading loading-dots loading-sm"></span>
                <span className="text-sm text-info">任务正在运行中...</span>
              </div>
            )}

            {task.completed && (
              <div className="flex items-center gap-2 mt-4">
                <span className="text-success">✅</span>
                <span className="text-sm text-success">任务已完成</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
