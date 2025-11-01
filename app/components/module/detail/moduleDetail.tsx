import type { ModuleData } from "./constants";
import { PopWindow } from "@/components/common/popWindow";
import MarkdownMentionViewer from "@/components/common/quillEditor/MarkdownMentionViewer";
import { useGlobalContext } from "@/components/globalContextProvider";
import { useCreateSpaceMutation, useGetUserSpacesQuery } from "api/hooks/chatQueryHooks";
import { useModuleDetailByIdQuery, useModuleInfoQuery } from "api/hooks/moduleQueryHooks";
import { useRuleListQuery } from "api/hooks/ruleQueryHooks";
import { useImportFromModuleMutation } from "api/hooks/spaceModuleHooks";
import { tuanchat } from "api/instance";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import 教室图片 from "../home/images/教室.webp";
import Author from "./author";
import ContentTab from "./contentTab";
// import IssueTab from "./issueTab";
import userContent from "./readmeDemo.md?raw";

export default function ModuleDetailComponent({ moduleData: propModuleData }: { moduleData?: ModuleData }) {
  const navigate = useNavigate();
  const params = useParams();
  const moduleId = Number(params.id);

  // ===== 所有 Hooks 必须在最前面调用 =====
  // 如果没有传入 moduleData，则通过 ID 获取
  const { data: fetchedModuleData, isLoading: isLoadingModule, isError: isModuleError } = useModuleDetailByIdQuery(moduleId);
  const RuleList = useRuleListQuery();

  // 选择群聊弹窗
  const [isGroupSelectOpen, setIsGroupSelectOpen] = useState(false);

  // 获取 moduleInfo 数据
  const { data: moduleInfoData, isLoading, error } = useModuleInfoQuery(Number(moduleId!));
  const moduleInfo = useMemo(() => moduleInfoData?.data?.responses || [], [moduleInfoData]);

  // 获取用户Id
  const globalContext = useGlobalContext();

  // 获取 userSpace 数据
  const getUserSpaces = useGetUserSpacesQuery();
  const userSpaces = useMemo(() => getUserSpaces.data?.data ?? [], [getUserSpaces.data?.data]);
  const spaces = userSpaces.filter(space => space.userId === Number(globalContext.userId));

  // 模组导入群聊
  const importFromModule = useImportFromModuleMutation();

  // 导入成功后显示弹窗
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // 导入失败后显示弹窗
  const [showErrorToast, setShowErrorToast] = useState(false);

  // 创建空间并导入模组
  const createSpaceMutation = useCreateSpaceMutation();

  // 确认跳转弹窗
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [newSpaceId, setNewSpaceId] = useState<number | null>(null);

  // 图片加载状态
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // 背景图片加载状态
  const [bgImageLoaded, setBgImageLoaded] = useState(false);
  const [bgImageError, setBgImageError] = useState(false);

  // ===== 数据处理逻辑 =====
  // 使用传入的数据或获取的数据
  const moduleData = useMemo(() => {
    if (propModuleData) {
      return propModuleData;
    }

    if (!fetchedModuleData?.data) {
      return null;
    }

    const module = fetchedModuleData.data;
    const rule = RuleList.data?.find(r => r.ruleId === module.ruleId);

    return {
      moduleId: module.moduleId,
      ruleId: module.ruleId,
      ruleName: rule?.ruleName ?? "",
      moduleName: module.moduleName,
      description: module.description,
      userId: module.userId,
      authorName: module.authorName,
      image: (module.image && module.image !== null && module.image !== "null") ? module.image : 教室图片,
      createTime: module.createTime,
      updateTime: module.updateTime,
      minPeople: module.minPeople,
      maxPeople: module.maxPeople,
      minTime: module.minTime,
      maxTime: module.maxTime,
      parent: module.parent,
      readMe: module.readMe,
    } as ModuleData;
  }, [propModuleData, fetchedModuleData, RuleList.data]);

  // ===== 条件渲染：加载和错误状态 =====
  // 如果正在加载，显示加载状态
  if (!propModuleData && isLoadingModule) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg mb-4"></div>
          <p className="text-lg">加载模组数据中...</p>
        </div>
      </div>
    );
  }

  // 如果加载失败，显示错误信息
  if (!propModuleData && isModuleError) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-error text-2xl mb-4">❌</div>
          <p className="text-lg text-error mb-4">加载模组失败</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  // 如果没有数据，显示空状态
  if (!moduleData) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-base-content/60">未找到模组数据</p>
        </div>
      </div>
    );
  }

  // ===== 事件处理函数 =====
  // 处理模组导入
  const handleModuleImport = (spaceId: number) => {
    // 暂时只能推测试模组
    importFromModule.mutate({ spaceId, moduleId }, {
      onSuccess: () => {
        setIsGroupSelectOpen(false);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      },
      onError: () => {
        setIsGroupSelectOpen(false);
        setShowErrorToast(true);
        setTimeout(() => setShowErrorToast(false), 3000);
      },
    });
  };

  const handleDirectCreateSpaceAndImport = () => {
    createSpaceMutation.mutate({
      userIdList: [],
      avatar: moduleData.image,
      spaceName: moduleData.moduleName,
      ruleId: moduleData.ruleId || 1,
    }, {
      onSuccess: (data) => {
        const newSpaceId = data.data?.spaceId;
        if (newSpaceId) {
          importFromModule.mutate({ spaceId: newSpaceId, moduleId }, {
            onSuccess: () => {
              setIsGroupSelectOpen(false);
              setShowSuccessToast(true);
              setTimeout(() => setShowSuccessToast(false), 3000);
              setNewSpaceId(newSpaceId);
              setShowConfirmPopup(true);
            },
            onError: () => {
              setIsGroupSelectOpen(false);
              setShowErrorToast(true);
              setTimeout(() => setShowErrorToast(false), 3000);
            },
          });
        }
      },
      onError: () => {
        setIsGroupSelectOpen(false);
        setShowErrorToast(true);
        setTimeout(() => setShowErrorToast(false), 3000);
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
    moduleData.ruleName && { label: "规则", value: String(moduleData.ruleName) },
    moduleData.createTime && { label: "创建时间", value: new Date(moduleData.createTime).toLocaleDateString("zh-CN") },
    moduleData.updateTime && { label: "最后更新", value: new Date(moduleData.updateTime).toLocaleString("zh-CN") },
  ].filter((item): item is { label: string; value: string } => Boolean(item)); // 类型断言过滤

  return (
    <div className="bg-base-100 relative">
      {/* 背景层容器 - 限制模糊效果范围，仅在大屏显示 */}
      <div className="hidden lg:block absolute top-0 left-0 w-full h-100 overflow-hidden z-0">
        {/* 无数据或加载失败时的占位背景 */}
        {(!moduleData || bgImageError) && (
          <div className="absolute inset-0 bg-base-200 z-0"></div>
        )}
        {/* 背景图 - 有数据且未出错时显示（包括加载中） */}
        {moduleData && !bgImageError && (
          <img
            src={moduleData.image}
            className={`absolute -top-6 -left-6 w-[calc(100%+48px)] h-[calc(100%+48px)] object-cover blur-sm z-0 ${bgImageLoaded ? "opacity-100" : "opacity-0"} transition-opacity duration-500`}
            onLoad={() => setBgImageLoaded(true)}
            onError={() => {
              setBgImageLoaded(false);
              setBgImageError(true);
            }}
            alt="背景"
          />
        )}
        {/* 遮罩层 - 只在图片加载完成后显示 */}
        {moduleData && !bgImageError && bgImageLoaded && (
          <div className="absolute top-0 left-0 w-full h-full bg-black/40 z-10 pointer-events-none" />
        )}
      </div>

      <div className="mx-auto max-w-6xl px-4 py-4 relative z-10">
        <div className="flex gap-8">
          {/* 主要内容区域 */}
          <div className="flex-grow">
            <div className="flex flex-col md:flex-row bg-transparent gap-4 md:gap-10 mt-2 md:mt-20">
              <div className="w-full md:w-1/2 flex items-center justify-center relative">
                {/* 加载状态 */}
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-base-200 z-20">
                    <div className="loading loading-spinner loading-lg"></div>
                  </div>
                )}
                {/* 错误状态 */}
                {imageError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-base-200 z-20">
                    <div className="text-center">
                      <svg className="w-16 h-16 mx-auto mb-2 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-base-content/60 text-sm">图片加载失败</p>
                    </div>
                  </div>
                )}
                <img
                  className={`aspect-square object-cover w-full z-0 ${imageLoading || imageError ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
                  src={moduleData.image}
                  onLoad={() => setImageLoading(false)}
                  onError={() => {
                    setImageLoading(false);
                    setImageError(true);
                  }}
                  alt={moduleData.moduleName}
                />
              </div>
              <div className="w-full md:w-1/2 flex flex-col justify-between gap-4">
                <div className="flex-1 flex flex-col justify-center">
                  {/* 模组名称 */}
                  <div className="flex items-center justify-between mb-2">
                    <h1 className="text-3xl md:text-5xl font-bold md:text-white flex-1">
                      {moduleData.moduleName}
                    </h1>
                    {/* 移动端应用按钮 */}
                    <button
                      type="button"
                      className="md:hidden cursor-pointer flex items-center px-3 py-2 border-2 border-accent bg-transparent font-bold text-sm overflow-hidden group transition-all duration-300 hover:border-white flex-shrink-0 ml-3"
                      onClick={() => setIsGroupSelectOpen(true)}
                    >
                      <div className="absolute inset-0 bg-info transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out"></div>
                      <span className="relative z-10 group-hover:text-white transition-colors duration-300">应用</span>
                      <svg
                        className="w-5 h-5 relative z-10 group-hover:text-white transition-colors duration-300 ml-1"
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
                  <div className="divider m-0" />
                  {/* 模组简介 */}
                  <p className="text-base font-semibold tracking-wide leading-relaxed mt-2 md:text-white line-clamp-4 break-all whitespace-pre-wrap">
                    {moduleData.description}
                  </p>
                </div>
                {/* 其他的模组信息 - 显示在右侧底部 */}
                {infos.length > 0 && (
                  <div className="flex border-2 border-base-300 p-4 gap-4 bg-base-100">
                    {/* 字段名列 */}
                    <div className="flex flex-col gap-2">
                      {infos.map(info => (
                        <h3 key={`label-${info.label}`} className="text-base font-bold">{info.label}</h3>
                      ))}
                    </div>
                    {/* 竖直分隔线 */}
                    <div className="divider divider-horizontal m-0" />
                    {/* 字段值列 */}
                    <div className="flex flex-col gap-2">
                      {infos.map(info => (
                        <h4 key={`value-${info.label}`} className="text-base">{info.value}</h4>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-col md:flex-row justify-center md:justify-start items-center mt-6 md:mb-6 gap-4">
                  <Author userId={moduleData.userId} />
                  {/* 原有按钮 - 只在桌面端显示 */}
                  <button
                    type="button"
                    className="hidden md:flex cursor-pointer z-50 relative items-center px-4 py-4 border-4 border-ac bg-transparent font-bold text-xl overflow-hidden group transition-all duration-300 hover:border-white flex-shrink-0"
                    onClick={() => setIsGroupSelectOpen(true)}
                  >
                    <div className="absolute inset-0 bg-info transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out"></div>
                    {/* 按钮内容 - 使用relative和z-10确保在遮罩之上 */}
                    <span className="relative z-10 group-hover:text-white transition-colors duration-300">应用至群聊</span>
                    <svg
                      className="w-8 h-8 relative z-10 group-hover:text-white transition-colors duration-300"
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
              </div>
            </div>
            {/* 应用按钮行 - 占据mb-24的空间 */}
            <div className="flex flex-col md:flex-row justify-center md:justify-end items-center mt-6 mb-6 gap-4">
              {/* tag渲染，最左侧 */}
              <div className="flex flex-row flex-wrap gap-6 md:mr-auto md:ml-0 mb-2 md:mb-0">

                {/* {tags.map(tag => (
                    <span key={tag} className="badge badge-info badge-outline px-3 py-1 text-xs font-semibold">
                      {tag}
                    </span>
                  ))} */}
              </div>
            </div>
            <div className="rounded-md overflow-hidden mb-4 flex flex-col gap-2">
              {/* 作者信息常规展示 */}
              {/* <div className="mb-2"> */}
              {/* <div className="card w-full mb-4 md:mb-8">
                  <div className="card-body p-2">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-row items-center justify-center gap-4 w-full">
                      </div>
                    </div>
                  </div>
                </div> */}
              {/* 移动端按钮组 - 纵向排列 */}
              {/* <div className="flex flex-col gap-3 md:hidden">
                  <div className="flex gap-2 justify-center">
                    <button type="button" className="btn btn-outline btn-ghost btn-sm rounded-md flex-1 max-w-32">
                      Branch
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-ghost btn-sm rounded-md flex-1 max-w-32"
                    >
                      Clone
                    </button>
                  </div>
                </div> */}
              {/* </div> */}
              <div className="tabs tabs-border">
                <label className="tab">
                  <input type="radio" name="moduleDetailTab" defaultChecked />
                  {/* 文档/内容 icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-4 me-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 4v16h12V8.828A2 2 0 0 0 17.414 7.414l-3.828-3.828A2 2 0 0 0 12.172 3H6a2 2 0 0 0-2 2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h8" />
                  </svg>
                  Readme
                </label>
                <div className="tab-content">
                  <div className="fieldset bg-base-100 border-base-300 rounded-box border p-4 mb-4">
                    {/* 使用 MarkdownMentionViewer 显示用户内容 */}
                    <MarkdownMentionViewer
                      markdown={moduleData.readMe ? moduleData.readMe : userContent}
                    />
                  </div>
                </div>
                <label className="tab">
                  <input type="radio" name="moduleDetailTab" />
                  {/* 文件夹 icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-4 me-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
                  </svg>
                  模组内容
                </label>
                <div className="tab-content">
                  <ContentTab moduleInfo={moduleInfo} moduleId={Number(moduleId!)} isLoading={isLoading} error={error} />
                </div>
                {/* <label className="tab">
                  <input type="radio" name="moduleDetailTab" />
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-4 me-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M21 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  Issue
                </label>
                <div className="tab-content bg-base-100">
                  <IssueTab />
                </div> */}
              </div>
            </div>
            <PopWindow isOpen={isGroupSelectOpen} onClose={() => setIsGroupSelectOpen(false)}>
              <div className="flex flex-col gap-y-4 pb-4 max-h-[80vh] overflow-y-auto">
                <span className="text-lg font-semibold">选择操作</span>

                {/* 一键创建空间按钮 */}
                <div className="bg-base-200 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">创建新空间</h3>
                  <button
                    type="button"
                    className="btn btn-success w-full"
                    onClick={handleDirectCreateSpaceAndImport}
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
                              onClick={() => { handleModuleImport(space.spaceId ?? -1); }}
                            >
                              应用
                            </button>
                          )}
                    </div>
                  ))
                }
              </div>
            </PopWindow>
            {/* 在现有的 PopWindow 组件后面添加确认弹窗 */}
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
                  <span className="font-semibold">{moduleData.moduleName}</span>
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
            {showSuccessToast && (
              <div className="fixed bottom-6 right-6 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50 fade-in-out">
                ✅ 应用成功！
              </div>
            )}
            {showErrorToast && (
              <div className="fixed bottom-6 right-6 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50 fade-in-out">
                ❌ 应用失败！
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
