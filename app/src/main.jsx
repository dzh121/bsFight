import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import JoinPage from "./JoinPage.jsx";
import BetPage from "./BetPage.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/bet" element={<BetPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
