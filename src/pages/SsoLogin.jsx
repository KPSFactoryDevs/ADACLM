// src/pages/SsoLogin.jsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

/**
 * SSO Login Handler — receives token, user data and apps from the backend
 * SSO callback redirect and stores them in localStorage, then redirects to dashboard.
 */
export default function SsoLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const token = searchParams.get("token");
      const userB64 = searchParams.get("user");
      const appsB64 = searchParams.get("apps");
      const metaB64 = searchParams.get("meta");
      const errorParam = searchParams.get("error");

      if (errorParam) {
        setError(errorParam);
        return;
      }

      if (!token || !userB64) {
        setError("Parametri SSO mancanti. Riprova da KPS Suites.");
        return;
      }

      // Decode user data
      const user = JSON.parse(atob(userB64));

      // Store auth token
      localStorage.setItem("sb_auth", JSON.stringify({ token }));

      // Store user info
      localStorage.setItem("sb_user", JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
      }));

      // Store apps for launchpad
      if (appsB64) {
        try {
          const apps = JSON.parse(atob(appsB64));
          localStorage.setItem("kps_apps", JSON.stringify(apps));
        } catch { /* ignore */ }
      }

      // Store SSO metadata
      if (metaB64) {
        try {
          const meta = JSON.parse(atob(metaB64));
          localStorage.setItem("kps_meta", JSON.stringify(meta));
        } catch { /* ignore */ }
      }

      // Redirect to dashboard
      navigate("/", { replace: true });
    } catch (e) {
      console.error("SSO Login error:", e);
      setError("Errore durante il login SSO. Riprova.");
    }
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="1.6"/>
              <path d="M12 8v4m0 4h.01" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-neutral-900 mb-2">Errore Login SSO</h2>
          <p className="text-neutral-500 text-sm mb-6">{error}</p>
          <a
            href="/login"
            className="inline-block h-10 px-6 rounded-xl bg-neutral-900 text-white text-sm font-medium leading-10 hover:opacity-90"
          >
            Vai al Login
          </a>
        </div>
      </div>
    );
  }

  // Loading state while processing SSO
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-[#5b63ff] rounded-full animate-spin" />
      <span className="mt-4 text-sm text-neutral-500 font-medium">Accesso in corso...</span>
    </div>
  );
}
