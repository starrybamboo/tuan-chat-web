import type { Role } from "@/components/Role/types"; // 确保路径正确
import type { Route } from "./+types/home";
import { Sidebar } from "@/components/Role/Sidebar"; // 确保路径正确
import { useState } from "react";
import { Outlet, useParams } from "react-router"; // 引入 Outlet 和 useParams
import { Drawer } from "vaul";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "角色创建页面" },
    { name: "description", content: "创建和管理你的角色" },
  ];
}

export default function RoleLayout() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // 使用 useParams hook 从 URL 中获取 roleId
  const { roleId } = useParams<{ roleId: string }>();

  // 将字符串类型的 roleId 转换为 number 或 null
  const selectedRoleId = roleId ? Number.parseInt(roleId, 10) : null;

  return (
    <div className="flex h-full min-h-0">
      {/* 桌面端侧边栏 - 可收起 */}
      <div className={`hidden lg:block transition-all duration-300 bg-base-200 border-r border-base-300 ${isSidebarCollapsed ? "w-0 overflow-hidden" : "w-80"}`}>
        <Sidebar
          roles={roles}
          setRoles={setRoles}
          selectedRoleId={selectedRoleId}
        />
      </div>

      {/* 桌面端切换按钮 - 半圆形状 */}
      <div className={`hidden lg:block fixed top-24 -translate-y-1/2 z-50 transition-all duration-300 ${isSidebarCollapsed ? "left-0" : "left-80"}`}>
        <button
          type="button"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="w-6 h-12 cursor-pointer bg-base-300 transition-all duration-200 rounded-r-full flex items-center justify-center group"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="w-3 h-3 stroke-current transition-transform duration-200"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d={isSidebarCollapsed
                ? "M9 5l7 7-7 7" // 展开箭头 (向右)
                : "M15 19l-7-7 7-7"}
            />
          </svg>
        </button>
      </div>

      {/* 移动端悬浮按钮 */}
      <div className="lg:hidden fixed top-14 left-1 z-50">
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="btn btn-circle bg-base-200 hover:bg-base-300 shadow-sm border border-base-300/50 transition-all duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-columns2-icon lucide-columns-2">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M12 3v18" />
          </svg>
        </button>
      </div>

      {/* 移动端 Vaul Drawer */}
      <Drawer.Root
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        direction="left"
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 lg:hidden" />
          <Drawer.Content className="z-100 bg-transparent flex flex-col fixed h-full w-80 left-0 top-0 lg:hidden">
            <div className="flex-1 overflow-y-auto">
              <Sidebar
                roles={roles}
                setRoles={setRoles}
                selectedRoleId={selectedRoleId}
              />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* 主内容区域 */}
      <div className="flex-1 bg-base-100 md:bg-base-200 overflow-y-auto min-h-0">
        <div className="md:p-6 max-w-7xl mx-auto min-h-0">
          {/* Outlet 是子路由的渲染位置 */}
          {/* 通过 context 将状态传递给子路由 */}
          <Outlet context={{ roles, setRoles }} />
        </div>
      </div>
    </div>
  );
}
