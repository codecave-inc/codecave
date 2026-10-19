import { Route, Routes } from "react-router-dom";
import { Guards } from "./components/Guards";
import CompleteProfile from "./pages/CompleteProfile";
import Dashboard from "./pages/Dashboard";
import ForgotPassword from "./pages/ForgotPassword";
import Login from "./pages/Login";
import { LegalPlaceholder, NotFound } from "./pages/Placeholders";
import Signup from "./pages/Signup";
import VerifyEmail from "./pages/VerifyEmail";

export default function App() {
  return (
    <Routes>
      <Route element={<Guards.PublicOnly />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      <Route path="/complete-profile" element={<CompleteProfile />} />

      <Route element={<Guards.RequireLearner />}>
        <Route path="/" element={<Dashboard />} />
      </Route>

      <Route path="/terms" element={<LegalPlaceholder title="Terms of Service" />} />
      <Route path="/privacy" element={<LegalPlaceholder title="Privacy Policy" />} />
      <Route path="/conduct" element={<LegalPlaceholder title="Community code of conduct" />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
