import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth.js";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import * as repo from "../services/planRepository.js";
import { buildPlan, canManagePlan, setRsvp } from "../services/planService.js";
import { importsForAccount, mergeAccountImports } from "../services/accountScopedImports.js";
import { prependUniquePage } from "../utils/keysetCursor.js";

export const PlanContext = createContext(null);

const asList = (value) => (Array.isArray(value) ? value : []);

/**
 * Planes en dos modos:
 * - remote (sesión iniciada y Supabase configurado): compartidos, con permisos en el servidor.
 * - local (sin sesión): como antes, solo en este navegador; el enlace NO funciona en otros dispositivos.
 * Los planes locales se conservan y se pueden importar a la cuenta (sin duplicar: client_ref = id local).
 * También guarda la función elegida en /functions hasta convertirla en plan.
 */
export function PlanProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [storedPlans, setPlans] = useLocalStorage("cinehub-plans", []);
  const [selection, setSelection] = useLocalStorage("cinehub-selection", null);
  const [importedByUser, setImportedByUser] = useLocalStorage("cinet-imported-plans", {}); // { userUuid: { idLocal: idRemoto } }
  const userId = user?.id ?? null;
  const remote = repo.remotePlansAvailable() && Boolean(userId);
  const imported = importsForAccount(importedByUser, userId);

  // userId marca de qué cuenta es la lista: al cambiar de sesión no se mezclan planes.
  const [remoteState, setRemoteState] = useState({ userId: null, plans: [], error: null, nextCursor: null, hasMore: false, loadingMore: false, loadMoreError: null });
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => {
    if (!remote) return undefined;
    let active = true;
    repo.listPlans(userId).then(
      (page) => active && setRemoteState({ userId, plans: page.items, nextCursor: page.nextCursor, hasMore: page.hasMore, error: null, loadingMore: false, loadMoreError: null }),
      (error) => active && setRemoteState((state) => state.userId === userId
        ? { ...state, error }
        : { userId, plans: [], nextCursor: null, hasMore: false, loadingMore: false, loadMoreError: null, error })
    );
    return () => {
      active = false;
    };
  }, [remote, userId, version]);

  const loadMorePlans = useCallback(async () => {
    const currentPage = remoteState;
    if (!remote || currentPage.userId !== userId || !currentPage.hasMore || !currentPage.nextCursor || currentPage.loadingMore) return;
    setRemoteState((state) => ({ ...state, loadingMore: true, loadMoreError: null }));
    try {
      const page = await repo.listPlans(userId, currentPage.nextCursor);
      setRemoteState((state) => {
        if (state.userId !== userId) return state;
        return { ...state, plans: prependUniquePage(state.plans, page.items), nextCursor: page.nextCursor, hasMore: page.hasMore, loadingMore: false, loadMoreError: null };
      });
    } catch (loadError) {
      setRemoteState((state) => ({ ...state, loadingMore: false, loadMoreError: loadError }));
    }
  }, [remote, remoteState, userId]);

  const localPlans = useMemo(
    () => asList(storedPlans).map((plan) => ({ ...plan, isOwner: canManagePlan(plan, user) })),
    [storedPlans, user]
  );
  const current = remote && remoteState.userId === userId ? remoteState : null;
  const remotePlans = current?.plans;
  const plans = useMemo(() => (remote ? (remotePlans ?? []) : localPlans), [remote, remotePlans, localPlans]);

  /** clientRef: un id por intento de creación; repetir el envío no duplica el plan. */
  const createPlan = useCallback(
    async (form, { clientRef } = {}) => {
      if (!remote) {
        const plan = buildPlan(selection, form, user);
        setPlans((list) => [...asList(list), plan]);
        return plan.id;
      }
      const id = await repo.createPlan({ selection, form, clientRef, displayName: form.organizer });
      refresh();
      return id;
    },
    [remote, selection, user, setPlans, refresh]
  );

  const updatePlan = useCallback(
    async (plan, changes) => {
      if (!plan.remote) {
        setPlans((list) => asList(list).map((item) => (item.id === plan.id ? { ...item, ...changes } : item)));
        return;
      }
      await repo.updatePlan(plan, changes);
      refresh();
    },
    [setPlans, refresh]
  );

  const deletePlan = useCallback(
    async (plan) => {
      if (!plan.remote) {
        setPlans((list) => asList(list).filter((item) => item.id !== plan.id));
        return;
      }
      await repo.deletePlan(plan.id);
      refresh();
    },
    [setPlans, refresh]
  );

  /** Local: RSVP por nombre (como antes). Remoto: la respuesta de la cuenta, decidida en el servidor. */
  const respondToPlan = useCallback(
    async (plan, person, status) => {
      if (!plan.remote) {
        setPlans((list) => asList(list).map((item) => (item.id === plan.id ? setRsvp(item, person, status) : item)));
        return;
      }
      await repo.setRsvp(plan.id, status);
      refresh();
    },
    [setPlans, refresh]
  );

  const pendingImports = useMemo(
    () => (remote ? localPlans.filter((plan) => !imported[plan.id] && plan.movie) : []),
    [remote, localPlans, imported]
  );

  /** Copia planes locales elegidos a la cuenta. Las respuestas antiguas por nombre no se convierten. */
  const importLocalPlans = useCallback(
    async (list, displayName) => {
      const done = {};
      for (const plan of list) {
        done[plan.id] = await repo.createPlan({
          selection: plan,
          form: { name: plan.name, message: plan.message ?? "" },
          clientRef: plan.id,
          displayName: displayName || plan.organizer || "Organizador",
        });
      }
      setImportedByUser((accounts) => mergeAccountImports(accounts, userId, done));
      refresh();
      return Object.keys(done).length;
    },
    [setImportedByUser, refresh, userId]
  );

  const value = useMemo(
    () => ({
      mode: remote ? "remote" : "local",
      accountsAvailable: repo.remotePlansAvailable(),
      plans,
      loading: authLoading || (remote && !current),
      error: current?.error ?? null,
      hasMore: Boolean(current?.hasMore),
      loadingMore: Boolean(current?.loadingMore),
      loadMoreError: current?.loadMoreError ?? null,
      loadMorePlans,
      refresh,
      selection,
      selectShowtime: setSelection,
      getPlan: (id) => plans.find((plan) => plan.id === id) ?? null,
      createPlan,
      updatePlan,
      deletePlan,
      respondToPlan,
      pendingImports,
      importLocalPlans,
    }),
    [remote, plans, authLoading, current, refresh, selection, setSelection, createPlan, updatePlan, deletePlan, respondToPlan, pendingImports, importLocalPlans, loadMorePlans]
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}
