import { Api, HttpClient } from "./terre/apis";

export const terreApis = new Api(new HttpClient({ baseURL: "http://localhost:3001" }));
