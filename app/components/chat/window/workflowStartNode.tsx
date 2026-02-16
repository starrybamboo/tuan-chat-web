import { Handle, Position } from "@xyflow/react";

interface WorkflowStartNodeProps {
  data: {
    label?: string;
  };
}

export default function WorkflowStartNode({ data }: WorkflowStartNodeProps) {
  const label = data?.label?.trim() || "开始";

  return (
    <div className="relative">
      <div className="workflow-start-drag-handle select-none cursor-grab active:cursor-grabbing rounded-sm border-2 border-error bg-error/10 px-4 py-2 text-center text-sm font-bold text-error shadow-sm">
        {label}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        isConnectable
        className="!w-3 !h-3 !bg-error !border-error"
      />
    </div>
  );
}
