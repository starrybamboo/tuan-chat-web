import SpaceRightSidePanel from "@/components/chat/spaceRightSidePanel";

export default function SpaceWindow({ spaceId }: { spaceId: number }) {
  if (!spaceId || spaceId <= 0) {
    return <></>;
  }
  return (
    <>
      <div className="flex flex-row p-6 gap-4 w-full min-w-0">
        <div className="flex-1 w-full flex flex-col card-body shadow-sm relative">
        </div>
        {/* 成员与角色展示框 */}
        <SpaceRightSidePanel></SpaceRightSidePanel>
      </div>
    </>
  );
}
