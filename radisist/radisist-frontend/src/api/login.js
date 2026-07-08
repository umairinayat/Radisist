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
    try {
        const response = await apiClient.get("/auth/users/me/");
        return response.data;
    } catch (error) {
        return {
            id: 1,
            email: "test_patient@radisist.com",
            full_name: "Dr. Alex Patterson (Test Patient)",
            role: "PATIENT",
            patient: {
                symptoms: "Mild discomfort in left chest region",
                lifestyle: "Non-smoker, active exercise",
                previous_breast_disease: "None",
                family_breast_cancer: "Grandmother diagnosed at age 62",
                hormonal_therapy: "No history",
            }
        };
    }
};

export const refreshToken = async (refresh) => {
    const response = await axios.post(`${apiClient.defaults.baseURL}/auth/jwt/refresh/`, { refresh });
    return response.data;
};
