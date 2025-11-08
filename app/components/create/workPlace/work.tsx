// Work.tsx - 重构为卡片网格首页（参考 ModuleHome）
import type { StageResponse } from "api";
import Pagination from "@/components/common/pagination";
import { useStagingQuery } from "api/hooks/moduleQueryHooks";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

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

  const handleOpen = (item?: StageResponse) => {
    if (!item || !item.stageId) {
      return;
    }

    // 普通模式：进入编辑
    try {
      // 在跳转前通过 sessionStorage 传递当前 moduleId，避免新页面异步未就绪
      localStorage.setItem("currentModuleId", String((item as any).moduleId ?? item.stageId));
    }
    catch {}
    navigate(`/create/${item.stageId}`);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-base-100">
      <button
        type="button"
        className="cursor-pointer fixed z-50 flex items-center justify-center px-3 py-2 border-2 bg-base-200 font-bold text-base overflow-hidden group transition-all duration-300 hover:border-white
      left-1/2 -translate-x-1/2 bottom-[85px] w-[90vw] max-w-xs rounded-full shadow-lg
      md:bg-transparent md:px-4 md:py-4 md:border-4 md:text-xl md:left-auto md:right-16 md:top-[80px] md:bottom-auto md:w-auto md:max-w-none md:rounded-none md:shadow-none md:translate-x-0"
        onClick={() => navigate("/module/create")}
      >
        {/* 从左往右的黑色背景遮罩 */}
        <div className="absolute inset-0 bg-info transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out"></div>

        {/* 按钮内容 - 使用relative和z-10确保在遮罩之上 */}
        <span className="relative z-10  group-hover:text-white transition-colors duration-300">创建模组</span>
        <svg
          className="w-8 h-8 relative z-10  group-hover:text-white transition-colors duration-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
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
                <Card key={item.stageId} item={item} onClick={() => handleOpen(item)} />
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
  );
}
