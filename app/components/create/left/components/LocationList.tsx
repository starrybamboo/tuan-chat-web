import type { StageEntityResponse } from "api";
import { useModuleContext } from "@/components/module/workPlace/context/_moduleContext";
import { ModuleItemEnum } from "@/components/module/workPlace/context/types";
import { useAddEntityMutation, useDeleteEntityMutation, useQueryEntitiesQuery } from "api/hooks/moduleQueryHooks";
import Section from "./section";

export function LocationListItem({
  location,
  isSelected,
  onClick,
  onDelete,
}: {
  location: StageEntityResponse;
  isSelected: boolean;
  onClick: () => void;
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
          src={location?.entityInfo?.image || "./favicon.ico"}
          alt="location"
          style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
        />
        <div className="flex flex-col">
          <p className="self-baseline font-medium">{location.name}</p>
          <p className="text-xs text-gray-500 self-baseline mt-0.5 line-clamp-1">{location.entityInfo?.description}</p>
        </div>
      </div>

      {/* 右侧按钮 */}
      {onDelete && (
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
      )}
    </div>
  );
}

export function LocationList({ stageId }: { stageId: number }) {
  const { pushModuleTabItem, setCurrentSelectedTabId, currentSelectedTabId, removeModuleTabItem } = useModuleContext();
  const handleClick = (location: StageEntityResponse) => {
    const locationId = location.id!.toString();
    const locationName = location.name!;

    pushModuleTabItem({
      id: locationId,
      label: locationName,
      type: ModuleItemEnum.LOCATION,
    });
    setCurrentSelectedTabId(locationId);
  };

  // 创建场景和删除
  const { mutate: createLocation } = useAddEntityMutation("location");
  const { mutate: deleteLocation } = useDeleteEntityMutation();

  const handleAddScene = () => {
    createLocation({
      stageId,
      name: "新地点",
      entityInfo: {
        tip: "给予的提示",
        description: "新场景です", // 场景描述（可选）
        image: "./favicon.ico",
      },
    });
  };

  const { data } = useQueryEntitiesQuery(stageId);

  const list = data?.data?.filter(i => i!.entityType === "location");

  // 判断列表是否存在且非空
  const isEmpty = !list || list.length === 0;

  return (
    <Section label="地点" onClick={handleAddScene}>
      {isEmpty
        ? (
            <div className="text-sm text-gray-500 px-2 py-4">暂时没有场景哦</div>
          )
        : (
            <>
              {list?.map((location, index) => (
                <LocationListItem
                  // key={scene.entityInfo!.moduleSceneId}
                  key={index}
                  location={location}
                  isSelected={currentSelectedTabId === location.id!.toString()}
                  onClick={() => handleClick(location)}
                  onDelete={() => {
                    removeModuleTabItem(location.id!.toString());
                    deleteLocation({
                      id: location.id!,
                      stageId,
                    });
                  }}
                />
              ))}
            </>
          )}
    </Section>
  );
}
