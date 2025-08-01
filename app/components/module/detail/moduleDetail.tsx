import type { ModuleData } from "./constants";
import { MarkDownViewer } from "@/components/common/markdown/markDownViewer";
import { useParams } from "react-router";
import Author from "./author";
import ContentTab from "./contentTab";
import IssueTab from "./issueTab";
import PrTab from "./prTab";
import userContent from "./readmeDemo.md?raw";

function MainContent({ moduleData }: { moduleData: ModuleData }) {
  // 示例tag数组，可根据实际数据源替换
  const tags = [
    "TRPG",
    "冒险",
    "合作",
    "推理",
    "恐怖",
    "短剧本",
    "长剧本",
    "新手友好",
    "高难度",
    "单元剧",
    "剧情驱动",
    "规则轻量",
    "规则复杂",
    "经典",
    "原创",
  ];
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
    moduleData.ruleId && { label: "规则", value: String(moduleData.ruleId) },
    moduleData.createTime && { label: "创建时间", value: new Date(moduleData.createTime).toLocaleDateString("zh-CN") },
    moduleData.updateTime && { label: "最后更新", value: new Date(moduleData.updateTime).toLocaleString("zh-CN") },
  ].filter((item): item is { label: string; value: string } => Boolean(item)); // 类型断言过滤

  return (
    <div className="flex-grow">
      <div className="flex flex-col md:flex-row bg-transparent gap-10 mt-2 md:mt-20">
        <div className="w-full md:w-1/2 flex items-center justify-center">
          <img
            className="aspect-square object-cover w-full"
            src={moduleData.image}
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.includes("moduleDefaultImage.webp")) {
                target.src = "/moduleDefaultImage.webp";
              }
            }}
          />
        </div>
        <div className="w-full md:w-1/2 flex flex-col justify-between gap-4">
          <div className="flex-1 flex flex-col justify-center">
            {/* 模组名称 */}
            <h1 className="text-5xl mb-2 font-bold text-primary md:text-white">
              {moduleData.moduleName}
            </h1>
            <div className="divider m-0" />
            {/* 模组简介 */}
            <p className="text-base font-semibold tracking-wide leading-relaxed mt-2 text-primary md:text-white line-clamp-4">
              {moduleData.description}
            </p>
          </div>
          {/* 其他的模组信息 - 显示在右侧底部 */}
          {infos.length > 0 && (
            <div className="flex border-2 border-base-300 p-4 gap-4 bg-base-100">
              {/* 字段名列 */}
              <div className="flex flex-col gap-2">
                {infos.map(info => (
                  <h3 key={`label-${info.label}`} className="text-base font-bold text-secondary">{info.label}</h3>
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
      <div className="flex flex-col md:flex-row justify-center md:justify-end items-center mt-6 mb-6 gap-4">
        {/* tag渲染，最左侧 */}
        <div className="flex flex-row flex-wrap gap-2 md:mr-auto md:ml-0 mb-2 md:mb-0">
          {tags.map(tag => (
            <span key={tag} className="badge badge-primary badge-outline px-3 py-1 text-xs font-semibold">
              {tag}
            </span>
          ))}
        </div>
        {/* 仿 GitHub 按钮组 */}
        <div className="inline-flex rounded-md border border-base-300 flex-shrink-0 mr-3">
          <button type="button" className="btn-md flex items-center gap-1 px-4 py-2 rounded-l-md border-r border-base-300 hover:bg-base-200 focus:bg-base-200 transition-colors cursor-pointer">
            {/* 眼睛图标 */}
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 12s4-7 10.5-7 10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span className="text-sm">Watch</span>
            <span className="ml-1 text-xs bg-base-100 rounded px-1">0</span>
          </button>
          <button type="button" className="btn-md flex items-center gap-1 px-4 py-2 border-r border-base-200 hover:bg-base-200 focus:bg-base-200 transition-colors cursor-pointer">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            <span className="text-sm">Fork</span>
            <span className="ml-1 text-xs bg-base-100 rounded px-1">0</span>
          </button>
          <button type="button" className="btn-md flex items-center gap-1 px-4 py-2 rounded-r-md hover:bg-base-200 focus:bg-base-200 transition-colors cursor-pointer">
            {/* 五角星图标 */}
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
            <span className="text-sm">Star</span>
            <span className="ml-1 text-xs bg-base-100 rounded px-1">0</span>
          </button>
        </div>
        {/* 原有按钮 */}
        <button
          type="button"
          className="cursor-pointer z-50 relative flex items-center px-4 py-4 border-4 border-primary bg-transparent text-black font-bold text-xl overflow-hidden group transition-all duration-300 hover:border-white flex-shrink-0"
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
      <div className="rounded-md overflow-hidden mb-32 flex flex-col gap-2">
        {/* 作者信息常规展示 */}
        <div className="mb-2">
          <Author userId={moduleData.userId} />
        </div>
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
              {/* 使用 MarkDownViewer 显示用户内容 */}
              <MarkDownViewer content={userContent} />
            </div>
          </div>
          <label className="tab">
            <input type="radio" name="moduleDetailTab" />
            {/* 文件夹 icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="size-4 me-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
            </svg>
            Content
          </label>
          <div className="tab-content">
            <ContentTab moduleId={Number(moduleId!)} />
          </div>
          <label className="tab">
            <input type="radio" name="moduleDetailTab" />
            {/* Issue/警告 icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="size-4 me-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M21 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Issue
          </label>
          <div className="tab-content bg-base-100">
            <IssueTab />
          </div>

          <label className="tab">
            <input type="radio" name="moduleDetailTab" />
            {/* Pull Request/合并 icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="size-4 me-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8V7a5 5 0 0 0-10 0v1m10 0v8a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8m10 0H7" />
            </svg>
            Pull Request
          </label>
          <div className="tab-content bg-base-100">
            <PrTab />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ModuleDetailComponent({ moduleData }: { moduleData: ModuleData }) {
  return (
    <div className="bg-base-100 relative">
      {/* 背景层容器 - 限制模糊效果范围，仅在大屏显示 */}
      <div className="hidden lg:block absolute top-0 left-0 w-full h-100 overflow-hidden z-0">
        {/* 背景图 - 使用封面图的高斯模糊，稍微放大以避免边缘透明 */}
        <img
          src={moduleData.image}
          className="absolute -top-6 -left-6 w-[calc(100%+48px)] h-[calc(100%+48px)] object-cover blur-sm"
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.src.includes("moduleDefaultImage.webp")) {
              target.src = "/moduleDefaultImage.webp";
            }
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
