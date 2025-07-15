import TitleBar from "@/components/module/common/titleBar";
import Rules from "@/components/module/detail/roles";
import { useParams } from "react-router";

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

function Author() {
  // const { data, isSuccess } = useAuthordQuery(authordId);
  const data = {
    name: "糖糖糖糖",
    avatar: "http://39.103.58.31:9000/avatar/emoji/userId-10020-coppered_1746242587555.webp",
    description: "欢迎关注我!",
  };

  return (
    <div className="card bg-base-200 shadow-xl w-full">
      <div className="card-body p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <img className="w-16 h-16 rounded-full object-cover" src={data.avatar} />
            <div className="flex flex-col justify-between">
              <h3 className="card-title text-lg">{data.name}</h3>
              <p className="text-sm text-base-content/80">{data.description}</p>
            </div>
            <div className="divider divider-horizontal m-0" />
            <button type="button" className="btn btn-info rounded-md">
              关注
            </button>
            <div className="flex gap-4 items-center justify-end flex-1">

              <button type="button" className="btn btn-info rounded-md">
                分支
              </button>
              <button type="button" className="btn btn-info rounded-md">
                应用
              </button>
              <button type="button" className="btn btn-info rounded-md">
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
  const moduleId = params.id;

  const data = {
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

  const infos = [
    { label: "规则", value: data.parent },
    { label: "玩家人数", value: `${data.minPeople}-${data.maxPeople}` },
    { label: "游戏时间", value: `${data.minTime}-${data.maxTime}小时` },
    { label: "作者", value: data.authorName },
    { label: "最后更新", value: new Date(data.updateTime).toLocaleString("zh-CN") },
  ];

  return (
    <div className="flex-grow">
      <div className="flex bg-transparent gap-10 mt-20 mb-24">

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
            <p className="text-base font-semibold tracking-wide leading-relaxed mt-2 text-white">
              {data.description}
            </p>
          </div>
          {/* 其他的模组信息 - 显示在右侧底部 */}
          <div className="flex border-2 border-base-300 p-4 gap-4">
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
        </div>
      </div>
      <div className="rounded-md overflow-hidden mb-64">
        <Author />
        <TitleBar label="人物" className="rounded-none" />
        <Rules moduleId={Number(moduleId!)} />
      </div>
    </div>
  );
}

export default function ModuleDetail() {
  // const navigate = useNavigate();

  const data = {
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
    <div className="bg-base-100 relative overflow-hidden">
      {/* 背景层容器 - 限制模糊效果范围 */}
      <div className="absolute top-0 left-0 w-full h-96 overflow-hidden z-0">
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
          {/* 右侧作者信息卡片 */}
          {/* <div className="w-72 shrink-0 mt-[calc(var(--spacing)*14)]">
            <div className="sticky top-4">
              <Author />
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
}
