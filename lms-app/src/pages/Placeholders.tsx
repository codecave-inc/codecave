import { Link } from "react-router-dom";
import { Logo } from "../components/Logo";

/** Terms / Privacy / Code of conduct pages. Real text is written and legally reviewed before launch (build plan, Phase 7). */
export function LegalPlaceholder({ title }: { title: string }) {
  return (
    <div className="grid min-h-screen place-items-center px-5">
      <div className="max-w-md text-center">
        <Logo className="mx-auto h-9" />
        <h1 className="mt-8 text-2xl">{title}</h1>
        <p className="mt-3 text-ink-2">This page is being finalised and will be published before CodeCave Academy opens.</p>
        <Link to="/" className="link mt-6 inline-block">Back</Link>
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-5">
      <div className="max-w-md text-center">
        <p className="font-mono text-sm text-primary">404</p>
        <h1 className="mt-2 text-3xl">That page doesn't exist</h1>
        <Link to="/" className="btn btn-primary mt-8">Go home</Link>
      </div>
    </div>
  );
}

/** Same message as NotFound, for use inside the signed-in shell. */
export function NotFoundBody() {
  return (
    <main className="mx-auto max-w-md px-5 py-24 text-center">
      <p className="font-mono text-sm text-primary">404</p>
      <h1 className="mt-2 text-3xl">We couldn't find that</h1>
      <p className="mt-3 text-ink-2">It may have moved, or it isn't open yet.</p>
      <Link to="/" className="btn btn-primary mt-8">Go home</Link>
    </main>
  );
}
