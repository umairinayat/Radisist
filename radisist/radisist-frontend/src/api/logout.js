import apiClient from "./apiClient";

export const logoutUser = async () => {
    const refresh = localStorage.getItem("refresh_token");

    if (refresh) {
        try {
            await apiClient.post("/auth/logout/", { refresh });
        } catch (err) {
            console.error("Logout API error:", err);
        }
    }

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("role");
    localStorage.removeItem("full_name");
    localStorage.removeItem("testing_mock_scans");
};
