import type { Dispatch, SetStateAction } from "react";

import type { Role } from "../types";
import RoleCreationFlow from "./RoleCreationFlow";

interface AICreateRoleProps {
  onBack?: () => void;
  onComplete?: (characterData: Role, ruleId?: number) => void;
  setRoles?: Dispatch<SetStateAction<Role[]>>;
  setSelectedRoleId?: (id: number | null) => void;
  onSave?: (updatedRole: Role) => void;
}

export default function AICreateRole(props: AICreateRoleProps) {
  return <RoleCreationFlow mode="AI" {...props} />;
}
