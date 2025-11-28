import { SpaceContext } from "@/components/chat/spaceContext";
import checkBack from "@/components/common/autoContrastText";
import ConfirmModal from "@/components/common/comfirmModel";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import MemberInfoComponent from "@/components/common/memberInfo";
import { PopWindow } from "@/components/common/popWindow";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCropper";
import {
  useDissolveSpaceMutation,
  useGetSpaceInfoQuery,
  useGetSpaceMembersQuery,
  useTransferLeader,
  useUpdateSpaceArchiveStatusMutation,
  useUpdateSpaceMutation,
} from "api/hooks/chatQueryHooks";
import { useGetRulePageInfiniteQuery } from "api/hooks/ruleQueryHooks";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { tuanchat } from "../../../../api/instance";

function SpaceSettingWindow({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const spaceContext = React.use(SpaceContext);
  const spaceId = Number(spaceContext.spaceId);
  const getSpaceInfoQuery = useGetSpaceInfoQuery(spaceId ?? -1);
  const space = getSpaceInfoQuery.data?.data;
  const setActiveSpaceId = spaceContext.setActiveSpaceId;

  // 控制成员列表弹窗打开
  const [isMembersListHandleOpen, setIsMembersListHandleOpen] = useSearchParamsState<boolean>("memberListPop", false);

  // 获取规则列表
  const getRulesQuery = useGetRulePageInfiniteQuery({}, 100);
  const rules = getRulesQuery.data?.pages.flatMap(page => page.data?.list ?? []) ?? [];

  // 获取空间非主持人成员
  const getSpaceMembersQuery = useGetSpaceMembersQuery(spaceId);
  const allMembers = getSpaceMembersQuery.data?.data ?? [];
  const members = allMembers?.filter(member => member.memberType !== 1) ?? [];

  // 处理用户uid
  const [inputUserId, setInputUserId] = useState<number>(-1);

  // 空间归档状态
  const [isArchived, setIsArchived] = useState(space?.status === 2);

  // 设置归档状态
  const updateAchiveStatusMutation = useUpdateSpaceArchiveStatusMutation();

  // 用于强制重置上传组件
  const [uploaderKey, setUploaderKey] = useState(0);

  // 使用状态管理表单数据
  const [formData, setFormData] = useState({
    name: space?.name || "",
    description: space?.description || "",
    avatar: space?.avatar || "",
    ruleId: space?.ruleId || 1,
  });

  // 使用骰娘id数据
  const extra = JSON.parse(space?.extra ?? "{}");
  const [diceRollerId, setDiceRollerId] = useState(extra?.dicerRoleId || 2);

  // 头像文字颜色
  const [avatarTextColor, setAvatarTextColor] = useState("text-black");

  // 监听头像变化，自动调整文字颜色
  useEffect(() => {
    if (formData.avatar) {
      checkBack(formData.avatar).then(() => {
        const computedColor = getComputedStyle(document.documentElement)
          .getPropertyValue("--text-color")
          .trim();
        setAvatarTextColor(computedColor === "white" ? "text-white" : "text-black");
      });
    }
  }, [formData.avatar]);

  const handleAvatarUpdate = (url: string) => {
    setFormData(prev => ({ ...prev, avatar: url }));
    // 上传完成后强制重置上传组件
    setUploaderKey(prev => prev + 1);
  };

  // 转让空间
  const transferLeader = useTransferLeader();

  // 当space数据加载时初始化formData
  if (space && formData.name === "" && formData.description === "" && formData.avatar === "") {
    setFormData({
      name: space.name || "",
      description: space.description || "",
      avatar: space.avatar || "",
      ruleId: space.ruleId || 1,
    });
  }

  const dissolveSpaceMutation = useDissolveSpaceMutation();
  const updateSpaceMutation = useUpdateSpaceMutation();

  // 保存数据函数
  const handleSave = () => {
    updateSpaceMutation.mutate({
      spaceId,
      name: formData.name,
      description: formData.description,
      avatar: formData.avatar,
      ruleId: formData.ruleId,
    }, {
      onSuccess: () => {
        onClose();
      },
    });
    tuanchat.spaceController.setSpaceExtra({
      spaceId,
      key: "dicerRoleId",
      value: String(diceRollerId),
    });
  };

  // 退出时自动保存
  const handleClose = () => {
    handleSave();
  };

  // 控制更新归档状态的确认弹窗显示
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  // 控制删除空间的确认弹窗显示
  const [isDissolveConfirmOpen, setIsDissolveConfirmOpen] = useState(false);
  // 控制转让空间的确认弹窗显示
  const [isTransferOwnerConfirmOpen, setIsTransferOwnerConfirmOpen] = useState(false);
  // 转让的用户Id
  const [transfereeId, setTransfereeId] = useState(-1);

  return (
    <div className="w-full p-4 min-w-[40vw] max-h-[80vh]">
      {space && (
        <div>
          <div className="flex justify-center">
            <ImgUploaderWithCopper
              key={uploaderKey}
              setCopperedDownloadUrl={handleAvatarUpdate}
              fileName={`spaceId-${space.spaceId}`}
            >
              <div className="relative group overflow-hidden rounded-lg">
                <img
                  src={formData.avatar || space.avatar}
                  alt={formData.name}
                  className="w-24 h-24 mx-auto transition-all duration-300 group-hover:scale-110 group-hover:brightness-75 rounded"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-opacity-20 backdrop-blur-sm">
                  <span className={`${avatarTextColor} font-bold px-2 py-1 rounded`}>
                    更新头像
                  </span>
                </div>
              </div>
            </ImgUploaderWithCopper>
          </div>
          <div className="mb-4">
            <label className="label mb-2">
              <span className="label-text">空间名称</span>
            </label>
            <input
              type="text"
              value={formData.name}
              className="input input-bordered w-full"
              onChange={(e) => {
                setFormData(prev => ({ ...prev, name: e.target.value }));
              }}
              placeholder="请输入空间名称..."
            />
          </div>
          <div className="mb-4">
            <label className="label mb-2">
              <span className="label-text">空间描述</span>
            </label>
            <textarea
              value={formData.description}
              className="textarea w-full min-h-[100px]"
              onChange={(e) => {
                setFormData(prev => ({ ...prev, description: e.target.value }));
              }}
              rows={4}
              placeholder="请输入空间描述..."
            />
          </div>
          <div className="mb-4">
            <label className="label mb-2">
              <span className="label-text">空间规则</span>
            </label>
            <div className="dropdown w-full">
              <label tabIndex={0} className="btn btn-outline w-full justify-start">
                {rules.find(rule => rule.ruleId === formData.ruleId)?.ruleName ?? "未找到规则"}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </label>
              <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-full">
                {rules.map(rule => (
                  <li key={rule.ruleId}>
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, ruleId: Number(rule.ruleId) }));
                        if (document.activeElement instanceof HTMLElement) {
                          document.activeElement.blur();
                        }
                      }}
                    >
                      {rule.ruleName}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mb-4">
            <label className="label mb-2">
              <span className="label-text">空间骰娘</span>
            </label>
            <input
              type="text"
              value={String(Number.isNaN(diceRollerId) ? 0 : diceRollerId)}
              className="input input-bordered w-full"
              onChange={(e) => {
                setDiceRollerId(Number(e.target.value));
              }}
              placeholder="请输入骰娘id，留空则使用默认骰娘"
            />
          </div>
          <div className="flex justify-between items-center mt-16">
            <button
              type="button"
              className="btn btn-error"
              onClick={() => setIsDissolveConfirmOpen(true)} // 点击按钮打开删除群组的确认弹窗
            >
              解散空间
            </button>
            <button
              type="button"
              className="btn btn-secondary w-24"
              onClick={() => setIsArchiveConfirmOpen(true)} // 点击按钮打开更新归档状态的确认弹窗
            >
              {isArchived ? "取消归档" : "归档"}
            </button>
            <button
              type="button"
              className="btn btn-accent"
              onClick={() => setIsMembersListHandleOpen(true)}
            >
              转让空间
            </button>
            <button
              type="button"
              className="btn btn-success"
              onClick={handleClose}
            >
              保存并关闭
            </button>
          </div>
          <PopWindow isOpen={isMembersListHandleOpen} onClose={() => setIsMembersListHandleOpen(false)}>
            <div className="flex flex-col gap-y-2 pb-4 min-w-72">
              <div>
                <label className="label mb-2">
                  <span className="label-text">搜索玩家Id</span>
                </label>
                <input
                  type="text"
                  placeholder="请输入要加入的玩家ID"
                  className="input input-bordered w-full mb-2"
                  onInput={e => setInputUserId(Number(e.currentTarget.value))}
                />
              </div>
              <div className="flex flex-col gap-y-2 pb-4 max-h-[40vh] overflow-y-auto">
                {(() => {
                  if (members.length === 0) {
                    return (
                      <div className="text-center py-4 text-gray-500">
                        当前空间内没有玩家哦
                      </div>
                    );
                  }

                  const matchedMember = inputUserId > 0
                    ? members.find(member => member.userId === inputUserId)
                    : null;
                  const memberToShow = matchedMember ? [matchedMember] : members;

                  return memberToShow.map(member => (
                    <div
                      key={member.userId}
                      className="flex gap-x-4 items-center p-2 bg-base-100 rounded-lg w-full justify-between"
                    >
                      <MemberInfoComponent userId={member.userId ?? -1} />
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setIsTransferOwnerConfirmOpen(true);
                          setTransfereeId(member.userId ?? -1);
                          setIsMembersListHandleOpen(false);
                        }}
                      >
                        转让
                      </button>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </PopWindow>
          {/* 渲染更新归档状态的确认弹窗 */}
          <ConfirmModal
            isOpen={isArchiveConfirmOpen}
            onClose={() => setIsArchiveConfirmOpen(false)}
            title="确认更新归档状态"
            message={`是否确定要${isArchived ? "取消归档" : "归档"}该空间？`}
            onConfirm={() => {
              updateAchiveStatusMutation.mutate({ spaceId, archived: !isArchived }, {
                onSuccess: () => {
                  setIsArchived(!isArchived);
                  setIsArchiveConfirmOpen(false);
                },
              });
            }}
          />
          {/* 渲染删除群组的确认弹窗 */}
          <ConfirmModal
            isOpen={isDissolveConfirmOpen}
            onClose={() => setIsDissolveConfirmOpen(false)}
            title="确认解散空间"
            message="是否确定要解散该空间？此操作不可逆。"
            onConfirm={() => {
              dissolveSpaceMutation.mutate(spaceId, {
                onSuccess: () => {
                  onClose();
                  if (typeof window !== "undefined") {
                    localStorage.removeItem("storedChatIds");
                  }
                  navigate("/chat", { replace: true });
                  setIsDissolveConfirmOpen(false);
                  setActiveSpaceId(null);
                },
              });
            }}
          />
          <ConfirmModal
            isOpen={isTransferOwnerConfirmOpen}
            onClose={() => setIsTransferOwnerConfirmOpen(false)}
            title="确认转让空间"
            message="是否确定转让空间给该用户？此操作不可逆。转让后会关闭设置窗口并自动保存数据"
            onConfirm={() => {
              transferLeader.mutate({ spaceId, newLeaderId: transfereeId });
              handleClose();
            }}
          />
        </div>
      )}
    </div>
  );
}

export default SpaceSettingWindow;
