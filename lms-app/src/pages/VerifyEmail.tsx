import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { AuthShell } from "../components/AuthShell";
import { Alert, Field, SubmitButton } from "../components/ui";
import { friendlyError } from "../lib/errors";

type State = { email?: string; password?: string; fresh?: boolean; resent?: boolean } | null;

export default function VerifyEmail() {
  const { signIn } = useAuthActions();
  const location = useLocation();
  const state = location.state as State;
  const email = state?.email ?? "";
  const password = state?.password; // kept only in this page's history state, used for "resend"
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(
    state?.fresh ? "We've sent an 8-digit code to your email." : state?.resent ? "Your email isn't verified yet — we've sent you a new code." : null
  );

  // Landed here without context (e.g. a refreshed page): start from sign-in, which re-sends a code.
  if (!email) return <Navigate to="/login" replace />;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\s/g, "");
    if (!/^\d{8}$/.test(code)) { setError("Enter the 8-digit code from your email."); return; }
    setBusy(true);
    setError(null);
    try {
      await signIn("student", { flow: "email-verification", email, code });
      // Success: the session is created and the route guards take over.
    } catch (err) {
      setError(friendlyError(err, "That code isn't right, or it has expired. Check it, or request a new one."));
      setBusy(false);
    }
  }

  async function resend() {
    if (!password) { setError("For security, please go back and sign in again — we'll send a fresh code."); return; }
    setResending(true);
    setError(null);
    try {
      await signIn("student", { flow: "signIn", email, password });
      setInfo("A new code is on its way.");
    } catch (err) {
      setError(friendlyError(err, "We couldn't send a new code. Please try again in a moment."));
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthShell
      title="Check your email"
      subtitle={<>Enter the code we sent to <strong className="text-ink">{email}</strong>.</>}
      footer={<Link to="/login" className="link">Back to sign in</Link>}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {info && !error && <Alert kind="info">{info}</Alert>}
        {error && <Alert>{error}</Alert>}
        <Field label="Verification code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*"
          maxLength={11} autoFocus className="input text-center font-mono text-2xl tracking-[.35em]"
          hint="The code expires in 15 minutes." />
        <SubmitButton busy={busy} busyLabel="Verifying…">Verify and continue</SubmitButton>
        <p className="text-center text-sm text-ink-2">
          Didn't get it? Check your spam folder, or{" "}
          <button type="button" onClick={resend} disabled={resending} className="link disabled:opacity-60">
            {resending ? "sending…" : "send a new code"}
          </button>.
        </p>
      </form>
    </AuthShell>
  );
}
