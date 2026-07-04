import type { ReactNode } from "react";

import { useNavigate } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { resolveMediaContentSource } from "@/components/common/content/mediaContent";
import { MediaImage } from "@/components/common/mediaImage";
import { imageMediumUrlFromUrl } from "@/utils/media/mediaUrl";

import LinkComponent from "./linkHandler";
import { MarkdownSyntaxHighlighter } from "./markdownSyntaxHighlighter";
// 由于tailwind的preflight.css覆盖了原本的html样式，这里需要重新定义样式
const MARKDOWN_STYLES = `
  [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:my-6
  [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:my-5
  [&_h3]:text-2xl [&_h3]:font-bold [&_h3]:my-4
  [&_h4]:text-xl [&_h4]:font-bold [&_h4]:my-3
  [&_h5]:text-lg [&_h5]:font-bold [&_h5]:my-2
  [&_h6]:text-base [&_h6]:font-bold [&_h6]:my-2

  [&_a]:underline [&_a:hover]:text-info [&_a:hover]:dark:text-info

  [&_blockquote]:border-l-4 [&_blockquote]:border-base-300
  [&_blockquote]:dark:border-base-300 [&_blockquote]:pl-4
  [&_blockquote]:my-4 [&_blockquote]:text-base-content/70 [&_blockquote]:dark:text-base-content/50

  [&_code]:font-mono [&_code]:bg-base-200
  [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm

  [&_pre]:font-mono [&_pre]:bg-base-200
  [&_pre]:p-4 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:my-4

  [&_em]:italic
  [&_strong]:font-bold
  [&_del]:line-through [&_del]:text-base-content/60 [&_del]:dark:text-base-content/50
  
  [&_hr]:border-t [&_hr]:border-base-300 [&_hr]:dark:border-base-300 [&_hr]:my-4
  
  [&_img]:max-w-full [&_img]:h-auto [&_img]:my-4
  
  [&_ul]:my-4 [&_ul]:pl-6 [&_ul]:list-disc
  [&_ol]:my-4 [&_ol]:pl-6 [&_ol]:list-decimal
  [&_li]:my-1
  
  [&_p]:my-4
  
  [&_table]:w-full [&_table]:my-4 [&_table]:border-collapse
  [&_th]:border [&_th]:border-base-300 [&_th]:dark:border-base-300
  [&_th]:px-4 [&_th]:py-2 [&_th]:bg-base-200 [&_th]:dark:bg-base-300
  [&_th]:font-semibold [&_th]:text-left
  [&_td]:border [&_td]:border-base-300 [&_td]:dark:border-base-300
  [&_td]:px-4 [&_td]:py-2
  [&_thead]:bg-base-200 [&_thead]:dark:bg-base-300/50

  [&_input]:border [&_input]:border-base-300 [&_input]:dark:border-base-300
  [&_input]:rounded [&_input]:px-3 [&_input]:py-2
  [&_input]:bg-white [&_input]:dark:bg-base-300
  [&_input]:text-base-content [&_input]:dark:text-base-content/50
`;

function parseFileEmbedSource(src: string) {
  const [rawSource, ...nameParts] = src.split("|");
  const source = rawSource?.trim() ?? "";
  const fileName = nameParts.join("|").trim() || "下载附件";
  return { fileName, source };
}

/**
 * 嵌入markdown渲染器中的组件
 * @param type 媒体类型
 * @param src 对于bilibili与youtube，src为视频id，对于pdf，src为pdf链接
 * @constructor
 */
function MediaEmbed({ type, src }: { type: string; src: string }) {
  const sandbox = "allow-same-origin allow-scripts allow-popups allow-forms allow-presentation";
  switch (type) {
    case "video":
      return (
        <div className="
          my-4 overflow-hidden rounded-2xl border border-base-300 bg-base-200/20
        ">
          <div className="aspect-video overflow-hidden bg-base-200">
            <video
              src={resolveMediaContentSource(src, "video", "medium") || src}
              controls={true}
              preload="metadata"
              className="h-full w-full object-contain"
            />
          </div>
        </div>
      );
    case "bilibili":
      return (
        <div className="my-4 aspect-video w-full rounded-full">
          <iframe
            src={`//player.bilibili.com/player.html?bvid=${src}&high_quality=1&danmaku=0`}
            allowFullScreen
            sandbox={sandbox}
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
        <div className="my-4 h-[600px] w-full bg-base-200">
          <iframe
            src={`${src}#view=fitH`}
            className="w-full h-full border-none"
            allowFullScreen
            sandbox={sandbox}
          />
        </div>
      );
    case "file": {
      const { fileName, source } = parseFileEmbedSource(src);
      const href = resolveMediaContentSource(source, "other", "original") || source;
      return (
        <a
          className="
            my-3 inline-flex max-w-full items-center rounded-md border border-base-300
            bg-base-100 px-3 py-2 text-sm font-medium no-underline
            hover:bg-base-200
          "
          href={href}
          download={fileName}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="truncate">{fileName}</span>
        </a>
      );
    }
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
            sandbox={sandbox}
          >
          </iframe>
        </div>
      );
    default:
      return (
        <div className="text-error">
          不支持的嵌入类型:
          {type}
        </div>
      );
  }
}

/**
 * markdown渲染器，很简单，传一个string就可以用
 * @param props - 组件属性
 * @param props.content - markdown内容
 * @constructor
 */
export function MarkDownViewer({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const navigate = useNavigate();

  return (
    <div className={`
      prose max-w-none
      ${MARKDOWN_STYLES}
      overflow-hidden
      ${className ?? ""}
    `}>
      <ReactMarkdown
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        remarkPlugins={[remarkGfm]}
        components={{
          a: (props: any) => <LinkComponent {...props} navigate={navigate} />,
          img(props) {
            const { src, ...rest } = props;
            return (
              <MediaImage
                {...rest}
                src={typeof src === "string" ? resolveMediaContentSource(src, "image", "medium") || imageMediumUrlFromUrl(src) : src}
              />
            );
          },
          code(props) {
            const { children, className, node: _node, ...rest } = props;
            const match = /language-(\w+)/.exec(className || "");
            return match
              ? (
                  <MarkdownSyntaxHighlighter
                    {...rest}
                    className={className}
                    language={match[1]}
                  >
                    {String(children).replace(/\n$/, "")}
                  </MarkdownSyntaxHighlighter>
                )
              : (
                  <code {...rest} className={className}>
                    {children}
                  </code>
                );
          },
          p({ node: _node, children, ...props }: any) {
            // 收集所有文本节点内容
            const childrenArray = Array.isArray(children) ? children : [children];
            const textContent = childrenArray
              .map(child => typeof child === "string" ? child : "")
              .join("");

            // 匹配 {{type:source}} 格式
            const embedMatches = [...textContent.matchAll(/\{\{([^:]+):([^}]+)\}\}/g)];

            if (embedMatches.length > 0) {
              let lastIndex = 0;
              const parts: ReactNode[] = [];

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
