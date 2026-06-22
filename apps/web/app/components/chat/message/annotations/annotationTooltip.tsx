import type { ReactNode } from "react";

import type { AnnotationDefinition } from "@/components/chat/message/annotations/annotationCatalog";

import PortalTooltip from "@/components/common/portalTooltip";
import { getEffectDurationMs } from "@/types/messageAnnotations";

type AnnotationTooltipDoc = {
  summary: string;
  details?: string[];
  webgal?: string[];
  notes?: string[];
};

type AnnotationTooltipProps = {
  annotation: AnnotationDefinition;
  children: ReactNode;
};

const TOOLTIP_DELAY_MS = 0;

const POSITION_DOCS: Record<string, { slotId: string; offsetX: number; name: string }> = {
  "figure.pos.left": { slotId: "1", offsetX: -840, name: "左" },
  "figure.pos.left-center": { slotId: "2", offsetX: -420, name: "左中" },
  "figure.pos.center": { slotId: "3", offsetX: 0, name: "中" },
  "figure.pos.right-center": { slotId: "4", offsetX: 420, name: "右中" },
  "figure.pos.right": { slotId: "5", offsetX: 840, name: "右" },
};

const TRANSITION_ANIMATION_DOCS: Record<string, { param: "-enter" | "-exit"; value: string; type: string }> = {
  "figure.anim.enter": { param: "-enter", value: "position/enter", type: "进场" },
  "figure.anim.exit": { param: "-exit", value: "position/exit", type: "出场" },
  "figure.anim.ba-enter-from-left": { param: "-enter", value: "position/ba-enter-from-left", type: "进场" },
  "figure.anim.ba-enter-from-right": { param: "-enter", value: "position/ba-enter-from-right", type: "进场" },
  "figure.anim.ba-exit-to-left": { param: "-exit", value: "position/ba-exit-to-left", type: "出场" },
  "figure.anim.ba-exit-to-right": { param: "-exit", value: "position/ba-exit-to-right", type: "出场" },
};

const ACTION_ANIMATION_DOCS: Record<string, string> = {
  "figure.anim.ba-down": "action/BA-down",
  "figure.anim.ba-left-falldown": "action/BA-left-falldown",
  "figure.anim.ba-right-falldown": "action/BA-right-falldown",
  "figure.anim.ba-jump-twice": "action/BA-jump-twice",
  "figure.anim.ba-jump": "action/BA-jump",
  "figure.anim.ba-shake": "action/BA-shake",
  "figure.anim.ba-bigshake": "action/BA-bigshake",
};

const STATIC_DOCS: Record<string, AnnotationTooltipDoc> = {
  "sys:bgm": {
    summary: "把这条音频作为背景音乐播放。",
    notes: ["同一条音频不要同时标 BGM 和音效；解析时 BGM 优先。"],
  },
  "sys:se": {
    summary: "把这条音频作为音效播放。",
    notes: ["没有 loopId 时就是一次性音效。"],
  },
  "sys:cg": {
    summary: "把这张图片收录进 CG 鉴赏。",
  },
  "sys:bg": {
    summary: "把这张图片设为当前场景背景。",
  },
  "image.show": {
    summary: "把图片显示在常驻展示图层，直到遇到“清除展示图”。",
  },
  "figure.mini-avatar": {
    summary: "强制本条文本或骰子消息显示小头像。",
  },
  "dialog.notend": {
    summary: "使用 WebGAL say 参数 `notend`：显示完所有文字后，立刻执行下一条命令。",
    details: [
      "WebGAL 文档：当值为 `true` 时，显示完所有文字后，立刻执行下一条命令，即使玩家未开启自动播放。",
      "WebGAL 文档：`-notend` 代表本句对话没有结束，在后面可能连接演出或对话。",
      "本项目映射：对普通对白追加 -notend；对黑屏文字 intro 来说，这个标注意味着不加 -hold。",
    ],
    webgal: [
      "角色名: 文本 -notend;",
      "intro:文本;  // 不带 -hold",
    ],
    notes: ["WebGAL 内部对 -notend 对话不单独保存 backlog，通常和下一句续接使用。"],
  },
  "dialog.concat": {
    summary: "使用 WebGAL say 参数 `concat`：新文字接续在对话框已有文字后面。",
    details: [
      "WebGAL 文档：当值为 `true` 时，不会清空对话框内已有的文字，而是在此基础上，让新文字接续在后面。",
      "WebGAL 文档：`-concat` 代表本句对话连接在上一句对话之后。",
      "本项目映射：对普通对白/对话模式骰子追加 -concat；旁白行当前不会追加 -concat。",
    ],
    webgal: [
      "角色名: 后半句 -concat;",
    ],
    notes: ["旁白行当前不会追加 -concat；需要角色对白行才会生效。"],
  },
  "dialog.next": {
    summary: "使用 WebGAL 通用参数 `next`：在执行当前语句的同时，同步执行接下来的语句。",
    details: [
      "WebGAL 文档：当值为 `true` 时，在执行当前语句的同时，同步执行接下来的语句，直至找到 `next` 为 `false` 的语句为止。",
      "WebGAL 文档：部分命令与 `next` 参数不兼容，例如在 `wait` 命令加 `next` 参数，等待不会生效。",
      "本项目映射：对文本/骰子对白追加 -next，适合让立绘、背景、音效和下一句同时生效。",
    ],
    webgal: [
      "角色名: 文本 -next;",
    ],
    notes: ["不要把它当作“演出结束后下一句”；等待类命令加 -next 可能导致等待失效。"],
  },
  "video.skipoff": {
    summary: "播放这条视频时禁止双击跳过。",
  },
  "scene.effect.rain": {
    summary: "开启下雨场景特效。",
  },
  "scene.effect.snow": {
    summary: "开启下雪场景特效。",
  },
  "scene.effect.sakura": {
    summary: "开启樱花飘落场景特效。",
  },
  "scene.effect.stop": {
    summary: "停止当前雨、雪、樱花等场景特效。",
  },
  "image.clear": {
    summary: "清除由“展示”标注显示的常驻图片。",
  },
  "background.clear": {
    summary: "清除当前背景图。",
  },
  "bgm.clear": {
    summary: "停止当前背景音乐。",
  },
  "figure.clear": {
    summary: "清除当前角色立绘槽位。",
  },
};

function buildPositionDoc(annotation: AnnotationDefinition): AnnotationTooltipDoc | null {
  const position = POSITION_DOCS[annotation.id];
  if (!position) {
    return null;
  }
  return {
    summary: `把本条角色立绘放到${position.name}位置。`,
  };
}

function buildTransitionAnimationDoc(annotation: AnnotationDefinition): AnnotationTooltipDoc | null {
  const animation = TRANSITION_ANIMATION_DOCS[annotation.id];
  if (!animation) {
    return null;
  }
  return {
    summary: `给本条角色立绘添加${animation.type}动画。`,
  };
}

function buildActionAnimationDoc(annotation: AnnotationDefinition): AnnotationTooltipDoc | null {
  const animation = ACTION_ANIMATION_DOCS[annotation.id];
  if (!animation) {
    return null;
  }
  return {
    summary: "让本条角色立绘执行一次动作动画。",
  };
}

function buildCharacterEffectDoc(annotation: AnnotationDefinition): AnnotationTooltipDoc | null {
  if (!annotation.id.startsWith("effect.")) {
    return null;
  }
  const duration = getEffectDurationMs(annotation.id);
  return {
    summary: "在角色立绘附近播放一次表情特效。",
    notes: [
      ...(annotation.effectFrames ? [`资源帧数：${annotation.effectFrames}。`] : []),
      ...(duration ? [`播放时长约 ${duration}ms。`] : []),
    ],
  };
}

export function getAnnotationTooltipDoc(annotation: AnnotationDefinition): AnnotationTooltipDoc {
  return STATIC_DOCS[annotation.id]
    ?? buildPositionDoc(annotation)
    ?? buildTransitionAnimationDoc(annotation)
    ?? buildActionAnimationDoc(annotation)
    ?? buildCharacterEffectDoc(annotation)
    ?? {
      summary: "自定义标注，会原样保存在消息 annotations 数组里。",
      notes: [annotation.category ? `分类：${annotation.category}` : "分类：未分类"],
    };
}

export function AnnotationTooltipContent({ annotation }: { annotation: AnnotationDefinition }) {
  const doc = getAnnotationTooltipDoc(annotation);

  return (
    <div className="max-w-[380px]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold leading-5 text-base-content">
            {annotation.label}
          </div>
          <div className="mt-0.5 font-mono text-[10px] leading-none text-base-content/40">
            {annotation.id}
          </div>
        </div>
        {annotation.category
          ? (
              <div className="
                shrink-0 rounded-md bg-base-content/8 px-1.5 py-1 text-[10px]
                font-medium leading-none text-base-content/55
              ">
                {annotation.category}
              </div>
            )
          : null}
      </div>

      <div className="mt-3 space-y-2.5 text-[11px] leading-5 text-base-content/72">
        <div>{doc.summary}</div>

        {doc.details?.length
          ? (
              <div>
                <div className="mb-1 text-[10px] font-semibold leading-none text-base-content/45">底层行为</div>
                <ul className="space-y-1">
                  {doc.details.map(detail => (
                    <li key={detail} className="pl-2 before:mr-1 before:content-['·']">{detail}</li>
                  ))}
                </ul>
              </div>
            )
          : null}

        {doc.webgal?.length
          ? (
              <div>
                <div className="mb-1 text-[10px] font-semibold leading-none text-base-content/45">WebGAL 输出</div>
                <div className="space-y-1">
                  {doc.webgal.map(line => (
                    <code
                      key={line}
                      className="
                        block whitespace-pre-wrap break-words rounded-md
                        bg-base-content/8 px-2 py-1 font-mono text-[10px]
                        leading-4 text-base-content/78
                      "
                    >
                      {line}
                    </code>
                  ))}
                </div>
              </div>
            )
          : null}

        {doc.notes?.length
          ? (
              <div>
                <div className="mb-1 text-[10px] font-semibold leading-none text-base-content/45">注意</div>
                <ul className="space-y-1">
                  {doc.notes.map(note => (
                    <li key={note} className="pl-2 before:mr-1 before:content-['·']">{note}</li>
                  ))}
                </ul>
              </div>
            )
          : null}
      </div>
    </div>
  );
}

export default function AnnotationTooltip({ annotation, children }: AnnotationTooltipProps) {
  return (
    <PortalTooltip
      content={<AnnotationTooltipContent annotation={annotation} />}
      placement="top"
      gap={10}
      delayMs={TOOLTIP_DELAY_MS}
      className="
        portal-tooltip pointer-events-none z-[9999] rounded-xl border
        border-base-content/12 bg-base-100 px-3 py-3 text-base-content
        shadow-2xl shadow-black/30
      "
    >
      {children}
    </PortalTooltip>
  );
}
