import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const savedPreferences = {
  theme: localStorage.getItem("omega_theme") || "dark",
  fontSize: localStorage.getItem("omega_font_size") || "medium",
  density: localStorage.getItem("omega_density") || "comfortable",
};
document.documentElement.dataset.omegaTheme = savedPreferences.theme;
document.documentElement.dataset.omegaFontSize = savedPreferences.fontSize;
document.documentElement.dataset.omegaDensity = savedPreferences.density;

createRoot(document.getElementById("root")!).render(<App />);
