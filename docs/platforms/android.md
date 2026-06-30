# Android 图标与启动图标准

## APP 图标

- 通用图标使用 `apps/mobile/assets/images/icon.png`，尺寸为 `1024x1024`。
- Android adaptive icon 使用 `apps/mobile/app.json` 的 `expo.android.adaptiveIcon` 配置：
  - `backgroundColor`: `#313338`
  - `backgroundImage`: `apps/mobile/assets/images/android-icon-background.png`
  - `foregroundImage`: `apps/mobile/assets/images/android-icon-foreground.png`
  - `monochromeImage`: `apps/mobile/assets/images/android-icon-monochrome.png`
- Android 桌面图标会被不同 launcher 按圆形、圆角矩形等形状裁切；前景主体必须保留安全边距，不能贴满 `1024x1024` 画布。

## 启动图

- Expo splash 使用 `apps/mobile/app.json` 的 `expo-splash-screen` 配置：
  - `backgroundColor`: `#313338`
  - `image`: `apps/mobile/assets/images/splash-icon.png`
  - `imageWidth`: `240`
  - `resizeMode`: `contain`
  - `android.drawable.icon`: `apps/mobile/assets/images/android-splash/splashscreen_logo.xml`
- Android 12+ 会把 `windowSplashScreenAnimatedIcon` 当作系统 splash icon 显示，不是全屏启动海报。
- 启动图资源由 `apps/mobile/plugins/with-android-splash-logo.cjs` 固定到 Android 原生目录：
  - `apps/mobile/android/app/src/main/res/drawable/splashscreen_logo.xml`
  - `apps/mobile/android/app/src/main/res/drawable-mdpi/splashscreen_logo_image.png`，`216x216`
  - `apps/mobile/android/app/src/main/res/drawable-hdpi/splashscreen_logo_image.png`，`324x324`
  - `apps/mobile/android/app/src/main/res/drawable-xhdpi/splashscreen_logo_image.png`，`432x432`
  - `apps/mobile/android/app/src/main/res/drawable-xxhdpi/splashscreen_logo_image.png`，`648x648`
  - `apps/mobile/android/app/src/main/res/drawable-xxxhdpi/splashscreen_logo_image.png`，`864x864`
- `Theme.App.SplashScreen` 的 `windowSplashScreenAnimatedIcon` 保持引用 `@drawable/splashscreen_logo`。这个资源必须是 XML wrapper，不要让它落回 Expo 自动生成的密度 PNG。
- Android splash icon 的推荐可视主体约为 `160dp`。当前密度 PNG 画布为 `216dp`，可见主体生成到约 `160dp`。
- 团剧共创的复杂角色启动图必须生成到透明 `1024x1024` PNG 内，PNG 内只保留角色/气泡主体透明图层，不要把 `#313338` 背景烘焙进图片里。
- 启动页背景只由 `windowSplashScreenBackground` / `expo-splash-screen.backgroundColor` 提供。否则 Android 淡出时会看到一块方形截图压在页面上。
- 不要通过关闭或缩短 splash 淡出动画来掩盖图片问题；淡出动画保留默认行为，问题应通过正确的 splash icon 安全区解决。
