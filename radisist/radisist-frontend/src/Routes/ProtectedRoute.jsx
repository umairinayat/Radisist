import React from "react";
import { Navigate, Outlet } from "react-router-dom";

/**
 * ProtectedRoute component to restrict access based on authentication and roles.
 * @param {Object} props
 * @param {string} props.allowedRole - The role required to access this route (optional).
 */
const ProtectedRoute = ({ allowedRole }) => {
    // TEMPORARY TESTING BYPASS: Allows direct route access without login
    return <Outlet />;

    const token = localStorage.getItem("access_token");
    const userRole = localStorage.getItem("role"); // Expected to be "PATIENT" or "RADIOLOGIST"

    // 1. Check if user is logged in
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // 2. Check if a specific role is required
    if (allowedRole && userRole !== allowedRole) {
        // Redirect to home or an unauthorized page if role doesn't match
        console.warn(`Access denied: Required role ${allowedRole}, but user has ${userRole}`);
        return <Navigate to="/" replace />;
    }

    // 3. If everything is fine, render the child routes
    return <Outlet />;
};

export default ProtectedRoute;
