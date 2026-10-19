import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { AuthShell } from "../components/AuthShell";
import { GoogleButton } from "../components/GoogleButton";
import { Alert, Field, PasswordField, SubmitButton } from "../components/ui";
import { friendlyError } from "../lib/errors";

export default function Login() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    if (!email || !password) { setError("Enter your email and password."); return; }
    setBusy(true);
    setError(null);
    try {
      const result = await signIn("student", { flow: "signIn", email, password });
      // Not signed in but no error: the email isn't verified yet, so we've just sent a new code.
      if (!result.signingIn) navigate("/verify", { state: { email, password, resent: true } });
    } catch (err) {
      setError(friendlyError(err, "Couldn't sign in — check your email and password."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue learning."
      footer={<>New to CodeCave Academy? <Link to="/signup" className="link">Create an account</Link></>}
    >
      <GoogleButton label="Continue with Google" />
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {notice && <Alert kind="success">{notice}</Alert>}
        {error && <Alert>{error}</Alert>}
        <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" autoFocus />
        <PasswordField label="Password" name="password" autoComplete="current-password" />
        <div className="text-right text-sm"><Link to="/forgot-password" className="link">Forgot password?</Link></div>
        <SubmitButton busy={busy} busyLabel="Signing in…">Sign in</SubmitButton>
      </form>
    </AuthShell>
  );
}
