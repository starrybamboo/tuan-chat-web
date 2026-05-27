import { GaugeIcon, IdentificationCardIcon, MaskHappyIcon, SwordIcon } from "@phosphor-icons/react";

/** 可编辑的角色规则配置分区键。 */
export type RoleConfigTabKey = "basic" | "ability" | "skill" | "act";

/** 桌面端规则配置分区的展示元数据。 */
export const ROLE_CONFIG_TAB_ITEMS = [
  {
    key: "basic",
    label: "基础配置",
    shortLabel: "基础",
    titleLabel: "基础属性",
    Icon: IdentificationCardIcon,
  },
  {
    key: "ability",
    label: "能力配置",
    shortLabel: "能力",
    titleLabel: "能力",
    Icon: GaugeIcon,
  },
  {
    key: "skill",
    label: "技能配置",
    shortLabel: "技能",
    titleLabel: "技能",
    Icon: SwordIcon,
  },
  {
    key: "act",
    label: "表演配置",
    shortLabel: "表演",
    titleLabel: "表演",
    Icon: MaskHappyIcon,
  },
] as const satisfies ReadonlyArray<{
  Icon: typeof IdentificationCardIcon;
  key: RoleConfigTabKey;
  label: string;
  shortLabel: string;
  titleLabel: string;
}>;

/** 根据配置分区键取回对应展示元数据。 */
export function getRoleConfigTabItem(key: RoleConfigTabKey) {
  return ROLE_CONFIG_TAB_ITEMS.find(item => item.key === key) ?? ROLE_CONFIG_TAB_ITEMS[0];
}
