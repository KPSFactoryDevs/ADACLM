// src/App.jsx
import React from "react";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";

import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Allerta from "./pages/Allerta.jsx";
import AnalisiCR from "./pages/AnalisiCR.jsx";
import AnalisiBilancio from "./pages/AnalisiBilancio.jsx";
import ContiCorrenti from "./pages/ContiCorrenti.jsx";
import Movimenti from "./pages/Movimenti.jsx";
 import AnalisiBilancioDettaglio from "./pages/AnalisiBilancioDettaglio";
import CentraleRischiDettaglio from "./pages/CentraleRischiDettaglio";
import Simulazione from "./pages/Simulazione";
import Fatture from "./pages/Fatture";

import Clienti from "./pages/Clienti";
import Previsioni from "./pages/Previsioni";
import Scadenze from "./pages/Scadenze";
import ContoDettaglio from "./pages/ContoDettaglio";
import AIChat from "./pages/AIChat";


import Shell from "./layout/Shell.jsx";
import ChatWidget from "./components/ChatWidget.jsx";
import CashFlow from "./pages/CashFlow.jsx";

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
    <Outlet />
  </Shell>
);

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<PrivateRoute />}>
          <Route element={<ProtectedLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="/allerta" element={<Allerta />} />
            <Route path="/analisi-cr" element={<AnalisiCR />} />
            <Route path="/analisi-bilancio" element={<AnalisiBilancio />} />
            <Route path="/conti-correnti" element={<ContiCorrenti />} />
             <Route path="/conti-correnti/:id" element={<ContoDettaglio />} />
            <Route path="/movimenti" element={<Movimenti />} />
<Route path="/analisi-bilancio/:id" element={<AnalisiBilancioDettaglio />} />
<Route path="/analisi-cr/dettaglio/:id" element={<CentraleRischiDettaglio />} />
<Route path="/simulazione" element={<Simulazione />} />
<Route path="/fatture" element={<Fatture />} />

<Route path="/clienti" element={<Clienti />} />
<Route path="/previsioni" element={<Previsioni />} />
<Route path="/scadenze" element={<Scadenze />} />

<Route path="/cashflow" element={<CashFlow />} />
<Route path="/aichat" element={<AIChat />} />


          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Chat sempre presente */}
      <ChatWidget />
    </>
  );
}
