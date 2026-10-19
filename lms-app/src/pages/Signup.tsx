import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { AuthShell } from "../components/AuthShell";
import { Alert, Checkbox, Field, PasswordField, SelectField, SubmitButton } from "../components/ui";
import { COUNTRIES } from "../lib/countries";
import { friendlyError, isFriendly } from "../lib/errors";
import { GoogleButton } from "../components/GoogleButton";

type Errors = Partial<Record<"name" | "email" | "password" | "country" | "age" | "guardian" | "terms" | "conduct", string>>;

export default function Signup() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [age, setAge] = useState<"" | "under-16" | "16-17" | "18+">("");
  const [guardian, setGuardian] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") ?? "").trim();
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    const country = String(f.get("country") ?? "");
    const terms = f.get("terms") === "on";
    const conduct = f.get("conduct") === "on";

    const next: Errors = {};
    if (!name) next.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Please enter a valid email address.";
    if (password.length < 8) next.password = "Use at least 8 characters.";
    else if (/^\d+$/.test(password)) next.password = "Your password can't be only numbers.";
    if (!country) next.country = "Please choose your country.";
    if (age === "" || age === "under-16") next.age = "CodeCave Academy is for people aged 16 and over.";
    if (age === "16-17" && !guardian) next.guardian = "A parent or guardian must agree before you can continue.";
    if (!terms) next.terms = "Please accept the Terms of Service and Privacy Policy.";
    if (!conduct) next.conduct = "Please accept the community code of conduct.";
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      await signIn("student", {
        flow: "signUp", name, email, password, country,
        ageBand: age, guardianConsent: age === "16-17" && guardian,
        termsAccepted: true, conductAccepted: true,
      });
      navigate("/verify", { replace: true, state: { email, password, fresh: true } });
    } catch (err) {
      setFormError(
        isFriendly(err)
          ? friendlyError(err, "")
          : "We couldn't create your account. If you've already registered with this email, sign in or use “Forgot password”."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free to start. Your first lesson of every course is on us."
      footer={<>Already have an account? <Link to="/login" className="link">Sign in</Link></>}
    >
      <GoogleButton label="Sign up with Google" />
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <Alert>{formError}</Alert>}
        <Field label="Full name" name="name" autoComplete="name" error={errors.name} maxLength={80} />
        <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" error={errors.email} />
        <PasswordField label="Password" name="password" autoComplete="new-password" error={errors.password}
          hint="At least 8 characters, and not just numbers." />
        <SelectField label="Country" name="country" defaultValue="" error={errors.country}>
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
                <input type="radio" name="age" value={value} className="sr-only" checked={age === value}
                  onChange={() => setAge(value)} />
                {label}
              </label>
            ))}
          </div>
          {errors.age && <p className="text-xs text-danger">{errors.age}</p>}
        </fieldset>

        {age === "16-17" && (
          <Checkbox checked={guardian} onChange={(e) => setGuardian(e.target.checked)} error={errors.guardian}>
            My parent or guardian knows I'm joining CodeCave Academy and agrees to it.
          </Checkbox>
        )}

        <div className="space-y-3 pt-1">
          <Checkbox name="terms" error={errors.terms}>
            I agree to the <Link to="/terms" className="link" target="_blank">Terms of Service</Link> and{" "}
            <Link to="/privacy" className="link" target="_blank">Privacy Policy</Link>.
          </Checkbox>
          <Checkbox name="conduct" error={errors.conduct}>
            I'll follow the <Link to="/conduct" className="link" target="_blank">community code of conduct</Link>.
          </Checkbox>
        </div>

        <SubmitButton busy={busy} busyLabel="Creating your account…">Create account</SubmitButton>
      </form>
    </AuthShell>
  );
}
