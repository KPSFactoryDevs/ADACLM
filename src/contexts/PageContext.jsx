// src/contexts/PageContext.jsx
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";

const PageContext = createContext({
  context: null,
  setPageContext: () => {},
  clearPageContext: () => {},
});

/**
 * Provider — wrap this around the app.
 * Automatically clears context on route change so stale data never leaks.
 */
export function PageContextProvider({ children }) {
  const [context, setContext] = useState(null);
  const { pathname } = useLocation();

  // Clear context when the user navigates to another page
  useEffect(() => {
    setContext(null);
  }, [pathname]);

  const setPageContext = useCallback((ctx) => {
    setContext(ctx);
  }, []);

  const clearPageContext = useCallback(() => {
    setContext(null);
  }, []);

  return (
    <PageContext.Provider value={{ context, setPageContext, clearPageContext }}>
      {children}
    </PageContext.Provider>
  );
}

/**
 * Hook — call from any page to SET the context the AI widget sees.
 *
 * Example:
 *   useSetPageContext({
 *     page: "Analisi Bilancio",
 *     summary: "Bilancio di ACME SRL - Anno 2024",
 *     data: { fatturato: 1200000, utile: 45000, indici: {...} }
 *   });
 */
export function useSetPageContext(ctx) {
  const { setPageContext } = useContext(PageContext);

  useEffect(() => {
    if (ctx) {
      setPageContext(ctx);
      window.__ADA_PAGE_CONTEXT__ = ctx;
    } else {
      window.__ADA_PAGE_CONTEXT__ = null;
    }
  }, [JSON.stringify(ctx)]); // re-set when ctx changes
}

/**
 * Hook — call from ChatWidget to READ the current page context.
 */
export function usePageContext() {
  return useContext(PageContext).context;
}
