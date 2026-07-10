import type { SubmitHandler } from "react-hook-form";

import { useAddRepositoryMutation } from "api/hooks/repositoryQueryHooks";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { appToast } from "@/components/common/appToast/appToast";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";

export type RepositoryCreateRequest = {
  ruleId: number;
  authorName: string;
  description: string;
  repositoryName: string;
  coverFileId?: number;
}

export function useRepositoryForm() {
  // 控制仓库创建成功弹窗
  const [modalOpen, setModalOpen] = useSearchParamsState(
    "repositoryCreateModalOpen",
    false,
  );
  const [createdRepositoryName, setCreatedRepositoryName] = useState("");

  // react-hook-form 表单
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<RepositoryCreateRequest>({
    defaultValues: {
      ruleId: undefined,
      authorName: "",
      repositoryName: "",
      description: "",
      coverFileId: undefined,
    },
    mode: "onChange",
  });
  const ruleId = useWatch({
    control,
    name: "ruleId",
  });

  // 数据提交行为
  const mutation = useAddRepositoryMutation();
  const submit: SubmitHandler<RepositoryCreateRequest> = (data) => {
    mutation.mutate(
      data,
      {
        onSuccess: () => {
          const repositoryName = data.repositoryName.trim() || "未命名仓库";
          setCreatedRepositoryName(repositoryName);
          appToast.success({
            title: `仓库「${repositoryName}」已创建`,
            description: "可以继续前往创作工作台编辑内容。",
          });
          setModalOpen(true);
          reset();
        },
        onError: (error) => {
          appToast.error({
            title: "仓库创建失败",
            description: error instanceof Error && error.message ? error.message : "请稍后重试。",
          });
        },
      },
    );
  };

  return {
    register,
    handleSubmit,
    control,
    setValue,
    errors,
    submit,
    modalOpen,
    setModalOpen,
    createdRepositoryName,
    ruleId,
  };
}
