type BlocksuiteFrameSkeletonProps = {
  visible: boolean;
  variant: "embedded" | "full";
  iframeHeightAttr?: number;
  hasExplicitHeightClass: boolean;
};

export function BlocksuiteFrameSkeleton(props: BlocksuiteFrameSkeletonProps) {
  const { visible, variant, iframeHeightAttr, hasExplicitHeightClass } = props;
  if (!visible) {
    return null;
  }

  return (
    <div
      className={[
        "w-full",
        "rounded-xl",
        "border",
        "border-base-300/60",
        "bg-base-100/60",
        "p-4",
        (variant !== "full" && !iframeHeightAttr) ? "min-h-32" : "",
        (variant === "full" && !hasExplicitHeightClass) ? "h-full" : "",
      ].filter(Boolean).join(" ")}
      aria-label="Blocksuite loading"
    >
      <div className="mx-auto w-full max-w-195 px-4 pr-6">
        <div className="flex min-h-12 items-center gap-4">
          <div className="skeleton h-14 w-14 rounded-2xl" />
          <div className="skeleton h-12 flex-1 rounded-2xl" />
          <div className="ml-auto flex items-center gap-2">
            <div className="skeleton h-8 w-24 rounded-full" />
            <div className="skeleton h-8 w-20 rounded-full" />
          </div>
        </div>
        <div className="skeleton mt-3 h-4 w-full" />
        <div className="skeleton mt-2 h-4 w-full" />
        <div className="skeleton mt-2 h-4 w-full" />
      </div>
    </div>
  );
}
