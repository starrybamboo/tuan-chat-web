import { motion } from "motion/react";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { skeletonFadeMotionProps } from "@/components/common/motion/chatMessageMotion";

const TRADITIONAL_MESSAGE_WIDTHS = [
  "w-11/12",
  "w-8/12",
  "w-10/12",
  "w-7/12",
  "w-9/12",
  "w-6/12",
];

const BUBBLE_MESSAGE_WIDTHS = [
  "w-[28rem] max-w-[72%]",
  "w-[20rem] max-w-[58%]",
  "w-[24rem] max-w-[66%]",
  "w-[16rem] max-w-[48%]",
  "w-[30rem] max-w-[76%]",
  "w-[18rem] max-w-[54%]",
];

function TraditionalSkeletonMessage({ width, lines = 2 }: { width: string; lines?: 1 | 2 | 3 }) {
  return (
    <div className="flex w-full px-4 py-2 sm:px-5 sm:py-3">
      <div className="shrink-0 pr-2 sm:pr-3">
        <div className="chat-skeleton-line h-10 w-10 rounded-md sm:h-16 sm:w-16 md:h-20 md:w-20" />
      </div>
      <div className="min-w-0 flex-1 space-y-2 pt-1 pr-2 sm:pr-5">
        <div className="chat-skeleton-line h-5 w-32 sm:w-40" />
        <div className="space-y-1.5">
          <div className={`chat-skeleton-line h-5 sm:h-6 ${width}`} />
          {lines >= 2 && <div className={`chat-skeleton-line h-5 sm:h-6 ${width === "w-11/12" ? "w-8/12" : "w-7/12"}`} />}
          {lines >= 3 && <div className="chat-skeleton-line h-5 sm:h-6 w-5/12" />}
        </div>
      </div>
    </div>
  );
}

function BubbleSkeletonMessage({ width, lines = 2 }: { width: string; lines?: 1 | 2 | 3 }) {
  return (
    <div className="flex w-full items-start gap-2.5 px-4 py-2.5 sm:px-5">
      <div className="chat-skeleton-line h-10 w-10 shrink-0 rounded-full sm:h-12 sm:w-12" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="chat-skeleton-line h-4 w-24 sm:w-32" />
        <div className={`chat-skeleton-line rounded-lg px-4 py-3 ${width}`}>
          <div className="chat-skeleton-line h-4 w-full bg-current/60" />
          {lines >= 2 && <div className="chat-skeleton-line mt-2 h-4 w-8/12 bg-current/60" />}
          {lines >= 3 && <div className="chat-skeleton-line mt-2 h-4 w-5/12 bg-current/60" />}
        </div>
      </div>
    </div>
  );
}

export default function ChatFrameLoadingState() {
  const useChatBubbleStyle = useRoomPreferenceStore(state => state.useChatBubbleStyle);
  const widths = useChatBubbleStyle ? BUBBLE_MESSAGE_WIDTHS : TRADITIONAL_MESSAGE_WIDTHS;
  const SkeletonMessage = useChatBubbleStyle ? BubbleSkeletonMessage : TraditionalSkeletonMessage;

  return (
    <motion.div
      className="w-full h-full flex flex-col justify-end bg-base-200 text-base-content/15 overflow-hidden"
      {...skeletonFadeMotionProps}
    >
      <SkeletonMessage width={widths[0]} lines={3} />
      <SkeletonMessage width={widths[1]} lines={2} />
      <SkeletonMessage width={widths[2]} lines={2} />
      <SkeletonMessage width={widths[3]} lines={1} />
      <SkeletonMessage width={widths[4]} lines={3} />
      <SkeletonMessage width={widths[5]} lines={2} />
    </motion.div>
  );
}
