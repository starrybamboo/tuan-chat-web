import { ArrowClockwiseIcon, ArrowLeftIcon, GitCommitIcon } from "@phosphor-icons/react";
import { useRepositoryCommitChainQuery, useRepositoryDetailByIdQuery } from "api/hooks/repositoryQueryHooks";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router";

const COMMIT_TYPE_LABELS: Record<number, string> = {
  0: "快照提交",
  1: "归档容器",
};

function parseRepositoryId(rawId: string | undefined): number {
  const parsed = Number(rawId);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function formatDateTime(value?: string): string {
  if (!value) {
    return "未知时间";
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return value;
  }
  return new Date(timestamp).toLocaleString("zh-CN", { hour12: false });
}

function formatCommitType(commitType?: number): string {
  if (typeof commitType !== "number" || !Number.isFinite(commitType)) {
    return "未知类型";
  }
  return COMMIT_TYPE_LABELS[commitType] ?? `类型 ${commitType}`;
}

export default function RepositoryCommitChainPage() {
  const navigate = useNavigate();
  const params = useParams();
  const repositoryId = useMemo(() => parseRepositoryId(params.id), [params.id]);

  const repositoryQuery = useRepositoryDetailByIdQuery(repositoryId);
  const commitChainQuery = useRepositoryCommitChainQuery(repositoryId, 240);

  const repositoryName = repositoryQuery.data?.data?.repositoryName?.trim() || `仓库 #${repositoryId}`;
  const commitChain = commitChainQuery.data?.data;
  const commits = commitChain?.commits ?? [];
  const chainSummary = `${commits.length} 个提交`;

  if (repositoryId <= 0) {
    return (
      <div className="mx-auto w-full max-w-5xl p-6">
        <div className="rounded-xl border border-base-300 bg-base-100 p-6">
          <div className="text-lg font-semibold">仓库 ID 无效</div>
          <button
            type="button"
            className="btn btn-sm mt-4"
            onClick={() => navigate("/repository")}
          >
            返回仓库列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          className="btn btn-sm btn-ghost gap-1"
          onClick={() => navigate(-1)}
        >
          <ArrowLeftIcon size={16} />
          返回
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline gap-1"
          onClick={() => commitChainQuery.refetch()}
          disabled={commitChainQuery.isFetching}
        >
          <ArrowClockwiseIcon
            size={16}
            className={commitChainQuery.isFetching ? "animate-spin" : ""}
          />
          刷新
        </button>
      </div>

      <section className="rounded-xl border border-base-300 bg-base-100 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Commit 链</h1>
            <p className="mt-1 text-sm text-base-content/70">{repositoryName}</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="badge badge-outline">{chainSummary}</span>
            {commitChain?.truncated && <span className="badge badge-warning badge-outline">结果已截断</span>}
            {commitChain?.broken && <span className="badge badge-error badge-outline">链路存在断点</span>}
          </div>
        </div>

        {commitChainQuery.isLoading && (
          <div className="py-16 text-center text-base-content/60">
            <span className="loading loading-spinner loading-md"></span>
            <p className="mt-3 text-sm">加载 commit 链中...</p>
          </div>
        )}

        {commitChainQuery.isError && (
          <div className="py-16 text-center">
            <p className="text-error">加载失败，请重试</p>
            <button
              type="button"
              className="btn btn-sm mt-4"
              onClick={() => commitChainQuery.refetch()}
            >
              重试
            </button>
          </div>
        )}

        {!commitChainQuery.isLoading && !commitChainQuery.isError && commits.length === 0 && (
          <div className="py-16 text-center text-base-content/60">
            当前仓库暂无可展示的提交记录
          </div>
        )}

        {!commitChainQuery.isLoading && !commitChainQuery.isError && commits.length > 0 && (
          <ol className="mt-6 space-y-4">
            {commits.map((commit, index) => {
              const isHead = index === 0;
              const isTail = index === commits.length - 1;
              const commitId = commit.commitId ?? -1;
              const parentCommitId = commit.parentCommitId;
              return (
                <li key={`${commitId}-${index}`} className="relative pl-11">
                  {!isTail && <span className="absolute left-[15px] top-8 h-[calc(100%-8px)] w-px bg-base-300" />}
                  <span className={`absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border text-xs ${
                    isHead ? "border-primary bg-primary/10 text-primary" : "border-base-300 bg-base-200 text-base-content/70"
                  }`}
                  >
                    <GitCommitIcon size={14} />
                  </span>
                  <div className="rounded-lg border border-base-300 bg-base-100 p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">
                        {`#${commitId}`}
                      </span>
                      {isHead && <span className="badge badge-primary badge-outline">HEAD</span>}
                      <span className="badge badge-outline">{formatCommitType(commit.commitType)}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-base-content/70 md:grid-cols-2">
                      <div>{`父提交: ${typeof parentCommitId === "number" ? `#${parentCommitId}` : "无"}`}</div>
                      <div>{`提交者: ${typeof commit.userId === "number" ? commit.userId : "未知"}`}</div>
                      <div>{`创建时间: ${formatDateTime(commit.createTime)}`}</div>
                      <div>{`更新时间: ${formatDateTime(commit.updateTime)}`}</div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
