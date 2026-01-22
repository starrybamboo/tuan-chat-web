import type { SVGProps } from "react";
import { AddressBookIcon, CaretDownIcon, CaretLeftIcon, DiscordLogoIcon, HouseIcon, IdentificationCard, ImageIcon, MusicNotesIcon, SidebarSimpleIcon as PhosphorSidebarSimpleIcon, PlusIcon, QrCodeIcon, SmileyIcon, TrashSimpleIcon, UsersIcon, UserSwitch } from "@phosphor-icons/react";

/**
 * 每个Icon图标都用AI生成了一些关键词方便搜索
 * 应该有点用
 * 吧？
 * 我是建议在末尾加 Icon 方便区分正常组件
 */

// Discord 图标（简化版）
// 其他关键词：bug反馈，社区，群组，discord
export function DiscordIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <DiscordLogoIcon {...props} />
  );
}

// QQ 图标（简化版：双气泡）
// 其他关键词：bug反馈，QQ群，二维码，qq
export function QQIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <QrCodeIcon {...props} />
  );
}

export function UserSwitchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <UserSwitch {...props} />
  );
}

export function CommandSolid(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 36 36"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        d="M32 5H4a2 2 0 0 0-2 2v22a2 2 0 0 0 2 2h28a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2M6.8 15.81v-2.64l10 4.59v2.08l-10 4.59v-2.65l6.51-3Zm16.6 9.59H17V23h6.4ZM4 9.2V7h28v2.2Z"
        className="clr-i-solid clr-i-solid-path-1"
      >
      </path>
      <path fill="none" d="M0 0h36v36H0z"></path>
    </svg>
  );
}

// 二十面骰子图标
// 其他关键词：骰子，D20，桌游，DND，跑团
export function DiceTwentyFacesTwenty(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        d="M248 20.3L72.33 132.6L248 128.8zm16 0v108.5l175.7 3.8zm51.4 58.9c6.1 3.5 8.2 7.2 15.1 4.2c10.7.8 22.3 5.8 27.6 15.7c4.7 4.5 1.5 12.6-5.2 12.6c-9.7.1-19.7-6.1-14.6-8.3c4.7-2 14.7.9 10-5.5c-3.6-4.5-11-7.8-16.3-5.9c-1.6 6.8-9.4 4-12-.7c-2.3-5.8-9.1-8.2-15-7.9c-6.1 2.7 1.6 8.8 5.3 9.9c7.9 2.2.2 7.5-4.1 5.1c-4.2-2.4-15-9.6-13.5-18.3c5.8-7.39 15.8-4.62 22.7-.9m-108.5-3.5c5.5.5 12.3 3 10.2 9.9c-4.3 7-9.8 13.1-18.1 14.8c-6.5 3.4-14.9 4.4-21.6 1.9c-3.7-2.3-13.5-9.3-14.9-3.4c-2.1 14.8.7 13.1-11.1 17.8V92.3c9.9-3.9 21.1-4.5 30.3 1.3c8 4.2 19.4 1.5 24.2-5.7c1.4-6.5-8.1-4.6-12.2-3.4c-2.7-8.2 7.9-7.5 13.2-8.8m35 69.2L55.39 149l71.21 192.9zm28.2 0l115.3 197L456.6 149zm-14.1 7.5L138.9 352.6h234.2zm133.3 21.1c13.9 8.3 21.5 26.2 22.1 43c-1.3 13.6-.7 19.8-15.2 21.4s-23.9-19.2-29.7-32.6c-3.4-9.9-5.8-24 1.7-31.3c6.1-4.8 15-4.1 21.1-.5m-223.7 16.1c2.1 4-.5 11.4-4.8 12.1c-4.9.7-3.8-9.3-9.4-11.6c-6.9-2.3-13.6 5.6-15 11.6c10.4-4 20.3 7.1 20.3 17c-.4 11.7-7.9 24.8-19.7 28.1h-5.6c-12.7-.7-18.3-15.8-14.2-26.6c4.4-15.8 10.8-33.9 27.2-40.6c8.5-3.9 19 3.2 21.2 10m213.9-8.4c-7.1-.1-4.4 10-3.3 14.5c3.5 11.5 7.3 26.6 18.9 30c6.8-1.2 4.4-12.8 3.7-16.5c-4.7-10.9-7.1-23.3-19.3-28M52 186v173.2l61.9-5.7zm408 0l-61.9 167.5l61.9 5.7zm-117.9.7l28.5 63.5l-10 4.4l-20-43.3c-6.1 3-13 8.9-14.6-1.4c-1.3-3.9 8.5-5.1 8.1-11.9c-.3-6.9 2.2-12.2 8-11.3m-212 27.4c-2.4 5.1-4.1 10.3-2.7 15.9c1.7 8.8 13.5 6.4 15.6-.8c2.7-5 3.9-11.7-.5-15.7c-4.1-3.4-8.9-2.8-12.4.6m328.4 41.6c-.1 18.6 1.1 39.2-9.7 55.3c-.9 1.2-2.2 1.9-3.7 2.5c-5.8-4.1-3-11.3 1.2-15.5c1 7.3 5.5-2.9 6.6-5.6c1.3-3.2 3.6-17.7-1-10.2c.7 4-6.8 13.1-9.3 8.1c-5-14.4 0-30.5 7-43.5c5.7-6.2 9.9 4.4 8.9 8.9M59.93 245.5c.59.1 1.34 1 2.48 3.6v61.1c-7.3-7-4.47-18-4.45-26.4c0-8.4 1.65-16.3-1.28-23.2c-4.62-1.7-5.79-17-3.17-12.7c4.41 4.8 4.66-2.7 6.42-2.4m178.77 7.6c8.1 4.5 13.8 14.4 10.8 23.6c-2.1 15.2-27 21.1-30.4 29.7c-1.2 3 25.4 1.6 30.2 1.6c.5 4 1.5 10.7-3.8 11.7c-14.5-1.2-29.9-.6-45.1-.6c.4-11.2 7.4-21.3 17-26.8c6.9-4.9 15.4-9.3 18.1-17.9c1.8-4.5-.6-9.3-4.6-11.5c-4.2-2.9-11-2.3-13.2 2.7c-2 3.8-4.4 9.1-8.7 9.6c-2.9.4-9 .5-7.2-4.9c1.4-5.6 3.4-11.5 8.2-15.2c8.8-6.3 19.9-6.7 28.7-2m53.3-1.4c6.8 2.2 12 7.9 14.3 14.6c6.1 14.7 5.5 33.1-4.4 45.9c-4.5 4.8-10.2 9.1-17 9.1c-12.5-.1-22.4-11.1-24.8-22.8c-3.1-13.4-1.8-28.7 6.9-39.8c6.8-7.6 16-10.3 25-7m156.1 8.1c-1.6 5.9-3.3 13.4-.7 19.3c5.1-2 5.4-9.6 6.6-14.5c.9-6.1-3.5-12.6-5.9-4.8m-176.2 21.1c.6 10.5 1.7 22.8 9.7 28.2c4.9 1.8 9.7-2.2 11.1-6.7c1.9-6.3 2.3-12.9 2.4-19.4c-.2-7.1-1.5-15-6.7-20.1c-12.2-4.4-15.3 10.9-16.5 18M434 266.8V328l-4.4 6.7v-42.3c-4.6 7.5-9.1 9.1-6.1-.9c6.1-7.1 4.8-17.4 10.5-24.7M83.85 279c.8 3.6 5.12 17.8 2.04 14.8c-1.97-1.3-3.62-4.9-3.41-6.1c-1.55-3-2.96-6.1-4.21-9.2c-2.95 4-3.96 8.3-3.14 13.4c.2-1.6 1.18-2.3 3.39-.7c7.84 12.6 12.17 29.1 7.29 43.5l-2.22 1.1c-10.36-5.8-11.4-19.4-13.43-30c-1.55-12.3-.79-24.7 2.3-36.7c5.2-3.8 9.16 5.4 11.39 9.9m-7.05 20.2c-4.06 4.7-2.26 12.8-.38 18.4c1.11 5.5 6.92 10.2 6.06 1.6c.69-11.1-2.33-12.7-5.68-20m66.4 69.4L256 491.7l112.8-123.1zm-21.4.3l-53.84 4.9l64.24 41.1c-2.6-2.7-4.9-5.7-7.1-8.8c-5.2-6.9-10.5-13.6-18.9-16.6c-8.75-6.5-4.2-5.3 2.9-2.6c-1-1.8-.7-2.6.1-2.6c2.2-.2 8.4 4.2 9.8 6.3l24.7 31.6l65.1 41.7zm268.4 0l-42.4 46.3c6.4-3.1 11.3-8.5 17-12.4c2.4-1.4 3.7-1.9 4.3-1.9c2.1 0-5.4 7.1-7.7 10.3c-9.4 9.8-16 23-28.6 29.1l18.9-24.5c-2.3 1.3-6 3.2-8.2 4.1l-40.3 44l74.5-47.6c5.4-6.7 1.9-5.6-5.7-.9l-11.4 6c11.4-13.7 30.8-28.3 40-35.6s15.9-9.8 8.2-1.5l-12.6 16c10-7.6.9 3.9-4.5 5.5c-.7 1-1.4 2-2.2 2.9l54.5-34.9zM236 385.8v43.4h-13.4v-30c-5-1.4-10.4 1.7-15.3-.3c-3.8-2.9 1-6.8 4.5-5.9c3.3-.1 7.6.2 9.3-3.2c4.4-4.5 9.6-4.4 14.9-4m29 .5c12.1 1.2 24.2.6 36.6.6c1.5 3 .8 7.8-3.3 7.9c-7.7.3-21-1.6-25.9.6c-8.2 10.5 5.7 3.8 11.4 5.2c7 1.1 15 2.9 19.1 9.2c2.1 3.1 2.7 7.3.7 10.7c-5.8 6.8-17 11.5-25.3 10.9c-7.3-.6-15.6-1.1-20.6-7.1c-6.4-10.6 10.5-6.7 12.2-3.2c6 5.3 20.3 1.9 20.7-4.7c.6-4.2-2.1-6.3-6.9-7.8s-12.6 1-17.3 1.8s-9.6.5-9-4.4c.8-4.2 2.7-8.1 2.7-12.5c.1-3 1.7-7 4.9-7.2m133.5 5c-.2-.2-7 5.8-9.9 8.1l-15.8 13.1c10.6-6.5 19.3-12 25.7-21.2m-247 14.2c2.4 0 7.5 4.6 9.4 7l26.1 31.1c-7.7-2.1-13.3-7.1-17.6-13.7c-6.5-7.3-11.3-16.6-21.2-19.6c-9-5-5.2-6.4 2.1-2.2c-.3-1.9.2-2.6 1.2-2.6"
      >
      </path>
    </svg>
  );
}

// 六面骰子图标（自绘）
// 其他关键词：骰子，D6，桌游，跑团，随机
export function DiceD6Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <rect
        x="4.5"
        y="4.5"
        width="15"
        height="15"
        rx="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="8" cy="8" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      <circle cx="16" cy="16" r="1.2" fill="currentColor" />
      <circle cx="16" cy="8" r="1.2" fill="currentColor" />
      <circle cx="8" cy="16" r="1.2" fill="currentColor" />
    </svg>
  );
}

// 损坏的图片图标
// 其他关键词：破损图片，加载失败，图像错误，占位图
export function GalleryBroken(props: SVGProps<SVGSVGElement>) {
  return (
    <ImageIcon {...props} />
  );
}

// 设置齿轮图标
// 其他关键词：配置，选项，系统设置，偏好设置
export function Setting(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="12em"
      height="12em"
      {...props}
    >
      <g fill="currentColor">
        <path d="M12 4a1 1 0 0 0-1 1c0 1.692-2.046 2.54-3.243 1.343a1 1 0 1 0-1.414 1.414C7.54 8.954 6.693 11 5 11a1 1 0 1 0 0 2c1.692 0 2.54 2.046 1.343 3.243a1 1 0 0 0 1.414 1.414C8.954 16.46 11 17.307 11 19a1 1 0 1 0 2 0c0-1.692 2.046-2.54 3.243-1.343a1 1 0 1 0 1.414-1.414C16.46 15.046 17.307 13 19 13a1 1 0 1 0 0-2c-1.692 0-2.54-2.046-1.343-3.243a1 1 0 0 0-1.414-1.414C15.046 7.54 13 6.693 13 5a1 1 0 0 0-1-1m-2.992.777a3 3 0 0 1 5.984 0a3 3 0 0 1 4.23 4.231a3 3 0 0 1 .001 5.984a3 3 0 0 1-4.231 4.23a3 3 0 0 1-5.984 0a3 3 0 0 1-4.231-4.23a3 3 0 0 1 0-5.984a3 3 0 0 1 4.231-4.231">
        </path>
        <path d="M12 10a2 2 0 1 0 0 4a2 2 0 0 0 0-4m-2.828-.828a4 4 0 1 1 5.656 5.656a4 4 0 0 1-5.656-5.656">
        </path>
      </g>
    </svg>
  );
}

// 更多菜单图标
// 其他关键词：菜单，选项，三点，更多操作
export function MoreMenu(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M117.333 256c0-17.673-14.327-32-32-32s-32 14.327-32 32s14.327 32 32 32s32-14.327 32-32m341.333 0c0-17.673-14.327-32-32-32s-32 14.327-32 32s14.327 32 32 32s32-14.327 32-32M288 256c0-17.673-14.327-32-32-32s-32 14.327-32 32s14.327 32 32 32s32-14.327 32-32"
      >
      </path>
    </svg>
  );
}

// 女孩头像图标
// 其他关键词：女孩，女童，孩子，用户头像
export function RoleListIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <AddressBookIcon {...props} />
  );
}

// 身份卡图标
// 其他关键词：角色详情，名片，信息卡
export function IdentificationCardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IdentificationCard {...props} />
  );
}

// 聊天气泡图标2
// 其他关键词：对话，消息，通讯，交流
export function Bubble2(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeMiterlimit="10"
        strokeWidth="32"
        d="M87.49 380c1.19-4.38-1.44-10.47-3.95-14.86a45 45 0 0 0-2.54-3.8a199.8 199.8 0 0 1-33-110C47.65 139.09 140.73 48 255.83 48C356.21 48 440 117.54 459.58 209.85a199 199 0 0 1 4.42 41.64c0 112.41-89.49 204.93-204.59 204.93c-18.3 0-43-4.6-56.47-8.37s-26.92-8.77-30.39-10.11a31.1 31.1 0 0 0-11.12-2.07a30.7 30.7 0 0 0-12.09 2.43l-67.83 24.48a16 16 0 0 1-4.67 1.22a9.6 9.6 0 0 1-9.57-9.74a16 16 0 0 1 .6-3.29Z"
      >
      </path>
    </svg>
  );
}

// 聊天气泡带省略号图标
// 其他关键词：对话，消息，交谈中，输入中
export function ChatBubbleEllipsesOutline(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeMiterlimit="10"
        strokeWidth="32"
        d="M87.48 380c1.2-4.38-1.43-10.47-3.94-14.86a43 43 0 0 0-2.54-3.8a199.8 199.8 0 0 1-33-110C47.64 139.09 140.72 48 255.82 48C356.2 48 440 117.54 459.57 209.85a199 199 0 0 1 4.43 41.64c0 112.41-89.49 204.93-204.59 204.93c-18.31 0-43-4.6-56.47-8.37s-26.92-8.77-30.39-10.11a31.1 31.1 0 0 0-11.13-2.07a30.7 30.7 0 0 0-12.08 2.43L81.5 462.78a16 16 0 0 1-4.66 1.22a9.61 9.61 0 0 1-9.58-9.74a16 16 0 0 1 .6-3.29Z"
      >
      </path>
      <circle cx="160" cy="256" r="32" fill="currentColor"></circle>
      <circle cx="256" cy="256" r="32" fill="currentColor"></circle>
      <circle cx="352" cy="256" r="32" fill="currentColor"></circle>
    </svg>
  );
}

// 发送图标
// 其他关键词：发送消息，提交，纸飞机
export function SendIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        d="M12 2a1 1 0 0 1 .894.553l9 18a1 1 0 0 1-1.11 1.423L12 20.024l-8.783 1.952a1 1 0 0 1-1.111-1.423l9-18A1 1 0 0 1 12 2m1 16.198l6.166 1.37L13 7.236zM11 7.236L4.834 19.568L11 18.198z"
      >
      </path>
    </svg>
  );
}

// 文字加粗图标
// 其他关键词：粗体，文本格式化，富文本
export function BaselineFormatBold(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79c0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79c0-1.52-.86-2.82-2.15-3.42M10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5"
      >
      </path>
    </svg>
  );
}

// 文字斜体图标
// 其他关键词：斜体，文本格式化，富文本
export function BaselineFormatItalic(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"
      >
      </path>
    </svg>
  );
}

// 链接图标
// 其他关键词：超链接，URL，网址，连接
export function LinkFilled(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="m17.657 12l-1.414-1.414l2.121-2.122a2 2 0 1 0-2.828-2.828l-4.243 4.243a2 2 0 0 0 0 2.828l-1.414 1.414a4 4 0 0 1 0-5.657l4.242-4.242a4 4 0 0 1 5.657 5.657zM6.343 12l1.414 1.414l-2.121 2.122a2 2 0 1 0 2.828 2.828l4.243-4.243a2 2 0 0 0 0-2.828l1.414-1.414a4 4 0 0 1 0 5.657L9.88 19.778a4 4 0 1 1-5.657-5.657z"
      >
      </path>
    </svg>
  );
}

// 代码图标
// 其他关键词：编程，代码块，源代码
export function BaselineCode(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6l6 6zm5.2 0l4.6-4.6l-4.6-4.6L16 6l6 6l-6 6z"
      >
      </path>
    </svg>
  );
}

// 有序列表图标
// 其他关键词：编号列表，数字列表，排序列表
export function ListOrdered(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        d="M8 19h13v-2H8zm0-6h13v-2H8zm0-8v2h13V5zm-4.425.252q.16-.144.269-.275q-.018.342-.018.756V8h1.175V3.717H3.959L2.488 4.915l.601.738zm.334 7.764q.712-.639.93-.867t.35-.435t.195-.42q.063-.214.063-.466q0-.337-.18-.608c-.18-.271-.289-.32-.507-.417a1.8 1.8 0 0 0-.742-.148q-.331 0-.596.067c-.265.067-.34.11-.491.195q-.225.128-.557.423l.636.744q.261-.225.467-.341a.84.84 0 0 1 .409-.116a.44.44 0 0 1 .305.097a.34.34 0 0 1 .108.264q0 .135-.054.258t-.192.294q-.138.172-.586.64l-1.046 1.058V14h3.108v-.955h-1.62zm.53 4.746v-.018q.46-.13.703-.414q.243-.286.243-.685a.84.84 0 0 0-.378-.727q-.378-.264-1.043-.264q-.46 0-.816.1c-.356.1-.469.178-.696.334l.48.773q.44-.275.85-.275q.22 0 .35.082c.13.082.13.139.13.252q0 .451-.882.451h-.27v.87h.264q.326 0 .527.049q.202.047.293.143t.091.271q0 .228-.174.336q-.174.106-.555.106a2.3 2.3 0 0 1-.538-.069a2.5 2.5 0 0 1-.573-.212v.961q.342.131.637.182t.64.05q.84 0 1.314-.343q.473-.343.473-.94q.004-.878-1.07-1.013"
      >
      </path>
    </svg>
  );
}

// 无序列表图标
// 其他关键词：项目符号，圆点列表，清单
export function ListUnordered(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        d="M8 4h13v2H8zM4.5 6.5a1.5 1.5 0 1 1 0-3a1.5 1.5 0 0 1 0 3m0 7a1.5 1.5 0 1 1 0-3a1.5 1.5 0 0 1 0 3m0 6.9a1.5 1.5 0 1 1 0-3a1.5 1.5 0 0 1 0 3M8 11h13v2H8zm0 7h13v2H8z"
      >
      </path>
    </svg>
  );
}

// 引用图标
// 其他关键词：引文，评论，备注
export function QuoteAltRight(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        d="m21.95 8.721l-.025-.168l-.026.006A4.5 4.5 0 1 0 17.5 14c.223 0 .437-.034.65-.065c-.069.232-.14.468-.254.68c-.114.308-.292.575-.469.844c-.148.291-.409.488-.601.737c-.201.242-.475.403-.692.604c-.213.21-.492.315-.714.463c-.232.133-.434.28-.65.35l-.539.222l-.474.197l.484 1.939l.597-.144c.191-.048.424-.104.689-.171c.271-.05.56-.187.882-.312c.317-.143.686-.238 1.028-.467c.344-.218.741-.4 1.091-.692c.339-.301.748-.562 1.05-.944c.33-.358.656-.734.909-1.162c.293-.408.492-.856.702-1.299c.19-.443.343-.896.468-1.336c.237-.882.343-1.72.384-2.437c.034-.718.014-1.315-.028-1.747a7 7 0 0 0-.063-.539m-11 0l-.025-.168l-.026.006A4.5 4.5 0 1 0 6.5 14c.223 0 .437-.034.65-.065c-.069.232-.14.468-.254.68c-.114.308-.292.575-.469.844c-.148.291-.409.488-.601.737c-.201.242-.475.403-.692.604c-.213.21-.492.315-.714.463c-.232.133-.434.28-.65.35l-.539.222c-.301.123-.473.195-.473.195l.484 1.939l.597-.144c.191-.048.424-.104.689-.171c.271-.05.56-.187.882-.312c.317-.143.686-.238 1.028-.467c.344-.218.741-.4 1.091-.692c.339-.301.748-.562 1.05-.944c.33-.358.656-.734.909-1.162c.293-.408.492-.856.702-1.299c.19-.443.343-.896.468-1.336c.237-.882.343-1.72.384-2.437c.034-.718.014-1.315-.028-1.747a8 8 0 0 0-.064-.537"
      >
      </path>
    </svg>
  );
}

// 删除线图标
// 其他关键词：划掉，删除，文本删除
export function DeleteLine(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        d="M1024 511.81H687.11c-38.48-16.41-94.03-35.49-167.45-57.37-77.09-22.34-126.25-39.09-146.36-50.27-45.8-24.57-68.14-56.98-68.14-97.18 0-45.82 18.98-79.32 56.98-101.66 33.5-20.11 79.32-29.07 138.52-29.07 64.8 0 115.07 13.41 150.82 42.45 34.64 27.93 56.98 70.39 67.05 128.48H809c-7.82-83.77-37.98-147.45-91.61-189.91C666 115.94 594.5 95.83 505.14 95.83c-82.68 0-150.82 17.89-203.34 53.64-59.2 37.98-88.25 92.73-88.25 161.98 0 67.05 30.16 118.43 91.61 154.18 19.87 10.38 61.41 26.15 123.58 46.19H0v93.09h681.64c35.63 26.24 54.75 59.59 54.75 100.93 0 42.43-20.11 75.95-60.32 100.55-40.23 24.57-93.84 36.86-158.66 36.86-71.5 0-125.11-15.64-161.98-44.68-40.23-32.41-64.8-83.8-72.61-153.07h-90.5c6.7 98.32 41.34 170.93 103.91 218.98 53.61 40.2 127.34 60.32 221.18 60.32 94.98 0 169.82-20.11 225.68-59.2 55.86-40.23 83.8-96.09 83.8-165.34 0-35.82-8.24-67.53-24.42-95.34H1024v-93.11z"
        p-id="5038"
      >
      </path>
    </svg>
  );
}

// 图片图标
// 其他关键词：相册，照片，图像，插入图片
export function Image2Fill(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        d="m5 11.1l2-2l5.5 5.5l3.5-3.5l3 3V5H5zM4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1m11.5 7a1.5 1.5 0 1 1 0-3a1.5 1.5 0 0 1 0 3"
      >
      </path>
    </svg>
  );
}

// B站图标
// 其他关键词：哔哩哔哩，视频，直播
export function BilibiliFill(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        d="M18.223 3.086a1.25 1.25 0 0 1 0 1.768L17.08 5.996h1.17A3.75 3.75 0 0 1 22 9.747v7.5a3.75 3.75 0 0 1-3.75 3.75H5.75A3.75 3.75 0 0 1 2 17.247v-7.5a3.75 3.75 0 0 1 3.75-3.75h1.166L5.775 4.855a1.25 1.25 0 0 1 1.767-1.768l2.652 2.652q.119.119.198.257h3.213q.08-.14.199-.258l2.651-2.652a1.25 1.25 0 0 1 1.768 0m.027 5.42H5.75a1.25 1.25 0 0 0-1.247 1.157l-.003.094v7.5c0 .659.51 1.198 1.157 1.246l.093.004h12.5a1.25 1.25 0 0 0 1.247-1.157l.003-.093v-7.5c0-.69-.56-1.25-1.25-1.25m-10 2.5c.69 0 1.25.56 1.25 1.25v1.25a1.25 1.25 0 1 1-2.5 0v-1.25c0-.69.56-1.25 1.25-1.25m7.5 0c.69 0 1.25.56 1.25 1.25v1.25a1.25 1.25 0 1 1-2.5 0v-1.25c0-.69.56-1.25 1.25-1.25"
      >
      </path>
    </svg>
  );
}

// YouTube图标
// 其他关键词：油管，视频，直播
export function YoutubeSolid(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M12 4.15c-1.191 0-2.58.028-3.934.066l-.055.002c-1.378.039-2.49.07-3.366.215c-.913.151-1.671.44-2.277 1.063c-.608.625-.873 1.398-.998 2.323c-.12.89-.12 2.018-.12 3.42v1.524c0 1.4 0 2.528.12 3.419c.124.925.39 1.698.998 2.323c.606.624 1.364.912 2.277 1.063c.876.145 1.988.176 3.366.215l.055.002c1.355.038 2.743.066 3.934.066s2.58-.028 3.934-.066l.055-.002c1.378-.039 2.49-.07 3.366-.215c.913-.151 1.671-.44 2.277-1.063c.608-.625.874-1.398.998-2.323c.12-.89.12-2.018.12-3.42v-1.524c0-1.401 0-2.529-.12-3.419c-.124-.925-.39-1.698-.998-2.323c-.606-.624-1.364-.912-2.277-1.063c-.876-.145-1.988-.176-3.367-.215l-.054-.002A145 145 0 0 0 12 4.15m-1.128 10.501A.75.75 0 0 1 9.75 14v-4a.75.75 0 0 1 1.122-.651l3.5 2a.75.75 0 0 1 0 1.302z"
        clipRule="evenodd"
      >
      </path>
    </svg>
  );
}

// 代码文件图标
// 其他关键词：源文件，程序文件，开发
export function FileCodeOne(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width="1em"
      height="1em"
      {...props}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      >
        <path d="M40 23v-9L31 4H10a2 2 0 0 0-2 2v36a2 2 0 0 0 2 2h12m15-13l5 5l-5 5">
        </path>
        <path d="m31 31l-5 5l5 5M30 4v10h10"></path>
      </g>
    </svg>
  );
}

// 折叠箭头图标
// 其他关键词：展开，收起，下拉
export function FoldDown(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M12 11v8l3-3m-6 0l3 3M9 7h1m4 0h1m4 0h1M4 7h1"
      >
      </path>
    </svg>
  );
}

// 用户组图标
// 其他关键词：团队，群组，成员
export { UsersIcon };

// 指南针图标
// 其他关键词：导航，方向，探索
export function CompassIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10"></circle>
        <path d="m16.24 7.76l-2.12 6.36l-6.36 2.12l2.12-6.36l6.36-2.12Z"></path>
      </g>
    </svg>
  );
}

// 主页图标
// 其他关键词：首页，家，主页面
export function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <HouseIcon {...props} />
  );
}

// 关闭叉号图标
// 其他关键词：关闭，取消，删除，移除
export function XMarkICon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </g>
    </svg>
  );
}

// 成员图标
// 其他关键词：用户，账户，个人资料
export function MemberIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <UsersIcon {...props} />
  );
}

// 剑刃挥舞图标
// 其他关键词：武器，战斗，攻击，游戏
export function SwordSwing(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M255.999 42.667c37.609 0 72.944 9.731 103.626 26.814l-56.664 15.454l-73.449 88.139q-1.014-1.062-2.058-2.106c-43.584-43.585-111.239-48.43-160.176-14.536C103.05 88.772 174.14 42.667 256 42.667m150.298 152.329l34.217-125.463l-125.462 34.217l-147.049 176.459l-21.878-21.879l-30.17 30.17l37.711 37.711l-49.292 49.292c-14.234-3.801-30.05-.118-41.218 11.049c-16.662 16.662-16.662 43.677 0 60.34c16.663 16.662 43.678 16.662 60.34 0c11.168-11.167 14.85-26.985 11.049-41.22l49.291-49.291l37.713 37.714l30.17-30.17l-21.88-21.881zm-37.63-24.181L207.772 304.894l-2.618-2.619L339.233 141.38l40.472-11.037z"
        clipRule="evenodd"
      >
      </path>
    </svg>
  );
}

// 返回箭头图标
// 其他关键词：后退，上一步，返回
export function BaselineArrowBackIosNew(props: SVGProps<SVGSVGElement>) {
  return (
    <CaretLeftIcon weight="bold" {...props} />
  );
}

// 向下箭头图标
// 其他关键词：展开，下拉，向下
export function AngleDownOutline(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="m19 9l-7 7l-7-7"
      >
      </path>
    </svg>
  );
}

// 水平省略号图标
// 其他关键词：更多，菜单，选项
export function DotsHorizontalOutline(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3"
        d="M6 12h.01m6 0h.01m5.99 0h.01"
      >
      </path>
    </svg>
  );
}

// 表情符号图标
// 其他关键词：笑脸，emoji，表情
export function EmojiIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2M8.5 11A1.5 1.5 0 1 1 10 9.5A1.5 1.5 0 0 1 8.5 11m7 0A1.5 1.5 0 1 1 17 9.5A1.5 1.5 0 0 1 15.5 11M12 17.5c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5"
      />
    </svg>
  );
}

// 向右箭头图标
// 其他关键词：下一个，前进，右侧
export function ChevronRight(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M9 18l6-6l-6-6"
      />
    </svg>
  );
}

// 白色表情图标
// 其他关键词：笑脸，emoji，表情，明色
export function EmojiIconWhite(props: SVGProps<SVGSVGElement>) {
  return (
    <SmileyIcon {...props} />
  );
}

// 评论轮廓图标
// 其他关键词：留言，回复，对话框
export function CommentOutline(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        d="M9 22a1 1 0 0 1-1-1v-3H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6.1l-3.7 3.71c-.2.19-.45.29-.7.29zm1-6v3.08L13.08 16H20V4H4v12z"
      >
      </path>
    </svg>
  );
}

// 竖直三个点
export function EllipsisVertical(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width="1em"
      height="1em"
      {...props}
    >
      <circle cx="256" cy="256" r="48" fill="currentColor"></circle>
      <circle cx="256" cy="416" r="48" fill="currentColor"></circle>
      <circle cx="256" cy="96" r="48" fill="currentColor"></circle>
    </svg>
  );
}

// 六边形骰子图标
// 其他关键词：游戏，骰子，桌游
export function HexagonDice(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      >
        <path
          strokeLinecap="round"
          d="M11.7 1.173a.6.6 0 0 1 .6 0l8.926 5.154a.6.6 0 0 1 .3.52v10.307a.6.6 0 0 1-.3.52L12.3 22.826a.6.6 0 0 1-.6 0l-8.926-5.154a.6.6 0 0 1-.3-.52V6.847a.6.6 0 0 1 .3-.52z"
        >
        </path>
        <path strokeLinecap="round" d="M17 15H7l5-8z"></path>
        <path d="M2.5 6.5L12 7m-9.5-.5L7 15m14.5-8.5L17 15m4.5-8.5L12 7V1m9.5 16.5L17 15M2.5 17.5L7 15m0 0l5 8l5-8">
        </path>
      </g>
    </svg>
  );
}

// 命令行终端图标
// 其他关键词：控制台，shell，终端
export function CommandLine(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="m6.75 7.5l3 2.25l-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25"
      >
      </path>
    </svg>
  );
}

// 应用用户角色图标
// 其他关键词：权限，用户组，角色管理
export function AppUsersRoles(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        d="M19.307 3.21a2.91 2.91 0 1 0-.223 1.94a11.64 11.64 0 0 1 8.232 7.049l1.775-.698a13.58 13.58 0 0 0-9.784-8.291m-2.822 1.638a.97.97 0 1 1 0-1.939a.97.97 0 0 1 0 1.94m-4.267.805l-.717-1.774a13.58 13.58 0 0 0-8.291 9.784a2.91 2.91 0 1 0 1.94.223a11.64 11.64 0 0 1 7.068-8.233m-8.34 11.802a.97.97 0 1 1 0-1.94a.97.97 0 0 1 0 1.94m12.607 8.727a2.91 2.91 0 0 0-2.599 1.62a11.64 11.64 0 0 1-8.233-7.05l-1.774.717a13.58 13.58 0 0 0 9.813 8.291a2.91 2.91 0 1 0 2.793-3.578m0 3.879a.97.97 0 1 1 0-1.94a.97.97 0 0 1 0 1.94M32 16.485a2.91 2.91 0 1 0-4.199 2.599a11.64 11.64 0 0 1-7.05 8.232l.718 1.775a13.58 13.58 0 0 0 8.291-9.813A2.91 2.91 0 0 0 32 16.485m-2.91.97a.97.97 0 1 1 0-1.94a.97.97 0 0 1 0 1.94"
      >
      </path>
      <path
        fill="currentColor"
        d="M19.19 16.35a3.879 3.879 0 1 0-5.42 0a4.85 4.85 0 0 0-2.134 4.014v1.939h9.697v-1.94a4.85 4.85 0 0 0-2.143-4.014m-4.645-2.774a1.94 1.94  0 1 1 3.88 0a1.94 1.94 0 0 1-3.88 0m-.97 6.788a2.91 2.91 0 1 1 5.819 0z"
        className="ouiIcon__fillSecondary"
      >
      </path>
    </svg>
  );
}

// 在线用户同步图标
// 其他关键词：在线状态，用户同步，实时
export function UserSyncOnlineInPerson(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 14 14"
      width="1em"
      height="1em"
      {...props}
    >
      <g fill="none" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.04 13.448v-2.48h2.48"
        >
        </path>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.339 5.815a6.449 6.449 0 0 1-11.3 5.308M.661 8.185a6.449 6.449 0 0 1 11.3-5.308"
        >
        </path>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.96.552v2.48H9.48"
        >
        </path>
        <path d="M5.75 5.25a1.25 1.25 0 1 0 2.5 0a1.25 1.25 0 1 0-2.5 0"></path>
        <path strokeLinecap="round" d="M4.708 9.5a2.5 2.5 0 0 1 4.584 0"></path>
      </g>
    </svg>
  );
}

// 拖拽图标
// 其他关键词：拖动，排序，移动
export function DraggableIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        d="M8.5 7a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3m0 6.5a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3m1.5 5a1.5 1.5 0 1 1-3 0a1.5 1.5 0 0 1 3 0M15.5 7a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3m1.5 5a1.5 1.5 0 1 1-3 0a1.5 1.5 0 0 1 3 0m-1.5 8a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3"
      >
      </path>
    </svg>
  );
}

// 下拉箭头图标
// 其他关键词：展开，折叠，向下
export function ChevronDown(props: SVGProps<SVGSVGElement>) {
  return (
    <CaretDownIcon weight="bold" {...props} />
  );
}

// 搜索图标
// 其他关键词：查找，放大镜，搜索框
export function Search(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <g
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeWidth="2.5"
        fill="none"
        stroke="currentColor"
      >
        <circle cx="11" cy="11" r="8"></circle>
        <path d="m21 21-4.3-4.3"></path>
      </g>
    </svg>
  );
}

// 地图定位点图标
// 其他关键词：位置，坐标，地图标记
export function PointOnMapPerspectiveLinear(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21.121 21.121C22 20.243 22 18.828 22 16s0-4.243-.879-5.121m0 10.242C20.243 22 18.828 22 16 22H8c-2.828 0-4.243 0-5.121-.879m18.242 0Zm0-10.242C20.243 10 18.828 10 16 10H8c-2.828 0-4.243 0-5.121.879m18.242 0Zm-18.242 0C2 11.757 2 13.172 2 16s0 4.243.879 5.121m0-10.242Zm0 10.242Z"></path>
        <path strokeLinecap="round" d="M21 21L3 11m.5 10l8.5-5"></path>
        <circle cx="17" cy="5" r="3"></circle>
        <path strokeLinecap="round" d="M17 13V8"></path>
      </g>
    </svg>
  );
}

// 加号图标
// 其他关键词：新增，添加，创建
export function PlusOutline(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        d="M12 3.5v17m8.5-8.5h-17"
      >
      </path>
    </svg>
  );
}

// 齿轮轮廓图标
// 其他关键词：设置，配置，选项
export function GearOutline(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="none"
        stroke="currentColor"
        d="m17.3 10.453l1.927.315a.326.326 0 0 1 .273.322v1.793a.326.326 0 0 1-.27.321l-1.93.339q-.167.582-.459 1.111l1.141 1.584a.326.326 0 0 1-.034.422l-1.268 1.268a.326.326 0 0 1-.418.037l-1.6-1.123a5.5 5.5 0 0 1-1.118.468l-.34 1.921a.326.326 0 0 1-.322.269H11.09a.325.325 0 0 1-.321-.272l-.319-1.911a5.5 5.5 0 0 1-1.123-.465l-1.588 1.113a.326.326 0 0 1-.418-.037L6.052 16.66a.33.33 0 0 1-.035-.42l1.123-1.57a5.5 5.5 0 0 1-.47-1.129l-1.901-.337a.326.326 0 0 1-.269-.321V11.09c0-.16.115-.296.273-.322l1.901-.317q.173-.59.47-1.128l-1.11-1.586a.326.326 0 0 1 .037-.417L7.34 6.053a.326.326 0 0 1 .42-.035l1.575 1.125q.533-.292 1.121-.46l.312-1.91a.326.326 0 0 1 .322-.273h1.793c.159 0 .294.114.322.27l.336 1.92q.585.169 1.12.465l1.578-1.135a.326.326 0 0 1 .422.033l1.268 1.268a.326.326 0 0 1 .036.418L16.84 9.342q.29.53.46 1.11ZM9.716 12a2.283 2.283 0 1 0 4.566 0a2.283 2.283 0 0 0-4.566 0Z"
        clipRule="evenodd"
      >
      </path>
    </svg>
  );
}

// 内容图标
// 其他关键词：文档，文件，内容管理
export function ContentIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

// 舞台图标
// 其他关键词：场景，演示，展示
export function StageIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
      />
    </svg>
  );
}

// 历史记录图标
// 其他关键词：时间，记录，日志
export function HistoryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

// 分支图标
// 其他关键词：分叉，版本，Git
export function BranchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1024 1024"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        d="M740 161c-61.8 0-112 50.2-112 112c0 50.1 33.1 92.6 78.5 106.9v95.9L320 602.4V318.1c44.2-15 76-56.9 76-106.1c0-61.8-50.2-112-112-112s-112 50.2-112 112c0 49.2 31.8 91 76 106.1V706c-44.2 15-76 56.9-76 106.1c0 61.8 50.2 112 112 112s112-50.2 112-112c0-49.2-31.8-91-76-106.1v-27.8l423.5-138.7a50.52 50.52 0 0 0 34.9-48.2V378.2c42.9-15.8 73.6-57 73.6-105.2c0-61.8-50.2-112-112-112m-504 51a48.01 48.01 0 0 1 96 0a48.01 48.01 0 0 1-96 0m96 600a48.01 48.01 0 0 1-96 0a48.01 48.01 0 0 1 96 0m408-491a48.01 48.01 0 0 1 0-96a48.01 48.01 0 0 1 0 96"
      >
      </path>
    </svg>
  );
}

// 闪光图标
// 其他关键词：星光，特效，魔法
export function SparklesOutline(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeMiterlimit="10"
        strokeWidth="32"
        d="M256 176V336 M176 256H336 M400 64V160 M352 112H448 M112 368V432 M80 400H144"
      />
    </svg>
  );
}

// 柱状统计图标
// 其他关键词：数据可视化，图表，分析，投票
export function BarChartOutlineIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="5" y="12" width="3" height="7" rx="1" />
      <rect x="10" y="9" width="3" height="10" rx="1" />
      <rect x="15" y="5" width="3" height="14" rx="1" />
    </svg>
  );
}

// 搜索图标（填充样式）
// 其他关键词：查找，查询，放大镜，检索，搜索栏
export function SearchFilled(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M469.297 439.13L347.982 317.816C370.466 288.907 384 252.707 384 213.334c0-94.104-76.562-170.667-170.666-170.667S42.667 119.23 42.667 213.334S119.23 384 213.334 384c39.373 0 75.573-13.534 104.481-36.018l121.316 121.315zm-255.963-97.796c-70.584 0-128-57.417-128-128c0-70.584 57.416-128 128-128c70.583 0 128 57.416 128 128c0 70.583-57.417 128-128 128"
      >
      </path>
    </svg>
  );
}

export function AddRingLight(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <g fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="9"></circle>
        <path strokeLinecap="square" d="M12 15V9m3 3H9"></path>
      </g>
    </svg>
  );
}

// 旁白图标（用于 WebGAL 联动模式下无角色的旁白消息）
export function NarratorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {/* 引号符号，表示旁白/叙述 */}
        <path d="M10 8c-2 0-3 1.5-3 3s1 3 3 3c0 2-1.5 3-3 3" />
        <path d="M17 8c-2 0-3 1.5-3 3s1 3 3 3c0 2-1.5 3-3 3" />
      </g>
    </svg>
  );
}

// 物品图标
export function Items(
  props: SVGProps<SVGSVGElement>,
) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 14 14"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 3.02L13.5.5M8 3.02l5.5 1.48m-7 9c3.5 0 6-1.24 6-4c0-3-1.5-5-4.5-6.5l1.18-1.53a.65.65 0 0 0-.56-.95H4.38a.65.65 0 0 0-.56 1L5 3C2 4.52.5 6.52.5 9.52c0 2.74 2.5 3.98 6 3.98Z"
      >
      </path>
    </svg>
  );
}

// 侦探图标
// 其他关键词：线索
export function Detective(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        d="M248 112h-27.92l-47.5-65.41a16 16 0 0 0-25.31-.72l-12.85 14.9l-.2.23a7.95 7.95 0 0 1-12.44 0l-.2-.23l-12.85-14.9a16 16 0 0 0-25.31.72L35.92 112H8a8 8 0 0 0 0 16h240a8 8 0 0 0 0-16M96.34 56l.19.23l12.85 14.89a24 24 0 0 0 37.24 0l12.85-14.89c.06-.08.1-.15.17-.23l40.66 56H55.69ZM180 144a36 36 0 0 0-35.77 32h-32.46a36 36 0 1 0-1.83 16h36.12A36 36 0 1 0 180 144M76 200a20 20 0 1 1 20-20a20 20 0 0 1-20 20m104 0a20 20 0 1 1 20-20a20 20 0 0 1-20 20"
      >
      </path>
    </svg>
  );
}

/**
 * Webgal图标
 */
export function WebgalIcon(
  props: SVGProps<SVGSVGElement>,
) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      version="1.0"
      width="1em"
      height="1em"
      {...props}
      viewBox="0 0 512.000000 512.000000"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* 在路径上绘制描边，使用 transform 保持与原来的比例与位置一致 */}
      <g transform="translate(0.000000,512.000000) scale(0.100000,-0.100000)" fill="none" stroke="currentColor" strokeWidth="40" strokeLinejoin="round" strokeLinecap="round">
        <path d="M0 2560 l0 -2560 898 0 897 1 -68 36 c-131 70 -230 208 -278 389 -27 101 -38 386 -19 502 28 177 119 349 234 444 112 94 239 138 396 138 159 0 286 -43 383 -131 l42 -38 -64 -64 -63 -65 -56 39 c-160 113 -382 102 -504 -24 -56 -57 -91 -123 -120 -222 -20 -71 -23 -101 -22 -270 0 -206 13 -292 57 -389 84 -183 279 -242 510 -156 l57 21 0 215 0 214 -134 0 -134 0 -11 63 c-6 35 -11 76 -11 90 l0 27 255 0 255 0 0 -360 0 -359 -32 -17 c-18 -10 -69 -32 -113 -50 l-80 -33 187 -1 187 0 29 93 c17 50 112 346 212 657 99 311 194 603 209 650 l28 85 137 0 138 0 78 -240 c43 -132 142 -438 220 -680 78 -242 150 -468 161 -503 l21 -62 149 0 149 0 2 743 3 742 110 0 110 0 3 -647 2 -648 328 0 c181 0 331 -2 333 -5 3 -2 0 -45 -6 -95 l-11 -90 33 0 33 0 -1 1053 c0 861 -3 1045 -13 1012 -18 -59 -33 -83 -85 -138 -52 -55 -143 -105 -241 -132 -53 -14 -119 -19 -352 -22 l-288 -5 0 747 0 747 278 -5 c221 -3 289 -7 337 -21 198 -56 289 -153 302 -318 12 -160 -71 -292 -214 -342 l-38 -13 68 -22 c37 -13 88 -37 114 -55 51 -35 107 -109 122 -160 6 -19 10 515 10 1382 l1 1412 -2560 0 -2560 0 0 -2560z m1593 658 c3 -24 34 -299 69 -611 34 -313 64 -565 65 -560 3 8 163 1031 163 1039 0 2 56 4 124 4 l124 0 6 -37 c9 -57 114 -771 133 -902 9 -63 18 -110 20 -105 1 5 34 263 73 574 39 311 73 582 77 603 l6 37 98 0 c80 0 99 -3 99 -14 0 -8 -45 -325 -100 -703 -55 -378 -103 -707 -107 -731 l-6 -43 -136 3 -136 3 -76 520 c-41 286 -77 526 -80 533 -2 7 -35 -203 -73 -465 -38 -263 -73 -504 -78 -535 l-10 -58 -138 0 -138 0 -6 38 c-4 20 -42 305 -86 632 -44 327 -86 644 -95 704 -8 60 -15 111 -15 113 0 2 49 3 109 3 l108 0 6 -42z m2182 -25 c-4 -37 -11 -77 -16 -90 l-9 -23 -305 0 -305 0 0 -230 0 -230 270 0 270 0 0 -90 0 -90 -270 0 -270 0 0 -245 0 -245 330 0 330 0 0 -90 0 -90 -445 0 -445 0 0 745 0 745 436 0 436 0 -7 -67z" />
        <path d="M4360 2865 l0 -225 143 0 c78 0 158 5 178 10 99 28 149 100 149 215 -1 171 -86 225 -357 225 l-113 0 0 -225z" />
        <path d="M4360 2204 l0 -256 168 4 c180 6 226 16 290 65 48 37 72 93 72 177 0 93 -17 143 -65 192 -59 59 -123 74 -313 74 l-152 0 0 -256z" />
        <path d="M3147 917 c-59 -199 -108 -365 -107 -369 0 -5 99 -8 220 -8 121 0 220 3 220 8 1 14 -215 732 -220 732 -3 0 -54 -163 -113 -363z" />
        <path d="M2928 188 l-54 -183 193 -3 c106 -1 280 -1 386 0 l193 3 -52 172 c-28 94 -55 176 -58 182 -5 8 -95 11 -280 11 l-273 0 -55 -182z" />
      </g>
      {/* 使用 mask 将原本填充的路径作为“孔”挖掉，从而实现透明/填充反转；同时在路径上绘制描边 */}
      <defs>
        <mask id="webgal-invert-mask">
          <rect width="100%" height="100%" fill="white" />
          <g transform="translate(0.000000,512.000000) scale(0.100000,-0.100000)" fill="black" stroke="none">
            <path d="M0 2560 l0 -2560 898 0 897 1 -68 36 c-131 70 -230 208 -278 389 -27 101 -38 386 -19 502 28 177 119 349 234 444 112 94 239 138 396 138 159 0 286 -43 383 -131 l42 -38 -64 -64 -63 -65 -56 39 c-160 113 -382 102 -504 -24 -56 -57 -91 -123 -120 -222 -20 -71 -23 -101 -22 -270 0 -206 13 -292 57 -389 84 -183 279 -242 510 -156 l57 21 0 215 0 214 -134 0 -134 0 -11 63 c-6 35 -11 76 -11 90 l0 27 255 0 255 0 0 -360 0 -359 -32 -17 c-18 -10 -69 -32 -113 -50 l-80 -33 187 -1 187 0 29 93 c17 50 112 346 212 657 99 311 194 603 209 650 l28 85 137 0 138 0 78 -240 c43 -132 142 -438 220 -680 78 -242 150 -468 161 -503 l21 -62 149 0 149 0 2 743 3 742 110 0 110 0 3 -647 2 -648 328 0 c181 0 331 -2 333 -5 3 -2 0 -45 -6 -95 l-11 -90 33 0 33 0 -1 1053 c0 861 -3 1045 -13 1012 -18 -59 -33 -83 -85 -138 -52 -55 -143 -105 -241 -132 -53 -14 -119 -19 -352 -22 l-288 -5 0 747 0 747 278 -5 c221 -3 289 -7 337 -21 198 -56 289 -153 302 -318 12 -160 -71 -292 -214 -342 l-38 -13 68 -22 c37 -13 88 -37 114 -55 51 -35 107 -109 122 -160 6 -19 10 515 10 1382 l1 1412 -2560 0 -2560 0 0 -2560z m1593 658 c3 -24 34 -299 69 -611 34 -313 64 -565 65 -560 3 8 163 1031 163 1039 0 2 56 4 124 4 l124 0 6 -37 c9 -57 114 -771 133 -902 9 -63 18 -110 20 -105 1 5 34 263 73 574 39 311 73 582 77 603 l6 37 98 0 c80 0 99 -3 99 -14 0 -8 -45 -325 -100 -703 -55 -378 -103 -707 -107 -731 l-6 -43 -136 3 -136 3 -76 520 c-41 286 -77 526 -80 533 -2 7 -35 -203 -73 -465 -38 -263 -73 -504 -78 -535 l-10 -58 -138 0 -138 0 -6 38 c-4 20 -42 305 -86 632 -44 327 -86 644 -95 704 -8 60 -15 111 -15 113 0 2 49 3 109 3 l108 0 6 -42z m2182 -25 c-4 -37 -11 -77 -16 -90 l-9 -23 -305 0 -305 0 0 -230 0 -230 270 0 270 0 0 -90 0 -90 -270 0 -270 0 0 -245 0 -245 330 0 330 0 0 -90 0 -90 -445 0 -445 0 0 745 0 745 436 0 436 0 -7 -67z" />
            <path d="M4360 2865 l0 -225 143 0 c78 0 158 5 178 10 99 28 149 100 149 215 -1 171 -86 225 -357 225 l-113 0 0 -225z" />
            <path d="M4360 2204 l0 -256 168 4 c180 6 226 16 290 65 48 37 72 93 72 177 0 93 -17 143 -65 192 -59 59 -123 74 -313 74 l-152 0 0 -256z" />
            <path d="M3147 917 c-59 -199 -108 -365 -107 -369 0 -5 99 -8 220 -8 121 0 220 3 220 8 1 14 -215 732 -220 732 -3 0 -54 -163 -113 -363z" />
            <path d="M2928 188 l-54 -183 193 -3 c106 -1 280 -1 386 0 l193 3 -52 172 c-28 94 -55 176 -58 182 -5 8 -95 11 -280 11 l-273 0 -55 -182z" />
          </g>
        </mask>
      </defs>
      {/* 背景使用当前颜色填充，mask 决定哪些区域被挖空（即原来填充的部分变为透明） */}
      <rect width="100%" height="100%" fill="currentColor" mask="url(#webgal-invert-mask)" />
      {/* 顶层矩形边框（不受 mask 影响），留出 8px 内边距 */}
      <rect x="12" y="12" width="496" height="496" fill="none" stroke="currentColor" strokeWidth="24" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// 放大图标
// 其他关键词：加号，增加，放大镜，缩放，放大操作
export function ZoomInIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

// 缩小图标
// 其他关键词：减号，减少，缩小镜，缩放，缩小操作
export function ZoomOutIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

// 逆时针旋转图标（线框样式）
// 其他关键词：撤销，返回，左旋转，刷新，重置
export function RotateLeftIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

// 顺时针旋转图标（线框样式）
// 其他关键词：重做，前进，右旋转，刷新，重置
export function RotateRightIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

// 连接点图标（被动态组件复用）
// 其他关键词：节点，链接，关系图，网络，拓扑，动态
export function ConnectionIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-base-content"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="9" cy="9" r="2" />
      <path d="M13 19l6-6" />
      <path d="m21 3-6 6" />
      <path d="m11 11 6 6" />
      <circle cx="20" cy="20" r="2" />
      <circle cx="20" cy="4" r="2" />
      <circle cx="4" cy="20" r="2" />
    </svg>
  );
}

export function SidebarSimpleIcon() {
  return (
    <PhosphorSidebarSimpleIcon weight="bold" size={20} />
  );
}

// 加号图标
export function AddIcon() {
  return (
    <PlusIcon weight="bold" size={20} />
  );
}

// 空心五角星图标
export function RoundStarBorder(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        d="m19.65 9.04l-4.84-.42l-1.89-4.45c-.34-.81-1.5-.81-1.84 0L9.19 8.63l-4.83.41c-.88.07-1.24 1.17-.57 1.75l3.67 3.18l-1.1 4.72c-.2.86.73 1.54 1.49 1.08l4.15-2.5l4.15 2.51c.76.46 1.69-.22 1.49-1.08l-1.1-4.73l3.67-3.18c.67-.58.32-1.68-.56-1.75M12 15.4l-3.76 2.27l1-4.28l-3.32-2.88l4.38-.38L12 6.1l1.71 4.04l4.38.38l-3.32 2.88l1 4.28z"
      >
      </path>
    </svg>
  );
}

// 实心五角星图标
export function RoundStarFilled(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        d="m12 17.27l-4.15 2.51c-.76.46-1.69-.22-1.49-1.08l1.1-4.73l-3.67-3.18c-.67-.58-.32-1.68.56-1.75l4.84-.42l1.89-4.45c.34-.81 1.5-.81 1.84 0l1.89 4.45l4.84.42c.88.07 1.24 1.17.57 1.75l-3.67 3.18l1.1 4.73c.2.86-.73 1.54-1.49 1.08z"
      />
    </svg>
  );
}

// 不感兴趣图标
export function DislikeLine(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        d="m2.808 1.393l18.385 18.385l-1.415 1.414l-3.746-3.747L12 21.485l-8.478-8.492a6 6 0 0 1 .033-8.023L1.394 2.808zm2.172 10.23L12 18.654l2.618-2.623l-9.646-9.645a4 4 0 0 0 .008 5.237m15.263-6.866a6 6 0 0 1 .236 8.236l-1.635 1.636l-1.414-1.414l1.59-1.592a4 4 0 0 0-5.683-5.606l-1.335 1.198l-1.336-1.197a4 4 0 0 0-1.155-.723l-2.25-2.25A6 6 0 0 1 12 4.53a6 6 0 0 1 8.242.228"
      >
      </path>
    </svg>
  );
}

// 对勾图标
// 其他关键词：确认，完成，勾选，成功，正确
export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      {...props}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
// 返回箭头图标（粗体填充样式）
// 其他关键词：后退，返回上一级，撤销
export function ArrowBackThickFill(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M10 2a1 1 0 0 0-1.79-.614l-7 9a1 1 0 0 0 0 1.228l7 9A1 1 0 0 0 10 20v-3.99c5.379.112 7.963 1.133 9.261 2.243c1.234 1.055 1.46 2.296 1.695 3.596l.061.335a1 1 0 0 0 1.981-.122c.171-2.748-.086-6.73-2.027-10.061C19.087 8.768 15.695 6.282 10 6.022z"
        clipRule="evenodd"
      >
      </path>
    </svg>
  );
}

// 下载图标
export function SharpDownload(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7zM5 18v2h14v-2z"></path>
    </svg>
  );
}

// 链接图标
export function Link(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        d="m12.922 16.587l-3.671 3.671a3.896 3.896 0 0 1-5.504-5.509l-.002.002l3.671-3.671a1.3 1.3 0 0 0-1.837-1.835l.001-.001l-3.671 3.671a6.494 6.494 0 0 0 9.187 9.175l-.003.002l3.671-3.671a1.3 1.3 0 0 0-1.837-1.835l.001-.001zM24.007 6.489A6.494 6.494 0 0 0 12.921 1.9L9.25 5.571a1.3 1.3 0 1 0 1.835 1.837l.001-.001l3.671-3.671a3.896 3.896 0 0 1 5.504 5.509l.002-.002l-3.671 3.671a1.3 1.3 0 1 0 1.835 1.837l.001-.001l3.671-3.671a6.43 6.43 0 0 0 1.908-4.58V6.49z"
      >
      </path>
      <path
        fill="currentColor"
        d="M7.412 16.592c.235.235.559.38.918.38s.683-.145.918-.38L16.59 9.25a1.3 1.3 0 0 0-1.837-1.835l.001-.001l-7.342 7.342c-.235.235-.38.559-.38.918s.145.683.38.918"
      >
      </path>
    </svg>
  );
}
// 三个向上小箭头图标（带动画效果）
// 其他关键词：更多，展开，加载更多，提交
export function ChevronSmallTripleUp(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeDasharray="10"
        strokeDashoffset="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <path d="M12 14l-5 5M12 14l5 5">
          <animate
            fill="freeze"
            attributeName="stroke-dashoffset"
            dur="0.3s"
            values="10;0"
          >
          </animate>
        </path>
        <path d="M12 9l-5 5M12 9l5 5">
          <animate
            fill="freeze"
            attributeName="stroke-dashoffset"
            begin="0.3s"
            dur="0.3s"
            values="10;0"
          >
          </animate>
        </path>
        <path d="M12 4l-5 5M12 4l5 5">
          <animate
            fill="freeze"
            attributeName="stroke-dashoffset"
            begin="0.6s"
            dur="0.3s"
            values="10;0"
          >
          </animate>
        </path>
      </g>
    </svg>
  );
}

// 小方块图标
// 其他关键词：更多，拓展
export function BaselineAutoAwesomeMotion(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        d="M14 2H4a2 2 0 0 0-2 2v10h2V4h10zm4 4H8a2 2 0 0 0-2 2v10h2V8h10zm2 4h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2"
      >
      </path>
    </svg>
  );
}

// 过滤图标
// 其他关键词：筛选、过滤、漏斗
export function Filter(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M22 3H2l8 9.46V19l4 2v-8.54z"
      >
      </path>
    </svg>
  );
}
// 左箭头
export function Arrowleft(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      {...props}
    >
      <path
        fill="currentColor"
        d="M20.834 8.037L9.64 14.5c-1.43.824-1.43 2.175 0 3l11.194 6.463c1.43.826 2.598.15 2.598-1.5V9.537c0-1.65-1.17-2.326-2.598-1.5"
      >
      </path>
    </svg>
  );
}
// 右箭头
export function Arrowright(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      {...props}
    >
      <path
        fill="currentColor"
        d="M11.166 23.963L22.36 17.5c1.43-.824 1.43-2.175 0-3L11.165 8.037c-1.43-.826-2.598-.15-2.598 1.5v12.926c0 1.65 1.17 2.326 2.598 1.5z"
      >
      </path>
    </svg>
  );
}

// 解锁图标
export function LockKeyholeOpen(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <circle cx="12" cy="16" r="1"></circle>
        <rect width="18" height="12" x="3" y="10" rx="2"></rect>
        <path d="M7 10V7a5 5 0 0 1 9.33-2.5"></path>
      </g>
    </svg>
  );
}

// 锁图标
export function LockKeyhole(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <circle cx="12" cy="16" r="1"></circle>
        <rect width="18" height="12" x="3" y="10" rx="2"></rect>
        <path d="M7 10V7a5 5 0 0 1 10 0v3"></path>
      </g>
    </svg>
  );
}

// 编辑图标
export function Edit2Outline(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        d="M19 20H5a1 1 0 0 0 0 2h14a1 1 0 0 0 0-2M5 18h.09l4.17-.38a2 2 0 0 0 1.21-.57l9-9a1.92 1.92 0 0 0-.07-2.71L16.66 2.6A2 2 0 0 0 14 2.53l-9 9a2 2 0 0 0-.57 1.21L4 16.91a1 1 0 0 0 .29.8A1 1 0 0 0 5 18M15.27 4L18 6.73l-2 1.95L13.32 6Zm-8.9 8.91L12 7.32l2.7 2.7l-5.6 5.6l-3 .28Z"
      >
      </path>
    </svg>
  );
}

// 垃圾桶图标
export function BaselineDeleteOutline(props: SVGProps<SVGSVGElement>) {
  return (
    <TrashSimpleIcon {...props} />
  );
}
// 任务提醒图标
export function BaselineAnnouncement(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m-7 9h-2V5h2zm0 4h-2v-2h2z"
      >
      </path>
    </svg>
  );
}
// 提交的图标
export function BaselineBackup(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5c0-2.64-2.05-4.78-4.65-4.96M14 13v4h-4v-4H7l5-5l5 5z"
      >
      </path>
    </svg>
  );
}
// 发布图标
export function BaselineAssistant(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        d="M19 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h4l3 3l3-3h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m-5.12 10.88L12 17l-1.88-4.12L6 11l4.12-1.88L12 5l1.88 4.12L18 11z"
      >
      </path>
    </svg>
  );
}

// 播放图标
export function PlayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path fill="currentColor" d="M8 5v14l11-7z" />
    </svg>
  );
}

// 暂停图标
export function PauseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

// 音乐图标
export function MusicNote(props: SVGProps<SVGSVGElement>) {
  return (
    <MusicNotesIcon {...props} />
  );
}

// 简易 Map 图标，占位用
export function MapPlaceHolderIcon(props: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={props.className ?? "w-5 h-5"}
    >
      <path d="M9.5 4.5 3 6.75v12l6.5-2.25 6 2.25L21 16.5v-12l-5.5 2.25-6-2.25zM9.5 6.9v11.1L4.5 19.5V8.4l5-1.5zm1.5.45 5 1.875V20.1l-5-1.875V7.35zM19.5 6.6v10.95l-2.5 1v-11l2.5-0.95z" />
    </svg>
  );
}

// 复制图标
// 其他关键词：复制，拷贝，duplicate，copy
export function CopyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      width="1em"
      height="1em"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

// 滑动条/设置图标
// 其他关键词：设置，调节，配置，sliders，settings
export function SlidersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      width="1em"
      height="1em"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  );
}

// 保存/勾选图标
// 其他关键词：确认，保存，完成，check，save
export function SaveIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      width="1em"
      height="1em"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 6L9 17l-5-5" />
    </svg>
  );
}

// 编辑图标
// 其他关键词：编辑，修改，笔，edit，pencil
export function EditIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      width="1em"
      height="1em"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4H4v14a2 2 0 002 2h12a2 2 0 002-2v-7" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" />
    </svg>
  );
}

// 垃圾桶删除图标
// 其他关键词：删除，移除，垃圾桶，delete，trash
export function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      width="1em"
      height="1em"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

// 关闭/X图标
// 其他关键词：关闭，取消，叉，close，x
export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      width="1em"
      height="1em"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// 星星收藏图标
// 其他关键词：收藏，喜欢，星标，favorite，star
export function StarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      width="1em"
      height="1em"
      {...props}
    >
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}

// 警告/提示图标
// 其他关键词：警告，提醒，注意，warning，alert
export function AlertIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      width="1em"
      height="1em"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

// 信息图标
// 其他关键词：信息，详情，info，information
export function InfoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      width="1em"
      height="1em"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// 右箭头图标
// 其他关键词：箭头，向右，next，arrow right
export function ChevronRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      width="1em"
      height="1em"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

// 麦克风图标
// 其他关键词：麦克风，录音，语音，microphone，voice
export function MicrophoneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      width="1em"
      height="1em"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

// 骰子图标（五点）
// 其他关键词：骰子，D6，游戏，dice
export function DiceFiveIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      width="1em"
      height="1em"
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="7" cy="7" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="17" cy="17" r="1.5" fill="currentColor" />
      <circle cx="7" cy="17" r="1.5" fill="currentColor" />
      <circle cx="17" cy="7" r="1.5" fill="currentColor" />
    </svg>
  );
}

// 富文本编辑器的icon
// 其他关键词：文本，编辑，文章，document，text
export function BaselineAssignment(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="currentColor"
        d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-7 0c.55 0 1 .45 1 1s-.45 1-1 1s-1-.45-1-1s.45-1 1-1m2 14H7v-2h7zm3-4H7v-2h10zm0-4H7V7h10z"
      >
      </path>
    </svg>
  );
}
