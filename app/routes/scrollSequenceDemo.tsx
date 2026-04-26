import type { Route } from "./+types/scrollSequenceDemo";

import { useLayoutEffect, useRef } from "react";
import { createSeoMeta } from "@/utils/seo";
import {
  createProceduralSequence,
  drawHeroFrame,
  drawStageFrame,
  FLOW_CARDS,
  HERO_FRAME_COUNT,
  setActiveFlowCard,
  setHeroOverlayState,
  STAGE_FRAME_COUNT,
  STORY_STAGES,
  toFrameProgress,
} from "./scrollSequenceDemoShared";
import "./scrollSequenceDemo.css";

export function meta(_args: Route.MetaArgs) {
  return createSeoMeta({
    title: "团剧共创展示页",
    description: "团剧共创的沉浸式展示页。",
    path: "/scroll-sequence-demo",
    index: false,
  });
}

export default function ScrollSequenceDemoPage() {
  const pageRef = useRef<HTMLElement>(null);
  const heroSectionRef = useRef<HTMLElement>(null);
  const heroStickyRef = useRef<HTMLDivElement>(null);
  const heroSurfaceRef = useRef<HTMLDivElement>(null);
  const heroCanvasRef = useRef<HTMLCanvasElement>(null);
  const heroCopyRef = useRef<HTMLDivElement>(null);
  const heroPanelRef = useRef<HTMLDivElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);
  const flowSectionRef = useRef<HTMLElement>(null);
  const flowStickyRef = useRef<HTMLDivElement>(null);
  const stageCanvasRef = useRef<HTMLCanvasElement>(null);
  const flowViewportRef = useRef<HTMLDivElement>(null);
  const flowTrackRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const page = pageRef.current;
    const heroSection = heroSectionRef.current;
    const heroSticky = heroStickyRef.current;
    const heroSurface = heroSurfaceRef.current;
    const heroCanvas = heroCanvasRef.current;
    const heroCopy = heroCopyRef.current;
    const heroPanel = heroPanelRef.current;
    const scrollHint = scrollHintRef.current;
    const flowSection = flowSectionRef.current;
    const flowSticky = flowStickyRef.current;
    const stageCanvas = stageCanvasRef.current;
    const flowViewport = flowViewportRef.current;
    const flowTrack = flowTrackRef.current;

    if (
      !page
      || !heroSection
      || !heroSticky
      || !heroSurface
      || !heroCanvas
      || !heroCopy
      || !heroPanel
      || !scrollHint
      || !flowSection
      || !flowSticky
      || !stageCanvas
      || !flowViewport
      || !flowTrack
    ) {
      return;
    }

    const heroSequence = createProceduralSequence(
      heroCanvas,
      (context, width, height, progress) => drawHeroFrame(context, width, height, toFrameProgress(progress, HERO_FRAME_COUNT)),
    );
    const stageSequence = createProceduralSequence(
      stageCanvas,
      (context, width, height, progress) => drawStageFrame(context, width, height, toFrameProgress(progress, STAGE_FRAME_COUNT)),
    );
    if (!heroSequence || !stageSequence) {
      return;
    }

    const renderHeroFrame = heroSequence.render;
    const renderStageFrame = stageSequence.render;
    const flowCards = Array.from(flowTrack.querySelectorAll<HTMLElement>(".scroll-sequence-demo__flowCard"));
    let disposed = false;
    let cleanupAnimation: (() => void) | undefined;

    (async () => {
      try {
        const [
          { default: gsap },
          { ScrollTrigger },
          { default: Lenis },
        ] = await Promise.all([
          import("gsap"),
          import("gsap/ScrollTrigger"),
          import("lenis"),
        ]);

        if (disposed) {
          return;
        }

        gsap.registerPlugin(ScrollTrigger);

        const lenis = new Lenis({
          autoRaf: false,
          lerp: 0.12,
          smoothWheel: true,
          syncTouch: false,
          touchMultiplier: 1.05,
          wheelMultiplier: 0.92,
        });

        lenis.on("scroll", ScrollTrigger.update);

        const ticker = (time: number) => {
          lenis.raf(time * 1000);
        };

        gsap.ticker.add(ticker);
        gsap.ticker.lagSmoothing(0);

        const animationContext = gsap.context(() => {
          gsap.set(heroCopy, { autoAlpha: 1, scale: 1, transformOrigin: "left bottom", y: 0 });
          gsap.set(heroPanel, { autoAlpha: 0, y: 42 });
          gsap.set(scrollHint, { autoAlpha: 1, y: 0 });
          gsap.set(heroSurface, { opacity: 1 });
          gsap.set(flowTrack, { x: 0 });

          const heroState = { progress: 0 };
          gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: heroSection,
              start: "top top",
              end: () => `+=${Math.max(window.innerHeight * 1.85, heroSection.offsetHeight - window.innerHeight)}`,
              scrub: 1.08,
              pin: heroSticky,
              pinSpacing: false,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          })
            .to(heroState, {
              duration: 1,
              progress: 1,
              onUpdate: () => {
                renderHeroFrame(heroState.progress);
                setHeroOverlayState(heroCopy, heroPanel, scrollHint, heroState.progress);
              },
            }, 0)
            .to(heroSurface, { duration: 1, opacity: 0.72 }, 0);

          const flowState = { progress: 0 };
          gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: flowSection,
              start: "top top",
              end: () => {
                const maxOffset = Math.max(flowTrack.scrollWidth - flowViewport.clientWidth, 0);
                return `+=${Math.max(window.innerHeight * 2.05, maxOffset + window.innerHeight * 0.8)}`;
              },
              scrub: 1.12,
              pin: flowSticky,
              pinSpacing: false,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          })
            .to(flowTrack, {
              duration: 1,
              x: () => -Math.max(flowTrack.scrollWidth - flowViewport.clientWidth, 0),
            }, 0)
            .to(flowState, {
              duration: 1,
              progress: 1,
              onUpdate: () => {
                renderStageFrame(flowState.progress);
                setActiveFlowCard(flowCards, flowState.progress);
              },
            }, 0);
        }, page);

        ScrollTrigger.refresh();
        lenis.resize?.();

        cleanupAnimation = () => {
          animationContext.revert();
          gsap.ticker.remove(ticker);
          lenis.destroy();
          ScrollTrigger.refresh();
        };
      }
      catch (error) {
        console.error("初始化团剧共创展示页动画失败", error);
      }
    })();

    return () => {
      disposed = true;
      cleanupAnimation?.();
      heroSequence.destroy();
      stageSequence.destroy();
    };
  }, []);

  return (
    <main ref={pageRef} className="scroll-sequence-demo">
      <a className="scroll-sequence-demo__backLink" href="/">
        进入应用
      </a>
      <a className="scroll-sequence-demo__compareLink" href="/scroll-sequence-motion-demo">
        Motion 版
      </a>

      <section ref={heroSectionRef} className="scroll-sequence-demo__heroSection">
        <div ref={heroStickyRef} className="scroll-sequence-demo__heroSticky">
          <div ref={heroSurfaceRef} className="scroll-sequence-demo__heroSurface" />
          <canvas ref={heroCanvasRef} className="scroll-sequence-demo__heroCanvas" aria-hidden="true" />

          <div ref={heroCopyRef} className="scroll-sequence-demo__heroCopy">
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
          </div>

          <aside ref={heroPanelRef} className="scroll-sequence-demo__heroPanel">
            <span className="scroll-sequence-demo__panelTag">LIVE STORYBOARD</span>
            <h2>把聊天现场，变成正在展开的动画分镜。</h2>
            <p>
              成员发言、角色状态、素材引用与舞台预览同步推进，灵感不再散落在多个窗口。
            </p>
          </aside>

          <div ref={scrollHintRef} className="scroll-sequence-demo__scrollHint">
            向下滚动
          </div>
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

      <section ref={flowSectionRef} className="scroll-sequence-demo__flowSection">
        <div ref={flowStickyRef} className="scroll-sequence-demo__flowSticky">
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
              <div ref={flowTrackRef} className="scroll-sequence-demo__flowTrack">
                {FLOW_CARDS.map(card => (
                  <article key={card.index} className="scroll-sequence-demo__flowCard" data-active="false">
                    <span className="scroll-sequence-demo__flowIndex">{card.index}</span>
                    <h3>{card.title}</h3>
                    <p>{card.description}</p>
                  </article>
                ))}
              </div>
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
