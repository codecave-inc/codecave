import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";

export default function Login() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // flow is always "signIn" here — there is no sign-up screen.
      // New admin accounts are created via the one-time CLI bootstrap
      // (see admin-app/README.md), never through this form.
      await signIn("password", { email, password, flow: "signIn" });
    } catch (err: any) {
      setError("Couldn't sign in — check your email and password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="centered-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>CodeCave Admin</h1>
        <p className="muted">Sign in to manage the site.</p>
        <label>
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </label>
        <label>
          Password
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
