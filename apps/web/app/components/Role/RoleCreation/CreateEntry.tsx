import { BookOpenIcon, DiceFiveIcon, UserIcon } from "@phosphor-icons/react";
import { useRouter } from "@tanstack/react-router";

type EntryCardAccent = "primary" | "success" | "info";

type EntryCardConfig = {
  title: string;
  description: string;
  to: string;
  icon: typeof UserIcon;
  accent: EntryCardAccent;
}

type CreateEntryCardProps = {
  onClick: () => void;
} & EntryCardConfig

const cardClassName = "bg-base-100 rounded-xl p-6 shadow-sm border border-base-200 transition-all duration-200 hover:scale-105 hover:shadow-lg h-auto md:h-100 cursor-pointer flex flex-col items-stretch justify-start text-center motion-reduce:transition-none motion-reduce:hover:scale-100";

const accentClassNames: Record<EntryCardAccent, string> = {
  primary: "border-info/40 bg-info/5 text-info/60",
  success: "border-success/40 bg-success/5 text-success/60",
  info: "border-info/40 bg-info/5 text-info/60",
};

const entryCards: EntryCardConfig[] = [
  {
    title: "创建普通角色",
    description: "进入资料表单，配置头像、规则与表演字段",
    to: "/role?type=normal",
    icon: UserIcon,
    accent: "primary",
  },
  {
    title: "创建骰娘",
    description: "进入资料表单，配置头像、规则与骰娘指令",
    to: "/role?type=dice",
    icon: DiceFiveIcon,
    accent: "success",
  },
  {
    title: "规则编辑器",
    description: "创建或编辑规则，用于普通角色模板",
    to: "/role?type=rule&mode=entry",
    icon: BookOpenIcon,
    accent: "info",
  },
];

function CreateEntryCard({
  title,
  description,
  icon: Icon,
  accent,
  onClick,
}: CreateEntryCardProps) {
  return (
    <button
      type="button"
      className={cardClassName}
      onClick={onClick}
    >
      <div
        className={`
          mx-auto mb-4 flex size-16 items-center justify-center rounded-full
          border-2 border-dashed
          ${accentClassNames[accent]}
        `}
      >
        <Icon className="size-8" weight="regular" />
      </div>
      <div className="flex flex-1 flex-col">
        <h3 className="mb-2 text-lg font-semibold text-base-content">{title}</h3>
        <p className="text-sm/relaxed text-base-content/70">{description}</p>
      </div>
    </button>
  );
}

// 空状态组件
export default function CreateEntry({
  animationTrigger,
}: {
  animationTrigger?: number; // 动画触发器，每次变化时重新触发动画
}) {
  const router = useRouter();

  return (
    <div
      key={animationTrigger || 0} // 使用key来强制重新渲染，触发CSS动画
      className="
        animate-scale-in flex flex-col items-center justify-center h-full
        min-h-[calc(100vh-6rem)] p-6 motion-reduce:animate-none
      "
    >
      <div>
        <h1 className="text-3xl font-bold text-base-content mb-2">创建新角色</h1>
        <p className="text-sm text-base-content/70 mb-8">选择一种角色类型开始创建</p>

        <div className="
          grid grid-cols-1
          md:grid-cols-3
          gap-6 mx-auto max-w-3xl
        ">
          {entryCards.map(card => (
            <CreateEntryCard
              key={card.to}
              {...card}
              onClick={() => router.history.push(card.to)}
            />
          ))}
        </div>

        <p className="mt-10 text-xs text-base-content/70 text-center">
          💡 提示：也可以从现有角色页面点击"转换为骰娘"快速创建骰娘角色
        </p>

      </div>
    </div>
  );
}
