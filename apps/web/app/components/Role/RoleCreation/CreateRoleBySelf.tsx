import type { Role } from "../types";
import RoleCreationFlow from "./RoleCreationFlow";

interface CreateRoleBySelfProps {
  onBack?: () => void;
  onComplete?: (role: Role, ruleId?: number) => void;
}

export default function CreateRoleBySelf(props: CreateRoleBySelfProps) {
  return <RoleCreationFlow {...props} />;
}
