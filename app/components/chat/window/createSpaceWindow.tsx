import { useCreateSpaceMutation } from "api/hooks/chatQueryHooks";
import { useGetRulePageInfiniteQuery } from "api/hooks/ruleQueryHooks";
import { useGetUserFollowingsQuery } from "api/hooks/userFollowQueryHooks";
import { useGetUserInfoQuery } from "api/hooks/UserHooks";
import React, { useEffect, useState } from "react";
import checkBack from "@/components/common/autoContrastText";
import { MemberSelect } from "@/components/common/memberSelect";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCropper";
import { useGlobalContext } from "@/components/globalContextProvider";

interface CreateSpaceWindowProps {
  onSuccess?: () => void;
}

export default function CreateSpaceWindow({ onSuccess }: CreateSpaceWindowProps) {
  const globalContext = useGlobalContext();
  const getUserInfo = useGetUserInfoQuery(Number(globalContext.userId));
  const userInfo = getUserInfo.data?.data;

  // 创建空间
  const createSpaceMutation = useCreateSpaceMutation();

  // 创建空间的头像
  const [spaceAvatar, setSpaceAvatar] = useState<string>(() => String(userInfo?.avatar));
  // 创建空间的名称
  const [spaceName, setSpaceName] = useState<string>(() => `${String(userInfo?.username)}的空间`);

  // 当前选择的空间规则Id
  const [selectedRuleId, setSelectedRuleId] = useState<number>(1);
  // 获取规则
  const getRulesQuery = useGetRulePageInfiniteQuery({}, 100);
  const rules = getRulesQuery.data?.pages.flatMap(page => page.data?.list ?? []) ?? [];

  // 空间头像文字颜色
  const [spaceAvatarTextColor, setSpaceAvatarTextColor] = useState("text-black");

  // 获取用户好友
  const followingQuery = useGetUserFollowingsQuery(globalContext.userId ?? -1, { pageNo: 1, pageSize: 100 });
  const friends = followingQuery.data?.data?.list?.filter(user => user.status === 2) ?? [];

  // 处理邀请用户uid
  const [inputUserId, setInputUserId] = useState<number>(-1);
  // 已选择邀请的用户
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(() => new Set());

  // 监听头像变化，自动调整文字颜色
  useEffect(() => {
    if (spaceAvatar) {
      checkBack(spaceAvatar).then(() => {
        const computedColor = getComputedStyle(document.documentElement)
          .getPropertyValue("--text-color")
          .trim();
        setSpaceAvatarTextColor(computedColor === "white" ? "text-white" : "text-black");
      });
    }
  }, [spaceAvatar]);

  // 当用户信息加载后，更新默认值
  useEffect(() => {
    if (userInfo) {
      setSpaceAvatar(String(userInfo.avatar));
      setSpaceName(`${String(userInfo.username)}的空间`);
    }
  }, [userInfo]);

  // 创建空间
  async function createSpace(userIds: number[]) {
    createSpaceMutation.mutate({
      userIdList: userIds,
      avatar: spaceAvatar,
      spaceName,
      ruleId: selectedRuleId,
    }, {
      onSuccess: () => {
        setSelectedUserIds(new Set());
        onSuccess?.();
      },
    });
  }

  return (
    <div className="w-full pl-4 pr-4 min-w-[20vw] max-h-[60vh] overflow-y-scroll">
      <p className="text-lg font-bold text-center w-full mb-4">创建空间</p>

      {/* 头像上传 */}
      <div className="flex justify-center mb-6">
        <ImgUploaderWithCopper
          setCopperedDownloadUrl={(url) => {
            setSpaceAvatar(url);
          }}
          fileName={`new-space-avatar-${Date.now()}`}
        >
          <div className="relative group overflow-hidden rounded-lg">
            <img
              src={spaceAvatar}
              className="w-24 h-24 mx-auto transition-all duration-300 group-hover:scale-110 group-hover:brightness-75 rounded"
            />
            <div
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-opacity-20 backdrop-blur-sm"
            >
              <span className={`${spaceAvatarTextColor} font-bold px-2 py-1 rounded`}>
                上传头像
              </span>
            </div>
          </div>
        </ImgUploaderWithCopper>
      </div>

      {/* 空间名称 */}
      <div className="mb-4">
        <label className="label mb-2">
          <span className="label-text">空间名称</span>
        </label>
        <input
          type="text"
          placeholder={spaceName}
          className="input input-bordered w-full"
          onChange={(e) => {
            const inputValue = e.target.value;
            setSpaceName(inputValue === "" ? `${String(userInfo?.username)}的空间` : inputValue);
          }}
        />
      </div>

      {/* 规则选择 */}
      <div className="mb-4">
        <label className="label mb-2">
          <span className="label-text">空间规则</span>
        </label>
        <div className="dropdown w-full">
          <label tabIndex={0} className="btn btn-outline w-full justify-start">
            {rules.find(rule => rule.ruleId === selectedRuleId)?.ruleName ?? "未找到规则"}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 ml-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
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
                    setSelectedRuleId(Number(rule.ruleId));
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

      <MemberSelect
        members={friends}
        selectedUserIds={selectedUserIds}
        onSelectionChange={setSelectedUserIds}
        searchInput={inputUserId}
        onSearchInputChange={setInputUserId}
        emptyMessage="您还没有好友哦"
        searchPlaceholder="请输入要加入的好友ID"
      />

      <div className="bottom-0 w-full bg-base-300 pt-4">
        <button
          type="button"
          className="btn btn-primary w-full shadow-lg"
          onClick={() => {
            const userIds = [
              ...selectedUserIds,
              ...(inputUserId > 0 ? [inputUserId] : []),
            ];
            createSpace(userIds);
          }}
        >
          创建空间
        </button>
      </div>
    </div>
  );
}
