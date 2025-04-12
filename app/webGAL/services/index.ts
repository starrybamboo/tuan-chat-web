import { Api, HttpClient } from "./apis";

export const terreApis = new Api(new HttpClient({ baseURL: "http://localhost:3001" }));
