import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import IntervalsPage from "./IntervalsPage/index.tsx";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

const page =
  window.location.pathname === "/intervals" ? <IntervalsPage /> : <App />;

createRoot(root).render(<StrictMode>{page}</StrictMode>);
