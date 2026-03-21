import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { BrowserRouter } from "react-router";
import "@/animation.css";
import "@/app.css";
import { BlocksuiteStandaloneFrameApp } from "@/components/chat/infra/blocksuite/frame/BlocksuiteStandaloneFrameApp";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Blocksuite frame root container not found");
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <BlocksuiteStandaloneFrameApp />
      <Toaster />
    </BrowserRouter>
  </StrictMode>,
);
