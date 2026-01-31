import { ApiError } from "api";
import { useGetRuleDetailQuery } from "api/hooks/ruleQueryHooks";
import { useEffect, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router";

import RuleEditor from "./RuleEditor";
import RuleEditorEntryPage from "./RuleEditorEntryPage";

interface RuleEditorRouteProps {
  onBack?: () => void;
}

export default function RuleEditorRoute({ onBack }: RuleEditorRouteProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const modeParam = searchParams.get("mode");
  const ruleIdParam = searchParams.get("ruleId");

  const parsed = useMemo(() => {
    // mode 缺失默认是选择页
    if (!modeParam) {
      return { view: "select" as const };
    }

    if (modeParam === "create") {
      // 若带了 ruleId，忽略并规范化
      return { view: "create" as const, shouldCanonicalize: Boolean(ruleIdParam) };
    }

    if (modeParam === "edit") {
      if (!ruleIdParam) {
        return { view: "invalid-edit" as const, reason: "missing" as const };
      }

      const ruleId = Number(ruleIdParam);
      const isValid = Number.isFinite(ruleId) && ruleId > 0;

      if (!isValid) {
        return { view: "invalid-edit" as const, reason: "invalid" as const, invalidParam: ruleIdParam };
      }

      return { view: "edit" as const, ruleId };
    }

    return { view: "invalid-mode" as const, invalidMode: modeParam };
  }, [modeParam, ruleIdParam]);

  // 防止重复执行回退副作用
  const didFallbackRef = useRef(false);
  const didCanonicalizeRef = useRef(false);

  // mode=create 但带了 ruleId：忽略并导航到规范 URL
  useEffect(() => {
    if (parsed.view !== "create")
      return;

    if (!parsed.shouldCanonicalize)
      return;
    if (didCanonicalizeRef.current)
      return;
    didCanonicalizeRef.current = true;

    navigate("/role?type=rule&mode=create", { replace: true });
  }, [navigate, parsed.view, parsed.shouldCanonicalize]);

  // mode=edit 但 ruleId 缺失/非法 or 未知 mode：统一回退到选择页
  useEffect(() => {
    if (didFallbackRef.current)
      return;

    if (parsed.view === "invalid-edit") {
      didFallbackRef.current = true;

      if (parsed.reason === "missing") {
        toast.error("缺少 ruleId 参数，无法编辑规则");
      }
      else {
        toast.error(`无效的 ruleId 参数：${parsed.invalidParam}`);
      }

      navigate("/role?type=rule", { replace: true });
      return;
    }

    if (parsed.view === "invalid-mode") {
      didFallbackRef.current = true;
      toast.error(`无效的 mode 参数：${parsed.invalidMode}`);
      navigate("/role?type=rule", { replace: true });
    }
  }, [navigate, parsed]);

  const ruleDetailQuery = useGetRuleDetailQuery(parsed.view === "edit" ? parsed.ruleId : 0);

  // 处理请求失败/找不到
  useEffect(() => {
    if (parsed.view !== "edit")
      return;
    if (didFallbackRef.current)
      return;

    if (ruleDetailQuery.isError) {
      didFallbackRef.current = true;

      const error = ruleDetailQuery.error;
      if (error instanceof ApiError) {
        const msg = error.body?.errMsg || error.message || "获取规则失败";
        toast.error(`获取规则失败（${error.status}）：${msg}`);
      }
      else {
        const msg = error instanceof Error ? error.message : "获取规则失败";
        toast.error(`获取规则失败：${msg}`);
      }

      navigate("/role?type=rule", { replace: true });
      return;
    }

    if (ruleDetailQuery.isSuccess) {
      const res = ruleDetailQuery.data;
      const rule = res?.data;

      if (!res?.success || !rule) {
        didFallbackRef.current = true;

        const code = typeof res?.errCode === "number" ? res.errCode : 200;
        const msg = res?.errMsg || "找不到对应的规则";
        toast.error(`找不到规则（${code}）：${msg}`);
        navigate("/role?type=rule", { replace: true });
      }
    }
  }, [navigate, parsed.view, ruleDetailQuery.data, ruleDetailQuery.error, ruleDetailQuery.isError, ruleDetailQuery.isSuccess]);

  if (parsed.view === "create" && parsed.shouldCanonicalize) {
    // 正在 replace 到规范 URL
    return null;
  }

  if (parsed.view === "invalid-edit" || parsed.view === "invalid-mode")
    return null;

  if (parsed.view === "select") {
    return <RuleEditorEntryPage onBack={onBack} />;
  }

  return (
    <RuleEditor
      mode={parsed.view}
      isQueryLoading={parsed.view === "edit" ? ruleDetailQuery.isLoading : false}
      ruleId={parsed.view === "edit" ? parsed.ruleId : undefined}
      ruleDetail={parsed.view === "edit" ? ruleDetailQuery.data?.data : undefined}
      onBack={onBack}
    />
  );
}
