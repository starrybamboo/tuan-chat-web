import { PopWindow } from "@/components/common/popWindow";
import { useGlobalContext } from "@/components/globalContextProvider";
import { ArrowBackThickFill, BaselineAssistant, BaselineBackup, ChevronSmallTripleUp } from "@/icons";
import { useCreateSpaceMutation, useGetUserSpacesQuery } from "api/hooks/chatQueryHooks";
import { useCommitMutation, useModuleIdQuery, useUpdateModuleMutation } from "api/hooks/moduleAndStageQueryHooks";
import { useImportFromModuleMutation } from "api/hooks/spaceModuleHooks";
import { tuanchat } from "api/instance";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import { useModuleContext } from "./context/_moduleContext";

export default function FunctionButtons() {
  const navigate = useNavigate();
  const globalContext = useGlobalContext();
  const { stageId, moduleId, isCommitted, setIsCommitted } = useModuleContext();
  const { mutate: commit } = useCommitMutation();
  const { mutate: updateModule } = useUpdateModuleMutation();
  const moduleData = useModuleIdQuery(moduleId as number);
  const [isCommitOpen, setIsCommitOpen] = useState(false);
  const [isDeclareOpen, setIsDeclareOpen] = useState(false);
  const [isUnCommitWarningOpen, setIsUnCommitWarningOpen] = useState(false);
  const [message, setMessage] = useState("");

  const moduleInfo = useModuleIdQuery(moduleId as number);

  const handleCommitClick = () => {
    setIsCommitOpen(true);
  };

  const handleCommit = () => {
    if (message.trim() === "") {
      commit({
        stageId: stageId as number,
        message: "无提交说明",
      }, {
        onSuccess: () => {
          toast.success("提交成功");
          setIsCommitted(true);
        },
        onError: () => { toast.error("提交失败，请稍后重试"); },
      });
    }
    else {
      commit({
        stageId: stageId as number,
        message,
      }, {
        onSuccess: () => {
          toast.success("提交成功");
          setIsCommitted(true);
        },
        onError: () => { toast.error("提交失败，请稍后重试"); },
      });
    }
    setIsCommitOpen(false);
    setMessage("");
  };

  // 处理模组导入
  // 获取 userSpace 数据
  const getUserSpaces = useGetUserSpacesQuery();
  const userSpaces = useMemo(() => getUserSpaces.data?.data ?? [], [getUserSpaces.data?.data]);
  const spaces = userSpaces.filter(space => space.userId === Number(globalContext.userId));
  // 创建空间并导入模组
  const createSpaceMutation = useCreateSpaceMutation();
  // 模组导入群聊
  const importFromModule = useImportFromModuleMutation();

  // 选择群聊弹窗
  const [isGroupSelectOpen, setIsGroupSelectOpen] = useState(false);
  // 确认跳转弹窗
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [newSpaceId, setNewSpaceId] = useState<number | null>(null);
  // ===== 事件处理函数 =====
  const handleModuleImport = (spaceId: number) => {
    // 暂时只能推测试模组
    importFromModule.mutate({ spaceId, moduleId: moduleId as number }, {
      onSuccess: () => {
        setIsGroupSelectOpen(false);
      },
      onError: () => {
        setIsGroupSelectOpen(false);
      },
    });
  };

  const handleDirectCreateSpaceAndImport = () => {
    createSpaceMutation.mutate({
      userIdList: [],
      avatar: moduleData.data?.data?.image,
      spaceName: moduleData.data?.data?.moduleName,
      ruleId: moduleData.data?.data?.ruleId || 1,
    }, {
      onSuccess: (data) => {
        const newSpaceId = data.data?.spaceId;
        if (newSpaceId) {
          importFromModule.mutate({ spaceId: newSpaceId, moduleId: moduleId as number }, {
            onSuccess: () => {
              setIsGroupSelectOpen(false);
              setNewSpaceId(newSpaceId);
              setShowConfirmPopup(true);
              toast.success("模组导入成功");
            },
            onError: () => {
              setIsGroupSelectOpen(false);
              toast.error("模组导入失败，请稍后重试");
            },
          });
        }
      },
      onError: () => {
        setIsGroupSelectOpen(false);
      },
    });
  };

  // 处理跳转到新空间
  const handleNavigateToNewSpace = async () => {
    if (newSpaceId) {
      try {
        const roomsData = await tuanchat.roomController.getUserRooms(newSpaceId);

        if (roomsData?.data && roomsData.data.length > 0) {
          const firstRoomId = roomsData.data[0].roomId;
          navigate(`/chat/${newSpaceId}/${firstRoomId}`);
        }
        else {
          navigate(`/chat/${newSpaceId}`);
        }
      }
      catch (error) {
        console.error("获取群组列表失败:", error);
        navigate(`/chat/${newSpaceId}`);
      }
      setShowConfirmPopup(false);
    }
  };

  // 处理取消跳转
  const handleCancelNavigate = () => {
    setShowConfirmPopup(false);
    setNewSpaceId(null);
  };

  return (
    <>
      <div className="bg-base-200 flex flex-wrap items-center p-2 gap-2 w-full">
        <div className="flex-1/3">
          <button
            type="button"
            onClick={() => navigate("/module", { replace: true })}
            className="cursor-pointer h-10 w-full px-3 gap-2 rounded-lg flex items-center justify-center border hover:bg-base-300 transition-colors"
          >
            <ArrowBackThickFill className="w-4 h-4" />
            返回
          </button>
        </div>
        <div className="flex-1/3">
          <button
            type="button"
            onClick={handleCommitClick}
            className={`group cursor-pointer h-10 w-full px-3 rounded-lg flex items-center justify-center transition-colors
              ${isCommitted ? "bg-success/80 hover:bg-success/70 text-success-content" : "bg-info/80 hover:bg-info/70 text-info-content"}`}
            title={isCommitted ? "再次提交" : "提交"}
          >
            {/* 常态：展示当前状态（已提交/未提交） */}
            <span className="group-hover:hidden inline-flex items-center gap-2">
              <BaselineBackup className="w-4 h-4" />
              {isCommitted ? "已提交" : "未提交"}
            </span>
            {/* 悬停：展示操作文案（再次提交/提交） */}
            <span className="hidden group-hover:inline-flex items-center gap-2">
              <BaselineBackup className="w-4 h-4" />
              {isCommitted ? "再次提交" : "提交"}
            </span>
          </button>
        </div>
        <div className="flex-1/3">
          <button
            type="button"
            onClick={() => setIsDeclareOpen(true)}
            className={`group cursor-pointer h-10 w-full px-3 rounded-lg flex items-center justify-center transition-colors
              ${moduleData.data?.data?.state === 1 ? "bg-success/80 hover:bg-success/70 text-success-content" : "bg-error/80 hover:bg-error/70 text-error-content"}`}
            title={moduleData.data?.data?.state === 1 ? "取消发布" : "发布"}
          >
            {/* 常态：展示当前状态（已发布/未发布） */}
            <span className="group-hover:hidden inline-flex items-center gap-2">
              <BaselineAssistant className="w-4 h-4" />
              { moduleData.data?.data?.state === 1 ? "已发布" : "未发布"}
            </span>
            {/* 悬停：展示操作文案（取消发布/发布） */}
            <span className="hidden group-hover:inline-flex items-center gap-2">
              <BaselineAssistant className="w-4 h-4" />
              { moduleData.data?.data?.state === 1 ? "取消发布" : "发布"}
            </span>
          </button>
        </div>
        <div className="flex-1/3">
          <button
            type="button"
            onClick={() => setIsGroupSelectOpen(true)}
            className="cursor-pointer h-10 w-full px-3 gap-2 rounded-lg flex items-center justify-center text-primary-content hover:bg-primary-focus transition-colors bg-accent"
          >
            <ChevronSmallTripleUp className="w-4 h-4" />
            导入到群聊
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

      <PopWindow isOpen={isUnCommitWarningOpen} onClose={() => setIsUnCommitWarningOpen(false)}>
        <div className="p-4 max-w-sm flex flex-col min-h-[24vh]">
          <h3 className="text-lg font-bold mb-4 text-center">未提交的修改</h3>
          <div className="flex-1 flex items-center justify-center mb-4">
            <p className="text-sm text-base-content/70 text-center">
              检测到有未提交的修改，请先提交后再应用。
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setIsUnCommitWarningOpen(false);
                setIsCommitOpen(true);
              }}
            >
              现在提交
            </button>
          </div>
        </div>
      </PopWindow>

      <PopWindow isOpen={isDeclareOpen} onClose={() => setIsDeclareOpen(false)}>
        <div className="p-4 max-w-sm flex flex-col min-h-[24vh]">
          <h3 className="text-lg font-bold mb-4 text-center">确认发布情况</h3>
          <div className="flex-1 flex items-center justify-center mb-4">
            <p className="text-sm text-base-content/70 text-center">
              <span className="block mb-2">请先确认保存的内容提交</span>
              <span className="block">
                { `再确认是否${moduleData.data?.data?.state === 1 ? "取消" : ""}发布该模组：`}
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
                if (isCommitted === false) {
                  setIsUnCommitWarningOpen(true);
                  return;
                }
                if (moduleData.data?.data?.state === 1) {
                  updateModule(
                    { moduleId, state: 0 } as any,
                    {
                      onSuccess: () => {
                        toast.success("取消发布成功");
                      },
                      onError: (error: any) => {
                        const message = (error?.response?.data?.message as string | undefined) || (error?.message as string | undefined) || "发布失败，请稍后重试";
                        toast.error(message);
                        // 失败时保留发布模式与弹窗，便于用户重试
                      },
                    },
                  );
                  setIsDeclareOpen(false);
                }
                else {
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
                }
              }}
            >
              { `确认${moduleData.data?.data?.state === 1 ? "取消" : ""}发布`}
            </button>
          </div>
        </div>
      </PopWindow>
      <PopWindow isOpen={isGroupSelectOpen} onClose={() => setIsGroupSelectOpen(false)}>
        <div className="flex flex-col gap-y-4 pb-4 max-h-[80vh] overflow-y-auto">
          <span className="text-lg font-semibold">选择操作</span>
          <p className="text-xl font-semibold text-error">在导入之前，请确认您已经提交，否则新改动将不会生效!!!</p>

          {/* 一键创建空间按钮 */}
          <div className="bg-base-200 p-4 rounded-lg">
            <h3 className="font-medium mb-2">创建新空间</h3>
            <button
              type="button"
              className="btn btn-success w-full"
              onClick={() => {
                if (isCommitted === false) {
                  setIsUnCommitWarningOpen(true);
                  return;
                }
                handleDirectCreateSpaceAndImport();
              }}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              一键创建空间并导入模组
            </button>
            <p className="text-sm text-gray-500 mt-2">
              将使用当前模组的头像、名称和规则创建新空间
            </p>
          </div>

          <div className="divider">或选择现有群聊</div>

          <span className="text-lg font-semibold">请选择需要应用的群聊</span>
          {
            spaces.map(space => (
              <div className="flex gap-x-4 items-center p-2 bg-base-100 rounded-lg w-full justify-between" key={space.spaceId}>
                <div className="flex items-center gap-2">
                  <img
                    src={space.avatar}
                    alt={space.name}
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="text-sm font-medium">
                    {space.name}
                  </span>
                </div>
                {space.moduleId
                  ? (
                      <button
                        type="button"
                        className="btn btn-disabled w-20"
                        onClick={() => { handleModuleImport(space.spaceId ?? -1); }}
                      >
                        已应用
                      </button>
                    )
                  : (
                      <button
                        type="button"
                        className="btn w-20"
                        onClick={() => {
                          if (isCommitted === false) {
                            setIsUnCommitWarningOpen(true);
                          }
                          else { handleModuleImport(space.spaceId ?? -1); }
                        }}
                      >
                        应用
                      </button>
                    )}
              </div>
            ))
          }
        </div>
      </PopWindow>
      <PopWindow isOpen={showConfirmPopup} onClose={handleCancelNavigate}>
        <div className="flex flex-col items-center p-6 gap-4">
          <div className="text-2xl font-bold text-success">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            空间创建成功！
          </div>

          <p className="text-center text-gray-600">
            模组已成功导入到新空间
            <br />
            <span className="font-semibold">{moduleData.data?.data?.moduleName}</span>
          </p>

          <div className="flex gap-4 mt-4">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleCancelNavigate}
            >
              稍后查看
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleNavigateToNewSpace}
            >
              立即前往
            </button>
          </div>
        </div>
      </PopWindow>

    </>
  );
}
