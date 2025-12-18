import { useCallback, useEffect, useState } from "react";
// 这个组件未来可能与 illegalURLPage 合并
interface RedirectErrorPageProps {
  errorMessage: string;
  countdownSeconds?: number;
  redirectPath?: string;
}

export function RedirectErrorPage({
  errorMessage,
  countdownSeconds = 3,
  redirectPath,
}: RedirectErrorPageProps) {
  const [secondsLeft, setSecondsLeft] = useState(countdownSeconds);

  // 返回上一页
  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      window.history.back();
    }
    else {
      // 如果没有历史记录，则重定向到首页或其他默认页面
      window.location.href = redirectPath || "/";
    }
  }, [redirectPath]);

  // 倒计时逻辑
  useEffect(() => {
    if (secondsLeft <= 0) {
      goBack();
      return;
    }

    const timer = setTimeout(() => {
      setSecondsLeft(secondsLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [secondsLeft, goBack]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100 p-4 duration-200">
      <div className="max-w-md w-full  p-8 rounded-xl shadow-lg text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
          <svg
            className="h-8 w-8 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h2 className="mt-4 text-xl font-bold">发生错误</h2>

        <p className="mt-2">
          {errorMessage}
        </p>

        <div className="mt-6">
          <div className="flex items-center justify-center space-x-2">
            <span>将在</span>
            <span className="text-xl font-semibold text-red-600">{secondsLeft}</span>
            <span>秒后返回</span>
          </div>
          <button
            type="button"
            onClick={goBack}
            className="mt-6 w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
          >
            立即返回
          </button>
        </div>
      </div>
    </div>
  );
}
