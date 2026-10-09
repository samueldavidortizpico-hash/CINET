/* eslint-disable react-refresh/only-export-components -- exporta el router, no componentes: el fast refresh no aplica aquí. */
import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import Layout from "../components/layout/Layout.jsx";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import HomePage from "../pages/HomePage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";

// El inicio llega en el bundle principal; el resto de páginas se descargan al visitarlas (Layout pone el Suspense).
const AboutPage = lazy(() => import("../pages/AboutPage.jsx"));
const AdminPage = lazy(() => import("../pages/AdminPage.jsx"));
const CreatePlanPage = lazy(() => import("../pages/CreatePlanPage.jsx"));
const CinemaPage = lazy(() => import("../pages/CinemaPage.jsx"));
const CinemaTicketsPage = lazy(() => import("../pages/CinemaTicketsPage.jsx"));
const DashboardPage = lazy(() => import("../pages/DashboardPage.jsx"));
const DuoPage = lazy(() => import("../pages/DuoPage.jsx"));
const FunctionsPage = lazy(() => import("../pages/FunctionsPage.jsx"));
const MovieDetailPage = lazy(() => import("../pages/MovieDetailPage.jsx"));
const MoviesPage = lazy(() => import("../pages/MoviesPage.jsx"));
const MyPlansPage = lazy(() => import("../pages/MyPlansPage.jsx"));
const PlanPage = lazy(() => import("../pages/PlanPage.jsx"));
const ProfilePage = lazy(() => import("../pages/ProfilePage.jsx"));

// handle.page → atributo data-page del Layout, que activa los estilos de esa página.
const page = (name) => ({ handle: { page: name } });

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <Layout />,
      children: [
        { index: true, element: <Navigate to="/home" replace /> },
        { path: "home", element: <HomePage />, ...page("home") },
        { path: "movies", element: <MoviesPage />, ...page("movies") },
        { path: "cine", element: <CinemaPage />, ...page("cine") },
        { path: "cine/:id", element: <CinemaTicketsPage />, ...page("cine") },
        { path: "duo", element: <DuoPage />, ...page("duo") },
        { path: "movie/:id", element: <MovieDetailPage />, ...page("movie") },
        { path: "functions", element: <FunctionsPage />, ...page("functions") },
        { path: "create-plan", element: <CreatePlanPage />, ...page("create-plan") },
        { path: "plan/:id", element: <PlanPage />, ...page("plan") },
        { path: "my-plans", element: <MyPlansPage />, ...page("my-plans") },
        { path: "profile", element: <ProfilePage />, ...page("profile") },
        // key: al pasar de /login a /register el formulario empieza limpio.
        { path: "login", element: <ProfilePage key="login" mode="login" />, ...page("profile") },
        { path: "register", element: <ProfilePage key="register" mode="register" />, ...page("profile") },
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
        { path: "about", element: <AboutPage />, ...page("about") },
        { path: "*", element: <NotFoundPage />, ...page("not-found") },
      ],
    },
  ],
  // En GitHub Pages la app vive en /<repositorio>/ (vite.config.js → base).
  { basename: import.meta.env.BASE_URL }
);
