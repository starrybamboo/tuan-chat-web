import type { RoleAbility as ApiRoleAbility } from "@tuanchat/openapi-client/models/RoleAbility";
import type { Space as ApiSpace } from "@tuanchat/openapi-client/models/Space";
import type { UserRole as ApiUserRole } from "@tuanchat/openapi-client/models/UserRole";

declare global {
  type CommandInfo = {
    alias: string[];
    description: string;
    examples: string[];
    name: string;
    usage: string;
  };

  type ReplyMessageOptions = {
    visibility?: "public" | "kp_and_sender";
  };

  type RoleAbility = ApiRoleAbility;
  type Space = ApiSpace;
  type UserRole = ApiUserRole;

  type CPI = {
    getRoleAbilityList: (roleId: number) => RoleAbility;
    getSpaceData: (key: string) => string | undefined;
    getSpaceInfo: () => Space | null | undefined;
    replyMessage: (msg: string, options?: ReplyMessageOptions) => void;
    sendToast: (msg: string) => void;
    setCopywritingKey: (key: string | null) => void;
    setRoleAbilityList: (roleId: number, abilityList: RoleAbility) => void;
    setSpaceData: (key: string, value: string | null) => void;
    showRoleAbilityCard?: (props: {
      ability: RoleAbility;
      requestedKeys: string[];
      roleName: string;
    }) => void | Promise<void>;
  };
}

export {};
