import type { Dispatch, SetStateAction } from "react";
import type { Role } from "../types";
import RoleCreationFlow from "./RoleCreationFlow";

interface CreateRoleBySelfProps {
  onBack?: () => void;
  setRoles?: Dispatch<SetStateAction<Role[]>>;
  setSelectedRoleId?: (id: number | null) => void;
  onSave?: (updatedRole: Role) => void;
  onComplete?: (role: Role, ruleId?: number) => void;
}

export default function CreateRoleBySelf(props: CreateRoleBySelfProps) {
  return <RoleCreationFlow mode="self" {...props} />;
}
