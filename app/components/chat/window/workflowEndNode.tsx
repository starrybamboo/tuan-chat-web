import { Handle, Position } from "@xyflow/react";

interface WorkflowEndNodeProps {
  data: {
    label?: string;
  };
}

export default function WorkflowEndNode({ data }: WorkflowEndNodeProps) {
  const label = data?.label?.trim() || "结束";

  return (
    <div className="relative">
      <div className="workflow-end-drag-handle select-none cursor-grab active:cursor-grabbing rounded-sm border-2 border-success bg-success/10 px-4 py-2 text-center text-sm font-bold text-success shadow-sm">
        {label}
      </div>
      <Handle
        type="target"
        position={Position.Left}
        isConnectable
        className="!w-3 !h-3 !bg-success !border-success"
      />
    </div>
  );
}
