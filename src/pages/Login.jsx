import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Auth } from "../lib/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const navigate = useNavigate();
  const from = useLocation().state?.from || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!email || !pwd) {
      setErr("Inserisci email e password.");
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await Auth.login(email.trim(), pwd);
      localStorage.setItem("sb_auth", JSON.stringify({ token }));
      localStorage.setItem("sb_user", JSON.stringify({ id: user.id, name: user.name, email: user.email }));
      navigate(from, { replace: true });
    } catch (e) {
      setErr(e.message || "Credenziali non valide");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white grid lg:grid-cols-2">
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="text-3xl font-semibold tracking-tight select-none">
              <span className="text-[#5b63ff] align-middle">ADA</span>
            </div>
            <h1 className="mt-6 text-2xl sm:text-3xl font-semibold">Bentornato!</h1>
          </div>

          {err && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm p-3">
              {err}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium">Email *</label>
              <div className="mt-2 relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  {/* mail icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 6h16a2 2 0 0 1 2 2v.4l-10 5.6L2 8.4V8a2 2 0 0 1 2-2Z" stroke="#5b63ff" strokeWidth="1.5"/>
                    <path d="M22 9.4V16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.4l10 5.6 10-5.6Z" stroke="#5b63ff" strokeWidth="1.5"/>
                  </svg>
                </span>
                <input
                  type="email"
                  required
                  className="w-full h-11 rounded-xl border border-neutral-200 pl-10 pr-3 outline-none focus:ring-2 focus:ring-[#5b63ff]/30"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="esempio@azienda.it"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Password *</label>
              <div className="mt-2 relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  {/* lock icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="4" y="10" width="16" height="10" rx="2" stroke="#111" strokeWidth="1.6"/>
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="#111" strokeWidth="1.6"/>
                  </svg>
                </span>
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  className="w-full h-11 rounded-xl border border-neutral-200 pl-10 pr-10 outline-none focus:ring-2 focus:ring-[#5b63ff]/30"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute inset-y-0 right-0 pr-3 text-neutral-500 hover:text-neutral-900"
                  aria-label={showPwd ? "Nascondi password" : "Mostra password"}
                >
                  {showPwd ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8"/>
                      <path d="M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-1.2M9.9 5.2A9.7 9.7 0 0 1 12 5c6 0 9 6 9 6a12.8 12.8 0 0 1-3 3.7" stroke="currentColor" strokeWidth="1.6" />
                      <path d="M7.5 7.8A12.5 12.5 0 0 0 3 11s3 6 9 6c.9 0 1.8-.1 2.6-.4" stroke="currentColor" strokeWidth="1.6"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M12 5c6 0 9 6 9 6s-3 6-9 6-9-6-9-6 3-6 9-6Z" stroke="currentColor" strokeWidth="1.6"/>
                      <circle cx="12" cy="11" r="3" stroke="currentColor" strokeWidth="1.6"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <a href="#" className="text-sm text-[#5b63ff] hover:underline">
                Hai dimenticato la password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-32 h-10 rounded-xl bg-neutral-900 text-white text-sm hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Accesso..." : "Accedi"}
            </button>
          </form>
        </div>
      </div>

      <div className="hidden lg:block bg-[#fff6e9] relative overflow-hidden">
        <Doodles />
      </div>
    </div>
  );
}

function Doodles() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      {/* Clock-like arc */}
      <g transform="translate(90,10) scale(0.9)" opacity="0.6">
        <circle cx="0" cy="0" r="10" fill="none" stroke="#f2c766" strokeWidth="1.5"/>
        <path d="M0 -8 L0 -2 L5 -2" stroke="#f2c766" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      </g>
      {/* Heart outline */}
      <path d="M82 20c5-8 16-5 16 4 0 9-12 18-16 20-4-2-16-11-16-20 0-9 11-12 16-4z"
        fill="none" stroke="#f6a5b9" strokeWidth="1.2" opacity="0.7"/>
      {/* Big spiral/circle */}
      <g transform="translate(73,62) scale(1.3)" opacity="0.65">
        <circle cx="0" cy="0" r="16" fill="none" stroke="#97e3e3" strokeWidth="1.6"/>
        <path d="M-6 0a6 6 0 1 0 12 0" fill="none" stroke="#97e3e3" strokeWidth="1.6"/>
        <circle cx="-5" cy="6" r="2" fill="none" stroke="#97e3e3" strokeWidth="1.2"/>
        <circle cx="0" cy="7.5" r="2" fill="none" stroke="#97e3e3" strokeWidth="1.2"/>
        <circle cx="5" cy="6" r="2" fill="none" stroke="#97e3e3" strokeWidth="1.2"/>
      </g>
      {/* Bottom-right squiggle/arrow */}
      <path d="M70 88c5 8 18 6 24 0" fill="none" stroke="#b4b2ff" strokeWidth="1.6" opacity="0.8"/>
      <path d="M94 86l-3 6 6-3" fill="none" stroke="#b4b2ff" strokeWidth="1.6" opacity="0.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
