declare module "*.wasm" {
  const asset: number;
  export default asset;
}

declare module "wasm-webp/dist/esm/webp-wasm" {
  export type WebPConfig = {
    lossless: number;
    quality: number;
  };

  export type WebPAnimationFrame = {
    config?: WebPConfig;
    data: Uint8Array;
    duration: number;
  };

  export type WebPModule = {
    VectorWebPAnimationFrame: new () => {
      delete?: () => void;
      push_back: (frame: {
        config: WebPConfig;
        data: Uint8Array;
        duration: number;
        has_config: boolean;
      }) => void;
    };
    encodeAnimation: (
      width: number,
      height: number,
      hasAlpha: boolean,
      frames: InstanceType<WebPModule["VectorWebPAnimationFrame"]>,
    ) => Uint8Array | null;
  };

  const createWebpModule: (options?: { wasmBinary?: Uint8Array }) => Promise<WebPModule>;
  export default createWebpModule;
}
