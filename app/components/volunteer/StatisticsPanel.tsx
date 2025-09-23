import type { SchedulerStatistics } from "../../../api/models/SchedulerStatistics";
import type { TaskStatistics } from "../../../api/models/TaskStatistics";

interface StatisticsPanelProps {
  taskStats?: TaskStatistics;
  schedulerStats?: SchedulerStatistics;
  volunteerStats?: Record<string, any>;
  isLoading: boolean;
}

export default function StatisticsPanel({
  taskStats,
  schedulerStats,
  volunteerStats: _volunteerStats,
  isLoading,
}: StatisticsPanelProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }, (_, i) => `loading-stat-${i}`).map(key => (
          <div key={key} className="stat bg-base-200 rounded-lg animate-pulse">
            <div className="stat-figure text-primary">
              <div className="w-8 h-8 bg-base-300 rounded"></div>
            </div>
            <div className="stat-title">
              <div className="w-20 h-4 bg-base-300 rounded"></div>
            </div>
            <div className="stat-value">
              <div className="w-16 h-8 bg-base-300 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* 总任务数 */}
      <div className="stat bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
        <div className="stat-figure text-primary">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
        </div>
        <div className="stat-title">总任务数</div>
        <div className="stat-value text-primary">{taskStats?.totalTasks || 0}</div>
        <div className="stat-desc">
          完成率:
          {" "}
          {taskStats?.totalTasks && taskStats?.completedTasks ? Math.round((taskStats.completedTasks / taskStats.totalTasks) * 100) : 0}
          %
        </div>
      </div>

      {/* 待分配任务 */}
      <div className="stat bg-gradient-to-br from-warning/10 to-warning/5 rounded-lg border border-warning/20">
        <div className="stat-figure text-warning">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div className="stat-title">待分配任务</div>
        <div className="stat-value text-warning">{taskStats?.pendingTasks || 0}</div>
        <div className="stat-desc">
          运行中:
          {taskStats?.runningTasks || 0}
        </div>
      </div>

      {/* 在线志愿者 */}
      <div className="stat bg-gradient-to-br from-info/10 to-info/5 rounded-lg border border-info/20">
        <div className="stat-figure text-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
        </div>
        <div className="stat-title">在线志愿者</div>
        <div className="stat-value text-info">
          {schedulerStats?.onlineVolunteers?.totalOnline || 0}
        </div>
        <div className="stat-desc">
          可用:
          {" "}
          {schedulerStats?.onlineVolunteers?.availableVolunteers || 0}
          {" "}
          | 忙碌:
          {" "}
          {schedulerStats?.onlineVolunteers?.busyVolunteers || 0}
        </div>
      </div>

      {/* 已完成任务 */}
      <div className="stat bg-gradient-to-br from-success/10 to-success/5 rounded-lg border border-success/20">
        <div className="stat-figure text-success">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
        </div>
        <div className="stat-title">已完成任务</div>
        <div className="stat-value text-success">{taskStats?.completedTasks || 0}</div>
        <div className="stat-desc">
          失败任务:
          {" "}
          {taskStats?.failedTasks || 0}
        </div>
      </div>
    </div>
  );
}
