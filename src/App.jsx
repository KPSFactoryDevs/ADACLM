// src/App.jsx
import React, { Suspense } from "react";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";

import Shell from "./layout/Shell.jsx";
import ChatWidget from "./components/ChatWidget.jsx";

// Performance Optimization: Lazy Loading Pages
const Login = React.lazy(() => import("./pages/Login.jsx"));
const Dashboard = React.lazy(() => import("./pages/Dashboard.jsx"));
const Allerta = React.lazy(() => import("./pages/Allerta.jsx"));
const AnalisiCR = React.lazy(() => import("./pages/AnalisiCR.jsx"));
const AnalisiBilancio = React.lazy(() => import("./pages/AnalisiBilancio.jsx"));
const ContiCorrenti = React.lazy(() => import("./pages/ContiCorrenti.jsx"));
const Movimenti = React.lazy(() => import("./pages/Movimenti.jsx"));
const AnalisiBilancioDettaglio = React.lazy(() => import("./pages/AnalisiBilancioDettaglio.jsx"));
const CentraleRischiDettaglio = React.lazy(() => import("./pages/CentraleRischiDettaglio.jsx"));
const Simulazione = React.lazy(() => import("./pages/Simulazione.jsx"));
const Fatture = React.lazy(() => import("./pages/Fatture.jsx"));
const Clienti = React.lazy(() => import("./pages/Clienti.jsx"));
const Previsioni = React.lazy(() => import("./pages/Previsioni.jsx"));
const Scadenze = React.lazy(() => import("./pages/Scadenze.jsx"));
const ContoDettaglio = React.lazy(() => import("./pages/ContoDettaglio.jsx"));
const AIChat = React.lazy(() => import("./pages/AIChat.jsx"));
const CashFlow = React.lazy(() => import("./pages/CashFlow.jsx"));
const ImpostazioniAzienda = React.lazy(() => import("./pages/ImpostazioniAzienda.jsx"));
const SsoLogin = React.lazy(() => import("./pages/SsoLogin.jsx"));
const FactoringClienti = React.lazy(() => import("./pages/FactoringClienti.jsx"));
const FactoringFatture = React.lazy(() => import("./pages/FactoringFatture.jsx"));

const isAuthenticated = () => {
  try {
    return !!localStorage.getItem("sb_user");
  } catch {
    return false;
  }
};

const PrivateRoute = () => {
  const location = useLocation();
  return isAuthenticated() ? (
    <Outlet />
  ) : (
    <Navigate to="/login" replace state={{ from: location.pathname }} />
  );
};

const ProtectedLayout = () => (
  <Shell
    onLogout={() => {
      localStorage.removeItem("sb_user");
      window.location.href = "/login";
    }}
  >
    <Suspense 
      fallback={
        <div className="w-full h-full flex flex-col items-center justify-center p-12 text-slate-500">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#5b63ff] rounded-full animate-spin"></div>
          <span className="mt-4 font-semibold text-sm">Caricamento in corso...</span>
        </div>
      }
    >
      <Outlet />
    </Suspense>
  </Shell>
);

export default function App() {
  return (
    <>
      <Routes>
        <Route 
          path="/login" 
          element={
            <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-10 h-10 border-4 border-slate-200 border-t-[#5b63ff] rounded-full animate-spin"></div></div>}>
              <Login />
            </Suspense>
          } 
        />
        <Route 
          path="/sso-login" 
          element={
            <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-10 h-10 border-4 border-slate-200 border-t-[#5b63ff] rounded-full animate-spin"></div></div>}>
              <SsoLogin />
            </Suspense>
          } 
        />
        <Route element={<PrivateRoute />}>
          <Route element={<ProtectedLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="/allerta" element={<Allerta />} />
            <Route path="/analisi-cr" element={<AnalisiCR />} />
            <Route path="/analisi-bilancio" element={<AnalisiBilancio />} />
            <Route path="/conti-correnti" element={<ContiCorrenti />} />
            <Route path="/conti-correnti/:id" element={<ContoDettaglio />} />
            <Route path="/movimenti" element={<Movimenti />} />
            <Route path="/impostazioni-azienda" element={<ImpostazioniAzienda />} />
            <Route path="/analisi-bilancio/:id" element={<AnalisiBilancioDettaglio />} />
            <Route path="/analisi-cr/dettaglio/:id" element={<CentraleRischiDettaglio />} />
            <Route path="/simulazione" element={<Simulazione />} />
            <Route path="/fatture" element={<Fatture />} />
            <Route path="/clienti" element={<Clienti />} />
            <Route path="/previsioni" element={<Previsioni />} />
            <Route path="/scadenze" element={<Scadenze />} />
            <Route path="/cashflow" element={<CashFlow />} />
            <Route path="/aichat" element={<AIChat />} />
            <Route path="/credito/clienti" element={<FactoringClienti />} />
            <Route path="/credito/fatture" element={<FactoringFatture />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Chat sempre presente */}
      <Suspense fallback={null}>
        <ChatWidget />
      </Suspense>
    </>
  );
}
