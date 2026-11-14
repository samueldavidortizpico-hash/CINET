/* eslint-disable react-refresh/only-export-components -- exporta el router, no componentes: el fast refresh no aplica aquí. */
import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import Layout from "../components/layout/Layout.jsx";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import AuthPage from "../pages/AuthPage.jsx";
import HomePage from "../pages/HomePage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";
import RouteError from "../components/common/RouteError.jsx";

// La entrada y el inicio llegan en el bundle principal; el resto se descarga al visitarlo (Layout pone el Suspense).
const AdminPage = lazy(() => import("../pages/AdminPage.jsx"));
const CreatePlanPage = lazy(() => import("../pages/CreatePlanPage.jsx"));
const CinemaPage = lazy(() => import("../pages/CinemaPage.jsx"));
const CinemaTicketsPage = lazy(() => import("../pages/CinemaTicketsPage.jsx"));
const DashboardPage = lazy(() => import("../pages/DashboardPage.jsx"));
const DuoPage = lazy(() => import("../pages/DuoPage.jsx"));
const DuoRoomPage = lazy(() => import("../pages/DuoRoomPage.jsx"));
const FunctionsPage = lazy(() => import("../pages/FunctionsPage.jsx"));
const GroupsPage = lazy(() => import("../pages/GroupsPage.jsx"));
const ImportPage = lazy(() => import("../pages/ImportPage.jsx"));
const RecapPage = lazy(() => import("../pages/RecapPage.jsx"));
const PartnerPage = lazy(() => import("../pages/PartnerPage.jsx"));
const PlusPage = lazy(() => import("../pages/PlusPage.jsx"));
const InvitePage = lazy(() => import("../pages/InvitePage.jsx"));
const LegalPage = lazy(() => import("../pages/LegalPage.jsx"));
const MovieDetailPage = lazy(() => import("../pages/MovieDetailPage.jsx"));
const MoviesPage = lazy(() => import("../pages/MoviesPage.jsx"));
const MyPlansPage = lazy(() => import("../pages/MyPlansPage.jsx"));
const PlanPage = lazy(() => import("../pages/PlanPage.jsx"));
const ProfilePage = lazy(() => import("../pages/ProfilePage.jsx"));

// handle.page → atributo data-page del Layout, que activa los estilos de esa página.
const page = (name) => ({ handle: { page: name } });

export const router = createBrowserRouter(
  [
    // Entrada de la app (sin cabecera ni pie): bienvenida → acceso. Con sesión, AuthPage pasa al contenido.
    { path: "/", element: <AuthPage /> },
    { path: "/login", element: <AuthPage key="access" view="login" /> },
    { path: "/register", element: <AuthPage key="access" view="register" /> },
    { path: "/registro", element: <AuthPage key="access" view="register" /> },
    { path: "/recuperar", element: <AuthPage key="forgot" view="forgot" /> },
    { path: "/nueva-contrasena", element: <AuthPage key="reset" view="reset" /> },
    {
      element: <Layout />,
      // Recuperación por ruta (N22): el error se pinta dentro del Layout; la cabecera y lo demás siguen.
      children: [{ errorElement: <RouteError />, children: [
        { path: "home", element: <HomePage />, ...page("home") },
        { path: "movies", element: <MoviesPage />, ...page("movies") },
        { path: "catalogo", element: <MoviesPage />, ...page("movies") },
        { path: "peliculas", element: <MoviesPage />, ...page("movies") },
        { path: "perfil", element: <ProfilePage />, ...page("profile") },
        { path: "planes", element: <MyPlansPage />, ...page("my-plans") },
        { path: "cine", element: <CinemaPage />, ...page("cine") },
        { path: "cine/:id", element: <CinemaTicketsPage />, ...page("cine") },
        { path: "duo", element: <DuoPage />, errorElement: <RouteError area="duo" />, ...page("duo") },
        { path: "duo/sala", element: <DuoRoomPage />, errorElement: <RouteError area="duo" />, ...page("duo") },
        { path: "duo/sala/:code", element: <DuoRoomPage />, errorElement: <RouteError area="duo" />, ...page("duo") },
        { path: "movie/:id", element: <MovieDetailPage />, ...page("movie") },
        { path: "functions", element: <FunctionsPage />, ...page("functions") },
        { path: "create-plan", element: <CreatePlanPage />, ...page("create-plan") },
        { path: "plan/:id", element: <PlanPage />, ...page("plan") },
        { path: "invite/:token", element: <InvitePage />, ...page("plan") },
        { path: "my-plans", element: <MyPlansPage />, ...page("my-plans") },
        { path: "profile", element: <ProfilePage />, ...page("profile") },
        { path: "importar", element: <ImportPage />, ...page("duo") },
        { path: "resumen", element: <RecapPage />, ...page("duo") },
        { path: "aliados", element: <PartnerPage />, ...page("duo") },
        { path: "plus", element: <PlusPage />, ...page("duo") },
        { path: "grupos", element: <GroupsPage />, ...page("plan") },
        { path: "grupos/unirse/:token", element: <GroupsPage />, ...page("plan") },
        { path: "grupos/:id", element: <GroupsPage />, ...page("plan") },
        // Alias: /plans es /my-plans.
        { path: "plans", element: <Navigate to="/my-plans" replace /> },
        {
          element: <ProtectedRoute />,
          children: [{ path: "dashboard", element: <DashboardPage />, ...page("dashboard") }],
        },
        {
          element: <ProtectedRoute roles={["admin"]} />,
          children: [{ path: "admin", element: <AdminPage />, ...page("dashboard") }],
        },
        { path: "legal", element: <LegalPage />, ...page("legal") },
        { path: "legal/:doc", element: <LegalPage />, ...page("legal") },
        // «Acerca de» se retiró: su URL lleva a las atribuciones que había allí.
        { path: "about", element: <Navigate to="/legal/creditos" replace /> },
        { path: "*", element: <NotFoundPage />, ...page("not-found") },
      ] }],
    },
  ],
  // En GitHub Pages la app vive en /<repositorio>/ (vite.config.js → base).
  { basename: import.meta.env.BASE_URL }
);
