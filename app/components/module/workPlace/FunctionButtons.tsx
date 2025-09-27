import { PopWindow } from "@/components/common/popWindow";
import { ArrowBackThickFill, ChevronSmallTripleUp } from "@/icons";
import { useCommitMutation } from "api/hooks/moduleAndStageQueryHooks";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useModuleContext } from "./context/_moduleContext";

export default function FunctionButtons() {
  const navigate = useNavigate();
  const { stageId } = useModuleContext();
  const { mutate: commit } = useCommitMutation();
  const [isCommitOpen, setIsCommitOpen] = useState(false);
  const [message, setMessage] = useState("");

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
      <div className="bg-base-200 flex items-center p-2 gap-2">
        <div className="tooltip tooltip-left" data-tip="返回上一级">
          <button
            type="button"
            onClick={() => navigate("/create", { replace: true })}
            className="h-10 px-3 gap-2 rounded-lg flex items-center justify-center border hover:bg-base-300 transition-colors"
          >
            <ArrowBackThickFill className="w-4 h-4" />
            返回
          </button>
        </div>
        <div className="tooltip tooltip-left" data-tip="保存当前版本">
          <button
            type="button"
            onClick={() => setIsCommitOpen(true)}
            className="h-10 px-3 gap-2 rounded-lg flex items-center justify-center bg-primary text-primary-content hover:bg-primary-focus transition-colors"
          >
            <ChevronSmallTripleUp className="w-4 h-4" />
            保存
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
    </>
  );
}
