import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { GOOGLE_ENABLED } from "../lib/convexClient";
import { Alert } from "./ui";

/** Renders nothing until VITE_GOOGLE_ENABLED=true (set after Google credentials exist on Convex). */
export function GoogleButton({ label }: { label: string }) {
  const { signIn } = useAuthActions();
  const [error, setError] = useState<string | null>(null);
  if (!GOOGLE_ENABLED) return null;
  return (
    <div className="mb-6 space-y-3">
      {error && <Alert>{error}</Alert>}
      <button type="button" className="btn btn-outline w-full"
        onClick={() => signIn("google", { redirectTo: "/" }).catch(() => setError("Google sign-in didn't work. Please try again."))}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 01-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z" />
          <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0012 24z" />
          <path fill="#FBBC05" d="M5.4 14.4a7.200 7.2 0 010-4.8V6.5H1.4a12 12 0 000 11l4-3.1z" />
          <path fill="#EA4335" d="M12 4.800c1.800 0 3.300.6 4.500 1.800l3.400-3.400A12 12 0 001.400 6.500l4 3.100C6.300 6.900 8.900 4.800 12 4.800z" />
        </svg>
        {label}
      </button>
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" />or with email<span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}
