type NativeTabBarVisibilityInput = {
  chatTabBarHidden: boolean;
  isHomeTab: boolean;
  isKeyboardVisible: boolean;
};

/** 统一计算工作区覆盖层和软键盘共同作用下的原生标签栏可见性。 */
export function shouldHideNativeTabBar(input: NativeTabBarVisibilityInput): boolean {
  return input.isKeyboardVisible || (input.isHomeTab && input.chatTabBarHidden);
}
