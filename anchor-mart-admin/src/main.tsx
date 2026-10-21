import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { isFramedCrossOrigin } from "./lib/framing";
import { MESSAGES } from "./lib/messages";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find the root element");
}

if (isFramedCrossOrigin()) {
  // Never mount — and so never read the stored token — inside another site's
  // frame (BUG-007). Plain text: there is nothing here to interact with.
  rootElement.textContent = MESSAGES.COMMON.FRAMED_BLOCKED;
  rootElement.className = "p-6 text-[14px] font-semibold text-[var(--t2)]";
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
