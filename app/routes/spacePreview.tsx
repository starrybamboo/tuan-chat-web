import { useMemo } from "react";
import { useNavigate, useParams } from "react-router";

export function meta() {
  return [
    { title: "空间预览" },
    { name: "description", content: "Space preview" },
  ];
}

export default function SpacePreview() {
  const navigate = useNavigate();
  const params = useParams();

  const spaceId = useMemo(() => {
    const raw = Number(params.spaceId ?? -1);
    return Number.isFinite(raw) ? raw : -1;
  }, [params.spaceId]);

  const cardClass = "card bg-base-100 shadow-xs rounded-xl md:border md:border-base-content/10";

  if (spaceId <= 0) {
    return (
      <div className="min-h-full w-full flex items-center justify-center p-6">
        <div className={`${cardClass} max-w-md w-full`}>
          <div className="card-body text-center">
            <h2 className="card-title justify-center">无法打开空间预览</h2>
            <p className="text-sm text-base-content/60">空间参数无效，请从聊天室或发现页重新进入。</p>
            <div className="card-actions justify-center">
              <button className="btn btn-primary" type="button" onClick={() => navigate("/chat")}>返回聊天室</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full w-full p-6 bg-base-200">
      <div className={`${cardClass} max-w-3xl mx-auto`}>
        <div className="card-body gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold leading-tight">空间预览</h1>
              <div className="text-sm text-base-content/60 mt-1">
                <span>spaceId:</span>
                <span className="ml-1 font-mono">{spaceId}</span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button type="button" className="btn btn-outline" onClick={() => navigate("/chat")}>返回</button>
              <button type="button" className="btn btn-primary" onClick={() => navigate(`/chat/${spaceId}`)}>打开空间</button>
            </div>
          </div>

          <div className="alert">
            <span>空间预览页面已进入重写阶段：旧实现已移除，这里仅保留占位与基础导航。</span>
          </div>

          <div className="divider my-0" />

          <div className="text-sm text-base-content/70">
            后续建议：先确认需要展示的模块（简介/成员/房间/规则/NPC/文档树等），再逐步补齐 API 与 UI。
          </div>
        </div>
      </div>
    </div>
  );
}
