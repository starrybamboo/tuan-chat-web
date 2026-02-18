import type { MouseEvent } from "react";
import { Handle, Position } from "@xyflow/react";

interface WorkflowEndNodeProps {
  data: {
    label?: string;
    endNodeId?: number;
    onDelete?: (endNodeId: number) => void;
  };
}

export default function WorkflowEndNode({ data }: WorkflowEndNodeProps) {
  const label = data?.label?.trim() || "结束";
  const endNodeId = data?.endNodeId;

  const handleDelete = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof endNodeId !== "number" || !Number.isFinite(endNodeId) || endNodeId <= 0)
      return;
    data?.onDelete?.(endNodeId);
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-error bg-base-100 text-[11px] font-bold text-error shadow-sm transition-colors hover:bg-error hover:text-error-content"
        title="删除结束节点"
        aria-label="删除结束节点"
        onPointerDown={event => event.stopPropagation()}
        onClick={handleDelete}
      >
        ×
      </button>
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
