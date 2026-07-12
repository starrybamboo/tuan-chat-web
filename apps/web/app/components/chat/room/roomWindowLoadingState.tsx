import ChatFrameLoadingState from "@/components/chat/chatFrameLoadingState";
import { Skeleton } from "@/components/common/StatusPrimitives";

export default function RoomWindowLoadingState() {
  return (
    <div className="
      flex size-full min-h-0 flex-col bg-base-100 text-base-content/15
    ">
      <div className="
        flex h-12 shrink-0 items-center justify-between border-b
        border-base-300/70 px-3
      ">
        <div className="flex min-w-0 items-center gap-2">
          <Skeleton className="size-8" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>
        <div className="
          hidden items-center gap-2
          sm:flex
        ">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="size-7" />
          <Skeleton className="size-7" />
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <ChatFrameLoadingState />
      </div>

      <div className="shrink-0 border-t border-base-300/70 bg-base-100 p-3">
        <div className="mb-2 flex items-center gap-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="size-7" />
        </div>
        <div className="rounded-lg border border-base-300/70 bg-base-200/45 p-3">
          <Skeleton className="h-4 w-5/12" />
          <Skeleton className="mt-2 h-4 w-8/12" />
        </div>
      </div>
    </div>
  );
}
