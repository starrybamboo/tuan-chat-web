/**
 * 判断是否为内部链接
 * @param href 链接地址
 * @returns 是否为内部链接
 */
function isInternalLink(href: string): boolean {
  if (!href)
    return false;

  // 如果是相对路径，认为是内部链接
  if (href.startsWith("/"))
    return true;

  // 如果是锚点链接，认为是内部链接
  if (href.startsWith("#"))
    return true;

  // 如果是完整 URL，检查是否是同域名
  try {
    const url = new URL(href, window.location.origin);
    return url.origin === window.location.origin;
  }
  catch {
    // 如果不是有效 URL，认为是内部链接
    return true;
  }
}

/**
 * 自定义链接组件
 */
export default function LinkComponent({ href, children, navigate, ...props }: any) {
  if (isInternalLink(href)) {
    return (
      <a
        {...props}
        href={href}
        onClick={(e) => {
          e.preventDefault();
          if (href.startsWith("#")) {
            // 锚点链接，滚动到对应位置
            const targetId = href.substring(1); // 移除 # 号

            // 延迟执行，确保 DOM 已更新
            setTimeout(() => {
              // 尝试多种选择器
              let element = document.getElementById(targetId);

              if (!element) {
                // 如果找不到，尝试查找 span[id] 元素
                element = document.querySelector(`span[id="${targetId}"]`);
              }

              if (!element) {
                // 如果还找不到，尝试查找包含该文本的标题元素
                const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6, span[id]"));
                element = headings.find(el =>
                  el.id === targetId
                  || el.textContent?.includes(targetId.replace(/[_-]/g, " ")),
                ) as HTMLElement;
              }

              if (element) {
                element.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }
              else {
                console.warn(`无法找到锚点元素: ${href}`);
              }
            }, 100);
          }
          else {
            // 内部路由，使用 navigate
            navigate(href);
          }
        }}
      >
        {children}
      </a>
    );
  }

  // 外部链接，正常处理
  return (
    <a {...props} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
