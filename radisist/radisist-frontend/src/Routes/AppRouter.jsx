import React, { useEffect } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute.jsx";

// ---------------- LANDING PAGE ----------------
import PublicLayout from "../LandingPage/Pages/PublicLayout.jsx";
import MainLayout from "../LandingPage/Pages/MainLayout.jsx";
import AboutPage from "../LandingPage/Pages/AboutPage.jsx";
import MissionPage from "../LandingPage/Pages/MissionPage.jsx";
import ContactPage from "../LandingPage/Pages/ContactPage.jsx";

// ---------------- PATIENT ----------------
import PatientDashboard from "../Patient/Pages/PatientDashboard.jsx";
import Upload from "../Patient/Pages/Upload.jsx";
import MyScans from "../Patient/Pages/MyScans.jsx";
import Requests from "../Patient/Pages/Requests.jsx";
import Reports from "../Patient/Pages/Reports.jsx";
import UploadSuccess from "../Patient/Components/UploadSuccess.jsx";
import Analyzed from "../Patient/Components/Analyzed/Analyzed.jsx";
import InitialCards from "../Patient/Components/InitialCards.jsx";

// ---------------- AUTH ----------------
import Login from "../Auth/Login.jsx";
import CreateAccount from "../Auth/CreateAccount.jsx";
import Activation from "../Auth/Activation.jsx";
import RadDashboard from "../Radiologist/RadDashboard.jsx";
import DashboardLayout from "../Radiologist/DashboardLayout.jsx";

const router = createBrowserRouter([
  // LANDING PAGE
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      { path: "", element: <LandingEntry /> },
      { path: "about", element: <AboutPage /> },
      { path: "mission", element: <MissionPage /> },
      { path: "contact", element: <ContactPage /> },
    ],
  },

  // Dashboards Redirection
  {
    path: "/dashboard",
    element: <DashboardRedirect />
  },

  // USER DASHBOARD (PATIENT)
  {
    path: "/userdashboard",
    element: <ProtectedRoute allowedRole="PATIENT" />,
    children: [
      {
        path: "",
        element: <PatientDashboard />,
        children: [
          { index: true, element: <InitialCards /> },
          { path: "upload", element: <Upload /> },
          { path: "upload-success", element: <UploadSuccess /> },
          { path: "analyzed", element: <Analyzed /> },
          { path: "scans", element: <MyScans /> },
          { path: "requests", element: <Requests /> },
          { path: "reports", element: <Reports /> },
        ],
      }
    ],
  },

  //Radiologist Dashboard
  {
    path: "/radiologist",
    element: <ProtectedRoute allowedRole="RADIOLOGIST" />,
    children: [
      { index: true, element: <DashboardLayout /> },
      { path: "upload", element: <Upload /> },
      { path: "analyzed", element: <Analyzed /> },
    ]
  },

  // AUTH ROUTES
  { path: "/login", element: <Login /> },
  { path: "/createaccount", element: <CreateAccount /> },
  { path: "/activate/:uid/:token", element: <Activation /> },
]);

function DashboardRedirect() {
  const role = localStorage.getItem("role");
  if (role === "PATIENT") return <Navigate to="/userdashboard" replace />;
  if (role === "RADIOLOGIST") return <Navigate to="/radiologist" replace />;
  if (role === "ADMIN") {
    window.location.href = "/admin/";
    return null;
  }
  return <Navigate to="/login" replace />;
}

function LandingEntry() {
  const location = useLocation();
  const navigate = useNavigate();
  const legacyHashRoutes = {
    "#about": "/about",
    "#mission": "/mission",
    "#contact": "/contact",
  };
  const legacyRoute = legacyHashRoutes[location.hash.toLowerCase()];

  useEffect(() => {
    if (legacyRoute) {
      navigate(legacyRoute, { replace: true });
    }
  }, [legacyRoute, navigate]);

  if (legacyRoute) return null;

  return <MainLayout />;
}

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
