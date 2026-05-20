// client/src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";

import { PublicSettingsProvider } from "./context/PublicSettingsProvider.jsx";
import { AppRouter } from "./app/router.jsx";
import PwaUpdatePrompt from "./components/PwaUpdatePrompt.jsx";
import PwaInstallButton from "./components/PwaInstallButton.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ""}>
      <BrowserRouter>
        <PublicSettingsProvider>
          <AppRouter />
          <PwaUpdatePrompt />
          <PwaInstallButton />
        </PublicSettingsProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
