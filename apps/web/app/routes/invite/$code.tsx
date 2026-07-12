import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/common/Button";
import { StateView } from "@/components/common/StateView";
import { useGlobalUserId } from "@/components/globalContextProvider";
import { fetchUserRoomsWithCache, useSpaceInvitedMutation } from "api/hooks/chatQueryHooks";

export const Route = createFileRoute("/invite/$code")({
  component: InvitePage,
});

function InvitePage() {
  const { code } = useParams({ strict: false }) as { code?: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useGlobalUserId();
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
        navigate({ to: `/login?redirect=/invite/${encodeURIComponent(code)}` });
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

        const { data: roomList } = await fetchUserRoomsWithCache(queryClient, spaceId);
        const roomsData = roomList?.rooms;
        if (roomsData && roomsData.length > 0) {
          const firstRoomId = roomsData[0].roomId;
          navigate({ to: `/chat/${spaceId}/${firstRoomId}` });
        }
        else {
          navigate({ to: `/chat/${spaceId}` });
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
  }, [attempt, code, navigate, queryClient, userId]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="
        max-w-lg w-full bg-base-100 rounded-lg shadow p-6 text-center
      ">
        {isProcessing && !error && (
          <StateView
            loading
            title="正在处理邀请……"
            description="请稍等，系统正在尝试将您加入空间。失败后可重试或返回首页。"
            className="py-0"
          />
        )}

        {!isProcessing && error && (
          <>
            <h2 className="text-lg font-semibold text-error">加入失败</h2>
            <p className="mt-3 text-sm text-base-content/70">{error}</p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setIsProcessing(true);
                  setError(null);
                  setAttempt(prev => prev + 1);
                }}
              >
                重试
              </Button>
              <Button
                variant="ghost"
                type="button"
                onClick={() => navigate({ to: "/" })}
              >
                返回首页
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
