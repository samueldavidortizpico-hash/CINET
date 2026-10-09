import { Suspense } from "react";
import { Outlet, ScrollRestoration, useMatches } from "react-router-dom";
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import Toast from "../common/Toast.jsx";
import { useNetworkStatus } from "../../hooks/useNetworkStatus.js";

/**
 * Estructura común de todas las rutas.
 * data-page (definido en el `handle` de cada ruta) activa la hoja de estilos
 * de esa página, como hacía cada .html del prototipo.
 */
export default function Layout() {
  const matches = useMatches();
  const page = matches.findLast((match) => match.handle?.page)?.handle.page;
  const online = useNetworkStatus();

  return (
    <div className="app-shell" data-page={page}>
      <Header />
      {!online && (
        <p className="offline-banner" role="status">
          Sin conexión a internet. Verás los datos guardados en este navegador cuando existan.
        </p>
      )}
      <main>
        {/* Las páginas se cargan bajo demanda (router.jsx): reserva el alto mientras llega su código. */}
        <Suspense fallback={<div className="route-loading" role="status" aria-label="Cargando página" />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <Toast />
      <ScrollRestoration />
    </div>
  );
}
