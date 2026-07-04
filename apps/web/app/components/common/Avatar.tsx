import type { ImgHTMLAttributes, ReactNode } from "react";

import ImgWithHoverToScale from "@/components/common/imgWithHoverToScale";

/**
 * 统一头像壳：尺寸档位 + 圆形/圆角 + 图片回退 + 透明图片区域。
 * 业务头像（UserAvatar/RoleAvatar 等）内部复用本组件的尺寸常量与壳样式，
 * 各自保留其查询/详情/跳转等业务逻辑。
 */
export const AVATAR_SIZE_CLASS = {
  6: "w-6 h-6",
  8: "w-8 h-8",
  9: "w-9 h-9",
  10: "w-10 h-10",
  12: "w-12 h-12",
  14: "w-14 h-14",
  16: "w-16 h-16",
  18: "w-18 h-18",
  20: "w-20 h-20",
  21: "w-[5.125rem] h-[5.125rem]",
  24: "w-24 h-24",
  30: "w-30 h-30",
  32: "w-32 h-32",
  36: "w-36 h-36",
  full: "w-full h-full",
} as const;

export type AvatarSize = keyof typeof AVATAR_SIZE_CLASS;

/** 头像外壳悬浮态（与历史 UserAvatar/RoleAvatar 一致，已含 motion-reduce 降级）。 */
export const AVATAR_HOVER_SHELL_CLASS
  = "transition-all duration-200 ease-out motion-reduce:transition-none hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-md hover:shadow-base-content/10";
/** 头像图片组悬浮放大（配合 group/avatar）。 */
export const AVATAR_HOVER_IMAGE_CLASS
  = "transition-transform duration-200 ease-out motion-reduce:transition-none group-hover/avatar:scale-105";
/** 自然图片边界：只在图片外壳内侧加轻描边，不改变透明图片背景。 */
export const IMAGE_NATURAL_BORDER_CLASS = "ring-1 ring-inset ring-base-content/10";

export type AvatarProps = {
  src?: string;
  alt?: string;
  size?: AvatarSize;
  rounded?: boolean;
  fallbackSrc?: string;
  className?: string;
  imgClassName?: string;
  shellClassName?: string;
  hoverToScale?: boolean;
  imageLoading?: ImgHTMLAttributes<HTMLImageElement>["loading"];
  imageDecoding?: ImgHTMLAttributes<HTMLImageElement>["decoding"];
  /** 无图时展示的自定义内容（如文字占位）。 */
  children?: ReactNode;
};

export function Avatar({
  src,
  alt = "avatar",
  size = 8,
  rounded = true,
  fallbackSrc = "/favicon.ico",
  className,
  imgClassName,
  shellClassName,
  hoverToScale = false,
  imageLoading,
  imageDecoding,
  children,
}: AvatarProps) {
  return (
    <div className={`avatar group/avatar ${size === "full" ? "h-full w-full" : ""} ${className ?? ""}`}>
      <div
        className={`
          ${AVATAR_SIZE_CLASS[size]}
          ${rounded ? "rounded-full" : "rounded"}
          flex items-center justify-center overflow-hidden bg-transparent
          ${IMAGE_NATURAL_BORDER_CLASS}
          ${shellClassName ?? ""}
        `}
      >
        {src
          ? (
              <ImgWithHoverToScale
                enableScale={hoverToScale}
                src={src}
                alt={alt}
                className={`h-full w-full object-cover ${imgClassName ?? ""}`}
                fallbackSrc={fallbackSrc}
                loading={imageLoading}
                decoding={imageDecoding}
              />
            )
          : children}
      </div>
    </div>
  );
}
