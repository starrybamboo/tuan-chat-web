import { createFileRoute, Navigate, useLocation, useParams, useRouter } from "@tanstack/react-router";

import CharacterDetail from "@/components/Role/CharacterDetail";
import { useRoleListModel } from "@/components/Role/useRoleListModel";
import { Surface } from "@/components/common/DesignLanguage";
import { Divider, Skeleton } from "@/components/common/StatusPrimitives";
import { appendPathQuery } from "@/utils/pathQuery";
import { getRoleRule, setRoleRule } from "@/utils/roleRuleStorage";

export const Route = createFileRoute("/_dashboard/role/{-$roleId}")({
  component: RoleDetailPage,
});

function RoleDetailPage() {
  const { roleId } = useParams({ strict: false }) as { roleId?: string };
  const location = useLocation();
  const router = useRouter();
  const { roles, isLoading } = useRoleListModel();

  const searchParams = new URLSearchParams(location.searchStr);

  const numericRoleId = roleId ? Number.parseInt(roleId, 10) : Number.NaN;

  const urlRuleId = searchParams.get("rule");
  const storedRuleId = getRoleRule(numericRoleId || 0);
  const selectedRuleId = urlRuleId ? Number(urlRuleId) : (storedRuleId || 1);
  const currentRole = roles.find(r => r.id === numericRoleId);

  if (!roleId || Number.isNaN(numericRoleId)) {
    return <Navigate to="/role" replace />;
  }

  if (!currentRole && isLoading) {
    // 角色数据加载中，显示骨架屏
    return (
      <div className="p-4">
        {/* 桌面端头部骨架 */}
        <div className="
          hidden
          md:flex
          items-center justify-between gap-3 mb-4
        ">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-24" />
            <div>
              <Skeleton className="mb-2 h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-12 w-20" />
        </div>

        <Divider className="my-4 hidden md:block" />

        <div className="
          grid grid-cols-1
          lg:grid-cols-4
          gap-6
        ">
          {/* 左侧骨架 */}
          <div className="
            lg:col-span-1
            space-y-6
          ">
            <Surface level="content" className="shadow-xs md:border-2 md:border-base-content/10">
              <div className="flex flex-col gap-2 p-4">
                <div className="flex justify-center mt-6 mb-2">
                  <div className="flex flex-col items-center gap-3">
                    <Skeleton className="size-24" rounded="full" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
                <Divider />
                <Skeleton className="mb-2 h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </Surface>
          </div>

          {/* 右侧骨架 */}
          <div className="
            lg:col-span-3
            space-y-6
          ">
            <div className="flex gap-2">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-20" />
            </div>
            <Surface level="content" className="border-base-content/10 shadow-xs md:border-2">
              <div className="flex flex-col gap-2 p-6">
                <Skeleton className="mb-4 h-6 w-32" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="mt-4 h-20 w-full" />
              </div>
            </Surface>
          </div>
        </div>
      </div>
    );
  }

  if (!currentRole) {
    return <Navigate to="/role" replace />;
  }

  // --- ADDED --- 创建一个函数来处理 URL 的变更
  const handleRuleChange = (newRuleId: number) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("rule", newRuleId.toString());
    // 保存到浏览器存储
    setRoleRule(numericRoleId, newRuleId);
    // 使用 replace: true 避免在浏览器历史中留下太多记录
    router.history.replace(appendPathQuery(`/role/${numericRoleId}`, newSearchParams));
  };

  return (
    <CharacterDetail
      role={currentRole}
      onSave={() => {}}
      // --- ADDED --- 将解析出的 ruleId 和 URL 修改函数传递下去
      selectedRuleId={selectedRuleId}
      onRuleChange={handleRuleChange}
      // --- REMOVED --- isEditing 和 onEdit 不再需要传递
    />
  );
}
