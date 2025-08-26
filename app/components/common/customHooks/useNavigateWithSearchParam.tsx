import type { NavigateOptions, To } from "react-router";
import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router";

/**
 * 一个自定义 Hook，包装了 React Router 的 `useNavigate` Hook。
 *
 * @returns {function(To, NavigateOptions?): void} 一个导航函数，其行为与原始函数相同，但如果新目标没有自己的搜索参数，它将保留当前 URL 的搜索参数。
 */
export default function useNavigateWithSearchParam(): (
to: To,
options?: NavigateOptions
) => void {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(
    (to: To, options?: NavigateOptions) => {
      // 如果 `to` 是一个数字 (例如 navigate(-1))，行为保持不变。
      let finalTo: To;

      // 如果 `to` 是一个字符串 (最常见的用法)
      if (typeof to === "string") {
        // 如果字符串中已经包含了 '?'，意味着用户正在指定
        // 新的搜索参数，所以我们直接使用它。
        // 否则，我们就附加当前 URL 的搜索参数。
        finalTo = to.includes("?") ? to : { pathname: to, search: location.search };
      }
      else {
        // 如果 `to` 是一个对象 (例如 { pathname: '/path', hash: '#id' })
        // 我们使用 `??` (空值合并操作符) 来添加 `location.search`，
        // 仅当 `to.search` 在对象中未定义时。
        finalTo = {
          ...to,
          search: to.search ?? location.search,
        };
      }

      navigate(finalTo, options);
    },
    [navigate, location.search], // 依赖项
  );
}
