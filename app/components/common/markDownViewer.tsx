import React from "react";
import ReactMarkdown from "react-markdown";
// eslint-disable-next-line ts/ban-ts-comment
// @ts-expect-error
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
// import { dark } from "react-syntax-highlighter/dist/esm/styles/prism";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

function MediaEmbed({ type, src }: { type: string; src: string }) {
  switch (type) {
    case "bilibili":
      return (
        <div className="my-4 aspect-video w-full rounded-full">
          <iframe
            src={`//player.bilibili.com/player.html?bvid=${src}&high_quality=1&danmaku=0`}
            allowFullScreen
            width="100%"
            height="500"
            scrolling="no"
            frameBorder="0"
          >
          </iframe>
        </div>
      );
    case "pdf":
      return (
        <div className="my-4 h-[600px] w-full bg-gray-100">
          <iframe
            src={`${src}#view=fitH`}
            className="w-full h-full border-none"
            allowFullScreen
          />
        </div>
      );
    case "youtube":
      return (
        <div className="my-4 aspect-video w-full max-w-2xl">
          <iframe
            width="560"
            height="315"
            src={`https://www.youtube.com/embed/${src}`}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          >
          </iframe>
        </div>
      );
    default:
      return (
        <div className="text-red-500">
          不支持的嵌入类型:
          {type}
        </div>
      );
  }
}

export function MarkDownViewer({ content }: { content: string }) {
  return (
    <div className="prose max-w-none">
      <ReactMarkdown
        rehypePlugins={[rehypeRaw]}
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { children, className, node, ...rest } = props;
            const match = /language-(\w+)/.exec(className || "");
            return match
              ? (
                  <SyntaxHighlighter
                    {...rest}
                    PreTag="div"
                    children={String(children).replace(/\n$/, "")}
                    language={match[1]}
                    // style={dark}
                  />
                )
              : (
                  <code {...rest} className={className}>
                    {children}
                  </code>
                );
          },
          p({ node, children, ...props }: any) {
            // 收集所有文本节点内容
            const textContent = React.Children.toArray(children)
              .map(child => typeof child === "string" ? child : "")
              .join("");

            // 匹配 {{type:source}} 格式
            const embedMatch = textContent.match(/\{\{([^:]+):([^}]+)\}\}/);
            if (embedMatch) {
              const [_, type, src] = embedMatch;
              return <MediaEmbed type={type.trim()} src={src.trim()} />;
            }

            // 默认段落渲染
            return <p {...props}>{children}</p>;
          },

        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
