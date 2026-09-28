import { RouterProvider } from "react-router-dom";
import { router } from "./app/router.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { MovieProvider } from "./context/MovieContext.jsx";
import { PlanProvider } from "./context/PlanContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";

/** Estado global (contextos) disponible para todas las rutas. */
export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MovieProvider>
          <PlanProvider>
            <RouterProvider router={router} />
          </PlanProvider>
        </MovieProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
