import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "motion/react";
import { useState } from "react";

const TITLE_CHARACTERS = ["团", "剧", "共", "创"] as const;
// 副标题文案池：点击品牌区在这些文案间循环切换（首条为默认展示）。
const SUBTITLE_LINES = [
  "书写你的故事。",
  "每一刻，皆是序章。",
  "你的剧本，由你开启。",
  "让角色，再次发声。",
] as const;
const SUBTITLE_DELAY_SECONDS = 0.86;
const PEEK_CLICK_THRESHOLD = 4;
const REVEAL_CLICK_THRESHOLD = 8;
const PEEK_IMAGE_SRC = "/login-brand-peek.png";
const REVEAL_IMAGE_SRC = "/login-brand-reveal.png";

function resolveEasterEggImage(clickCount: number) {
  if (clickCount >= REVEAL_CLICK_THRESHOLD) {
    return REVEAL_IMAGE_SRC;
  }

  if (clickCount >= PEEK_CLICK_THRESHOLD) {
    return PEEK_IMAGE_SRC;
  }

  return null;
}

export function LoginBrandIntro() {
  const reduceMotion = useReducedMotion();
  const clickControls = useAnimationControls();
  const [clickCount, setClickCount] = useState(0);
  const easterEggImage = resolveEasterEggImage(clickCount);
  // 副标题随点击在文案池里循环切换（与探头/现身彩蛋共用同一个 clickCount）。
  const subtitle = SUBTITLE_LINES[clickCount % SUBTITLE_LINES.length];

  const handleClick = () => {
    setClickCount(current => current + 1);

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
      aria-label="团剧共创，书写你的故事。"
      onClick={handleClick}
      animate={clickControls}
      className="
        group relative isolate inline-flex flex-col items-center rounded-md px-5 py-4
        text-center transition-colors duration-200 hover:bg-base-content/5
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30
      "
    >
      <AnimatePresence mode="wait">
        {easterEggImage && (
          <motion.img
            key={easterEggImage}
            src={easterEggImage}
            alt=""
            aria-hidden="true"
            className="
              pointer-events-none absolute bottom-[calc(100%-0.35rem)] left-1/2
              z-0 size-24 -translate-x-1/2 object-contain drop-shadow-xl
              sm:size-28
            "
            // 探头入场：从下方「藏着」→ 好奇探出(歪头偷看) → 缩一下 → 归位，四段关键帧模拟探头探脑。
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
              <>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={subtitle}
                    className="inline-block overflow-hidden whitespace-nowrap"
                    initial={{ maxWidth: 0, opacity: 0 }}
                    animate={{ maxWidth: `${subtitle.length * 1.16 + 0.4}em`, opacity: 1 }}
                    exit={{ maxWidth: 0, opacity: 0, transition: { duration: 0.2, ease: "easeIn" } }}
                    transition={{ delay: clickCount === 0 ? SUBTITLE_DELAY_SECONDS : 0, duration: 0.5, ease: "linear" }}
                  >
                    {subtitle}
                  </motion.span>
                </AnimatePresence>
                <motion.span
                  className="ml-1 inline-block h-[0.9em] w-0.5 bg-primary"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{
                    delay: SUBTITLE_DELAY_SECONDS,
                    duration: 1,
                    repeat: Infinity,
                    repeatDelay: 0.08,
                  }}
                />
              </>
            )}
      </div>
    </motion.button>
  );
}
