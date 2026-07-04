export type AuthSuccessFlowResult = "custom-success" | "default-close" | "mobile-callback";

type RunAuthSuccessFlowOptions = {
  onSuccess?: () => void;
  onClose: () => void;
  invalidateRouter: () => void | Promise<void>;
  mobileCallbackUrl?: string | null;
  navigateToMobileCallback?: (url: string) => void;
};

function navigateBrowserToMobileCallback(url: string) {
  window.location.href = url;
}

export function runAuthSuccessFlow({
  onSuccess,
  onClose,
  invalidateRouter,
  mobileCallbackUrl,
  navigateToMobileCallback = navigateBrowserToMobileCallback,
}: RunAuthSuccessFlowOptions): AuthSuccessFlowResult {
  if (mobileCallbackUrl) {
    navigateToMobileCallback(mobileCallbackUrl);
    return "mobile-callback";
  }

  if (onSuccess) {
    onSuccess();
    return "custom-success";
  }

  onClose();
  void invalidateRouter();
  return "default-close";
}
