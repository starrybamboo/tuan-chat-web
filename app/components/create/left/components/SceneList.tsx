import { useState } from "react";
import Section from "./section";

// 模拟后端返回的资源数据结构
interface ResourceEntity {
  id: number;
  name: string;
  description?: string;
  icon?: string; // 可选，资源类型图标
}

// 资源项组件，参考 roleListItem 样式
function ResourceListItem({ resource, isSelected, onClick, onDelete }: {
  resource: ResourceEntity;
  isSelected: boolean;
  onClick?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className={`group w-full h-12 p-2 flex items-center justify-between hover:bg-base-200 cursor-pointer ${isSelected ? "bg-base-200" : ""}`}
      onClick={onClick}
    >
      {/* 左侧内容 */}
      <div className="flex items-center gap-2">
        <img
          src={resource.icon || "https://cdn-icons-png.flaticon.com/512/833/833524.png"}
          alt="icon"
          style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", background: "#f3f4f6" }}
        />
        <div className="flex flex-col">
          <p className="self-baseline">{resource.name}</p>
          <p className="text-xs text-gray-500 self-baseline mt-0.5 line-clamp-1">{resource.description}</p>
        </div>
      </div>
      {/* 右侧按钮 */}
      <button
        type="button"
        className="btn btn-ghost btn-xs md:opacity-0 md:group-hover:opacity-100 opacity-70 hover:bg-base-300 rounded-full p-1 hover:[&>svg]:stroke-error"
        onClick={(e) => {
          if (onDelete)
            onDelete();
          e.stopPropagation();
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// 模拟后端资源列表
const resourceList: ResourceEntity[] = [
  {
    id: 1,
    name: "图片资源",
    description: "用于展示的图片文件",
    icon: "https://cdn-icons-png.flaticon.com/512/833/833524.png",
  },
  {
    id: 2,
    name: "音频资源",
    description: "用于背景音乐和音效",
    icon: "https://cdn-icons-png.flaticon.com/512/727/727245.png",
  },
  {
    id: 3,
    name: "文档资源",
    description: "项目相关文档",
    icon: "https://cdn-icons-png.flaticon.com/512/337/337946.png",
  },
  {
    id: 4,
    name: "其他资源",
    description: "其它类型的文件",
    icon: "https://cdn-icons-png.flaticon.com/512/833/833472.png",
  },
];

export default function SceneList() {
  const [selectedResourceId, setSelectedResourceId] = useState<number | null>(null);

  const handleClick = (id: number) => {
    setSelectedResourceId(id);
  };
  const handleDelete = (id: number) => {
    console.warn(`删除资源：${id}`);
  };

  const isEmpty = resourceList.length === 0;

  return (
    <Section label="场景">
      <>
        {isEmpty
          ? (
              <div className="text-sm text-gray-500 px-2 py-4">暂无资源</div>
            )
          : (
              resourceList.map(item => (
                <ResourceListItem
                  key={item.id}
                  resource={item}
                  isSelected={selectedResourceId === item.id}
                  onClick={() => handleClick(item.id)}
                  onDelete={() => handleDelete(item.id)}
                />
              ))
            )}
      </>
    </Section>
  );
}
