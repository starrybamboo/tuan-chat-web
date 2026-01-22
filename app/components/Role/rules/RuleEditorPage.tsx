import { ApiError } from "api";
import { useGetRuleDetailQuery } from "api/hooks/ruleQueryHooks";
import { useEffect, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router";

import RuleCreationEditor from "./RuleCreationEditor";

type RuleEditorMode = "create" | "edit";

interface RuleEditorPageProps {
  onBack?: () => void;
}

export default function RuleEditorPage({ onBack }: RuleEditorPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const ruleIdParam = searchParams.get("ruleId");

  // 解析规则 id 参数, 并防止不必要的 effect 触发
  const parsed = useMemo((): { mode: RuleEditorMode; ruleId?: number; invalidParam?: string } => {
    if (!ruleIdParam)
      return { mode: "create" };

    const ruleId = Number(ruleIdParam);
    const isValid = Number.isFinite(ruleId) && ruleId > 0;

    if (!isValid)
      return { mode: "create", invalidParam: ruleIdParam };

    return { mode: "edit", ruleId };
  }, [ruleIdParam]);

  // 防止重复执行回退副作用
  const didFallbackRef = useRef(false);

  // 处理 ruleId 存在但非法
  useEffect(() => {
    if (!parsed.invalidParam)
      return;
    if (didFallbackRef.current)
      return;
    didFallbackRef.current = true;

    toast.error(`无效的 ruleId 参数：${parsed.invalidParam}`);
    navigate("/role", { replace: true });
  }, [navigate, parsed.invalidParam]);

  const ruleDetailQuery = useGetRuleDetailQuery(parsed.mode === "edit" ? parsed.ruleId ?? 0 : 0);

  // 处理请求失败/找不到
  useEffect(() => {
    if (parsed.mode !== "edit")
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

      navigate("/role", { replace: true });
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
        navigate("/role", { replace: true });
      }
    }
  }, [navigate, parsed.mode, ruleDetailQuery.data, ruleDetailQuery.error, ruleDetailQuery.isError, ruleDetailQuery.isSuccess]);

  if (parsed.invalidParam)
    return null;

  return (
    <RuleCreationEditor
      mode={parsed.mode}
      isQueryLoading={parsed.mode === "edit" ? ruleDetailQuery.isLoading : false}
      ruleId={parsed.mode === "edit" ? parsed.ruleId : undefined}
      ruleDetail={parsed.mode === "edit" ? ruleDetailQuery.data?.data : undefined}
      onBack={onBack}
    />
  );
}
