import type { InterfaceDensity } from "@/components/common/DesignLanguage";

import { Tabs } from "@/components/common/Tabs";

import type { RoleConfigTabKey } from "./configTabMeta";

import { ROLE_CONFIG_TAB_ITEMS } from "./configTabMeta";

const roleConfigTabOptions = ROLE_CONFIG_TAB_ITEMS.map(({ key, label, shortLabel, Icon }) => ({
  value: key,
  icon: <Icon className="size-4 shrink-0" weight="regular" aria-hidden="true" />,
  label: (
    <>
      <span className="md:hidden">{shortLabel}</span>
      <span className="hidden md:inline">{label}</span>
    </>
  ),
}));

/** 统一角色规则配置页签的选中语义与响应式标签。 */
export function RoleConfigTabs({
  value,
  onValueChange,
  density = "default",
  className,
  tabClassName,
}: {
  value: RoleConfigTabKey;
  onValueChange: (value: RoleConfigTabKey) => void;
  density?: InterfaceDensity;
  className?: string;
  tabClassName?: string;
}) {
  return (
    <Tabs
      value={value}
      options={roleConfigTabOptions}
      onValueChange={onValueChange}
      ariaLabel="角色配置"
      density={density}
      className={className}
      tabClassName={tabClassName}
    />
  );
}
