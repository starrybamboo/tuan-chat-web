import type { ModuleData } from "./constants";
import { FollowButton } from "@/components/common/Follow/FollowButton";
import { PopWindow } from "@/components/common/popWindow";
import { UserDetail } from "@/components/common/userDetail";

import TitleBar from "@/components/module/common/titleBar";
import Items from "@/components/module/detail/items";
import Roles from "@/components/module/detail/roles";
import { useGetUserInfoQuery } from "api/queryHooks";
import { useCallback, useState } from "react";
import { useParams } from "react-router";
import NewSceneGraph from "../scene/react flow/newSceneGraph";

function Author({ userId }: { userId?: number }) {
  // 弹窗状态
  const [isUserCardOpen, setIsUserCardOpen] = useState(false);

  // 获取用户信息
  const { data: userInfoData, isLoading: userInfoLoading } = useGetUserInfoQuery(userId || 0);

  // 使用API获取的数据或默认数据
  const userData = userInfoData?.data;
  const data = {
    name: userData?.username || "未知用户",
    avatar: userData?.avatar || "favicon.ico",
    description: userData?.description || "暂无简介",
  };

  // 处理头像点击
  const handleAvatarClick = useCallback(() => {
    if (userId) {
      setIsUserCardOpen(true);
    }
  }, [userId]);

  // 关闭弹窗
  const closeUserCard = useCallback(() => {
    setIsUserCardOpen(false);
  }, []);

  return (
    <>
      <div className="card bg-base-200 w-full mb-8">
        <div className="card-body p-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              {userInfoLoading
                ? (
                    <div className="skeleton w-16 h-16 rounded-full"></div>
                  )
                : (
                    <img
                      className="w-16 h-16 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                      src={data.avatar}
                      onClick={handleAvatarClick}
                      alt="用户头像"
                    />
                  )}
              <div className="flex flex-col justify-between">
                {userInfoLoading
                  ? (
                      <>
                        <div className="skeleton h-6 w-24 mb-2"></div>
                        <div className="skeleton h-4 w-32"></div>
                      </>
                    )
                  : (
                      <>
                        <h3 className="card-title text-lg">{data.name}</h3>
                        <p className="text-sm text-base-content/80">{data.description}</p>
                      </>
                    )}
              </div>
              <div className="divider divider-horizontal m-0" />
              {userId && <FollowButton userId={userId} />}
              <div className="flex gap-4 items-center justify-end flex-1">
                <button type="button" className="btn btn-outline  btn-ghost rounded-md">
                  分支
                </button>
                <button type="button" className="btn btn-outline btn-ghost rounded-md">
                  克隆
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* UserDetail 弹窗 */}
      {userId && (
        <PopWindow isOpen={isUserCardOpen} onClose={closeUserCard}>
          <UserDetail userId={userId} size="compact" />
        </PopWindow>
      )}
    </>
  );
}

function MainContent({ moduleData }: { moduleData: ModuleData }) {
  const params = useParams();
  const moduleId = params.id;

  // 构建信息数组，只包含有数据的字段
  const infos = [
    moduleData.parent && { label: "Forked By", value: moduleData.parent },
    (moduleData.minPeople || moduleData.maxPeople) && {
      label: "玩家人数",
      value: moduleData.minPeople && moduleData.maxPeople
        ? `${moduleData.minPeople}-${moduleData.maxPeople}人`
        : moduleData.minPeople
          ? `${moduleData.minPeople}+人`
          : `最多${moduleData.maxPeople}人`,
    },
    (moduleData.minTime || moduleData.maxTime) && {
      label: "游戏时间",
      value: moduleData.minTime && moduleData.maxTime
        ? `${moduleData.minTime}-${moduleData.maxTime}小时`
        : moduleData.minTime
          ? `${moduleData.minTime}+小时`
          : `最长${moduleData.maxTime}小时`,
    },
    moduleData.authorName && { label: "作者", value: moduleData.authorName },
    moduleData.userId && { label: "上传者ID", value: String(moduleData.userId) },
    moduleData.ruleId && { label: "规则ID", value: String(moduleData.ruleId) },
    moduleData.createTime && { label: "创建时间", value: new Date(moduleData.createTime).toLocaleDateString("zh-CN") },
    moduleData.updateTime && { label: "最后更新", value: new Date(moduleData.updateTime).toLocaleString("zh-CN") },
  ].filter((item): item is { label: string; value: string } => Boolean(item)); // 类型断言过滤

  return (
    <div className="flex-grow">
      <div className="flex bg-transparent gap-10 mt-20">

        <div className="w-1/2 flex items-center justify-center">
          <img
            className="aspect-square object-cover w-full"
            src={moduleData.image}
          />
        </div>

        <div className="w-1/2 flex flex-col justify-between gap-4">
          <div className="flex-1 flex flex-col justify-center">
            {/* 模组名称 */}
            <h1 className="text-5xl mb-2 font-bold text-white">
              {moduleData.moduleName}
            </h1>

            <div className="divider m-0" />
            {/* 模组简介 */}
            <p className="text-base font-semibold tracking-wide leading-relaxed mt-2 text-white line-clamp-4">
              {moduleData.description}
            </p>
          </div>
          {/* 其他的模组信息 - 显示在右侧底部 */}
          {infos.length > 0 && (
            <div className="flex border-2 border-base-300 p-4 gap-4 bg-base-100">
              {/* 字段名列 */}
              <div className="flex flex-col gap-2">
                {infos.map(info => (
                  <h3 key={`label-${info.label}`} className="text-base text-primary">{info.label}</h3>
                ))}
              </div>
              {/* 竖直分隔线 */}
              <div className="divider divider-horizontal m-0" />
              {/* 字段值列 */}
              <div className="flex flex-col gap-2">
                {infos.map(info => (
                  <h4 key={`value-${info.label}`} className="text-base text-primary">{info.value}</h4>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* 应用按钮行 - 占据mb-24的空间 */}
      <div className="flex justify-end items-center mt-6 mb-6">
        <button
          type="button"
          className="cursor-pointer z-50 relative flex items-center px-4 py-4 border-4 border-primary bg-transparent text-black font-bold text-xl overflow-hidden group transition-all duration-300 hover:border-white"
        >
          <div className="absolute inset-0 bg-info transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out"></div>

          {/* 按钮内容 - 使用relative和z-10确保在遮罩之上 */}
          <span className="relative z-10 text-primary group-hover:text-white transition-colors duration-300">应用至群聊</span>
          <svg
            className="w-8 h-8 relative z-10 text-primary group-hover:text-white transition-colors duration-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
      <div className="rounded-md overflow-hidden mb-32">
        <Author userId={moduleData.userId} />
        <TitleBar label="场景" className="rounded-none" varient="accent" />
        <NewSceneGraph />
        <TitleBar label="角色" className="rounded-none mt-10" varient="accent" />
        <Roles moduleId={Number(moduleId!)} />
        <TitleBar label="物品" className="rounded-none mt-10" varient="accent" />
        <Items moduleId={Number(moduleId!)} />
      </div>
    </div>
  );
}

export default function ModuleDetailComponent({ moduleData }: { moduleData: ModuleData }) {
  return (
    <div className="bg-base-100 relative">
      {/* 背景层容器 - 限制模糊效果范围 */}
      <div className="absolute top-0 left-0 w-full h-100 overflow-hidden z-0">
        {/* 背景图 - 使用封面图的高斯模糊，稍微放大以避免边缘透明 */}
        <div
          className="absolute -top-6 -left-6 w-[calc(100%+48px)] h-[calc(100%+48px)] bg-cover bg-center"
          style={{
            backgroundImage: `url(${moduleData.image})`,
            filter: "blur(12px)",
          }}
        />
        {/* 遮罩层 */}
        <div className="absolute top-0 left-0 w-full h-full bg-black/40" />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-4 relative z-10">
        <div className="flex gap-8">
          {/* 主要内容区域 */}
          <MainContent moduleData={moduleData} />
        </div>
      </div>
    </div>
  );
}
