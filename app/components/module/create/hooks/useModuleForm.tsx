import type { SubmitHandler } from "react-hook-form";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import message from "@/components/common/message/message";
import { useAddModuleMutation } from "api/hooks/moduleQueryHooks";
import { useForm } from "react-hook-form";

export interface ModuleCreateRequest {
  ruleId: number;
  authorName: string;
  description: string;
  moduleName: string;
  image: string;
}

export function useModuleForm() {
  // 控制模组创建成功弹窗
  const [modalOpen, setModalOpen] = useSearchParamsState(
    "moduleCreateModalOpen",
    false,
  );

  // react-hook-form 表单
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ModuleCreateRequest>({
    defaultValues: {
      ruleId: undefined,
      authorName: "",
      moduleName: "",
      description: "",
      image: "",
    },
    mode: "onChange",
  });

  // 数据提交行为
  const mutation = useAddModuleMutation();
  const submit: SubmitHandler<ModuleCreateRequest> = (data) => {
    mutation.mutate(
      data,
      {
        onSuccess: () => {
          message.success("创建模组成功");
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
    ruleId: watch("ruleId"),
  };
}
