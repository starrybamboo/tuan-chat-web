import type { MotionValue } from "motion/react";
import type { RefObject } from "react";
import type { Route } from "./+types/scrollSequenceMotionDemo";

import type { ProceduralRenderer } from "./scrollSequenceDemoShared";
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createSeoMeta } from "@/utils/seo";
import {
  clamp01,
  createProceduralSequence,
  drawHeroFrame,
  drawStageFrame,
  FLOW_CARDS,
  HERO_FRAME_COUNT,

  STAGE_FRAME_COUNT,
  STORY_STAGES,
  toFrameProgress,
} from "./scrollSequenceDemoShared";
import "./scrollSequenceDemo.css";

type CanvasSequence = NonNullable<ReturnType<typeof createProceduralSequence>>;

function useMotionCanvasSequence(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  frameCount: number,
  renderer: ProceduralRenderer,
  progress: MotionValue<number>,
) {
  const sequenceRef = useRef<CanvasSequence | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const sequence = createProceduralSequence(
      canvas,
      (context, width, height, nextProgress) => {
        renderer(context, width, height, toFrameProgress(nextProgress, frameCount));
      },
    );

    sequenceRef.current = sequence;

    return () => {
      sequenceRef.current = null;
      sequence?.destroy();
    };
  }, [canvasRef, frameCount, renderer]);

  useMotionValueEvent(progress, "change", (nextProgress) => {
    sequenceRef.current?.render(nextProgress);
  });
}

function useFlowMaxOffset(
  flowViewportRef: RefObject<HTMLDivElement | null>,
  flowTrackRef: RefObject<HTMLDivElement | null>,
) {
  const [maxOffset, setMaxOffset] = useState(0);

  useEffect(() => {
    const viewport = flowViewportRef.current;
    const track = flowTrackRef.current;
    if (!viewport || !track) {
      return;
    }

    const measure = () => {
      const nextOffset = Math.max(track.scrollWidth - viewport.clientWidth, 0);
      setMaxOffset(currentOffset => currentOffset === nextOffset ? currentOffset : nextOffset);
    };

    measure();

    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(measure)
      : null;

    resizeObserver?.observe(viewport);
    resizeObserver?.observe(track);
    window.addEventListener("resize", measure);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [flowViewportRef, flowTrackRef]);

  return maxOffset;
}

export function meta(_args: Route.MetaArgs) {
  return createSeoMeta({
    title: "团剧共创 Motion 展示页",
    description: "使用 Motion 实现的团剧共创沉浸式展示页。",
    path: "/scroll-sequence-motion-demo",
    index: false,
  });
}

export default function ScrollSequenceMotionDemoPage() {
  const heroSectionRef = useRef<HTMLElement>(null);
  const heroCanvasRef = useRef<HTMLCanvasElement>(null);
  const flowSectionRef = useRef<HTMLElement>(null);
  const stageCanvasRef = useRef<HTMLCanvasElement>(null);
  const flowViewportRef = useRef<HTMLDivElement>(null);
  const flowTrackRef = useRef<HTMLDivElement>(null);
  const [activeFlowIndex, setActiveFlowIndex] = useState(0);

  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroSectionRef,
    offset: ["start start", "end end"],
  });
  const heroProgress = useSpring(heroScrollProgress, {
    stiffness: 92,
    damping: 28,
    mass: 0.22,
  });

  const { scrollYProgress: flowScrollProgress } = useScroll({
    target: flowSectionRef,
    offset: ["start start", "end end"],
  });
  const flowProgress = useSpring(flowScrollProgress, {
    stiffness: 90,
    damping: 30,
    mass: 0.24,
  });

  const maxFlowOffset = useFlowMaxOffset(flowViewportRef, flowTrackRef);

  useMotionCanvasSequence(heroCanvasRef, HERO_FRAME_COUNT, drawHeroFrame, heroProgress);
  useMotionCanvasSequence(stageCanvasRef, STAGE_FRAME_COUNT, drawStageFrame, flowProgress);

  useMotionValueEvent(flowProgress, "change", (nextProgress) => {
    const nextIndex = Math.min(
      FLOW_CARDS.length - 1,
      Math.round(clamp01(nextProgress) * Math.max(FLOW_CARDS.length - 1, 1)),
    );
    setActiveFlowIndex(currentIndex => currentIndex === nextIndex ? currentIndex : nextIndex);
  });

  const heroSurfaceOpacity = useTransform(heroProgress, [0, 1], [1, 0.72]);
  const heroCopyOpacity = useTransform(heroProgress, [0, 0.28], [1, 0]);
  const heroCopyY = useTransform(heroProgress, [0, 0.28], [0, -56]);
  const heroCopyScale = useTransform(heroProgress, [0, 0.28], [1, 0.96]);
  const heroPanelOpacity = useTransform(heroProgress, [0.34, 0.58], [0, 1]);
  const heroPanelY = useTransform(heroProgress, [0.34, 0.58], [42, 0]);
  const scrollHintOpacity = useTransform(heroProgress, [0.08, 0.28], [1, 0]);
  const flowX = useTransform(flowProgress, [0, 1], [0, -maxFlowOffset]);

  return (
    <main className="scroll-sequence-demo scroll-sequence-demo--motion">
      <a className="scroll-sequence-demo__backLink" href="/">
        进入应用
      </a>
      <a className="scroll-sequence-demo__compareLink" href="/scroll-sequence-demo">
        GSAP 版
      </a>

      <section ref={heroSectionRef} className="scroll-sequence-demo__heroSection" style={{ position: "relative" }}>
        <div className="scroll-sequence-demo__heroSticky">
          <motion.div className="scroll-sequence-demo__heroSurface" style={{ opacity: heroSurfaceOpacity }} />
          <canvas ref={heroCanvasRef} className="scroll-sequence-demo__heroCanvas" aria-hidden="true" />

          <motion.div
            className="scroll-sequence-demo__heroCopy"
            style={{ opacity: heroCopyOpacity, scale: heroCopyScale, y: heroCopyY }}
          >
            <p className="scroll-sequence-demo__eyebrow">TUAN CHAT / ANIME ROLEPLAY STUDIO</p>
            <h1 className="scroll-sequence-demo__heroTitle">
              从一段发言，
              <br />
              踏进共创世界。
            </h1>
            <p className="scroll-sequence-demo__heroDescription">
              角色、分镜、素材与演出在同一条叙事线上汇合。
              每一次跑团现场，都可以生长成新的团剧。
            </p>
            <div className="scroll-sequence-demo__heroActions">
              <a href="/chat/discover/material">探索素材</a>
              <a href="/chat">进入房间</a>
            </div>
          </motion.div>

          <motion.aside
            className="scroll-sequence-demo__heroPanel"
            style={{ opacity: heroPanelOpacity, y: heroPanelY }}
          >
            <span className="scroll-sequence-demo__panelTag">LIVE STORYBOARD</span>
            <h2>把聊天现场，变成正在展开的动画分镜。</h2>
            <p>
              成员发言、角色状态、素材引用与舞台预览同步推进，灵感不再散落在多个窗口。
            </p>
          </motion.aside>

          <motion.div className="scroll-sequence-demo__scrollHint" style={{ opacity: scrollHintOpacity }}>
            向下滚动
          </motion.div>
        </div>
      </section>

      <section className="scroll-sequence-demo__chapters" aria-label="团剧共创创作阶段">
        {STORY_STAGES.map(stage => (
          <article key={stage.label} className="scroll-sequence-demo__chapter">
            <div className="scroll-sequence-demo__chapterInner">
              <h2>
                {stage.label}
                。
              </h2>
              <p className="scroll-sequence-demo__chapterTitle">{stage.title}</p>
              <p>{stage.description}</p>
            </div>
          </article>
        ))}
      </section>

      <section ref={flowSectionRef} className="scroll-sequence-demo__flowSection" style={{ position: "relative" }}>
        <div className="scroll-sequence-demo__flowSticky">
          <div className="scroll-sequence-demo__flowHeader">
            <p className="scroll-sequence-demo__eyebrow">FROM CHAT TO SCENE</p>
            <h2 className="scroll-sequence-demo__flowTitle">让故事像分镜一样被推进。</h2>
          </div>

          <div className="scroll-sequence-demo__flowLayout">
            <div className="scroll-sequence-demo__stageVisual">
              <canvas ref={stageCanvasRef} className="scroll-sequence-demo__stageCanvas" aria-hidden="true" />
              <div className="scroll-sequence-demo__stageMeter">
                <span>Scene Sync</span>
                <strong>180 Frames</strong>
              </div>
            </div>

            <div ref={flowViewportRef} className="scroll-sequence-demo__flowViewport">
              <motion.div ref={flowTrackRef} className="scroll-sequence-demo__flowTrack" style={{ x: flowX }}>
                {FLOW_CARDS.map((card, index) => {
                  const isActive = activeFlowIndex === index;
                  return (
                    <article
                      key={card.index}
                      className="scroll-sequence-demo__flowCard"
                      data-active={isActive ? "true" : "false"}
                      aria-current={isActive ? "true" : "false"}
                    >
                      <span className="scroll-sequence-demo__flowIndex">{card.index}</span>
                      <h3>{card.title}</h3>
                      <p>{card.description}</p>
                    </article>
                  );
                })}
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      <section className="scroll-sequence-demo__outro">
        <p className="scroll-sequence-demo__eyebrow">OPEN THE ROOM</p>
        <h2>下一幕，从你的团队开始。</h2>
        <p>
          创建空间，邀请角色入场，把一次即兴的对话变成可以被回看、扩写和继续演出的团剧。
        </p>
        <a className="scroll-sequence-demo__primaryCta" href="/chat">
          进入团剧共创
        </a>
      </section>
    </main>
  );
}
