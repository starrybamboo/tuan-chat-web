import type { Route } from "./+types/scrollSequenceDemo";

import { useLayoutEffect, useRef } from "react";
import { createSeoMeta } from "@/utils/seo";
import "./scrollSequenceDemo.css";

const HERO_FRAME_COUNT = 150;
const STAGE_FRAME_COUNT = 180;

const STORY_STAGES = [
  {
    label: "角色",
    title: "先让每个人，拥有能被记住的轮廓。",
    description: "身份、头像、立绘、关系与能力沉淀在同一处，创作者进入房间时，不再从空白开始。",
  },
  {
    label: "分镜",
    title: "一句发言，也可以成为下一格画面。",
    description: "对话、选择、旁白与场景节点沿着时间线展开，团队把灵感接成连续的戏剧段落。",
  },
  {
    label: "演出",
    title: "故事不是停在文本里，而是被实时点亮。",
    description: "角色发言、素材包、WebGAL 预览与房间协作一起推进，让跑团现场变成可观看的舞台。",
  },
  {
    label: "共创",
    title: "同一个世界，可以被更多人继续进入。",
    description: "公开素材、归档模组与 Fork 流程把一次创作延展为社区资产，新的剧本从旧火花里生长。",
  },
] as const;

const FLOW_CARDS = [
  {
    index: "01",
    title: "写下第一句",
    description: "从角色视角发言，保留现场语气与行动意图。",
  },
  {
    index: "02",
    title: "接住分支",
    description: "把选择、检定与临场补充留在同一条叙事线上。",
  },
  {
    index: "03",
    title: "同步画面",
    description: "素材和演出参数跟随消息流进入预览舞台。",
  },
  {
    index: "04",
    title: "归档成篇",
    description: "完整片段沉淀为可回看、可复用、可继续创作的内容。",
  },
] as const;

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function easeOutCubic(progress: number) {
  const nextProgress = 1 - progress;
  return 1 - nextProgress * nextProgress * nextProgress;
}

function toFrameProgress(progress: number, frameCount: number) {
  const safeProgress = clamp01(progress);
  if (frameCount <= 1) {
    return safeProgress;
  }

  const frameIndex = Math.round(safeProgress * (frameCount - 1));
  return frameIndex / (frameCount - 1);
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.arcTo(x + width, y, x + width, y + safeRadius, safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.arcTo(x + width, y + height, x + width - safeRadius, y + height, safeRadius);
  context.lineTo(x + safeRadius, y + height);
  context.arcTo(x, y + height, x, y + height - safeRadius, safeRadius);
  context.lineTo(x, y + safeRadius);
  context.arcTo(x, y, x + safeRadius, y, safeRadius);
  context.closePath();
}

type ProceduralRenderer = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
) => void;

function createProceduralSequence(
  canvas: HTMLCanvasElement,
  renderer: ProceduralRenderer,
) {
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  let currentProgress = 0;
  let width = 1;
  let height = 1;

  const render = (progress: number) => {
    currentProgress = clamp01(progress);
    context.clearRect(0, 0, width, height);
    renderer(context, width, height, currentProgress);
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.round(rect.width));
    const nextHeight = Math.max(1, Math.round(rect.height));
    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.max(1, Math.round(nextWidth * devicePixelRatio));
    canvas.height = Math.max(1, Math.round(nextHeight * devicePixelRatio));

    width = nextWidth;
    height = nextHeight;

    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    render(currentProgress);
  };

  const resizeObserver = typeof ResizeObserver !== "undefined"
    ? new ResizeObserver(() => resize())
    : null;

  resizeObserver?.observe(canvas);
  window.addEventListener("resize", resize);
  resize();

  return {
    render,
    destroy() {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", resize);
    },
  };
}

function drawPortraitCard(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  colorShift: number,
  progress: number,
) {
  context.save();
  context.translate(x, y);

  const cardGradient = context.createLinearGradient(0, 0, width, height);
  cardGradient.addColorStop(0, `hsla(${258 + colorShift}, 94%, 72%, 0.92)`);
  cardGradient.addColorStop(0.45, `hsla(${318 + colorShift}, 84%, 64%, 0.82)`);
  cardGradient.addColorStop(1, `hsla(${198 + colorShift}, 88%, 58%, 0.9)`);
  roundedRect(context, 0, 0, width, height, Math.min(width, height) * 0.08);
  context.fillStyle = cardGradient;
  context.fill();

  const shade = context.createLinearGradient(0, 0, 0, height);
  shade.addColorStop(0, "rgba(255,255,255,0.3)");
  shade.addColorStop(0.5, "rgba(9,8,18,0)");
  shade.addColorStop(1, "rgba(7,7,11,0.72)");
  context.fillStyle = shade;
  context.fill();

  context.globalAlpha = 0.5;
  context.fillStyle = "rgba(255,255,255,0.7)";
  context.beginPath();
  context.ellipse(width * 0.5, height * 0.35, width * 0.18, height * 0.12, 0, 0, Math.PI * 2);
  context.fill();

  context.globalAlpha = 0.82;
  context.strokeStyle = "rgba(255,255,255,0.64)";
  context.lineWidth = Math.max(2, width * 0.018);
  context.beginPath();
  context.moveTo(width * 0.28, height * 0.67);
  context.quadraticCurveTo(width * 0.5, height * (0.46 + progress * 0.04), width * 0.72, height * 0.67);
  context.stroke();

  context.globalAlpha = 1;
  context.fillStyle = "rgba(255,255,255,0.78)";
  context.font = `700 ${Math.max(10, width * 0.12)}px system-ui`;
  context.fillText("TC", width * 0.12, height * 0.9);
  context.restore();
}

function drawHeroFrame(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
) {
  const eased = easeOutCubic(progress);
  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#07070b");
  background.addColorStop(0.5, "#101026");
  background.addColorStop(1, "#05050a");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const glow = context.createRadialGradient(width * 0.72, height * 0.22, 0, width * 0.72, height * 0.22, width * 0.62);
  glow.addColorStop(0, "rgba(151, 97, 255, 0.34)");
  glow.addColorStop(0.45, "rgba(255, 93, 171, 0.18)");
  glow.addColorStop(1, "rgba(5, 5, 10, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.26;
  context.strokeStyle = "rgba(255,255,255,0.16)";
  context.lineWidth = 1;
  const gridGap = Math.max(28, width / 20);
  for (let gridX = -gridGap; gridX < width + gridGap; gridX += gridGap) {
    const offset = (progress * gridGap * 1.8) % gridGap;
    context.beginPath();
    context.moveTo(gridX + offset, 0);
    context.lineTo(gridX - height * 0.35 + offset, height);
    context.stroke();
  }
  context.restore();

  const cardWidth = Math.min(width * 0.19, 184);
  const cardHeight = cardWidth * 1.64;
  const cardBaseX = lerp(width * 0.62, width * 0.54, eased);
  const cardBaseY = height * 0.48;
  const cardCount = 9;

  for (let index = 0; index < cardCount; index += 1) {
    const row = Math.floor(index / 3);
    const column = index % 3;
    const stagger = index / cardCount;
    const cardProgress = easeOutCubic(clamp01((progress - stagger * 0.08) / 0.72));
    const x = cardBaseX + (column - 1) * cardWidth * 0.74 + Math.sin(index * 1.7) * 14;
    const y = cardBaseY + (row - 1) * cardHeight * 0.5 - cardProgress * height * 0.08;

    context.save();
    context.translate(x, y);
    context.rotate(lerp(-0.24, 0.12, (index % 4) / 3) + Math.sin(progress * Math.PI + index) * 0.025);
    context.globalAlpha = lerp(0.36, 0.92, cardProgress);
    context.shadowColor = "rgba(0, 0, 0, 0.42)";
    context.shadowBlur = 30;
    context.shadowOffsetY = 20;
    drawPortraitCard(context, -cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, index * 14, progress);
    context.restore();
  }

  context.save();
  context.globalCompositeOperation = "screen";
  for (let index = 0; index < 22; index += 1) {
    const particleProgress = (progress * 0.7 + index / 22) % 1;
    const particleX = lerp(width * 0.18, width * 0.9, particleProgress);
    const particleY = height * (0.18 + 0.58 * Math.abs(Math.sin(index * 0.82 + progress * 2.2)));
    const particleSize = lerp(1.2, 4.6, 1 - particleProgress);
    context.fillStyle = `rgba(190, 147, 255, ${lerp(0.08, 0.42, 1 - particleProgress)})`;
    context.beginPath();
    context.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawStageFrame(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
) {
  const eased = easeOutCubic(progress);
  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#080812");
  background.addColorStop(0.48, "#11112a");
  background.addColorStop(1, "#07070b");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const stageGlow = context.createRadialGradient(width * 0.5, height * 0.42, 0, width * 0.5, height * 0.42, width * 0.45);
  stageGlow.addColorStop(0, "rgba(87, 211, 255, 0.28)");
  stageGlow.addColorStop(0.5, "rgba(179, 106, 255, 0.16)");
  stageGlow.addColorStop(1, "rgba(7, 7, 11, 0)");
  context.fillStyle = stageGlow;
  context.fillRect(0, 0, width, height);

  const panelWidth = Math.min(width * 0.58, 620);
  const panelHeight = Math.min(height * 0.58, 420);
  const panelX = width * 0.5 - panelWidth / 2;
  const panelY = height * 0.5 - panelHeight / 2;

  context.save();
  context.shadowColor = "rgba(0,0,0,0.45)";
  context.shadowBlur = 40;
  context.shadowOffsetY = 24;
  roundedRect(context, panelX, panelY, panelWidth, panelHeight, 28);
  context.fillStyle = "rgba(255,255,255,0.08)";
  context.fill();
  context.strokeStyle = "rgba(255,255,255,0.2)";
  context.stroke();
  context.restore();

  const frameGap = panelWidth * 0.035;
  const frameWidth = (panelWidth - frameGap * 4) / 3;
  const frameHeight = panelHeight * 0.62;
  for (let index = 0; index < 3; index += 1) {
    const frameProgress = clamp01(eased - index * 0.16);
    const frameX = panelX + frameGap + index * (frameWidth + frameGap);
    const frameY = panelY + panelHeight * 0.14 + Math.sin(progress * Math.PI + index) * 8;
    drawPortraitCard(context, frameX, frameY, frameWidth, frameHeight, index * 32, frameProgress);
  }

  context.save();
  context.strokeStyle = "rgba(255,255,255,0.44)";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(panelX + panelWidth * 0.18, panelY + panelHeight * 0.84);
  context.bezierCurveTo(
    panelX + panelWidth * 0.32,
    panelY + panelHeight * lerp(0.78, 0.68, eased),
    panelX + panelWidth * 0.68,
    panelY + panelHeight * lerp(0.9, 0.72, eased),
    panelX + panelWidth * 0.84,
    panelY + panelHeight * 0.72,
  );
  context.stroke();
  context.restore();

  context.fillStyle = "rgba(255,255,255,0.9)";
  context.font = `800 ${Math.max(22, width * 0.055)}px system-ui`;
  context.textAlign = "center";
  context.fillText(`${Math.round(progress * 100)}%`, width * 0.5, height * 0.9);
}

function setHeroOverlayState(
  heroCopy: HTMLDivElement,
  heroPanel: HTMLDivElement,
  scrollHint: HTMLDivElement,
  progress: number,
) {
  const copyProgress = clamp01(progress / 0.28);
  const panelProgress = easeOutCubic(clamp01((progress - 0.34) / 0.24));

  heroCopy.style.opacity = String(1 - copyProgress);
  heroCopy.style.transform = `translate3d(0, ${lerp(0, -56, copyProgress)}px, 0) scale(${lerp(1, 0.96, copyProgress)})`;
  heroPanel.style.opacity = String(panelProgress);
  heroPanel.style.transform = `translate3d(0, ${lerp(42, 0, panelProgress)}px, 0)`;
  scrollHint.style.opacity = String(1 - clamp01((progress - 0.08) / 0.2));
}

function setActiveFlowCard(cards: HTMLElement[], progress: number) {
  const activeIndex = Math.min(
    cards.length - 1,
    Math.round(clamp01(progress) * Math.max(cards.length - 1, 1)),
  );

  cards.forEach((card, index) => {
    const isActive = index === activeIndex;
    card.dataset.active = isActive ? "true" : "false";
    card.setAttribute("aria-current", isActive ? "true" : "false");
  });
}

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
              <h2>{stage.label}。</h2>
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
