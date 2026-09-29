import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { useAuthActions } from "@convex-dev/auth/react";

export default function App() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  // Only fetch once actually authenticated — otherwise Convex would
  // reject the query and spam the console with expected 401s.
  const me = useQuery(api.adminAuth.whoAmI, isAuthenticated ? {} : "skip");

  if (isLoading) return <Centered>Loading…</Centered>;
  if (!isAuthenticated) return <Login />;

  if (me === undefined) return <Centered>Loading your account…</Centered>;
  if (me === null) {
    return (
      <Centered>
        <div className="access-denied">
          <h2>This account doesn't have admin access</h2>
          <p>Ask an existing admin to grant access, or sign in with a different account.</p>
          <button className="btn" onClick={() => signOut()}>Sign out</button>
        </div>
      </Centered>
    );
  }

  return <Dashboard me={me} />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="centered-screen">{children}</div>;
}
