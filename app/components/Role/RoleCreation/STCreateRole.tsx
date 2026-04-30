import type { Role } from "../types";
import RoleCreationFlow from "./RoleCreationFlow";

interface STCreateRoleProps {
  onBack?: () => void;
  onComplete?: (characterData: Role, ruleId?: number) => void;
}

export default function STCreateRole(props: STCreateRoleProps) {
  return <RoleCreationFlow {...props} />;
}
