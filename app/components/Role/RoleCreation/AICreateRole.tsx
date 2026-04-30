import type { Role } from "../types";
import RoleCreationFlow from "./RoleCreationFlow";

interface AICreateRoleProps {
  onBack?: () => void;
  onComplete?: (characterData: Role, ruleId?: number) => void;
}

export default function AICreateRole(props: AICreateRoleProps) {
  return <RoleCreationFlow {...props} />;
}
