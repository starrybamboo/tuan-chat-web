import type { Route } from "./+types/chatDiscover";

import { useGetUserSpacesQuery } from "api/hooks/chatQueryHooks";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "发现" },
    { name: "description", content: "发现 · 已归档群聊" },
  ];
}

function toEpochMs(value?: string) {
  if (!value)
    return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

export default function ChatDiscover() {
  const navigate = useNavigate();
  const spacesQuery = useGetUserSpacesQuery();
  const [keyword, setKeyword] = useState("");

  const archivedSpaces = useMemo(() => {
    const raw = Array.isArray(spacesQuery.data?.data) ? spacesQuery.data?.data : [];
    const list = raw.filter(space => space?.status === 2);
    list.sort((a, b) => {
      const at = toEpochMs(a?.updateTime) || toEpochMs(a?.createTime);
      const bt = toEpochMs(b?.updateTime) || toEpochMs(b?.createTime);
      return bt - at;
    });

    const q = keyword.trim().toLowerCase();
    if (!q)
      return list;

    return list.filter((space) => {
      const name = String(space?.name ?? "").trim().toLowerCase();
      const desc = String(space?.description ?? "").trim().toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [keyword, spacesQuery.data?.data]);

  return (
    <div className="min-h-full w-full bg-base-200">
      <div className="mx-auto w-full max-w-5xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => navigate("/chat")}
            >
              返回聊天室
            </button>
            <h1 className="text-lg font-bold truncate">发现</h1>
            <span className="badge badge-sm">{`已归档 ${archivedSpaces.length}`}</span>
          </div>

          <input
            className="input input-sm input-bordered w-full sm:w-64"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="搜索已归档群聊"
            aria-label="搜索已归档群聊"
          />
        </div>

        {spacesQuery.isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[0, 1, 2, 3, 4, 5].map(n => (
              <div key={n} className="skeleton h-24 w-full" />
            ))}
          </div>
        )}

        {!spacesQuery.isLoading && archivedSpaces.length === 0 && (
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body">
              <h2 className="card-title">暂无已归档群聊</h2>
              <p className="text-sm text-base-content/60">
                你可以在聊天室的空间右键菜单中选择“归档空间”，归档后会出现在这里。
              </p>
              <div className="card-actions justify-end">
                <button className="btn btn-primary" type="button" onClick={() => navigate("/chat")}>
                  去聊天室
                </button>
              </div>
            </div>
          </div>
        )}

        {!spacesQuery.isLoading && archivedSpaces.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {archivedSpaces.map((space) => {
              const spaceId = space?.spaceId ?? -1;
              const name = space?.name ?? (spaceId > 0 ? `空间 #${spaceId}` : "未知空间");
              const description = String(space?.description ?? "").trim();
              const avatar = space?.avatar ?? "/moduleDefaultImage.webp";

              return (
                <div key={String(spaceId)} className="card bg-base-100 border border-base-300 shadow-sm">
                  <div className="card-body p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="avatar shrink-0">
                        <div className="w-12 rounded-xl border border-base-300 overflow-hidden bg-base-200">
                          <img src={avatar} alt={String(name)} className="w-full h-full object-cover" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="font-semibold truncate">{name}</div>
                          <span className="badge badge-outline badge-sm shrink-0">已归档</span>
                        </div>
                        {description && (
                          <div className="text-xs text-base-content/60 truncate">
                            {description}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="card-actions justify-end mt-3">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        disabled={!(spaceId > 0)}
                        onClick={() => {
                          if (spaceId > 0) {
                            navigate(`/space-preview/${spaceId}`);
                          }
                        }}
                      >
                        预览
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={!(spaceId > 0)}
                        onClick={() => {
                          if (spaceId > 0) {
                            navigate(`/chat/${spaceId}`);
                          }
                        }}
                      >
                        打开
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
