import { useContext } from "react";
import { PlanContext } from "../context/PlanContext.jsx";

/** Crear, editar, eliminar y responder planes (estado global en PlanContext). */
export function usePlans() {
  const context = useContext(PlanContext);
  if (!context) throw new Error("usePlans debe usarse dentro de <PlanProvider>.");
  return context;
}
