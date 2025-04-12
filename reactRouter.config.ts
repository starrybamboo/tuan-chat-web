import type { Config } from "@react-router/dev/config";

export default {
  // Config options...
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: false,
  // async prerender() {
  //   return ["/", "/chat", "/community", "/create", "/dashBoard", "/feed", "/home", "/module", "/profile", "role"];
  // },
} satisfies Config;
