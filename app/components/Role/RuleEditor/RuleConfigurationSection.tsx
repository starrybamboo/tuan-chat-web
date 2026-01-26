import Section from "../Editors/Section";
import RuleNumericalEditor from "./RuleNumericalEditor";

export function RuleConfigurationSection({
  customLabel,
  localEdits,
  onDataChange,
  cloneVersion,
  onEditingChange,
}: {
  customLabel: string;
  localEdits?: Record<string, any>;
  onDataChange: (newData: Record<string, any>) => void;
  cloneVersion: number;
  onEditingChange?: (editing: boolean) => void;
}) {
  const fieldCount = Object.keys(localEdits ?? {}).length;
  return (
    <Section
      className="rounded-2xl md:border-2 md:border-base-content/10 bg-base-100"
      collapsible={false}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <h4 className="text-lg font-semibold">
            ⚡
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
        />
      </div>
    </Section>
  );
}
