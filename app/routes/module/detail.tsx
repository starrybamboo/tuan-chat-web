import TitleBar from "@/components/module/common/titleBar";
import Rules from "@/components/module/detail/roles";
import { useUserFollowMutation, useUserIsFollowedQuery, useUserUnfollowMutation } from "api/hooks/userFollowQueryHooks";
import { useGetUserInfoQuery } from "api/queryHooks";
import { useLocation, useParams } from "react-router";

// function Info({ label, value }: { label: string; value: string }) {
//   return (
//     <div className="flex gap-2">
//       <h3>
//         {label}
//         :
//       </h3>
//       <h4>{value}</h4>
//     </div>
//   );
// }

// function Tags({ tags }: { tags: string[] }) {
//   const tagsClass = ["badge-primary", "badge-secondary", "badge-accent", "badge-success", "badge-warning"];
//   return (
//     <>
//       {
//         tags.map((tag, index) => {
//           return (
//             <div key={tag} className={`badge ${tagsClass[index % tagsClass.length]}`}>
//               {tag}
//             </div>
//           );
//         })
//       }
//     </>
//   );
// }

function Author({ userId }: { userId?: number }) {
  // 获取用户信息
  const { data: userInfoData, isLoading: userInfoLoading } = useGetUserInfoQuery(userId || 0);

  // 关注相关hooks
  const followMutation = useUserFollowMutation();
  const unfollowMutation = useUserUnfollowMutation();
  const { data: isFollowedData } = useUserIsFollowedQuery(userId || 0);

  const isFollowed = isFollowedData?.data || false;
  const isLoading = followMutation.isPending || unfollowMutation.isPending;

  // 处理关注/取消关注
  const handleFollowClick = () => {
    if (!userId)
      return;

    if (isFollowed) {
      unfollowMutation.mutate(userId);
    }
    else {
      followMutation.mutate(userId);
    }
  };

  // 使用API获取的数据或默认数据
  const userData = userInfoData?.data;
  const data = {
    name: userData?.username || "未知用户",
    avatar: userData?.avatar || "favicon.ico",
    description: userData?.description || "暂无简介",
  };

  return (
    <div className="card bg-base-200 w-full mb-8">
      <div className="card-body p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            {userInfoLoading
              ? (
                  <div className="skeleton w-16 h-16 rounded-full"></div>
                )
              : (
                  <img className="w-16 h-16 rounded-full object-cover" src={data.avatar} />
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
            <button
              type="button"
              className={`btn rounded-md ${isFollowed ? "btn-success" : "btn-outline btn-ghost"}`}
              onClick={handleFollowClick}
              disabled={isLoading || !userId}
            >
              {isLoading
                ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  )
                : (
                    isFollowed ? "已关注" : "关注"
                  )}
            </button>
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
  );
}

function MainContent() {
  const params = useParams();
  const location = useLocation();
  const moduleId = params.id;

  // 优先使用从路由状态传递的数据，如果没有则使用默认数据
  const passedData = location.state?.moduleData;
  const data = passedData || {
    moduleId: 1,
    ruleId: 1,
    moduleName: "格黑娜的期末考题是征服世界?!",
    description: "在格黑娜期末考试前夕, 考试BD的内容突然变为：「本次期末考内容——72小时内征服基沃托斯！及格线为占领3个学区！」。实际上这是「色彩」残余势力对BD的控制（黑幕可替换为联邦学生会长的压力测试/千年学院的AI病毒等）。",
    userId: 10020,
    authorName: "糖糖糖糖",
    minTime: 3,
    maxTime: 4,
    minPeople: 3,
    maxPeople: 4,
    parent: "coc7th",
    image: "https://imagebucket-1322308688.cos.ap-tokyo.myqcloud.com/picnia/image/65d2fa0e1c42c75df8dd3713.jpg",
    createTime: "2025-04-30T19:44:19.123Z",
    updateTime: "2025-04-30T19:44:19.123Z",
  };

  // 构建信息数组，只包含有数据的字段
  const infos = [
    data.parent && { label: "Forked By", value: data.parent },
    (data.minPeople || data.maxPeople) && {
      label: "玩家人数",
      value: data.minPeople && data.maxPeople
        ? `${data.minPeople}-${data.maxPeople}人`
        : data.minPeople
          ? `${data.minPeople}+人`
          : `最多${data.maxPeople}人`,
    },
    (data.minTime || data.maxTime) && {
      label: "游戏时间",
      value: data.minTime && data.maxTime
        ? `${data.minTime}-${data.maxTime}小时`
        : data.minTime
          ? `${data.minTime}+小时`
          : `最长${data.maxTime}小时`,
    },
    data.authorName && { label: "作者", value: data.authorName },
    data.userId && { label: "上传者ID", value: data.userId.toString() },
    data.ruleId && { label: "规则ID", value: data.ruleId.toString() },
    data.createTime && { label: "创建时间", value: new Date(data.createTime).toLocaleDateString("zh-CN") },
    data.updateTime && { label: "最后更新", value: new Date(data.updateTime).toLocaleString("zh-CN") },
  ].filter(Boolean); // 过滤掉 falsy 值

  return (
    <div className="flex-grow">
      <div className="flex bg-transparent gap-10 mt-20">

        <div className="w-1/2 flex items-center justify-center">
          <img
            className="aspect-square object-cover w-full"
            src={data.image}
          />
        </div>

        <div className="w-1/2 flex flex-col justify-between gap-4">
          <div className="flex-1 flex flex-col justify-center">
            {/* 模组名称 */}
            <h1 className="text-5xl mb-2 font-bold text-white">
              {data.moduleName}
            </h1>

            <div className="divider m-0" />
            {/* 模组简介 */}
            <p className="text-base font-semibold tracking-wide leading-relaxed mt-2 text-white line-clamp-4">
              {data.description}
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
      <div className="rounded-md overflow-hidden mb-64">
        <Author userId={data.userId} />
        <TitleBar label="人物" className="rounded-none " />
        <Rules moduleId={Number(moduleId!)} />
      </div>
    </div>
  );
}

export default function ModuleDetail() {
  // const navigate = useNavigate();
  const location = useLocation();

  // 优先使用从路由状态传递的数据，如果没有则使用默认数据
  const passedData = location.state?.moduleData;
  const data = passedData || {
    moduleId: 1,
    ruleId: 1,
    moduleName: "格黑娜的期末考题是征服世界?!",
    description: "在格黑娜期末考试前夕, 考试BD的内容突然变为：「本次期末考内容——72小时内征服基沃托斯！及格线为占领3个学区！」。实际上这是「色彩」残余势力对BD的控制（黑幕可替换为联邦学生会长的压力测试/千年学院的AI病毒等）。",
    userId: 10020,
    authorName: "糖糖糖糖",
    minTime: 3,
    maxTime: 4,
    minPeople: 3,
    maxPeople: 4,
    parent: "coc7th",
    image: "https://imagebucket-1322308688.cos.ap-tokyo.myqcloud.com/picnia/image/65d2fa0e1c42c75df8dd3713.jpg",
    createTime: "2025-04-30T19:44:19.123Z",
    updateTime: "2025-04-30T19:44:19.123Z",
  };

  return (
    <div className="bg-base-100 relative">
      {/* 背景层容器 - 限制模糊效果范围 */}
      <div className="absolute top-0 left-0 w-full h-100 overflow-hidden z-0">
        {/* 背景图 - 使用封面图的高斯模糊，稍微放大以避免边缘透明 */}
        <div
          className="absolute -top-6 -left-6 w-[calc(100%+48px)] h-[calc(100%+48px)] bg-cover bg-center"
          style={{
            backgroundImage: `url(${data.image})`,
            filter: "blur(12px)",
          }}
        />
        {/* 遮罩层 */}
        <div className="absolute top-0 left-0 w-full h-full bg-black/40" />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-4 relative z-10">
        <div className="flex gap-8">
          {/* 主要内容区域 */}
          <MainContent />
        </div>
      </div>
    </div>
  );
}
