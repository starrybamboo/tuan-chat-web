import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { useSpaceInviteCodeQuery } from "../../../../api/hooks/chatQueryHooks";

export default function InvitePlayerWindow() {
  const spaceContext = React.use(SpaceContext);
  const spaceId = spaceContext.spaceId ?? -1;

  // 当前选择的过期天数
  const [duration, setDuration] = useState<number>(7);
  const [copied, setCopied] = useState<boolean>(false);

  // 为每个 duration 分别请求 invite code (type=1 表示玩家邀请)
  const invite1 = useSpaceInviteCodeQuery(spaceId, 1, 1);
  const invite3 = useSpaceInviteCodeQuery(spaceId, 1, 3);
  const invite7 = useSpaceInviteCodeQuery(spaceId, 1, 7);
  const inviteNoExpire = useSpaceInviteCodeQuery(spaceId, 1);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  // 根据当前选中 duration 取得展示的链接
  const currentInviteLink = useMemo(() => {
    const linkFor = (code: string | undefined) => (code ? `${origin}/invite/${code}` : "生成中...");
    if (duration === 1)
      return linkFor(invite1.data?.data);
    if (duration === 3)
      return linkFor(invite3.data?.data);
    if (duration === 7)
      return linkFor(invite7.data?.data);
    return linkFor(inviteNoExpire.data?.data);
  }, [duration, invite1.data?.data, invite3.data?.data, invite7.data?.data, inviteNoExpire.data?.data, origin]);

  // duration 变更时重置 copied 标志
  useEffect(() => {
    const timer = setTimeout(() => {
      setCopied(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [duration]);

  const copyToClipboard = async () => {
    if (currentInviteLink && currentInviteLink !== "生成中...") {
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(currentInviteLink);
          setCopied(true);
          toast.success("已复制到剪贴板");
        }
        else {
          const tempInput = document.createElement("input");
          document.body.appendChild(tempInput);
          tempInput.value = currentInviteLink;
          tempInput.select();
          tempInput.setSelectionRange(0, 99999);

          const successful = document.execCommand("copy");
          if (successful) {
            setCopied(true);
            toast.success("已复制到剪贴板");
          }
          else {
            throw new Error("复制失败");
          }

          document.body.removeChild(tempInput);
        }
        setTimeout(() => setCopied(false), 2000);
      }
      catch (err) {
        console.error("复制失败:", err);
        toast.error("复制失败");
      }
    }
  };

  return (
    <div className="space-y-6 bg-base-100 rounded-xl p-6">
      {/* 标题 */}
      <div>
        <h2 className="text-xl font-bold mb-2">邀请玩家</h2>
        <p className="text-sm text-gray-500">生成邀请链接分享给玩家，被邀请者可直接加入该空间并成为玩家</p>
      </div>

      {/* 过期时间选择 */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">邀请码有效期</span>
        </label>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            className={`btn btn-sm ${duration === 1 ? "btn-primary" : "btn-outline"}`}
            onClick={() => setDuration(1)}
          >
            1天
          </button>
          <button
            type="button"
            className={`btn btn-sm ${duration === 3 ? "btn-primary" : "btn-outline"}`}
            onClick={() => setDuration(3)}
          >
            3天
          </button>
          <button
            type="button"
            className={`btn btn-sm ${duration === 7 ? "btn-primary" : "btn-outline"}`}
            onClick={() => setDuration(7)}
          >
            7天
          </button>
          <button
            type="button"
            className={`btn btn-sm ${duration === 0 ? "btn-primary" : "btn-outline"}`}
            onClick={() => setDuration(0)}
          >
            永不过期
          </button>
        </div>
      </div>

      {/* 邀请链接显示和复制 */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">邀请链接</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            className="input input-bordered flex-1 text-sm truncate"
            value={currentInviteLink}
            readOnly
            aria-label="邀请链接"
          />
          <button
            type="button"
            className={`btn ${copied ? "btn-success" : "btn-primary"}`}
            onClick={copyToClipboard}
            disabled={currentInviteLink === "生成中..."}
          >
            {copied ? "✓ 已复制" : "复制"}
          </button>
        </div>
      </div>

      {/* 使用说明 */}
      <div className="alert alert-info">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span>将链接分享给玩家，他们点击链接即可加入该空间并自动成为玩家</span>
      </div>
    </div>
  );
}
