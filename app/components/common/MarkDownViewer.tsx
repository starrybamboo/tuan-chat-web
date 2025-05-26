import React from "react";
import ReactMarkdown from "react-markdown";
// eslint-disable-next-line ts/ban-ts-comment
// @ts-expect-error
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
// import { dark } from "react-syntax-highlighter/dist/esm/styles/prism";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

export function MarkdownViewer({ content }: { content: string }) {
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
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
