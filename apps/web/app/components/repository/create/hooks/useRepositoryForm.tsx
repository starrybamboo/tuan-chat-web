import type { SubmitHandler } from "react-hook-form";

import { useForm, useWatch } from "react-hook-form";

import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import message from "@/components/common/message/message";
import { useAddRepositoryMutation } from "api/hooks/repositoryQueryHooks";

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
          message.success("创建仓库成功");
          setModalOpen(true);
          reset();
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
    ruleId,
  };
}
