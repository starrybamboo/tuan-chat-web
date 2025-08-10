import React from "react";
import ReactMarkdown from "react-markdown";
// eslint-disable-next-line ts/ban-ts-comment
// @ts-expect-error
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
// 由于tailwind的preflight.css覆盖了原本的html样式，这里需要重新定义样式
const MARKDOWN_STYLES = `
  [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:my-6
  [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:my-5
  [&_h3]:text-2xl [&_h3]:font-bold [&_h3]:my-4
  [&_h4]:text-xl [&_h4]:font-bold [&_h4]:my-3
  [&_h5]:text-lg [&_h5]:font-bold [&_h5]:my-2
  [&_h6]:text-base [&_h6]:font-bold [&_h6]:my-2
  
  [&_a]:underline [&_a:hover]:text-blue-800 [&_a:hover]:dark:text-blue-300
  
  [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 
  [&_blockquote]:dark:border-gray-600 [&_blockquote]:pl-4 
  [&_blockquote]:my-4 [&_blockquote]:text-gray-600 [&_blockquote]:dark:text-gray-300
  
  [&_code]:font-mono [&_code]:bg-base-200
  [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm
  
  [&_pre]:font-mono [&_pre]:bg-base-200
  [&_pre]:p-4 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:my-4
  
  [&_em]:italic
  [&_strong]:font-bold
  [&_del]:line-through [&_del]:text-gray-500 [&_del]:dark:text-gray-400
  
  [&_hr]:border-t [&_hr]:border-gray-300 [&_hr]:dark:border-gray-700 [&_hr]:my-4
  
  [&_img]:max-w-full [&_img]:h-auto [&_img]:my-4
  
  [&_ul]:my-4 [&_ul]:pl-6 [&_ul]:list-disc
  [&_ol]:my-4 [&_ol]:pl-6 [&_ol]:list-decimal
  [&_li]:my-1
  
  [&_p]:my-4
  
  [&_table]:w-full [&_table]:my-4 [&_table]:border-collapse
  [&_th]:border [&_th]:border-gray-300 [&_th]:dark:border-gray-600 
  [&_th]:px-4 [&_th]:py-2 [&_th]:bg-gray-100 [&_th]:dark:bg-gray-800 
  [&_th]:font-semibold [&_th]:text-left
  [&_td]:border [&_td]:border-gray-300 [&_td]:dark:border-gray-600 
  [&_td]:px-4 [&_td]:py-2
  [&_thead]:bg-gray-50 [&_thead]:dark:bg-gray-800/50
  
  [&_input]:border [&_input]:border-gray-300 [&_input]:dark:border-gray-600 
  [&_input]:rounded [&_input]:px-3 [&_input]:py-2 
  [&_input]:bg-white [&_input]:dark:bg-gray-800 
  [&_input]:text-gray-900 [&_input]:dark:text-gray-100
`;

/**
 * 嵌入markdown渲染器中的组件
 * @param type 媒体类型
 * @param src 对于bilibili与youtube，src为视频id，对于pdf，src为pdf链接
 * @constructor
 */
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

/**
 * markdown渲染器，很简单，传一个string就可以用
 * @param content markdown内容
 * @constructor
 */
export function MarkDownViewer({ content }: { content: string }) {
  return (
    <div className={`prose max-w-none ${MARKDOWN_STYLES} overflow-hidden`}>
      <ReactMarkdown
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { children, className, node, ...rest } = props;
            const match = /language-(\w+)/.exec(className || "");
            return match
              ? (
                  <SyntaxHighlighter
                    {...rest}
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
            const embedMatches = [...textContent.matchAll(/\{\{([^:]+):([^}]+)\}\}/g)];

            if (embedMatches.length > 0) {
              let lastIndex = 0;
              const parts: React.ReactNode[] = [];

              for (const match of embedMatches) {
                // 添加匹配前的文本
                if (match.index !== undefined && match.index > lastIndex) {
                  const text = textContent.substring(lastIndex, match.index);
                  parts.push(<p key={`text-${lastIndex}`} {...props}>{text}</p>);
                }

                // 添加嵌入组件
                const [_, type, src] = match;
                parts.push(
                  <MediaEmbed
                    key={`embed-${match.index}`}
                    type={type.trim()}
                    src={src.trim()}
                  />,
                );

                // 更新最后处理的位置
                lastIndex = match.index + match[0].length;
              }

              // 添加最后一段文本
              if (lastIndex < textContent.length) {
                const text = textContent.substring(lastIndex);
                parts.push(<p key="text-end" {...props}>{text}</p>);
              }

              return <>{parts}</>;
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
