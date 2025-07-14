import TitleBar from "@/components/module/common/titleBar";
import Rules from "@/components/module/detail/roles";
import { useLocation, useNavigate } from "react-router";

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <h3>
        {label}
        :
      </h3>
      <h4>{value}</h4>
    </div>
  );
}

function Tags({ tags }: { tags: string[] }) {
  const tagsClass = ["badge-primary", "badge-secondary", "badge-accent", "badge-success", "badge-warning"];
  return (
    <>
      {
        tags.map((tag, index) => {
          return (
            <div key={tag} className={`badge ${tagsClass[index % tagsClass.length]}`}>
              {tag}
            </div>
          );
        })
      }
    </>
  );
}

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
        <div className="flex flex-col gap-4 items-start">
          <div className="flex gap-4">
            <img className="w-16 h-16 rounded-full object-cover" src={data.avatar} />
            <div className="flex flex-col justify-between">
              <h3 className="card-title text-lg">{data.name}</h3>
              <button type="button" className="btn btn-primary rounded-md h-7">
                关注
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-base-content/80">{data.description}</p>
          </div>
          <div className="divider m-0"></div>
          <div className="flex w-full justify-evenly">
            <button type="button" className="btn btn-primary rounded-md">
              使用模组
            </button>
            <button type="button" className="btn btn-accent rounded-md">
              克隆模组
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeftContent() {
  const location = useLocation();
  const moduleId = location.pathname.split("/").pop();

  const data = {
    image: "https://imagebucket-1322308688.cos.ap-tokyo.myqcloud.com/picnia/image/65d2fa0e1c42c75df8dd3713.jpg",
    moduleName: "格黑娜的期末考题是征服世界？！",
    discription: "在格黑娜期末考试前夕, 考试BD的内容突然变为：「本次期末考内容——72小时内征服基沃托斯！及格线为占领3个学区！」。实际上这是「色彩」残余势力对BD的控制（黑幕可替换为联邦学生会长的压力测试/千年学院的AI病毒等）。",
    era: "未来",
    rule: "coc7th",
    tags: ["青春", "轻松", "校园", "搞笑", "青春", "轻松", "校园", "搞笑"],
    players: "3-4",
    time: "3-4小时",
    lastUpdate: "2025-04-30 19:44:19",
  };

  const infos = [
    { label: "时代", value: data.era },
    { label: "规则", value: data.rule },
    { label: "玩家人数", value: data.players },
    { label: "游戏时间", value: data.time },
    { label: "最后更新", value: data.lastUpdate },
  ];

  return (
    <div className="flex-grow">
      <div className="flex bg-base-100 gap-4">

        <div className="basis-[30%] relative">
          <img
            className="absolute aspect-square object-cover rounded-md"
            src={data.image}
          />
        </div>

        <div className="basis-[70%] flex flex-col gap-4">
          {/* 模组名称 */}
          <h1 className="text-2xl px-4 mb-2 font-bold text-primary">
            {data.moduleName}
          </h1>

          {/* 模组简介 */}
          <div className="p-4 bg-base-200 rounded-box shadow-md">
            <h2 className="text-base-content text-xl">
              简介
            </h2>
            <p>
              {data.discription}
            </p>
          </div>

          <div className="flex p-4 bg-base-200 rounded-box shadow-lg">
            {/* 其他的模组信息 */}
            <div className="flex flex-col basis-1/2">
              {infos.map(info => (
                <Info key={info.label} label={info.label} value={info.value} />
              ))}
            </div>
            <div className="divider divider-horizontal m-0"></div>

            {/* 模组的标签 */}
            <div className="flex pl-2 flex-col gap-1 basis-1/2">
              <h2 className="text-base-content text-l w-full">
                标签
              </h2>
              <div className="flex gap-2 flex-wrap">
                <Tags tags={data.tags} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="divider"></div>
      <div className="rounded-md overflow-hidden mb-64">
        <TitleBar label="人物" className="rounded-none" />
        <Rules moduleId={Number(moduleId!)} />
      </div>
    </div>
  );
}

function ModuleDetail() {
  const navigate = useNavigate();

  return (
    <div className="bg-base-100">
      <div className="mx-auto max-w-[1380px] px-4 py-[10px]">
        <div className="w-full mb-8">
          <div
            className="text-lg text-base-content cursor-pointer hover:underline hover:underline-offset-4"
            onClick={() => { navigate(-1); }}
          >
            返回
          </div>
        </div>

        <div className="flex gap-8">
          {/* 左侧主要内容区域 */}
          <LeftContent />
          {/* 右侧作者信息卡片 */}
          <div className="w-72 shrink-0 mt-[calc(var(--spacing)*14)]">
            <div className="sticky top-4">
              <Author />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModuleDetail;
