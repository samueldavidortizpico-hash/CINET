import { createBrowserRouter, Navigate } from "react-router-dom";
import Layout from "../components/layout/Layout.jsx";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import AboutPage from "../pages/AboutPage.jsx";
import AdminPage from "../pages/AdminPage.jsx";
import CreatePlanPage from "../pages/CreatePlanPage.jsx";
import CinemaPage from "../pages/CinemaPage.jsx";
import CinemaTicketsPage from "../pages/CinemaTicketsPage.jsx";
import DashboardPage from "../pages/DashboardPage.jsx";
import DuoPage from "../pages/DuoPage.jsx";
import FunctionsPage from "../pages/FunctionsPage.jsx";
import HomePage from "../pages/HomePage.jsx";
import MovieDetailPage from "../pages/MovieDetailPage.jsx";
import MoviesPage from "../pages/MoviesPage.jsx";
import MyPlansPage from "../pages/MyPlansPage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";
import PlanPage from "../pages/PlanPage.jsx";
import ProfilePage from "../pages/ProfilePage.jsx";

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
