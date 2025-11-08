import type { Role } from "@/components/Role/types";
import CharacterDetail from "@/components/Role/CharacterDetail";
import { getRoleRule, setRoleRule } from "@/utils/roleRuleStorage";
import { useEffect } from "react";
// --- CHANGED --- 引入更多 react-router hooks
import { Navigate, useNavigate, useOutletContext, useParams, useSearchParams } from "react-router";

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
    return <div>角色未找到或正在加载...</div>;
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
