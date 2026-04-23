import type { Route } from "./+types/scrollSequenceDemo";

import { useLayoutEffect, useRef } from "react";
import { createSeoMeta } from "@/utils/seo";
import "./scrollSequenceDemo.css";

const HERO_FRAME_COUNT = 120;
const BATTERY_FRAME_COUNT = 150;

const HISTORY_ENTRIES = [
  {
    year: "1993",
    title: "零汞生产线落地",
    description: "把传统快消品叙事换成一条可被滚动推进的时间轴，适合品牌站展示关键节点。",
  },
  {
    year: "2002",
    title: "Power Ring 概念成形",
    description: "把“技术亮点”拆成横向卡片，用 pinned 容器让用户像翻看展板一样横向阅读。",
  },
  {
    year: "2016",
    title: "营销页开始电影化",
    description: "真正有冲击力的部分不是花哨组件，而是滚动、文案、光影和主视觉同步推进。",
  },
  {
    year: "2023",
    title: "进入多层叙事阶段",
    description: "一屏负责气氛建立，下一屏负责证据和里程碑，这就是 Nanfu 那类首页的常见结构。",
  },
] as const;

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function easeOutCubic(progress: number) {
  const next = 1 - progress;
  return 1 - next * next * next;
}

function toFrameProgress(progress: number, frameCount: number) {
  const safeProgress = clamp01(progress);
  if (frameCount <= 1) {
    return safeProgress;
  }

  const frameIndex = Math.round(safeProgress * (frameCount - 1));
  return frameIndex / (frameCount - 1);
}

function drawCapsule(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const radius = height / 2;

  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.arcTo(x + width, y, x + width, y + radius, radius);
  context.lineTo(x + width, y + height - radius);
  context.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  context.lineTo(x + radius, y + height);
  context.arcTo(x, y + height, x, y + height - radius, radius);
  context.lineTo(x, y + radius);
  context.arcTo(x, y, x + radius, y, radius);
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.max(1, Math.round(nextWidth * dpr));
    canvas.height = Math.max(1, Math.round(nextHeight * dpr));

    width = nextWidth;
    height = nextHeight;

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
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

function drawHeroFrame(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
) {
  const eased = easeOutCubic(progress);

  const background = context.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, "#05060b");
  background.addColorStop(0.5, "#0a0d13");
  background.addColorStop(1, "#12090a");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const glow = context.createRadialGradient(
    lerp(width * 0.84, width * 0.58, eased),
    lerp(height * 0.18, height * 0.28, eased),
    10,
    lerp(width * 0.84, width * 0.58, eased),
    lerp(height * 0.18, height * 0.28, eased),
    width * 0.55,
  );
  glow.addColorStop(0, "rgba(255, 99, 58, 0.42)");
  glow.addColorStop(0.45, "rgba(255, 70, 30, 0.14)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  context.save();
  context.strokeStyle = "rgba(255, 255, 255, 0.08)";
  context.lineWidth = 1;
  const lineGap = Math.max(18, width / 26);
  for (let index = 0; index < width + height; index += lineGap) {
    const offset = (progress * lineGap * 2) % lineGap;
    context.beginPath();
    context.moveTo(index - offset, 0);
    context.lineTo(index - height - offset, height);
    context.stroke();
  }
  context.restore();

  context.save();
  context.translate(
    lerp(width * 0.8, width * 0.58, eased),
    lerp(height * 0.58, height * 0.48, eased),
  );
  context.rotate(lerp(-0.34, -0.08, eased));

  const bodyWidth = Math.min(width * 0.76, 920);
  const bodyHeight = Math.min(bodyWidth * 0.24, height * 0.28);
  const bodyX = -bodyWidth / 2;
  const bodyY = -bodyHeight / 2;
  const capWidth = bodyHeight * 0.95;
  const ringX = lerp(bodyX + bodyWidth * 0.76, bodyX + bodyWidth * 0.68, eased);

  context.shadowColor = "rgba(0, 0, 0, 0.42)";
  context.shadowBlur = 42;
  context.shadowOffsetY = 24;
  drawCapsule(context, bodyX, bodyY, bodyWidth, bodyHeight);
  context.fillStyle = "rgba(0, 0, 0, 0.28)";
  context.fill();
  context.shadowColor = "transparent";

  const shellGradient = context.createLinearGradient(bodyX, bodyY, bodyX + bodyWidth, bodyY + bodyHeight);
  shellGradient.addColorStop(0, "#5b5f68");
  shellGradient.addColorStop(0.1, "#d8dde7");
  shellGradient.addColorStop(0.18, "#bfc4cd");
  shellGradient.addColorStop(0.19, "#91241b");
  shellGradient.addColorStop(0.58, "#ff4f2e");
  shellGradient.addColorStop(0.88, "#971f15");
  shellGradient.addColorStop(1, "#4d0d08");
  drawCapsule(context, bodyX, bodyY, bodyWidth, bodyHeight);
  context.fillStyle = shellGradient;
  context.fill();

  const capGradient = context.createLinearGradient(bodyX, bodyY, bodyX + capWidth, bodyY);
  capGradient.addColorStop(0, "#6d727e");
  capGradient.addColorStop(0.55, "#e8edf7");
  capGradient.addColorStop(1, "#7a7f88");
  drawCapsule(context, bodyX, bodyY, capWidth, bodyHeight);
  context.fillStyle = capGradient;
  context.fill();

  context.save();
  context.beginPath();
  context.rect(bodyX + capWidth * 1.08, bodyY + bodyHeight * 0.12, bodyWidth * 0.58, bodyHeight * 0.76);
  context.clip();
  const stripeGradient = context.createLinearGradient(bodyX, bodyY, bodyX + bodyWidth, bodyY);
  stripeGradient.addColorStop(0, "rgba(255, 255, 255, 0)");
  stripeGradient.addColorStop(0.25, "rgba(255, 255, 255, 0.28)");
  stripeGradient.addColorStop(0.55, "rgba(255, 255, 255, 0.05)");
  stripeGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = stripeGradient;
  context.fillRect(
    lerp(bodyX - bodyWidth * 0.3, bodyX + bodyWidth * 0.2, progress),
    bodyY,
    bodyWidth * 0.42,
    bodyHeight,
  );
  context.restore();

  const ringGradient = context.createLinearGradient(ringX, bodyY, ringX + bodyHeight * 0.18, bodyY);
  ringGradient.addColorStop(0, "#ffe5cf");
  ringGradient.addColorStop(0.5, "#ffca87");
  ringGradient.addColorStop(1, "#ff7a33");
  context.fillStyle = ringGradient;
  context.fillRect(ringX, bodyY + bodyHeight * 0.03, bodyHeight * 0.2, bodyHeight * 0.94);

  context.shadowColor = "rgba(255, 169, 74, 0.8)";
  context.shadowBlur = 28;
  context.fillStyle = "rgba(255, 214, 160, 0.9)";
  context.fillRect(ringX + bodyHeight * 0.02, bodyY + bodyHeight * 0.16, bodyHeight * 0.06, bodyHeight * 0.68);
  context.shadowColor = "transparent";

  context.fillStyle = "rgba(255, 255, 255, 0.84)";
  context.font = `${Math.max(18, bodyHeight * 0.28)}px Arial`;
  context.textBaseline = "middle";
  context.fillText("SCROLL SEQUENCE", bodyX + capWidth * 1.26, bodyY + bodyHeight * 0.4);

  context.fillStyle = "rgba(255, 244, 232, 0.92)";
  context.font = `700 ${Math.max(28, bodyHeight * 0.42)}px Arial`;
  context.fillText("REACT DEMO", bodyX + capWidth * 1.24, bodyY + bodyHeight * 0.7);

  context.restore();

  for (let index = 0; index < 14; index += 1) {
    const particleProgress = (progress * 1.3 + index / 14) % 1;
    const particleX = lerp(width * 0.2, width * 0.9, particleProgress);
    const particleY = lerp(height * 0.78, height * 0.16, particleProgress);
    const particleSize = lerp(1.5, 4.2, 1 - particleProgress);

    context.fillStyle = `rgba(255, ${Math.round(120 + particleProgress * 90)}, 85, ${lerp(0.08, 0.34, 1 - particleProgress)})`;
    context.beginPath();
    context.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
    context.fill();
  }
}

function drawBatteryFrame(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
) {
  const eased = easeOutCubic(progress);

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#07080d");
  background.addColorStop(0.55, "#0e1118");
  background.addColorStop(1, "#180d0a");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.save();
  context.strokeStyle = "rgba(255, 255, 255, 0.06)";
  context.lineWidth = 1;
  const ringCount = 8;
  const ringCenterX = width * 0.5;
  const ringCenterY = height * 0.52;
  for (let index = 0; index < ringCount; index += 1) {
    const radius = lerp(width * 0.16, width * 0.44, index / ringCount);
    context.beginPath();
    context.ellipse(ringCenterX, ringCenterY, radius, radius * 0.34, 0, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();

  const shellWidth = Math.min(width * 0.34, 220);
  const shellHeight = Math.min(height * 0.7, 500);
  const shellX = width * 0.5 - shellWidth / 2;
  const shellY = height * 0.15;
  const capHeight = shellHeight * 0.08;

  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.45)";
  context.shadowBlur = 32;
  context.shadowOffsetY = 18;
  context.fillStyle = "rgba(0, 0, 0, 0.32)";
  context.fillRect(shellX, shellY, shellWidth, shellHeight);
  context.shadowColor = "transparent";

  const shellGradient = context.createLinearGradient(shellX, shellY, shellX + shellWidth, shellY);
  shellGradient.addColorStop(0, "#2a2f3a");
  shellGradient.addColorStop(0.28, "#9098a8");
  shellGradient.addColorStop(0.5, "#d6deed");
  shellGradient.addColorStop(0.72, "#8c95a6");
  shellGradient.addColorStop(1, "#272c35");
  context.fillStyle = shellGradient;
  context.fillRect(shellX, shellY, shellWidth, shellHeight);

  context.fillStyle = "#11141b";
  context.fillRect(shellX + shellWidth * 0.08, shellY + capHeight, shellWidth * 0.84, shellHeight - capHeight * 1.22);

  const chargeHeight = (shellHeight - capHeight * 1.5) * eased;
  const chargeGradient = context.createLinearGradient(0, shellY + shellHeight, 0, shellY + capHeight);
  chargeGradient.addColorStop(0, "#ff5f32");
  chargeGradient.addColorStop(0.45, "#ff8c48");
  chargeGradient.addColorStop(1, "#ffe8c7");

  context.shadowColor = "rgba(255, 120, 64, 0.54)";
  context.shadowBlur = 26;
  context.fillStyle = chargeGradient;
  context.fillRect(
    shellX + shellWidth * 0.12,
    shellY + shellHeight - capHeight * 0.72 - chargeHeight,
    shellWidth * 0.76,
    chargeHeight,
  );
  context.shadowColor = "transparent";

  context.fillStyle = "#d7ddea";
  context.fillRect(shellX + shellWidth * 0.28, shellY, shellWidth * 0.44, capHeight);

  context.strokeStyle = "rgba(255, 186, 121, 0.88)";
  context.lineWidth = 4;
  for (let index = 0; index < 3; index += 1) {
    const arcProgress = clamp01(eased - index * 0.12);
    if (arcProgress <= 0) {
      continue;
    }
    context.beginPath();
    context.arc(
      width * 0.5,
      height * 0.52,
      width * (0.18 + index * 0.07),
      -Math.PI * 0.85,
      -Math.PI * 0.85 + Math.PI * 1.7 * arcProgress,
    );
    context.stroke();
  }

  context.fillStyle = "rgba(255, 248, 239, 0.92)";
  context.font = `700 ${Math.max(22, width * 0.085)}px Arial`;
  context.textAlign = "center";
  context.fillText(`${Math.round(progress * 100)}%`, width * 0.5, height * 0.9);
  context.restore();
}

function setHeroOverlayState(
  heroCopy: HTMLDivElement,
  heroPanel: HTMLDivElement,
  progress: number,
) {
  const copyProgress = clamp01(progress / 0.28);
  const panelProgress = easeOutCubic(clamp01((progress - 0.34) / 0.24));

  heroCopy.style.opacity = String(1 - copyProgress);
  heroCopy.style.transform = `translate3d(0, ${lerp(0, -56, copyProgress)}px, 0) scale(${lerp(1, 0.96, copyProgress)})`;

  heroPanel.style.opacity = String(panelProgress);
  heroPanel.style.transform = `translate3d(0, ${lerp(42, 0, panelProgress)}px, 0)`;
}

function setActiveHistoryCard(
  cards: HTMLElement[],
  progress: number,
) {
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
    title: "滚动序列动画示例",
    description: "React 技术栈下的 Nanfu 风格滚动序列动画示例。",
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
  const historySectionRef = useRef<HTMLElement>(null);
  const historyStickyRef = useRef<HTMLDivElement>(null);
  const historyCanvasRef = useRef<HTMLCanvasElement>(null);
  const historyViewportRef = useRef<HTMLDivElement>(null);
  const historyTrackRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const page = pageRef.current;
    const heroSection = heroSectionRef.current;
    const heroSticky = heroStickyRef.current;
    const heroSurface = heroSurfaceRef.current;
    const heroCanvas = heroCanvasRef.current;
    const heroCopy = heroCopyRef.current;
    const heroPanel = heroPanelRef.current;
    const scrollHint = scrollHintRef.current;
    const historySection = historySectionRef.current;
    const historySticky = historyStickyRef.current;
    const historyCanvas = historyCanvasRef.current;
    const historyViewport = historyViewportRef.current;
    const historyTrack = historyTrackRef.current;

    if (
      !page
      || !heroSection
      || !heroSticky
      || !heroSurface
      || !heroCanvas
      || !heroCopy
      || !heroPanel
      || !scrollHint
      || !historySection
      || !historySticky
      || !historyCanvas
      || !historyViewport
      || !historyTrack
    ) {
      return;
    }

    const heroSequence = createProceduralSequence(heroCanvas, drawHeroFrame);
    const batterySequence = createProceduralSequence(historyCanvas, drawBatteryFrame);
    const historyCards = Array.from(historyTrack.querySelectorAll<HTMLElement>(".scroll-sequence-demo__historyCard"));

    if (!heroSequence || !batterySequence) {
      return;
    }

    const renderHeroFrame = (progress: number) => {
      heroSequence.render(toFrameProgress(progress, HERO_FRAME_COUNT));
    };

    const renderBatteryFrame = (progress: number) => {
      batterySequence.render(toFrameProgress(progress, BATTERY_FRAME_COUNT));
      setActiveHistoryCard(historyCards, progress);
    };

    renderHeroFrame(0);
    renderBatteryFrame(0);
    setHeroOverlayState(heroCopy, heroPanel, 0);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return () => {
        heroSequence.destroy();
        batterySequence.destroy();
      };
    }

    let disposed = false;
    let cleanupAnimation: (() => void) | undefined;

    void (async () => {
      try {
        const [{ gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([
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

        const context = gsap.context(() => {
          gsap.set(heroCopy, {
            autoAlpha: 1,
            scale: 1,
            transformOrigin: "left bottom",
            y: 0,
          });
          gsap.set(heroPanel, { autoAlpha: 0, y: 42 });
          gsap.set(scrollHint, { autoAlpha: 1, y: 0 });
          gsap.set(heroSurface, { opacity: 1 });
          gsap.set(historyTrack, { x: 0 });

          const heroState = { progress: 0 };
          gsap.timeline(
            {
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
            },
          )
            .to(heroState, {
              duration: 1,
              progress: 1,
              onUpdate: () => {
                renderHeroFrame(heroState.progress);
              },
            }, 0)
            .to(heroCopy, {
              autoAlpha: 0,
              duration: 0.28,
              scale: 0.96,
              y: -56,
            }, 0)
            .to(scrollHint, {
              autoAlpha: 0,
              duration: 0.2,
              y: 12,
            }, 0.08)
            .to(heroSurface, {
              duration: 1,
              opacity: 0.72,
            }, 0)
            .to(heroPanel, {
              autoAlpha: 1,
              duration: 0.24,
              ease: "power2.out",
              y: 0,
            }, 0.34);

          const historyState = { progress: 0 };
          gsap.timeline(
            {
              defaults: { ease: "none" },
              scrollTrigger: {
                trigger: historySection,
                start: "top top",
                end: () => {
                  const maxOffset = Math.max(historyTrack.scrollWidth - historyViewport.clientWidth, 0);
                  return `+=${Math.max(window.innerHeight * 2.05, maxOffset + window.innerHeight * 0.8)}`;
                },
                scrub: 1.12,
                pin: historySticky,
                pinSpacing: false,
                anticipatePin: 1,
                invalidateOnRefresh: true,
              },
            },
          )
            .to(historyTrack, {
              duration: 1,
              x: () => -Math.max(historyTrack.scrollWidth - historyViewport.clientWidth, 0),
            }, 0)
            .to(historyState, {
              duration: 1,
              progress: 1,
              onUpdate: () => {
                renderBatteryFrame(historyState.progress);
              },
            }, 0);
        }, page);

        ScrollTrigger.refresh();
        lenis.resize?.();

        cleanupAnimation = () => {
          context.revert();
          gsap.ticker.remove(ticker);
          lenis.destroy();
          ScrollTrigger.refresh();
        };
      }
      catch (error) {
        console.error("初始化滚动序列动画失败", error);
      }
    })();

    return () => {
      disposed = true;
      cleanupAnimation?.();
      heroSequence.destroy();
      batterySequence.destroy();
    };
  }, []);

  return (
    <main ref={pageRef} className="scroll-sequence-demo">
      <a className="scroll-sequence-demo__backLink" href="/">
        返回主应用
      </a>

      <section ref={heroSectionRef} className="scroll-sequence-demo__heroSection">
        <div ref={heroStickyRef} className="scroll-sequence-demo__heroSticky">
          <div ref={heroSurfaceRef} className="scroll-sequence-demo__heroSurface" />
          <canvas
            ref={heroCanvasRef}
            className="scroll-sequence-demo__heroCanvas"
            aria-hidden="true"
          />
          <div ref={heroCopyRef} className="scroll-sequence-demo__heroCopy">
            <p className="scroll-sequence-demo__eyebrow">LENIS / GSAP / SCROLLTRIGGER</p>
            <h1 className="scroll-sequence-demo__heroTitle">
              用 React 直接做
              <br />
              Nanfu 风格滚动页
            </h1>
            <p className="scroll-sequence-demo__heroDescription">
              这版已经接入 Lenis 平滑滚动和 GSAP ScrollTrigger 的 pin / scrub。
              React 只负责结构，滚动时间线和高频更新都留在 DOM 与 canvas 层。
            </p>
          </div>

          <aside ref={heroPanelRef} className="scroll-sequence-demo__heroPanel">
            <span className="scroll-sequence-demo__panelTag">IMPLEMENTATION</span>
            <h2>滚动曲线、pin 和时间线交给 GSAP</h2>
            <p>
              主视觉的帧推进、文案淡出、信息面板淡入和第二屏横向时间轴，
              现在都通过一套 ScrollTrigger 时间线统一驱动。
            </p>
          </aside>

          <div ref={scrollHintRef} className="scroll-sequence-demo__scrollHint">
            向下滚动，查看第二段横向时间轴
          </div>
        </div>
      </section>

      <section className="scroll-sequence-demo__bridge">
        <p className="scroll-sequence-demo__bridgeLabel">SECOND CHAPTER</p>
        <h2>再往下，把时间轴也接进同一套滚动叙事</h2>
        <p>
          这一步对应 Nanfu 那种“主视觉结束后，进入横向信息展板”的结构。
        </p>
      </section>

      <section ref={historySectionRef} className="scroll-sequence-demo__historySection">
        <div ref={historyStickyRef} className="scroll-sequence-demo__historySticky">
          <div className="scroll-sequence-demo__historyHeader">
            <p className="scroll-sequence-demo__eyebrow">HORIZONTAL TIMELINE</p>
            <h2 className="scroll-sequence-demo__historyTitle">滚动继续推进，横向卡片与次级 canvas 同步更新</h2>
          </div>

          <div className="scroll-sequence-demo__historyLayout">
            <div className="scroll-sequence-demo__historyVisual">
              <canvas
                ref={historyCanvasRef}
                className="scroll-sequence-demo__historyCanvas"
                aria-hidden="true"
              />
              <div className="scroll-sequence-demo__historyMeter">
                <span>Power Ring</span>
                <strong>150 Frames</strong>
              </div>
            </div>

            <div ref={historyViewportRef} className="scroll-sequence-demo__historyViewport">
              <div ref={historyTrackRef} className="scroll-sequence-demo__historyTrack">
                {HISTORY_ENTRIES.map(entry => (
                  <article key={entry.year} className="scroll-sequence-demo__historyCard" data-active="false">
                    <span className="scroll-sequence-demo__historyYear">{entry.year}</span>
                    <h3>{entry.title}</h3>
                    <p>{entry.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="scroll-sequence-demo__outro">
        <p className="scroll-sequence-demo__eyebrow">NEXT STEP</p>
        <h2>这个版本已经是 Lenis + GSAP ScrollTrigger 骨架</h2>
        <p>
          现在你只需要把程序绘制的序列帧替换成真实资源，就可以继续向正式品牌页推进。
          如果要更像 Nanfu，再往下就是接真实产品渲染、视频序列或 WebGL 主视觉。
        </p>
      </section>
    </main>
  );
}
