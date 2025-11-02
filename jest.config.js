import { createDefaultPreset } from "ts-jest";

export default {
  ...createDefaultPreset(),
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.test.json",
      },
    ],
  },
};
