import React from "react";
import ReactDOM from "react-dom/client";
import { AppRouterProvider } from "@/router";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppRouterProvider />
  </React.StrictMode>,
);
