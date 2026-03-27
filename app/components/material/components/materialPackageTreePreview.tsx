import type { MaterialNode } from "../../../../api/models/MaterialNode";

type MaterialPackageTreePreviewProps = {
  nodes?: MaterialNode[];
  emptyText?: string;
};

function TreeNode({ node, depth }: { node: MaterialNode; depth: number }) {
  const isFolder = node.type === "folder";
  const badgeClass = isFolder ? "badge badge-info badge-outline" : "badge badge-success badge-outline";
  const children = node.children ?? [];
  const messages = node.messages ?? [];

  return (
    <div className="space-y-2">
      <div
        className="rounded-2xl border border-base-300 bg-base-100/80 p-3 shadow-sm"
        style={{ marginLeft: depth * 16 }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className={badgeClass}>{isFolder ? "文件夹" : "素材"}</span>
              <div className="font-medium truncate">{node.name || "未命名节点"}</div>
            </div>
            {!isFolder && node.note && (
              <div className="text-sm opacity-70 whitespace-pre-wrap">{node.note}</div>
            )}
            {!isFolder && messages.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs opacity-70">
                {messages.map((message, index) => (
                  <span key={`${node.name ?? "node"}-${index}`} className="rounded-full bg-base-200 px-2 py-1">
                    {`消息 ${index + 1} · type ${message.messageType ?? "?"}`}
                    {message.annotations?.length ? ` · ${message.annotations.join(" / ")}` : ""}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="text-xs opacity-60 shrink-0">
            {isFolder ? `${children.length} 个子节点` : `${messages.length} 条消息`}
          </div>
        </div>
      </div>
      {isFolder && children.length > 0 && (
        <div className="space-y-2">
          {children.map((child, index) => (
            <TreeNode key={`${node.name ?? "folder"}-${index}`} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MaterialPackageTreePreview({
  nodes,
  emptyText = "这个素材包当前还是空的。",
}: MaterialPackageTreePreviewProps) {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-base-300 bg-base-100/60 px-6 py-10 text-sm opacity-70">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {nodes.map((node, index) => (
        <TreeNode key={`${node.name ?? "root"}-${index}`} node={node} depth={0} />
      ))}
    </div>
  );
}
