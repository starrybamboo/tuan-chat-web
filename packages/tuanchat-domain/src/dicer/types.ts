export type CommandInfo = {
  name: string;
  alias: string[];
  description: string;
  examples: string[];
  usage: string;
};

export type ReplyMessageVisibility = "public" | "kp_and_sender";

export type ReplyMessageOptions = {
  visibility?: ReplyMessageVisibility;
};

export type RoleAbility = {
  abilityId?: number;
  roleId?: number;
  ruleId?: number;
  act?: Record<string, string>;
  basic?: Record<string, string>;
  ability?: Record<string, string>;
  skill?: Record<string, string>;
  record?: Record<string, string>;
  extra?: Record<string, string>;
};

export type UserRole = {
  userId: number;
  roleId: number;
  roleName?: string;
  description?: string;
  avatarId?: number;
  state?: number;
  type: number;
  modelName?: string;
  speakerName?: string;
  extra?: Record<string, string>;
  createTime?: string;
  updateTime?: string;
  voiceUrl?: string;
};

export type SpaceLike = {
  extra?: unknown;
  dicerRoleId?: unknown;
};

export type CPI = {
  replyMessage: (msg: string, options?: ReplyMessageOptions) => void;
  getRoleAbilityList: (roleId: number) => RoleAbility;
  setRoleAbilityList: (roleId: number, abilityList: RoleAbility) => void;
  sendToast: (msg: string) => void;
  setCopywritingKey: (key: string | null) => void;
  getSpaceInfo: () => SpaceLike | null | undefined;
  getSpaceData: (key: string) => string | undefined;
  setSpaceData: (key: string, value: string | null) => void;
  showRoleAbilityCard?: (props: {
    ability: RoleAbility;
    requestedKeys: string[];
    roleName: string;
  }) => void | Promise<void>;
};
