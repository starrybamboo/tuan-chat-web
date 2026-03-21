import { useEffect, useMemo } from "react";
import { useLocation } from "react-router";

export default function BlocksuiteFrameRoute() {
  const location = useLocation();
  const target = useMemo(() => `/blocksuite-frame/${location.search}`, [location.search]);

  useEffect(() => {
    window.location.replace(target);
  }, [target]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-200 p-6">
      <div className="rounded-md border border-base-300 bg-base-100 p-4 text-sm text-base-content/70 shadow-sm">
        BlockSuite iframe 正在迁移到独立入口。
        <a href={target} className="ml-2 text-primary underline underline-offset-2">
          立即跳转
        </a>
      </div>
    </div>
  );
}
