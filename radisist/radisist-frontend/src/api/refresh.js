import apiClient from "./apiClient";
import { logoutUser } from "./logout";

export const refreshToken = async () => {
    const refresh = localStorage.getItem("refresh_token");
    if (!refresh) return null;

    try {
        const response = await apiClient.post("/auth/jwt/refresh/", { refresh });
        localStorage.setItem("access_token", response.data.access);
        return response.data.access;
    } catch {
        await logoutUser();
        return null;
    }
};
