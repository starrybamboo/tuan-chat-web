import { useGlobalContext } from "@/components/globalContextProvider";
import { useSpaceInvitedMutation } from "api/hooks/chatQueryHooks";
import { tuanchat } from "api/instance";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { userId } = useGlobalContext();
  const [isProcessing, setIsProcessing] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const spaceInvited = useSpaceInvitedMutation(code ?? "");
  const mutateAsyncRef = useRef(spaceInvited.mutateAsync);
  const lastRunKeyRef = useRef<string | null>(null);

  useEffect(() => {
    mutateAsyncRef.current = spaceInvited.mutateAsync;
  }, [spaceInvited.mutateAsync]);

  useEffect(() => {
    let cancelled = false;
    const processInvite = async () => {
      if (!code) {
        if (!cancelled) {
          setError("邀请码不存在");
          setIsProcessing(false);
        }
        return;
      }

      if (!userId) {
        navigate(`/login?redirect=/invite/${encodeURIComponent(code)}`);
        return;
      }

      const runKey = `${code}:${userId}:${attempt}`;
      if (lastRunKeyRef.current === runKey) {
        return;
      }
      lastRunKeyRef.current = runKey;

      if (!cancelled) {
        setIsProcessing(true);
        setError(null);
      }

      try {
        const result = await mutateAsyncRef.current();

        const spaceId = result?.data;
        if (!spaceId) {
          if (!cancelled) {
            setError("加入空间失败，服务器返回异常数据");
            setIsProcessing(false);
          }
          return;
        }

        // 获取用户在该空间下的所有群组（这里用不了useQuery就直接用tuanchat了）
        const { data: roomsData } = await tuanchat.roomController.getUserRooms(spaceId);
        if (roomsData && roomsData.length > 0) {
          const firstRoomId = roomsData[0].roomId;
          navigate(`/chat/${spaceId}/${firstRoomId}`);
        }
        else {
          navigate(`/chat/${spaceId}`);
        }
      }
      catch (err: any) {
        const status = err?.response?.status ?? err?.status;
        if (!cancelled) {
          if (status === 404) {
            setError("邀请链接无效或不存在");
          }
          else if (status === 410) {
            setError("邀请链接已过期");
          }
          else if (status === 403) {
            setError("您没有权限加入此空间");
          }
          else if (status === 500) {
            setError("服务器出错了，请稍后再试或联系管理员");
          }
          else {
            setError("加入空间失败，请稍后重试");
          }
          setIsProcessing(false);
        }
      }
    };

    processInvite();

    return () => {
      cancelled = true;
    };
  }, [code, userId, navigate, attempt]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-base-100 rounded-lg shadow p-6 text-center">
        {isProcessing && !error && (
          <>
            <div className="mb-4">
              <svg className="animate-spin h-8 w-8 mx-auto text-gray-500" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
              </svg>
            </div>
            <h2 className="text-lg font-medium">正在处理邀请……</h2>
            <p className="text-sm text-gray-500 mt-2">请稍等，系统正在尝试将您加入空间。</p>
          </>
        )}

        {!isProcessing && error && (
          <>
            <h2 className="text-lg font-semibold text-red-600">加入失败</h2>
            <p className="mt-3 text-sm text-gray-600">{error}</p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => {
                  setIsProcessing(true);
                  setError(null);
                  setAttempt(prev => prev + 1);
                }}
              >
                重试
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => navigate("/")}
              >
                返回首页
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
