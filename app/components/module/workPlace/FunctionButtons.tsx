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
  const [message, setMessage] = useState("");

  const moduleInfo = useModuleIdQuery(moduleId as number);

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
            onClick={() => setIsCommitOpen(true)}
            className="cursor-pointer h-10 w-full px-3 gap-2 rounded-lg flex items-center justify-center bg-primary text-primary-content hover:bg-primary-focus transition-colors"
          >
            <ChevronSmallTripleUp className="w-4 h-4" />
            保存
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
        <div className="space-y-4">
          <div className="text-xl font-bold">是否确认提交？</div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">提交说明：</label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="请输入提交说明"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCommit}
            >
              确认提交
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setIsCommitOpen(false)}
            >
              取消
            </button>
          </div>
        </div>
      </PopWindow>
      <PopWindow isOpen={isDeclareOpen} onClose={() => setIsDeclareOpen(false)}>
        <div className="p-4 max-w-sm">
          <h3 className="text-lg font-bold mb-2">确认发布</h3>
          <p className="mb-4 text-sm text-base-content/70">
            是否发布该模组：
            <span className="font-semibold">{moduleInfo.data?.data?.moduleName || "未命名模组"}</span>
            ？
          </p>
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
