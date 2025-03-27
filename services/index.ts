import { Api as TerreApi } from "./terre/apis";

export const terreApis = new TerreApi({ baseURL: import.meta.env.VITE_TERRE_URL }).api;
