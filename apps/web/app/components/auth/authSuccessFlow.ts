export type AuthSuccessFlowResult = "custom-success" | "default-close";

type RunAuthSuccessFlowOptions = {
  onSuccess?: () => void;
  onClose: () => void;
  invalidateRouter: () => void | Promise<void>;
};

export function runAuthSuccessFlow({
  onSuccess,
  onClose,
  invalidateRouter,
}: RunAuthSuccessFlowOptions): AuthSuccessFlowResult {
  if (onSuccess) {
    onSuccess();
    return "custom-success";
  }

  onClose();
  void invalidateRouter();
  return "default-close";
}
