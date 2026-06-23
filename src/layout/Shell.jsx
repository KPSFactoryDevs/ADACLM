// src/layout/Shell.jsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Companies } from "../lib/api"; // <-- API client per aziende

const KPS_SUITES_URL = import.meta.env.VITE_KPS_SUITES_URL || "http://localhost:8000";

export default function Shell({ children, onLogout }) {
  const { pathname } = useLocation();

  const nav = useMemo(
    () => [
      { to: "/", label: "Allerta", icon: AlertIcon },
       { to: "/analisi-bilancio", label: "Bilanci", icon: BarsIcon },
      { to: "/analisi-cr", label: "Centrale Rischi", icon: TrendIcon },
      { to: "/allerta", label: "Questionari", icon: TrendIcon },
      { to: "/impostazioni-azienda", label: "Azienda", icon: UsersIcon },
    ],
    []
  );

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("sb_user")) || { name: "Utente" };
    } catch {
      return { name: "Utente" };
    }
  });

  useEffect(() => {
    const h = () =>
      setUser(JSON.parse(localStorage.getItem("sb_user")) || { name: "Utente" });
    window.addEventListener("storage", h);
    return () => window.removeEventListener("storage", h);
  }, []);

  const initials = (user?.name || "U")
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#f5f6f7] text-neutral-900">
      {/* TOPBAR */}
      <header className="h-[44px] bg-white border-b border-neutral-200/80 flex items-center justify-between px-3">
        <div className="text-[13px] font-medium tracking-tight" />
        <div className="flex items-center gap-2">
          <Launchpad />
        </div>
      </header>

      <div className="flex">
        {/* SIDEBAR */}
        <aside className="w-30 shrink-0 bg-white border-r border-neutral-200/80 min-h-[calc(100vh-44px)] relative">
          {/* Avatar */}
          <div className="px-4 pt-4 pb-3 flex justify-center">
            <div className="w-12 h-12 rounded-full bg-neutral-900 text-white grid place-items-center text-sm font-semibold select-none">
              {initials}
            </div>
          </div>

          {/* Menu */}
          <nav className="px-2 mt-2 space-y-1">
            {nav.map((item) => (
              <NavTile key={item.to} item={item} active={isActive(pathname, item.to)} />
            ))}
          </nav>

          {/* Footer: Help + Logout */}
          <div className="absolute left-0 right-0 bottom-0 px-2 pb-3">
    
            <div className="mt-1" />
            <FooterTile label="Logout" icon={LogoutIcon} onClick={onLogout} />
          </div>
        </aside>

        {/* CONTENT */}
        <main className="flex-1 min-h-[calc(100vh-44px)] px-20 py-10">{children}</main>
      </div>
    </div>
  );
}

/* ===== Helpers ===== */
function isActive(pathname, to) {
  if (to === "/") return pathname === "/";
  return pathname.startsWith(to);
}

/* Tile nav */
function NavTile({ item, active }) {
  const { to, label, icon: Icon } = item;
  return (
    <NavLink to={to} end={to === "/"} className="block">
      <div className="relative rounded-lg select-none">
        {/* pill */}
        <div
          className={[
            "absolute inset-0 rounded-lg transition",
            active ? "bg-[#ECE8FF]" : "bg-transparent hover:bg-neutral-50",
          ].join(" ")}
        />
        {/* barra destra */}
        <div
          className={[
            "absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-full transition",
            active ? "bg-neutral-900" : "bg-transparent",
          ].join(" ")}
        />
        {/* content */}
        <div className="relative z-[1] h-[50px] px-3 py-2 flex flex-col items-center justify-center gap-1 text-center border-b-1 border-gray-100">
          <Icon className={active ? "text-neutral-900" : "text-neutral-700"} />
          <span className="text-[12px] leading-tight whitespace-normal break-words">
            {label}
          </span>
        </div>
      </div>
    </NavLink>
  );
}

/* Footer items */
function FooterTile({ label, icon: Icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg hover:bg-neutral-50 focus:bg-neutral-50 transition"
    >
      <div className="h-[74px] px-3 py-2 flex flex-col items-center justify-center gap-1 text-center">
        <Icon className="text-neutral-800" />
        <span className="text-[12px] leading-tight">{label}</span>
      </div>
    </button>
  );
}

/* ===== Company Selector (API-based) ===== */
function CompanySelector() {
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [current, setCurrent] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("sb_company")) || null;
    } catch {
      return null;
    }
  });
  const [open, setOpen] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ ragione_sociale: "", partita_iva: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      try {
        const list = await Companies.list();
        if (ignore) return;
        setCompanies(list);
        // Se non c'è current selezionato ma la lista esiste, scegli il primo
        if (!current && list.length) {
          setCurrent(list[0]);
          localStorage.setItem("sb_company", JSON.stringify(list[0]));
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const selectCompany = (c) => {
    setCurrent(c);
    try {
      localStorage.setItem("sb_company", JSON.stringify(c));
    } catch {}
    setOpen(false);
    navigate("/", { replace: true });
  };

  const submitNew = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.ragione_sociale?.trim()) {
      setErr("Inserisci la ragione sociale.");
      return;
    }
    setSaving(true);
    try {
      const created = await Companies.create({
        ragione_sociale: form.ragione_sociale.trim(),
        partita_iva: form.partita_iva?.trim() || null,
      });
      // ricarico lista e seleziono la nuova
      const list = await Companies.list();
      setCompanies(list);
      selectCompany(created);
      setOpenAdd(false);
      setForm({ ragione_sociale: "", partita_iva: "" });
    } catch (e) {
      setErr(e.message || "Errore creazione azienda");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((s) => !s)}
        className="h-8 px-3 rounded-lg border border-neutral-200 text-xs bg-white hover:bg-neutral-50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {current?.ragione_sociale || current?.name || "Seleziona azienda"}
      </button>

      {/* Dropdown aziende */}
      {open && (
        <div
          className="absolute right-0 mt-2 w-72 bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden z-20"
          role="listbox"
        >
          <div className="max-h-64 overflow-auto">
            {loading && (
              <div className="px-3 py-2 text-sm text-neutral-500">Caricamento…</div>
            )}

            {!loading && companies.length === 0 && (
              <div className="px-3 py-2 text-sm text-neutral-500">Nessuna azienda</div>
            )}

            {companies.map((c) => {
              const active = c.id === current?.id;
              return (
                <button
                  key={c.id}
                  onClick={() => selectCompany(c)}
                  role="option"
                  aria-selected={active}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 ${
                    active ? "bg-neutral-50 font-medium" : ""
                  }`}
                >
                  {c.ragione_sociale || c.name}
                </button>
              );
            })}
          </div>

          <div className="border-t border-neutral-200">
            <button
              onClick={() => {
                setOpen(false);
                setOpenAdd(true);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 flex items-center gap-2"
            >
              <span className="inline-flex w-5 h-5 rounded-full border border-neutral-300 items-center justify-center">
                +
              </span>
              Aggiungi azienda
            </button>
          </div>
        </div>
      )}

      {/* Modal Aggiungi Azienda */}
      {openAdd && (
        <div className="fixed inset-0 z-30 bg-black/30 grid place-items-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg">
            <div className="text-lg font-semibold">Nuova azienda</div>
            {err && (
              <div className="mt-3 rounded border border-red-200 bg-red-50 text-red-800 text-sm p-2">
                {err}
              </div>
            )}
            <form onSubmit={submitNew} className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium">Ragione sociale *</label>
                <input
                  className="mt-1 w-full h-10 rounded-lg border border-neutral-200 px-3"
                  value={form.ragione_sociale}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ragione_sociale: e.target.value }))
                  }
                  placeholder="ACME S.p.A."
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Partita IVA</label>
                <input
                  className="mt-1 w-full h-10 rounded-lg border border-neutral-200 px-3"
                  value={form.partita_iva}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, partita_iva: e.target.value }))
                  }
                  placeholder="01234567890"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpenAdd(false);
                    setErr("");
                  }}
                  className="h-10 px-4 rounded-lg border border-neutral-200"
                >
                  Annulla
                </button>
                <button
                  disabled={saving}
                  className="h-10 px-4 rounded-lg bg-neutral-900 text-white"
                >
                  {saving ? "Salvataggio..." : "Crea"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Launchpad (App Launcher) ===== */
function Launchpad() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const apps = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("kps_apps")) || []; }
    catch { return []; }
  }, []);

  const meta = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("kps_meta")) || {}; }
    catch { return {}; }
  }, []);

  const suitesUrl = meta.kps_suites_url || KPS_SUITES_URL;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const appIcons = {
    marketing: "📧",
    menu: "🍽️",
    pos: "🧾",
    accounting: "📊",
    crm: "👥",
    hr: "🏢",
    finance: "📈",
    education: "🎓",
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((s) => !s)}
        className="w-8 h-8 rounded-lg border-none bg-transparent cursor-pointer flex items-center justify-center text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 transition"
        title="App Launcher"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="5" r="2" />
          <circle cx="12" cy="5" r="2" />
          <circle cx="19" cy="5" r="2" />
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
          <circle cx="5" cy="19" r="2" />
          <circle cx="12" cy="19" r="2" />
          <circle cx="19" cy="19" r="2" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            width: 300,
            borderRadius: 16,
            background: "#1e293b",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            padding: 16,
            zIndex: 100,
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 12,
              paddingLeft: 4,
            }}
          >
            Le tue App
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {/* KPS Suites — always first */}
            <a
              href={suitesUrl.replace("/login", "")}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                padding: "12px 8px",
                borderRadius: 12,
                textDecoration: "none",
                transition: "background 0.2s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
              onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                  color: "#fff",
                }}
              >
                ⚡
              </div>
              <span style={{ fontSize: 11, color: "#cbd5e1", textAlign: "center", lineHeight: 1.3 }}>
                KPS Suites
              </span>
            </a>

            {/* Dynamic apps from SSO payload */}
            {apps.map((app) => (
              <a
                key={app.id || app.slug}
                href={app.launch_url}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 8px",
                  borderRadius: 12,
                  textDecoration: "none",
                  transition: "background 0.2s",
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    background: `linear-gradient(135deg, ${app.color || "#6366f1"}, ${app.color || "#6366f1"}dd)`,
                    color: "#fff",
                  }}
                >
                  {appIcons[app.icon] || "📱"}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    color: "#cbd5e1",
                    textAlign: "center",
                    lineHeight: 1.3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "100%",
                  }}
                >
                  {(app.name || "App").length > 16
                    ? (app.name || "App").slice(0, 16) + "…"
                    : app.name || "App"}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Icone (20px, stroke leggero) ===== */
const iconBase = "w-[20px] h-[20px]";
const cx = (extra = "") => `${iconBase} ${extra}`;

function HomeIcon({ className }) {
  return (
    <svg className={cx(className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}
function AlertIcon({ className }) {
  return (
    <svg className={cx(className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3 2 20h20L12 3Z" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M12 9v5m0 3v.01"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
function TrendIcon({ className }) {
  return (
    <svg className={cx(className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 17l6-6 4 4 7-7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M21 21H3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function BarsIcon({ className }) {
  return (
    <svg className={cx(className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="10" width="3" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="10.5" y="6" width="3" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="17" y="12" width="3" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
function CardIcon({ className }) {
  return (
    <svg className={cx(className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M3 9h18" stroke="currentColor" strokeWidth="1.2" />
      <rect x="6" y="13" width="5" height="2.5" rx="1" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
function HelpIcon({ className }) {
  return (
    <svg className={cx(className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M9.5 9a2.5 2.5 0 1 1 3.2 2.37c-.95.33-1.7 1.1-1.7 2.13V14"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
  );
}
function LogoutIcon({ className }) {
  return (
    <svg className={cx(className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 12H4m0 0 3-3m-3 3 3 3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="10" y="4" width="10" height="16" rx="2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
function BeakerIcon({ className }) {
  return (
    <svg className={cx(className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 3v5l-5 9a3 3 0 0 0 2.6 4.5h10.8A3 3 0 0 0 20 17L15 8V3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 13h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function UsersIcon({ className = "" }) {
  return (
    <svg className={cx(className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2 20a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="17" cy="7" r="3" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M18 20h4a6 6 0 0 0-4.5-5.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
function CalendarIcon({ className = "" }) {
  return (
    <svg className={cx(className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function CashIcon({ className = "" }) {
  return (
    <svg className={cx(className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 12h10M7 9h2M15 15h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function BotIcon({ className }) {
  return (
    <svg className={cx(className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="6" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 2v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="9" cy="12" r="1.3" fill="currentColor" />
      <circle cx="15" cy="12" r="1.3" fill="currentColor" />
      <path d="M8 16h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
