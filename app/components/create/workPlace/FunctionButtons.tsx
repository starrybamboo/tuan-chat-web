import { PopWindow } from "@/components/common/popWindow";
import { ArrowBackThickFill, ChevronSmallTripleUp } from "@/icons";
import { useCommitMutation, useModuleIdQuery, useUpdateModuleMutation } from "api/hooks/moduleAndStageQueryHooks";
import { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import { useModuleContext } from "./context/_moduleContext";

export default function FunctionButtons() {
  const navigate = useNavigate();
  const { stageId, moduleId } = useModuleContext();
  const { mutate: commit } = useCommitMutation();
  const { mutate: updateModule } = useUpdateModuleMutation();
  const [isCommitOpen, setIsCommitOpen] = useState(false);
  const [isDeclareOpen, setIsDeclareOpen] = useState(false);
  const [isUnsavedWarningOpen, setIsUnsavedWarningOpen] = useState(false);
  const [message, setMessage] = useState("");

  const moduleInfo = useModuleIdQuery(moduleId as number);

  // 检查是否有未保存的修改（这里需要根据实际情况实现）
  const hasUnsavedChanges = () => {
    // TODO: 这里应该检查实际的未保存状态
    // 可以从 context 或其他状态管理中获取
    // 暂时返回 false，需要根据实际情况调整
    return false;
  };

  const handleCommitClick = () => {
    if (hasUnsavedChanges()) {
      setIsUnsavedWarningOpen(true);
    }
    else {
      setIsCommitOpen(true);
    }
  };

  const handleCommit = () => {
    if (message.trim() === "") {
      commit({
        stageId: stageId as number,
        message: "无提交说明",
      });
    }
    else {
      commit({
        stageId: stageId as number,
        message,
      });
    }
    setIsCommitOpen(false);
    setMessage("");
  };

  return (
    <>
      <div className="bg-base-200 flex items-center p-2 gap-2 w-full">
        <div className="flex-1">
          <button
            type="button"
            onClick={() => navigate("/create", { replace: true })}
            className="cursor-pointer h-10 w-full px-3 gap-2 rounded-lg flex items-center justify-center border hover:bg-base-300 transition-colors"
          >
            <ArrowBackThickFill className="w-4 h-4" />
            返回
          </button>
        </div>
        <div className="flex-1">
          <button
            type="button"
            onClick={handleCommitClick}
            className="cursor-pointer h-10 w-full px-3 gap-2 rounded-lg flex items-center justify-center bg-info/80 text-info-content hover:bg-info/70 transition-colors"
          >
            <ChevronSmallTripleUp className="w-4 h-4" />
            提交
          </button>
        </div>
        <div className="flex-1">
          <button
            type="button"
            onClick={() => setIsDeclareOpen(true)}
            className="cursor-pointer h-10 w-full px-3 gap-2 rounded-lg flex items-center justify-center bg-primary text-primary-content hover:bg-primary-focus transition-colors"
          >
            <ChevronSmallTripleUp className="w-4 h-4" />
            发布
          </button>
        </div>
      </div>

      <PopWindow isOpen={isCommitOpen} onClose={() => setIsCommitOpen(false)}>
        <div className="p-4 max-w-sm flex flex-col min-h-[24vh]">
          <h3 className="text-lg font-bold mb-4 text-center">是否确认提交？</h3>
          <div className="flex-1 flex items-center justify-center mb-4">
            <div className="w-full">
              <label className="block mb-2 text-sm font-medium text-base-content/70 text-center">提交说明：</label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="请输入提交说明"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setIsCommitOpen(false)}
            >
              取消
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCommit}
            >
              确认提交
            </button>
          </div>
        </div>
      </PopWindow>

      <PopWindow isOpen={isUnsavedWarningOpen} onClose={() => setIsUnsavedWarningOpen(false)}>
        <div className="p-4 max-w-sm flex flex-col min-h-[24vh]">
          <h3 className="text-lg font-bold mb-4 text-center">未保存的修改</h3>
          <div className="flex-1 flex items-center justify-center mb-4">
            <p className="text-sm text-base-content/70 text-center">
              检测到有未保存的修改，请先保存后再应用。
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsUnsavedWarningOpen(false)}
            >
              知道了
            </button>
          </div>
        </div>
      </PopWindow>

      <PopWindow isOpen={isDeclareOpen} onClose={() => setIsDeclareOpen(false)}>
        <div className="p-4 max-w-sm flex flex-col min-h-[24vh]">
          <h3 className="text-lg font-bold mb-4 text-center">确认发布</h3>
          <div className="flex-1 flex items-center justify-center mb-4">
            <p className="text-sm text-base-content/70 text-center">
              <span className="block mb-2">请先确认保存的内容是否提交</span>
              <span className="block">
                再确认是否发布该模组：
                <span className="font-semibold">{moduleInfo.data?.data?.moduleName || "未命名模组"}</span>
                ？
              </span>
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setIsDeclareOpen(false)}>取消</button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                updateModule(
                  { moduleId, state: 1 } as any,
                  {
                    onSuccess: () => {
                      toast.success("发布成功");
                      navigate(`/module/detail/${moduleId}`, { replace: true });
                    },
                    onError: (error: any) => {
                      const message = (error?.response?.data?.message as string | undefined) || (error?.message as string | undefined) || "发布失败，请稍后重试";
                      toast.error(message);
                      // 失败时保留发布模式与弹窗，便于用户重试
                    },
                  },
                );
              }}
            >
              确认发布
            </button>
          </div>
        </div>
      </PopWindow>
    </>
  );
}
