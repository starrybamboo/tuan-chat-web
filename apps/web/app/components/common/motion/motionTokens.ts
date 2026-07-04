// 动效 token 的 motion 侧镜像。值须与 app/app.css 的 @theme 中 --ease-* / --duration-* 严格对应。
// ease：基础曲线用 motion 内置字符串 "easeOut"/"easeInOut"/"easeIn"（与 Tailwind ease-out/in-out/in 同值）；
//       仅 emphasized 是项目独有曲线，需贝塞尔数组。不要给数组加 `as const`——会变 readonly，不可赋值给 motion 的可变 Easing 类型。
// duration：秒（motion 用秒；CSS 侧 --duration-* 用 ms，数值对应：200ms ↔ 0.2s）。

export const motionEase = {
  emphasized: [0.22, 1, 0.36, 1],
} satisfies Record<string, [number, number, number, number]>;

export const motionDuration = {
  fast: 0.15,
  base: 0.2,
  slow: 0.3,
  slower: 0.5,
} satisfies Record<string, number>;
