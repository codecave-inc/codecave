import { useId, useState } from "react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { IconEye, IconEyeOff } from "./Icons";

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function ScreenSpinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="grid min-h-screen place-items-center text-primary" role="status" aria-live="polite">
      <Spinner className="h-8 w-8" />
      <span className="sr-only">{label}…</span>
    </div>
  );
}

export function Alert({ kind = "error", children }: { kind?: "error" | "success" | "info"; children: ReactNode }) {
  const tone =
    kind === "error"
      ? "border-danger/40 bg-danger/10 text-danger"
      : kind === "success"
        ? "border-success/40 bg-success/10 text-success"
        : "border-primary/30 bg-primary/10 text-ink";
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-sm border px-3 py-2.5 text-sm ${tone}`}>
      {children}
    </div>
  );
}

type FieldShell = { label: string; error?: string; hint?: string };

export function Field({
  label, error, hint, ...input
}: FieldShell & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold">{label}</label>
      <input id={id} className="input" aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-d` : undefined} {...input} />
      {(error || hint) && (
        <p id={`${id}-d`} className={`text-xs ${error ? "text-danger" : "text-muted"}`}>{error ?? hint}</p>
      )}
    </div>
  );
}

export function PasswordField({
  label, error, hint, ...input
}: FieldShell & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold">{label}</label>
      <div className="relative">
        <input id={id} className="input pr-11" type={show ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${id}-d` : undefined} {...input} />
        <button type="button" onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted hover:text-ink"
          aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}>
          {show ? <IconEyeOff /> : <IconEye />}
        </button>
      </div>
      {(error || hint) && (
        <p id={`${id}-d`} className={`text-xs ${error ? "text-danger" : "text-muted"}`}>{error ?? hint}</p>
      )}
    </div>
  );
}

export function SelectField({
  label, error, children, ...select
}: { label: string; error?: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold">{label}</label>
      <select id={id} className="input" aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-d` : undefined} {...select}>
        {children}
      </select>
      {error && <p id={`${id}-d`} className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function Checkbox({
  children, error, ...input
}: { children: ReactNode; error?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const id = useId();
  return (
    <div>
      <div className="flex items-start gap-2.5">
        <input id={id} type="checkbox" className="mt-1 h-4 w-4 shrink-0 rounded border-line accent-primary"
          aria-invalid={error ? true : undefined} {...input} />
        <label htmlFor={id} className="text-sm text-ink-2">{children}</label>
      </div>
      {error && <p className="mt-1 pl-6 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function SubmitButton({ busy, children, busyLabel }: { busy: boolean; children: ReactNode; busyLabel?: string }) {
  return (
    <button type="submit" className="btn btn-primary w-full" disabled={busy}>
      {busy && <Spinner className="h-4 w-4" />}
      {busy ? busyLabel ?? "Please wait…" : children}
    </button>
  );
}
