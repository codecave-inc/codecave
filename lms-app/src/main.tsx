import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import App from "./App";
import { CONVEX_URL, convex } from "./lib/convexClient";
import { Logo } from "./components/Logo";
import "./index.css";

function NotConfigured() {
  return (
    <div className="grid min-h-screen place-items-center px-5">
      <div className="max-w-md text-center">
        <Logo className="mx-auto h-9" />
        <h1 className="mt-8 text-2xl">Setup needed</h1>
        <p className="mt-3 text-ink-2">
          <code className="font-mono text-sm">VITE_CONVEX_URL</code> isn't set, so the app can't reach its backend.
          Copy <code className="font-mono text-sm">.env.local.example</code> to <code className="font-mono text-sm">.env.local</code> and restart.
        </p>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {CONVEX_URL ? (
      <ConvexAuthProvider client={convex}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ConvexAuthProvider>
    ) : (
      <NotConfigured />
    )}
  </React.StrictMode>
);
