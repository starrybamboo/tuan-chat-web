type AnimationFrame = Record<string, unknown>;

export type PublishAnimationPresetFile = {
  path: string;
  content: string;
};

const FIGURE_ANIMATION_TABLE = [
  "position/enter",
  "position/exit",
  "position/ba-enter-from-left",
  "position/ba-enter-from-right",
  "position/ba-exit-to-left",
  "position/ba-exit-to-right",
  "action/BA-down",
  "action/BA-left-falldown",
  "action/BA-right-falldown",
  "action/BA-jump-twice",
  "action/BA-jump",
  "action/BA-shake",
  "action/BA-bigshake",
] as const;

const BACKGROUND_SLIDE_X = 1920;
const BACKGROUND_BLUR_STRENGTH = 20;
const BACKGROUND_SPEED_PROFILES = [
  { suffix: "", duration: 700 },
  { suffix: "-fast", duration: 300 },
  { suffix: "-slow", duration: 1200 },
] as const;

const BACKGROUND_ANIMATION_FACTORIES: Record<string, (duration: number) => AnimationFrame[]> = {
  "background/enter": duration => [
    { alpha: 0, duration: 0 },
    { alpha: 1, duration },
  ],
  "background/enter-from-left": duration => [
    { alpha: 1, position: { x: -BACKGROUND_SLIDE_X, y: 0 }, duration: 0 },
    { alpha: 1, position: { x: 0, y: 0 }, duration },
  ],
  "background/enter-from-right": duration => [
    { alpha: 1, position: { x: BACKGROUND_SLIDE_X, y: 0 }, duration: 0 },
    { alpha: 1, position: { x: 0, y: 0 }, duration },
  ],
  "background/blur-in": duration => [
    { alpha: 0, blur: BACKGROUND_BLUR_STRENGTH, duration: 0 },
    { alpha: 1, blur: 0, duration },
  ],
  "background/exit": duration => [
    { alpha: 1, duration: 0 },
    { alpha: 0, duration },
  ],
  "background/exit-to-left": duration => [
    { alpha: 1, position: { x: 0, y: 0 }, duration: 0 },
    { alpha: 1, position: { x: -BACKGROUND_SLIDE_X, y: 0 }, duration },
  ],
  "background/exit-to-right": duration => [
    { alpha: 1, position: { x: 0, y: 0 }, duration: 0 },
    { alpha: 1, position: { x: BACKGROUND_SLIDE_X, y: 0 }, duration },
  ],
};

const BACKGROUND_ANIMATION_TABLE = Object.keys(BACKGROUND_ANIMATION_FACTORIES).flatMap(baseName =>
  BACKGROUND_SPEED_PROFILES.map(profile => `${baseName}${profile.suffix}`)
);

const BUILTIN_ANIMATION_TABLE = [
  ...FIGURE_ANIMATION_TABLE,
  ...BACKGROUND_ANIMATION_TABLE,
];

const FIGURE_ANIMATION_FRAMES_BY_NAME: Record<typeof FIGURE_ANIMATION_TABLE[number], AnimationFrame[]> = {
  "position/enter": [
    { alpha: 0, duration: 0 },
    { alpha: 1, duration: 300 },
  ],
  "position/exit": [
    { alpha: 1, duration: 0 },
    { alpha: 0, duration: 300 },
  ],
  "position/ba-enter-from-left": [
    { alpha: 1, position: { x: -700, y: 0 }, duration: 0 },
    { alpha: 1, position: { x: 0, y: 0 }, duration: 1200 },
  ],
  "position/ba-enter-from-right": [
    { alpha: 1, position: { x: 700, y: 0 }, duration: 0 },
    { alpha: 1, position: { x: 0, y: 0 }, duration: 1200 },
  ],
  "position/ba-exit-to-left": [
    { alpha: 1, position: { x: 0, y: 0 }, duration: 0 },
    { alpha: 1, position: { x: -700, y: 0 }, duration: 1200 },
  ],
  "position/ba-exit-to-right": [
    { alpha: 1, position: { x: 0, y: 0 }, duration: 0 },
    { alpha: 1, position: { x: 700, y: 0 }, duration: 1200 },
  ],
  "action/BA-down": [
    { alpha: 1, position: { x: 0, y: 0 }, duration: 0 },
    { position: { x: 0, y: 32 }, duration: 125 },
    { position: { x: 0, y: 40 }, duration: 167 },
    { position: { x: 0, y: 40 }, duration: 45 },
    { position: { x: 0, y: 0 }, duration: 120 },
  ],
  "action/BA-left-falldown": [
    { alpha: 1, position: { x: 0, y: 0 }, rotation: 0, duration: 0 },
    { position: { x: -5, y: 0 }, rotation: -0.22, duration: 70 },
    { position: { x: -5, y: 0 }, rotation: -0.36, duration: 110 },
    { position: { x: -10, y: 0 }, rotation: -0.44, duration: 70 },
    { position: { x: 0, y: 0 }, rotation: 0, duration: 120 },
    { position: { x: 0, y: 0 }, rotation: 0, duration: 50 },
    { position: { x: 0, y: 0 }, rotation: 0.26, duration: 167 },
    { position: { x: 0, y: 100 }, rotation: -0.5, duration: 40 },
    { position: { x: -25, y: 250 }, rotation: -1.1, duration: 60 },
    { position: { x: -60, y: 600 }, rotation: -1.57, duration: 100 },
  ],
  "action/BA-right-falldown": [
    { alpha: 1, position: { x: 0, y: 0 }, rotation: 0, duration: 0 },
    { position: { x: 5, y: 0 }, rotation: 0.22, duration: 70 },
    { position: { x: 5, y: 0 }, rotation: 0.36, duration: 110 },
    { position: { x: 10, y: 0 }, rotation: 0.44, duration: 70 },
    { position: { x: 0, y: 0 }, rotation: 0, duration: 120 },
    { position: { x: 0, y: 0 }, rotation: 0, duration: 50 },
    { position: { x: 0, y: 0 }, rotation: -0.26, duration: 167 },
    { position: { x: 0, y: 100 }, rotation: 0.5, duration: 40 },
    { position: { x: 25, y: 250 }, rotation: 1.1, duration: 60 },
    { position: { x: 60, y: 600 }, rotation: 1.57, duration: 100 },
  ],
  "action/BA-jump-twice": [
    { alpha: 1, position: { x: 0, y: 0 }, duration: 0 },
    { position: { x: 0, y: -25 }, duration: 42 },
    { position: { x: 0, y: -25 }, duration: 63 },
    { position: { x: 0, y: 0 }, duration: 125 },
    { position: { x: 0, y: -25 }, duration: 42 },
    { position: { x: 0, y: -25 }, duration: 63 },
    { position: { x: 0, y: 0 }, duration: 125 },
  ],
  "action/BA-jump": [
    { alpha: 1, position: { x: 0, y: 0 }, duration: 0 },
    { position: { x: 0, y: -30 }, duration: 42 },
    { position: { x: 0, y: -30 }, duration: 63 },
    { position: { x: 0, y: 0 }, duration: 125 },
  ],
  "action/BA-shake": [
    { alpha: 1, position: { x: 0, y: 0 }, duration: 0 },
    { position: { x: -6, y: 3 }, duration: 30 },
    { position: { x: 6, y: -6 }, duration: 30 },
    { position: { x: -3, y: -9 }, duration: 30 },
    { position: { x: 9, y: 0 }, duration: 30 },
    { position: { x: -6, y: 6 }, duration: 30 },
    { position: { x: 3, y: -3 }, duration: 30 },
    { position: { x: 0, y: 0 }, duration: 30 },
  ],
  "action/BA-bigshake": [
    { alpha: 1, position: { x: 0, y: 0 }, duration: 0 },
    { position: { x: -120, y: 0 }, duration: 60 },
    { position: { x: 40, y: 0 }, duration: 40 },
    { position: { x: -25, y: 0 }, duration: 50 },
    { position: { x: 20, y: 0 }, duration: 50 },
    { position: { x: 0, y: 0 }, duration: 50 },
  ],
};

const BACKGROUND_ANIMATION_FRAMES_BY_NAME: Record<string, AnimationFrame[]> = Object.fromEntries(
  Object.entries(BACKGROUND_ANIMATION_FACTORIES).flatMap(([baseName, buildFrames]) =>
    BACKGROUND_SPEED_PROFILES.map(profile => [
      `${baseName}${profile.suffix}`,
      buildFrames(profile.duration),
    ])
  ),
);

const ANIMATION_FRAMES_BY_NAME: Record<string, AnimationFrame[]> = {
  ...FIGURE_ANIMATION_FRAMES_BY_NAME,
  ...BACKGROUND_ANIMATION_FRAMES_BY_NAME,
};

function toJsonFileContent(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export const BUILTIN_WEBGAL_ANIMATION_FILES: PublishAnimationPresetFile[] = [
  {
    path: "animation/animationTable.json",
    content: toJsonFileContent(BUILTIN_ANIMATION_TABLE),
  },
  ...BUILTIN_ANIMATION_TABLE.map(name => ({
    path: `animation/${name}.json`,
    content: toJsonFileContent(ANIMATION_FRAMES_BY_NAME[name]),
  })),
];
