import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DeployerShell, registerDeployerScreens } from "./DeployerShell.js";

registerDeployerScreens();

const container = document.getElementById("root");
if (!container) throw new Error("Root element is missing");
createRoot(container).render(
  <StrictMode>
    <DeployerShell />
  </StrictMode>,
);
