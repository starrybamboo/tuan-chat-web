import type { Ticker } from "pixi.js";
import { Application, Container, Sprite, Texture } from "pixi.js";
import { useCallback, useEffect, useRef, useState } from "react";

interface PixiOverlayProps {
  effectName: string | null;
}

interface Particle extends Sprite {
  speed: number;
  sway?: number;
  swayOffset?: number;
  rotationSpeed?: number;
}

export default function PixiOverlay({ effectName }: PixiOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const effectContainerRef = useRef<Container | null>(null);
  const tickerFuncRef = useRef<((ticker: Ticker) => void) | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // 初始化 Pixi Application
  useEffect(() => {
    if (!containerRef.current)
      return;

    let mounted = true;

    const initPixi = async () => {
      if (appRef.current)
        return;

      const app = new Application();
      try {
        await app.init({
          resizeTo: containerRef.current!,
          backgroundAlpha: 0,
          width: containerRef.current!.clientWidth,
          height: containerRef.current!.clientHeight,
          preference: "webgl",
          antialias: true,
        });

        if (!mounted) {
          app.destroy(true);
          return;
        }

        if (containerRef.current) {
          containerRef.current.appendChild(app.canvas);

          // Ensure the canvas itself doesn't introduce an opaque background.
          app.canvas.style.background = "transparent";
          app.canvas.style.display = "block";
        }

        appRef.current = app;
        effectContainerRef.current = new Container();
        app.stage.addChild(effectContainerRef.current);
        setIsInitialized(true);
      }
      catch (error) {
        console.error("Failed to initialize Pixi:", error);
      }
    };

    initPixi();

    return () => {
      mounted = false;
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: true });
        appRef.current = null;
        effectContainerRef.current = null;
        setIsInitialized(false);
      }
    };
  }, []);

  // 清理特效的函数
  const clearEffect = useCallback(() => {
    if (!appRef.current || !effectContainerRef.current)
      return;

    const app = appRef.current;
    const container = effectContainerRef.current;

    // 移除 ticker 函数
    if (tickerFuncRef.current) {
      app.ticker.remove(tickerFuncRef.current);
      tickerFuncRef.current = null;
    }

    // 清理粒子
    particlesRef.current = [];
    container.removeChildren();
  }, []);

  // 处理特效变化
  useEffect(() => {
    if (!isInitialized || !appRef.current || !effectContainerRef.current)
      return;

    const app = appRef.current;
    const container = effectContainerRef.current;

    // 清理之前的特效
    clearEffect();

    if (!effectName || effectName === "none")
      return;

    // 创建新特效
    switch (effectName) {
      case "rain":
        createRainEffect(app, container, tickerFuncRef, particlesRef);
        break;
      case "snow":
        createSnowEffect(app, container, tickerFuncRef, particlesRef, false);
        break;
      case "heavySnow":
        createSnowEffect(app, container, tickerFuncRef, particlesRef, true);
        break;
      case "sakura":
      case "cherryBlossoms":
        createCherryBlossomEffect(app, container, tickerFuncRef, particlesRef);
        break;
      default:
        break;
    }

    return () => {
      clearEffect();
    };
  }, [effectName, isInitialized, clearEffect]);

  // 处理窗口大小变化时重新分布粒子
  useEffect(() => {
    if (!isInitialized || !appRef.current)
      return;

    const handleResize = () => {
      const app = appRef.current;
      if (!app)
        return;

      // 重新分布粒子位置
      for (const particle of particlesRef.current) {
        if (particle.x > app.screen.width) {
          particle.x = Math.random() * app.screen.width;
        }
        if (particle.y > app.screen.height) {
          particle.y = Math.random() * app.screen.height;
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isInitialized]);

  // Keep this behind the actual chat UI; parent container can overlay its content.
  return <div ref={containerRef} className="absolute inset-0 pointer-events-none z-0 overflow-hidden" />;
}

function createRainEffect(
  app: Application,
  container: Container,
  tickerRef: React.RefObject<((ticker: Ticker) => void) | null>,
  particlesRef: React.RefObject<Particle[]>,
) {
  const count = 400;
  const particles: Particle[] = [];

  const texture = Texture.WHITE;

  for (let i = 0; i < count; i++) {
    const drop = new Sprite(texture) as Particle;
    drop.width = 2;
    drop.height = 15 + Math.random() * 10;
    drop.tint = 0xAAAAAA;
    drop.alpha = 0.4 + Math.random() * 0.3;
    drop.rotation = 0.1; // 稍微倾斜，模拟风吹效果

    drop.x = Math.random() * app.screen.width;
    drop.y = Math.random() * app.screen.height - app.screen.height; // 从屏幕上方开始
    drop.speed = 15 + Math.random() * 10;

    container.addChild(drop);
    particles.push(drop);
  }

  particlesRef.current = particles;

  const update = (ticker: Ticker) => {
    const screenHeight = app.screen.height;
    const screenWidth = app.screen.width;

    for (const drop of particles) {
      drop.y += drop.speed * ticker.deltaTime;
      drop.x += 1 * ticker.deltaTime; // 模拟轻微的风

      if (drop.y > screenHeight) {
        drop.y = -20;
        drop.x = Math.random() * screenWidth;
      }
      if (drop.x > screenWidth) {
        drop.x = 0;
      }
    }
  };

  app.ticker.add(update);
  tickerRef.current = update;
}

function createSnowEffect(
  app: Application,
  container: Container,
  tickerRef: React.RefObject<((ticker: Ticker) => void) | null>,
  particlesRef: React.RefObject<Particle[]>,
  heavy: boolean,
) {
  const count = heavy ? 400 : 150;
  const particles: Particle[] = [];

  const texture = Texture.WHITE;

  for (let i = 0; i < count; i++) {
    const flake = new Sprite(texture) as Particle;
    const size = heavy ? 3 + Math.random() * 4 : 2 + Math.random() * 3;
    flake.width = size;
    flake.height = size;
    flake.tint = 0xFFFFFF;
    flake.alpha = 0.6 + Math.random() * 0.4;

    flake.x = Math.random() * app.screen.width;
    flake.y = Math.random() * app.screen.height;
    flake.speed = heavy ? 2 + Math.random() * 3 : 1 + Math.random() * 2;
    flake.sway = heavy ? 0.03 + Math.random() * 0.02 : 0.02 + Math.random() * 0.02;
    flake.swayOffset = Math.random() * Math.PI * 2;

    container.addChild(flake);
    particles.push(flake);
  }

  particlesRef.current = particles;

  let time = 0;

  const update = (ticker: Ticker) => {
    time += ticker.deltaTime * 0.016; // 转换为秒
    const screenHeight = app.screen.height;
    const screenWidth = app.screen.width;

    for (const flake of particles) {
      flake.y += flake.speed * ticker.deltaTime;
      flake.x += Math.sin(time * 2 + (flake.swayOffset ?? 0)) * (flake.sway ?? 0.02) * 30;

      if (flake.y > screenHeight) {
        flake.y = -10;
        flake.x = Math.random() * screenWidth;
      }
      // 处理左右边界
      if (flake.x < 0) {
        flake.x = screenWidth;
      }
      else if (flake.x > screenWidth) {
        flake.x = 0;
      }
    }
  };

  app.ticker.add(update);
  tickerRef.current = update;
}

function createCherryBlossomEffect(
  app: Application,
  container: Container,
  tickerRef: React.RefObject<((ticker: Ticker) => void) | null>,
  particlesRef: React.RefObject<Particle[]>,
) {
  const count = 80;
  const particles: Particle[] = [];

  const texture = Texture.WHITE;

  for (let i = 0; i < count; i++) {
    const petal = new Sprite(texture) as Particle;
    const size = 6 + Math.random() * 6;
    petal.width = size;
    petal.height = size * 0.8; // 椭圆形，更像花瓣
    petal.tint = 0xFFB7C5; // 樱花粉色
    petal.alpha = 0.7 + Math.random() * 0.3;
    petal.anchor.set(0.5);

    petal.x = Math.random() * app.screen.width;
    petal.y = Math.random() * app.screen.height;
    petal.speed = 0.8 + Math.random() * 1.5;
    petal.rotationSpeed = (Math.random() - 0.5) * 0.08;
    petal.swayOffset = Math.random() * Math.PI * 2;
    petal.sway = 0.5 + Math.random() * 0.5;

    container.addChild(petal);
    particles.push(petal);
  }

  particlesRef.current = particles;

  let time = 0;

  const update = (ticker: Ticker) => {
    time += ticker.deltaTime * 0.016;
    const screenHeight = app.screen.height;
    const screenWidth = app.screen.width;

    for (const petal of particles) {
      petal.y += petal.speed * ticker.deltaTime;
      // 更自然的左右飘动
      petal.x += Math.sin(time * 1.5 + (petal.swayOffset ?? 0)) * (petal.sway ?? 0.5) * ticker.deltaTime;
      petal.rotation += (petal.rotationSpeed ?? 0) * ticker.deltaTime;

      if (petal.y > screenHeight + 20) {
        petal.y = -20;
        petal.x = Math.random() * screenWidth;
      }
      // 处理左右边界
      if (petal.x < -20) {
        petal.x = screenWidth + 20;
      }
      else if (petal.x > screenWidth + 20) {
        petal.x = -20;
      }
    }
  };

  app.ticker.add(update);
  tickerRef.current = update;
}
