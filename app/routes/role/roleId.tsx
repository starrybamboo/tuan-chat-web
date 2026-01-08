import type { Role } from "@/components/Role/types";
import { useEffect } from "react";
// --- CHANGED --- 引入更多 react-router hooks
import { Navigate, useNavigate, useOutletContext, useParams, useSearchParams } from "react-router";
import CharacterDetail from "@/components/Role/CharacterDetail";
import { getRoleRule, setRoleRule } from "@/utils/roleRuleStorage";

// 定义从 Outlet Context 接收的数据类型
interface RoleContext {
  roles: Role[];
  setRoles: React.Dispatch<React.SetStateAction<Role[]>>;
}

export default function RoleDetailPage() {
  const { roleId } = useParams<{ roleId: string }>();
  const { roles, setRoles } = useOutletContext<RoleContext>();

  // --- ADDED --- 路由和搜索参数的管理 hooks
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // --- REMOVED --- isEditing 状态将移动到 CharacterDetail 内部
  // const [isEditing, setIsEditing] = useState(false);

  // --- REMOVED --- 这个 useEffect 是多余的，因为组件重新挂载会自动重置状态
  // useEffect(() => { ... }, [numericRoleId]);

  const numericRoleId = roleId ? Number.parseInt(roleId, 10) : Number.NaN;

  // --- ADDED --- 从 URL search params 解析 ruleId,如果没有则从存储中获取
  const urlRuleId = searchParams.get("rule");
  const storedRuleId = getRoleRule(numericRoleId || 0);
  const selectedRuleId = urlRuleId ? Number(urlRuleId) : (storedRuleId || 1);

  // 如果URL中没有规则参数但存储中有,则更新URL
  useEffect(() => {
    if (!urlRuleId && storedRuleId && numericRoleId) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set("rule", storedRuleId.toString());
      navigate(`?${newSearchParams.toString()}`, { replace: true });
    }
  }, [urlRuleId, storedRuleId, searchParams, navigate, numericRoleId]);

  if (!roleId || Number.isNaN(numericRoleId)) {
    return <Navigate to="/role" replace />;
  }

  const currentRole = roles.find(r => r.id === numericRoleId);
  if (!currentRole) {
    // 角色数据加载中，显示骨架屏
    return (
      <div className="p-4">
        {/* 桌面端头部骨架 */}
        <div className="hidden md:flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-4">
            <div className="skeleton h-12 w-24 rounded-md"></div>
            <div>
              <div className="skeleton h-8 w-48 mb-2"></div>
              <div className="skeleton h-4 w-32"></div>
            </div>
          </div>
          <div className="skeleton h-12 w-20 rounded-md"></div>
        </div>

        <div className="hidden md:block divider"></div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左侧骨架 */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card bg-base-100 shadow-xs rounded-xl md:border-2 md:border-base-content/10">
              <div className="card-body p-4">
                <div className="flex justify-center mt-6 mb-2">
                  <div className="flex flex-col items-center gap-3">
                    <div className="skeleton w-24 h-24 rounded-full"></div>
                    <div className="skeleton h-4 w-20"></div>
                  </div>
                </div>
                <div className="divider"></div>
                <div className="skeleton h-4 w-full mb-2"></div>
                <div className="skeleton h-4 w-3/4"></div>
              </div>
            </div>
          </div>

          {/* 右侧骨架 */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex gap-2">
              <div className="skeleton h-10 w-20 rounded-lg"></div>
              <div className="skeleton h-10 w-20 rounded-lg"></div>
              <div className="skeleton h-10 w-20 rounded-lg"></div>
            </div>
            <div className="card bg-base-100 shadow-xs md:rounded-xl md:border-2 border-base-content/10">
              <div className="card-body">
                <div className="skeleton h-6 w-32 mb-4"></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="skeleton h-10 w-full"></div>
                  <div className="skeleton h-10 w-full"></div>
                </div>
                <div className="skeleton h-20 w-full mt-4"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSave = (updatedRole: Role) => {
    setRoles(prev =>
      prev.map(role =>
        role.id === updatedRole.id ? updatedRole : role,
      ),
    );
    // isEditing 的状态现在由 CharacterDetail 自己管理
  };

  // --- ADDED --- 创建一个函数来处理 URL 的变更
  const handleRuleChange = (newRuleId: number) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("rule", newRuleId.toString());
    // 保存到浏览器存储
    setRoleRule(numericRoleId, newRuleId);
    // 使用 replace: true 避免在浏览器历史中留下太多记录
    navigate(`?${newSearchParams.toString()}`, { replace: true });
  };

  return (
    <CharacterDetail
      role={currentRole}
      // onSave 依然需要，用于更新全局状态
      onSave={handleSave}
      // --- ADDED --- 将解析出的 ruleId 和 URL 修改函数传递下去
      selectedRuleId={selectedRuleId}
      onRuleChange={handleRuleChange}
      // --- REMOVED --- isEditing 和 onEdit 不再需要传递
    />
  );
}
