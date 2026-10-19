import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { AuthShell } from "../components/AuthShell";
import { Alert, Field, PasswordField, SubmitButton } from "../components/ui";
import { friendlyError, isFriendly } from "../lib/errors";

export default function ForgotPassword() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { setError("Please enter a valid email address."); return; }
    setBusy(true);
    setError(null);
    try {
      await signIn("student", { flow: "reset", email: value });
    } catch (err) {
      // Rate-limit / validation messages are shown. Any other failure (including "no such account")
      // looks identical to success, so this form can't be used to discover who has an account.
      if (isFriendly(err)) { setError(friendlyError(err, "")); setBusy(false); return; }
    }
    setEmail(value);
    setStep("code");
    setBusy(false);
  }

  async function setNewPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const code = String(f.get("code") ?? "").replace(/\s/g, "");
    const newPassword = String(f.get("newPassword") ?? "");
    if (!/^\d{8}$/.test(code)) { setError("Enter the 8-digit code from your email."); return; }
    if (newPassword.length < 8) { setError("Your new password must be at least 8 characters."); return; }
    if (/^\d+$/.test(newPassword)) { setError("Your password can't be only numbers."); return; }
    setBusy(true);
    setError(null);
    try {
      await signIn("student", { flow: "reset-verification", email, code, newPassword });
      navigate("/", { replace: true });
    } catch (err) {
      setError(friendlyError(err, "That code isn't right, or it has expired. Check it, or start again."));
      setBusy(false);
    }
  }

  if (step === "email") {
    return (
      <AuthShell title="Reset your password" subtitle="Enter your email and we'll send you a code."
        footer={<Link to="/login" className="link">Back to sign in</Link>}>
        <form onSubmit={requestCode} noValidate className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" autoFocus />
          <SubmitButton busy={busy} busyLabel="Sending…">Send code</SubmitButton>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password"
      subtitle={<>If there's an account for <strong className="text-ink">{email}</strong>, we've sent it an 8-digit code.</>}
      footer={<button type="button" className="link" onClick={() => { setStep("email"); setError(null); }}>Use a different email</button>}>
      <form onSubmit={setNewPassword} noValidate className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Code from your email" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={11} autoFocus
          className="input text-center font-mono text-2xl tracking-[.35em]" />
        <PasswordField label="New password" name="newPassword" autoComplete="new-password"
          hint="At least 8 characters, and not just numbers." />
        <SubmitButton busy={busy} busyLabel="Saving…">Set password and sign in</SubmitButton>
      </form>
    </AuthShell>
  );
}
