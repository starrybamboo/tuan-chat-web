import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { tuanchat } from "../../api/instance";
import StatisticsPanel from "../components/volunteer/StatisticsPanel";
import TaskControls from "../components/volunteer/TaskControls";
import TaskList from "../components/volunteer/TaskList";
import VolunteerClient from "../components/volunteer/VolunteerClient";

export default function VolunteerComputing() {
  const [activeTab, setActiveTab] = useState<"pending" | "completed" | "failed" | "client">("pending");

  // 获取任务统计
  const { data: taskStats, isLoading: taskStatsLoading } = useQuery({
    queryKey: ["taskStatistics"],
    queryFn: async () => {
      const response = await tuanchat.distributedTask.getStatistics2();
      return response;
    },
    refetchInterval: 60000, // 每分钟刷新一次
  });

  // 获取调度器统计
  const { data: schedulerStats, isLoading: schedulerStatsLoading } = useQuery({
    queryKey: ["schedulerStatistics"],
    queryFn: async () => {
      const response = await tuanchat.distributedTaskScheduler.getStatistics1();
      return response;
    },
    refetchInterval: 60000,
  });

  // 获取志愿者统计
  const { data: volunteerStats, isLoading: volunteerStatsLoading } = useQuery({
    queryKey: ["volunteerStatistics"],
    queryFn: async () => {
      const response = await tuanchat.volunteer.getStatistics();
      return response;
    },
    refetchInterval: 60000,
  });

  // 获取待分配任务
  const { data: pendingTasks, isLoading: pendingLoading, refetch: refetchPending } = useQuery({
    queryKey: ["pendingTasks"],
    queryFn: async () => {
      const response = await tuanchat.distributedTask.getPendingTasks();
      return response;
    },
    refetchInterval: 60000,
    enabled: activeTab === "pending",
  });

  // 获取已完成任务
  const { data: completedTasks, isLoading: completedLoading, refetch: refetchCompleted } = useQuery({
    queryKey: ["completedTasks"],
    queryFn: async () => {
      const response = await tuanchat.distributedTask.getCompletedTasks(100);
      return response;
    },
    refetchInterval: 60000,
    enabled: activeTab === "completed",
  });

  // 获取失败任务
  const { data: failedTasks, isLoading: failedLoading, refetch: refetchFailed } = useQuery({
    queryKey: ["failedTasks"],
    queryFn: async () => {
      const response = await tuanchat.distributedTask.getFailedTasks(100);
      return response;
    },
    refetchInterval: 60000,
    enabled: activeTab === "failed",
  });

  const handleTabChange = (tab: "pending" | "completed" | "failed" | "client") => {
    setActiveTab(tab);
  };

  const refetchCurrentTab = () => {
    switch (activeTab) {
      case "pending":
        refetchPending();
        break;
      case "completed":
        refetchCompleted();
        break;
      case "failed":
        refetchFailed();
        break;
    }
  };

  return (
    <div className="min-h-screen bg-base-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-base-content mb-2">志愿计算</h1>
          <p className="text-base-content/70">
            分布式任务调度与管理系统，让您的设备参与协作计算
          </p>
        </div>

        {/* 统计信息面板 */}
        <StatisticsPanel
          taskStats={taskStats?.data}
          schedulerStats={schedulerStats?.data}
          volunteerStats={volunteerStats?.data}
          isLoading={taskStatsLoading || schedulerStatsLoading || volunteerStatsLoading}
        />

        {/* 任务控制面板 */}
        <TaskControls
          schedulerService={tuanchat.distributedTaskScheduler}
          onRefresh={refetchCurrentTab}
        />

        {/* 任务列表标签页 */}
        <div className="bg-base-200 rounded-lg p-6">
          {/* 标签导航 */}
          <div className="tabs tabs-boxed mb-6">
            <button
              type="button"
              className={`tab tab-lg ${activeTab === "pending" ? "tab-active" : ""}`}
              onClick={() => handleTabChange("pending")}
            >
              待分配任务
              {pendingTasks?.data && (
                <span className="badge badge-primary ml-2">
                  {pendingTasks.data.length}
                </span>
              )}
            </button>
            <button
              type="button"
              className={`tab tab-lg ${activeTab === "completed" ? "tab-active" : ""}`}
              onClick={() => handleTabChange("completed")}
            >
              已完成任务
              {completedTasks?.data && (
                <span className="badge badge-success ml-2">
                  {completedTasks.data.length}
                </span>
              )}
            </button>
            <button
              type="button"
              className={`tab tab-lg ${activeTab === "failed" ? "tab-active" : ""}`}
              onClick={() => handleTabChange("failed")}
            >
              失败任务
              {failedTasks?.data && (
                <span className="badge badge-error ml-2">
                  {failedTasks.data.length}
                </span>
              )}
            </button>
            <button
              type="button"
              className={`tab tab-lg ${activeTab === "client" ? "tab-active" : ""}`}
              onClick={() => handleTabChange("client")}
            >
              志愿者客户端
              <span className="badge badge-info ml-2">WebSocket</span>
            </button>
          </div>

          {/* 任务列表内容 */}
          <div className="min-h-96">
            {activeTab === "pending" && (
              <TaskList
                tasks={pendingTasks?.data || []}
                isLoading={pendingLoading}
                type="pending"
                distributedTaskService={tuanchat.distributedTask}
                onTaskUpdate={refetchPending}
              />
            )}
            {activeTab === "completed" && (
              <TaskList
                tasks={completedTasks?.data || []}
                isLoading={completedLoading}
                type="completed"
                distributedTaskService={tuanchat.distributedTask}
                onTaskUpdate={refetchCompleted}
              />
            )}
            {activeTab === "failed" && (
              <TaskList
                tasks={failedTasks?.data || []}
                isLoading={failedLoading}
                type="failed"
                distributedTaskService={tuanchat.distributedTask}
                onTaskUpdate={refetchFailed}
              />
            )}
            {activeTab === "client" && (
              <VolunteerClient />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
