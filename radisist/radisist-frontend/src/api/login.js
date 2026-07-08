import axios from "axios";
import apiClient from "./apiClient";

export const loginUser = async (data) => {
    const response = await apiClient.post("/auth/jwt/create/", data);
    const { access, refresh } = response.data;

    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);

    return response.data;
};

export const getUserProfile = async () => {
    const response = await apiClient.get("/auth/users/me/");
    return response.data;
};

export const refreshToken = async (refresh) => {
    const response = await axios.post(`${apiClient.defaults.baseURL}/auth/jwt/refresh/`, { refresh });
    return response.data;
};
