import type { Dispatch, SetStateAction } from "react";

import type { Role } from "../types";
import RoleCreationFlow from "./RoleCreationFlow";

interface STCreateRoleProps {
  onBack?: () => void;
  onComplete?: (characterData: Role, ruleId?: number) => void;
  setRoles?: Dispatch<SetStateAction<Role[]>>;
  setSelectedRoleId?: (id: number | null) => void;
  onSave?: (updatedRole: Role) => void;
}

export default function STCreateRole(props: STCreateRoleProps) {
  return <RoleCreationFlow mode="ST" {...props} />;
}
