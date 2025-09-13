// Work.tsx - 重构为卡片网格首页（参考 ModuleHome）
import type { StageResponse } from "api";
import Pagination from "@/components/common/pagination";
import { useStagingQuery } from "api/hooks/moduleQueryHooks";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ModuleProvider } from "./context/_moduleContext";

const FALLBACK_IMAGE = "/moduleDefaultImage.webp";
const SKELETON_KEYS = [
  "sk-a",
  "sk-b",
  "sk-c",
  "sk-d",
  "sk-e",
  "sk-f",
  "sk-g",
  "sk-h",
];

function Card({ item, onClick }: { item: StageResponse; onClick: () => void }) {
  const cover = item.image && item.image !== "null" ? item.image : FALLBACK_IMAGE;
  return (
    <div
      className="w-full group cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          onClick();
        }
      }}
    >
      <figure className="relative overflow-hidden">
        <img
          src={cover}
          alt={item.moduleName || "module cover"}
          className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-110"
          onError={(e) => {
            const t = e.currentTarget as HTMLImageElement;
            if (t.src !== FALLBACK_IMAGE) {
              t.src = FALLBACK_IMAGE;
            }
          }}
        />
        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
      </figure>
      <div className="pt-3 space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="font-bold line-clamp-1">{item.moduleName || "未命名模组"}</h3>
          {item.authorName && (
            <span className="badge badge-ghost text-xs">{item.authorName}</span>
          )}
        </div>
        {item.description && (
          <p className="text-sm text-base-content/70 line-clamp-2">{item.description}</p>
        )}
      </div>
    </div>
  );
}

export default function Work() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useStagingQuery();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const items = useMemo<StageResponse[]>(() => {
    return (data?.data ?? []).filter(i => i.stageId && i.stageId !== 0);
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
  }, [items, currentPage]);

  const handleOpen = (stageId?: number) => {
    if (!stageId) {
      return;
    }
    // 跳转到 MainWork 所在的 create 路由（/create/:stageId）
    // MainWork 会从路由参数设置上下文并展示编辑器布局
    navigate(`/create/${stageId}`);
  };

  return (
    <ModuleProvider>
      <div className="min-h-[calc(100vh-4rem)] bg-base-100">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-extrabold">我的模组</h2>
          </div>

          {isLoading && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {SKELETON_KEYS.map(key => (
                <div key={key} className="skeleton h-64 w-full" />
              ))}
            </div>
          )}

          {isError && (
            <div className="alert alert-error">
              <span>加载失败。</span>
              <button className="btn btn-sm" type="button" onClick={() => refetch()}>重试</button>
            </div>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <div className="text-center text-base-content/70">暂无模组，去创建一个吧～</div>
          )}

          {!isLoading && !isError && items.length > 0 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {currentItems.map(item => (
                  <Card key={item.stageId} item={item} onClick={() => handleOpen(item.stageId)} />
                ))}
              </div>
              <div className="mt-8">
                <Pagination
                  totalPages={totalPages}
                  currentPage={currentPage}
                  onPageChange={p => setCurrentPage(p)}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </ModuleProvider>
  );
}
