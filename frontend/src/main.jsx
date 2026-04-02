import React from "react";
import { createRoot } from "react-dom/client";
import MainLayout from "./layout/MainLayout.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import "./index.css";
import "./components/Sidebar/Sidebar.css";

console.log("Main.jsx loaded");

try {
  const root = createRoot(document.getElementById("root"));
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <AuthProvider>
    <MainLayout />
        </AuthProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (error) {
  console.error("Error in main.jsx:", error);
  document.getElementById("root").innerHTML = `
    <div style="padding: 20px; font-family: Arial;">
      <h2>Failed to load app</h2>
      <pre>${error.toString()}</pre>
      <pre>${error.stack}</pre>
    </div>
  `;
}
