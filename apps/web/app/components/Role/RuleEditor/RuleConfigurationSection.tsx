import type { RoleConfigTabKey } from "../rules/configTabMeta";
import Section from "../Editors/Section";
import { getRoleConfigTabItem } from "../rules/configTabMeta";
import RuleNumericalEditor from "./RuleNumericalEditor";

export function RuleConfigurationSection({
  customLabel,
  configKey,
  localEdits,
  onDataChange,
  cloneVersion,
  onEditingChange,
  forcedEditing,
  saveSignal,
}: {
  customLabel: string;
  configKey: RoleConfigTabKey;
  localEdits?: Record<string, any>;
  onDataChange: (newData: Record<string, any>) => void;
  cloneVersion: number;
  onEditingChange?: (editing: boolean) => void;
  forcedEditing?: boolean;
  saveSignal?: number;
}) {
  const fieldCount = Object.keys(localEdits ?? {}).length;
  const { Icon } = getRoleConfigTabItem(configKey);
  return (
    <Section
      className="
        rounded-2xl
        md:border-2 md:border-base-content/10
        bg-base-100
      "
      collapsible={false}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Icon className="size-5 shrink-0 text-base-content/80" weight="bold" aria-hidden="true" />
          <h4 className="text-lg font-semibold">
            {customLabel}
            模版
          </h4>
          <div className="badge badge-info badge-sm">{fieldCount}</div>
        </div>
        <RuleNumericalEditor
          title={customLabel}
          data={localEdits ?? {}}
          onSave={onDataChange}
          cloneVersion={cloneVersion}
          onEditingChange={onEditingChange}
          forcedEditing={forcedEditing}
          saveSignal={saveSignal}
        />
      </div>
    </Section>
  );
}
