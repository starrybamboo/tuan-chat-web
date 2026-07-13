import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";

import { reportLoginEasterEggAnalytics } from "@/utils/loginEasterEggAnalytics";

const TITLE_CHARACTERS = ["团", "剧", "共", "创"] as const;
const SUBTITLE_DELAY_SECONDS = 0.86;
const TRAILING_ALIGNMENT_PUNCTUATION = /([！!]+)$/;
const EASTER_EGG_DISCOVERY_CLICK_COUNT = 4;

// 立绘图片。只保留开心状态，避免出现无语或生气表情。
const BRAND_IMAGE = {
  peek: "/login-brand-peek.png",
} as const;

// 登录页品牌区的「戳猫娘」小故事：每次点击推进一步，按 clickCount 取对应节拍。
// 弧线：默认 slogan → 童话开场 → 老和尚后遇到小狐狸 → 小狐狸躲回故事里 → 循环继续（单向，不重置）。
const STORY_BEATS = [
  { at: 0, line: "书写你的故事", image: null }, // 默认 slogan（品牌主文案）
  { at: 1, line: "从前有座山", image: null }, // 童话开场
  { at: 2, line: "山里有座庙", image: null }, // 童话递进
  { at: 3, line: "庙里有个老和尚", image: null }, // 童话铺垫
  { at: 4, line: "还有只小狐狸！", image: "peek" }, // 小狐狸探头
  { at: 5, line: "小狐狸非常开心有人能发现自己", image: "peek" }, // 探头（开心）
  { at: 6, line: "你真是个温柔体贴、热情大方，善解人意、和蔼可亲的人类", image: "peek" }, // 探头·认真夸奖
  { at: 7, line: "我好喜欢你！", image: "peek" }, // 开心
  { at: 8, line: "欸？太草率了嘛？", image: "peek" }, // 开心·害羞
  { at: 9, line: "抱歉，我不知道人类应该怎么表达自己的喜欢", image: "peek" }, // 开心·害羞解释
  { at: 10, line: "总而言之", image: "peek" }, // 开心·整理情绪
  { at: 11, line: "不要告诉别人哦", image: "peek" }, // 开心·悄悄叮嘱
  { at: 12, line: "这是我们两个人之间的秘密", image: "peek" }, // 开心·分享秘密
  { at: 13, line: "那我先躲回故事里啦", image: "peek" }, // 开心·准备躲回去
  { at: 14, line: "以后也许我们还能见面！", image: null }, // 躲回故事里
  { at: 15, line: "故事还在继续", image: null }, // 回到童话叙事
  { at: 16, line: "老和尚给小和尚讲故事", image: null }, // 循环引子
  { at: 17, line: "它讲的是", image: null }, // 准备重复
  { at: 18, line: "从前有座山", image: null }, // 循环重复
  { at: 19, line: "山里有座庙", image: null }, // 循环重复
  { at: 20, line: "庙里有个老和尚", image: null }, // 循环重复
  { at: 21, line: "给小和尚讲故事", image: null }, // 循环完成
] as const;

const STORY_LAST_AT = STORY_BEATS[STORY_BEATS.length - 1].at;
type StoryBeat = (typeof STORY_BEATS)[number];

// 取 clickCount 对应的节拍：最后一个 at <= clickCount 的那段。
function resolveStoryBeat(clickCount: number): StoryBeat {
  let beat: StoryBeat = STORY_BEATS[0];
  for (const candidate of STORY_BEATS) {
    if (candidate.at <= clickCount) {
      beat = candidate;
    }
  }
  return beat;
}

function splitSubtitleForAlignment(subtitle: string) {
  const match = subtitle.match(TRAILING_ALIGNMENT_PUNCTUATION);
  if (!match) {
    return { core: subtitle, trailing: "" };
  }
  return {
    core: subtitle.slice(0, -match[1].length),
    trailing: match[1],
  };
}

export function LoginBrandIntro() {
  const reduceMotion = useReducedMotion();
  const clickControls = useAnimationControls();
  const [clickCount, setClickCount] = useState(0);
  const clickCountRef = useRef(0);

  const beat = resolveStoryBeat(clickCount);
  const subtitle = beat.line;
  const { core: subtitleCore, trailing: subtitleTrailing } = splitSubtitleForAlignment(subtitle);
  const imageSrc = beat.image === null ? null : BRAND_IMAGE[beat.image];

  const handleClick = () => {
    // 故事单向推进，走到她「走了」即结束，不再重新召唤。
    const nextClickCount = Math.min(clickCountRef.current + 1, STORY_LAST_AT);
    clickCountRef.current = nextClickCount;
    setClickCount(nextClickCount);

    if (nextClickCount === EASTER_EGG_DISCOVERY_CLICK_COUNT) {
      void reportLoginEasterEggAnalytics("login_easter_egg_discovered");
    }

    if (reduceMotion) {
      return;
    }

    void clickControls.start({
      rotate: [0, -1.4, 1.4, 0],
      scale: [1, 0.97, 1.03, 1],
      transition: { duration: 0.34, ease: "easeOut" },
    });
  };

  return (
    <motion.button
      type="button"
      aria-label="团剧共创。点按几下，看看会发生什么。"
      onClick={handleClick}
      animate={clickControls}
      className="
        group relative isolate inline-flex flex-col items-center rounded-md px-5 py-4
        text-center transition-colors duration-200 hover:bg-base-content/5
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30
      "
    >
      <AnimatePresence mode="wait">
        {imageSrc && (
          <motion.img
            key={imageSrc}
            src={imageSrc}
            alt=""
            aria-hidden="true"
            className="
              pointer-events-none absolute bottom-[calc(100%-0.35rem)] left-1/2
              z-0 size-24 -translate-x-1/2 object-contain drop-shadow-xl
              sm:size-28
            "
            // 立绘入场：从下方「藏着」→ 好奇探出(歪头偷看) → 缩一下 → 归位，四段关键帧模拟探头探脑。
            // 起始压低(y:56)+透明，探出时图片(z-0)从 logo 文字(z-10)后方升起，强化「从 logo 后探出」的语义。
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 56, scale: 0.82, rotate: 0 }}
            animate={
              reduceMotion
                ? { opacity: 1 }
                : {
                    opacity: [0, 1, 1, 1],
                    y: [56, -8, 10, 0],
                    scale: [0.82, 1.05, 0.97, 1],
                    rotate: [0, -4, 3, 0],
                  }
            }
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 28, scale: 0.9, rotate: 4, transition: { duration: 0.32, ease: "easeIn" } }
            }
            transition={
              reduceMotion ? { duration: 0 } : { duration: 0.8, ease: "easeOut", times: [0, 0.45, 0.75, 1] }
            }
          />
        )}
      </AnimatePresence>

      <motion.div
        className="
          relative z-10 flex items-center justify-center pl-[0.24em] text-[2rem] font-normal
          leading-none tracking-[0.24em] text-base-content transition-colors
          group-hover:text-primary sm:text-[2.35rem]
        "
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: {
              delayChildren: 0.08,
              staggerChildren: 0.16,
            },
          },
        }}
        aria-hidden="true"
      >
        {TITLE_CHARACTERS.map(character => (
          <motion.span
            key={character}
            className="inline-block"
            variants={{
              hidden: { opacity: 0, y: "0.35em", filter: "blur(8px)" },
              visible: {
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                transition: { duration: 0.36, ease: "easeOut" },
              },
            }}
          >
            {character}
          </motion.span>
        ))}
      </motion.div>

      <div
        className="
          relative z-10 mt-3 flex min-h-5 items-center justify-center text-xs font-light
          leading-none tracking-[0.16em] text-base-content/55 sm:text-sm
        "
        aria-hidden="true"
      >
        {reduceMotion
          ? <span>{subtitle}</span>
          : (
              <span className="relative inline-flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={`${beat.at}:${subtitle}`}
                    className="relative inline-block overflow-hidden whitespace-nowrap text-center"
                    initial={{ maxWidth: 0, opacity: 0 }}
                    animate={{ maxWidth: `${subtitleCore.length * 1.16 + 0.4}em`, opacity: 1 }}
                    exit={{ maxWidth: 0, opacity: 0, transition: { duration: 0.2, ease: "easeIn" } }}
                    transition={{ delay: clickCount === 0 ? SUBTITLE_DELAY_SECONDS : 0, duration: 0.5, ease: "linear" }}
                  >
                    {subtitleCore}
                    {subtitleTrailing && (
                      <span className="pointer-events-none absolute left-full">
                        {subtitleTrailing}
                      </span>
                    )}
                  </motion.span>
                </AnimatePresence>
                <motion.span
                  className="pointer-events-none absolute left-full ml-1 inline-block h-[0.9em] w-0.5 bg-primary"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{
                    delay: SUBTITLE_DELAY_SECONDS,
                    duration: 1,
                    repeat: Infinity,
                    repeatDelay: 0.08,
                  }}
                />
              </span>
            )}
      </div>
    </motion.button>
  );
}
