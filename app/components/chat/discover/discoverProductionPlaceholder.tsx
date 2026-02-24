import { Link } from "react-router";

export default function DiscoverProductionPlaceholder() {
  return (
    <div className="bg-base-200 h-full w-full overflow-y-auto overflow-x-visible p-4 sm:p-6">
      <div className="mx-auto flex h-full w-full max-w-3xl items-center justify-center">
        <section className="w-full rounded-2xl border border-base-300 bg-base-100 px-6 py-12 text-center shadow-sm sm:px-10">
          <h1 className="text-2xl font-semibold leading-tight">发现功能暂未开放</h1>
          <p className="mt-3 text-base text-base-content/70">
            模组与素材模块正在开发中，你可以在测试环境中访问。
          </p>
          <div className="mt-6">
            <Link to="/chat" className="btn btn-primary btn-sm">
              返回聊天
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
