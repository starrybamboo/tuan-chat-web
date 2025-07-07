import { useEffect, useRef, useState } from "react";

export default function HomePage() {
  const [isAtTop, setIsAtTop] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 滚动事件的监听
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer)
      return;
    const handleScroll = () => {
      // 当滚动距离为0时，isAtTop为true，否则为false
      setIsAtTop(scrollContainer.scrollTop === 0);
    };
    scrollContainer.addEventListener("scroll", handleScroll);

    // 除事件监听
    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
    };
  }, []);
  return (
    <div ref={scrollContainerRef} className="h-full bg-base-100 overflow-auto">
      {/* Section 1: Hero - 英雄区域，第一眼吸引用户 */}
      <div className="relative hero h-full bg-base-200 overflow-hidden">
        {/* 背景装饰：模糊光晕效果 */}
        <div
          className="absolute top-0 -left-40 w-96 h-96 bg-primary rounded-full opacity-30 blur-3xl animate-blob"
        >
        </div>
        <div
          className="absolute -top-20 right-0 w-96 h-96 bg-secondary rounded-full opacity-30 blur-3xl animate-blob animation-delay-2000"
        >
        </div>
        <div
          className="absolute -bottom-40 right-20 w-96 h-96 bg-accent rounded-full opacity-30 blur-3xl animate-blob animation-delay-4000"
        >
        </div>

        {/* 使用 z-10 确保内容在装饰元素之上 */}
        <div className="hero-content text-center z-10">
          <div className="max-w-2xl">
            <h1 className="mb-5 text-5xl font-bold">团剧共创</h1>
            <p className="mb-5 text-xl">
              欢迎来到共创者的社区。在这里，每一次二次创作都将反哺原作，共同构建一个不断进化和成长的故事宇宙。
            </p>
          </div>
        </div>

        {/* 5. 修改后的向下滑动提示，增加了过渡效果和基于状态的透明度控制 */}
        <div
          className={`absolute bottom-10 left-1/2 -translate-x-1/2 transition-opacity duration-500 ${isAtTop ? "opacity-100" : "opacity-0"}`}
        >
          <div className="flex flex-col items-center gap-2 animate-bounce cursor-pointer">
            <span className="text-sm">查看更多</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Section 2: 核心理念 */}
      <div className="py-20 px-4 bg-base-200">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-4">创作，本应如此</h2>
          <p className="text-lg">
            我们借鉴开源社区的协作模式，为文学创作打造了一个全新的生态。你的每一次跑团、每一次改编，都不再是孤立的瞬间，而是为整个作品世界添砖加瓦。
          </p>
        </div>
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 text-center">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mb-4 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.657 7.343A8 8 0 0117.657 18.657zM9 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <h3 className="card-title">灵感永不枯竭</h3>
              <p>借鉴社区中其他创作者的素材库，让你的KP脑洞大开，构建更丰满的世界。</p>
            </div>
          </div>
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mb-4 text-secondary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 6.253v11.494m-9-5.747h18"
                />
              </svg>
              <h3 className="card-title">创作反哺原作</h3>
              <p>优秀的二创内容可以像Git一样，通过“分支”和“合并”请求，被整合进主模组。</p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: 功能演示 - 如何运作 */}
      <div className="py-20 px-4">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-10">一体化的创作与游玩体验</h2>
        </div>
        <ul className="timeline timeline-snap-icon max-md:timeline-compact timeline-vertical container mx-auto">
          <li>
            <div className="timeline-middle">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="timeline-start md:text-end mb-10">
              <time className="font-mono italic">第一步</time>
              <div className="text-lg font-black">发现与集结</div>
              在官方与社区共同维护的剧本库中，选择心仪的模组。在网上或现实中找到伙伴，组成一个聊天室，准备开始冒险。
            </div>
            <hr />
          </li>
          <li>
            <hr />
            <div className="timeline-middle">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="timeline-end mb-10">
              <time className="font-mono italic">第二步</time>
              <div className="text-lg font-black">沉浸式扮演</div>
              我们提供了专为跑团优化的聊天室，集成了角色卡、骰子、log记录等功能。告别简陋的QQ群，享受真正的带入感。
            </div>
            <hr />
          </li>
          <li>
            <hr />
            <div className="timeline-middle">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="timeline-start md:text-end mb-10">
              <time className="font-mono italic">第三步</time>
              <div className="text-lg font-black">共创与反馈</div>
              游玩结束后，将你们共同创造的精彩细节、全新剧情线，更新到社区模组中，为后来者提供更多可能性。
            </div>
            <hr />
          </li>
          <li>
            <hr />
            <div className="timeline-middle">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="timeline-end">
              <time className="font-mono italic">第四步</time>
              <div className="text-lg font-black">分享与吸引</div>
              基于Webgal，一键将跑团log转化为可以游玩的视觉小说或视频，分享到各大平台，让你的故事吸引更多同好，成为下一个“淤泥之花”。
            </div>
          </li>
        </ul>
      </div>

      {/* Section 4: 使命与愿景 */}
      <div className="py-20 px-4 bg-neutral text-neutral-content">
        <div className="container mx-auto text-center max-w-4xl">
          <h2 className="text-4xl font-bold mb-4">我们的使命</h2>
          <p className="text-lg mb-8">
            让开源社区的理念，从程序开发走向文学创作，走向人与人之间的交往中。让开放，包容，有活力，共同创作的风气，走到更多的领域里面。
          </p>
        </div>
      </div>

      {/* Section 5: 加入我们 (Call to Action) */}
      <div className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold">故事的序章，由你谱写</h2>
          <p className="my-4 text-lg">
            无论你是想讲述自己故事的创作者，还是寻找同好的跑团玩家，
            <br />
            “团剧共创”都期待你的加入。
          </p>
          <p className="mt-8">
            本项目目前为学习型项目，我们真切地希望各位能在这里学到东西，并对这个领域做出贡献。
            <br />
            <a
              href="https://ycn45b70r8yz.feishu.cn/wiki/NM7ow5OWsik737k2UsLcWdJgn1i?fromScene=spaceOverview"
              className="link link-info"
            >
              欢迎参与我们的开发！
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
