import ChatFrameLoadingState from "@/components/chat/chatFrameLoadingState";

function SkeletonLine({ className }: { className: string }) {
  return <div className={`
    chat-skeleton-line
    ${className}
  `} />;
}

export default function RoomWindowLoadingState() {
  return (
    <div className="
      flex h-full w-full min-h-0 flex-col bg-base-100 text-base-content/15
    ">
      <div className="
        flex h-12 shrink-0 items-center justify-between border-b
        border-base-300/70 px-3
      ">
        <div className="flex min-w-0 items-center gap-2">
          <SkeletonLine className="h-8 w-8 rounded-md" />
          <div className="space-y-1.5">
            <SkeletonLine className="h-3.5 w-28" />
            <SkeletonLine className="h-2.5 w-16" />
          </div>
        </div>
        <div className="
          hidden items-center gap-2
          sm:flex
        ">
          <SkeletonLine className="h-7 w-16 rounded-md" />
          <SkeletonLine className="h-7 w-7 rounded-md" />
          <SkeletonLine className="h-7 w-7 rounded-md" />
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <ChatFrameLoadingState />
      </div>

      <div className="
        shrink-0 border-t border-base-300/70 bg-base-100 px-3 py-3
      ">
        <div className="mb-2 flex items-center gap-2">
          <SkeletonLine className="h-7 w-24 rounded-md" />
          <SkeletonLine className="h-7 w-20 rounded-md" />
          <SkeletonLine className="h-7 w-7 rounded-md" />
        </div>
        <div className="rounded-lg border border-base-300/70 bg-base-200/45 p-3">
          <SkeletonLine className="h-4 w-5/12" />
          <SkeletonLine className="mt-2 h-4 w-8/12" />
        </div>
      </div>
    </div>
  );
}
