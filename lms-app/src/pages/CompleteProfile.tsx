import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Link } from "react-router-dom";
import { api } from "@convex/_generated/api";
import { AuthShell } from "../components/AuthShell";
import { Alert, Checkbox, Field, ScreenSpinner, SelectField, SubmitButton } from "../components/ui";
import { COUNTRIES } from "../lib/countries";
import { friendlyError } from "../lib/errors";

/** For people who signed in with Google: confirm age, country, terms and code of conduct once. */
export default function CompleteProfile() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const me = useQuery(api.profiles.me, isAuthenticated ? {} : "skip");
  const complete = useMutation(api.profiles.completeProfile);
  const navigate = useNavigate();
  const [age, setAge] = useState<"" | "under-16" | "16-17" | "18+">("");
  const [guardian, setGuardian] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading || (isAuthenticated && me === undefined)) return <ScreenSpinner />;
  if (!isAuthenticated || me === null) return <Navigate to="/login" replace />;
  if (me && !me.needsProfileCompletion) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") ?? "").trim();
    const country = String(f.get("country") ?? "");
    if (!name) return setError("Please enter your name.");
    if (!country) return setError("Please choose your country.");
    if (age === "" || age === "under-16") return setError("CodeCave Academy is for people aged 16 and over.");
    if (age === "16-17" && !guardian) return setError("A parent or guardian must agree before you can continue.");
    if (f.get("terms") !== "on") return setError("Please accept the Terms of Service and Privacy Policy.");
    if (f.get("conduct") !== "on") return setError("Please accept the community code of conduct.");
    setBusy(true);
    setError(null);
    try {
      await complete({ name, country, ageBand: age, guardianConsent: age === "16-17" && guardian, termsAccepted: true, conductAccepted: true });
      navigate("/", { replace: true });
    } catch (err) {
      setError(friendlyError(err, "We couldn't save your details. Please try again."));
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Almost there"
      subtitle="Just a few details to finish setting up your account."
      footer={<button type="button" className="link" onClick={() => void signOut()}>Sign out</button>}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Full name" name="name" defaultValue={me?.name ?? ""} autoComplete="name" maxLength={80} />
        <SelectField label="Country" name="country" defaultValue="">
          <option value="" disabled>Choose your country</option>
          {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </SelectField>
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Your age group</legend>
          <div className="grid grid-cols-3 gap-2">
            {([["under-16", "Under 16"], ["16-17", "16 – 17"], ["18+", "18 or over"]] as const).map(([value, label]) => (
              <label key={value}
                className={`cursor-pointer rounded-sm border px-3 py-2 text-center text-sm font-semibold transition ${
                  age === value ? "border-primary bg-primary/10 text-primary" : "border-line bg-surface text-ink-2 hover:bg-bg-alt"
                }`}>
                <input type="radio" name="age" value={value} className="sr-only" checked={age === value} onChange={() => setAge(value)} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        {age === "16-17" && (
          <Checkbox checked={guardian} onChange={(e) => setGuardian(e.target.checked)}>
            My parent or guardian knows I'm joining CodeCave Academy and agrees to it.
          </Checkbox>
        )}
        <div className="space-y-3 pt-1">
          <Checkbox name="terms">
            I agree to the <Link to="/terms" className="link" target="_blank">Terms of Service</Link> and{" "}
            <Link to="/privacy" className="link" target="_blank">Privacy Policy</Link>.
          </Checkbox>
          <Checkbox name="conduct">
            I'll follow the <Link to="/conduct" className="link" target="_blank">community code of conduct</Link>.
          </Checkbox>
        </div>
        <SubmitButton busy={busy} busyLabel="Saving…">Continue</SubmitButton>
      </form>
    </AuthShell>
  );
}
