import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* React Router nutzt HashRouter für statische Deployments */}
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
